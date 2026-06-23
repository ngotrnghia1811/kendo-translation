'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

interface UserProfile {
    id: string
    email: string | null
    username: string | null
    role: 'admin' | 'translator' | 'reader'
    created_at: string
    updated_at?: string
}

interface Assignment {
    document_id: string
    title: string | null
    allowed_phases: string[]
}

interface HistoryItem {
    item_id: string
    item_type: string
    item_title: string
    visited_at: string
}

interface ProfileStats {
    editCount: number
    commentCount: number
    transitionCount: number
    assignedDocCount: number
    assignments: Assignment[]
    recentHistory: HistoryItem[]
}

const ROLE_BADGE: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    translator: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    reader: 'bg-[var(--color-bg)] text-[var(--color-text-muted)] dark:bg-gray-800 dark:text-gray-300',
}

const PHASE_COLORS: Record<string, string> = {
    translate: 'bg-blue-100 text-blue-700',
    edit: 'bg-yellow-100 text-yellow-700',
    proofread: 'bg-green-100 text-green-700',
    qa: 'bg-purple-100 text-purple-700',
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

function formatRelative(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return formatDate(iso)
}

// ---------- Inline Username Editor ----------

function UsernameEditor({
    initial,
    onSaved,
}: {
    initial: string | null
    onSaved: (name: string) => void
}) {
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(initial ?? '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (editing) inputRef.current?.focus()
    }, [editing])

    const submit = async () => {
        if (!value.trim()) return
        setSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: value.trim() }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? 'Failed to update username')
            } else {
                onSaved(data.profile.username)
                setEditing(false)
            }
        } catch {
            setError('Network error')
        } finally {
            setSaving(false)
        }
    }

    const cancel = () => {
        setValue(initial ?? '')
        setEditing(false)
        setError(null)
    }

    if (!editing) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-[var(--color-text)]">
                    {initial || <span className="text-[var(--color-text-muted)] italic">No username set</span>}
                </span>
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-xs text-blue-600 hover:underline"
                    aria-label="Edit username"
                >
                    Edit
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submit()
                        if (e.key === 'Escape') cancel()
                    }}
                    className="border border-[var(--color-border)] rounded px-2 py-1 text-sm bg-[var(--color-surface)] text-[var(--color-text)] w-48"
                    placeholder="username"
                    maxLength={30}
                    disabled={saving}
                />
                <button
                    type="button"
                    onClick={submit}
                    disabled={saving || !value.trim()}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                    type="button"
                    onClick={cancel}
                    disabled={saving}
                    className="px-3 py-1 text-xs text-[var(--color-text-muted)] hover:underline"
                >
                    Cancel
                </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    )
}

// ---------- Stat Card ----------

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
    return (
        <div className="border rounded-lg p-4 flex items-center gap-3 bg-[var(--color-surface)] border-[var(--color-border)]">
            <span className="text-2xl">{icon}</span>
            <div>
                <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
            </div>
        </div>
    )
}

