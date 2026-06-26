'use client';

import { useState, useEffect } from 'react';
import {
  ContextBuilderPanel,
  type ContextBuilderPhase,
  type ComposeData,
  type TmMatch,
  type TermEntry,
  qualityLabel,
  qualityColor,
  termTypeLabel,
  termTypeColor,
  allTerms,
} from '@/components/editor/ContextBuilderPanel';

// ── Props ────────────────────────────────────────────────────────────

interface ContextBuilderModalProps {
  segmentId: string;
  phase: ContextBuilderPhase;
  targetLang?: 'en' | 'zh';
  onSuggestionCreated?: () => void;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────

export function ContextBuilderModal({
  segmentId,
  phase,
  targetLang = 'en',
  onSuggestionCreated,
  onClose,
}: ContextBuilderModalProps) {
  const [composeData, setComposeData] = useState<ComposeData | null>(null);

  // Escape key closes the modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      data-testid="context-builder-modal"
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Left panel — main working area (~55%) */}
      <div className="relative w-[55%] bg-[var(--color-surface)] overflow-y-auto p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            MAC-RAG Context Builder
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-testid="context-builder-modal-close"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl leading-none p-1 rounded hover:bg-[var(--color-bg)] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ContextBuilderPanel */}
        <div className="flex-1 min-h-0">
          <ContextBuilderPanel
            segmentId={segmentId}
            phase={phase}
            targetLang={targetLang}
            expanded
            onSuggestionCreated={onSuggestionCreated}
            onComposeData={setComposeData}
          />
        </div>
      </div>

      {/* Right panel — scrollable context sidebar (~45%) */}
      <div className="relative w-[45%] bg-[var(--color-bg)] border-l border-[var(--color-border)] overflow-y-auto p-6">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-4">
          Context
        </h3>

        {composeData ? (
          <div className="space-y-4 text-xs">
            {/* ── Translation Memory (L3/L4) ─────────────────────── */}
            {composeData.tm_matches && composeData.tm_matches.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                  Translation Memory (L3/L4)
                </p>
                <ul className="space-y-1.5">
                  {composeData.tm_matches.map((m: TmMatch) => (
                    <li
                      key={m.id}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${qualityColor(m.qualityScore)}`}
                        >
                          {qualityLabel(m.qualityScore)}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                          {m.retrievalLayer === 'external'
                            ? 'L4 External'
                            : 'L3 Project'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {m.matchPercentage}%
                        </span>
                      </div>
                      <p className="text-slate-700 text-[11px] leading-relaxed">
                        {m.sourceText}
                      </p>
                      <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                        {m.targetText}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Terminology ────────────────────────────────────── */}
            {allTerms(composeData).length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                  Terminology
                </p>
                <ul className="space-y-1">
                  {allTerms(composeData).map((t: TermEntry) => (
                    <li key={t.id} className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-700">
                        {t.japaneseTerm}
                      </span>
                      <span className="text-[11px] text-slate-400">→</span>
                      <span className="text-[11px] text-slate-700">
                        {t.englishTerm}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${termTypeColor(t.type)}`}
                      >
                        {termTypeLabel(t.type)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Article Context ────────────────────────────────── */}
            {composeData.l2_context && (
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                  Article Context
                </p>
                <div className="space-y-2">
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
                      <p className="text-[11px] text-slate-700">
                        {composeData.l2_context.neighbours.prev.source_text}
                      </p>
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
                      <p className="text-[11px] text-slate-700">
                        {composeData.l2_context.neighbours.next.source_text}
                      </p>
                    </div>
                  )}

                  {composeData.l2_context.terms_already_annotated.length >
                    0 && (
                    <div className="flex flex-wrap gap-1">
                      {composeData.l2_context.terms_already_annotated.map(
                        (term: string) => (
                          <span
                            key={term}
                            className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200"
                          >
                            {term}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)] italic">
            Compose context to see TM matches, terminology, and article
            context here.
          </p>
        )}
      </div>
    </div>
  );
}

export default ContextBuilderModal;
