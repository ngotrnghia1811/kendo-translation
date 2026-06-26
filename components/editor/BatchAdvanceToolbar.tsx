'use client';

import type { SegmentStatus } from '@/types/database';

const ADVANCE_TARGETS: SegmentStatus[] = ['translated', 'edited', 'proofread', 'qa_approved'];

interface BatchAdvanceToolbarProps {
    selectedCount: number;
    advancing: boolean;
    onAdvance: (toStatus: SegmentStatus) => void;
}

export default function BatchAdvanceToolbar({
    selectedCount,
    advancing,
    onAdvance,
}: BatchAdvanceToolbarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="sticky bottom-4 bg-[var(--color-surface)] rounded-xl border border-blue-300 shadow-lg p-3 flex items-center gap-3 flex-wrap mt-2">
            <span className="text-sm font-medium text-[var(--color-text)]">
                {selectedCount} segment{selectedCount === 1 ? '' : 's'} selected
            </span>
            <div className="flex items-center gap-2 ml-auto">
                {ADVANCE_TARGETS.map((status) => (
                    <button
                        key={status}
                        type="button"
                        disabled={advancing}
                        onClick={() => onAdvance(status)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 bg-[var(--color-text)] text-[var(--color-surface)] hover:opacity-80"
                    >
                        → {status.replace('_', ' ')}
                    </button>
                ))}
            </div>
            {advancing && (
                <span className="text-xs text-[var(--color-text-muted)] w-full text-center">Advancing…</span>
            )}
        </div>
    );
}
