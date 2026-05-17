-- Kendo Translation Platform
-- Migration 004: Phase Workflow + Cooperation Schema
--
-- Implements Contract v1.2 requirements: R1, R2, R4, R5, R6, R9, R10, R11.
-- See .opencode/aki-q/contract-1778926777773.yaml for the authoritative spec.
--
-- This migration is destructive in two specific ways:
--   (a) profiles.role CHECK constraint changes; legacy 'viewer'/'reviewer' rows are
--       data-migrated to 'reader'/'translator' BEFORE the CHECK swap.
--   (b) segments.status CHECK constraint changes; legacy 'reviewed'/'approved' rows
--       are data-migrated to 'edited'/'qa_approved' BEFORE the CHECK swap.
-- Conservative mapping decisions (per v1.1 verdict resolution):
--   reviewed → edited       (NOT proofread; existing "reviewed" is closer to edit pass)
--   approved → qa_approved  (final-state preservation)
--
-- Folded-in pre-flight fixes (not in v1.2 contract; surfaced by Wave-1 sub-unit 0):
--   F1. ALTER TABLE segments DROP COLUMN quality_score
--       (orphan column on segments; v1.2 R9 dropped segment_quality TABLE but
--        not this separate quality_score COLUMN. App reads it via QualityBadge
--        which is being replaced by QAIssueBadge — column is now unreferenced.)
--   F2. Redefine is_translator() to check role IN ('admin', 'translator') only
--       (legacy 'reviewer' role no longer exists after role-data migration).
--
-- OPERATOR PRE-FLIGHT (run separately BEFORE applying this migration to a live DB):
--   SELECT role, COUNT(*) FROM profiles GROUP BY role;
--   SELECT status, COUNT(*) FROM segments GROUP BY status;
--   SELECT COUNT(*) FROM segment_quality;
--   SELECT COUNT(*) FROM segments WHERE quality_score IS NOT NULL;
-- If profiles has rows with role NOT IN ('admin','translator','reviewer','viewer')
-- or segments has rows with status NOT IN ('draft','translated','reviewed','approved'),
-- review the mappings below before proceeding. The migration is gated on the
-- zero-production-data assumption per v1.2 constraint.

BEGIN;

-- =============================================================================
-- 0. Informational pre-flight: report row counts so the apply-log is auditable.
-- =============================================================================
DO $$
DECLARE
  v_profiles_total INT;
  v_segments_total INT;
  v_quality_total INT := -1;  -- sentinel: -1 means table does not exist
  v_qs_nonnull INT := -1;     -- sentinel: -1 means column does not exist
BEGIN
  SELECT COUNT(*) INTO v_profiles_total FROM public.profiles;
  SELECT COUNT(*) INTO v_segments_total FROM public.segments;

  -- segment_quality may already have been dropped (idempotent re-application)
  IF to_regclass('public.segment_quality') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.segment_quality' INTO v_quality_total;
  END IF;

  -- segments.quality_score may already have been dropped (idempotent re-application)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'segments' AND column_name = 'quality_score'
  ) THEN
    EXECUTE 'SELECT COUNT(*) FROM public.segments WHERE quality_score IS NOT NULL' INTO v_qs_nonnull;
  END IF;

  RAISE NOTICE 'Migration 004 pre-flight: profiles=%, segments=%, segment_quality=% (-1 = absent), segments.quality_score(non-null)=% (-1 = column absent)',
    v_profiles_total, v_segments_total, v_quality_total, v_qs_nonnull;
END $$;

-- =============================================================================
-- 1. Roles migration (R2)
--    Global roles: {admin, translator, reviewer, viewer} → {admin, translator, reader}
-- =============================================================================

-- 1a. Data-migrate existing rows (must precede CHECK swap)
UPDATE public.profiles SET role = 'reader'     WHERE role = 'viewer';
UPDATE public.profiles SET role = 'translator' WHERE role = 'reviewer';

-- 1b. Drop the old CHECK constraint (unnamed in 001; find dynamically)
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype  = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_conname);
    RAISE NOTICE 'Dropped profiles role CHECK: %', v_conname;
  END IF;
END $$;

-- 1c. Add the new CHECK + default
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'translator', 'reader'));

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'reader';

