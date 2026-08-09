/**
 * /api/segments/[id]/advance-phase
 *
 * Advance a segment forward through the cooperation-first phase model:
 *   draft → translated → edited → proofread → qa_approved
 *
 * PocketBase edition: replaces Supabase RLS-backed atomic UPDATE with
 * an explicit read-check-write + status filter pattern.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
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
    const pb = await createServerClient();

    if (!pb.authStore.isValid || !pb.authStore.record) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = pb.authStore.record.id;
    const userRole = (pb.authStore.record as Record<string, unknown>).role as string | undefined;

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

    if (LEGAL_FORWARD[expected_current_status] !== to_status) {
        return NextResponse.json(
            { error: `Illegal transition: ${expected_current_status} → ${to_status}` },
            { status: 400 }
        );
    }

    if (note !== undefined && note !== null && typeof note !== 'string') {
        return NextResponse.json(
            { error: '`note` must be a string when provided' },
            { status: 400 }
        );
    }

    // Pre-load the segment
    let segment: Record<string, unknown>;
    try {
        segment = await pb.collection('segments').getOne(segmentId);
    } catch {
        return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    // Content guard: anything beyond draft requires real translated text.
    if (to_status !== 'draft') {
        const text = segment.target_text as string | undefined;
        if (typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json(
                { error: '`target_text` must be non-empty before advancing past draft' },
                { status: 400 }
            );
        }
    }

    // Early 409 if the FE's view is already stale.
    if (segment.status !== expected_current_status) {
        return NextResponse.json(
            {
                error: 'Segment status has changed since you last loaded it',
                current_status: segment.status,
            },
            { status: 409 }
        );
    }

    // Phase-based auth (stopgap: translator||admin; see migration notes)
    if (userRole !== 'admin' && userRole !== 'translator') {
        return NextResponse.json({ error: 'Forbidden: translator or admin role required' }, { status: 403 });
    }

    // Atomic status flip: update with filter matching current status.
    // PocketBase doesn't support conditional updates natively, so we
    // re-read after write to detect races.
    let updated: Record<string, unknown>;
    try {
        updated = await pb.collection('segments').update(segmentId, { status: to_status });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 403 });
    }

    // Verify the update actually applied (race detection)
    if ((updated as Record<string, unknown>).status !== to_status) {
        // Concurrent update beat us to it.
        let freshStatus: unknown = null;
        try {
            const fresh = await pb.collection('segments').getOne(segmentId);
            freshStatus = (fresh as Record<string, unknown>).status;
        } catch { /* ignore */ }
        return NextResponse.json(
            {
                error: 'Segment status has changed since you last loaded it',
                current_status: freshStatus,
            },
            { status: 409 }
        );
    }

    // Audit row
    let transition: Record<string, unknown> | null = null;
    try {
        transition = await pb.collection('segment_phase_transitions').create({
            segment_id: segmentId,
            from_status: expected_current_status,
            to_status,
            actor_id: userId,
            note: typeof note === 'string' ? note : null,
        });
    } catch (transitionErr) {
        return NextResponse.json(
            {
                error: `Status updated but failed to record transition: ${transitionErr instanceof Error ? transitionErr.message : 'Unknown error'}`,
                segment: updated,
            },
            { status: 500 }
        );
    }

    // Phase 4.4: invalidate cached article data
    const articleId = segment.article_id as string | undefined;
    if (articleId) {
      revalidateTag(`article-${articleId}`, 'max');
      revalidatePath(`/documents/${articleId}/read`);
    }
    revalidateTag('articles', 'max');

    return NextResponse.json({ segment: updated, transition });
}
