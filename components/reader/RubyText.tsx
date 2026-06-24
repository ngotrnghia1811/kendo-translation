'use client'

import type { RubySpan, JlptLevel, FuriganaMode } from '@/lib/furigana/types'
import { passesJlptFilter } from '@/lib/furigana/jlpt'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RubyTextProps {
    /** Ordered array of spans from a RubyAnnotation. */
    spans: RubySpan[]
    /**
     * Furigana display mode:
     *   'off'      — plain text only (no ruby annotations)
     *   'furigana' — <ruby>/<rt> with hiragana readings
     *   'romaji'   — <ruby>/<rt> with romaji readings
     */
    furiganaMode?: FuriganaMode
    /**
     * Minimum JLPT difficulty for which furigana is shown.
     * e.g. N3 → show furigana for N3, N2, N1 (hide for N5, N4).
     * null → show furigana for all kanji (no filter).
     */
    furiganaJlptMinLevel?: JlptLevel | null
    /** Additional CSS class names on the wrapper span. */
    className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RubyText — renders Japanese text with optional furigana/romaji annotations.
 *
 * Furigana mode: kanji spans are rendered as semantic
 * `<ruby>kanji<rt>reading</rt></ruby>` elements with hiragana.
 *
 * Romaji mode: same `<ruby>/<rt>` structure but with `span.romaji` as the
 * annotation text. Spans without a `romaji` field (pre-v2 data) render no
 * annotation in romaji mode — they fall through to plain kanji text.
 *
 * When `furiganaMode` is 'off', ALL spans render as plain text (the
 * concatenation of span.base/text). This preserves line-breaking and
 * spacing identical to the annotated mode — no layout shift on toggle.
 *
 * Graceful degradation: if spans is empty or undefined, renders nothing.
 */
export default function RubyText({
    spans,
    furiganaMode = 'furigana',
    furiganaJlptMinLevel = null,
    className,
}: RubyTextProps) {
    if (!spans || spans.length === 0) return null

    const showAnnotations = furiganaMode !== 'off'
    const showRomaji = furiganaMode === 'romaji'

    return (
        <span className={className}>
            {spans.map((span, i) => {
                if (span.type === 'text') {
                    return <span key={i}>{span.text}</span>
                }

                // kanji span
                const hasAnnotationText = showRomaji
                    ? !!span.romaji
                    : span.reading && span.reading !== span.base

                const shouldAnnotate =
                    showAnnotations &&
                    hasAnnotationText &&
                    passesJlptFilter(span.jlptLevel, furiganaJlptMinLevel)

                if (shouldAnnotate) {
                    const annotationText = showRomaji && span.romaji
                        ? span.romaji
                        : span.reading

                    return (
                        <ruby key={i}>
                            {span.base}
                            <rp>(</rp>
                            <rt>{annotationText}</rt>
                            <rp>)</rp>
                        </ruby>
                    )
                }

                // Plain kanji text (furigana hidden or JLPT-filtered out)
                return <span key={i}>{span.base}</span>
            })}
        </span>
    )
}

// ---------------------------------------------------------------------------
// Helper: extract plain text from spans (for non-furigana rendering)
// ---------------------------------------------------------------------------

/**
 * Concatenate all spans into a plain text string.
 * Useful when the caller just wants the raw source text.
 */
export function spansToPlainText(spans: RubySpan[]): string {
    return spans
        .map(s => (s.type === 'kanji' ? s.base : s.text))
        .join('')
}
