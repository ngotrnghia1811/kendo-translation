'use client'

import type { LayoutWidth } from '@/hooks/useReaderTheme'
import { type Paragraph, isHeadingParagraph } from '@/types/reader'

interface SingleLanguageViewProps {
    paragraphs: Paragraph[]
    displayLang: 'source' | 'target'
    sourceLang: string
    targetLang: string
    getParagraphText: (paragraph: Paragraph, lang: 'source' | 'target') => string
    /** When ZH mode is active, pass 'zh' so the lang attr is correct. */
    effectiveTargetLang?: string
    /** Layout width from shared theme context. */
    layoutWidth?: LayoutWidth
}

export default function SingleLanguageView({
    paragraphs,
    displayLang,
    sourceLang,
    targetLang,
    getParagraphText,
    effectiveTargetLang,
    layoutWidth = 'narrow',
}: SingleLanguageViewProps) {
    const displayTargetLang = effectiveTargetLang ?? targetLang
    const currentLang = displayLang === 'source' ? sourceLang : displayTargetLang

    const widthClass =
        layoutWidth === 'full'       ? 'max-w-full' :
        layoutWidth === 'two-column' ? 'columns-2 gap-8 max-w-full' :
        'max-w-2xl' // narrow — current default

    return (
        <article lang={currentLang} className={`${widthClass} mx-auto py-8 px-4`}>
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
