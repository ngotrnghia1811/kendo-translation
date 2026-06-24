/**
 * /api/admin/analytics
 *
 * Admin-only analytics endpoint. Returns aggregated statistics for the
 * admin dashboard:
 *   - phase breakdown across all segments (count per SegmentStatus)
 *   - top translators by total edits
 *   - recent activity (phase transitions + comments, last 30 days)
 *   - overall counts (articles, segments, users)
 *
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'

/**
 * Fetch all analytics data from Supabase.
 * Wrapped with unstable_cache (60s TTL, 'admin-analytics' tag) so
 * the heavy COUNT queries on 396k+ segments are served from cache on
 * subsequent calls — eliminating the cold-start skeleton delay.
 *
 * IMPORTANT: We use createSupabaseClient() directly here (not
 * createAdminClient) because unstable_cache runs outside of a
 * Next.js request context, so cookies() is unavailable. The service-
 * role key gives full DB access without cookies.
 */
const fetchAnalytics = unstable_cache(
    async () => {
        const supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Run all queries in parallel for speed.
        const [
            phaseRes,
            revisionsRes,
            commentsRes,
            transitionsRes,
            usersRes,
            articlesRes,
            qaIssuesRes,
        ] = await Promise.all([
            // Phase breakdown: one COUNT query per status so we never hit
            // the PostgREST 1 000-row default limit on a table with 300k+ rows.
            Promise.all(
                (['draft', 'translated', 'edited', 'proofread', 'qa_approved'] as const).map(
                    (status) =>
                        supabase
                            .from('segments')
                            .select('status', { count: 'exact', head: true })
                            .eq('status', status)
                            .then(({ count }) => ({ status, count: count ?? 0 }))
                )
            ),

            // Top translators: revisions per user (last 90 days)
            supabase
                .from('segment_revisions')
                .select('edited_by, profiles:edited_by(username)')
                .gte('created_at', new Date(Date.now() - 90 * 86400_000).toISOString())
                .limit(2000),

            // Recent comments count (last 30 days)
            supabase
                .from('segment_comments')
                .select('user_id', { count: 'exact', head: true })
                .gte('created_at', new Date(Date.now() - 30 * 86400_000).toISOString()),

            // Recent transitions (last 30 days) — for daily activity
            supabase
                .from('segment_phase_transitions')
                .select('created_at, new_phase')
                .gte('created_at', new Date(Date.now() - 30 * 86400_000).toISOString())
                .order('created_at', { ascending: false }),

            // User count
            supabase.from('profiles').select('id', { count: 'exact', head: true }),

            // Article count
            supabase.from('articles').select('id', { count: 'exact', head: true }),

            // Open QA issues: join through segments to get article_id + title
            supabase
                .from('qa_issues')
                .select('severity, segments!inner(article_id, articles!inner(id, title))')
                .eq('resolved', false),
        ])

        // ------------------------------------------------------------------
        // Phase breakdown
        // phaseRes is now Array<{ status: string; count: number }> from the
        // parallel per-status COUNT queries above.
        // ------------------------------------------------------------------
        const phaseBreakdown: Record<string, number> = {}
        for (const { status, count } of phaseRes as unknown as Array<{ status: string; count: number }>) {
            if (count > 0) phaseBreakdown[status] = count
        }

        // ------------------------------------------------------------------
        // Top translators (top 10 by edit count in last 90 days)
        // ------------------------------------------------------------------
        const editorCounts: Map<string, { username: string | null; count: number }> = new Map()
        for (const row of revisionsRes.data ?? []) {
            const r = row as unknown as { edited_by: string; profiles: { username: string | null } | { username: string | null }[] | null }
            const id = r.edited_by
            const profileObj = Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles
            if (!editorCounts.has(id)) {
                editorCounts.set(id, { username: profileObj?.username ?? null, count: 0 })
            }
            editorCounts.get(id)!.count++
        }
        const topTranslators = [...editorCounts.entries()]
            .map(([id, v]) => ({ id, username: v.username ?? id.slice(0, 8), count: v.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

        // ------------------------------------------------------------------
        // Daily activity (transitions per day, last 30 days)
        // ------------------------------------------------------------------
        const dailyCounts: Record<string, number> = {}
        for (const row of transitionsRes.data ?? []) {
            const r = row as { created_at: string; new_phase: string }
            const day = r.created_at.slice(0, 10) // 'YYYY-MM-DD'
            dailyCounts[day] = (dailyCounts[day] || 0) + 1
        }
        // Build a sorted array of the last 30 days
        const activityTimeline = Object.entries(dailyCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }))

        // ------------------------------------------------------------------
        // Open QA issues per article (top 15 by open count)
        // ------------------------------------------------------------------
        type QARow = {
            severity: string
            segments: {
                article_id: string
                articles: { id: string; title: string } | { id: string; title: string }[]
            } | {
                article_id: string
                articles: { id: string; title: string } | { id: string; title: string }[]
            }[]
        }
        const articleQaMap: Map<string, { title: string; minor: number; major: number; critical: number; total: number }> = new Map()
        for (const row of (qaIssuesRes.data ?? []) as unknown as QARow[]) {
            const seg = Array.isArray(row.segments) ? row.segments[0] : row.segments
            if (!seg) continue
            const articleId = seg.article_id
            const art = Array.isArray(seg.articles) ? seg.articles[0] : seg.articles
            if (!art) continue
            if (!articleQaMap.has(articleId)) {
                articleQaMap.set(articleId, { title: art.title, minor: 0, major: 0, critical: 0, total: 0 })
            }
            const entry = articleQaMap.get(articleId)!
            entry.total++
            if (row.severity === 'minor') entry.minor++
            else if (row.severity === 'major') entry.major++
            else if (row.severity === 'critical') entry.critical++
        }
        const qaIssues = [...articleQaMap.entries()]
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 15)

        return {
            phaseBreakdown,
            topTranslators,
            activityTimeline,
            qaIssues,
            totals: {
                articles: articlesRes.count ?? 0,
                users: usersRes.count ?? 0,
                recentComments: commentsRes.count ?? 0,
                recentTransitions: transitionsRes.data?.length ?? 0,
            },
        }
    },
    ['admin-analytics'],
    { revalidate: 300, tags: ['admin-analytics'] }
)

export async function GET() {
    try {
        const authClient = await createClient()
        const gate = await requireAdmin(authClient)
        if (gate instanceof NextResponse) return gate

        const data = await fetchAnalytics()
        return NextResponse.json(data)
    } catch (err) {
        console.error('Error in admin/analytics GET:', err)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
