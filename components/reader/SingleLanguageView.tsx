'use client'

import { type Paragraph, isHeadingParagraph } from '@/types/reader'

interface SingleLanguageViewProps {
    paragraphs: Paragraph[]
    displayLang: 'source' | 'target'
    sourceLang: string
    targetLang: string
    getParagraphText: (paragraph: Paragraph, lang: 'source' | 'target') => string
    /** When ZH mode is active, pass 'zh' so the lang attr is correct. */
    effectiveTargetLang?: string
}

export default function SingleLanguageView({
    paragraphs,
    displayLang,
    sourceLang,
    targetLang,
    getParagraphText,
    effectiveTargetLang,
}: SingleLanguageViewProps) {
    const displayTargetLang = effectiveTargetLang ?? targetLang
    const currentLang = displayLang === 'source' ? sourceLang : displayTargetLang
    return (
        <article lang={currentLang} className="max-w-2xl mx-auto py-8 px-4">
            {paragraphs.map((paragraph) => {
                const text = getParagraphText(paragraph, displayLang)
                // Reader-facing view: silently skip paragraphs with no text in the
                // displayed language. Unlike TranslatorAlignedView (a working view),
                // readers should never see "Not translated" placeholders. See
                // FE-READER-AUDIT 4.6 — this asymmetry is intentional.
                if (!text.trim()) return null

                if (isHeadingParagraph(paragraph)) {
                    return (
                        <h2
                            key={paragraph.position}
                            className="text-xl font-semibold mt-10 mb-4"
                        >
                            {text}
                        </h2>
                    )
                }

                return (
                    <p key={paragraph.position} className="text-base leading-relaxed mb-6">
                        {text}
                    </p>
                )
            })}
        </article>
    )
}
