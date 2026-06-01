'use client'

import { useRef, useEffect } from 'react'
import {
    THEMES, FONTS,
    FONT_SIZE_MIN, FONT_SIZE_MAX,
    type ReaderTheme, type ReaderFont,
} from '@/hooks/useReaderTheme'

interface ReaderSettingsPanelProps {
    open:              boolean
    onClose:           () => void
    theme:             ReaderTheme
    font:              ReaderFont
    fontSize:          number
    fontSizeValue:     string
    onThemeChange:     (t: ReaderTheme) => void
    onFontChange:      (f: ReaderFont)  => void
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
    onThemeChange,
    onFontChange,
    onIncreaseFontSize,
    onDecreaseFontSize,
}: ReaderSettingsPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)

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
        <div
            ref={panelRef}
            role="dialog"
            aria-label="Reader settings"
            className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-4 space-y-5"
        >
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
    )
}
