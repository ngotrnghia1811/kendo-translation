/**
 * Shared cursor normalization for documents_feed (PocketBase edition).
 *
 * Mirrors lib/supabase/feed-cursor.ts. The custom PB hook route
 * (documents_feed.pb.js) uses a compound cursor "sort_val|id" with the
 * same semantics as the former Supabase RPC.
 *
 * See: migration/pocketbase/pb_hooks/documents_feed.pb.js
 */

export type SortBy = 'title' | 'segment_count' | 'status' | 'created_at'
export type SortDir = 'asc' | 'desc'

const VALID_SORT_BY: Set<string> = new Set(['title', 'segment_count', 'status', 'created_at'])
const VALID_SORT_DIR: Set<string> = new Set(['asc', 'desc'])

export function sanitizeSortBy(raw: string | null): SortBy {
  if (raw && VALID_SORT_BY.has(raw)) return raw as SortBy
  return 'title'
}

export function sanitizeSortDir(raw: string | null): SortDir {
  if (raw && VALID_SORT_DIR.has(raw)) return raw as SortDir
  return 'desc'
}

/**
 * Normalize a row's sort-column value to match the PB hook's normalization.
 * Used for constructing the next_cursor compound string.
 */
export function normalizeSortVal(row: Record<string, unknown>, sortBy: SortBy): string {
  switch (sortBy) {
    case 'title':
      return String(row['title'] ?? '')
    case 'segment_count':
      return String(row['segment_count'] ?? 0).padStart(10, '0')
    case 'status': {
      const s = String(row['translation_status'] ?? 'pending')
      const ordinals: Record<string, string> = {
        pending: '0',
        in_progress: '1',
        translated: '2',
        complete: '3',
        qa_approved: '4',
      }
      return ordinals[s] ?? '0'
    }
    case 'created_at': {
      return String(row['created_at'] ?? row['created'] ?? '')
    }
  }
}

/**
 * Build a compound cursor string "sort_val|id" for the next page.
 */
export function buildCursor(row: Record<string, unknown>, sortBy: SortBy): string {
  return `${normalizeSortVal(row, sortBy)}|${String(row['id'])}`
}

/**
 * Parse a compound cursor string into its components.
 * Returns null if the cursor is null/empty.
 */
export function parseCursor(raw: string | null): { sortVal: string; id: string } | null {
  if (!raw) return null
  const pipeIdx = raw.lastIndexOf('|')
  if (pipeIdx === -1) {
    // Legacy cursor: plain timestamp (assume created_at DESC)
    return { sortVal: raw, id: '' }
  }
  return {
    sortVal: raw.slice(0, pipeIdx),
    id: raw.slice(pipeIdx + 1),
  }
}
