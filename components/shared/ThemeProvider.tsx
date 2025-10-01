'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        return {
            theme: 'system' as Theme,
            setTheme: () => { },
            resolvedTheme: 'light' as const,
        }
    }
    return context
}

interface ThemeProviderProps {
    children: ReactNode
    defaultTheme?: Theme
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(defaultTheme)
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as Theme | null
        if (storedTheme) {
            setThemeState(storedTheme)
        }
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return

        const root = document.documentElement
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const updateTheme = () => {
            let resolved: 'light' | 'dark'
            if (theme === 'system') {
                resolved = mediaQuery.matches ? 'dark' : 'light'
            } else {
                resolved = theme
            }

            setResolvedTheme(resolved)
            root.classList.remove('light', 'dark')
            root.classList.add(resolved)
        }

        updateTheme()

        mediaQuery.addEventListener('change', updateTheme)
        return () => mediaQuery.removeEventListener('change', updateTheme)
    }, [theme, mounted])

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem('theme', newTheme)
    }

    if (!mounted) {
        return <>{children}</>
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()

    const cycleTheme = () => {
        if (theme === 'light') setTheme('dark')
        else if (theme === 'dark') setTheme('system')
        else setTheme('light')
    }

    return (
        <button
            onClick={cycleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={`Theme: ${theme} (${resolvedTheme})`}
        >
            {resolvedTheme === 'dark' ? '🌙' : '☀️'}
        </button>
    )
}
