'use client'

interface ProgressBarProps {
    total: number
    translated: number
    reviewed: number
    approved: number
}

export default function ProgressBar({ total, translated, reviewed, approved }: ProgressBarProps) {
    if (total === 0) return null

    const translatedPct = ((translated - reviewed) / total) * 100
    const reviewedPct = ((reviewed - approved) / total) * 100
    const approvedPct = (approved / total) * 100
    const remainingPct = 100 - translatedPct - reviewedPct - approvedPct

    return (
        <div className="w-full">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-1">
                <span>{translated}/{total} translated</span>
                <span>{Math.round((translated / total) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden flex">
                {approvedPct > 0 && (
                    <div
                        className="h-full bg-green-500"
                        style={{ width: `${approvedPct}%` }}
                        title={`${approved} approved`}
                    />
                )}
                {reviewedPct > 0 && (
                    <div
                        className="h-full bg-blue-500"
                        style={{ width: `${reviewedPct}%` }}
                        title={`${reviewed - approved} reviewed`}
                    />
                )}
                {translatedPct > 0 && (
                    <div
                        className="h-full bg-yellow-500"
                        style={{ width: `${translatedPct}%` }}
                        title={`${translated - reviewed} translated`}
                    />
                )}
            </div>
            <div className="flex gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Approved
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Reviewed
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Translated
                </span>
            </div>
        </div>
    )
}
