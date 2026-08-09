import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
import { fetchAllSegments } from '@/lib/pocketbase/fetch-all-segments';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const targetLang = searchParams.get('target_lang') ?? 'en';
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allSegments = await fetchAllSegments(pb, id, targetLang);
    return NextResponse.json({ segments: allSegments });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
