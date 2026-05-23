import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReaderView from '@/components/reader/ReaderView';

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (!article) notFound();

  // Fetch ALL segments (no DB-side status filter) so ReaderView's paragraph
  // merging sees the full ordered sequence. We then apply the reader-visibility
  // contract in JS below: only segments that are qa_approved OR already have
  // target_text are exposed to the public reader. If we want a configurable
  // status filter later, it should live in document_settings.
  const { data: segments } = await supabase
    .from('segments')
    .select('*')
    .eq('article_id', id)
    .order('position');

  const { data: settings } = await supabase
    .from('document_settings')
    .select('*')
    .eq('article_id', id)
    .maybeSingle();

  // Readers see approved segments or any segment with a populated translation.
  const readableSegments = (segments || []).filter(
    (s) => s.status === 'qa_approved' || s.target_text
  );

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/documents" className="text-gray-400 hover:text-gray-600 text-sm">← Documents</Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-sm font-medium text-gray-900">{article.title}</h1>
          </div>
          <Link
            href={`/documents/${id}/edit`}
            className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Edit
          </Link>
        </div>
      </header>

      {readableSegments.length === 0 ? (
        <main className="max-w-4xl mx-auto px-6 py-10">
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-4">📝</p>
            <p className="font-medium text-gray-600">No approved translations yet</p>
            <p className="text-sm mt-2">Approve segments in the editor to see them here.</p>
            <Link href={`/documents/${id}/edit`} className="inline-block mt-4 text-sm text-blue-600 hover:underline">
              Open Editor →
            </Link>
          </div>
        </main>
      ) : (
        <ReaderView
          segments={readableSegments}
          settings={settings ?? null}
          title={article.title}
        />
      )}
    </div>
  );
}
