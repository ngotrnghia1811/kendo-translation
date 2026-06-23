'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ThreeWayLang = 'jp' | 'bilingual' | 'en'

interface MobileBottomBarProps {
    /** Current three-way language selection. */
    langSelection: ThreeWayLang
    /** Called when user picks a different language mode. */
    onLangChange: (sel: ThreeWayLang) => void
    /** Target language label for the EN button (e.g. "EN" or "中文"). */
    targetLabel: string
    /** Current font size value in px. */
    fontSize: number
    /** Callbacks for font size adjustment. */
    onIncreaseFontSize: () => void
    onDecreaseFontSize: () => void
    /** Open the table-of-contents sidebar. */
    onOpenToc: () => void
    /** Previous article href (null if none). */
    prevArticleHref?: string | null
    /** Next article href (null if none). */
    nextArticleHref?: string | null
    /** Scroll parent element — used to detect scroll events for auto-hide. */
    scrollParent?: HTMLElement | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AUTO_HIDE_MS = 3000
const TAP_TARGET = 'min-w-[48px] min-h-[48px]'

// ─── Component ───────────────────────────────────────────────────────────────

export default function MobileBottomBar({
    langSelection,
    onLangChange,
    targetLabel,
    fontSize,
    onIncreaseFontSize,
    onDecreaseFontSize,
    onOpenToc,
    prevArticleHref,
    nextArticleHref,
    scrollParent,
}: MobileBottomBarProps) {
    const [visible, setVisible] = useState(false)
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const resetHideTimer = useCallback(() => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        hideTimerRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS)
    }, [])

    // Listen for scroll events on the scroll parent to auto-hide.
    useEffect(() => {
        const el = scrollParent
        if (!el) return
        const onScroll = () => {
            setVisible(true)
            resetHideTimer()
        }
        el.addEventListener('scroll', onScroll, { passive: true })
        return () => el.removeEventListener('scroll', onScroll)
    }, [scrollParent, resetHideTimer])

    // Show on first tap anywhere in the reader content area.
    useEffect(() => {
        const el = scrollParent
        if (!el) return
        const onPointerDown = () => {
            setVisible(true)
            resetHideTimer()
        }
        el.addEventListener('pointerdown', onPointerDown)
        return () => el.removeEventListener('pointerdown', onPointerDown)
    }, [scrollParent, resetHideTimer])

    // Cleanup timer on unmount.
    useEffect(() => {
        return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
    }, [])

    // ── Lang button styles ───────────────────────────────────────────────────

    const langBtnClasses = (active: boolean) =>
        `flex-1 ${TAP_TARGET} flex items-center justify-center text-sm font-semibold rounded-lg transition-colors ${
            active
                ? 'bg-blue-600 text-white'
                : 'text-[var(--rt-text-muted)] hover:bg-[var(--rt-surface)]'
        }`

    return (
        <nav
            className={`md:hidden fixed bottom-0 inset-x-0 z-30 transition-transform duration-300 ${
                visible ? 'translate-y-0' : 'translate-y-full'
            }`}
            style={{
                backgroundColor: 'var(--rt-bg)',
                borderTop: '1px solid var(--rt-border)',
            }}
            aria-label="Mobile reading controls"
        >
            {/* ── Row 1: Language toggle ────────────────────────────────────── */}
            <div className="flex items-center gap-1 px-2 pt-2">
                <button
                    type="button"
                    onClick={() => onLangChange('jp')}
                    className={langBtnClasses(langSelection === 'jp')}
                    aria-pressed={langSelection === 'jp'}
                    aria-label="Japanese only"
                >
                    JP
                </button>
                <button
                    type="button"
                    onClick={() => onLangChange('bilingual')}
                    className={langBtnClasses(langSelection === 'bilingual')}
                    aria-pressed={langSelection === 'bilingual'}
                    aria-label="Bilingual"
                >
                    JP↔EN
                </button>
                <button
                    type="button"
                    onClick={() => onLangChange('en')}
                    className={langBtnClasses(langSelection === 'en')}
                    aria-pressed={langSelection === 'en'}
                    aria-label={`${targetLabel} only`}
                >
                    {targetLabel}
                </button>
            </div>

            {/* ── Row 2: Font size + navigation ─────────────────────────────── */}
            <div className="flex items-center justify-between px-2 py-1.5">
                {/* Font size controls */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onDecreaseFontSize}
                        disabled={fontSize <= 10}
                        aria-label="Decrease text size"
                        className={`${TAP_TARGET} flex items-center justify-center rounded-lg text-lg font-bold transition-colors disabled:opacity-30`}
                        style={{ color: 'var(--rt-text)' }}
                    >
                        A<sup className="text-xs">−</sup>
                    </button>
                    <span
                        className="text-xs tabular-nums min-w-[3ch] text-center"
                        style={{ color: 'var(--rt-text-muted)' }}
                    >
                        {fontSize}
                    </span>
                    <button
                        type="button"
                        onClick={onIncreaseFontSize}
                        disabled={fontSize >= 32}
                        aria-label="Increase text size"
                        className={`${TAP_TARGET} flex items-center justify-center rounded-lg text-lg font-bold transition-colors disabled:opacity-30`}
                        style={{ color: 'var(--rt-text)' }}
                    >
                        A<sup className="text-xs">+</sup>
                    </button>
                </div>

                {/* TOC button */}
                <button
                    type="button"
                    onClick={onOpenToc}
                    aria-label="Open table of contents"
                    className={`${TAP_TARGET} flex items-center justify-center rounded-lg transition-colors`}
                    style={{ color: 'var(--rt-text)' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>

                {/* Prev/Next article nav */}
                <div className="flex items-center gap-1">
                    {prevArticleHref ? (
                        <a
                            href={prevArticleHref}
                            aria-label="Previous article"
                            className={`${TAP_TARGET} flex items-center justify-center rounded-lg transition-colors`}
                            style={{ color: 'var(--rt-text)' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </a>
                    ) : (
                        <span className={`${TAP_TARGET} flex items-center justify-center opacity-20`} style={{ color: 'var(--rt-text-muted)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </span>
                    )}
                    {nextArticleHref ? (
                        <a
                            href={nextArticleHref}
                            aria-label="Next article"
                            className={`${TAP_TARGET} flex items-center justify-center rounded-lg transition-colors`}
                            style={{ color: 'var(--rt-text)' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                        </a>
                    ) : (
                        <span className={`${TAP_TARGET} flex items-center justify-center opacity-20`} style={{ color: 'var(--rt-text-muted)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                        </span>
                    )}
                </div>
            </div>
        </nav>
    )
}
