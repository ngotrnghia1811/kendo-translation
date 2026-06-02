/**
 * MemoryWriteBanner — compact dismissable inline banner shown after a
 * Phase-4b memory write-back (translation_memory / edit_patterns /
 * style_guide).
 *
 * Renders a green success banner on ok, an amber warning on failure,
 * or nothing when there is no memory payload or the write-back was
 * skipped for a routine reason.
 */

'use client'

import type { MemoryWriteResult } from '@/lib/hooks/useSuggestions'

interface MemoryWriteBannerProps {
    memory: MemoryWriteResult | null | undefined
    onDismiss: () => void
}

function humanLabel(memory: MemoryWriteResult): string {
    switch (memory.rpc) {
        case 'rpc_phase_4b_translate_save':
            return 'Translation saved to memory'
        case 'rpc_phase_4b_edit_save':
            return 'Edit pattern recorded'
        case 'rpc_phase_4b_save_style':
            return 'Style rule saved'
        default:
            return 'Memory updated'
    }
}

export function MemoryWriteBanner({
    memory,
    onDismiss,
}: MemoryWriteBannerProps) {
    if (!memory) return null

    // Suppress "boring" skipped write-backs (expected phase gaps /
    // optional annotations).  Non-trivial skipped reasons (e.g.
    // segment-lookup errors) are shown as a neutral info banner.
    if (memory.skipped) {
        const boringPrefixes = [
            'no write-back for phase',
            'style_rule absent or incomplete',
        ]
        if (
            memory.reason &&
            boringPrefixes.some((p) => memory.reason!.startsWith(p))
        ) {
            return null
        }
        // Non-trivial skip — show a quiet info banner.
        return (
            <div
                data-testid="memory-write-banner"
                className="mt-2 flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700"
            >
                <span className="flex-1 truncate">
                    {/* ℹ️ Memory write-back skipped: {reason} */}
                    {`Memory write-back skipped: ${memory.reason ?? 'unknown reason'}`}
                </span>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="shrink-0 rounded px-1 text-xs leading-none text-blue-500 hover:text-blue-800"
                    aria-label="Dismiss"
                >
                    ×
                </button>
            </div>
        )
    }

    if (memory.ok === false) {
        return (
            <div
                data-testid="memory-write-banner"
                className="mt-2 flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700"
            >
                {/* ⚠ Memory update failed: {error} */}
                <span className="flex-1 truncate">
                    Memory update failed: {memory.error ?? 'unknown error'}
                </span>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="shrink-0 rounded px-1 text-xs leading-none text-amber-600 hover:text-amber-900"
                    aria-label="Dismiss"
                >
                    ×
                </button>
            </div>
        )
    }

    if (memory.ok === true) {
        const label = humanLabel(memory)
        const count = memory.result?.ids?.length ?? 0
        const suffix = count > 0 ? ` · ${count} row${count !== 1 ? 's' : ''} written` : ''

        return (
            <div
                data-testid="memory-write-banner"
                className="mt-2 flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700"
            >
                <span className="flex-1 truncate">
                    ✓ {label}{suffix}
                </span>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="shrink-0 rounded px-1 text-xs leading-none text-emerald-600 hover:text-emerald-900"
                    aria-label="Dismiss"
                >
                    ×
                </button>
            </div>
        )
    }

    // Fallback: unexpected shape — render nothing.
    return null
}

export default MemoryWriteBanner
