'use client'

import { useState, useCallback, useEffect } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReaderTheme = 'light' | 'dark' | 'solarized' | 'pastel' | 'sepia'
export type ReaderFont  = 'sans' | 'serif' | 'mincho'

export interface ReaderThemeSettings {
    theme:     ReaderTheme
    font:      ReaderFont
    fontSize:  number   // em units ×10 (e.g. 10 = 1.0em, 12 = 1.2em)
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const THEMES: { id: ReaderTheme; label: string; swatch: string }[] = [
    { id: 'light',     label: 'Light',     swatch: '#ffffff' },
    { id: 'dark',      label: 'Dark',      swatch: '#111827' },
    { id: 'solarized', label: 'Solarized', swatch: '#002b36' },
    { id: 'pastel',    label: 'Pastel',    swatch: '#fdf6ff' },
    { id: 'sepia',     label: 'Sepia',     swatch: '#f8f1e3' },
]

export const FONTS: { id: ReaderFont; label: string }[] = [
    { id: 'sans',   label: 'Sans-serif' },
    { id: 'serif',  label: 'Serif' },
    { id: 'mincho', label: 'Mincho (JP)' },
]

export const FONT_SIZE_MIN  = 8    // 0.8em
export const FONT_SIZE_MAX  = 20   // 2.0em
export const FONT_SIZE_STEP = 1    // 0.1em per step

const STORAGE_KEY = 'reader-theme-settings'

const DEFAULTS: ReaderThemeSettings = {
    theme:    'light',
    font:     'sans',
    fontSize: 10,   // 1.0em
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function loadFromStorage(): ReaderThemeSettings {
    if (typeof window === 'undefined') return DEFAULTS
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return DEFAULTS
        const parsed = JSON.parse(raw) as Partial<ReaderThemeSettings>
        return {
            theme:    parsed.theme    ?? DEFAULTS.theme,
            font:     parsed.font     ?? DEFAULTS.font,
            fontSize: parsed.fontSize ?? DEFAULTS.fontSize,
        }
    } catch {
        return DEFAULTS
    }
}

function saveToStorage(settings: ReaderThemeSettings): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useReaderTheme() {
    // Initialise lazily from localStorage (runs only on client)
    const [settings, setSettingsState] = useState<ReaderThemeSettings>(DEFAULTS)

    // Hydrate from localStorage after mount (SSR-safe)
    useEffect(() => {
        setSettingsState(loadFromStorage())
    }, [])

    const setSettings = useCallback((update: Partial<ReaderThemeSettings>) => {
        setSettingsState((prev) => {
            const next = { ...prev, ...update }
            saveToStorage(next)
            return next
        })
    }, [])

    const setTheme    = useCallback((theme: ReaderTheme) => setSettings({ theme }),    [setSettings])
    const setFont     = useCallback((font: ReaderFont)   => setSettings({ font }),     [setSettings])
    const increaseFontSize = useCallback(() => setSettings({ fontSize: Math.min(FONT_SIZE_MAX, settings.fontSize + FONT_SIZE_STEP) }), [settings.fontSize, setSettings])
    const decreaseFontSize = useCallback(() => setSettings({ fontSize: Math.max(FONT_SIZE_MIN, settings.fontSize - FONT_SIZE_STEP) }), [settings.fontSize, setSettings])

    /** CSS font-size value string, e.g. "1.0em" */
    const fontSizeValue = `${(settings.fontSize / 10).toFixed(1)}em`

    return {
        ...settings,
        setTheme,
        setFont,
        increaseFontSize,
        decreaseFontSize,
        fontSizeValue,
    }
}
