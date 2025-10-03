'use client'

import { useEffect, useState } from 'react'

interface UserProfile {
    id: string
    email: string
    username: string | null
    role: 'admin' | 'translator' | 'reader'
    created_at: string
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/auth/me')
                if (res.ok) {
                    const data = await res.json()
                    setProfile(data.profile)
                }
            } catch (error) {
                console.error('Error fetching profile:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [])

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="container mx-auto px-4 py-8">
                <p className="text-gray-500">Not logged in.</p>
            </div>
        )
    }

    const roleBadgeClass = {
        admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
        translator: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        reader: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Profile</h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {profile.username?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {profile.username || profile.email?.split('@')[0] || 'User'}
                        </h2>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${roleBadgeClass[profile.role]}`}>
                            {profile.role}
                        </span>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                    <div>
                        <label className="text-sm text-gray-500">Email</label>
                        <p className="text-gray-900 dark:text-white">{profile.email}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">User ID</label>
                        <p className="text-gray-900 dark:text-white font-mono text-sm">{profile.id}</p>
                    </div>
                    {profile.created_at && (
                        <div>
                            <label className="text-sm text-gray-500">Member since</label>
                            <p className="text-gray-900 dark:text-white">
                                {new Date(profile.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
