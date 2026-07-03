-- Migration 018: Add server-side search to get_documents_feed_v1
--
-- PROBLEM: The search input in DocumentsList.tsx only filters the currently-loaded
-- keyset page (~30 items) via client-side useMemo. Searching for a document title
-- not on the current page returns no results even though it exists.
--
-- FIX: Add p_search_term parameter to get_documents_feed_v1. When non-NULL,
-- filter articles by ILIKE on title BEFORE cursor and LIMIT are applied.
-- When NULL (default), behavior is unchanged (no filter).
--
-- The search is prefix-neutral (substring match via ILIKE '%term%') and uses
-- the existing btree indexes on articles (the planner can use a Seq Scan since
-- we filter by segmented=true first, ~900 rows — fast enough without a GIN index).
-- For a GIN trigram index on articles.title, run:
--   CREATE INDEX IF NOT EXISTS idx_articles_title_trgm ON articles USING gin (title gin_trgm_ops);
-- But ILIKE on ~900 rows is sub-10ms, so the btree/seq scan is fine.
--
-- CURSOR WITH SEARCH: The cursor continues to work correctly. When searching,
-- the cursor points within the filtered result set; next page uses the same
-- p_search_term value per the API layer contract. Switching search terms
-- resets the cursor (no cursor passed) → fresh page 1.
--
-- DEFAULT: p_search_term=NULL (no filter — same as before)
-- ILIKE BINDING: '%' || p_search_term || '%' (substring match, case-insensitive)

CREATE OR REPLACE FUNCTION get_documents_feed_v1(
  p_cursor_sort_val text DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limit int DEFAULT 30,
  p_sort_by text DEFAULT 'created_at',
  p_sort_dir text DEFAULT 'desc',
  p_search_term text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  translation_status text,
  segment_count int,
  created_at timestamptz
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  -- Normalize each row's sort value to a text string that sorts correctly
  -- under bytewise (C-locale) comparison. The API layer must replicate this
  -- normalization when constructing the next_cursor.
  WITH normalized AS (
    SELECT
      a.id,
      a.title,
      a.translation_status,
      a.segment_count,
      a.created_at,
      CASE
        WHEN p_sort_by = 'title'        THEN a.title
        WHEN p_sort_by = 'created_at'   THEN a.created_at::text
        WHEN p_sort_by = 'updated_at'   THEN COALESCE(a.updated_at, '1970-01-01 00:00:00+00'::timestamptz)::text
        WHEN p_sort_by = 'segment_count' THEN LPAD(COALESCE(a.segment_count, 0)::text, 10, '0')
        WHEN p_sort_by = 'status'       THEN
          CASE a.translation_status
            WHEN 'pending'      THEN '0'
            WHEN 'in_progress'  THEN '1'
            WHEN 'translated'   THEN '2'
            WHEN 'complete'     THEN '3'
            WHEN 'qa_approved'  THEN '4'
            ELSE '0'
          END
        ELSE a.created_at::text
      END AS sort_val
    FROM articles a
    WHERE a.segmented = true
      AND (p_search_term IS NULL OR a.title ILIKE '%' || p_search_term || '%')
  )
  SELECT id, title, translation_status, segment_count, created_at
  FROM normalized
  WHERE p_cursor_sort_val IS NULL
     OR (
       CASE p_sort_dir
         WHEN 'asc'  THEN (sort_val > p_cursor_sort_val) OR (sort_val = p_cursor_sort_val AND id::text > p_cursor_id::text)
         WHEN 'desc' THEN (sort_val < p_cursor_sort_val) OR (sort_val = p_cursor_sort_val AND id::text < p_cursor_id::text)
         ELSE TRUE  -- invalid sort_dir → no cursor filter (safety)
       END
     )
  ORDER BY
    CASE WHEN p_sort_dir = 'asc'  THEN sort_val END ASC  NULLS LAST,
    CASE WHEN p_sort_dir = 'desc' THEN sort_val END DESC NULLS LAST,
    CASE WHEN p_sort_dir = 'asc'  THEN id::text END ASC,
    CASE WHEN p_sort_dir = 'desc' THEN id::text END DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION get_documents_feed_v1(text, uuid, int, text, text, text) IS
  'Keyset-paginated documents feed with server-side sort and optional title search. p_sort_by: title|created_at|updated_at|segment_count|status. p_sort_dir: asc|desc. p_search_term: NULL (no filter) or ILIKE substring on title. Cursor: compound "sort_val|id". Default: created_at DESC.';
