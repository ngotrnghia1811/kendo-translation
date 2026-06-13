import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Verifies the calling user is authenticated and has role='admin'.
 * Returns { user, profile } on success; returns a NextResponse error on failure.
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
