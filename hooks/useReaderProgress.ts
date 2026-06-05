'use client'

/**
 * useReaderProgress — persists the last-read page index per article to
 * localStorage and provides helpers to read/write it.
 *
 * Storage key pattern: `reader-progress:<articleId>`
 * Value shape: `{ pageIndex: number, pageLabel: string, savedAt: string }`
 *
 * Designed to be called once at the top of ReaderView with the current
 * articleId.  The hook:
 *   1. Returns `savedPageIndex` — the persisted index (null if none / same doc
 *      has never been read).
 *   2. Exposes `persistPage(index, label)` — call it whenever the reader
 *      navigates to a new page.
 *   3. Exposes `clearProgress()` — for a "start over" button if needed.
 */

import { useCallback, useEffect, useRef } from 'react'

const STORAGE_PREFIX = 'reader-progress'

interface ProgressRecord {
    pageIndex: number
    pageLabel: string
    savedAt: string
}

function storageKey(articleId: string) {
    return `${STORAGE_PREFIX}:${articleId}`
}

function readRecord(articleId: string): ProgressRecord | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(storageKey(articleId))
        if (!raw) return null
        return JSON.parse(raw) as ProgressRecord
    } catch {
        return null
    }
}

function writeRecord(articleId: string, record: ProgressRecord) {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(storageKey(articleId), JSON.stringify(record))
    } catch {
        // Storage quota exceeded — silently ignore.
    }
}

export interface UseReaderProgressReturn {
    /** The last saved page index for this article, or null if not previously read / page 0. */
    savedPageIndex: number | null
    /** Persist the current page. Call on every page navigation. */
    persistPage: (pageIndex: number, pageLabel: string) => void
    /** Remove stored progress for this article. */
    clearProgress: () => void
}

export function useReaderProgress(articleId: string | undefined | null): UseReaderProgressReturn {
    // We intentionally do NOT store savedPageIndex in state — callers only need
    // it once (on mount) to restore position. We use a ref so it doesn't cause
    // re-renders.
    const savedRef = useRef<number | null>(null)

    useEffect(() => {
        if (!articleId) return
        const record = readRecord(articleId)
        // Treat page 0 as "not interesting" — no need to ask the user to resume.
        savedRef.current = record && record.pageIndex > 0 ? record.pageIndex : null
    }, [articleId])

    const persistPage = useCallback((pageIndex: number, pageLabel: string) => {
        if (!articleId) return
        writeRecord(articleId, {
            pageIndex,
            pageLabel,
            savedAt: new Date().toISOString(),
        })
    }, [articleId])

    const clearProgress = useCallback(() => {
        if (!articleId || typeof window === 'undefined') return
        localStorage.removeItem(storageKey(articleId))
        savedRef.current = null
    }, [articleId])

    return {
        get savedPageIndex() { return savedRef.current },
        persistPage,
        clearProgress,
    }
}
