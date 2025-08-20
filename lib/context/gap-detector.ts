/**
 * MAC-RAG Coverage Gap Detector
 * Layer 4: Identify gaps in translation context coverage
 */

import type { ContextObject, Entity } from './context-builder';
import type { TMMatch } from '../retrieval/tm-search';
import type { TerminologyConstraints } from '../retrieval/terminology';

export interface CoverageGap {
  type: 'terminology' | 'tm' | 'entity' | 'domain' | 'style';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  affectedText?: string;
  canAutoResolve: boolean;
}

export interface CoverageReport {
  overallCoverage: number;
  gaps: CoverageGap[];
  strengths: string[];
  warnings: string[];
  recommendations: string[];
}

export interface GapDetectionOptions {
  context: ContextObject;
  tmMatches: TMMatch[];
  terminology: TerminologyConstraints;
  strictMode?: boolean;
}

function detectTerminologyGaps(entities: Entity[], terminology: TerminologyConstraints): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  const knownTerms = new Set([
    ...terminology.requiredTerms.map(t => t.japaneseTerm),
    ...terminology.preferredTerms.map(t => t.japaneseTerm),
    ...terminology.doNotTranslate.map(t => t.japaneseTerm),
  ]);

  for (const entity of entities) {
    if (!entity.translation && !knownTerms.has(entity.text)) {
      gaps.push({
        type: 'terminology',
        severity: entity.type === 'technique' || entity.type === 'term' ? 'high' : 'medium',
        description: `No translation defined for "${entity.text}" (${entity.type})`,
        suggestion: `Add "${entity.text}" to terminology database`,
        affectedText: entity.text,
        canAutoResolve: false,
      });
    }
  }

  return gaps;
}

function detectTMGaps(context: ContextObject, tmMatches: TMMatch[]): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  if (tmMatches.length === 0) {
    gaps.push({
      type: 'tm',
      severity: 'medium',
      description: 'No translation memory matches found',
      suggestion: 'Translation will rely entirely on LLM without reference examples',
      canAutoResolve: false,
    });
  } else if (tmMatches.every(m => m.matchPercentage < 70)) {
    gaps.push({
      type: 'tm',
      severity: 'low',
      description: `Best TM match is only ${tmMatches[0]?.matchPercentage || 0}%`,
      suggestion: 'Consider adding this translation to TM after review',
      canAutoResolve: false,
    });
  }

  if (context.estimatedComplexity === 'high' && tmMatches.length < 3) {
    gaps.push({
      type: 'tm',
      severity: 'medium',
      description: 'Complex text with limited reference translations',
      suggestion: 'Manual review recommended for accuracy',
      canAutoResolve: false,
    });
  }

  return gaps;
}

function detectDomainGaps(context: ContextObject, tmMatches: TMMatch[]): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  if (context.domain.confidence < 0.6) {
    gaps.push({
      type: 'domain',
      severity: 'medium',
      description: `Low confidence in domain classification (${Math.round(context.domain.confidence * 100)}%)`,
      suggestion: 'Manually verify domain setting before translation',
      canAutoResolve: true,
    });
  }

  const domainMismatches = tmMatches.filter(m => m.domain && m.domain !== context.domain.primary);
  if (domainMismatches.length > tmMatches.length / 2) {
    gaps.push({
      type: 'domain',
      severity: 'low',
      description: 'Most TM matches are from a different domain',
      suggestion: 'Verify terminology consistency across domains',
      canAutoResolve: false,
    });
  }

  return gaps;
}

function detectStyleGaps(context: ContextObject): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  if (context.style.keigoLevel === 'casual' && context.style.formality === 'formal') {
    gaps.push({
      type: 'style',
      severity: 'low',
      description: 'Mismatch between detected keigo and formality setting',
      suggestion: 'Review formality setting for consistency',
      canAutoResolve: true,
    });
  }

  if (context.style.tone === 'instructional' && context.style.audience === 'general') {
    gaps.push({
      type: 'style',
      severity: 'low',
      description: 'Instructional content without specific audience level',
      suggestion: 'Consider setting audience to beginner/intermediate/advanced',
      canAutoResolve: true,
    });
  }

  return gaps;
}

