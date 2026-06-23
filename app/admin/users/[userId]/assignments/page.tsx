'use client'

/**
 * Admin per-user assignments page.
 *
 * Read-only matrix view backed by GET /api/admin/users/[userId]/
 * assignments, with inline editing of `allowed_phases` and per-row
 * removal that re-use the existing per-document mutation routes at
 * /api/documents/[documentId]/assignments/[userId] (PATCH / DELETE).
 *
 * The client-side admin check (probe /api/admin/users) is purely
 * cosmetic; server-side gates on every called endpoint are the
 * authoritative protection.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { WorkflowPhase } from '@/types/database'

const PHASES: WorkflowPhase[] = ['translate', 'edit', 'proofread', 'qa']

interface DocumentRef {
    id: string
    title: string | null
}

interface UserAssignment {
    id: string
    user_id: string
    document_id: string
    allowed_phases: WorkflowPhase[]
    assigned_by: string | null
    created_at: string
    updated_at: string | null
    // PostgREST returns either an object or an array depending on
    // cardinality; accept both.
    document: DocumentRef | DocumentRef[] | null
}

interface UserRow {
    id: string
    username: string | null
    role: string
}

function docOf(row: UserAssignment): DocumentRef | null {
    if (!row.document) return null
    return Array.isArray(row.document) ? (row.document[0] ?? null) : row.document
}

function formatTime(iso: string | null): string {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleString()
    } catch {
        return iso
    }
}

interface RowProps {
    row: UserAssignment
    onSaved: (updated: UserAssignment) => void
    onRemoved: (documentId: string) => void
}

function AssignmentRow({ row, onSaved, onRemoved }: RowProps) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState<WorkflowPhase[]>(row.allowed_phases)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const doc = docOf(row)
    const docTitle = doc?.title ?? row.document_id

    const togglePhase = (p: WorkflowPhase) => {
        setDraft((prev) =>
            prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
        )
    }

    const save = async () => {
        if (draft.length === 0) {
            setError('Pick at least one phase or remove the assignment.')
            return
        }
        setBusy(true)
        setError(null)
        try {
            const res = await fetch(
                `/api/documents/${row.document_id}/assignments/${row.user_id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ allowed_phases: draft }),
                }
            )
            if (!res.ok) {
                const t = await res.text()
                throw new Error(`HTTP ${res.status}: ${t}`)
            }
            const updated = (await res.json()) as UserAssignment
            // Server response lacks the joined document; preserve ours.
            onSaved({ ...row, ...updated, document: row.document })
            setEditing(false)
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        if (
            !window.confirm(`Remove assignment for "${docTitle}"?`)
        ) {
            return
        }
        setBusy(true)
        setError(null)
        try {
            const res = await fetch(
                `/api/documents/${row.document_id}/assignments/${row.user_id}`,
                { method: 'DELETE' }
            )
            if (!res.ok && res.status !== 204) {
                const t = await res.text()
                throw new Error(`HTTP ${res.status}: ${t}`)
            }
            onRemoved(row.document_id)
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
            setBusy(false)
        }
    }

    return (
        <tr
            data-testid="admin-user-assignments-row"
            data-doc-id={row.document_id}
            className="border-b border-[var(--color-border)] last:border-0"
        >
            <td className="py-2 pr-4">
                <Link
                    href={`/admin/documents/${row.document_id}/assignments`}
                    className="text-blue-600 hover:underline"
                    data-testid="admin-user-assignments-doc-link"
                >
                    {docTitle}
                </Link>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5 font-mono">
                    {row.document_id.slice(0, 8)}…
                </div>
            </td>
            <td className="py-2 pr-4">
                {editing ? (
                    <div className="flex flex-wrap gap-2">
                        {PHASES.map((p) => (
                            <label
                                key={p}
                                className="inline-flex items-center gap-1 text-xs"
                            >
                                <input
                                    type="checkbox"
                                    checked={draft.includes(p)}
                                    onChange={() => togglePhase(p)}
                                    data-testid={`admin-user-assignments-phase-${p}`}
                                />
                                {p}
                            </label>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {row.allowed_phases.length === 0 ? (
                            <span className="text-xs text-[var(--color-text-muted)]">—</span>
                        ) : (
                            row.allowed_phases.map((p) => (
                                <span
                                    key={p}
                                    className="inline-block rounded bg-[var(--color-bg)] px-2 py-0.5 text-xs text-[var(--color-text)]"
                                >
                                    {p}
                                </span>
                            ))
                        )}
                    </div>
                )}
                {error && (
                    <div className="text-xs text-red-600 mt-1">{error}</div>
                )}
            </td>
            <td className="py-2 pr-4 text-xs text-[var(--color-text-muted)]">
                {formatTime(row.created_at)}
            </td>
            <td className="py-2 pr-4 text-xs text-[var(--color-text-muted)]">
                {formatTime(row.updated_at)}
            </td>
            <td className="py-2 text-right">
                {editing ? (
                    <div className="inline-flex gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={save}
                            data-testid="admin-user-assignments-save"
                            className="text-xs rounded bg-blue-600 text-white px-2 py-1 hover:bg-blue-700 disabled:opacity-50"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                setDraft(row.allowed_phases)
                                setError(null)
                                setEditing(false)
                            }}
                            data-testid="admin-user-assignments-cancel"
                            className="text-xs rounded border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-bg)] disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="inline-flex gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => setEditing(true)}
                            data-testid="admin-user-assignments-edit"
                            className="text-xs rounded border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-bg)] disabled:opacity-50"
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={remove}
                            data-testid="admin-user-assignments-remove"
                            className="text-xs rounded border border-red-200 text-red-700 px-2 py-1 hover:bg-red-50 disabled:opacity-50"
                        >
                            Remove
                        </button>
                    </div>
                )}
            </td>
        </tr>
    )
}

export default function AdminUserAssignmentsPage() {
    const params = useParams<{ userId: string }>()
    const userId = params.userId

    const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
    const [user, setUser] = useState<UserRow | null>(null)
    const [rows, setRows] = useState<UserAssignment[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/users/${userId}/assignments`)
            if (!res.ok) {
                const t = await res.text()
                throw new Error(`HTTP ${res.status}: ${t}`)
            }
            const data = (await res.json()) as { assignments: UserAssignment[] }
            setRows(data.assignments ?? [])
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        }
    }, [userId])

    useEffect(() => {
        const load = async () => {
            try {
                const usersRes = await fetch('/api/admin/users')
                if (usersRes.status === 403) {
                    setIsAdmin(false)
                    return
                }
                if (!usersRes.ok) {
                    setError(`Auth check failed: HTTP ${usersRes.status}`)
                    setIsAdmin(false)
                    return
                }
                setIsAdmin(true)
                const data = (await usersRes.json()) as { users?: UserRow[] }
                const found = (data.users ?? []).find((u) => u.id === userId)
                if (found) setUser(found)
                await refresh()
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
                setIsAdmin(false)
            }
        }
        void load()
    }, [userId, refresh])

    const sortedRows = useMemo(() => rows ?? [], [rows])

    if (isAdmin === null) {
        return (
            <div className="container mx-auto px-4 py-8 text-[var(--color-text-muted)]">
                Loading…
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div
                className="container mx-auto px-4 py-8"
                data-testid="admin-user-assignments-forbidden"
            >
                <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                    Forbidden
                </h1>
                <p className="text-sm text-[var(--color-text-muted)]">
                    You must be an admin to view per-user assignments.
                </p>
                <Link
                    href="/admin"
                    className="inline-block mt-4 text-sm text-blue-600 hover:underline"
                >
                    ← Back to admin
                </Link>
            </div>
        )
    }

    return (
        <div
            className="container mx-auto px-4 py-8"
            data-testid="admin-user-assignments-page"
        >
            <div className="mb-6 flex items-center gap-2 text-sm">
                <Link
                    href="/admin"
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                    ← Admin
                </Link>
                <span className="text-[var(--color-text-muted)]/40">/</span>
                <span className="text-[var(--color-text)] font-medium">
                    User assignments
                </span>
                <span className="text-[var(--color-text-muted)]/40">/</span>
                <span
                    className="text-[var(--color-text-muted)] truncate"
                    data-testid="admin-user-assignments-username"
                >
                    {user?.username ?? userId}
                </span>
            </div>

            {error && (
                <div className="mb-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">
                    {error}
                </div>
            )}

            <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                Assignments for {user?.username ?? 'this user'}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
                All documents this user is assigned to, with editable
                phase capabilities.
            </p>

            {rows === null ? (
                <div className="text-sm text-[var(--color-text-muted)]">Loading…</div>
            ) : sortedRows.length === 0 ? (
                <div
                    data-testid="admin-user-assignments-empty"
                    className="text-sm text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded px-4 py-6 text-center"
                >
                    No assignments yet.
                </div>
            ) : (
                <table
                    data-testid="admin-user-assignments-table"
                    className="w-full text-sm"
                >
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                            <th className="py-2 pr-4 font-medium">Document</th>
                            <th className="py-2 pr-4 font-medium">Phases</th>
                            <th className="py-2 pr-4 font-medium">Created</th>
                            <th className="py-2 pr-4 font-medium">Updated</th>
                            <th className="py-2 font-medium text-right">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRows.map((row) => (
                            <AssignmentRow
                                key={row.id}
                                row={row}
                                onSaved={(updated) =>
                                    setRows((prev) =>
                                        (prev ?? []).map((r) =>
                                            r.id === updated.id ? updated : r
                                        )
                                    )
                                }
                                onRemoved={(docId) =>
                                    setRows((prev) =>
                                        (prev ?? []).filter(
                                            (r) => r.document_id !== docId
                                        )
                                    )
                                }
                            />
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}
