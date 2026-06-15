import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchAllSegments } from '@/lib/supabase/fetch-all-segments';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const targetLang = searchParams.get('target_lang') ?? 'en';
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // PostgREST defaults to 1,000 rows per request. Books can have up to ~30,000
  // segments so we paginate internally via fetchAllSegments.
  try {
    const allSegments = await fetchAllSegments(supabase, id, targetLang);
    return NextResponse.json({ segments: allSegments });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
