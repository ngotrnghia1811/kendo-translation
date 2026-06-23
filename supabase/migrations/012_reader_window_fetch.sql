-- Migration 012: Windowed segment fetch for on-demand reader paging
-- Phase 2 LCP gap closure — critical-path page 1 only, defer the rest.
--
-- Adds:
--   1. get_article_bilingual_window — windowed variant of v2 with OFFSET/LIMIT
--      and optional metadata.page filtering
--   2. get_article_page_info — lightweight metadata for client pager
--
-- Reuses existing:
--   idx_segments_article_position ON (article_id, position)  — 000:292
--   UNIQUE segments_article_id_position_target_lang_key       — 007:13
--   idx_segments_article_id ON (article_id)                   — 000:291
--
-- "position" is a reserved word — quoted in RETURNS TABLE columns.

-- =============================================================================
-- get_article_bilingual_window — paginated bilingual segment fetch
-- =============================================================================
-- Two modes:
--   a) p_page IS NULL  → OFFSET/LIMIT over position-ordered rows (fallback docs)
--   b) p_page IS SET   → filter by metadata->>'page' (source-book page docs)
-- When using p_page, p_offset/p_limit are ignored.
-- Same column shape as get_article_bilingual_v2 so callers can switch.

CREATE OR REPLACE FUNCTION get_article_bilingual_window(
  p_article_id uuid,
  p_target_lang text DEFAULT 'en',
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 50,
  p_page int DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  article_id uuid,
  "position" int,
  source_text text,
  target_text text,
  source_lang text,
  target_lang text,
  status text,
  locked_by uuid,
  locked_at timestamptz,
  translated_by uuid,
  reviewed_by uuid,
  quality_detail jsonb,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT
    s.id,
    s.article_id,
    s.position,
    s.source_text,
    s.target_text,
    s.source_lang,
    s.target_lang,
    s.status,
    s.locked_by,
    s.locked_at,
    s.translated_by,
    s.reviewed_by,
    s.quality_detail,
    s.metadata,
    s.created_at,
    s.updated_at
  FROM segments s
  WHERE s.article_id = p_article_id
    AND s.target_lang = p_target_lang
    AND CASE
      WHEN p_page IS NOT NULL THEN (s.metadata->>'page')::int = p_page
      ELSE true
    END
  ORDER BY s.position ASC
  LIMIT CASE WHEN p_page IS NULL THEN p_limit ELSE NULL END
  OFFSET CASE WHEN p_page IS NULL THEN p_offset ELSE NULL END;
$$;

-- =============================================================================
-- get_article_page_info — lightweight pager metadata
-- =============================================================================
-- Returns the info needed to drive the reader pager without fetching all
-- segments: total readable count, whether source-book page metadata exists,
-- and the sorted list of distinct page numbers (when applicable).
--
-- p_publish_filter mirrors the JS publish_filter logic:
--   'qa_approved'      → only qa_approved
--   'any_translated'   → qa_approved OR target_text IS NOT NULL

CREATE OR REPLACE FUNCTION get_article_page_info(
  p_article_id uuid,
  p_target_lang text DEFAULT 'en',
  p_publish_filter text DEFAULT 'any_translated'
)
RETURNS TABLE(
  total_count bigint,
  has_page_metadata boolean,
  distinct_pages int[]
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  WITH filtered AS (
    SELECT s.metadata
    FROM segments s
    WHERE s.article_id = p_article_id
      AND s.target_lang = p_target_lang
      AND (
        p_publish_filter = 'qa_approved'
          AND s.status = 'qa_approved'
        OR p_publish_filter <> 'qa_approved'
          AND (s.status = 'qa_approved' OR s.target_text IS NOT NULL)
      )
  ),
  page_check AS (
    SELECT EXISTS (
      SELECT 1 FROM filtered WHERE metadata->>'page' IS NOT NULL LIMIT 1
    ) AS has_pages
  ),
  page_list AS (
    SELECT array_agg(pn ORDER BY pn) AS pages
    FROM (
      SELECT DISTINCT (metadata->>'page')::int AS pn
      FROM filtered
      WHERE metadata->>'page' IS NOT NULL
    ) sub
  )
  SELECT
    (SELECT count(*)::bigint FROM filtered) AS total_count,
    (SELECT has_pages FROM page_check) AS has_page_metadata,
    (SELECT pages FROM page_list) AS distinct_pages
$$;
