'use client'

import { useEffect } from 'react'

interface ReaderKeyboardHelpModalProps {
    open: boolean
    onClose: () => void
}

interface ShortcutRow {
    keys: string[]
    description: string
}

const SHORTCUTS: { group: string; rows: ShortcutRow[] }[] = [
    {
        group: 'Navigation',
        rows: [
            { keys: ['j', '→', '↓'], description: 'Next page / section' },
            { keys: ['k', '←', '↑'], description: 'Previous page / section' },
        ],
    },
    {
        group: 'Panels',
        rows: [
            { keys: ['s'], description: 'Toggle settings panel' },
            { keys: ['b'], description: 'Toggle bookmark for current page' },
            { keys: ['/'], description: 'Open sidebar search' },
            { keys: ['?'], description: 'Show / hide keyboard shortcuts' },
            { keys: ['Esc'], description: 'Close any open panel' },
        ],
    },
]

function Kbd({ children }: { children: string }) {
    return (
        <kbd className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-xs font-mono font-semibold border shadow-sm"
            style={{
                backgroundColor: 'var(--rt-surface)',
                borderColor: 'var(--rt-border)',
                color: 'var(--rt-text)',
                boxShadow: '0 1px 0 0 var(--rt-border)',
            }}
        >
            {children}
        </kbd>
    )
}

export default function ReaderKeyboardHelpModal({ open, onClose }: ReaderKeyboardHelpModalProps) {
    // Close on Escape
    useEffect(() => {
        if (!open) return
        function handler(e: KeyboardEvent) {
            if (e.key === 'Escape') { e.preventDefault(); onClose() }
            if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const el = document.activeElement as HTMLElement | null
                const tag = el?.tagName ?? ''
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return
                e.preventDefault()
                onClose()
            }
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open, onClose])

    if (!open) return null

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
        >
            {/* Panel */}
            <div
                className="relative rounded-2xl shadow-2xl p-6 w-full max-w-md"
                style={{
                    backgroundColor: 'var(--rt-bg)',
                    border: '1px solid var(--rt-border)',
                    color: 'var(--rt-text)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-semibold" style={{ color: 'var(--rt-text)' }}>
                        Keyboard shortcuts
                    </h2>
                    <button
                        type="button"
                        aria-label="Close keyboard shortcuts"
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-lg leading-none transition-colors"
                        style={{
                            color: 'var(--rt-text-muted)',
                            backgroundColor: 'transparent',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Shortcut groups */}
                <div className="space-y-5">
                    {SHORTCUTS.map(({ group, rows }) => (
                        <section key={group}>
                            <h3
                                className="text-xs font-semibold uppercase tracking-wider mb-2"
                                style={{ color: 'var(--rt-text-muted)' }}
                            >
                                {group}
                            </h3>
                            <table className="w-full border-collapse">
                                <tbody>
                                    {rows.map(({ keys, description }) => (
                                        <tr key={description} className="border-t" style={{ borderColor: 'var(--rt-border)' }}>
                                            <td className="py-2 pr-4 w-28">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {keys.map((k, i) => (
                                                        <>
                                                            <Kbd key={k}>{k}</Kbd>
                                                            {i < keys.length - 1 && (
                                                                <span key={`sep-${i}`} className="text-xs" style={{ color: 'var(--rt-text-muted)' }}>or</span>
                                                            )}
                                                        </>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-2 text-sm" style={{ color: 'var(--rt-text-muted)' }}>
                                                {description}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    ))}
                </div>

                {/* Footer hint */}
                <p className="mt-5 text-xs text-center" style={{ color: 'var(--rt-text-muted)' }}>
                    Shortcuts are suppressed while typing in search / input fields.
                </p>
            </div>
        </div>
    )
}
