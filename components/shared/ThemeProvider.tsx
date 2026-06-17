'use client'

import { createContext, useContext } from 'react'
import { useReaderTheme } from '@/hooks/useReaderTheme'

// ─── Context ─────────────────────────────────────────────────────────────────

type ThemeContextValue = ReturnType<typeof useReaderTheme>

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Hook to consume the shared reader-theme context.
 * Must be used inside a <ThemeProvider>.
 */
export function useThemeContext() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useThemeContext must be used within a <ThemeProvider>')
    return ctx
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const themeState = useReaderTheme()

    const { theme, font, fontSizeValue, fontColor } = themeState

    return (
        <ThemeContext.Provider value={themeState}>
            {/* Outer wrapper carries the theme attribute so the CSS token blocks
                in globals.css apply globally. */}
            <div
                data-reader-theme={theme}
                className="min-h-screen"
                style={fontColor ? { ['--rt-text' as string]: fontColor } : undefined}
            >
                {/* Inner wrapper applies font family + size. */}
                <div
                    data-reader-font={font}
                    style={{ fontSize: fontSizeValue }}
                >
                    {children}
                </div>
            </div>
        </ThemeContext.Provider>
    )
}
