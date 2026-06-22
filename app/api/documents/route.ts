import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ?all=1 returns every article row (admin use: counts, assignment management).
  // Default: only articles where segmented=true so readers/translators see
  // articles that actually have segment data to work with.
  const includeAll = req.nextUrl.searchParams.get('all') === '1';

  if (includeAll) {
    // Admin full-list path: keep the existing pattern (unpaginated, with settings).
    // Not on the hot read path — used by admin tools for assignment/count management.
    let query = supabase
      .from('articles')
      .select('id, title, translation_status, segment_count, created_at, updated_at, segmented, paired_pdf_path, document_settings(publish_filter, total_segments, translated_count, approved_count)')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Flatten the nested document_settings into the document object for convenience
    const documents = (data || []).map((article) => {
      const settings = Array.isArray(article.document_settings)
        ? article.document_settings[0]
        : article.document_settings;
      const { document_settings: _ds, ...rest } = article;
      void _ds;
      const totalSegs = settings?.total_segments ?? 0;
      const approvedSegs = settings?.approved_count ?? 0;
      const translatedSegs = settings?.translated_count ?? 0;
      const progressCount = approvedSegs > 0 ? approvedSegs : translatedSegs;
      return {
        ...rest,
        publish_filter: (settings?.publish_filter ?? 'any_translated') as string,
        segment_count: totalSegs,
        progress: {
          percentage: totalSegs > 0 ? Math.round((progressCount / totalSegs) * 100) : 0,
        },
      };
    });

    return NextResponse.json({ documents });
  }

  // Phase 1.2g: keyset-paginated feed for the public documents list.
  const rawCursor = req.nextUrl.searchParams.get('cursor') ?? null;
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '30', 10)));

  const { data, error } = await supabase.rpc('get_documents_feed_v1', {
    p_cursor: rawCursor ? new Date(rawCursor).toISOString() : null,
    p_limit: limit,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const articles = data ?? [];
  const nextCursor =
    articles.length > 0
      ? (articles[articles.length - 1] as Record<string, unknown>).created_at as string ?? null
      : null;

  return NextResponse.json({ documents: articles, next_cursor: nextCursor });
}
