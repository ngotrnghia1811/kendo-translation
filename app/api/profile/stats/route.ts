/**
 * /api/profile/stats
 *
 * GET — returns activity stats for the authenticated user.
 * PocketBase edition.
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/pocketbase/server'

export async function GET() {
    const pb = await createServerClient()

    if (!pb.authStore.isValid || !pb.authStore.record) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const uid = pb.authStore.record.id

    try {
        const [
            editResult,
            commentResult,
            transitionResult,
            assignmentResult,
            historyResult,
        ] = await Promise.all([
            pb.collection('segment_revisions').getList(1, 1, {
                filter: `edited_by = "${uid}"`,
                fields: 'id',
            }),
            pb.collection('segment_comments').getList(1, 1, {
                filter: `user_id = "${uid}"`,
                fields: 'id',
            }),
            pb.collection('segment_phase_transitions').getList(1, 1, {
                filter: `actor_id = "${uid}"`,
                fields: 'id',
            }),
            pb.collection('document_assignments').getFullList({
                filter: `user_id = "${uid}"`,
                sort: '-created',
                fields: 'document_id,allowed_phases',
            }).catch(() => []),
            pb.collection('user_history').getList(1, 10, {
                filter: `user_id = "${uid}"`,
                sort: '-visited_at',
                fields: 'item_id,item_type,item_title,visited_at',
            }).catch(() => ({ items: [] })),
        ])

        // Fetch article titles for assignments
        const assignments = await Promise.all(
            (Array.isArray(assignmentResult) ? assignmentResult : []).map(async (row) => {
                let title: string | null = null
                try {
                    const article = await pb.collection('articles').getOne(row.document_id as string, { fields: 'title' })
                    title = (article as Record<string, unknown>).title as string | null
                } catch { /* ignore */ }
                return {
                    document_id: row.document_id,
                    title,
                    allowed_phases: row.allowed_phases ?? [],
                }
            })
        )

        return NextResponse.json({
            editCount: editResult.totalItems,
            commentCount: commentResult.totalItems,
            transitionCount: transitionResult.totalItems,
            assignedDocCount: assignments.length,
            assignments,
            recentHistory: (historyResult as { items?: Record<string, unknown>[] }).items ?? [],
        })
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
