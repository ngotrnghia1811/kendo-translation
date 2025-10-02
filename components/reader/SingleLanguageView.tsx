'use client'

import type { Segment, DocumentSettings } from '@/types/database'

interface Paragraph {
    segments: Segment[]
    position: number
}

interface SingleLanguageViewProps {
    paragraphs: Paragraph[]
    displayLang: 'source' | 'target'
    getParagraphText: (paragraph: Paragraph, lang: 'source' | 'target') => string
}

export default function SingleLanguageView({
    paragraphs,
    displayLang,
    getParagraphText,
}: SingleLanguageViewProps) {
    return (
        <article className="max-w-2xl mx-auto py-8 px-4 prose dark:prose-invert">
            {paragraphs.map((paragraph, idx) => {
                const text = getParagraphText(paragraph, displayLang)
                if (!text.trim()) return null

                return (
                    <p key={paragraph.position} className="text-base leading-relaxed mb-6 text-gray-800 dark:text-gray-200">
                        {text}
                    </p>
                )
            })}
        </article>
    )
}
