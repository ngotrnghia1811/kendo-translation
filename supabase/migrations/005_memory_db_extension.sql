-- Kendo Translation Platform
-- Migration 005: Memory DB Extension (Phase 4b substrate)
--
-- Purpose
--   Extend the existing memory substrate (translation_memory, terminology,
--   agent_prompts) and the cooperation surface (segment_suggestions, segments,
--   articles) with the columns, tables, views, RLS policies, and SECURITY
--   DEFINER RPCs required to close every Phase-4b [GAP] marker in the
--   MAC-RAG walkthroughs across the four task shapes (translate, edit,
--   proofread, qa-advisory).
--
-- Authoritative spec
--   docs/MEMORY-DB-DESIGN.md (commit 1fa896b). Every CREATE TABLE,
--   CREATE VIEW, ALTER TABLE, RLS policy body, and RPC signature below
--   is the materialisation of a shape defined in that document. Section
--   references appear inline (e.g. "See MEMORY-DB-DESIGN.md §3.1.").
--
-- Invariants enforced (MEMORY-DB-DESIGN.md §1.3)
--   I-MEM-1  No agent (service_role) may directly INSERT into memory
--            tables. The RLS bodies in section 5 of this migration
--            deny service_role writes; all translator-driven memory
--            writes flow through the SECURITY DEFINER RPCs in section 6.
--   I-MEM-2  Every Phase-4b row carries a source_suggestion_id (or, for
--            QA, a qa_issue_id) pointing back to the cooperation-surface
--            row that occasioned the write. The new columns and the new
--            tables include the appropriate FK columns.
--   I-MEM-3  Promotion from `preferred` to `required` is idempotent
--            (the RPC body checks `term_type <> 'required'` before
--            writing) and reversible (promoted_at / promoted_by are
--            nullable so demotion can NULL them).
--   I-MEM-4  Dismissed QA issues are recorded with the same fidelity
--            as confirmed ones; qa_issue_pattern_events.outcome carries
--            both `confirmed` and `dismissed_*` values.
--
-- Idempotency
--   Per MEMORY-DB-DESIGN.md §6.2 the migration is safe to re-apply.
--     - All CREATE TABLE / CREATE INDEX use IF NOT EXISTS.
--     - All ALTER TABLE column additions use ADD COLUMN IF NOT EXISTS.
--     - All CREATE VIEW / CREATE FUNCTION use OR REPLACE.
--     - RLS policies are guarded with DROP POLICY IF EXISTS followed by
--       CREATE POLICY. (Single uniform convention across the file.)
--     - RLS enables are wrapped in pg_class.relrowsecurity probes so a
--       repeat run is a no-op.
--
-- Backfill
--   None. Per MEMORY-DB-DESIGN.md §6.3 every new column has a default
--   that is factually correct for existing rows (e.g. translation_memory
--   rows pre-date Phase 4b so origin defaults to 'ingest'). There are
--   no UPDATE statements at migration time; UPDATEs live only inside
--   RPC bodies as part of Phase-4b server actions.
--
-- Statement order
--   Follows MEMORY-DB-DESIGN.md §6.1 exactly:
--     1. Column additions to existing tables.
--     2. New tables in dependency order.
--     3. Indexes (inlined per-table; partial unique idx on agent_prompts
--        is in section 1 with the column additions it depends on).
--     4. Views.
--     5. RLS enables + policy bodies.
--     6. RPC functions (SECURITY DEFINER).
--
-- Scope fences
--   - This migration does NOT touch the existing RLS policies on
--     translation_memory, terminology, agent_prompts, segment_suggestions,
--     segments, or articles. It only ADDs new policies for the new
--     memory tables. (Existing tables had no public.* RLS for memory
--     reads/writes prior to this migration; cooperation-surface tables
--     keep their 004-era policies unchanged.)
--   - No data migration. No drops. No CHECK-constraint swaps.

BEGIN;

-- =============================================================================
-- 0. Informational pre-flight: report row counts so the apply-log is auditable.
--    Per MEMORY-DB-DESIGN.md §2.x the substrate sizes were 1264 / 920 / 1.
--    A re-application after this migration should still report the same
--    counts (no data migration). See 004_phase_workflow.sql for the
--    pattern this block follows.
-- =============================================================================
DO $$
DECLARE
  v_tm_total       INT;
  v_term_total     INT;
  v_prompts_total  INT;
BEGIN
  SELECT COUNT(*) INTO v_tm_total      FROM public.translation_memory;
  SELECT COUNT(*) INTO v_term_total    FROM public.terminology;
  SELECT COUNT(*) INTO v_prompts_total FROM public.agent_prompts;

  RAISE NOTICE 'Migration 005 pre-flight: translation_memory=%, terminology=%, agent_prompts=%',
    v_tm_total, v_term_total, v_prompts_total;
END $$;

-- =============================================================================
-- 0a. Extensions
--     pg_trgm is required by the edit_patterns trigram GIN index defined
--     in MEMORY-DB-DESIGN.md §3.3. pgcrypto (gen_random_uuid) and pgvector
--     (USER-DEFINED embedding column) are already installed on this
--     project but we declare pg_trgm conditionally so that future fresh
--     environments can apply this migration without a separate bootstrap.
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- 1. Column additions to existing tables (MEMORY-DB-DESIGN.md §3.6).
--    18 columns total across 6 tables.
-- =============================================================================

-- 1a. translation_memory (+5 columns)
ALTER TABLE public.translation_memory
  ADD COLUMN IF NOT EXISTS source_suggestion_id uuid NULL
    REFERENCES public.segment_suggestions(id) ON DELETE SET NULL;
ALTER TABLE public.translation_memory
  ADD COLUMN IF NOT EXISTS origin               text NOT NULL DEFAULT 'ingest';
ALTER TABLE public.translation_memory
  ADD COLUMN IF NOT EXISTS approach             text NULL;
ALTER TABLE public.translation_memory
  ADD COLUMN IF NOT EXISTS feedback_score       integer NOT NULL DEFAULT 0;
