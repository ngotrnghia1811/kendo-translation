/**
 * /api/segments/[id]/suggestions/[suggestionId]
 *
 *   PATCH — transition a suggestion's status to
 *           'accepted' | 'rejected' | 'superseded'.
 *
 * PocketBase edition. Phase-4b memory write-back (translation_memory) is
 * removed — the `translation_memory` table was NOT migrated to PocketBase
 * (archived as gzipped JSON on the Oracle instance). The accept/reject
 * transition still succeeds; the memory write-back is simply a no-op.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

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
    const pb = await createServerClient();

    if (!pb.authStore.isValid || !pb.authStore.record) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = pb.authStore.record.id;

    // Role gate: accepting/rejecting a suggestion is editing-adjacent (Phase 0 fix).
    const role = (pb.authStore.record as Record<string, unknown>).role as string | undefined;
    if (role !== 'admin' && role !== 'translator') {
        return NextResponse.json({ error: 'Forbidden: translator or admin role required' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { status } = body as { status?: unknown };

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
        updateData.accepter = userId;
        updateData.accepted_at = new Date().toISOString();
    }

    // Verify suggestion exists and belongs to this segment
    try {
        const existing = await pb.collection('segment_suggestions').getOne(suggestionId);
        const existingSegId = (existing as Record<string, unknown>).segment as string;
        if (existingSegId !== segmentId) {
            return NextResponse.json(
                { error: 'Suggestion not found or not permitted' },
                { status: 404 }
            );
        }
    } catch {
        return NextResponse.json(
            { error: 'Suggestion not found or not permitted' },
            { status: 404 }
        );
    }

    try {
        const data = await pb.collection('segment_suggestions').update(suggestionId, updateData);

        // Phase-4b memory write-back: translation_memory was NOT migrated.
        // This was previously handled by Supabase RPC rpc_phase_4b_*. We
        // return a `memory` field noting the skip so the UI doesn't break.
        const memory = newStatus === 'accepted'
            ? { skipped: true, reason: 'translation_memory table not migrated to PocketBase (archived on Oracle instance)' }
            : undefined;

        return NextResponse.json(memory ? { ...data, memory } : data);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
