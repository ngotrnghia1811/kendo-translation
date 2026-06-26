/**
 * QAResolveModal — shown when resolving a QA issue.
 *
 * Allows the user to record a reusable QA pattern outcome in the
 * phase-4b memory tables (via rpc_phase_4b_qa_save) so the agent can
 * learn from human QA decisions.
 *
 * "Save & resolve" validates that pattern_name is non-empty.
 * "Skip" resolves without recording a pattern (no qa_save).
 * "Cancel" closes without resolving.
 */

'use client'

import { useState } from 'react'

export interface QAResolveData {
    pattern_name: string
    category: string
    outcome: 'confirmed' | 'dismissed_false_positive' | 'dismissed_out_of_scope'
    dismissal_reason?: string
}

interface QAResolveModalProps {
    issue: {
        id: string
        category: string
        severity: string
        body: string | null
    }
    onConfirm: (data: QAResolveData) => void
    onSkip: () => void
    onCancel: () => void
}

const OUTCOME_OPTIONS = [
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'dismissed_false_positive', label: 'Dismissed — false positive' },
    { value: 'dismissed_out_of_scope', label: 'Dismissed — out of scope' },
] as const

export function QAResolveModal({ issue, onConfirm, onSkip, onCancel }: QAResolveModalProps) {
    const defaultPatternName = `${issue.category}/${issue.severity}`
    const [patternName, setPatternName] = useState(defaultPatternName)
    const [category, setCategory] = useState(issue.category)
    const [outcome, setOutcome] = useState<string>('confirmed')
    const [dismissalReason, setDismissalReason] = useState('')
    const [error, setError] = useState<string | null>(null)

    function handleSave() {
        if (!patternName.trim()) {
            setError('"Pattern name" is required.')
            return
        }

        const data: QAResolveData = {
            pattern_name: patternName.trim(),
            category: category.trim(),
            outcome: outcome as QAResolveData['outcome'],
        }

        if (outcome !== 'confirmed' && dismissalReason.trim()) {
            data.dismissal_reason = dismissalReason.trim()
        }

        onConfirm(data)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] p-6 shadow-xl">
                <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
                    Resolve QA issue
                </h2>
                <p className="mb-4 text-xs text-[var(--color-text-muted)]">
                    Record the resolution outcome so the agent can learn from
                    this QA decision across future translations.
                </p>

                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                            Pattern name
                        </label>
                        <input
                            type="text"
                            value={patternName}
                            onChange={(e) => {
                                setPatternName(e.target.value)
                                setError(null)
                            }}
                            placeholder="e.g. Terminology/minor"
                            className="w-full rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                            Category
                        </label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => {
                                setCategory(e.target.value)
                                setError(null)
                            }}
                            placeholder="e.g. Terminology"
                            className="w-full rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                            Outcome
                        </label>
                        <select
                            value={outcome}
                            onChange={(e) => {
                                setOutcome(e.target.value)
                                setError(null)
                            }}
                            className="w-full rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            {OUTCOME_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {outcome !== 'confirmed' && (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                                Dismissal reason
                            </label>
                            <input
                                type="text"
                                value={dismissalReason}
                                onChange={(e) => {
                                    setDismissalReason(e.target.value)
                                    setError(null)
                                }}
                                placeholder="e.g. Not applicable for this domain"
                                className="w-full rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                </div>

                {error && (
                    <p className="mt-3 text-xs text-rose-600">{error}</p>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSkip}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
                    >
                        Skip
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                    >
                        Save &amp; resolve
                    </button>
                </div>
            </div>
        </div>
    )
}

export default QAResolveModal
