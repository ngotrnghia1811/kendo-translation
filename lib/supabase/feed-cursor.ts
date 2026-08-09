/**
 * Shared cursor normalization for get_documents_feed_v1.
 *
 * The RPC uses a compound cursor "sort_val|id" where sort_val is the
 * normalized sort-column value from the last row, and id is a uuid tiebreaker.
 * The normalization must match exactly the RPC's CTE logic.
 *
 * See: supabase/migrations/017_documents_feed_sort.sql
 */

export type SortBy = 'title' | 'segment_count' | 'status'
export type SortDir = 'asc' | 'desc'

const VALID_SORT_BY: Set<string> = new Set(['title', 'segment_count', 'status'])
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
 * Normalize a row's sort-column value to match the RPC's CTE normalization.
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
    default:
      return String(row['title'] ?? '')
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
