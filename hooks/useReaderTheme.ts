'use client'

import { useState, useCallback, useEffect } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReaderTheme = 'light' | 'dark' | 'solarized' | 'pastel' | 'sepia'
export type ReaderFont  = 'sans' | 'serif' | 'mincho'

export interface ReaderThemeSettings {
    theme:      ReaderTheme
    font:       ReaderFont
    /** Font size in px (integer). */
    fontSize:   number
    /** Optional text-colour override. null = use theme default (--rt-text). */
    fontColor:  string | null
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

export const FONT_SIZE_MIN  = 10   // px
export const FONT_SIZE_MAX  = 32   // px
export const FONT_SIZE_STEP = 1    // 1px per step

/** Preset font-colour swatches shown in the settings panel. */
export const FONT_COLORS: { label: string; value: string | null }[] = [
    { label: 'Default',      value: null       },
    { label: 'Black',        value: '#000000'  },
    { label: 'Charcoal',     value: '#2d2d2d'  },
    { label: 'Dark gray',    value: '#4b5563'  },
    { label: 'Warm brown',   value: '#3d2b1f'  },
    { label: 'Navy',         value: '#1e3a5f'  },
    { label: 'White',        value: '#f9fafb'  },
]

const STORAGE_KEY = 'reader-theme-settings'

const DEFAULTS: ReaderThemeSettings = {
    theme:     'light',
    font:      'sans',
    fontSize:  16,   // px
    fontColor: null,
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function loadFromStorage(): ReaderThemeSettings {
    if (typeof window === 'undefined') return DEFAULTS
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return DEFAULTS
        const parsed = JSON.parse(raw) as Partial<ReaderThemeSettings>
        return {
            theme:     parsed.theme     ?? DEFAULTS.theme,
            font:      parsed.font      ?? DEFAULTS.font,
            fontSize:  parsed.fontSize  ?? DEFAULTS.fontSize,
            fontColor: parsed.fontColor ?? DEFAULTS.fontColor,
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

    const setTheme     = useCallback((theme: ReaderTheme)       => setSettings({ theme }),    [setSettings])
    const setFont      = useCallback((font: ReaderFont)         => setSettings({ font }),     [setSettings])
    const setFontColor = useCallback((fontColor: string | null) => setSettings({ fontColor }), [setSettings])

    const increaseFontSize = useCallback(
        () => setSettings({ fontSize: Math.min(FONT_SIZE_MAX, settings.fontSize + FONT_SIZE_STEP) }),
        [settings.fontSize, setSettings]
    )
    const decreaseFontSize = useCallback(
        () => setSettings({ fontSize: Math.max(FONT_SIZE_MIN, settings.fontSize - FONT_SIZE_STEP) }),
        [settings.fontSize, setSettings]
    )

    /** CSS font-size value string, e.g. "16px" */
    const fontSizeValue = `${settings.fontSize}px`

    return {
        ...settings,
        setTheme,
        setFont,
        setFontColor,
        increaseFontSize,
        decreaseFontSize,
        fontSizeValue,
    }
}
