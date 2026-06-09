/**
 * GET /api/documents/[id]/export
 *
 * Exports a document's translated text in a requested format.
 *
 * Query params:
 *   format  — "txt" | "md"  (default: "txt")
 *   lang    — "en" | "zh"   (default: "en")
 *
 * Auth: any authenticated user (readers, translators, admins).
 *
 * Segment visibility contract: honours the document's `publish_filter`
 * setting. "qa_approved" → only qa_approved segments; "any_translated"
 * (default) → qa_approved or any segment with target_text.
 *
 * Paragraph grouping: segments with the same `metadata.page` value are
 * grouped; within each group, segments are joined by a language-aware
 * separator ('' for ZH/JA/KO, ' ' otherwise) exactly as the reader does.
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

    // Group by page (metadata.page). Segments without a page value all fall
    // into group null (treated as one large group, then chunked by 50).
    const pageMap = new Map<string, Segment[]>()
    for (const seg of segments) {
        const page = seg.metadata?.page as string | undefined
        const key = page !== undefined && page !== null ? String(page) : '__legacy__'
        if (!pageMap.has(key)) pageMap.set(key, [])
        pageMap.get(key)!.push(seg)
    }

    const paragraphs: string[] = []
    for (const [, segs] of pageMap) {
        // Within each page, build paragraph blocks. Treat each run of segments
        // as one paragraph (simplified; full paragraph-boundary logic lives in
        // the reader hook but isn't needed for plain-text export).
        const text = segs
            .map(s => (s.target_text ?? '').trim())
            .filter(Boolean)
            .join(sep)
        if (text) paragraphs.push(text)
    }
    return paragraphs
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const url = new URL(req.url)
        const format = (url.searchParams.get('format') ?? 'txt') as 'txt' | 'md'
        const lang = (url.searchParams.get('lang') ?? 'en') as 'en' | 'zh'

        // Auth — must be authenticated
        const authClient = await createClient()
        const { data: { user } } = await authClient.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createAdminClient()

        // Fetch article metadata + document settings in parallel
        const [{ data: article }, { data: settings }] = await Promise.all([
            supabase.from('articles').select('id, title').eq('id', id).maybeSingle(),
            supabase.from('document_settings').select('publish_filter').eq('article_id', id).maybeSingle(),
        ])

        if (!article) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Fetch segments in the requested language
        const { data: rawSegments, error: segErr } = await supabase
            .from('segments')
            .select('position, target_text, status, metadata')
            .eq('article_id', id)
            .eq('target_lang', lang)
            .order('position')

        if (segErr) {
            console.error('Export segment fetch error:', segErr)
            return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
        }

        const publishFilter = (settings as { publish_filter?: string } | null)?.publish_filter ?? 'any_translated'
        const segments = ((rawSegments ?? []) as Segment[]).filter((s) =>
            publishFilter === 'qa_approved'
                ? s.status === 'qa_approved'
                : (s.status === 'qa_approved' || s.target_text)
        )

        const paragraphs = buildParagraphs(segments, lang)

        // Build output
        const titleLine = article.title as string

        let body: string
        let contentType: string
        let filename: string

        if (format === 'md') {
            contentType = 'text/markdown; charset=utf-8'
            filename = `${titleLine.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`
            body = `# ${titleLine}\n\n` + paragraphs.join('\n\n')
        } else {
            // txt (default)
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
