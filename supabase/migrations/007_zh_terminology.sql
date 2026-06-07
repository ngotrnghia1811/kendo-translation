-- 007_zh_terminology.sql
-- Adds zh_notes column to terminology for Chinese glosses/definitions,
-- and modifies the segments unique constraint to support ZH rows at the
-- same article_id+position (differentiated by target_lang).

-- 1. Add zh_notes to terminology
ALTER TABLE public.terminology ADD COLUMN IF NOT EXISTS zh_notes TEXT;
COMMENT ON COLUMN public.terminology.zh_notes IS 'Chinese gloss or definition for the term. Populated by the trilingual reference importer.';

-- 2. Replace (article_id, position) unique key with (article_id, position, target_lang)
--    so that JA→EN and JA→ZH segments can coexist at the same position.
ALTER TABLE public.segments DROP CONSTRAINT IF EXISTS segments_article_id_position_key;
ALTER TABLE public.segments ADD CONSTRAINT segments_article_id_position_target_lang_key UNIQUE (article_id, position, target_lang);
