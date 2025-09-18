import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildContext } from '@/lib/context/context-builder';
import { analyzeJaForTranslation, generateTranslationGuidance } from '@/lib/agents/ja-en-agent';
import { searchTM } from '@/lib/retrieval/tm-search';
import { searchTerminology } from '@/lib/retrieval/terminology';
import { pairContext } from '@/lib/context/context-pairer';
import { detectGaps } from '@/lib/context/gap-detector';
import { generateMultipleCandidates } from '@/lib/translation/multi-gen';
import { scoreTranslation } from '@/lib/quality/scorer';
import { routeByQuality } from '@/lib/quality/routing';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    sourceText,
    sourceLang,
    targetLang,
    phase = 'full',
    translation,
    approaches,
    literalContext,
    articleId,
    videoId,
  } = body;

  if (!sourceText) {
    return NextResponse.json({ error: 'sourceText is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const timings: Record<string, number> = {};

  try {
    if (phase === 'context' || phase === 'full') {
      const t0 = Date.now();
      const context = await buildContext({ sourceText, sourceLang, targetLang });
      timings.context = Date.now() - t0;

      const [tmResult, termResult] = await Promise.all([
        searchTM(supabase, {
          sourceText,
          sourceLang: context.sourceLang,
          domain: context.domain.primary,
          minMatchScore: 50,
          maxResults: 10,
        }),
        searchTerminology(supabase, {
          text: sourceText,
          sourceLang: context.sourceLang,
          domain: context.domain.primary,
        }),
      ]);
      timings.retrieval = Date.now() - t0 - timings.context;

      let jaAnalysis = null;
      let guidance = '';
      if (context.sourceLang === 'ja') {
        jaAnalysis = analyzeJaForTranslation(sourceText);
        guidance = generateTranslationGuidance(jaAnalysis);
      }

      const paired = pairContext({
        context,
        tmMatches: tmResult.matches,
        terminology: termResult.constraints,
      });

      const coverageReport = detectGaps({
        context,
        tmMatches: tmResult.matches,
        terminology: termResult.constraints,
      });

      if (phase === 'context') {
        return NextResponse.json({
          context: {
            sourceText: context.sourceText,
            sourceLang: context.sourceLang,
            targetLang: context.targetLang,
            domain: context.domain,
            style: context.style,
            entities: context.entities,
            estimatedComplexity: context.estimatedComplexity,
          },
          tmMatches: tmResult.matches,
          terminology: {
            requiredTerms: termResult.constraints.requiredTerms,
            doNotTranslate: termResult.constraints.doNotTranslate,
            preferredTerms: termResult.constraints.preferredTerms,
          },
          jaAnalysis,
          jaGuidance: guidance,
          coverageReport: {
            overallCoverage: coverageReport.overallCoverage,
            gaps: coverageReport.gaps,
            strengths: coverageReport.strengths,
            recommendations: coverageReport.recommendations,
          },
          timings,
        });
      }

      // Phase full: continue to generate candidates
      const genT = Date.now();
      const genResult = await generateMultipleCandidates({
        sourceText,
        context,
        tmMatches: paired.selectedTMMatches,
        terminology: termResult.constraints,
        approaches: approaches || ['literal', 'natural', 'formal'],
        parallel: true,
        literalContext: literalContext || (jaAnalysis ? guidance : undefined),
        articleId,
        videoId,
      });
      timings.generation = Date.now() - genT;

      const bestCandidate = genResult.candidates[genResult.recommendedIndex];
      if (!bestCandidate) {
        return NextResponse.json({ error: 'No translation generated' }, { status: 500 });
      }

      const scoreT = Date.now();
      const qualityAssessment = await scoreTranslation({
        sourceText,
        translation: bestCandidate.text,
        context,
        terminology: termResult.constraints,
        literalContext,
        articleId,
        videoId,
      });
      timings.scoring = Date.now() - scoreT;

      const routing = routeByQuality(qualityAssessment.scores);

      return NextResponse.json({
        context: {
          sourceText: context.sourceText,
          sourceLang: context.sourceLang,
          targetLang: context.targetLang,
          domain: context.domain,
          style: context.style,
          entities: context.entities,
          estimatedComplexity: context.estimatedComplexity,
        },
        tmMatches: tmResult.matches,
        terminology: {
          requiredTerms: termResult.constraints.requiredTerms,
          doNotTranslate: termResult.constraints.doNotTranslate,
          preferredTerms: termResult.constraints.preferredTerms,
        },
        jaAnalysis,
        coverageReport: {
          overallCoverage: coverageReport.overallCoverage,
          gaps: coverageReport.gaps,
          strengths: coverageReport.strengths,
          recommendations: coverageReport.recommendations,
        },
        candidates: genResult.candidates,
        recommendedIndex: genResult.recommendedIndex,
        qualityAssessment: { scores: qualityAssessment.scores, issues: qualityAssessment.issues, routing: qualityAssessment.routing, summary: qualityAssessment.summary },
        routing: { decision: routing.decision, confidence: routing.confidence, estimatedEffort: routing.estimatedEffort, suggestedActions: routing.suggestedActions },
        timings,
      });
    }

    if (phase === 'translate') {
      const context = await buildContext({ sourceText, sourceLang, targetLang });
      const termResult = await searchTerminology(supabase, { text: sourceText, sourceLang: context.sourceLang });
      const tmResult = await searchTM(supabase, { sourceText, sourceLang: context.sourceLang, domain: context.domain.primary });

      let guidance: string | undefined;
      if (context.sourceLang === 'ja') {
        const jaAnalysis = analyzeJaForTranslation(sourceText);
        guidance = generateTranslationGuidance(jaAnalysis);
      }

      const genResult = await generateMultipleCandidates({
        sourceText,
        context,
        tmMatches: tmResult.matches,
        terminology: termResult.constraints,
        approaches: approaches || ['literal', 'natural', 'formal'],
        parallel: true,
        literalContext: literalContext || guidance,
        articleId,
        videoId,
      });

      return NextResponse.json({
        candidates: genResult.candidates,
        recommendedIndex: genResult.recommendedIndex,
        timings,
      });
    }

    if (phase === 'score') {
      if (!translation) {
        return NextResponse.json({ error: 'translation is required for scoring phase' }, { status: 400 });
      }

      const context = await buildContext({ sourceText, sourceLang, targetLang });
      const termResult = await searchTerminology(supabase, { text: sourceText, sourceLang: context.sourceLang });

      const t0 = Date.now();
      const qualityAssessment = await scoreTranslation({
        sourceText,
        translation,
        context,
        terminology: termResult.constraints,
        literalContext,
        articleId,
        videoId,
      });
      timings.scoring = Date.now() - t0;

      const routing = routeByQuality(qualityAssessment.scores);

      return NextResponse.json({
        qualityAssessment: { scores: qualityAssessment.scores, issues: qualityAssessment.issues, routing: qualityAssessment.routing, summary: qualityAssessment.summary },
        routing: { decision: routing.decision, confidence: routing.confidence, estimatedEffort: routing.estimatedEffort, suggestedActions: routing.suggestedActions },
        timings,
      });
    }

    return NextResponse.json({ error: `Unknown phase: ${phase}` }, { status: 400 });

  } catch (error) {
    console.error('MAC-RAG API error:', error);
    return NextResponse.json(
      { error: 'Translation pipeline failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
