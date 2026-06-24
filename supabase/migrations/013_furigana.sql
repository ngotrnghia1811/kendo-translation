-- Migration 013: Furigana ruby data storage
-- Phase 5.4 — adds a ruby_data JSONB column to the segments table so the
-- precompute pipeline can store per-segment furigana annotations without
-- joining a side table on every reader render.
--
-- Design rationale (co-located JSONB column over side table):
--   1. Reader renders one segment row at a time — extra JOIN per row
--      on a 29k-segment book adds measurable page-fetch latency.
--   2. ruby_data is write-once, read-many (immutable after precompute).
--   3. JSONB is indexable if we later need to query by JLPT presence, but
--      the initial use case doesn't require indexing (annotation is
--      consumed directly by the reader's RubyText component).
--   4. A dedicated column keeps concerns separate from the general-purpose
--      `metadata jsonb` column (which already holds page, kind, etc.).
--
-- The column is nullable — segments without ruby data render plain text
-- (graceful degradation in the UI).

ALTER TABLE segments
  ADD COLUMN IF NOT EXISTS ruby_data jsonb;

-- Optional GIN index for future queries (e.g., "show me segments that have
-- furigana annotations" or "filter by JLPT level presence").
-- Commented out until needed; uncomment if query performance requires it.
-- CREATE INDEX IF NOT EXISTS idx_segments_ruby_data
--   ON segments USING gin (ruby_data);

COMMENT ON COLUMN segments.ruby_data IS
  'Precomputed furigana annotation for this segment source_text. Shape: {"source_text": "...", "spans": [{"type":"kanji","base":"…","reading":"…","jlptLevel":"N3"},{"type":"text","text":"…"}]}. Null for segments not yet annotated.';

-- ---------------------------------------------------------------------------
-- Update reader window-fetch function to include ruby_data
-- ---------------------------------------------------------------------------
-- Migration 012's get_article_bilingual_window explicitly lists columns
-- and therefore won't return the new ruby_data column. We must update it
-- so the reader can access precomputed annotations.

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
  ruby_data jsonb,
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
    s.ruby_data,
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
