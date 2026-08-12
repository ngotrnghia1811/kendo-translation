'use client'

import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import Link from 'next/link'
import type { ReaderPage } from '@/types/reader'
import type {
  ReaderTheme,
  ReaderFont,
  LayoutWidth,
} from '@/hooks/useReaderTheme'
import {
  THEMES,
  FONTS,
  FONT_COLORS,
  LAYOUT_WIDTHS,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
} from '@/hooks/useReaderTheme'
import type { JlptLevel, FuriganaMode } from '@/lib/furigana/types'
import {
  SWATCH_BORDERS,
  JLPT_OPTIONS,
} from '@/components/reader/ReaderSettingsPanel'
import type { ReaderBookmark } from '@/hooks/useReaderBookmarks'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type SidebarSection = 'nav' | 'view' | 'settings' | 'bookmarks' | 'search'

/** Imperative handle exposed to parent (PageReader) for keyboard shortcuts. */
export interface ReaderCollapsibleSidebarHandle {
  openSection: (section: SidebarSection, focusSearchInput?: boolean) => void
}

export interface ReaderCollapsibleSidebarProps {
  /* ── Nav / breadcrumb ─────────────────────────────────── */
  bookId: string
  articleId: string
  pageNumber: number
  totalPages: number
  currentPageIndex: number
  pageNoun: string
  displayTitle: string
  hasJapaneseTitle: boolean
  titleLanguage: 'en' | 'ja'
  onToggleTitleLanguage: () => void
  onGoToPage: (pageIndex: number) => void
  progressPercent: number
  bookAuthor?: string | null
  bookSummary?: string | null

  /* ── View mode / language ─────────────────────────────── */
  mode: 'single' | 'bilingual' | 'aligned' | 'pdf'
  onModeChange: (m: 'single' | 'bilingual' | 'aligned' | 'pdf') => void
  displayLang: 'source' | 'target'
  onDisplayLangChange: (l: 'source' | 'target') => void
  targetLangChoice: 'en' | 'zh'
  onTargetLangChoiceChange: (c: 'en' | 'zh') => void
  sourceLang: string
  targetLang: string
  hasZh: boolean
  canEdit: boolean
  pdfAvailable: boolean

  /* ── Settings ──────────────────────────────────────────── */
  theme: ReaderTheme
  font: ReaderFont
  fontSize: number
  fontSizeValue: string
  fontColor: string | null
  layoutWidth: LayoutWidth
  onThemeChange: (t: ReaderTheme) => void
  onFontChange: (f: ReaderFont) => void
  onFontColorChange: (c: string | null) => void
  onLayoutWidthChange: (w: LayoutWidth) => void
  onIncreaseFontSize: () => void
  onDecreaseFontSize: () => void
  furiganaMode: FuriganaMode
  onFuriganaModeChange: (v: FuriganaMode) => void
  furiganaJlptMinLevel: JlptLevel | null
  onFuriganaJlptMinLevelChange: (v: JlptLevel | null) => void
  tapRevealEnabled: boolean
  onTapRevealEnabledChange: (v: boolean) => void
  focusMode: boolean
  onFocusModeToggle: () => void

  /* ── Bookmarks ─────────────────────────────────────────── */
  bookmarks: ReaderBookmark[]
  isBookmarked: boolean
  onToggleBookmark: () => void
  onRemoveBookmark: (pageIndex: number) => void
  onJumpToBookmark: (pageIndex: number) => void

  /* ── Search ────────────────────────────────────────────── */
  readerPages: ReaderPage[]

  /* ── Other chrome ──────────────────────────────────────── */
  onShowKeyboardHelp: () => void
  onSidebarClose: () => void
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                       */
/* ------------------------------------------------------------------ */

const SIDEBAR_STORAGE_KEY = 'reader-sidebar-state'

interface SidebarState {
  expanded: boolean
  activeSection: SidebarSection
}

function loadSidebarState(): SidebarState {
  if (typeof window === 'undefined') return { expanded: false, activeSection: 'nav' }
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (!raw) return { expanded: false, activeSection: 'nav' }
    return JSON.parse(raw) as SidebarState
  } catch {
    return { expanded: false, activeSection: 'nav' }
  }
}

