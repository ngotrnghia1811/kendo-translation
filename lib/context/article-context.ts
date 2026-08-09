/**
 * MAC-RAG L2 (Article-Local) Hierarchical Context Builder
 *
 * Materialises article-local signals that sit between L1 (the segment
 * itself) and L3 (retrieval-layer TM/terminology):
 *   - Article title
 *   - Neighbour segments (prev / next in same article by position)
 *   - Terms already annotated in this article's accepted segments
 */

import PocketBase from 'pocketbase';

export interface NeighbourSegment {
  id: string;
  position: number;
  source_text: string | null;
  target_text: string | null;
  status: string;
  usable: boolean;
  reason?: string;
}

export const KENDO_AUDIENCE_PROFILE = {
  domain: 'kendo',
  register: 'formal-literary',
  expectedTerms: ['men', 'kote', 'dō', 'tsuki', 'kiai', 'kamae', 'seme', 'zanshin'],
  note: 'Audience: kendo practitioners and enthusiasts. Preserve Japanese technical terms in romanised form with brief parenthetical glosses on first use.',
} as const;

export type AudienceProfile = typeof KENDO_AUDIENCE_PROFILE;

export interface ArticleL2Context {
  articleId: string;
  documentTitle: string | null;
  neighbours: {
    prev: NeighbourSegment | null;
    next: NeighbourSegment | null;
  };
  termsAlreadyAnnotated: string[];
}

/**
 * Compute the `usable` flag and optional `reason` for a neighbour segment.
 */
function computeUsable(row: {
  source_text: string | null;
  target_text: string | null;
}): { usable: boolean; reason?: string } {
  const src = row.source_text;
  if (src === null || src.trim() === '') {
    // Heuristic: detect translator commentary when target_text contains
    // certain editorial markers.
    const tgt = row.target_text;
    if (tgt && (tgt.includes('This translation') || tgt.startsWith('['))) {
      return { usable: false, reason: 'translator_commentary' };
    }
    return { usable: false, reason: 'empty_source' };
  }
  return { usable: true };
}

/**
 * Convert a raw DB row into a NeighbourSegment, or null if no row exists.
 */
function toNeighbour(
  row: {
    id: string;
    position: number;
    source_text: string | null;
    target_text: string | null;
    status: string;
  } | null,
  fallbackReason?: string,
): NeighbourSegment | null {
  if (!row) return null;
  const { usable, reason } = computeUsable(row);
  return {
    id: row.id,
    position: row.position,
    source_text: row.source_text,
    target_text: row.target_text,
    status: row.status,
    usable,
    reason: reason ?? fallbackReason,
  };
}

export async function buildArticleL2Context(
  pb: PocketBase,
  segmentId: string,
  articleId: string,
  segmentPosition: number,
): Promise<ArticleL2Context> {
  // ── Parallel fetch of all L2 data sources ────────────────────────
  const [
    articleData,
    prevData,
    nextData,
    termData,
    segData,
  ] = await Promise.all([
    pb.collection('articles').getOne(articleId, { fields: 'title' }).catch(() => null),
    pb.collection('segments').getFullList<{ id: string; position: number; source_text: string | null; target_text: string | null; status: string }>({
      filter: `article_id = "${articleId}" && position = ${segmentPosition - 1}`,
      fields: 'id,position,source_text,target_text,status',
    }).then(arr => arr[0] ?? null).catch(() => null),
    pb.collection('segments').getFullList<{ id: string; position: number; source_text: string | null; target_text: string | null; status: string }>({
      filter: `article_id = "${articleId}" && position = ${segmentPosition + 1}`,
      fields: 'id,position,source_text,target_text,status',
    }).then(arr => arr[0] ?? null).catch(() => null),
    pb.collection('terminology').getFullList<{ source_term: string }>({
      fields: 'source_term',
    }).catch(() => []),
    pb.collection('segments').getFullList<{ id: string; target_text: string | null }>({
      filter: `article_id = "${articleId}" && (status = "edited" || status = "proofread" || status = "qa_approved")`,
      fields: 'id,target_text',
    }).catch(() => []),
  ]);

  const documentTitle: string | null = (articleData as { title?: string } | null)?.title ?? null;

  const prev = toNeighbour(prevData as Parameters<typeof toNeighbour>[0], 'no_predecessor');
  const next = toNeighbour(nextData as Parameters<typeof toNeighbour>[0], 'no_successor');

  // ── Terms already annotated ──────────────────────────────────────
  const termsAlreadyAnnotated: string[] = [];
  if (termData && termData.length > 0 && segData && segData.length > 0) {
    const otherTargets = (segData as Array<{ id: string; target_text: string | null }>).filter(
      (s) => s.id !== segmentId,
    );

    const seen = new Set<string>();
    for (const term of termData as Array<{ source_term: string }>) {
      const st = term.source_term;
      if (!st || seen.has(st)) continue;

      const lower = st.toLowerCase();
      for (const seg of otherTargets) {
        if (seg.target_text && seg.target_text.toLowerCase().includes(lower)) {
          seen.add(st);
          termsAlreadyAnnotated.push(st);
          break;
        }
      }
    }
  }

  return {
    articleId,
    documentTitle,
    neighbours: { prev, next },
    termsAlreadyAnnotated,
  };
}
