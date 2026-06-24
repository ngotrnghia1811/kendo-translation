'use client'

import type { RubySpan, JlptLevel } from '@/lib/furigana/types'
import { passesJlptFilter } from '@/lib/furigana/jlpt'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RubyTextProps {
    /** Ordered array of spans from a RubyAnnotation. */
    spans: RubySpan[]
    /** When false, render plain text only (no ruby annotations). */
    showFurigana?: boolean
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
 * RubyText — renders Japanese text with optional furigana annotations.
 *
 * When `showFurigana` is true, kanji spans are rendered as semantic
 * `<ruby>kanji<rt>reading</rt></ruby>` elements. Non-kanji spans pass
 * through as plain text. The JLPT filter hides ruby for kanji below
 * the selected difficulty threshold.
 *
 * When `showFurigana` is false, ALL spans render as plain text (the
 * concatenation of span.base/text). This preserves line-breaking and
 * spacing identical to the annotated mode — no layout shift on toggle.
 *
 * Graceful degradation: if spans is empty or undefined, renders nothing.
 */
export default function RubyText({
    spans,
    showFurigana = true,
    furiganaJlptMinLevel = null,
    className,
}: RubyTextProps) {
    if (!spans || spans.length === 0) return null

    return (
        <span className={className}>
            {spans.map((span, i) => {
                if (span.type === 'text') {
                    return <span key={i}>{span.text}</span>
                }

                // kanji span
                const shouldAnnotate =
                    showFurigana &&
                    span.reading &&
                    span.reading !== span.base &&
                    passesJlptFilter(span.jlptLevel, furiganaJlptMinLevel)

                if (shouldAnnotate) {
                    return (
                        <ruby key={i}>
                            {span.base}
                            <rp>(</rp>
                            <rt>{span.reading}</rt>
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
