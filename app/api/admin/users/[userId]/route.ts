/**
 * /api/admin/users/[userId]
 *
 * Admin-only per-user mutation endpoint.
 *
 *   PATCH — update the user's role. Body: { role: 'reader' | 'translator' | 'admin' }
 *           Returns the updated user record.
 *
 * PocketBase edition — users collection has a `role` select field directly.
 *
 * Statuses:
 *   200 ok | 400 bad role | 401 unauth | 403 non-admin | 404 user not found | 500 db error
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const VALID_ROLES = ['reader', 'translator', 'admin'] as const;
type UserRole = (typeof VALID_ROLES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const pb = await createServerClient();
  const gate = await requireAdmin(pb);
  if (gate instanceof NextResponse) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { role } = (body ?? {}) as { role?: unknown };

  if (typeof role !== 'string' || !VALID_ROLES.includes(role as UserRole)) {
    return NextResponse.json(
      { error: `\`role\` must be one of: ${VALID_ROLES.join(', ')}` },
      { status: 400 },
    );
  }

  // Verify the user exists first for a clean 404
  let existing: Record<string, unknown>;
  try {
    const record = await pb.collection('users').getOne(userId);
    existing = JSON.parse(JSON.stringify(record));
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Update the user's role
  try {
    const updated = await pb.collection('users').update(userId, { role });
    const data = JSON.parse(JSON.stringify(updated)) as Record<string, unknown>;
    return NextResponse.json({
      id: data.id,
      username: data.username ?? null,
      role: data.role,
      created_at: data.created,
      updated_at: data.updated,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
