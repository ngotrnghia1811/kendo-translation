'use client';

/**
 * MAC-RAG React Hook
 * Provides easy access to the MAC-RAG translation pipeline from React components
 */

import { useState, useCallback, useMemo } from 'react';

export type TranslationPhase = 'idle' | 'context' | 'translate' | 'score' | 'complete' | 'error';

export interface MacRagState {
  phase: TranslationPhase;
  isLoading: boolean;
  error: string | null;
  context: ContextData | null;
  tmMatches: TMMatchData[];
  terminology: TerminologyData | null;
  jaAnalysis: JaAnalysisData | null;
  coverageReport: CoverageReportData | null;
  candidates: CandidateData[];
  recommendedIndex: number;
  selectedCandidate: CandidateData | null;
  qualityAssessment: QualityData | null;
  routing: RoutingData | null;
  timings: Record<string, number>;
}

export interface ContextData {
  sourceText: string;
  sourceLang: 'ja' | 'en';
  targetLang: 'ja' | 'en';
  domain: { primary: string; confidence: number };
  style: { formality: string; tone: string; keigoLevel?: string };
  entities: Array<{ text: string; type: string; translation?: string }>;
  estimatedComplexity: string;
}

export interface TMMatchData {
  id: string;
  sourceText: string;
  targetText: string;
  matchPercentage: number;
  selected: boolean;
}

export interface TerminologyData {
  requiredTerms: Array<{ id: string; japaneseTerm: string; englishTerm: string }>;
  doNotTranslate: Array<{ id: string; japaneseTerm: string; englishTerm: string }>;
  preferredTerms: Array<{ id: string; japaneseTerm: string; englishTerm: string }>;
}

export interface JaAnalysisData {
  subjects: Array<{ inferredSubject: string; confidence: number; originalVerb?: string }>;
  honorifics: { level: string; targetRegister: string };
  structure: { sentenceType: string; needsRestructuring: boolean };
  specialHandling: Array<{ type: string; text: string; suggestion: string }>;
}

export interface CoverageReportData {
  overallCoverage: number;
  gaps: Array<{ type: string; severity: string; description: string }>;
  strengths: string[];
  recommendations: string[];
}

export interface CandidateData {
  id: string;
  text: string;
  approach: 'literal' | 'natural' | 'formal';
  confidence: number;
  isRecommended?: boolean;
}

export interface QualityData {
  scores: {
    overall: number;
    fluency: number;
    adequacy: number;
    terminology: number;
    style: number;
  };
  issues: Array<{ type: string; severity: string; description: string }>;
  routing: string;
}

export interface RoutingData {
  decision: string;
  confidence: number;
  estimatedEffort: string;
  suggestedActions: string[];
}

const initialState: MacRagState = {
  phase: 'idle',
  isLoading: false,
  error: null,
  context: null,
  tmMatches: [],
  terminology: null,
  jaAnalysis: null,
  coverageReport: null,
  candidates: [],
  recommendedIndex: 0,
  selectedCandidate: null,
  qualityAssessment: null,
  routing: null,
  timings: {},
};

