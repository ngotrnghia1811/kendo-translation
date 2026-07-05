'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Article } from '@/types/database'
import type { SortBy, SortDir } from '@/lib/supabase/feed-cursor'
import { useTitleLanguage } from '@/hooks/useTitleLanguage'

type StatusFilter = 'all' | 'in_progress' | 'complete'

interface SortOption {
  sortBy: SortBy
  sortDir: SortDir
  label: string
}

const SORT_OPTIONS: SortOption[] = [
  { sortBy: 'title',   sortDir: 'asc',  label: 'Title A–Z' },
  { sortBy: 'title',   sortDir: 'desc', label: 'Title Z–A' },
  { sortBy: 'segment_count', sortDir: 'desc', label: 'Longest first' },
  { sortBy: 'segment_count', sortDir: 'asc',  label: 'Shortest first' },
  { sortBy: 'status',  sortDir: 'desc', label: 'Most translated' },
  { sortBy: 'status',  sortDir: 'asc',  label: 'Least translated' },
  { sortBy: 'created_at', sortDir: 'desc', label: 'Newest first' },
  { sortBy: 'created_at', sortDir: 'asc',  label: 'Oldest first' },
]

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete',    label: 'Completed' },
]

function filterByStatus(articles: Article[], status: StatusFilter): Article[] {
  if (status === 'all') return articles
  return articles.filter((a) => a.translation_status === status)
}

interface DocumentsListProps {
  articles: Article[]
  userEmail: string
  /** Phase 1.2g: keyset pagination cursor for "Load more" link */
  nextCursor?: string | null
  /** Current server-side sort params (for rendering the select) */
  currentSortBy?: SortBy
  currentSortDir?: SortDir
  /** Server-side search term for document title (from URL param q=) */
  searchTerm?: string | null
}

