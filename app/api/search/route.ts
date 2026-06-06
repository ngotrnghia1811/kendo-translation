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
 * Uses PostgREST `.ilike()` for case-insensitive substring search.
 * Segment search queries both source_text and target_text and merges results.
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

function truncate(text: string | null | undefined, max = 200): string | null {
    if (!text) return null
    return text.length > max ? text.slice(0, max) + '…' : text
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
    // Articles — search by title
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

        for (const a of articles ?? []) {
            articleHits.push({
                id: a.id,
                title: a.title,
                segment_count: a.segment_count ?? 0,
                snippet: null, // articles don't have a single text body
            })
        }
    }

    // -------------------------------------------------------------------------
    // Segments — search source_text and target_text, join article title
    // -------------------------------------------------------------------------
    if (scope === 'segments' || scope === 'both') {
        // Build a map of article id→title so we can label hits.
        // We query both source and target in parallel and merge.
        const perField = Math.ceil(limit / 2)

        const [sourceRes, targetRes] = await Promise.all([
            supabase
                .from('segments')
                .select('id, article_id, position, source_text, target_text, status')
                .ilike('source_text', pattern)
                .limit(perField),
            supabase
                .from('segments')
                .select('id, article_id, position, source_text, target_text, status')
                .ilike('target_text', pattern)
                .limit(perField),
        ])

        if (sourceRes.error) {
            return NextResponse.json({ error: sourceRes.error.message }, { status: 500 })
        }
        if (targetRes.error) {
            return NextResponse.json({ error: targetRes.error.message }, { status: 500 })
        }

        // Deduplicate by segment id, source hits first.
        const seen = new Set<string>()
        const merged = [...(sourceRes.data ?? []), ...(targetRes.data ?? [])].filter(s => {
            if (seen.has(s.id)) return false
            seen.add(s.id)
            return true
        }).slice(0, limit)

        if (merged.length > 0) {
            // Fetch article titles for the matched article IDs.
            const articleIds = [...new Set(merged.map(s => s.article_id))]
            const { data: titleRows } = await supabase
                .from('articles')
                .select('id, title')
                .in('id', articleIds)
            const titleMap = new Map<string, string>(
                (titleRows ?? []).map(r => [r.id, r.title])
            )

            for (const s of merged) {
                segmentHits.push({
                    id: s.id,
                    article_id: s.article_id,
                    article_title: titleMap.get(s.article_id) ?? s.article_id,
                    position: s.position,
                    source_snippet: truncate(s.source_text),
                    target_snippet: truncate(s.target_text),
                    status: s.status,
                })
            }
        }
    }

    const response: SearchResponse = {
        query: q,
        articles: articleHits,
        segments: segmentHits,
    }

    return NextResponse.json(response)
}
