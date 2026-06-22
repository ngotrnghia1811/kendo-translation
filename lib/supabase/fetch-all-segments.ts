/**
 * @deprecated Since Phase 1.2 (2026-06-22).  For new code, use the server-side
 *   RPC function `get_article_bilingual_v2(article_id, target_lang)` instead.
 *   It returns all segments for one target language in a single round-trip
 *   without client-side pagination concatenation.
 *
 *   Migration: supabase/migrations/010_phase1_data_layer.sql
 *
 *   Usage (replacement):
 *     const { data } = await supabase.rpc('get_article_bilingual_v2', {
 *       p_article_id: articleId,
 *       p_target_lang: 'en',
 *     });
 *
 * Legacy callers (update when in scope):
 *   - app/documents/[id]/edit/page.tsx:178         (editor segment load)
 *   - app/api/documents/[id]/segments/route.ts:17  (segments API endpoint)
 *
 * This shim is preserved so those callers don't break.  When they are migrated,
 * this file can be deleted.
 *
 * --- Original documentation below ---
 *
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
