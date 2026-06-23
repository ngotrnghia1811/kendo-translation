-- Migration 011: Fix search_segments performance regression
-- Replaces pg_trgm similarity(%) operator with ILIKE substring matching.
-- Before: similarity() over ~50k candidate rows → 11,348ms
-- After:  ILIKE with GIN trigram index → <200ms target (see benchmark notes)
--
-- The existing GIN trigram indexes (idx_segments_source_trgm / idx_segments_target_trgm)
-- from 010 already support ILIKE/LIKE substring matching — they are REUSED here.
-- No index changes needed.
--
-- Root cause: similarity() is O(text_length) per candidate row and does a full
-- trigram-vector comparison. ILIKE recheck is a simple substring scan (much cheaper),
-- and the trigram index narrows candidates to rows whose trigrams intersect the pattern.
--
-- Plan choice: ORDER BY s.article_id, s.position allows the planner to use
-- idx_segments_article_position (btree) for ordered scan + Merge Join with articles.
-- The LIMIT pushes into the Index Scan, allowing early stop after finding 50 matches.
-- For sparse terms ('men', '剣道'), this is ~2ms. For common terms matching many
-- segments ('kote' ≈ 12k matches), the Index Scan must touch ~5.5k rows before
-- finding 50 matches (648ms) because matches are spread across article_id order.
-- This is a 17.5x improvement over the 11,348ms baseline; the 200ms target is
-- not met for high-frequency terms but is met/exceeded for typical queries.
--
-- Changes from 010 version:
--   1. WHERE clause: similarity % operator → ILIKE substring match
--   2. ORDER BY:   similarity() DESC → article_id, position (cheap, deterministic)
--   3. Removed DISTINCT ON (not needed with ILIKE OR — rows don't duplicate)
--   4. rank column kept in RETURNS TABLE for backward compatibility (set to 0.0)
--   5. Explicit NULL guard on target_text for planner clarity

CREATE OR REPLACE FUNCTION search_segments(
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  article_id uuid,
  article_title text,
  "position" int,
  source_snippet text,
  target_snippet text,
  status text,
  rank real
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT
    s.id,
    s.article_id,
    a.title AS article_title,
    s.position,
    left(s.source_text, 200) AS source_snippet,
    left(s.target_text, 200) AS target_snippet,
    s.status,
    0.0::real AS rank
  FROM segments s
  JOIN articles a ON a.id = s.article_id
  WHERE s.source_text ILIKE '%' || p_query || '%'
     OR (s.target_text IS NOT NULL AND s.target_text ILIKE '%' || p_query || '%')
  ORDER BY s.article_id, s.position
  LIMIT p_limit;
$$;
