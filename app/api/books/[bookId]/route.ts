/**
 * GET /api/books/[bookId]
 *
 * Lists articles within a specific book.
 *
 * Phase 1 of docs/BOOK_HIERARCHY_UI_PLAN.md — data/API layer only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params;
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch book info
    const bookRecord = await pb.collection('books').getOne(bookId, {
      fields: 'id,title,title_ja,author,summary,book_type,year',
    }).catch(() => null);

    if (!bookRecord) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    const book = JSON.parse(JSON.stringify(bookRecord)) as Record<string, unknown>;

    // Fetch articles belonging to this book
    // PocketBase filter: book = "bookId" (bare relation name, not book_id)
    const articles = await pb.collection('articles').getFullList({
      filter: `book = "${bookId}"`,
      sort: 'title',
      fields:
        'id,title,title_ja,translation_status,segment_count,doc_type,author,summary,segmented',
    });

    const items = articles.map((raw) => {
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
      total: items.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
