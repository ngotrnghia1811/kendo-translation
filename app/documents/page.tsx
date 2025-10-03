import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function DocumentsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/documents');

  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>⚔️</span> Kendo Translation
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-600">Documents</span>
          </div>
          <span className="text-sm text-gray-500">{user.email}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">All Documents</h2>
        </div>

        {(!articles || articles.length === 0) ? (
          <div className="text-center py-24 text-gray-500">
            <span className="text-5xl block mb-4">📄</span>
            <p className="text-lg font-medium text-gray-900 mb-2">No documents yet</p>
            <p className="text-sm">Documents will appear here once they are added.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {articles.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        doc.translation_status === 'complete'
                          ? 'bg-green-100 text-green-700'
                          : doc.translation_status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {doc.translation_status || 'pending'}
                      </span>
                      {doc.segment_count > 0 && (
                        <span className="text-xs text-gray-500">{doc.segment_count} segments</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Link
                      href={`/documents/${doc.id}/read`}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                    >
                      Read
                    </Link>
                    <Link
                      href={`/documents/${doc.id}/edit`}
                      className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
