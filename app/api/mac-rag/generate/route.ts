/**
 * POST /api/mac-rag/generate
 *
 * Stage 2: prompt → LLM → proposed text.
 * PocketBase edition.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
import { agentChatWithFallback } from '@/lib/llm/provider';

type Phase = 'translate' | 'edit' | 'proofread' | 'qa';

const VALID_PHASES: readonly Phase[] = ['translate', 'edit', 'proofread', 'qa'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isPhase(v: unknown): v is Phase {
  return typeof v === 'string' && (VALID_PHASES as readonly string[]).includes(v);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    segment_id,
    phase,
    prompt_system,
    prompt_user,
    original_prompt_system,
    original_prompt_user,
  } = (body ?? {}) as {
    segment_id?: unknown;
    phase?: unknown;
    prompt_system?: unknown;
    prompt_user?: unknown;
    original_prompt_system?: unknown;
    original_prompt_user?: unknown;
  };

  if (typeof segment_id !== 'string' || !UUID_RE.test(segment_id)) {
    return NextResponse.json(
      { error: 'segment_id is required and must be a UUID' },
      { status: 400 },
    );
  }

  if (!isPhase(phase)) {
    return NextResponse.json(
      { error: `phase must be one of: ${VALID_PHASES.join(', ')}` },
      { status: 400 },
    );
  }

  if (typeof prompt_system !== 'string' || prompt_system.trim().length === 0) {
    return NextResponse.json(
      { error: 'prompt_system is required and must be non-empty' },
      { status: 400 },
    );
  }

  if (typeof prompt_user !== 'string' || prompt_user.trim().length === 0) {
    return NextResponse.json(
      { error: 'prompt_user is required and must be non-empty' },
      { status: 400 },
    );
  }

  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = pb.authStore.record.id;

  const llmT0 = Date.now();
  let llmContent: string;
  try {
    const resp = await agentChatWithFallback(
      'translation',
      [
        { role: 'system', content: prompt_system },
        { role: 'user', content: prompt_user },
      ],
      { temperature: 0.2, maxTokens: 2000 },
    );
    llmContent = (resp.content ?? '').trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown LLM error';
    if (msg === 'No OpenRouter API key configured') {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    return NextResponse.json(
      { error: `LLM upstream error: ${msg}` },
      { status: 502 },
    );
  }
  const llmMs = Date.now() - llmT0;

  // Detect & record prompt edits
  let promptEdited = false;
  let promptEditId: string | null = null;

  const systemEdited =
    original_prompt_system !== undefined &&
    original_prompt_system !== prompt_system;
  const userEdited =
    original_prompt_user !== undefined &&
    original_prompt_user !== prompt_user;

  if (systemEdited || userEdited) {
    try {
      const agentPrompts = await pb.collection('agent_prompts').getFullList({
        filter: `agent_type = "${phase}" && active = true && user_id = null`,
        fields: 'id,template',
      });
      const agentPrompt = agentPrompts.length > 0 ? agentPrompts[0] : null;

      if (agentPrompt) {
        const inserted = await pb.collection('prompt_edits').create({
          agent_prompt_id: (agentPrompt as Record<string, unknown>).id,
          prev_template: typeof original_prompt_system === 'string' ? original_prompt_system : null,
          new_template: prompt_system,
          rationale: 'human edit before generation',
          edited_by: userId,
        });
        promptEdited = true;
        promptEditId = (inserted as Record<string, unknown>).id as string;
      }
    } catch { /* best-effort */ }
  }

  const responsePayload: Record<string, unknown> = {
    segment_id,
    phase,
    proposed_text: llmContent,
    prompt_edited: promptEdited,
    prompt_edit_id: promptEditId,
    timings: { llm_ms: llmMs },
  };

  if (phase === 'qa') {
    responsePayload.advisory = true;
  }

  return NextResponse.json(responsePayload);
}
