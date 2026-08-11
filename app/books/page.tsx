/**
 * /books — Book list (level 1 / mobile level 0).
 *
 * Fetches all books from PocketBase and renders BookBrowsePanels.
 * Phase 2 of docs/BOOK_HIERARCHY_UI_PLAN.md.
 */

import { createServerClient } from '@/lib/pocketbase/server';
import { redirect } from 'next/navigation';
import BookBrowsePanels from '@/components/books/BookBrowsePanels';
import type { BookSummary } from '@/components/books/types';

export default async function BooksPage() {
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    redirect('/login?next=/books');
  }

  // Fetch books directly from PocketBase (same logic as GET /api/books)
  const rawBooks = await pb.collection('books').getFullList({
    sort: 'title',
    fields: 'id,title,title_ja,author,summary,book_type,year',
  });

  // Count articles per book
  const allArticles = await pb.collection('articles').getFullList({
    filter: 'book != ""',
    fields: 'book',
  });
  const countMap = new Map<string, number>();
  for (const a of allArticles) {
    const bookId = (a as Record<string, unknown>).book as string;
    if (bookId) countMap.set(bookId, (countMap.get(bookId) ?? 0) + 1);
  }

  const books: BookSummary[] = rawBooks.map((raw) => {
    const b = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
    return {
      id: b.id as string,
      title: (b.title as string) ?? '',
      title_ja: (b.title_ja as string) ?? null,
      author: (b.author as string) ?? null,
      summary: (b.summary as string) ?? null,
      book_type: (b.book_type as BookSummary['book_type']) ?? 'uncategorized',
      year: (b.year as number) ?? null,
      article_count: countMap.get(b.id as string) ?? 0,
    };
  });

  return <BookBrowsePanels initialBooks={books} />;
}
