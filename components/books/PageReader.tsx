'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTitleLanguage } from '@/hooks/useTitleLanguage';
import { useThemeContext } from '@/components/shared/ThemeProvider';
import RubyText from '@/components/reader/RubyText';
import type { PageContent, PageSegment } from '@/components/books/types';
import type { RubySpan, JlptLevel } from '@/lib/furigana/types';

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface PageReaderProps {
  /** The full page content from GET /api/books/[bookId]/[articleId]/[page]. */
  pageContent: PageContent;
  /** Book ID — used for navigation links back to level 1/2. */
  bookId: string;
  /** Article ID — used for prev/next and back links. */
  articleId: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STATUS_BADGE_COLORS: Record<string, string> = {
  qa_approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  proofread: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  edited: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  translated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

// Conservative ruff-style line limit — avoids huge sections not fitting viewport.
const MAX_SEGMENTS_PER_PAGE = 50;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Concatenate ruby spans into a plain string.
 * Used when furigana is off.
 */
function rubySpansToText(spans: RubySpan[]): string {
  return spans.map((s) => (s.type === 'kanji' ? (s.base ?? '') : (s.text ?? ''))).join('');
}

/* ------------------------------------------------------------------ */
/*  Segment block (bilingual EN/JA text pair)                          */
/* ------------------------------------------------------------------ */

function SegmentBlock({
  segment,
  furiganaMode,
  furiganaJlptMinLevel,
}: {
  segment: PageSegment;
  furiganaMode: 'off' | 'furigana' | 'romaji';
  furiganaJlptMinLevel: JlptLevel | null;
}) {
  const rubySpans: RubySpan[] | null = segment.ruby_data?.spans?.length
    ? (segment.ruby_data.spans as RubySpan[])
    : null;

  return (
    <div className="mb-5">
      {/* Source text (Japanese) — left-bordered */}
      <div className="border-l-4 border-red-400 dark:border-red-500/70 pl-4 py-2 mb-2">
        <p className="text-base leading-relaxed" lang="ja">
          {rubySpans ? (
            <RubyText
              spans={rubySpans}
              furiganaMode={furiganaMode}
              furiganaJlptMinLevel={furiganaJlptMinLevel}
            />
          ) : (
            segment.source_text
          )}
        </p>
      </div>

      {/* Target text (English) — left-bordered */}
      {segment.target_text && segment.target_text.trim() ? (
        <div className="border-l-4 border-blue-400 dark:border-blue-500/70 pl-4 py-2">
          <p className="text-base leading-relaxed" lang="en">
            {segment.target_text}
          </p>
        </div>
      ) : (
        <div className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-2">
          <p className="text-sm italic text-[var(--color-text-muted)]">
            No translation yet
          </p>
        </div>
      )}

      {/* Status badge row */}
      <div className="flex items-center gap-2 mt-1.5">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            STATUS_BADGE_COLORS[segment.status] ?? STATUS_BADGE_COLORS.draft
          }`}
        >
          {segment.status === 'qa_approved' ? 'approved' : segment.status}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          #{segment.position}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function PageReader({ pageContent, bookId, articleId }: PageReaderProps) {
  const { titleLanguage, toggleTitleLanguage } = useTitleLanguage();
  const {
    theme,
    font,
    fontSizeValue,
    furiganaMode,
    furiganaJlptMinLevel,
  } = useThemeContext();

  const page = pageContent;
  const displayTitle =
    titleLanguage === 'ja' && page.article.title_ja
      ? page.article.title_ja
      : page.article.title;

  // Cap displayed segments at MAX_SEGMENTS_PER_PAGE to avoid huge renders.
  // The full list is available via page.segments if needed.
  const visibleSegments = useMemo(
    () => page.segments.slice(0, MAX_SEGMENTS_PER_PAGE),
    [page.segments],
  );

  const hasPrev = page.page_number > 1;
  const hasNext = page.page_number < page.page_count;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg)' }}
      data-reader-theme={theme}
    >
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div
        className="shrink-0 z-10 px-4 py-3"
        style={{
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Link
              href="/books"
              className="text-sm shrink-0 hover:underline"
              style={{ color: 'var(--color-link)' }}
            >
              Books
            </Link>
            <span style={{ color: 'var(--color-text-muted)' }}>/</span>
            <Link
              href={`/books/${bookId}`}
              className="text-sm shrink-0 hover:underline truncate max-w-[120px]"
              style={{ color: 'var(--color-link)' }}
            >
              Book
            </Link>
            <span style={{ color: 'var(--color-text-muted)' }}>/</span>
            <Link
              href={`/books/${bookId}/${articleId}`}
              className="text-sm shrink-0 hover:underline truncate max-w-[120px]"
              style={{ color: 'var(--color-link)' }}
            >
              Article
            </Link>
            <span style={{ color: 'var(--color-text-muted)' }}>/</span>
            <span className="text-sm font-medium text-[var(--color-text)] truncate max-w-[200px]">
              {page.mode === 'source_page' ? 'Page' : 'Chunk'} {page.page_number}
            </span>
          </div>

          {/* Title + toggle */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <h1 className="text-base font-semibold truncate" style={{ color: 'var(--color-text)' }}>
              {displayTitle}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              {page.article.title_ja && (
                <button
                  type="button"
                  onClick={toggleTitleLanguage}
                  title={`Toggle title language (currently ${titleLanguage === 'en' ? 'English' : 'Japanese'})`}
                  className="text-[10px] px-1.5 py-0.5 rounded border transition-colors leading-none"
                  style={{
                    backgroundColor: titleLanguage === 'ja' ? '#3b82f6' : 'var(--color-surface)',
                    borderColor: titleLanguage === 'ja' ? '#3b82f6' : 'var(--color-border)',
                    color: titleLanguage === 'ja' ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {titleLanguage === 'en' ? '日' : 'EN'}
                </button>
              )}
            </div>
          </div>

          {/* Page navigation bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {hasPrev ? (
                <Link
                  href={`/books/${bookId}/${articleId}/${page.page_number - 1}`}
                  className="px-3 py-1.5 text-sm rounded-lg border transition-colors hover:bg-[var(--color-bg)]"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-surface)',
                  }}
                >
                  ← Prev
                </Link>
              ) : (
                <span
                  className="px-3 py-1.5 text-sm rounded-lg border opacity-40"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  ← Prev
                </span>
              )}
            </div>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {page.page_number} / {page.page_count}
            </span>
            <div className="flex items-center gap-1">
              {hasNext ? (
                <Link
                  href={`/books/${bookId}/${articleId}/${page.page_number + 1}`}
                  className="px-3 py-1.5 text-sm rounded-lg border transition-colors hover:bg-[var(--color-bg)]"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-surface)',
                  }}
                >
                  Next →
                </Link>
              ) : (
                <span
                  className="px-3 py-1.5 text-sm rounded-lg border opacity-40"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Next →
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Progress bar ────────────────────────────────────────── */}
      {page.page_count > 1 && (
        <div
          className="shrink-0 h-1 w-full"
          style={{ backgroundColor: 'var(--color-border)' }}
          role="progressbar"
          aria-valuenow={Math.round(((page.page_number - 1) / (page.page_count - 1)) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.round(((page.page_number - 1) / (page.page_count - 1)) * 100)}%`,
              backgroundColor: '#3b82f6',
            }}
          />
        </div>
      )}

      {/* ── Content area ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div
          data-reader-font={font}
          style={{ fontSize: fontSizeValue }}
        >
          <div className="max-w-2xl mx-auto py-6 px-4">
            {visibleSegments.length === 0 ? (
              <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>
                <p className="text-4xl mb-4">📄</p>
                <p className="text-lg font-medium text-[var(--color-text)] mb-2">No segments</p>
                <p className="text-sm">This page has no translatable content yet.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {visibleSegments.map((seg) => (
                  <SegmentBlock
                    key={seg.id}
                    segment={seg}
                    furiganaMode={furiganaMode}
                    furiganaJlptMinLevel={furiganaJlptMinLevel}
                  />
                ))}
              </div>
            )}

            {page.segments.length > MAX_SEGMENTS_PER_PAGE && (
              <p className="text-xs text-center mt-4" style={{ color: 'var(--color-text-muted)' }}>
                Showing first {MAX_SEGMENTS_PER_PAGE} of {page.segments.length} segments.
                Navigate between pages to see more.
              </p>
            )}

            {/* Bottom navigation */}
            {page.page_count > 1 && (
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-[var(--color-border)]">
                {hasPrev ? (
                  <Link
                    href={`/books/${bookId}/${articleId}/${page.page_number - 1}`}
                    className="flex items-center gap-1 text-sm hover:underline"
                    style={{ color: 'var(--color-link)' }}
                  >
                    ← Previous {page.mode === 'source_page' ? 'Page' : 'Chunk'}
                  </Link>
                ) : (
                  <span />
                )}
                {hasNext ? (
                  <Link
                    href={`/books/${bookId}/${articleId}/${page.page_number + 1}`}
                    className="flex items-center gap-1 text-sm hover:underline"
                    style={{ color: 'var(--color-link)' }}
                  >
                    Next {page.mode === 'source_page' ? 'Page' : 'Chunk'} →
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            )}

            {/* Back links */}
            <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/books/${bookId}/${articleId}`}
                className="text-sm text-center hover:underline"
                style={{ color: 'var(--color-link)' }}
              >
                ← Back to page list
              </Link>
              <Link
                href={`/books/${bookId}`}
                className="text-sm text-center hover:underline"
                style={{ color: 'var(--color-link)' }}
              >
                ← Back to article list
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
