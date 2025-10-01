'use client'

import type { UserPresence } from '@/types/database'

interface PresenceIndicatorProps {
    presences: UserPresence[]
}

export default function PresenceIndicator({ presences }: PresenceIndicatorProps) {
    if (presences.length === 0) return null

    return (
        <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1">{presences.length} online</span>
            <div className="flex -space-x-2">
                {presences.slice(0, 5).map((p) => (
                    <div
                        key={p.user_id}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-800"
                        style={{ backgroundColor: p.color }}
                        title={p.username}
                    >
                        {p.username?.[0]?.toUpperCase() || '?'}
                    </div>
                ))}
                {presences.length > 5 && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-2 border-white dark:border-gray-800">
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
