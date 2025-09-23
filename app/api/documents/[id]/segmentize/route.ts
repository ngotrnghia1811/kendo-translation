import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detectLanguage } from '@/lib/context/context-builder';

function splitIntoSegments(text: string, lang: 'ja' | 'en'): string[] {
  if (!text || !text.trim()) return [];

  if (lang === 'ja') {
    const raw = text.split(/(?<=[。！？])\s*/).filter(s => s.trim());
    return raw.length > 0 ? raw : [text];
  }

  const raw = text.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim());
  return raw.length > 0 ? raw : [text];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'translator'].includes(profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const sourceLang: 'ja' | 'en' = body.source_lang || detectLanguage(article.content_ja || article.title || '');
  const targetLang: 'ja' | 'en' = body.target_lang || (sourceLang === 'ja' ? 'en' : 'ja');
  const sourceContent = sourceLang === 'ja' ? (article.content_ja || '') : (article.content_en || '');

  await supabase.from('segments').delete().eq('article_id', id);

  const sentences = splitIntoSegments(sourceContent, sourceLang);

  const segmentRows = sentences.map((sentence, i) => ({
    article_id: id,
    position: i,
    source_text: sentence.trim(),
    target_text: null,
    source_lang: sourceLang,
    target_lang: targetLang,
    status: 'draft',
  }));

  const { data: inserted, error } = await supabase
    .from('segments')
    .insert(segmentRows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from('articles')
    .update({ segmented: true, segment_count: segmentRows.length })
    .eq('id', id);

  return NextResponse.json({ segments: inserted, count: inserted?.length || 0 });
}
