'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useThemeContext } from '@/components/shared/ThemeProvider'
import ReaderSettingsPanel from '@/components/reader/ReaderSettingsPanel'

interface UserProfile {
    id: string
    email: string | null
    username: string | null
    role: 'admin' | 'translator' | 'reader'
}

/** Pages that have their own full-screen header — SiteNav is hidden there. */
const PAGES_WITH_OWN_HEADER = [
    '/',               // home — has its own header
    '/login',
    '/register',
]

const isDocumentSubpage = (pathname: string) =>
    /^\/documents\/[^/]/.test(pathname)  // /documents/[id]/read, /documents/[id]/edit

export function SiteNav() {
    const pathname = usePathname()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)

    const themeCtx = useThemeContext()

    // Suppress on pages with their own header
    const suppress =
        PAGES_WITH_OWN_HEADER.includes(pathname) ||
        isDocumentSubpage(pathname)

    useEffect(() => {
        if (suppress) return
        fetch('/api/auth/me')
            .then((r) => r.json())
            .then((data) => setProfile(data.profile ?? null))
            .catch(() => null)
    }, [suppress])

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false)
    }, [pathname])

    if (suppress) return null

    const initial = (
        profile?.username?.[0] ?? profile?.email?.[0] ?? 'U'
    ).toUpperCase()

    const displayName = profile?.username ?? profile?.email?.split('@')[0] ?? 'Account'

    const navLinks = (
        <>
            <Link
                href="/documents"
                className={`transition-opacity hover:opacity-80 ${pathname === '/documents' ? 'font-semibold' : ''}`}
                style={{ color: pathname === '/documents' ? 'var(--color-text)' : 'var(--color-text-muted)' }}
                onClick={() => setMobileMenuOpen(false)}
            >
                Documents
            </Link>
            <Link
                href="/terminology"
                className={`transition-opacity hover:opacity-80 ${pathname === '/terminology' ? 'font-semibold' : ''}`}
                style={{ color: pathname === '/terminology' ? 'var(--color-text)' : 'var(--color-text-muted)' }}
                onClick={() => setMobileMenuOpen(false)}
            >
                Terminology
            </Link>
            <Link
                href="/search"
                className={`transition-opacity hover:opacity-80 ${pathname.startsWith('/search') ? 'font-semibold' : ''}`}
                style={{ color: pathname.startsWith('/search') ? 'var(--color-text)' : 'var(--color-text-muted)' }}
                onClick={() => setMobileMenuOpen(false)}
            >
                Search
            </Link>
            {profile?.role === 'admin' && (
                <Link
                    href="/admin"
                    className={`transition-opacity hover:opacity-80 ${pathname.startsWith('/admin') ? 'font-semibold' : ''}`}
                    style={{ color: pathname.startsWith('/admin') ? 'var(--color-text)' : 'var(--color-text-muted)' }}
                    onClick={() => setMobileMenuOpen(false)}
                >
                    Admin
                </Link>
            )}
        </>
    )

    return (
        <nav
            className="sticky top-0 z-40"
            style={{
                backgroundColor: 'var(--color-bg)',
                borderBottom: '1px solid var(--color-border)',
            }}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                {/* Brand */}
                <Link href="/" className="flex items-center gap-2 font-bold shrink-0" style={{ color: 'var(--color-text)' }}>
                    <span>⚔️</span>
                    <span className="hidden sm:inline">Kendo Translation</span>
                </Link>

                {/* Nav links — desktop only */}
                <div className="hidden sm:flex items-center gap-5 text-sm flex-1">
                    {navLinks}
                </div>

                {/* Right section */}
                <div className="flex items-center gap-3">
                    {/* Global theme settings trigger */}
                    <div className="relative">
                        <button
                            type="button"
                            data-testid="global-theme-trigger"
                            aria-label="Theme settings"
                            title="Theme settings"
                            onClick={() => setSettingsOpen((o) => !o)}
                            className="p-1.5 rounded-md transition-opacity hover:opacity-80"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.97.342 1.405.588l1.277-.743a1 1 0 0 1 1.228.15l.962.96a1 1 0 0 1 .15 1.23l-.743 1.276c.246.435.444.908.588 1.405l1.473.295a1 1 0 0 1 .804.98v1.36a1 1 0 0 1-.804.98l-1.473.295a6.97 6.97 0 0 1-.588 1.405l.743 1.277a1 1 0 0 1-.15 1.228l-.96.962a1 1 0 0 1-1.23.15l-1.276-.743a6.97 6.97 0 0 1-1.405.588l-.295 1.473A1 1 0 0 1 10.68 19H9.32a1 1 0 0 1-.98-.804l-.295-1.473a6.972 6.972 0 0 1-1.405-.588l-1.277.743a1 1 0 0 1-1.228-.15l-.962-.96a1 1 0 0 1-.15-1.23l.743-1.276a6.971 6.971 0 0 1-.588-1.405L1.804 11.32A1 1 0 0 1 1 10.34V8.98a1 1 0 0 1 .804-.98l1.473-.295a6.97 6.97 0 0 1 .588-1.405L3.122 5.023a1 1 0 0 1 .15-1.228l.96-.962a1 1 0 0 1 1.23-.15l1.276.743a6.972 6.972 0 0 1 1.405-.588L8.34 1.804ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <ReaderSettingsPanel
                            open={settingsOpen}
                            onClose={() => setSettingsOpen(false)}
                            theme={themeCtx.theme}
                            font={themeCtx.font}
                            fontSize={themeCtx.fontSize}
                            fontSizeValue={themeCtx.fontSizeValue}
                            fontColor={themeCtx.fontColor}
                            layoutWidth={themeCtx.layoutWidth}
                            onThemeChange={themeCtx.setTheme}
                            onFontChange={themeCtx.setFont}
                            onFontColorChange={themeCtx.setFontColor}
                            onLayoutWidthChange={themeCtx.setLayoutWidth}
                            onIncreaseFontSize={themeCtx.increaseFontSize}
                            onDecreaseFontSize={themeCtx.decreaseFontSize}
                        />
                    </div>

                    {/* Search icon — links to /search */}
                    <Link
                        href="/search"
                        className={`p-1.5 rounded-md transition-opacity hover:opacity-80 ${pathname.startsWith('/search') ? 'bg-indigo-50' : ''}`}
                        style={{ color: pathname.startsWith('/search') ? 'var(--color-text)' : 'var(--color-text-muted)' }}
                        title="Search"
                        aria-label="Search"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </Link>

                    {/* Profile — desktop */}
                    {profile ? (
                        <Link
                            href="/profile"
                            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80 shrink-0"
                            style={{ color: 'var(--color-text)' }}
                            title="Your profile"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                                {initial}
                            </div>
                            <span className="hidden md:inline">{displayName}</span>
                        </Link>
                    ) : (
                        <Link href="/login" className="text-sm text-blue-600 hover:underline shrink-0 hidden sm:inline">
                            Sign in
                        </Link>
                    )}

                    {/* Hamburger — mobile only */}
                    <button
                        type="button"
                        className="sm:hidden flex flex-col items-center justify-center w-8 h-8 gap-1.5 rounded"
                        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={mobileMenuOpen}
                        onClick={() => setMobileMenuOpen((o) => !o)}
                    >
                        {mobileMenuOpen ? (
                            /* X icon */
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" style={{ color: 'var(--color-text)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            /* Hamburger icon */
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" style={{ color: 'var(--color-text)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <div
                    className="sm:hidden px-4 py-3 flex flex-col gap-3 text-sm"
                    style={{
                        borderTop: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                    }}
                >
                    {navLinks}
                    {/* Profile link in mobile menu */}
                    {profile ? (
                        <Link
                            href="/profile"
                            className="flex items-center gap-2 transition-opacity hover:opacity-80 pt-1"
                            style={{ color: 'var(--color-text)', borderTop: '1px solid var(--color-border)' }}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                                {initial}
                            </div>
                            <span>{displayName}</span>
                        </Link>
                    ) : (
                        <Link
                            href="/login"
                            className="text-blue-600 hover:underline pt-1"
                            style={{ borderTop: '1px solid var(--color-border)' }}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Sign in
                        </Link>
                    )}
                </div>
            )}
        </nav>
    )
}
