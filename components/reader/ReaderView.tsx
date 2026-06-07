'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { Segment, DocumentSettings } from '@/types/database'
import { useReaderView, type ReaderMode, type ZhSegmentRow } from '@/hooks/useReaderView'
import { useReaderTheme } from '@/hooks/useReaderTheme'
import { useReaderBookmarks } from '@/hooks/useReaderBookmarks'
import { useReaderKeyboard } from '@/hooks/useReaderKeyboard'
import { useReaderProgress } from '@/hooks/useReaderProgress'
import SingleLanguageView from './SingleLanguageView'
import BilingualParagraphView from './BilingualParagraphView'
import TranslatorAlignedView from './TranslatorAlignedView'
import PdfPageView from './PdfPageView'
import ReaderSettingsPanel from './ReaderSettingsPanel'
import ReaderBookmarksPanel from './ReaderBookmarksPanel'
import ReaderSidebar from './ReaderSidebar'

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

export default function ReaderView({ segments, zhSegments, settings, title, articleId, canEdit, pairedPdfPath }: ReaderViewProps) {
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
        goToPage,
        pages,
    } = useReaderView(segments, settings, zhSegments)

    const {
        theme,
        font,
        fontSize,
        fontSizeValue,
        fontColor,
        setTheme,
        setFont,
        setFontColor,
        increaseFontSize,
        decreaseFontSize,
    } = useReaderTheme()

    // Panel state — at most one can be open at a time
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [bookmarksOpen, setBookmarksOpen] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarTab, setSidebarTab] = useState<'toc' | 'search'>('toc')

    const closeAll = useCallback(() => {
        setSettingsOpen(false); setBookmarksOpen(false); setSidebarOpen(false)
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

    useEffect(() => {
        const el = contentRef.current
        if (!el) return
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
        anyPanelOpen: settingsOpen || bookmarksOpen || sidebarOpen,
        onToggleBookmark: toggleBookmark,
        onToggleSettings: () => {
            setSettingsOpen((o) => !o)
            setBookmarksOpen(false)
            setSidebarOpen(false)
        },
        onOpenSearch: openSearch,
    })

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
                                    onThemeChange={setTheme}
                                    onFontChange={setFont}
                                    onFontColorChange={setFontColor}
                                    onIncreaseFontSize={increaseFontSize}
                                    onDecreaseFontSize={decreaseFontSize}
                                />
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
                    {segments.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            No segments available for this document.
                        </div>
                    ) : (
                        <>
                            {mode === 'single' && (
                                <SingleLanguageView
                                    paragraphs={paragraphs}
                                    displayLang={displayLang}
                                    sourceLang={sourceLang}
                                    targetLang={targetLang}
                                    getParagraphText={getParagraphText}
                                />
                            )}
                            {mode === 'bilingual' && (
                                <BilingualParagraphView
                                    paragraphs={paragraphs}
                                    sourceLang={sourceLang}
                                    targetLang={targetLang}
                                    getParagraphText={getParagraphText}
                                />
                            )}
                            {mode === 'aligned' && canEdit && (
                                <TranslatorAlignedView
                                    segments={pageSegments}
                                    sourceLang={sourceLang}
                                    targetLang={targetLang}
                                />
                            )}
                            {mode === 'pdf' && pairedPdfPath && (
                                <PdfPageView
                                    articleId={articleId}
                                    pdfPage={currentPage?.page ?? null}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* ----------------------------------------------------------------
                    Scroll-to-top floating button
                ---------------------------------------------------------------- */}
                {scrolled && (
                    <button
                        type="button"
                        onClick={scrollToTop}
                        aria-label="Scroll to top"
                        title="Scroll to top"
                        className="fixed bottom-6 right-6 z-30 w-10 h-10 flex items-center justify-center rounded-full shadow-lg border transition-all"
                        style={{
                            backgroundColor: 'var(--rt-bg)',
                            borderColor: 'var(--rt-border)',
                            color: 'var(--rt-text)',
                        }}
                    >
                        <ChevronUpIcon />
                    </button>
                )}
            </div>
        </div>
    )
}
