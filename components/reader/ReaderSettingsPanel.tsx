'use client'

import { useRef, useEffect, useState } from 'react'
import {
    THEMES, FONTS, FONT_COLORS,
    FONT_SIZE_MIN, FONT_SIZE_MAX,
    type ReaderTheme, type ReaderFont,
} from '@/hooks/useReaderTheme'

interface ReaderSettingsPanelProps {
    open:               boolean
    onClose:            () => void
    theme:              ReaderTheme
    font:               ReaderFont
    fontSize:           number
    fontSizeValue:      string
    fontColor:          string | null
    onThemeChange:      (t: ReaderTheme)       => void
    onFontChange:       (f: ReaderFont)        => void
    onFontColorChange:  (c: string | null)     => void
    onIncreaseFontSize: () => void
    onDecreaseFontSize: () => void
}

/** Swatch border colour for light themes that need contrast against white toolbar */
const SWATCH_BORDERS: Record<ReaderTheme, string> = {
    light:     '#d1d5db',
    dark:      'transparent',
    solarized: 'transparent',
    pastel:    '#ddd6fe',
    sepia:     '#d4c5a0',
}

export default function ReaderSettingsPanel({
    open,
    onClose,
    theme,
    font,
    fontSize,
    fontSizeValue,
    fontColor,
    onThemeChange,
    onFontChange,
    onFontColorChange,
    onIncreaseFontSize,
    onDecreaseFontSize,
}: ReaderSettingsPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 639px)')
        setIsMobile(mq.matches)
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    // Close on outside click
    useEffect(() => {
        if (!open) return
        function handleClick(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open, onClose])

    // Close on Escape
    useEffect(() => {
        if (!open) return
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [open, onClose])

    if (!open) return null

    return (
        <>
        {/* Mobile bottom-sheet backdrop */}
        {isMobile && (
            <div
                className="fixed inset-0 z-40 bg-black/40"
                onClick={onClose}
                aria-hidden="true"
            />
        )}
        <div
            ref={panelRef}
            role="dialog"
            aria-label="Reader settings"
            className={
                isMobile
                    ? 'fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border border-gray-200 bg-white shadow-2xl p-4 space-y-5 max-h-[60vh] overflow-y-auto'
                    : 'absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-4 space-y-5'
            }
        >
            {/* Mobile drag handle pill */}
            {isMobile && (
                <div className="flex justify-center -mt-1 mb-1">
                    <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>
            )}
            {/* ── Theme ─────────────────────────────────────────────── */}
            <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Colour theme
                </h3>
                <div className="flex flex-wrap gap-2">
                    {THEMES.map((t) => (
                        <button
                            key={t.id}
                            title={t.label}
                            aria-pressed={theme === t.id}
                            onClick={() => onThemeChange(t.id)}
                            className="flex flex-col items-center gap-1 group focus:outline-none"
                        >
                            <span
                                className={`w-8 h-8 rounded-full transition-all ${
                                    theme === t.id
                                        ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900 scale-110'
                                        : 'hover:scale-105'
                                }`}
                                style={{
                                    backgroundColor: t.swatch,
                                    border: `1px solid ${SWATCH_BORDERS[t.id]}`,
                                }}
                            />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 leading-none">
                                {t.label}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            {/* ── Font family ───────────────────────────────────────── */}
            <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Font
                </h3>
                <div className="flex gap-2 flex-wrap">
                    {FONTS.map((f) => (
                        <button
                            key={f.id}
                            aria-pressed={font === f.id}
                            onClick={() => onFontChange(f.id)}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                font === f.id
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* ── Text colour ───────────────────────────────────────── */}
            <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Text colour
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                    {FONT_COLORS.map((c) => {
                        const isSelected = fontColor === c.value
                        const isDefault  = c.value === null
                        return (
                            <button
                                key={c.label}
                                title={c.label}
                                aria-pressed={isSelected}
                                onClick={() => onFontColorChange(c.value)}
                                className="flex flex-col items-center gap-1 group focus:outline-none"
                            >
                                <span
                                    className={`w-7 h-7 rounded-full transition-all flex items-center justify-center text-[10px] font-bold ${
                                        isSelected
                                            ? 'ring-2 ring-offset-1 ring-blue-500 scale-110'
                                            : 'hover:scale-105'
                                    } ${isDefault ? 'border border-dashed border-gray-400' : ''}`}
                                    style={isDefault ? {} : {
                                        backgroundColor: c.value!,
                                        border: c.value === '#f9fafb' ? '1px solid #d1d5db' : undefined,
                                    }}
                                >
                                    {isDefault && <span className="text-gray-400">A</span>}
                                </span>
                                <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-none max-w-[3rem] text-center">
                                    {c.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* ── Font size ─────────────────────────────────────────── */}
            <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Size
                </h3>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onDecreaseFontSize}
                        disabled={fontSize <= FONT_SIZE_MIN}
                        aria-label="Decrease font size"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-lg font-bold enabled:hover:bg-gray-100 dark:enabled:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        −
                    </button>
                    <span className="w-14 text-center text-sm tabular-nums text-gray-700 dark:text-gray-200 select-none">
                        {fontSizeValue}
                    </span>
                    <button
                        onClick={onIncreaseFontSize}
                        disabled={fontSize >= FONT_SIZE_MAX}
                        aria-label="Increase font size"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-lg font-bold enabled:hover:bg-gray-100 dark:enabled:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        +
                    </button>
                </div>
            </section>
        </div>
        </>
    )
}
