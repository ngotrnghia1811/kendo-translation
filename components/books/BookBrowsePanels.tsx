'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  initialBooks: BookSummary[];
  initialBook?: {
    book: BookSummary;
    articles: ArticleSummary[];
    total: number;
  } | null;
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
/*  Sort options                                                     */
/* ------------------------------------------------------------------ */

interface SortOption {
  sortBy: string;
  sortDir: string;
  label: string;
}

const BOOK_SORT_OPTIONS: SortOption[] = [
  { sortBy: 'title', sortDir: 'asc', label: 'Title A–Z' },
  { sortBy: 'title', sortDir: 'desc', label: 'Title Z–A' },
  { sortBy: 'article_count', sortDir: 'desc', label: 'Most articles' },
  { sortBy: 'article_count', sortDir: 'asc', label: 'Fewest articles' },
  { sortBy: 'year', sortDir: 'desc', label: 'Newest first' },
  { sortBy: 'year', sortDir: 'asc', label: 'Oldest first' },
];

const ARTICLE_SORT_OPTIONS: SortOption[] = [
  { sortBy: 'title', sortDir: 'asc', label: 'Title A–Z' },
  { sortBy: 'title', sortDir: 'desc', label: 'Title Z–A' },
  { sortBy: 'segment_count', sortDir: 'desc', label: 'Longest first' },
  { sortBy: 'segment_count', sortDir: 'asc', label: 'Shortest first' },
  { sortBy: 'translation_status', sortDir: 'desc', label: 'Most translated' },
  { sortBy: 'translation_status', sortDir: 'asc', label: 'Least translated' },
];

const ARTICLE_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Completed' },
];

const DEFAULT_ARTICLE_LIMIT = 30;

/* ------------------------------------------------------------------ */
/*  Sub-components                                                   */
/* ------------------------------------------------------------------ */

