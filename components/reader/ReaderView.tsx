'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import type { Segment, DocumentSettings } from '@/types/database'
import { useReaderView, type ReaderMode, type ZhSegmentRow, FALLBACK_CHUNK_SIZE } from '@/hooks/useReaderView'
import { useThemeContext } from '@/components/shared/ThemeProvider'
import { useReaderBookmarks } from '@/hooks/useReaderBookmarks'
import { useReaderKeyboard } from '@/hooks/useReaderKeyboard'
import { useReaderProgress } from '@/hooks/useReaderProgress'
import { createClient } from '@/lib/supabase/client'
import VirtualizedReader from './VirtualizedReader'
import { isHeadingParagraph, type Paragraph } from '@/types/reader'
import type { VirtuosoHandle } from 'react-virtuoso'
import TranslatorAlignedView from './TranslatorAlignedView'
import PdfPageView from './PdfPageView'
import ReaderSettingsPanel from './ReaderSettingsPanel'
import ReaderBookmarksPanel from './ReaderBookmarksPanel'
import ReaderSidebar from './ReaderSidebar'
import ReaderKeyboardHelpModal from './ReaderKeyboardHelpModal'
import MobileBottomBar, { type ThreeWayLang } from './MobileBottomBar'

interface ReaderViewProps {
    segments: Segment[]
    /** Optional ZH (Traditional Chinese) segment overlays. When present, a ZH toggle appears. */
    zhSegments?: ZhSegmentRow[]
    settings: DocumentSettings | null
    title: string
    articleId: string
    canEdit: boolean
    /** Relative path to the paired PDF (from DB). When non-null, a "PDF" tab is shown. */
    pairedPdfPath?: string | null
    /** Total number of readable EN segments (for lazy pager before all pages loaded). */
    totalSegmentsHint?: number
    /** Sorted list of source-book page numbers; null for fallback-chunk docs. */
    pageMetadataHint?: number[] | null
    /** Total ZH segment count hint (>0 means ZH is available; used for lazy ZH load). */
    zhCountHint?: number
    /** Previous article href for mobile bottom-bar navigation. */
    prevArticleHref?: string | null
    /** Next article href for mobile bottom-bar navigation. */
    nextArticleHref?: string | null
}

const MODE_LABELS: Record<ReaderMode, string> = {
    single: 'Single language',
    bilingual: 'Bilingual (paragraph)',
    aligned: 'Aligned (sentence)',
    pdf: 'Paired PDF',
}

// ---------------------------------------------------------------------------
// Icon helpers — inline SVG for tree-shaking friendliness
// ---------------------------------------------------------------------------

function BookOpenIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
    )
}

function ChevronUpIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
        </svg>
    )
}

function GearIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.97.342 1.405.588l1.277-.743a1 1 0 0 1 1.228.15l.962.96a1 1 0 0 1 .15 1.23l-.743 1.276c.246.435.444.908.588 1.405l1.473.295a1 1 0 0 1 .804.98v1.36a1 1 0 0 1-.804.98l-1.473.295a6.97 6.97 0 0 1-.588 1.405l.743 1.277a1 1 0 0 1-.15 1.228l-.96.962a1 1 0 0 1-1.23.15l-1.276-.743a6.97 6.97 0 0 1-1.405.588l-.295 1.473A1 1 0 0 1 10.68 19H9.32a1 1 0 0 1-.98-.804l-.295-1.473a6.972 6.972 0 0 1-1.405-.588l-1.277.743a1 1 0 0 1-1.228-.15l-.962-.96a1 1 0 0 1-.15-1.23l.743-1.276a6.971 6.971 0 0 1-.588-1.405L1.804 11.32A1 1 0 0 1 1 10.34V8.98a1 1 0 0 1 .804-.98l1.473-.295a6.97 6.97 0 0 1 .588-1.405L3.122 5.023a1 1 0 0 1 .15-1.228l.96-.962a1 1 0 0 1 1.23-.15l1.276.743a6.972 6.972 0 0 1 1.405-.588L8.34 1.804ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
        </svg>
    )
}

function ListBulletIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
    )
}

function QuestionMarkIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
        </svg>
    )
}

function DownloadIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
    )
}

// ---------------------------------------------------------------------------
// Toolbar icon button helper
// ---------------------------------------------------------------------------