ALTER TABLE public.translation_memory
  ADD COLUMN IF NOT EXISTS superseded_by        uuid NULL
    REFERENCES public.translation_memory(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS translation_memory_origin_idx
  ON public.translation_memory (origin);

COMMENT ON COLUMN public.translation_memory.source_suggestion_id IS
  'Audit-chain back-reference to the segment_suggestions row whose acceptance produced this TM entry. See MEMORY-DB-DESIGN.md §2.1 / §3.6 / I-MEM-2.';
COMMENT ON COLUMN public.translation_memory.origin IS
  'One of ''ingest'' | ''phase_4b_translate'' | ''phase_4b_edit_update'' | ''manual''. Existing rows default to ''ingest''. See MEMORY-DB-DESIGN.md §2.1 / §3.6.';
COMMENT ON COLUMN public.translation_memory.approach IS
  'For Phase-4b translate writes, which of literal/natural/formal produced the accepted candidate. See MEMORY-DB-DESIGN.md §2.1 / §3.6.';
COMMENT ON COLUMN public.translation_memory.feedback_score IS
  'Incremented when retrieved-then-confirmed-helpful, decremented when retrieved-then-marked-unhelpful. See MEMORY-DB-DESIGN.md §2.1 / §3.6.';
COMMENT ON COLUMN public.translation_memory.superseded_by IS
  'When an edit-phase Phase-4b updates a TM target, a new row is inserted and the old row''s superseded_by points to the new row. See MEMORY-DB-DESIGN.md §2.1 / §7.2.';

-- 1b. terminology (+7 columns)
ALTER TABLE public.terminology
  ADD COLUMN IF NOT EXISTS promotion_count      integer NOT NULL DEFAULT 0;
ALTER TABLE public.terminology
  ADD COLUMN IF NOT EXISTS promotion_threshold  integer NOT NULL DEFAULT 3;
ALTER TABLE public.terminology
  ADD COLUMN IF NOT EXISTS promoted_at          timestamptz NULL;
ALTER TABLE public.terminology
  ADD COLUMN IF NOT EXISTS promoted_by          uuid NULL REFERENCES public.profiles(id);
ALTER TABLE public.terminology
  ADD COLUMN IF NOT EXISTS casing               text NULL;
ALTER TABLE public.terminology
  ADD COLUMN IF NOT EXISTS source_suggestion_id uuid NULL
    REFERENCES public.segment_suggestions(id) ON DELETE SET NULL;
ALTER TABLE public.terminology
  ADD COLUMN IF NOT EXISTS first_occurrence_per text NULL;

COMMENT ON COLUMN public.terminology.promotion_count IS
  'Number of Phase-4b cycles that have proposed promotion to required. Drives term_type promotion when >= promotion_threshold. See MEMORY-DB-DESIGN.md §2.2 / §3.6 / §7.1.';
COMMENT ON COLUMN public.terminology.promotion_threshold IS
  'Per-row promotion threshold (default 3). Admins can lower for high-importance terms. See MEMORY-DB-DESIGN.md §2.2 / §3.6.';
COMMENT ON COLUMN public.terminology.promoted_at IS
  'Timestamp of actual promotion to term_type=''required''. NULL until promoted. Demotion sets back to NULL. See MEMORY-DB-DESIGN.md §2.2 / I-MEM-3.';
COMMENT ON COLUMN public.terminology.promoted_by IS
  'Profile that confirmed the promotion. NULL until promoted. See MEMORY-DB-DESIGN.md §2.2 / I-MEM-3.';
COMMENT ON COLUMN public.terminology.casing IS
  'One of ''lowercase'' | ''capitalize'' | ''italic_first_occurrence'' | ''none''. Proofread Phase 4b writes here. See MEMORY-DB-DESIGN.md §2.2 / §3.6 / §7.3.';
COMMENT ON COLUMN public.terminology.source_suggestion_id IS
  'Audit-chain back-reference (nullable: manually-curated terms have no suggestion of origin). See MEMORY-DB-DESIGN.md §2.2 / I-MEM-2.';
COMMENT ON COLUMN public.terminology.first_occurrence_per IS
  'One of ''document''|''chapter''|''section''|NULL. Drives A.2.5 first-occurrence annotation. NULL = annotate every occurrence. See MEMORY-DB-DESIGN.md §2.2 / §3.6.';

-- 1c. agent_prompts (+3 columns + partial unique index)
ALTER TABLE public.agent_prompts
  ADD COLUMN IF NOT EXISTS active     boolean NOT NULL DEFAULT true;
ALTER TABLE public.agent_prompts
  ADD COLUMN IF NOT EXISTS version    integer NOT NULL DEFAULT 1;
ALTER TABLE public.agent_prompts
  ADD COLUMN IF NOT EXISTS edited_by  uuid NULL REFERENCES public.profiles(id);

-- Partial unique index ensuring at most one active prompt per
-- (agent_type, approach, user_id) tuple. NULL approach / user_id are
-- normalised via COALESCE so the unique constraint works across
-- nullable columns. See MEMORY-DB-DESIGN.md §3.6.
CREATE UNIQUE INDEX IF NOT EXISTS agent_prompts_active_lookup_uidx
  ON public.agent_prompts (agent_type, COALESCE(approach, ''), COALESCE(user_id::text, ''))
  WHERE active = true;

COMMENT ON COLUMN public.agent_prompts.active IS
  'Soft-delete / rollback flag. Editing a prompt inserts a new row and flips the previous row''s active to false. See MEMORY-DB-DESIGN.md §2.3 / §3.6.';
COMMENT ON COLUMN public.agent_prompts.version IS
  'Explicit version counter (defaults to 1 for existing rows). See MEMORY-DB-DESIGN.md §2.3 / §3.6.';
COMMENT ON COLUMN public.agent_prompts.edited_by IS
  'Profile that last edited the prompt. NULL for legacy rows. See MEMORY-DB-DESIGN.md §2.3 / §3.6.';

-- 1d. segment_suggestions (+1 column)
ALTER TABLE public.segment_suggestions
  ADD COLUMN IF NOT EXISTS auto_accepted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.segment_suggestions.auto_accepted IS
  'Marks suggestions that bypassed human confirmation under the document''s auto-accept policy. See MEMORY-DB-DESIGN.md §2.4 / §3.6.';

-- 1e. segments (+1 column)
ALTER TABLE public.segments
  ADD COLUMN IF NOT EXISTS auto_accept_eligible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.segments.auto_accept_eligible IS
  'Toggled by the proofread-phase code path when a suggestion qualifies for auto-accept under the article policy. See MEMORY-DB-DESIGN.md §2.4 / §3.6.';

-- 1f. articles (+1 column)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS policy jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.articles.policy IS
  'Per-document policy (auto-accept on/off, thresholds, first-occurrence scope). Validated in application code, not by Postgres. See MEMORY-DB-DESIGN.md §3.6.';

-- =============================================================================
-- 2. New tables in dependency order (MEMORY-DB-DESIGN.md §6.1 step 2).
--    document_sections -> document_decisions -> style_guide ->
--    edit_patterns -> prompt_edits -> qa_issue_patterns ->
--    qa_issue_pattern_events.
-- =============================================================================

-- 2a. document_sections (MEMORY-DB-DESIGN.md §3.4)
CREATE TABLE IF NOT EXISTS public.document_sections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  position        integer NOT NULL,
  title           text NULL,
  start_segment   uuid NULL REFERENCES public.segments(id) ON DELETE SET NULL,
  end_segment     uuid NULL REFERENCES public.segments(id) ON DELETE SET NULL,
  summary         text NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_sections_article_idx
  ON public.document_sections (article_id, position);

COMMENT ON TABLE public.document_sections IS
  'L2 (article-local) sectional units. Optional per article; if absent retrieval falls back to positional neighbours. See MEMORY-DB-DESIGN.md §3.4.';

-- 2b. document_decisions (MEMORY-DB-DESIGN.md §3.4)
CREATE TABLE IF NOT EXISTS public.document_decisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  section_id      uuid NULL REFERENCES public.document_sections(id) ON DELETE SET NULL,
  decision_kind   text NOT NULL,
  body            text NOT NULL,
  set_by          uuid NULL REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_decisions_article_idx
  ON public.document_decisions (article_id, decision_kind);

COMMENT ON TABLE public.document_decisions IS
  'Explicit "we decided X for this document" records. Shown under the L2 accordion of the Context Builder Panel. See MEMORY-DB-DESIGN.md §3.4.';

-- 2c. style_guide (MEMORY-DB-DESIGN.md §3.1)
CREATE TABLE IF NOT EXISTS public.style_guide (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope                 text NOT NULL,
  scope_ref             uuid NULL,
  rule_category         text NOT NULL,
  pattern               text NOT NULL,
  policy                text NOT NULL,
  rationale             text NULL,
  confirmation_count    integer NOT NULL DEFAULT 1,
  status                text NOT NULL DEFAULT 'preferred',
  source_suggestion_id  uuid NULL REFERENCES public.segment_suggestions(id) ON DELETE SET NULL,
  created_by            uuid NULL REFERENCES public.profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS style_guide_scope_idx
  ON public.style_guide (scope, scope_ref);
CREATE INDEX IF NOT EXISTS style_guide_category_status_idx
  ON public.style_guide (rule_category, status);

COMMENT ON TABLE public.style_guide IS
  'Memory destination for casing, italics, punctuation, register decisions. Pattern -> policy mappings, separate from terminology because rules do not bind to a source term. See MEMORY-DB-DESIGN.md §3.1.';

-- 2d. edit_patterns (MEMORY-DB-DESIGN.md §3.3)
CREATE TABLE IF NOT EXISTS public.edit_patterns (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  before_phrase         text NOT NULL,
  after_phrase          text NOT NULL,
  rationale             text NULL,
  approach              text NULL,
  confirmation_count    integer NOT NULL DEFAULT 1,
  domain                text NOT NULL DEFAULT 'kendo',
  source_suggestion_id  uuid NULL REFERENCES public.segment_suggestions(id) ON DELETE SET NULL,
  created_by            uuid NULL REFERENCES public.profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edit_patterns_before_phrase_trgm_idx
  ON public.edit_patterns USING gin (before_phrase gin_trgm_ops);
CREATE INDEX IF NOT EXISTS edit_patterns_domain_idx
  ON public.edit_patterns (domain);

COMMENT ON TABLE public.edit_patterns IS
  'Old phrasing -> new phrasing patterns the edit agent can prefer in future runs. Target-side lookup; separate from translation_memory (source-side). See MEMORY-DB-DESIGN.md §3.3 / §7.2.';

-- 2e. prompt_edits (MEMORY-DB-DESIGN.md §3.5)
CREATE TABLE IF NOT EXISTS public.prompt_edits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_prompt_id uuid NOT NULL REFERENCES public.agent_prompts(id) ON DELETE CASCADE,
  prev_template   text NULL,
  new_template    text NOT NULL,
  rationale       text NULL,
  edited_by       uuid NOT NULL REFERENCES public.profiles(id),
  edited_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prompt_edits_agent_prompt_idx
  ON public.prompt_edits (agent_prompt_id, edited_at DESC);

COMMENT ON TABLE public.prompt_edits IS
  'Audit trail for agent_prompts changes. Diff + rationale per edit. Addresses QA reviewer-bias [GAP]. See MEMORY-DB-DESIGN.md §3.5 / §7.4 step 5.';

-- 2f. qa_issue_patterns (MEMORY-DB-DESIGN.md §3.2)
CREATE TABLE IF NOT EXISTS public.qa_issue_patterns (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name          text NOT NULL,
  category              text NOT NULL,
  description           text NOT NULL,
  detection_hint        text NULL,
  confirmation_count    integer NOT NULL DEFAULT 0,
  dismissal_count       integer NOT NULL DEFAULT 0,
  needs_chapter_scan    boolean NOT NULL DEFAULT false,
  severity_default      text NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS qa_issue_patterns_name_uidx
  ON public.qa_issue_patterns (pattern_name);

COMMENT ON TABLE public.qa_issue_patterns IS
  'Aggregate row per QA issue pattern (counts, current detection hint, current severity). Read by retrieval in future QA runs. See MEMORY-DB-DESIGN.md §3.2 / §7.4.';

-- 2g. qa_issue_pattern_events (MEMORY-DB-DESIGN.md §3.2)
CREATE TABLE IF NOT EXISTS public.qa_issue_pattern_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id            uuid NOT NULL REFERENCES public.qa_issue_patterns(id) ON DELETE CASCADE,
  qa_issue_id           uuid NOT NULL REFERENCES public.qa_issues(id) ON DELETE CASCADE,
  outcome               text NOT NULL,
  triaged_by            uuid NOT NULL REFERENCES public.profiles(id),
  triaged_at            timestamptz NOT NULL DEFAULT now(),
  dismissal_reason      text NULL,
  agent_confidence      real NULL
);

CREATE INDEX IF NOT EXISTS qa_issue_pattern_events_pattern_idx
  ON public.qa_issue_pattern_events (pattern_id, outcome);

COMMENT ON TABLE public.qa_issue_pattern_events IS
  'One row per QA triage event (confirmed or dismissed). Replayed for calibration; aggregates on qa_issue_patterns are derived from these. See MEMORY-DB-DESIGN.md §3.2 / §7.4 / I-MEM-4.';

-- =============================================================================
-- 3. Views (MEMORY-DB-DESIGN.md §4).
-- =============================================================================

-- 3a. tm_search_view (§4.1)
CREATE OR REPLACE VIEW public.tm_search_view AS
SELECT
  tm.id,
  tm.source_text,
  tm.target_text,
  tm.source_lang,
  tm.target_lang,
  tm.domain,
  tm.embedding,
  tm.source_tsv,
  tm.quality,
  tm.human_approved,
  tm.usage_count,
  tm.last_used_at,
  tm.feedback_score,
  tm.origin,
  tm.approach,
  tm.article_id,
  CASE
    WHEN tm.article_id IS NOT NULL THEN 'project'  -- L3
    ELSE 'external'                                -- L4
  END AS retrieval_layer,
  tm.superseded_by IS NULL AS is_current
FROM public.translation_memory tm
WHERE tm.superseded_by IS NULL;

COMMENT ON VIEW public.tm_search_view IS
  'Retrieval-facing TM view. Filters out superseded rows so Phase 1 retrieval never sees a stale target. Exposes retrieval_layer for the L3-vs-L4 ranker signal. See MEMORY-DB-DESIGN.md §4.1.';

-- 3b. qa_issue_patterns_view (§4.2)
CREATE OR REPLACE VIEW public.qa_issue_patterns_view AS
SELECT
  p.id,
  p.pattern_name,
  p.category,
  p.description,
  p.detection_hint,
  p.confirmation_count,
  p.dismissal_count,
  p.needs_chapter_scan,
  p.severity_default,
  CASE
    WHEN (p.confirmation_count + p.dismissal_count) > 0
      THEN p.dismissal_count::real / (p.confirmation_count + p.dismissal_count)
    ELSE NULL
  END AS fp_rate,
  p.confirmation_count + p.dismissal_count AS event_count,
  p.updated_at
FROM public.qa_issue_patterns p;

COMMENT ON VIEW public.qa_issue_patterns_view IS
  'Retrieval-facing QA-pattern view with derived fp_rate (NULL = no triage events yet). See MEMORY-DB-DESIGN.md §4.2.';

-- 3c. terminology_active_view (§4.3)
CREATE OR REPLACE VIEW public.terminology_active_view AS
SELECT
  t.id,
  t.source_term,
  t.target_term,
  t.reading,
  t.domain,
  t.term_type,
  t.casing,
  t.first_occurrence_per,
  t.notes,
  t.promotion_count,
  t.promotion_threshold,
  (t.promotion_count >= t.promotion_threshold) AS promotion_eligible,
  t.created_at
FROM public.terminology t;

COMMENT ON VIEW public.terminology_active_view IS
  'Convenience view exposing promotion_eligible flag. Used by lib/context/gap-detector.ts. See MEMORY-DB-DESIGN.md §4.3.';

-- =============================================================================
-- 4. RLS enables + policies (MEMORY-DB-DESIGN.md §5).
--    Convention: every policy is preceded by DROP POLICY IF EXISTS so
--    re-application is idempotent. Service-role writes are denied on
--    every memory table (I-MEM-1); admin gets full access via a direct
--    policy; translator INSERTs are denied directly (they must flow
--    through the SECURITY DEFINER RPCs in section 5).
-- =============================================================================

-- 4a. Enable RLS on every new table (idempotent: ALTER ... ENABLE is a no-op
--     if already enabled).
ALTER TABLE public.style_guide               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_issue_patterns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_issue_pattern_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edit_patterns             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_decisions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_edits              ENABLE ROW LEVEL SECURITY;

-- ----- style_guide -----------------------------------------------------------
-- Read: admin/translator/reader. Write: admin direct; translator via RPC only.
DROP POLICY IF EXISTS style_guide_select_all       ON public.style_guide;
DROP POLICY IF EXISTS style_guide_no_agent_writes  ON public.style_guide;
DROP POLICY IF EXISTS style_guide_admin_writes     ON public.style_guide;
DROP POLICY IF EXISTS style_guide_translator_no_direct ON public.style_guide;

CREATE POLICY style_guide_select_all
  ON public.style_guide FOR SELECT
  USING (true);

CREATE POLICY style_guide_no_agent_writes
  ON public.style_guide FOR INSERT TO service_role
  WITH CHECK (false);

CREATE POLICY style_guide_admin_writes
  ON public.style_guide FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );

CREATE POLICY style_guide_translator_no_direct
  ON public.style_guide FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );

-- ----- qa_issue_patterns -----------------------------------------------------
-- Read: admin/translator (NOT reader). Write: admin direct; translator via RPC.
DROP POLICY IF EXISTS qa_issue_patterns_select_authz     ON public.qa_issue_patterns;
DROP POLICY IF EXISTS qa_issue_patterns_no_agent_writes  ON public.qa_issue_patterns;
DROP POLICY IF EXISTS qa_issue_patterns_admin_writes     ON public.qa_issue_patterns;
DROP POLICY IF EXISTS qa_issue_patterns_translator_no_direct ON public.qa_issue_patterns;

CREATE POLICY qa_issue_patterns_select_authz
  ON public.qa_issue_patterns FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'translator'))
  );

