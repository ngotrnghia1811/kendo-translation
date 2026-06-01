-- Migration 006: add paired_pdf_path to articles
--
-- Adds a column to store the relative path (from PDF_BASE_PATH) to the
-- paired bilingual PDF for book-length articles. Populated by the
-- scripts/link-paired-pdfs.ts utility. Null for articles without a
-- matched paired PDF.

ALTER TABLE articles ADD COLUMN IF NOT EXISTS paired_pdf_path TEXT;

COMMENT ON COLUMN articles.paired_pdf_path IS
    'Relative path (from PDF_BASE_PATH env var) to the paired bilingual PDF. '
    'Populated by scripts/link-paired-pdfs.ts. NULL if no paired PDF exists.';
