/**
 * /api/profile/stats
 *
 * GET — returns activity stats for the authenticated user.
 *
 * Response shape:
 * {
 *   editCount: number,          -- segment_revisions rows authored by user
 *   commentCount: number,       -- segment_comments rows authored by user
 *   transitionCount: number,    -- segment_phase_transitions rows by user
 *   assignedDocCount: number,   -- document_assignments rows for user
 *   assignments: Array<{
 *     document_id: string,
 *     title: string | null,
 *     allowed_phases: string[],
 *   }>,
 *   recentHistory: Array<{
 *     item_id: string,
 *     item_type: string,
 *     item_title: string,
 *     visited_at: string,
 *   }>,
 * }
 *
 * Status codes: 200 ok | 401 unauth | 500 db error
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const uid = user.id

    // Run all queries in parallel for speed
    const [
        editResult,
        commentResult,
        transitionResult,
        assignmentResult,
        historyResult,
    ] = await Promise.all([
        // Edit count
        supabase
            .from('segment_revisions')
            .select('id', { count: 'exact', head: true })
            .eq('edited_by', uid),

        // Comment count
        supabase
            .from('segment_comments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', uid),

        // Phase transition count
        supabase
            .from('segment_phase_transitions')
            .select('id', { count: 'exact', head: true })
            .eq('actor_id', uid),

        // Assigned documents with article title
        supabase
            .from('document_assignments')
            .select(`
                document_id,
                allowed_phases,
                articles:document_id ( title )
            `)
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(20),

        // Recent reading history
        supabase
            .from('user_history')
            .select('item_id, item_type, item_title, visited_at')
            .eq('user_id', uid)
            .order('visited_at', { ascending: false })
            .limit(10),
    ])

    // Check for errors — return 500 on DB failure
    const dbError = editResult.error || commentResult.error || transitionResult.error

    if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // assignmentResult may fail if the table is behind RLS that blocks it;
    // gracefully degrade to empty array rather than hard-failing.
    const assignments = (assignmentResult.data ?? []).map((row) => ({
        document_id: row.document_id,
        // articles join returns an object (or null) with title field
        title:
            row.articles && typeof row.articles === 'object' && 'title' in row.articles
                ? (row.articles as { title: string | null }).title
                : null,
        allowed_phases: row.allowed_phases ?? [],
    }))

    return NextResponse.json({
        editCount: editResult.count ?? 0,
        commentCount: commentResult.count ?? 0,
        transitionCount: transitionResult.count ?? 0,
        assignedDocCount: assignments.length,
        assignments,
        recentHistory: historyResult.data ?? [],
    })
}
