import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (!article) notFound();

  const { data: segments } = await supabase
    .from('segments')
    .select('*')
    .eq('article_id', id)
    .eq('status', 'approved')
    .order('position');

  const translatedSegments = (segments || []).filter(s => s.target_text);

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

      <main className="max-w-4xl mx-auto px-6 py-10">
        {translatedSegments.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-4">📝</p>
            <p className="font-medium text-gray-600">No approved translations yet</p>
            <p className="text-sm mt-2">Approve segments in the editor to see them here.</p>
            <Link href={`/documents/${id}/edit`} className="inline-block mt-4 text-sm text-blue-600 hover:underline">
              Open Editor →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {translatedSegments.map((seg, i) => (
              <div key={seg.id} className="grid grid-cols-2 gap-6 pb-6 border-b border-gray-100 last:border-0">
                <div>
                  {i === 0 && (
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Japanese</p>
                  )}
                  <p className="text-gray-900 leading-relaxed">{seg.source_text}</p>
                </div>
                <div>
                  {i === 0 && (
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">English</p>
                  )}
                  <p className="text-gray-700 leading-relaxed">{seg.target_text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
