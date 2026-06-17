'use client'

import type { Segment } from '@/types/database'
import type { LayoutWidth } from '@/hooks/useReaderTheme'
import { isHeadingSegment } from '@/types/reader'

interface TranslatorAlignedViewProps {
    segments: Segment[]
    sourceLang: string
    targetLang: string
    /** When provided, the target column shows ZH text instead of EN. */
    zhByPosition?: Map<number, string>
    targetLangChoice?: 'en' | 'zh'
    /** Layout width from shared theme context. ('two-column' is N/A for table view → treated as 'full'). */
    layoutWidth?: LayoutWidth
}

export default function TranslatorAlignedView({
    segments,
    sourceLang,
    targetLang,
    zhByPosition,
    targetLangChoice = 'en',
    layoutWidth = 'narrow',
}: TranslatorAlignedViewProps) {
    const effectiveLang = targetLangChoice === 'zh' ? 'zh' : targetLang

    // 'two-column' doesn't make sense for a table view → treat as 'full'.
    const resolvedWidth = layoutWidth === 'two-column' ? 'full' : layoutWidth
    const widthClass = resolvedWidth === 'full' ? 'max-w-full' : 'max-w-5xl'

    return (
        <div className={`${widthClass} mx-auto py-4 px-4`}>
            <table className="w-full border-collapse">
                <caption className="sr-only">
                    Sentence-aligned view: each row pairs a {sourceLang.toUpperCase()} source
                    segment with its {effectiveLang.toUpperCase()} translation, in reading order.
                </caption>
                <thead>
                    <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide p-2 w-10">#</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide p-2">
                            {sourceLang.toUpperCase()}
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide p-2">
                            {effectiveLang.toUpperCase()}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {segments.map((segment) => {
                        const isHeading = isHeadingSegment(segment)
                        return (
                            <tr
                                key={segment.id}
                                className={
                                    isHeading
                                        ? 'border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60'
                                        : 'border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }
                            >
                                <td className="p-2 text-xs text-gray-400 align-top">
                                    {segment.position + 1}
                                </td>
                                <td
                                    lang={sourceLang}
                                    className={
                                        isHeading
                                            ? 'p-2 text-base font-semibold leading-relaxed align-top'
                                            : 'p-2 text-sm leading-relaxed align-top'
                                    }
                                >
                                    {segment.source_text}
                                </td>
                                 <td
                                    lang={effectiveLang}
                                    className={
                                        isHeading
                                            ? 'p-2 text-base font-semibold leading-relaxed align-top'
                                            : 'p-2 text-sm leading-relaxed align-top'
                                    }
                                >
                                    {(() => {
                                        const text = targetLangChoice === 'zh'
                                            ? (zhByPosition?.get(segment.position) ?? '')
                                            : (segment.target_text ?? '')
                                        return text ? (
                                            <span>{text}</span>
                                        ) : (
                                            // Translator-only working view: surface untranslated
                                            // segments explicitly. Reader-facing Single/Bilingual
                                            // views deliberately hide these. (FE-READER-AUDIT 4.6)
                                            <span className="text-gray-400 italic">Not translated</span>
                                        )
                                    })()}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
