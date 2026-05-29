'use client'

import { useState, useMemo } from 'react'
import type { Segment, DocumentSettings } from '@/types/database'
import type { Paragraph } from '@/types/reader'

export type ReaderMode = 'single' | 'bilingual' | 'aligned'

export function useReaderView(segments: Segment[], settings: DocumentSettings | null) {
    const [mode, setMode] = useState<ReaderMode>('single')
    const [displayLang, setDisplayLang] = useState<'source' | 'target'>('target')
    const sourceLang = settings?.source_lang || 'ja'
    const targetLang = settings?.target_lang || 'en'

    // Merge segments into paragraphs using paragraph boundaries
    const paragraphs = useMemo<Paragraph[]>(() => {
        if (!segments.length) return []

        // Defensive: the paragraph-grouping loop below relies on `position`
        // being non-decreasing. Supabase queries that omit an explicit
        // .order('position') could return rows in any order, which would
        // silently scramble paragraph boundaries. Copy + sort to guarantee
        // the invariant without mutating the caller's array.
        const ordered = [...segments].sort((a, b) => a.position - b.position)

        const boundaries = new Set(settings?.paragraph_boundaries || [0])
        const result: Paragraph[] = []
        let currentParagraph: Segment[] = []
        let paragraphStart = 0

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
    }, [segments, settings?.paragraph_boundaries])

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
        getParagraphText,
    }
}
