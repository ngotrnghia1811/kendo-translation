/**
 * GET /api/documents/[id]/suggestions
 *
 * Article-wide suggestion rollup (Phase 1, data layer). Returns all
 * suggestions (human + agent) across every segment in the article with
 * per-segment context attached.
 *
 * Query params:
 *   status         — "pending" | "accepted" | "rejected" | "superseded"
 *   suggester_kind — "human" | "agent"
 *   page           — 1-based page (default 1)
 *   per_page       — items per page (default 200, max 500)
 *
 * Response:
 *   { items: Array<suggestion & { segment_context }>, page, per_page,
 *     total_items, total_pages }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
import {
    fetchArticleSegmentContexts,
    chunkedInBySegment,
    withSegmentContext,
} from '@/lib/pocketbase/article-aggregate';
import { relationUsername, pbTimestamp } from '@/lib/pocketbase/display';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_STATUSES = new Set(['pending', 'accepted', 'rejected', 'superseded']);
const VALID_KINDS = new Set(['human', 'agent']);

const DEFAULT_PER_PAGE = 200;
const MAX_PER_PAGE = 500;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: articleId } = await params;
    const pb = await createServerClient();

    if (!pb.authStore.isValid || !pb.authStore.record) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!UUID_RE.test(articleId)) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Article existence check
    try {
        await pb.collection('articles').getOne(articleId);
    } catch {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);

    // ── filters ──────────────────────────────────────────────────
    const filters: string[] = [];
    const status = searchParams.get('status');
    if (status !== null && status !== '') {
        if (!VALID_STATUSES.has(status)) {
            return NextResponse.json(
                { error: "`status` must be one of 'pending', 'accepted', 'rejected', 'superseded'" },
                { status: 400 },
            );
        }
        filters.push(`status = "${status}"`);
    }
    const kind = searchParams.get('suggester_kind');
    if (kind !== null && kind !== '') {
        if (!VALID_KINDS.has(kind)) {
            return NextResponse.json(
                { error: "`suggester_kind` must be 'human' or 'agent'" },
                { status: 400 },
            );
        }
        filters.push(`suggester_kind = "${kind}"`);
    }
    const extraFilter = filters.length > 0 ? filters.join(' && ') : undefined;

    // ── pagination ───────────────────────────────────────────────
    let page = 1;
    let perPage = DEFAULT_PER_PAGE;
    const pageParam = searchParams.get('page');
    const perPageParam = searchParams.get('per_page');
    if (pageParam !== null) {
        const p = Number.parseInt(pageParam, 10);
        if (!Number.isFinite(p) || p < 1) {
            return NextResponse.json({ error: '`page` must be a positive integer' }, { status: 400 });
        }
        page = p;
    }
    if (perPageParam !== null) {
        const n = Number.parseInt(perPageParam, 10);
        if (!Number.isFinite(n) || n < 1 || n > MAX_PER_PAGE) {
            return NextResponse.json(
                { error: `\`per_page\` must be an integer between 1 and ${MAX_PER_PAGE}` },
                { status: 400 },
            );
        }
        perPage = n;
    }

    try {
        const { contexts, ids } = await fetchArticleSegmentContexts(pb, articleId);
        if (ids.length === 0) {
            return NextResponse.json({ items: [], page, per_page: perPage, total_items: 0, total_pages: 0 });
        }

        const records = await chunkedInBySegment<{ id: string; segment: string } & Record<string, unknown>>(
            pb,
            'segment_suggestions',
            ids,
            extraFilter,
            'suggester',
        );
        const items = withSegmentContext(records, contexts).map((r) => ({
            ...r,
            suggester_name: relationUsername(r, 'suggester'),
            created_at: pbTimestamp(r),
        }));

        const totalItems = items.length;
        const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / perPage);
        const start = (page - 1) * perPage;
        const slice = items.slice(start, start + perPage);

        return NextResponse.json({
            items: slice,
            page,
            per_page: perPage,
            total_items: totalItems,
            total_pages: totalPages,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
