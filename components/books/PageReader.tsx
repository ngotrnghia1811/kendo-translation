'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReaderPage } from '@/types/reader';
import { useTitleLanguage } from '@/hooks/useTitleLanguage';
import { useThemeContext } from '@/components/shared/ThemeProvider';
import { useReaderBookmarks } from '@/hooks/useReaderBookmarks';
import { useReaderKeyboard } from '@/hooks/useReaderKeyboard';
import { useReaderProgress } from '@/hooks/useReaderProgress';
import { recordArticleAccess } from '@/lib/pwa/storage';
import VirtualizedReader from '@/components/reader/VirtualizedReader';
import RubyText from '@/components/reader/RubyText';
import type { RubySpan, JlptLevel } from '@/lib/furigana/types';
import type { VirtuosoHandle } from 'react-virtuoso';
import ReaderCollapsibleSidebar, { type ReaderCollapsibleSidebarHandle } from '@/components/reader/ReaderCollapsibleSidebar';
import ReaderKeyboardHelpModal from '@/components/reader/ReaderKeyboardHelpModal';
import MobileBottomBar from '@/components/reader/MobileBottomBar';
import WordPopup, { type WordPopupData } from '@/components/reader/WordPopup';
import TranslatorAlignedView from '@/components/reader/TranslatorAlignedView';
import PdfPageView from '@/components/reader/PdfPageView';
import type { Segment } from '@/types/database';
import type { PageContent, PageSegment } from '@/components/books/types';

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface PageReaderProps {
  pageContent: PageContent;
  bookId: string;
  articleId: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const FALLBACK_CHUNK_SIZE = 50; // must match hooks/useReaderView.ts

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Group ordered segments into paragraphs using paragraph_boundaries. */
function groupParagraphs(segments: PageSegment[], boundaries: Set<number>): { segments: PageSegment[]; position: number }[] {
  const result: { segments: PageSegment[]; position: number }[] = [];
  let currentParagraph: PageSegment[] = [];
  let paragraphStart = segments.length ? segments[0].position : 0;

  for (const segment of segments) {
    if (boundaries.has(segment.position) && currentParagraph.length > 0) {
      result.push({ segments: currentParagraph, position: paragraphStart });
      currentParagraph = [];
      paragraphStart = segment.position;
    }
    currentParagraph.push(segment);
  }

  if (currentParagraph.length > 0) {
    result.push({ segments: currentParagraph, position: paragraphStart });
  }

  return result;
}

/** Build concatenated RubySpan[] from paragraph segments for furigana rendering. */
function getParagraphRubySpans(segments: PageSegment[]): RubySpan[] {
  const spans: RubySpan[] = [];
  for (const seg of segments) {
    const rubySpans = seg.ruby_data?.spans as RubySpan[] | undefined;
    if (rubySpans && rubySpans.length > 0) {
      spans.push(...rubySpans);
    } else {
      spans.push({ type: 'text', text: seg.source_text });
    }
  }
  return spans;
}

/* ------------------------------------------------------------------ */
/*  Icon helpers (inline SVG) — only scroll-to-top is left here       */
/* ------------------------------------------------------------------ */

function ChevronUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function PageReader({ pageContent, bookId, articleId }: PageReaderProps) {
  const router = useRouter();
  const page = pageContent;
  const pageNumber = page.page_number;
  const totalPages = page.page_count;

  // ── Theme / font / furigana ─────────────────────────────────────
  const {
    theme,
    font,
    fontSize,
    fontSizeValue,
    fontColor,
    layoutWidth,
    setTheme,
    setFont,
    setFontColor,
    setLayoutWidth,
    increaseFontSize,
    decreaseFontSize,
    furiganaMode,
    setFuriganaMode,
    furiganaJlptMinLevel,
    setFuriganaJlptMinLevel,
    tapRevealEnabled,
    setTapRevealEnabled,
  } = useThemeContext();

  // ── Title language toggle ──────────────────────────────────────
  const { titleLanguage, toggleTitleLanguage } = useTitleLanguage();
  const displayTitle =
    titleLanguage === 'ja' && page.article.title_ja
      ? page.article.title_ja
      : page.article.title;

  // ── Panel state ─────────────────────────────────────────────────
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // ── Sidebar imperative handle (keyboard shortcuts) ──────────────
  const sidebarHandleRef = useRef<ReaderCollapsibleSidebarHandle>(null);

  // ── Tap-to-reveal popup state ───────────────────────────────────
  const [popupData, setPopupData] = useState<WordPopupData | null>(null);

  // ── Scroll tracking ────────────────────────────────────────────
  const [scrolled, setScrolled] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const scrollRestoreRef = useRef<number | null>(null);

  // ── Mode & language state ──────────────────────────────────────
  const [mode, setMode] = useState<'single' | 'bilingual' | 'aligned' | 'pdf'>('single');
  const [displayLang, setDisplayLang] = useState<'source' | 'target'>('target');
  const [targetLangChoice, setTargetLangChoice] = useState<'en' | 'zh'>('en');
  // ZH position→target_text map for aligned mode (fetched on demand)
  const [zhAlignedMap, setZhAlignedMap] = useState<Map<number, string> | null>(null);

  const sourceLang = page.settings?.source_lang ?? 'ja';
  const targetLang = page.settings?.target_lang ?? 'en';
  const effectiveTargetLang = targetLangChoice === 'zh' ? 'zh' : targetLang;
  const hasZh = page.has_zh ?? false;
  const canEdit = page.can_edit ?? false;
  const pairedPdfPath = page.settings?.paired_pdf_path ?? null;
  // PDF mode is only available for source_page-mode docs with a real paired PDF
  const pdfAvailable = !!(pairedPdfPath && page.mode === 'source_page');

  // ── ZH segment fetch for aligned mode ─────────────────────────
  useEffect(() => {
    if (mode !== 'aligned' || !hasZh) {
      setZhAlignedMap(null);
      return;
    }

    let cancelled = false;
    const fetchZh = async () => {
      const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';
      const params = new URLSearchParams({
        article_id: articleId,
        target_lang: 'zh',
      });

      if (page.mode === 'source_page') {
        params.set('page', String(pageNumber));
      } else {
        params.set('offset', String((pageNumber - 1) * FALLBACK_CHUNK_SIZE));
        params.set('limit', String(FALLBACK_CHUNK_SIZE));
      }

      try {
        const res = await fetch(`${pbUrl}/api/custom/article-bilingual-window?${params}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const items = (data.items ?? data ?? []) as Array<{ position: number; target_text: string | null }>;
        const map = new Map<number, string>();
        for (const item of items) {
          if (item.target_text) map.set(item.position, item.target_text);
        }
        if (!cancelled) setZhAlignedMap(map);
      } catch {
        // Silently fail — ZH overlay will be absent but aligned view works without it
      }
    };

    fetchZh();
    return () => {
      cancelled = true;
    };
  }, [mode, hasZh, articleId, pageNumber, page.mode]);

  // Restore scroll position after mode/displayLang change
  useEffect(() => {
    if (scrollRestoreRef.current !== null) {
      const saved = scrollRestoreRef.current;
      scrollRestoreRef.current = null;
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = saved;
        }
      });
    }
  }, [mode, displayLang]);

  // ── Paragraph grouping ─────────────────────────────────────────
  const segments = page.segments;

  const paragraphs = useMemo(() => {
    if (!segments.length) return [];
    const ordered = [...segments].sort((a, b) => a.position - b.position);
    const boundaries = new Set(page.settings?.paragraph_boundaries ?? [0]);
    return groupParagraphs(ordered, boundaries);
  }, [segments, page.settings?.paragraph_boundaries]);

  // For the download/export feature, build a flat segment list
  const allSegmentsForDownload = useMemo(() => {
    return [...segments].sort((a, b) => a.position - b.position);
  }, [segments]);

  // ── Page navigation (Next.js routing) ──────────────────────────
  const hasPrev = pageNumber > 1;
  const hasNext = pageNumber < totalPages;

  const navigateToPage = useCallback(
    (targetPage: number) => {
      router.push(`/books/${bookId}/${articleId}/${targetPage}`);
    },
    [router, bookId, articleId],
  );

  // ── Bookmarks ──────────────────────────────────────────────────
  // Use pageNumber-1 as currentPageIndex so the hook's comparison works
  // (hooks store pageIndex as 0-based). goToPage maps 0-based index to
  // 1-based URL page number.
  const {
    bookmarks,
    isBookmarked,
    toggleBookmark: toggleBookmarkRaw,
    removeBookmark,
  } = useReaderBookmarks(
    articleId,
    pageNumber - 1,
    String(pageNumber),
    useCallback(
      (i: number) => {
        router.push(`/books/${bookId}/${articleId}/${i + 1}`);
      },
      [router, bookId, articleId],
    ),
  );

  const toggleBookmark = useCallback(() => {
    toggleBookmarkRaw();
  }, [toggleBookmarkRaw]);

  // ── Reading progress ───────────────────────────────────────────
  const { savedPageIndex, persistPage } = useReaderProgress(articleId);

  // Restore saved page if it differs from current — only on the FIRST
  // reader mount for this article within the browsing session.  A
  // sessionStorage flag prevents the restore from firing again on
  // subsequent in-session navigations (which would otherwise flash back
  // to the previous page after every intentional page change).
  const autoResumeSessionKey = `reader-autoresume:${articleId}`;
  const hasAutoResumedRef = useRef(
    typeof window !== 'undefined'
      ? sessionStorage.getItem(autoResumeSessionKey) !== null
      : false,
  );

  useEffect(() => {
    if (hasAutoResumedRef.current) return;
    hasAutoResumedRef.current = true;

    try {
      sessionStorage.setItem(autoResumeSessionKey, '1');
    } catch { /* sessionStorage unavailable — ignore */ }

    if (savedPageIndex !== null && savedPageIndex > 0 && savedPageIndex !== pageNumber - 1) {
      router.replace(`/books/${bookId}/${articleId}/${savedPageIndex + 1}`);
    }
  }, [savedPageIndex, pageNumber, router, bookId, articleId, autoResumeSessionKey]);

  // Persist current page
  useEffect(() => {
    if (totalPages <= 1) return;
    if (pageNumber === 1) return; // never persist page 1 (default)
    persistPage(pageNumber - 1, String(pageNumber));
  }, [pageNumber, totalPages, persistPage]);

  // ── Progress percent ───────────────────────────────────────────
  const progressPercent = totalPages > 1
    ? Math.round(((pageNumber - 1) / (totalPages - 1)) * 100)
    : (totalPages === 1 ? 100 : 0);

  // ── Scroll tracking ────────────────────────────────────────────
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setScrollParent(el);
    const handler = () => setScrolled(el.scrollTop > 300);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const scrollToTop = useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Reset scroll to top when page changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [pageNumber]);

  // ── View tracking ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/documents/${articleId}/view`, { method: 'POST' }).catch(() => {});
  }, [articleId]);

  // ── Offline article tracking ───────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      recordArticleAccess(articleId, window.location.href, page.article.title).catch(() => {});
    }
  }, [articleId, page.article.title]);

  // ── Keyboard shortcuts ─────────────────────────────────────────
  useReaderKeyboard({
    onPrevPage: () => {
      if (hasPrev) navigateToPage(pageNumber - 1);
    },
    onNextPage: () => {
      if (hasNext) navigateToPage(pageNumber + 1);
    },
    prevDisabled: !hasPrev,
    nextDisabled: !hasNext,
    onCloseAll: () => setKeyboardHelpOpen(false),
    anyPanelOpen: keyboardHelpOpen,
    onToggleBookmark: toggleBookmark,
    onToggleSettings: () => sidebarHandleRef.current?.openSection('settings'),
    onOpenSearch: () => sidebarHandleRef.current?.openSection('search'),
    onToggleHelp: () => setKeyboardHelpOpen((o) => !o),
  });

  // ── Tap-to-reveal click handler ────────────────────────────────
  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      if (!tapRevealEnabled) return;

      const kanjiEl = (e.target as HTMLElement).closest('[data-span-type="kanji"]');
      if (kanjiEl instanceof HTMLElement) {
        const base = kanjiEl.getAttribute('data-span-base');
        const reading = kanjiEl.getAttribute('data-span-reading');
        const romaji = kanjiEl.getAttribute('data-span-romaji');
        const jlpt = kanjiEl.getAttribute('data-span-jlpt');
        if (base && reading) {
          setPopupData({
            anchorRect: kanjiEl.getBoundingClientRect(),
            base,
            reading,
            romaji: romaji || null,
            jlptLevel: (jlpt || null) as JlptLevel | null,
            translation: null,
            noTranslation: false,
          });
          return;
        }
      }

      if (mode === 'single' && displayLang === 'source') {
        const paraEl = (e.target as HTMLElement).closest('[data-paragraph-index]');
        if (paraEl instanceof HTMLElement) {
          const idxStr = paraEl.getAttribute('data-paragraph-index');
          const idx = idxStr ? parseInt(idxStr, 10) : -1;
          if (idx >= 0 && idx < paragraphs.length) {
            const para = paragraphs[idx];
            const joiner = /^(ja|zh|ko)/.test(targetLang) ? '' : ' ';
            const targetText = para.segments
              .map((s) => s.target_text || '')
              .filter(Boolean)
              .join(joiner);
            const noTranslation = !targetText || targetText.trim().length === 0;
            setPopupData({
              anchorRect: paraEl.getBoundingClientRect(),
              base: null,
              reading: null,
              romaji: null,
              jlptLevel: null,
              translation: noTranslation ? null : targetText,
              noTranslation,
            });
            return;
          }
        }
      }

      setPopupData(null);
    },
    [tapRevealEnabled, mode, displayLang, paragraphs, targetLang],
  );

  // ── Focus mode esc handler ─────────────────────────────────────
  useEffect(() => {
    if (!focusMode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocusMode(false);
        setPopupData(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [focusMode]);

  // ── Layout width class ─────────────────────────────────────────
  const readerWidthClass =
    layoutWidth === 'full' ? 'max-w-full'
    : layoutWidth === 'two-column' ? 'md:columns-2 gap-8 max-w-full'
    : mode === 'bilingual' ? 'max-w-3xl'
    : 'max-w-2xl';

  // ── Paragraph renderer (for VirtualizedReader) ─────────────────
  function renderParagraphItem(index: number): React.ReactNode {
    const paragraph = paragraphs[index];
    if (!paragraph) return null;

    const segs = paragraph.segments;

    if (mode === 'single') {
      const joiner = displayLang === 'source'
        ? (/^(ja|zh|ko)/.test(sourceLang) ? '' : ' ')
        : (/^(ja|zh|ko)/.test(effectiveTargetLang) ? '' : ' ');
      const text = segs
        .map((s) => (displayLang === 'source' ? s.source_text : s.target_text || ''))
        .filter(Boolean)
        .join(joiner);
      if (!text.trim()) return null;

      if (displayLang === 'source' && sourceLang === 'ja') {
        return (
          <p className="text-base leading-relaxed mb-6" data-paragraph-index={index}>
            <RubyText
              spans={getParagraphRubySpans(segs)}
              furiganaMode={furiganaMode}
              furiganaJlptMinLevel={furiganaJlptMinLevel}
            />
          </p>
        );
      }
      return (
        <p className="text-base leading-relaxed mb-6" data-paragraph-index={index}>
          {text}
        </p>
      );
    }

    // bilingual mode
    const srcJoiner = /^(ja|zh|ko)/.test(sourceLang) ? '' : ' ';
    const tgtJoiner = /^(ja|zh|ko)/.test(effectiveTargetLang) ? '' : ' ';
    const sourceText = segs.map((s) => s.source_text).filter(Boolean).join(srcJoiner);
    const targetText = segs.map((s) => s.target_text || '').filter(Boolean).join(tgtJoiner);
    if (!sourceText.trim() && !targetText.trim()) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-x-4 gap-y-1" data-paragraph-index={index}>
        {sourceText.trim() && (
          <div lang={sourceLang} className="border-l-4 border-red-400 dark:border-red-500/70 pl-4 py-2">
            <p className="text-base leading-relaxed">
              {sourceLang === 'ja' ? (
                <RubyText
                  spans={getParagraphRubySpans(segs)}
                  furiganaMode={furiganaMode}
                  furiganaJlptMinLevel={furiganaJlptMinLevel}
                />
              ) : sourceText}
            </p>
          </div>
        )}
        {sourceText.trim() && targetText.trim() && (
          <div className="md:hidden border-b border-dashed border-gray-300 dark:border-[var(--rt-border)] mx-4 col-span-full" />
        )}
        {targetText.trim() && (
          <div lang={effectiveTargetLang} className="border-l-4 border-blue-400 dark:border-blue-500/70 pl-4 py-2">
            <p className="text-base leading-relaxed">{targetText}</p>
          </div>
        )}
      </div>
    );
  }

  // Check if any source/target text for legend
  const hasAnySource = paragraphs.some((p) =>
    p.segments.some((s) => s.source_text && s.source_text.trim()),
  );
  const hasAnyTarget = paragraphs.some((p) =>
    p.segments.some((s) => s.target_text && s.target_text.trim()),
  );

  // ── Build reader pages list for sidebar ─────────────────────────
  const readerPages: ReaderPage[] = useMemo(() => {
    if (!page.all_pages?.length) return [];
    return page.all_pages.map((p) => ({
      page: p.page_number,
      label: String(p.page_number),
      // Only the current page has loaded segments; other pages are empty
      // (search only works within the current page in the page-scoped model)
      segments: p.page_number === pageNumber
        ? (segments as unknown as import('@/types/database').Segment[])
        : [],
      paragraphs: [],
    }));
  }, [page.all_pages, segments, pageNumber]);

  const currentPageIndex = pageNumber - 1;
  const pageNoun = page.mode === 'source_page' ? 'Page' : 'Chunk';

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', overflow: 'hidden' }}
      data-reader-theme={theme}
    >
      {/* ── Keyboard shortcuts modal ────────────────────────── */}
      <ReaderKeyboardHelpModal
        open={keyboardHelpOpen}
        onClose={() => setKeyboardHelpOpen(false)}
      />

      {/* ── Main layout: sidebar + content ────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Collapsible sidebar (desktop: icon rail or expanded panel; mobile: overlay) */}
        <ReaderCollapsibleSidebar
          ref={sidebarHandleRef}
          /* nav */
          bookId={bookId}
          articleId={articleId}
          pageNumber={pageNumber}
          totalPages={totalPages}
          currentPageIndex={currentPageIndex}
          pageNoun={pageNoun}
          displayTitle={displayTitle}
          hasJapaneseTitle={!!page.article.title_ja}
          titleLanguage={titleLanguage}
          onToggleTitleLanguage={toggleTitleLanguage}
          onGoToPage={(i) => {
            if (i !== currentPageIndex) router.push(`/books/${bookId}/${articleId}/${i + 1}`);
          }}
          progressPercent={progressPercent}
          bookAuthor={page.book?.author ?? null}
          bookSummary={page.book?.summary ?? null}
          /* view / lang */
          mode={mode}
          onModeChange={setMode}
          displayLang={displayLang}
          onDisplayLangChange={setDisplayLang}
          targetLangChoice={targetLangChoice}
          onTargetLangChoiceChange={setTargetLangChoice}
          sourceLang={sourceLang}
          targetLang={targetLang}
          hasZh={hasZh}
          canEdit={canEdit}
          pdfAvailable={pdfAvailable}
          /* settings */
          theme={theme}
          font={font}
          fontSize={fontSize}
          fontSizeValue={fontSizeValue}
          fontColor={fontColor}
          layoutWidth={layoutWidth}
          onThemeChange={setTheme}
          onFontChange={setFont}
          onFontColorChange={setFontColor}
          onLayoutWidthChange={setLayoutWidth}
          onIncreaseFontSize={increaseFontSize}
          onDecreaseFontSize={decreaseFontSize}
          furiganaMode={furiganaMode}
          onFuriganaModeChange={setFuriganaMode}
          furiganaJlptMinLevel={furiganaJlptMinLevel}
          onFuriganaJlptMinLevelChange={setFuriganaJlptMinLevel}
          tapRevealEnabled={tapRevealEnabled}
          onTapRevealEnabledChange={setTapRevealEnabled}
          focusMode={focusMode}
          onFocusModeToggle={() => setFocusMode((f) => !f)}
          /* bookmarks */
          bookmarks={bookmarks}
          isBookmarked={isBookmarked}
          onToggleBookmark={toggleBookmark}
          onRemoveBookmark={removeBookmark}
          onJumpToBookmark={(i) => {
            router.push(`/books/${bookId}/${articleId}/${i + 1}`);
          }}
          /* search */
          readerPages={readerPages}
          /* other */
          onShowKeyboardHelp={() => setKeyboardHelpOpen(true)}
          onSidebarClose={() => {}}
        />

        {/* ── Content column ──────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0" style={{ height: '100%', overflow: 'hidden' }}>
          {/* Progress bar (thin, above content) */}
          {!focusMode && totalPages > 1 && (
            <div
              className="shrink-0 h-1 w-full"
              style={{ backgroundColor: 'var(--rt-border)' }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Reading progress: ${progressPercent}%`}
            >
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progressPercent}%`, backgroundColor: '#3b82f6' }}
              />
            </div>
          )}

          {/* Minimal title header (shown only on mobile where sidebar is overlay) */}
          {!focusMode && (
            <div
              className="md:hidden shrink-0 px-4 py-2 flex items-center gap-2"
              style={{
                backgroundColor: 'var(--rt-bg)',
                borderBottom: '1px solid var(--rt-border)',
              }}
            >
              <Link href="/books" className="text-xs shrink-0" style={{ color: 'var(--rt-text-muted)' }}>
                ← Books
              </Link>
              <span className="text-xs truncate font-medium flex-1" style={{ color: 'var(--rt-text)' }}>
                {displayTitle}
              </span>
            </div>
          )}

          {/* ── Scrollable content area ───────────────────────── */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto relative"
            style={fontColor ? { ['--rt-text' as string]: fontColor } : undefined}
            onClick={handleContentClick}
          >
            {/* Font family + size wrapper */}
            <div data-reader-font={font} style={{ fontSize: fontSizeValue, minHeight: '100%' }}>
              {segments.length === 0 && mode !== 'pdf' ? (
            <div className="text-center py-20" style={{ color: 'var(--rt-text-muted)' }}>
              <p className="text-4xl mb-4">📄</p>
              <p className="text-lg font-medium" style={{ color: 'var(--rt-text)' }}>
                No segments
              </p>
              <p className="text-sm">This page has no translatable content yet.</p>
            </div>
          ) : mode === 'aligned' && canEdit ? (
            <TranslatorAlignedView
              segments={pageContent.segments as unknown as Segment[]}
              sourceLang={sourceLang}
              targetLang={targetLang}
              zhByPosition={hasZh ? (zhAlignedMap ?? new Map()) : undefined}
              targetLangChoice={targetLangChoice}
              layoutWidth={layoutWidth}
            />
          ) : mode === 'pdf' && pdfAvailable ? (
            <PdfPageView
              articleId={articleId}
              pdfPage={page.mode === 'source_page' ? pageNumber : null}
            />
          ) : (
            <div
              lang={mode === 'single' ? (displayLang === 'source' ? sourceLang : effectiveTargetLang) : undefined}
              className={
                focusMode
                  ? 'max-w-[72ch] mx-auto py-8 px-4'
                  : `${readerWidthClass} mx-auto py-8 px-4 ${mode === 'bilingual' ? 'space-y-8' : ''}`
              }
            >
              <VirtualizedReader
                ref={virtuosoRef}
                totalCount={paragraphs.length}
                itemContent={renderParagraphItem}
                computeItemKey={(i: number) => `p-${paragraphs[i]?.position ?? i}`}
                customScrollParent={scrollParent}
              />

              {/* Legend — bilingual mode only */}
              {mode === 'bilingual' && (hasAnySource || hasAnyTarget) && (
                <div className="flex gap-4 text-xs text-gray-400 pt-4 border-t border-gray-200 dark:border-[var(--rt-border)]">
                  {hasAnySource && (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 border-l-4 border-red-400 inline-block" />{' '}
                      {sourceLang.toUpperCase()}
                    </span>
                  )}
                  {hasAnyTarget && (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 border-l-4 border-blue-400 inline-block" />{' '}
                      {effectiveTargetLang.toUpperCase()}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Scroll-to-top floating button ──────────────────── */}
        {scrolled && (
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Scroll to top"
            title="Scroll to top"
            className="fixed bottom-20 md:bottom-6 right-6 z-30 w-10 h-10 flex items-center justify-center rounded-full shadow-lg border transition-all"
            style={{
              backgroundColor: 'var(--rt-bg)',
              borderColor: 'var(--rt-border)',
              color: 'var(--rt-text)',
            }}
          >
            <ChevronUpIcon />
          </button>
        )}

        {/* ── Mobile bottom reading bar ──────────────────────── */}
        <MobileBottomBar
          fontSize={fontSize}
          onIncreaseFontSize={increaseFontSize}
          onDecreaseFontSize={decreaseFontSize}
          onOpenSidebar={() => sidebarHandleRef.current?.openSection('nav')}
          prevArticleHref={null}
          nextArticleHref={null}
          scrollParent={scrollParent}
        />

        {/* ── Focus mode exit button ──────────────────────────── */}
        {focusMode && (
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            aria-label="Exit focus mode"
            title="Exit focus mode (Esc)"
            className="fixed top-3 right-3 z-40 w-11 h-11 flex items-center justify-center rounded-full shadow-lg border transition-all hover:scale-105"
            style={{
              backgroundColor: 'var(--rt-bg)',
              borderColor: 'var(--rt-border)',
              color: 'var(--rt-text)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* ── Tap-to-reveal popup ─────────────────────────────── */}
        <WordPopup
          data={popupData}
          onClose={() => setPopupData(null)}
          scrollContainer={scrollParent}
        />
        </div>
      </div>
    </div>
  </div>
  );
}