// ---------- Main Page ----------

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [stats, setStats] = useState<ProfileStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const [meRes, statsRes] = await Promise.all([
                    fetch('/api/auth/me'),
                    fetch('/api/profile/stats'),
                ])
                if (meRes.ok) {
                    const data = await meRes.json()
                    setProfile(data.profile)
                }
                if (statsRes.ok) {
                    setStats(await statsRes.json())
                }
            } catch (err) {
                console.error('Profile load error:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-[var(--color-border)] rounded w-1/3" />
                    <div className="h-32 bg-[var(--color-border)] rounded" />
                    <div className="grid grid-cols-4 gap-4">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-20 bg-[var(--color-border)] rounded" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <p className="text-[var(--color-text-muted)]">
                    Not logged in.{' '}
                    <Link href="/login" className="text-blue-600 underline">
                        Sign in
                    </Link>
                </p>
            </div>
        )
    }

    const initial = (profile.username?.[0] ?? profile.email?.[0] ?? 'U').toUpperCase()

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Your Profile</h1>

            {/* ── Profile card ── */}
            <div className="rounded-xl shadow-sm border p-6 bg-[var(--color-surface)] border-[var(--color-border)]">
                <div className="flex items-start gap-5">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-2xl font-bold text-blue-700 dark:text-blue-300 shrink-0">
                        {initial}
                    </div>

                    {/* Details */}
                    <div className="flex-1 space-y-2">
                        <UsernameEditor
                            initial={profile.username}
                            onSaved={(name) => setProfile((p) => p ? { ...p, username: name } : p)}
                        />
                        <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_BADGE[profile.role] ?? ROLE_BADGE.reader}`}
                        >
                            {profile.role}
                        </span>
                    </div>
                </div>

                {/* Meta row */}
                <div className="mt-5 border-t border-[var(--color-border)] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-[var(--color-text-muted)] text-xs mb-0.5">Email</p>
                        <p className="text-[var(--color-text)]">{profile.email ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-[var(--color-text-muted)] text-xs mb-0.5">Member since</p>
                        <p className="text-[var(--color-text)]">{formatDate(profile.created_at)}</p>
                    </div>
                    <div>
                        <p className="text-[var(--color-text-muted)] text-xs mb-0.5">User ID</p>
                        <p className="text-[var(--color-text)] font-mono text-xs truncate">{profile.id}</p>
                    </div>
                </div>
            </div>

            {/* ── Stats ── */}
            {stats && (
                <section>
                    <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
                        Activity
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard label="Edits made" value={stats.editCount} icon="✏️" />
                        <StatCard label="Comments" value={stats.commentCount} icon="💬" />
                        <StatCard label="Phases advanced" value={stats.transitionCount} icon="🔄" />
                        <StatCard label="Assigned docs" value={stats.assignedDocCount} icon="📄" />
                    </div>
                </section>
            )}

            {/* ── Assigned documents ── */}
            {stats && stats.assignments.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
                        Assigned Documents
                    </h2>
                    <div className="rounded-xl border overflow-hidden bg-[var(--color-surface)] border-[var(--color-border)]">
                        <ul className="divide-y divide-[var(--color-border)]">
                            {stats.assignments.map((a) => (
                                <li key={a.document_id} className="px-5 py-3 flex items-center justify-between gap-3">
                                    <Link
                                        href={`/documents/${a.document_id}/edit`}
                                        className="text-sm font-medium text-blue-600 hover:underline truncate"
                                    >
                                        {a.title ?? a.document_id}
                                    </Link>
                                    <div className="flex gap-1 shrink-0">
                                        {a.allowed_phases.map((ph) => (
                                            <span
                                                key={ph}
                                                className={`px-2 py-0.5 text-xs rounded-full font-medium ${PHASE_COLORS[ph] ?? 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}`}
                                            >
                                                {ph}
                                            </span>
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            {/* ── Reading history ── */}
            {stats && stats.recentHistory.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
                        Recent Reading
                    </h2>
                    <div className="rounded-xl border overflow-hidden bg-[var(--color-surface)] border-[var(--color-border)]">
                        <ul className="divide-y divide-[var(--color-border)]">
                            {stats.recentHistory.map((h) => (
                                <li key={h.item_id} className="px-5 py-3 flex items-center justify-between gap-3">
                                    <Link
                                        href={
                                            h.item_type === 'article'
                                                ? `/documents/${h.item_id}/read`
                                                : `/videos/${h.item_id}`
                                        }
                                        className="text-sm font-medium text-blue-600 hover:underline truncate"
                                    >
                                        {h.item_title}
                                    </Link>
                                    <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                                        {formatRelative(h.visited_at)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            {/* If translator/admin, show no-assignment empty state */}
            {stats && stats.assignments.length === 0 && (profile.role === 'translator' || profile.role === 'admin') && (
                <p className="text-sm text-[var(--color-text-muted)]">
                    No document assignments yet. An admin can assign you to documents from the{' '}
                    <Link href="/admin/documents" className="text-blue-600 hover:underline">
                        admin panel
                    </Link>
                    .
                </p>
            )}
        </div>
    )
}
