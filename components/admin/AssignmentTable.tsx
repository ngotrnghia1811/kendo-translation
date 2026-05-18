/**
 * AssignmentTable — admin-only management UI for document_assignments
 * on a single document. Lists existing assignments with inline edit /
 * remove, and an 'Add' row at the bottom for new grants.
 *
 * User picker uses the admin-only `/api/profiles?search=` endpoint:
 * a search input drives a dropdown of matching profiles; the operator
 * selects one to commit a UUID to the upsert call.
 */

'use client'

import { useEffect, useState } from 'react'
import {
    useDocumentAssignment,
    type AssignmentRow,
} from '@/lib/hooks/useDocumentAssignment'
import type { WorkflowPhase } from '@/types/database'

interface ProfileLite {
    id: string
    username: string
    role: string
}

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
    excludeUserIds,
}: {
    onAdd: (userId: string, phases: WorkflowPhase[]) => Promise<void>
    excludeUserIds: Set<string>
}) {
    const [search, setSearch] = useState('')
    const [results, setResults] = useState<ProfileLite[]>([])
    const [searching, setSearching] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const [selected, setSelected] = useState<ProfileLite | null>(null)
    const [phases, setPhases] = useState<WorkflowPhase[]>([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Debounced search against /api/profiles.
    useEffect(() => {
        if (selected) {
            // User already locked in a pick — don't keep searching.
            return
        }
        const q = search.trim()
        if (q.length === 0) {
            setResults([])
            setSearchError(null)
            return
        }
        let cancelled = false
        const handle = setTimeout(async () => {
            setSearching(true)
            setSearchError(null)
            try {
                const res = await fetch(
                    `/api/profiles?search=${encodeURIComponent(q)}&limit=20`
                )
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(
                        body?.error ?? `Search failed (${res.status})`
                    )
                }
                const body = (await res.json()) as { profiles: ProfileLite[] }
                if (!cancelled) setResults(body.profiles ?? [])
            } catch (e) {
                if (!cancelled)
                    setSearchError(
                        e instanceof Error ? e.message : String(e)
                    )
            } finally {
                if (!cancelled) setSearching(false)
            }
        }, 200)
        return () => {
            cancelled = true
            clearTimeout(handle)
        }
    }, [search, selected])

    const pick = (p: ProfileLite) => {
        setSelected(p)
        setSearch(p.username)
        setResults([])
    }

    const clearPick = () => {
        setSelected(null)
        setSearch('')
        setResults([])
    }

    const submit = async () => {
        if (busy || !selected) return
        setBusy(true)
        setError(null)
        try {
            await onAdd(selected.id, phases)
            setSelected(null)
            setSearch('')
            setPhases([])
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    const visibleResults = results.filter((r) => !excludeUserIds.has(r.id))

    return (
        <tr
            data-testid="assignment-row-add"
            className="border-b border-slate-200 bg-slate-50"
        >
            <td className="px-2 py-1.5 text-xs text-slate-500" colSpan={2}>
                <div className="relative">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            if (selected) setSelected(null)
                        }}
                        placeholder="Search username…"
                        disabled={busy}
                        className="w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                        data-testid="assignment-add-user-id"
                        autoComplete="off"
                    />
                    {selected && (
                        <button
                            type="button"
                            onClick={clearPick}
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-800"
                            data-testid="assignment-add-user-clear"
                            aria-label="Clear selection"
                        >
                            ×
                        </button>
                    )}
                    {!selected &&
                        search.trim().length > 0 &&
                        (searching ||
                            visibleResults.length > 0 ||
                            searchError) && (
                            <ul
                                className="absolute z-10 mt-0.5 max-h-48 w-full overflow-y-auto rounded border border-slate-300 bg-white shadow"
                                data-testid="assignment-add-user-picker"
                            >
                                {searching && (
                                    <li className="px-2 py-1 text-xs text-slate-500">
                                        Searching…
                                    </li>
                                )}
                                {searchError && (
                                    <li className="px-2 py-1 text-xs text-red-600">
                                        {searchError}
                                    </li>
                                )}
                                {!searching &&
                                    !searchError &&
                                    visibleResults.length === 0 && (
                                        <li className="px-2 py-1 text-xs text-slate-500">
                                            No matches.
                                        </li>
                                    )}
                                {visibleResults.map((p) => (
                                    <li key={p.id}>
                                        <button
                                            type="button"
                                            onClick={() => pick(p)}
                                            className="block w-full px-2 py-1 text-left text-xs hover:bg-slate-100"
                                            data-testid="assignment-add-user-picker-option"
                                            data-user-id={p.id}
                                        >
                                            <span className="font-medium">
                                                {p.username}
                                            </span>{' '}
                                            <span className="text-slate-500">
                                                ({p.role})
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                </div>
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
                    disabled={busy || !selected || phases.length === 0}
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
                        excludeUserIds={
                            new Set(assignments.map((a) => a.user_id))
                        }
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
