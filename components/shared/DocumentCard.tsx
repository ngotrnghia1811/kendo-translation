'use client'

import Link from 'next/link'
import ProgressBar from '@/components/editor/ProgressBar'

interface DocumentCardProps {
    id: string
    title: string
    sourceLang?: string
    targetLang?: string
    totalSegments: number
    translatedCount: number
    reviewedCount: number
    approvedCount: number
    status?: string
    updatedAt?: string
}

export default function DocumentCard({
    id,
    title,
    sourceLang = 'ja',
    targetLang = 'en',
    totalSegments,
    translatedCount,
    reviewedCount,
    approvedCount,
    status,
    updatedAt,
}: DocumentCardProps) {
    return (
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <Link
                        href={`/documents/${id}`}
                        className="text-base font-semibold text-[var(--color-text)] hover:text-blue-600 line-clamp-2"
                    >
                        {title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--color-text-muted)]">
                            {sourceLang.toUpperCase()} → {targetLang.toUpperCase()}
                        </span>
                        {status && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg)] text-[var(--color-text-muted)]">
                                {status}
                            </span>
                        )}
                    </div>
                </div>
                <Link
                    href={`/documents/${id}`}
                    className="flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                    Open
                </Link>
            </div>

            <ProgressBar
                total={totalSegments}
                translated={translatedCount}
                reviewed={reviewedCount}
                approved={approvedCount}
            />

            {updatedAt && (
                <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                    Updated {new Date(updatedAt).toLocaleDateString()}
                </div>
            )}
        </div>
    )
}
