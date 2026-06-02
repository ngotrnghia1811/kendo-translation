/**
 * useQAIssues — fetches and mutates `qa_issues` for a single segment.
 *
 * Mutations call PATCH /api/segments/[id]/qa-issues/[issueId] with
 *   { resolved: true | false, qa_save?: { ... } }
 * and re-fetch the list.
 *
 * Subscribes to `qa_issues` postgres_changes filtered on
 * `segment_id=eq.<segmentId>` so collaborator activity refreshes the
 * list automatically.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { QAIssue } from '@/types/database'

/** Shape of the qa_save payload sent when resolving with pattern recording. */
export interface QASavePayload {
    pattern_name: string
    category?: string
    description?: string
    outcome: 'confirmed' | 'dismissed_false_positive' | 'dismissed_out_of_scope'
    dismissal_reason?: string
    agent_confidence?: number
}

/** Response from PATCH /api/segments/[id]/qa-issues/[issueId] when
 *  resolving with qa_save.  Extra fields are only present when the
 *  route fires the Phase-4b qa_save RPC. */
export interface QAIssueResolveResponse extends QAIssue {
    qa_save_result?: { wrote: string; ids: string[] }
    qa_save_warning?: string
}

export interface UseQAIssuesResult {
    issues: QAIssue[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
    resolve: (id: string, qaSave?: QASavePayload) => Promise<QAIssueResolveResponse>
    reopen: (id: string) => Promise<QAIssueResolveResponse>
}

export function useQAIssues(segmentId: string): UseQAIssuesResult {
    const [issues, setIssues] = useState<QAIssue[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const aliveRef = useRef(true)

    const refresh = useCallback(async () => {
        setError(null)
        try {
            const res = await fetch(`/api/segments/${segmentId}/qa-issues`)
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`HTTP ${res.status}: ${txt}`)
            }
            const data = (await res.json()) as QAIssue[]
            if (aliveRef.current) setIssues(data ?? [])
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

    // Realtime: refetch whenever any qa_issues row for this segment is
    // inserted, updated, or deleted by anyone.
    const supabase = useMemo(() => createClient(), [])
    useEffect(() => {
        const channel = supabase
            .channel(`seg-qa-issues:${segmentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'qa_issues',
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

    const patchIssue = useCallback(
        async (id: string, body: Record<string, unknown>): Promise<QAIssueResolveResponse> => {
            const res = await fetch(
                `/api/segments/${segmentId}/qa-issues/${id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                }
            )
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`HTTP ${res.status}: ${txt}`)
            }
            const updated = (await res.json()) as QAIssueResolveResponse
            void refresh()
            return updated
        },
        [segmentId, refresh]
    )

    const resolve = useCallback(
        (id: string, qaSave?: QASavePayload) => {
            const body: Record<string, unknown> = { resolved: true }
            if (qaSave) body.qa_save = qaSave
            return patchIssue(id, body)
        },
        [patchIssue]
    )

    const reopen = useCallback(
        (id: string) => patchIssue(id, { resolved: false }),
        [patchIssue]
    )

    return { issues, loading, error, refresh, resolve, reopen }
}

export default useQAIssues
