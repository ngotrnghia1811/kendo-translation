'use client'

import { useEffect, useState } from 'react'

interface Term {
    id: string
    source_term: string
    target_term: string
    reading: string | null
    domain: string | null
    notes: string | null
}

export default function TerminologyPage() {
    const [terms, setTerms] = useState<Term[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTerms = async () => {
            try {
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
        fetchTerms()
    }, [])

    const filtered = search
        ? terms.filter(t =>
            t.source_term.includes(search) ||
            t.target_term.toLowerCase().includes(search.toLowerCase()) ||
            (t.reading && t.reading.includes(search))
        )
        : terms

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
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terminology</h1>
                <span className="text-sm text-gray-500">{filtered.length} terms</span>
            </div>

            {/* Search */}
            <div className="mb-4">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search terms..."
                    className="w-full max-w-md px-3 py-2 rounded border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-300 focus:outline-none"
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
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.slice(0, 100).map((term) => (
                            <tr key={term.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm font-medium text-gray-900 dark:text-white">{term.source_term}</td>
                                <td className="p-3 text-sm text-gray-500">{term.reading || '—'}</td>
                                <td className="p-3 text-sm text-gray-900 dark:text-white">{term.target_term}</td>
                                <td className="p-3 text-xs text-gray-400">{term.domain || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length > 100 && (
                    <div className="p-3 text-center text-sm text-gray-500">
                        Showing 100 of {filtered.length} terms. Use search to narrow results.
                    </div>
                )}
            </div>
        </div>
    )
}
