-- =============================================================================
-- 008 — Add publish_filter to document_settings
--
-- Adds a per-document reader visibility gate.
-- 'any_translated'  (default) — reader sees any segment with non-empty
--                               target_text (existing behaviour).
-- 'qa_approved'               — reader only sees qa_approved segments.
-- =============================================================================

ALTER TABLE public.document_settings
  ADD COLUMN IF NOT EXISTS publish_filter TEXT NOT NULL DEFAULT 'any_translated';

-- Validate values on insert / update
ALTER TABLE public.document_settings
  DROP CONSTRAINT IF EXISTS document_settings_publish_filter_check;

ALTER TABLE public.document_settings
  ADD CONSTRAINT document_settings_publish_filter_check
  CHECK (publish_filter IN ('any_translated', 'qa_approved'));
