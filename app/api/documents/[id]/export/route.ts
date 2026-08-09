/**
 * GET /api/documents/[id]/export
 *
 * Exports a document's translated text.
 * PocketBase edition.
 */

import { createServerClient } from '@/lib/pocketbase/server'
import { NextRequest, NextResponse } from 'next/server'

function joiner(lang: string): string {
    return /^(ja|zh|ko)/.test(lang) ? '' : ' '
}

type Segment = {
    position: number
    target_text: string | null
    status: string
    metadata: Record<string, unknown> | null
}

function buildParagraphs(segments: Segment[], lang: string): string[] {
    const sep = joiner(lang)

    const pageMap = new Map<string, Segment[]>()
    for (const seg of segments) {
        const page = seg.metadata?.page as string | undefined
        const key = page !== undefined && page !== null ? String(page) : '__legacy__'
        if (!pageMap.has(key)) pageMap.set(key, [])
        pageMap.get(key)!.push(seg)
    }

    const paragraphs: string[] = []
    for (const [, segs] of pageMap) {
        const text = segs
            .map(s => (s.target_text ?? '').trim())
            .filter(Boolean)
            .join(sep)
        if (text) paragraphs.push(text)
    }
    return paragraphs
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const url = new URL(req.url)
        const format = (url.searchParams.get('format') ?? 'txt') as 'txt' | 'md'
        const lang = (url.searchParams.get('lang') ?? 'en') as 'en' | 'zh'

        const pb = await createServerClient()
        if (!pb.authStore.isValid || !pb.authStore.record) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch article
        let article: Record<string, unknown>
        try {
            article = await pb.collection('articles').getOne(id, { fields: 'id,title' })
        } catch {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Fetch settings for publish_filter
        let publishFilter = 'any_translated'
        try {
            const settingsList = await pb.collection('document_settings').getFullList({
                filter: `article = "${id}"`,
                fields: 'publish_filter',
            })
            if (settingsList.length > 0) {
                publishFilter = (settingsList[0] as Record<string, unknown>).publish_filter as string ?? 'any_translated'
            }
        } catch { /* ignore */ }

        // Fetch segments
        const rawSegments = await pb.collection('segments').getFullList<Segment>({
            filter: `article = "${id}" && target_lang = "${lang}"`,
            sort: '+position',
            fields: 'position,target_text,status,metadata',
        })

        const segments = rawSegments.filter((s) =>
            publishFilter === 'qa_approved'
                ? s.status === 'qa_approved'
                : (s.status === 'qa_approved' || s.target_text)
        )

        const paragraphs = buildParagraphs(segments, lang)
        const titleLine = article.title as string

        let body: string
        let contentType: string
        let filename: string

        if (format === 'md') {
            contentType = 'text/markdown; charset=utf-8'
            filename = `${titleLine.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`
            body = `# ${titleLine}\n\n` + paragraphs.join('\n\n')
        } else {
            contentType = 'text/plain; charset=utf-8'
            filename = `${titleLine.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`
            body = titleLine + '\n' + '='.repeat(titleLine.length) + '\n\n' + paragraphs.join('\n\n')
        }

        return new NextResponse(body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (err) {
        console.error('Export error:', err)
        return NextResponse.json({ error: 'Export failed' }, { status: 500 })
    }
}
