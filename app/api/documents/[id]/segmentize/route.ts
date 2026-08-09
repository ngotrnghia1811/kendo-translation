import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
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
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (pb.authStore.record as Record<string, unknown>).role as string | undefined;
  if (!role || !['admin', 'translator'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let article: Record<string, unknown>;
  try {
    article = await pb.collection('articles').getOne(id);
  } catch {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const sourceLang: 'ja' | 'en' = body.source_lang || detectLanguage((article.content_ja as string) || (article.title as string) || '');
  const targetLang: 'ja' | 'en' = body.target_lang || (sourceLang === 'ja' ? 'en' : 'ja');
  const sourceContent = sourceLang === 'ja' ? ((article.content_ja as string) || '') : ((article.content_en as string) || '');

  // Delete existing segments for this article
  const existingSegs = await pb.collection('segments').getFullList<{ id: string }>({
    filter: `article_id = "${id}"`,
    fields: 'id',
  });
  for (const seg of existingSegs) {
    await pb.collection('segments').delete(seg.id);
  }

  const sentences = splitIntoSegments(sourceContent, sourceLang);
  const paragraphBoundaries = Array.from({ length: sentences.length }, (_, i) => i);

  const inserted: Record<string, unknown>[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const data = await pb.collection('segments').create({
      article_id: id,
      position: i,
      source_text: sentences[i].trim(),
      target_text: null,
      source_lang: sourceLang,
      target_lang: targetLang,
      status: 'draft',
    });
    inserted.push(data);
  }

  await pb.collection('articles').update(id, {
    segmented: true,
    segment_count: sentences.length,
    paragraph_boundaries: paragraphBoundaries,
  });

  return NextResponse.json({ segments: inserted, count: inserted.length });
}
