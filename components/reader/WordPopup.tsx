'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { JlptLevel } from '@/lib/furigana/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WordPopupData {
    /** Anchor position (from getBoundingClientRect of the tapped element). */
    anchorRect: DOMRect
    /** Kanji word as written in source text. */
    base: string | null
    /** Hiragana reading. */
    reading: string | null
    /** Romaji reading (may be absent on pre-v2 data). */
    romaji: string | null
    /** JLPT difficulty level (may be null for unmapped kanji). */
    jlptLevel: JlptLevel | null
    /** Paragraph EN translation (shown when tapping a JP-only paragraph). */
    translation: string | null
    /** True when the paragraph has null target_text. */
    noTranslation: boolean
}

interface WordPopupProps {
    data: WordPopupData | null
    onClose: () => void
    /** Scroll container element ref — popup dismisses when this scrolls. */
    scrollContainer: HTMLElement | null
}

// ---------------------------------------------------------------------------
// JLPT badge colours (theme-agnostic, subtle)
// ---------------------------------------------------------------------------

const JLPT_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
    N5:  { bg: '#ecfdf5', text: '#065f46' },
    N4:  { bg: '#f0fdf4', text: '#166534' },
    N3:  { bg: '#fef9c3', text: '#854d0e' },
    N2:  { bg: '#fef3c7', text: '#92400e' },
    N1:  { bg: '#fee2e2', text: '#991b1b' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute popup position from anchor rect so the popup stays in viewport
 * and doesn't collide with edges.
 */
function computePopupStyle(anchorRect: DOMRect, viewW: number, viewH: number): React.CSSProperties {
    const POPUP_MAX_W = 320
    const POPUP_MAX_H = 280
    const GAP = 8
    const MARGIN = 12

    // Default: below the anchor, centered horizontally
    let left = anchorRect.left + anchorRect.width / 2 - POPUP_MAX_W / 2
    let top = anchorRect.bottom + GAP

    // Flip above if there's more room
    const roomBelow = viewH - anchorRect.bottom
    const roomAbove = anchorRect.top
    if (roomBelow < POPUP_MAX_H + GAP && roomAbove > roomBelow) {
        top = anchorRect.top - POPUP_MAX_H - GAP
    }

    // Clamp horizontal
    left = Math.max(MARGIN, Math.min(viewW - POPUP_MAX_W - MARGIN, left))
    // Clamp vertical
    top = Math.max(MARGIN, Math.min(viewH - POPUP_MAX_H - MARGIN, top))

    return {
        position: 'fixed' as const,
        left: `${left}px`,
        top: `${top}px`,
        maxWidth: `${POPUP_MAX_W}px`,
        maxHeight: `${POPUP_MAX_H}px`,
        zIndex: 50,
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WordPopup({ data, onClose, scrollContainer }: WordPopupProps) {
    const popupRef = useRef<HTMLDivElement>(null)

    // Dismiss on outside click
    const handleOutside = useCallback((e: MouseEvent | TouchEvent) => {
        if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
            onClose()
        }
    }, [onClose])

    // Dismiss on Escape
    const handleEsc = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
    }, [onClose])

    // Dismiss on scroll
    const handleScroll = useCallback(() => {
        onClose()
    }, [onClose])

    useEffect(() => {
        if (!data) return
        // Use a microtask delay so the same click that opened the popup
        // doesn't immediately close it via the outside handler.
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleOutside)
            document.addEventListener('touchstart', handleOutside, { passive: true })
            document.addEventListener('keydown', handleEsc)
        }, 0)

        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
        }

        return () => {
            clearTimeout(timer)
            document.removeEventListener('mousedown', handleOutside)
            document.removeEventListener('touchstart', handleOutside)
            document.removeEventListener('keydown', handleEsc)
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handleScroll)
            }
        }
    }, [data, handleOutside, handleEsc, handleScroll, scrollContainer])

    if (!data) return null

    const viewW = typeof window !== 'undefined' ? window.innerWidth : 1024
    const viewH = typeof window !== 'undefined' ? window.innerHeight : 768
    const posStyle = computePopupStyle(data.anchorRect, viewW, viewH)

    const hasKanji = data.base && data.reading
    const hasTranslation = data.translation !== null && data.translation.trim().length > 0

    return (
        <div
            ref={popupRef}
            role="dialog"
            aria-label={hasKanji ? `Reading for ${data.base}` : 'Translation'}
            style={posStyle}
            className="rounded-xl shadow-2xl border overflow-hidden"
        >
            {/* theme-aware background + text */}
            <div
                className="p-4 space-y-3"
                style={{
                    backgroundColor: 'var(--rt-bg, #fff)',
                    color: 'var(--rt-text, #111)',
                    borderColor: 'var(--rt-border, #e5e7eb)',
                }}
            >
                {/* ── Kanji info ──────────────────────────────────────── */}
                {hasKanji && (
                    <div className="space-y-2">
                        {/* Base kanji word — large, prominent */}
                        <div
                            className="text-2xl font-semibold tracking-wide"
                            lang="ja"
                            style={{ color: 'var(--rt-text)' }}
                        >
                            {data.base}
                        </div>

                        {/* Reading row */}
                        <div className="flex items-center gap-2 text-sm">
                            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--rt-text-muted)' }}>
                                読み
                            </span>
                            <span lang="ja" className="text-lg" style={{ color: 'var(--rt-text)' }}>
                                {data.reading}
                            </span>
                        </div>

                        {/* Romaji row */}
                        {data.romaji && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--rt-text-muted)' }}>
                                    Rōmaji
                                </span>
                                <span className="font-mono text-base" style={{ color: 'var(--rt-text)' }}>
                                    {data.romaji}
                                </span>
                            </div>
                        )}

                        {/* JLPT badge */}
                        {data.jlptLevel && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--rt-text-muted)' }}>
                                    Level
                                </span>
                                <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                                    style={{
                                        backgroundColor: JLPT_BADGE_STYLES[data.jlptLevel]?.bg ?? '#f3f4f6',
                                        color: JLPT_BADGE_STYLES[data.jlptLevel]?.text ?? '#374151',
                                    }}
                                >
                                    {data.jlptLevel}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Translation reveal ──────────────────────────────── */}
                {hasTranslation && (
                    <div className={hasKanji ? 'pt-3 border-t' : ''} style={{ borderColor: 'var(--rt-border)' }}>
                        <div className="flex items-center gap-2 text-sm mb-1">
                            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--rt-text-muted)' }}>
                                EN
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--rt-text)' }}>
                            {data.translation}
                        </p>
                    </div>
                )}

                {/* ── No translation state ────────────────────────────── */}
                {!hasKanji && data.noTranslation && (
                    <p className="text-sm italic" style={{ color: 'var(--rt-text-muted)' }}>
                        No translation available for this paragraph.
                    </p>
                )}

                {/* ── Close button — ≥44px touch target ───────────────── */}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close popup"
                    className="w-full flex items-center justify-center rounded-lg py-2 text-xs font-semibold transition-colors hover:opacity-80"
                    style={{
                        backgroundColor: 'var(--rt-surface, #f3f4f6)',
                        color: 'var(--rt-text-muted, #6b7280)',
                        border: '1px solid var(--rt-border, #e5e7eb)',
                        minHeight: '44px',
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    )
}
