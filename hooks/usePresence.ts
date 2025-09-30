'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserPresence } from '@/types/database'

const PRESENCE_COLORS = [
    '#e11d48', '#7c3aed', '#0891b2', '#16a34a', '#ca8a04', '#dc2626',
]

export function usePresence(articleId: string, userId: string, username: string) {
    const [presences, setPresences] = useState<UserPresence[]>([])
    const [channel, setChannel] = useState<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

    const supabase = createClient()

    // Assign a consistent color based on userId
    const colorIndex = userId
        ? Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % PRESENCE_COLORS.length
        : 0

    useEffect(() => {
        const ch = supabase.channel(`presence:${articleId}`)

        ch.on('presence', { event: 'sync' }, () => {
            const state = ch.presenceState<UserPresence>()
            const users: UserPresence[] = []

            for (const [, presenceList] of Object.entries(state)) {
                for (const presence of presenceList as UserPresence[]) {
                    if (presence.user_id !== userId) {
                        users.push(presence)
                    }
                }
            }

            setPresences(users)
        })

        ch.subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                await ch.track({
                    user_id: userId,
                    username,
                    active_segment: null,
                    color: PRESENCE_COLORS[colorIndex],
                    online_at: new Date().toISOString(),
                })
            }
        })

        setChannel(ch)

        return () => {
            supabase.removeChannel(ch)
        }
    }, [articleId, userId, username, colorIndex, supabase])

    // Update active segment in presence
    const trackSegment = useCallback(async (segmentId: string | null) => {
        if (!channel) return

        await channel.track({
            user_id: userId,
            username,
            active_segment: segmentId,
            color: PRESENCE_COLORS[colorIndex],
            online_at: new Date().toISOString(),
        })
    }, [channel, userId, username, colorIndex])

    return {
        presences,
        trackSegment,
        myColor: PRESENCE_COLORS[colorIndex],
    }
}