export default function DocumentsList({ articles, userEmail, nextCursor, currentSortBy = 'created_at', currentSortDir = 'desc', searchTerm = null }: DocumentsListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState(searchTerm ?? '')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Bilingual title toggle ──────────────────────────────────────────────
  const { titleLanguage, toggleTitleLanguage } = useTitleLanguage()

  // Sync search input with URL when searchTerm prop changes (e.g. back-button)
  useEffect(() => {
    setSearchQuery(searchTerm ?? '')
  }, [searchTerm])

  // Debounced search: update URL param to trigger server-side re-fetch
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      // Preserve current sort params
      const sp = new URLSearchParams(searchParams.toString())
      const sortBy = sp.get('sort_by')
      const sortDir = sp.get('sort_dir')
      if (sortBy) params.set('sort_by', sortBy)
      if (sortDir) params.set('sort_dir', sortDir)
      // Set/clear search term (no cursor → fresh page 1)
      if (value.trim()) {
        params.set('q', value.trim())
      }
      // replace without cursor so server does a fresh first page
      router.replace(`/documents?${params.toString()}`)
      debounceRef.current = null
    }, 350)
  }, [router, searchParams])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // Build a URL that preserves sort + filter state for "Load more" links
  const buildNextUrl = useCallback((cursor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('cursor', cursor)
    return `/documents?${params.toString()}`
  }, [searchParams])

  // When sort select changes, update URL params (resets cursor → fresh server fetch)
  const handleSortChange = useCallback((sortBy: SortBy, sortDir: SortDir) => {
    const params = new URLSearchParams()
    params.set('sort_by', sortBy)
    params.set('sort_dir', sortDir)
    // No cursor → fresh page 1
    router.replace(`/documents?${params.toString()}`)
  }, [router])

  // Derive current sort option value for the select
  const currentSortValue = `${currentSortBy}|${currentSortDir}`

  // Only status filter is client-side; search is server-side (articles already filtered)
  const filtered = useMemo(() => filterByStatus(articles, statusFilter), [articles, statusFilter])

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-xl font-bold text-[var(--color-text)]">All Documents</h2>

          {/* Sort + filter controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter pills */}
            <div className="flex gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                    statusFilter === f.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'text-[var(--rt-text-muted)] border-[var(--rt-border)] hover:bg-[var(--rt-surface)] bg-[var(--rt-surface)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort select — triggers server re-fetch via URL params */}
            <select
              data-testid="documents-sort"
              value={currentSortValue}
              onChange={(e) => {
                const [sortBy, sortDir] = e.target.value.split('|') as [SortBy, SortDir]
                handleSortChange(sortBy, sortDir)
              }}
              className="text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={`${opt.sortBy}|${opt.sortDir}`} value={`${opt.sortBy}|${opt.sortDir}`}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search bar — triggers server-side search via URL param */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search documents by title…"
            className="w-full max-w-md px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-[var(--color-text-muted)]"
          />
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="ml-2 text-xs text-blue-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-[var(--color-text-muted)]">
            <span className="text-5xl block mb-4">📄</span>
            <p className="text-lg font-medium text-[var(--color-text)] mb-2">No documents yet</p>
            <p className="text-sm">Documents will appear here once they are added.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {filtered.map((doc) => (
                <div key={doc.id} className="rounded-xl border p-4 sm:p-5 bg-[var(--rt-surface)] border-[var(--rt-border)] hover:border-[var(--rt-text-muted)] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {/* Expand affordance for books — clickable title to reveal author + summary */}
                        {doc.doc_type === 'book' && (doc.author || doc.summary) ? (
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                            className="flex items-center gap-1 text-left group min-w-0"
                          >
                            <h3 className="font-semibold text-[var(--rt-text)] truncate group-hover:text-blue-600 transition-colors">
                              {titleLanguage === 'ja' && doc.title_ja ? doc.title_ja : doc.title}
                            </h3>
                            <svg
                              className={`w-3.5 h-3.5 shrink-0 text-[var(--rt-text-muted)] transition-transform ${expandedId === doc.id ? 'rotate-180' : ''}`}
                              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>
                        ) : (
                          <h3 className="font-semibold text-[var(--rt-text)] truncate">
                            {titleLanguage === 'ja' && doc.title_ja ? doc.title_ja : doc.title}
                          </h3>
                        )}
                        {doc.title_ja && (
                          <button
                            type="button"
                            onClick={toggleTitleLanguage}
                            title={`Toggle title language (currently ${titleLanguage === 'en' ? 'English' : 'Japanese'})`}
                            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border transition-colors leading-none"
                            style={{
                              backgroundColor: titleLanguage === 'ja' ? '#3b82f6' : 'var(--rt-surface)',
                              borderColor: titleLanguage === 'ja' ? '#3b82f6' : 'var(--rt-border)',
                              color: titleLanguage === 'ja' ? '#fff' : 'var(--rt-text-muted)',
                            }}
                          >
                            {titleLanguage === 'en' ? '日' : 'EN'}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          doc.translation_status === 'complete' || doc.translation_status === 'qa_approved'
                            ? 'bg-green-100 text-green-700'
                            : doc.translation_status === 'in_progress' || doc.translation_status === 'translated'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {doc.translation_status === 'qa_approved' ? 'complete' : doc.translation_status || 'pending'}
                        </span>
                        {(doc.segment_count ?? 0) > 0 && (
                          <span className="text-xs text-[var(--rt-text-muted)]">{doc.segment_count} segments</span>
                        )}
                      </div>
                      {/* Expandable author + summary for books */}
                      {doc.doc_type === 'book' && expandedId === doc.id && (
                        <div className="mt-2 pl-1 border-l-2 border-blue-300 dark:border-blue-700">
                          {doc.author && (
                            <p className="text-xs text-[var(--rt-text-muted)] mb-1">
                              <span className="font-medium">Author:</span> {doc.author}
                            </p>
                          )}
                          {doc.summary && (
                            <p className="text-xs text-[var(--rt-text-muted)] leading-relaxed">
                              {doc.summary}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/documents/${doc.id}/read`}
                        prefetch
                        className="text-xs px-3 py-1.5 border rounded-lg border-[var(--rt-border)] hover:bg-[var(--rt-surface)] transition-colors text-[var(--rt-text-muted)]"
                      >
                        Read
                      </Link>
                      <Link
                        href={`/documents/${doc.id}/edit`}
                        prefetch
                        className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Phase 1.2g: keyset pagination "Load more" (preserves sort params) */}
            {nextCursor && (
              <div className="mt-6 text-center">
                <Link
                  href={buildNextUrl(nextCursor)}
                  className="inline-block px-6 py-3 text-sm font-medium rounded-lg border border-[var(--rt-border)] hover:bg-[var(--rt-surface)] transition-colors text-[var(--rt-text-muted)]"
                >
                  Load more documents →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
