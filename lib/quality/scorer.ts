/**
 * MAC-RAG Quality Scorer
 * Phase 3: LLM-assisted quality assessment of translations
 */

import { agentChat } from '../llm/provider';
import { getPromptTemplate } from '../agents/prompts';
import type { ContextObject } from '../context/context-builder';
import type { TerminologyConstraints } from '../retrieval/terminology';

export interface QualityScores {
  overall: number;
  fluency: number;
  adequacy: number;
  terminology: number;
  style: number;
}

export interface QualityIssue {
  type: 'fluency' | 'adequacy' | 'terminology' | 'style';
  severity: 'minor' | 'major' | 'critical';
  description: string;
  suggestion?: string;
  location?: string;
}

export interface QualityAssessment {
  scores: QualityScores;
  issues: QualityIssue[];
  routing: 'auto_accept' | 'light_pe' | 'standard_pe' | 'full_revision';
  summary: string;
}

export interface ScoringOptions {
  sourceText: string;
  translation: string;
  context: ContextObject;
  terminology?: TerminologyConstraints;
  literalContext?: string;
  articleId?: string;
  videoId?: string;
}

function determineRouting(overall: number): QualityAssessment['routing'] {
  if (overall >= 0.90) return 'auto_accept';
  if (overall >= 0.85) return 'light_pe';
  if (overall >= 0.70) return 'standard_pe';
  return 'full_revision';
}

export async function scoreTranslation(options: ScoringOptions): Promise<QualityAssessment> {
  const { sourceText, translation, context, terminology, literalContext, articleId, videoId } = options;

  let terminologySection = '';
  if (terminology && (terminology.requiredTerms.length > 0 || terminology.doNotTranslate.length > 0)) {
    const termLines: string[] = ['TERMINOLOGY REQUIREMENTS:'];
    for (const t of terminology.requiredTerms) {
      termLines.push(`  Required: "${t.japaneseTerm}" → "${t.englishTerm}"`);
    }
    for (const t of terminology.doNotTranslate) {
      termLines.push(`  Keep as-is: "${t.japaneseTerm}" → "${t.englishTerm}"`);
    }
    terminologySection = termLines.join('\n');
  }

  let styleSection = '';
  if (context.style) {
    styleSection = `STYLE REQUIREMENTS:
  - Formality: ${context.style.formality}
  - Tone: ${context.style.tone}
  - Audience: ${context.style.audience}`;
    if (context.style.keigoLevel) {
      styleSection += `\n  - Source keigo level: ${context.style.keigoLevel}`;
    }
  }

  let literalContextSection = '';
  if (literalContext) {
    literalContextSection = `LITERAL TRANSLATION (for reference):\n${literalContext}`;
  }

  const promptTemplate = await getPromptTemplate('reflection', 'quality');

  const filledPrompt = promptTemplate
    .replace('{sourceLang}', context.sourceLang.toUpperCase())
    .replace('{sourceText}', sourceText)
    .replace('{targetLang}', context.targetLang.toUpperCase())
    .replace('{translation}', translation)
    .replace('{terminologySection}', terminologySection)
    .replace('{styleSection}', styleSection)
    .replace('{literalContextSection}', literalContextSection);

  const response = await agentChat(
    'reflection',
    [{ role: 'user', content: filledPrompt }],
    { responseFormat: 'json', temperature: 0.1, articleId, videoId }
  );

  let parsed: { scores: { fluency: number; adequacy: number; terminology: number; style: number }; issues: QualityIssue[]; summary: string };

  try {
    parsed = JSON.parse(response.content);
  } catch {
    return {
      scores: { overall: 0.5, fluency: 0.5, adequacy: 0.5, terminology: 0.5, style: 0.5 },
      issues: [{ type: 'fluency', severity: 'minor', description: 'Could not parse quality scores' }],
      routing: 'standard_pe',
      summary: 'Quality assessment failed — manual review recommended.',
    };
  }

  const { scores: raw, issues = [], summary = '' } = parsed;

  const weights = { fluency: 0.30, adequacy: 0.35, terminology: 0.20, style: 0.15 };
  const overall = Math.min(1.0, Math.max(0.0,
    raw.fluency * weights.fluency +
    raw.adequacy * weights.adequacy +
    raw.terminology * weights.terminology +
    raw.style * weights.style
  ));

  const scores: QualityScores = { overall, fluency: raw.fluency, adequacy: raw.adequacy, terminology: raw.terminology, style: raw.style };

  return { scores, issues, routing: determineRouting(overall), summary };
}

export function quickScore(options: ScoringOptions): QualityScores {
  const { sourceText, translation, terminology } = options;

  const srcLen = sourceText.length;
  const tgtLen = translation.length;
  const ratio = srcLen > 0 ? tgtLen / srcLen : 1;
  const lengthScore = ratio >= 0.3 && ratio <= 3.0 ? 0.8 : 0.5;

  let terminologyScore = 0.8;
  if (terminology && terminology.requiredTerms.length > 0) {
    const translationLower = translation.toLowerCase();
    const found = terminology.requiredTerms.filter(t => translationLower.includes(t.englishTerm.toLowerCase())).length;
    terminologyScore = found / terminology.requiredTerms.length;
  }

  const overall = (lengthScore * 0.5 + terminologyScore * 0.5);

  return { overall, fluency: lengthScore, adequacy: lengthScore, terminology: terminologyScore, style: 0.8 };
}
