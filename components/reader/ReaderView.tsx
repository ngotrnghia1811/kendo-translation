'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Segment, DocumentSettings } from '@/types/database'
import { useReaderView, type ReaderMode } from '@/hooks/useReaderView'
import { useReaderTheme } from '@/hooks/useReaderTheme'
import LanguageSelector from '@/components/shared/LanguageSelector'
import SingleLanguageView from './SingleLanguageView'
import BilingualParagraphView from './BilingualParagraphView'
import TranslatorAlignedView from './TranslatorAlignedView'
import PdfPageView from './PdfPageView'
import ReaderSettingsPanel from './ReaderSettingsPanel'

interface ReaderViewProps {
    segments: Segment[]
    settings: DocumentSettings | null
    title: string
    articleId: string
    canEdit: boolean
    /** Relative path to the paired PDF (from DB). When non-null, a "PDF" tab is shown. */
    pairedPdfPath?: string | null
}

const MODE_LABELS: Record<ReaderMode, string> = {
    single: 'Single language',
    bilingual: 'Bilingual (paragraph)',
    aligned: 'Aligned (sentence)',
    pdf: 'Paired PDF',
}

export default function ReaderView({ segments, settings, title, articleId, canEdit, pairedPdfPath }: ReaderViewProps) {
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

    const {
        theme,
        font,
        fontSize,
        fontSizeValue,
        setTheme,
        setFont,
        increaseFontSize,
        decreaseFontSize,
    } = useReaderTheme()

    const [settingsOpen, setSettingsOpen] = useState(false)

    const showPager = totalPages > 1
    const pageNoun = currentPage?.page !== null && currentPage?.page !== undefined ? 'Page' : 'Section'

    return (
        <main
            className="min-h-screen"
            data-reader-theme={theme}
        >
            {/* Mode switcher toolbar */}
            <div
                className="sticky top-0 z-10 px-4 py-3"
                style={{
                    backgroundColor: 'var(--rt-bg)',
                    borderBottom: '1px solid var(--rt-border)',
                }}
            >
                <div className="max-w-5xl mx-auto">
                    {/* Top row: breadcrumb + Edit + Settings */}
                    <div className="flex items-center justify-between mb-3 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <Link
                                href="/documents"
                                className="text-sm shrink-0"
                                style={{ color: 'var(--rt-text-muted)' }}
                            >
                                ← Documents
                            </Link>
                            <span className="shrink-0" style={{ color: 'var(--rt-border)' }}>/</span>
                            <h1 className="text-lg font-semibold truncate" style={{ color: 'var(--rt-text)' }}>{title}</h1>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {canEdit && (
                                <Link
                                    href={`/documents/${articleId}/edit`}
                                    className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    Edit
                                </Link>
                            )}
                            {/* Settings button */}
                            <div className="relative">
                                <button
                                    type="button"
                                    aria-label="Reader settings"
                                    aria-expanded={settingsOpen}
                                    onClick={() => setSettingsOpen((o) => !o)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                                        settingsOpen
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : ''
                                    }`}
                                    style={settingsOpen ? {} : {
                                        backgroundColor: 'var(--rt-surface)',
                                        borderColor: 'var(--rt-border)',
                                        color: 'var(--rt-text-muted)',
                                    }}
                                >
                                    {/* Gear icon (SVG) */}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.97.342 1.405.588l1.277-.743a1 1 0 0 1 1.228.15l.962.96a1 1 0 0 1 .15 1.23l-.743 1.276c.246.435.444.908.588 1.405l1.473.295a1 1 0 0 1 .804.98v1.36a1 1 0 0 1-.804.98l-1.473.295a6.97 6.97 0 0 1-.588 1.405l.743 1.277a1 1 0 0 1-.15 1.228l-.96.962a1 1 0 0 1-1.23.15l-1.276-.743a6.97 6.97 0 0 1-1.405.588l-.295 1.473A1 1 0 0 1 10.68 19H9.32a1 1 0 0 1-.98-.804l-.295-1.473a6.972 6.972 0 0 1-1.405-.588l-1.277.743a1 1 0 0 1-1.228-.15l-.962-.96a1 1 0 0 1-.15-1.23l.743-1.276a6.971 6.971 0 0 1-.588-1.405L1.804 11.32A1 1 0 0 1 1 10.34V8.98a1 1 0 0 1 .804-.98l1.473-.295a6.97 6.97 0 0 1 .588-1.405L3.122 5.023a1 1 0 0 1 .15-1.228l.96-.962a1 1 0 0 1 1.23-.15l1.276.743a6.972 6.972 0 0 1 1.405-.588L8.34 1.804ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <ReaderSettingsPanel
                                    open={settingsOpen}
                                    onClose={() => setSettingsOpen(false)}
                                    theme={theme}
                                    font={font}
                                    fontSize={fontSize}
                                    fontSizeValue={fontSizeValue}
                                    onThemeChange={setTheme}
                                    onFontChange={setFont}
                                    onIncreaseFontSize={increaseFontSize}
                                    onDecreaseFontSize={decreaseFontSize}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-3">
                        {/* Mode tabs */}
                        <div
                            className="flex rounded-lg overflow-hidden"
                            style={{ border: '1px solid var(--rt-border)' }}
                        >
                            {(Object.keys(MODE_LABELS) as ReaderMode[])
                                .filter((m) => {
                                    if (m === 'aligned') return canEdit
                                    if (m === 'pdf') return !!pairedPdfPath
                                    return true
                                })
                                .map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                        mode === m ? 'bg-blue-600 text-white' : ''
                                    }`}
                                    style={mode === m ? {} : {
                                        backgroundColor: 'var(--rt-surface)',
                                        color: 'var(--rt-text-muted)',
                                    }}
                                >
                                    {MODE_LABELS[m]}
                                </button>
                            ))}
                        </div>

                        {/* Language selectors */}
                        <div className="flex items-center gap-3">
                            {mode === 'single' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs" style={{ color: 'var(--rt-text-muted)' }}>Display:</span>
                                    <select
                                        value={displayLang}
                                        onChange={(e) => setDisplayLang(e.target.value as 'source' | 'target')}
                                        className="text-sm rounded border px-2 py-1"
                                        style={{
                                            backgroundColor: 'var(--rt-surface)',
                                            color: 'var(--rt-text)',
                                            borderColor: 'var(--rt-border)',
                                        }}
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
                                        className="px-2 py-1 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: 'var(--rt-surface)',
                                            color: 'var(--rt-text)',
                                            borderColor: 'var(--rt-border)',
                                        }}
                                    >
                                        ←
                                    </button>
                                    <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--rt-text-muted)' }}>
                                        <span>{pageNoun}</span>
                                        <select
                                            value={currentPageIndex}
                                            onChange={(e) => goToPage(Number(e.target.value))}
                                            aria-label={`${pageNoun}, ${totalPages} total`}
                                            className="text-sm rounded border px-1 py-1 max-w-[6rem]"
                                            style={{
                                                backgroundColor: 'var(--rt-surface)',
                                                color: 'var(--rt-text)',
                                                borderColor: 'var(--rt-border)',
                                            }}
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
                                        className="px-2 py-1 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: 'var(--rt-surface)',
                                            color: 'var(--rt-text)',
                                            borderColor: 'var(--rt-border)',
                                        }}
                                    >
                                        →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content — font family + size applied here */}
            <div
                data-reader-font={font}
                style={{ fontSize: fontSizeValue }}
            >
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
                        {mode === 'pdf' && pairedPdfPath && (
                            <PdfPageView
                                articleId={articleId}
                                pdfPage={currentPage?.page ?? null}
                            />
                        )}
                    </>
                )}
            </div>
        </main>
    )
}
