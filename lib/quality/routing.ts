/**
 * MAC-RAG Quality Routing
 * Determines post-editing effort required based on translation quality scores.
 */

import type { QualityScores } from './scorer';

export type RoutingDecision =
  | 'auto_accept'    // ≥0.90: High quality, no review needed
  | 'light_pe'       // 0.85-0.89: Quick review for minor issues
  | 'standard_pe'    // 0.70-0.84: Standard post-editing
  | 'full_revision'  // <0.70: Needs significant revision
  | 'reject';        // <0.50: Too low quality, retranslate

export interface RoutingThresholds {
  autoAccept: number;
  lightPE: number;
  standardPE: number;
  reject: number;
}

export interface RoutingResult {
  decision: RoutingDecision;
  confidence: number;
  reasons: string[];
  estimatedEffort: 'minimal' | 'low' | 'medium' | 'high';
  suggestedActions: string[];
}

const DEFAULT_THRESHOLDS: RoutingThresholds = {
  autoAccept: 0.90,
  lightPE: 0.85,
  standardPE: 0.70,
  reject: 0.50,
};

export function routeByQuality(
  scores: QualityScores,
  thresholds: Partial<RoutingThresholds> = {}
): RoutingResult {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const reasons: string[] = [];
  const suggestedActions: string[] = [];

  if (scores.overall < t.reject) {
    return {
      decision: 'reject',
      confidence: 0.95,
      reasons: ['Overall quality too low for post-editing'],
      estimatedEffort: 'high',
      suggestedActions: ['Retranslate with different approach', 'Review source text clarity', 'Check terminology database'],
    };
  }

  if (scores.fluency < 0.60) reasons.push(`Low fluency (${Math.round(scores.fluency * 100)}%)`);
  if (scores.adequacy < 0.65) reasons.push(`Low adequacy (${Math.round(scores.adequacy * 100)}%)`);
  if (scores.terminology < 0.60) reasons.push(`Poor terminology (${Math.round(scores.terminology * 100)}%)`);
  if (scores.style < 0.65) reasons.push(`Style mismatch (${Math.round(scores.style * 100)}%)`);

  let decision: RoutingDecision;
  let estimatedEffort: RoutingResult['estimatedEffort'];

  if (scores.overall >= t.autoAccept && reasons.length === 0) {
    decision = 'auto_accept';
    estimatedEffort = 'minimal';
    suggestedActions.push('No action required');
  } else if (scores.overall >= t.lightPE) {
    decision = 'light_pe';
    estimatedEffort = 'low';
    suggestedActions.push('Quick review for minor issues');
    if (scores.style < 0.85) suggestedActions.push('Check style and register');
  } else if (scores.overall >= t.standardPE) {
    decision = 'standard_pe';
    estimatedEffort = 'medium';
    suggestedActions.push('Full review against source');
    if (scores.terminology < 0.75) suggestedActions.push('Verify terminology');
    if (scores.fluency < 0.75) suggestedActions.push('Improve fluency');
  } else {
    decision = 'full_revision';
    estimatedEffort = 'high';
    suggestedActions.push('Complete revision required');
    suggestedActions.push('Consider retranslation');
  }

  if (reasons.length === 0) {
    reasons.push(`Overall score: ${Math.round(scores.overall * 100)}%`);
  }

  const confidence = Math.abs(scores.overall - 0.875) * 4;

  return { decision, confidence: Math.min(0.99, confidence), reasons, estimatedEffort, suggestedActions };
}

export function getRoutingLabel(decision: RoutingDecision): {
  label: string;
  icon: string;
  color: string;
  description: string;
} {
  switch (decision) {
    case 'auto_accept':
      return { label: 'Auto Accept', icon: '✅', color: 'green', description: 'High quality — no review needed' };
    case 'light_pe':
      return { label: 'Light PE', icon: '🔵', color: 'blue', description: 'Quick review for minor issues' };
    case 'standard_pe':
      return { label: 'Standard PE', icon: '🟡', color: 'yellow', description: 'Standard post-editing required' };
    case 'full_revision':
      return { label: 'Full Revision', icon: '🟠', color: 'orange', description: 'Significant revision needed' };
    case 'reject':
      return { label: 'Reject', icon: '❌', color: 'red', description: 'Quality too low — retranslate' };
  }
}

export function estimateReviewTime(decision: RoutingDecision, wordCount: number): number {
  const wordsPerMinute = { auto_accept: 0, light_pe: 200, standard_pe: 50, full_revision: 20, reject: 0 };
  const rate = wordsPerMinute[decision];
  if (rate === 0) return 0;
  return Math.ceil(wordCount / rate);
}

export function routeBatch(
  items: Array<{ id: string; scores: QualityScores; wordCount?: number }>,
  thresholds?: Partial<RoutingThresholds>
): {
  autoAccept: string[];
  lightPE: string[];
  standardPE: string[];
  fullRevision: string[];
  reject: string[];
  summary: { totalItems: number; autoAcceptRate: number; avgQuality: number; totalReviewTime: number };
} {
  const groups = { autoAccept: [] as string[], lightPE: [] as string[], standardPE: [] as string[], fullRevision: [] as string[], reject: [] as string[] };
  let totalQuality = 0;
  let totalReviewTime = 0;

  for (const item of items) {
    const result = routeByQuality(item.scores, thresholds);
    totalQuality += item.scores.overall;

    switch (result.decision) {
      case 'auto_accept': groups.autoAccept.push(item.id); break;
      case 'light_pe': groups.lightPE.push(item.id); break;
      case 'standard_pe': groups.standardPE.push(item.id); break;
      case 'full_revision': groups.fullRevision.push(item.id); break;
      case 'reject': groups.reject.push(item.id); break;
    }

    if (item.wordCount) {
      totalReviewTime += estimateReviewTime(result.decision, item.wordCount);
    }
  }

  return {
    ...groups,
    summary: {
      totalItems: items.length,
      autoAcceptRate: items.length > 0 ? groups.autoAccept.length / items.length : 0,
      avgQuality: items.length > 0 ? totalQuality / items.length : 0,
      totalReviewTime,
    },
  };
}
