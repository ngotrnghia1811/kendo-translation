'use client'

import type { Segment } from '@/types/database'

interface TranslatorAlignedViewProps {
    segments: Segment[]
    sourceLang: string
    targetLang: string
}

export default function TranslatorAlignedView({
    segments,
    sourceLang,
    targetLang,
}: TranslatorAlignedViewProps) {
    return (
        <div className="max-w-5xl mx-auto py-4 px-4">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide p-2 w-10">#</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide p-2">
                            {sourceLang.toUpperCase()}
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide p-2">
                            {targetLang.toUpperCase()}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {segments.map((segment) => (
                        <tr
                            key={segment.id}
                            className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                            <td className="p-2 text-xs text-gray-400 align-top">
                                {segment.position + 1}
                            </td>
                            <td lang={sourceLang} className="p-2 text-sm leading-relaxed text-gray-800 dark:text-gray-200 align-top">
                                {segment.source_text}
                            </td>
                            <td lang={targetLang} className="p-2 text-sm leading-relaxed align-top">
                                {segment.target_text ? (
                                    <span className="text-gray-800 dark:text-gray-200">{segment.target_text}</span>
                                ) : (
                                    <span className="text-gray-400 italic">Not translated</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
