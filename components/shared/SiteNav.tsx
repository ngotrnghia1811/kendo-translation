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

    if (suppress) return null

    const initial = (
        profile?.username?.[0] ?? profile?.email?.[0] ?? 'U'
    ).toUpperCase()

    const displayName = profile?.username ?? profile?.email?.split('@')[0] ?? 'Account'

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
                {/* Brand */}
                <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 shrink-0">
                    <span>⚔️</span>
                    <span className="hidden sm:inline">Kendo Translation</span>
                </Link>

                {/* Nav links */}
                <div className="flex items-center gap-5 text-sm flex-1">
                    <Link
                        href="/documents"
                        className={`hover:text-gray-900 transition-colors ${pathname === '/documents' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}
                    >
                        Documents
                    </Link>
                    <Link
                        href="/terminology"
                        className={`hover:text-gray-900 transition-colors ${pathname === '/terminology' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}
                    >
                        Terminology
                    </Link>
                    {profile?.role === 'admin' && (
                        <Link
                            href="/admin"
                            className={`hover:text-gray-900 transition-colors ${pathname.startsWith('/admin') ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}
                        >
                            Admin
                        </Link>
                    )}
                </div>

                {/* Profile */}
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
                    <Link href="/login" className="text-sm text-blue-600 hover:underline shrink-0">
                        Sign in
                    </Link>
                )}
            </div>
        </nav>
    )
}
