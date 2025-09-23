import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('segments')
    .update({ locked_by: null, locked_at: null })
    .not('locked_by', 'is', null)
    .lt('locked_at', cutoff)
    .select('id');

  if (error) {
    console.error('[Cleanup] Error cleaning locks:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Cleanup] Released ${data?.length || 0} expired locks`);
  return NextResponse.json({ released: data?.length || 0 });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