function ToolbarButton({
    active,
    onClick,
    ariaLabel,
    title,
    children,
    badgeCount,
}: {
    active?: boolean
    onClick: () => void
    ariaLabel: string
    title?: string
    children: React.ReactNode
    badgeCount?: number
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
    )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ReaderView({ segments, zhSegments, settings, title, articleId, canEdit, pairedPdfPath, totalSegmentsHint, pageMetadataHint, zhCountHint, prevArticleHref, nextArticleHref }: ReaderViewProps) {
    // ── Lazy page cache ─────────────────────────────────────────────────
    // In lazy mode (totalSegmentsHint provided), the server only sends page 1.
    // We maintain a cache of loaded segments that grows as pages are fetched
    // on demand or via background prefetch.
    const isLazyMode = totalSegmentsHint !== undefined && totalSegmentsHint > 0

    // EN segment cache — indexed by normalized page index (0-based).
    const enPageCacheRef = useRef<Map<number, Segment[]>>(new Map())
    const [enCacheVersion, setEnCacheVersion] = useState(0) // bump to re-render
    const [pageFetching, setPageFetching] = useState<Set<number>>(new Set()) // pages being fetched now

    // ZH segment cache (mirrors EN paging)
    const zhPageCacheRef = useRef<Map<number, Segment[]>>(new Map())
    const [zhCacheVersion, setZhCacheVersion] = useState(0)

    // Initialize cache with SSR-provided page 0
    const initializedRef = useRef(false)
    if (!initializedRef.current && isLazyMode) {
        enPageCacheRef.current.set(0, segments)
        if (zhSegments && zhSegments.length > 0) {
            // Seed ZH cache with page-0 data. ZhSegmentRow is a subset of Segment
            // fields; the runtime shape is compatible.
            zhPageCacheRef.current.set(0, zhSegments as unknown as Segment[])
        }
        initializedRef.current = true
    }
    if (!initializedRef.current && !isLazyMode) {
        initializedRef.current = true
    }

    // Derived: all loaded EN segments in position order
    const allEnSegments = useMemo<Segment[]>(() => {
        if (!isLazyMode) return segments
        const result: Segment[] = []
        const totalPages = pageMetadataHint
            ? pageMetadataHint.length
            : Math.ceil(totalSegmentsHint! / FALLBACK_CHUNK_SIZE)
        for (let i = 0; i < totalPages; i++) {
            const pageSegs = enPageCacheRef.current.get(i)
            if (pageSegs) result.push(...pageSegs)
        }
        return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [segments, enCacheVersion, isLazyMode, totalSegmentsHint, pageMetadataHint])

    // Derived: all loaded ZH segments
    const allZhSegments = useMemo<Segment[]>(() => {
        if (!isLazyMode) return (zhSegments as Segment[]) ?? []
        const result: Segment[] = []
        const totalPages = pageMetadataHint
            ? pageMetadataHint.length
            : Math.ceil((zhCountHint ?? totalSegmentsHint ?? 0) / FALLBACK_CHUNK_SIZE)
        for (let i = 0; i < totalPages; i++) {
            const pageSegs = zhPageCacheRef.current.get(i)
            if (pageSegs) result.push(...pageSegs)
        }
        return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zhSegments, zhCacheVersion, isLazyMode, totalSegmentsHint, pageMetadataHint, zhCountHint])

    // Fetch a single page by index (EN, and ZH if available)
    const fetchPage = useCallback(async (pageIndex: number) => {
        if (pageFetching.has(pageIndex)) return
        if (enPageCacheRef.current.has(pageIndex)) return // already loaded

        setPageFetching(prev => new Set(prev).add(pageIndex))

        const supabase = createClient()
        try {
            const pageNum = pageMetadataHint?.[pageIndex] ?? null
            const offset = pageNum === null && pageMetadataHint === null
                ? pageIndex * FALLBACK_CHUNK_SIZE
                : 0
            const limit = pageNum === null && pageMetadataHint === null
                ? Math.min(FALLBACK_CHUNK_SIZE, totalSegmentsHint! - pageIndex * FALLBACK_CHUNK_SIZE)
                : 0

            const { data: enData, error: enErr } = await supabase.rpc(
                'get_article_bilingual_window',
                {
                    p_article_id: articleId,
                    p_target_lang: 'en',
                    p_offset: offset,
                    p_limit: limit,
                    p_page: pageNum,
                }
            )
            if (!enErr && enData) {
                enPageCacheRef.current.set(pageIndex, enData as Segment[])
                setEnCacheVersion(v => v + 1)
            }

            // Also fetch ZH for this page if ZH exists
            if (zhCountHint && zhCountHint > 0) {
                const { data: zhData, error: zhErr } = await supabase.rpc(
                    'get_article_bilingual_window',
                    {
                        p_article_id: articleId,
                        p_target_lang: 'zh',
                        p_offset: offset,
                        p_limit: limit,
                        p_page: pageNum,
                    }
                )
                if (!zhErr && zhData) {
                    zhPageCacheRef.current.set(pageIndex, zhData as Segment[])
                    setZhCacheVersion(v => v + 1)
                }
            }
        } finally {
            setPageFetching(prev => {
                const next = new Set(prev)
                next.delete(pageIndex)
                return next
            })
        }
    }, [articleId, pageMetadataHint, totalSegmentsHint, zhCountHint, pageFetching])

    // Track background fill progress
    const bgFillDoneRef = useRef(false)
    const bgFillActiveRef = useRef(false)

    // Background prefetch all remaining pages after first paint
    useEffect(() => {
        if (!isLazyMode || bgFillDoneRef.current || bgFillActiveRef.current) return

        const totalPages = pageMetadataHint
            ? pageMetadataHint.length
            : Math.ceil(totalSegmentsHint! / FALLBACK_CHUNK_SIZE)

        if (totalPages <= 1) { bgFillDoneRef.current = true; return }

        bgFillActiveRef.current = true

        const runFill = async () => {
            // Start from page 1 (page 0 already loaded)
            for (let i = 1; i < totalPages; i++) {
                if (enPageCacheRef.current.has(i)) continue
                try {
                    await fetchPage(i)
                } catch {
                    // Silently continue — page loads will be retried on demand
                }
                // Small pause between batches to avoid DB overload
                if (i % 5 === 0) {
                    await new Promise(r => setTimeout(r, 0))
                }
            }
            bgFillDoneRef.current = true
        }

        // Use a brief delay to let the first paint complete
        const timer = setTimeout(runFill, 200)
        return () => { clearTimeout(timer); bgFillActiveRef.current = false }
    }, [isLazyMode, totalSegmentsHint, pageMetadataHint, fetchPage])

    // Derive a stable ZhSegmentRow array reference for useReaderView's useMemo
    // so the zhByPosition map doesn't rebuild on every render.
    const stableZhSegments = useMemo<ZhSegmentRow[] | undefined>(() => {
        if (allZhSegments.length === 0) return undefined
        return allZhSegments.map(s => ({
            id: s.id,
            position: s.position,
            target_text: s.target_text,
            status: s.status,
        }))
    }, [allZhSegments])

    const {
        mode,
        setMode,
        displayLang,
        setDisplayLang,
        targetLangChoice,
        setTargetLangChoice,
        hasZh,
        sourceLang,
        targetLang,
        paragraphs,
        pageSegments,
        getParagraphText,
        zhByPosition,
        currentPage,
        currentPageIndex,
        totalPages,
        goToPage: _goToPage,
        pages,
    } = useReaderView(
        allEnSegments,
        settings,
        stableZhSegments,
        totalSegmentsHint,
        pageMetadataHint ?? undefined,
    )

    // ── Lazy page loading: wrap goToPage to trigger fetch for unloaded pages ──
    const goToPage = useCallback((i: number) => {
        const targetIdx = Math.max(0, Math.min(i, totalPages - 1))
        _goToPage(targetIdx)

        // In lazy mode, trigger on-demand fetch for the target page if not cached
        if (isLazyMode && !enPageCacheRef.current.has(targetIdx)) {
            fetchPage(targetIdx)
        }
    }, [_goToPage, totalPages, isLazyMode, fetchPage])

    // True when the current page exists in the page list but has no loaded
    // segments yet — i.e., it's being fetched now or hasn't been requested.
    const currentPageLoading = isLazyMode &&
        currentPage !== null &&
        currentPage.segments.length === 0 &&
        paragraphs.length === 0 &&
        totalPages > 0

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
    } = useThemeContext()

    // Panel state — at most one can be open at a time
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [bookmarksOpen, setBookmarksOpen] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarTab, setSidebarTab] = useState<'toc' | 'search'>('toc')
    const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false)
    const [downloadOpen, setDownloadOpen] = useState(false)

    // ── Three-way language toggle (Phase 3.2) ────────────────────────────
    // Maps mode+displayLang → three-way selection for the UI toggle and
    // the mobile bottom bar.
    const threeWayLang: ThreeWayLang =
        mode === 'bilingual' ? 'bilingual'
            : mode === 'single' && displayLang === 'source' ? 'jp'
            : 'en' // single + target (respects targetLangChoice via displayLang)

    const targetToggleLabel = targetLangChoice === 'zh' ? '中文' : 'EN'

    /** Toggle the three-way language mode, preserving Virtuoso scroll position. */
    const handleThreeWayToggle = useCallback((sel: ThreeWayLang) => {
        // Snapshot scroll position BEFORE state change triggers re-render.
        scrollRestoreRef.current = contentRef.current?.scrollTop ?? null

        if (sel === 'jp') {
            setMode('single')
            setDisplayLang('source')
        } else if (sel === 'bilingual') {
            setMode('bilingual')
        } else {
            // sel === 'en'
            setMode('single')
            setDisplayLang('target')
        }
    }, [setMode, setDisplayLang])

    // After mode/displayLang change re-renders, restore scroll position.
    useEffect(() => {
        if (scrollRestoreRef.current !== null) {
            const saved = scrollRestoreRef.current
            scrollRestoreRef.current = null
            // Use requestAnimationFrame to wait for the Virtuoso to finish
            // re-rendering with the new item set.
            requestAnimationFrame(() => {
                if (contentRef.current) {
                    contentRef.current.scrollTop = saved
                }
            })
        }
    }, [mode, displayLang])

    const closeAll = useCallback(() => {
        setSettingsOpen(false); setBookmarksOpen(false); setSidebarOpen(false); setKeyboardHelpOpen(false); setDownloadOpen(false)
    }, [])

    const openSearch = useCallback(() => {
        setSidebarTab('search')
        setSidebarOpen(true)
        setSettingsOpen(false)
        setBookmarksOpen(false)
    }, [])

    const showPager = totalPages > 1
    const pageNoun = currentPage?.page !== null && currentPage?.page !== undefined ? 'Page' : 'Section'

    const {
        bookmarks,
        isBookmarked,
        toggleBookmark,
        removeBookmark,
        jumpTo,
    } = useReaderBookmarks(
        articleId,
        currentPageIndex,
        currentPage?.label ?? String(currentPageIndex + 1),
        goToPage,
    )

    // -----------------------------------------------------------------------
    // View tracking — fire-and-forget POST to /api/documents/[id]/view
    // -----------------------------------------------------------------------
    useEffect(() => {
        fetch(`/api/documents/${articleId}/view`, { method: 'POST' }).catch(() => {})
    }, [articleId])

    // -----------------------------------------------------------------------
    // Progress persistence — auto-resume last page on load
    // -----------------------------------------------------------------------
    const { savedPageIndex, persistPage } = useReaderProgress(articleId)

    // Once on mount (after pages are built), jump to the saved page if any.
    const hasRestoredRef = useRef(false)
    useEffect(() => {
        if (hasRestoredRef.current) return
        if (savedPageIndex !== null && savedPageIndex > 0 && totalPages > 1) {
            const target = Math.min(savedPageIndex, totalPages - 1)
            if (target > 0) {
                goToPage(target)
                hasRestoredRef.current = true
            }
        } else if (totalPages > 0) {
            // Mark as resolved even with no saved page (so we don't jump on
            // subsequent page-count changes like lazy pagination).
            hasRestoredRef.current = true
        }
    // Run only when totalPages first becomes non-zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalPages])

    // Persist every page navigation — but skip the very first render.
    // On first mount currentPageIndex is always 0; persisting immediately would
    // overwrite a saved non-zero page before the restore effect can jump to it.
    // We skip the first fire by checking whether the pager has been interacted
    // with (totalPages was already > 1 AND we have already restored once).
    const persistSkipFirstRef = useRef(true)
    useEffect(() => {
        if (totalPages <= 1) return
        if (persistSkipFirstRef.current) {
            // Skip exactly once — the initial render at page index 0.
            persistSkipFirstRef.current = false
            return
        }
        const label = currentPage?.label ?? String(currentPageIndex + 1)
        persistPage(currentPageIndex, label)
    }, [currentPageIndex, currentPage, totalPages, persistPage])

    // -----------------------------------------------------------------------
    // Progress (page-based)
    // -----------------------------------------------------------------------
    const progressPercent = totalPages > 1
        ? Math.round((currentPageIndex / (totalPages - 1)) * 100)
        : (totalPages === 1 ? 100 : 0)

    // -----------------------------------------------------------------------
    // Scroll tracking (for scroll-to-top button)
    // -----------------------------------------------------------------------
    const [scrolled, setScrolled] = useState(false)
    const contentRef = useRef<HTMLDivElement | null>(null)
    // Capture the scroll element in state so VirtualizedReader can use it as
    // customScrollParent (refs don't trigger re-renders on their own).
    const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null)

    // ── Three-way language toggle scroll preservation (Phase 3.2) ─────────
    // Before toggling JP/Bilingual/EN, we snapshot the Virtuoso scroll position
    // so we can restore it after the new mode re-renders.
    const virtuosoRef = useRef<VirtuosoHandle | null>(null)
    const scrollRestoreRef = useRef<number | null>(null)

    useEffect(() => {
        const el = contentRef.current
        if (!el) return
        setScrollParent(el)
        const handler = () => setScrolled(el.scrollTop > 300)
        el.addEventListener('scroll', handler, { passive: true })
        return () => el.removeEventListener('scroll', handler)
    }, [])

    const scrollToTop = useCallback(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }, [])

    // Reset scroll to top when page changes
    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0 })
    }, [currentPageIndex])

    // -----------------------------------------------------------------------
    // Keyboard shortcuts
    // -----------------------------------------------------------------------
    useReaderKeyboard({
        onPrevPage: () => goToPage(currentPageIndex - 1),
        onNextPage: () => goToPage(currentPageIndex + 1),
        prevDisabled: currentPageIndex === 0,
        nextDisabled: currentPageIndex >= totalPages - 1,
        onCloseAll: closeAll,
        anyPanelOpen: settingsOpen || bookmarksOpen || sidebarOpen || keyboardHelpOpen,
        onToggleBookmark: toggleBookmark,
        onToggleSettings: () => {
            setSettingsOpen((o) => !o)
            setBookmarksOpen(false)
            setSidebarOpen(false)
        },
        onOpenSearch: openSearch,
        onToggleHelp: useCallback(() => {
            setKeyboardHelpOpen((o) => !o)
            setSettingsOpen(false)
            setBookmarksOpen(false)
            setSidebarOpen(false)
        }, []),
    })

    // ── Virtualized paragraph renderers ────────────────────────────────────
    // These produce the EXACT same DOM output as SingleLanguageView and
    // BilingualParagraphView did per-paragraph, but are called one-at-a-time
    // by VirtualizedReader.itemContent so only visible paragraphs mount.
    const effectiveTargetLang = targetLangChoice === 'zh' ? 'zh' : targetLang

    const readerWidthClass =
        layoutWidth === 'full'       ? 'max-w-full' :
        layoutWidth === 'two-column' ? 'md:columns-2 gap-8 max-w-full' :
        mode === 'bilingual'         ? 'max-w-3xl' :
        'max-w-2xl' // narrow — single-mode default

    const hasAnySource = paragraphs.some((p: Paragraph) => getParagraphText(p, 'source').trim().length > 0)
    const hasAnyTarget = paragraphs.some((p: Paragraph) => getParagraphText(p, 'target').trim().length > 0)

    function renderParagraphItem(index: number): React.ReactNode {
        const paragraph = paragraphs[index]
        if (!paragraph) return null

        if (mode === 'single') {
            const text = getParagraphText(paragraph, displayLang)
            if (!text.trim()) return null  // silently skip empty (FE-READER-AUDIT 4.6)

            if (isHeadingParagraph(paragraph)) {
                return (
                    <h2 className="text-xl font-semibold mt-10 mb-4">
                        {text}
                    </h2>
                )
            }
            return (
                <p className="text-base leading-relaxed mb-6">
                    {text}
                </p>
            )
        }

        // bilingual mode — responsive grid: side-by-side at ≥768px, stacked on mobile
        const sourceText = getParagraphText(paragraph, 'source')
        const targetText = getParagraphText(paragraph, 'target')
        if (!sourceText.trim() && !targetText.trim()) return null

        if (isHeadingParagraph(paragraph)) {
            return (
                <div className="space-y-1 mt-10">
                    {sourceText.trim() && (
                        <h2 lang={sourceLang} className="text-xl font-semibold">{sourceText}</h2>
                    )}
                    {targetText.trim() && (
                        <h2 lang={effectiveTargetLang} className="text-lg font-semibold">{targetText}</h2>
                    )}
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-x-4 gap-y-1">
                {/* Source paragraph */}
                {sourceText.trim() && (
                    <div lang={sourceLang} className="border-l-4 border-red-400 dark:border-red-500/70 pl-4 py-2">
                        <p className="text-base leading-relaxed">{sourceText}</p>
                    </div>
                )}

                {/* Separator — only visible on mobile when both texts present */}
                {sourceText.trim() && targetText.trim() && (
                    <div className="md:hidden border-b border-dashed border-gray-300 dark:border-[var(--rt-border)] mx-4 col-span-full" />
                )}

                {/* Target paragraph */}
                {targetText.trim() && (
                    <div lang={effectiveTargetLang} className="border-l-4 border-blue-400 dark:border-blue-500/70 pl-4 py-2">
                        <p className="text-base leading-relaxed">{targetText}</p>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            className="flex flex-col"
            style={{ height: '100dvh', overflow: 'hidden' }}
            data-reader-theme={theme}
        >
            {/* ----------------------------------------------------------------
                Sidebar — rendered OUTSIDE the scrollable content area so it
                overlays the whole page as a fixed drawer.
            ---------------------------------------------------------------- */}
            <ReaderSidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                pages={pages}
                currentPageIndex={currentPageIndex}
                pageNoun={pageNoun}
                onGoToPage={(i) => { goToPage(i); setSidebarOpen(false) }}
                initialTab={sidebarTab}
            />

            {/* Keyboard shortcuts modal */}
            <ReaderKeyboardHelpModal
                open={keyboardHelpOpen}
                onClose={() => setKeyboardHelpOpen(false)}
            />

            {/* ----------------------------------------------------------------
                Sticky toolbar
            ---------------------------------------------------------------- */}
            <div
                className="shrink-0 z-10 px-4 py-3"
                style={{
                    backgroundColor: 'var(--rt-bg)',
                    borderBottom: '1px solid var(--rt-border)',
                }}
            >
                <div className="max-w-5xl mx-auto">
                    {/* Top row: breadcrumb + action buttons */}
                    <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Link
                                href="/documents"
                                className="text-sm shrink-0"
                                style={{ color: 'var(--rt-text-muted)' }}
                            >
                                <span className="hidden sm:inline">← Documents</span>
                                <span className="sm:hidden">←</span>
                            </Link>
                            <span className="shrink-0" style={{ color: 'var(--rt-border)' }}>/</span>
                            <h1 className="text-base sm:text-lg font-semibold truncate" style={{ color: 'var(--rt-text)' }}>{title}</h1>
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

                            {/* Sidebar (Contents / Search) button */}
                            <ToolbarButton
                                active={sidebarOpen}
                                onClick={() => { setSidebarTab('toc'); setSidebarOpen((o) => !o); setSettingsOpen(false); setBookmarksOpen(false) }}
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
                                    onClick={() => { setBookmarksOpen((o) => !o); setSettingsOpen(false); setSidebarOpen(false) }}
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
                                    onClick={() => { setSettingsOpen((o) => !o); setBookmarksOpen(false); setSidebarOpen(false) }}
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
                                />
                            </div>

                            {/* Keyboard shortcuts help button */}
                            <ToolbarButton
                                active={keyboardHelpOpen}
                                onClick={() => { setKeyboardHelpOpen((o) => !o); setSettingsOpen(false); setBookmarksOpen(false); setSidebarOpen(false); setDownloadOpen(false) }}
                                ariaLabel="Keyboard shortcuts"
                                title="Keyboard shortcuts (?)"
                            >
                                <QuestionMarkIcon />
                            </ToolbarButton>

                            {/* Download / Export button */}
                            <div className="relative">
                                <ToolbarButton
                                    active={downloadOpen}
                                    onClick={() => { setDownloadOpen((o) => !o); setSettingsOpen(false); setBookmarksOpen(false); setSidebarOpen(false); setKeyboardHelpOpen(false) }}
                                    ariaLabel="Download / export document"
                                    title="Download translation"
                                >
                                    <DownloadIcon />
                                </ToolbarButton>
                                {downloadOpen && (
                                    <>
                                        {/* backdrop */}
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
                                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--rt-text-muted)', borderBottom: '1px solid var(--rt-border)' }}>
                                                Export translation
                                            </div>
                                            {(['en', 'zh'] as const).filter(l => l === 'en' || hasZh).map(l => (
                                                ['txt', 'md'].map(fmt => (
                                                    <a
                                                        key={`${l}-${fmt}`}
                                                        href={`/api/documents/${articleId}/export?format=${fmt}&lang=${l}`}
                                                        download
                                                        onClick={() => setDownloadOpen(false)}
                                                        className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:opacity-80"
                                                        style={{ color: 'var(--rt-text)' }}
                                                        role="menuitem"
                                                    >
                                                        <span className="font-mono text-xs px-1 py-0.5 rounded text-gray-500 dark:text-gray-400" style={{ backgroundColor: 'var(--rt-bg)', border: '1px solid var(--rt-border)' }}>
                                                            .{fmt}
                                                        </span>
                                                        <span>{l === 'zh' ? 'ZH' : 'EN'} — {fmt === 'md' ? 'Markdown' : 'Plain text'}</span>
                                                    </a>
                                                ))
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Second row: mode tabs + language selector + pager */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        {/* Mode tabs — scrollable on mobile so they don't wrap/clip */}
                        <div className="overflow-x-auto max-w-full">
                        <div
                            className="flex rounded-lg overflow-hidden"
                            style={{ border: '1px solid var(--rt-border)', width: 'max-content' }}
                        >
                            {(Object.keys(MODE_LABELS) as ReaderMode[])
                                .filter((m) => {
                                    if (m === 'aligned') return canEdit
                                    if (m === 'pdf') return !!pairedPdfPath
                                    return true
                                })
                                .map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        className={`px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap`}
                                        style={mode === m ? {
                                            backgroundColor: '#3b82f6',
                                            color: '#fff',
                                        } : {
                                            backgroundColor: 'var(--rt-surface)',
                                            color: 'var(--rt-text-muted)',
                                        }}
                                    >
                                        {MODE_LABELS[m]}
                                    </button>
                                        ))}
                        </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* ── Three-way language toggle (Phase 3.2) ──────────────────── */}
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
                                        style={threeWayLang === key ? {
                                            backgroundColor: '#3b82f6',
                                            color: '#fff',
                                        } : {
                                            backgroundColor: 'var(--rt-surface)',
                                            color: 'var(--rt-text-muted)',
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* ZH / EN toggle — shown when ZH data is available for this document */}
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
                                            style={targetLangChoice === lang ? {
                                                backgroundColor: '#3b82f6',
                                                color: '#fff',
                                            } : {
                                                backgroundColor: 'var(--rt-surface)',
                                                color: 'var(--rt-text-muted)',
                                            }}
                                        >
                                            {lang === 'en' ? 'EN' : '中文'}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {mode === 'single' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs" style={{ color: 'var(--rt-text-muted)' }}>Display:</span>
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

                            {showPager && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => goToPage(currentPageIndex - 1)}
                                        disabled={currentPageIndex === 0}
                                        aria-label="Previous page"
                                        className="px-2 py-1 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: 'var(--rt-surface)',
                                            color: 'var(--rt-text)',
                                            borderColor: 'var(--rt-border)',
                                        }}
                                    >
                                        ←
                                    </button>
                                    <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--rt-text-muted)' }}>
                                        <span>{pageNoun}</span>
                                        <select
                                            value={currentPageIndex}
                                            onChange={(e) => goToPage(Number(e.target.value))}
                                            aria-label={`${pageNoun}, ${totalPages} total`}
                                            className="text-sm rounded border px-1 py-1 max-w-[6rem]"
                                            style={{
                                                backgroundColor: 'var(--rt-surface)',
                                                color: 'var(--rt-text)',
                                                borderColor: 'var(--rt-border)',
                                            }}
                                        >
                                            {pages.map((p, i) => (
                                                <option key={i} value={i}>
                                                    {p.label}
                                                </option>
                                            ))}
                                        </select>
                                        <span>of {totalPages}</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => goToPage(currentPageIndex + 1)}
                                        disabled={currentPageIndex >= totalPages - 1}
                                        aria-label="Next page"
                                        className="px-2 py-1 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: 'var(--rt-surface)',
                                            color: 'var(--rt-text)',
                                            borderColor: 'var(--rt-border)',
                                        }}
                                    >
                                        →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ----------------------------------------------------------------
                Progress bar — only when document has multiple pages
            ---------------------------------------------------------------- */}
            {totalPages > 1 && (
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

            {/* ----------------------------------------------------------------
                Scrollable content area
            ---------------------------------------------------------------- */}
            <div
                ref={contentRef}
                className="flex-1 overflow-y-auto relative"
                style={fontColor ? { ['--rt-text' as string]: fontColor } : undefined}
            >
                {/* Font family + size wrapper */}
                <div
                    data-reader-font={font}
                    style={{ fontSize: fontSizeValue, minHeight: '100%' }}
                >
                    {segments.length === 0 && !isLazyMode ? (
                        <div className="text-center py-20 text-gray-500">
                            No segments available for this document.
                        </div>
                    ) : currentPageLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center" style={{ color: 'var(--rt-text-muted)' }}>
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-b-transparent mx-auto mb-3"
                                    style={{ borderColor: 'var(--rt-border)', borderBottomColor: '#3b82f6' }} />
                                <p className="text-sm">Loading page…</p>
                            </div>
                        </div>
                    ) : allEnSegments.length === 0 && isLazyMode ? (
                        <div className="text-center py-20 text-gray-500">
                            No segments available for this document.
                        </div>
                    ) : mode === 'aligned' && canEdit ? (
                        <TranslatorAlignedView
                            segments={pageSegments}
                            sourceLang={sourceLang}
                            targetLang={targetLang}
                            zhByPosition={hasZh ? zhByPosition : undefined}
                            targetLangChoice={targetLangChoice}
                            layoutWidth={layoutWidth}
                        />
                    ) : mode === 'pdf' && pairedPdfPath ? (
                        <PdfPageView
                            articleId={articleId}
                            pdfPage={currentPage?.page ?? null}
                            layoutWidth={layoutWidth}
                        />
                    ) : (
                        <div
                            lang={mode === 'single' ? (displayLang === 'source' ? sourceLang : effectiveTargetLang) : undefined}
                            className={`${readerWidthClass} mx-auto py-8 px-4 ${mode === 'bilingual' ? 'space-y-8' : ''}`}
                        >
                            <VirtualizedReader
                                ref={virtuosoRef}
                                totalCount={paragraphs.length}
                                itemContent={renderParagraphItem}
                                computeItemKey={(i: number) => `p-${paragraphs[i].position}`}
                                customScrollParent={scrollParent}
                            />

                            {/* Legend — bilingual mode only; rendered outside the virtualized list */}
                            {mode === 'bilingual' && (hasAnySource || hasAnyTarget) && (
                                <div className="flex gap-4 text-xs text-gray-400 pt-4 border-t border-gray-200 dark:border-[var(--rt-border)]">
                                    {hasAnySource && (
                                        <span className="flex items-center gap-1">
                                            <span className="w-3 h-3 border-l-4 border-red-400 inline-block" /> {sourceLang.toUpperCase()}
                                        </span>
                                    )}
                                    {hasAnyTarget && (
                                        <span className="flex items-center gap-1">
                                            <span className="w-3 h-3 border-l-4 border-blue-400 inline-block" /> {effectiveTargetLang.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ----------------------------------------------------------------
                    Scroll-to-top floating button
                    On mobile, sits above the bottom bar (Phase 3.4).
                ---------------------------------------------------------------- */}
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

                {/* ── Mobile bottom reading bar (Phase 3.4) ──────────────────────── */}
                <MobileBottomBar
                    langSelection={threeWayLang}
                    onLangChange={handleThreeWayToggle}
                    targetLabel={targetToggleLabel}
                    fontSize={fontSize}
                    onIncreaseFontSize={increaseFontSize}
                    onDecreaseFontSize={decreaseFontSize}
                    onOpenToc={() => { setSidebarTab('toc'); setSidebarOpen(true) }}
                    prevArticleHref={prevArticleHref}
                    nextArticleHref={nextArticleHref}
                    scrollParent={scrollParent}
                />
            </div>
        </div>
    )
}
