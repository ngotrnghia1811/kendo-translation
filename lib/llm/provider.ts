/**
 * LLM Provider Abstraction Layer
 * Supports OpenAI and OpenRouter with per-agent model configuration.
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  articleId?: string;
  videoId?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface LLMProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  getDefaultModel(): string;
}

class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
  }

  getDefaultModel(): string { return 'gpt-4o'; }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const model = options?.model?.replace('openai/', '') || this.getDefaultModel();

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens,
        response_format:
          options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined,
    };
  }
}

class OpenRouterProvider implements LLMProvider {
  private apiKeys: string[];
  private baseUrl: string;

  constructor() {
    this.apiKeys = OpenRouterProvider.collectKeys();
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  }

  /**
   * Pool keys from env. Priority order:
   *   1. OPENROUTER_API_KEY (singular) when not a placeholder
   *   2. all OPENROUTER_API_KEY_<digits> entries
   * Any value starting with 'sk-or-v1-REPLACE' is treated as a placeholder
   * and filtered out. Returning an empty list is allowed — chat() will
   * surface 'No OpenRouter API key configured' which the agents route
   * maps to 503.
   */
  private static collectKeys(): string[] {
    const isPlaceholder = (v: string) => v.startsWith('sk-or-v1-REPLACE');
    const out: string[] = [];
    const primary = process.env.OPENROUTER_API_KEY;
    if (primary && !isPlaceholder(primary)) out.push(primary);
    const numbered = Object.keys(process.env)
      .filter((k) => /^OPENROUTER_API_KEY_\d+$/.test(k))
      .sort();
    for (const k of numbered) {
      const v = process.env[k];
      if (v && !isPlaceholder(v) && !out.includes(v)) out.push(v);
    }
    return out;
  }

  /** Random pick from the pool. Exposed as a method so future round-robin
   *  or quota-aware variants can swap in without touching chat(). */
  private pickKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('No OpenRouter API key configured');
    }
    const idx = Math.floor(Math.random() * this.apiKeys.length);
    return this.apiKeys[idx];
  }

  getDefaultModel(): string { return 'meta-llama/llama-3.3-70b-instruct:free'; }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const model = options?.model || this.getDefaultModel();
    const apiKey = this.pickKey();

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://kendo-translation.local',
        'X-Title': 'Kendo Translation Platform',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens,
        response_format:
          options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices.length) {
      throw new Error('OpenRouter API error: Invalid response format (missing choices).');
    }

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined,
    };
  }
}

let openaiProvider: OpenAIProvider | null = null;
let openrouterProvider: OpenRouterProvider | null = null;

export function getProvider(providerType?: 'openai' | 'openrouter'): LLMProvider {
  const type = providerType || (process.env.LLM_PROVIDER as 'openai' | 'openrouter') || 'openrouter';

  if (type === 'openai') {
    if (!openaiProvider) openaiProvider = new OpenAIProvider();
    return openaiProvider;
  }

  if (!openrouterProvider) openrouterProvider = new OpenRouterProvider();
  return openrouterProvider;
}

export type AgentType = 'translation' | 'analysis' | 'reflection' | 'ja_en_specialist';

export function getAgentModel(agentType: AgentType): string {
  const envKey = `${agentType.toUpperCase()}_AGENT_MODEL`;
  return process.env[envKey] || getProvider().getDefaultModel();
}

export function getAgentProvider(agentType: AgentType): { provider: LLMProvider; model: string } {
  const model = getAgentModel(agentType);

  if (model.startsWith('openai/') || model.startsWith('gpt-')) {
    return { provider: getProvider('openai'), model };
  }

  return { provider: getProvider('openrouter'), model };
}

export async function agentChat(
  agentType: AgentType,
  messages: Message[],
  options?: Omit<ChatOptions, 'model'>
): Promise<ChatResponse> {
  const { provider, model } = getAgentProvider(agentType);
  const startTime = Date.now();

  try {
    const response = await provider.chat(messages, { ...options, model });

    const { logAgentCall } = await import('./agent-logger');
    logAgentCall({
      agentType,
      messages,
      response: response.content,
      model: response.model,
      usage: response.usage,
      durationMs: Date.now() - startTime,
      articleId: options?.articleId,
      videoId: options?.videoId,
    });

    return response;
  } catch (error) {
    const { logAgentCall } = await import('./agent-logger');
    logAgentCall({
      agentType,
      messages,
      response: '',
      model,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      articleId: options?.articleId,
      videoId: options?.videoId,
    });
    throw error;
  }
}

export async function chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
  const provider = getProvider();
  return provider.chat(messages, options);
}
