/**
 * /api/admin/users
 *
 * Admin-only directory of all users (id, username, role, created_at, last_active).
 *
 * PocketBase edition — users are stored in the `users` auth collection
 * (profiles was merged into users).  No separate profiles table.
 *
 * Auth: requireAdmin gate checks pb.authStore.record.role === 'admin'.
 *
 * Statuses:
 *   200 ok | 401 unauth | 403 non-admin | 500 db error
 */

import { createServerClient } from '@/lib/pocketbase/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET() {
  try {
    const pb = await createServerClient();
    const gate = await requireAdmin(pb);
    if (gate instanceof NextResponse) return gate;

    // Fetch users and segment revisions in parallel
    const [usersResult, revisionsResult] = await Promise.all([
      pb.collection('users').getFullList({
        fields: 'id,username,role,created',
        sort: '-created',
      }),
      pb.collection('segment_revisions').getFullList({
        fields: 'edited_by,created',
        sort: '-created',
      }),
    ]);

    // Build a map: userId → most recent revision timestamp
    const lastActiveMap = new Map<string, string>();
    for (const rev of revisionsResult) {
      const revData = JSON.parse(JSON.stringify(rev)) as Record<string, unknown>;
      const editedBy = revData.edited_by as string | undefined;
      const createdAt = revData.created as string | undefined;
      if (editedBy && createdAt && !lastActiveMap.has(editedBy)) {
        lastActiveMap.set(editedBy, createdAt);
      }
    }

    const users = usersResult.map((u) => {
      const data = JSON.parse(JSON.stringify(u)) as Record<string, unknown>;
      return {
        id: data.id as string,
        username: (data.username as string) ?? null,
        role: (data.role as string) ?? 'reader',
        created_at: (data.created as string) ?? '',
        last_active_at: lastActiveMap.get(data.id as string) ?? null,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in admin/users GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 },
    );
  }
}
