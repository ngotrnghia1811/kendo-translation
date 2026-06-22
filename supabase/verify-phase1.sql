-- =============================================================================
-- Phase 1.2 Verification — EXPLAIN ANALYZE statements
-- =============================================================================
-- Run these in the Supabase SQL editor AFTER applying migration 010.
-- All should show index scans (not sequential scans).

-- ---------------------------------------------------------------------------
-- 1.2a: get_article_bilingual_v2 — should use idx_segments_article_position
-- ---------------------------------------------------------------------------
-- Replace '<ARTICLE_ID>' with an actual UUID from your database.

-- EXPLAIN ANALYZE
-- SELECT * FROM get_article_bilingual_v2('<ARTICLE_ID>', 'en');


-- ---------------------------------------------------------------------------
-- 1.2b: GIN trigram indexes — verify they exist and are valid
-- ---------------------------------------------------------------------------

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'segments'
  AND indexname IN ('idx_segments_source_trgm', 'idx_segments_target_trgm');

-- Verify pg_trgm extension is enabled
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'pg_trgm';


-- ---------------------------------------------------------------------------
-- 1.2c: search_segments — should use GIN trigram index scan, not seq scan
-- ---------------------------------------------------------------------------

-- EXPLAIN ANALYZE
-- SELECT * FROM search_segments('kote', 20);

-- Also verify the underlying query plan:
-- EXPLAIN ANALYZE
-- SELECT s.id, s.article_id, a.title, s.position,
--        left(s.source_text, 200) AS source_snippet,
--        left(s.target_text, 200) AS target_snippet,
--        s.status,
--        similarity(s.source_text, 'kote') AS rank
-- FROM segments s
-- JOIN articles a ON a.id = s.article_id
-- WHERE s.source_text % 'kote'
--    OR s.target_text % 'kote'
-- ORDER BY rank DESC, s.id
-- LIMIT 20;


-- ---------------------------------------------------------------------------
-- 1.2d: get_documents_feed_v1 — keyset pagination
-- ---------------------------------------------------------------------------
-- Should use idx_articles_created_at (created_at DESC).

-- EXPLAIN ANALYZE
-- SELECT * FROM get_documents_feed_v1(NULL, 30);

-- EXPLAIN ANALYZE
-- SELECT * FROM get_documents_feed_v1('2025-01-01T00:00:00Z'::timestamptz, 30);


-- ---------------------------------------------------------------------------
-- 1.2i: Verify role is synced to app_metadata
-- ---------------------------------------------------------------------------

-- Check that profiles have been synced:
-- SELECT p.id, p.role, u.raw_app_meta_data->>'role' AS app_meta_role
-- FROM public.profiles p
-- JOIN auth.users u ON u.id = p.id
-- WHERE p.role IS NOT NULL
-- LIMIT 20;
