/**
 * /books/[bookId]/[articleId] — Page index for an article (level 3 / mobile level 2).
 * Phase 2 of docs/BOOK_HIERARCHY_UI_PLAN.md.
 */

import { createServerClient } from '@/lib/pocketbase/server';
import { redirect, notFound } from 'next/navigation';
import BookBrowsePanels from '@/components/books/BookBrowsePanels';
import type { BookSummary, ArticleSummary, ArticlePages } from '@/components/books/types';

const PB_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export default async function ArticlePagesPage({
  params,
}: {
  params: Promise<{ bookId: string; articleId: string }>;
}) {
  const { bookId, articleId } = await params;
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    redirect('/login?next=/books');
  }

  // Fetch books list
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

  // Fetch book detail
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

  // Fetch article pages from the PocketBase custom hook
  const articleRecord = await pb.collection('articles').getOne(articleId, {
    fields: 'id,title,title_ja,book,segment_count,translation_status',
  }).catch(() => null);
  if (!articleRecord) notFound();

  const articleRaw = JSON.parse(JSON.stringify(articleRecord)) as Record<string, unknown>;
  if ((articleRaw.book as string) !== bookId) notFound();

  const pagesUrl = new URL(`${PB_URL}/api/custom/article-pages`);
  pagesUrl.searchParams.set('article_id', articleId);
  pagesUrl.searchParams.set('target_lang', 'en');
  const pagesRes = await fetch(pagesUrl.toString());

  if (!pagesRes.ok) notFound();
  const pagesData = await pagesRes.json();

  const initialArticlePages: ArticlePages = {
    article: {
      id: articleRaw.id as string,
      title: (articleRaw.title as string) ?? '',
      title_ja: (articleRaw.title_ja as string) ?? null,
      segment_count: (articleRaw.segment_count as number) ?? 0,
      translation_status: (articleRaw.translation_status as string) ?? 'pending',
    },
    page_count: pagesData.pages?.length ?? 0,
    mode: (pagesData.mode as ArticlePages['mode']) ?? 'synthetic_chunk',
    pages: (pagesData.pages ?? []).map(
      (p: { page_number: number; segment_ids: string[] }) => ({
        page_number: p.page_number,
        segment_count: p.segment_ids.length,
      }),
    ),
  };

  return (
    <BookBrowsePanels
      initialBooks={books}
      initialBook={{ book: targetBook, articles, total: articles.length }}
      initialArticlePages={initialArticlePages}
    />
  );
}