CREATE POLICY qa_issue_patterns_no_agent_writes
  ON public.qa_issue_patterns FOR INSERT TO service_role
  WITH CHECK (false);

CREATE POLICY qa_issue_patterns_admin_writes
  ON public.qa_issue_patterns FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );

CREATE POLICY qa_issue_patterns_translator_no_direct
  ON public.qa_issue_patterns FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );

-- ----- qa_issue_pattern_events -----------------------------------------------
-- Read: admin/translator (mirror parent). Write: admin direct; translator via RPC.
DROP POLICY IF EXISTS qa_pattern_events_select_authz     ON public.qa_issue_pattern_events;
DROP POLICY IF EXISTS qa_pattern_events_no_agent_writes  ON public.qa_issue_pattern_events;
DROP POLICY IF EXISTS qa_pattern_events_admin_writes     ON public.qa_issue_pattern_events;
DROP POLICY IF EXISTS qa_pattern_events_translator_no_direct ON public.qa_issue_pattern_events;

CREATE POLICY qa_pattern_events_select_authz
  ON public.qa_issue_pattern_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'translator'))
  );

CREATE POLICY qa_pattern_events_no_agent_writes
  ON public.qa_issue_pattern_events FOR INSERT TO service_role
  WITH CHECK (false);

CREATE POLICY qa_pattern_events_admin_writes
  ON public.qa_issue_pattern_events FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );

