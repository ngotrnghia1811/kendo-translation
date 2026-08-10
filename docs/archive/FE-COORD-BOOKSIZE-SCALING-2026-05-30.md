# Backend → FE coord — book-size scaling bugs surfaced by Playwright

**From:** backend lane (aki-main session, 2026-05-30)
**To:** frontend lane (`agent/frontend-reader`)
**Status:** report + coordination request — two FE-territory bugs to triage
**Priority:** medium — Bug A is a real production scalability defect, not just a test failure

---

## TL;DR

While re-establishing the Playwright baseline after the clean re-import
(`9ac59c7`), the suite went from **45 failed → 85 passed / 2 failed / 1
skipped**. The 45-failure block was a dev-tooling regression that the
backend lane already fixed (see "Backend already fixed" below). The **2
remaining real failures are in FE-lane territory** and are both direct
consequences of the corpus now holding **book-sized documents**
(thousands of segments each) where the tests and code previously only
ever saw small documents (<100 segments).

Per `docs/AGENT-COORDINATION.md`, `app/`, `components/`, `hooks/`, and
the corresponding tests are FE-lane territory, so the backend lane is
**surfacing these rather than editing them**. Please triage.

---

## Backend already fixed (no action needed from FE)

**`package.json` `dev` script: `--webpack` → `--turbopack`.**
Under `next dev --webpack` (Next 16.2.x), Firefox — the Playwright
browser — fails to load the client JS bundle (a versioned
`/_next/static/chunks/*.js?v=<ts>` request fails *in the browser* even
though `curl` returns 200 for the same path). With no client JS, React
never hydrates, the `/login` form's `onSubmit` never attaches,
`supabase.auth.signInWithPassword` never fires, and `global-setup.ts`
times out waiting for the `/auth/v1/token` POST → no `tests/.auth/*.json`
written → 45 auth-requiring tests fail at fixture setup with `ENOENT`.

Switching the dev server to `--turbopack` (which the original
green baseline 87/0/1 on `b158b9a` had used) fully resolves it. This was
a one-line change to the shared `package.json` `dev` script only.

> **FYI for FE:** `package.json` `build` still uses `--webpack`. That was
> left untouched — the regression is dev-mode/Firefox-hydration specific
> and there's no evidence it affects production builds. Worth a glance if
> you ever see similar bundle-load symptoms in a built deploy, but not
> urgent.

---

## Bug A (REAL, production-affecting) — `segment-activity` 500s on book-sized documents

**Test:** `tests/segment-activity-api.spec.ts:57`
"GET returns activity array for an existing document" → got **HTTP 500**,
expected 200.

**What the test does:** Logs in as admin, fetches `/api/documents`, takes
`documents[0].id`, and calls
`GET /api/documents/<id>/segment-activity`, asserting a 200 + an array of
`{ segment_id, pending_suggestions, unresolved_comments,
recent_transitions_24h }` rows. The failure is **not** the test's fault —
`documents[0]` is now a ~6,600-segment book, so the test simply exercises
the endpoint with realistic data for the first time.

**Root cause** (read `app/api/documents/[id]/segment-activity/route.ts`,
130 lines):
- The route fetches **all** segment ids for the document (lines ~66-69).
- It then runs three parallel queries of the form
  `.in('segment_id', segmentIds)` (lines ~81-97) against
  `segment_suggestions`, `segment_comments`, and
  `segment_phase_transitions`.
- With ~6,600 UUIDs, the PostgREST `?segment_id=in.(...)` query string
  blows past URL-length limits → the request fails → **500**.
- The route's own header comment (line ~16) states the original
  assumption: **"With <100 segments this is cheap."**

**Why it matters:** This is a genuine scalability bug, not a test
artifact. The editor's segment-list activity badges will 500 for any real
book in production, not just under test.

**Suggested fix directions (FE's call):**
1. Replace the three client-side `.in()` aggregations with a single
   server-side **GROUP BY** via a Postgres RPC
   (e.g. `rpc_segment_activity(document_id uuid)` returning the
   per-segment counts). Cleanest; scales to any size.
2. Or **chunk** the `.in()` calls into batches of ~200 ids and merge
   results. Less invasive but still N round-trips.
3. Or scope the endpoint to a **visible/paginated window** of segments
   (only aggregate the segments currently rendered).

Backend lane is happy to author the RPC (migration territory) if FE picks
option 1 — just say the word and confirm the desired return shape.

---

## Bug B (test-harness + rendering) — edit-page screenshot exceeds 32767px

**Test:** `tests/edit-page-integration.spec.ts:69`
"Details drawer renders all four cooperation panels" →
`page.screenshot: Cannot take screenshot larger than 32767`.

**What the test does:** Opens the edit page for a document and takes a
**full-page screenshot** (via the spec's `snap()` helper) to visually
assert the four cooperation panels render in the details drawer.

**Root cause:** The edit page renders **all** segments of the document
into one DOM. For a book-sized document the rendered page is taller than
Firefox's hard **32,767px** full-page-screenshot limit, so the
`page.screenshot()` call throws. **The page itself renders correctly** —
only the screenshot step fails.

**Why it matters (two angles):**
- *Test-harness angle:* the `snap()` full-page screenshot is not safe on
  giant pages. Options: clip to a bounding box / the drawer element,
  disable `fullPage`, or assert on DOM/locators instead of a pixel snap.
- *Rendering angle (worth a look):* rendering every segment of a
  thousands-of-segments book into one page is heavy regardless of the
  screenshot. If the edit page isn't already virtualized/paginated, this
  is a good moment to consider it. (Informational — not blocking.)

---

## Reproduction / verification notes

- Run the suite with the dev server on **turbopack**:
  `npx next dev --turbopack --port 3001` (or just `npm run dev` now that
  the script is fixed), then `npm test`. `playwright.config.ts` has
  `reuseExistingServer: !CI`, so a manually-started :3001 server is
  reused.
- Auth bootstrap (`tests/global-setup.ts`) logs in admin/translator/reader
  and writes `tests/.auth/*.json`. (`wenqian@test.com` still fails to log
  in — looks like a missing/expired test user, unrelated to these two
  bugs; no/few tests depend on it.)
- Post-fix baseline this session: **85 passed / 2 failed (Bug A, Bug B) /
  1 skipped.**

---

## Pointers

- `app/api/documents/[id]/segment-activity/route.ts` — Bug A endpoint
- `tests/segment-activity-api.spec.ts` — Bug A test
- `app/.../edit` page + `tests/edit-page-integration.spec.ts` — Bug B
- `package.json` — `dev` script (fixed), `build` script (FYI note)
- `docs/AGENT-COORDINATION.md` — lane territory rules
