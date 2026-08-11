'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTitleLanguage } from '@/hooks/useTitleLanguage';
import type {
  BookSummary,
  ArticleSummary,
  ArticlePages,
} from '@/components/books/types';

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface BookBrowsePanelsProps {
  /** Pre-fetched book list (from the server component). */
  initialBooks: BookSummary[];
  /** If a book is pre-selected (from /books/[bookId]), supply its articles. */
  initialBook?: {
    book: BookSummary;
    articles: ArticleSummary[];
    total: number;
  } | null;
  /** If an article is pre-selected (from /books/[bookId]/[articleId]), supply its pages. */
  initialArticlePages?: ArticlePages | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                        */
/* ------------------------------------------------------------------ */

const BOOK_TYPE_LABELS: Record<string, string> = {
  year_compilation: 'Year',
  topic_compilation: 'Topic',
  uncategorized: 'Uncat',
};

const BOOK_TYPE_COLORS: Record<string, string> = {
  year_compilation:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  topic_compilation:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  uncategorized:
    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  complete: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  qa_approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  translated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                   */
/* ------------------------------------------------------------------ */

/** A chevron icon — reused across mobile/desktop. */
function ChevronRight({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      style={style}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function ChevronLeft({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      style={style}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

/** Loading skeleton for a panel. */
function PanelSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                   */
/* ------------------------------------------------------------------ */

export default function BookBrowsePanels({
  initialBooks,
  initialBook,
  initialArticlePages,
}: BookBrowsePanelsProps) {
  const router = useRouter();
  const { titleLanguage, toggleTitleLanguage } = useTitleLanguage();

  /* -- state ------------------------------------------------------ */
  const [mobileLevel, setMobileLevel] = useState<0 | 1 | 2>(
    initialArticlePages ? 2 : initialBook ? 1 : 0,
  );
  const [selectedBookId, setSelectedBookId] = useState<string | null>(
    initialBook?.book.id ?? null,
  );
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    initialArticlePages?.article.id ?? null,
  );

  // Data stores
  const [books] = useState<BookSummary[]>(initialBooks);
  const [articlesByBook, setArticlesByBook] = useState<
    Record<string, { book: BookSummary; articles: ArticleSummary[]; total: number }>
  >(initialBook ? { [initialBook.book.id]: initialBook } : {});
  const [pagesByArticle, setPagesByArticle] = useState<
    Record<string, ArticlePages>
  >(initialArticlePages ? { [initialArticlePages.article.id]: initialArticlePages } : {});

  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);

  // Refs to always have the latest selected IDs (avoids stale-closure bugs
  // when the user clicks rapidly between levels and callbacks haven't been
  // re-created yet).
  const selectedBookIdRef = useRef(selectedBookId);
  selectedBookIdRef.current = selectedBookId;
  const selectedArticleIdRef = useRef(selectedArticleId);
  selectedArticleIdRef.current = selectedArticleId;

  // Derived
  const selectedBook = selectedBookId ? articlesByBook[selectedBookId] ?? null : null;
  const selectedArticle = selectedArticleId ? pagesByArticle[selectedArticleId] ?? null : null;

  /* -- fetch helpers --------------------------------------------- */
  const fetchArticles = useCallback(async (bookId: string) => {
    if (articlesByBook[bookId]) return;
    setLoadingArticles(true);
    try {
      const res = await fetch(`/api/books/${bookId}`);
      if (res.ok) {
        const data = await res.json();
        setArticlesByBook((prev) => ({
          ...prev,
          [bookId]: data,
        }));
      }
    } finally {
      setLoadingArticles(false);
    }
  }, [articlesByBook]);

  const fetchPages = useCallback(async (bookId: string, articleId: string) => {
    if (pagesByArticle[articleId]) return;
    setLoadingPages(true);
    try {
      const res = await fetch(`/api/books/${bookId}/${articleId}`);
      if (res.ok) {
        const data = await res.json();
        setPagesByArticle((prev) => ({
          ...prev,
          [articleId]: data,
        }));
      }
    } finally {
      setLoadingPages(false);
    }
  }, [pagesByArticle]);

  /* -- handlers -------------------------------------------------- */
  const handleSelectBook = useCallback(
    (bookId: string) => {
      const currentBookId = selectedBookIdRef.current;
      if (currentBookId === bookId) {
        // Deselect
        setSelectedBookId(null);
        setSelectedArticleId(null);
        setMobileLevel(0);
        router.push('/books');
      } else {
        setSelectedBookId(bookId);
        setSelectedArticleId(null);
        setMobileLevel(1);
        router.push(`/books/${bookId}`);
        fetchArticles(bookId);
      }
    },
    [router, fetchArticles],
  );

  const handleSelectArticle = useCallback(
    (articleId: string) => {
      const currentBookId = selectedBookIdRef.current;
      if (!currentBookId) return;
      const currentArticleId = selectedArticleIdRef.current;
      if (currentArticleId === articleId) {
        // Deselect
        setSelectedArticleId(null);
        setMobileLevel(1);
        router.push(`/books/${currentBookId}`);
      } else {
        setSelectedArticleId(articleId);
        setMobileLevel(2);
        router.push(`/books/${currentBookId}/${articleId}`);
        fetchPages(currentBookId, articleId);
      }
    },
    [router, fetchPages],
  );

  const handleSelectPage = useCallback(
    (pageNumber: number) => {
      const currentBookId = selectedBookIdRef.current;
      const currentArticleId = selectedArticleIdRef.current;
      if (!currentBookId || !currentArticleId) return;
      router.push(`/books/${currentBookId}/${currentArticleId}/${pageNumber}`);
    },
    [router],
  );

  const handleMobileBack = useCallback(() => {
    const currentBookId = selectedBookIdRef.current;
    if (mobileLevel === 2) {
      setMobileLevel(1);
      setSelectedArticleId(null);
      if (currentBookId) router.push(`/books/${currentBookId}`);
    } else if (mobileLevel === 1) {
      setMobileLevel(0);
      setSelectedBookId(null);
      setSelectedArticleId(null);
      router.push('/books');
    }
  }, [mobileLevel, router]);

  /* -- mobile breadcrumb / back-row ------------------------------ */
  const mobileBreadcrumb = (
    <div className="md:hidden flex items-center gap-2 pb-3 mb-3 border-b border-[var(--color-border)]">
      {mobileLevel > 0 && (
        <button
          type="button"
          onClick={handleMobileBack}
          className="flex items-center gap-1 text-sm font-medium shrink-0 px-2 py-1 rounded hover:bg-[var(--color-bg)] transition-colors"
          style={{ color: 'var(--color-link)' }}
          aria-label="Go back"
        >
          <ChevronLeft />
          <span className="hidden sm:inline">Back</span>
        </button>
      )}
      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span className={mobileLevel >= 0 ? 'font-semibold' : ''} style={{ color: mobileLevel === 0 ? 'var(--color-text)' : undefined }}>
          Books
        </span>
        {mobileLevel >= 1 && (
          <>
            <ChevronRight className="w-3 h-3 mx-0.5" />
            <span className={mobileLevel === 1 ? 'font-semibold' : ''} style={{ color: mobileLevel === 1 ? 'var(--color-text)' : undefined }}>
              {selectedBook?.book.title ?? 'Articles'}
            </span>
          </>
        )}
        {mobileLevel >= 2 && (
          <>
            <ChevronRight className="w-3 h-3 mx-0.5" />
            <span className="font-semibold text-[var(--color-text)] truncate max-w-[140px]">
              {selectedArticle?.article.title ?? 'Pages'}
            </span>
          </>
        )}
      </div>
    </div>
  );

  /* -- column: Books --------------------------------------------- */
  const booksPanel = (
    <div className="shrink-0 w-full md:w-1/3 lg:w-1/4 md:border-r border-[var(--color-border)] overflow-y-auto">
      <div className="p-2 sm:p-3">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Books
          </h2>
          <button
            type="button"
            onClick={toggleTitleLanguage}
            title={`Toggle title language (currently ${titleLanguage === 'en' ? 'English' : 'Japanese'})`}
            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border transition-colors leading-none"
            style={{
              backgroundColor: titleLanguage === 'ja' ? '#3b82f6' : 'var(--color-surface)',
              borderColor: titleLanguage === 'ja' ? '#3b82f6' : 'var(--color-border)',
              color: titleLanguage === 'ja' ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            {titleLanguage === 'en' ? '日' : 'EN'}
          </button>
        </div>
        <div className="space-y-1">
          {books.map((book) => {
            const isSelected = selectedBookId === book.id;
            return (
              <button
                key={book.id}
                type="button"
                onClick={() => handleSelectBook(book.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg)]'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: isSelected ? 'var(--color-link)' : 'var(--color-text)' }}
                    >
                      {titleLanguage === 'ja' && book.title_ja ? book.title_ja : book.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${BOOK_TYPE_COLORS[book.book_type] ?? BOOK_TYPE_COLORS.uncategorized}`}
                      >
                        {BOOK_TYPE_LABELS[book.book_type] ?? 'Uncat'}
                      </span>
                      {book.year && (
                        <span className="text-[10px] text-[var(--color-text-muted)]">{book.year}</span>
                      )}
                      <span className="text-[10px] text-[var(--color-text-muted)]">{book.article_count} art.</span>
                    </div>
                  </div>
                  {isSelected && (
                    <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-link)' }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* -- column: Articles ------------------------------------------ */
  const articlesPanel = (
    <div className="shrink-0 w-full md:w-1/3 lg:w-1/4 md:border-r border-[var(--color-border)] overflow-y-auto">
      {selectedBook ? (
        <div className="p-2 sm:p-3">
          <div className="mb-3 px-1">
            <h2
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--color-text)' }}
              title={selectedBook.book.title}
            >
              {titleLanguage === 'ja' && selectedBook.book.title_ja
                ? selectedBook.book.title_ja
                : selectedBook.book.title}
            </h2>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {selectedBook.total} article{selectedBook.total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-1">
            {selectedBook.articles.map((article) => {
              const isSelected = selectedArticleId === article.id;
              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => handleSelectArticle(article.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg)]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: isSelected ? 'var(--color-link)' : 'var(--color-text)' }}
                      >
                        {titleLanguage === 'ja' && article.title_ja ? article.title_ja : article.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            STATUS_COLORS[article.translation_status] ?? STATUS_COLORS.pending
                          }`}
                        >
                          {article.translation_status === 'qa_approved' ? 'complete' : article.translation_status || 'pending'}
                        </span>
                        {article.segment_count > 0 && (
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            {article.segment_count} seg.
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-link)' }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : loadingArticles ? (
        <PanelSkeleton />
      ) : (
        <div className="flex items-center justify-center h-full p-6">
          <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
            Select a book to see its articles.
          </p>
        </div>
      )}
    </div>
  );

  /* -- column: Pages --------------------------------------------- */
  const pagesPanel = (
    <div className="shrink-0 w-full md:w-1/3 lg:w-1/4 overflow-y-auto">
      {selectedArticle ? (
        <div className="p-2 sm:p-3">
          <div className="mb-3 px-1">
            <h2
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--color-text)' }}
              title={selectedArticle.article.title}
            >
              {titleLanguage === 'ja' && selectedArticle.article.title_ja
                ? selectedArticle.article.title_ja
                : selectedArticle.article.title}
            </h2>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {selectedArticle.page_count} page{selectedArticle.page_count !== 1 ? 's' : ''}
              {selectedArticle.mode === 'source_page'
                ? ' (source-based)'
                : ' (chunked)'}
            </p>
          </div>
          <div className="space-y-1">
            {selectedArticle.pages.map((page) => (
              <button
                key={page.page_number}
                type="button"
                onClick={() => handleSelectPage(page.page_number)}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {selectedArticle.mode === 'source_page' ? 'Page' : 'Chunk'} {page.page_number}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {page.segment_count} seg.
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : loadingPages ? (
        <PanelSkeleton />
      ) : (
        <div className="flex items-center justify-center h-full p-6">
          <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
            {selectedBook ? 'Select an article to see its pages.' : 'Select a book and article to browse pages.'}
          </p>
        </div>
      )}
    </div>
  );

  /* -- layout ---------------------------------------------------- */
  return (
    <div className="h-[calc(100dvh-56px)] flex flex-col">
      {mobileBreadcrumb}

      {/* -- Desktop: 3-panel Miller-column layout (hidden on mobile) -- */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {booksPanel}
        {articlesPanel}
        {pagesPanel}
      </div>

      {/* -- Mobile: single-column stack (hidden on desktop) -- */}
      <div className="md:hidden flex-1 overflow-y-auto">
        {mobileLevel === 0 && booksPanel}
        {mobileLevel === 1 && articlesPanel}
        {mobileLevel === 2 && pagesPanel}
      </div>
    </div>
  );
}
