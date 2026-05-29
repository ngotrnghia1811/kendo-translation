-- Kendo Translation Platform
-- Rollback for Migration 005: Memory DB Extension
--
-- !!! MANUAL RECOVERY ONLY. !!!
--   This file is NEVER auto-applied. Run by hand only if you need to
--   undo 005_memory_db_extension.sql in a recoverable environment.
--
-- !!! DATA LOSS WARNING. !!!
--   Drops all new memory-DB structures introduced in migration 005.
--   Existing data in the following columns and tables WILL BE LOST and
--   cannot be reconstructed from the surviving substrate:
--     - translation_memory.source_suggestion_id (audit chain back to suggestion)
--     - translation_memory.origin, .approach, .feedback_score, .superseded_by
--     - terminology.promotion_count, .promotion_threshold, .promoted_at,
--       .promoted_by, .casing, .source_suggestion_id, .first_occurrence_per
--     - agent_prompts.active, .version, .edited_by
--     - segment_suggestions.auto_accepted
--     - segments.auto_accept_eligible
--     - articles.policy
--     - All rows in style_guide, qa_issue_patterns, qa_issue_pattern_events,
--       edit_patterns, document_sections, document_decisions, prompt_edits.
--   In particular: any TM row that was promoted via Phase 4b will lose its
--   superseded_by link; any terminology row that was promoted will lose its
--   promotion audit fields; the entire QA calibration history is dropped.
--
-- Drop order (reverse dependency)
--   1. RPC functions (depend on tables/columns).
--   2. RLS policies on new tables.
--   3. Views (depend on tables/columns).
--   4. New tables in reverse of MEMORY-DB-DESIGN.md §6.1 step 2.
--   5. Indexes on existing tables that were added by 005.
--   6. New columns on existing tables.
--   (Extensions are NOT dropped; pg_trgm may be in use elsewhere.)
--
-- Idempotency
--   Every statement uses IF EXISTS so a partially-applied rollback can be
--   re-run safely.

BEGIN;

