'use client'

/**
 * ReaderSidebar — a professional slide-in panel containing two tabs:
 *   • Contents (Table of Contents / page list)
 *   • Search (full-text search across all pages)
 *
 * Themed entirely via --rt-* CSS variables so it respects the reader theme.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ReaderPage } from '@/types/reader'
import type { Segment, SegmentStatus } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
    pageIndex: number
    pageLabel: string
    segmentIndex: number
    sourceText: string
    targetText: string
    matchIn: 'source' | 'target' | 'both'
}

export type SidebarTab = 'toc' | 'search' | 'filter'

interface ReaderSidebarProps {
    open: boolean
    onClose: () => void
    /** All pages (not just current) — needed for TOC and global search */
    pages: ReaderPage[]
    currentPageIndex: number
    pageNoun: string
    onGoToPage: (index: number) => void
    /** Which tab to show when opened. Defaults to 'toc'. */
    initialTab?: SidebarTab
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mark a string with <mark> around occurrences of `query` (case-insensitive). */
function highlight(text: string, query: string): React.ReactNode {
    if (!query || !text) return text
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(re)
    return parts.map((part, i) =>
        re.test(part)
            ? <mark key={i} style={{ backgroundColor: '#fef08a', color: '#000', borderRadius: 2 }}>{part}</mark>
            : part
    )
}

/** Search across all pages' segments; returns up to MAX_RESULTS results. */
const MAX_RESULTS = 80

