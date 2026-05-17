/**
 * PhaseAdvanceButton — single-segment phase advance UI.
 *
 * Renders a button labeled with the next legal phase for the segment's
 * current status. Click reveals an inline confirm panel with an optional
 * note; submit POSTs /api/segments/[id]/advance-phase with explicit
 * to_status + expected_current_status for optimistic-concurrency safety.
 *
 * 409 handling: when the server reports the segment has moved (the
 * `current_status` field of the 409 body), we invoke `onStaleStatus`
 * with the truthful status so the parent can re-render, and we show
 * an inline message instructing the user to refresh.
 */

'use client'

import { useState } from 'react'
import type { SegmentStatus } from '@/types/database'

const LEGAL_FORWARD: Record<SegmentStatus, SegmentStatus | null> = {
    draft: 'translated',
    translated: 'edited',
    edited: 'proofread',
    proofread: 'qa_approved',
    qa_approved: null,
}

const LABEL: Record<SegmentStatus, string> = {
    draft: 'Draft',
    translated: 'Translated',
    edited: 'Edited',
    proofread: 'Proofread',
    qa_approved: 'QA Approved',
}

interface PhaseAdvanceButtonProps {
    segmentId: string
    currentStatus: SegmentStatus
    disabled?: boolean
    onAdvanced?: (newStatus: SegmentStatus) => void
    onStaleStatus?: (actualStatus: SegmentStatus) => void
}

export function PhaseAdvanceButton({
    segmentId,
    currentStatus,
    disabled = false,
    onAdvanced,
    onStaleStatus,
}: PhaseAdvanceButtonProps) {
    const next = LEGAL_FORWARD[currentStatus]
    const [confirming, setConfirming] = useState(false)
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [stale, setStale] = useState<SegmentStatus | null>(null)

    if (!next) {
        return (
            <button
                type="button"
                disabled
                className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400"
                data-testid="phase-advance-terminal"
            >
                QA Approved — terminal
            </button>
        )
    }

    const submit = async () => {
        if (busy) return
        setBusy(true)
        setError(null)
        setStale(null)
        try {
            const res = await fetch(
                `/api/segments/${segmentId}/advance-phase`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to_status: next,
                        expected_current_status: currentStatus,
                        note: note.trim() || undefined,
                    }),
                }
            )
            if (res.status === 200) {
                onAdvanced?.(next)
                setConfirming(false)
                setNote('')
                return
            }
            const body = (await res.json().catch(() => null)) as
                | { error?: string; current_status?: SegmentStatus }
                | null
            if (res.status === 409 && body?.current_status) {
                setStale(body.current_status)
                onStaleStatus?.(body.current_status)
                return
            }
            setError(body?.error ?? `HTTP ${res.status}`)
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    if (!confirming) {
        return (
            <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={disabled}
                className="rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                data-testid="phase-advance-button"
                data-next={next}
            >
                Advance → {LABEL[next]}
            </button>
        )
    }

    return (
        <div
            data-testid="phase-advance-confirm"
            className="space-y-2 rounded border border-slate-200 bg-slate-50 p-2"
        >
            <div className="text-xs text-slate-600">
                Advance from <strong>{LABEL[currentStatus]}</strong> to{' '}
                <strong>{LABEL[next]}</strong>?
            </div>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for the transition log…"
                rows={2}
                disabled={busy}
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-500 focus:outline-none disabled:opacity-60"
                data-testid="phase-advance-note"
            />
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={submit}
                    disabled={busy}
                    className="rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                    data-testid="phase-advance-confirm-submit"
                >
                    {busy ? 'Advancing…' : 'Confirm'}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setConfirming(false)
                        setNote('')
                        setError(null)
                        setStale(null)
                    }}
                    disabled={busy}
                    className="rounded bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-50"
                    data-testid="phase-advance-confirm-cancel"
                >
                    Cancel
                </button>
                {stale && (
                    <span
                        data-testid="phase-advance-stale"
                        data-actual-status={stale}
                        className="text-xs text-amber-700"
                    >
                        Segment moved to <strong>{LABEL[stale]}</strong> — refresh.
                    </span>
                )}
                {error && !stale && (
                    <span
                        data-testid="phase-advance-error"
                        className="text-xs text-red-600"
                    >
                        {error}
                    </span>
                )}
            </div>
        </div>
    )
}

export default PhaseAdvanceButton
