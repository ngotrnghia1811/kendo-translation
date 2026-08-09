/**
 * /api/terminology
 *
 * GET  — list all terms (paginated)
 * POST — admin only: create a new term
 * PocketBase edition.
 */

import { createServerClient } from '@/lib/pocketbase/server'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin(pb: Awaited<ReturnType<typeof createServerClient>>) {
    if (!pb.authStore.isValid || !pb.authStore.record) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }
    const role = (pb.authStore.record as Record<string, unknown>).role as string | undefined
    if (role !== 'admin') {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
    return { user: pb.authStore.record }
}

const DEFAULT_PAGE_SIZE = 50

export async function GET(req: NextRequest) {
    try {
        const pb = await createServerClient()

        const { searchParams } = req.nextUrl
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
        const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10)))

        const result = await pb.collection('terminology').getList(page, pageSize, {
            sort: 'source_term',
            fields: 'id,source_term,target_term,reading,domain,notes',
        })

        return NextResponse.json({
            terms: result.items || [],
            totalCount: result.totalItems,
            page: result.page,
            pageSize: result.perPage,
            totalPages: result.totalPages,
        })
    } catch (error) {
        console.error('Error in terminology GET:', error)
        return NextResponse.json({ error: 'Failed to fetch terminology' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const pb = await createServerClient()
        const gate = await requireAdmin(pb)
        if ('error' in gate) return gate.error

        const body = await req.json()
        const { source_term, target_term, reading, domain, notes } = body

        if (!source_term?.trim() || !target_term?.trim()) {
            return NextResponse.json({ error: 'source_term and target_term are required' }, { status: 400 })
        }

        const data = await pb.collection('terminology').create({
            source_term: source_term.trim(),
            target_term: target_term.trim(),
            reading: reading?.trim() || null,
            domain: domain?.trim() || null,
            notes: notes?.trim() || null,
        })

        return NextResponse.json({ term: data }, { status: 201 })
    } catch (error) {
        console.error('Error in terminology POST:', error)
        const msg = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
