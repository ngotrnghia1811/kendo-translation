'use client'

import { useEffect } from 'react'

interface ReaderKeyboardOptions {
    /** Called when the user wants to go to the previous page. */
    onPrevPage: () => void
    /** Called when the user wants to go to the next page. */
    onNextPage: () => void
    /** Whether prev-page is disabled (e.g. already on page 0). */
    prevDisabled: boolean
    /** Whether next-page is disabled (e.g. already on last page). */
    nextDisabled: boolean
    /** Close all open panels (Escape). */
    onCloseAll: () => void
    /** Whether any panel is open (if open, Escape closes instead of navigating). */
    anyPanelOpen: boolean
    /** Toggle bookmark for current page. */
    onToggleBookmark: () => void
    /** Toggle settings panel. */
    onToggleSettings: () => void
    /** Open sidebar and focus search tab. */
    onOpenSearch: () => void
    /** Toggle keyboard shortcuts help overlay. */
    onToggleHelp?: () => void
}

/**
 * useReaderKeyboard — registers keyboard shortcuts for the reader page.
 *
 * Shortcuts (only when focus is NOT inside an input/textarea/select/contenteditable):
 *   j / ArrowRight / ArrowDown → next page
 *   k / ArrowLeft  / ArrowUp   → prev page
 *   Escape                     → close open panels
 *   b                          → toggle bookmark
 *   s                          → toggle settings panel
 *   /                          → open sidebar search (preventDefault on '/')
 *
 * All shortcuts are suppressed when focus is on a form element so the user can
 * still type search queries, select values, etc. without triggering navigation.
 */
export function useReaderKeyboard({
    onPrevPage,
    onNextPage,
    prevDisabled,
    nextDisabled,
    onCloseAll,
    anyPanelOpen,
    onToggleBookmark,
    onToggleSettings,
    onOpenSearch,
    onToggleHelp,
}: ReaderKeyboardOptions) {
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
            // Never intercept when the user is typing
            if (isFocusedOnInput()) return
            // Never intercept modifier combos (Ctrl+A, Cmd+K, etc.)
            if (e.ctrlKey || e.metaKey || e.altKey) return

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                case 'j':
                    if (!nextDisabled) {
                        e.preventDefault()
                        onNextPage()
                    }
                    break

                case 'ArrowLeft':
                case 'ArrowUp':
                case 'k':
                    if (!prevDisabled) {
                        e.preventDefault()
                        onPrevPage()
                    }
                    break

                case 'Escape':
                    if (anyPanelOpen) {
                        e.preventDefault()
                        onCloseAll()
                    }
                    break

                case 'b':
                    e.preventDefault()
                    onToggleBookmark()
                    break

                case 's':
                    e.preventDefault()
                    onToggleSettings()
                    break

                case '/':
                    e.preventDefault()
                    onOpenSearch()
                    break

                case '?':
                    e.preventDefault()
                    onToggleHelp?.()
                    break

                default:
                    break
            }
        }

        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [
        onPrevPage, onNextPage,
        prevDisabled, nextDisabled,
        onCloseAll, anyPanelOpen,
        onToggleBookmark, onToggleSettings, onOpenSearch, onToggleHelp,
    ])
}
