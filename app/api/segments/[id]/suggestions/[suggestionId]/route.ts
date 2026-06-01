/**
 * /api/segments/[id]/suggestions/[suggestionId]
 *
 *   PATCH — transition a suggestion's status to
 *           'accepted' | 'rejected' | 'superseded'.
 *
 * RLS gates the update to: the original suggester, the accepter, or an
 * admin (suggestions_update_own_or_accepter). On status='accepted' the
 * server stamps `accepter_id = auth.uid()` and `accepted_at = now()`.
 *
 * Note: this route deliberately does NOT mutate `segments.target_text`.
 * Applying an accepted suggestion to the segment still goes through
 * PATCH /api/segments/[id] so the soft-lock contract is preserved.
 *
 * Phase-4b memory write-back (005): after an `accepted` stamp succeeds,
 * this route fires the matching `rpc_phase_4b_*` SECURITY-DEFINER RPC so
 * the accepted translation feeds the memory loop (translation_memory,
 * term promotion, TM-example boosts). The RPC self-validates that the
 * caller is the accepter (or admin) and that the suggestion is already
 * `accepted`, so it MUST run in the same authed request context as the
 * accept (never service-role). The write-back is best-effort: a failure
 * is logged and surfaced as a non-fatal `memory` field on the response,
 * never rolling back the user-facing accept.
 *
 * Scope (translate-first): only segments whose status is `draft` at
 * accept time are treated as translate-phase proposals and routed to
 * `rpc_phase_4b_translate_save`. edit/proofread/qa write-backs are
 * deliberately deferred.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'superseded';

const TERMINAL_STATUSES: ReadonlySet<SuggestionStatus> = new Set([
    'accepted',
    'rejected',
    'superseded',
]);

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; suggestionId: string }> }
) {
    const { id: segmentId, suggestionId } = await params;
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

    const { status } = (body ?? {}) as { status?: unknown };

    if (
        typeof status !== 'string' ||
        !TERMINAL_STATUSES.has(status as SuggestionStatus)
    ) {
        return NextResponse.json(
            {
                error:
                    "`status` is required and must be one of 'accepted', 'rejected', 'superseded'",
            },
            { status: 400 }
        );
    }

    const newStatus = status as SuggestionStatus;

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'accepted') {
        updateData.accepter_id = user.id;
        updateData.accepted_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('segment_suggestions')
        .update(updateData)
        .eq('id', suggestionId)
        .eq('segment_id', segmentId)
        .select()
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
        // Either the row doesn't exist or RLS hid it from this user.
        return NextResponse.json(
            { error: 'Suggestion not found or not permitted' },
            { status: 404 }
        );
    }

    // Phase-4b memory write-back (best-effort, non-fatal). Only fires on a
    // fresh `accepted` transition for a translate-phase proposal — i.e. the
    // segment is still in `draft` when the suggestion is accepted.
    let memory: Record<string, unknown> | undefined;
    if (newStatus === 'accepted') {
        memory = await runPhase4bWriteBack(supabase, segmentId, suggestionId);
    }

    return NextResponse.json(memory ? { ...data, memory } : data);
}

/**
 * Fire the matching `rpc_phase_4b_*` RPC for an accepted suggestion.
 *
 * Translate-first: routes only `draft` segments to
 * `rpc_phase_4b_translate_save`. Returns a small status object describing
 * what happened (for the `memory` response field) and NEVER throws — the
 * accept must stand even if the learning side-effect fails.
 */
async function runPhase4bWriteBack(
    supabase: Awaited<ReturnType<typeof createClient>>,
    segmentId: string,
    suggestionId: string
): Promise<Record<string, unknown> | undefined> {
    // Determine the phase from the segment's current lifecycle status.
    const { data: seg, error: segErr } = await supabase
        .from('segments')
        .select('status')
        .eq('id', segmentId)
        .maybeSingle();

    if (segErr || !seg) {
        return { skipped: true, reason: 'segment lookup failed' };
    }

    // Translate-first scope: only draft→translated accepts feed memory.
    if (seg.status !== 'draft') {
        return { skipped: true, reason: `phase not wired (status=${seg.status})` };
    }

    const payload = {
        save_to_tm: true,
        approach: 'human_accept',
        promote_terms: [] as Array<{ term_id: string }>,
        boost_tm_examples: [] as Array<{ tm_id: string }>,
    };

    const { data: rpcResult, error: rpcErr } = await supabase.rpc(
        'rpc_phase_4b_translate_save',
        {
            segment_id: segmentId,
            suggestion_id: suggestionId,
            payload,
        }
    );

    if (rpcErr) {
        // Non-fatal: log server-side, report a soft failure to the client.
        console.error(
            `[phase-4b] translate_save failed for suggestion ${suggestionId}:`,
            rpcErr.message
        );
        return { ok: false, rpc: 'rpc_phase_4b_translate_save', error: rpcErr.message };
    }

    return { ok: true, rpc: 'rpc_phase_4b_translate_save', result: rpcResult };
}
