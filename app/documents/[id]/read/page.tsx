import type { Metadata } from 'next';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReaderView from '@/components/reader/ReaderView';
import type { Segment } from '@/types/database';
import { fetchAllSegments } from '@/lib/supabase/fetch-all-segments';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: article } = await supabase
    .from('articles')
    .select('title')
    .eq('id', id)
    .single();

  return {
    title: article?.title ?? 'Read Article',
    description: article?.title ? `Read "${article.title}" on Kendo Translation` : 'Read article on Kendo Translation',
  };
}

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (!article) notFound();

  // Determine whether the current viewer should see editor affordances.
  // Mirrors the role check in app/api/auth/me/route.ts: look up the
  // profiles row by user id via the admin client and allow translator/admin.
  // Defaults to false for unauthenticated users and on any lookup failure.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let canEdit = false;
  if (user) {
    const adminSupabase = await createAdminClient();
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    canEdit = profile?.role === 'translator' || profile?.role === 'admin';
  }

  // Fetch ALL segments (no DB-side status filter) so ReaderView's paragraph
  // merging sees the full ordered sequence. We then apply the reader-visibility
  // contract in JS below: only segments that are qa_approved OR already have
  // target_text are exposed to the public reader.
  //
  // fetchAllSegments paginates past PostgREST's 1,000-row default cap.
  // EN segments are the primary lane; ZH segments are an optional overlay.
  const [segments, zhSegmentsRaw, { data: settings }] = await Promise.all([
    fetchAllSegments<Segment>(supabase, id, 'en'),
    fetchAllSegments<{ id: string; position: number; target_text: string | null; status: string }>(
      supabase, id, 'zh', 'id, position, target_text, status',
    ),
    supabase.from('document_settings').select('*').eq('article_id', id).maybeSingle(),
  ]);

  // Readers see segments according to the document's publish_filter setting:
  //   'any_translated' (default) — any segment with a populated target_text
  //   'qa_approved'              — only qa_approved segments
  const publishFilter = settings?.publish_filter ?? 'any_translated'
  const readableSegments = (segments || []).filter(
    (s) => publishFilter === 'qa_approved'
      ? s.status === 'qa_approved'
      : (s.status === 'qa_approved' || s.target_text)
  );

  // ZH segments — expose all that have target_text (status may be 'draft' for
  // machine-translated ZH content, but we still want to show it).
  const zhSegments = (zhSegmentsRaw || []).filter((s) => s.target_text);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--rt-bg, #ffffff)' }}>
      {readableSegments.length === 0 ? (
        <>
          <header className="border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href="/documents" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm">← Documents</Link>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <h1 className="text-sm font-medium text-gray-900 dark:text-gray-100">{article.title}</h1>
              </div>
              {canEdit && (
                <Link
                  href={`/documents/${id}/edit`}
                  className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Edit
                </Link>
              )}
            </div>
          </header>
          <main className="max-w-4xl mx-auto px-6 py-10">
            <div className="text-center py-20 text-gray-400 dark:text-gray-500">
              <p className="text-4xl mb-4">📝</p>
              {canEdit ? (
                <>
                  <p className="font-medium text-gray-600 dark:text-gray-300">No approved translations yet</p>
                  <p className="text-sm mt-2">Approve segments in the editor to see them here.</p>
                  <Link href={`/documents/${id}/edit`} className="inline-block mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Open Editor →
                  </Link>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-600 dark:text-gray-300">No translations available yet</p>
                  <p className="text-sm mt-2">This document hasn&apos;t been published for reading yet. Check back later.</p>
                </>
              )}
            </div>
          </main>
        </>
      ) : (
        <ReaderView
          segments={readableSegments}
          zhSegments={zhSegments.length > 0 ? zhSegments : undefined}
          settings={settings ?? null}
          title={article.title}
          articleId={id}
          canEdit={canEdit}
          pairedPdfPath={article.paired_pdf_path ?? null}
        />
      )}
    </div>
  );
}
