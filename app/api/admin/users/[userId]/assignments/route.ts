/**
 * /api/admin/users/[userId]/assignments
 *
 * Admin-only inverse view of document_assignments: lists every
 * document the given user is assigned to, with the joined document
 * title for display.
 *
 * PocketBase edition.
 *
 * Auth: requires an authenticated user whose role === 'admin'.
 * Statuses: 200 | 400 (bad userId) | 401 | 403 | 500
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  if (!UUID_RE.test(userId)) {
    return NextResponse.json(
      { error: '`userId` must be a UUID' },
      { status: 400 },
    );
  }

  const pb = await createServerClient();
  const guard = await requireAdmin(pb);
  if (guard instanceof NextResponse) return guard;

  // Fetch assignments with expanded document info
  const result = await pb.collection('document_assignments').getFullList({
    filter: `user_id = "${userId}"`,
    sort: '+created',
    expand: 'document_id',
  });

  const assignments = result.map((a) => {
    const data = JSON.parse(JSON.stringify(a)) as Record<string, unknown>;
    const expand = (data.expand ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    const doc = expand.document_id;
    return {
      id: data.id,
      user_id: data.user_id,
      document_id: data.document_id,
      allowed_phases: data.allowed_phases,
      assigned_by: data.assigned_by ?? null,
      created_at: data.created,
      updated_at: data.updated,
      document: doc
        ? { id: doc.id, title: doc.title ?? '' }
        : null,
    };
  });

  return NextResponse.json({ assignments });
}
