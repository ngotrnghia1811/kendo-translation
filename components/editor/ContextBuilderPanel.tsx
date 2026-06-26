'use client';

/**
 * ContextBuilderPanel — two-stage MAC-RAG pipeline wired into the editor UI.
 *
 * Stage 1: POST /api/mac-rag/compose → assembled prompt + TM/terminology context (no LLM).
 * Stage 2: POST /api/mac-rag/generate → takes prompt (possibly human-edited) → LLM → proposed_text.
 *
 * The "Use as suggestion" button calls POST /api/segments/[id]/suggestions (human-session route),
 * preserving the cooperation invariant (agents propose, humans decide).
 */

import { useState } from 'react';
import {
  useMacRagTwoStage,
  type ComposeResult,
  type GenerateResult,
  type GenerateParams,
} from '@/lib/hooks/useMacRagTwoStage';

// ── Rendering types (match actual API shapes at runtime) ──────────────

export interface TmMatch {
  id: string;
  sourceText: string;
  targetText: string;
  matchPercentage: number;
  matchType: string;
  qualityScore?: number;
  retrievalLayer?: 'project' | 'external';
}

export interface TermEntry {
  id: string;
  japaneseTerm: string;
  englishTerm: string;
  domain: string;
  type: string;
  confidence: number;
  notes?: string;
}

export interface NeighbourSeg {
  source_text: string;
  target_text: string | null;
  status: string;
  usable: boolean;
  reason?: string;
}

export interface L2Context {
  document_title: string | null;
  neighbours: {
    prev: NeighbourSeg | null;
    next: NeighbourSeg | null;
  };
  terms_already_annotated: string[];
}

/** Runtime shape of the compose response (includes l2_context not in the hook type). */
export interface ComposeData extends ComposeResult {
  l2_context: L2Context;
}

// ── Props ────────────────────────────────────────────────────────────

export type ContextBuilderPhase = 'translate' | 'edit' | 'proofread' | 'qa';

