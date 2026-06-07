/**
 * /api/documents/[id]/batch-advance
 *
 * Bulk-advance a set of segments through the cooperation-first phase model:
 *   draft → translated → edited → proofread → qa_approved
 *
 * POST body:
 *   segment_ids:     string[]     — array of segment UUIDs to advance (max 500)
 *   to_status:       SegmentStatus — target status (must be one step forward from each segment's current)
 *   note?:           string        — optional audit note applied to all transitions
 *
 * Auth: requires admin role (translators advance segments one-by-one via the
 * standard /api/segments/[id]/advance-phase endpoint).
 *
 * Behaviour:
 *   - Segments already at `to_status` are silently skipped (idempotent).
 *   - Segments at a different unexpected status are counted as failures.
 *   - Segments with empty target_text are skipped when to_status !== 'draft'
 *     (same content guard as single advance).
 *   - Each advance is independent; partial success is reported.
 *
 * Response (200):
 *   { succeeded: string[], skipped: string[], failed: { id: string; reason: string }[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

type SegmentStatus =
    | 'draft'
    | 'translated'
    | 'edited'
    | 'proofread'
    | 'qa_approved'

const LEGAL_FORWARD: Record<SegmentStatus, SegmentStatus | null> = {
    draft: 'translated',
    translated: 'edited',
    edited: 'proofread',
    proofread: 'qa_approved',
    qa_approved: null,
}

const ALL_STATUSES = new Set<SegmentStatus>(['draft', 'translated', 'edited', 'proofread', 'qa_approved'])
function isStatus(v: unknown): v is SegmentStatus {
    return typeof v === 'string' && ALL_STATUSES.has(v as SegmentStatus)
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') {
        return { error: NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 }) }
    }
    return { user }
}

const MAX_IDS = 500

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: articleId } = await params

    try {
        const authClient = await createClient()
        const gate = await requireAdmin(authClient)
        if ('error' in gate) return gate.error
        const { user } = gate

        const body = await request.json()
        const { segment_ids, to_status, note } = body as {
            segment_ids?: unknown
            to_status?: unknown
            note?: unknown
        }

        // Validate segment_ids
        if (!Array.isArray(segment_ids) || segment_ids.length === 0) {
            return NextResponse.json({ error: '`segment_ids` must be a non-empty array' }, { status: 400 })
        }
        if (segment_ids.length > MAX_IDS) {
            return NextResponse.json({ error: `Maximum ${MAX_IDS} segment IDs per request` }, { status: 400 })
        }
        if (!segment_ids.every((id) => typeof id === 'string')) {
            return NextResponse.json({ error: '`segment_ids` must be an array of strings' }, { status: 400 })
        }

        // Validate to_status
        if (!isStatus(to_status)) {
            return NextResponse.json(
                { error: '`to_status` must be a valid segment status' },
                { status: 400 }
            )
        }

        // to_status can't be 'draft' (you can't batch-advance to draft — that's a rollback)
        if (to_status === 'draft') {
            return NextResponse.json({ error: 'Cannot batch-advance to draft' }, { status: 400 })
        }

        if (note !== undefined && note !== null && typeof note !== 'string') {
            return NextResponse.json({ error: '`note` must be a string' }, { status: 400 })
        }

        // Derive the expected from_status from the target
        // (reverse lookup: which status must a segment be in to advance to to_status?)
        const from_status = (Object.entries(LEGAL_FORWARD) as [SegmentStatus, SegmentStatus | null][])
            .find(([, v]) => v === to_status)?.[0] ?? null
        if (!from_status) {
            return NextResponse.json({ error: `No legal predecessor for status '${to_status}'` }, { status: 400 })
        }

        const supabase = await createAdminClient()

        // Fetch current state of all requested segments
        const { data: segRows, error: fetchErr } = await supabase
            .from('segments')
            .select('id, status, target_text, article_id')
            .in('id', segment_ids as string[])

        if (fetchErr) throw new Error(fetchErr.message)

        const segMap = new Map((segRows ?? []).map((s) => [s.id, s]))

        const succeeded: string[] = []
        const skipped: string[] = []
        const failed: { id: string; reason: string }[] = []

        // Process each segment independently
        for (const segId of segment_ids as string[]) {
            const seg = segMap.get(segId)

            if (!seg) {
                failed.push({ id: segId, reason: 'Segment not found or not in this document' })
                continue
            }

            // Article guard — segments must belong to this document
            if (seg.article_id !== articleId) {
                failed.push({ id: segId, reason: 'Segment does not belong to this document' })
                continue
            }

            // Already at target — idempotent skip
            if (seg.status === to_status) {
                skipped.push(segId)
                continue
            }

            // Wrong current status
            if (seg.status !== from_status) {
                failed.push({ id: segId, reason: `Expected status '${from_status}', got '${seg.status}'` })
                continue
            }

            // Content guard (same as single advance). to_status is always
            // non-draft here (we reject 'draft' above), so content must be present.
            if (!seg.target_text || seg.target_text.trim().length === 0) {
                failed.push({ id: segId, reason: 'target_text is empty' })
                continue
            }

            // Atomic update
            const { data: updated, error: updateErr } = await supabase
                .from('segments')
                .update({ status: to_status })
                .eq('id', segId)
                .eq('status', from_status)
                .select('id')
                .maybeSingle()

            if (updateErr) {
                failed.push({ id: segId, reason: updateErr.message })
                continue
            }
            if (!updated) {
                failed.push({ id: segId, reason: 'Concurrent modification — status changed during batch' })
                continue
            }

            // Audit transition
            await supabase.from('segment_phase_transitions').insert({
                segment_id: segId,
                from_status,
                to_status,
                actor_id: user.id,
                note: typeof note === 'string' ? note : null,
            })

            succeeded.push(segId)
        }

        return NextResponse.json({ succeeded, skipped, failed })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
