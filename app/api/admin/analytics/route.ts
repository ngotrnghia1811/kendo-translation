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
 * PocketBase edition — uses createCacheSafeClient for unstable_cache scope.
 */

import { NextResponse } from 'next/server';
import { createServerClient, createCacheSafeClient } from '@/lib/pocketbase/server';
import { unstable_cache } from 'next/cache';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import PocketBase from 'pocketbase';

const PB_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

/**
 * Fetch all analytics data. Wrapped with unstable_cache (300s TTL).
 * Uses createCacheSafeClient() since unstable_cache runs outside
 * the request context (no cookies available).
 */
const fetchAnalytics = unstable_cache(
  async () => {
    // createCacheSafeClient is a synchronous factory — safe outside
    // request context since it doesn't touch cookies().
    // But for queries inside unstable_cache, we need a fresh client
    // per invocation since PocketBase instances aren't serializable
    // across cache boundaries. Using fetch to the PocketBase API
    // directly is more robust for cached code paths.
    const apiFetch = async (
      collection: string,
      params: Record<string, string>,
    ) => {
      // Note: PocketBase JS client inside unstable_cache may have
      // serialization issues. Use direct HTTP fetch for cache-safe
      // analytics queries.
      const url = new URL(`${PB_URL}/api/collections/${collection}/records`);
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`${collection}: ${res.status}`);
      return res.json();
    };

    // Phase breakdown: count per status
    const statuses = [
      'draft',
      'translated',
      'edited',
      'proofread',
      'qa_approved',
    ] as const;

    const phaseCounts = await Promise.all(
      statuses.map(async (status) => {
        const data = await apiFetch('segments', {
          filter: `status = "${status}"`,
          perPage: '1',
          fields: 'id',
        });
        return {
          status,
          count: data.totalItems ?? 0,
        };
      }),
    );

    const phaseBreakdown: Record<string, number> = {};
    for (const { status, count } of phaseCounts) {
      if (count > 0) phaseBreakdown[status] = count;
    }

    // Top translators: revisions per user (last 90 days)
    const ninetyDaysAgo = new Date(
      Date.now() - 90 * 86400_000,
    ).toISOString();
    const revisionsData = await apiFetch('segment_revisions', {
      filter: `created >= "${ninetyDaysAgo}"`,
      fields: 'edited_by',
      perPage: '2000',
      expand: 'edited_by',
    });

    const editorCounts: Map<
      string,
      { username: string | null; count: number }
    > = new Map();
    for (const row of revisionsData.items ?? []) {
      const id = row.edited_by as string;
      const expand = row.expand as Record<string, Record<string, unknown>> | undefined;
      const user = expand?.edited_by;
      if (!editorCounts.has(id)) {
        editorCounts.set(id, {
          username: (user?.username as string) ?? null,
          count: 0,
        });
      }
      editorCounts.get(id)!.count++;
    }
    const topTranslators = [...editorCounts.entries()]
      .map(([id, v]) => ({
        id,
        username: v.username ?? id.slice(0, 8),
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent comments count (last 30 days)
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 86400_000,
    ).toISOString();
    const commentsData = await apiFetch('segment_comments', {
      filter: `created >= "${thirtyDaysAgo}"`,
      perPage: '1',
      fields: 'id',
    });

    // Recent transitions (last 30 days) — for daily activity
    const transitionsData = await apiFetch('segment_phase_transitions', {
      filter: `created >= "${thirtyDaysAgo}"`,
      sort: '-created',
      fields: 'created,new_phase',
      perPage: '5000',
    });

    const dailyCounts: Record<string, number> = {};
    for (const row of transitionsData.items ?? []) {
      const created = row.created as string;
      if (created) {
        const day = created.slice(0, 10);
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      }
    }
    const activityTimeline = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // User count
    const usersData = await apiFetch('users', {
      perPage: '1',
      fields: 'id',
    });

    // Article count
    const articlesData = await apiFetch('articles', {
      perPage: '1',
      fields: 'id',
    });

    // Open QA issues — by article
    const qaIssuesData = await apiFetch('qa_issues', {
      filter: 'resolved = false',
      fields: 'severity,segment_id',
      perPage: '5000',
      expand: 'segment_id',
    });

    const articleQaMap: Map<
      string,
      {
        title: string;
        minor: number;
        major: number;
        critical: number;
        total: number;
      }
    > = new Map();
    for (const row of qaIssuesData.items ?? []) {
      const severity = (row.severity as string) || 'minor';
      const expand = row.expand as Record<string, Record<string, unknown>> | undefined;
      const seg = expand?.segment_id;
      const articleId = seg?.article_id as string | undefined;
      if (!articleId) continue;

      // Fetch article title — could be cached but fine for analytics
      let title = articleId.slice(0, 8);
      try {
        const artData = await apiFetch('articles', {
          filter: `id = "${articleId}"`,
          perPage: '1',
          fields: 'title',
        });
        if (artData.items?.[0]?.title) {
          title = artData.items[0].title as string;
        }
      } catch {
        // Use fallback
      }

      if (!articleQaMap.has(articleId)) {
        articleQaMap.set(articleId, {
          title,
          minor: 0,
          major: 0,
          critical: 0,
          total: 0,
        });
      }
      const entry = articleQaMap.get(articleId)!;
      entry.total++;
      if (severity === 'minor') entry.minor++;
      else if (severity === 'major') entry.major++;
      else if (severity === 'critical') entry.critical++;
    }

    const qaIssues = [...articleQaMap.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    return {
      phaseBreakdown,
      topTranslators,
      activityTimeline,
      qaIssues,
      totals: {
        articles: articlesData.totalItems ?? 0,
        users: usersData.totalItems ?? 0,
        recentComments: commentsData.totalItems ?? 0,
        recentTransitions: transitionsData.items?.length ?? 0,
      },
    };
  },
  ['admin-analytics'],
  { revalidate: 300, tags: ['admin-analytics'] },
);

export async function GET() {
  try {
    const pb = await createServerClient();
    const gate = await requireAdmin(pb);
    if (gate instanceof NextResponse) return gate;

    const data = await fetchAnalytics();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error in admin/analytics GET:', err);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 },
    );
  }
}
