/**
 * useSuggestions — fetches and mutates `segment_suggestions` for a
 * single segment.
 *
 * Mutations call PATCH /api/segments/[id]/suggestions/[sid] with
 *   { status: 'accepted' | 'rejected' | 'superseded' }
 * and re-fetch the list. Applying accepted text to
 * `segments.target_text` is the caller's responsibility via the
 * existing PATCH /api/segments/[id] (preserves soft-lock contract).
 *
 * Subscribes to `segment_suggestions` postgres_changes filtered on
 * `segment_id=eq.<segmentId>` so collaborator activity (including
 * agent-authored suggestions) refreshes the panel automatically.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'superseded'
export type SuggesterKind = 'human' | 'agent'

export interface SuggesterRef {
    username: string | null
}

export interface SuggestionRow {
    id: string
    segment_id: string
    suggester_id: string
    suggester_kind: SuggesterKind
    proposed_text: string
    status: SuggestionStatus
    accepter_id: string | null
    accepted_at: string | null
    created_at: string
    suggester?: SuggesterRef | SuggesterRef[] | null
}

export interface UseSuggestionsResult {
    suggestions: SuggestionRow[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
    accept: (id: string) => Promise<SuggestionRow>
    reject: (id: string) => Promise<SuggestionRow>
    supersede: (id: string) => Promise<SuggestionRow>
}

export function useSuggestions(segmentId: string): UseSuggestionsResult {
    const [suggestions, setSuggestions] = useState<SuggestionRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const aliveRef = useRef(true)

    const refresh = useCallback(async () => {
        setError(null)
        try {
            const res = await fetch(`/api/segments/${segmentId}/suggestions`)
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`HTTP ${res.status}: ${txt}`)
            }
            const data = (await res.json()) as { suggestions: SuggestionRow[] }
            if (aliveRef.current) setSuggestions(data.suggestions ?? [])
        } catch (e) {
            if (aliveRef.current)
                setError(e instanceof Error ? e.message : String(e))
        } finally {
            if (aliveRef.current) setLoading(false)
        }
    }, [segmentId])

    useEffect(() => {
        aliveRef.current = true
        setLoading(true)
        void refresh()
        return () => {
            aliveRef.current = false
        }
    }, [refresh])

    // Realtime: refetch whenever any segment_suggestions row for this
    // segment is inserted, updated, or deleted by anyone.
    const supabase = useMemo(() => createClient(), [])
    useEffect(() => {
        const channel = supabase
            .channel(`seg-suggestions:${segmentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'segment_suggestions',
                    filter: `segment_id=eq.${segmentId}`,
                },
                () => {
                    void refresh()
                }
            )
            .subscribe()
        return () => {
            void supabase.removeChannel(channel)
        }
    }, [supabase, segmentId, refresh])

    const transition = useCallback(
        async (id: string, status: SuggestionStatus): Promise<SuggestionRow> => {
            const res = await fetch(
                `/api/segments/${segmentId}/suggestions/${id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status }),
                }
            )
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`HTTP ${res.status}: ${txt}`)
            }
            const updated = (await res.json()) as SuggestionRow
            void refresh()
            return updated
        },
        [segmentId, refresh]
    )

    const accept = useCallback((id: string) => transition(id, 'accepted'), [
        transition,
    ])
    const reject = useCallback((id: string) => transition(id, 'rejected'), [
        transition,
    ])
    const supersede = useCallback((id: string) => transition(id, 'superseded'), [
        transition,
    ])

    return { suggestions, loading, error, refresh, accept, reject, supersede }
}

export default useSuggestions