-- 1d. Update handle_new_user() to default new signups to 'reader'
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'reader'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 2. Folded fix F2: rebind is_translator() to the new role set
--    (Removes stale reference to 'reviewer' which no longer exists.)
-- =============================================================================
CREATE OR REPLACE FUNCTION is_translator()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'translator')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- 3. Segments status migration (R1)
--    Status set: {draft, translated, reviewed, approved}
--              → {draft, translated, edited, proofread, qa_approved}
-- =============================================================================

-- 3a. Data-migrate (conservative mapping)
UPDATE public.segments SET status = 'edited'      WHERE status = 'reviewed';
UPDATE public.segments SET status = 'qa_approved' WHERE status = 'approved';

-- 3b. Drop old CHECK
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.segments'::regclass
    AND contype  = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.segments DROP CONSTRAINT %I', v_conname);
    RAISE NOTICE 'Dropped segments status CHECK: %', v_conname;
  END IF;
END $$;

-- 3c. Add new CHECK
ALTER TABLE public.segments
  ADD CONSTRAINT segments_status_check
  CHECK (status IN ('draft', 'translated', 'edited', 'proofread', 'qa_approved'));

-- =============================================================================
-- 4. Folded fix F1: drop the orphan segments.quality_score column
-- =============================================================================
ALTER TABLE public.segments DROP COLUMN IF EXISTS quality_score;

-- =============================================================================
-- 5. document_assignments table (R2)
--    Per-document, per-phase capability grants.
--    NOTE: "document" maps to existing `articles` table (segments.article_id).
--          v1.2 uses "document_assignments" naming; the FK targets articles(id).
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.document_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_id     UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  allowed_phases  TEXT[] NOT NULL DEFAULT '{}'
                  CHECK (allowed_phases <@ ARRAY['translate','edit','proofread','qa']),
  assigned_by     UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_document_assignments_user
  ON public.document_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_document_assignments_doc
  ON public.document_assignments(document_id);

ALTER TABLE public.document_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_assignments_read_all"
  ON public.document_assignments FOR SELECT USING (true);
CREATE POLICY "doc_assignments_admin_write"
  ON public.document_assignments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER set_document_assignments_updated_at
  BEFORE UPDATE ON public.document_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. segment_phase_transitions table (R1, R10)
