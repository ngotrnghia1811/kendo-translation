/**
 * GET /api/pdfs/[articleId]
 *
 * Streams the paired bilingual PDF for the given article directly from the
 * local filesystem. The PDF base directory is controlled by the
 * PDF_BASE_PATH environment variable (defaults to the book-postprocessing
 * directory in universal-agent_v2).
 *
 * The article's `paired_pdf_path` column (relative to PDF_BASE_PATH) is
 * fetched from Supabase on each request. Returns 404 if the article does
 * not exist, has no paired PDF, or the file is not found on disk.
 *
 * This route is intentionally protected: only authenticated users can
 * access PDFs, mirroring the reader-page auth check.
 */

import { createClient } from '@/lib/supabase/server'
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

    // Auth check — require a valid session
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch paired_pdf_path from DB
    const { data: article } = await supabase
        .from('articles')
        .select('paired_pdf_path')
        .eq('id', articleId)
        .single()

    if (!article) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const relPath = article.paired_pdf_path as string | null | undefined
    if (!relPath) {
        return NextResponse.json(
            { error: 'No paired PDF for this article' },
            { status: 404 }
        )
    }

    const absPath = path.join(PDF_BASE_PATH, relPath)

    // Security: ensure the resolved path is still within PDF_BASE_PATH
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

    // Node.js ReadStream → Web ReadableStream
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
            // Allow browser to cache the PDF for 1 hour
            'Cache-Control': 'private, max-age=3600',
            // Inline display (browser PDF viewer)
            'Content-Disposition': `inline; filename="${path.basename(resolvedFile)}"`,
        },
    })
}
