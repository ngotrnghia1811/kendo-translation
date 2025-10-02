import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = createAdminClient()

        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, username, role, created_at')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching users:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ users: users || [] })
    } catch (error) {
        console.error('Error in admin/users GET:', error)
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}
