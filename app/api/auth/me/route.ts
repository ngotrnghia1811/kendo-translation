import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const KNOWN_ROLES = ['admin', 'translator', 'reader']

export async function GET() {
    try {
        const supabase = await createClient()
        // Use getUser() rather than getSession(): getUser() revalidates the JWT
        // against Supabase Auth and refreshes the token when needed, while
        // getSession() returns only what's already in the cookie.  The latter
        // can return null right after a fresh sign-in if the cookie's
        // refresh-token round-trip hasn't been propagated to subsequent
        // requests yet.  See @supabase/ssr docs.
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json({ user: null, profile: null })
        }

        // Phase 1.2i / Straggler D: read role from JWT app_metadata claim first.
        // Falls back to profiles table query only when the claim is absent
        // (stale JWT minted before the sync_profile_role trigger backfill).
        const appRole =
            (user.app_metadata as Record<string, unknown> | undefined)?.role as
                | string
                | undefined
        const roleFromJwt =
            appRole && KNOWN_ROLES.includes(appRole) ? appRole : null

        const adminSupabase = await createAdminClient()
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        // Role source: JWT claim (authoritative) > profiles table > 'reader' default
        const effectiveRole = roleFromJwt ?? profile?.role ?? 'reader'

        return NextResponse.json({
            user,
            profile: profile
                ? { ...profile, role: effectiveRole }
                : {
                      id: user.id,
                      email: user.email,
                      role: effectiveRole,
                  },
        })
    } catch (error) {
        console.error('Error in /api/auth/me:', error)
        return NextResponse.json({ user: null, profile: null }, { status: 500 })
    }
}