function saveSidebarState(state: SidebarState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/*  Icon components                                                   */
/* ------------------------------------------------------------------ */

function TocIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function LangIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.78.17 2.632.316m-6.3 8.095c.797.712 1.638 1.373 2.518 1.975M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.97.342 1.405.588l1.277-.743a1 1 0 0 1 1.228.15l.962.96a1 1 0 0 1 .15 1.23l-.743 1.276c.246.435.444.908.588 1.405l1.473.295a1 1 0 0 1 .804.98v1.36a1 1 0 0 1-.804.98l-1.473.295a6.97 6.97 0 0 1-.588 1.405l.743 1.277a1 1 0 0 1-.15 1.228l-.96.962a1 1 0 0 1-1.23.15l-1.276-.743a6.97 6.97 0 0 1-1.405.588l-.295 1.473A1 1 0 0 1 10.68 19H9.32a1 1 0 0 1-.98-.804l-.295-1.473a6.972 6.972 0 0 1-1.405-.588l-1.277.743a1 1 0 0 1-1.228-.15l-.962-.96a1 1 0 0 1-.15-1.23l.743-1.276a6.971 6.971 0 0 1-.588-1.405L1.804 11.32A1 1 0 0 1 1 10.34V8.98a1 1 0 0 1 .804-.98l1.473-.295a6.97 6.97 0 0 1 .588-1.405L3.122 5.023a1 1 0 0 1 .15-1.228l.96-.962a1 1 0 0 1 1.23-.15l1.276.743a6.972 6.972 0 0 1 1.405-.588L8.34 1.804ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Icon rail (collapsed state)                                        */
/* ------------------------------------------------------------------ */

interface IconRailProps {
  activeSection: SidebarSection | null
  onSelect: (section: SidebarSection) => void
  onExpand: () => void
  bookmarksCount: number
}

function IconRail({ activeSection, onSelect, onExpand, bookmarksCount }: IconRailProps) {
  const sections: { key: SidebarSection; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'nav', label: 'Contents', icon: <TocIcon /> },
    { key: 'view', label: 'View & Language', icon: <LangIcon /> },
    { key: 'settings', label: 'Settings', icon: <SettingsIcon /> },
    { key: 'bookmarks', label: 'Bookmarks', icon: <BookmarkIcon />, badge: bookmarksCount },
    { key: 'search', label: 'Search', icon: <SearchIcon /> },
  ]

  return (
    <div
      className="flex flex-col items-center gap-1 py-3 shrink-0 h-full overflow-y-auto"
      style={{
        width: '52px',
        backgroundColor: 'var(--rt-bg)',
        borderRight: '1px solid var(--rt-border)',
      }}
    >
      {/* Expand toggle */}
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand sidebar"
        title="Expand sidebar"
        className="w-9 h-9 flex items-center justify-center rounded-lg mb-2 transition-colors hover:opacity-80"
        style={{ color: 'var(--rt-text-muted)' }}
      >
        <ChevronRightIcon />
      </button>

      {sections.map(({ key, label, icon, badge }) => (
        <div key={key} className="relative">
          <button
            type="button"
            aria-label={label}
            title={label}
            onClick={() => onSelect(key)}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            style={
              activeSection === key
                ? { backgroundColor: '#3b82f6', color: '#fff' }
                : { color: 'var(--rt-text-muted)' }
            }
          >
            {icon}
          </button>
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold leading-none pointer-events-none">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>
      ))}

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section: Nav (TOC + breadcrumb)                                    */
/* ------------------------------------------------------------------ */

function NavSection({
  bookId,
  articleId,
  pageNumber,
  totalPages,
  currentPageIndex,
  pageNoun,
  displayTitle,
  hasJapaneseTitle,
  titleLanguage,
  onToggleTitleLanguage,
  onGoToPage,
  progressPercent,
  bookAuthor,
  bookSummary,
  hasZh,
  readerPages,
}: {
  bookId: string
  articleId: string
  pageNumber: number
  totalPages: number
  currentPageIndex: number
  pageNoun: string
  displayTitle: string
  hasJapaneseTitle: boolean
  titleLanguage: 'en' | 'ja'
  onToggleTitleLanguage: () => void
  onGoToPage: (i: number) => void
  progressPercent: number
  bookAuthor?: string | null
  bookSummary?: string | null
  hasZh: boolean
  readerPages: ReaderPage[]
}) {
  const activeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [currentPageIndex])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Breadcrumb */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--rt-border)' }}>
        <div className="flex items-center gap-1.5 text-sm">
          <Link href="/books" className="hover:underline" style={{ color: 'var(--rt-text-muted)' }}>
            ← Books
          </Link>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <h2 className="text-sm font-semibold truncate" style={{ color: 'var(--rt-text)' }}>
            {displayTitle}
          </h2>
          {hasJapaneseTitle && (
            <button
              type="button"
              onClick={onToggleTitleLanguage}
              title={`Show ${titleLanguage === 'en' ? 'Japanese' : 'English'} title`}
              className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border transition-colors leading-none"
              style={{
                backgroundColor: titleLanguage === 'ja' ? '#3b82f6' : 'var(--rt-surface)',
                borderColor: titleLanguage === 'ja' ? '#3b82f6' : 'var(--rt-border)',
                color: titleLanguage === 'ja' ? '#fff' : 'var(--rt-text-muted)',
              }}
            >
              {titleLanguage === 'en' ? '日' : 'EN'}
            </button>
          )}
        </div>

        {/* Book metadata */}
        {(bookAuthor || bookSummary) && (
          <div className="mt-2 border-l-2 border-blue-300 dark:border-blue-700 pl-2">
            {bookAuthor && (
              <p className="text-[10px]" style={{ color: 'var(--rt-text-muted)' }}>
                <span className="font-medium">Author:</span> {bookAuthor}
              </p>
            )}
            {bookSummary && (
              <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: 'var(--rt-text-muted)' }}>
                {bookSummary}
              </p>
            )}
          </div>
        )}

        {/* Page nav */}
        {totalPages > 1 && (
          <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: 'var(--rt-text-muted)' }}>
            <span>{pageNoun}</span>
            <select
              value={pageNumber}
              onChange={(e) => onGoToPage(Number(e.target.value) - 1)}
              aria-label={`Jump to ${pageNoun}`}
              className="text-xs rounded border px-1 py-0.5"
              style={{
                backgroundColor: 'var(--rt-surface)',
                color: 'var(--rt-text)',
                borderColor: 'var(--rt-border)',
              }}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>of {totalPages}</span>
          </div>
        )}

        {/* Progress bar */}
        {totalPages > 1 && (
          <div className="mt-2 h-1 w-full rounded-full" style={{ backgroundColor: 'var(--rt-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%`, backgroundColor: '#3b82f6' }}
            />
          </div>
        )}

        {/* Download / Export */}
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--rt-border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--rt-text-muted)' }}>
            Export
          </p>
          <div className="flex flex-col gap-0.5">
            {(['en', 'zh'] as const)
              .filter((l) => l === 'en' || hasZh)
              .map((l) => (
                <div key={l} className="flex items-center gap-1">
                  <span className="text-[10px] w-5 text-right font-mono" style={{ color: 'var(--rt-text-muted)' }}>
                    {l.toUpperCase()}
                  </span>
                  {(['txt', 'md'] as const).map((fmt) => (
                    <a
                      key={`${l}-${fmt}`}
                      href={`/api/documents/${articleId}/export?format=${fmt}&lang=${l}`}
                      download
                      className="text-[10px] px-1.5 py-0.5 rounded border transition-colors hover:opacity-80"
                      style={{
                        color: 'var(--rt-text)',
                        backgroundColor: 'var(--rt-surface)',
                        borderColor: 'var(--rt-border)',
                      }}
                    >
                      .{fmt}
                    </a>
                  ))}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Page list */}
      <div className="flex flex-col gap-px overflow-y-auto flex-1 px-2 py-2">
        {readerPages.length === 0 ? (
          <p className="text-xs p-3" style={{ color: 'var(--rt-text-muted)' }}>No pages available.</p>
        ) : (
          readerPages.map((page, i) => {
            const isCurrent = i === currentPageIndex
            return (
              <button
                key={i}
                ref={isCurrent ? activeRef : undefined}
                type="button"
                onClick={() => onGoToPage(i)}
                className="flex items-center gap-2 w-full text-left rounded-lg px-3 py-1.5 text-xs transition-colors"
                style={isCurrent ? {
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  fontWeight: 600,
                } : {
                  backgroundColor: 'transparent',
                  color: 'var(--rt-text)',
                }}
                aria-current={isCurrent ? 'page' : undefined}
              >
                <span
                  className="shrink-0 w-10 text-right font-mono"
                  style={{ color: isCurrent ? 'rgba(255,255,255,0.7)' : 'var(--rt-text-muted)' }}
                >
                  {page.label}
                </span>
                <span className="flex-1 truncate">
                  {page.segments[0]?.source_text?.slice(0, 60) || '—'}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section: View & Language                                           */
/* ------------------------------------------------------------------ */

function ViewLanguageSection({
  mode,
  onModeChange,
  displayLang,
  onDisplayLangChange,
  targetLangChoice,
  onTargetLangChoiceChange,
  sourceLang,
  targetLang,
  hasZh,
  canEdit,
  pdfAvailable,
}: {
  mode: 'single' | 'bilingual' | 'aligned' | 'pdf'
  onModeChange: (m: 'single' | 'bilingual' | 'aligned' | 'pdf') => void
  displayLang: 'source' | 'target'
  onDisplayLangChange: (l: 'source' | 'target') => void
  targetLangChoice: 'en' | 'zh'
  onTargetLangChoiceChange: (c: 'en' | 'zh') => void
  sourceLang: string
  targetLang: string
  hasZh: boolean
  canEdit: boolean
  pdfAvailable: boolean
}) {
  /* ── View mode options ─────────────────────────────── */
  const VIEW_OPTIONS: { value: 'single' | 'bilingual' | 'aligned' | 'pdf'; label: string; gated?: boolean; gateReason?: string }[] = [
    { value: 'single', label: 'Single' },
    { value: 'bilingual', label: 'Bilingual' },
    { value: 'aligned', label: 'Aligned', gated: !canEdit, gateReason: 'Editor only' },
    { value: 'pdf', label: 'PDF', gated: !pdfAvailable, gateReason: 'No paired PDF' },
  ]

  /* ── Language options depend on mode ────────────────── */
  const langOptions = useMemo(() => {
    if (mode === 'single') {
      const opts: { label: string; action: () => void; active: boolean }[] = [
        { label: sourceLang.toUpperCase(), action: () => onDisplayLangChange('source'), active: displayLang === 'source' },
        { label: targetLang.toUpperCase(), action: () => { onDisplayLangChange('target'); onTargetLangChoiceChange('en') }, active: displayLang === 'target' && targetLangChoice === 'en' },
      ]
      if (hasZh) {
        opts.push({ label: 'ZH', action: () => { onDisplayLangChange('target'); onTargetLangChoiceChange('zh') }, active: displayLang === 'target' && targetLangChoice === 'zh' })
      }
      return opts
    }
    if (mode === 'bilingual') {
      const opts: { label: string; action: () => void; active: boolean }[] = [
        { label: `${sourceLang.toUpperCase()}+${targetLang.toUpperCase()}`, action: () => onTargetLangChoiceChange('en'), active: targetLangChoice === 'en' },
      ]
      if (hasZh) {
        opts.push({ label: `${sourceLang.toUpperCase()}+ZH`, action: () => onTargetLangChoiceChange('zh'), active: targetLangChoice === 'zh' })
      }
      return opts
    }
    // Aligned / PDF — no language switching
    return []
  }, [mode, displayLang, targetLangChoice, sourceLang, targetLang, hasZh, onDisplayLangChange, onTargetLangChoiceChange])

  const viewLabel = VIEW_OPTIONS.find((o) => o.value === mode)?.label ?? 'Single'
  const langLabel = langOptions.find((o) => o.active)?.label ?? '—'

  return (
    <div className="p-4 space-y-6">
      {/* ── View selector ─────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rt-text-muted)' }}>
          View
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {VIEW_OPTIONS.map((opt) => {
            const disabled = opt.gated
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                title={disabled ? opt.gateReason : opt.label}
                onClick={() => onModeChange(opt.value)}
                className="px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={
                  mode === opt.value
                    ? { backgroundColor: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }
                    : { backgroundColor: 'var(--rt-surface)', color: 'var(--rt-text)', borderColor: 'var(--rt-border)' }
                }
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Language selector ─────────────────────────── */}
      {langOptions.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rt-text-muted)' }}>
            Language
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {langOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={opt.action}
                className="px-3 py-1.5 text-sm rounded-lg border transition-colors"
                style={
                  opt.active
                    ? { backgroundColor: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }
                    : { backgroundColor: 'var(--rt-surface)', color: 'var(--rt-text)', borderColor: 'var(--rt-border)' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {langOptions.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--rt-text-muted)' }}>
          Language options not applicable in this view mode.
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section: Settings                                                  */
/* ------------------------------------------------------------------ */

function SettingsSection({
  theme,
  font,
  fontSizeValue,
  fontColor,
  layoutWidth,
  onThemeChange,
  onFontChange,
  onFontColorChange,
  onLayoutWidthChange,
  onIncreaseFontSize,
  onDecreaseFontSize,
  furiganaMode,
  onFuriganaModeChange,
  furiganaJlptMinLevel,
  onFuriganaJlptMinLevelChange,
  tapRevealEnabled,
  onTapRevealEnabledChange,
  focusMode,
  onFocusModeToggle,
  fontSize,
}: {
  theme: ReaderTheme
  font: ReaderFont
  fontSize: number
  fontSizeValue: string
  fontColor: string | null
  layoutWidth: LayoutWidth
  onThemeChange: (t: ReaderTheme) => void
  onFontChange: (f: ReaderFont) => void
  onFontColorChange: (c: string | null) => void
  onLayoutWidthChange: (w: LayoutWidth) => void
  onIncreaseFontSize: () => void
  onDecreaseFontSize: () => void
  furiganaMode: FuriganaMode
  onFuriganaModeChange: (v: FuriganaMode) => void
  furiganaJlptMinLevel: JlptLevel | null
  onFuriganaJlptMinLevelChange: (v: JlptLevel | null) => void
  tapRevealEnabled: boolean
  onTapRevealEnabledChange: (v: boolean) => void
  focusMode: boolean
  onFocusModeToggle: () => void
}) {
  return (
    <div className="p-4 space-y-5 overflow-y-auto flex-1">
      {/* ── Theme ─────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rt-text-muted)' }}>
          Colour theme
        </h3>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              title={t.label}
              aria-pressed={theme === t.id}
              onClick={() => onThemeChange(t.id)}
              className="flex flex-col items-center gap-1"
            >
              <span
                className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                  theme === t.id ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'ring-1 ring-gray-300 dark:ring-gray-600'
                }`}
                style={{
                  backgroundColor: t.swatch,
                  border: `1.5px solid ${SWATCH_BORDERS[t.id] || '#cbd5e1'}`,
                }}
              >
                {theme === t.id && (
                  <svg className="w-4 h-4 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </span>
              <span className="text-[10px] leading-none" style={{ color: 'var(--rt-text-muted)' }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Font ──────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rt-text-muted)' }}>
          Font
        </h3>
        <div className="flex gap-1.5 flex-wrap">
          {FONTS.map((f) => (
            <button
              key={f.id}
              aria-pressed={font === f.id}
              onClick={() => onFontChange(f.id)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                font === f.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : ''
              }`}
              style={font !== f.id ? {
                backgroundColor: 'var(--rt-surface)',
                color: 'var(--rt-text)',
                borderColor: 'var(--rt-border)',
              } : undefined}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Text colour ───────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rt-text-muted)' }}>
          Text colour
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {FONT_COLORS.map((c) => {
            const isSelected = fontColor === c.value
            const isDefault = c.value === null
            return (
              <button
                key={c.label}
                title={c.label}
                aria-pressed={isSelected}
                onClick={() => onFontColorChange(c.value)}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={`w-7 h-7 rounded-full transition-all flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'ring-1 ring-gray-300 dark:ring-gray-600'
                  } ${isDefault ? 'border border-dashed border-gray-400' : ''}`}
                  style={isDefault ? {} : {
                    backgroundColor: c.value!,
                    border: c.value === '#f9fafb' ? '1.5px solid #cbd5e1' : undefined,
                  }}
                >
                  {isDefault && <span style={{ color: 'var(--rt-text-muted)' }}>A</span>}
                  {isSelected && !isDefault && (
                    <svg className="w-3.5 h-3.5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </span>
                <span className="text-[9px] leading-none max-w-[3rem] text-center" style={{ color: 'var(--rt-text-muted)' }}>
                  {c.label}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Font size ─────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rt-text-muted)' }}>
          Size
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={onDecreaseFontSize}
            disabled={fontSize <= FONT_SIZE_MIN}
            aria-label="Decrease font size"
            className="w-8 h-8 flex items-center justify-center rounded-lg border text-lg font-bold enabled:hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ borderColor: 'var(--rt-border)', color: 'var(--rt-text)' }}
          >
            −
          </button>
          <span className="w-14 text-center text-sm tabular-nums select-none" style={{ color: 'var(--rt-text)' }}>
            {fontSizeValue}
          </span>
          <button
            onClick={onIncreaseFontSize}
            disabled={fontSize >= FONT_SIZE_MAX}
            aria-label="Increase font size"
            className="w-8 h-8 flex items-center justify-center rounded-lg border text-lg font-bold enabled:hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ borderColor: 'var(--rt-border)', color: 'var(--rt-text)' }}
          >
            +
          </button>
        </div>
      </section>

      {/* ── Layout width ───────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rt-text-muted)' }}>
          Width
        </h3>
        <div className="flex gap-1.5 flex-wrap">
          {LAYOUT_WIDTHS.map((w) => (
            <button
              key={w.id}
              aria-pressed={layoutWidth === w.id}
              onClick={() => onLayoutWidthChange(w.id)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                layoutWidth === w.id ? 'bg-blue-600 text-white border-blue-600' : ''
              }`}
              style={layoutWidth !== w.id ? {
                backgroundColor: 'var(--rt-surface)',
                color: 'var(--rt-text)',
                borderColor: 'var(--rt-border)',
              } : undefined}
            >
              {w.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Furigana ───────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rt-text-muted)' }}>
          Furigana
        </h3>
        <div className="flex items-center rounded-lg overflow-hidden text-xs font-medium mb-2" style={{ border: '1px solid var(--rt-border)', width: 'max-content' }}>
          {([
            { mode: 'off' as FuriganaMode, label: 'Off' },
            { mode: 'furigana' as FuriganaMode, label: 'Furigana' },
            { mode: 'romaji' as FuriganaMode, label: 'Rōmaji' },
          ]).map(({ mode: m, label }) => (
            <button
              key={m}
              type="button"
              aria-pressed={furiganaMode === m}
              onClick={() => onFuriganaModeChange(m)}
              className="px-2.5 py-1 transition-colors whitespace-nowrap"
              style={furiganaMode === m ? { backgroundColor: '#3b82f6', color: '#fff' } : { backgroundColor: 'transparent', color: 'var(--rt-text-muted)' }}
            >
              {label}
            </button>
          ))}
        </div>
        {furiganaMode !== 'off' && (
          <div className="flex gap-1 flex-wrap">
            {JLPT_OPTIONS.map((opt) => (
              <button
                key={opt.value ?? 'all'}
                aria-pressed={furiganaJlptMinLevel === opt.value}
                onClick={() => onFuriganaJlptMinLevelChange(opt.value)}
                className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                  furiganaJlptMinLevel === opt.value ? 'bg-blue-600 text-white border-blue-600' : ''
                }`}
                style={furiganaJlptMinLevel !== opt.value ? {
                  backgroundColor: 'var(--rt-surface)',
                  color: 'var(--rt-text)',
                  borderColor: 'var(--rt-border)',
                } : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Tap-to-reveal ──────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rt-text-muted)' }}>
          Tap to reveal
        </h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={tapRevealEnabled}
            onClick={() => onTapRevealEnabledChange(!tapRevealEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              tapRevealEnabled ? 'bg-blue-600' : ''
            }`}
            style={!tapRevealEnabled ? { backgroundColor: 'var(--rt-border)' } : undefined}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                tapRevealEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm" style={{ color: 'var(--rt-text)' }}>
            {tapRevealEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </section>

      {/* ── Focus mode ─────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rt-text-muted)' }}>
          Focus
        </h3>
        <button
          type="button"
          onClick={onFocusModeToggle}
          className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
            focusMode ? 'bg-blue-600 text-white border-blue-600' : ''
          }`}
          style={!focusMode ? {
            backgroundColor: 'var(--rt-surface)',
            color: 'var(--rt-text)',
            borderColor: 'var(--rt-border)',
          } : undefined}
        >
          {focusMode ? 'Exit focus mode' : 'Enter focus mode'}
        </button>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section: Bookmarks                                                 */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

function BookmarksSection({
  bookmarks,
  currentPageIndex,
  pageNoun,
  onJumpTo,
  onRemove,
  isBookmarked,
  onToggleBookmark,
}: {
  bookmarks: ReaderBookmark[]
  currentPageIndex: number
  pageNoun: string
  onJumpTo: (i: number) => void
  onRemove: (i: number) => void
  isBookmarked: boolean
  onToggleBookmark: () => void
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Bookmark toggle for current page */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--rt-border)' }}>
        <button
          type="button"
          onClick={onToggleBookmark}
          className="w-full px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2"
          style={
            isBookmarked
              ? { backgroundColor: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }
              : { backgroundColor: 'var(--rt-surface)', color: 'var(--rt-text)', borderColor: 'var(--rt-border)' }
          }
        >
          <BookmarkIcon />
          {isBookmarked ? 'Remove bookmark' : `Bookmark ${pageNoun} ${currentPageIndex + 1}`}
        </button>
      </div>

      {/* Bookmark list */}
      <div className="overflow-y-auto flex-1">
        {bookmarks.length === 0 ? (
          <p className="text-sm text-center py-8 px-4" style={{ color: 'var(--rt-text-muted)' }}>
            No bookmarks yet.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--rt-border)' }}>
            {bookmarks.map((bm) => {
              const isCurrent = bm.pageIndex === currentPageIndex
              return (
                <li key={bm.pageIndex} className="flex items-start gap-2 px-4 py-2.5" style={isCurrent ? { backgroundColor: 'rgba(59,130,246,0.08)' } : undefined}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: isCurrent ? '#3b82f6' : 'var(--rt-text-muted)' }}>
                    <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v10.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25V4.75A1.75 1.75 0 0 0 16.25 3H3.75ZM10 14a.75.75 0 0 1-.53-.22l-3-3a.75.75 0 1 1 1.06-1.06L10 12.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3A.75.75 0 0 1 10 14Z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      className="text-xs font-medium text-left w-full hover:underline"
                      style={{ color: isCurrent ? '#3b82f6' : 'var(--rt-text)' }}
                      onClick={() => onJumpTo(bm.pageIndex)}
                    >
                      {pageNoun} {bm.pageLabel}
                      {isCurrent && <span className="ml-1 font-normal" style={{ color: 'var(--rt-text-muted)' }}>(here)</span>}
                    </button>
                    <p className="text-[10px]" style={{ color: 'var(--rt-text-muted)' }}>{formatDate(bm.createdAt)}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove bookmark for ${pageNoun} ${bm.pageLabel}`}
                    onClick={() => onRemove(bm.pageIndex)}
                    className="shrink-0 text-xs rounded px-1 py-0.5"
                    style={{ color: 'var(--rt-text-muted)' }}
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section: Search                                                    */
/* ------------------------------------------------------------------ */

interface SearchResult {
  pageIndex: number
  pageLabel: string
  sourceText: string
  targetText: string
  matchIn: 'source' | 'target' | 'both'
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query || !text) return text
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(re)
  return parts.map((part, i) =>
    re.test(part) ? <mark key={i} style={{ backgroundColor: '#fef08a', color: '#000', borderRadius: 2 }}>{part}</mark> : part,
  )
}

function searchPagesFn(pages: ReaderPage[], query: string, maxResults = 80): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const results: SearchResult[] = []
  for (let pi = 0; pi < pages.length; pi++) {
    for (const seg of pages[pi].segments) {
      if (results.length >= maxResults) break
      const src = seg.source_text || ''
      const tgt = seg.target_text || ''
      const inSrc = src.toLowerCase().includes(q)
      const inTgt = tgt.toLowerCase().includes(q)
      if (inSrc || inTgt) {
        results.push({
          pageIndex: pi,
          pageLabel: pages[pi].label,
          sourceText: src,
          targetText: tgt,
          matchIn: inSrc && inTgt ? 'both' : inSrc ? 'source' : 'target',
        })
      }
    }
  }
  return results
}

function SearchSection({
  pages,
  pageNoun,
  onGoToPage,
}: {
  pages: ReaderPage[]
  pageNoun: string
  onGoToPage: (i: number) => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const results = useMemo(() => searchPagesFn(pages, query), [pages, query])
  const hasQuery = query.trim().length > 0

  const grouped = useMemo(() => {
    const map = new Map<number, SearchResult[]>()
    for (const r of results) {
      if (!map.has(r.pageIndex)) map.set(r.pageIndex, [])
      map.get(r.pageIndex)!.push(r)
    }
    return map
  }, [results])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-3 shrink-0">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ backgroundColor: 'var(--rt-surface)', borderColor: 'var(--rt-border)' }}>
          <SearchIcon />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search document…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--rt-text)' }}
            aria-label="Search document"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" style={{ color: 'var(--rt-text-muted)' }}>✕</button>
          )}
        </div>
      </div>
      <div className="overflow-y-auto flex-1 px-3 pb-4">
        {!hasQuery && <p className="text-sm text-center py-8" style={{ color: 'var(--rt-text-muted)' }}>Type to search across all pages</p>}
        {hasQuery && results.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--rt-text-muted)' }}>No results for &ldquo;{query}&rdquo;</p>}
        {hasQuery && results.length > 0 && (
          <>
            <p className="text-xs mb-3" style={{ color: 'var(--rt-text-muted)' }}>{results.length} result{results.length === 1 ? '' : 's'}</p>
            {Array.from(grouped.entries()).map(([pageIndex, pageResults]) => (
              <div key={pageIndex} className="mb-3">
                <div className="text-xs font-semibold mb-1 px-1 py-0.5 rounded" style={{ color: 'var(--rt-text-muted)', backgroundColor: 'var(--rt-surface)' }}>
                  {pageNoun} {pageResults[0].pageLabel}
                </div>
                <div className="flex flex-col gap-1">
                  {pageResults.map((r, ri) => (
                    <button
                      key={ri}
                      type="button"
                      onClick={() => onGoToPage(r.pageIndex)}
                      className="w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors"
                      style={{ backgroundColor: 'var(--rt-surface)', borderColor: 'var(--rt-border)', color: 'var(--rt-text)' }}
                    >
                      {(r.matchIn === 'source' || r.matchIn === 'both') && r.sourceText && (
                        <div className="line-clamp-2 mb-1">{highlight(r.sourceText, query)}</div>
                      )}
                      {(r.matchIn === 'target' || r.matchIn === 'both') && r.targetText && (
                        <div className="line-clamp-2">{highlight(r.targetText, query)}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const ReaderCollapsibleSidebar = forwardRef<ReaderCollapsibleSidebarHandle, ReaderCollapsibleSidebarProps>(
  function ReaderCollapsibleSidebar(props, ref) {
  const {
    bookId,
    articleId,
    pageNumber,
    totalPages,
    currentPageIndex,
    pageNoun,
    displayTitle,
    hasJapaneseTitle,
    titleLanguage,
    onToggleTitleLanguage,
    onGoToPage,
    progressPercent,
    bookAuthor,
    bookSummary,
    /* view / lang */
    mode,
    onModeChange,
    displayLang,
    onDisplayLangChange,
    targetLangChoice,
    onTargetLangChoiceChange,
    sourceLang,
    targetLang,
    hasZh,
    canEdit,
    pdfAvailable,
    /* settings */
    theme, font, fontSize, fontSizeValue, fontColor, layoutWidth,
    onThemeChange, onFontChange, onFontColorChange, onLayoutWidthChange,
    onIncreaseFontSize, onDecreaseFontSize,
    furiganaMode, onFuriganaModeChange,
    furiganaJlptMinLevel, onFuriganaJlptMinLevelChange,
    tapRevealEnabled, onTapRevealEnabledChange,
    focusMode, onFocusModeToggle,
    /* bookmarks */
    bookmarks, isBookmarked, onToggleBookmark, onRemoveBookmark, onJumpToBookmark,
    /* search */
    readerPages,
    /* other */
    onShowKeyboardHelp,
    onSidebarClose,
  } = props

  const [sidebarState, setSidebarState] = useState<SidebarState>(loadSidebarState)
  const { expanded, activeSection } = sidebarState
  const sidebarRef = useRef<HTMLDivElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  /* ── Detect mobile ──────────────────────────────── */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  /* ── Persist state changes ──────────────────────── */
  const updateState = useCallback((patch: Partial<SidebarState>) => {
    setSidebarState((prev) => {
      const next = { ...prev, ...patch }
      saveSidebarState(next)
      return next
    })
  }, [])

  /* ── Imperative handle (for keyboard shortcuts) ─── */
  useImperativeHandle(ref, () => ({
    openSection(section: SidebarSection, _focus?: boolean) {
      updateState({ expanded: true, activeSection: section })
    },
  }), [updateState])

  const handleExpand = useCallback(() => updateState({ expanded: true }), [updateState])
  const handleCollapse = useCallback(() => updateState({ expanded: false }), [updateState])
  const handleSelectSection = useCallback((section: SidebarSection) => {
    updateState({ expanded: true, activeSection: section })
  }, [updateState])

  /* ── Close on Escape ─────────────────────────────── */
  useEffect(() => {
    if (!expanded) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCollapse() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [expanded, handleCollapse])

  /* ── Mobile overlay: close on backdrop click ─────── */
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
      handleCollapse()
    }
  }, [handleCollapse])

  /* ── Content area ────────────────────────────────── */
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'nav':
        return (
          <NavSection
            bookId={bookId}
            articleId={articleId}
            pageNumber={pageNumber}
            totalPages={totalPages}
            currentPageIndex={currentPageIndex}
            pageNoun={pageNoun}
            displayTitle={displayTitle}
            hasJapaneseTitle={hasJapaneseTitle}
            titleLanguage={titleLanguage}
            onToggleTitleLanguage={onToggleTitleLanguage}
            onGoToPage={(i) => { onGoToPage(i); if (isMobile) handleCollapse() }}
            progressPercent={progressPercent}
            bookAuthor={bookAuthor}
            bookSummary={bookSummary}
            hasZh={hasZh}
            readerPages={readerPages}
          />
        )
      case 'view':
        return (
          <ViewLanguageSection
            mode={mode}
            onModeChange={onModeChange}
            displayLang={displayLang}
            onDisplayLangChange={onDisplayLangChange}
            targetLangChoice={targetLangChoice}
            onTargetLangChoiceChange={onTargetLangChoiceChange}
            sourceLang={sourceLang}
            targetLang={targetLang}
            hasZh={hasZh}
            canEdit={canEdit}
            pdfAvailable={pdfAvailable}
          />
        )
      case 'settings':
        return (
          <SettingsSection
            theme={theme} font={font} fontSize={fontSize} fontSizeValue={fontSizeValue}
            fontColor={fontColor} layoutWidth={layoutWidth}
            onThemeChange={onThemeChange} onFontChange={onFontChange}
            onFontColorChange={onFontColorChange} onLayoutWidthChange={onLayoutWidthChange}
            onIncreaseFontSize={onIncreaseFontSize} onDecreaseFontSize={onDecreaseFontSize}
            furiganaMode={furiganaMode} onFuriganaModeChange={onFuriganaModeChange}
            furiganaJlptMinLevel={furiganaJlptMinLevel} onFuriganaJlptMinLevelChange={onFuriganaJlptMinLevelChange}
            tapRevealEnabled={tapRevealEnabled} onTapRevealEnabledChange={onTapRevealEnabledChange}
            focusMode={focusMode} onFocusModeToggle={onFocusModeToggle}
          />
        )
      case 'bookmarks':
        return (
          <BookmarksSection
            bookmarks={bookmarks}
            currentPageIndex={currentPageIndex}
            pageNoun={pageNoun}
            onJumpTo={(i) => { onJumpToBookmark(i); if (isMobile) handleCollapse() }}
            onRemove={onRemoveBookmark}
            isBookmarked={isBookmarked}
            onToggleBookmark={onToggleBookmark}
          />
        )
      case 'search':
        return (
          <SearchSection
            pages={readerPages}
            pageNoun={pageNoun}
            onGoToPage={(i) => { onGoToPage(i); if (isMobile) handleCollapse() }}
          />
        )
      default:
        return null
    }
  }

  /* ── Collapsed: icon rail only ───────────────────── */
  if (!expanded) {
    if (isMobile) {
      // Mobile: show a thin expandable toggle in a fixed bottom-left position
      return (
        <button
          type="button"
          onClick={handleExpand}
          aria-label="Open sidebar"
          className="fixed bottom-4 left-4 z-30 w-11 h-11 flex items-center justify-center rounded-full shadow-lg border transition-all"
          style={{
            backgroundColor: 'var(--rt-bg)',
            borderColor: 'var(--rt-border)',
            color: 'var(--rt-text)',
          }}
        >
          <TocIcon />
        </button>
      )
    }
    // Desktop: icon rail on left
    return (
      <div className="hidden md:flex shrink-0 h-full" style={{ width: '52px' }}>
        <IconRail
          activeSection={activeSection}
          onSelect={handleSelectSection}
          onExpand={handleExpand}
          bookmarksCount={bookmarks.length}
        />
      </div>
    )
  }

  /* ── Expanded ──────────────────────────────────────── */
  // Mobile: full-screen overlay
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-50 flex"
        onClick={handleBackdropClick}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <div
          ref={sidebarRef}
          className="flex flex-col w-full max-h-full"
          style={{
            backgroundColor: 'var(--rt-bg)',
            borderTop: '1px solid var(--rt-border)',
            borderRadius: '16px 16px 0 0',
            marginTop: '10vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile header with tabs */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--rt-border)' }}>
            <div className="flex gap-1 overflow-x-auto">
              {(['nav', 'view', 'settings', 'bookmarks', 'search'] as SidebarSection[]).map((key) => {
                const labels: Record<SidebarSection, string> = { nav: 'Nav', view: 'View', settings: 'Settings', bookmarks: 'Bm', search: 'Search' }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateState({ activeSection: key })}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0"
                    style={activeSection === key ? { backgroundColor: '#3b82f6', color: '#fff' } : { backgroundColor: 'var(--rt-surface)', color: 'var(--rt-text-muted)' }}
                  >
                    {labels[key]}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={handleCollapse}
              aria-label="Close sidebar"
              className="w-7 h-7 flex items-center justify-center rounded-lg ml-2"
              style={{ color: 'var(--rt-text-muted)' }}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{renderSectionContent()}</div>
        </div>
      </div>
    )
  }

  // Desktop: expanded sidebar
  return (
    <div className="hidden md:flex shrink-0 h-full" style={{ width: '300px' }}>
      {/* Icon rail (still visible on the inner side for quick nav) */}
      <IconRail
        activeSection={activeSection}
        onSelect={handleSelectSection}
        onExpand={handleExpand}
        bookmarksCount={bookmarks.length}
      />

      {/* Expanded panel */}
      <div
        ref={sidebarRef}
        className="flex flex-col flex-1 min-w-0"
        style={{
          backgroundColor: 'var(--rt-bg)',
          borderRight: '1px solid var(--rt-border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--rt-border)' }}>
          <div className="flex gap-1 overflow-x-auto">
            {(['nav', 'view', 'settings', 'bookmarks', 'search'] as SidebarSection[]).map((key) => {
              const labels: Record<SidebarSection, string> = { nav: 'Nav', view: 'View', settings: 'Settings', bookmarks: 'Bm', search: 'Search' }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateState({ activeSection: key })}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors shrink-0"
                  style={activeSection === key ? { backgroundColor: '#3b82f6', color: '#fff' } : { backgroundColor: 'var(--rt-surface)', color: 'var(--rt-text-muted)' }}
                >
                  {labels[key]}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-1">
            {/* Keyboard help */}
            <button
              type="button"
              onClick={onShowKeyboardHelp}
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--rt-text-muted)' }}
            >
              <HelpIcon />
            </button>
            {/* Collapse */}
            <button
              type="button"
              onClick={handleCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--rt-text-muted)' }}
            >
              <ChevronLeftIcon />
            </button>
          </div>
        </div>

        {/* Section content */}
        <div className="flex-1 min-h-0 overflow-y-auto">{renderSectionContent()}</div>
      </div>
    </div>
  )
})

export default ReaderCollapsibleSidebar
