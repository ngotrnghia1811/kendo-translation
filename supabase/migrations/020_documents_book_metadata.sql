-- Migration 020: Book metadata — doc_type, author, summary + feed RPC extension
--
-- Part 1: Tag each document as BOOK or ARTICLE.
-- Part 2: Add author column for book-level metadata.
-- Part 3: Add summary column for books.
--
-- Classification: segment_count >= 500 → 'book', else 'article'.
-- This threshold is based on data-driven audit:
--   - 33 docs have segment_count >= 500 (clear gap between ~500-1000)
--   - These include Kendojidai year compilations (6k-29k segs) and
--     topic compilations named "Full"/"Clean"/"Lecture" (1.5k-6.6k segs)
--   - 640 docs have segment_count < 500, all individual kendo articles
--   - Zero source_url present in the corpus (no URL-based signal available)

-- ── Table columns ──────────────────────────────────────────────────────────────

ALTER TABLE public.articles
  ADD COLUMN doc_type text NOT NULL DEFAULT 'article'
    CHECK (doc_type IN ('book', 'article'));

ALTER TABLE public.articles
  ADD COLUMN author text;

ALTER TABLE public.articles
  ADD COLUMN summary text;

COMMENT ON COLUMN public.articles.doc_type IS 'Document type: book (compilation/long-form) or article (single piece). Segment_count >= 500 is book.';
COMMENT ON COLUMN public.articles.author IS 'Author name(s) for books. Null for articles.';
COMMENT ON COLUMN public.articles.summary IS 'Concise summary paragraph for books. Null for articles.';

-- ── Feed RPC: add doc_type, author, summary to return columns ──────────────────

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
  title_ja text,
  translation_status text,
  segment_count int,
  created_at timestamptz,
  doc_type text,
  author text,
  summary text
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  WITH normalized AS (
    SELECT
      a.id,
      a.title,
      a.title_ja,
      a.translation_status,
      a.segment_count,
      a.created_at,
      a.doc_type,
      a.author,
      a.summary,
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
  SELECT id, title, title_ja, translation_status, segment_count, created_at, doc_type, author, summary
  FROM normalized
  WHERE p_cursor_sort_val IS NULL
     OR (
       CASE p_sort_dir
         WHEN 'asc'  THEN (sort_val > p_cursor_sort_val) OR (sort_val = p_cursor_sort_val AND id::text > p_cursor_id::text)
         WHEN 'desc' THEN (sort_val < p_cursor_sort_val) OR (sort_val = p_cursor_sort_val AND id::text < p_cursor_id::text)
         ELSE TRUE
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
  'Keyset-paginated documents feed with server-side sort and optional title search. Returns doc_type, author, summary for book classification and expand UI. p_sort_by: title|created_at|updated_at|segment_count|status. p_sort_dir: asc|desc. p_search_term: NULL (no filter) or ILIKE substring on title. Cursor: compound "sort_val|id". Default: created_at DESC.';
