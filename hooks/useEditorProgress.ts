/**
 * useEditorProgress — persist and restore the last-active segment per document.
 *
 * Storage key format:  editor-progress:{docId}
 * Stored value:        JSON { segmentId: string, savedAt: ISO string }
 *
 * Usage in the editor:
 *   const { savedSegmentId, persistSegment, clearProgress } = useEditorProgress(docId)
 *
 *   - `savedSegmentId`  – the segment the user was last editing (null if none)
 *   - `persistSegment`  – call whenever the active segment changes
 *   - `clearProgress`   – call on explicit "start fresh" action (optional)
 */

import { useRef } from 'react'

const STORAGE_PREFIX = 'editor-progress'

interface ProgressRecord {
    segmentId: string
    savedAt: string
}

function storageKey(docId: string): string {
    return `${STORAGE_PREFIX}:${docId}`
}

function readRecord(docId: string): ProgressRecord | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(storageKey(docId))
        if (!raw) return null
        return JSON.parse(raw) as ProgressRecord
    } catch {
        return null
    }
}

function writeRecord(docId: string, record: ProgressRecord): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(storageKey(docId), JSON.stringify(record))
    } catch { /* storage full or private mode */ }
}

export function useEditorProgress(docId: string) {
    // Read synchronously so the value is available before the first render
    const savedRef = useRef<string | null>(readRecord(docId)?.segmentId ?? null)

    const persistSegment = (segmentId: string) => {
        savedRef.current = segmentId
        writeRecord(docId, { segmentId, savedAt: new Date().toISOString() })
    }

    const clearProgress = () => {
        savedRef.current = null
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(storageKey(docId))
        }
    }

    return {
        savedSegmentId: savedRef.current,
        persistSegment,
        clearProgress,
    }
}
