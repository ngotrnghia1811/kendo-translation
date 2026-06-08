'use client';

import type { Segment, SegmentStatus } from '@/types/database';
import PhaseBadge from '@/components/shared/PhaseBadge';

interface ActivityRow {
    segment_id: string;
    pending_suggestions: number;
    unresolved_comments: number;
    recent_transitions_24h: number;
}

interface SegmentListItemProps {
    segment: Segment;
    isActive: boolean;
    batchMode: boolean;
    isSelected: boolean;
    activity?: ActivityRow;
    onSelect: (seg: Segment) => void;
    onToggleSelect: (id: string) => void;
}

export default function SegmentListItem({
    segment: seg,
    isActive,
    batchMode,
    isSelected,
    activity: act,
    onSelect,
    onToggleSelect,
}: SegmentListItemProps) {
    return (
        <div className={`flex items-start gap-2 ${batchMode ? '' : ''}`}>
            {batchMode && (
                <button
                    type="button"
                    onClick={() => onToggleSelect(seg.id)}
                    className={`mt-4 ml-2 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-300 hover:border-blue-400'
                    }`}
                    aria-label={isSelected ? 'Deselect segment' : 'Select segment'}
                >
                    {isSelected && (
                        <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3">
                            <path
                                d="M1 4l3 3 5-6"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                </button>
            )}
            <button
                data-testid="segment-list-item"
                onClick={() => {
                    if (!batchMode) onSelect(seg);
                    else onToggleSelect(seg.id);
                }}
                className={`flex-1 text-left p-4 rounded-xl border transition-all ${
                    batchMode && isSelected
                        ? 'border-blue-400 bg-blue-50'
                        : isActive
                        ? 'border-blue-400 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium truncate">{seg.source_text}</p>
                        {seg.target_text && (
                            <p className="text-xs text-gray-500 mt-1 truncate">{seg.target_text}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {act && (act.pending_suggestions > 0 || act.unresolved_comments > 0 || act.recent_transitions_24h > 0) && (
                            <span data-testid="segment-activity-badges" className="flex items-center gap-1">
                                {act.pending_suggestions > 0 && (
                                    <span
                                        data-testid="segment-activity-suggestions"
                                        data-count={act.pending_suggestions}
                                        title={`${act.pending_suggestions} pending suggestion${act.pending_suggestions === 1 ? '' : 's'}`}
                                        className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800"
                                    >
                                        {act.pending_suggestions}·✎
                                    </span>
                                )}
                                {act.unresolved_comments > 0 && (
                                    <span
                                        data-testid="segment-activity-comments"
                                        data-count={act.unresolved_comments}
                                        title={`${act.unresolved_comments} unresolved comment${act.unresolved_comments === 1 ? '' : 's'}`}
                                        className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800"
                                    >
                                        {act.unresolved_comments}·💬
                                    </span>
                                )}
                                {act.recent_transitions_24h > 0 && (
                                    <span
                                        data-testid="segment-activity-transitions"
                                        data-count={act.recent_transitions_24h}
                                        title={`${act.recent_transitions_24h} transition${act.recent_transitions_24h === 1 ? '' : 's'} in the last 24h`}
                                        className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-800"
                                    >
                                        {act.recent_transitions_24h}·⇺
                                    </span>
                                )}
                            </span>
                        )}
                        <PhaseBadge status={seg.status as SegmentStatus} size="sm" />
                    </div>
                </div>
            </button>
        </div>
    );
}
