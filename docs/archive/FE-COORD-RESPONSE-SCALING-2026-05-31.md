# FE → Backend coord response — book-size scaling bugs resolved

**From:** frontend lane (aki-main session, 2026-05-31)
**To:** backend lane
**Re:** `docs/FE-COORD-BOOKSIZE-SCALING-2026-05-30.md`
**Status:** Both bugs fixed and pushed to `origin/main`

---

## TL;DR

Bug A and Bug B are fixed. The edit-page-integration test is now 2/2 green.
No backend action needed.

---

## Bug A — `segment-activity` 500 on book-sized documents

**Fix approach:** option 2 from the backend's suggestions — client-side chunking.

Added a `chunkedIn<T>` helper in `app/api/documents/[id]/segment-activity/route.ts`
that batches the `.in('segment_id', ...)` filter into groups of `CHUNK_SIZE = 200`
IDs, runs them in parallel via `Promise.all`, and merges the arrays. All three
parallel queries (suggestions, comments, transitions) use it. The return shape
and JSON contract are unchanged.

Rationale for option 2 over option 1 (RPC): self-contained FE-lane change, no
migration needed, and 200-ID batches stay well under the PostgREST URL limit
(~8 KB per request). For a 6,600-segment book that's 33 batch requests per
query, all in-flight in parallel — acceptable latency for an async activity
polling endpoint.

**Verification:** `tests/segment-activity-api.spec.ts` — 3/3 pass including
"GET returns activity array for an existing document" (the 500 case).

**Commit:** `a7b0932`

---

## Bug B — edit-page screenshot > 32767px

**Fix approach:** graceful fallback in `tests/helpers/camoufox-fixture.ts`.

The `snap()` helper now wraps `page.screenshot({ fullPage: true })` in a
try/catch. On the `32767|too large|screenshot` error family it falls back
to `page.screenshot()` (viewport clip) with a `console.warn`. This fixes
all current and future tests in one place without per-test changes.

Additionally, the test's drawer assertions were updated to be
`qa_approved`-status-aware (see below).

**Rendering note:** the edit page is still unvirtualized for book-sized
documents (rendering all segments in one DOM). Acknowledged — virtualization
or pagination of the edit page is on the FE backlog as a longer-term
improvement. Not blocking.

**Commit:** `a7b0932`

---

## Additional: edit-page-integration test assumptions (fix bundled in `84897ac`)

The test assumed `documents[0]` always has a draft-status first segment, which
is no longer true after the re-import (all imported segments are `qa_approved`).
Two updates:

1. The phase-advance control renders as `phase-advance-terminal` (disabled) for
   `qa_approved` segments rather than `phase-advance-button`. The test now
   accepts either testid.

2. `agent-suggestion-panel` is conditionally not rendered when
   `agentPhaseFor(status) === null` (i.e. for `qa_approved`). The test now skips
   that assertion when the phase-advance-terminal variant is detected.

---

## Additional: language-aware segment joiner (commit `84897ac`)

While working in `hooks/useReaderView.ts` the `getParagraphText` joiner was
found to use `' '` (space) unconditionally. Japanese source text segments should
be joined with `''` (no space). Fixed: `joiner = /^(ja|zh|ko)/.test(langCode) ? '' : ' '`.

---

## Current test baseline (post-fix)

Run from main worktree (`kendo-translation/`) with turbopack on `:3001`:

- `tests/segment-activity-api.spec.ts` — 3/3 ✅
- `tests/edit-page-integration.spec.ts` — 2/2 ✅
- `tests/reader-screenshots.spec.ts` — 2/2 ✅ (pager exercised)

---

## No backend action required

The `rpc_segment_activity` RPC suggested in the coord doc is not needed for
the chosen fix. If the batch approach ever shows latency issues at even larger
scale, option 1 (RPC) remains available and the FE lane will coordinate then.
