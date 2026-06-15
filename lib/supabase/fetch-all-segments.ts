/**
 * fetchAllSegments — paginate past PostgREST's default 1,000-row cap.
 *
 * Supabase/PostgREST returns at most 1,000 rows per request by default.
 * Books can have 23,000+ segments, so a single .select() misses most of them.
 *
 * This helper fetches pages of PAGE_SIZE until no more rows are returned,
 * concatenates them, and returns the full ordered array.
 *
 * Usage (server component / server action):
 *   const segments = await fetchAllSegments(supabase, articleId, 'en')
 *
 * Usage (client component with createClient()):
 *   const supabase = createClient()
 *   const segments = await fetchAllSegments(supabase, articleId, targetLang)
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const PAGE_SIZE = 1000

export async function fetchAllSegments<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  articleId: string,
  targetLang: string,
  selectCols = '*',
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  let done = false

  while (!done) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from('segments')
      .select(selectCols)
      .eq('article_id', articleId)
      .eq('target_lang', targetLang)
      .order('position', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) { done = true; break }
    all.push(...(data as T[]))
    if (data.length < PAGE_SIZE) { done = true } else { from += PAGE_SIZE }
  }

  return all
}
