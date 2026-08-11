/**
 * GET /api/books/[bookId]/[articleId]
 *
 * Returns the page index for an article — calls the PocketBase custom hook
 * `GET /api/custom/article-pages` which implements the hybrid pagination
 * logic (source-page grouping where metadata.page exists, 25-seg chunks
 * otherwise).
 *
 * Phase 1 of docs/BOOK_HIERARCHY_UI_PLAN.md — data/API layer only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

const PB_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; articleId: string }> },
) {
  const { bookId, articleId } = await params;
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targetLang = req.nextUrl.searchParams.get('target_lang') ?? 'en';

  try {
    // Confirm the article exists and belongs to this book
    const articleRecord = await pb.collection('articles').getOne(articleId, {
      fields: 'id,title,title_ja,book,segment_count,translation_status',
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

    // Call the article-pages custom hook
    const pagesUrl = new URL(`${PB_URL}/api/custom/article-pages`);
    pagesUrl.searchParams.set('article_id', articleId);
    pagesUrl.searchParams.set('target_lang', targetLang);

    const pagesRes = await fetch(pagesUrl.toString());
    if (!pagesRes.ok) {
      return NextResponse.json(
        { error: `Page computation failed: ${pagesRes.status}` },
        { status: 500 },
      );
    }

    const pagesData = await pagesRes.json();

    return NextResponse.json({
      article: {
        id: article.id as string,
        title: article.title as string,
        title_ja: (article.title_ja as string) ?? null,
        segment_count: (article.segment_count as number) ?? 0,
        translation_status: (article.translation_status as string) ?? 'pending',
      },
      page_count: pagesData.pages?.length ?? 0,
      mode: pagesData.mode ?? 'synthetic_chunk',
      pages: (pagesData.pages ?? []).map(
        (p: { page_number: number; segment_ids: string[] }) => ({
          page_number: p.page_number,
          segment_count: p.segment_ids.length,
        }),
      ),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
