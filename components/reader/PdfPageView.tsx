'use client'

/**
 * PdfPageView — renders the paired bilingual PDF in an iframe using the
 * browser's built-in PDF viewer.
 *
 * The PDF is served by `/api/pdfs/[articleId]`. Passing `#page=N` in the
 * fragment is the standard way to tell PDF viewers to open at a specific
 * page; most modern browsers (Chrome, Firefox, Safari) honour it.
 *
 * When the current reader page maps to a real source-book page number
 * (`currentPage?.page`) we navigate to that page in the PDF. Otherwise we
 * stay at page 1.
 */

import type { LayoutWidth } from '@/hooks/useReaderTheme'

interface PdfPageViewProps {
    articleId: string
    /** Current 1-based PDF page number to jump to, or null to stay at page 1. */
    pdfPage: number | null
    /** Layout width from shared theme context. (PDF is always full-width; prop accepted for interface consistency.) */
    layoutWidth?: LayoutWidth
}

export default function PdfPageView({ articleId, pdfPage }: PdfPageViewProps) {
    const page = pdfPage ?? 1
    const src = `/api/pdfs/${articleId}#page=${page}`

    return (
        <div className="w-full" style={{ height: 'calc(100vh - 120px)' }}>
            {/* No sandbox attribute: the PDF plugin requires full browser privileges.
                Security is enforced by the API route (auth check + path traversal guard). */}
            <iframe
                key={src}
                src={src}
                title="Paired bilingual PDF"
                className="w-full h-full border-0"
            />
        </div>
    )
}
