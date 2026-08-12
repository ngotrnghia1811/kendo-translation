/**
 * Article-level aggregation helpers (Phase 1, data layer).
 *
 * qa_issues / segment_comments / segment_suggestions are keyed by their
 * `segment` relation (bare field name — NOT `segment_id`). There is no
 * `article` field on those collections, so an article-wide rollup resolves
 * the article → its segment IDs first, then chunk-ORs the `segment` filter.
 *
 * The chunked OR pattern (`segment = "id1" || segment = "id2" || …`) mirrors
 * the proven approach in app/api/documents/[id]/segment-activity/route.ts.
 */

import type PocketBase from 'pocketbase';

// PocketBase rejects filters with too many OR terms (~65 is the observed
// ceiling; 200 reliably 400s). 50 is safely under the limit. Note: the older
// segment-activity endpoint still uses CHUNK_SIZE=200 and has the same latent
// bug for large articles — flagged, not touched here (out of scope).
const CHUNK_SIZE = 50;
const PREVIEW_LENGTH = 140;

/** Per-segment context attached to each aggregated record. */
export interface SegmentContext {
    segment_id: string;
    position: number;
    source_preview: string | null;
    target_preview: string | null;
    status: string;
    target_lang: string;
}

function truncate(s: string | null | undefined): string | null {
    if (s == null) return null;
    const t = s.trim();
    if (t.length === 0) return null;
    return t.length <= PREVIEW_LENGTH ? t : `${t.slice(0, PREVIEW_LENGTH)}…`;
}

/**
 * Fetch every segment for an article (ordered by position) and build a
 * map of id → context plus the ordered id list.
 */
export async function fetchArticleSegmentContexts(
    pb: PocketBase,
    articleId: string,
): Promise<{ contexts: Map<string, SegmentContext>; ids: string[] }> {
    const segments = await pb
        .collection('segments')
        .getFullList<Record<string, unknown>>({
            filter: `article = "${articleId}"`,
            sort: '+position',
            fields: 'id,position,source_text,target_text,target_lang,status',
        });

    const contexts = new Map<string, SegmentContext>();
    const ids: string[] = [];
    for (const s of segments) {
        const id = s.id as string;
        ids.push(id);
        contexts.set(id, {
            segment_id: id,
            position: (s.position as number) ?? 0,
            source_preview: truncate(s.source_text as string | null),
            target_preview: truncate(s.target_text as string | null),
            status: (s.status as string) ?? 'draft',
            target_lang: (s.target_lang as string) ?? 'en',
        });
    }
    return { contexts, ids };
}

/**
 * Fetch all records of `collection` whose `segment` relation is one of `ids`.
 * Chunked to avoid filter-string length limits. `extraFilter` (optional) is
 * ANDed against the segment filter.
 */
export async function chunkedInBySegment<T extends { segment: string }>(
    pb: PocketBase,
    collection: string,
    ids: string[],
    extraFilter?: string,
): Promise<T[]> {
    if (ids.length === 0) return [];
    const results: T[] = [];
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const idFilters = chunk.map((id) => `segment = "${id}"`).join(' || ');
        let filter = chunk.length === 1
            ? `segment = "${chunk[0]}"`
            : `(${idFilters})`;
        if (extraFilter) filter = `(${filter}) && (${extraFilter})`;

        const records = await pb.collection(collection).getFullList<T>({ filter });
        results.push(...records);
    }
    return results;
}

/**
 * Attach segment context to each record and sort by segment position
 * (ascending), then record id for a stable secondary order.
 */
export function withSegmentContext<T extends { segment: string; id: string }>(
    records: T[],
    contexts: Map<string, SegmentContext>,
): Array<T & { segment_context: SegmentContext }> {
    const out: Array<T & { segment_context: SegmentContext }> = [];
    for (const r of records) {
        const ctx = contexts.get(r.segment);
        if (!ctx) continue; // orphan record (segment no longer in article) — skip
        out.push({ ...r, segment_context: ctx });
    }
    out.sort((a, b) => {
        const pa = a.segment_context.position;
        const pb = b.segment_context.position;
        if (pa !== pb) return pa - pb;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    return out;
}
