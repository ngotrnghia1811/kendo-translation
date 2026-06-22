/**
 * app/api/search/route.ts
 *
 * Global full-text search across articles and segments.
 *
 * GET /api/search?q=<query>[&scope=articles|segments|both][&limit=<n>]
 *
 * - `q`      — required; minimum 2 characters
 * - `scope`  — "articles" | "segments" | "both" (default: "both")
 * - `limit`  — max results per category, 1–50 (default: 20)
 *
 * Authentication required (any role). Returns a JSON object:
 * {
 *   query: string,
 *   articles: ArticleHit[],
 *   segments: SegmentHit[],
 * }
 *
 * ArticleHit: { id, title, segment_count, snippet: string | null }
 * SegmentHit: { id, article_id, article_title, position, source_snippet, target_snippet, status }
 *
 * Phase 1.2f: Segment search now uses the search_segments RPC (GIN trigram index)
 * instead of PostgREST .ilike('%term%') full-table scans.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface ArticleHit {
    id: string
    title: string
    segment_count: number
    /** First matched segment text, truncated to ~200 chars */
    snippet: string | null
}

export interface SegmentHit {
    id: string
    article_id: string
    article_title: string
    position: number
    source_snippet: string | null
    target_snippet: string | null
    status: string
}

export interface SearchResponse {
    query: string
    articles: ArticleHit[]
    segments: SegmentHit[]
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const q = (searchParams.get('q') ?? '').trim()
    if (q.length < 2) {
        return NextResponse.json(
            { error: 'Query must be at least 2 characters' },
            { status: 400 },
        )
    }

    const rawScope = searchParams.get('scope') ?? 'both'
    const scope = ['articles', 'segments', 'both'].includes(rawScope) ? rawScope : 'both'
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const pattern = `%${q}%`

    const articleHits: ArticleHit[] = []
    const segmentHits: SegmentHit[] = []

    // -------------------------------------------------------------------------
    // Articles — search by title (ilike is fine for ~993 articles)
    // -------------------------------------------------------------------------
    if (scope === 'articles' || scope === 'both') {
        const { data: articles, error: aErr } = await supabase
            .from('articles')
            .select('id, title, segment_count')
            .ilike('title', pattern)
            .limit(limit)

        if (aErr) {
            return NextResponse.json({ error: aErr.message }, { status: 500 })
        }

        // For each matching article, grab its first translated/qa_approved segment
        // as a snippet so users can preview the content.
        const articleList = articles ?? []
        if (articleList.length > 0) {
            const articleIds = articleList.map(a => a.id)
            // Fetch one representative target_text segment per article.
            const { data: snippetRows } = await supabase
                .from('segments')
                .select('article_id, target_text')
                .in('article_id', articleIds)
                .in('status', ['translated', 'edited', 'proofread', 'qa_approved'])
                .not('target_text', 'is', null)
                .order('position', { ascending: true })
                .limit(articleIds.length * 3) // grab a few per article, dedupe below

            const snippetMap = new Map<string, string>()
            for (const row of snippetRows ?? []) {
                if (!snippetMap.has(row.article_id) && row.target_text) {
                    snippetMap.set(row.article_id, row.target_text)
                }
            }

            for (const a of articleList) {
                articleHits.push({
                    id: a.id,
                    title: a.title,
                    segment_count: a.segment_count ?? 0,
                    snippet: snippetMap.get(a.id) ?? null,
                })
            }
        }
    }

    // -------------------------------------------------------------------------
    // Segments — search via search_segments RPC (GIN trigram index)
    // -------------------------------------------------------------------------
    if (scope === 'segments' || scope === 'both') {
        const { data: segData, error: segErr } = await supabase.rpc(
            'search_segments',
            { p_query: q, p_limit: limit },
        )

        if (segErr) {
            return NextResponse.json({ error: segErr.message }, { status: 500 })
        }

        const rows = segData ?? []
        for (const s of rows) {
            segmentHits.push({
                id: s.id,
                article_id: s.article_id,
                article_title: s.article_title,
                position: s.position,
                source_snippet: s.source_snippet,
                target_snippet: s.target_snippet,
                status: s.status,
            })
        }
    }

    const response: SearchResponse = {
        query: q,
        articles: articleHits,
        segments: segmentHits,
    }

    return NextResponse.json(response)
}
