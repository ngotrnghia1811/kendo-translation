/**
 * fetchAllSegments — PocketBase edition.
 *
 * Mirrors lib/supabase/fetch-all-segments.ts. PocketBase's `getFullList()`
 * handles automatic pagination with its default `batch` size, returning
 * all matching records in a single call — no manual pagination loop needed.
 *
 * Usage (server component / server action):
 *   const segments = await fetchAllSegments(pb, articleId, 'en')
 *
 * Usage (client component with createClient()):
 *   const pb = createClient()
 *   const segments = await fetchAllSegments(pb, articleId, targetLang)
 */

import type PocketBase from 'pocketbase'

export async function fetchAllSegments<T = Record<string, unknown>>(
  pb: PocketBase,
  articleId: string,
  targetLang: string,
  selectCols = '*',
): Promise<T[]> {
  const records = await pb.collection('segments').getFullList<T>({
    filter: `article_id = "${articleId}" && target_lang = "${targetLang}"`,
    sort: '+position',
    fields: selectCols === '*' ? undefined : selectCols,
  })

  return records
}

/**
 * Legacy-compatible export that accepts a PocketBase instance but still
 * uses the same parameter order as the Supabase version.
 *
 * @deprecated Since Phase PocketBase migration. For new code, consider
 *   using `pb.collection('segments').getFullList()` directly.
 */
export { fetchAllSegments as default }
