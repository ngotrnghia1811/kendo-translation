import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const KNOWN_ROLES = ['admin', 'translator', 'reader']

/**
 * Reads role from a user's app_metadata claim (when present), falling back
 * to a `profiles` table query only for stale JWTs minted before the
 * `sync_profile_role_to_app_metadata` trigger backfill.
 */
function roleFromAppMeta(user: { app_metadata: Record<string, unknown> }): string | null {
  const raw = (user.app_metadata as Record<string, unknown> | undefined)?.role as string | undefined
  return raw && KNOWN_ROLES.includes(raw) ? raw : null
}

/**
 * Verifies the calling user is authenticated and has role='admin'.
 * Returns { user, profile } on success; returns a NextResponse error on failure.
 *
 * Phase 1.2i / Straggler D: reads role from JWT app_metadata claim first,
 * eliminating the per-request profiles query on the hot path.
 *
 * Usage:
 *   const result = await requireAdmin(supabase)
 *   if (result instanceof NextResponse) return result
 *   const { user } = result
 */
export async function requireAdmin(supabase: SupabaseClient): Promise<
  | NextResponse
  | { user: { id: string; email?: string | null }; profile: { role: string } }
> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fast path: role from JWT app_metadata claim (synced by trigger 010).
  const appRole = roleFromAppMeta(user)
  if (appRole !== null) {
    if (appRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return { user, profile: { role: 'admin' } }
  }

  // Fallback: stale JWT without the claim — query profiles table.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { user, profile: profile as { role: string } }
}
