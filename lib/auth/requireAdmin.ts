import { NextResponse } from 'next/server';
import type PocketBase from 'pocketbase';

/**
 * Verifies the calling user is authenticated and has role='admin'.
 * Returns { user, profile } on success; returns a NextResponse error on failure.
 *
 * PocketBase edition — role is read directly from pb.authStore.record.role
 * (no separate profiles table needed; role is a first-class field on the
 * users auth collection).
 *
 * Usage:
 *   const result = await requireAdmin(pb)
 *   if (result instanceof NextResponse) return result
 *   const { user } = result
 */
export async function requireAdmin(
  pb: PocketBase,
): Promise<
  | NextResponse
  | {
      user: { id: string; email?: string | null };
      profile: { role: string };
    }
> {
  const record = pb.authStore.record as Record<string, unknown> | null;
  if (!record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = record.role as string | undefined;
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return {
    user: {
      id: record.id as string,
      email: (record.email as string) ?? null,
    },
    profile: { role: 'admin' },
  };
}
