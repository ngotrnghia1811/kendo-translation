/**
 * Shared types for the book-browsing UI components.
 *
 * These shape the data returned by GET /api/books/* (Phase 1).
 * Kept here so both BookBrowsePanels and PageReader share the same contracts.
 */

export interface BookSummary {
  id: string;
  title: string;
  title_ja: string | null;
  author: string | null;
  summary: string | null;
  book_type: 'year_compilation' | 'topic_compilation' | 'uncategorized';
  year: number | null;
  article_count: number;
}

export interface ArticleSummary {
  id: string;
  title: string;
  title_ja: string | null;
  translation_status: string;
  segment_count: number;
  doc_type: string;
  author: string | null;
  summary: string | null;
  segmented: boolean;
}

export interface PageSummary {
  page_number: number;
  segment_count: number;
}

export interface ArticlePages {
  article: {
    id: string;
    title: string;
    title_ja: string | null;
    segment_count: number;
    translation_status: string;
  };
  page_count: number;
  mode: 'source_page' | 'synthetic_chunk';
  pages: PageSummary[];
}

export interface PageContent {
  page_number: number;
  page_count: number;
  segment_count: number;
  mode: 'source_page' | 'synthetic_chunk';
  article: {
    id: string;
    title: string;
    title_ja: string | null;
    segment_count: number;
  };
  segments: PageSegment[];
  /** All pages in this article (for sidebar TOC). */
  all_pages?: PageSummary[];
  /** Document settings (paragraph boundaries, lang config, publish filter). */
  settings?: {
    source_lang?: string;
    target_lang?: string;
    paragraph_boundaries?: number[];
    publish_filter?: string;
    paired_pdf_path?: string | null;
  } | null;
  /** Book-level metadata for display. */
  book?: {
    author?: string | null;
    summary?: string | null;
    doc_type?: string | null;
  } | null;
  /** Whether ZH target segments exist for this article. */
  has_zh?: boolean;
  /** Whether the current user can edit this article. */
  can_edit?: boolean;
}

export interface PageSegment {
  id: string;
  position: number;
  source_text: string;
  target_text: string | null;
  source_lang: string;
  target_lang: string;
  status: string;
  /** Precomputed furigana annotation (may be null). */
  ruby_data?: {
    spans: Array<{
      type: 'text' | 'kanji';
      text?: string;
      base?: string;
      reading?: string;
      romaji?: string;
      jlptLevel?: string;
    }>;
  } | null;
  metadata?: Record<string, unknown> | null;
}
