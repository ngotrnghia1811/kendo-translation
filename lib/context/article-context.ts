/**
 * MAC-RAG L2 (Article-Local) Hierarchical Context Builder
 *
 * Materialises article-local signals that sit between L1 (the segment
 * itself) and L3 (retrieval-layer TM/terminology):
 *   - Article title
 *   - Neighbour segments (prev / next in same article by position)
 *   - Terms already annotated in this article's accepted segments
 */

import type { SupabaseClient } from '@supabase/supabase-js';

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
  supabase: SupabaseClient,
  segmentId: string,
  articleId: string,
  segmentPosition: number,
): Promise<ArticleL2Context> {
  // ── Parallel fetch of all L2 data sources ────────────────────────
  const titleP = supabase
    .from('articles')
    .select('title')
    .eq('id', articleId)
    .maybeSingle();

  const prevP = supabase
    .from('segments')
    .select('id, position, source_text, target_text, status')
    .eq('article_id', articleId)
    .eq('position', segmentPosition - 1)
    .maybeSingle();

  const nextP = supabase
    .from('segments')
    .select('id, position, source_text, target_text, status')
    .eq('article_id', articleId)
    .eq('position', segmentPosition + 1)
    .maybeSingle();

  const termsP = supabase
    .from('terminology_active_view')
    .select('source_term')
    .limit(1000);

  const segsP = supabase
    .from('segments')
    .select('id, target_text')
    .eq('article_id', articleId)
    .in('status', ['edited', 'proofread', 'qa_approved'])
    .limit(5000);

  const [
    { data: articleData },
    { data: prevData },
    { data: nextData },
    { data: termData },
    { data: segData },
  ] = await Promise.all([titleP, prevP, nextP, termsP, segsP]);

  const documentTitle: string | null = (articleData as { title?: string } | null)?.title ?? null;

  const prev = toNeighbour(prevData as Parameters<typeof toNeighbour>[0], 'no_predecessor');
  const next = toNeighbour(nextData as Parameters<typeof toNeighbour>[0], 'no_successor');

  // ── Terms already annotated ──────────────────────────────────────
  // Check which source_term values from the terminology view already
  // appear (case-insensitive) in the target_text of accepted segments
  // in the same article.
  const termsAlreadyAnnotated: string[] = [];
  if (termData && termData.length > 0 && segData && segData.length > 0) {
    // Exclude the current segment from the set of accepted targets.
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
