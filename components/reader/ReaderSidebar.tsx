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
import type { Segment } from '@/types/database'

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

interface ReaderSidebarProps {
    open: boolean
    onClose: () => void
    /** All pages (not just current) — needed for TOC and global search */
    pages: ReaderPage[]
    currentPageIndex: number
    pageNoun: string
    onGoToPage: (index: number) => void
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
// Main component
// ---------------------------------------------------------------------------

type SidebarTab = 'toc' | 'search'

export default function ReaderSidebar({
    open,
    onClose,
    pages,
    currentPageIndex,
    pageNoun,
    onGoToPage,
}: ReaderSidebarProps) {
    const [activeTab, setActiveTab] = useState<SidebarTab>('toc')
    const sidebarRef = useRef<HTMLDivElement | null>(null)

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
            {/* Sidebar panel — slides in from the left */}
            <div
                ref={sidebarRef}
                className="relative flex flex-col w-80 max-w-[90vw] shadow-2xl"
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
                        <button
                            type="button"
                            onClick={() => setActiveTab('toc')}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                            style={activeTab === 'toc' ? {
                                backgroundColor: '#3b82f6',
                                color: '#fff',
                            } : {
                                backgroundColor: 'var(--rt-surface)',
                                color: 'var(--rt-text-muted)',
                            }}
                        >
                            Contents
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('search')}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                            style={activeTab === 'search' ? {
                                backgroundColor: '#3b82f6',
                                color: '#fff',
                            } : {
                                backgroundColor: 'var(--rt-surface)',
                                color: 'var(--rt-text-muted)',
                            }}
                        >
                            Search
                        </button>
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
                </div>
            </div>
        </div>
    )
}
