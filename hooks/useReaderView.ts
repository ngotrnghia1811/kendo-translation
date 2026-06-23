'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Segment, DocumentSettings } from '@/types/database'
import { type Paragraph, type ReaderPage, getSegmentPage } from '@/types/reader'

export type ReaderMode = 'single' | 'bilingual' | 'aligned' | 'pdf'

/** Segments-per-page when a document has no source-book page metadata.
 *  Exported so server-side page fetch can align on the same chunk size. */
export const FALLBACK_CHUNK_SIZE = 50

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

/** Minimal shape of a ZH segment row fetched from the server. */
export interface ZhSegmentRow {
    id: string
    position: number
    target_text: string | null
    status: string
}

export function useReaderView(
    segments: Segment[],
    settings: DocumentSettings | null,
    zhSegments?: ZhSegmentRow[],
    /** When provided (lazy-load mode), totalPages uses this instead of pages.length.
     *  Enables the pager to show the correct total before all pages are loaded. */
    totalSegmentsHint?: number,
    /** Sorted list of source-book page numbers (null for fallback-chunk docs).
     *  When provided with totalSegmentsHint, placeholder pages get correct labels. */
    pageMetadataHint?: number[],
) {
    const [mode, setMode] = useState<ReaderMode>('single')
    const [displayLang, setDisplayLang] = useState<'source' | 'target'>('target')
    // 'zh' choice only available when zhSegments are provided
    const [targetLangChoice, setTargetLangChoice] = useState<'en' | 'zh'>('en')
    const [currentPageIndex, setCurrentPageIndex] = useState(0)
    const sourceLang = settings?.source_lang || 'ja'
    const targetLang = settings?.target_lang || 'en'

    // Build position→ZH text lookup for O(1) access per segment
    const zhByPosition = useMemo<Map<number, string>>(() => {
        if (!zhSegments?.length) return new Map()
        return new Map(
            zhSegments
                .filter((s) => s.target_text)
                .map((s) => [s.position, s.target_text!])
        )
    }, [zhSegments])

    // Partition the document into pages, then merge each page's segments into
    // paragraphs. Long imported books (3k–29k segments) otherwise render as a
    // single 80k–160k px DOM; paging keeps each rendered slice small.
    const pages = useMemo<ReaderPage[]>(() => {
        if (!segments.length) {
            // In lazy-load mode, we may have zero loaded segments but know the
            // page count. Return placeholder pages so the pager works.
            if (totalSegmentsHint && totalSegmentsHint > 0) {
                const hintTotal = pageMetadataHint
                    ? pageMetadataHint.length
                    : Math.ceil(totalSegmentsHint / FALLBACK_CHUNK_SIZE)
                return Array.from({ length: hintTotal }, (_, i) => ({
                    page: pageMetadataHint?.[i] ?? null,
                    label: pageMetadataHint ? String(pageMetadataHint[i]) : String(i + 1),
                    segments: [] as Segment[],
                    paragraphs: [] as Paragraph[],
                }))
            }
            return []
        }

        // Defensive: the paragraph-grouping loop relies on `position` being
        // non-decreasing. Supabase queries that omit an explicit
        // .order('position') could return rows in any order. Copy + sort to
        // guarantee the invariant without mutating the caller's array.
        const ordered = [...segments].sort((a, b) => a.position - b.position)
        const boundaries = new Set(settings?.paragraph_boundaries || [0])

        // Prefer real source-book pages (metadata.page, written by the
        // clean-triplet importer). Fall back to fixed-size chunks for legacy
        // / user-uploaded docs that carry no page metadata.
        const hasPageMeta = ordered.some((s) => getSegmentPage(s) !== null) ||
            (pageMetadataHint && pageMetadataHint.length > 0)

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
            // Pad with placeholder pages for page-metadata docs that haven't
            // been fully loaded yet.
            if (pageMetadataHint && buckets.length < pageMetadataHint.length) {
                const loadedPages = new Set(buckets.map(b => b.page))
                for (const pn of pageMetadataHint) {
                    if (!loadedPages.has(pn)) {
                        buckets.push({ page: pn, segments: [] })
                    }
                }
                // Re-sort by page number so pages appear in order
                buckets.sort((a, b) => (a.page ?? 0) - (b.page ?? 0))
            }
        } else {
            // Fallback mode: chunk by FALLBACK_CHUNK_SIZE segments.
            // In lazy-load mode segments may have position gaps (some pages
            // not yet loaded), so we bucket by position range rather than
            // array index to keep pages aligned with their eventual positions.
            if (totalSegmentsHint) {
                const hintTotal = Math.ceil(totalSegmentsHint / FALLBACK_CHUNK_SIZE)
                for (let p = 0; p < hintTotal; p++) {
                    const lo = p * FALLBACK_CHUNK_SIZE
                    const hi = lo + FALLBACK_CHUNK_SIZE
                    const bucketSegs = ordered.filter(
                        (s) => s.position >= lo && s.position < hi
                    )
                    buckets.push({ page: null, segments: bucketSegs })
                }
            } else {
                for (let i = 0; i < ordered.length; i += FALLBACK_CHUNK_SIZE) {
                    buckets.push({ page: null, segments: ordered.slice(i, i + FALLBACK_CHUNK_SIZE) })
                }
            }
        }

        return buckets.map((bucket, i) => ({
            page: bucket.page,
            label: bucket.page !== null
                ? String(bucket.page)
                : pageMetadataHint?.[i] !== undefined
                    ? String(pageMetadataHint[i])
                    : String(i + 1),
            segments: bucket.segments,
            paragraphs: bucket.segments.length > 0
                ? groupParagraphs(bucket.segments, boundaries)
                : [],
        }))
    }, [segments, settings?.paragraph_boundaries, totalSegmentsHint, pageMetadataHint])

    const hintedTotal = pageMetadataHint
        ? pageMetadataHint.length
        : totalSegmentsHint
            ? Math.ceil(totalSegmentsHint / FALLBACK_CHUNK_SIZE)
            : 0
    const totalPages = Math.max(pages.length, hintedTotal)

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
        const langCode = lang === 'source' ? sourceLang
            : targetLangChoice === 'zh' ? 'zh'
            : targetLang
        // CJK languages (Japanese, Chinese) do not use spaces between sentences.
        // All other languages default to a single space joiner.
        const joiner = /^(ja|zh|ko)/.test(langCode ?? '') ? '' : ' '
        return paragraph.segments
            .map(s => {
                if (lang === 'source') return s.source_text
                if (targetLangChoice === 'zh') return zhByPosition.get(s.position) ?? ''
                return s.target_text || ''
            })
            .filter(Boolean)
            .join(joiner)
    }

    const hasZh = (zhSegments?.length ?? 0) > 0

    return {
        mode,
        setMode,
        displayLang,
        setDisplayLang,
        targetLangChoice,
        setTargetLangChoice,
        hasZh,
        sourceLang,
        targetLang,
        paragraphs,
        pageSegments,
        getParagraphText,
        zhByPosition,
        // Pagination
        pages,
        currentPage,
        currentPageIndex: safeIndex,
        totalPages,
        goToPage,
    }
}
