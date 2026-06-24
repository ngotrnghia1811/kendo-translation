'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  saveBookmarks,
  loadBookmarks,
  type ReaderBookmark,
} from '@/lib/pwa/storage'

export type { ReaderBookmark }

type BookmarkMap = Record<string, ReaderBookmark[]> // articleId → bookmarks

const STORAGE_KEY = 'reader-bookmarks'

/** Synchronous localStorage read (fast first-paint path). */
function loadLocal(): BookmarkMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BookmarkMap) : {}
  } catch {
    return {}
  }
}

/** Synchronous localStorage write (mirror). */
function saveLocal(map: BookmarkMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Quota exceeded or private-browsing restriction — fail silently.
  }
}

/**
 * Per-article bookmark management backed by IndexedDB (Phase 5.2) with
 * localStorage mirror for fast synchronous hydration.
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

  // Hydrate from localStorage synchronously on mount (avoid SSR mismatch),
  // then reconcile from IndexedDB async.
  useEffect(() => {
    setAllBookmarks(loadLocal())
  }, [])

  // Async reconcile from IndexedDB
  useEffect(() => {
    if (!articleId) return
    let cancelled = false
    loadBookmarks(articleId).then((idbBookmarks) => {
      if (cancelled) return
      if (idbBookmarks.length > 0) {
        setAllBookmarks((prev) => {
          const localBm = prev[articleId] ?? []
          // Prefer IndexedDB if it has more bookmarks (localStorage may be stale)
          if (idbBookmarks.length >= localBm.length) {
            return { ...prev, [articleId]: idbBookmarks }
          }
          return prev
        })
        // Repair localStorage mirror
        const full = loadLocal()
        full[articleId] = idbBookmarks
        saveLocal(full)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [articleId])

  /** Bookmarks for this specific article, sorted by pageIndex ascending. */
  const bookmarks: ReaderBookmark[] = (allBookmarks[articleId] ?? []).slice().sort(
    (a, b) => a.pageIndex - b.pageIndex,
  )

  const isBookmarked = bookmarks.some((b) => b.pageIndex === currentPageIndex)

  const persistBoth = useCallback(
    (updatedBookmarks: ReaderBookmark[]) => {
      // Write to localStorage mirror (sync, for next-mount fast read)
      const full = loadLocal()
      full[articleId] = updatedBookmarks
      saveLocal(full)

      // Write to IndexedDB (async, primary store)
      saveBookmarks(articleId, updatedBookmarks).catch(() => {})
    },
    [articleId],
  )

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
        persistBoth(updated)
        return next
      })
    },
    [articleId, currentPageIndex, currentPageLabel, persistBoth],
  )

  const removeBookmark = useCallback(
    (pageIndex: number) => {
      setAllBookmarks((prev) => {
        const updated = (prev[articleId] ?? []).filter((b) => b.pageIndex !== pageIndex)
        const next = { ...prev, [articleId]: updated }
        persistBoth(updated)
        return next
      })
    },
    [articleId, persistBoth],
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
