/**
 * GET /api/documents/[id]/comments
 *
 * Article-wide comment rollup (Phase 1, data layer). Returns all comments
 * across every segment in the article with per-segment context attached and
 * the existing threaded structure (`parent_comment_id`) preserved.
 *
 * Query params:
 *   status   — "open" (resolved = false) | "resolved" (resolved = true)
 *   page     — 1-based page (default 1)
 *   per_page — items per page (default 200, max 500)
 *
 * Response:
 *   { items: Array<comment & { segment_context }>, page, per_page,
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

    // ── status filter ────────────────────────────────────────────
    const status = searchParams.get('status');
    let extraFilter: string | undefined;
    if (status === 'open') {
        extraFilter = 'resolved = false';
    } else if (status === 'resolved') {
        extraFilter = 'resolved = true';
    } else if (status !== null && status !== '') {
        return NextResponse.json(
            { error: "`status` must be 'open', 'resolved', or omitted" },
            { status: 400 },
        );
    }

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
            'segment_comments',
            ids,
            extraFilter,
            'user',
        );
        const items = withSegmentContext(records, contexts).map((r) => ({
            ...r,
            author_name: relationUsername(r, 'user'),
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
