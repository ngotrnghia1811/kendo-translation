/**
 * useDocumentAssignment — fetch + mutate document_assignments for a
 * single document. Admin-only writes; reads are public per RLS.
 *
 * Mutations map to:
 *   upsert(userId, phases)        → POST   /api/documents/[id]/assignments
 *   updatePhases(userId, phases)  → PATCH  /api/documents/[id]/assignments/[userId]
 *   remove(userId)                → DELETE /api/documents/[id]/assignments/[userId]
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkflowPhase } from '@/types/database'

export interface AssignmentUser {
    username: string | null
}

export interface AssignmentRow {
    id: string
    user_id: string
    document_id: string
    allowed_phases: WorkflowPhase[]
    assigned_by: string | null
    created_at: string
    updated_at: string
    user?: AssignmentUser | AssignmentUser[] | null
}

export interface UseDocumentAssignmentResult {
    assignments: AssignmentRow[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
    upsert: (userId: string, phases: WorkflowPhase[]) => Promise<AssignmentRow>
    updatePhases: (
        userId: string,
        phases: WorkflowPhase[]
    ) => Promise<AssignmentRow>
    remove: (userId: string) => Promise<void>
}

export function useDocumentAssignment(
    documentId: string
): UseDocumentAssignmentResult {
    const [assignments, setAssignments] = useState<AssignmentRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const aliveRef = useRef(true)

    const refresh = useCallback(async () => {
        setError(null)
        try {
            const res = await fetch(
                `/api/documents/${documentId}/assignments`
            )
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`HTTP ${res.status}: ${txt}`)
            }
            const data = (await res.json()) as {
                assignments: AssignmentRow[]
            }
            if (aliveRef.current) setAssignments(data.assignments ?? [])
        } catch (e) {
            if (aliveRef.current)
                setError(e instanceof Error ? e.message : String(e))
        } finally {
            if (aliveRef.current) setLoading(false)
        }
    }, [documentId])

    useEffect(() => {
        aliveRef.current = true
        setLoading(true)
        void refresh()
        return () => {
            aliveRef.current = false
        }
    }, [refresh])

    const upsert = useCallback(
        async (userId: string, phases: WorkflowPhase[]) => {
            const res = await fetch(
                `/api/documents/${documentId}/assignments`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        allowed_phases: phases,
                    }),
                }
            )
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`HTTP ${res.status}: ${txt}`)
            }
            const row = (await res.json()) as AssignmentRow
            void refresh()
            return row
        },
        [documentId, refresh]
    )

    const updatePhases = useCallback(
        async (userId: string, phases: WorkflowPhase[]) => {
            const res = await fetch(
                `/api/documents/${documentId}/assignments/${userId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ allowed_phases: phases }),
                }
            )
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`HTTP ${res.status}: ${txt}`)
            }
            const row = (await res.json()) as AssignmentRow
            void refresh()
            return row
        },
        [documentId, refresh]
    )

    const remove = useCallback(
        async (userId: string) => {
            const res = await fetch(
                `/api/documents/${documentId}/assignments/${userId}`,
                { method: 'DELETE' }
            )
            if (!res.ok && res.status !== 204) {
                const txt = await res.text()
                throw new Error(`HTTP ${res.status}: ${txt}`)
            }
            void refresh()
        },
        [documentId, refresh]
    )

    return {
        assignments,
        loading,
        error,
        refresh,
        upsert,
        updatePhases,
        remove,
    }
}

export default useDocumentAssignment
