'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface UserProfile {
    id: string
    email: string | null
    username: string | null
    role: 'admin' | 'translator' | 'reader'
}

interface AuthState {
    profile: UserProfile | null
    loading: boolean
    refetch: () => void
}

const AuthContext = createContext<AuthState>({
    profile: null,
    loading: true,
    refetch: () => {},
})

/**
 * Phase 4.7: single-source auth context shared by SiteNav, SearchPageInner,
 * and any other component that needs the current user's profile/role.
 * Eliminates duplicate /api/auth/me fetches (audit P11).
 */
export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = useCallback(() => {
        setLoading(true)
        fetch('/api/auth/me')
            .then((r) => r.json())
            .then((data) => setProfile(data.profile ?? null))
            .catch(() => setProfile(null))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        fetchProfile()
    }, [fetchProfile])

    return (
        <AuthContext.Provider value={{ profile, loading, refetch: fetchProfile }}>
            {children}
        </AuthContext.Provider>
    )
}
