/**
 * PhaseTransitionHistory — chronological list of phase transitions
 * for a single segment. Fetches from `/api/segments/[id]/transitions`
 * on mount; shows from→to, actor username, timestamp, optional note,
 * and the acknowledged_minor flag when set.
 *
 * Subscribes to `segment_phase_transitions` postgres_changes filtered
 * on `segment_id=eq.<segmentId>` so other collaborators' transitions
 * appear without a manual refresh.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PhaseBadge } from '@/components/shared/PhaseBadge'
import { createClient } from '@/lib/supabase/client'
import type { SegmentStatus } from '@/types/database'

interface ActorRef {
    username: string | null
}

interface TransitionRow {
    id: string
    segment_id: string
    from_status: SegmentStatus
    to_status: SegmentStatus
    actor_id: string | null
    acknowledged_minor: boolean
    note: string | null
    created_at: string
    // PostgREST nested select returns either an object or an array
    // depending on relationship cardinality; accept both shapes.
    actor: ActorRef | ActorRef[] | null
}

interface Props {
    segmentId: string
}

function actorName(row: TransitionRow): string {
    const a = Array.isArray(row.actor) ? row.actor[0] : row.actor
    return a?.username ?? 'unknown'
}

function formatTime(iso: string): string {
    try {
        const d = new Date(iso)
        return d.toLocaleString()
    } catch {
        return iso
    }
}

export function PhaseTransitionHistory({ segmentId }: Props) {
    const [rows, setRows] = useState<TransitionRow[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const aliveRef = useRef(true)

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(`/api/segments/${segmentId}/transitions`)
            if (!res.ok) {
                const body = await res.text()
                throw new Error(`HTTP ${res.status}: ${body}`)
            }
            const data = (await res.json()) as { transitions: TransitionRow[] }
            if (aliveRef.current) {
                setRows(data.transitions ?? [])
                setError(null)
            }
        } catch (err: unknown) {
            if (aliveRef.current) {
                setError(err instanceof Error ? err.message : String(err))
            }
        }
    }, [segmentId])

    useEffect(() => {
        aliveRef.current = true
        setRows(null)
        setError(null)
        void refresh()
        return () => {
            aliveRef.current = false
        }
    }, [refresh])

    // Realtime: refetch on any INSERT for this segment's transitions
    // (the table is append-only, so INSERT is the only event of
    // interest, but '*' is harmless and future-proof).
    const supabase = useMemo(() => createClient(), [])
    useEffect(() => {
        const channel = supabase
            .channel(`seg-transitions:${segmentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'segment_phase_transitions',
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

    if (error) {
        return (
            <div
                data-testid="phase-transition-history-error"
                className="text-sm text-red-600"
            >
                Failed to load transitions: {error}
            </div>
        )
    }
    if (rows === null) {
        return (
            <div
                data-testid="phase-transition-history-loading"
                className="text-sm text-slate-500"
            >
                Loading transitions…
            </div>
        )
    }
    if (rows.length === 0) {
        return (
            <div
                data-testid="phase-transition-history-empty"
                className="text-sm text-slate-500"
            >
                No phase transitions yet.
            </div>
        )
    }

    return (
        <ol
            data-testid="phase-transition-history"
            className="space-y-2 text-sm"
        >
            {rows.map((row) => (
                <li
                    key={row.id}
                    data-testid="phase-transition-row"
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
                >
                    <div className="flex items-center gap-2">
                        <PhaseBadge status={row.from_status} />
                        <span aria-hidden className="text-slate-400">
                            →
                        </span>
                        <PhaseBadge status={row.to_status} />
                        {row.acknowledged_minor && (
                            <span
                                data-testid="acknowledged-minor"
                                className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700 ring-1 ring-inset ring-amber-200"
                            >
                                minor ack
                            </span>
                        )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                        by <span className="font-medium">{actorName(row)}</span>{' '}
                        · {formatTime(row.created_at)}
                    </div>
                    {row.note && (
                        <div className="mt-1 whitespace-pre-wrap text-slate-700">
                            {row.note}
                        </div>
                    )}
                </li>
            ))}
        </ol>
    )
}

export default PhaseTransitionHistory
