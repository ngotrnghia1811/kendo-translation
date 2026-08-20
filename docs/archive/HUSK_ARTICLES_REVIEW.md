# Husk Articles Review (11 empty parent-book rows)

**Status:** Awaiting user review/approval before any deletion action is taken.
**Date:** 2026-08-10

## Background

During the earlier PocketBase migration, `migration/pocketbase/scripts/split_book_segments.js`
split 25 bulk "book blob" articles into 126 smaller child articles (one per
Kendojidai issue / book chapter). For 11 of those 25 parent articles, the
split fully succeeded and *all* of the parent's segments were moved to
children — leaving the original parent article row as an empty "husk": it
still exists as an `articles` record, but has zero segments, `segmented:
false`, `segment_count: 0`, and is not linked to a `book`.

This was root-caused and confirmed on 2026-08-10 (see qa-memory-2026-08-10.md,
"Diagnosis result" + "Data investigation" entries). It is **not a bug** in
the sense of data loss — every segment that was on these 11 parents is
present and correctly attached to a real child article. It is a cleanup
question: should these 11 now-empty rows be deleted, or kept for
historical/traceability reasons?

## The 11 husk articles

| # | Title | Article ID | `segmented` | `segment_count` | `book` relation | Real children found | Orphan segments still attached |
|---|-------|-----------|-------------|------------------|------------------|----------------------|----------------------------------|
| 1 | Kendojidai 2010 | `38221898-d3e4-4012-8a23-4a71c6f3a4ee` | false | 0 | (none) | 7 | 2 |
| 2 | Kendojidai 2011 | `84f5be1e-6cbf-4753-9fe3-f3146769c1eb` | false | 0 | (none) | 12 | 2 |
| 3 | Kendojidai 2012 | `4143b5fb-74df-414f-8ea3-fccc1a2b3b1b` | false | 0 | (none) | 13 | 2 |
| 4 | Kendojidai 2013 | `563b88bb-ed67-4f68-abfe-22068c1cf08c` | false | 0 | (none) | 12 | 2 |
| 5 | Kendojidai 2014 | `f8eb8778-b83b-4556-86f7-aaa4092d16d6` | false | 0 | (none) | 12 | 1 |
| 6 | Kendojidai 2015 | `4541dd08-3773-4b5d-9f8c-81efc75831ea` | false | 0 | (none) | 10 | 1 |
| 7 | Kendojidai 2016 | `057c1970-5c75-47f0-85e7-b3a949766148` | false | 0 | (none) | 12 | 1 |
| 8 | Kendojidai 2017 | `c602f1e2-95df-4da9-a3cf-3a389efdce92` | false | 0 | (none) | 12 | 1 |
| 9 | Kendojidai 2018 | `e9cfbf9f-5be9-4a1f-b5c9-5a52270a6d8c` | false | 0 | (none) | 5 | 1 |
| 10 | Kendo Reiho and Saho | `aea3e1a6-fe6a-408b-b57d-4942900670f4` | false | 0 | (none) | 10 | 2 |
| 11 | Ki Breathing Method | `3785cd55-421e-4daf-b1ba-546e3a09fdbe` | false | 0 | (none) | 7 | 2 |

Notes:
- All 11 have `source_url` empty/none.
- None of the 11 have a `book` relation set on themselves (their *children*
  are the ones linked to the corresponding `books` record).
- "Orphan segments still attached" (1-2 per row) are leftover citation/table-
  of-contents markers that the split script didn't reassign — negligible,
  flagged as a separate low-priority cleanup item, unrelated to the
  delete/keep decision below.

## Foreign-key / reference safety check

Checked every collection that could reference these 11 article IDs:

| Collection | References found | Safe to delete against? |
|---|---|---|
| `bookmarks` | 0 | Yes |
| `reading_progress` | 0 | Yes |
| `document_assignments` | 0 | Yes |
| `document_settings` | 1 each (11 total) | Needs cascade-delete alongside the article (routine 1:1 settings row, same pattern as the earlier "Kata Full" stale-row cleanup) |
| `books.source_book_id` | 1 each (11 total) | **Not a live FK** — plain text field used for historical traceability by `derive_book_hierarchy.js`. Deleting the article would leave this as a harmless dangling text reference; the `books` record itself (title/author/summary/year/book_type) stays fully valid either way. |

**Conclusion: deleting all 11 is technically safe** (only `document_settings`
needs a paired cascade-delete, and that's routine). No user-facing data
(bookmarks, reading progress, assignments) would be affected.

## Decision needed

- **Option A — Delete all 11** (+ cascade their `document_settings` rows).
  Cleans up the `articles` table; nobody can accidentally land on an empty
  husk page. Historical traceability is preserved via `books.source_book_id`
  even after deletion (as a text value, not a live link).
- **Option B — Keep all 11**, but auto-redirect any direct navigation to
  them toward their book's article list (per the redirect behavior already
  planned in `docs/BOOK_HIERARCHY_UI_PLAN.md` §1/§6). Preserves the row for
  historical reference (e.g. if anything external still links to the old ID).
- **Option C — Something in between** (e.g. keep but mark `archived:true`
  if such a field is added later).

This file exists purely for review — no deletion has been performed. Reply
to aki-main with your decision and it will be actioned as a small, isolated
follow-up unit.

---

## DECISION: KEEP (hidden everywhere) — 2026-08-11

**Decision:** Keep all 11 husk rows in the `articles` table. Do NOT delete them.
Do NOT modify their data or their `document_settings` rows. Instead, hide
them from **every** surface in the application — including admin views,
search, analytics counts, and the reader redirect (which already handles
them gracefully).

**Rationale:**
- Deleting rows is irreversible; keeping them preserves a full audit trail
  of the book-splitting migration.
- `books.source_book_id` contains text references to 9 of these 11 IDs —
  keeping the rows means those references remain traceable to the original
  pre-split parent article.
- The FK safety check shows no active dependencies (bookmarks, reading
  progress, assignments) — the rows are harmless to keep.
- Hiding them everywhere (including admin) reduces cognitive noise without
  needing a DB migration or `archived` flag.

**Implementation:**
- Created `lib/husk-filter.ts` with the 11 IDs and a reusable PocketBase
  filter fragment (`HUSK_EXCLUSION_FILTER` / `withHuskExclusion()`).
- Applied the exclusion at these call sites:
  - `app/api/search/route.ts` — article search queries
  - `app/api/documents/route.ts` — admin full-list (`?all=1`)
  - `app/api/admin/analytics/route.ts` — article total count
  - `app/api/admin/documents/[id]/route.ts` — direct admin detail (404)
  - `app/documents/[id]/read/page.tsx` — already handled (graceful
    "content moved" fallback, no change needed)
  - `migration/pocketbase/pb_hooks/documents_feed.pb.js` — already
    filtered by `segmented = 1`, no change needed
- No deletion. No `document_settings` cascade. No data mutation.
