/**
 * useArticleAggregates — fetches the three article-level cooperation
 * rollups (suggestions / comments / QA issues) built by Phase 1's
 * aggregation endpoints.
 *
 * Unlike the per-segment drawer panels, these are article-WIDE views with
 * per-segment context attached. They are fetched once on mount (no realtime
 * subscription) to avoid subscription churn when the sidebar collapses /
 * expands — the data is instead refreshed on demand via `refresh()`.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'

/** Per-segment context attached to each aggregated record (Phase 1 shape). */
export interface SegmentContext {
    segment_id: string
    position: number
    source_preview: string | null
    target_preview: string | null
    status: string
    target_lang: string
}

export interface ArticleSuggestion {
    id: string
    proposed_text: string
    status: string
    suggester_kind: string
    suggester_name: string | null
    created_at: string | null
    segment_context: SegmentContext
}

export interface ArticleComment {
    id: string
    content: string
    resolved: boolean
    parent_comment_id: string | null
    author_name: string | null
    created_at: string | null
    segment_context: SegmentContext
}

export interface ArticleQAIssue {
    id: string
    category: string
    severity: string
    body: string | null
    resolved: boolean
    author_name: string | null
    created_at: string | null
    segment_context: SegmentContext
}

interface Paged<T> {
    items: T[]
}

export interface UseArticleAggregatesResult {
    suggestions: ArticleSuggestion[]
    comments: ArticleComment[]
    qaIssues: ArticleQAIssue[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
}

export function useArticleAggregates(articleId: string): UseArticleAggregatesResult {
    const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([])
    const [comments, setComments] = useState<ArticleComment[]>([])
    const [qaIssues, setQaIssues] = useState<ArticleQAIssue[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        setError(null)
        try {
            const fetchPaged = async <T,>(path: string): Promise<T[]> => {
                const res = await fetch(path)
                if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`)
                const data = (await res.json()) as Paged<T>
                return data.items ?? []
            }
            const [s, c, q] = await Promise.all([
                fetchPaged<ArticleSuggestion>(`/api/documents/${articleId}/suggestions`),
                fetchPaged<ArticleComment>(`/api/documents/${articleId}/comments`),
                fetchPaged<ArticleQAIssue>(`/api/documents/${articleId}/qa-issues`),
            ])
            setSuggestions(s)
            setComments(c)
            setQaIssues(q)
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setLoading(false)
        }
    }, [articleId])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { suggestions, comments, qaIssues, loading, error, refresh }
}

export default useArticleAggregates
