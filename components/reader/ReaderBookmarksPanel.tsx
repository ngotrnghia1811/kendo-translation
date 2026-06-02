'use client'

import { useEffect, useRef } from 'react'
import type { ReaderBookmark } from '@/hooks/useReaderBookmarks'

interface ReaderBookmarksPanelProps {
    open: boolean
    onClose: () => void
    bookmarks: ReaderBookmark[]
    currentPageIndex: number
    pageNoun: string
    onJumpTo: (pageIndex: number) => void
    onRemove: (pageIndex: number) => void
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso)
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
        return ''
    }
}

export default function ReaderBookmarksPanel({
    open,
    onClose,
    bookmarks,
    currentPageIndex,
    pageNoun,
    onJumpTo,
    onRemove,
}: ReaderBookmarksPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)

    // Close on Escape
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open, onClose])

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        // Delay by a tick so the opener-button click doesn't immediately close
        const timeout = setTimeout(() => document.addEventListener('mousedown', handler), 0)
        return () => {
            clearTimeout(timeout)
            document.removeEventListener('mousedown', handler)
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <div
            ref={panelRef}
            role="dialog"
            aria-label="Bookmarks"
            className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl shadow-xl overflow-hidden"
            style={{
                backgroundColor: 'var(--rt-surface)',
                border: '1px solid var(--rt-border)',
                color: 'var(--rt-text)',
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--rt-border)' }}
            >
                <span className="text-sm font-semibold">Bookmarks</span>
                <button
                    type="button"
                    aria-label="Close bookmarks"
                    onClick={onClose}
                    className="text-xs rounded px-2 py-0.5 hover:opacity-75"
                    style={{ color: 'var(--rt-text-muted)' }}
                >
                    ✕
                </button>
            </div>

            {/* Bookmark list */}
            <div className="max-h-80 overflow-y-auto">
                {bookmarks.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--rt-text-muted)' }}>
                        No bookmarks yet.
                        <br />
                        <span className="text-xs">Click the bookmark button to save your current page.</span>
                    </div>
                ) : (
                    <ul className="divide-y" style={{ borderColor: 'var(--rt-border)' }}>
                        {bookmarks.map((bm) => {
                            const isCurrent = bm.pageIndex === currentPageIndex
                            return (
                                <li
                                    key={bm.pageIndex}
                                    className="flex items-start gap-2 px-4 py-3"
                                    style={isCurrent ? { backgroundColor: 'var(--rt-surface-accent, rgba(59,130,246,0.08))' } : undefined}
                                >
                                    {/* Bookmark icon */}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="w-4 h-4 mt-0.5 shrink-0"
                                        style={{ color: isCurrent ? '#3b82f6' : 'var(--rt-text-muted)' }}
                                        aria-hidden="true"
                                    >
                                        <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v10.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25V4.75A1.75 1.75 0 0 0 16.25 3H3.75ZM10 14a.75.75 0 0 1-.53-.22l-3-3a.75.75 0 1 1 1.06-1.06L10 12.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3A.75.75 0 0 1 10 14Z" />
                                    </svg>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <button
                                            type="button"
                                            className="text-sm font-medium text-left w-full hover:underline"
                                            style={{ color: isCurrent ? '#3b82f6' : 'var(--rt-text)' }}
                                            onClick={() => { onJumpTo(bm.pageIndex); onClose() }}
                                        >
                                            {pageNoun} {bm.pageLabel}
                                            {isCurrent && (
                                                <span className="ml-1 text-xs font-normal" style={{ color: 'var(--rt-text-muted)' }}>
                                                    (here)
                                                </span>
                                            )}
                                        </button>
                                        {bm.note && (
                                            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--rt-text-muted)' }}>
                                                {bm.note}
                                            </p>
                                        )}
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--rt-text-muted)' }}>
                                            {formatDate(bm.createdAt)}
                                        </p>
                                    </div>

                                    {/* Remove */}
                                    <button
                                        type="button"
                                        aria-label={`Remove bookmark for ${pageNoun} ${bm.pageLabel}`}
                                        onClick={() => onRemove(bm.pageIndex)}
                                        className="shrink-0 text-xs rounded px-1 py-0.5 hover:opacity-75"
                                        style={{ color: 'var(--rt-text-muted)' }}
                                    >
                                        ✕
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </div>
    )
}
