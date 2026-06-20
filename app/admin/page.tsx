'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserInfo {
    id: string
    email?: string
    username: string | null
    role: string
    last_active_at: string | null
}

interface DocInfo {
    id: string
    title: string
    segmented?: boolean
    progress?: { percentage?: number }
    publish_filter?: string
}

interface DocStats {
    total: number
    segmented: number
    fullyTranslated: number
}

interface QADocIssues {
    id: string
    title: string
    minor: number
    major: number
    critical: number
    total: number
}

interface Analytics {
    phaseBreakdown: Record<string, number>
    topTranslators: { id: string; username: string; count: number }[]
    activityTimeline: { date: string; count: number }[]
    qaIssues: QADocIssues[]
    totals: {
        articles: number
        users: number
        recentComments: number
        recentTransitions: number
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PHASE_LABELS: Record<string, string> = {
    draft: 'Draft',
    translated: 'Translated',
    edited: 'Edited',
    proofread: 'Proofread',
    qa_approved: 'QA Approved',
}

const PHASE_COLORS: Record<string, string> = {
    draft: '#ef4444',
    translated: '#3b82f6',
    edited: '#10b981',
    proofread: '#f59e0b',
    qa_approved: '#8b5cf6',
}

function relativeTime(isoString: string | null): string {
    if (!isoString) return 'Never'
    const now = Date.now()
    const then = new Date(isoString).getTime()
    const diffMs = now - then
    const diffMin = Math.floor(diffMs / 60_000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDays = Math.floor(diffHr / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    const diffMo = Math.floor(diffDays / 30)
    return `${diffMo}mo ago`
}

function PhaseBar({ phase, count, total }: { phase: string; count: number; total: number }) {
    const pct = total > 0 ? (count / total) * 100 : 0
    const color = PHASE_COLORS[phase] ?? '#6b7280'
    return (
        <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-[var(--rt-text)]">{PHASE_LABELS[phase] ?? phase}</span>
                <span className="text-[var(--rt-text-muted)] font-mono">{count.toLocaleString()} ({pct.toFixed(1)}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
        </div>
    )
}

function ActivitySparkline({ timeline }: { timeline: { date: string; count: number }[] }) {
    if (timeline.length === 0) {
        return <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">No activity in the last 30 days</p>
    }
    const max = Math.max(...timeline.map(t => t.count), 1)
    return (
        <div className="flex items-end gap-0.5 h-16">
            {timeline.map((t) => {
                const heightPct = Math.max((t.count / max) * 100, 4)
                return (
                    <div
                        key={t.date}
                        title={`${t.date}: ${t.count} transitions`}
                        className="flex-1 rounded-sm bg-blue-400 dark:bg-blue-500 transition-all duration-300 cursor-default"
                        style={{ height: `${heightPct}%` }}
                    />
                )
            })}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminPage() {
    const [users, setUsers] = useState<UserInfo[]>([])
    const [docs, setDocs] = useState<DocInfo[]>([])
    const [docStats, setDocStats] = useState<DocStats>({ total: 0, segmented: 0, fullyTranslated: 0 })
    const [analytics, setAnalytics] = useState<Analytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [analyticsLoading, setAnalyticsLoading] = useState(true)
    const [filterSaving, setFilterSaving] = useState<string | null>(null)
    const [roleSaving, setRoleSaving] = useState<string | null>(null)
    const [docsPage, setDocsPage] = useState(0)

    const PAGE_SIZE = 25

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersRes, docsRes] = await Promise.all([
                    fetch('/api/admin/users'),
                    fetch('/api/documents?all=1'),
                ])

                if (usersRes.ok) {
                    const data = await usersRes.json()
                    setUsers(data.users || [])
                }

                if (docsRes.ok) {
                    const data = await docsRes.json()
                    const list: DocInfo[] = data.documents || []
                    setDocs(list)
                    setDocStats({
                        total: list.length,
                        segmented: list.filter(d => d.segmented).length,
                        fullyTranslated: list.filter(d => d.progress?.percentage === 100).length,
                    })
                }
            } catch (error) {
                console.error('Error fetching admin data:', error)
            } finally {
                setLoading(false)
            }
        }

        const fetchAnalytics = async () => {
            try {
                const res = await fetch('/api/admin/analytics')
                if (res.ok) {
                    const data = await res.json()
                    setAnalytics(data)
                }
            } catch (error) {
                console.error('Error fetching analytics:', error)
            } finally {
                setAnalyticsLoading(false)
            }
        }

        fetchData()
        fetchAnalytics()
    }, [])

    const handleTogglePublishFilter = async (docId: string, currentFilter: string | undefined) => {
        const newFilter = currentFilter === 'qa_approved' ? 'any_translated' : 'qa_approved'
        setFilterSaving(docId)
        try {
            const res = await fetch(`/api/documents/${docId}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publish_filter: newFilter }),
            })
            if (res.ok) {
                setDocs((prev) =>
                    prev.map((d) => d.id === docId ? { ...d, publish_filter: newFilter } : d)
                )
            } else {
                const err = await res.json()
                console.error('Failed to update publish filter:', err)
            }
        } catch (err) {
            console.error('Error updating publish filter:', err)
        } finally {
            setFilterSaving(null)
        }
    }

    const handleRoleChange = async (userId: string, newRole: string) => {
        setRoleSaving(userId)
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            })
            if (res.ok) {
                setUsers((prev) =>
                    prev.map((u) => u.id === userId ? { ...u, role: newRole } : u)
                )
            } else {
                const err = await res.json()
                console.error('Failed to update role:', err)
            }
        } catch (err) {
            console.error('Error updating role:', err)
        } finally {
            setRoleSaving(null)
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-[var(--rt-text)] mb-6">Admin Dashboard</h1>
                <div className="animate-pulse space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-[var(--rt-border)] rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    const totalSegments = analytics
        ? Object.values(analytics.phaseBreakdown).reduce((a, b) => a + b, 0)
        : 0

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <h1 className="text-2xl font-bold text-[var(--rt-text)] mb-6">Admin Dashboard</h1>

            {/* ----------------------------------------------------------------
                Top stat cards
            ---------------------------------------------------------------- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="rounded-lg p-4 border bg-[var(--rt-surface)] border-[var(--rt-border)]">
                    <div className="text-3xl font-bold text-blue-600">{docStats.total}</div>
                    <div className="text-sm text-gray-500">Documents</div>
                </div>
                <div className="rounded-lg p-4 border bg-[var(--rt-surface)] border-[var(--rt-border)]">
                    <div className="text-3xl font-bold text-green-600">{docStats.segmented}</div>
                    <div className="text-sm text-gray-500">Segmented</div>
                </div>
                <div className="rounded-lg p-4 border bg-[var(--rt-surface)] border-[var(--rt-border)]">
                    <div className="text-3xl font-bold text-purple-600">{users.length}</div>
                    <div className="text-sm text-gray-500">Users</div>
                </div>
                <div className="rounded-lg p-4 border bg-[var(--rt-surface)] border-[var(--rt-border)]">
                    <div className="text-3xl font-bold text-orange-600">
                        {analyticsLoading ? '…' : totalSegments.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Total Segments</div>
                </div>
            </div>

            {/* ----------------------------------------------------------------
                Analytics row: Phase breakdown + Activity timeline + Top translators
            ---------------------------------------------------------------- */}
            {analyticsLoading ? (
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-[var(--rt-border)] rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : analytics ? (
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {/* Phase breakdown */}
                    <div className="rounded-lg p-5 border bg-[var(--rt-surface)] border-[var(--rt-border)]">
                        <h2 className="text-sm font-semibold text-[var(--rt-text)] mb-4 uppercase tracking-wide">
                            Segment Status Breakdown
                        </h2>
                        {Object.entries(analytics.phaseBreakdown)
                            .sort(([a], [b]) => {
                                const order = ['draft', 'translated', 'edited', 'proofread', 'qa_approved']
                                return order.indexOf(a) - order.indexOf(b)
                            })
                            .map(([phase, count]) => (
                                <PhaseBar key={phase} phase={phase} count={count} total={totalSegments} />
                            ))}
                        {Object.keys(analytics.phaseBreakdown).length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No segment data</p>
                        )}
                    </div>

                    {/* Activity timeline */}
                    <div className="rounded-lg p-5 border bg-[var(--rt-surface)] border-[var(--rt-border)]">
                        <h2 className="text-sm font-semibold text-[var(--rt-text)] mb-1 uppercase tracking-wide">
                            Activity (Last 30 Days)
                        </h2>
                        <p className="text-xs text-[var(--rt-text-muted)] mb-4">
                            {analytics.totals.recentTransitions.toLocaleString()} phase transitions ·{' '}
                            {analytics.totals.recentComments.toLocaleString()} comments
                        </p>
                        <ActivitySparkline timeline={analytics.activityTimeline} />
                        <p className="text-xs text-[var(--rt-text-muted)] mt-2 text-center">
                            Daily phase transitions
                        </p>
                    </div>

                    {/* Top translators */}
                    <div className="rounded-lg p-5 border bg-[var(--rt-surface)] border-[var(--rt-border)]">
                        <h2 className="text-sm font-semibold text-[var(--rt-text)] mb-4 uppercase tracking-wide">
                            Top Editors (90 Days)
                        </h2>
                        {analytics.topTranslators.length === 0 && (
                            <p className="text-xs text-[var(--rt-text-muted)] text-center py-4">No edit data</p>
                        )}
                        <div className="space-y-2">
                            {analytics.topTranslators.map((t, i) => (
                                <div key={t.id} className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-[var(--rt-text-muted)] w-4 text-right">{i + 1}</span>
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                        style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5] }}
                                    >
                                        {t.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm text-[var(--rt-text)] flex-1 truncate">{t.username}</span>
                                    <span className="text-xs font-mono text-[var(--rt-text-muted)]">{t.count} edits</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* ----------------------------------------------------------------
                QA Issues widget
            ---------------------------------------------------------------- */}
            {!analyticsLoading && analytics && (
                <div className="rounded-lg border p-5 bg-[var(--rt-surface)] border-[var(--rt-border)] mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-[var(--rt-text)] uppercase tracking-wide">
                            Open QA Issues
                        </h2>
                        {analytics.qaIssues.length > 0 && (
                            <span className="text-xs text-[var(--rt-text-muted)]">
                                {analytics.qaIssues.reduce((s, d) => s + d.total, 0).toLocaleString()} issues across {analytics.qaIssues.length} document{analytics.qaIssues.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    {analytics.qaIssues.length === 0 ? (
                        <p className="text-sm text-[var(--rt-text-muted)] text-center py-4">
                            🎉 No open QA issues
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--rt-border)]">
                                        <th className="text-left text-xs font-medium text-[var(--rt-text-muted)] uppercase pb-2 pr-4">Document</th>
                                        <th className="text-right text-xs font-medium text-[var(--rt-text-muted)] uppercase pb-2 px-2">
                                            <span className="text-red-500">●</span> Critical
                                        </th>
                                        <th className="text-right text-xs font-medium text-[var(--rt-text-muted)] uppercase pb-2 px-2">
                                            <span className="text-orange-400">●</span> Major
                                        </th>
                                        <th className="text-right text-xs font-medium text-[var(--rt-text-muted)] uppercase pb-2 px-2">
                                            <span className="text-yellow-400">●</span> Minor
                                        </th>
                                        <th className="text-right text-xs font-medium text-[var(--rt-text-muted)] uppercase pb-2 pl-2">Total</th>
                                        <th className="text-left text-xs font-medium text-[var(--rt-text-muted)] uppercase pb-2 pl-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.qaIssues.map((doc) => (
                                        <tr key={doc.id} className="border-b border-[var(--rt-border)] hover:bg-[var(--rt-border)]/10 transition-colors">
                                            <td className="py-2 pr-4 text-[var(--rt-text)] font-medium truncate max-w-[240px]" title={doc.title}>
                                                {doc.title}
                                            </td>
                                            <td className="py-2 px-2 text-right font-mono text-xs">
                                                {doc.critical > 0
                                                    ? <span className="text-red-600 dark:text-red-400 font-semibold">{doc.critical}</span>
                                                    : <span className="text-gray-300 dark:text-gray-600">—</span>
                                                }
                                            </td>
                                            <td className="py-2 px-2 text-right font-mono text-xs">
                                                {doc.major > 0
                                                    ? <span className="text-orange-500 dark:text-orange-400 font-semibold">{doc.major}</span>
                                                    : <span className="text-gray-300 dark:text-gray-600">—</span>
                                                }
                                            </td>
                                            <td className="py-2 px-2 text-right font-mono text-xs">
                                                {doc.minor > 0
                                                    ? <span className="text-yellow-600 dark:text-yellow-400">{doc.minor}</span>
                                                    : <span className="text-gray-300 dark:text-gray-600">—</span>
                                                }
                                            </td>
                                            <td className="py-2 pl-2 text-right font-mono text-xs font-semibold text-gray-700 dark:text-gray-200">
                                                {doc.total}
                                            </td>
                                            <td className="py-2 pl-4">
                                                <Link
                                                    href={`/documents/${doc.id}/edit`}
                                                    className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 whitespace-nowrap"
                                                >
                                                    Review →
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ----------------------------------------------------------------
                Documents table
            ---------------------------------------------------------------- */}
            <h2 className="text-lg font-semibold text-[var(--rt-text)] mb-3">Documents</h2>
            <div className="rounded-lg border overflow-hidden bg-[var(--rt-surface)] border-[var(--rt-border)] mb-8" data-testid="admin-documents-table">
                <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--rt-border)] bg-[var(--rt-surface)]">
                            <th className="text-left text-xs font-medium text-[var(--rt-text-muted)] uppercase p-3">Title</th>
                            <th className="text-left text-xs font-medium text-[var(--rt-text-muted)] uppercase p-3">ID</th>
                            <th className="text-left text-xs font-medium text-[var(--rt-text-muted)] uppercase p-3">Progress</th>
                            <th className="text-left text-xs font-medium text-[var(--rt-text-muted)] uppercase p-3">Publish Policy</th>
                            <th className="text-left text-xs font-medium text-[var(--rt-text-muted)] uppercase p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {docs.slice(docsPage * PAGE_SIZE, (docsPage + 1) * PAGE_SIZE).map((doc) => (
                            <tr key={doc.id} className="border-b border-[var(--rt-border)]" data-testid="admin-document-row" data-doc-id={doc.id}>
                                <td className="p-3 text-sm text-[var(--rt-text)] truncate max-w-xs">{doc.title}</td>
                                <td className="p-3 text-sm text-[var(--rt-text-muted)] font-mono text-xs">{doc.id.substring(0, 8)}…</td>
                                <td className="p-3 text-sm text-[var(--rt-text-muted)]">{doc.progress?.percentage ?? 0}%</td>
                                <td className="p-3">
                                    <button
                                        type="button"
                                        disabled={filterSaving === doc.id}
                                        onClick={() => handleTogglePublishFilter(doc.id, doc.publish_filter)}
                                        title={doc.publish_filter === 'qa_approved'
                                            ? 'Currently showing only QA-approved segments. Click to allow any translated.'
                                            : 'Currently showing any translated segment. Click to restrict to QA-approved only.'
                                        }
                                        className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                                            doc.publish_filter === 'qa_approved'
                                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                                        } ${filterSaving === doc.id ? 'opacity-50 cursor-wait' : ''}`}
                                    >
                                        {filterSaving === doc.id ? '…' : (doc.publish_filter === 'qa_approved' ? '🔒 QA only' : '📄 Any translated')}
                                    </button>
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/admin/documents/${doc.id}`}
                                            className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-300"
                                            data-testid="admin-document-detail-link"
                                        >
                                            Details
                                        </Link>
                                        <Link
                                            href={`/admin/documents/${doc.id}/assignments`}
                                            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300"
                                            data-testid="admin-document-assignments-link"
                                        >
                                            Assignments
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
                {/* Pagination controls */}
                {docs.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--rt-border)]">
                        <button
                            type="button"
                            onClick={() => setDocsPage(p => Math.max(0, p - 1))}
                            disabled={docsPage === 0}
                            className="text-xs px-3 py-1 rounded border border-[var(--rt-border)] text-[var(--rt-text-muted)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--rt-surface)] transition-colors"
                        >
                            ← Previous
                        </button>
                        <span className="text-xs text-[var(--rt-text-muted)]">
                            Page {docsPage + 1} of {Math.ceil(docs.length / PAGE_SIZE)} &middot; {docs.length} documents total
                        </span>
                        <button
                            type="button"
                            onClick={() => setDocsPage(p => Math.min(Math.ceil(docs.length / PAGE_SIZE) - 1, p + 1))}
                            disabled={docsPage >= Math.ceil(docs.length / PAGE_SIZE) - 1}
                            className="text-xs px-3 py-1 rounded border border-[var(--rt-border)] text-[var(--rt-text-muted)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--rt-surface)] transition-colors"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>

            {/* ----------------------------------------------------------------
                Users table
            ---------------------------------------------------------------- */}
            <h2 className="text-lg font-semibold text-[var(--rt-text)] mb-3">Users</h2>
            <div className="rounded-lg border overflow-hidden bg-[var(--rt-surface)] border-[var(--rt-border)]">
                <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--rt-border)] bg-[var(--rt-surface)]">
                            <th className="text-left text-xs font-medium text-[var(--rt-text-muted)] uppercase p-3">User</th>
                            <th className="text-left text-xs font-medium text-[var(--rt-text-muted)] uppercase p-3">ID</th>
                            <th className="text-left text-xs font-medium text-[var(--rt-text-muted)] uppercase p-3">Last Active</th>
                            <th className="text-left text-xs font-medium text-[var(--rt-text-muted)] uppercase p-3">Role</th>
                            <th className="text-left text-xs font-medium text-[var(--rt-text-muted)] uppercase p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-[var(--rt-border)]" data-testid="admin-user-row" data-user-id={user.id}>
                                <td className="p-3 text-sm text-[var(--rt-text)]">
                                    {user.username || 'No username'}
                                </td>
                                <td className="p-3 text-sm text-[var(--rt-text-muted)] font-mono text-xs">{user.id.substring(0, 8)}…</td>
                                <td
                                    className="p-3 text-xs text-[var(--rt-text-muted)] whitespace-nowrap"
                                    title={user.last_active_at ?? 'No edits yet'}
                                >
                                    {relativeTime(user.last_active_at)}
                                </td>
                                <td className="p-3">
                                    <select
                                        value={user.role}
                                        disabled={roleSaving === user.id}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        data-testid="admin-user-role-select"
                                        title={`Change role for ${user.username ?? user.id}`}
                                        className={`text-xs px-2 py-1 rounded border font-medium transition-colors cursor-pointer
                                            ${user.role === 'admin'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700'
                                                : user.role === 'translator'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                                            }
                                            ${roleSaving === user.id ? 'opacity-50 cursor-wait' : 'hover:opacity-80'}
                                        `}
                                    >
                                        <option value="reader">reader</option>
                                        <option value="translator">translator</option>
                                        <option value="admin">admin</option>
                                    </select>
                                </td>
                                <td className="p-3">
                                    <Link
                                        href={`/admin/users/${user.id}/assignments`}
                                        className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300"
                                        data-testid="admin-user-assignments-link"
                                    >
                                        Assignments
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    )
}
