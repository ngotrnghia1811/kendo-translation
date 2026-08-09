import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

export async function POST(req: NextRequest) {
  const pb = await createServerClient();

  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  try {
    // Fetch segments with expired locks
    const records = await pb.collection('segments').getFullList({
      filter: `locked_by != null && locked_at < "${cutoff}"`,
      fields: 'id',
    });

    // Release each lock
    let released = 0;
    for (const r of records) {
      await pb.collection('segments').update(r.id, {
        locked_by: null,
        locked_at: null,
      });
      released++;
    }

    console.log(`[Cleanup] Released ${released} expired locks`);
    return NextResponse.json({ released });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cleanup] Error cleaning locks:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
