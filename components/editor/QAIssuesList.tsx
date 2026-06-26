/**
 * QAIssuesList — lists QA issues for a segment, grouped by resolved status.
 *
 * Fetches qa_issues via GET /api/segments/[segmentId]/qa-issues and
 * subscribes to realtime changes on the `qa_issues` table.
 *
 * Open issues show a "Resolve" button that opens QAResolveModal.
 * Resolved issues show a "Reopen" button that resolves with { resolved: false }.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQAIssues, type QASavePayload, type QAIssueResolveResponse } from '@/lib/hooks/useQAIssues'
import { QAResolveModal, type QAResolveData } from '@/components/editor/QAResolveModal'
import type { QAIssue } from '@/types/database'

interface ResolveFeedback {
    type: 'success' | 'warning'
    message: string
}

interface QAIssuesListProps {
    segmentId: string
    articleId?: string | null
}

const SEVERITY_COLORS: Record<string, string> = {
    minor: 'bg-yellow-100 text-yellow-800',
    major: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
}

function formatTimestamp(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString()
}

export function QAIssuesList({ segmentId }: QAIssuesListProps) {
    const { issues, loading, error, resolve, reopen } = useQAIssues(segmentId)
    const [pendingResolveIssue, setPendingResolveIssue] = useState<null | {
        id: string
        category: string
        severity: string
        body: string | null
    }>(null)

    /** Transient inline feedback shown on a resolved issue row after a
     *  qa_save write-back (success or failure).  Auto-clears after 5 s. */
    const [resolveFeedback, setResolveFeedback] = useState<
        Record<string, ResolveFeedback>
    >({})
    const feedbackTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

    /** Store feedback for an issue and schedule auto-clear. */
    const setFeedback = useCallback(
        (issueId: string, fb: ResolveFeedback) => {
            // Clear any existing timer for this issue.
            if (feedbackTimers.current[issueId]) {
                clearTimeout(feedbackTimers.current[issueId])
            }
            setResolveFeedback((prev) => ({ ...prev, [issueId]: fb }))
            feedbackTimers.current[issueId] = setTimeout(() => {
                setResolveFeedback((prev) => {
                    const next = { ...prev }
                    delete next[issueId]
                    return next
                })
                delete feedbackTimers.current[issueId]
            }, 5000)
        },
        []
    )

    // Cleanup timers on unmount.
    useEffect(() => {
        const timers = feedbackTimers.current
        return () => {
            Object.values(timers).forEach(clearTimeout)
        }
    }, [])

    const openIssues = issues.filter((i) => !i.resolved)
    const resolvedIssues = issues.filter((i) => i.resolved)

    if (loading) {
        return (
            <p className="text-xs text-slate-400 italic">Loading QA issues…</p>
        )
    }

    if (error) {
        return (
            <p className="text-xs text-rose-600">
                Failed to load QA issues: {error}
            </p>
        )
    }

    if (issues.length === 0) {
        return (
            <p className="text-xs text-slate-400 italic">No QA issues for this segment.</p>
        )
    }

    /** Resolve with qa_save payload — capture Phase-4b write-back result. */
    async function handleResolve(data: QAResolveData) {
        if (!pendingResolveIssue) return
        const issueId = pendingResolveIssue.id
        setPendingResolveIssue(null)
        const result = await resolve(issueId, data as QASavePayload)
        showResolveFeedback(issueId, result)
    }

    /** Helper to surface qa_save_result / qa_save_warning as inline feedback. */
    function showResolveFeedback(issueId: string, result: QAIssueResolveResponse) {
        if (result.qa_save_result) {
            setFeedback(issueId, { type: 'success', message: 'Pattern recorded ✓' })
        } else if (result.qa_save_warning) {
            setFeedback(issueId, {
                type: 'warning',
                message: `Pattern save failed: ${result.qa_save_warning}`,
            })
        }
    }

    function renderIssue(issue: QAIssue) {
        const severityColor = SEVERITY_COLORS[issue.severity] ?? 'bg-slate-100 text-slate-700'
        const isResolved = issue.resolved

        return (
            <div
                key={issue.id}
                className={`rounded-lg border p-3 ${isResolved ? 'border-[var(--color-border)] bg-[var(--color-bg)]' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span
                                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700`}
                            >
                                {issue.category}
                            </span>
                            <span
                                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${severityColor}`}
                            >
                                {issue.severity}
                            </span>
                            {isResolved && (
                                <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-800">
                                    Resolved
                                </span>
                            )}
                        </div>

                        {/* Body text */}
                        {issue.body && (
                            <p
                                className={`text-xs text-slate-700 ${isResolved ? 'line-through text-slate-400' : ''}`}
                            >
                                {issue.body}
                            </p>
                        )}
                        {!issue.body && (
                            <p
                                className={`text-xs italic ${isResolved ? 'text-slate-300' : 'text-slate-400'}`}
                            >
                                No description
                            </p>
                        )}

                        {/* Phase-4b qa_save feedback (auto-clears after 5 s) */}
                        {resolveFeedback[issue.id] && (
                            <p
                                className={`mt-1 text-[10px] font-medium ${
                                    resolveFeedback[issue.id].type === 'success'
                                        ? 'text-green-600'
                                        : 'text-amber-600'
                                }`}
                            >
                                {resolveFeedback[issue.id].message}
                            </p>
                        )}

                        {/* Resolved timestamp */}
                        {isResolved && issue.resolved_at && (
                            <p className="mt-1 text-[10px] text-slate-400">
                                Resolved {formatTimestamp(issue.resolved_at)}
                            </p>
                        )}
                    </div>

                    {/* Action button */}
                    <div className="shrink-0">
                        {isResolved ? (
                            <button
                                type="button"
                                onClick={() => void reopen(issue.id)}
                                className="rounded-md px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                            >
                                Reopen
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() =>
                                    setPendingResolveIssue({
                                        id: issue.id,
                                        category: issue.category,
                                        severity: issue.severity,
                                        body: issue.body,
                                    })
                                }
                                className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-indigo-500 transition-colors"
                            >
                                Resolve
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {/* Open issues — shown first */}
            {openIssues.length > 0 && (
                <div className="space-y-2">
                    {openIssues.map(renderIssue)}
                </div>
            )}

            {/* Resolved issues — muted section below */}
            {resolvedIssues.length > 0 && (
                <div className="space-y-2">
                    {openIssues.length > 0 && (
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide pt-1">
                            Resolved
                        </p>
                    )}
                    {resolvedIssues.map(renderIssue)}
                </div>
            )}

            {/* Resolve modal */}
            {pendingResolveIssue && (
                <QAResolveModal
                    issue={pendingResolveIssue}
                    onConfirm={handleResolve}
                    onSkip={async () => {
                        const issueId = pendingResolveIssue.id
                        setPendingResolveIssue(null)
                        const result = await resolve(issueId)
                        showResolveFeedback(issueId, result)
                    }}
                    onCancel={() => setPendingResolveIssue(null)}
                />
            )}
        </div>
    )
}

export default QAIssuesList
