'use client'

import type { Segment } from '@/types/database'

interface Paragraph {
    segments: Segment[]
    position: number
}

interface BilingualParagraphViewProps {
    paragraphs: Paragraph[]
    sourceLang: string
    targetLang: string
    getParagraphText: (paragraph: Paragraph, lang: 'source' | 'target') => string
}

export default function BilingualParagraphView({
    paragraphs,
    sourceLang,
    targetLang,
    getParagraphText,
}: BilingualParagraphViewProps) {
    const hasAnySource = paragraphs.some((p) => getParagraphText(p, 'source').trim().length > 0)
    const hasAnyTarget = paragraphs.some((p) => getParagraphText(p, 'target').trim().length > 0)
    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
            {paragraphs.map((paragraph) => {
                const sourceText = getParagraphText(paragraph, 'source')
                const targetText = getParagraphText(paragraph, 'target')

                if (!sourceText.trim() && !targetText.trim()) return null

                return (
                    <div key={paragraph.position} className="space-y-1">
                        {/* Source paragraph */}
                        {sourceText.trim() && (
                            <div lang={sourceLang} className="border-l-4 border-red-400 dark:border-red-600 pl-4 py-2">
                                <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200">
                                    {sourceText}
                                </p>
                            </div>
                        )}

                        {/* Separator */}
                        {sourceText.trim() && targetText.trim() && (
                            <div className="border-b border-dashed border-gray-300 dark:border-gray-600 mx-4" />
                        )}

                        {/* Target paragraph */}
                        {targetText.trim() && (
                            <div lang={targetLang} className="border-l-4 border-blue-400 dark:border-blue-600 pl-4 py-2">
                                <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200">
                                    {targetText}
                                </p>
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Legend */}
            {(hasAnySource || hasAnyTarget) && (
                <div className="flex gap-4 text-xs text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {hasAnySource && (
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 border-l-4 border-red-400 inline-block" /> {sourceLang.toUpperCase()}
                        </span>
                    )}
                    {hasAnyTarget && (
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 border-l-4 border-blue-400 inline-block" /> {targetLang.toUpperCase()}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
