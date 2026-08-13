'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import type { SegmentStatus, WorkflowPhase } from '@/types/database'
import SegmentFilterBar from '@/components/editor/SegmentFilterBar'
import type {
    ArticleSuggestion,
    ArticleComment,
    ArticleQAIssue,
} from '@/lib/hooks/useArticleAggregates'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

/** Minimal book/article context shape (structurally matches EditorClient's
 *  `EditorBookContext`). Kept local to avoid a type import cycle. */
export interface SidebarBookContext {
    book: {
        id: string
        title: string
        author?: string | null
        doc_type?: string | null
    }
    article: {
        id: string
        title: string
        author?: string | null
        doc_type?: string | null
    }
}

export type EditorSidebarSection =
    | 'nav'
    | 'filter'
    | 'assignments'
    | 'suggestions'
    | 'comments'
    | 'qa'

export interface EditorSidebarProps {
    bookContext: SidebarBookContext | null
    articleTitle: string | null
    targetLang: 'en' | 'zh'
    onTargetLangChange: (l: 'en' | 'zh') => void
    stats: { total: number; translated: number; approved: number }

    /* ── Filter & Search (passed through to SegmentFilterBar) ─── */
    statusCounts: Record<SegmentStatus, number>
    filterStatuses: SegmentStatus[]
    filterQuery: string
    showMyPhase: boolean
    userPhases: WorkflowPhase[]
    onToggleStatus: (s: SegmentStatus) => void
    onClearStatuses: () => void
    onQueryChange: (q: string) => void
    onToggleMyPhase: () => void

    /* ── Assignments ─────────────────────────────────────────── */
    userName: string | null

    /* ── Article-level aggregates ────────────────────────────── */
    suggestions: ArticleSuggestion[]
    comments: ArticleComment[]
    qaIssues: ArticleQAIssue[]
    aggregatesLoading: boolean
    onRefreshAggregates: () => void

    /* ── Jump-to-segment ─────────────────────────────────────── */
    onJumpToSegment: (segmentId: string) => void
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                       */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'editor-sidebar-state'
const WIDTH_KEY = 'editor-sidebar-width'
const DEFAULT_WIDTH = 300
const MIN_WIDTH = 240
const MAX_WIDTH = 600

function loadExpanded(): boolean {
    if (typeof window === 'undefined') return false
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return false
        return !!(JSON.parse(raw) as { expanded?: boolean }).expanded
    } catch {
        return false
    }
}

function saveExpanded(expanded: boolean) {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ expanded }))
    } catch { /* ignore */ }
}

function loadWidth(): number {
    if (typeof window === 'undefined') return DEFAULT_WIDTH
    try {
        const raw = localStorage.getItem(WIDTH_KEY)
        if (!raw) return DEFAULT_WIDTH
        const v = parseInt(raw, 10)
        return isNaN(v) || v < MIN_WIDTH || v > MAX_WIDTH ? DEFAULT_WIDTH : v
    } catch {
        return DEFAULT_WIDTH
    }
}

function saveWidth(w: number) {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(WIDTH_KEY, String(w))
    } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/*  Icons                                                             */
/* ------------------------------------------------------------------ */

function ChevronLeftIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
    )
}

function ChevronRightIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
    )
}

function NavIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
    )
}

function FilterIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
        </svg>
    )
}

function AssignmentIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
    )
}

function SuggestionIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
    )
}

function CommentIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
    )
}

function QAIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/*  Shared small helpers                                              */
/* ------------------------------------------------------------------ */

/** Display-only fix for the "UNCATEGORIZED-BOOK" data-quality artifact. */
function displayBookTitle(title: string | undefined | null): string {
    if (!title) return 'Untitled'
    if (title === 'UNCATEGORIZED-BOOK') return 'Uncategorized'
    return title
}

function isUncategorized(title: string | undefined | null): boolean {
    return title === 'UNCATEGORIZED-BOOK'
}

