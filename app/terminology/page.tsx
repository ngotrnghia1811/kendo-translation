'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Term {
    id: string
    source_term: string
    target_term: string
    reading: string | null
    domain: string | null
    notes: string | null
}

interface TermFormState {
    source_term: string
    target_term: string
    reading: string
    domain: string
    notes: string
}

const emptyForm = (): TermFormState => ({
    source_term: '',
    target_term: '',
    reading: '',
    domain: '',
    notes: '',
})

function termToForm(t: Term): TermFormState {
    return {
        source_term: t.source_term,
        target_term: t.target_term,
        reading: t.reading ?? '',
        domain: t.domain ?? '',
        notes: t.notes ?? '',
    }
}

// ---------------------------------------------------------------------------
// Term form modal (shared by create + edit)
// ---------------------------------------------------------------------------

function TermFormModal({
    initial,
    onSave,
    onCancel,
    saving,
    error,
}: {
    initial: TermFormState
    onSave: (form: TermFormState) => void
    onCancel: () => void
    saving: boolean
    error: string | null
}) {
    const [form, setForm] = useState<TermFormState>(initial)

    const set = (field: keyof TermFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [field]: e.target.value }))

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
            <div
                className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {initial.source_term ? 'Edit Term' : 'New Term'}
                </h2>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Japanese (Source) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.source_term}
                            onChange={set('source_term')}
                            placeholder="e.g. 竹刀"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Reading (Romaji / Kana)
                        </label>
                        <input
                            type="text"
                            value={form.reading}
                            onChange={set('reading')}
                            placeholder="e.g. shinai"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            English (Target) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.target_term}
                            onChange={set('target_term')}
                            placeholder="e.g. bamboo sword"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Domain
                        </label>
                        <input
                            type="text"
                            value={form.domain}
                            onChange={set('domain')}
                            placeholder="e.g. equipment, technique, etiquette…"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={form.notes}
                            onChange={set('notes')}
                            rows={2}
                            placeholder="Optional translation notes…"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                        />
                    </div>
                </div>

                {error && (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
                )}

                <div className="mt-5 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={saving}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onSave(form)}
                        disabled={saving || !form.source_term.trim() || !form.target_term.trim()}
                        className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TerminologyPage() {
    const [terms, setTerms] = useState<Term[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    // Modal state
    const [creating, setCreating] = useState(false)
    const [editing, setEditing] = useState<Term | null>(null)
    const [saving, setSaving] = useState(false)
    const [modalError, setModalError] = useState<string | null>(null)

    // Delete confirmation
    const [deleting, setDeleting] = useState<string | null>(null) // term id

    // -----------------------------------------------------------------------
    // Data + auth
    // -----------------------------------------------------------------------

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Check auth + role
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .maybeSingle()
                    setIsAdmin(profile?.role === 'admin')
                }

                // Fetch terms
                const res = await fetch('/api/terminology')
                if (res.ok) {
                    const data = await res.json()
                    setTerms(data.terms || [])
                }
            } catch (error) {
                console.error('Error fetching terminology:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // -----------------------------------------------------------------------
    // CRUD handlers
    // -----------------------------------------------------------------------

    const handleCreate = useCallback(async (form: TermFormState) => {
        setSaving(true)
        setModalError(null)
        try {
            const res = await fetch('/api/terminology', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (!res.ok) {
                const err = await res.json()
                setModalError(err.error ?? 'Failed to create term')
                return
            }
            const { term } = await res.json()
            setTerms(prev => [...prev, term].sort((a, b) => a.source_term.localeCompare(b.source_term)))
            setCreating(false)
        } finally {
            setSaving(false)
        }
    }, [])

    const handleEdit = useCallback(async (form: TermFormState) => {
        if (!editing) return
        setSaving(true)
        setModalError(null)
        try {
            const res = await fetch(`/api/terminology/${editing.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (!res.ok) {
                const err = await res.json()
                setModalError(err.error ?? 'Failed to update term')
                return
            }
            const { term } = await res.json()
            setTerms(prev => prev.map(t => t.id === term.id ? term : t))
            setEditing(null)
        } finally {
            setSaving(false)
        }
    }, [editing])

    const handleDelete = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/terminology/${id}`, { method: 'DELETE' })
            if (res.ok) {
                setTerms(prev => prev.filter(t => t.id !== id))
            }
        } finally {
            setDeleting(null)
        }
    }, [])

    // -----------------------------------------------------------------------
    // Filter
    // -----------------------------------------------------------------------

    const filtered = search
        ? terms.filter(t =>
            t.source_term.includes(search) ||
            t.target_term.toLowerCase().includes(search.toLowerCase()) ||
            (t.reading && t.reading.includes(search)) ||
            (t.domain && t.domain.toLowerCase().includes(search.toLowerCase()))
        )
        : terms

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Terminology</h1>
                <div className="animate-pulse space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Create modal */}
            {creating && (
                <TermFormModal
                    initial={emptyForm()}
                    onSave={handleCreate}
                    onCancel={() => { setCreating(false); setModalError(null) }}
                    saving={saving}
                    error={modalError}
                />
            )}

            {/* Edit modal */}
            {editing && (
                <TermFormModal
                    initial={termToForm(editing)}
                    onSave={handleEdit}
                    onCancel={() => { setEditing(null); setModalError(null) }}
                    saving={saving}
                    error={modalError}
                />
            )}

            {/* Delete confirmation */}
            {deleting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleting(null)}>
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4"
                        onClick={e => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Delete Term?</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                            This will permanently remove the term from the glossary. This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleting(null)}
                                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(deleting)}
                                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terminology</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {filtered.length} of {terms.length} terms
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => { setCreating(true); setModalError(null) }}
                            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
                        >
                            + New Term
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="mb-4">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search terms…"
                        className="w-full max-w-md px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-300 focus:outline-none"
                    />
                </div>

                {/* Terms table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Japanese</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Reading</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">English</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Domain</th>
                                {isAdmin && (
                                    <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.slice(0, 100).map((term) => (
                                <tr key={term.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-3 text-sm font-medium text-gray-900 dark:text-white">{term.source_term}</td>
                                    <td className="p-3 text-sm text-gray-500 dark:text-gray-400">{term.reading || '—'}</td>
                                    <td className="p-3 text-sm text-gray-900 dark:text-white">{term.target_term}</td>
                                    <td className="p-3 text-xs text-gray-400">{term.domain || '—'}</td>
                                    {isAdmin && (
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditing(term); setModalError(null) }}
                                                    className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleting(term.id)}
                                                    className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length > 100 && (
                        <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                            Showing 100 of {filtered.length} terms. Use search to narrow results.
                        </div>
                    )}
                    {filtered.length === 0 && !loading && (
                        <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">
                            {search ? `No terms matching "${search}"` : 'No terms in the glossary yet.'}
                            {isAdmin && !search && (
                                <button
                                    type="button"
                                    onClick={() => { setCreating(true); setModalError(null) }}
                                    className="mt-2 block mx-auto text-blue-600 hover:underline"
                                >
                                    Add the first term
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
