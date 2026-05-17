-- =============================================================================
-- 000 — Baseline schema snapshot
--
-- This file describes the CURRENT live state of the Supabase 'public' schema
-- on project mbgmyvmsvenvtecvrjia as of 2026-05-16T23:51:09.964Z.
--
-- It is reconstructed from information_schema + pg_catalog and is NOT meant
-- to be re-applied to the same DB. It serves as the authoritative baseline
-- against which migration 004+ are authored, and as the bootstrap script for
-- fresh-environment installs (CI, local dev databases).
--
-- See .opencode/aki-q/schema-audit-1778975112.md for the audit that led to
-- this re-baselining.
-- =============================================================================

-- ---- Table: agent_logs ----
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  article_id uuid,
  video_id uuid,
  agent_type varchar(50) NOT NULL,
  model varchar(255) NOT NULL,
  system_prompt text,
  user_prompt text NOT NULL,
  response text,
  prompt_tokens integer,
  completion_tokens integer,
  duration_ms integer,
  error text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agent_logs_article_id_fkey FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT agent_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT agent_logs_video_id_fkey FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  CONSTRAINT agent_logs_pkey PRIMARY KEY (id)
);

-- ---- Table: agent_prompts ----
CREATE TABLE IF NOT EXISTS public.agent_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  agent_type varchar(50) NOT NULL,
  approach varchar(50),
  template text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agent_prompts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT agent_prompts_pkey PRIMARY KEY (id),
  CONSTRAINT agent_prompts_user_id_agent_type_approach_key UNIQUE (user_id, agent_type, approach)
);

-- ---- Table: articles ----
CREATE TABLE IF NOT EXISTS public.articles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  content_ja text,
  content_en text,
  source_url text,
  tags text[],
  translation_status text DEFAULT 'pending'::text,
  quality_score double precision,
  updated_at timestamp with time zone DEFAULT now(),
  source_url_en text,
  source_url_ja text,
  match_score double precision,
  title_ja text,
  translator_id uuid,
  segmented boolean DEFAULT false,
  segment_count integer DEFAULT 0,
  CONSTRAINT articles_translator_id_fkey FOREIGN KEY (translator_id) REFERENCES auth.users(id),
  CONSTRAINT articles_pkey PRIMARY KEY (id)
);

-- ---- Table: bookmarks ----
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  content_type varchar(20) NOT NULL,
  content_id uuid NOT NULL,
  title text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookmarks_pkey PRIMARY KEY (id),
  CONSTRAINT bookmarks_user_id_content_type_content_id_key UNIQUE (user_id, content_type, content_id)
);

-- ---- Table: document_settings ----
CREATE TABLE IF NOT EXISTS public.document_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  source_lang text NOT NULL DEFAULT 'ja'::text,
  target_lang text NOT NULL DEFAULT 'en'::text,
  paragraph_boundaries integer[] DEFAULT '{}'::integer[],
  total_segments integer DEFAULT 0,
  translated_count integer DEFAULT 0,
  reviewed_count integer DEFAULT 0,
  approved_count integer DEFAULT 0,
  assigned_translators uuid[] DEFAULT '{}'::uuid[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT document_settings_article_id_fkey FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT document_settings_pkey PRIMARY KEY (id),
  CONSTRAINT document_settings_article_id_key UNIQUE (article_id)
);

-- ---- Table: profiles ----
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  username text,
  role text NOT NULL DEFAULT 'reader'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'translator'::text, 'reader'::text]))),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- ---- Table: reading_progress ----
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  content_type varchar(20) NOT NULL,
  content_id uuid NOT NULL,
  progress_pct numeric DEFAULT 0,
  last_position integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reading_progress_pkey PRIMARY KEY (id)
);

