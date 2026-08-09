'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/pocketbase/client'
import type { UserPresence } from '@/types/database'

const PRESENCE_COLORS = [
    '#e11d48', '#7c3aed', '#0891b2', '#16a34a', '#ca8a04', '#dc2626',
]

/**
 * Polling-based presence for PocketBase.
 *
 * Supabase Realtime Presence has no direct PocketBase equivalent.
 * Instead we poll segments for recently-locked rows and derive
 * presence from locked_by + locked_at. Refresh interval: 10s.
 */
export function usePresence(articleId: string, userId: string, username: string) {
    const [presences, setPresences] = useState<UserPresence[]>([])

    // Assign a consistent color based on userId
    const colorIndex = userId
        ? Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % PRESENCE_COLORS.length
        : 0

    useEffect(() => {
        const pb = createClient()
        let alive = true

        const poll = async () => {
            if (!alive) return
            try {
                const records = await pb.collection('segments').getFullList({
                    filter: `article_id = "${articleId}" && locked_by != null && locked_at != null`,
                    fields: 'locked_by',
                })

                // Deduplicate users who have locks on this article
                const seen = new Set<string>()
                const users: UserPresence[] = []
                const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()

                // Fetch recent locks for uniqueness
                for (const r of records) {
                    const u = r.locked_by as string
                    if (u && u !== userId && !seen.has(u)) {
                        seen.add(u)
                        // Try to get username from auth store if available
                        const display = u === pb.authStore.record?.id
                            ? (pb.authStore.record as Record<string, unknown>).username as string || 'You'
                            : u.slice(0, 8) // truncated id as fallback
                        users.push({
                            user_id: u,
                            username: display,
                            active_segment: null,
                            color: PRESENCE_COLORS[Math.abs(u.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % PRESENCE_COLORS.length],
                            online_at: new Date().toISOString(),
                        })
                    }
                }

                if (alive) setPresences(users)
            } catch {
                // Presence is best-effort; silence errors
            }
        }

        poll()
        const interval = setInterval(poll, 10_000)

        return () => {
            alive = false
            clearInterval(interval)
        }
    }, [articleId, userId])

    // Track active segment (client-only, no server write)
    const trackSegment = useCallback(async (_segmentId: string | null) => {
        // No-op in PocketBase: segment locking (POST /api/segments/[id]/lock)
        // already signals presence. This method remains for API compatibility.
    }, [])

    return {
        presences,
        trackSegment,
        myColor: PRESENCE_COLORS[colorIndex],
    }
}
