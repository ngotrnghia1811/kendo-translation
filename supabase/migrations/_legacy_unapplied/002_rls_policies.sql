-- Kendo Translation Platform
-- Migration 002: Row Level Security policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminology ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: is current user a translator or higher?
CREATE OR REPLACE FUNCTION is_translator()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'translator', 'reviewer')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (is_admin());

-- Articles
CREATE POLICY "articles_read_all" ON public.articles FOR SELECT USING (true);
CREATE POLICY "articles_insert_translator" ON public.articles FOR INSERT WITH CHECK (is_translator());
CREATE POLICY "articles_update_translator" ON public.articles FOR UPDATE USING (is_translator());
CREATE POLICY "articles_delete_admin" ON public.articles FOR DELETE USING (is_admin());

-- Segments
CREATE POLICY "segments_read_all" ON public.segments FOR SELECT USING (true);
CREATE POLICY "segments_update_translator" ON public.segments FOR UPDATE
  USING (is_translator() AND (locked_by IS NULL OR locked_by = auth.uid()));
CREATE POLICY "segments_admin_all" ON public.segments FOR ALL USING (is_admin());

-- Segment quality
CREATE POLICY "quality_read_all" ON public.segment_quality FOR SELECT USING (true);
CREATE POLICY "quality_insert_translator" ON public.segment_quality FOR INSERT WITH CHECK (is_translator());

-- Segment revisions
CREATE POLICY "revisions_read_all" ON public.segment_revisions FOR SELECT USING (true);
CREATE POLICY "revisions_insert_translator" ON public.segment_revisions FOR INSERT WITH CHECK (is_translator());

-- Comments
CREATE POLICY "comments_read_all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_authenticated" ON public.comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "comments_delete_own_or_admin" ON public.comments FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- Translation memory
CREATE POLICY "tm_read_all" ON public.translation_memory FOR SELECT USING (true);
CREATE POLICY "tm_insert_translator" ON public.translation_memory FOR INSERT WITH CHECK (is_translator());
CREATE POLICY "tm_update_translator" ON public.translation_memory FOR UPDATE USING (is_translator());
CREATE POLICY "tm_delete_admin" ON public.translation_memory FOR DELETE USING (is_admin());

-- Terminology
CREATE POLICY "terminology_read_all" ON public.terminology FOR SELECT USING (true);
CREATE POLICY "terminology_write_translator" ON public.terminology FOR INSERT WITH CHECK (is_translator());
CREATE POLICY "terminology_update_translator" ON public.terminology FOR UPDATE USING (is_translator());
CREATE POLICY "terminology_delete_admin" ON public.terminology FOR DELETE USING (is_admin());

-- Prompt templates
CREATE POLICY "prompts_read_all" ON public.prompt_templates FOR SELECT USING (true);
CREATE POLICY "prompts_write_admin" ON public.prompt_templates FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "prompts_update_admin" ON public.prompt_templates FOR UPDATE USING (is_admin());

-- Agent logs
CREATE POLICY "agent_logs_read_admin" ON public.agent_logs FOR SELECT USING (is_admin() OR user_id = auth.uid());
CREATE POLICY "agent_logs_insert_authenticated" ON public.agent_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'viewer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
