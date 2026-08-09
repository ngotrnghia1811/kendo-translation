/**
 * /api/documents/[id]/batch-advance
 *
 * Bulk-advance segments through the phase model.
 * PocketBase edition.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/pocketbase/server'
import { revalidateTag, revalidatePath } from 'next/cache'

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

async function requireAdmin(pb: Awaited<ReturnType<typeof createServerClient>>) {
    if (!pb.authStore.isValid || !pb.authStore.record) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }
    const role = (pb.authStore.record as Record<string, unknown>).role as string | undefined
    if (role !== 'admin') {
        return { error: NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 }) }
    }
    return { user: pb.authStore.record }
}

const MAX_IDS = 500

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: articleId } = await params

    try {
        const pb = await createServerClient()
        const gate = await requireAdmin(pb)
        if ('error' in gate) return gate.error
        const { user } = gate

        const body = await request.json()
        const { segment_ids, to_status, note } = body as {
            segment_ids?: unknown
            to_status?: unknown
            note?: unknown
        }

        if (!Array.isArray(segment_ids) || segment_ids.length === 0) {
            return NextResponse.json({ error: '`segment_ids` must be a non-empty array' }, { status: 400 })
        }
        if (segment_ids.length > MAX_IDS) {
            return NextResponse.json({ error: `Maximum ${MAX_IDS} segment IDs per request` }, { status: 400 })
        }
        if (!segment_ids.every((id) => typeof id === 'string')) {
            return NextResponse.json({ error: '`segment_ids` must be an array of strings' }, { status: 400 })
        }

        if (!isStatus(to_status)) {
            return NextResponse.json(
                { error: '`to_status` must be a valid segment status' },
                { status: 400 }
            )
        }

        if (to_status === 'draft') {
            return NextResponse.json({ error: 'Cannot batch-advance to draft' }, { status: 400 })
        }

        if (note !== undefined && note !== null && typeof note !== 'string') {
            return NextResponse.json({ error: '`note` must be a string' }, { status: 400 })
        }

        const from_status = (Object.entries(LEGAL_FORWARD) as [SegmentStatus, SegmentStatus | null][])
            .find(([, v]) => v === to_status)?.[0] ?? null
        if (!from_status) {
            return NextResponse.json({ error: `No legal predecessor for status '${to_status}'` }, { status: 400 })
        }

        // Fetch all requested segments
        const segIds = segment_ids as string[]
        const segMap = new Map<string, Record<string, unknown>>()
        for (const segId of segIds) {
            try {
                const seg = await pb.collection('segments').getOne(segId)
                segMap.set(segId, seg)
            } catch {
                // segment not found — will be in failed list
            }
        }

        const succeeded: string[] = []
        const skipped: string[] = []
        const failed: { id: string; reason: string }[] = []

        for (const segId of segIds) {
            const seg = segMap.get(segId)

            if (!seg) {
                failed.push({ id: segId, reason: 'Segment not found or not in this document' })
                continue
            }

            if (seg.article !== articleId) {
                failed.push({ id: segId, reason: 'Segment does not belong to this document' })
                continue
            }

            if (seg.status === to_status) {
                skipped.push(segId)
                continue
            }

            if (seg.status !== from_status) {
                failed.push({ id: segId, reason: `Expected status '${from_status}', got '${seg.status}'` })
                continue
            }

            if (!seg.target_text || String(seg.target_text).trim().length === 0) {
                failed.push({ id: segId, reason: 'target_text is empty' })
                continue
            }

            try {
                await pb.collection('segments').update(segId, { status: to_status })

                // Audit transition
                try {
                    await pb.collection('segment_phase_transitions').create({
                        segment_id: segId,
                        from_status,
                        to_status,
                        actor_id: user.id,
                        note: typeof note === 'string' ? note : null,
                    })
                } catch { /* best-effort audit */ }

                succeeded.push(segId)
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error'
                failed.push({ id: segId, reason: msg })
            }
        }

        revalidateTag(`article-${articleId}`, 'max');
        revalidatePath(`/documents/${articleId}/read`);
        revalidateTag('articles', 'max');

        return NextResponse.json({ succeeded, skipped, failed })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