-- =============================================================================
-- 1. Drop RPC functions
-- =============================================================================
DROP FUNCTION IF EXISTS public.rpc_phase_4b_qa_save(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.rpc_phase_4b_promote_term(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.rpc_phase_4b_save_style(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.rpc_phase_4b_edit_save(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.rpc_phase_4b_translate_save(uuid, uuid, jsonb);

-- =============================================================================
-- 2. Drop RLS policies on new tables
--    (Tables themselves dropped in section 4, which would CASCADE the
--    policies, but we drop them explicitly for clarity.)
-- =============================================================================
DROP POLICY IF EXISTS prompt_edits_admin_writes              ON public.prompt_edits;
DROP POLICY IF EXISTS prompt_edits_no_agent_writes           ON public.prompt_edits;
DROP POLICY IF EXISTS prompt_edits_select_admin              ON public.prompt_edits;

DROP POLICY IF EXISTS document_decisions_translator_writes   ON public.document_decisions;
DROP POLICY IF EXISTS document_decisions_admin_writes        ON public.document_decisions;
DROP POLICY IF EXISTS document_decisions_no_agent_writes     ON public.document_decisions;
DROP POLICY IF EXISTS document_decisions_select_all          ON public.document_decisions;

DROP POLICY IF EXISTS document_sections_admin_writes         ON public.document_sections;
DROP POLICY IF EXISTS document_sections_no_agent_writes      ON public.document_sections;
DROP POLICY IF EXISTS document_sections_select_all           ON public.document_sections;

DROP POLICY IF EXISTS edit_patterns_translator_no_direct     ON public.edit_patterns;
DROP POLICY IF EXISTS edit_patterns_admin_writes             ON public.edit_patterns;
DROP POLICY IF EXISTS edit_patterns_no_agent_writes          ON public.edit_patterns;
DROP POLICY IF EXISTS edit_patterns_select_authz             ON public.edit_patterns;

DROP POLICY IF EXISTS qa_pattern_events_translator_no_direct ON public.qa_issue_pattern_events;
DROP POLICY IF EXISTS qa_pattern_events_admin_writes         ON public.qa_issue_pattern_events;
DROP POLICY IF EXISTS qa_pattern_events_no_agent_writes      ON public.qa_issue_pattern_events;
DROP POLICY IF EXISTS qa_pattern_events_select_authz         ON public.qa_issue_pattern_events;

DROP POLICY IF EXISTS qa_issue_patterns_translator_no_direct ON public.qa_issue_patterns;
DROP POLICY IF EXISTS qa_issue_patterns_admin_writes         ON public.qa_issue_patterns;
DROP POLICY IF EXISTS qa_issue_patterns_no_agent_writes      ON public.qa_issue_patterns;
DROP POLICY IF EXISTS qa_issue_patterns_select_authz         ON public.qa_issue_patterns;

DROP POLICY IF EXISTS style_guide_translator_no_direct       ON public.style_guide;
DROP POLICY IF EXISTS style_guide_admin_writes               ON public.style_guide;
DROP POLICY IF EXISTS style_guide_no_agent_writes            ON public.style_guide;
DROP POLICY IF EXISTS style_guide_select_all                 ON public.style_guide;

-- =============================================================================
-- 3. Drop views (depend on translation_memory.superseded_by, .feedback_score,
--    .origin, .approach and on terminology.promotion_count etc.; must precede
--    the column drops in section 6).
-- =============================================================================
DROP VIEW IF EXISTS public.terminology_active_view;
DROP VIEW IF EXISTS public.qa_issue_patterns_view;
DROP VIEW IF EXISTS public.tm_search_view;

-- =============================================================================
-- 4. Drop new tables (reverse of §6.1 step 2 dependency order).
--    qa_issue_pattern_events -> qa_issue_patterns -> prompt_edits ->
--    edit_patterns -> style_guide -> document_decisions -> document_sections.
-- =============================================================================
DROP TABLE IF EXISTS public.qa_issue_pattern_events;
DROP TABLE IF EXISTS public.qa_issue_patterns;
DROP TABLE IF EXISTS public.prompt_edits;
DROP TABLE IF EXISTS public.edit_patterns;
DROP TABLE IF EXISTS public.style_guide;
DROP TABLE IF EXISTS public.document_decisions;
DROP TABLE IF EXISTS public.document_sections;

-- =============================================================================
-- 5. Drop indexes on existing tables that were added by 005.
--    (Column drops in section 6 would cascade the indexes, but explicit drop
--    keeps the rollback self-documenting.)
-- =============================================================================
DROP INDEX IF EXISTS public.agent_prompts_active_lookup_uidx;
DROP INDEX IF EXISTS public.translation_memory_origin_idx;

-- =============================================================================
-- 6. Drop new columns on existing tables (reverse of §3.6 order).
-- =============================================================================

-- articles
ALTER TABLE public.articles
  DROP COLUMN IF EXISTS policy;

-- segments
ALTER TABLE public.segments
  DROP COLUMN IF EXISTS auto_accept_eligible;

-- segment_suggestions
ALTER TABLE public.segment_suggestions
  DROP COLUMN IF EXISTS auto_accepted;

-- agent_prompts
ALTER TABLE public.agent_prompts
  DROP COLUMN IF EXISTS edited_by;
ALTER TABLE public.agent_prompts
  DROP COLUMN IF EXISTS version;
ALTER TABLE public.agent_prompts
  DROP COLUMN IF EXISTS active;

-- terminology
ALTER TABLE public.terminology
  DROP COLUMN IF EXISTS first_occurrence_per;
ALTER TABLE public.terminology
  DROP COLUMN IF EXISTS source_suggestion_id;
ALTER TABLE public.terminology
  DROP COLUMN IF EXISTS casing;
ALTER TABLE public.terminology
  DROP COLUMN IF EXISTS promoted_by;
ALTER TABLE public.terminology
  DROP COLUMN IF EXISTS promoted_at;
ALTER TABLE public.terminology
  DROP COLUMN IF EXISTS promotion_threshold;
ALTER TABLE public.terminology
  DROP COLUMN IF EXISTS promotion_count;

-- translation_memory (superseded_by self-FK dropped before its column)
ALTER TABLE public.translation_memory
  DROP COLUMN IF EXISTS superseded_by;
ALTER TABLE public.translation_memory
  DROP COLUMN IF EXISTS feedback_score;
ALTER TABLE public.translation_memory
  DROP COLUMN IF EXISTS approach;
ALTER TABLE public.translation_memory
  DROP COLUMN IF EXISTS origin;
ALTER TABLE public.translation_memory
  DROP COLUMN IF EXISTS source_suggestion_id;

COMMIT;
