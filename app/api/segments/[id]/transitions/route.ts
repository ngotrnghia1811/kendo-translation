/**
 * GET /api/segments/[id]/transitions
 *
 * Returns the chronological audit trail of phase transitions for a
 * single segment, joined with the actor's profile (username). RLS on
 * `segment_phase_transitions` and `segments` is the authority — this
 * endpoint exposes no admin gate.
 *
 * Returns 404 if the segment is missing OR hidden by RLS (existence
 * is never leaked).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Existence check (and RLS hiding) goes through segments, not
    // transitions — an empty transitions list is a valid state for a
    // segment that has never been advanced.
    const { data: segment, error: segErr } = await supabase
        .from('segments')
        .select('id')
        .eq('id', segmentId)
        .maybeSingle()
    if (segErr) {
        return NextResponse.json({ error: segErr.message }, { status: 500 })
    }
    if (!segment) {
        return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    const { data, error } = await supabase
        .from('segment_phase_transitions')
        .select(
            'id, segment_id, from_status, to_status, actor_id, acknowledged_minor, note, created_at, actor:profiles!actor_id(username)'
        )
        .eq('segment_id', segmentId)
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ transitions: data ?? [] })
}