function identifyStrengths(
  context: ContextObject,
  tmMatches: TMMatch[],
  terminology: TerminologyConstraints
): string[] {
  const strengths: string[] = [];

  if (tmMatches.length > 0 && tmMatches[0].matchPercentage >= 90) {
    strengths.push(`High-quality TM match (${tmMatches[0].matchPercentage}%)`);
  }

  if (context.domain.confidence >= 0.85) {
    strengths.push(`Strong domain classification: ${context.domain.primary}`);
  }

  const totalTerms = terminology.requiredTerms.length + terminology.doNotTranslate.length;
  if (totalTerms >= 5) strengths.push(`Good terminology coverage (${totalTerms} terms)`);

  if (context.entities.length > 0 && context.entities.every(e => e.translation || e.confidence >= 0.9)) {
    strengths.push('All entities have translations');
  }

  if (context.estimatedComplexity === 'low') {
    strengths.push('Low complexity - straightforward translation expected');
  }

  return strengths;
}

function generateRecommendations(gaps: CoverageGap[]): string[] {
  const recommendations: string[] = [];

  const termGaps = gaps.filter(g => g.type === 'terminology');
  if (termGaps.length > 0) {
    recommendations.push(`Add ${termGaps.length} missing terms to glossary before translation`);
  }

  const highSeverity = gaps.filter(g => g.severity === 'high');
  if (highSeverity.length > 0) recommendations.push('Address high-severity gaps before proceeding');

  if (gaps.some(g => g.type === 'tm' && g.severity !== 'low')) {
    recommendations.push('Consider manual review due to limited TM references');
  }

  if (gaps.length === 0) recommendations.push('Context is well-covered - proceed with confidence');

  return recommendations;
}

export function detectGaps(options: GapDetectionOptions): CoverageReport {
  const { context, tmMatches, terminology, strictMode = false } = options;

  const allGaps: CoverageGap[] = [
    ...detectTerminologyGaps(context.entities, terminology),
    ...detectTMGaps(context, tmMatches),
    ...detectDomainGaps(context, tmMatches),
    ...detectStyleGaps(context),
  ];

  const gaps = strictMode
    ? allGaps
    : allGaps.filter(g => g.severity !== 'low' || g.type === 'terminology');

  let coverageScore = 1.0;
  for (const gap of gaps) {
    switch (gap.severity) {
      case 'high': coverageScore -= 0.20; break;
      case 'medium': coverageScore -= 0.10; break;
      case 'low': coverageScore -= 0.05; break;
    }
  }
  coverageScore = Math.max(0, coverageScore);

  const strengths = identifyStrengths(context, tmMatches, terminology);
  const warnings = gaps.filter(g => g.severity === 'high').map(g => g.description);
  const recommendations = generateRecommendations(gaps);

  return { overallCoverage: coverageScore, gaps, strengths, warnings, recommendations };
}

export function hasCriticalGaps(options: GapDetectionOptions): boolean {
  const report = detectGaps(options);
  return report.gaps.some(g => g.severity === 'high');
}

export function formatGapsForDisplay(gaps: CoverageGap[]): string {
  const lines: string[] = [];

  const byType = {
    terminology: gaps.filter(g => g.type === 'terminology'),
    tm: gaps.filter(g => g.type === 'tm'),
    domain: gaps.filter(g => g.type === 'domain'),
    style: gaps.filter(g => g.type === 'style'),
  };

  for (const [type, typeGaps] of Object.entries(byType)) {
    if (typeGaps.length > 0) {
      lines.push(`\n### ${type.toUpperCase()} Gaps`);
      for (const gap of typeGaps) {
        const icon = gap.severity === 'high' ? '❌' : gap.severity === 'medium' ? '⚠️' : 'ℹ️';
        lines.push(`${icon} ${gap.description}`);
        lines.push(`   → ${gap.suggestion}`);
      }
    }
  }

  return lines.join('\n');
}