function searchPages(pages: ReaderPage[], query: string): SearchResult[] {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const results: SearchResult[] = []

    for (let pi = 0; pi < pages.length; pi++) {
        const page = pages[pi]
        const segs: Segment[] = page.segments
        for (let si = 0; si < segs.length; si++) {
            if (results.length >= MAX_RESULTS) break
            const seg = segs[si]
            const src = seg.source_text || ''
            const tgt = seg.target_text || ''
            const inSrc = src.toLowerCase().includes(q)
            const inTgt = tgt.toLowerCase().includes(q)
            if (inSrc || inTgt) {
                results.push({
                    pageIndex: pi,
                    pageLabel: page.label,
                    segmentIndex: si,
                    sourceText: src,
                    targetText: tgt,
                    matchIn: inSrc && inTgt ? 'both' : inSrc ? 'source' : 'target',
                })
            }
        }
        if (results.length >= MAX_RESULTS) break
    }

    return results
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TocTab({
    pages,
    currentPageIndex,
    pageNoun,
    onGoToPage,
    onClose,
}: {
    pages: ReaderPage[]
    currentPageIndex: number
    pageNoun: string
    onGoToPage: (i: number) => void
    onClose: () => void
}) {
    const activeRef = useRef<HTMLButtonElement | null>(null)

    useEffect(() => {
        activeRef.current?.scrollIntoView({ block: 'nearest' })
    }, [currentPageIndex])

    if (pages.length === 0) {
        return (
            <p className="text-sm p-4" style={{ color: 'var(--rt-text-muted)' }}>
                No pages available.
            </p>
        )
    }

    return (
        <div className="flex flex-col gap-px overflow-y-auto flex-1 p-2">
            {pages.map((page, i) => {
                const isCurrent = i === currentPageIndex
                return (
                    <button
                        key={i}
                        ref={isCurrent ? activeRef : undefined}
                        type="button"
                        onClick={() => { onGoToPage(i); onClose() }}
                        className="flex items-center gap-3 w-full text-left rounded-lg px-3 py-2 text-sm transition-colors"
                        style={isCurrent ? {
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            fontWeight: 600,
                        } : {
                            backgroundColor: 'transparent',
                            color: 'var(--rt-text)',
                        }}
                        aria-current={isCurrent ? 'page' : undefined}
                    >
                        <span
                            className="text-xs shrink-0 w-12 text-right font-mono"
                            style={{ color: isCurrent ? 'rgba(255,255,255,0.7)' : 'var(--rt-text-muted)' }}
                        >
                            {pageNoun} {page.label}
                        </span>
                        <span className="flex-1 truncate">
                            {page.segments[0]?.source_text?.slice(0, 80) || '—'}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

function SearchTab({
    pages,
    pageNoun,
    onGoToPage,
    onClose,
}: {
    pages: ReaderPage[]
    pageNoun: string
    onGoToPage: (i: number) => void
    onClose: () => void
}) {
    const [query, setQuery] = useState('')
    const inputRef = useRef<HTMLInputElement | null>(null)

    // Focus the input whenever the tab is shown
    useEffect(() => { inputRef.current?.focus() }, [])

    const results = searchPages(pages, query)
    const hasQuery = query.trim().length > 0

    // Group by page
    const grouped: Map<number, SearchResult[]> = new Map()
    for (const r of results) {
        if (!grouped.has(r.pageIndex)) grouped.set(r.pageIndex, [])
        grouped.get(r.pageIndex)!.push(r)
    }

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Search input */}
            <div className="p-3 shrink-0">
                <div
                    className="flex items-center gap-2 rounded-lg border px-3 py-2"
                    style={{
                        backgroundColor: 'var(--rt-surface)',
                        borderColor: 'var(--rt-border)',
                    }}
                >
                    {/* Magnifier icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0" style={{ color: 'var(--rt-text-muted)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search document…"
                        className="flex-1 bg-transparent text-sm outline-none"
                        style={{ color: 'var(--rt-text)' }}
                        aria-label="Search document"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            aria-label="Clear search"
                            style={{ color: 'var(--rt-text-muted)' }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Results */}
            <div className="overflow-y-auto flex-1 px-3 pb-4">
                {!hasQuery && (
                    <p className="text-sm text-center py-8" style={{ color: 'var(--rt-text-muted)' }}>
                        Type to search across all pages
                    </p>
                )}
                {hasQuery && results.length === 0 && (
                    <p className="text-sm text-center py-8" style={{ color: 'var(--rt-text-muted)' }}>
                        No results for &ldquo;{query}&rdquo;
                    </p>
                )}
                {hasQuery && results.length > 0 && (
                    <>
                        <p className="text-xs mb-3" style={{ color: 'var(--rt-text-muted)' }}>
                            {results.length >= MAX_RESULTS ? `${MAX_RESULTS}+ results` : `${results.length} result${results.length === 1 ? '' : 's'}`}
                        </p>
                        {Array.from(grouped.entries()).map(([pageIndex, pageResults]) => (
                            <div key={pageIndex} className="mb-4">
                                <div
                                    className="text-xs font-semibold mb-1 px-1 py-0.5 rounded"
                                    style={{ color: 'var(--rt-text-muted)', backgroundColor: 'var(--rt-surface)' }}
                                >
                                    {pageNoun} {pageResults[0].pageLabel}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {pageResults.map((r, ri) => (
                                        <button
                                            key={ri}
                                            type="button"
                                            onClick={() => { onGoToPage(r.pageIndex); onClose() }}
                                            className="w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors hover:border-blue-400"
                                            style={{
                                                backgroundColor: 'var(--rt-surface)',
                                                borderColor: 'var(--rt-border)',
                                                color: 'var(--rt-text)',
                                            }}
                                        >
                                            {/* Source text — show if match is in source or both */}
                                            {(r.matchIn === 'source' || r.matchIn === 'both') && r.sourceText && (
                                                <div className="line-clamp-2 mb-1">
                                                    <span style={{ color: 'var(--rt-text-muted)' }}>JA: </span>
                                                    {highlight(r.sourceText, query)}
                                                </div>
                                            )}
                                            {/* Target text — show if match is in target or both */}
                                            {(r.matchIn === 'target' || r.matchIn === 'both') && r.targetText && (
                                                <div className="line-clamp-2">
                                                    <span style={{ color: 'var(--rt-text-muted)' }}>EN: </span>
                                                    {highlight(r.targetText, query)}
                                                </div>
                                            )}
                                            {/* If only source matched, also show target as context */}
                                            {r.matchIn === 'source' && r.targetText && (
                                                <div className="line-clamp-1 mt-0.5 opacity-70">
                                                    <span style={{ color: 'var(--rt-text-muted)' }}>EN: </span>
                                                    {r.targetText.slice(0, 80)}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Filter tab
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: SegmentStatus[] = ['draft', 'translated', 'edited', 'proofread', 'qa_approved']

const STATUS_LABELS: Record<SegmentStatus, string> = {
    draft: 'Draft',
    translated: 'Translated',
    edited: 'Edited',
    proofread: 'Proofread',
    qa_approved: 'QA Approved',
}

const STATUS_COLORS: Record<SegmentStatus, { bg: string; text: string }> = {
    draft:       { bg: '#fee2e2', text: '#991b1b' },
    translated:  { bg: '#dbeafe', text: '#1e40af' },
    edited:      { bg: '#d1fae5', text: '#065f46' },
    proofread:   { bg: '#fef3c7', text: '#92400e' },
    qa_approved: { bg: '#ede9fe', text: '#5b21b6' },
}

interface FilterResult {
    pageIndex: number
    pageLabel: string
    segment: Segment
}

function buildFilterResults(pages: ReaderPage[], statuses: Set<SegmentStatus>): FilterResult[] {
    if (statuses.size === 0) return []
    const results: FilterResult[] = []
    for (let pi = 0; pi < pages.length; pi++) {
        const page = pages[pi]
        for (const seg of page.segments) {
            if (statuses.has(seg.status as SegmentStatus)) {
                results.push({ pageIndex: pi, pageLabel: page.label, segment: seg })
                if (results.length >= 200) return results
            }
        }
    }
    return results
}

function FilterTab({
    pages,
    pageNoun,
    onGoToPage,
    onClose,
}: {
    pages: ReaderPage[]
    pageNoun: string
    onGoToPage: (i: number) => void
    onClose: () => void
}) {
    const [selected, setSelected] = useState<Set<SegmentStatus>>(new Set())

    const toggle = (s: SegmentStatus) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(s)) next.delete(s); else next.add(s)
            return next
        })
    }

    const results = buildFilterResults(pages, selected)

    // Group by page index
    const grouped = new Map<number, FilterResult[]>()
    for (const r of results) {
        if (!grouped.has(r.pageIndex)) grouped.set(r.pageIndex, [])
        grouped.get(r.pageIndex)!.push(r)
    }

    const totalSegments = pages.reduce((acc, p) => acc + p.segments.length, 0)

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Status filter buttons */}
            <div className="p-3 shrink-0" style={{ borderBottom: '1px solid var(--rt-border)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--rt-text-muted)' }}>
                    Filter segments by status ({totalSegments.toLocaleString()} total)
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map(s => {
                        const active = selected.has(s)
                        const colors = STATUS_COLORS[s]
                        return (
                            <button
                                key={s}
                                type="button"
                                onClick={() => toggle(s)}
                                className="text-xs px-2 py-1 rounded-full border transition-all"
                                style={active ? {
                                    backgroundColor: colors.bg,
                                    color: colors.text,
                                    borderColor: colors.text,
                                    fontWeight: 600,
                                } : {
                                    backgroundColor: 'var(--rt-surface)',
                                    color: 'var(--rt-text-muted)',
                                    borderColor: 'var(--rt-border)',
                                }}
                            >
                                {STATUS_LABELS[s]}
                            </button>
                        )
                    })}
                </div>
                {selected.size > 0 && (
                    <button
                        type="button"
                        onClick={() => setSelected(new Set())}
                        className="text-xs mt-2"
                        style={{ color: 'var(--rt-text-muted)' }}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {selected.size === 0 && (
                    <p className="text-sm text-center py-8" style={{ color: 'var(--rt-text-muted)' }}>
                        Select one or more statuses above to find segments
                    </p>
                )}
                {selected.size > 0 && results.length === 0 && (
                    <p className="text-sm text-center py-8" style={{ color: 'var(--rt-text-muted)' }}>
                        No segments with the selected status
                    </p>
                )}
                {results.length > 0 && (
                    <>
                        <p className="text-xs mb-2 px-1" style={{ color: 'var(--rt-text-muted)' }}>
                            {results.length >= 200 ? '200+ matches' : `${results.length} match${results.length === 1 ? '' : 'es'}`}
                        </p>
                        {Array.from(grouped.entries()).map(([pageIndex, pageResults]) => (
                            <div key={pageIndex} className="mb-3">
                                <div
                                    className="text-xs font-semibold mb-1 px-1 py-0.5 rounded"
                                    style={{ color: 'var(--rt-text-muted)', backgroundColor: 'var(--rt-surface)' }}
                                >
                                    {pageNoun} {pageResults[0].pageLabel}
                                </div>
                                <div className="flex flex-col gap-1">
                                    {pageResults.map((r, ri) => {
                                        const colors = STATUS_COLORS[r.segment.status as SegmentStatus] ?? { bg: '#f3f4f6', text: '#374151' }
                                        return (
                                            <button
                                                key={ri}
                                                type="button"
                                                onClick={() => { onGoToPage(r.pageIndex); onClose() }}
                                                className="w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors hover:border-blue-400"
                                                style={{
                                                    backgroundColor: 'var(--rt-surface)',
                                                    borderColor: 'var(--rt-border)',
                                                    color: 'var(--rt-text)',
                                                }}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span
                                                        className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                                                        style={{ backgroundColor: colors.bg, color: colors.text }}
                                                    >
                                                        {STATUS_LABELS[r.segment.status as SegmentStatus] ?? r.segment.status}
                                                    </span>
                                                </div>
                                                {r.segment.source_text && (
                                                    <div className="line-clamp-2 opacity-80">{r.segment.source_text.slice(0, 100)}</div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ReaderSidebar({
    open,
    onClose,
    pages,
    currentPageIndex,
    pageNoun,
    onGoToPage,
    initialTab = 'toc',
}: ReaderSidebarProps) {
    const [activeTab, setActiveTab] = useState<SidebarTab>(initialTab)
    const sidebarRef = useRef<HTMLDivElement | null>(null)

    // Sync active tab whenever the sidebar is newly opened with a specific initialTab
    useEffect(() => {
        if (open) setActiveTab(initialTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    // Close on Escape
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open, onClose])

    // Close on outside click
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
            onClose()
        }
    }, [onClose])

    if (!open) return null

    return (
        /* Backdrop — semi-transparent overlay behind the sidebar */
        <div
            className="fixed inset-0 z-40 flex"
            onClick={handleBackdropClick}
            aria-modal="true"
            role="dialog"
            aria-label="Reader sidebar"
        >
            {/* Sidebar panel — slides in from the left; full-screen on mobile */}
            <div
                ref={sidebarRef}
                className="relative flex flex-col w-full sm:w-80 sm:max-w-[90vw] shadow-2xl"
                style={{
                    backgroundColor: 'var(--rt-bg)',
                    borderRight: '1px solid var(--rt-border)',
                    height: '100vh',
                    overflowY: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 shrink-0"
                    style={{ borderBottom: '1px solid var(--rt-border)' }}
                >
                    <div className="flex gap-1">
                        {(['toc', 'search', 'filter'] as SidebarTab[]).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize"
                                style={activeTab === tab ? {
                                    backgroundColor: '#3b82f6',
                                    color: '#fff',
                                } : {
                                    backgroundColor: 'var(--rt-surface)',
                                    color: 'var(--rt-text-muted)',
                                }}
                            >
                                {tab === 'toc' ? 'Contents' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close sidebar"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors"
                        style={{ color: 'var(--rt-text-muted)', backgroundColor: 'var(--rt-surface)' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Tab content */}
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    {activeTab === 'toc' && (
                        <TocTab
                            pages={pages}
                            currentPageIndex={currentPageIndex}
                            pageNoun={pageNoun}
                            onGoToPage={onGoToPage}
                            onClose={onClose}
                        />
                    )}
                    {activeTab === 'search' && (
                        <SearchTab
                            pages={pages}
                            pageNoun={pageNoun}
                            onGoToPage={onGoToPage}
                            onClose={onClose}
                        />
                    )}
                    {activeTab === 'filter' && (
                        <FilterTab
                            pages={pages}
                            pageNoun={pageNoun}
                            onGoToPage={onGoToPage}
                            onClose={onClose}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
