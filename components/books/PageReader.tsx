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
import ReaderSettingsPanel from '@/components/reader/ReaderSettingsPanel';
import ReaderBookmarksPanel from '@/components/reader/ReaderBookmarksPanel';
import ReaderSidebar from '@/components/reader/ReaderSidebar';
import ReaderKeyboardHelpModal from '@/components/reader/ReaderKeyboardHelpModal';
import MobileBottomBar, { type ThreeWayLang } from '@/components/reader/MobileBottomBar';
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
/*  Icon helpers (inline SVG)                                         */
/* ------------------------------------------------------------------ */

function BookOpenIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.97.342 1.405.588l1.277-.743a1 1 0 0 1 1.228.15l.962.96a1 1 0 0 1 .15 1.23l-.743 1.276c.246.435.444.908.588 1.405l1.473.295a1 1 0 0 1 .804.98v1.36a1 1 0 0 1-.804.98l-1.473.295a6.97 6.97 0 0 1-.588 1.405l.743 1.277a1 1 0 0 1-.15 1.228l-.96.962a1 1 0 0 1-1.23.15l-1.276-.743a6.97 6.97 0 0 1-1.405.588l-.295 1.473A1 1 0 0 1 10.68 19H9.32a1 1 0 0 1-.98-.804l-.295-1.473a6.972 6.972 0 0 1-1.405-.588l-1.277.743a1 1 0 0 1-1.228-.15l-.962-.96a1 1 0 0 1-.15-1.23l.743-1.276a6.971 6.971 0 0 1-.588-1.405L1.804 11.32A1 1 0 0 1 1 10.34V8.98a1 1 0 0 1 .804-.98l1.473-.295a6.97 6.97 0 0 1 .588-1.405L3.122 5.023a1 1 0 0 1 .15-1.228l.96-.962a1 1 0 0 1 1.23-.15l1.276.743a6.972 6.972 0 0 1 1.405-.588L8.34 1.804ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
    </svg>
  );
}

function ListBulletIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function QuestionMarkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Toolbar button                                                    */
/* ------------------------------------------------------------------ */

