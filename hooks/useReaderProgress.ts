'use client'

/**
 * useReaderProgress — persists the last-read page index per article to
 * IndexedDB (Phase 5.2) with a localStorage fallback for fast synchronous
 * read on mount.
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
 *
 * Write path: IndexedDB (primary) + localStorage (sync-cache mirror).
 * Read path: localStorage on mount (sync, instant) + IndexedDB reconcile.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  saveReadingPosition,
  loadReadingPosition,
  clearReadingPosition,
} from '@/lib/pwa/storage'

const STORAGE_PREFIX = 'reader-progress'

interface ProgressRecord {
  pageIndex: number
  pageLabel: string
  savedAt: string
}

function storageKey(articleId: string) {
  return `${STORAGE_PREFIX}:${articleId}`
}

/** Synchronous read from localStorage (fast first-paint path). */
function readLocal(articleId: string): ProgressRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(articleId))
    if (!raw) return null
    return JSON.parse(raw) as ProgressRecord
  } catch {
    return null
  }
}

function writeLocal(articleId: string, record: ProgressRecord) {
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
  // Fast synchronous read from localStorage on mount (before first paint).
  // This prevents the flash-at-page-0 problem that async IndexedDB would cause.
  const savedRef = useRef<number | null>(
    (() => {
      if (!articleId || typeof window === 'undefined') return null
      const record = readLocal(articleId)
      return record && record.pageIndex > 0 ? record.pageIndex : null
    })()
  )

  // IndexedDB reconcile — runs async after mount, corrects localStorage
  // drift (e.g. if user cleared localStorage but IndexedDB survived).
  const [idbReconciled, setIdbReconciled] = useState(false)
  useEffect(() => {
    if (!articleId) return
    let cancelled = false
    loadReadingPosition(articleId).then((pos) => {
      if (cancelled) return
      if (pos && pos.pageIndex > 0) {
        // Sync localStorage with IndexedDB (repair drift)
        writeLocal(articleId, {
          pageIndex: pos.pageIndex,
          pageLabel: pos.pageLabel,
          savedAt: pos.savedAt,
        })
        if (savedRef.current === null) {
          savedRef.current = pos.pageIndex
        }
      }
      setIdbReconciled(true)
    }).catch(() => {
      if (!cancelled) setIdbReconciled(true)
    })
    return () => { cancelled = true }
  }, [articleId])

  // Keep the ref in sync when articleId changes.
  useEffect(() => {
    if (!articleId) {
      savedRef.current = null
      return
    }
    const record = readLocal(articleId)
    savedRef.current = record && record.pageIndex > 0 ? record.pageIndex : null
  }, [articleId])

  const persistPage = useCallback((pageIndex: number, pageLabel: string) => {
    if (!articleId) return
    const record: ProgressRecord = {
      pageIndex,
      pageLabel,
      savedAt: new Date().toISOString(),
    }
    // Write to both stores
    writeLocal(articleId, record)
    saveReadingPosition({
      articleId,
      pageIndex,
      pageLabel,
      savedAt: record.savedAt,
    }).catch(() => {})
  }, [articleId])

  const clearProgress = useCallback(() => {
    if (!articleId || typeof window === 'undefined') return
    localStorage.removeItem(storageKey(articleId))
    clearReadingPosition(articleId).catch(() => {})
    savedRef.current = null
  }, [articleId])

  return {
    get savedPageIndex() { return savedRef.current },
    persistPage,
    clearProgress,
  }
}
