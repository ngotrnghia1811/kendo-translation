'use client';

import { useState } from 'react';
import type { Segment, SegmentStatus } from '@/types/database';
import PhaseBadge from '@/components/shared/PhaseBadge';
import PhaseAdvanceButton from '@/components/editor/PhaseAdvanceButton';
import PhaseTransitionHistory from '@/components/editor/PhaseTransitionHistory';
import SuggestionPanel from '@/components/editor/SuggestionPanel';
import QAIssuesList from '@/components/editor/QAIssuesList';
import {
    AgentSuggestionPanel,
    type AgentPhase,
} from '@/components/editor/AgentSuggestionPanel';
import {
    ContextBuilderPanel,
    type ContextBuilderPhase,
} from '@/components/editor/ContextBuilderPanel';
import CommentThread from '@/components/editor/CommentThread';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function agentPhaseFor(status: SegmentStatus): AgentPhase | null {
    if (status === 'qa_approved') return null;
    if (status === 'draft') return 'translate';
    if (status === 'translated') return 'edit';
    return 'proofread';
}

type DrawerTab = 'history' | 'suggestions' | 'context' | 'comments';

const DRAWER_TABS: { key: DrawerTab; label: string }[] = [
    { key: 'history',     label: 'History' },
    { key: 'suggestions', label: 'Suggestions' },
    { key: 'context',     label: 'Context Builder' },
    { key: 'comments',    label: 'Comments' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MacRagState {
    candidates: { id: string; approach: string; confidence: number; text: string }[];
    recommendedIndex: number;
    isLoading: boolean;
}

interface SegmentEditorPanelProps {
    /** The currently active segment */
    segment: Segment;
    /** Article/document ID (for panels that need it) */
    articleId: string;
    /** The current translation text in the textarea */
    editingText: string;
    /** Is a save in-flight? */
    saving: boolean;
    /** MAC-RAG state (candidates + loading flag) */
    macRag: MacRagState;
    /** Target language (en | zh) */
    targetLang: 'en' | 'zh';
    onEditingTextChange: (text: string) => void;
    onSave: (segId: string, text: string, status: SegmentStatus) => void;
    onAITranslate: () => void;
    onCandidateSelect: (text: string) => void;
    onSegmentStatusChange: (segId: string, newStatus: SegmentStatus) => void;
    onActivityRefresh: () => void;
    onSuggestionRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SegmentEditorPanel({
    segment: seg,
    articleId,
    editingText,
    saving,
    macRag,
    targetLang,
    onEditingTextChange,
    onSave,
    onAITranslate,
    onCandidateSelect,
    onSegmentStatusChange,
    onActivityRefresh,
    onSuggestionRefresh,
}: SegmentEditorPanelProps) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [drawerTab, setDrawerTab] = useState<DrawerTab>('history');
    const [suggestionRefreshKey, setSuggestionRefreshKey] = useState(0);

    const handleSuggestionAccepted = (text: string) => {
        onEditingTextChange(text);
        const nextStatus: SegmentStatus = seg.status === 'draft' ? 'translated' : seg.status as SegmentStatus;
        void onSave(seg.id, text, nextStatus);
        onActivityRefresh();
    };

    const handleContextSuggestionCreated = () => {
        setSuggestionRefreshKey(k => k + 1);
        onSuggestionRefresh();
        onActivityRefresh();
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {/* Source */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Source
                </label>
                <p className="text-gray-900 text-sm leading-relaxed bg-gray-50 rounded-lg p-3">
                    {seg.source_text}
                </p>
            </div>

            {/* Translation textarea */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Translation
                </label>
                <textarea
                    value={editingText}
                    onChange={e => onEditingTextChange(e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Enter translation…"
                />
            </div>

            {/* MAC-RAG candidates */}
            {macRag.candidates.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Suggestions</p>
                    {macRag.candidates.map((c, i) => (
                        <button
                            key={c.id}
                            onClick={() => onCandidateSelect(c.text)}
                            className={`w-full text-left text-xs p-3 rounded-lg border transition-all ${
                                i === macRag.recommendedIndex
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            <span className="font-medium capitalize text-gray-600">{c.approach}</span>
                            <span className="ml-2 text-gray-400">{Math.round(c.confidence * 100)}%</span>
                            <p className="mt-1 text-gray-700">{c.text}</p>
                        </button>
                    ))}
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={onAITranslate}
                    disabled={macRag.isLoading}
                    className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {macRag.isLoading ? 'Translating…' : '✨ AI Translate'}
                </button>
                <button
                    onClick={() => onSave(seg.id, editingText, 'translated')}
                    disabled={saving || !editingText.trim()}
                    className="text-xs px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                    onClick={() => onSave(seg.id, editingText, 'qa_approved')}
                    disabled={saving || !editingText.trim()}
                    className="text-xs px-4 py-2 border border-green-400 text-green-700 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                    Approve
                </button>
                <button
                    onClick={() => setDetailsOpen(o => !o)}
                    className="text-xs px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors ml-auto"
                    data-testid="segment-details-toggle"
                    data-open={detailsOpen}
                >
                    {detailsOpen ? 'Hide details ▴' : 'Details ▾'}
                </button>
            </div>

            {/* Cooperation drawer */}
            {detailsOpen && (
                <div data-testid="segment-details-drawer" className="border-t border-gray-200 pt-4 mt-2">
                    {/* Phase badge + advance button */}
                    <div className="flex items-center gap-2 mb-3">
                        <PhaseBadge status={seg.status as SegmentStatus} />
                        <PhaseAdvanceButton
                            segmentId={seg.id}
                            currentStatus={seg.status as SegmentStatus}
                            onAdvanced={(next) => {
                                onSegmentStatusChange(seg.id, next);
                                onActivityRefresh();
                            }}
                            onStaleStatus={(actual) => {
                                onSegmentStatusChange(seg.id, actual);
                                onActivityRefresh();
                            }}
                        />
                    </div>

                    {/* Tab strip */}
                    <div className="flex border-b border-gray-200 mb-4 gap-0" role="tablist">
                        {DRAWER_TABS.map(({ key, label }) => (
                            <button
                                key={key}
                                role="tab"
                                aria-selected={drawerTab === key}
                                onClick={() => setDrawerTab(key)}
                                className={`text-xs px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
                                    drawerTab === key
                                        ? 'border-indigo-500 text-indigo-700 font-semibold'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Tab panels */}
                    {drawerTab === 'history' && (
                        <div role="tabpanel">
                            <PhaseTransitionHistory segmentId={seg.id} />
                        </div>
                    )}

                    {drawerTab === 'suggestions' && (
                        <div role="tabpanel" className="space-y-4">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                    Suggestions
                                </p>
                                <SuggestionPanel
                                    key={`suggestions-${seg.id}-${suggestionRefreshKey}`}
                                    segmentId={seg.id}
                                    segmentPhase={seg.status}
                                    articleId={articleId}
                                    segmentCurrentText={seg.target_text ?? ''}
                                    onAccepted={handleSuggestionAccepted}
                                />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                    QA Issues
                                </p>
                                <QAIssuesList segmentId={seg.id} articleId={articleId} />
                            </div>
                        </div>
                    )}

                    {drawerTab === 'context' && (
                        <div role="tabpanel" className="space-y-4">
                            {agentPhaseFor(seg.status as SegmentStatus) ? (
                                <>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                            MAC-RAG Context Builder
                                        </p>
                                        <ContextBuilderPanel
                                            segmentId={seg.id}
                                            phase={agentPhaseFor(seg.status as SegmentStatus)! as ContextBuilderPhase}
                                            targetLang={targetLang}
                                            onSuggestionCreated={handleContextSuggestionCreated}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                            Agent
                                        </p>
                                        <AgentSuggestionPanel
                                            segmentId={seg.id}
                                            phase={agentPhaseFor(seg.status as SegmentStatus)!}
                                            onCreated={handleContextSuggestionCreated}
                                        />
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-gray-400 italic">
                                    Context Builder is not available for QA-approved segments.
                                </p>
                            )}
                        </div>
                    )}

                    {drawerTab === 'comments' && (
                        <div role="tabpanel">
                            <CommentThread segmentId={seg.id} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
