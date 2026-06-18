-- Migration 009: IO optimization indexes
--
-- Supabase Free tier reported Disk IO budget exhaustion (2026-06-18).
-- Root cause analysis identified missing indexes on time-range queries
-- in the analytics endpoint and on common segment filter patterns.
--
-- These indexes are safe to add concurrently in production (use CREATE INDEX
-- IF NOT EXISTS — idempotent). No data changes; no downtime.

-- segment_revisions: analytics top-translators query uses .gte('created_at', 90-days-ago)
-- No index existed on created_at — was doing full table scan.
CREATE INDEX IF NOT EXISTS idx_segment_revisions_created_at
  ON public.segment_revisions USING btree (created_at DESC);

-- segment_phase_transitions: analytics daily-activity query uses .gte('created_at', 30-days-ago) 
-- .order('created_at', { ascending: false }) — existing index is on segment_id, not created_at.
CREATE INDEX IF NOT EXISTS idx_segment_phase_transitions_created_at
  ON public.segment_phase_transitions USING btree (created_at DESC);

-- segments composite: editor filter queries often combine article_id + status
-- Existing: idx_segments_article_id (article_id) + idx_segments_status (status) separately
-- Composite eliminates double-scan on filtered segment list queries
CREATE INDEX IF NOT EXISTS idx_segments_article_status
  ON public.segments USING btree (article_id, status);

-- segments target_lang: ZH queries filter by target_lang='zh' across all articles
CREATE INDEX IF NOT EXISTS idx_segments_target_lang
  ON public.segments USING btree (target_lang);
