/**
 * /api/admin/documents/[id]
 *
 * Admin-only per-document detail endpoint.
 *
 * GET — returns:
 *   article: { id, title, segment_count, segmented, translation_status }
 *   phaseBreakdown: Record<SegmentStatus, number>   (EN segments only)
 *   qaIssues: { total, open, by_severity }
 *   assignments: { user_id, username, allowed_phases }[]
 *   recentActivity: { date, count }[]               (last 14 days)
 *
 * PocketBase edition.
 *
 * Statuses: 200 ok | 401 unauth | 403 non-admin | 404 not found | 500 db error
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: documentId } = await params;
  const pb = await createServerClient();
  const gate = await requireAdmin(pb);
  if (gate instanceof NextResponse) return gate;

  // Fetch article metadata
  let article: Record<string, unknown>;
  try {
    const record = await pb.collection('articles').getOne(documentId);
    article = JSON.parse(JSON.stringify(record));
  } catch {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Parallel queries: phase breakdown, assignments, recent transitions
  const [segments, assignments, transitions] = await Promise.all([
    // Phase breakdown: fetch EN segments statuses
    pb.collection('segments').getFullList({
      filter: `article_id = "${documentId}" && target_lang = "en"`,
      fields: 'status',
    }),
    // Assignments
    pb.collection('document_assignments').getFullList({
      filter: `document_id = "${documentId}"`,
      sort: '+created',
      expand: 'user_id',
    }),
    // Recent phase transitions (last 14 days)
    pb.collection('segment_phase_transitions').getFullList({
      filter: `article_id = "${documentId}"`,
      sort: '-created',
      fields: 'created,segment_id,to_status',
      requestKey: 'transitions-' + documentId,
    }),
  ]);

  // Build phase breakdown
  const phaseBreakdown: Record<string, number> = {
    draft: 0,
    translated: 0,
    edited: 0,
    proofread: 0,
    qa_approved: 0,
  };
  for (const seg of segments) {
    const data = JSON.parse(JSON.stringify(seg)) as Record<string, unknown>;
    const s = data.status as string;
    if (s in phaseBreakdown) phaseBreakdown[s]++;
  }

  // Build daily activity timeline (last 14 days, including 0-activity days)
  const activityMap = new Map<string, number>();
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  for (const t of transitions) {
    const data = JSON.parse(JSON.stringify(t)) as Record<string, unknown>;
    const created = data.created as string;
    if (!created) continue;
    // Check if within 14 days
    if (new Date(created).getTime() >= fourteenDaysAgo) {
      const day = created.slice(0, 10);
      activityMap.set(day, (activityMap.get(day) ?? 0) + 1);
    }
  }
  const recentActivity: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const day = d.toISOString().slice(0, 10);
    recentActivity.push({ date: day, count: activityMap.get(day) ?? 0 });
  }

  // Format assignments — expand user_id gives the related user record
  const formattedAssignments = assignments.map((a) => {
    const data = JSON.parse(JSON.stringify(a)) as Record<string, unknown>;
    const expand = (data.expand ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    const user = expand.user_id;
    return {
      user_id: data.user_id as string,
      username: (user?.username as string) ?? null,
      role: (user?.role as string) ?? null,
      allowed_phases: data.allowed_phases as string[],
    };
  });

  return NextResponse.json({
    article: {
      id: article.id,
      title: article.title,
      title_ja: article.title_ja ?? null,
      doc_type: article.doc_type ?? null,
      author: article.author ?? null,
      summary: article.summary ?? null,
      segment_count: article.segment_count,
      segmented: article.segmented,
      translation_status: article.translation_status,
      updated_at: article.updated,
    },
    phaseBreakdown,
    assignments: formattedAssignments,
    recentActivity,
    totalSegments: segments.length,
  });
}
