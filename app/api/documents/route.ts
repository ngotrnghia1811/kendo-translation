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

  // Fetch articles with their document_settings (for publish_filter and progress fields).
  // We do a left-join style: select articles + embedded document_settings row.
  let query = supabase
    .from('articles')
    .select('*, document_settings(publish_filter, total_segments, translated_count, approved_count)')
    .order('created_at', { ascending: false });

  if (!includeAll) {
    query = query.eq('segmented', true);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten the nested document_settings into the document object for convenience
  const documents = (data || []).map((article) => {
    const settings = Array.isArray(article.document_settings)
      ? article.document_settings[0]
      : article.document_settings
    const { document_settings: _ds, ...rest } = article
    void _ds
    const totalSegs = settings?.total_segments ?? 0
    const approvedSegs = settings?.approved_count ?? 0
    const translatedSegs = settings?.translated_count ?? 0
    const progressCount = approvedSegs > 0 ? approvedSegs : translatedSegs
    return {
      ...rest,
      publish_filter: (settings?.publish_filter ?? 'any_translated') as string,
      segment_count: totalSegs,
      progress: {
        percentage: totalSegs > 0 ? Math.round((progressCount / totalSegs) * 100) : 0,
      },
    }
  })

  return NextResponse.json({ documents });
}
