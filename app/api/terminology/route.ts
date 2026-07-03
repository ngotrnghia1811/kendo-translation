/**
 * /api/terminology
 *
 * GET  — public (auth required): list all terms
 * POST — admin only: create a new term
 *
 * /api/terminology/[id]  — see ./[id]/route.ts for PATCH + DELETE
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const KNOWN_ROLES = ['admin', 'translator', 'reader']

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

    // Phase 1.2i / Straggler D: read role from JWT app_metadata claim first.
    const appRole = (user.app_metadata as Record<string, unknown> | undefined)?.role as string | undefined
    if (appRole && KNOWN_ROLES.includes(appRole)) {
        if (appRole !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
        return { user }
    }

    // Fallback: stale JWT — query profiles table.
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    return { user }
}

const DEFAULT_PAGE_SIZE = 50

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()

        const { searchParams } = req.nextUrl
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
        const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10)))
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        // Separate count query (exact) to avoid PostgREST 1000-row cap
        const { count: totalCount, error: countErr } = await supabase
            .from('terminology')
            .select('id', { count: 'exact', head: true })

        if (countErr) {
            console.error('Error counting terminology:', countErr)
        }

        const { data: terms, error } = await supabase
            .from('terminology')
            .select('id, source_term, target_term, reading, domain, notes')
            .order('source_term', { ascending: true })
            .range(from, to)

        if (error) {
            console.error('Error fetching terminology:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0

        return NextResponse.json({
            terms: terms || [],
            totalCount: totalCount ?? (terms?.length ?? 0),
            page,
            pageSize,
            totalPages,
        })
    } catch (error) {
        console.error('Error in terminology GET:', error)
        return NextResponse.json({ error: 'Failed to fetch terminology' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const authClient = await createClient()
        const gate = await requireAdmin(authClient)
        if ('error' in gate) return gate.error

        const body = await req.json()
        const { source_term, target_term, reading, domain, notes } = body

        if (!source_term?.trim() || !target_term?.trim()) {
            return NextResponse.json({ error: 'source_term and target_term are required' }, { status: 400 })
        }

        const supabase = await createAdminClient()
        const { data, error } = await supabase
            .from('terminology')
            .insert({
                source_term: source_term.trim(),
                target_term: target_term.trim(),
                reading: reading?.trim() || null,
                domain: domain?.trim() || null,
                notes: notes?.trim() || null,
            })
            .select('id, source_term, target_term, reading, domain, notes')
            .single()

        if (error) {
            console.error('Error creating term:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ term: data }, { status: 201 })
    } catch (error) {
        console.error('Error in terminology POST:', error)
        return NextResponse.json({ error: 'Failed to create term' }, { status: 500 })
    }
}
