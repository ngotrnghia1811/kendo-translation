/**
 * AssignmentTable — admin-only management UI for document_assignments
 * on a single document. Lists existing assignments with inline edit /
 * remove, and an 'Add' row at the bottom for new grants.
 *
 * User picker is stubbed as a raw user-id field for this unit; a real
 * search-by-username picker will replace it once we add a profiles
 * search endpoint.
 */

'use client'

import { useState } from 'react'
import {
    useDocumentAssignment,
    type AssignmentRow,
} from '@/lib/hooks/useDocumentAssignment'
import type { WorkflowPhase } from '@/types/database'

const ALL_PHASES: WorkflowPhase[] = ['translate', 'edit', 'proofread', 'qa']

interface AssignmentTableProps {
    documentId: string
}

function userName(row: AssignmentRow): string {
    const u = Array.isArray(row.user) ? row.user[0] : row.user
    return u?.username ?? '—'
}

function shortId(id: string): string {
    return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

function PhaseCheckboxes({
    value,
    onChange,
    disabled,
}: {
    value: WorkflowPhase[]
    onChange: (next: WorkflowPhase[]) => void
    disabled?: boolean
}) {
    const set = new Set(value)
    return (
        <div className="flex flex-wrap gap-2">
            {ALL_PHASES.map((p) => (
                <label
                    key={p}
                    className="inline-flex items-center gap-1 text-xs"
                >
                    <input
                        type="checkbox"
                        checked={set.has(p)}
                        disabled={disabled}
                        onChange={(e) => {
                            const next = new Set(set)
                            if (e.target.checked) next.add(p)
                            else next.delete(p)
                            onChange([...next] as WorkflowPhase[])
                        }}
                        data-testid={`assignment-phase-${p}`}
                    />
                    {p}
                </label>
            ))}
        </div>
    )
}

function AssignmentEditRow({
    row,
    onSave,
    onRemove,
    onCancel,
}: {
    row: AssignmentRow
    onSave: (phases: WorkflowPhase[]) => Promise<void>
    onRemove: () => Promise<void>
    onCancel: () => void
}) {
    const [phases, setPhases] = useState<WorkflowPhase[]>(row.allowed_phases)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const submit = async () => {
        setBusy(true)
        setError(null)
        try {
            await onSave(phases)
            onCancel()
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    const drop = async () => {
        setBusy(true)
        setError(null)
        try {
            await onRemove()
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    return (
        <tr
            data-testid="assignment-row-edit"
            data-user-id={row.user_id}
            className="border-b border-slate-200 bg-amber-50"
        >
            <td className="px-2 py-1.5 text-sm">{userName(row)}</td>
            <td className="px-2 py-1.5 font-mono text-xs text-slate-600">
                {shortId(row.user_id)}
            </td>
            <td className="px-2 py-1.5">
                <PhaseCheckboxes
                    value={phases}
                    onChange={setPhases}
                    disabled={busy}
                />
            </td>
            <td className="px-2 py-1.5 text-xs text-slate-500">
                {row.assigned_by ? shortId(row.assigned_by) : '—'}
            </td>
            <td className="px-2 py-1.5 text-xs text-slate-500">
                {new Date(row.created_at).toLocaleDateString()}
            </td>
            <td className="px-2 py-1.5">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={submit}
                        disabled={busy || phases.length === 0}
                        className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        data-testid="assignment-save"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-50"
                        data-testid="assignment-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={drop}
                        disabled={busy}
                        className="rounded bg-rose-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                        data-testid="assignment-remove"
                    >
                        Remove
                    </button>
                </div>
                {error && (
                    <div className="mt-1 text-xs text-red-600">{error}</div>
                )}
            </td>
        </tr>
    )
}

function AddAssignmentRow({
    onAdd,
}: {
    onAdd: (userId: string, phases: WorkflowPhase[]) => Promise<void>
}) {
    const [userId, setUserId] = useState('')
    const [phases, setPhases] = useState<WorkflowPhase[]>([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const submit = async () => {
        if (busy) return
        setBusy(true)
        setError(null)
        try {
            await onAdd(userId.trim(), phases)
            setUserId('')
            setPhases([])
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    return (
        <tr
            data-testid="assignment-row-add"
            className="border-b border-slate-200 bg-slate-50"
        >
            <td className="px-2 py-1.5 text-xs text-slate-500" colSpan={2}>
                <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="user id (UUID)"
                    disabled={busy}
                    className="w-full rounded border border-slate-300 px-1.5 py-0.5 font-mono text-xs"
                    data-testid="assignment-add-user-id"
                />
            </td>
            <td className="px-2 py-1.5">
                <PhaseCheckboxes
                    value={phases}
                    onChange={setPhases}
                    disabled={busy}
                />
            </td>
            <td colSpan={2} />
            <td className="px-2 py-1.5">
                <button
                    type="button"
                    onClick={submit}
                    disabled={busy || !userId.trim() || phases.length === 0}
                    className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                    data-testid="assignment-add-submit"
                >
                    {busy ? 'Adding…' : 'Add'}
                </button>
                {error && (
                    <div className="mt-1 text-xs text-red-600">{error}</div>
                )}
            </td>
        </tr>
    )
}

export function AssignmentTable({ documentId }: AssignmentTableProps) {
    const {
        assignments,
        loading,
        error,
        upsert,
        updatePhases,
        remove,
    } = useDocumentAssignment(documentId)
    const [editingUserId, setEditingUserId] = useState<string | null>(null)

    if (error) {
        return (
            <div
                data-testid="assignment-table-error"
                className="text-sm text-red-600"
            >
                Failed to load assignments: {error}
            </div>
        )
    }

    return (
        <div data-testid="assignment-table" className="overflow-x-auto">
            <table className="min-w-full text-left">
                <thead className="border-b border-slate-300 bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                        <th className="px-2 py-1.5">User</th>
                        <th className="px-2 py-1.5">ID</th>
                        <th className="px-2 py-1.5">Phases</th>
                        <th className="px-2 py-1.5">Assigned by</th>
                        <th className="px-2 py-1.5">Created</th>
                        <th className="px-2 py-1.5">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && assignments.length === 0 && (
                        <tr>
                            <td
                                colSpan={6}
                                className="px-2 py-2 text-sm text-slate-500"
                                data-testid="assignment-table-loading"
                            >
                                Loading…
                            </td>
                        </tr>
                    )}
                    {!loading && assignments.length === 0 && (
                        <tr>
                            <td
                                colSpan={6}
                                className="px-2 py-2 text-sm text-slate-500"
                                data-testid="assignment-table-empty"
                            >
                                No assignments yet.
                            </td>
                        </tr>
                    )}
                    {assignments.map((row) =>
                        editingUserId === row.user_id ? (
                            <AssignmentEditRow
                                key={row.id}
                                row={row}
                                onSave={(phases) =>
                                    updatePhases(row.user_id, phases).then(
                                        () => undefined
                                    )
                                }
                                onRemove={() => remove(row.user_id)}
                                onCancel={() => setEditingUserId(null)}
                            />
                        ) : (
                            <tr
                                key={row.id}
                                data-testid="assignment-row"
                                data-user-id={row.user_id}
                                className="border-b border-slate-200"
                            >
                                <td className="px-2 py-1.5 text-sm">
                                    {userName(row)}
                                </td>
                                <td className="px-2 py-1.5 font-mono text-xs text-slate-600">
                                    {shortId(row.user_id)}
                                </td>
                                <td className="px-2 py-1.5 text-xs">
                                    {row.allowed_phases.join(', ')}
                                </td>
                                <td className="px-2 py-1.5 text-xs text-slate-500">
                                    {row.assigned_by
                                        ? shortId(row.assigned_by)
                                        : '—'}
                                </td>
                                <td className="px-2 py-1.5 text-xs text-slate-500">
                                    {new Date(
                                        row.created_at
                                    ).toLocaleDateString()}
                                </td>
                                <td className="px-2 py-1.5">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingUserId(row.user_id)
                                        }
                                        className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800 hover:bg-slate-300"
                                        data-testid="assignment-edit"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        )
                    )}
                    <AddAssignmentRow
                        onAdd={(userId, phases) =>
                            upsert(userId, phases).then(() => undefined)
                        }
                    />
                </tbody>
            </table>
        </div>
    )
}

export default AssignmentTable