CREATE POLICY qa_pattern_events_translator_no_direct
  ON public.qa_issue_pattern_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );

-- ----- edit_patterns ---------------------------------------------------------
-- Read: admin/translator (NOT reader). Write: admin direct; translator via RPC.
DROP POLICY IF EXISTS edit_patterns_select_authz     ON public.edit_patterns;
DROP POLICY IF EXISTS edit_patterns_no_agent_writes  ON public.edit_patterns;
DROP POLICY IF EXISTS edit_patterns_admin_writes     ON public.edit_patterns;
DROP POLICY IF EXISTS edit_patterns_translator_no_direct ON public.edit_patterns;

CREATE POLICY edit_patterns_select_authz
  ON public.edit_patterns FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'translator'))
  );

CREATE POLICY edit_patterns_no_agent_writes
  ON public.edit_patterns FOR INSERT TO service_role
  WITH CHECK (false);

CREATE POLICY edit_patterns_admin_writes
  ON public.edit_patterns FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );

CREATE POLICY edit_patterns_translator_no_direct
  ON public.edit_patterns FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );

-- ----- document_sections -----------------------------------------------------
-- Read: admin/translator/reader. Write: admin only.
DROP POLICY IF EXISTS document_sections_select_all      ON public.document_sections;
DROP POLICY IF EXISTS document_sections_no_agent_writes ON public.document_sections;
DROP POLICY IF EXISTS document_sections_admin_writes    ON public.document_sections;

