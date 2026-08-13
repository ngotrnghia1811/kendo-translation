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

// ---------------------------------------------------------------------------
// OpenRouter retry / timeout configuration
// ---------------------------------------------------------------------------
// Transient failures worth retrying (with key rotation + backoff): 429 rate
// limits and 5xx upstream errors. Client errors (4xx other than 429) and auth
// failures are NOT retried — they will not succeed on a different key.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

// Backoff schedule: ~1s, ~2s, ~4s. Length determines max retries (3 retries
// = 4 total attempts).
const RETRY_BACKOFF_MS = [1000, 2000, 4000];

// Default request timeout. Free-tier models can be slow on cold start; 60s
// is overridable via OPENROUTER_TIMEOUT_MS.
const DEFAULT_TIMEOUT_MS = 60000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class OpenRouterHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'OpenRouterHttpError';
    this.status = status;
  }
}

class OpenRouterProvider implements LLMProvider {
  private apiKeys: string[];
  private baseUrl: string;
  private timeoutMs: number;

  constructor() {
    this.apiKeys = OpenRouterProvider.collectKeys();
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    const parsed = Number(process.env.OPENROUTER_TIMEOUT_MS);
    this.timeoutMs = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
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
    return this.pickKeyExcluding(new Set());
  }

  /** Pick a key while avoiding keys already tried in this request. Falls back
   *  to the full pool (reusing a key) once every key has been tried once. */
  private pickKeyExcluding(excluded: Set<string>): string {
    const candidates = this.apiKeys.filter((k) => !excluded.has(k));
    const pool = candidates.length > 0 ? candidates : this.apiKeys;
    if (pool.length === 0) {
      throw new Error('No OpenRouter API key configured');
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  getDefaultModel(): string { return 'nvidia/nemotron-3-super-120b-a12b:free'; }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const model = options?.model || this.getDefaultModel();

    if (this.apiKeys.length === 0) {
      throw new Error('No OpenRouter API key configured');
    }

    const tried = new Set<string>();
    let lastError: Error = new Error('No OpenRouter API key configured');

    // First attempt + up to RETRY_BACKOFF_MS.length retries on transient
    // 429/5xx, rotating to a different key and sleeping with jittered
    // backoff between attempts.
    for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
      const apiKey = this.pickKeyExcluding(tried);
      tried.add(apiKey);
      try {
        return await this.request(messages, options, apiKey, model);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const retryable =
          err instanceof OpenRouterHttpError && RETRYABLE_STATUSES.has(err.status);
        const isLastAttempt = attempt === RETRY_BACKOFF_MS.length;
        if (retryable && !isLastAttempt) {
          const backoff = RETRY_BACKOFF_MS[attempt];
          await sleep(backoff + Math.random() * backoff * 0.5);
          continue;
        }
        throw lastError;
      }
    }

    // Unreachable — the loop returns or throws on every path.
    throw lastError;
  }

  /** Single request attempt against one key. Throws OpenRouterHttpError for
   *  non-2xx responses, or a plain Error for network/timeout/schema issues. */
  private async request(
    messages: Message[],
    options: ChatOptions | undefined,
    apiKey: string,
    model: string
  ): Promise<ChatResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
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
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await OpenRouterProvider.readErrorDetail(response);
        throw new OpenRouterHttpError(
          response.status,
          `OpenRouter API error (${response.status}): ${detail}`
        );
      }

      const data = await response.json();

      // Some providers return an error object alongside a 200 status.
      if (data && typeof data === 'object' && data.error) {
        const msg =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message || JSON.stringify(data.error);
        throw new OpenRouterHttpError(response.status, `OpenRouter API error: ${msg}`);
      }

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
    } catch (err) {
      if (err instanceof OpenRouterHttpError) throw err;
      const name = (err as { name?: string })?.name;
      if (name === 'AbortError') {
        throw new Error(
          `OpenRouter request timed out after ${this.timeoutMs}ms (model: ${model})`
        );
      }
      throw new Error(
        `OpenRouter request failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /** Best-effort extraction of the upstream error message from a non-2xx
   *  response body; falls back to status text. */
  private static async readErrorDetail(response: Response): Promise<string> {
    try {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error?.message) return parsed.error.message;
        if (typeof parsed?.error === 'string') return parsed.error;
      } catch {
        /* not JSON — fall through to raw text */
      }
      if (text.trim()) return text.slice(0, 400);
    } catch {
      /* ignore body-read failures */
    }
    return response.statusText;
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

/**
 * Try OpenRouter models in a configurable fallback chain. The chain is
 * read from env at call time:
 *   1. DEFAULT_OPENROUTER_MODEL
 *   2. BACKUP_OPENROUTER_MODEL
 *   3. CHEAP_OPENROUTER_MODEL
 * Missing/empty entries are skipped. If none are set, falls through to
 * `agentChat(agentType, ...)` (single-model, uses provider default).
 *
 * On a retryable upstream failure (rate-limit / "Provider returned error")
 * with remaining models available, advances to the next model. All other
 * errors (including auth, network, and the last-model error) propagate.
 */
const RETRYABLE_RE = /429|rate.?limit|Provider returned error|temporarily/i;

export async function agentChatWithFallback(
  agentType: AgentType,
  messages: Message[],
  options?: Omit<ChatOptions, 'model'>
): Promise<ChatResponse> {
  const chain = [
    process.env.DEFAULT_OPENROUTER_MODEL,
    process.env.BACKUP_OPENROUTER_MODEL,
    process.env.CHEAP_OPENROUTER_MODEL,
  ].filter((m): m is string => typeof m === 'string' && m.trim().length > 0);

  if (chain.length === 0) {
    return agentChat(agentType, messages, options);
  }

  const provider = getProvider('openrouter');
  let lastErr: unknown = null;
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
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
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const { logAgentCall } = await import('./agent-logger');
      logAgentCall({
        agentType,
        messages,
        response: '',
        model,
        durationMs: Date.now() - startTime,
        error: msg,
        articleId: options?.articleId,
        videoId: options?.videoId,
      });
      const hasNext = i < chain.length - 1;
      if (hasNext && RETRYABLE_RE.test(msg)) {
        continue;
      }
      throw err;
    }
  }
  // Unreachable in practice — the loop either returns or throws.
  throw lastErr instanceof Error ? lastErr : new Error('All fallback models failed');
}