function formatTime(iso: string | null | undefined): string {
    if (!iso) return ''
    try {
        const d = new Date(iso)
        return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
    } catch {
        return ''
    }
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
    return (
        <div className="px-4 py-2 border-b border-[var(--color-border)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 text-[var(--color-text-muted)]">
                {label}
                {count !== undefined && count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">
                        {count}
                    </span>
                )}
            </h3>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Segment-context row (jump target)                                 */
/* ------------------------------------------------------------------ */

interface JumpRowProps {
    segmentId: string
    position: number
    sourcePreview: string | null
    targetPreview: string | null
    onJump: (segmentId: string) => void
}

function JumpRow({ segmentId, position, sourcePreview, targetPreview, onJump }: JumpRowProps) {
    const preview = targetPreview || sourcePreview || '(no text)'
    return (
        <button
            type="button"
            onClick={() => onJump(segmentId)}
            data-testid="article-jump-row"
            data-segment-id={segmentId}
            title="Jump to segment"
            className="w-full text-left rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs transition-colors hover:border-indigo-400 hover:bg-[var(--color-bg)]"
        >
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 mb-1">
                <span>#{position}</span>
                <span className="text-[var(--color-text-muted)] font-normal">· jump →</span>
            </span>
            <span className="block line-clamp-2 text-[var(--color-text)]">{preview}</span>
        </button>
    )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function EditorSidebar(props: EditorSidebarProps) {
    const {
        bookContext,
        articleTitle,
        targetLang,
        onTargetLangChange,
        stats,
        statusCounts,
        filterStatuses,
        filterQuery,
        showMyPhase,
        userPhases,
        onToggleStatus,
        onClearStatuses,
        onQueryChange,
        onToggleMyPhase,
        userName,
        suggestions,
        comments,
        qaIssues,
        aggregatesLoading,
        onRefreshAggregates,
        onJumpToSegment,
    } = props

    const [expanded, setExpandedState] = useState<boolean>(loadExpanded)
    const [width, setWidth] = useState<number>(loadWidth)
    const [resizing, setResizing] = useState(false)
    const resizeStartXRef = useRef(0)
    const resizeStartWidthRef = useRef(0)

    const updateExpanded = useCallback((v: boolean) => {
        setExpandedState(v)
        saveExpanded(v)
    }, [])

    const widthRef = useRef(width)
    widthRef.current = width

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        setResizing(true)
        resizeStartXRef.current = e.clientX
        resizeStartWidthRef.current = widthRef.current
    }, [])

    useEffect(() => {
        if (!resizing) return
        const move = (e: MouseEvent) => {
            const delta = e.clientX - resizeStartXRef.current
            setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStartWidthRef.current + delta)))
        }
        const up = () => setResizing(false)
        document.addEventListener('mousemove', move)
        document.addEventListener('mouseup', up)
        return () => {
            document.removeEventListener('mousemove', move)
            document.removeEventListener('mouseup', up)
        }
    }, [resizing])

    const prevResizing = useRef(resizing)
    useEffect(() => {
        if (prevResizing.current && !resizing) saveWidth(width)
        prevResizing.current = resizing
    }, [resizing, width])

    // Close on Escape
    useEffect(() => {
        if (!expanded) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') updateExpanded(false)
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [expanded, updateExpanded])

    const sections: { key: EditorSidebarSection; label: string; icon: React.ReactNode; badge?: number }[] = [
        { key: 'nav', label: 'Navigation', icon: <NavIcon /> },
        { key: 'filter', label: 'Filter & Search', icon: <FilterIcon /> },
        { key: 'assignments', label: 'Assignments', icon: <AssignmentIcon /> },
        { key: 'suggestions', label: 'Suggestions', icon: <SuggestionIcon />, badge: suggestions.length },
        { key: 'comments', label: 'Comments', icon: <CommentIcon />, badge: comments.length },
        { key: 'qa', label: 'QA Issues', icon: <QAIcon />, badge: qaIssues.length },
    ]

    const scrollToSection = (key: EditorSidebarSection) => {
        document.getElementById(`editor-section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleScrollTo = (key: EditorSidebarSection) => {
        updateExpanded(true)
        requestAnimationFrame(() => scrollToSection(key))
    }

    /* ── Icon rail ─────────────────────────────────────────────── */
    const iconRail = (
        <div className="flex flex-col items-center gap-1 py-3 shrink-0 h-full overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)]"
            style={{ width: '52px' }}>
            <button
                type="button"
                onClick={() => updateExpanded(!expanded)}
                aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                className="w-9 h-9 flex items-center justify-center rounded-lg mb-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] transition-colors"
            >
                {expanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </button>
            {sections.map(({ key, label, icon, badge }) => (
                <div key={key} className="relative">
                    <button
                        type="button"
                        aria-label={label}
                        title={label}
                        onClick={() => handleScrollTo(key)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] transition-colors"
                    >
                        {icon}
                    </button>
                    {badge !== undefined && badge > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold leading-none pointer-events-none">
                            {badge > 9 ? '9+' : badge}
                        </span>
                    )}
                </div>
            ))}
            <div className="flex-1" />
        </div>
    )

    /* ── Stacked sections ───────────────────────────────────────── */
    const stackedSections = (
        <>
            {/* Nav */}
            <div id="editor-section-nav">
                <SectionHeader label="Navigation" />
                <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-sm flex-wrap">
                        {bookContext ? (
                            <>
                                <Link href="/books" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">← Books</Link>
                                <span className="text-[var(--color-text-muted)]/40">/</span>
                                <Link
                                    href={`/books/${bookContext.book.id}`}
                                    title={isUncategorized(bookContext.book.title) ? 'No book categorization assigned' : bookContext.book.title}
                                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors truncate max-w-[160px]"
                                >
                                    {displayBookTitle(bookContext.book.title)}
                                </Link>
                            </>
                        ) : (
                            <Link href="/documents" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">← Docs</Link>
                        )}
                    </div>
                    <h2 className="text-sm font-semibold text-[var(--color-text)] truncate">
                        {bookContext ? bookContext.article.title : articleTitle}
                    </h2>

                    {(bookContext?.article.author || bookContext?.book.author) && (
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                            <span className="font-medium">Author:</span> {bookContext.article.author || bookContext.book.author}
                        </p>
                    )}

                    {/* Language switcher */}
                    <div className="flex items-center gap-1.5 pt-1" data-testid="lang-switcher">
                        <button
                            onClick={() => onTargetLangChange('en')}
                            data-testid="lang-tab-en"
                            className={`text-xs px-2 py-0.5 rounded transition-colors font-medium ${targetLang === 'en' ? 'bg-indigo-600 text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]'}`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => onTargetLangChange('zh')}
                            data-testid="lang-tab-zh"
                            className={`text-xs px-2 py-0.5 rounded transition-colors font-medium ${targetLang === 'zh' ? 'bg-indigo-600 text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]'}`}
                        >
                            ZH
                        </button>
                    </div>

                    {/* Stats + progress */}
                    {stats.total > 0 && (
                        <div className="pt-1">
                            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                                <span>{stats.translated}/{stats.total} translated</span>
                                <span className="text-green-600">{stats.approved} approved</span>
                            </div>
                            <div className="mt-1.5 h-1 w-full rounded-full bg-[var(--color-bg)]">
                                <div
                                    className="h-full rounded-full bg-blue-500 transition-all"
                                    style={{ width: `${(stats.translated / stats.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Filter & Search */}
            <div id="editor-section-filter" style={{ borderTop: '1px solid var(--color-border)' }}>
                <SectionHeader label="Filter & Search" />
                <div className="p-3">
                    <SegmentFilterBar
                        statusCounts={statusCounts}
                        activeStatuses={filterStatuses}
                        query={filterQuery}
                        showMyPhase={showMyPhase}
                        userPhases={userPhases}
                        onToggleStatus={onToggleStatus}
                        onClearStatuses={onClearStatuses}
                        onQueryChange={onQueryChange}
                        onToggleMyPhase={onToggleMyPhase}
                    />
                </div>
            </div>

            {/* Assignments */}
            <div id="editor-section-assignments" style={{ borderTop: '1px solid var(--color-border)' }}>
                <SectionHeader label="Assignments" />
                <div className="px-4 py-3">
                    {userPhases.length > 0 ? (
                        <div data-testid="assignment-banner" className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-sm">
                            <div className="flex-1 min-w-0">
                                <span className="font-medium text-indigo-800">
                                    {userName ? `${userName} — ` : ''}Assigned phases:
                                </span>{' '}
                                <span className="inline-flex flex-wrap gap-1 ml-0.5">
                                    {userPhases.map((phase) => (
                                        <span key={phase} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                            {phase}
                                        </span>
                                    ))}
                                </span>
                                <button
                                    type="button"
                                    onClick={onToggleMyPhase}
                                    className={`block mt-2 text-xs underline-offset-2 underline transition-colors ${showMyPhase ? 'text-indigo-700 font-semibold' : 'text-indigo-500 hover:text-indigo-700'}`}
                                >
                                    {showMyPhase ? '✓ Showing my segments' : 'Show my segments'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-[var(--color-text-muted)] italic">No phase assignments for this article.</p>
                    )}
                </div>
            </div>

            {/* Suggestions */}
            <div id="editor-section-suggestions" style={{ borderTop: '1px solid var(--color-border)' }}>
                <SectionHeader label="Suggestions" count={suggestions.length} />
                <div className="px-4 py-3 space-y-2">
                    {aggregatesLoading && suggestions.length === 0 && (
                        <p className="text-xs text-[var(--color-text-muted)] italic">Loading suggestions…</p>
                    )}
                    {!aggregatesLoading && suggestions.length === 0 && (
                        <p className="text-xs text-[var(--color-text-muted)] italic">No suggestions in this article.</p>
                    )}
                    {suggestions.map((s) => (
                        <div key={s.id} data-testid="article-suggestion" data-segment-id={s.segment_context.segment_id}
                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                                <span className="font-medium text-[var(--color-text)]">{s.suggester_name ?? 'unknown'}</span>
                                <span className={`rounded px-1.5 py-0.5 ring-1 ring-inset ${s.suggester_kind === 'agent' ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-sky-50 text-sky-700 ring-sky-200'}`}>
                                    {s.suggester_kind}
                                </span>
                                {formatTime(s.created_at) && <span>· {formatTime(s.created_at)}</span>}
                                <span className={`ml-auto rounded px-1.5 py-0.5 ring-1 ring-inset ${s.status === 'pending' ? 'bg-slate-100 text-slate-700 ring-slate-200' : s.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : s.status === 'rejected' ? 'bg-rose-100 text-rose-700 ring-rose-200' : 'bg-amber-100 text-amber-800 ring-amber-200'}`}>
                                    {s.status}
                                </span>
                            </div>
                            <p className="text-xs text-[var(--color-text)] whitespace-pre-wrap">{s.proposed_text}</p>
                            <JumpRow
                                segmentId={s.segment_context.segment_id}
                                position={s.segment_context.position}
                                sourcePreview={s.segment_context.source_preview}
                                targetPreview={s.segment_context.target_preview}
                                onJump={onJumpToSegment}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Comments */}
            <div id="editor-section-comments" style={{ borderTop: '1px solid var(--color-border)' }}>
                <SectionHeader label="Comments" count={comments.length} />
                <div className="px-4 py-3 space-y-2">
                    {aggregatesLoading && comments.length === 0 && (
                        <p className="text-xs text-[var(--color-text-muted)] italic">Loading comments…</p>
                    )}
                    {!aggregatesLoading && comments.length === 0 && (
                        <p className="text-xs text-[var(--color-text-muted)] italic">No comments in this article.</p>
                    )}
                    {comments.map((c) => (
                        <div key={c.id} data-testid="article-comment" data-segment-id={c.segment_context.segment_id}
                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                                <span className="font-medium text-[var(--color-text)]">{c.author_name ?? 'unknown'}</span>
                                {formatTime(c.created_at) && <span>· {formatTime(c.created_at)}</span>}
                                {c.resolved && (
                                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 ring-1 ring-inset ring-emerald-200">resolved</span>
                                )}
                            </div>
                            <p className="text-xs text-[var(--color-text)] whitespace-pre-wrap">{c.content}</p>
                            <JumpRow
                                segmentId={c.segment_context.segment_id}
                                position={c.segment_context.position}
                                sourcePreview={c.segment_context.source_preview}
                                targetPreview={c.segment_context.target_preview}
                                onJump={onJumpToSegment}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* QA */}
            <div id="editor-section-qa" style={{ borderTop: '1px solid var(--color-border)' }}>
                <SectionHeader label="QA Issues" count={qaIssues.length} />
                <div className="px-4 py-3 space-y-2">
                    {aggregatesLoading && qaIssues.length === 0 && (
                        <p className="text-xs text-[var(--color-text-muted)] italic">Loading QA issues…</p>
                    )}
                    {!aggregatesLoading && qaIssues.length === 0 && (
                        <p className="text-xs text-[var(--color-text-muted)] italic">No QA issues in this article.</p>
                    )}
                    {qaIssues.map((q) => (
                        <div key={q.id} data-testid="article-qa-issue" data-segment-id={q.segment_context.segment_id}
                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className={`rounded-full px-2 py-0.5 font-medium ${q.severity === 'critical' ? 'bg-red-100 text-red-800' : q.severity === 'major' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {q.severity}
                                </span>
                                <span className="rounded-full px-2 py-0.5 font-medium bg-slate-100 text-slate-700">{q.category}</span>
                                {q.resolved ? (
                                    <span className="rounded-full px-2 py-0.5 font-medium bg-green-100 text-green-800">Resolved</span>
                                ) : (
                                    <span className="rounded-full px-2 py-0.5 font-medium bg-red-50 text-red-700">Open</span>
                                )}
                            </div>
                            {q.body && <p className="text-xs text-[var(--color-text)] whitespace-pre-wrap">{q.body}</p>}
                            <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                                {q.author_name && <span>by {q.author_name}</span>}
                                {formatTime(q.created_at) && <span>· {formatTime(q.created_at)}</span>}
                            </div>
                            <JumpRow
                                segmentId={q.segment_context.segment_id}
                                position={q.segment_context.position}
                                sourcePreview={q.segment_context.source_preview}
                                targetPreview={q.segment_context.target_preview}
                                onJump={onJumpToSegment}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Refresh */}
            <div style={{ borderTop: '1px solid var(--color-border)' }} className="px-4 py-3">
                <button
                    type="button"
                    onClick={onRefreshAggregates}
                    disabled={aggregatesLoading}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] transition-colors disabled:opacity-50"
                >
                    Refresh activity
                </button>
            </div>
        </>
    )

    /* ── Collapsed: icon rail only ─────────────────────────────── */
    if (!expanded) {
        return (
            <aside className="hidden md:flex shrink-0 sticky top-0 h-screen" style={{ width: '52px' }} data-testid="editor-sidebar-collapsed">
                {iconRail}
            </aside>
        )
    }

    /* ── Expanded ──────────────────────────────────────────────── */
    return (
        <aside
            className="hidden md:flex shrink-0 sticky top-0 h-screen"
            style={{ width: `${width + 52}px` }}
            data-testid="editor-sidebar-expanded"
        >
            {iconRail}
            <div className="flex flex-col flex-1 min-w-0 border-r border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-[var(--color-border)]">
                    <span className="text-sm font-semibold text-[var(--color-text)]">Editor</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {stackedSections}
                </div>
            </div>
            {/* Resize handle */}
            <div
                onMouseDown={handleResizeStart}
                className="shrink-0 select-none transition-colors"
                style={{
                    width: '4px',
                    cursor: 'col-resize',
                    backgroundColor: resizing ? 'rgba(99,102,241,0.4)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!resizing) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(99,102,241,0.2)' }}
                onMouseLeave={(e) => { if (!resizing) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
            />
        </aside>
    )
}
