'use client'

import { type Paragraph, isHeadingParagraph } from '@/types/reader'

interface SingleLanguageViewProps {
    paragraphs: Paragraph[]
    displayLang: 'source' | 'target'
    sourceLang: string
    targetLang: string
    getParagraphText: (paragraph: Paragraph, lang: 'source' | 'target') => string
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
