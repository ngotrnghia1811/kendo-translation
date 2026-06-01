'use client'

import Link from 'next/link'
import type { Segment, DocumentSettings } from '@/types/database'
import { useReaderView, type ReaderMode } from '@/hooks/useReaderView'
import LanguageSelector from '@/components/shared/LanguageSelector'
import SingleLanguageView from './SingleLanguageView'
import BilingualParagraphView from './BilingualParagraphView'
import TranslatorAlignedView from './TranslatorAlignedView'

interface ReaderViewProps {
    segments: Segment[]
    settings: DocumentSettings | null
    title: string
    articleId: string
    canEdit: boolean
}

const MODE_LABELS: Record<ReaderMode, string> = {
    single: 'Single language',
    bilingual: 'Bilingual (paragraph)',
    aligned: 'Aligned (sentence)',
}

export default function ReaderView({ segments, settings, title, articleId, canEdit }: ReaderViewProps) {
    const {
        mode,
        setMode,
        displayLang,
        setDisplayLang,
        sourceLang,
        targetLang,
        paragraphs,
        pageSegments,
        getParagraphText,
        currentPage,
        currentPageIndex,
        totalPages,
        goToPage,
        pages,
    } = useReaderView(segments, settings)

    const showPager = totalPages > 1
    const pageNoun = currentPage?.page !== null && currentPage?.page !== undefined ? 'Page' : 'Section'

    return (
        <main className="min-h-screen">
            {/* Mode switcher toolbar */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="max-w-5xl mx-auto">
                    {/* Top row: breadcrumb + Edit affordance */}
                    <div className="flex items-center justify-between mb-3 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <Link href="/documents" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm shrink-0">← Documents</Link>
                            <span className="text-gray-300 dark:text-gray-600 shrink-0">/</span>
                            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{title}</h1>
                        </div>
                        {canEdit && (
                            <Link
                                href={`/documents/${articleId}/edit`}
                                className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors shrink-0"
                            >
                                Edit
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-3">
                        {/* Mode tabs */}
                        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {(Object.keys(MODE_LABELS) as ReaderMode[])
                                .filter((m) => m !== 'aligned' || canEdit)
                                .map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                        mode === m
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {MODE_LABELS[m]}
                                </button>
                            ))}
                        </div>

                        {/* Language selectors */}
                        <div className="flex items-center gap-3">
                            {mode === 'single' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Display:</span>
                                    <select
                                        value={displayLang}
                                        onChange={(e) => setDisplayLang(e.target.value as 'source' | 'target')}
                                        className="text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                                    >
                                        <option value="source">{sourceLang.toUpperCase()} (Source)</option>
                                        <option value="target">{targetLang.toUpperCase()} (Target)</option>
                                    </select>
                                </div>
                            )}

                            {/* Pager — only shown when the document spans more than one page */}
                            {showPager && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => goToPage(currentPageIndex - 1)}
                                        disabled={currentPageIndex === 0}
                                        aria-label="Previous page"
                                        className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 enabled:hover:bg-gray-100 dark:enabled:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        ←
                                    </button>
                                    <label className="flex items-center gap-1 text-xs text-gray-500">
                                        <span>{pageNoun}</span>
                                        <select
                                            value={currentPageIndex}
                                            onChange={(e) => goToPage(Number(e.target.value))}
                                            aria-label={`${pageNoun}, ${totalPages} total`}
                                            className="text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1 py-1 max-w-[6rem]"
                                        >
                                            {pages.map((p, i) => (
                                                <option key={i} value={i}>
                                                    {p.label}
                                                </option>
                                            ))}
                                        </select>
                                        <span>of {totalPages}</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => goToPage(currentPageIndex + 1)}
                                        disabled={currentPageIndex >= totalPages - 1}
                                        aria-label="Next page"
                                        className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 enabled:hover:bg-gray-100 dark:enabled:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {segments.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    No segments available for this document.
                </div>
            ) : (
                <>
                    {mode === 'single' && (
                        <SingleLanguageView
                            paragraphs={paragraphs}
                            displayLang={displayLang}
                            sourceLang={sourceLang}
                            targetLang={targetLang}
                            getParagraphText={getParagraphText}
                        />
                    )}
                    {mode === 'bilingual' && (
                        <BilingualParagraphView
                            paragraphs={paragraphs}
                            sourceLang={sourceLang}
                            targetLang={targetLang}
                            getParagraphText={getParagraphText}
                        />
                    )}
                    {mode === 'aligned' && canEdit && (
                        <TranslatorAlignedView
                            segments={pageSegments}
                            sourceLang={sourceLang}
                            targetLang={targetLang}
                        />
                    )}
                </>
            )}
        </main>
    )
}
