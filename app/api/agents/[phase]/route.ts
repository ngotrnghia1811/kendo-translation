/**
 * /api/agents/[phase]
 *
 * Per-phase LLM agent suggestion endpoints. POST a `segment_id`, the route
 * picks the correct system prompt for the phase (translate/edit/proofread),
 * calls the configured translation agent, and writes the response as a
 * pending row in `segment_suggestions` with `suggester_kind='agent'` and
 * `suggester_id` = the triggering user.
 *
 * Agents are participants, not owners: the row is `pending` until a human
 * accepts, rejects, or supersedes it via /api/segments/[id]/suggestions/[suggestionId].
 *
 * QA is intentionally NOT a phase here — QA findings go into `qa_issues`,
 * not `segment_suggestions`, and live behind a separate endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { agentChatWithFallback } from '@/lib/llm/provider';
import {
    AgentPhase,
    editPrompt,
    isAgentPhase,
    proofreadPrompt,
    translatePrompt,
} from '@/lib/agents/phase-prompts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ phase: string }> }
) {
    const { phase: phaseParam } = await params;

    if (!isAgentPhase(phaseParam)) {
        return NextResponse.json(
            { error: "`phase` must be one of 'translate', 'edit', 'proofread'" },
            { status: 400 }
        );
    }
    const phase: AgentPhase = phaseParam;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { segment_id } = (body ?? {}) as { segment_id?: unknown };
    if (typeof segment_id !== 'string' || !UUID_RE.test(segment_id)) {
        return NextResponse.json(
            { error: '`segment_id` is required and must be a UUID' },
            { status: 400 }
        );
    }

    const { data: segment, error: segmentErr } = await supabase
        .from('segments')
        .select('id, source_text, target_text')
        .eq('id', segment_id)
        .maybeSingle();

    if (segmentErr) {
        return NextResponse.json({ error: segmentErr.message }, { status: 500 });
    }
    if (!segment) {
        return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    const sourceText = (segment.source_text ?? '').toString();
    const currentTarget = (segment.target_text ?? '').toString();

    if ((phase === 'edit' || phase === 'proofread') && currentTarget.trim().length === 0) {
        return NextResponse.json(
            { error: `Phase '${phase}' requires a non-empty target_text on the segment` },
            { status: 422 }
        );
    }

    const built =
        phase === 'translate'
            ? translatePrompt(sourceText)
            : phase === 'edit'
                ? editPrompt(sourceText, currentTarget)
                : proofreadPrompt(sourceText, currentTarget);

    let proposedText: string;
    try {
        const resp = await agentChatWithFallback(
            'translation',
            [
                { role: 'system', content: built.system },
                { role: 'user', content: built.user },
            ],
            { temperature: 0.3, maxTokens: 800 }
        );
        proposedText = (resp.content ?? '').trim();
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown LLM error';
        if (msg === 'No OpenRouter API key configured') {
            return NextResponse.json({ error: msg }, { status: 503 });
        }
        return NextResponse.json({ error: `LLM upstream error: ${msg}` }, { status: 502 });
    }

    if (proposedText.length === 0) {
        return NextResponse.json(
            { error: 'LLM returned empty content' },
            { status: 502 }
        );
    }

    const { data: inserted, error: insertErr } = await supabase
        .from('segment_suggestions')
        .insert({
            segment_id,
            suggester_id: user.id,
            suggester_kind: 'agent',
            proposed_text: proposedText,
            // status defaults to 'pending' in SQL
        })
        .select()
        .single();

    if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json(inserted, { status: 201 });
}
