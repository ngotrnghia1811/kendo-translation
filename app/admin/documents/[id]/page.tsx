'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArticleInfo {
    id: string;
    title: string;
    segment_count: number | null;
    segmented: boolean | null;
    translation_status: string | null;
    updated_at: string | null;
}

interface AssignmentInfo {
    user_id: string;
    username: string | null;
    role: string | null;
    allowed_phases: string[];
}

interface DocDetail {
    article: ArticleInfo;
    phaseBreakdown: Record<string, number>;
    assignments: AssignmentInfo[];
    recentActivity: { date: string; count: number }[];
    totalSegments: number;
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
};

const PHASE_COLORS: Record<string, string> = {
    draft: '#ef4444',
    translated: '#3b82f6',
    edited: '#10b981',
    proofread: '#f59e0b',
    qa_approved: '#8b5cf6',
};

const PHASE_BG_CLASSES: Record<string, string> = {
    draft: 'bg-red-100 text-red-700 border-red-200',
    translated: 'bg-blue-100 text-blue-700 border-blue-200',
    edited: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    proofread: 'bg-amber-100 text-amber-700 border-amber-200',
    qa_approved: 'bg-violet-100 text-violet-700 border-violet-200',
};

const ROLE_CLASSES: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    translator: 'bg-blue-100 text-blue-700',
    reader: 'bg-gray-100 text-gray-600',
};

function PhaseBar({ phase, count, total }: { phase: string; count: number; total: number }) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    const color = PHASE_COLORS[phase] ?? '#6b7280';
    return (
        <div className="flex items-center gap-3">
            <span className="w-28 text-xs text-gray-600 shrink-0">{PHASE_LABELS[phase] ?? phase}</span>
            <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
            <span className="w-24 text-right text-xs text-gray-500 font-mono shrink-0">
                {count.toLocaleString()} ({pct.toFixed(1)}%)
            </span>
        </div>
    );
}

function ActivitySparkline({ activity }: { activity: { date: string; count: number }[] }) {
    const max = Math.max(...activity.map(a => a.count), 1);
    return (
        <div className="flex items-end gap-0.5 h-12 mt-1">
            {activity.map((a) => {
                const h = Math.max((a.count / max) * 100, a.count > 0 ? 4 : 0);
                return (
                    <div
                        key={a.date}
                        title={`${a.date}: ${a.count} transitions`}
                        className="flex-1 rounded-sm bg-blue-400 transition-all"
                        style={{ height: `${h}%` }}
                    />
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminDocDetailPage() {
    const params = useParams<{ id: string }>();
    const [detail, setDetail] = useState<DocDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/admin/documents/${params.id}`);
                if (!res.ok) {
                    const data = await res.json();
                    setError(data.error ?? 'Failed to load document');
                    return;
                }
                setDetail(await res.json());
            } catch {
                setError('Failed to load document');
            } finally {
                setLoading(false);
            }
        })();
    }, [params.id]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3" />
                    <div className="h-40 bg-gray-100 rounded-lg" />
                    <div className="h-40 bg-gray-100 rounded-lg" />
                </div>
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-8">
                <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</Link>
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                    {error ?? 'Document not found'}
                </div>
            </div>
        );
    }

    const { article, phaseBreakdown, assignments, recentActivity, totalSegments } = detail;
    const approvedCount = phaseBreakdown['qa_approved'] ?? 0;
    const translatedCount = totalSegments - (phaseBreakdown['draft'] ?? 0);
    const progressPct = totalSegments > 0 ? Math.round((translatedCount / totalSegments) * 100) : 0;
    const approvedPct = totalSegments > 0 ? Math.round((approvedCount / totalSegments) * 100) : 0;
    const PHASE_ORDER = ['draft', 'translated', 'edited', 'proofread', 'qa_approved'];

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Link href="/admin" className="hover:text-gray-700 transition-colors">Admin</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium truncate">{article.title}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{article.id}</p>
                    {article.updated_at && (
                        <p className="text-xs text-gray-500 mt-1">
                            Last updated: {new Date(article.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                    )}
                </div>
                <div className="flex gap-2 shrink-0">
                    <Link
                        href={`/documents/${article.id}/read`}
                        className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                        Read
                    </Link>
                    <Link
                        href={`/documents/${article.id}/edit`}
                        className="text-xs px-3 py-1.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                        Edit
                    </Link>
                    <Link
                        href={`/admin/documents/${article.id}/assignments`}
                        className="text-xs px-3 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                        Manage assignments
                    </Link>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Total segments', value: totalSegments.toLocaleString(), color: 'text-gray-900' },
                    { label: 'Translation progress', value: `${progressPct}%`, color: 'text-blue-600' },
                    { label: 'QA approved', value: `${approvedPct}%`, color: 'text-violet-600' },
                    { label: 'Assigned users', value: assignments.length, color: 'text-indigo-600' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Phase breakdown */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Phase Breakdown</h2>
                {totalSegments === 0 ? (
                    <p className="text-xs text-gray-400">No EN segments yet.</p>
                ) : (
                    <div className="space-y-2.5">
                        {PHASE_ORDER.map((phase) => (
                            <PhaseBar
                                key={phase}
                                phase={phase}
                                count={phaseBreakdown[phase] ?? 0}
                                total={totalSegments}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* 14-day activity */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-1">Activity (last 14 days)</h2>
                <p className="text-xs text-gray-400 mb-2">Daily phase transitions</p>
                <ActivitySparkline activity={recentActivity} />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{recentActivity[0]?.date}</span>
                    <span>{recentActivity[recentActivity.length - 1]?.date}</span>
                </div>
            </div>

            {/* Assignments */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-700">Assignments ({assignments.length})</h2>
                    <Link
                        href={`/admin/documents/${article.id}/assignments`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                        Manage →
                    </Link>
                </div>
                {assignments.length === 0 ? (
                    <p className="text-xs text-gray-400 px-5 py-4">No users assigned yet.</p>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-2">User</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-2">Role</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-2">Assigned Phases</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.map((a) => (
                                <tr key={a.user_id} className="border-b border-gray-50">
                                    <td className="px-5 py-2.5 text-sm text-gray-900">
                                        {a.username ?? <span className="text-gray-400 italic">no username</span>}
                                        <span className="text-xs text-gray-400 font-mono ml-2">{a.user_id.slice(0, 8)}…</span>
                                    </td>
                                    <td className="px-5 py-2.5">
                                        {a.role && (
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROLE_CLASSES[a.role] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {a.role}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-2.5">
                                        <div className="flex flex-wrap gap-1">
                                            {a.allowed_phases.map((phase) => (
                                                <span
                                                    key={phase}
                                                    className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PHASE_BG_CLASSES[phase] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                                                >
                                                    {phase}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
