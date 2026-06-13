/**
 * /api/admin/documents/[id]
 *
 * Admin-only per-document detail endpoint.
 *
 * GET — returns:
 *   article: { id, title, segment_count, segmented, translation_status }
 *   phaseBreakdown: Record<SegmentStatus, number>   (EN segments only)
 *   qaIssues: { total, open, by_severity }          (from segment_qa_issues table if it exists)
 *   assignments: { user_id, username, allowed_phases }[]
 *   recentActivity: { date, count }[]               (last 14 days of phase transitions)
 *
 * Statuses: 200 ok | 401 unauth | 403 non-admin | 404 not found | 500 db error
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: documentId } = await params;
    const authClient = await createClient();
    const gate = await requireAdmin(authClient);
    if (gate instanceof NextResponse) return gate;

    const supabase = await createAdminClient();

    // Fetch article metadata
    const { data: article, error: artErr } = await supabase
        .from('articles')
        .select('id, title, segment_count, segmented, translation_status, updated_at')
        .eq('id', documentId)
        .maybeSingle();

    if (artErr) return NextResponse.json({ error: artErr.message }, { status: 500 });
    if (!article) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // Parallel queries: phase breakdown, assignments, recent transitions
    const [segRes, assnRes, transRes] = await Promise.all([
        // Phase breakdown: count EN segments by status
        supabase
            .from('segments')
            .select('status')
            .eq('article_id', documentId)
            .eq('target_lang', 'en'),
        // Assignments with username
        supabase
            .from('document_assignments')
            .select('user_id, allowed_phases, user:profiles!user_id(username, role)')
            .eq('document_id', documentId)
            .order('created_at', { ascending: true }),
        // Recent phase transitions (last 14 days, daily count)
        supabase
            .from('segment_phase_transitions')
            .select('created_at, segment_id, to_status, actor:profiles!actor_id(username)')
            .eq('article_id', documentId)
            .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(200),
    ]);

    // Build phase breakdown
    const phaseBreakdown: Record<string, number> = {
        draft: 0,
        translated: 0,
        edited: 0,
        proofread: 0,
        qa_approved: 0,
    };
    for (const row of segRes.data ?? []) {
        const s = row.status as string;
        if (s in phaseBreakdown) phaseBreakdown[s]++;
    }

    // Build daily activity timeline
    const activityMap = new Map<string, number>();
    for (const t of transRes.data ?? []) {
        const day = t.created_at.slice(0, 10);
        activityMap.set(day, (activityMap.get(day) ?? 0) + 1);
    }
    // Fill last 14 days (including days with 0 activity)
    const recentActivity: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const day = d.toISOString().slice(0, 10);
        recentActivity.push({ date: day, count: activityMap.get(day) ?? 0 });
    }

    // Format assignments — Supabase join returns user as array, access [0] safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignments = (assnRes.data ?? []).map((a: any) => {
        const userRow = Array.isArray(a.user) ? a.user[0] : a.user;
        return {
            user_id: a.user_id as string,
            username: (userRow?.username ?? null) as string | null,
            role: (userRow?.role ?? null) as string | null,
            allowed_phases: a.allowed_phases as string[],
        };
    });

    return NextResponse.json({
        article,
        phaseBreakdown,
        assignments,
        recentActivity,
        totalSegments: segRes.data?.length ?? 0,
    });
}
