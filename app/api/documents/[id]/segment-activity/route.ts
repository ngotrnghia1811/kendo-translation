/**
 * /api/documents/[id]/segment-activity
 *
 * Aggregates per-segment cooperation activity for a document so the
 * editor's segment list can render attention badges (where suggestions,
 * comments, or recent transitions are waiting). Authenticated, RLS-aware
 * (segments_read_all is permissive but we still let RLS gate edge cases).
 *
 *   GET — returns { activity: [{ segment_id, pending_suggestions,
 *                                unresolved_comments,
 *                                recent_transitions_24h }] }
 *
 * Implementation notes:
 *  - PostgREST does not expose GROUP BY through the JS client; we run
 *    three flat SELECTs filtered by `segment_id IN (doc segments)` and
 *    tally in JS. With <100 segments this is cheap.
 *  - 404 covers both missing document and RLS-hidden document; we never
 *    leak existence.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ActivityRow {
    segment_id: string;
    pending_suggestions: number;
    unresolved_comments: number;
    recent_transitions_24h: number;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: documentId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!UUID_RE.test(documentId)) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Doc existence (RLS-aware). A missing-or-hidden doc returns 404.
    const { data: doc, error: docErr } = await supabase
        .from('articles')
        .select('id')
        .eq('id', documentId)
        .maybeSingle();
    if (docErr) {
        return NextResponse.json({ error: docErr.message }, { status: 500 });
    }
    if (!doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Fetch all segment ids for the document.
    const { data: segs, error: segErr } = await supabase
        .from('segments')
        .select('id')
        .eq('article_id', documentId);
    if (segErr) {
        return NextResponse.json({ error: segErr.message }, { status: 500 });
    }
    const segmentIds = (segs ?? []).map((s) => s.id as string);

    if (segmentIds.length === 0) {
        return NextResponse.json({ activity: [] });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [suggestionsRes, commentsRes, transitionsRes] = await Promise.all([
        supabase
            .from('segment_suggestions')
            .select('segment_id')
            .in('segment_id', segmentIds)
            .eq('status', 'pending'),
        supabase
            .from('segment_comments')
            .select('segment_id')
            .in('segment_id', segmentIds)
            .eq('resolved', false),
        supabase
            .from('segment_phase_transitions')
            .select('segment_id')
            .in('segment_id', segmentIds)
            .gte('created_at', since),
    ]);

    const firstErr =
        suggestionsRes.error || commentsRes.error || transitionsRes.error;
    if (firstErr) {
        return NextResponse.json({ error: firstErr.message }, { status: 500 });
    }

    const tally = new Map<string, ActivityRow>();
    for (const id of segmentIds) {
        tally.set(id, {
            segment_id: id,
            pending_suggestions: 0,
            unresolved_comments: 0,
            recent_transitions_24h: 0,
        });
    }

    const bump = (
        rows: Array<{ segment_id: string }> | null,
        key: keyof Omit<ActivityRow, 'segment_id'>
    ) => {
        for (const r of rows ?? []) {
            const row = tally.get(r.segment_id);
            if (row) row[key] += 1;
        }
    };

    bump(suggestionsRes.data, 'pending_suggestions');
    bump(commentsRes.data, 'unresolved_comments');
    bump(transitionsRes.data, 'recent_transitions_24h');

    return NextResponse.json({ activity: Array.from(tally.values()) });
}
