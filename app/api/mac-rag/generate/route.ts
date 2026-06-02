/**
 * POST /api/mac-rag/generate
 *
 * Stage 2 of the two-stage MAC-RAG pipeline: takes the (possibly
 * human-edited) prompt → calls LLM → returns the proposed text.
 *
 * The caller is responsible for creating a `segment_suggestions` row
 * via `POST /api/segments/[id]/suggestions` after inspecting the result.
 *
 * QA phase output is advisory only (`advisory: true` in the response)
 * and should NOT produce a segment_suggestion row.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

  // ── Validation ─────────────────────────────────────────────────────
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

  const supabase = await createClient();

  // ── Auth ──────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── LLM call ──────────────────────────────────────────────────────
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

  // ── Detect & record prompt edits ──────────────────────────────────
  let promptEdited = false;
  let promptEditId: string | null = null;

  const systemEdited =
    original_prompt_system !== undefined &&
    original_prompt_system !== prompt_system;
  const userEdited =
    original_prompt_user !== undefined &&
    original_prompt_user !== prompt_user;

  if (systemEdited || userEdited) {
    // Look up the active global agent_prompt for this phase
    const { data: agentPrompt, error: apErr } = await supabase
      .from('agent_prompts')
      .select('id, template')
      .eq('agent_type', phase)
      .eq('active', true)
      .is('user_id', null)
      .limit(1)
      .maybeSingle();

    // If not found: skip silently (no agent_prompts row for every phase)
    if (!apErr && agentPrompt) {
      const { data: inserted, error: insertErr } = await supabase
        .from('prompt_edits')
        .insert({
          agent_prompt_id: agentPrompt.id,
          prev_template:
            typeof original_prompt_system === 'string'
              ? original_prompt_system
              : null,
          new_template: prompt_system,
          rationale: 'human edit before generation',
          edited_by: user.id,
        })
        .select('id')
        .single();

      if (!insertErr && inserted) {
        promptEdited = true;
        promptEditId = inserted.id;
      }
    }
  }

  // ── Response ─────────────────────────────────────────────────────
  const responsePayload: Record<string, unknown> = {
    segment_id,
    phase,
    proposed_text: llmContent,
    prompt_edited: promptEdited,
    prompt_edit_id: promptEditId,
    timings: { llm_ms: llmMs },
  };

  // QA output is advisory only — caller should NOT create a suggestion
  if (phase === 'qa') {
    responsePayload.advisory = true;
  }

  return NextResponse.json(responsePayload);
}
