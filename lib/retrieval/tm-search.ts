/**
 * MAC-RAG TM Search Module
 * Layer 3: Fuzzy translation memory matching with semantic similarity
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface TMMatch {
  id: string;
  sourceText: string;
  targetText: string;
  matchPercentage: number;
  matchType: 'exact' | 'high' | 'fuzzy' | 'low';
  domain?: string;
  qualityScore?: number;
  /**
   * 005 retrieval layer discriminator from tm_search_view:
   * 'project' (L3 — article-scoped) | 'external' (L4 — global).
   */
  retrievalLayer?: 'project' | 'external';
  createdAt: string;
  metadata?: {
    articleId?: string;
    /** feedback_score from tm_search_view — Phase-4b boost signal. */
    feedbackScore?: number;
  };
}

export interface TMSearchOptions {
  sourceText: string;
  sourceLang: 'ja' | 'en';
  domain?: string;
  minMatchScore?: number;
  maxResults?: number;
  includeExact?: boolean;
  includeFuzzy?: boolean;
}

export interface TMSearchResult {
  matches: TMMatch[];
  searchTime: number;
  totalCandidates: number;
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[m][n];
}

export function calculateFuzzyScore(source: string, target: string): number {
  if (!source || !target) return 0;

  const s1 = source.toLowerCase().trim();
  const s2 = target.toLowerCase().trim();

  if (s1 === s2) return 100;

  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  const levenshteinScore = Math.round((1 - distance / maxLen) * 100);

  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  const jaccardScore = union > 0 ? Math.round((intersection / union) * 100) : 0;

  const ngrams1 = getNgrams(s1, 3);
  const ngrams2 = getNgrams(s2, 3);
  const ngramIntersection = [...ngrams1].filter(n => ngrams2.has(n)).length;
  const ngramUnion = new Set([...ngrams1, ...ngrams2]).size;
  const ngramScore = ngramUnion > 0 ? Math.round((ngramIntersection / ngramUnion) * 100) : 0;

  return Math.round(levenshteinScore * 0.4 + jaccardScore * 0.3 + ngramScore * 0.3);
}

function getNgrams(text: string, n: number): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= text.length - n; i++) {
    ngrams.add(text.substring(i, i + n));
  }
  return ngrams;
}

function classifyMatch(score: number): TMMatch['matchType'] {
  if (score >= 100) return 'exact';
  if (score >= 85) return 'high';
  if (score >= 70) return 'fuzzy';
  return 'low';
}

export async function searchTM(
  supabase: SupabaseClient,
  options: TMSearchOptions
): Promise<TMSearchResult> {
  const startTime = Date.now();
  const {
    sourceText,
    sourceLang,
    domain,
    minMatchScore = 50,
    maxResults = 10,
    includeExact = true,
    includeFuzzy = true,
  } = options;

  try {
    // 005: query tm_search_view, which filters superseded rows
    // (is_current) and exposes retrieval_layer (L3 project / L4 external).
    let query = supabase.from('tm_search_view').select('*');
    if (domain) query = query.eq('domain', domain);
    if (sourceLang) query = query.eq('source_lang', sourceLang);

    const { data, error } = await query.limit(200);

    if (error) {
      console.error('TM search error:', error);
      return { matches: [], searchTime: Date.now() - startTime, totalCandidates: 0 };
    }

    if (!data) {
      return { matches: [], searchTime: Date.now() - startTime, totalCandidates: 0 };
    }

    const scoredMatches: TMMatch[] = data
      .map((row: {
        id: string; source_text: string; target_text: string;
        domain?: string; quality?: number; last_used_at: string;
        article_id?: string; feedback_score?: number;
        retrieval_layer?: 'project' | 'external';
      }) => {
        const score = calculateFuzzyScore(sourceText, row.source_text);
        return {
          id: row.id,
          sourceText: row.source_text,
          targetText: row.target_text,
          matchPercentage: score,
          matchType: classifyMatch(score),
          domain: row.domain,
          qualityScore: row.quality,
          retrievalLayer: row.retrieval_layer,
          createdAt: row.last_used_at,
          metadata: { articleId: row.article_id, feedbackScore: row.feedback_score },
        };
      })
      .filter((match: TMMatch) => {
        if (match.matchPercentage < minMatchScore) return false;
        if (!includeExact && match.matchType === 'exact') return false;
        if (!includeFuzzy && match.matchType !== 'exact') return false;
        return true;
      })
      .sort((a: TMMatch, b: TMMatch) => b.matchPercentage - a.matchPercentage)
      .slice(0, maxResults);

    return { matches: scoredMatches, searchTime: Date.now() - startTime, totalCandidates: data.length };
  } catch (error) {
    console.error('TM search exception:', error);
    return { matches: [], searchTime: Date.now() - startTime, totalCandidates: 0 };
  }
}

export async function findExactMatches(
  supabase: SupabaseClient,
  sourceText: string,
  sourceLang: 'ja' | 'en'
): Promise<TMMatch[]> {
  const result = await searchTM(supabase, { sourceText, sourceLang, minMatchScore: 95, maxResults: 5 });
  return result.matches;
}

export async function findFuzzyMatches(
  supabase: SupabaseClient,
  sourceText: string,
  sourceLang: 'ja' | 'en',
  domain?: string
): Promise<TMMatch[]> {
  const result = await searchTM(supabase, {
    sourceText, sourceLang, domain, minMatchScore: 70, maxResults: 10, includeExact: false,
  });
  return result.matches;
}
