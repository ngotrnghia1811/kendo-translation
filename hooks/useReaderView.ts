'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Segment, DocumentSettings } from '@/types/database'
import { type Paragraph, type ReaderPage, getSegmentPage } from '@/types/reader'

export type ReaderMode = 'single' | 'bilingual' | 'aligned'

/** Segments-per-page when a document has no source-book page metadata. */
const FALLBACK_CHUNK_SIZE = 50

/**
 * Group an ordered run of segments into paragraphs using the
 * paragraph_boundaries Set semantics. Pure helper so it can be applied
 * per-page. `boundaries` holds absolute segment positions at which a new
 * paragraph starts.
 */
function groupParagraphs(ordered: Segment[], boundaries: Set<number>): Paragraph[] {
    const result: Paragraph[] = []
    let currentParagraph: Segment[] = []
    let paragraphStart = ordered.length ? ordered[0].position : 0

    for (const segment of ordered) {
        if (boundaries.has(segment.position) && currentParagraph.length > 0) {
            result.push({ segments: currentParagraph, position: paragraphStart })
            currentParagraph = []
            paragraphStart = segment.position
        }
        currentParagraph.push(segment)
    }

    if (currentParagraph.length > 0) {
        result.push({ segments: currentParagraph, position: paragraphStart })
    }

    return result
}

export function useReaderView(segments: Segment[], settings: DocumentSettings | null) {
    const [mode, setMode] = useState<ReaderMode>('single')
    const [displayLang, setDisplayLang] = useState<'source' | 'target'>('target')
    const [currentPageIndex, setCurrentPageIndex] = useState(0)
    const sourceLang = settings?.source_lang || 'ja'
    const targetLang = settings?.target_lang || 'en'

    // Partition the document into pages, then merge each page's segments into
    // paragraphs. Long imported books (3k–29k segments) otherwise render as a
    // single 80k–160k px DOM; paging keeps each rendered slice small.
    const pages = useMemo<ReaderPage[]>(() => {
        if (!segments.length) return []

        // Defensive: the paragraph-grouping loop relies on `position` being
        // non-decreasing. Supabase queries that omit an explicit
        // .order('position') could return rows in any order. Copy + sort to
        // guarantee the invariant without mutating the caller's array.
        const ordered = [...segments].sort((a, b) => a.position - b.position)
        const boundaries = new Set(settings?.paragraph_boundaries || [0])

        // Prefer real source-book pages (metadata.page, written by the
        // clean-triplet importer). Fall back to fixed-size chunks for legacy
        // / user-uploaded docs that carry no page metadata.
        const hasPageMeta = ordered.some((s) => getSegmentPage(s) !== null)

        const buckets: { page: number | null; segments: Segment[] }[] = []
        if (hasPageMeta) {
            let current: { page: number | null; segments: Segment[] } | null = null
            for (const seg of ordered) {
                const page = getSegmentPage(seg)
                if (!current || current.page !== page) {
                    current = { page, segments: [] }
                    buckets.push(current)
                }
                current.segments.push(seg)
            }
        } else {
            for (let i = 0; i < ordered.length; i += FALLBACK_CHUNK_SIZE) {
                buckets.push({ page: null, segments: ordered.slice(i, i + FALLBACK_CHUNK_SIZE) })
            }
        }

        return buckets.map((bucket, i) => ({
            page: bucket.page,
            label: bucket.page !== null ? String(bucket.page) : String(i + 1),
            segments: bucket.segments,
            paragraphs: groupParagraphs(bucket.segments, boundaries),
        }))
    }, [segments, settings?.paragraph_boundaries])

    const totalPages = pages.length

    // Clamp the page index whenever the document (and thus page count) changes
    // — e.g. navigating to a different article reuses this hook instance.
    useEffect(() => {
        setCurrentPageIndex((i) => (i >= totalPages ? 0 : i))
    }, [totalPages])

    const safeIndex = totalPages === 0 ? 0 : Math.min(currentPageIndex, totalPages - 1)
    const currentPage: ReaderPage | null = pages[safeIndex] ?? null
    const paragraphs = currentPage?.paragraphs ?? []
    const pageSegments = currentPage?.segments ?? []

    const goToPage = (i: number) => {
        if (totalPages === 0) return
        setCurrentPageIndex(Math.max(0, Math.min(i, totalPages - 1)))
    }

    // Get merged text for a paragraph
    const getParagraphText = (paragraph: Paragraph, lang: 'source' | 'target'): string => {
        return paragraph.segments
            .map(s => lang === 'source' ? s.source_text : (s.target_text || ''))
            .filter(Boolean)
            .join(' ')
    }

    return {
        mode,
        setMode,
        displayLang,
        setDisplayLang,
        sourceLang,
        targetLang,
        paragraphs,
        pageSegments,
        getParagraphText,
        // Pagination
        pages,
        currentPage,
        currentPageIndex: safeIndex,
        totalPages,
        goToPage,
    }
}