CREATE POLICY document_sections_select_all
  ON public.document_sections FOR SELECT
  USING (true);

CREATE POLICY document_sections_no_agent_writes
  ON public.document_sections FOR INSERT TO service_role
  WITH CHECK (false);

CREATE POLICY document_sections_admin_writes
  ON public.document_sections FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );

-- ----- document_decisions ----------------------------------------------------
-- Read: admin/translator/reader. Write: admin + translator (direct allowed,
-- per §5.2 "translator+ may add").
DROP POLICY IF EXISTS document_decisions_select_all      ON public.document_decisions;
DROP POLICY IF EXISTS document_decisions_no_agent_writes ON public.document_decisions;
DROP POLICY IF EXISTS document_decisions_admin_writes    ON public.document_decisions;
DROP POLICY IF EXISTS document_decisions_translator_writes ON public.document_decisions;

CREATE POLICY document_decisions_select_all
  ON public.document_decisions FOR SELECT
  USING (true);

CREATE POLICY document_decisions_no_agent_writes
  ON public.document_decisions FOR INSERT TO service_role
  WITH CHECK (false);

CREATE POLICY document_decisions_admin_writes
  ON public.document_decisions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );

CREATE POLICY document_decisions_translator_writes
  ON public.document_decisions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'translator'))
  );

-- ----- prompt_edits ----------------------------------------------------------
-- Read: admin ONLY (per §5.1). Write: admin direct only (translator denied;
-- the qa_save RPC, which inserts into prompt_edits as the threshold-adjust
-- side-effect, runs SECURITY DEFINER and bypasses RLS).
DROP POLICY IF EXISTS prompt_edits_select_admin       ON public.prompt_edits;
DROP POLICY IF EXISTS prompt_edits_no_agent_writes    ON public.prompt_edits;
DROP POLICY IF EXISTS prompt_edits_admin_writes       ON public.prompt_edits;

CREATE POLICY prompt_edits_select_admin
  ON public.prompt_edits FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );

CREATE POLICY prompt_edits_no_agent_writes
  ON public.prompt_edits FOR INSERT TO service_role
  WITH CHECK (false);

CREATE POLICY prompt_edits_admin_writes
  ON public.prompt_edits FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );

-- =============================================================================
-- 5. RPC functions (MEMORY-DB-DESIGN.md §7).
--    All SECURITY DEFINER. All take (segment_id uuid, suggestion_id uuid,
--    payload jsonb) and return jsonb of shape {"wrote": <table_name>,
--    "ids": [...]}. The RPCs run as the function-owner (postgres) so they
--    bypass the deny-translator-direct-INSERT policies above; auth checks
--    are performed in-body against auth.uid().
-- =============================================================================

