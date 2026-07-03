-- Migration 017: Server-side sort for get_documents_feed_v1
--
-- PROBLEM: Sort control in DocumentsList.tsx only reorders the currently-fetched
-- keyset page (~30 items). Sorting by title/date/status/etc only works within
-- one page; paginating further breaks the sort.
--
-- FIX: Add p_sort_by / p_sort_dir parameters to the RPC, making ORDER BY dynamic
-- while preserving correct keyset cursor semantics via a compound cursor
-- (sort_val, id) tuple. The sort column is whitelisted via CASE — no SQL injection.
--
-- CURSOR FORMAT: compound text "sort_val|id" (pipe-delimited).
--   sort_val is the normalized sort-column value of the last row.
--   id is the uuid tiebreaker (ensures stable ordering for ties).
--
-- VALID p_sort_by values: 'title', 'created_at', 'updated_at', 'segment_count', 'status'
-- VALID p_sort_dir values: 'asc', 'desc'
--
-- DEFAULT: p_sort_by='created_at', p_sort_dir='desc' (same as before).

CREATE OR REPLACE FUNCTION get_documents_feed_v1(
  p_cursor_sort_val text DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limit int DEFAULT 30,
  p_sort_by text DEFAULT 'created_at',
  p_sort_dir text DEFAULT 'desc'
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

COMMENT ON FUNCTION get_documents_feed_v1(text, uuid, int, text, text) IS
  'Keyset-paginated documents feed with server-side sort. p_sort_by: title|created_at|updated_at|segment_count|status. p_sort_dir: asc|desc. Cursor: compound "sort_val|id". Default: created_at DESC.';
