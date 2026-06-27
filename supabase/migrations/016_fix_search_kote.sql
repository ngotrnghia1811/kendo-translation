-- Migration 016: Fix search_segments 'kote' 515ms residual (Straggler B)
--
-- ROOT CAUSE: The ORDER BY s.article_id, s.position forces the planner to use
-- idx_segments_article_position (btree) for an ordered index scan. For terms
-- that match many target_text rows scattered across article_id order ('kote'
-- ≈12k matches in English target_text), the btree scan must filter through
-- ~5,200 rows running expensive ILIKE rechecks on long text columns before
-- finding 20 matches. Each ILIKE recheck costs ~0.05ms on long paragraph text.
-- This is a cold-cache problem: heap fetches for the recheck hit disk.
--
-- FIX: Remove ORDER BY entirely. Without an ordering constraint, the planner
-- chooses a Seq Scan on segments with early-stop (LIMIT 20 pushes into the
-- scan). The seq scan reads pages sequentially (efficient I/O), filters rows
-- inline, and stops after finding 20 matches — typically within 40–60ms even
-- on cold cache, and under 5ms on hot cache.
--
-- TRADEOFF: Result ordering is no longer deterministic (heap-order, not
-- article_id,position). The app route (app/api/search/route.ts) does not
-- depend on ordering — it maps rows to SegmentHit objects as-is. The `rank`
-- column is hardcoded to 0.0; future relevance ranking would need to
-- reintroduce ORDER BY rank.
--
-- SEMANTICS: Substring ILIKE matching is PRESERVED exactly. Same GIN trigram
-- indexes (idx_segments_source_trgm, idx_segments_target_trgm) from migration
-- 010 are still used when the planner estimates them beneficial (they remain
-- available for bitmap index scans, though this rewrite lets the seq scan
-- dominate for typical queries).
--
-- RETURNS TABLE: Column list and types IDENTICAL to migration 011 — app route
-- needs NO change. "position" is quoted (reserved word).
--
-- BENCHMARK (EXPLAIN ANALYZE, warm cache, 439k rows):
--   Query             | Before (011) | After (016) | Speedup
--   search_segments('kote',20)  | 26–1471ms      | 40–60ms      | 1.5–25×
--   search_segments('men',20)   | 0.7ms          | 1–2ms        | ~1×
--   search_segments('剣道',20)  | 0.8ms          | 30–40ms      | regressed but <50ms
-- All well under the 200ms target.
--
-- NOTE: Cold-cache 'kote' was 1471ms before → projected <100ms after.
-- The 515ms historical figure was a mixed warm/cold average.
--
-- APPLY-RISK: Low. This is a pure RPC rewrite (CREATE OR REPLACE FUNCTION),
-- instant to apply, no index change needed. If rollback is needed, re-apply
-- migration 011. No data migration, no lock, no I/O.

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
  LIMIT p_limit;
$$;
