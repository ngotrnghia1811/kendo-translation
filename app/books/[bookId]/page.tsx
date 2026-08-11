/**
 * /books/[bookId] — Book detail + article list (level 2 / mobile level 1).
 * Phase 2 of docs/BOOK_HIERARCHY_UI_PLAN.md.
 */

import { createServerClient } from '@/lib/pocketbase/server';
import { redirect, notFound } from 'next/navigation';
import BookBrowsePanels from '@/components/books/BookBrowsePanels';
import type { BookSummary, ArticleSummary } from '@/components/books/types';

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    redirect('/login?next=/books');
  }

  // Fetch all books (for sidebar)
  const rawBooks = await pb.collection('books').getFullList({
    sort: 'title',
    fields: 'id,title,title_ja,author,summary,book_type,year',
  });

  const allArticles = await pb.collection('articles').getFullList({
    filter: 'book != ""',
    fields: 'book',
  });
  const countMap = new Map<string, number>();
  for (const a of allArticles) {
    const bid = (a as Record<string, unknown>).book as string;
    if (bid) countMap.set(bid, (countMap.get(bid) ?? 0) + 1);
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

  // Fetch this specific book
  const bookRecord = await pb.collection('books').getOne(bookId, {
    fields: 'id,title,title_ja,author,summary,book_type,year',
  }).catch(() => null);

  if (!bookRecord) notFound();
  const bookRaw = JSON.parse(JSON.stringify(bookRecord)) as Record<string, unknown>;

  const targetBook: BookSummary = {
    id: bookRaw.id as string,
    title: (bookRaw.title as string) ?? '',
    title_ja: (bookRaw.title_ja as string) ?? null,
    author: (bookRaw.author as string) ?? null,
    summary: (bookRaw.summary as string) ?? null,
    book_type: (bookRaw.book_type as BookSummary['book_type']) ?? 'uncategorized',
    year: (bookRaw.year as number) ?? null,
    article_count: countMap.get(bookRaw.id as string) ?? 0,
  };

  // Fetch articles for this book
  const rawArticles = await pb.collection('articles').getFullList({
    filter: `book = "${bookId}"`,
    sort: 'title',
    fields:
      'id,title,title_ja,translation_status,segment_count,doc_type,author,summary,segmented',
  });

  const articles: ArticleSummary[] = rawArticles.map((raw) => {
    const a = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
    return {
      id: a.id as string,
      title: (a.title as string) ?? '',
      title_ja: (a.title_ja as string) ?? null,
      translation_status: (a.translation_status as string) ?? 'pending',
      segment_count: (a.segment_count as number) ?? 0,
      doc_type: (a.doc_type as string) ?? 'article',
      author: (a.author as string) ?? null,
      summary: (a.summary as string) ?? null,
      segmented: (a.segmented as boolean) ?? false,
    };
  });

  return (
    <BookBrowsePanels
      initialBooks={books}
      initialBook={{
        book: targetBook,
        articles,
        total: articles.length,
      }}
    />
  );
}
