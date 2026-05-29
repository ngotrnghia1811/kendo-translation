// Shared types & helpers for the reader-mode UI.
//
// `Paragraph` and the heading-detection helpers were previously duplicated
// across `hooks/useReaderView.ts`, `components/reader/SingleLanguageView.tsx`,
// `components/reader/BilingualParagraphView.tsx`, and
// `components/reader/TranslatorAlignedView.tsx`. Centralised here so the
// shape and heading-detection rule stay in one place.

import type { Segment } from '@/types/database'

/**
 * A reader paragraph is a contiguous run of segments grouped via
 * `DocumentSettings.paragraph_boundaries`. For trilingual-pipeline-imported
 * articles every segment is its own paragraph (see
 * `scripts/import-trilingual-references.ts` and
 * `docs/BACKEND-FOLLOWUP-FE-COORD.md` § Coordination Item 3).
 */
export interface Paragraph {
    segments: Segment[]
    position: number
}

/**
 * A segment is a heading iff its pipeline-attached metadata marks it as
 * such. Source of truth: `scripts/import-trilingual-references.ts` writes
 * `metadata = { kind: 'heading', ... }` for lines under `【Heading】` markers.
 *
 * Non-pipeline segments (legacy / user-uploaded) carry no `kind` field and
 * therefore return false, preserving prior behaviour.
 */
export function isHeadingSegment(segment: Segment): boolean {
    const meta = segment.metadata as { kind?: string } | null
    return meta?.kind === 'heading'
}

/**
 * A paragraph is a heading iff it is exactly one segment AND that segment
 * is a heading. Multi-segment paragraphs (e.g. body paragraphs in
 * user-segmented documents) are never headings, even if one of the
 * contained segments happens to carry kind=heading.
 */
export function isHeadingParagraph(paragraph: Paragraph): boolean {
    return paragraph.segments.length === 1 && isHeadingSegment(paragraph.segments[0])
}
