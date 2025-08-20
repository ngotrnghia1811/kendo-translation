/**
 * MAC-RAG Context Pairer
 * Layer 3: Synthesize retrieved context into weighted, unified prompt context
 */

import type { ContextObject } from './context-builder';
import type { TMMatch } from '../retrieval/tm-search';
import type { TerminologyConstraints, TermEntry } from '../retrieval/terminology';

export interface ContextWeight {
  source: 'tm' | 'terminology' | 'corpus' | 'user';
  weight: number;
  reason: string;
}

export interface PairedContext {
  context: ContextObject;
  selectedTMMatches: Array<TMMatch & { weight: number }>;
  selectedTerms: Array<TermEntry & { weight: number }>;
  promptContext: string;
  weights: ContextWeight[];
  totalWeight: number;
  confidenceScore: number;
  gapsIdentified: string[];
}

export interface ContextPairingOptions {
  context: ContextObject;
  tmMatches: TMMatch[];
  terminology: TerminologyConstraints;
  userOverrides?: {
    includeTMIds?: string[];
    excludeTMIds?: string[];
    includeTermIds?: string[];
    excludeTermIds?: string[];
  };
  maxTMMatches?: number;
  maxTerms?: number;
}

function calculateTMWeight(match: TMMatch, context: ContextObject): number {
  let weight = (match.matchPercentage / 100) * 0.5;

  if (match.domain === context.domain.primary) weight += 0.15;
  else if (match.domain === context.domain.secondary) weight += 0.08;

  if (match.qualityScore) weight += match.qualityScore * 0.15;

  if (match.createdAt) {
    const daysSince = (Date.now() - new Date(match.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) weight += 0.10;
    else if (daysSince < 30) weight += 0.05;
  }

  if (match.metadata?.helpfulCount && match.metadata.helpfulCount > 0) {
    weight += Math.min(0.10, match.metadata.helpfulCount * 0.02);
  }

  return Math.min(1.0, weight);
}

function calculateTermWeight(term: TermEntry, context: ContextObject): number {
  let weight = term.confidence || 0.5;

  switch (term.type) {
    case 'required': weight = Math.max(weight, 0.9); break;
    case 'do_not_translate': weight = Math.max(weight, 0.85); break;
    case 'preferred': weight *= 0.95; break;
    case 'forbidden': weight = 1.0; break;
  }

  if (term.domain === context.domain.primary) weight = Math.min(1.0, weight + 0.10);

  return weight;
}

function identifyGaps(
  context: ContextObject,
  tmMatches: TMMatch[],
  terminology: TerminologyConstraints
): string[] {
  const gaps: string[] = [];

  for (const entity of context.entities) {
    const hasTerm =
      terminology.requiredTerms.some(t => t.japaneseTerm === entity.text) ||
      terminology.preferredTerms.some(t => t.japaneseTerm === entity.text) ||
      terminology.doNotTranslate.some(t => t.japaneseTerm === entity.text);

    if (!hasTerm && !entity.translation) {
      gaps.push(`No terminology for: "${entity.text}"`);
    }
  }

  if (tmMatches.length === 0 || (tmMatches[0] && tmMatches[0].matchPercentage < 50)) {
    gaps.push('Low TM coverage - no close matches found');
  }

  if (context.estimatedComplexity === 'high' && tmMatches.length < 3) {
    gaps.push('Complex text with limited reference examples');
  }

  return gaps;
}

function buildPromptContext(
  context: ContextObject,
  selectedTM: Array<TMMatch & { weight: number }>,
  selectedTerms: Array<TermEntry & { weight: number }>
): string {
  const sections: string[] = [];

  sections.push(`## Source Analysis
- Domain: ${context.domain.primary} (${Math.round(context.domain.confidence * 100)}% confidence)
- Style: ${context.style.formality}, ${context.style.tone}
- Audience: ${context.style.audience}
${context.style.keigoLevel ? `- Keigo Level: ${context.style.keigoLevel}` : ''}
- Complexity: ${context.estimatedComplexity}
- Segments: ${context.segmentCount}`);

  if (selectedTM.length > 0) {
    sections.push(`\n## Reference Translations (Translation Memory)`);
    const sortedTM = [...selectedTM].sort((a, b) => b.weight - a.weight);
    for (const match of sortedTM) {
      sections.push(`\n### Match: ${match.matchPercentage}% (weight: ${Math.round(match.weight * 100)}%)
Source: ${match.sourceText}
Translation: ${match.targetText}`);
    }
  }

  const requiredTerms = selectedTerms.filter(t => t.type === 'required');
  const doNotTranslate = selectedTerms.filter(t => t.type === 'do_not_translate');
  const preferredTerms = selectedTerms.filter(t => t.type === 'preferred');

  if (requiredTerms.length > 0 || doNotTranslate.length > 0) {
    sections.push(`\n## Terminology Constraints`);

    if (requiredTerms.length > 0) {
      sections.push(`\n### Required Translations (MUST use these):`);
      for (const term of requiredTerms) {
        sections.push(`- ${term.japaneseTerm} → ${term.englishTerm}${term.notes ? ` (${term.notes})` : ''}`);
      }
    }

    if (doNotTranslate.length > 0) {
      sections.push(`\n### Do Not Translate (keep as romanized):`);
      for (const term of doNotTranslate) {
        sections.push(`- ${term.japaneseTerm} → ${term.englishTerm}`);
      }
    }

    if (preferredTerms.length > 0) {
      sections.push(`\n### Preferred (use when applicable):`);
      for (const term of preferredTerms) {
        sections.push(`- ${term.japaneseTerm} → ${term.englishTerm}`);
      }
    }
  }

  if (context.entities.length > 0) {
    sections.push(`\n## Detected Entities`);
    for (const entity of context.entities.slice(0, 10)) {
      sections.push(`- ${entity.text} (${entity.type})${entity.translation ? ` → ${entity.translation}` : ''}`);
    }
  }

  return sections.join('\n');
}

export function pairContext(options: ContextPairingOptions): PairedContext {
  const {
    context,
    tmMatches,
    terminology,
    userOverrides = {},
    maxTMMatches = 5,
    maxTerms = 20,
  } = options;

  let weightedTM = tmMatches
    .filter(tm => {
      if (userOverrides.excludeTMIds?.includes(tm.id)) return false;
      if (userOverrides.includeTMIds && !userOverrides.includeTMIds.includes(tm.id)) {
        return tm.matchPercentage >= 70;
      }
      return true;
    })
    .map(tm => ({ ...tm, weight: calculateTMWeight(tm, context) }));

  weightedTM = weightedTM.sort((a, b) => b.weight - a.weight).slice(0, maxTMMatches);

  const allTerms = [
    ...terminology.requiredTerms,
    ...terminology.doNotTranslate,
    ...terminology.preferredTerms,
    ...terminology.forbiddenTerms,
  ];

  let weightedTerms = allTerms
    .filter(term => !userOverrides.excludeTermIds?.includes(term.id))
    .map(term => ({ ...term, weight: calculateTermWeight(term, context) }));

  weightedTerms = weightedTerms.sort((a, b) => b.weight - a.weight).slice(0, maxTerms);

  const gaps = identifyGaps(context, tmMatches, terminology);
  const promptContext = buildPromptContext(context, weightedTM, weightedTerms);

  const tmConfidence = weightedTM.length > 0
    ? weightedTM.reduce((sum, tm) => sum + tm.weight, 0) / weightedTM.length
    : 0.5;
  const termConfidence = weightedTerms.length > 0
    ? weightedTerms.reduce((sum, t) => sum + t.weight, 0) / weightedTerms.length
    : 0.5;
  const gapPenalty = Math.max(0, 0.1 * gaps.length);

  const confidenceScore = Math.max(
    0.3,
    (tmConfidence * 0.4 + termConfidence * 0.4 + context.domain.confidence * 0.2) - gapPenalty
  );

  const weights: ContextWeight[] = [
    { source: 'tm', weight: tmConfidence, reason: `${weightedTM.length} TM matches selected` },
    { source: 'terminology', weight: termConfidence, reason: `${weightedTerms.length} terms applied` },
  ];

  return {
    context,
    selectedTMMatches: weightedTM,
    selectedTerms: weightedTerms,
    promptContext,
    weights,
    totalWeight: confidenceScore,
    confidenceScore,
    gapsIdentified: gaps,
  };
}

export function synthesizeQuickContext(
  context: ContextObject,
  terminology?: TerminologyConstraints
): string {
  const sections: string[] = [];
  sections.push(`Domain: ${context.domain.primary}`);
  sections.push(`Style: ${context.style.formality}`);

  if (terminology?.requiredTerms.length) {
    sections.push(`\nRequired terms:`);
    for (const t of terminology.requiredTerms.slice(0, 5)) {
      sections.push(`  ${t.japaneseTerm} → ${t.englishTerm}`);
    }
  }

  return sections.join('\n');
}
