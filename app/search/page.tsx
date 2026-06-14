'use client'

/**
 * app/search/page.tsx
 *
 * Global search across all articles and segments in the database.
 * Accessible at /search. Authentication is required — unauthenticated
 * users are redirected server-side; this page relies on the middleware
 * for that (or alternatively the API returning 401).
 *
 * Note: useSearchParams() is wrapped in <Suspense> (via SearchPageInner)
 * to satisfy Next.js App Router static generation requirements.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ArticleHit, SearchResponse, SegmentHit } from '@/app/api/search/route'

type Scope = 'both' | 'articles' | 'segments'

const SCOPE_LABELS: Record<Scope, string> = {
    both: 'All',
    articles: 'Articles',
    segments: 'Segments',
}

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    translated: 'bg-blue-100 text-blue-700',
    edited: 'bg-yellow-100 text-yellow-700',
    proofread: 'bg-purple-100 text-purple-700',
    qa_approved: 'bg-green-100 text-green-700',
}

// Highlight all occurrences of `query` in `text` (case-insensitive).
function Highlighted({ text, query }: { text: string; query: string }) {
    if (!query.trim()) return <>{text}</>
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase()
                    ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-[2px] px-[1px]">{part}</mark>
                    : part
            )}
        </>
    )
}

function SearchPageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const initialQ = searchParams.get('q') ?? ''
    const initialScope = (searchParams.get('scope') as Scope) ?? 'both'

    const [query, setQuery] = useState(initialQ)
    const [scope, setScope] = useState<Scope>(initialScope)
    const [results, setResults] = useState<SearchResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<'admin' | 'translator' | 'reader' | null>(null)

    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Fetch user role to show "Edit" links for translator/admin.
    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => r.json())
            .then((d: { profile?: { role?: string } }) => {
                const role = d.profile?.role
                if (role === 'admin' || role === 'translator' || role === 'reader') {
                    setUserRole(role)
                }
            })
            .catch(() => null)
    }, [])

    const doSearch = useCallback(async (q: string, sc: Scope) => {
        if (q.trim().length < 2) {
            setResults(null)
            return
        }
        setLoading(true)
        setError(null)
        try {
            const url = `/api/search?q=${encodeURIComponent(q.trim())}&scope=${sc}&limit=20`
            const res = await fetch(url)
            if (res.status === 401) {
                router.push(`/login?next=/search?q=${encodeURIComponent(q.trim())}`)
                return
            }
            if (!res.ok) {
                const json = await res.json().catch(() => ({}))
                throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`)
            }
            setResults(await res.json() as SearchResponse)
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setLoading(false)
        }
    }, [router])

    // Run search on mount if q is pre-populated from URL.
    useEffect(() => {
        if (initialQ.trim().length >= 2) {
            void doSearch(initialQ, initialScope)
        }
        inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Debounced search as user types.
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            void doSearch(query, scope)
            // Update URL without triggering navigation.
            const params = new URLSearchParams()
            if (query.trim()) params.set('q', query.trim())
            if (scope !== 'both') params.set('scope', scope)
            const qs = params.toString()
            window.history.replaceState(null, '', `/search${qs ? `?${qs}` : ''}`)
        }, 350)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, scope])

    const totalHits = (results?.articles.length ?? 0) + (results?.segments.length ?? 0)

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
                    <Link href="/documents" className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                        {/* Back arrow */}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            ref={inputRef}
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search articles and segments…"
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            aria-label="Search query"
                        />
                    </div>
                    {/* Scope tabs */}
                    <div className="hidden sm:flex gap-1 shrink-0">
                        {(Object.keys(SCOPE_LABELS) as Scope[]).map(s => (
                            <button
                                key={s}
                                onClick={() => setScope(s)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    scope === s
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                {SCOPE_LABELS[s]}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Mobile scope row */}
                <div className="sm:hidden flex gap-1 px-4 pb-3">
                    {(Object.keys(SCOPE_LABELS) as Scope[]).map(s => (
                        <button
                            key={s}
                            onClick={() => setScope(s)}
                            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                                scope === s
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                    : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {SCOPE_LABELS[s]}
                        </button>
                    ))}
                </div>
            </header>

            {/* Results */}
            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

                {/* Loading */}
                {loading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Searching…
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Empty query hint */}
                {!loading && !error && !results && query.trim().length < 2 && (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">🔍</div>
                        <p className="text-gray-500 text-sm">
                            Type at least 2 characters to search across all kendo articles and segment translations.
                        </p>
                    </div>
                )}

                {/* No results */}
                {!loading && !error && results && totalHits === 0 && (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">🤷</div>
                        <p className="text-gray-700 font-medium">No results for &ldquo;{results.query}&rdquo;</p>
                        <p className="text-gray-500 text-sm mt-1">Try different keywords or broaden the scope.</p>
                    </div>
                )}

                {/* Article hits */}
                {!loading && results && results.articles.length > 0 && (
                    <section>
                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Articles ({results.articles.length})
                        </h2>
                        <ul className="space-y-2">
                            {results.articles.map((a: ArticleHit) => (
                                <li key={a.id}>
                                    <Link
                                        href={`/documents/${a.id}/read`}
                                        className="block bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700 truncate">
                                                    <Highlighted text={a.title} query={query} />
                                                </p>
                                                {a.segment_count > 0 && (
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {a.segment_count.toLocaleString()} segments
                                                    </p>
                                                )}
                                            </div>
                                            <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Segment hits */}
                {!loading && results && results.segments.length > 0 && (
                    <section>
                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Segments ({results.segments.length})
                        </h2>
                        <ul className="space-y-2">
                            {results.segments.map((s: SegmentHit) => (
                                <li key={s.id}>
                                    <Link
                                        href={`/documents/${s.article_id}/read`}
                                        className="block bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group"
                                    >
                                        {/* Article name + position */}
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="text-xs font-medium text-indigo-600 truncate group-hover:underline">
                                                {s.article_title}
                                            </span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs text-gray-400">§{s.position}</span>
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                    {s.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Source text */}
                                        {s.source_snippet && (
                                            <p className="text-sm text-gray-700 line-clamp-2 mb-1">
                                                <Highlighted text={s.source_snippet} query={query} />
                                            </p>
                                        )}
                                        {/* Target text */}
                                        {s.target_snippet && (
                                            <p className="text-xs text-gray-500 line-clamp-2 italic">
                                                <Highlighted text={s.target_snippet} query={query} />
                                            </p>
                                        )}
                                    </Link>
                                    {/* Edit link for translators/admins */}
                                    {(userRole === 'admin' || userRole === 'translator') && (
                                        <div className="px-4 pb-3 -mt-1">
                                            <Link
                                                href={`/documents/${s.article_id}/edit`}
                                                className="text-[11px] text-indigo-500 hover:text-indigo-700 hover:underline font-medium"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                Edit →
                                            </Link>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Summary footer */}
                {!loading && results && totalHits > 0 && (
                    <p className="text-center text-xs text-gray-400 pt-2">
                        Showing up to 20 results per category for &ldquo;{results.query}&rdquo;
                    </p>
                )}
            </main>
        </div>
    )
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-sm text-gray-500">Loading search…</div>
            </div>
        }>
            <SearchPageInner />
        </Suspense>
    )
}
