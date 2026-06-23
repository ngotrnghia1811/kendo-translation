-- Migration 010: Phase 1.2 Data-Layer Foundation
-- RPCs, GIN trigram indexes, keyset pagination, role-to-JWT sync
--
-- Tasks: 1.2a (get_article_bilingual_v2), 1.2b (GIN trigram indexes),
-- 1.2c (search_segments), 1.2d (get_documents_feed_v1), 1.2i (role JWT sync)
--
-- EXISTING INDEXES (REUSED — do NOT recreate):
--   idx_segments_article_position ON (article_id, position)       — 000:292
--   UNIQUE segments_article_id_position_target_lang_key          — 007:13
--   idx_segments_article_id ON (article_id)                      — 000:291
--   idx_segments_status ON (status)                              — 000:294
--   idx_segments_target_lang ON (target_lang)                    — 009:27

-- =============================================================================
-- 1.2b: Enable pg_trgm extension and create GIN trigram indexes
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on source_text (JP) — supports search_segments RPC (1.2c)
CREATE INDEX IF NOT EXISTS idx_segments_source_trgm
  ON public.segments USING gin (source_text gin_trgm_ops);

-- GIN trigram index on target_text (EN/ZH) — supports search_segments RPC (1.2c)
CREATE INDEX IF NOT EXISTS idx_segments_target_trgm
  ON public.segments USING gin (target_text gin_trgm_ops);


-- =============================================================================
-- 1.2a: get_article_bilingual_v2 — single-table bilingual segment fetch
-- =============================================================================
-- Replaces the client-side fetchAllSegments() multi-pagination pattern.
-- One target_lang per call.  For EN+ZH, make two calls (parallel).
-- Reuses existing idx_segments_article_position for ORDER BY position.

CREATE OR REPLACE FUNCTION get_article_bilingual_v2(
  p_article_id uuid,
  p_target_lang text DEFAULT 'en'
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
  ORDER BY s.position ASC;
$$;


-- =============================================================================
-- 1.2c: search_segments — GIN trigram full-text search
-- =============================================================================
-- Replaces PostgREST .ilike('%term%') full-table scans.
-- Uses pg_trgm % operator for trigram similarity matching.
-- Searches both source_text and target_text against the single segments table.

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
  SELECT DISTINCT ON (rank, s.id)
    s.id,
    s.article_id,
    a.title AS article_title,
    s.position,
    left(s.source_text, 200) AS source_snippet,
    left(s.target_text, 200) AS target_snippet,
    s.status,
    GREATEST(
      similarity(s.source_text, p_query),
      similarity(s.target_text, p_query)
    ) AS rank
  FROM segments s
  JOIN articles a ON a.id = s.article_id
  WHERE s.source_text % p_query
     OR s.target_text % p_query
  ORDER BY rank DESC, s.id
  LIMIT p_limit;
$$;


-- =============================================================================
-- 1.2d: get_documents_feed_v1 — keyset-paginated documents list
-- =============================================================================
-- Replaces unbounded .select() on articles (was loading all ~900 rows).
-- Stable ordering: created_at DESC, id DESC (tiebreaker).
-- Caller computes next_cursor from last row's created_at.

CREATE OR REPLACE FUNCTION get_documents_feed_v1(
  p_cursor timestamptz DEFAULT NULL,
  p_limit int DEFAULT 30
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
  SELECT
    a.id,
    a.title,
    a.translation_status,
    a.segment_count,
    a.created_at
  FROM articles a
  WHERE a.segmented = true
    AND (p_cursor IS NULL OR a.created_at < p_cursor)
  ORDER BY a.created_at DESC, a.id DESC
  LIMIT p_limit;
$$;


-- =============================================================================
-- 1.2i: Sync profiles.role → auth.users.app_metadata (JWT claim)
-- =============================================================================
-- Eliminates per-request profiles table queries in middleware/proxy.ts.
-- After this migration, user.app_metadata.role contains the user's role.
-- Read via: const role = user?.app_metadata?.role (from supabase.auth.getUser()).
--
-- PURELY CODE-BASED (no Supabase dashboard Auth Hook config required).
--   - Trigger fires on INSERT/UPDATE of role on profiles.
--   - SECURITY DEFINER function runs as migration owner (supabase_admin),
--     granting access to auth.users.
--   - Initial backfill syncs all existing profiles.

CREATE OR REPLACE FUNCTION sync_profile_role_to_app_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Backfill existing profiles: sync role into auth.users.app_metadata
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT p.id, p.role
    FROM public.profiles p
    WHERE p.role IS NOT NULL
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', rec.role)
    WHERE id = rec.id;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_role_trigger ON public.profiles;

CREATE TRIGGER sync_profile_role_trigger
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role IS NOT NULL)
  EXECUTE FUNCTION sync_profile_role_to_app_metadata();
