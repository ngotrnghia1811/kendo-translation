/**
 * AgentSuggestionPanel — single-button trigger for the per-phase
 * agent suggestion endpoint. Posts to /api/agents/[phase] with the
 * segment id, then invokes the optional `onCreated` callback so the
 * parent can refresh its SuggestionPanel.
 *
 * Error surfacing is intentionally simple: 422 / 502 / 503 messages
 * are rendered verbatim from the response body so the user can see
 * "edit/proofread requires non-empty target_text" or "No OpenRouter
 * API key configured" without guessing.
 */

'use client'

import { useState } from 'react'

export type AgentPhase = 'translate' | 'edit' | 'proofread'

interface AgentSuggestionPanelProps {
    segmentId: string
    phase: AgentPhase
    disabled?: boolean
    onCreated?: () => void
}

const LABEL: Record<AgentPhase, string> = {
    translate: 'Translate',
    edit: 'Edit',
    proofread: 'Proofread',
}

export function AgentSuggestionPanel({
    segmentId,
    phase,
    disabled = false,
    onCreated,
}: AgentSuggestionPanelProps) {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastStatus, setLastStatus] = useState<number | null>(null)

    const onClick = async () => {
        if (busy || disabled) return
        setBusy(true)
        setError(null)
        setLastStatus(null)
        try {
            const res = await fetch(`/api/agents/${phase}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ segment_id: segmentId }),
            })
            setLastStatus(res.status)
            if (!res.ok) {
                let msg = `HTTP ${res.status}`
                try {
                    const body = (await res.json()) as { error?: string }
                    if (body?.error) msg = body.error
                } catch {
                    /* keep status-only */
                }
                throw new Error(msg)
            }
            onCreated?.()
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            data-testid="agent-suggestion-panel"
            data-phase={phase}
            className="inline-flex items-center gap-2"
        >
            <button
                type="button"
                onClick={onClick}
                disabled={busy || disabled}
                className="rounded bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                data-testid="agent-suggestion-trigger"
            >
                {busy ? `${LABEL[phase]}…` : `Agent: ${LABEL[phase]}`}
            </button>
            {error && (
                <span
                    data-testid="agent-suggestion-error"
                    data-status={lastStatus ?? ''}
                    className="text-xs text-red-600"
                >
                    {error}
                </span>
            )}
        </div>
    )
}

export default AgentSuggestionPanel