function ChevronRight({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function ChevronLeft({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronDown({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function PanelSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--color-border)' }} />
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

  /* -- mobile state ----------------------------------------------- */
  const [mobileLevel, setMobileLevel] = useState<0 | 1 | 2>(
    initialArticlePages ? 2 : initialBook ? 1 : 0,
  );
  const [selectedBookId, setSelectedBookId] = useState<string | null>(
    initialBook?.book.id ?? null,
  );
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    initialArticlePages?.article.id ?? null,
  );

  // Refs for latest selected IDs (avoids stale closures)
  const selectedBookIdRef = useRef(selectedBookId);
  selectedBookIdRef.current = selectedBookId;
  const selectedArticleIdRef = useRef(selectedArticleId);
  selectedArticleIdRef.current = selectedArticleId;

  /* -- books data ------------------------------------------------- */
  const [books] = useState<BookSummary[]>(initialBooks);

  /* -- articles data (per book) ----------------------------------- */
  const [articlesByBook, setArticlesByBook] = useState<
    Record<string, { book: BookSummary; articles: ArticleSummary[]; total: number; hasMore: boolean }>
  >(initialBook ? { [initialBook.book.id]: { ...initialBook, hasMore: false } } : {});
  const [articlesOffset, setArticlesOffset] = useState<Record<string, number>>({});
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  /* -- articles search/sort/filter state (per selected book) ------ */
  const [articleSearch, setArticleSearch] = useState('');
  const [articleSortBy, setArticleSortBy] = useState('title');
  const [articleSortDir, setArticleSortDir] = useState('asc');
  const [articleStatusFilter, setArticleStatusFilter] = useState('all');
  // Track the "active" params for the last fetch so we know when to reset
  const articleParamsRef = useRef<{ q: string; sortBy: string; sortDir: string; status: string } | null>(null);

  /* -- pages data ------------------------------------------------- */
  const [pagesByArticle, setPagesByArticle] = useState<
    Record<string, ArticlePages>
  >(initialArticlePages ? { [initialArticlePages.article.id]: initialArticlePages } : {});
  const [loadingPages, setLoadingPages] = useState(false);

  /* -- book expand state ------------------------------------------ */
  const [expandedBookIds, setExpandedBookIds] = useState<Set<string>>(new Set());

  /* -- book search + sort (client-side) --------------------------- */
  const [bookSearch, setBookSearch] = useState('');
  const [bookSortBy, setBookSortBy] = useState('title');
  const [bookSortDir, setBookSortDir] = useState('asc');

  // Debounce refs
  const articleSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived
  const selectedBook = selectedBookId ? articlesByBook[selectedBookId] ?? null : null;
  const selectedArticle = selectedArticleId ? pagesByArticle[selectedArticleId] ?? null : null;

  /* -- client-side sorted/filtered books -------------------------- */
  const displayedBooks = useMemo(() => {
    let result = [...books];

    // Search (client-side on title/title_ja)
    if (bookSearch.trim()) {
      const q = bookSearch.trim().toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.title_ja && b.title_ja.toLowerCase().includes(q)),
      );
    }

    // Sort (client-side)
    const dir = bookSortDir === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      switch (bookSortBy) {
        case 'title':
          return a.title.localeCompare(b.title) * dir;
        case 'article_count':
          return (a.article_count - b.article_count) * dir;
        case 'year':
          return ((a.year ?? 0) - (b.year ?? 0)) * dir;
        default:
          return 0;
      }
    });

    return result;
  }, [books, bookSearch, bookSortBy, bookSortDir]);

  /* -- fetch helpers --------------------------------------------- */

  const _fetchArticlesReq = useCallback(
    async (
      bookId: string,
      params: { q?: string; sortBy: string; sortDir: string; status: string; offset: number; append?: boolean },
    ) => {
      const url = new URL(`/api/books/${bookId}`, window.location.origin);
      url.searchParams.set('sort_by', params.sortBy);
      url.searchParams.set('sort_dir', params.sortDir);
      url.searchParams.set('status', params.status);
      url.searchParams.set('limit', String(DEFAULT_ARTICLE_LIMIT));
      url.searchParams.set('offset', String(params.offset));
      if (params.q) url.searchParams.set('q', params.q);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Failed to fetch articles: ${res.status}`);
      const data = await res.json();

      setArticlesByBook((prev) => {
        const existing = prev[bookId];
        if (params.append && existing) {
          // Append to existing list (load-more)
          return {
            ...prev,
            [bookId]: {
              book: existing.book,
              articles: [...existing.articles, ...(data.articles as ArticleSummary[])],
              total: data.total as number,
              hasMore: data.has_more as boolean,
            },
          };
        }
        // Replace
        return {
          ...prev,
          [bookId]: {
            book: data.book as BookSummary,
            articles: data.articles as ArticleSummary[],
            total: data.total as number,
            hasMore: data.has_more as boolean,
          },
        };
      });

      setArticlesOffset((prev) => ({
        ...prev,
        [bookId]: params.offset + (data.articles as ArticleSummary[]).length,
      }));

      return data;
    },
    [],
  );

  const fetchArticles = useCallback(
    async (bookId: string, resetParams?: { q?: string; sortBy?: string; sortDir?: string; status?: string }) => {
      const q = resetParams?.q ?? articleSearch;
      const sortBy = resetParams?.sortBy ?? articleSortBy;
      const sortDir = resetParams?.sortDir ?? articleSortDir;
      const status = resetParams?.status ?? articleStatusFilter;

      // Check if params changed → reset offset
      const prev = articleParamsRef.current;
      const paramsChanged =
        !prev ||
        prev.q !== q ||
        prev.sortBy !== sortBy ||
        prev.sortDir !== sortDir ||
        prev.status !== status;

      articleParamsRef.current = { q, sortBy, sortDir, status };

      if (paramsChanged) {
        setArticlesOffset((p) => ({ ...p, [bookId]: 0 }));
        setLoadingArticles(true);
      } else {
        setLoadingMore(true);
      }

      try {
        await _fetchArticlesReq(bookId, {
          q: q || undefined,
          sortBy,
          sortDir,
          status,
          offset: paramsChanged ? 0 : (articlesOffset[bookId] ?? 0),
          append: !paramsChanged,
        });
      } finally {
        setLoadingArticles(false);
        setLoadingMore(false);
      }
    },
    [_fetchArticlesReq, articleSearch, articleSortBy, articleSortDir, articleStatusFilter, articlesOffset],
  );

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

        // Reset article state for the new book (use refs to avoid stale-closure issues)
        setArticleSearch('');
        setArticleSortBy('title');
        setArticleSortDir('asc');
        setArticleStatusFilter('all');
        articleParamsRef.current = null;

        // Fetch articles if not already cached — pass explicit params to work
        // around React state batching (setArticleSearch hasn't flushed yet).
        if (!articlesByBook[bookId]) {
          // Use a private helper that bypasses the default state reads
          setArticlesOffset((p) => ({ ...p, [bookId]: 0 }));
          setLoadingArticles(true);
          _fetchArticlesReq(bookId, {
            sortBy: 'title',
            sortDir: 'asc',
            status: 'all',
            offset: 0,
          }).finally(() => setLoadingArticles(false));
        }
      }
    },
    [router, articlesByBook, _fetchArticlesReq],
  );

  const handleSelectArticle = useCallback(
    (articleId: string) => {
      const currentBookId = selectedBookIdRef.current;
      if (!currentBookId) return;
      const currentArticleId = selectedArticleIdRef.current;
      if (currentArticleId === articleId) {
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

  // Debounced article search
  const handleArticleSearchChange = useCallback((value: string) => {
    setArticleSearch(value);
    if (articleSearchTimer.current) clearTimeout(articleSearchTimer.current);
    articleSearchTimer.current = setTimeout(() => {
      const currentBookId = selectedBookIdRef.current;
      if (currentBookId) {
        fetchArticles(currentBookId, {
          q: value,
          sortBy: articleSortBy,
          sortDir: articleSortDir,
          status: articleStatusFilter,
        });
      }
    }, 350);
  }, [fetchArticles, articleSortBy, articleSortDir, articleStatusFilter]);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (articleSearchTimer.current) clearTimeout(articleSearchTimer.current);
    };
  }, []);

  const handleLoadMore = useCallback(() => {
    const currentBookId = selectedBookIdRef.current;
    if (!currentBookId) return;
    fetchArticles(currentBookId);
  }, [fetchArticles]);

  const toggleBookExpand = useCallback((bookId: string) => {
    setExpandedBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  }, []);

  /* -- mobile breadcrumb ----------------------------------------- */
  const mobileBreadcrumb = (
    <div className="md:hidden flex items-center gap-2 pb-3 mb-3 border-b border-[var(--color-border)]">
      {mobileLevel > 0 && (
        <button type="button" onClick={handleMobileBack}
          className="flex items-center gap-1 text-sm font-medium shrink-0 px-2 py-1 rounded hover:bg-[var(--color-bg)] transition-colors"
          style={{ color: 'var(--color-link)' }} aria-label="Go back">
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
        {/* Header row: title + language toggle */}
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Books
          </h2>
          <button type="button" onClick={toggleTitleLanguage}
            title={`Toggle title language (currently ${titleLanguage === 'en' ? 'English' : 'Japanese'})`}
            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border transition-colors leading-none"
            style={{
              backgroundColor: titleLanguage === 'ja' ? '#3b82f6' : 'var(--color-surface)',
              borderColor: titleLanguage === 'ja' ? '#3b82f6' : 'var(--color-border)',
              color: titleLanguage === 'ja' ? '#fff' : 'var(--color-text-muted)',
            }}>
            {titleLanguage === 'en' ? '日' : 'EN'}
          </button>
        </div>

        {/* Phase B: book search bar */}
        <div className="mb-2 px-1">
          <input type="text" value={bookSearch}
            onChange={(e) => setBookSearch(e.target.value)}
            placeholder="Search books…"
            className="w-full px-2.5 py-1.5 text-xs border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            aria-label="Search books" />
        </div>

        {/* Phase B: book sort dropdown */}
        <div className="mb-2 px-1">
          <select
            value={`${bookSortBy}|${bookSortDir}`}
            onChange={(e) => {
              const [sb, sd] = e.target.value.split('|');
              setBookSortBy(sb);
              setBookSortDir(sd);
            }}
            className="w-full text-xs rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Sort books">
            {BOOK_SORT_OPTIONS.map((opt) => (
              <option key={`${opt.sortBy}|${opt.sortDir}`} value={`${opt.sortBy}|${opt.sortDir}`}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Book list */}
        <div className="space-y-1">
          {displayedBooks.map((book) => {
            const isSelected = selectedBookId === book.id;
            const isExpanded = expandedBookIds.has(book.id);
            const hasExtra = !!(book.author || book.summary);
            return (
              <div key={book.id}>
                <button type="button"
                  onClick={() => handleSelectBook(book.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg)]'
                  }`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate"
                        style={{ color: isSelected ? 'var(--color-link)' : 'var(--color-text)' }}>
                        {titleLanguage === 'ja' && book.title_ja ? book.title_ja : book.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${BOOK_TYPE_COLORS[book.book_type] ?? BOOK_TYPE_COLORS.uncategorized}`}>
                          {BOOK_TYPE_LABELS[book.book_type] ?? 'Uncat'}
                        </span>
                        {book.year && (
                          <span className="text-[10px] text-[var(--color-text-muted)]">{book.year}</span>
                        )}
                        <span className="text-[10px] text-[var(--color-text-muted)]">{book.article_count} art.</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Phase B: expand toggle for author/summary */}
                      {hasExtra && (
                        <span onClick={(e) => { e.stopPropagation(); toggleBookExpand(book.id); }}
                          className={`p-0.5 rounded transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          style={{ color: 'var(--color-text-muted)' }} role="button" tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleBookExpand(book.id); } }}
                          aria-label={isExpanded ? 'Collapse book details' : 'Expand book details'}>
                          <ChevronDown className="w-3 h-3" />
                        </span>
                      )}
                      {isSelected && (
                        <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-link)' }} />
                      )}
                    </div>
                  </div>
                </button>
                {/* Phase B: expandable author + summary */}
                {isExpanded && hasExtra && (
                  <div className="ml-2 pl-3 border-l-2 border-blue-300 dark:border-blue-700 py-1.5 pr-2">
                    {book.author && (
                      <p className="text-[11px] text-[var(--color-text-muted)] mb-0.5">
                        <span className="font-medium text-[var(--color-text)]">Author:</span> {book.author}
                      </p>
                    )}
                    {book.summary && (
                      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                        {book.summary}
                      </p>
                    )}
                  </div>
                )}
              </div>
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
          {/* Header */}
          <div className="mb-2 px-1">
            <h2 className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}
              title={selectedBook.book.title}>
              {titleLanguage === 'ja' && selectedBook.book.title_ja
                ? selectedBook.book.title_ja
                : selectedBook.book.title}
            </h2>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {selectedBook.total} article{selectedBook.total !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Phase B: article search bar */}
          <div className="mb-2 px-1">
            <input type="text" value={articleSearch}
              onChange={(e) => handleArticleSearchChange(e.target.value)}
              placeholder="Search articles…"
              className="w-full px-2.5 py-1.5 text-xs border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
              aria-label="Search articles" />
          </div>

          {/* Phase B: sort + status filter row */}
          <div className="flex items-center gap-1.5 mb-2 px-1 flex-wrap">
            <select
              value={`${articleSortBy}|${articleSortDir}`}
              onChange={(e) => {
                const [sb, sd] = e.target.value.split('|');
                setArticleSortBy(sb);
                setArticleSortDir(sd);
                const currentBookId = selectedBookIdRef.current;
                if (currentBookId) {
                  fetchArticles(currentBookId, { sortBy: sb, sortDir: sd });
                }
              }}
              className="text-xs rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-1 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Sort articles">
              {ARTICLE_SORT_OPTIONS.map((opt) => (
                <option key={`${opt.sortBy}|${opt.sortDir}`} value={`${opt.sortBy}|${opt.sortDir}`}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Phase B: status filter pills */}
          <div className="flex gap-1 mb-2 px-1">
            {ARTICLE_STATUS_FILTERS.map((f) => (
              <button key={f.value} type="button"
                onClick={() => {
                  setArticleStatusFilter(f.value);
                  const currentBookId = selectedBookIdRef.current;
                  if (currentBookId) {
                    fetchArticles(currentBookId, { status: f.value });
                  }
                }}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors ${
                  articleStatusFilter === f.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-bg)] bg-[var(--color-surface)]'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Article list */}
          {loadingArticles ? (
            <PanelSkeleton />
          ) : (
            <div className="space-y-1">
              {selectedBook.articles.map((article) => {
                const isSelected = selectedArticleId === article.id;
                return (
                  <button key={article.id} type="button"
                    onClick={() => handleSelectArticle(article.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                        : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg)]'
                    }`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate"
                          style={{ color: isSelected ? 'var(--color-link)' : 'var(--color-text)' }}>
                          {titleLanguage === 'ja' && article.title_ja ? article.title_ja : article.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            STATUS_COLORS[article.translation_status] ?? STATUS_COLORS.pending
                          }`}>
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
              {selectedBook.articles.length === 0 && (
                <p className="text-xs text-center text-[var(--color-text-muted)] py-6">No articles match.</p>
              )}
            </div>
          )}

          {/* Phase B: load-more button */}
          {selectedBook.hasMore && !loadingArticles && (
            <div className="mt-3 text-center px-1">
              <button type="button" onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full px-4 py-2 text-xs font-medium rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors text-[var(--color-text-muted)] disabled:opacity-50">
                {loadingMore ? 'Loading…' : `Load more (${selectedBook.total - selectedBook.articles.length} remaining)`}
              </button>
            </div>
          )}
        </div>
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
            <h2 className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}
              title={selectedArticle.article.title}>
              {titleLanguage === 'ja' && selectedArticle.article.title_ja
                ? selectedArticle.article.title_ja
                : selectedArticle.article.title}
            </h2>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {selectedArticle.page_count} page{selectedArticle.page_count !== 1 ? 's' : ''}
              {selectedArticle.mode === 'source_page' ? ' (source-based)' : ' (chunked)'}
            </p>
          </div>
          <div className="space-y-1">
            {selectedArticle.pages.map((page) => (
              <button key={page.page_number} type="button"
                onClick={() => handleSelectPage(page.page_number)}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
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

      {/* Desktop: 3-panel Miller-column layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {booksPanel}
        {articlesPanel}
        {pagesPanel}
      </div>

      {/* Mobile: single-column stack */}
      <div className="md:hidden flex-1 overflow-y-auto">
        {mobileLevel === 0 && booksPanel}
        {mobileLevel === 1 && articlesPanel}
        {mobileLevel === 2 && pagesPanel}
      </div>
    </div>
  );
}
