/**
 * /api/terminology/[id]
 *
 * PATCH  — admin only: update an existing term
 * DELETE — admin only: delete a term
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    return { user }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authClient = await createClient()
        const gate = await requireAdmin(authClient)
        if ('error' in gate) return gate.error

        const { id } = await params
        const body = await req.json()
        const { source_term, target_term, reading, domain, notes } = body

        if (!source_term?.trim() || !target_term?.trim()) {
            return NextResponse.json({ error: 'source_term and target_term are required' }, { status: 400 })
        }

        const supabase = await createAdminClient()
        const { data, error } = await supabase
            .from('terminology')
            .update({
                source_term: source_term.trim(),
                target_term: target_term.trim(),
                reading: reading?.trim() || null,
                domain: domain?.trim() || null,
                notes: notes?.trim() || null,
            })
            .eq('id', id)
            .select('id, source_term, target_term, reading, domain, notes')
            .single()

        if (error) {
            console.error('Error updating term:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!data) {
            return NextResponse.json({ error: 'Term not found' }, { status: 404 })
        }

        return NextResponse.json({ term: data })
    } catch (error) {
        console.error('Error in terminology PATCH:', error)
        return NextResponse.json({ error: 'Failed to update term' }, { status: 500 })
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authClient = await createClient()
        const gate = await requireAdmin(authClient)
        if ('error' in gate) return gate.error

        const { id } = await params
        const supabase = await createAdminClient()
        const { error } = await supabase
            .from('terminology')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting term:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in terminology DELETE:', error)
        return NextResponse.json({ error: 'Failed to delete term' }, { status: 500 })
    }
}
