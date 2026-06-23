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
import { createClient } from '@/lib/supabase/client'

/** A raw segment row fetched for context display. */
interface ContextSegment {
    id: string
    position: number
    source_text: string
}

/** Lazy-fetched context preview panel for a segment hit.
 *  On first open, fetches 3 segments (prev, current, next) from Supabase
 *  and renders them with the current segment highlighted. */
function SegmentContextPanel({
    articleId,
    position,
    query,
    sourceSnippet,
}: {
    articleId: string
    position: number
    query: string
    sourceSnippet: string | null
}) {
    const [open, setOpen] = useState(false)
    const [context, setContext] = useState<ContextSegment[] | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadContext = useCallback(async () => {
        if (context || loading) return
        setLoading(true)
        setError(null)
        try {
            const supabase = createClient()
            const { data, error: se } = await supabase
                .from('segments')
                .select('id, position, source_text')
                .eq('article_id', articleId)
                .in('position', [position - 1, position, position + 1])
                .order('position', { ascending: true })
            if (se) throw new Error(se.message)
            setContext((data ?? []) as ContextSegment[])
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setLoading(false)
        }
    }, [articleId, position, context, loading])

    const toggle = useCallback(() => {
        setOpen((o) => {
            if (!o) loadContext()
            return !o
        })
    }, [loadContext])

    const current = context?.find((s) => s.position === position)

    return (
        <div className="mt-2">
            <button
                type="button"
                data-testid="search-context-toggle"
                onClick={toggle}
                className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline font-medium"
            >
                {open ? 'Context ▾' : 'Context ▸'}
            </button>
            {open && (
                <div className="mt-2 text-xs space-y-1.5 border-l-2 border-indigo-200 pl-3">
                    {loading && (
                        <p className="text-[var(--color-text-muted)] italic">Loading context…</p>
                    )}
                    {error && (
                        <p className="text-red-500">Failed to load context: {error}</p>
                    )}
                    {context && !loading && !error && (
                        <>
                            {context
                                .filter((s) => s.position < position)
                                .map((s) => (
                                    <p key={s.id} className="text-[var(--color-text-muted)] line-clamp-2">
                                        <Highlighted text={s.source_text} query={query} />
                                    </p>
                                ))}
                            {current && (
                                <p className="text-[var(--color-text)] font-medium bg-yellow-50/50 rounded px-1 -mx-1">
                                    <Highlighted text={current.source_text} query={query} />
                                </p>
                            )}
                            {context
                                .filter((s) => s.position > position)
                                .map((s) => (
                                    <p key={s.id} className="text-[var(--color-text-muted)] line-clamp-2">
                                        <Highlighted text={s.source_text} query={query} />
                                    </p>
                                ))}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

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
        <div className="min-h-screen">
            {/* Header */}
            <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
                    <Link href="/documents" className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                        {/* Back arrow */}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            ref={inputRef}
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search articles and segments…"
                            className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-[var(--color-text)]"
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
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]'
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
                                    : 'text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-bg)]'
                            }`}
                        >
                            {SCOPE_LABELS[s]}
                        </button>
                    ))}
                </div>
            </header>

            {/* Results — semantic <div> instead of <main> to avoid nesting with layout <main> */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

                {/* Loading */}
                {loading && (
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
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
                        <p className="text-[var(--color-text-muted)] text-sm">
                            Type at least 2 characters to search across all kendo articles and segment translations.
                        </p>
                    </div>
                )}

                {/* No results */}
                {!loading && !error && results && totalHits === 0 && (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">🤷</div>
                        <p className="text-[var(--color-text)] font-medium">No results for &ldquo;{results.query}&rdquo;</p>
                        <p className="text-[var(--color-text-muted)] text-sm mt-1">Try different keywords or broaden the scope.</p>
                    </div>
                )}

                {/* Article hits */}
                {!loading && results && results.articles.length > 0 && (
                    <section>
                        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
                            Articles ({results.articles.length})
                        </h2>
                        <ul className="space-y-2">
                            {results.articles.map((a: ArticleHit) => (
                                <li key={a.id}>
                                    <Link
                                        href={`/documents/${a.id}/read`}
                                        className="block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-[var(--color-text)] group-hover:text-indigo-700 truncate">
                                                    <Highlighted text={a.title} query={query} />
                                                </p>
                                                {a.segment_count > 0 && (
                                                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                                        {a.segment_count.toLocaleString()} segments
                                                    </p>
                                                )}
                                            </div>
                                            <svg className="w-4 h-4 text-[var(--color-text-muted)]/40 group-hover:text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
                            Segments ({results.segments.length})
                        </h2>
                        <ul className="space-y-2">
                            {results.segments.map((s: SegmentHit) => (
                                <li key={s.id}>
                                    <Link
                                        href={`/documents/${s.article_id}/read`}
                                        className="block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group"
                                    >
                                        {/* Article name + position */}
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="text-xs font-medium text-indigo-600 truncate group-hover:underline">
                                                {s.article_title}
                                            </span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs text-[var(--color-text-muted)]">§{s.position}</span>
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                    {s.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Source text */}
                                        {s.source_snippet && (
                                            <p className="text-sm text-[var(--color-text)] line-clamp-2 mb-1">
                                                <Highlighted text={s.source_snippet} query={query} />
                                            </p>
                                        )}
                                        {/* Target text */}
                                        {s.target_snippet && (
                                            <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 italic">
                                                <Highlighted text={s.target_snippet} query={query} />
                                            </p>
                                        )}
                                    </Link>
                                    {/* Context preview */}
                                    <div className="px-4 pb-2 -mt-1">
                                        <SegmentContextPanel
                                            articleId={s.article_id}
                                            position={s.position}
                                            query={query}
                                            sourceSnippet={s.source_snippet}
                                        />
                                    </div>
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
                    <p className="text-center text-xs text-[var(--color-text-muted)] pt-2">
                        Showing up to 20 results per category for &ldquo;{results.query}&rdquo;
                    </p>
                )}
            </div>
        </div>
    )
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-sm text-[var(--color-text-muted)]">Loading search…</div>
            </div>
        }>
            <SearchPageInner />
        </Suspense>
    )
}
