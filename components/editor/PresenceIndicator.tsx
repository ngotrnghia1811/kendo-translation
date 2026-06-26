'use client'

import type { UserPresence } from '@/types/database'

interface PresenceIndicatorProps {
    presences: UserPresence[]
}

export default function PresenceIndicator({ presences }: PresenceIndicatorProps) {
    if (presences.length === 0) return null

    return (
        <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--color-text-muted)] mr-1">{presences.length} online</span>
            <div className="flex -space-x-2">
                {presences.slice(0, 5).map((p) => (
                    <div
                        key={p.user_id}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-[var(--color-surface)]"
                        style={{ backgroundColor: p.color }}
                        title={p.username}
                    >
                        {p.username?.[0]?.toUpperCase() || '?'}
                    </div>
                ))}
                {presences.length > 5 && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-[var(--color-border)] text-[var(--color-text)] border-2 border-[var(--color-surface)]">
                        +{presences.length - 5}
                    </div>
                )}
            </div>
        </div>
    )
}

interface SegmentPresenceProps {
    presences: UserPresence[]
    segmentId: string
}

export function SegmentPresenceTag({ presences, segmentId }: SegmentPresenceProps) {
    const activeUsers = presences.filter(p => p.active_segment === segmentId)

    if (activeUsers.length === 0) return null

    return (
        <div className="flex items-center gap-1">
            {activeUsers.map((u) => (
                <span
                    key={u.user_id}
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium text-white"
                    style={{ backgroundColor: u.color }}
                >
                    {u.username}
                </span>
            ))}
        </div>
    )
}
