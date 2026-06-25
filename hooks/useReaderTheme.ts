'use client'

import { useState, useCallback, useEffect } from 'react'
import type { JlptLevel, FuriganaMode } from '@/lib/furigana/types'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReaderTheme     = 'light' | 'dark' | 'solarized' | 'pastel' | 'sepia' | 'high-contrast' | 'night-warm'
export type ReaderFont      = 'sans' | 'serif' | 'mincho'
export type LayoutWidth     = 'narrow' | 'full' | 'two-column'

export interface ReaderThemeSettings {
    theme:      ReaderTheme
    font:       ReaderFont
    /** Font size in px (integer). */
    fontSize:   number
    /** Optional text-colour override. null = use theme default (--rt-text). */
    fontColor:  string | null
    /** Layout width for reader/editor pages. ('two-column' is reader-only; editor treats it as 'full'). */
    layoutWidth: LayoutWidth
    /**
     * Phase 5.5 — Furigana display mode.
     *   'off'      — plain Japanese, no ruby annotations
     *   'furigana' — <ruby> with hiragana <rt> above kanji (+ JLPT filter)
     *   'romaji'   — <ruby> with romaji <rt> above kanji (+ JLPT filter)
     */
    furiganaMode: FuriganaMode
    /**
     * Phase 5.5 — Minimum JLPT difficulty for furigana/romaji display.
     * e.g. N3 → show furigana for N3, N2, N1 (hide for N5, N4).
     * null → show furigana for all kanji (no filter).
     */
    furiganaJlptMinLevel: JlptLevel | null
    /**
     * Phase 5.6 — Enable tap-to-reveal: tap kanji → reading popup,
     * tap JP paragraph (when translation hidden) → reveal EN.
     */
    tapRevealEnabled: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const THEMES: { id: ReaderTheme; label: string; swatch: string }[] = [
    { id: 'light',     label: 'Light',     swatch: '#ffffff' },
    { id: 'dark',      label: 'Dark',      swatch: '#111827' },
    { id: 'solarized', label: 'Solarized', swatch: '#002b36' },
    { id: 'pastel',    label: 'Pastel',    swatch: '#fdf6ff' },
    { id: 'sepia',          label: 'Sepia',          swatch: '#f8f1e3' },
    { id: 'high-contrast',  label: 'High Contrast',   swatch: '#000000' },
    { id: 'night-warm',     label: 'Night (Warm)',     swatch: '#1a1410' },
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

/** Layout-width options shown in the settings panel. */
export const LAYOUT_WIDTHS: { id: LayoutWidth; label: string }[] = [
    { id: 'narrow',     label: 'Narrow' },
    { id: 'full',       label: 'Full' },
    { id: 'two-column', label: 'Two-col' },
]

const STORAGE_KEY = 'reader-theme-settings'

const DEFAULTS: ReaderThemeSettings = {
    theme:                'light',
    font:                 'sans',
    fontSize:             16,   // px
    fontColor:            null,
    layoutWidth:          'narrow',
    furiganaMode:         'furigana',
    furiganaJlptMinLevel: null,
    tapRevealEnabled:     true,
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function loadFromStorage(): ReaderThemeSettings {
    if (typeof window === 'undefined') return DEFAULTS
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return DEFAULTS
        const parsed = JSON.parse(raw) as Partial<ReaderThemeSettings & { showFurigana?: boolean }>

        // Backward compatibility: migrate old showFurigana boolean → furiganaMode
        let furiganaMode = parsed.furiganaMode ?? DEFAULTS.furiganaMode
        if (parsed.furiganaMode === undefined && parsed.showFurigana !== undefined) {
            furiganaMode = parsed.showFurigana ? 'furigana' : 'off'
            // Persist the migration so localStorage reflects new structure
            delete (parsed as Record<string, unknown>).showFurigana
            parsed.furiganaMode = furiganaMode
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
        }

        return {
            theme:                parsed.theme                ?? DEFAULTS.theme,
            font:                 parsed.font                 ?? DEFAULTS.font,
            fontSize:             parsed.fontSize             ?? DEFAULTS.fontSize,
            fontColor:            parsed.fontColor            ?? DEFAULTS.fontColor,
            layoutWidth:          parsed.layoutWidth          ?? DEFAULTS.layoutWidth,
            furiganaMode,
            furiganaJlptMinLevel: parsed.furiganaJlptMinLevel ?? DEFAULTS.furiganaJlptMinLevel,
            tapRevealEnabled:     parsed.tapRevealEnabled     ?? DEFAULTS.tapRevealEnabled,
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

    const setTheme              = useCallback((theme: ReaderTheme)               => setSettings({ theme }),                [setSettings])
    const setFont               = useCallback((font: ReaderFont)                 => setSettings({ font }),                 [setSettings])
    const setFontColor          = useCallback((fontColor: string | null)         => setSettings({ fontColor }),            [setSettings])
    const setLayoutWidth        = useCallback((layoutWidth: LayoutWidth)         => setSettings({ layoutWidth }),          [setSettings])
    const setFuriganaMode       = useCallback((furiganaMode: FuriganaMode)       => setSettings({ furiganaMode }),         [setSettings])
    const setFuriganaJlptMinLevel = useCallback((furiganaJlptMinLevel: JlptLevel | null) => setSettings({ furiganaJlptMinLevel }), [setSettings])
    const setTapRevealEnabled   = useCallback((tapRevealEnabled: boolean)        => setSettings({ tapRevealEnabled }),     [setSettings])

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
        setLayoutWidth,
        setFuriganaMode,
        setFuriganaJlptMinLevel,
        setTapRevealEnabled,
        increaseFontSize,
        decreaseFontSize,
        fontSizeValue,
    }
}
