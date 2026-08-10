/**
 * GET /api/segments/[id]/transitions
 *
 * Chronological audit trail of phase transitions for a segment.
 * PocketBase edition.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/pocketbase/server'

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: segmentId } = await params

    if (!UUID_RE.test(segmentId)) {
        return NextResponse.json({ error: 'Invalid segment id' }, { status: 404 })
    }

    const pb = await createServerClient()

    if (!pb.authStore.isValid || !pb.authStore.record) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Existence check
    try {
        await pb.collection('segments').getOne(segmentId)
    } catch {
        return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    try {
        const records = await pb.collection('segment_phase_transitions').getFullList({
            filter: `segment = "${segmentId}"`,
            sort: '-id',
            fields: 'id,segment,from_status,to_status,actor,acknowledged_minor,note,created',
        })
        return NextResponse.json({ transitions: records ?? [] })
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
