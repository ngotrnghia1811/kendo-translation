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

/**
 * The source-book page a segment belongs to, if known. The clean-triplet
 * importer (`scripts/import-clean-triplets.ts`) writes an integer
 * `metadata.page` on every imported segment. Legacy / user-uploaded
 * segments carry no page, so this returns null and the reader falls back
 * to fixed-size chunk paging.
 */
export function getSegmentPage(segment: Segment): number | null {
    const meta = segment.metadata as { page?: number } | null
    return typeof meta?.page === 'number' ? meta.page : null
}

/**
 * One reader "page" — a contiguous slice of the document rendered together.
 * For imported books this maps to a real source-book page (`label` is the
 * page number as a string); for legacy docs without page metadata it is a
 * fixed-size chunk (`label` is the 1-based chunk index).
 *
 * `segments` is the raw ordered slice (consumed by the aligned view);
 * `paragraphs` is the same slice already merged via paragraph_boundaries
 * (consumed by the single / bilingual views). Keeping both on the page
 * keeps all three reader modes paginated consistently.
 */
export interface ReaderPage {
    /** Source-book page number, or null for fixed-size chunk paging. */
    page: number | null
    /** Human-facing label for the pager (page number or chunk index). */
    label: string
    segments: Segment[]
    paragraphs: Paragraph[]
}
