/**
 * app/api/search/route.ts
 *
 * Global full-text search across articles and segments.
 * PocketBase edition: replaces Supabase search_segments RPC (GIN trigram
 * index) with PocketBase filter ~ (LIKE) operators.
 *
 * NOTE: Without a GIN trigram index, ILIKE searches on ~446K segments
 * may be slow. For now this is acceptable for an MVP; a PocketBase
 * full-text search hook route can be added later if needed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/pocketbase/server'
import { withHuskExclusion } from '@/lib/husk-filter'

export interface ArticleHit {
    id: string
    title: string
    segment_count: number
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
    const pb = await createServerClient()
    if (!pb.authStore.isValid || !pb.authStore.record) {
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

    const articleHits: ArticleHit[] = []
    const segmentHits: SegmentHit[] = []

    try {
        // Articles — search by title
        if (scope === 'articles' || scope === 'both') {
            const articles = await pb.collection('articles').getList(1, limit, {
                filter: `(${withHuskExclusion(`title ~ "${q.replace(/"/g, '\\"')}"`)})`,
                sort: '-id',
                fields: 'id,title,segment_count',
            })

            const articleList = articles.items as Array<Record<string, unknown>>
            if (articleList.length > 0) {
                const articleIds = articleList.map(a => a.id as string)
                // Get one translated segment per article for snippet
                const snippetMap = new Map<string, string>()
                for (const aid of articleIds) {
                    try {
                        const segs = await pb.collection('segments').getList(1, 1, {
                            filter: `article = "${aid}" && target_text != null && status != "draft"`,
                            sort: '+position',
                            fields: 'article,target_text',
                        })
                        if (segs.items.length > 0) {
                            snippetMap.set(aid, (segs.items[0] as Record<string, unknown>).target_text as string)
                        }
                    } catch { /* ignore */ }
                }

                for (const a of articleList) {
                    articleHits.push({
                        id: a.id as string,
                        title: a.title as string,
                        segment_count: (a.segment_count as number) ?? 0,
                        snippet: snippetMap.get(a.id as string) ?? null,
                    })
                }
            }
        }

        // Segments — search via filter
        if (scope === 'segments' || scope === 'both') {
            const escapedQ = q.replace(/"/g, '\\"')
            // Search in source_text and target_text
            const filter = `(source_text ~ "${escapedQ}" || target_text ~ "${escapedQ}")`
            const segs = await pb.collection('segments').getList(1, limit, {
                filter,
                sort: '-id',
                fields: 'id,article,position,source_text,target_text,status',
            })

            const segList = segs.items as Array<Record<string, unknown>>
            // Fetch article titles for hits
            const articleTitleMap = new Map<string, string>()
            for (const s of segList) {
                const aid = s.article as string
                if (!articleTitleMap.has(aid)) {
                    try {
                        const art = await pb.collection('articles').getOne(aid, { fields: 'title' })
                        articleTitleMap.set(aid, (art as Record<string, unknown>).title as string)
                    } catch {
                        articleTitleMap.set(aid, 'Unknown')
                    }
                }
            }

            for (const s of segList) {
                const aid = s.article as string
                segmentHits.push({
                    id: s.id as string,
                    article_id: s.article as string,
                    article_title: articleTitleMap.get(s.article as string) ?? 'Unknown',
                    position: s.position as number,
                    source_snippet: (s.source_text as string) ?? null,
                    target_snippet: (s.target_text as string) ?? null,
                    status: s.status as string,
                })
            }
        }

        const response: SearchResponse = {
            query: q,
            articles: articleHits,
            segments: segmentHits,
        }

        return NextResponse.json(response)
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
