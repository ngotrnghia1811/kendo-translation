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

interface Analytics {
    phaseBreakdown: Record<string, number>
    topTranslators: { id: string; username: string; count: number }[]
    activityTimeline: { date: string; count: number }[]
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

function PhaseBar({ phase, count, total }: { phase: string; count: number; total: number }) {
    const pct = total > 0 ? (count / total) * 100 : 0
    const color = PHASE_COLORS[phase] ?? '#6b7280'
    return (
        <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-gray-700 dark:text-gray-300">{PHASE_LABELS[phase] ?? phase}</span>
                <span className="text-gray-500 dark:text-gray-400 font-mono">{count.toLocaleString()} ({pct.toFixed(1)}%)</span>
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Admin Dashboard</h1>
                <div className="animate-pulse space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Admin Dashboard</h1>

            {/* ----------------------------------------------------------------
                Top stat cards
            ---------------------------------------------------------------- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-blue-600">{docStats.total}</div>
                    <div className="text-sm text-gray-500">Documents</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-green-600">{docStats.segmented}</div>
                    <div className="text-sm text-gray-500">Segmented</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-purple-600">{users.length}</div>
                    <div className="text-sm text-gray-500">Users</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
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
                        <div key={i} className="h-48 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : analytics ? (
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {/* Phase breakdown */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wide">
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
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 uppercase tracking-wide">
                            Activity (Last 30 Days)
                        </h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                            {analytics.totals.recentTransitions.toLocaleString()} phase transitions ·{' '}
                            {analytics.totals.recentComments.toLocaleString()} comments
                        </p>
                        <ActivitySparkline timeline={analytics.activityTimeline} />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                            Daily phase transitions
                        </p>
                    </div>

                    {/* Top translators */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 uppercase tracking-wide">
                            Top Editors (90 Days)
                        </h2>
                        {analytics.topTranslators.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No edit data</p>
                        )}
                        <div className="space-y-2">
                            {analytics.topTranslators.map((t, i) => (
                                <div key={t.id} className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-gray-400 w-4 text-right">{i + 1}</span>
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                        style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5] }}
                                    >
                                        {t.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm text-gray-700 dark:text-gray-200 flex-1 truncate">{t.username}</span>
                                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{t.count} edits</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* ----------------------------------------------------------------
                Documents table
            ---------------------------------------------------------------- */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Documents</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-8" data-testid="admin-documents-table">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Title</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">ID</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Progress</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Publish Policy</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {docs.slice(0, 25).map((doc) => (
                            <tr key={doc.id} className="border-b border-gray-200 dark:border-gray-700" data-testid="admin-document-row" data-doc-id={doc.id}>
                                <td className="p-3 text-sm text-gray-900 dark:text-white truncate max-w-xs">{doc.title}</td>
                                <td className="p-3 text-sm text-gray-600 dark:text-gray-300 font-mono text-xs">{doc.id.substring(0, 8)}…</td>
                                <td className="p-3 text-sm text-gray-600">{doc.progress?.percentage ?? 0}%</td>
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
                {docs.length > 25 && (
                    <div className="p-3 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700">
                        Showing first 25 of {docs.length} documents.
                    </div>
                )}
            </div>

            {/* ----------------------------------------------------------------
                Users table
            ---------------------------------------------------------------- */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Users</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">User</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">ID</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Role</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700" data-testid="admin-user-row" data-user-id={user.id}>
                                <td className="p-3 text-sm text-gray-900 dark:text-white">
                                    {user.username || 'No username'}
                                </td>
                                <td className="p-3 text-sm text-gray-600 dark:text-gray-300 font-mono text-xs">{user.id.substring(0, 8)}…</td>
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
    )
}
