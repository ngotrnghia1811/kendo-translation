/**
 * /api/profile
 *
 * PATCH — update the authenticated user's own profile fields.
 * PocketBase edition: updates the `users` auth collection directly
 * since `profiles` was merged into `users` during migration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/pocketbase/server'

const USERNAME_RE = /^[a-zA-Z0-9_-]{2,30}$/

export async function PATCH(req: NextRequest) {
    const pb = await createServerClient()

    if (!pb.authStore.isValid || !pb.authStore.record) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = pb.authStore.record

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

    try {
        const data = await pb.collection('users').update(user.id, updates)
        return NextResponse.json({ profile: data })
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        // PocketBase doesn't expose SQL error codes; surface a generic message
        if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already')) {
            return NextResponse.json(
                { error: 'That username is already taken' },
                { status: 409 }
            )
        }
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