function ToolbarButton({
  active,
  onClick,
  ariaLabel,
  title,
  children,
  badgeCount,
}: {
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
  title?: string;
  children: React.ReactNode;
  badgeCount?: number;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={active}
        title={title}
        onClick={onClick}
        className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors"
        style={active ? {
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          color: '#fff',
        } : {
          backgroundColor: 'var(--rt-surface)',
          borderColor: 'var(--rt-border)',
          color: 'var(--rt-text-muted)',
        }}
      >
        {children}
      </button>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold leading-none pointer-events-none">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </div>
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'search'>('toc');
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

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

  const MODE_LABELS: Record<string, string> = {
    single: 'Single language',
    bilingual: 'Bilingual (paragraph)',
    aligned: 'Aligned (sentence)',
    pdf: 'Paired PDF',
  };

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

  // ── Three-way language toggle ───────────────────────────────────
  const threeWayLang: ThreeWayLang =
    mode === 'bilingual' ? 'bilingual'
      : mode === 'single' && displayLang === 'source' ? 'jp'
      : 'en';

  const targetToggleLabel = targetLangChoice === 'zh' ? '中文' : 'EN';

  const handleThreeWayToggle = useCallback((sel: ThreeWayLang) => {
    scrollRestoreRef.current = contentRef.current?.scrollTop ?? null;
    if (sel === 'jp') {
      setMode('single');
      setDisplayLang('source');
    } else if (sel === 'bilingual') {
      setMode('bilingual');
    } else {
      setMode('single');
      setDisplayLang('target');
    }
  }, []);

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

  // ── Close all panels helper ────────────────────────────────────
  const closeAll = useCallback(() => {
    setSettingsOpen(false);
    setBookmarksOpen(false);
    setSidebarOpen(false);
    setKeyboardHelpOpen(false);
    setDownloadOpen(false);
  }, []);

  const openSearch = useCallback(() => {
    setSidebarTab('search');
    setSidebarOpen(true);
    setSettingsOpen(false);
    setBookmarksOpen(false);
  }, []);

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
    toggleBookmark: _toggleBookmark,
    removeBookmark,
    jumpTo: _jumpTo,
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

  // Wrap jumpTo to close bookmarks panel after navigation
  const jumpTo = useCallback(
    (index: number) => {
      _jumpTo(index);
      setBookmarksOpen(false);
    },
    [_jumpTo],
  );

  const toggleBookmark = useCallback(() => {
    _toggleBookmark();
  }, [_toggleBookmark]);

  // ── Reading progress ───────────────────────────────────────────
  const { savedPageIndex, persistPage } = useReaderProgress(articleId);

  // Restore saved page if it differs from current
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (savedPageIndex !== null && savedPageIndex > 0 && savedPageIndex !== pageNumber - 1) {
      router.replace(`/books/${bookId}/${articleId}/${savedPageIndex + 1}`);
      hasRestoredRef.current = true;
    } else {
      hasRestoredRef.current = true;
    }
  }, [savedPageIndex, pageNumber, router, bookId, articleId]);

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
    onCloseAll: closeAll,
    anyPanelOpen: settingsOpen || bookmarksOpen || sidebarOpen || keyboardHelpOpen,
    onToggleBookmark: toggleBookmark,
    onToggleSettings: () => {
      setSettingsOpen((o) => !o);
      setBookmarksOpen(false);
      setSidebarOpen(false);
    },
    onOpenSearch: openSearch,
    onToggleHelp: useCallback(() => {
      setKeyboardHelpOpen((o) => !o);
      setSettingsOpen(false);
      setBookmarksOpen(false);
      setSidebarOpen(false);
    }, []),
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
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <ReaderSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pages={readerPages}
        currentPageIndex={currentPageIndex}
        pageNoun={pageNoun}
        onGoToPage={(i) => {
          if (i !== currentPageIndex) {
            router.push(`/books/${bookId}/${articleId}/${i + 1}`);
          }
          setSidebarOpen(false);
        }}
        initialTab={sidebarTab}
      />

      {/* ── Keyboard shortcuts modal ────────────────────────── */}
      <ReaderKeyboardHelpModal
        open={keyboardHelpOpen}
        onClose={() => setKeyboardHelpOpen(false)}
      />

      {/* ── Toolbar ──────────────────────────────────────────── */}
      {!focusMode && (
        <div
          className="shrink-0 z-10 px-4 py-3"
          style={{
            backgroundColor: 'var(--rt-bg)',
            borderBottom: '1px solid var(--rt-border)',
          }}
        >
          <div className="max-w-5xl mx-auto">
            {/* Breadcrumb + action buttons */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Link
                  href="/books"
                  className="text-sm shrink-0"
                  style={{ color: 'var(--rt-text-muted)' }}
                >
                  <span className="hidden sm:inline">← Books</span>
                  <span className="sm:hidden">←</span>
                </Link>
                <span className="shrink-0" style={{ color: 'var(--rt-border)' }}>/</span>
                <h1 className="text-base sm:text-lg font-semibold truncate" style={{ color: 'var(--rt-text)' }}>
                  {displayTitle}
                </h1>
                {page.article.title_ja && (
                  <button
                    type="button"
                    onClick={toggleTitleLanguage}
                    title={`Toggle title language (currently ${titleLanguage === 'en' ? 'English' : 'Japanese'})`}
                    className="ml-1 shrink-0 text-[10px] px-1.5 py-0.5 rounded border transition-colors leading-none"
                    style={{
                      backgroundColor: titleLanguage === 'ja' ? '#3b82f6' : 'var(--rt-surface)',
                      borderColor: titleLanguage === 'ja' ? '#3b82f6' : 'var(--rt-border)',
                      color: titleLanguage === 'ja' ? '#fff' : 'var(--rt-text-muted)',
                    }}
                  >
                    {titleLanguage === 'en' ? '日' : 'EN'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canEdit && (
                  <Link
                    href={`/documents/${articleId}/edit`}
                    className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Edit
                  </Link>
                )}

                {/* Sidebar button */}
                <ToolbarButton
                  active={sidebarOpen}
                  onClick={() => {
                    setSidebarTab('toc');
                    setSidebarOpen((o) => !o);
                    setSettingsOpen(false);
                    setBookmarksOpen(false);
                  }}
                  ariaLabel="Open document sidebar (contents and search)"
                  title="Contents & Search (press / to search)"
                >
                  <BookOpenIcon />
                </ToolbarButton>

                {/* Bookmark toggle */}
                <div className="relative">
                  <button
                    type="button"
                    aria-label={isBookmarked ? 'Remove bookmark for this page' : 'Bookmark this page'}
                    onClick={() => toggleBookmark()}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors"
                    style={{
                      backgroundColor: 'var(--rt-surface)',
                      borderColor: isBookmarked ? '#3b82f6' : 'var(--rt-border)',
                      color: isBookmarked ? '#3b82f6' : 'var(--rt-text-muted)',
                    }}
                  >
                    {isBookmarked ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v10.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25V4.75A1.75 1.75 0 0 0 16.25 3H3.75ZM10 14a.75.75 0 0 1-.53-.22l-3-3a.75.75 0 1 1 1.06-1.06L10 12.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3A.75.75 0 0 1 10 14Z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Bookmarks list button + dropdown panel */}
                <div className="relative">
                  <ToolbarButton
                    active={bookmarksOpen}
                    onClick={() => {
                      setBookmarksOpen((o) => !o);
                      setSettingsOpen(false);
                      setSidebarOpen(false);
                    }}
                    ariaLabel="View bookmarks"
                    badgeCount={bookmarks.length}
                  >
                    <ListBulletIcon />
                  </ToolbarButton>
                  <ReaderBookmarksPanel
                    open={bookmarksOpen}
                    onClose={() => setBookmarksOpen(false)}
                    bookmarks={bookmarks}
                    currentPageIndex={currentPageIndex}
                    pageNoun={pageNoun}
                    onJumpTo={jumpTo}
                    onRemove={removeBookmark}
                  />
                </div>

                {/* Settings button */}
                <div className="relative">
                  <ToolbarButton
                    active={settingsOpen}
                    onClick={() => {
                      setSettingsOpen((o) => !o);
                      setBookmarksOpen(false);
                      setSidebarOpen(false);
                    }}
                    ariaLabel="Reader settings"
                  >
                    <GearIcon />
                  </ToolbarButton>
                  <ReaderSettingsPanel
                    open={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
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
                    onFocusModeToggle={() => {
                      setFocusMode((f) => !f);
                      setSettingsOpen(false);
                    }}
                  />
                </div>

                {/* Keyboard shortcuts help button */}
                <ToolbarButton
                  active={keyboardHelpOpen}
                  onClick={() => {
                    setKeyboardHelpOpen((o) => !o);
                    setSettingsOpen(false);
                    setBookmarksOpen(false);
                    setSidebarOpen(false);
                    setDownloadOpen(false);
                  }}
                  ariaLabel="Keyboard shortcuts"
                  title="Keyboard shortcuts (?)"
                >
                  <QuestionMarkIcon />
                </ToolbarButton>

                {/* Download / Export button */}
                <div className="relative">
                  <ToolbarButton
                    active={downloadOpen}
                    onClick={() => {
                      setDownloadOpen((o) => !o);
                      setSettingsOpen(false);
                      setBookmarksOpen(false);
                      setSidebarOpen(false);
                      setKeyboardHelpOpen(false);
                    }}
                    ariaLabel="Download / export document"
                    title="Download translation"
                  >
                    <DownloadIcon />
                  </ToolbarButton>
                  {downloadOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDownloadOpen(false)} />
                      <div
                        className="absolute right-0 top-full mt-2 z-50 rounded-xl shadow-xl border overflow-hidden"
                        style={{
                          backgroundColor: 'var(--rt-surface)',
                          borderColor: 'var(--rt-border)',
                          minWidth: '200px',
                        }}
                        role="menu"
                      >
                        <div
                          className="px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                          style={{
                            color: 'var(--rt-text-muted)',
                            borderBottom: '1px solid var(--rt-border)',
                          }}
                        >
                          Export translation
                        </div>
                        {(['en', 'zh'] as const)
                          .filter((l) => l === 'en' || hasZh)
                          .map((l) =>
                            ['txt', 'md'].map((fmt) => (
                              <a
                                key={`${l}-${fmt}`}
                                href={`/api/documents/${articleId}/export?format=${fmt}&lang=${l}`}
                                download
                                onClick={() => setDownloadOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:opacity-80"
                                style={{ color: 'var(--rt-text)' }}
                                role="menuitem"
                              >
                                <span
                                  className="font-mono text-xs px-1 py-0.5 rounded text-gray-500 dark:text-gray-400"
                                  style={{
                                    backgroundColor: 'var(--rt-bg)',
                                    border: '1px solid var(--rt-border)',
                                  }}
                                >
                                  .{fmt}
                                </span>
                                <span>
                                  {l === 'zh' ? 'ZH' : 'EN'} — {fmt === 'md' ? 'Markdown' : 'Plain text'}
                                </span>
                              </a>
                            )),
                          )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Book metadata */}
            {page.book && (page.book.author || page.book.summary) && (
              <div className="mb-3 border-l-2 border-blue-300 dark:border-blue-700 pl-2">
                {page.book.author && (
                  <p className="text-[11px]" style={{ color: 'var(--rt-text-muted)' }}>
                    <span className="font-medium">Author:</span> {page.book.author}
                  </p>
                )}
                {page.book.summary && (
                  <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: 'var(--rt-text-muted)' }}>
                    {page.book.summary}
                  </p>
                )}
              </div>
            )}

            {/* Mode tabs + language selectors + pager */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Mode tabs */}
              <div className="overflow-x-auto max-w-full">
                <div
                  className="flex rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--rt-border)', width: 'max-content' }}
                >
                  {(Object.keys(MODE_LABELS) as Array<'single' | 'bilingual' | 'aligned' | 'pdf'>)
                    .filter((m) => {
                      if (m === 'aligned') return canEdit;
                      if (m === 'pdf') return pdfAvailable;
                      return true;
                    })
                    .map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className="px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap"
                        style={
                          mode === m
                            ? { backgroundColor: '#3b82f6', color: '#fff' }
                            : { backgroundColor: 'var(--rt-surface)', color: 'var(--rt-text-muted)' }
                        }
                      >
                        {MODE_LABELS[m]}
                      </button>
                    ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Three-way language toggle */}
                <div
                  className="flex items-center rounded-lg overflow-hidden text-xs font-medium"
                  style={{ border: '1px solid var(--rt-border)' }}
                  title="Switch between Japanese, Bilingual, and English reading modes"
                >
                  {([
                    { key: 'jp' as ThreeWayLang, label: 'JP' },
                    { key: 'bilingual' as ThreeWayLang, label: 'JP↔EN' },
                    { key: 'en' as ThreeWayLang, label: targetToggleLabel },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleThreeWayToggle(key)}
                      className="px-2.5 py-1 transition-colors whitespace-nowrap"
                      style={
                        threeWayLang === key
                          ? { backgroundColor: '#3b82f6', color: '#fff' }
                          : { backgroundColor: 'var(--rt-surface)', color: 'var(--rt-text-muted)' }
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* ZH / EN target language toggle */}
                {hasZh && mode !== 'pdf' && (
                  <div
                    className="flex items-center rounded-lg overflow-hidden text-xs font-medium"
                    style={{ border: '1px solid var(--rt-border)' }}
                    title="Toggle target language between English and Traditional Chinese"
                  >
                    {(['en', 'zh'] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setTargetLangChoice(lang)}
                        className="px-2.5 py-1 transition-colors"
                        style={
                          targetLangChoice === lang
                            ? { backgroundColor: '#3b82f6', color: '#fff' }
                            : { backgroundColor: 'var(--rt-surface)', color: 'var(--rt-text-muted)' }
                        }
                      >
                        {lang === 'en' ? 'EN' : '中文'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Display language selector (single mode) */}
                {mode === 'single' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--rt-text-muted)' }}>
                      Display:
                    </span>
                    <select
                      value={displayLang}
                      onChange={(e) => setDisplayLang(e.target.value as 'source' | 'target')}
                      className="text-sm rounded border px-2 py-1"
                      style={{
                        backgroundColor: 'var(--rt-surface)',
                        color: 'var(--rt-text)',
                        borderColor: 'var(--rt-border)',
                      }}
                    >
                      <option value="source">{sourceLang.toUpperCase()} (Source)</option>
                      <option value="target">
                        {targetLangChoice === 'zh' ? 'ZH' : targetLang.toUpperCase()} (Target)
                      </option>
                    </select>
                  </div>
                )}

                {/* Page navigation */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    {hasPrev ? (
                      <Link
                        href={`/books/${bookId}/${articleId}/${pageNumber - 1}`}
                        aria-label="Previous page"
                        className="px-2 py-1 text-sm rounded border"
                        style={{
                          backgroundColor: 'var(--rt-surface)',
                          color: 'var(--rt-text)',
                          borderColor: 'var(--rt-border)',
                        }}
                      >
                        ←
                      </Link>
                    ) : (
                      <span
                        className="px-2 py-1 text-sm rounded border opacity-40"
                        style={{
                          backgroundColor: 'var(--rt-surface)',
                          color: 'var(--rt-text-muted)',
                          borderColor: 'var(--rt-border)',
                        }}
                        aria-hidden
                      >
                        ←
                      </span>
                    )}
                    <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--rt-text-muted)' }}>
                      <span>{pageNoun}</span>
                      <select
                        value={pageNumber}
                        onChange={(e) => navigateToPage(Number(e.target.value))}
                        aria-label={`${pageNoun}, ${totalPages} total`}
                        className="text-sm rounded border px-1 py-1 max-w-[6rem]"
                        style={{
                          backgroundColor: 'var(--rt-surface)',
                          color: 'var(--rt-text)',
                          borderColor: 'var(--rt-border)',
                        }}
                      >
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <span>of {totalPages}</span>
                    </label>
                    {hasNext ? (
                      <Link
                        href={`/books/${bookId}/${articleId}/${pageNumber + 1}`}
                        aria-label="Next page"
                        className="px-2 py-1 text-sm rounded border"
                        style={{
                          backgroundColor: 'var(--rt-surface)',
                          color: 'var(--rt-text)',
                          borderColor: 'var(--rt-border)',
                        }}
                      >
                        →
                      </Link>
                    ) : (
                      <span
                        className="px-2 py-1 text-sm rounded border opacity-40"
                        style={{
                          backgroundColor: 'var(--rt-surface)',
                          color: 'var(--rt-text-muted)',
                          borderColor: 'var(--rt-border)',
                        }}
                        aria-hidden
                      >
                        →
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Progress bar ──────────────────────────────────────── */}
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
            style={{
              width: `${progressPercent}%`,
              backgroundColor: '#3b82f6',
            }}
          />
        </div>
      )}

      {/* ── Scrollable content area ───────────────────────────── */}
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
          langSelection={threeWayLang}
          onLangChange={handleThreeWayToggle}
          targetLabel={targetToggleLabel}
          fontSize={fontSize}
          onIncreaseFontSize={increaseFontSize}
          onDecreaseFontSize={decreaseFontSize}
          onOpenToc={() => {
            setSidebarTab('toc');
            setSidebarOpen(true);
          }}
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
  );
}
