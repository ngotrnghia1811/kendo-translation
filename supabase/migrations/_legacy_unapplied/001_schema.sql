-- Kendo Translation Platform — Initial Schema
-- Migration 001: Core tables

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  display_name TEXT,
  role         TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'translator', 'reviewer', 'viewer')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Articles table (source documents)
CREATE TABLE IF NOT EXISTS public.articles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  content_ja         TEXT,
  content_en         TEXT,
  source_lang        TEXT NOT NULL DEFAULT 'ja' CHECK (source_lang IN ('ja', 'en')),
  target_lang        TEXT NOT NULL DEFAULT 'en' CHECK (target_lang IN ('ja', 'en')),
  translation_status TEXT NOT NULL DEFAULT 'pending' CHECK (translation_status IN ('pending', 'in_progress', 'complete')),
  segmented          BOOLEAN NOT NULL DEFAULT false,
  segment_count      INT NOT NULL DEFAULT 0,
  created_by         UUID REFERENCES public.profiles(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Segments table (aligned sentence pairs)
CREATE TABLE IF NOT EXISTS public.segments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id    UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  position      INT NOT NULL,
  source_text   TEXT NOT NULL,
  target_text   TEXT,
  source_lang   TEXT NOT NULL DEFAULT 'ja',
  target_lang   TEXT NOT NULL DEFAULT 'en',
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'translated', 'reviewed', 'approved')),
  locked_by     UUID REFERENCES public.profiles(id),
  locked_at     TIMESTAMPTZ,
  translated_by UUID REFERENCES public.profiles(id),
  reviewed_by   UUID REFERENCES public.profiles(id),
  quality_score NUMERIC(4,3),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, position)
);

-- Segment quality details
CREATE TABLE IF NOT EXISTS public.segment_quality (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id    UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  fluency       NUMERIC(4,3),
  adequacy      NUMERIC(4,3),
  terminology   NUMERIC(4,3),
  style         NUMERIC(4,3),
  overall       NUMERIC(4,3),
  routing       TEXT,
  issues        JSONB DEFAULT '[]',
  summary       TEXT,
  scored_by     UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Segment revision history
CREATE TABLE IF NOT EXISTS public.segment_revisions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id  UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  target_text TEXT NOT NULL,
  edited_by   UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id),
  content    TEXT NOT NULL,
  resolved   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Translation memory
CREATE TABLE IF NOT EXISTS public.translation_memory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text  TEXT NOT NULL,
  target_text  TEXT NOT NULL,
  source_lang  TEXT NOT NULL DEFAULT 'ja',
  target_lang  TEXT NOT NULL DEFAULT 'en',
  domain       TEXT,
  quality_score NUMERIC(4,3),
  article_id   UUID REFERENCES public.articles(id),
  user_id      UUID REFERENCES public.profiles(id),
  helpful_count INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Terminology database
CREATE TABLE IF NOT EXISTS public.terminology (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  japanese_term  TEXT NOT NULL,
  english_term   TEXT NOT NULL,
  domain         TEXT NOT NULL DEFAULT 'kendo',
  type           TEXT NOT NULL DEFAULT 'preferred' CHECK (type IN ('required', 'preferred', 'do_not_translate', 'forbidden')),
  part_of_speech TEXT,
  notes          TEXT,
  alternatives   TEXT[],
  confidence     NUMERIC(4,3) NOT NULL DEFAULT 0.9,
  created_by     UUID REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (japanese_term, domain)
);

-- Prompt templates
CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  approach   TEXT NOT NULL,
  template   TEXT NOT NULL,
  version    INT NOT NULL DEFAULT 1,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_type, approach, version)
);

-- Agent logs
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type      TEXT NOT NULL,
  model           TEXT NOT NULL,
  prompt_tokens   INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  duration_ms     INT NOT NULL DEFAULT 0,
  article_id      UUID REFERENCES public.articles(id),
  user_id         UUID REFERENCES public.profiles(id),
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_segments_article_id ON public.segments(article_id);
CREATE INDEX IF NOT EXISTS idx_segments_status ON public.segments(status);
CREATE INDEX IF NOT EXISTS idx_segments_locked_by ON public.segments(locked_by);
CREATE INDEX IF NOT EXISTS idx_tm_source_lang ON public.translation_memory(source_lang);
CREATE INDEX IF NOT EXISTS idx_tm_domain ON public.translation_memory(domain);
CREATE INDEX IF NOT EXISTS idx_terminology_domain ON public.terminology(domain);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_type ON public.agent_logs(agent_type);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_articles_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_segments_updated_at BEFORE UPDATE ON public.segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
