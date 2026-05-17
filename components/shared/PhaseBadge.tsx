/**
 * PhaseBadge — small status pill for the cooperation-first phase model.
 *
 * Pure presentational component. Maps `segments.status` values to a
 * human label and a Tailwind color scheme. No data fetching, no auth.
 */

import type { SegmentStatus } from '@/types/database'

interface PhaseBadgeProps {
    status: SegmentStatus
    size?: 'sm' | 'md'
}

const LABELS: Record<SegmentStatus, string> = {
    draft: 'Draft',
    translated: 'Translated',
    edited: 'Edited',
    proofread: 'Proofread',
    qa_approved: 'QA Approved',
}

const CLASSES: Record<SegmentStatus, string> = {
    draft: 'bg-slate-100 text-slate-700 ring-slate-200',
    translated: 'bg-blue-100 text-blue-800 ring-blue-200',
    edited: 'bg-amber-100 text-amber-800 ring-amber-200',
    proofread: 'bg-violet-100 text-violet-800 ring-violet-200',
    qa_approved: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
}

export function PhaseBadge({ status, size = 'sm' }: PhaseBadgeProps) {
    const sizing =
        size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs'
    return (
        <span
            data-testid="phase-badge"
            data-status={status}
            className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${sizing} ${CLASSES[status]}`}
        >
            {LABELS[status]}
        </span>
    )
}

export default PhaseBadge
