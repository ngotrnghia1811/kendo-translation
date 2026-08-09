/**
 * GET /api/pdfs/[articleId]
 *
 * Streams the paired bilingual PDF for the given article.
 * PocketBase edition.
 */

import { createServerClient } from '@/lib/pocketbase/server'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const PDF_BASE_PATH =
    process.env.PDF_BASE_PATH ??
    '/Users/nghiango-mbp/git_repo/universal-agent_v2/book-postprocessing'

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ articleId: string }> }
) {
    const { articleId } = await params

    const pb = await createServerClient()
    if (!pb.authStore.isValid || !pb.authStore.record) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch paired_pdf_path from DB
    let article: Record<string, unknown>
    try {
        article = await pb.collection('articles').getOne(articleId, { fields: 'paired_pdf_path' })
    } catch {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const relPath = article.paired_pdf_path as string | null | undefined
    if (!relPath) {
        return NextResponse.json(
            { error: 'No paired PDF for this article' },
            { status: 404 }
        )
    }

    // ─── GDrive branch ────────────────────────────────────────────────
    if (relPath.startsWith('gdrive:')) {
        const fileId = relPath.slice('gdrive:'.length)
        const gdriveUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`

        let gdriveRes: Response
        try {
            gdriveRes = await fetch(gdriveUrl, { redirect: 'follow' })
        } catch {
            return NextResponse.json(
                { error: 'Failed to reach Google Drive' },
                { status: 502 }
            )
        }

        if (!gdriveRes.ok) {
            const status = gdriveRes.status === 404 ? 404 : 502
            return NextResponse.json(
                { error: 'PDF not available from Google Drive' },
                { status }
            )
        }

        return new Response(gdriveRes.body, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Cache-Control': 'private, max-age=3600',
                'Content-Disposition': 'inline',
            },
        })
    }

    // ─── Local filesystem branch ──────────────────────────────────────
    const absPath = path.join(PDF_BASE_PATH, relPath)

    const resolvedBase = path.resolve(PDF_BASE_PATH)
    const resolvedFile = path.resolve(absPath)
    if (!resolvedFile.startsWith(resolvedBase + path.sep) && resolvedFile !== resolvedBase) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let stat: fs.Stats
    try {
        stat = fs.statSync(resolvedFile)
    } catch {
        return NextResponse.json({ error: 'PDF file not found on disk' }, { status: 404 })
    }

    const fileStream = fs.createReadStream(resolvedFile)

    const readableStream = new ReadableStream({
        start(controller) {
            fileStream.on('data', (chunk) => {
                controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
            })
            fileStream.on('end', () => controller.close())
            fileStream.on('error', (err) => controller.error(err))
        },
        cancel() {
            fileStream.destroy()
        },
    })

    return new Response(readableStream, {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': String(stat.size),
            'Cache-Control': 'private, max-age=3600',
            'Content-Disposition': `inline; filename="${path.basename(resolvedFile)}"`,
        },
    })
}
