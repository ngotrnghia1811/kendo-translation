'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ReaderBookmark {
    /** 0-based page index within the article */
    pageIndex: number
    /** Human-readable label (e.g. "42" for imported books, "3" for legacy sections) */
    pageLabel: string
    /** Optional short note added by the user */
    note?: string
    /** ISO timestamp when the bookmark was created */
    createdAt: string
}

type BookmarkMap = Record<string, ReaderBookmark[]> // articleId → bookmarks

const STORAGE_KEY = 'reader-bookmarks'

function load(): BookmarkMap {
    if (typeof window === 'undefined') return {}
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? (JSON.parse(raw) as BookmarkMap) : {}
    } catch {
        return {}
    }
}

function save(map: BookmarkMap): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    } catch {
        // Quota exceeded or private-browsing restriction — fail silently.
    }
}

/**
 * Per-article bookmark management backed by localStorage.
 *
 * Usage:
 *   const { bookmarks, isBookmarked, toggleBookmark, removeBookmark, jumpTo } =
 *       useReaderBookmarks(articleId, currentPageIndex, currentPageLabel, goToPage)
 */
export function useReaderBookmarks(
    articleId: string,
    currentPageIndex: number,
    currentPageLabel: string,
    goToPage: (i: number) => void,
) {
    const [allBookmarks, setAllBookmarks] = useState<BookmarkMap>({})

    // Hydrate from localStorage once on mount (avoid SSR mismatch).
    useEffect(() => {
        setAllBookmarks(load())
    }, [])

    /** Bookmarks for this specific article, sorted by pageIndex ascending. */
    const bookmarks: ReaderBookmark[] = (allBookmarks[articleId] ?? []).slice().sort(
        (a, b) => a.pageIndex - b.pageIndex,
    )

    const isBookmarked = bookmarks.some((b) => b.pageIndex === currentPageIndex)

    const toggleBookmark = useCallback(
        (note?: string) => {
            setAllBookmarks((prev) => {
                const existing = prev[articleId] ?? []
                let updated: ReaderBookmark[]
                if (existing.some((b) => b.pageIndex === currentPageIndex)) {
                    // Remove bookmark for current page
                    updated = existing.filter((b) => b.pageIndex !== currentPageIndex)
                } else {
                    // Add bookmark for current page
                    updated = [
                        ...existing,
                        {
                            pageIndex: currentPageIndex,
                            pageLabel: currentPageLabel,
                            note,
                            createdAt: new Date().toISOString(),
                        },
                    ]
                }
                const next = { ...prev, [articleId]: updated }
                save(next)
                return next
            })
        },
        [articleId, currentPageIndex, currentPageLabel],
    )

    const removeBookmark = useCallback(
        (pageIndex: number) => {
            setAllBookmarks((prev) => {
                const updated = (prev[articleId] ?? []).filter((b) => b.pageIndex !== pageIndex)
                const next = { ...prev, [articleId]: updated }
                save(next)
                return next
            })
        },
        [articleId],
    )

    const jumpTo = useCallback(
        (pageIndex: number) => {
            goToPage(pageIndex)
        },
        [goToPage],
    )

    return {
        bookmarks,
        isBookmarked,
        toggleBookmark,
        removeBookmark,
        jumpTo,
    }
}