-- ---- Table: segment_comments ----
CREATE TABLE IF NOT EXISTS public.segment_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  segment_id uuid,
  user_id uuid,
  content text NOT NULL,
  resolved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT segment_comments_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE,
  CONSTRAINT segment_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id),
  CONSTRAINT segment_comments_pkey PRIMARY KEY (id)
);

-- ---- Table: segment_revisions ----
CREATE TABLE IF NOT EXISTS public.segment_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  segment_id uuid,
  target_text text NOT NULL,
  edited_by uuid,
  quality_score real,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT segment_revisions_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES profiles(id),
  CONSTRAINT segment_revisions_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE,
  CONSTRAINT segment_revisions_pkey PRIMARY KEY (id)
);

-- ---- Table: segments ----
CREATE TABLE IF NOT EXISTS public.segments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  position integer NOT NULL,
  source_text text NOT NULL,
  target_text text,
  source_lang text NOT NULL DEFAULT 'ja'::text,
  target_lang text NOT NULL DEFAULT 'en'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  locked_by uuid,
  locked_at timestamp with time zone,
  translated_by uuid,
  reviewed_by uuid,
  quality_score real,
  quality_detail jsonb,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT segments_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'translated'::text, 'reviewed'::text, 'approved'::text]))),
  CONSTRAINT segments_article_id_fkey FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT segments_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES profiles(id),
  CONSTRAINT segments_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id),
  CONSTRAINT segments_translated_by_fkey FOREIGN KEY (translated_by) REFERENCES profiles(id),
  CONSTRAINT segments_pkey PRIMARY KEY (id),
  CONSTRAINT segments_article_id_position_key UNIQUE (article_id, "position")
);

-- ---- Table: terminology ----
CREATE TABLE IF NOT EXISTS public.terminology (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_term text NOT NULL,
  target_term text NOT NULL,
  reading text,
  domain text DEFAULT 'kendo'::text,
  term_type text DEFAULT 'preferred'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT terminology_pkey PRIMARY KEY (id)
);

-- ---- Table: translation_memory ----
CREATE TABLE IF NOT EXISTS public.translation_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_text text NOT NULL,
  target_text text NOT NULL,
  source_lang varchar(10) DEFAULT 'ja'::character varying,
  target_lang varchar(10) DEFAULT 'en'::character varying,
  domain varchar(50) DEFAULT 'kendo'::character varying,
  quality varchar(20),
  human_approved boolean DEFAULT false,
  source_url varchar(500),
  embedding vector,
  created_at timestamp with time zone DEFAULT now(),
  source_tsv tsvector,
  created_by uuid,
  article_id uuid,
  usage_count integer DEFAULT 0,
  last_used_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT translation_memory_article_id_fkey FOREIGN KEY (article_id) REFERENCES articles(id),
  CONSTRAINT translation_memory_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT translation_memory_pkey PRIMARY KEY (id)
);

-- ---- Table: user_history ----
CREATE TABLE IF NOT EXISTS public.user_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  item_title text NOT NULL,
  last_position integer DEFAULT 0,
  visited_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_history_item_type_check CHECK ((item_type = ANY (ARRAY['article'::text, 'video'::text]))),
  CONSTRAINT user_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_history_pkey PRIMARY KEY (id),
  CONSTRAINT user_history_unique_item UNIQUE (user_id, item_type, item_id)
);

-- ---- Table: users ----
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email)
);

-- ---- Table: video_notes ----
CREATE TABLE IF NOT EXISTS public.video_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  video_id uuid,
  user_id uuid,
  start_time double precision NOT NULL,
  end_time double precision,
  text text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  note_text text,
  CONSTRAINT video_notes_video_id_fkey FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  CONSTRAINT video_notes_pkey PRIMARY KEY (id)
);

