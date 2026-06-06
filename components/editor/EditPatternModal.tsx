/**
 * EditPatternModal — shown when accepting a `translated`-phase suggestion.
 *
 * Allows the user to annotate the edit with before/after phrase and
 * rationale so the edit_patterns table can learn reusable patterns.
 *
 * Both optional individually, but if one of before/after is filled the
 * other becomes required (inline validation).
 * If both are empty → treated same as Skip (edit_pattern: null).
 */

'use client'

import { useState } from 'react'

export interface EditPatternData {
    before_phrase: string
    after_phrase: string
    rationale?: string
}

interface EditPatternModalProps {
    onConfirm: (data: EditPatternData | null) => void
    onCancel: () => void
    /** Pre-fill the before-phrase field from a client-side diff suggestion. */
    initialBeforePhrase?: string
    /** Pre-fill the after-phrase field from a client-side diff suggestion. */
    initialAfterPhrase?: string
}

export function EditPatternModal({
    onConfirm,
    onCancel,
    initialBeforePhrase,
    initialAfterPhrase,
}: EditPatternModalProps) {
    const [before, setBefore] = useState(initialBeforePhrase ?? '')
    const [after, setAfter] = useState(initialAfterPhrase ?? '')
    const [rationale, setRationale] = useState('')
    const [error, setError] = useState<string | null>(null)

    const hasInitialSuggestion = !!(initialBeforePhrase && initialAfterPhrase)

    function handleSave() {
        const hasBefore = before.trim().length > 0
        const hasAfter = after.trim().length > 0

        if (hasBefore !== hasAfter) {
            setError('Both "Before phrase" and "After phrase" must be filled together, or leave both empty.')
            return
        }

        if (!hasBefore && !hasAfter) {
            // Treat as Skip
            onConfirm(null)
            return
        }

        onConfirm({
            before_phrase: before.trim(),
            after_phrase: after.trim(),
            rationale: rationale.trim() || undefined,
        })
    }

    function handleSkip() {
        onConfirm(null)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h2 className="mb-4 text-base font-semibold text-slate-800">
                    Record edit pattern
                </h2>
                <p className="mb-4 text-xs text-slate-500">
                    Describe what was changed so this pattern can be reused by the
                    agent in future edits.
                </p>

                {hasInitialSuggestion && (
                    <p className="mb-3 text-xs text-indigo-600 bg-indigo-50 rounded-md px-3 py-2">
                        Auto-suggested from text diff — edit if needed.
                    </p>
                )}

                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Before phrase
                        </label>
                        <input
                            type="text"
                            value={before}
                            onChange={(e) => {
                                setBefore(e.target.value)
                                setError(null)
                            }}
                            placeholder="e.g. he said"
                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            After phrase
                        </label>
                        <input
                            type="text"
                            value={after}
                            onChange={(e) => {
                                setAfter(e.target.value)
                                setError(null)
                            }}
                            placeholder="e.g. he remarked"
                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Rationale
                        </label>
                        <input
                            type="text"
                            value={rationale}
                            onChange={(e) => setRationale(e.target.value)}
                            placeholder="e.g. more idiomatic"
                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {error && (
                    <p className="mt-3 text-xs text-rose-600">{error}</p>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSkip}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
                    >
                        Skip
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                    >
                        Save pattern
                    </button>
                </div>
            </div>
        </div>
    )
}

export default EditPatternModal
