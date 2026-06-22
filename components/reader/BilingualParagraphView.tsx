'use client'

import type { LayoutWidth } from '@/hooks/useReaderTheme'
import { type Paragraph, isHeadingParagraph } from '@/types/reader'

interface BilingualParagraphViewProps {
    paragraphs: Paragraph[]
    sourceLang: string
    targetLang: string
    getParagraphText: (paragraph: Paragraph, lang: 'source' | 'target') => string
    /** When ZH mode is active, pass 'zh' so lang attrs and the legend are correct. */
    effectiveTargetLang?: string
    /** Layout width from shared theme context. */
    layoutWidth?: LayoutWidth
}

export default function BilingualParagraphView({
    paragraphs,
    sourceLang,
    targetLang,
    getParagraphText,
    effectiveTargetLang,
    layoutWidth = 'narrow',
}: BilingualParagraphViewProps) {
    const displayTargetLang = effectiveTargetLang ?? targetLang
    const hasAnySource = paragraphs.some((p) => getParagraphText(p, 'source').trim().length > 0)
    const hasAnyTarget = paragraphs.some((p) => getParagraphText(p, 'target').trim().length > 0)

    const widthClass =
        layoutWidth === 'full'       ? 'max-w-full' :
        layoutWidth === 'two-column' ? 'columns-2 gap-8 max-w-full' :
        'max-w-3xl' // narrow — current default

    return (
        <div className={`${widthClass} mx-auto py-8 px-4 space-y-8`}>
            {paragraphs.map((paragraph) => {
                const sourceText = getParagraphText(paragraph, 'source')
                const targetText = getParagraphText(paragraph, 'target')

                if (!sourceText.trim() && !targetText.trim()) return null

                // Reader-facing view: render whichever language is present and skip
                // an empty side silently (no "Not translated" placeholder). The
                // translator-only TranslatorAlignedView intentionally does the
                // opposite. See FE-READER-AUDIT 4.6 — this asymmetry is by design.

                // Heading paragraph: render both languages as h2 with no
                // source/target color bars; visually distinct from body paragraphs.
                if (isHeadingParagraph(paragraph)) {
                    return (
                        <div key={paragraph.position} className="space-y-1 mt-10">
                            {sourceText.trim() && (
                                <h2
                                    lang={sourceLang}
                                    className="text-xl font-semibold"
                                >
                                    {sourceText}
                                </h2>
                            )}
                            {targetText.trim() && (
                                <h2
                                    lang={displayTargetLang}
                                    className="text-lg font-semibold"
                                >
                                    {targetText}
                                </h2>
                            )}
                        </div>
                    )
                }

                return (
                    <div key={paragraph.position} className="space-y-1">
                        {/* Source paragraph */}
                        {sourceText.trim() && (
                            <div lang={sourceLang} className="border-l-4 border-red-400 dark:border-red-500/70 pl-4 py-2">
                                <p className="text-base leading-relaxed">
                                    {sourceText}
                                </p>
                            </div>
                        )}

                        {/* Separator */}
                        {sourceText.trim() && targetText.trim() && (
                            <div className="border-b border-dashed border-gray-300 dark:border-[var(--rt-border)] mx-4" />
                        )}

                        {/* Target paragraph */}
                        {targetText.trim() && (
                            <div lang={displayTargetLang} className="border-l-4 border-blue-400 dark:border-blue-500/70 pl-4 py-2">
                                <p className="text-base leading-relaxed">
                                    {targetText}
                                </p>
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Legend */}
            {(hasAnySource || hasAnyTarget) && (
                <div className="flex gap-4 text-xs text-gray-400 pt-4 border-t border-gray-200 dark:border-[var(--rt-border)]">
                    {hasAnySource && (
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 border-l-4 border-red-400 inline-block" /> {sourceLang.toUpperCase()}
                        </span>
                    )}
                    {hasAnyTarget && (
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 border-l-4 border-blue-400 inline-block" /> {displayTargetLang.toUpperCase()}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
