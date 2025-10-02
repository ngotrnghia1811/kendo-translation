import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
            return NextResponse.json({ user: null, profile: null })
        }

        const adminSupabase = createAdminClient()
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

        return NextResponse.json({
            user: session.user,
            profile: profile || {
                id: session.user.id,
                email: session.user.email,
                role: 'reader'
            }
        })
    } catch (error) {
        console.error('Error in /api/auth/me:', error)
        return NextResponse.json({ user: null, profile: null }, { status: 500 })
    }
}
