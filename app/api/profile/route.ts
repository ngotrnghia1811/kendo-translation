/**
 * /api/profile
 *
 * PATCH — update the authenticated user's own profile fields.
 *
 * Body (JSON): { username?: string }
 *   - `username` must be 2–30 chars, alphanumeric + underscore/hyphen.
 *
 * Returns: { profile: { id, username, role, email, created_at, updated_at } }
 *
 * Status codes:
 *   200 ok | 400 bad input | 401 unauth | 409 username taken | 500 db error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const USERNAME_RE = /^[a-zA-Z0-9_-]{2,30}$/

export async function PATCH(req: NextRequest) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}

    if ('username' in body) {
        const username = body.username
        if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
            return NextResponse.json(
                {
                    error: 'username must be 2–30 characters (letters, digits, underscore, hyphen)',
                },
                { status: 400 }
            )
        }
        updates.username = username
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select('id, username, role, email, created_at, updated_at')
        .single()

    if (error) {
        // Unique constraint on username
        if (error.code === '23505') {
            return NextResponse.json(
                { error: 'That username is already taken' },
                { status: 409 }
            )
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
}
