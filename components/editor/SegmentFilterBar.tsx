'use client';

import type { SegmentStatus, WorkflowPhase } from '@/types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ALL_STATUSES: SegmentStatus[] = [
    'draft',
    'translated',
    'edited',
    'proofread',
    'qa_approved',
];

const STATUS_LABELS: Record<SegmentStatus, string> = {
    draft: 'Draft',
    translated: 'Translated',
    edited: 'Edited',
    proofread: 'Proofread',
    qa_approved: 'QA ✓',
};

const STATUS_COLORS: Record<SegmentStatus, { active: string; inactive: string }> = {
    draft:       { active: 'bg-red-600 text-white border-red-600',        inactive: 'bg-white text-red-600 border-red-200 hover:bg-red-50' },
    translated:  { active: 'bg-blue-600 text-white border-blue-600',      inactive: 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50' },
    edited:      { active: 'bg-emerald-600 text-white border-emerald-600', inactive: 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50' },
    proofread:   { active: 'bg-amber-500 text-white border-amber-500',     inactive: 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50' },
    qa_approved: { active: 'bg-violet-600 text-white border-violet-600',   inactive: 'bg-white text-violet-600 border-violet-200 hover:bg-violet-50' },
};

// ---------------------------------------------------------------------------
// Phase → status mapping for "My phase" toggle
// ---------------------------------------------------------------------------

const PHASE_TO_STATUSES: Record<WorkflowPhase, SegmentStatus[]> = {
    translate: ['draft'],
    edit:      ['translated'],
    proofread: ['edited'],
    qa:        ['proofread'],
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SegmentFilterBarProps {
    /** Per-status segment count (after lang filter, before status filter). */
    statusCounts: Record<SegmentStatus, number>;
    /** Currently active status filters. Empty = show all. */
    activeStatuses: SegmentStatus[];
    /** Text query against source + target. */
    query: string;
    /** Whether "My phase" toggle is on. */
    showMyPhase: boolean;
    /** The user's allowed phases for this document (from document_assignments). */
    userPhases: WorkflowPhase[];
    onToggleStatus: (status: SegmentStatus) => void;
    onClearStatuses: () => void;
    onQueryChange: (q: string) => void;
    onToggleMyPhase: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SegmentFilterBar({
    statusCounts,
    activeStatuses,
    query,
    showMyPhase,
    userPhases,
    onToggleStatus,
    onClearStatuses,
    onQueryChange,
    onToggleMyPhase,
}: SegmentFilterBarProps) {
    const isFiltered = activeStatuses.length > 0 || query.trim().length > 0 || showMyPhase;
    const hasAssignments = userPhases.length > 0;

    return (
        <div
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 space-y-2.5"
            data-testid="segment-filter-bar"
        >
            {/* Row 1: Status pills */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* All pill */}
                <button
                    type="button"
                    onClick={onClearStatuses}
                    data-testid="filter-status-all"
                    className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                        activeStatuses.length === 0 && !showMyPhase
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    All
                </button>

                {ALL_STATUSES.map((status) => {
                    const isActive = activeStatuses.includes(status);
                    const count = statusCounts[status] ?? 0;
                    const colors = STATUS_COLORS[status];
                    return (
                        <button
                            key={status}
                            type="button"
                            onClick={() => onToggleStatus(status)}
                            data-testid={`filter-status-${status}`}
                            aria-pressed={isActive}
                            className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                                isActive ? colors.active : colors.inactive
                            }`}
                        >
                            {STATUS_LABELS[status]}
                            {count > 0 && (
                                <span className={`ml-1 tabular-nums ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                                    ({count})
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* My phase toggle — only shown when user has assignments */}
                {hasAssignments && (
                    <button
                        type="button"
                        onClick={onToggleMyPhase}
                        data-testid="filter-my-phase"
                        aria-pressed={showMyPhase}
                        className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ml-auto ${
                            showMyPhase
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                        }`}
                        title={`Show only segments at your assigned phase${userPhases.length > 1 ? 's' : ''}: ${userPhases.join(', ')}`}
                    >
                        My phase
                    </button>
                )}
            </div>

            {/* Row 2: Text search */}
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">
                    🔍
                </span>
                <input
                    type="search"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="Search source or translation…"
                    data-testid="filter-search-input"
                    className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => onQueryChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                        aria-label="Clear search"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Row 3: Active filter summary + clear */}
            {isFiltered && (
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                        Filtering by:{' '}
                        {showMyPhase && <span className="font-medium text-indigo-600">my phase</span>}
                        {showMyPhase && activeStatuses.length > 0 && ', '}
                        {activeStatuses.length > 0 && (
                            <span className="font-medium">
                                {activeStatuses.map(s => STATUS_LABELS[s]).join(', ')}
                            </span>
                        )}
                        {(showMyPhase || activeStatuses.length > 0) && query.trim() && ', '}
                        {query.trim() && (
                            <span className="font-medium">"{query.trim()}"</span>
                        )}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            onClearStatuses();
                            onQueryChange('');
                            if (showMyPhase) onToggleMyPhase();
                        }}
                        data-testid="filter-clear-all"
                        className="text-gray-400 hover:text-gray-700 transition-colors underline"
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
}