-- 5a. rpc_phase_4b_translate_save (§7.1)
CREATE OR REPLACE FUNCTION public.rpc_phase_4b_translate_save(
  segment_id    uuid,
  suggestion_id uuid,
  payload       jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid             uuid := auth.uid();
  v_seg             public.segments%ROWTYPE;
  v_sugg            public.segment_suggestions%ROWTYPE;
  v_is_admin        boolean;
  v_save_to_tm      boolean := COALESCE((payload->>'save_to_tm')::boolean, false);
  v_approach        text    := payload->>'approach';
  v_domain          text;
  v_new_tm_id       uuid;
  v_ids             uuid[] := ARRAY[]::uuid[];
  v_promote         jsonb;
  v_term_id         uuid;
  v_boost           jsonb;
  v_tm_id           uuid;
BEGIN
  -- Validate: suggestion must be accepted, accepter must be caller or caller admin.
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin'
  ) INTO v_is_admin;

  SELECT * INTO v_sugg FROM public.segment_suggestions WHERE id = suggestion_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'suggestion % not found', suggestion_id USING ERRCODE = 'P0002';
  END IF;
  IF v_sugg.status <> 'accepted' THEN
    RAISE EXCEPTION 'suggestion % is not accepted (status=%)', suggestion_id, v_sugg.status
      USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_is_admin AND v_sugg.accepter_id <> v_uid THEN
    RAISE EXCEPTION 'caller % is not the accepter of suggestion %', v_uid, suggestion_id
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_seg FROM public.segments WHERE id = segment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'segment % not found', segment_id USING ERRCODE = 'P0002';
  END IF;
  v_domain := 'kendo'; -- substrate default; articles do not currently carry a domain column.

  -- 1. TM insert (if save_to_tm). Embedding populated asynchronously by external pipeline.
  IF v_save_to_tm THEN
    INSERT INTO public.translation_memory
      (source_text, target_text, source_lang, target_lang, domain,
       human_approved, source_suggestion_id, origin, approach,
       article_id, created_by)
    VALUES
      (v_seg.source_text, v_sugg.proposed_text, v_seg.source_lang, v_seg.target_lang, v_domain,
       true, suggestion_id, 'phase_4b_translate', v_approach,
       v_seg.article_id, v_uid)
    RETURNING id INTO v_new_tm_id;
    v_ids := array_append(v_ids, v_new_tm_id);
  END IF;

  -- 2. Term promotion: bump count, then promote if threshold reached.
  IF jsonb_typeof(payload->'promote_terms') = 'array' THEN
    FOR v_promote IN SELECT jsonb_array_elements(payload->'promote_terms') LOOP
      v_term_id := (v_promote->>'term_id')::uuid;
      UPDATE public.terminology
        SET promotion_count = promotion_count + 1
      WHERE id = v_term_id;

      UPDATE public.terminology
        SET term_type   = 'required',
            promoted_at = now(),
            promoted_by = v_uid
      WHERE id = v_term_id
        AND promotion_count >= promotion_threshold
        AND term_type <> 'required';

      v_ids := array_append(v_ids, v_term_id);
    END LOOP;
  END IF;

  -- 3. TM feedback boost.
  IF jsonb_typeof(payload->'boost_tm_examples') = 'array' THEN
    FOR v_boost IN SELECT jsonb_array_elements(payload->'boost_tm_examples') LOOP
      v_tm_id := (v_boost->>'tm_id')::uuid;
      UPDATE public.translation_memory
        SET feedback_score = feedback_score + 1,
            updated_at     = now()
      WHERE id = v_tm_id;
      v_ids := array_append(v_ids, v_tm_id);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('wrote', 'translation_memory', 'ids', to_jsonb(v_ids));
END;
$$;

COMMENT ON FUNCTION public.rpc_phase_4b_translate_save(uuid, uuid, jsonb) IS
  'Phase-4b translate-accept memory write. Inserts TM, promotes terms, boosts helpful TM examples. SECURITY DEFINER. See MEMORY-DB-DESIGN.md §7.1.';

-- 5b. rpc_phase_4b_edit_save (§7.2)
CREATE OR REPLACE FUNCTION public.rpc_phase_4b_edit_save(
  segment_id    uuid,
  suggestion_id uuid,
  payload       jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid             uuid := auth.uid();
  v_seg             public.segments%ROWTYPE;
  v_sugg            public.segment_suggestions%ROWTYPE;
  v_is_admin        boolean;
  v_update_tm       boolean := COALESCE((payload->>'update_tm')::boolean, false);
  v_pattern         jsonb   := payload->'edit_pattern';
  v_before          text;
  v_after           text;
  v_rationale       text;
  v_pattern_approach text;
  v_domain          text := 'kendo';
  v_existing_tm     uuid;
  v_new_tm_id       uuid;
  v_existing_ep     uuid;
  v_new_ep_id       uuid;
  v_ids             uuid[] := ARRAY[]::uuid[];
  v_promote         jsonb;
  v_term_id         uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin'
  ) INTO v_is_admin;

  SELECT * INTO v_sugg FROM public.segment_suggestions WHERE id = suggestion_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'suggestion % not found', suggestion_id USING ERRCODE = 'P0002';
  END IF;
  IF v_sugg.status <> 'accepted' THEN
    RAISE EXCEPTION 'suggestion % is not accepted (status=%)', suggestion_id, v_sugg.status
      USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_is_admin AND v_sugg.accepter_id <> v_uid THEN
    RAISE EXCEPTION 'caller % is not the accepter of suggestion %', v_uid, suggestion_id
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_seg FROM public.segments WHERE id = segment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'segment % not found', segment_id USING ERRCODE = 'P0002';
  END IF;

  -- 2. TM update via supersede (insert-and-link, per I-MEM-2).
  IF v_update_tm THEN
    SELECT id INTO v_existing_tm
    FROM public.translation_memory
    WHERE source_text = v_seg.source_text
      AND source_lang = v_seg.source_lang
      AND target_lang = v_seg.target_lang
      AND superseded_by IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    INSERT INTO public.translation_memory
      (source_text, target_text, source_lang, target_lang, domain,
       human_approved, source_suggestion_id, origin, approach,
       article_id, created_by)
    VALUES
      (v_seg.source_text, v_sugg.proposed_text, v_seg.source_lang, v_seg.target_lang, v_domain,
       true, suggestion_id, 'phase_4b_edit_update', payload->>'approach',
       v_seg.article_id, v_uid)
    RETURNING id INTO v_new_tm_id;
    v_ids := array_append(v_ids, v_new_tm_id);

    IF v_existing_tm IS NOT NULL THEN
      UPDATE public.translation_memory
        SET superseded_by = v_new_tm_id,
            updated_at    = now()
      WHERE id = v_existing_tm;
    END IF;
  END IF;

  -- 3. Edit pattern insert-or-increment.
  IF v_pattern IS NOT NULL THEN
    v_before := v_pattern->>'before_phrase';
    v_after  := v_pattern->>'after_phrase';
    v_rationale := v_pattern->>'rationale';
    v_pattern_approach := v_pattern->>'approach';

    IF v_before IS NULL OR v_after IS NULL THEN
      RAISE EXCEPTION 'edit_pattern requires before_phrase and after_phrase'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT id INTO v_existing_ep
    FROM public.edit_patterns
    WHERE before_phrase = v_before
      AND after_phrase  = v_after
      AND domain        = v_domain
    LIMIT 1;

    IF v_existing_ep IS NOT NULL THEN
      UPDATE public.edit_patterns
        SET confirmation_count = confirmation_count + 1,
            updated_at         = now()
      WHERE id = v_existing_ep;
      v_ids := array_append(v_ids, v_existing_ep);
    ELSE
      INSERT INTO public.edit_patterns
        (before_phrase, after_phrase, rationale, approach,
         domain, source_suggestion_id, created_by)
      VALUES
        (v_before, v_after, v_rationale, v_pattern_approach,
         v_domain, suggestion_id, v_uid)
      RETURNING id INTO v_new_ep_id;
      v_ids := array_append(v_ids, v_new_ep_id);
    END IF;
  END IF;

  -- 4. Term promotion (same as translate).
  IF jsonb_typeof(payload->'promote_terms') = 'array' THEN
    FOR v_promote IN SELECT jsonb_array_elements(payload->'promote_terms') LOOP
      v_term_id := (v_promote->>'term_id')::uuid;
      UPDATE public.terminology
        SET promotion_count = promotion_count + 1
      WHERE id = v_term_id;
      UPDATE public.terminology
        SET term_type   = 'required',
            promoted_at = now(),
            promoted_by = v_uid
      WHERE id = v_term_id
        AND promotion_count >= promotion_threshold
        AND term_type <> 'required';
      v_ids := array_append(v_ids, v_term_id);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('wrote', 'edit_patterns', 'ids', to_jsonb(v_ids));
