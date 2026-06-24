/**
 * /api/segments/[id]/advance-phase
 *
 * Advance a segment forward through the cooperation-first phase model:
 *   draft → translated → edited → proofread → qa_approved
 *
 * Atomicity: Postgres-via-PostgREST does not expose multi-statement
 * transactions, so we use the standard Supabase idiom — UPDATE filtered
 * by `id AND status = expected_current_status`. If 0 rows match, another
 * actor has already moved the segment; we return 409 Conflict and skip
 * the transition-log insert. The phase change therefore commits iff the
 * caller's optimistic read of the prior status is still accurate.
 *
 * RLS:
 *   - segments_update_phase_assigned gates writes by phase assignment.
 *   - phase_transitions_insert_authenticated permits any authed insert
 *     of an audit row; the UPDATE above is the real authority check.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidateTag, revalidatePath } from 'next/cache';

type SegmentStatus =
    | 'draft'
    | 'translated'
    | 'edited'
    | 'proofread'
    | 'qa_approved';

const LEGAL_FORWARD: Record<SegmentStatus, SegmentStatus | null> = {
    draft: 'translated',
    translated: 'edited',
    edited: 'proofread',
    proofread: 'qa_approved',
    qa_approved: null,
};

function isSegmentStatus(v: unknown): v is SegmentStatus {
    return (
        v === 'draft' ||
        v === 'translated' ||
        v === 'edited' ||
        v === 'proofread' ||
        v === 'qa_approved'
    );
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: segmentId } = await params;
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

    const { to_status, expected_current_status, note } = (body ?? {}) as {
        to_status?: unknown;
        expected_current_status?: unknown;
        note?: unknown;
    };

    if (!isSegmentStatus(to_status)) {
        return NextResponse.json(
            { error: '`to_status` is required and must be a valid segment status' },
            { status: 400 }
        );
    }
    if (!isSegmentStatus(expected_current_status)) {
        return NextResponse.json(
            {
                error:
                    '`expected_current_status` is required and must be a valid segment status',
            },
            { status: 400 }
        );
    }

    // Legal forward transition table — single source of truth.
    if (LEGAL_FORWARD[expected_current_status] !== to_status) {
        return NextResponse.json(
            {
                error: `Illegal transition: ${expected_current_status} → ${to_status}`,
            },
            { status: 400 }
        );
    }

    if (note !== undefined && note !== null && typeof note !== 'string') {
        return NextResponse.json(
            { error: '`note` must be a string when provided' },
            { status: 400 }
        );
    }

    // Pre-load the segment so we can (a) return clean 404, (b) enforce the
    // non-empty target_text guard, (c) surface current_status on 409.
    const { data: segment, error: segmentErr } = await supabase
        .from('segments')
        .select('id, status, target_text, article_id')
        .eq('id', segmentId)
        .maybeSingle();

    if (segmentErr) {
        return NextResponse.json({ error: segmentErr.message }, { status: 500 });
    }
    if (!segment) {
        return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    // Content guard: anything beyond draft requires real translated text.
    if (to_status !== 'draft') {
        const text = segment.target_text;
        if (typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json(
                {
                    error:
                        '`target_text` must be non-empty before advancing past draft',
                },
                { status: 400 }
            );
        }
    }

    // Early 409 if the FE's view is already stale. The atomic UPDATE below
    // would catch this too, but checking first lets us avoid a wasted write
    // and gives a clearer error path.
    if (segment.status !== expected_current_status) {
        return NextResponse.json(
            {
                error: 'Segment status has changed since you last loaded it',
                current_status: segment.status,
            },
            { status: 409 }
        );
    }

    // Atomic status flip guarded by the prior-status filter. If a competing
    // actor raced us between the read above and this UPDATE, 0 rows match.
    const { data: updated, error: updateErr } = await supabase
        .from('segments')
        .update({ status: to_status })
        .eq('id', segmentId)
        .eq('status', expected_current_status)
        .select()
        .maybeSingle();

    if (updateErr) {
        // RLS denial surfaces here as a PostgREST error; map to 403.
        return NextResponse.json({ error: updateErr.message }, { status: 403 });
    }
    if (!updated) {
        // Concurrent update beat us to it. Re-read for the truthful current_status.
        const { data: fresh } = await supabase
            .from('segments')
            .select('status')
            .eq('id', segmentId)
            .maybeSingle();
        return NextResponse.json(
            {
                error: 'Segment status has changed since you last loaded it',
                current_status: fresh?.status ?? null,
            },
            { status: 409 }
        );
    }

    // Audit row. If this insert fails we surface 500 but the status flip
    // has already committed — acceptable trade-off given PostgREST's lack of
    // multi-statement TX. In practice this only fails on infra outage.
    const { data: transition, error: transitionErr } = await supabase
        .from('segment_phase_transitions')
        .insert({
            segment_id: segmentId,
            from_status: expected_current_status,
            to_status,
            actor_id: user.id,
            note: typeof note === 'string' ? note : null,
        })
        .select()
        .single();

    if (transitionErr) {
        return NextResponse.json(
            {
                error: `Status updated but failed to record transition: ${transitionErr.message}`,
                segment: updated,
            },
            { status: 500 }
        );
    }

    // Phase 4.4: invalidate cached article data so readers see the new status
    const articleId = segment.article_id;
    if (articleId) {
      revalidateTag(`article-${articleId}`, 'max');
      revalidatePath(`/documents/${articleId}/read`);
    }
    revalidateTag('articles', 'max');

    return NextResponse.json({ segment: updated, transition });
}