-- ---- Table: videos ----
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  youtube_id text NOT NULL,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  duration_seconds integer,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT videos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT videos_pkey PRIMARY KEY (id),
  CONSTRAINT videos_youtube_id_key UNIQUE (youtube_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS bookmarks_user_idx ON public.bookmarks USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_article ON public.agent_logs USING btree (article_id) WHERE (article_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON public.agent_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_user ON public.agent_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_video ON public.agent_logs USING btree (video_id) WHERE (video_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON public.articles USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_translation_status ON public.articles USING btree (translation_status);
CREATE INDEX IF NOT EXISTS idx_articles_translator_id ON public.articles USING btree (translator_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_content ON public.bookmarks USING btree (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_document_settings_article_id ON public.document_settings USING btree (article_id);
CREATE INDEX IF NOT EXISTS idx_segment_comments_segment_id ON public.segment_comments USING btree (segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_revisions_segment_id ON public.segment_revisions USING btree (segment_id);
CREATE INDEX IF NOT EXISTS idx_segments_article_id ON public.segments USING btree (article_id);
CREATE INDEX IF NOT EXISTS idx_segments_article_position ON public.segments USING btree (article_id, "position");
CREATE INDEX IF NOT EXISTS idx_segments_locked_by ON public.segments USING btree (locked_by) WHERE (locked_by IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_segments_status ON public.segments USING btree (status);
CREATE INDEX IF NOT EXISTS idx_terminology_domain ON public.terminology USING btree (domain);
CREATE INDEX IF NOT EXISTS idx_terminology_reading ON public.terminology USING btree (reading);
CREATE INDEX IF NOT EXISTS idx_terminology_source ON public.terminology USING btree (source_term);
CREATE INDEX IF NOT EXISTS idx_terminology_target ON public.terminology USING btree (target_term);
CREATE INDEX IF NOT EXISTS idx_tm_domain ON public.translation_memory USING btree (domain);
CREATE INDEX IF NOT EXISTS idx_tm_human_approved ON public.translation_memory USING btree (human_approved);
CREATE INDEX IF NOT EXISTS idx_tm_quality ON public.translation_memory USING btree (quality DESC);
CREATE INDEX IF NOT EXISTS idx_tm_source_text ON public.translation_memory USING gin (source_tsv);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_video_notes_start_time ON public.video_notes USING btree (start_time);
CREATE INDEX IF NOT EXISTS idx_video_notes_video_id ON public.video_notes USING btree (video_id);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON public.videos USING btree (youtube_id);
CREATE INDEX IF NOT EXISTS reading_progress_user_idx ON public.reading_progress USING btree (user_id);
CREATE INDEX IF NOT EXISTS tm_domain_idx ON public.translation_memory USING btree (domain);
CREATE INDEX IF NOT EXISTS tm_embedding_idx ON public.translation_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminology ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can view all agent logs" ON public.agent_logs
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own agent logs" ON public.agent_logs
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view their own agent logs" ON public.agent_logs
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage their own agent prompts" ON public.agent_prompts
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view their own agent prompts" ON public.agent_prompts
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Articles are viewable by everyone" ON public.articles
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert articles" ON public.articles
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((auth.role() = 'authenticated'::text))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update articles" ON public.articles
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((auth.role() = 'authenticated'::text))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "articles_anon_insert" ON public.articles
    AS PERMISSIVE
    FOR INSERT
    TO anon
    WITH CHECK (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "articles_auth_insert" ON public.articles
    AS PERMISSIVE
    FOR INSERT
    TO authenticated
    WITH CHECK (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public delete" ON public.bookmarks
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public insert" ON public.bookmarks
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read" ON public.bookmarks
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create bookmarks" ON public.bookmarks
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can read own bookmarks" ON public.bookmarks
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "doc_settings_read" ON public.document_settings
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "doc_settings_write" ON public.document_settings
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read all profiles" ON public.profiles
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (is_admin())
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update any profile" ON public.profiles
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (is_admin())
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can read own profile" ON public.profiles
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own profile" ON public.profiles
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((auth.uid() = id))
    WITH CHECK ((auth.uid() = id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own profile" ON public.profiles
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public insert" ON public.reading_progress
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read" ON public.reading_progress
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public update" ON public.reading_progress
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "comments_insert" ON public.segment_comments
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "comments_read" ON public.segment_comments
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "comments_update" ON public.segment_comments
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "revisions_insert" ON public.segment_revisions
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['translator'::text, 'admin'::text]))))))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "revisions_read" ON public.segment_revisions
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "segments_delete" ON public.segments
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "segments_insert" ON public.segments
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['translator'::text, 'admin'::text]))))))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "segments_read" ON public.segments
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "segments_update" ON public.segments
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['translator'::text, 'admin'::text]))))))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "terminology_anon_insert" ON public.terminology
    AS PERMISSIVE
    FOR INSERT
    TO anon
    WITH CHECK (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "terminology_auth_insert" ON public.terminology
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "terminology_public_read" ON public.terminology
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anon insert" ON public.translation_memory
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read access" ON public.translation_memory
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "TM admins update" ON public.translation_memory
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "TM public read approved" ON public.translation_memory
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((human_approved = true))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "TM translators insert" ON public.translation_memory
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'translator'::text]))))))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "TM users read own" ON public.translation_memory
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = created_by))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own history" ON public.user_history
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own history" ON public.user_history
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own history" ON public.user_history
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can read video notes" ON public.video_notes
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert notes" ON public.video_notes
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((auth.role() = 'authenticated'::text))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own notes" ON public.video_notes
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING (((user_id IS NULL) OR (auth.uid() = user_id)))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own notes" ON public.video_notes
    AS PERMISSIVE
    FOR INSERT
    TO authenticated
    WITH CHECK ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own notes" ON public.video_notes
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (((user_id IS NULL) OR (auth.uid() = user_id)))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own notes" ON public.video_notes
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING ((auth.uid() = user_id))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "video_notes_anon_insert" ON public.video_notes
    AS PERMISSIVE
    FOR INSERT
    TO anon
    WITH CHECK (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "video_notes_auth_insert" ON public.video_notes
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "video_notes_owner_delete" ON public.video_notes
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "video_notes_owner_update" ON public.video_notes
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "video_notes_public_read" ON public.video_notes
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can read videos" ON public.videos
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert videos" ON public.videos
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK ((auth.role() = 'authenticated'::text))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Enable insert for authenticated users only" ON public.videos
    AS PERMISSIVE
    FOR INSERT
    TO authenticated
    WITH CHECK (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own videos" ON public.videos
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (((user_id IS NULL) OR (auth.uid() = user_id)))
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "videos_anon_insert" ON public.videos
    AS PERMISSIVE
    FOR INSERT
    TO anon
    WITH CHECK (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "videos_auth_insert" ON public.videos
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "videos_public_read" ON public.videos
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true)
  ;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- Functions (user-defined, excluding extension-owned)
-- =============================================================================

-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.profiles (id, username, role)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'username', 'reader');
    RETURN NEW;
END;
$function$


-- Function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$function$


-- Function: update_agent_prompts_updated_at
CREATE OR REPLACE FUNCTION public.update_agent_prompts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$


-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$


-- =============================================================================
-- Triggers
-- =============================================================================

DROP TRIGGER IF EXISTS document_settings_updated_at ON public.document_settings;
CREATE TRIGGER document_settings_updated_at BEFORE UPDATE ON public.document_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS segments_updated_at ON public.segments;
CREATE TRIGGER segments_updated_at BEFORE UPDATE ON public.segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_prompts_timestamp ON public.agent_prompts;
CREATE TRIGGER update_agent_prompts_timestamp BEFORE UPDATE ON public.agent_prompts FOR EACH ROW EXECUTE FUNCTION update_agent_prompts_updated_at();

-- =============================================================================
-- Realtime publication
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.segments;

-- =============================================================================
-- End of 000_baseline_snapshot.sql
-- =============================================================================
