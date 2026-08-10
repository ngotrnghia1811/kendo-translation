/**
 * /api/agents/[phase]
 *
 * Per-phase LLM agent suggestion endpoints.
 * PocketBase edition.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
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

    const pb = await createServerClient();

    if (!pb.authStore.isValid || !pb.authStore.record) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = pb.authStore.record.id;

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

    let segment: Record<string, unknown>;
    try {
        segment = await pb.collection('segments').getOne(segment_id);
    } catch {
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

    try {
        const inserted = await pb.collection('segment_suggestions').create({
            segment,
            suggester: userId,
            suggester_kind: 'agent',
            proposed_text: proposedText,
        });
        return NextResponse.json(inserted, { status: 201 });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
