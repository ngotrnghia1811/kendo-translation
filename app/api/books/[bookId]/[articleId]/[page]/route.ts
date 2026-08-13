/**
 * GET /api/books/[bookId]/[articleId]/[page]
 *
 * Returns the segments for a specific page of an article.
 *
 * Uses the article-pages hook to resolve which segment IDs belong to
 * the requested page, then fetches those segments via the
 * article-bilingual-window hook (page-parameter mode).
 *
 * Phase 1 of docs/BOOK_HIERARCHY_UI_PLAN.md — data/API layer only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
import { normalizeRubyData } from '@/lib/furigana/normalize';

const PB_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; articleId: string; page: string }> },
) {
  const { bookId, articleId, page: pageStr } = await params;
  const pageNumber = parseInt(pageStr, 10);
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isNaN(pageNumber) || pageNumber < 1) {
    return NextResponse.json({ error: 'Invalid page number' }, { status: 400 });
  }

  const targetLang = req.nextUrl.searchParams.get('target_lang') ?? 'en';

  try {
    // Confirm the article exists and belongs to this book
    const articleRecord = await pb.collection('articles').getOne(articleId, {
      fields: 'id,title,title_ja,book,segment_count',
    }).catch(() => null);

    if (!articleRecord) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    const article = JSON.parse(JSON.stringify(articleRecord)) as Record<string, unknown>;

    if ((article.book as string) !== bookId) {
      return NextResponse.json(
        { error: 'Article does not belong to the specified book' },
        { status: 404 },
      );
    }

    // Get the page index to resolve which segment IDs belong to this page
    const pagesUrl = new URL(`${PB_URL}/api/custom/article-pages`);
    pagesUrl.searchParams.set('article_id', articleId);
    pagesUrl.searchParams.set('target_lang', targetLang);

    const pagesRes = await fetch(pagesUrl.toString());
    if (!pagesRes.ok) {
      return NextResponse.json(
        { error: `Page lookup failed: ${pagesRes.status}` },
        { status: 500 },
      );
    }

    const pagesData = await pagesRes.json();
    const pages: Array<{ page_number: number; segment_ids: string[] }> =
      pagesData.pages ?? [];

    const targetPage = pages.find((p) => p.page_number === pageNumber);
    if (!targetPage) {
      return NextResponse.json(
        { error: `Page ${pageNumber} not found (article has ${pages.length} pages)` },
        { status: 404 },
      );
    }

    // Fetch the segments for this page
    // Use the article-bilingual-window hook with the page parameter
    // for source_page mode, or fetch by segment IDs for synthetic_chunk mode
    const mode: string = pagesData.mode ?? 'synthetic_chunk';

    let segments: Array<Record<string, unknown>> = [];

    if (mode === 'source_page') {
      // In source_page mode, page_number corresponds to the real metadata.page value
      // Use the existing article-bilingual-window hook's page parameter
      const winUrl = new URL(`${PB_URL}/api/custom/article-bilingual-window`);
      winUrl.searchParams.set('article_id', articleId);
      winUrl.searchParams.set('target_lang', targetLang);
      winUrl.searchParams.set('page', String(pageNumber));

      const winRes = await fetch(winUrl.toString());
      if (!winRes.ok) {
        return NextResponse.json(
          { error: `Segment fetch failed: ${winRes.status}` },
          { status: 500 },
        );
      }

      const winData = await winRes.json();
      segments = winData.items ?? [];
    } else {
      // synthetic_chunk mode: fetch segments by their IDs
      if (targetPage.segment_ids.length === 0) {
        return NextResponse.json({
          page_number: pageNumber,
          segment_count: 0,
          segments: [],
          mode,
        });
      }

      // Fetch segments via the book's collection. No target_lang filter:
      // monolingual articles (e.g. scraped English Kendojidai web articles)
      // store their content under a target_lang that differs from the reader's
      // default 'en', so filtering here would return zero rows. The page's
      // segment_ids (resolved by the article-pages hook) already select the
      // correct rows below.
      const allSegments = await pb.collection('segments').getFullList({
        filter: `article = "${articleId}"`,
        sort: '+position',
      });

      // Filter to only the IDs in this page
      const idSet = new Set(targetPage.segment_ids);
      segments = allSegments
        .filter((s) => idSet.has((s as Record<string, unknown>).id as string))
        .map((raw) => JSON.parse(JSON.stringify(raw)) as Record<string, unknown>);
    }

    return NextResponse.json({
      page_number: pageNumber,
      page_count: pages.length,
      segment_count: segments.length,
      mode,
      article: {
        id: article.id as string,
        title: article.title as string,
        title_ja: (article.title_ja as string) ?? null,
        segment_count: article.segment_count as number,
      },
      segments: segments.map((s) => ({
        ...s,
        ruby_data: normalizeRubyData(s.ruby_data),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
