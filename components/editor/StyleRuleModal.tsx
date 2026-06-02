/**
 * StyleRuleModal — shown when accepting an `edited`-phase (proofread)
 * suggestion.
 *
 * Allows the user to record a reusable style rule in the style_guide
 * table so the agent can learn house-style conventions.
 *
 * "Save rule" validates that scope, rule_category, pattern, and policy
 * are all non-empty.
 * "Skip" closes without saving a style rule (annotations are optional).
 */

'use client'

import { useState } from 'react'

export interface StyleRuleData {
    scope: string
    /**
     * UUID of the scoped entity when scope='article' or scope='document'.
     * Null for scope='global'. Forwarded as scope_ref in the
     * rpc_phase_4b_save_style payload so the style_guide row is anchored
     * to the correct article or document.
     */
    scope_ref: string | null
    rule_category: string
    pattern: string
    policy: string
    rationale?: string
}

interface StyleRuleModalProps {
    /** UUID of the article currently being edited; passed as scope_ref when scope='article'. */
    articleId?: string | null
    onConfirm: (data: StyleRuleData) => void
    onSkip: () => void
    onCancel: () => void
}

const SCOPE_OPTIONS = ['global', 'article', 'document'] as const

export function StyleRuleModal({ articleId, onConfirm, onSkip, onCancel }: StyleRuleModalProps) {
    const [scope, setScope] = useState<string>(SCOPE_OPTIONS[0])
    const [ruleCategory, setRuleCategory] = useState('')
    const [pattern, setPattern] = useState('')
    const [policy, setPolicy] = useState('')
    const [rationale, setRationale] = useState('')
    const [error, setError] = useState<string | null>(null)

    function handleSave() {
        if (!ruleCategory.trim()) {
            setError('"Rule category" is required.')
            return
        }
        if (!pattern.trim()) {
            setError('"Pattern" is required.')
            return
        }
        if (!policy.trim()) {
            setError('"Policy" is required.')
            return
        }

        // Compute scope_ref: article-level scoping uses articleId; global has no ref.
        let scopeRef: string | null = null
        if (scope === 'article' && articleId) {
            scopeRef = articleId
        }

        onConfirm({
            scope,
            scope_ref: scopeRef,
            rule_category: ruleCategory.trim(),
            pattern: pattern.trim(),
            policy: policy.trim(),
            rationale: rationale.trim() || undefined,
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h2 className="mb-4 text-base font-semibold text-slate-800">
                    Record style rule
                </h2>
                <p className="mb-4 text-xs text-slate-500">
                    Capture a reusable house-style convention from this proofread
                    edit so the agent can apply it consistently.
                </p>

                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Scope
                        </label>
                        <select
                            value={scope}
                            onChange={(e) => {
                                setScope(e.target.value)
                                setError(null)
                            }}
                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            {SCOPE_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                        {scope === 'article' && !articleId && (
                            <p className="mt-1 text-xs text-amber-600">
                                Article ID not available — rule will be saved without article anchor.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Rule category
                        </label>
                        <input
                            type="text"
                            value={ruleCategory}
                            onChange={(e) => {
                                setRuleCategory(e.target.value)
                                setError(null)
                            }}
                            placeholder="e.g. punctuation"
                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Pattern
                        </label>
                        <input
                            type="text"
                            value={pattern}
                            onChange={(e) => {
                                setPattern(e.target.value)
                                setError(null)
                            }}
                            placeholder="e.g. use em-dash for apposition"
                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Policy
                        </label>
                        <input
                            type="text"
                            value={policy}
                            onChange={(e) => {
                                setPolicy(e.target.value)
                                setError(null)
                            }}
                            placeholder="e.g. must use em-dash"
                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Rationale
                        </label>
                        <textarea
                            value={rationale}
                            onChange={(e) => {
                                setRationale(e.target.value)
                                setError(null)
                            }}
                            rows={2}
                            placeholder="e.g. standard style for kendo literature"
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
                        onClick={onSkip}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
                    >
                        Skip
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                    >
                        Save rule
                    </button>
                </div>
            </div>
        </div>
    )
}

export default StyleRuleModal