--    Auditable forward-only (admin-rewind) phase transitions.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.segment_phase_transitions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id          UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  from_status         TEXT NOT NULL,
  to_status           TEXT NOT NULL,
  actor_id            UUID REFERENCES public.profiles(id),
  acknowledged_minor  BOOLEAN NOT NULL DEFAULT false,
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_segment_phase_transitions_segment
  ON public.segment_phase_transitions(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_phase_transitions_actor
  ON public.segment_phase_transitions(actor_id);

ALTER TABLE public.segment_phase_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phase_transitions_read_all"
  ON public.segment_phase_transitions FOR SELECT USING (true);
CREATE POLICY "phase_transitions_insert_authenticated"
  ON public.segment_phase_transitions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- 7. segment_suggestions table (R5)
--    Proposed-edit overlays from non-locking users.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.segment_suggestions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id     UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  suggester_id   UUID NOT NULL REFERENCES public.profiles(id),
  suggester_kind TEXT NOT NULL DEFAULT 'human'
                 CHECK (suggester_kind IN ('human', 'agent')),
  proposed_text  TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'rejected', 'superseded')),
  accepter_id    UUID REFERENCES public.profiles(id),
  accepted_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_segment_suggestions_segment
  ON public.segment_suggestions(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_suggestions_status
  ON public.segment_suggestions(status);

ALTER TABLE public.segment_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suggestions_read_all"
  ON public.segment_suggestions FOR SELECT USING (true);
CREATE POLICY "suggestions_insert_authenticated"
  ON public.segment_suggestions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "suggestions_update_own_or_accepter"
  ON public.segment_suggestions FOR UPDATE
  USING (suggester_id = auth.uid() OR accepter_id = auth.uid() OR is_admin());

-- =============================================================================
-- 8. qa_issues table (R9, R10)
--    Replaces segment_quality. Taxonomy-tagged issues with severity.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.qa_issues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id    UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  category      TEXT NOT NULL
                CHECK (category IN (
                  'Mistranslation',
                  'Terminology',
                  'Register/Keigo',
                  'Fluency',
                  'Cultural-adaptation',
                  'Omission/Addition',
                  'Style'
                )),
  severity      TEXT NOT NULL
                CHECK (severity IN ('minor', 'major', 'critical')),
  char_start    INT,
  char_end      INT,
  body          TEXT,
  author_id     UUID REFERENCES public.profiles(id),
  author_kind   TEXT NOT NULL DEFAULT 'human'
                CHECK (author_kind IN ('human', 'agent')),
  resolved      BOOLEAN NOT NULL DEFAULT false,
  resolved_by   UUID REFERENCES public.profiles(id),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qa_issues_segment
  ON public.qa_issues(segment_id);
CREATE INDEX IF NOT EXISTS idx_qa_issues_unresolved
  ON public.qa_issues(segment_id, severity)
  WHERE resolved = false;

ALTER TABLE public.qa_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qa_issues_read_all"
  ON public.qa_issues FOR SELECT USING (true);
CREATE POLICY "qa_issues_insert_authenticated"
  ON public.qa_issues FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "qa_issues_update_authenticated"
  ON public.qa_issues FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "qa_issues_delete_admin"
  ON public.qa_issues FOR DELETE USING (is_admin());

-- =============================================================================
-- 9. is_assigned_to_phase(document_id, phase) helper (R2)
--    Used by RLS to gate per-segment writes by per-document phase permission.
-- =============================================================================
CREATE OR REPLACE FUNCTION is_assigned_to_phase(p_document_id UUID, p_phase TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.document_assignments
    WHERE user_id     = auth.uid()
      AND document_id = p_document_id
      AND p_phase = ANY (allowed_phases)
  ) OR is_admin();
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- 10. RLS rewrite for segments_update (R2)
--    The phase a segment is currently in determines which assigned-phase a user
--    needs to be able to update it:
--       draft       → user must have 'translate'
--       translated  → user must have 'edit'
--       edited      → user must have 'proofread'
--       proofread   → user must have 'qa'
--       qa_approved → admin-only (rewind path)
-- =============================================================================
-- Drop both the legacy v2 policy name (live DB) and the in-repo policy name
-- (would have come from 001/002 if they had ever been applied). Either may
-- exist depending on environment.
DROP POLICY IF EXISTS "segments_update" ON public.segments;
DROP POLICY IF EXISTS "segments_update_translator" ON public.segments;

CREATE POLICY "segments_update_phase_assigned"
  ON public.segments FOR UPDATE
  USING (
    (locked_by IS NULL OR locked_by = auth.uid())
    AND (
      is_admin()
      OR (status = 'draft'      AND is_assigned_to_phase(article_id, 'translate'))
      OR (status = 'translated' AND is_assigned_to_phase(article_id, 'edit'))
      OR (status = 'edited'     AND is_assigned_to_phase(article_id, 'proofread'))
      OR (status = 'proofread'  AND is_assigned_to_phase(article_id, 'qa'))
    )
  );

-- =============================================================================
-- 11. Comments threading (R4)
--    Adjacency-list extension: parent_comment_id + mentions[].
--    Live DB table is `segment_comments` (from kendo-translation-v2 lineage);
--    see 000_baseline_snapshot.sql and .opencode/aki-q/schema-audit-1778975112.md.
-- =============================================================================
ALTER TABLE public.segment_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID
    REFERENCES public.segment_comments(id) ON DELETE CASCADE;

ALTER TABLE public.segment_comments
  ADD COLUMN IF NOT EXISTS mentions UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_segment_comments_parent
  ON public.segment_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_segment_comments_segment
  ON public.segment_comments(segment_id);

-- =============================================================================
-- 12. Drop segment_quality table (R9)
--    Replaced entirely by qa_issues. CASCADE drops the 3 policies on it.
-- =============================================================================
DROP TABLE IF EXISTS public.segment_quality CASCADE;

-- =============================================================================
-- 13. Realtime publication expansion (R11)
--    Idempotent ALTERs guarded against duplicate-object errors.
-- =============================================================================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.segment_comments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.segment_suggestions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_issues;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.segment_phase_transitions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.document_assignments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

COMMIT;
