import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

/**
 * /api/segments/cleanup-locks — releases soft-locks older than 5 minutes.
 *
 * Invoked by the Vercel cron job (`vercel.json` crons → GET) and also callable
 * on-demand by an authenticated admin.
 *
 * ## Auth (Phase 0 follow-up)
 * Previously this endpoint had NO auth — anyone could release every stale lock.
 * It now accepts EITHER:
 *
 *   1. **Vercel cron** — `Authorization: Bearer <CRON_SECRET>`. Vercel injects
 *      this header automatically on every cron invocation *if and only if* a
 *      `CRON_SECRET` environment variable is set on the project. This is the
 *      canonical Vercel cron-securing pattern (see
 *      https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 *
 *   2. **Authenticated admin** — a valid session whose record role is `admin`,
 *      for manual on-demand cleanup from the admin surface.
 *
 * The `User-Agent: vercel-cron/1.0` / `x-vercel-cron-schedule` headers that
 * Vercel also sends are spoofable, so they are deliberately NOT trusted —
 * `CRON_SECRET` is the security boundary.
 *
 * ⚠️ REQUIRES a new `CRON_SECRET` env var (≥16 random chars) to be set on the
 * Vercel project. Until it is set, Vercel sends no Authorization header and the
 * scheduled cleanup will return 401 (the cron silently stops working). Admin
 * manual triggering keeps working regardless.
 */

function isAuthorized(
  req: NextRequest,
  pb: Awaited<ReturnType<typeof createServerClient>>,
): boolean {
  // 1. Vercel cron — CRON_SECRET bearer token.
  const authHeader = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // 2. Authenticated admin (manual trigger).
  const record = pb.authStore.record as Record<string, unknown> | null;
  return pb.authStore.isValid && record?.role === 'admin';
}

export async function POST(req: NextRequest) {
  const pb = await createServerClient();

  if (!isAuthorized(req, pb)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
