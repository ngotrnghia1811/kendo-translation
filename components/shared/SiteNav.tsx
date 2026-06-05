'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
                className={`hover:text-gray-900 transition-colors ${pathname === '/documents' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}
                onClick={() => setMobileMenuOpen(false)}
            >
                Documents
            </Link>
            <Link
                href="/terminology"
                className={`hover:text-gray-900 transition-colors ${pathname === '/terminology' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}
                onClick={() => setMobileMenuOpen(false)}
            >
                Terminology
            </Link>
            {profile?.role === 'admin' && (
                <Link
                    href="/admin"
                    className={`hover:text-gray-900 transition-colors ${pathname.startsWith('/admin') ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}
                    onClick={() => setMobileMenuOpen(false)}
                >
                    Admin
                </Link>
            )}
        </>
    )

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                {/* Brand */}
                <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 shrink-0">
                    <span>⚔️</span>
                    <span className="hidden sm:inline">Kendo Translation</span>
                </Link>

                {/* Nav links — desktop only */}
                <div className="hidden sm:flex items-center gap-5 text-sm flex-1">
                    {navLinks}
                </div>

                {/* Right section */}
                <div className="flex items-center gap-3">
                    {/* Profile — desktop */}
                    {profile ? (
                        <Link
                            href="/profile"
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors shrink-0"
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
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-700">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            /* Hamburger icon */
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-700">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-3 text-sm">
                    {navLinks}
                    {/* Profile link in mobile menu */}
                    {profile ? (
                        <Link
                            href="/profile"
                            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors pt-1 border-t border-gray-100"
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
                            className="text-blue-600 hover:underline pt-1 border-t border-gray-100"
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
