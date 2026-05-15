import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

        const adminSupabase = await createAdminClient()
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        return NextResponse.json({
            user,
            profile: profile || {
                id: user.id,
                email: user.email,
                role: 'reader'
            }
        })
    } catch (error) {
        console.error('Error in /api/auth/me:', error)
        return NextResponse.json({ user: null, profile: null }, { status: 500 })
    }
}
