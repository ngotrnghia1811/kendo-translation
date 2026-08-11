/**
 * GET /api/books
 *
 * Lists all books (id, title, title_ja, author, summary, book_type, year,
 * article_count).  Uses the live PocketBase `books` collection.
 *
 * Phase 1 of docs/BOOK_HIERARCHY_UI_PLAN.md — data/API layer only.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

const PB_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export async function GET() {
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all books (40 total, small enough for getFullList)
    const books = await pb.collection('books').getFullList({
      sort: 'title',
      fields: 'id,title,title_ja,author,summary,book_type,year',
    });

    // Count articles per book in one batch
    const allArticles = await pb.collection('articles').getFullList({
      filter: 'book != ""',
      fields: 'book',
    });

    const countMap = new Map<string, number>();
    for (const a of allArticles) {
      const bookId = (a as Record<string, unknown>).book as string;
      if (bookId) {
        countMap.set(bookId, (countMap.get(bookId) ?? 0) + 1);
      }
    }

    const result = books.map((raw) => {
      const b = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
      return {
        id: b.id,
        title: b.title ?? '',
        title_ja: b.title_ja ?? null,
        author: b.author ?? null,
        summary: b.summary ?? null,
        book_type: b.book_type ?? 'uncategorized',
        year: b.year ?? null,
        article_count: countMap.get(b.id as string) ?? 0,
      };
    });

    return NextResponse.json({ books: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
