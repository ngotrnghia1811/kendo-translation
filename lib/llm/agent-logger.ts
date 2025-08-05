/**
 * Agent Logger — Tracks all LLM agent calls for debugging and transparency.
 * Stores in-memory (ring buffer of 100) and persists to Supabase `agent_logs` table.
 */

import type { Message } from './provider';

export interface AgentLog {
  id: string;
  timestamp: Date;
  agentType: string;
  messages: Message[];
  response: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
  durationMs: number;
  error?: string;
  articleId?: string;
  videoId?: string;
}

const agentLogs: AgentLog[] = [];
const MAX_LOGS = 100;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function logAgentCall(log: Omit<AgentLog, 'id' | 'timestamp'>): Promise<AgentLog> {
  const entry: AgentLog = { id: generateId(), timestamp: new Date(), ...log };

  agentLogs.unshift(entry);
  if (agentLogs.length > MAX_LOGS) agentLogs.pop();

  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('agent_logs').insert({
      user_id: user?.id || null,
      agent_type: log.agentType,
      model: log.model,
      system_prompt: log.messages.find(m => m.role === 'system')?.content,
      user_prompt: log.messages.find(m => m.role === 'user')?.content || JSON.stringify(log.messages),
      response: log.response,
      prompt_tokens: log.usage?.promptTokens,
      completion_tokens: log.usage?.completionTokens,
      duration_ms: log.durationMs,
      error: log.error,
      article_id: log.articleId,
      video_id: log.videoId,
    });
  } catch (err) {
    console.error('Failed to persist agent log to DB:', err);
  }

  return entry;
}

export function getRecentLogs(limit = 50): AgentLog[] {
  return agentLogs.slice(0, limit);
}

export function getLogsByAgent(agentType: string, limit = 20): AgentLog[] {
  return agentLogs.filter(log => log.agentType === agentType).slice(0, limit);
}

export function clearLogs(): void {
  agentLogs.length = 0;
}

export function getLogStats(): {
  totalCalls: number;
  byAgent: Record<string, number>;
  totalTokens: number;
  avgDurationMs: number;
} {
  const byAgent: Record<string, number> = {};
  let totalTokens = 0;
  let totalDuration = 0;

  for (const log of agentLogs) {
    byAgent[log.agentType] = (byAgent[log.agentType] || 0) + 1;
    if (log.usage) totalTokens += log.usage.promptTokens + log.usage.completionTokens;
    totalDuration += log.durationMs;
  }

  return {
    totalCalls: agentLogs.length,
    byAgent,
    totalTokens,
    avgDurationMs: agentLogs.length > 0 ? Math.round(totalDuration / agentLogs.length) : 0,
  };
}
