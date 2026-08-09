/**
 * MAC-RAG TM Search Module
 * Layer 3: Fuzzy translation memory matching with semantic similarity
 *
 * PocketBase edition: translation_memory table was NOT migrated
 * (archived as gzipped JSON on the Oracle instance).
 * TM search always returns empty for now.
 */

import PocketBase from 'pocketbase';

export interface TMMatch {
  id: string;
  sourceText: string;
  targetText: string;
  matchPercentage: number;
  matchType: 'exact' | 'high' | 'fuzzy' | 'low';
  domain?: string;
  qualityScore?: number;
  retrievalLayer?: 'project' | 'external';
  createdAt: string;
  metadata?: {
    articleId?: string;
    feedbackScore?: number;
  };
}

export interface TMSearchOptions {
  sourceText: string;
  sourceLang: 'ja' | 'en';
  targetLang?: 'en' | 'zh';
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
  _pb: PocketBase,
  _options: TMSearchOptions
): Promise<TMSearchResult> {
  // translation_memory table was NOT migrated to PocketBase
  // (archived as gzipped JSON on the Oracle instance).
  // TM search always returns empty for now.
  return { matches: [], searchTime: 0, totalCandidates: 0 };
}

export async function findExactMatches(
  pb: PocketBase,
  sourceText: string,
  sourceLang: 'ja' | 'en'
): Promise<TMMatch[]> {
  const result = await searchTM(pb, { sourceText, sourceLang, minMatchScore: 95, maxResults: 5 });
  return result.matches;
}

export async function findFuzzyMatches(
  pb: PocketBase,
  sourceText: string,
  sourceLang: 'ja' | 'en',
  domain?: string
): Promise<TMMatch[]> {
  const result = await searchTM(pb, {
    sourceText, sourceLang, domain, minMatchScore: 70, maxResults: 10, includeExact: false,
  });
  return result.matches;
}