export function useMacRag() {
  const [state, setState] = useState<MacRagState>(initialState);

  const reset = useCallback(() => setState(initialState), []);

  const buildContext = useCallback(async (sourceText: string, options?: {
    sourceLang?: 'ja' | 'en';
    targetLang?: 'ja' | 'en';
  }) => {
    setState(prev => ({ ...prev, phase: 'context', isLoading: true, error: null }));

    try {
      const response = await fetch('/api/translate/mac-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceText, phase: 'context', ...options }),
      });

      if (!response.ok) throw new Error('Failed to build context');

      const data = await response.json();

      setState(prev => ({
        ...prev,
        phase: 'context',
        isLoading: false,
        context: data.context,
        tmMatches: (data.tmMatches || []).map((m: TMMatchData) => ({
          ...m,
          selected: m.matchPercentage >= 70,
        })),
        terminology: data.terminology,
        jaAnalysis: data.jaAnalysis,
        coverageReport: data.coverageReport,
        timings: data.timings || {},
      }));

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, phase: 'error', isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const translate = useCallback(async (options?: {
    approaches?: Array<'literal' | 'natural' | 'formal'>;
    includeTMIds?: string[];
    excludeTMIds?: string[];
    literalContext?: string;
    articleId?: string;
    videoId?: string;
  }) => {
    if (!state.context) throw new Error('Context must be built first');

    setState(prev => ({ ...prev, phase: 'translate', isLoading: true, error: null }));

    try {
      const response = await fetch('/api/translate/mac-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: state.context.sourceText,
          sourceLang: state.context.sourceLang,
          targetLang: state.context.targetLang,
          phase: 'translate',
          literalContext: options?.literalContext,
          articleId: options?.articleId,
          videoId: options?.videoId,
          options,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate translations');

      const data = await response.json();
      const candidates = data.candidates || [];
      const recommendedIndex = data.recommendedIndex || 0;

      setState(prev => ({
        ...prev,
        phase: 'translate',
        isLoading: false,
        candidates,
        recommendedIndex,
        selectedCandidate: candidates[recommendedIndex] || null,
        timings: { ...prev.timings, ...data.timings },
      }));

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, phase: 'error', isLoading: false, error: message }));
      throw error;
    }
  }, [state.context]);

  const selectCandidate = useCallback((candidateId: string) => {
    setState(prev => {
      const candidate = prev.candidates.find(c => c.id === candidateId);
      return { ...prev, selectedCandidate: candidate || null };
    });
  }, []);

  const toggleTMMatch = useCallback((matchId: string) => {
    setState(prev => ({
      ...prev,
      tmMatches: prev.tmMatches.map(m => m.id === matchId ? { ...m, selected: !m.selected } : m),
    }));
  }, []);

  const score = useCallback(async (translation?: string, options?: { literalContext?: string }) => {
    const textToScore = translation || state.selectedCandidate?.text;
    if (!textToScore || !state.context) throw new Error('Translation and context required');

    setState(prev => ({ ...prev, phase: 'score', isLoading: true, error: null }));

    try {
      const response = await fetch('/api/translate/mac-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: state.context.sourceText,
          sourceLang: state.context.sourceLang,
          targetLang: state.context.targetLang,
          phase: 'score',
          translation: textToScore,
          literalContext: options?.literalContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to score translation');

      const data = await response.json();

      setState(prev => ({
        ...prev,
        phase: 'complete',
        isLoading: false,
        qualityAssessment: data.qualityAssessment,
        routing: data.routing,
        timings: { ...prev.timings, ...data.timings },
      }));

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, phase: 'error', isLoading: false, error: message }));
      throw error;
    }
  }, [state.context, state.selectedCandidate]);

  const runFullPipeline = useCallback(async (sourceText: string, options?: {
    sourceLang?: 'ja' | 'en';
    targetLang?: 'ja' | 'en';
    approaches?: Array<'literal' | 'natural' | 'formal'>;
  }) => {
    setState(prev => ({ ...prev, phase: 'context', isLoading: true, error: null }));

    try {
      const response = await fetch('/api/translate/mac-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceText, phase: 'full', ...options }),
      });

      if (!response.ok) throw new Error('Pipeline failed');

      const data = await response.json();
      const candidates = data.candidates || [];
      const recommendedIndex = data.recommendedIndex || 0;

      setState({
        phase: 'complete',
        isLoading: false,
        error: null,
        context: data.context,
        tmMatches: (data.tmMatches || []).map((m: TMMatchData) => ({
          ...m,
          selected: m.matchPercentage >= 70,
        })),
        terminology: data.terminology,
        jaAnalysis: data.jaAnalysis,
        coverageReport: data.coverageReport,
        candidates,
        recommendedIndex,
        selectedCandidate: candidates[recommendedIndex] || null,
        qualityAssessment: data.qualityAssessment,
        routing: data.routing,
        timings: data.timings || {},
      });

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, phase: 'error', isLoading: false, error: message }));
      throw error;
    }
  }, []);

  return useMemo(() => ({
    ...state,
    reset,
    buildContext,
    translate,
    selectCandidate,
    toggleTMMatch,
    score,
    runFullPipeline,
  }), [state, reset, buildContext, translate, selectCandidate, toggleTMMatch, score, runFullPipeline]);
}

export default useMacRag;
