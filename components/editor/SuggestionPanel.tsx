/**
 * SuggestionPanel — list of segment_suggestions with accept/reject
 * controls for pending rows.
 *
 * Does NOT mutate `segments.target_text` directly. When a suggestion is
 * accepted, the panel calls `onAccepted(proposed_text)` so the parent
 * editor can route the apply through PATCH /api/segments/[id], which
 * is the only path that honors the soft-lock contract.
 */

'use client'

import { useSuggestions, type SuggestionRow } from '@/lib/hooks/useSuggestions'

interface SuggestionPanelProps {
    segmentId: string
    onAccepted?: (proposedText: string, row: SuggestionRow) => void
}

function suggesterName(row: SuggestionRow): string {
    const s = Array.isArray(row.suggester) ? row.suggester[0] : row.suggester
    return s?.username ?? 'unknown'
}

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString()
    } catch {
        return iso
    }
}

const STATUS_CLASS: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-700 ring-slate-200',
    accepted: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    rejected: 'bg-rose-100 text-rose-700 ring-rose-200',
    superseded: 'bg-amber-100 text-amber-800 ring-amber-200',
}

const KIND_CLASS: Record<string, string> = {
    human: 'bg-sky-50 text-sky-700 ring-sky-200',
    agent: 'bg-violet-50 text-violet-700 ring-violet-200',
}

export function SuggestionPanel({ segmentId, onAccepted }: SuggestionPanelProps) {
    const { suggestions, loading, error, accept, reject } = useSuggestions(
        segmentId
    )

    if (error) {
        return (
            <div
                data-testid="suggestion-panel-error"
                className="text-sm text-red-600"
            >
                Failed to load suggestions: {error}
            </div>
        )
    }
    if (loading && suggestions.length === 0) {
        return (
            <div
                data-testid="suggestion-panel-loading"
                className="text-sm text-slate-500"
            >
                Loading suggestions…
            </div>
        )
    }

    if (suggestions.length === 0) {
        return (
            <div
                data-testid="suggestion-panel-empty"
                className="text-sm text-slate-500"
            >
                No suggestions yet.
            </div>
        )
    }

    return (
        <ul data-testid="suggestion-panel" className="space-y-2">
            {suggestions.map((row) => (
                <li
                    key={row.id}
                    data-testid="suggestion-row"
                    data-suggestion-id={row.id}
                    className="rounded border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                            {suggesterName(row)}
                        </span>
                        <span
                            className={`rounded px-1.5 py-0.5 ring-1 ring-inset ${
                                KIND_CLASS[row.suggester_kind] ?? ''
                            }`}
                        >
                            {row.suggester_kind}
                        </span>
                        <span>· {formatTime(row.created_at)}</span>
                        <span
                            data-testid="suggestion-status"
                            className={`ml-auto rounded px-1.5 py-0.5 ring-1 ring-inset ${
                                STATUS_CLASS[row.status] ?? ''
                            }`}
                        >
                            {row.status}
                        </span>
                    </div>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 px-2 py-1.5 font-sans text-slate-800">
                        {row.proposed_text}
                    </pre>
                    {row.status === 'pending' && (
                        <div className="mt-2 flex gap-2">
                            <button
                                type="button"
                                onClick={async () => {
                                    const updated = await accept(row.id)
                                    onAccepted?.(updated.proposed_text, updated)
                                }}
                                className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                                data-testid="suggestion-accept"
                            >
                                Accept
                            </button>
                            <button
                                type="button"
                                onClick={() => void reject(row.id)}
                                className="rounded bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-300"
                                data-testid="suggestion-reject"
                            >
                                Reject
                            </button>
                        </div>
                    )}
                </li>
            ))}
        </ul>
    )
}

export default SuggestionPanel
