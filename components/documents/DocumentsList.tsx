'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import type { Article } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

type SortKey = 'name_asc' | 'name_desc' | 'length_desc' | 'length_asc' | 'progress_desc' | 'progress_asc' | 'recently-viewed'
type StatusFilter = 'all' | 'in_progress' | 'complete'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name_asc',      label: 'Title A–Z' },
  { value: 'name_desc',     label: 'Title Z–A' },
  { value: 'length_desc',   label: 'Longest first' },
  { value: 'length_asc',    label: 'Shortest first' },
  { value: 'progress_desc', label: 'Most translated' },
  { value: 'progress_asc',  label: 'Least translated' },
  { value: 'recently-viewed', label: 'Recently Viewed' },
]

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete',    label: 'Completed' },
]

/** Map translation_status to an ordinal for sorting. */
function statusOrdinal(status: string | null): number {
  switch (status) {
    case 'complete':     return 2
    case 'in_progress':  return 1
    default:             return 0 // 'pending' or null
  }
}

function sortArticles(articles: Article[], key: SortKey, viewMap?: Map<string, string>): Article[] {
  const sorted = [...articles]
  switch (key) {
    case 'name_asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'name_desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title))
    case 'length_desc':
      return sorted.sort((a, b) => (b.segment_count ?? 0) - (a.segment_count ?? 0))
    case 'length_asc':
      return sorted.sort((a, b) => (a.segment_count ?? 0) - (b.segment_count ?? 0))
    case 'progress_desc':
      return sorted.sort((a, b) => statusOrdinal(b.translation_status) - statusOrdinal(a.translation_status))
    case 'progress_asc':
      return sorted.sort((a, b) => statusOrdinal(a.translation_status) - statusOrdinal(b.translation_status))
    case 'recently-viewed':
      return sorted.sort((a, b) => {
        const aTime = viewMap?.get(a.id) ?? ''
        const bTime = viewMap?.get(b.id) ?? ''
        if (aTime === bTime) return 0
        if (!aTime) return 1    // no view record → sort last
        if (!bTime) return -1
        return bTime.localeCompare(aTime) // desc by updated_at
      })
  }
}

function filterByStatus(articles: Article[], status: StatusFilter): Article[] {
  if (status === 'all') return articles
  return articles.filter((a) => a.translation_status === status)
}

interface DocumentsListProps {
  articles: Article[]
  userEmail: string
}

export default function DocumentsList({ articles, userEmail }: DocumentsListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name_asc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [viewMap, setViewMap] = useState<Map<string, string>>(new Map())

  // Fetch reading_progress on mount for recently-viewed sort
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('reading_progress')
        .select('content_id, updated_at')
        .eq('content_type', 'article')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (error || !data) return
          const map = new Map<string, string>()
          for (const row of data as { content_id: string; updated_at: string }[]) {
            map.set(row.content_id, row.updated_at)
          }
          setViewMap(map)
        })
    })
  }, [])

  const filtered = useMemo(() => filterByStatus(articles, statusFilter), [articles, statusFilter])
  const sorted = useMemo(() => sortArticles(filtered, sortKey, viewMap), [filtered, sortKey, viewMap])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/" className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 shrink-0">
              <span>⚔️</span>
              <span className="hidden sm:inline">Kendo Translation</span>
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800 truncate">Documents</span>
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
            title="Your profile"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0 group-hover:bg-blue-200 transition-colors">
              {userEmail[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="hidden sm:inline">{userEmail.split('@')[0]}</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-xl font-bold text-gray-900">All Documents</h2>

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
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort select */}
            <select
              data-testid="documents-sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="text-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <span className="text-5xl block mb-4">📄</span>
            <p className="text-lg font-medium text-gray-900 mb-2">No documents yet</p>
            <p className="text-sm">Documents will appear here once they are added.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sorted.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        doc.translation_status === 'complete'
                          ? 'bg-green-100 text-green-700'
                          : doc.translation_status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {doc.translation_status || 'pending'}
                      </span>
                      {(doc.segment_count ?? 0) > 0 && (
                        <span className="text-xs text-gray-500">{doc.segment_count} segments</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/documents/${doc.id}/read`}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                    >
                      Read
                    </Link>
                    <Link
                      href={`/documents/${doc.id}/edit`}
                      className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
