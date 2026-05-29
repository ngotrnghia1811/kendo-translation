'use client'

import type { Segment, DocumentSettings } from '@/types/database'

interface Paragraph {
    segments: Segment[]
    position: number
}

interface SingleLanguageViewProps {
    paragraphs: Paragraph[]
    displayLang: 'source' | 'target'
    sourceLang: string
    targetLang: string
    getParagraphText: (paragraph: Paragraph, lang: 'source' | 'target') => string
}

// A paragraph is a heading iff it is a single segment whose pipeline
// metadata marks it as a heading. See scripts/import-trilingual-references.ts —
// the upstream pipeline emits heading lines as their own segment with
// metadata.kind = 'heading'.
function isHeadingParagraph(paragraph: Paragraph): boolean {
    if (paragraph.segments.length !== 1) return false
    const meta = paragraph.segments[0].metadata as { kind?: string } | null
    return meta?.kind === 'heading'
}

export default function SingleLanguageView({
    paragraphs,
    displayLang,
    sourceLang,
    targetLang,
    getParagraphText,
}: SingleLanguageViewProps) {
    const currentLang = displayLang === 'source' ? sourceLang : targetLang
    return (
        <article lang={currentLang} className="max-w-2xl mx-auto py-8 px-4 prose dark:prose-invert">
            {paragraphs.map((paragraph) => {
                const text = getParagraphText(paragraph, displayLang)
                if (!text.trim()) return null

                if (isHeadingParagraph(paragraph)) {
                    return (
                        <h2
                            key={paragraph.position}
                            className="text-xl font-semibold mt-10 mb-4 text-gray-900 dark:text-gray-100"
                        >
                            {text}
                        </h2>
                    )
                }

                return (
                    <p key={paragraph.position} className="text-base leading-relaxed mb-6 text-gray-800 dark:text-gray-200">
                        {text}
                    </p>
                )
            })}
        </article>
    )
}