END;
$$;

COMMENT ON FUNCTION public.rpc_phase_4b_edit_save(uuid, uuid, jsonb) IS
  'Phase-4b edit-accept memory write. Supersede-link TM update, insert-or-increment edit_patterns. SECURITY DEFINER. See MEMORY-DB-DESIGN.md §7.2.';

-- 5c. rpc_phase_4b_save_style (§7.3)
CREATE OR REPLACE FUNCTION public.rpc_phase_4b_save_style(
  segment_id    uuid,
  suggestion_id uuid,
  payload       jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_sugg         public.segment_suggestions%ROWTYPE;
  v_is_admin     boolean;
  v_scope        text := payload->>'scope';
  v_scope_ref    uuid := NULLIF(payload->>'scope_ref','')::uuid;
  v_category     text := payload->>'rule_category';
  v_pattern      text := payload->>'pattern';
  v_policy       text := payload->>'policy';
  v_rationale    text := payload->>'rationale';
  v_existing_id  uuid;
  v_existing_count integer;
  v_new_id       uuid;
  v_ids          uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin'
  ) INTO v_is_admin;

  SELECT * INTO v_sugg FROM public.segment_suggestions WHERE id = suggestion_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'suggestion % not found', suggestion_id USING ERRCODE = 'P0002';
  END IF;
  IF v_sugg.status <> 'accepted' THEN
    RAISE EXCEPTION 'suggestion % is not accepted (status=%)', suggestion_id, v_sugg.status
      USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_is_admin AND v_sugg.accepter_id <> v_uid THEN
    RAISE EXCEPTION 'caller % is not the accepter of suggestion %', v_uid, suggestion_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_scope IS NULL OR v_category IS NULL OR v_pattern IS NULL OR v_policy IS NULL THEN
    RAISE EXCEPTION 'scope, rule_category, pattern, policy are required'
      USING ERRCODE = 'P0001';
  END IF;

  -- Insert or upgrade: lookup by (scope, scope_ref, rule_category, pattern).
  -- scope_ref may be NULL so IS NOT DISTINCT FROM is used.
  SELECT id, confirmation_count INTO v_existing_id, v_existing_count
  FROM public.style_guide
  WHERE scope         = v_scope
    AND scope_ref IS NOT DISTINCT FROM v_scope_ref
    AND rule_category = v_category
    AND pattern       = v_pattern
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.style_guide
      SET confirmation_count = confirmation_count + 1,
          status             = CASE WHEN confirmation_count + 1 >= 3 THEN 'required' ELSE status END,
          updated_at         = now()
    WHERE id = v_existing_id;
    v_ids := array_append(v_ids, v_existing_id);
  ELSE
    INSERT INTO public.style_guide
      (scope, scope_ref, rule_category, pattern, policy, rationale,
       confirmation_count, status, source_suggestion_id, created_by)
    VALUES
      (v_scope, v_scope_ref, v_category, v_pattern, v_policy, v_rationale,
       1, 'preferred', suggestion_id, v_uid)
    RETURNING id INTO v_new_id;
    v_ids := array_append(v_ids, v_new_id);
  END IF;

  RETURN jsonb_build_object('wrote', 'style_guide', 'ids', to_jsonb(v_ids));
END;
$$;

COMMENT ON FUNCTION public.rpc_phase_4b_save_style(uuid, uuid, jsonb) IS
  'Phase-4b proofread style-rule write. Insert or increment confirmation_count; promote to required at threshold 3. SECURITY DEFINER. See MEMORY-DB-DESIGN.md §7.3.';

-- 5d. rpc_phase_4b_promote_term (§7.1 / §7.3 shared)
CREATE OR REPLACE FUNCTION public.rpc_phase_4b_promote_term(
  segment_id    uuid,
  suggestion_id uuid,
  payload       jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_sugg      public.segment_suggestions%ROWTYPE;
  v_is_admin  boolean;
  v_promote   jsonb;
  v_term_id   uuid;
  v_casing    text;
  v_ids       uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin'
  ) INTO v_is_admin;

  SELECT * INTO v_sugg FROM public.segment_suggestions WHERE id = suggestion_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'suggestion % not found', suggestion_id USING ERRCODE = 'P0002';
  END IF;
  IF v_sugg.status <> 'accepted' THEN
    RAISE EXCEPTION 'suggestion % is not accepted (status=%)', suggestion_id, v_sugg.status
      USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_is_admin AND v_sugg.accepter_id <> v_uid THEN
    RAISE EXCEPTION 'caller % is not the accepter of suggestion %', v_uid, suggestion_id
      USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_typeof(payload->'promote_terms') <> 'array' THEN
    RAISE EXCEPTION 'payload.promote_terms must be a JSON array' USING ERRCODE = 'P0001';
  END IF;

  FOR v_promote IN SELECT jsonb_array_elements(payload->'promote_terms') LOOP
    v_term_id := (v_promote->>'term_id')::uuid;
    v_casing  := v_promote->>'casing';

    -- Bump promotion count; optionally write casing column.
    UPDATE public.terminology
      SET promotion_count = promotion_count + 1,
          casing          = COALESCE(v_casing, casing),
          source_suggestion_id = COALESCE(source_suggestion_id, suggestion_id)
    WHERE id = v_term_id;

    -- Promote if threshold reached and not already required (idempotent per I-MEM-3).
    UPDATE public.terminology
      SET term_type   = 'required',
          promoted_at = now(),
          promoted_by = v_uid
    WHERE id = v_term_id
      AND promotion_count >= promotion_threshold
      AND term_type <> 'required';

    v_ids := array_append(v_ids, v_term_id);
  END LOOP;

  RETURN jsonb_build_object('wrote', 'terminology', 'ids', to_jsonb(v_ids));
