/**
 * GET /api/books/[bookId]
 *
 * Lists articles within a specific book.  Supports search, sort, status
 * filter, and offset/limit pagination (Phase B — feature parity with the
 * old flat DocumentsList).
 *
 * Query params:
 *   q        — case-insensitive article title search (default: none)
 *   sort_by  — "title" | "segment_count" | "translation_status" (default: "title")
 *   sort_dir — "asc" | "desc" (default: "asc")
 *   status   — "all" | "in_progress" | "complete" (default: "all")
 *   limit    — page size (default 30, max 100)
 *   offset   — 0-based offset (default 0, ignored when status != "all")
 *
 * Phase 1 + Phase B of docs/BOOK_HIERARCHY_UI_PLAN.md.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
import { withHuskExclusion } from '@/lib/husk-filter';

const VALID_SORT_BY = new Set(['title', 'segment_count', 'translation_status']);
const VALID_STATUS = new Set(['all', 'in_progress', 'complete']);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params;
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const q = (searchParams.get('q') ?? '').trim() || null;
  const rawSortBy = searchParams.get('sort_by') ?? 'title';
  const rawSortDir = (searchParams.get('sort_dir') ?? 'asc').toLowerCase();
  const rawStatus = searchParams.get('status') ?? 'all';
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10) || 30));
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);

  const sortBy = VALID_SORT_BY.has(rawSortBy) ? rawSortBy : 'title';
  const sortDir = rawSortDir === 'desc' ? 'desc' : 'asc';
  const status = VALID_STATUS.has(rawStatus) ? rawStatus : 'all';

  try {
    // Fetch book info
    const bookRecord = await pb.collection('books').getOne(bookId, {
      fields: 'id,title,title_ja,author,summary,book_type,year',
    }).catch(() => null);

    if (!bookRecord) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    const book = JSON.parse(JSON.stringify(bookRecord)) as Record<string, unknown>;

    // Build filter
    const filterParts: string[] = [`book = "${bookId}"`];

    // Exclude husk articles (shouldn't happen for articles with a book
    // relation, but belt-and-suspenders with the same filter pattern).
    const huskExclusion = withHuskExclusion();
    if (huskExclusion) filterParts.push(`(${huskExclusion})`);

    if (q) {
      // Case-insensitive title search via PocketBase ~ operator
      filterParts.push(`title ~ "${q.replace(/"/g, '\\"')}"`);
    }

    // Build sort string
    // For "translation_status", map to a custom ordering since PocketBase
    // doesn't support CASE expressions in sort strings. We fetch all (or
    // up to a large limit) and sort in-memory for that case.
    const needsMemorySort = sortBy === 'translation_status';
    let pbSort = 'title';
    switch (sortBy) {
      case 'title':
        pbSort = sortDir === 'desc' ? '-title' : 'title';
        break;
      case 'segment_count':
        pbSort = sortDir === 'desc' ? '-segment_count' : 'segment_count';
        break;
      case 'translation_status':
        // Fallback: sort by title on the PB side, then re-sort in memory
        pbSort = 'title';
        break;
    }

    // Fetch articles
    const filterStr = filterParts.join(' && ');

    if (needsMemorySort || status !== 'all') {
      // Fetch all articles matching the filter, then sort/filter in memory,
      // then apply offset/limit.
      const allArticles = await pb.collection('articles').getFullList({
        filter: filterStr,
        sort: pbSort,
        fields:
          'id,title,title_ja,translation_status,segment_count,doc_type,author,summary,segmented',
      });

      const items = allArticles.map((raw) => {
        const a = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
        return {
          id: a.id,
          title: a.title ?? '',
          title_ja: a.title_ja ?? null,
          translation_status: a.translation_status ?? 'pending',
          segment_count: a.segment_count ?? 0,
          doc_type: a.doc_type ?? 'article',
          author: a.author ?? null,
          summary: a.summary ?? null,
          segmented: a.segmented ?? false,
        };
      });

      // Apply status filter in memory
      let filtered = items;
      if (status === 'complete') {
        filtered = items.filter((a) => {
          const s = a.translation_status as string;
          return s === 'complete' || s === 'qa_approved';
        });
      } else if (status === 'in_progress') {
        filtered = items.filter((a) => {
          const s = a.translation_status as string;
          return s !== 'complete' && s !== 'qa_approved' && s !== 'pending';
        });
      }

      // Apply sort in memory (for translation_status)
      if (needsMemorySort) {
        const statusOrder: Record<string, number> = {
          pending: 0,
          draft: 1,
          in_progress: 1,
          translated: 2,
          review: 3,
          complete: 3,
          qa_approved: 4,
          approved: 4,
          published: 5,
        };
        const dir = sortDir === 'desc' ? -1 : 1;
        filtered.sort((a, b) => {
          const sa = statusOrder[a.translation_status as string] ?? 0;
          const sb = statusOrder[b.translation_status as string] ?? 0;
          return (sa - sb) * dir;
        });
      }

      const total = filtered.length;
      const paged = filtered.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return NextResponse.json({
        book: {
          id: book.id as string,
          title: book.title as string,
          title_ja: (book.title_ja as string) ?? null,
          author: (book.author as string) ?? null,
          summary: (book.summary as string) ?? null,
          book_type: (book.book_type as string) ?? 'uncategorized',
          year: (book.year as number) ?? null,
        },
        articles: paged,
        total,
        offset,
        has_more: hasMore,
      });
    }

    // Simple path: no memory sort/filter needed, use PB pagination
    const totalResult = await pb.collection('articles').getList(1, 1, {
      filter: filterStr,
      fields: 'id',
    });
    const total = totalResult.totalItems;

    const articles = await pb.collection('articles').getList(
      Math.floor(offset / limit) + 1,
      limit,
      {
        filter: filterStr,
        sort: pbSort,
        fields:
          'id,title,title_ja,translation_status,segment_count,doc_type,author,summary,segmented',
      },
    );

    const items = articles.items.map((raw) => {
      const a = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
      return {
        id: a.id,
        title: a.title ?? '',
        title_ja: a.title_ja ?? null,
        translation_status: a.translation_status ?? 'pending',
        segment_count: a.segment_count ?? 0,
        doc_type: a.doc_type ?? 'article',
        author: a.author ?? null,
        summary: a.summary ?? null,
        segmented: a.segmented ?? false,
      };
    });

    const hasMore = offset + items.length < total;

    return NextResponse.json({
      book: {
        id: book.id as string,
        title: book.title as string,
        title_ja: (book.title_ja as string) ?? null,
        author: (book.author as string) ?? null,
        summary: (book.summary as string) ?? null,
        book_type: (book.book_type as string) ?? 'uncategorized',
        year: (book.year as number) ?? null,
      },
      articles: items,
      total,
      offset,
      has_more: hasMore,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
