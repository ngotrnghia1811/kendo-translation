/**
 * MAC-RAG Multi-Candidate Translation Generator
 * Phase 2: Generates literal, natural, and formal translations in parallel.
 */

import { agentChat } from '../llm/provider';
import { getPromptTemplate } from '../agents/prompts';
import { formatTerminologyForPrompt } from '../retrieval/terminology';
import type { ContextObject } from '../context/context-builder';
import type { TMMatch } from '../retrieval/tm-search';
import type { TerminologyConstraints } from '../retrieval/terminology';

export interface TranslationCandidate {
  id: string;
  text: string;
  approach: 'literal' | 'natural' | 'formal';
  confidence: number;
  tokensUsed?: number;
  processingTime?: number;
}

export interface MultiGenOptions {
  sourceText: string;
  context: ContextObject;
  tmMatches?: TMMatch[];
  terminology?: TerminologyConstraints;
  approaches?: Array<'literal' | 'natural' | 'formal'>;
  parallel?: boolean;
  articleId?: string;
  videoId?: string;
  literalContext?: string;
}

export interface MultiGenResult {
  candidates: TranslationCandidate[];
  recommendedIndex: number;
  totalTime: number;
}

async function generateCandidate(
  approach: 'literal' | 'natural' | 'formal',
  sourceText: string,
  context: ContextObject,
  tmMatches: TMMatch[] = [],
  terminology?: TerminologyConstraints,
  literalContext?: string,
  articleId?: string,
  videoId?: string
): Promise<TranslationCandidate> {
  const startTime = Date.now();

  const systemPrompt = await getPromptTemplate('translation', approach);

  const contextLines: string[] = [
    `## Translation Task`,
    `Source (${context.sourceLang}): ${sourceText}`,
    `Target: ${context.targetLang}`,
    `Domain: ${context.domain.primary}`,
    `Formality: ${context.style.formality}`,
  ];

  if (context.style.keigoLevel) {
    contextLines.push(`Keigo level: ${context.style.keigoLevel}`);
  }

  if (tmMatches.length > 0) {
    contextLines.push('\n## Reference Translations (Translation Memory)');
    const topMatches = tmMatches.slice(0, 3);
    for (const match of topMatches) {
      contextLines.push(`Match (${match.matchPercentage}%): "${match.sourceText}" → "${match.targetText}"`);
    }
  }

  if (terminology) {
    const termSection = formatTerminologyForPrompt(terminology);
    if (termSection.trim()) {
      contextLines.push(`\n## Terminology Constraints\n${termSection}`);
    }
  }

  if (literalContext && approach !== 'literal') {
    contextLines.push(`\n## Literal Reference\n${literalContext}`);
  }

  const userPrompt = contextLines.join('\n') + '\n\nProvide ONLY the translated text, no explanations.';

  const response = await agentChat(
    'translation',
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: approach === 'literal' ? 0.1 : approach === 'natural' ? 0.4 : 0.2, articleId, videoId }
  );

  const processingTime = Date.now() - startTime;
  const translatedText = response.content.trim();

  return {
    id: `${approach}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    text: translatedText,
    approach,
    confidence: estimateConfidence(sourceText, translatedText, terminology),
    tokensUsed: response.usage ? response.usage.promptTokens + response.usage.completionTokens : undefined,
    processingTime,
  };
}

export function estimateConfidence(
  sourceText: string,
  translation: string,
  terminology?: TerminologyConstraints
): number {
  if (!translation || !translation.trim()) return 0;

  const srcLen = sourceText.length;
  const tgtLen = translation.length;
  const ratio = srcLen > 0 ? tgtLen / srcLen : 1;

  let confidence = 0.7;

  if (ratio >= 0.5 && ratio <= 2.0) {
    confidence += 0.15;
  } else if (ratio >= 0.3 && ratio <= 3.0) {
    confidence += 0.05;
  } else {
    confidence -= 0.10;
  }

  if (terminology && terminology.requiredTerms.length > 0) {
    const translationLower = translation.toLowerCase();
    const found = terminology.requiredTerms.filter(t =>
      translationLower.includes(t.englishTerm.toLowerCase())
    ).length;
    const termAdherence = found / terminology.requiredTerms.length;
    confidence += termAdherence * 0.15 - 0.075;
  }

  return Math.min(0.99, Math.max(0.10, confidence));
}

export async function generateMultipleCandidates(options: MultiGenOptions): Promise<MultiGenResult> {
  const startTime = Date.now();
  const {
    sourceText,
    context,
    tmMatches = [],
    terminology,
    approaches = ['literal', 'natural', 'formal'],
    parallel = true,
    articleId,
    videoId,
    literalContext,
  } = options;

  let candidates: TranslationCandidate[];

  if (parallel) {
    const promises = approaches.map(approach =>
      generateCandidate(approach, sourceText, context, tmMatches, terminology, literalContext, articleId, videoId)
    );
    candidates = await Promise.all(promises);
  } else {
    candidates = [];
    for (const approach of approaches) {
      const candidate = await generateCandidate(approach, sourceText, context, tmMatches, terminology, literalContext, articleId, videoId);
      candidates.push(candidate);
    }
  }

  const sortedIndices = candidates
    .map((c, i) => ({ confidence: c.confidence, index: i }))
    .sort((a, b) => b.confidence - a.confidence);

  const naturalIndex = candidates.findIndex(c => c.approach === 'natural');
  const recommendedIndex = naturalIndex >= 0 ? naturalIndex : sortedIndices[0]?.index ?? 0;

  return { candidates, recommendedIndex, totalTime: Date.now() - startTime };
}

export async function generateTranslation(
  sourceText: string,
  context: ContextObject,
  terminology?: TerminologyConstraints,
  articleId?: string,
  videoId?: string
): Promise<string> {
  const result = await generateMultipleCandidates({
    sourceText,
    context,
    terminology,
    approaches: ['natural'],
    parallel: false,
    articleId,
    videoId,
  });

  return result.candidates[0]?.text || '';
}
