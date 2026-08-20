# Book → Article → Page Browsing — Implementation Plan

Status: DRAFT for review (2026-08-10). Not yet dispatched to aki-execute.

## 0. Data investigation results (answers the open questions from round 16)

### 0.1 "Page" concept — VERIFIED: hybrid required

Queried live PocketBase (`segments.metadata` JSON field) directly:

| Segment source | Has real `metadata.page` (int, source-scan page #)? | Count |
|---|---|---|
| Kendojidai year-book children (9 books → ~95 children, `source_file: kendojidai_YYYY_trilingual.md`) | ✅ Yes | ~245k segments |
| "Ki Breathing Method" / "Kendo Reiho and Saho" children (2 forced-split topic books) | ✅ Yes | ~12k segments |
| Individually-scraped Kendojidai web articles (2019+, `source: kendojidai_monolingual` or `hierarchical/classified`) | ❌ No — position-only | ~180k segments |
| 14 non-split "fallback" topic books (continuous narrative) | ❌ No — position-only | ~9k segments |

**Decision: hybrid pagination.**
- Where `metadata.page` exists on ≥1 segment for an article: group segments by that real page number → "page" = one source-scan page. This matches the user's expectation ("most articles have page numbers") for the split Kendojidai/topic-book children specifically.
- Where absent: fall back to fixed-size chunks (default 25 segments/page) as a synthetic page unit.
- Both cases exposed through the same `pages` API shape (`{page_number, segment_ids[]}`) so the UI never needs to know which mode produced a given article's pages.

### 0.2 "11 parent articles have 0 segments" — CLARIFIED, not a bug

Re-verified live: **787 of 798 articles have real segments and content. Exactly 11 do not** — these are the original bulk-import "container" rows for the 9 Kendojidai year-compilations + Ki Breathing Method + Kendo Reiho and Saho, whose content was moved into 126 child articles during the earlier book-splitting migration (e.g. "Kendojidai 2010" parent → 7 children: "Kendojidai 2010 — Front Matter", "Kendojidai 2010-07"..."2010-12", each with thousands of real segments).

These 11 rows are now empty husks: `segmented=false`, `segment_count=0`, no `book` relation set on themselves either (they're pre-hierarchy artifacts, not currently linked to any book). They hold no unique content (everything moved to children, which ARE correctly linked to their books) and have 0 inbound structural dependencies from bookmarks/reading_progress/assignments (only a routine 1:1 `document_settings` row each, plus a non-FK text-field reference from `books.source_book_id`).

**UPDATE (2026-08-10, post-review request): deletion is NOT yet authorized.** The user asked for the full list written out for personal review before any deletion — see `docs/HUSK_ARTICLES_REVIEW.md` (contains the exact 11 rows, FK safety check, and 3 options: delete / keep-with-redirect / keep-with-archived-flag). **Phase 1 must NOT delete these 11 rows.** Until the user approves an option in that review doc, Phase 1 should implement the safer fallback: any direct navigation to one of these 11 IDs redirects to its book's article list (same mechanism as the general `/documents/[id]/read` → `/books/[bookId]/[articleId]/1` redirect in §1, but since these 11 have no `book` relation on themselves, fall back to showing a "this content has moved" notice with a link to `/books` if the book can't be resolved). The actual delete-vs-keep decision is a separate, isolated follow-up unit once the user responds.

## 1. Routing scheme (per round-16 decision)

```
/books                              -- book list (all 40 books, uniform 3-level browse entry)
/books/[bookId]                     -- article list within a book
/books/[bookId]/[articleId]         -- page list within an article (chapter index)
/books/[bookId]/[articleId]/[page]  -- single page reader (segments for that page)
```

- `/documents` is fully replaced/redirected to `/books` (round-14 decision).
- Search results and other deep links that currently point at `/documents/[id]/read` will resolve the article's `book` relation server-side and redirect to `/books/[bookId]/[articleId]/1`.
- The 787 non-husk articles that have a `book` relation already populated map directly. The 787 minus 126 children = 661 standalone articles (never split) still each belong to exactly one book (either their natural topic book, a Kendojidai year book if uncategorized-by-year, or `UNCATEGORIZED-BOOK`).

## 2. UI pattern (per round-14 decision, flashcard-app reference confirmed in prior session)

Miller-column desktop (3 panels: Books | Articles | Pages) collapsing to single-column mobile with back-button breadcrumbs per level (0=Books, 1=Articles, 2=Pages), exactly matching `flashcard-app/app/src/routes/browse/BrowsePanels.svelte`'s Handbook→Chapter→Question pattern. All 3 levels always shown uniformly — no auto-skip for single-article books (round-14 decision).

Page-level view (level 3, opening a specific page) reuses segment-rendering primitives from the existing `ReaderView.tsx` (bilingual text, furigana, status badges) but is wrapped in a NEW pager component — not the old windowed-scroll reader, since that pattern was explicitly ruled out.

## 3. Editor workflow — DEFERRED (per round-16: "option 2, but later")

`app/documents/[id]/edit` stays exactly as-is for this phase. A future phase will add book→article entry navigation to the editor too, but is explicitly out of scope now.

## 4. Bookmarks / reading_progress — SCHEMA EXTENSION (per round-16, overriding recommended default)

Add to both `bookmarks` and `reading_progress` PocketBase collections:
- `book` (relation → books, nullable for backward-compat with pre-existing rows)
- `page_number` (number, nullable)

Existing rows keep working via their `article` + `position` fields alone (old semantics preserved); new writes from the redesigned UI populate the new fields too. No backfill of old rows planned unless requested.

## 5. Phased build sequencing (per round-16 decision)

**Phase 1 — Data/API layer** (aki-execute, standalone, bundles with the already-committed but unpushed `3378d60` bugfix):
- Do NOT delete the 11 husk articles yet — pending user review of `docs/HUSK_ARTICLES_REVIEW.md`. Instead, add the graceful-fallback redirect described in §0.2 above.
- New PocketBase migration: add `book`/`page_number` fields to `bookmarks` + `reading_progress`.
- New pagination-computation logic (server-side, likely a new custom PB hook `article_pages.pb.js` or extending `article_page_info.pb.js`): given an article ID, return `{pages: [{page_number, segment_ids}], mode: "source_page"|"synthetic_chunk"}`.
- New/extended API routes: `GET /api/books`, `GET /api/books/[bookId]`, `GET /api/books/[bookId]/[articleId]` (page index), `GET /api/books/[bookId]/[articleId]/[page]` (page content).
- Redirect logic: `GET /documents/[id]/read` → resolve `book` relation → 307 to `/books/[bookId]/[articleId]/1`.

**Phase 2 — UI components**:
- `BookBrowsePanels.tsx` (Miller-column desktop / mobile-stack, per flashcard-app pattern).
- New page-reader component for level 3 (page content view), reusing `ReaderView` segment-rendering primitives.
- New routes under `app/books/`.

**Phase 3 — Cutover + redirects**:
- Point nav/header links at `/books` instead of `/documents`.
- Verify old bookmarked `/documents/[id]/read` URLs still resolve via the redirect from Phase 1.
- Playwright coverage for the new browse flow (at least a smoke pass, following the session's established practice of not mutating production data unnecessarily where avoidable).
- Push all bundled commits (3378d60 + phases 1-3) together to origin/main, per user's bundling decision.

## 6. Open items carried forward, not addressed in this plan
- 25 book-parent articles (distinct from the 11 husks — these are the *un-split* topic-compilation book "articles" that still hold their own content but have no self-relation to their own `book` record) — cosmetic gap, unaffected by this plan.
- `segments_update_phase_assigned` RLS MVP stopgap — unrelated, not touched.
- `translation_memory`/RAG archive — unrelated, not touched.
- Deprecated OpenRouter free-tier model — explicitly deferred by user earlier, unrelated.
