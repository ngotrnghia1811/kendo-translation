/**
 * POST /api/documents/[id]/view
 *
 * Records a view for the authenticated user on the given article.
 * UPSERTs into reading_progress.
 *
 * PocketBase edition.
 *
 * Auth: any authenticated user.
 * Statuses: 200 ok | 401 unauth | 500 db error
 */

import { createServerClient } from '@/lib/pocketbase/server';
import { NextResponse } from 'next/server';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const pb = await createServerClient();
    if (!pb.authStore.isValid || !pb.authStore.record) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = pb.authStore.record as Record<string, unknown>;
    const userId = user.id as string;
    const { id } = await params;

    // SELECT existing row
    const existing = await pb
      .collection('reading_progress')
      .getList(1, 1, {
        filter: `user_id = "${userId}" && content_type = "article" && content_id = "${id}"`,
      });

    if (existing.items.length > 0) {
      // UPDATE
      await pb
        .collection('reading_progress')
        .update(existing.items[0].id, {
          updated: new Date().toISOString(),
        });
    } else {
      // INSERT
      await pb.collection('reading_progress').create({
        user_id: userId,
        content_type: 'article',
        content_id: id,
        progress_pct: 0,
        last_position: 0,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
