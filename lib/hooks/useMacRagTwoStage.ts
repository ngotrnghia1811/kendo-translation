'use client';

/**
 * Two-stage MAC-RAG hook
 *
 * Provides `compose` (retrieval + prompt assembly, no LLM) and `generate`
 * (LLM call with optional human-edited prompt) as separate steps.
 *
 * Usage:
 *   const { compose, generate, composed, generated, composing, generating, error } = useMacRagTwoStage();
 *
 *   // Step 1 — assemble prompt for human review
 *   const assembled = await compose(segmentId, 'translate');
 *   // … human edits assembled.prompt.system / assembled.prompt.user …
 *
 *   // Step 2 — generate with (possibly edited) prompt
 *   const result = await generate({
 *     segmentId,
 *     phase: 'translate',
 *     promptSystem: editedSystem,
 *     promptUser: editedUser,
 *     originalPromptSystem: assembled.prompt.system,
 *     originalPromptUser: assembled.prompt.user,
 *   });
 */

import { useState } from 'react';

// ── Response types (match the API route return shapes) ────────────────

export interface ComposeResult {
  segment_id: string;
  phase: string;
  source_text: string;
  target_text: string | null;
  prompt: { system: string; user: string };
  tm_matches: Array<{
    id: string;
    sourceText: string;
    targetText: string;
    matchPercentage: number;
    matchType: 'exact' | 'high' | 'fuzzy' | 'low';
    domain?: string;
    qualityScore?: number;
    retrievalLayer?: 'project' | 'external';
    createdAt: string;
    metadata?: { articleId?: string; feedbackScore?: number };
  }>;
  terminology: {
    requiredTerms: Array<{
      id: string;
      japaneseTerm: string;
      englishTerm: string;
      domain: string;
      type: string;
      confidence: number;
      notes?: string;
    }>;
    preferredTerms: Array<{
      id: string;
      japaneseTerm: string;
      englishTerm: string;
      domain: string;
      type: string;
      confidence: number;
      notes?: string;
    }>;
    doNotTranslate: Array<{
      id: string;
      japaneseTerm: string;
      englishTerm: string;
      domain: string;
      type: string;
      confidence: number;
      notes?: string;
    }>;
  };
  l2_context: {
    document_title: string | null;
    neighbours: {
      prev: { source_text: string; usable: boolean; reasons?: string[] } | null;
      next: { source_text: string; usable: boolean; reasons?: string[] } | null;
    };
    terms_already_annotated: string[];
  };
  timings: { retrieval_ms: number; compose_ms: number };
}

export interface GenerateResult {
  segment_id: string;
  phase: string;
  proposed_text: string;
  prompt_edited: boolean;
  prompt_edit_id: string | null;
  advisory?: boolean;
  timings: { llm_ms: number };
}

export interface GenerateParams {
  segmentId: string;
  phase: string;
  promptSystem: string;
  promptUser: string;
  originalPromptSystem?: string;
  originalPromptUser?: string;
}

export function useMacRagTwoStage() {
  const [composing, setComposing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [composed, setComposed] = useState<ComposeResult | null>(null);
  const [generated, setGenerated] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Stage 1: Compose — retrieval + prompt assembly (no LLM call).
   */
  async function compose(
    segmentId: string,
    phase: string,
  ): Promise<ComposeResult> {
    setComposing(true);
    setError(null);
    try {
      const response = await fetch('/api/mac-rag/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment_id: segmentId, phase }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Compose failed');
      }
      const data: ComposeResult = await response.json();
      setComposed(data);
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown compose error';
      setError(message);
      throw err;
    } finally {
      setComposing(false);
    }
  }

  /**
   * Stage 2: Generate — LLM call with (possibly human-edited) prompt.
   */
  async function generate(params: GenerateParams): Promise<GenerateResult> {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/mac-rag/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment_id: params.segmentId,
          phase: params.phase,
          prompt_system: params.promptSystem,
          prompt_user: params.promptUser,
          original_prompt_system: params.originalPromptSystem,
          original_prompt_user: params.originalPromptUser,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Generate failed');
      }
      const data: GenerateResult = await response.json();
      setGenerated(data);
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown generate error';
      setError(message);
      throw err;
    } finally {
      setGenerating(false);
    }
  }

  return {
    composing,
    generating,
    composed,
    generated,
    error,
    compose,
    generate,
  };
}
