/**
 * /api/terminology/[id]
 *
 * PATCH  — admin only: update an existing term
 * DELETE — admin only: delete a term
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

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pb = await createServerClient()
        const gate = await requireAdmin(pb)
        if ('error' in gate) return gate.error

        const { id } = await params
        const body = await req.json()
        const { source_term, target_term, reading, domain, notes } = body

        if (!source_term?.trim() || !target_term?.trim()) {
            return NextResponse.json({ error: 'source_term and target_term are required' }, { status: 400 })
        }

        const data = await pb.collection('terminology').update(id, {
            source_term: source_term.trim(),
            target_term: target_term.trim(),
            reading: reading?.trim() || null,
            domain: domain?.trim() || null,
            notes: notes?.trim() || null,
        })

        return NextResponse.json({ term: data })
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        // PocketBase throws on not-found; map to 404
        if (msg.includes('not found') || msg.includes('404')) {
            return NextResponse.json({ error: 'Term not found' }, { status: 404 })
        }
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const pb = await createServerClient()
        const gate = await requireAdmin(pb)
        if ('error' in gate) return gate.error

        const { id } = await params

        await pb.collection('terminology').delete(id)
        return NextResponse.json({ success: true })
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        if (msg.includes('not found') || msg.includes('404')) {
            return NextResponse.json({ error: 'Term not found' }, { status: 404 })
        }
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
