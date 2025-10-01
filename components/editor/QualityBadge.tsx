'use client'

interface QualityBadgeProps {
    score: number | null
    size?: 'sm' | 'md'
}

function getScoreColor(score: number): string {
    if (score >= 0.90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    if (score >= 0.85) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    if (score >= 0.70) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
}

export default function QualityBadge({ score, size = 'sm' }: QualityBadgeProps) {
    if (score === null || score === undefined) return null

    const colorClass = getScoreColor(score)
    const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'

    return (
        <span className={`inline-flex items-center rounded-full font-medium ${colorClass} ${sizeClass}`}>
            {(score * 100).toFixed(0)}%
        </span>
    )
}