interface ContextBuilderPanelProps {
  segmentId: string;
  phase: ContextBuilderPhase;
  targetLang?: 'en' | 'zh';
  expanded?: boolean;
  onSuggestionCreated?: () => void;
  onComposeData?: (data: ComposeData) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

export function qualityLabel(score: number | undefined): string {
  if (score === undefined) return '—';
  if (score >= 90) return 'High';
  if (score >= 70) return 'Med';
  return 'Low';
}

export function qualityColor(score: number | undefined): string {
  if (score === undefined) return 'bg-slate-100 text-slate-600';
  if (score >= 90) return 'bg-emerald-100 text-emerald-700';
  if (score >= 70) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

export function termTypeLabel(t: string): string {
  switch (t) {
    case 'required':
      return 'required';
    case 'preferred':
      return 'preferred';
    case 'do_not_translate':
      return 'do not translate';
    case 'forbidden':
      return 'forbidden';
    default:
      return t;
  }
}

export function termTypeColor(t: string): string {
  switch (t) {
    case 'required':
      return 'bg-sky-100 text-sky-700';
    case 'preferred':
      return 'bg-indigo-100 text-indigo-700';
    case 'do_not_translate':
      return 'bg-rose-100 text-rose-700';
    case 'forbidden':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function allTerms(data: ComposeData): TermEntry[] {
  const t = data.terminology;
  return [
    ...(t.requiredTerms ?? []).map((e: TermEntry) => ({ ...e, type: 'required' })),
    ...(t.preferredTerms ?? []).map((e: TermEntry) => ({ ...e, type: 'preferred' })),
    ...(t.doNotTranslate ?? []).map((e: TermEntry) => ({ ...e, type: 'do_not_translate' })),
  ];
}

// ── Component ────────────────────────────────────────────────────────

export function ContextBuilderPanel({
  segmentId,
  phase,
  targetLang = 'en',
  expanded = false,
  onSuggestionCreated,
  onComposeData,
}: ContextBuilderPanelProps) {
  const { compose, generate, composing, generating, error: hookError } = useMacRagTwoStage();

  // ── View state machine: idle | composing | composed | generating | generated
  const [view, setView] = useState<'idle' | 'composing' | 'composed' | 'generating' | 'generated'>(
    'idle',
  );

  const [composeData, setComposeData] = useState<ComposeData | null>(null);
  const [generateData, setGenerateData] = useState<GenerateResult | null>(null);

  // Editable prompt fields (pre-filled from compose, then user may edit)
  const [promptSystem, setPromptSystem] = useState('');
  const [promptUser, setPromptUser] = useState('');

  // Original prompt values (for edit detection)
  const [originalSystem, setOriginalSystem] = useState('');
  const [originalUser, setOriginalUser] = useState('');

  // Collapsible context sidebar
  const [contextOpen, setContextOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tm: false,
    terminology: false,
    article: false,
  });

  // Error / success messages
  const [panelError, setPanelError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Stage 1: compose ───────────────────────────────────────────────

  const handleCompose = async () => {
    setPanelError(null);
    setSuccessMsg(null);
    setView('composing');
    try {
      const result = (await compose(segmentId, phase, targetLang)) as ComposeData;
      setComposeData(result);
      setPromptSystem(result.prompt.system);
      setPromptUser(result.prompt.user);
      setOriginalSystem(result.prompt.system);
      setOriginalUser(result.prompt.user);
      setContextOpen(false);
      setExpandedSections({ tm: false, terminology: false, article: false });
      setView('composed');
      onComposeData?.(result);
    } catch {
      setView('idle');
    }
  };

  // ── Stage 2: generate ──────────────────────────────────────────────

  const handleGenerate = async () => {
    setPanelError(null);
    setSuccessMsg(null);
    setView('generating');
    try {
      const params: GenerateParams = {
        segmentId,
        phase,
        promptSystem,
        promptUser,
        originalPromptSystem: originalSystem,
        originalPromptUser: originalUser,
      };
      const result = await generate(params);
      setGenerateData(result);
      setView('generated');
    } catch {
      // hook sets error state; stay on composed view so user can retry
      setView('composed');
    }
  };

  // ── Use as suggestion ──────────────────────────────────────────────

  const handleUseSuggestion = async () => {
    if (!generateData) return;
    setPanelError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/segments/${segmentId}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposed_text: generateData.proposed_text,
          suggester_kind: 'agent',
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setSuccessMsg('Suggestion created ✓');
      onSuggestionCreated?.();
      // Brief pause then reset
      setTimeout(() => {
        handleReset();
      }, 1200);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : 'Failed to create suggestion');
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────

  const handleReset = () => {
    setView('idle');
    setComposeData(null);
    setGenerateData(null);
    setPromptSystem('');
    setPromptUser('');
    setOriginalSystem('');
    setOriginalUser('');
    setPanelError(null);
    setSuccessMsg(null);
    setContextOpen(false);
    setExpandedSections({ tm: false, terminology: false, article: false });
  };

  // ── Toggle helpers ─────────────────────────────────────────────────

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const displayError = panelError ?? hookError;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div data-testid="context-builder-panel" className="space-y-3">
      {/* ── IDLE ─────────────────────────────────────────────────── */}
      {view === 'idle' && (
        <button
          type="button"
          onClick={handleCompose}
          disabled={composing}
          data-testid="context-builder-compose-btn"
          className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Build context
        </button>
      )}
      {view === 'idle' && (
        <span className="text-[10px] text-slate-400 ml-1.5">
          {targetLang === 'zh' ? 'ZH Context' : 'EN Context'}
        </span>
      )}

      {/* ── COMPOSING ────────────────────────────────────────────── */}
      {view === 'composing' && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg
            className="animate-spin h-3.5 w-3.5 text-indigo-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Composing context…</span>
        </div>
      )}

      {/* ── COMPOSED / GENERATING / GENERATED ─────────────────────── */}
      {(view === 'composed' || view === 'generating' || view === 'generated') && composeData && (
        <div className="space-y-3">
          {/* Collapsible context sidebar */}
          <div>
            <button
              type="button"
              onClick={() => setContextOpen((o) => !o)}
              className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hover:text-[var(--color-text)]"
            >
              {contextOpen ? '▾ Context' : '▸ Context'}
            </button>
            {contextOpen && (
              <div className="mt-2 space-y-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] p-3 text-xs">
                {/* TM section */}
                {composeData.tm_matches && composeData.tm_matches.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSection('tm')}
                      className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hover:text-[var(--color-text)] w-full text-left"
                    >
                      {expandedSections.tm ? '▾' : '▸'} Translation Memory (L3/L4)
                    </button>
                    {expandedSections.tm && (
                      <ul className="mt-1.5 space-y-1.5">
                        {composeData.tm_matches.map((m: TmMatch) => (
                          <li key={m.id} className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${qualityColor(m.qualityScore)}`}
                              >
                                {qualityLabel(m.qualityScore)}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                                {m.retrievalLayer === 'external' ? 'L4 External' : 'L3 Project'}
                              </span>
                              <span className="text-[10px] text-slate-400">{m.matchPercentage}%</span>
                            </div>
                            <p className="text-slate-700 text-[11px] leading-relaxed">{m.sourceText}</p>
                            <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">{m.targetText}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Terminology section */}
                {allTerms(composeData).length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSection('terminology')}
                      className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hover:text-[var(--color-text)] w-full text-left"
                    >
                      {expandedSections.terminology ? '▾' : '▸'} Terminology
                    </button>
                    {expandedSections.terminology && (
                      <ul className="mt-1.5 space-y-1">
                        {allTerms(composeData).map((t: TermEntry) => (
                          <li key={t.id} className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-700">{t.japaneseTerm}</span>
                            <span className="text-[11px] text-slate-400">→</span>
                            <span className="text-[11px] text-slate-700">{t.englishTerm}</span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${termTypeColor(t.type)}`}
                            >
                              {termTypeLabel(t.type)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Article Context section */}
                {composeData.l2_context && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSection('article')}
                      className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hover:text-[var(--color-text)] w-full text-left"
                    >
                      {expandedSections.article ? '▾' : '▸'} Article Context
                    </button>
                    {expandedSections.article && (
                      <div className="mt-1.5 space-y-2">
                        {composeData.l2_context.document_title && (
                          <p className="text-[11px] text-slate-600">
                            <span className="font-medium">Title:</span>{' '}
                            {composeData.l2_context.document_title}
                          </p>
                        )}

                        {composeData.l2_context.neighbours.prev && (
                          <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                            <p className="text-[10px] font-medium text-slate-500 mb-0.5">
                              Previous{' '}
                              {composeData.l2_context.neighbours.prev.usable ? (
                                <span className="text-emerald-600">(usable)</span>
                              ) : (
                                <span className="text-amber-600">(not usable)</span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-700">{composeData.l2_context.neighbours.prev.source_text}</p>
                          </div>
                        )}

                        {composeData.l2_context.neighbours.next && (
                          <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                            <p className="text-[10px] font-medium text-slate-500 mb-0.5">
                              Next{' '}
                              {composeData.l2_context.neighbours.next.usable ? (
                                <span className="text-emerald-600">(usable)</span>
                              ) : (
                                <span className="text-amber-600">(not usable)</span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-700">{composeData.l2_context.neighbours.next.source_text}</p>
                          </div>
                        )}

                        {composeData.l2_context.terms_already_annotated.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {composeData.l2_context.terms_already_annotated.map((term: string) => (
                              <span
                                key={term}
                                className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prompt editor */}
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1 block">
                System Prompt
              </label>
              <textarea
                value={promptSystem}
                onChange={(e) => setPromptSystem(e.target.value)}
                disabled={view === 'generating'}
                rows={expanded ? 10 : 6}
                data-testid="context-builder-system-prompt"
                className="w-full text-xs border border-[var(--color-border)] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono bg-[var(--color-surface)] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1 block">
                User Message
              </label>
              <textarea
                value={promptUser}
                onChange={(e) => setPromptUser(e.target.value)}
                disabled={view === 'generating'}
                rows={expanded ? 18 : 10}
                data-testid="context-builder-user-prompt"
                className="w-full text-xs border border-[var(--color-border)] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono bg-[var(--color-surface)] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={view === 'generating'}
              data-testid="context-builder-generate-btn"
              className="rounded bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {view === 'generating' && (
                <svg
                  className="animate-spin h-3 w-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {view === 'generating' ? 'Generating…' : 'Generate'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* ── GENERATED result block ────────────────────────────────── */}
      {view === 'generated' && generateData && (
          <div data-testid="context-builder-result" className="space-y-3 border-t border-[var(--color-border)] pt-3">
          {/* Prompt edited badge */}
          {generateData.prompt_edited && (
            <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
              Prompt was edited — edit recorded
            </span>
          )}

          {/* QA advisory output */}
          {generateData.advisory ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                Advisory QA candidates (raw JSON)
              </p>
              <p className="text-[10px] text-slate-400">
                Review and accept individual issues via the QA Issues panel above.
              </p>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700">
                {generateData.proposed_text}
              </pre>
              <button
                type="button"
                onClick={handleReset}
                className="rounded bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-300"
              >
                Done
              </button>
            </div>
          ) : (
            /* Non-QA output */
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                Proposed Translation
              </p>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700">
                {generateData.proposed_text}
              </pre>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseSuggestion}
                  data-testid="context-builder-use-suggestion"
                  className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  Use as suggestion
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-300"
                >
                  Discard
                </button>
              </div>
              {successMsg && (
                <span className="text-xs text-emerald-600 font-medium">{successMsg}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Error display ─────────────────────────────────────────── */}
      {displayError && (
        <div data-testid="context-builder-error" className="space-y-1">
          <p className="text-xs text-red-600">{displayError}</p>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export default ContextBuilderPanel;
