'use client'

import { useEffect } from 'react'

interface EditorKeyboardOptions {
    /** Move to the previous segment in the list. No-op if already first. */
    onPrevSegment: () => void
    /** Move to the next segment in the list. No-op if already last. */
    onNextSegment: () => void
    /** Whether previous-segment navigation is disabled (e.g. already at index 0). */
    prevDisabled: boolean
    /** Whether next-segment navigation is disabled (e.g. already at last index). */
    nextDisabled: boolean
    /** Save the current segment's text (Ctrl+S / Cmd+S). */
    onSave: () => void
    /** Approve the current segment — advance to next status (Ctrl+Enter / Cmd+Enter). */
    onApprove: () => void
    /** Whether there is an active segment being edited. Shortcuts are no-ops when false. */
    hasActiveSegment: boolean
}

/**
 * useEditorKeyboard — registers keyboard shortcuts for the translation editor page.
 *
 * Shortcuts:
 *   ArrowUp / k (outside textarea)    → previous segment
 *   ArrowDown / j (outside textarea)  → next segment
 *   Ctrl+S / Cmd+S                    → save current segment
 *   Ctrl+Enter / Cmd+Enter            → approve / advance current segment
 *
 * Navigation shortcuts (↑↓/j/k) are suppressed when the user is typing inside
 * an input, textarea, select, or contenteditable element.
 *
 * Save/approve shortcuts work everywhere (they intercept the Ctrl/Cmd + key combo).
 */
export function useEditorKeyboard({
    onPrevSegment,
    onNextSegment,
    prevDisabled,
    nextDisabled,
    onSave,
    onApprove,
    hasActiveSegment,
}: EditorKeyboardOptions) {
    useEffect(() => {
        function isFocusedOnInput(): boolean {
            const el = document.activeElement
            if (!el) return false
            const tag = (el as HTMLElement).tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
            if ((el as HTMLElement).isContentEditable) return true
            return false
        }

        function handler(e: KeyboardEvent) {
            // --- Ctrl+S / Cmd+S: save ---
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                if (hasActiveSegment) {
                    e.preventDefault()
                    onSave()
                }
                return
            }

            // --- Ctrl+Enter / Cmd+Enter: approve ---
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (hasActiveSegment) {
                    e.preventDefault()
                    onApprove()
                }
                return
            }

            // Navigation shortcuts only fire when not typing
            if (isFocusedOnInput()) return
            // Suppress other modifier combos for navigation
            if (e.ctrlKey || e.metaKey || e.altKey) return

            switch (e.key) {
                case 'ArrowDown':
                case 'j':
                    if (!nextDisabled) {
                        e.preventDefault()
                        onNextSegment()
                    }
                    break

                case 'ArrowUp':
                case 'k':
                    if (!prevDisabled) {
                        e.preventDefault()
                        onPrevSegment()
                    }
                    break

                default:
                    break
            }
        }

        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [
        onPrevSegment, onNextSegment,
        prevDisabled, nextDisabled,
        onSave, onApprove,
        hasActiveSegment,
    ])
}
