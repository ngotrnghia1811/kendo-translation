'use client'

import { useState, useMemo } from 'react'
import type { Segment, DocumentSettings } from '@/types/database'

export type ReaderMode = 'single' | 'bilingual' | 'aligned'

interface Paragraph {
    segments: Segment[]
    position: number
}

export function useReaderView(segments: Segment[], settings: DocumentSettings | null) {
    const [mode, setMode] = useState<ReaderMode>('single')
    const [displayLang, setDisplayLang] = useState<'source' | 'target'>('target')
    const sourceLang = settings?.source_lang || 'ja'
    const targetLang = settings?.target_lang || 'en'

    // Merge segments into paragraphs using paragraph boundaries
    const paragraphs = useMemo<Paragraph[]>(() => {
        if (!segments.length) return []

        const boundaries = new Set(settings?.paragraph_boundaries || [0])
        const result: Paragraph[] = []
        let currentParagraph: Segment[] = []
        let paragraphStart = 0

        for (const segment of segments) {
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
