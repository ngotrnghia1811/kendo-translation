'use client'

/**
 * PWA IndexedDB storage (Phase 5.2)
 *
 * Provides:
 *   1. Reading-position persistence (supersedes localStorage in useReaderProgress)
 *   2. Offline-article registry — which articles are cached and when last accessed
 *
 * All operations are async (IndexedDB is always async). The module is
 * designed as a singleton — call `getPwaDB()` to obtain a handle, then
 * use the returned methods.
 *
 * Store layout (DB "kendo-pwa", version 1):
 *   readingPosition  { articleId: string, pageIndex: number, pageLabel: string, savedAt: string }
 *   offlineArticles  { articleId: string, url: string, title: string, lastAccess: number }
 *   bookmarks        { articleId: string, bookmarks: ReaderBookmark[] }
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReadingPosition {
  articleId: string
  pageIndex: number
  pageLabel: string
  savedAt: string
}

export interface OfflineArticleRecord {
  articleId: string
  url: string
  title: string
  lastAccess: number
}

export interface ReaderBookmark {
  pageIndex: number
  pageLabel: string
  note?: string
  createdAt: string
}

export interface ArticleBookmarks {
  articleId: string
  bookmarks: ReaderBookmark[]
}

// ---------------------------------------------------------------------------
// DB singleton
// ---------------------------------------------------------------------------

const DB_NAME = 'kendo-pwa'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('readingPosition')) {
        db.createObjectStore('readingPosition', { keyPath: 'articleId' })
      }
      if (!db.objectStoreNames.contains('offlineArticles')) {
        db.createObjectStore('offlineArticles', { keyPath: 'articleId' })
      }
      if (!db.objectStoreNames.contains('bookmarks')) {
        db.createObjectStore('bookmarks', { keyPath: 'articleId' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })

  return dbPromise
}

function storePut(storeName: string, value: unknown): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.put(value)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      } catch (err) {
        // DB connection may have been closed (e.g. private browsing)
        reject(err)
      }
    })
  })
}

function storeGet<T>(storeName: string, key: string): Promise<T | undefined> {
  return openDB().then((db) => {
    return new Promise<T | undefined>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const req = store.get(key)
        req.onsuccess = () => resolve(req.result as T | undefined)
        req.onerror = () => reject(req.error)
      } catch (err) {
        reject(err)
      }
    })
  })
}

function storeDelete(storeName: string, key: string): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.delete(key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      } catch (err) {
        reject(err)
      }
    })
  })
}

// ---------------------------------------------------------------------------
// Public API — Reading Position
// ---------------------------------------------------------------------------

export async function saveReadingPosition(pos: ReadingPosition): Promise<void> {
  try {
    await storePut('readingPosition', pos)
    // Also write to localStorage for fast synchronous read on next mount
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`reader-progress:${pos.articleId}`, JSON.stringify({
        pageIndex: pos.pageIndex,
        pageLabel: pos.pageLabel,
        savedAt: pos.savedAt,
      }))
    }
  } catch {
    // Silently fail — reading position is best-effort
  }
}

export async function loadReadingPosition(
  articleId: string,
): Promise<ReadingPosition | undefined> {
  try {
    return await storeGet<ReadingPosition>('readingPosition', articleId)
  } catch {
    return undefined
  }
}

export async function clearReadingPosition(articleId: string): Promise<void> {
  try {
    await storeDelete('readingPosition', articleId)
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`reader-progress:${articleId}`)
    }
  } catch {
    // Best-effort
  }
}

// ---------------------------------------------------------------------------
// Public API — Offline Articles
// ---------------------------------------------------------------------------

export async function recordArticleAccess(
  articleId: string,
  url: string,
  title: string,
): Promise<void> {
  try {
    await storePut('offlineArticles', {
      articleId,
      url,
      title,
      lastAccess: Date.now(),
    })
  } catch {
    // Best-effort
  }
}

export async function getOfflineArticles(): Promise<OfflineArticleRecord[]> {
  try {
    const db = await openDB()
    return new Promise<OfflineArticleRecord[]>((resolve, reject) => {
      try {
        const tx = db.transaction('offlineArticles', 'readonly')
        const store = tx.objectStore('offlineArticles')
        const req = store.getAll()
        req.onsuccess = () => {
          const records = (req.result as OfflineArticleRecord[]).sort(
            (a, b) => b.lastAccess - a.lastAccess,
          )
          resolve(records)
        }
        req.onerror = () => reject(req.error)
      } catch (err) {
        reject(err)
      }
    })
  } catch {
    return []
  }
}

export async function isArticleOffline(articleId: string): Promise<boolean> {
  try {
    const record = await storeGet<OfflineArticleRecord>('offlineArticles', articleId)
    return !!record
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Public API — Bookmarks (migrated from localStorage)
// ---------------------------------------------------------------------------

export async function saveBookmarks(
  articleId: string,
  bookmarks: ReaderBookmark[],
): Promise<void> {
  try {
    await storePut('bookmarks', { articleId, bookmarks })
    // Mirror to localStorage for backward compatibility
    if (typeof localStorage !== 'undefined') {
      const allRaw = localStorage.getItem('reader-bookmarks')
      const all: Record<string, ReaderBookmark[]> = allRaw ? JSON.parse(allRaw) : {}
      all[articleId] = bookmarks
      localStorage.setItem('reader-bookmarks', JSON.stringify(all))
    }
  } catch {
    // Best-effort
  }
}

export async function loadBookmarks(
  articleId: string,
): Promise<ReaderBookmark[]> {
  try {
    const record = await storeGet<ArticleBookmarks>('bookmarks', articleId)
    return record?.bookmarks ?? []
  } catch {
    return []
  }
}

export async function loadAllBookmarks(): Promise<Record<string, ReaderBookmark[]>> {
  try {
    const db = await openDB()
    return new Promise<Record<string, ReaderBookmark[]>>((resolve, reject) => {
      try {
        const tx = db.transaction('bookmarks', 'readonly')
        const store = tx.objectStore('bookmarks')
        const req = store.getAll()
        req.onsuccess = () => {
          const records = req.result as ArticleBookmarks[]
          const map: Record<string, ReaderBookmark[]> = {}
          for (const r of records) {
            map[r.articleId] = r.bookmarks
          }
          resolve(map)
        }
        req.onerror = () => reject(req.error)
      } catch (err) {
        reject(err)
      }
    })
  } catch {
    return {}
  }
}
