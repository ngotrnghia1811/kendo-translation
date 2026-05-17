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

    return NextResponse.json(data);
}
