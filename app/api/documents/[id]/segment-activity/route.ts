/**
 * /api/documents/[id]/segment-activity
 *
 * Aggregates per-segment cooperation activity for the editor.
 * PocketBase edition.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PocketBase rejects OR-filters with too many terms (~65 is the observed
// ceiling; 200 reliably 400s). 50 is safely under the limit.
const CHUNK_SIZE = 50;

interface ActivityRow {
    // `segment_id` matches the client's ActivityRow shape (components/editor/
    // EditorClient.tsx). Previously named `segment`, which the client never
    // read — so the cooperation badges silently never rendered.
    segment_id: string;
    pending_suggestions: number;
    unresolved_comments: number;
    recent_transitions_24h: number;
}

/** Fetch all records of a collection filtered by segment IN (ids).
 *  Chunked to avoid filter-string length limits. */
async function chunkedIn(
    pb: ReturnType<typeof createServerClient> extends Promise<infer T> ? T : never,
    collection: string,
    ids: string[],
    extraFilter?: string,
): Promise<Array<{ segment: string }>> {
    const results: Array<{ segment: string }> = [];
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const idFilters = chunk.map(id => `segment = "${id}"`).join(' || ');
        let filter = chunk.length === 1
            ? `segment = "${chunk[0]}"`
            : `(${idFilters})`;
        if (extraFilter) filter = `(${filter}) && (${extraFilter})`;

        const records = await pb.collection(collection).getFullList<{ segment: string }>({
            filter,
            fields: 'segment',
        });
        results.push(...records);
    }
    return results;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: documentId } = await params;
    const pb = await createServerClient();

    if (!pb.authStore.isValid || !pb.authStore.record) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!UUID_RE.test(documentId)) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Doc existence
    try {
        await pb.collection('articles').getOne(documentId);
    } catch {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Fetch all segment ids for the document
    const segs = await pb.collection('segments').getFullList<{ id: string }>({
        filter: `article = "${documentId}"`,
        fields: 'id',
    });
    const segmentIds = segs.map(s => s.id);

    if (segmentIds.length === 0) {
        return NextResponse.json({ activity: [] });
    }

    // NOTE: PocketBase `base` collections lack the system `created` field,
    // so we count all transitions per segment rather than last-24h only.
    // To restore 24h filtering, add a DateField `created_at` via migration.

    try {
        const [suggestions, comments, transitions] = await Promise.all([
            chunkedIn(pb, 'segment_suggestions', segmentIds, 'status = "pending"'),
            chunkedIn(pb, 'segment_comments', segmentIds, 'resolved = false'),
            chunkedIn(pb, 'segment_phase_transitions', segmentIds),
        ]);

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
            rows: Array<{ segment: string }>,
            key: keyof Omit<ActivityRow, 'segment_id'>
        ) => {
            for (const r of rows) {
                const row = tally.get(r.segment);
                if (row) row[key] += 1;
            }
        };

        bump(suggestions, 'pending_suggestions');
        bump(comments, 'unresolved_comments');
        bump(transitions, 'recent_transitions_24h');

        return NextResponse.json({ activity: Array.from(tally.values()) });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