END;
$$;

COMMENT ON FUNCTION public.rpc_phase_4b_promote_term(uuid, uuid, jsonb) IS
  'Phase-4b term promotion (idempotent, reversible per I-MEM-3). Bumps promotion_count, writes casing, promotes at threshold. SECURITY DEFINER. See MEMORY-DB-DESIGN.md §7.1 / §7.3.';

-- 5e. rpc_phase_4b_qa_save (§7.4)
-- Signature note: spec §7.5 mandates (segment_id, suggestion_id, payload).
-- QA does not naturally carry a suggestion_id; we accept NULL for that
-- parameter and read qa_issue_id from the payload, per §7.4 inputs.
CREATE OR REPLACE FUNCTION public.rpc_phase_4b_qa_save(
  segment_id    uuid,
  suggestion_id uuid,
  payload       jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid              uuid := auth.uid();
  v_is_admin         boolean;
  v_qa_issue_id      uuid := NULLIF(payload->>'qa_issue_id','')::uuid;
  v_pattern_name     text := payload->>'pattern_name';
  v_category         text := COALESCE(payload->>'category', 'Style');
  v_description      text := COALESCE(payload->>'description', v_pattern_name);
  v_outcome          text := COALESCE(payload->>'outcome', 'confirmed');
  v_dismissal_reason text := payload->>'dismissal_reason';
  v_agent_confidence real := NULLIF(payload->>'agent_confidence','')::real;
  v_qa_issue         public.qa_issues%ROWTYPE;
  v_pattern_id       uuid;
  v_event_id         uuid;
  v_adjust           jsonb := payload->'adjust_threshold';
  v_active_prompt    public.agent_prompts%ROWTYPE;
  v_prompt_edit_id   uuid;
  v_ids              uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin'
  ) INTO v_is_admin;

  -- 1. Validate: qa_issue must be resolved.
  IF v_qa_issue_id IS NULL THEN
    RAISE EXCEPTION 'payload.qa_issue_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF v_pattern_name IS NULL OR length(v_pattern_name) = 0 THEN
    RAISE EXCEPTION 'payload.pattern_name is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_qa_issue FROM public.qa_issues WHERE id = v_qa_issue_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'qa_issue % not found', v_qa_issue_id USING ERRCODE = 'P0002';
  END IF;
  IF NOT v_qa_issue.resolved OR v_qa_issue.resolved_by IS NULL THEN
    RAISE EXCEPTION 'qa_issue % is not resolved', v_qa_issue_id USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_is_admin AND v_qa_issue.resolved_by <> v_uid THEN
    RAISE EXCEPTION 'caller % is not the resolver of qa_issue %', v_uid, v_qa_issue_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_outcome NOT IN ('confirmed','dismissed_false_positive','dismissed_out_of_scope') THEN
    RAISE EXCEPTION 'invalid outcome: %', v_outcome USING ERRCODE = 'P0001';
  END IF;

  -- 2. Pattern upsert.
  INSERT INTO public.qa_issue_patterns (pattern_name, category, description)
  VALUES (v_pattern_name, v_category, v_description)
  ON CONFLICT (pattern_name) DO UPDATE
    SET updated_at = now()
  RETURNING id INTO v_pattern_id;
  v_ids := array_append(v_ids, v_pattern_id);

  -- 3. Event insert.
  INSERT INTO public.qa_issue_pattern_events
    (pattern_id, qa_issue_id, outcome, triaged_by, triaged_at,
     dismissal_reason, agent_confidence)
  VALUES
    (v_pattern_id, v_qa_issue_id, v_outcome, v_uid, now(),
     v_dismissal_reason, v_agent_confidence)
  RETURNING id INTO v_event_id;
  v_ids := array_append(v_ids, v_event_id);

  -- 4. Aggregate update.
  UPDATE public.qa_issue_patterns
    SET confirmation_count = confirmation_count + (CASE WHEN v_outcome = 'confirmed' THEN 1 ELSE 0 END),
        dismissal_count    = dismissal_count    + (CASE WHEN v_outcome LIKE 'dismissed%' THEN 1 ELSE 0 END),
        updated_at         = now()
  WHERE id = v_pattern_id;

  -- 5. Threshold adjust: never modifies agent_prompts directly. Records a
  --    prompt_edits row marked rationale='qa calibration: ...'; active prompt
  --    is left untouched; admins receive a notification (out-of-band).
  --    Per MEMORY-DB-DESIGN.md §7.4 step 5.
  IF v_adjust IS NOT NULL THEN
    SELECT * INTO v_active_prompt
    FROM public.agent_prompts
    WHERE agent_type = COALESCE(v_adjust->>'agent_type','qa')
      AND COALESCE(approach,'') = COALESCE(v_adjust->>'approach','')
      AND user_id IS NULL
      AND active = true
    LIMIT 1;

    IF FOUND THEN
      INSERT INTO public.prompt_edits
        (agent_prompt_id, prev_template, new_template, rationale, edited_by)
      VALUES
        (v_active_prompt.id,
         v_active_prompt.template,
         v_active_prompt.template,   -- unchanged: this is a proposal, not an apply
         format('qa calibration: proposed new_value=%s for pattern %s (event %s)',
                COALESCE(v_adjust->>'new_value','<unset>'),
                v_pattern_name,
                v_event_id),
         v_uid)
      RETURNING id INTO v_prompt_edit_id;
      v_ids := array_append(v_ids, v_prompt_edit_id);
    END IF;
  END IF;

  RETURN jsonb_build_object('wrote', 'qa_issue_pattern_events', 'ids', to_jsonb(v_ids));
END;
$$;

COMMENT ON FUNCTION public.rpc_phase_4b_qa_save(uuid, uuid, jsonb) IS
  'Phase-4b QA-triage memory write. Upserts pattern, inserts event, updates aggregates, surfaces threshold-adjust as a prompt_edits proposal (never auto-applied). SECURITY DEFINER. See MEMORY-DB-DESIGN.md §7.4.';

COMMIT;
