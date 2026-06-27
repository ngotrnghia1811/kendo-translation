# Real-User-Flow & Scenario Test Plan

**Project**: kendo-translation platform
**Date**: 2026-06-16
**Phase**: Design / planning — downstream instrumented Playwright implementation will follow
**Author**: aki-research

---

## 1. Purpose & Scope

This document defines a **comprehensive real-user-flow test plan** for the kendo-translation platform. Unlike the existing 30+ isolated specs (unit, API, component, and the 16-test `production-smoke.spec.ts`), these flows simulate **end-to-end user journeys** across multiple pages, roles, and UI states. Each flow measures both **correctness** (did it work?) and **UX quality** (was it fast? readable? free of layout shift?).

### 1.1 What this plan covers

- Navigational flows spanning multiple pages and role transitions.
- Per-step **timing instrumentation points** for latency measurement.
- **Readability/accessibility checkpoints** (contrast, font legibility, skeleton states, layout shift).
- Cross-cutting scenarios: theme × page, language EN/ZH, viewport, cold vs. warm starts, small vs. large documents.

### 1.2 What this plan does NOT cover

- **Isolated unit tests** (e.g., segment CRUD, filter logic, badge counts) — already covered.
- **Pure API tests** (e.g., `POST /api/mac-rag/compose`, `GET /api/terminology`) — already covered in 16 @smoke tests.
- **The actual `.spec.ts` files** — this is the design deliverable; instrumented Playwright tests are a downstream phase.
- **Code coverage metrics** or fuzz testing.

### 1.3 Relationship to existing test suite

| Existing suite | Coverage type | This plan adds |
|---|---|---|
| `production-smoke.spec.ts` (16 tests) | Single-page existence + basic API health | Multi-step user journeys |
| `editor.spec.ts`, `reader.spec.ts`, etc. | Isolated page-level interactions | Cross-page flows (edit → advance → reader verify) |
| `suggestions-api.spec.ts`, `agents-api.spec.ts`, etc. | API contract testing | UI-driven acceptance/rejection with modal interaction |
| `reader-screenshots.spec.ts` | Single-theme snapshots | Multi-theme cross-page contrast audit |

---

## 2. Personas

| Persona | Roles | Goals |
|---|---|---|
| **Admin** | `admin` (admin-1@test.com / test-password) | Manage documents, users, assignments, publish policies, monitor dashboard |
| **Translator** | `translator` (translator-1@test.com / test-password) | Edit assigned segments, advance phases, request agent suggestions, resolve QA issues |
| **Reader** | `reader` (reader-1@test.com / test-password) | Browse, read, search, bookmark documents; switch themes and languages |
| **Anonymous / First-time Visitor** | Unauthenticated | Land on homepage, register, log in |

---

## 3. Flow Catalogue

### 3.1 Reader Persona

#### RF-READER-01 — Browse → open book → read bilingual → bookmark → resume

**Entry point**: `/documents` (authenticated as reader-1)
**Preconditions**: Reader is logged in. Document list loaded (default 31 docs).

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Navigate to `/documents` | — | Page renders with document grid | `navigationStart` → `domcontentloaded` → first `DocumentCard` visible |
| 2 | Sort by "Least translated" | `[data-testid="documents-sort"]` → change to `progress_asc` | List reorders; least-translated docs appear first | Action click → list re-render complete |
| 3 | Click first document card | First `a[href*="/documents/"][href*="/read"]` | Navigate to `/documents/[id]/read` | Navigation timing |
| 4 | Wait for reader content-visible | Reader `main` region has rendered segments (no skeleton) | Bilingual view visible with segments | `domcontentloaded` → first segment text visible |
| 5 | Switch to BilingualParagraphView | View-mode button with text "Bilingual (paragraph)" | Segments render in paragraph format with EN+ZH pairs (if ZH present) | Click → view re-render |
| 6 | Add a bookmark | Bookmark button (star/bookmark icon) | Bookmark appears in bookmarks panel; count increments | Click → UI response |
| 7 | Navigate to page 3 | Pagination control: "Next" or page number | Page advances; URL updates; segments for new page render | Click → new page segments visible |
| 8 | Add second bookmark | Same as step 6 | Second bookmark stored | Click → UI response |
| 9 | Navigate to `/documents` | Click "Docs" in breadcrumb or nav | Back to document list | Navigation timing |
| 10 | Return to same document via recently-viewed sort | `[data-testid="documents-sort"]` → "Recently Viewed" | Document appears first | Click → sort re-render |
| 11 | Open document → confirm resumed at bookmarked page | Click document card | Reader opens near bookmarked page; reading progress restored | Page load → bookmarked position visible |

**Success signal**: All 11 steps complete without error. Bookmark count increments correctly. Reading position persists across re-visit.

**UX / readability checkpoints**:
- Step 4: Verify no gray-on-white text below WCAG AA 4.5:1 contrast ratio on default reader theme (light).
- Step 4: Check that skeleton/loading state transitions cleanly to content (no flash of empty).
- Step 4 (JP docs): When the document has JP source text with ruby annotations, verify `<ruby>/<rt>` elements render with correct vertical spacing (`line-height: 2.0` on `[data-paragraph-index]` per `globals.css` §Furigana vertical spacing). Annotation text must be legible (0.5em `rt` font-size) and not crowd adjacent lines.
- Step 5: Verify bilingual layout doesn't overflow viewport on 1280×800.
- Step 11: Verify no cumulative layout shift (CLS) during reading-progress restoration.

---

#### RF-READER-02 — Theme switch cycle across all 7 reader themes

**Entry point**: `/documents/[id]/read` (small doc recommended: "Kendo Philosophy", 3 segments)
**Preconditions**: Reader is logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Open reader settings panel (gear icon) | Gear button in reader toolbar | Settings panel slides open | Click → panel visible |
| 2 | Switch theme to "Dark" | Theme button labeled "Dark" | Background turns dark; text turns light | Click → `document.documentElement` class change |
| 3 | Capture screenshot for contrast audit | — | Dark theme applied; all text readable | Post theme transition |
| 4 | Repeat for each of the remaining 5 themes: solarized, pastel, sepia, high-contrast, night-warm | Respective theme buttons | Each theme applies correctly | Per theme |
| 5 | Switch theme to "High Contrast" | "High Contrast" button | High-contrast colors applied; text crisp | Click → transition |
| 6 | Verify font color picker works on high-contrast | Font color input/picker | Custom color applied to reader text | Color change → re-render |
| 7 | Change font to "Mincho" | Font selector → "Mincho" | Serif CJK font applied to reader text | Font change → re-render |
| 8 | Increase font size to 24px | "+" button (aria-label="Increase font size") | Text size increases | Each increment |
| 9 | Decrease font size to 12px | "−" button (aria-label="Decrease font size") | Text size decreases | Each decrement |
| 10 | Switch layout to "Two Column" | `[data-testid="layout-width-control"]` → "Two Column" button | Layout switches to two-column | Click → layout reflow |
| 11 | Switch layout to "Narrow" | "Narrow" button | Layout constrains to narrow width | Click → layout reflow |

**Success signal**: All 7 themes apply without visual glitches. Font size changes between 10–32px work. Layout width toggles reflow correctly.

**UX / readability checkpoints**:
- For each of the 7 themes, compute contrast ratio between body text color and background using WCAG AA 4.5:1 threshold. Flag any theme that fails.
- Verify gray-on-white issue (previously `text-gray-600` → `text-gray-800` fix) is not regressed on light theme.
- Verify font color picker does not produce unreadable combos (e.g., white text on white background).

---

#### RF-READER-03 — ZH language toggle + PDF view

**Entry point**: `/documents/[id]/read` (doc with ZH segments and paired PDF)
**Preconditions**: Reader is logged in. Document has `zhSegments` and `pairedPdfPath`.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Toggle to ZH language | `button:has-text("中文")` or `[aria-label*="ZH"]` | Segment text switches to Traditional Chinese | Click → text re-render |
| 2 | Verify ZH content is non-empty | Segment containers | Chinese text visible (not fallback EN) | Content visible |
| 3 | Toggle back to EN | `button:has-text("EN")` | English text restored | Click → text re-render |
| 4 | Switch to PDF view | View-mode button with text "Paired PDF" | PDF page view renders | Click → PDF load |
| 5 | Verify PDF content visible | Iframe or PDF viewer element | PDF pages visible | PDF first page loaded |

**Success signal**: ZH toggle works bidirectionally. PDF view renders without error.

**UX / readability checkpoints**:
- Step 2: Verify ZH font renders correctly (no tofu/garbled characters). Mincho font should be available for CJK.
- Step 2 (JP documents): When viewing JP source text (not ZH target), furigana ruby annotations (`<ruby>/<rt>`) should render via the `RubyText` component backed by KANJIDIC2 per-character fallback engine (commit `e942fac`, `lib/furigana/annotate.ts`). Verify `<rt>` text is hiragana (not katakana, not romaji — romaji is a separate toggle). Coverage ~56% on primary test doc `86adf815-b0ca-46eb-bab7-b6fb040b845c`. JLPT filter dropdown (in reader settings) should show/hide annotations per level.
- Step 4: PDF view should not cause full-page CLS during load.

---

#### RF-READER-04 — Full-text search with context expansion

**Entry point**: `/documents/[id]/read`
**Preconditions**: Reader is logged in. Document has enough segments to produce search results.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Open reader sidebar → Search tab | Sidebar toggle → "Search" tab | Search panel opens with input field | Click → panel visible |
| 2 | Type search term (e.g., "sword") | Search input in sidebar | Debounced results appear (up to MAX_RESULTS=80) | Typing → debounce → results |
| 3 | Click a search result | Result row | Navigates to the page containing that segment; segment highlighted | Click → nav + scroll to segment |
| 4 | Verify highlighted term | `<mark>` elements in segment text | Search term highlighted in yellow | Content visible |

**Success signal**: Search returns results; clicking navigates to correct page; highlight rendered.

> **⚠ DEPLOY PRECONDITION (2026-06-27)**: Full-text search depends on the `search_segments` RPC rewritten in **migration 016** (`supabase/migrations/016_fix_search_kote.sql`, commit `eccf1a8`). The RPC rewrite removes the `ORDER BY` clause that caused the planner to use an expensive btree index scan on `idx_segments_article_position` for common search terms (~12k matches for "kote"), replacing it with an early-stopping sequential scan. Without this migration, cold-cache search for common terms takes **~1500ms** (vs. **<100ms** after). Migration 016 has been **applied to the live DB as of 2026-06-27** (kote 33.7ms warm). Rollback: re-apply migration 011.

**UX / readability checkpoints**:
- Step 2: Measure debounce latency — search should feel responsive (< 300ms after last keystroke). With migration 016 applied, backend search latency is <100ms cold, <5ms warm.
- Step 2: Verify search input has adequate contrast against sidebar background.

---

#### RF-READER-05 — Status filter sidebar

**Entry point**: `/documents/[id]/read` (filter tab in sidebar)
**Preconditions**: Reader is logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Open sidebar → Filter tab | Sidebar → "Filter" tab | Filter panel opens with status checkboxes | Click → panel visible |
| 2 | Toggle status filter (e.g., "QA Approved" only) | Status checkbox | Only segments with that status are shown | Click → re-render |
| 3 | Clear filter | "Clear all" or uncheck | All segments visible again | Click → re-render |

**Success signal**: Filter narrows segments correctly. Clear restores full view.

---

### 3.2 Translator Persona

#### RF-TRANS-01 — Login → assigned doc → edit segment → save → advance phase

**Entry point**: `/login`
**Preconditions**: Translator-1 has an assignment on a document with segments in their allowed phase. Use smallest segmented doc ("Kendo Philosophy", 3 segments) for speed.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Navigate to `/login`, fill credentials, submit | `input[type="email"]`, `input[type="password"]`, submit button | Redirect to `/documents` | `navigationStart` → `/documents` loaded |
| 2 | Navigate to `/documents/[id]/edit` (assigned doc) | Click document card → "Edit" link or direct URL | Editor page loads (no mobile block) | Navigation → `domcontentloaded` |
| 3 | Wait for segment list to hydrate | `[data-testid="segment-list-item"]` first instance | Segment rows visible (not "Loading document…" skeleton) | Skeleton → content visible |
| 4 | Click a segment to activate | Click segment row | SegmentEditorPanel opens; textarea populated with current `target_text` | Click → editor panel visible |
| 5 | Edit text in textarea | Textarea | Text changes; "unsaved" indicator may appear | First keystroke → UI feedback |
| 6 | Save (Ctrl+S or save button) | Keyboard `Ctrl+S` or save button | Text saved; success feedback shown | Save action → API response → UI update |
| 7 | Advance phase (Ctrl+Enter) | `[data-testid="phase-advance-button"]` | Phase advance dialog appears | Click → dialog visible |
| 8 | Confirm advance with optional note | `[data-testid="phase-advance-confirm-submit"]` | Segment status advances (e.g., draft→translated); PhaseBadge updates | Click → API → badge update |
| 9 | Verify phase transition recorded in History tab | Open cooperation drawer → "History" tab, `[data-testid="phase-transition-history"]` | New `[data-testid="phase-transition-row"]` appears | Tab switch → data loaded |

**Success signal**: Full TEP cycle for one segment: draft→translated. Save persists. History records transition.

**UX / readability checkpoints**:
- Step 3: Verify no gray-on-white contrast issues in segment list text (status badges, source text preview).
- Step 5: Verify textarea text color vs. background passes WCAG AA.
- Step 2: Verify editor does NOT show the mobile phone-block banner on desktop viewport (≥768px).
- Step 6: Verify save feedback (toast, inline confirmation) is visible and non-blocking.

**Timing measurement**:
- **Login-to-editor latency**: step 1 `navigationStart` → step 3 content-visible.
- **Segment activation latency**: click segment row → `SegmentEditorPanel` visible.
- **Save RTT**: Ctrl+S → API response → UI confirmation.
- **Phase advance RTT**: confirm click → API response → badge + history update.

---

#### RF-TRANS-02 — Request agent suggestion → accept (EditPattern modal on translated phase)

**Entry point**: Editor page, segment in `draft` status (translator's phase = translate).
**Preconditions**: Translator-1 logged in; active segment is draft.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Open cooperation drawer → "Agent" tab or use AgentSuggestionPanel | Agent suggestion panel | Panel shows "Request agent translation" trigger | Tab switch → panel visible |
| 2 | Request agent suggestion | `[data-testid="agent-suggestion-trigger"]` | Loading state; agent generates suggestion | Click → loading → suggestion appears |
| 3 | Verify suggestion card renders | `[data-testid="suggestion-row"]` | Suggestion visible with accept/reject buttons | Suggestion loaded |
| 4 | Accept suggestion | `[data-testid="suggestion-accept"]` | **EditPatternModal** opens (since segment is in `translated` phase — wait: for draft→translated the phase of the segment matters; if segment is draft, accepting a translate-phase suggestion writes to target_text directly). If segment is translated, EditPatternModal opens. | Click → modal visible |
| 5 | Interact with modal (if opened) | Modal content | Confirm or cancel edit-pattern application | Modal interaction |
| 6 | Verify segment target_text updated | Segment target_text display | Text reflects accepted suggestion | Content updated |

**Success signal**: Agent suggestion generated and accepted. Segment text updated. No error toasts.

**UX / readability checkpoints**:
- Step 2: Agent loading state should be clear (spinner, skeleton, or progress indicator — not a frozen UI).
- Step 4: Modal should not trap focus incorrectly; ESC should close it.
- Step 3: Suggestion card text contrast against background.

---

#### RF-TRANS-03 — Accept suggestion with StyleRuleModal (edited phase)

**Entry point**: Editor page, segment in `edited` status (proofreader's phase).
**Preconditions**: Proofreader-role user logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Navigate to a segment in `edited` status | Segment list → click segment with edited badge | Editor opens | Click → editor visible |
| 2 | Open Suggestion tab in cooperation drawer | Cooperation drawer → "Suggestions" tab | SuggestionPanel renders with existing suggestions (or empty state) | Tab switch |
| 3 | Accept a suggestion | `[data-testid="suggestion-accept"]` | **StyleRuleModal** opens (for `edited`-phase segments) | Click → modal |
| 4 | Apply style rule | Modal confirm button | Style rule applied; segment updated | Click → API → close modal |

**Success signal**: StyleRuleModal opens on edited phase, EditPatternModal does not. Correct modal for the correct phase.

---

#### RF-TRANS-04 — MemoryWriteBanner visibility after phase advance

**Entry point**: Editor page, active segment just had phase advanced.
**Preconditions**: Phase-4b RPC (`write_segment_memory`) executes after phase advance.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Advance a segment's phase (as in RF-TRANS-01) | `[data-testid="phase-advance-confirm-submit"]` | Phase advances | API response |
| 2 | Observe MemoryWriteBanner | `[data-testid="memory-write-banner"]` | Banner appears showing Phase-4b outcome (success/error/skipped) | Post phase-advance → banner visible |

**Success signal**: MemoryWriteBanner appears within reasonable time after phase advance (depends on RPC latency). Shows appropriate status.

---

#### RF-TRANS-05 — Context Builder two-stage MAC-RAG flow

**Entry point**: Editor page, active segment.
**Preconditions**: Translator logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Open cooperation drawer → "Context Builder" tab | Context Builder tab | ContextBuilderPanel renders | Tab switch → panel visible |
| 2 | Compose stage: click compose | `[data-testid="context-builder-compose-btn"]` | System + user prompts generated and displayed in `[data-testid="context-builder-system-prompt"]` and `[data-testid="context-builder-user-prompt"]` | Click → API (POST /api/mac-rag/compose) → prompts shown |
| 3 | Review prompts | Prompt text areas | Content is relevant to the active segment | Content visible |
| 4 | Generate stage: click generate | `[data-testid="context-builder-generate-btn"]` | Agent generates translation; result appears in `[data-testid="context-builder-result"]` | Click → API → result visible |
| 5 | Use as suggestion | `[data-testid="context-builder-use-suggestion"]` | Result is injected as a suggestion on the segment | Click → suggestion created |
| 6 | Expand to ContextBuilderModal | `[data-testid="context-builder-expand-btn"]` (in SegmentEditorPanel) | Full-screen ContextBuilderModal opens | Click → modal visible |
| 7 | Close modal | `[data-testid="context-builder-modal-close"]` or ESC | Modal closes, panel remains | Click → modal closed |

**Success signal**: Full two-stage MAC-RAG pipeline: compose → generate → use as suggestion. Both panel and modal views work.

**UX / readability checkpoints**:
- Step 2: System + user prompts should be readable (monospaced font, adequate contrast).
- Step 4: Loading state during generation should be clear.
- Step 6: Modal should not cause layout shift in the underlying page.

**Timing**:
- **Compose RTT**: click → prompts visible.
- **Generate RTT**: click → result visible (this may be slow: LLM call).

---

#### RF-TRANS-06 — Comment thread flow

**Entry point**: Editor page, active segment.
**Preconditions**: Translator logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Open cooperation drawer → "Comments" tab | Comments tab | CommentThread renders (empty or with existing comments) | Tab switch |
| 2 | Compose a comment | `[data-testid="comment-composer-textarea"]` → type → `[data-testid="comment-composer-submit"]` | Comment appears in thread | Submit → API → comment visible |
| 3 | Reply to the comment | Reply toggle → compose → submit | Nested reply appears | Click → compose → submit |
| 4 | Verify comment badge on segment list item | `[data-testid="segment-activity-comments"]` | Badge count increments | Badge update |

**Success signal**: Comment create + reply works. Badge reflects unresolved count.

---

#### RF-TRANS-07 — QA Issue resolve flow

**Entry point**: Editor page, segment with an existing QA issue.
**Preconditions**: Translator (or admin) logged in; segment has at least one unresolved QA issue.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Open "QA Issues" tab in cooperation drawer | QA Issues tab | QAIssuesList renders with issue rows | Tab switch |
| 2 | Click resolve on an issue | Resolve button on issue row | QAResolveModal opens | Click → modal |
| 3 | Provide resolution note, confirm | Modal textarea → confirm button | Issue marked resolved; list updates | Confirm → API → list update |

**Success signal**: QA issue resolved; list reflects change.

---

#### RF-TRANS-08 — Batch advance toolbar

**Entry point**: Editor page.
**Preconditions**: Translator logged in; multiple segments in their working phase.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Enable batch mode | `[data-testid="batch-mode-toggle"]` | Checkboxes appear on segment list items; BatchAdvanceToolbar appears | Click → UI change |
| 2 | Select 3 segments | Checkboxes on segment rows | Selected count shown in toolbar | Each click |
| 3 | Click batch advance in toolbar | Advance button in toolbar | All 3 segments phase-advance; result summary (succeeded/skipped/failed) shown | Click → batch API → results |

**Success signal**: Batch advance completes; result counts accurate.

---

#### RF-TRANS-09 — Filter bar: status, text search, my-phase toggle

**Entry point**: Editor page.
**Preconditions**: Translator logged in; document has segments in multiple statuses.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Click "Draft" status filter | `[data-testid="filter-status-draft"]` | Only draft segments shown | Click → re-filter |
| 2 | Toggle "My Phase" filter | `[data-testid="filter-my-phase"]` | Further narrows to segments matching user's assigned phases | Click → re-filter |
| 3 | Type text in search | `[data-testid="filter-search-input"]` | Segments filtered by source/target text | Typing → re-filter |
| 4 | Clear all filters | `[data-testid="filter-clear-all"]` | All segments visible again | Click → re-filter |

**Success signal**: Filters combine correctly (status + myPhase + text). URL params sync (`?status=draft&myPhase=1&q=sword`).

**UX / readability checkpoints**:
- Step 3: Filter response should feel instant (< 100ms for small docs, < 500ms for large) since it's client-side.
- Step 1: Filter bar chip labels readable (text contrast).

---

#### RF-TRANS-10 — Keyboard shortcuts workflow

**Entry point**: Editor page.
**Preconditions**: Translator logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Press `?` | Keyboard | Keyboard help modal opens (same as reader's `ReaderKeyboardHelpModal` pattern) | Keypress → modal |
| 2 | Navigate segments with `j`/`k` | `j` (next), `k` (prev) | Active segment changes; editor updates | Each keypress |
| 3 | Navigate with `↑`/`↓` | Arrow keys | Same as j/k | Each keypress |
| 4 | Save with `Ctrl+S` | Ctrl+S | Active segment saves | Key chord → save |
| 5 | Approve/advance with `Ctrl+Enter` | Ctrl+Enter | Phase advance dialog opens | Key chord → dialog |

**Success signal**: All shortcuts function. `?` help modal lists correct shortcuts.

---

#### RF-TRANS-11 — Mobile editor phone-block banner

**Entry point**: `/documents/[id]/edit`, viewport < 768px.
**Preconditions**: Translator logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Navigate to editor on mobile viewport (375×812) | — | Phone-block banner covers the page (md:hidden element) | Page load |
| 2 | Verify banner text | Banner content | "Editor requires a desktop" + link to reader | Content visible |
| 3 | Click "Go to Reader View →" | `[data-testid="mobile-editor-reader-link"]` | Navigates to `/documents/[id]/read` | Click → navigation |

**Success signal**: Editor is inaccessible on mobile; reader link works.

**UX / readability checkpoints**:
- Step 1: Banner should be fully visible, centered, with adequate text contrast.
- Step 1: Verify no editor content is visible behind/below the banner.

---

### 3.3 Admin Persona

#### RF-ADMIN-01 — Dashboard review: stat cards, phase breakdown, 30-day sparkline, top-10 leaderboard, QA summary

**Entry point**: `/admin`
**Preconditions**: Admin-1 logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Navigate to `/admin` | — | Dashboard skeleton appears (4 pulsing stat cards) | `navigationStart` → `domcontentloaded` |
| 2 | Wait for stat cards to hydrate | `div.text-3xl` (4 instances: Documents/Segmented/Users/Total Segments) | Numbers replace skeleton | Skeleton → content visible (allow up to 45s cold-start) |
| 3 | Verify phase breakdown widget | "Segment Status Breakdown" heading → colored PhaseBar rows | 5 bars (draft/translated/edited/proofread/qa_approved) with counts + percentages | Widget visible |
| 4 | Verify 30-day activity sparkline | "Activity (Last 30 Days)" heading → sparkline bars | Bars rendered; transition + comment counts shown | Widget visible |
| 5 | Verify top-10 editor leaderboard | "Top Editors (90 Days)" → ranked user rows | Up to 10 editors with colored avatars + edit counts | Widget visible |
| 6 | Verify QA issues widget | "Open QA Issues" table | Table of documents with critical/major/minor/total issue counts | Widget visible |
| 7 | Verify documents table | `[data-testid="admin-documents-table"]` | 25 rows/page with Title, ID, Progress, Publish Policy, Actions columns | Table visible |
| 8 | Verify users table | `[data-testid="admin-user-row"]` rows | User rows with last-active column + role dropdown | Table visible |

**Success signal**: All 4 stat cards show numbers (not '…'). All widget sections populated. No persistent skeletons.

**UX / readability checkpoints**:
- Step 1: Skeleton state should be visually distinct from error state.
- Step 2: Stat card numbers (blue/green/purple/orange `text-3xl`) must have adequate contrast against white card background.
- Step 3: Phase bar labels (e.g., "Draft" in `text-xs text-gray-700`) — verify not gray-on-white below 4.5:1.
- Step 5: Avatar initials in colored circles must be readable.
- Step 8: Role dropdown text must be readable in both light and dark modes. The `last_active_at` "Never" / relative time text should not be invisible.

**Timing**:
- **Cold-start dashboard**: `navigationStart` → all stat cards show real numbers (not '…'). Target: < 60s cold (Vercel Hobby), < 5s warm.
- **Analytics widget load**: stat cards visible → phase breakdown + sparkline + leaderboard visible. Analytics API fires separately after initial data load.

---

#### RF-ADMIN-02 — User role change

**Entry point**: `/admin`
**Preconditions**: Admin logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Find a user row | `[data-testid="admin-user-row"]` | Visible in users table | Table visible |
| 2 | Change role via dropdown | `[data-testid="admin-user-role-select"]` → select new role | Role dropdown value changes; API PATCH fires; row updates | Select change → API → UI update |
| 3 | Verify "roleSaving" state clears | Dropdown no longer disabled after save | Role persisted | Post-API |

**Success signal**: Role change persists (reload page and verify).

---

#### RF-ADMIN-03 — Document publish policy toggle

**Entry point**: `/admin`
**Preconditions**: Admin logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | In documents table, find publish-policy button | Toggle button showing "🔒 QA only" or "📄 Any translated" | Visible | Table visible |
| 2 | Click to toggle | Publish-policy button | Button text changes; filterSaving indicator shows "…" then resolves | Click → API PATCH `/api/documents/[id]/settings` → UI update |

**Success signal**: Policy toggles and persists across reload.

---

#### RF-ADMIN-04 — Assignment management per document

**Entry point**: `/admin/documents/[id]/assignments`
**Preconditions**: Admin logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Navigate to assignments page | `[data-testid="admin-document-assignments-link"]` from docs table | AssignmentTable renders | Navigation → page load |
| 2 | Verify existing assignment rows | `[data-testid="assignment-row"]` | Each row shows user, phases, edit/remove buttons | Table visible |
| 3 | Edit an assignment | `[data-testid="assignment-row-edit"]` → modify phases → `[data-testid="assignment-save"]` | Assignment updated; phases change | Edit → save |
| 4 | Add new assignment | `[data-testid="assignment-row-add"]` → pick user → pick phases → `[data-testid="assignment-add-submit"]` | New row appears | Add → submit |
| 5 | Remove an assignment | `[data-testid="assignment-remove"]` | Row removed | Click → API → row gone |

**Success signal**: CRUD on assignments works. User picker finds users. Phases can be toggled.

---

#### RF-ADMIN-05 — Per-user assignments page

**Entry point**: `/admin/users/[userId]/assignments`
**Preconditions**: Admin logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Navigate from users table | `[data-testid="admin-user-assignments-link"]` | Navigates to per-user assignments | Click → page load |
| 2 | Verify assignment rows | `[data-testid="admin-user-assignments-row"]` | Each shows document link + phases | Table visible |

**Success signal**: Assignments rendered for the specific user.

---

#### RF-ADMIN-06 — Segmentize flow

**Entry point**: `/admin/documents/[id]`
**Preconditions**: Admin logged in; document exists and is unsegmented (or re-segmentize allowed).

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Navigate to admin document detail | `[data-testid="admin-document-detail-link"]` | Document detail page | Navigation |
| 2 | Click segmentize button | Segmentize button | Segmentation job triggers; progress feedback | Click → job start → completion |

**Success signal**: Document gets segmented; segment count updates.

---

### 3.4 Anonymous / First-time Visitor

#### RF-ANON-01 — Landing page → register → login → redirect

**Entry point**: `/`
**Preconditions**: No auth session.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Visit landing page `/` | — | Landing page renders with hero, CTAs | `navigationStart` → `domcontentloaded` |
| 2 | Click "Get Started" or "Register" | Register CTA button | Navigate to `/register` | Click → navigation |
| 3 | Fill registration form | Email + password inputs | Form validates | Each input |
| 4 | Submit registration | Submit button | Account created; redirect to `/documents` (or `/`) | Submit → API → redirect |
| 5 | Log out | Logout button/flow | Redirect to landing or login | Click |
| 6 | Navigate to `/login` | — | Login page renders | Navigation |
| 7 | Log in with new credentials | Email + password → submit | Redirect to `/documents` | Submit → auth → redirect |

**Success signal**: Full registration + login + redirect cycle. No error toasts.

**UX / readability checkpoints**:
- Step 1: Landing page text contrast. Hero section text vs. background.
- Step 3: Form input labels readable; placeholder text has adequate contrast.
- Step 6: Login form elements have proper focus indicators.

---

#### RF-ANON-02 — 401 gate verification

**Entry point**: `/api/documents` (unauthenticated)
**Preconditions**: No auth session.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Attempt direct API access | `GET /api/documents` | Returns 401 | API response |
| 2 | Attempt to visit `/documents` directly | Navigate to `/documents` | Redirect to `/login?next=/documents` | Navigation → redirect |

**Success signal**: Unauthenticated users cannot access protected resources.

> **Note (2026-06-27, Straggler D)**: Admin role gating now reads the role from the JWT `app_metadata.role` claim on the fast path (commits `8e45463` / `ed4fa61`, affecting `lib/auth/requireAdmin.ts`, `lib/supabase/proxy.ts`, and the auth/terminology/batch-advance API routes). The claim is synced by migration 010's `sync_profile_role_trigger`. A stale-JWT fallback queries the `profiles` table only when the claim is absent. Test flows that exercise admin role checks (RF-ADMIN-*) should verify the `app_metadata.role` claim is present in the JWT for newly-issued tokens; otherwise role-dependent API routes will fall back to the profiles table query (still correct, but slower).

---

### 3.5 Cross-Cutting Flows

#### RF-CROSS-01 — Cold-start latency measurement

**Entry point**: Any page (production Vercel, after ~5 min idle).
**Preconditions**: Fresh browser context; no cached session.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Request `/login` (unauthenticated, no DB) | — | Page renders | `navigationStart` → `domcontentloaded` → paint |
| 2 | Request `/documents` (authenticated, cold Supabase) | — | Page renders with document list | `navigationStart` → SSR complete → hydration → content visible |
| 3 | Request `/admin` (authenticated, cold analytics API) | — | Page renders; stat cards eventually hydrate | `navigationStart` → stat card numbers visible |
| 4 | Request `/documents/[id]/read` (small doc, cold) | — | Reader renders with segments | `navigationStart` → first segment visible |

**Method**: 3-attempt retry pattern from `production-smoke.spec.ts` (3 attempts, 2s delay between each).

**Success signal**: All pages render within timeout (60s per attempt). Document per-step timing for baseline.

---

#### RF-CROSS-02 — Large-book performance: 23,500-segment document

**Entry point**: `/documents/[id]/edit` for a large document (e.g., Kendojidai 2014, ~23,529 segments).
**Preconditions**: Admin logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Navigate to large doc editor | Direct URL | Editor loads with first page of segments | `navigationStart` → segment list visible |
| 2 | Measure segment list render time | First `[data-testid="segment-list-item"]` visible | Within acceptable bounds | Time to first segment visible |
| 3 | Scroll through segment list | Scroll down | Virtualization or pagination works; no browser hang | Scroll responsiveness |
| 4 | Apply filter (e.g., "draft" only) | Status filter | Filter applies; filtered count shown | Click → re-filter time |
| 5 | Select and edit a segment | Click segment → edit | Editor panel opens responsively | Click → editor visible |
| 6 | Navigate reader for same doc | `/documents/[id]/read` | Reader renders with pagination | Navigation → first page visible |

**Success signal**: Large doc does not crash or hang the browser. Filter/search remain responsive.

**Timing**:
- **Editor initial load**: `navigationStart` → first segment list item visible. Warning if > 15s warm.
- **Filter response**: < 2s for client-side filter on 23,500 items.
- **Reader pagination**: page-to-page navigation < 3s.

**UX / readability checkpoints**:
- Verify no memory leaks (browser tab memory growth across 10 page navigations).

---

#### RF-CROSS-03 — Global theme persistence across pages (SiteNav gear)

**Entry point**: Any page where SiteNav is visible (NOT reader/editor/`/`/login/register).
**Preconditions**: User logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | On `/documents`, click gear icon | `[data-testid="global-theme-trigger"]` in SiteNav | Theme settings panel opens | Click → panel visible |
| 2 | Switch to dark mode | Dark mode toggle | SiteNav + page switch to dark colors | Click → theme change |
| 3 | Navigate to `/search` | Search nav link | Search page renders in dark mode | Navigation → theme persists |
| 4 | Navigate to `/terminology` | Terminology nav link | Terminology page renders in dark mode | Navigation → theme persists |
| 5 | Navigate to `/profile` | Profile nav link | Profile page renders in dark mode | Navigation → theme persists |
| 6 | Navigate to `/documents/[id]/read` | Reader | **Known caveat**: SiteNav is hidden on reader. Reader has its own 7 themes. The global theme setting may or may not affect the reader's initial theme (verify behavior). | Navigation → reader initial theme |

**Success signal**: Global theme persists across pages where SiteNav is visible.

**UX / readability checkpoints**:
- Step 2–5: Verify all text remains readable in dark mode (no dark text on dark background).
- Step 6: Document the interaction between global theme and reader-specific theme.

---

#### RF-CROSS-04 — Error / empty states

**Entry point**: Various.
**Preconditions**: Varies.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Visit `/documents` with no documents | `/documents` as reader with no docs | Empty state message (not crash) | Page load |
| 2 | Visit editor for non-existent doc ID | `/documents/nonexistent-id/edit` | Error state rendered (not blank page) | Page load |
| 3 | Visit reader for doc with 0 segments | `/documents/[unsegmented-id]/read` | "No segments" or empty state | Page load |
| 4 | Search for term with 0 results | Search sidebar → type gibberish | "No results" message | Typing → result |
| 5 | Attempt phase advance on locked/conflicting segment | Editor → advance | `[data-testid="phase-advance-stale"]` or error message | Click → error response |

**Success signal**: All error/empty states render user-friendly messages, not blank pages or raw stack traces.

---

#### RF-CROSS-05 — EN/ZH language switcher consistency

**Entry point**: Editor and reader, all documents.
**Preconditions**: User logged in.

| Step | Action | Selector / data-testid | Expected outcome | Timing point |
|------|--------|------------------------|------------------|--------------|
| 1 | Editor: switch to ZH | `[data-testid="lang-tab-zh"]` | Segment source_text shows Japanese, target_text shows ZH | Click → segments reload |
| 2 | Editor: verify ZH segment count matches EN count | Segment list length | Same number of segments (all docs have both lang variants) | Data comparison |
| 3 | Reader: switch to ZH | `button:has-text("中文")` | Reader shows ZH content | Click → content re-render |
| 4 | Switch back to EN in both | EN toggle | EN content restored | Click → content re-render |

---

## 4. Cross-Cutting Scenario Matrix

### 4.1 Themes × Pages (contrast audit)

| Theme | `/documents` | `/admin` | Reader (light bg) | Reader (dark bg) | `/search` | `/terminology` | `/profile` |
|-------|-------------|---------|--------------------|--------------------|------------|---------------|-----------|
| **Light** | ✓ | ✓ | ✓ (reader theme) | N/A | ✓ | ✓ | ✓ |
| **Dark** | ✓ (SiteNav) | ✓ | Reader theme: dark | ✓ (reader theme) | ✓ | ✓ | ✓ |
| **Solarized** | N/A | N/A | ✓ | N/A | N/A | N/A | N/A |
| **Pastel** | N/A | N/A | ✓ | N/A | N/A | N/A | N/A |
| **Sepia** | N/A | N/A | ✓ | N/A | N/A | N/A | N/A |
| **High Contrast** | N/A | N/A | ✓ | N/A | N/A | N/A | N/A |
| **Night Warm** | N/A | N/A | N/A | ✓ | N/A | N/A | N/A |

For each ✓ cell, run automated contrast check (computed style luminance ratio vs. WCAG AA 4.5:1 for body text, 3:1 for large text).

Priority targets: light-theme `/admin` (gray-on-white risk), high-contrast reader theme (should obviously pass), dark-theme admin (dark text on dark bg risk).

### 4.2 Language EN/ZH

| Page | EN | ZH |
|------|----|----|
| Reader (SingleLanguageView) | ✓ | ✓ |
| Reader (BilingualParagraphView) | ✓ (EN + ZH side-by-side) |
| Editor segment list (source/target) | ✓ | ✓ |
| `/search` results | ✓ | ✓ (ZH segments in results) |

### 4.3 Viewport

| Viewport | Desktop (1280×800) | Tablet (768×1024) | Mobile (375×812) |
|----------|-------------------|--------------------|--------------------|
| `/` landing | ✓ | ✓ | ✓ |
| `/documents` | ✓ | ✓ | ✓ |
| Reader | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ | **BLOCKED** (phone-block banner) |
| `/admin` | ✓ | ✓ | ✓ (may have horizontal scroll) |
| `/search` | ✓ | ✓ | ✓ |
| `/terminology` | ✓ | ✓ | ✓ |
| `/profile` | ✓ | ✓ | ✓ |

### 4.4 Cold vs. Warm

| Page | Warm (< 5 min idle) | Cold (> 5 min idle, Vercel Hobby) |
|------|---------------------|----------------------------------|
| `/login` | Fast (< 2s) | Slower (3–8s) |
| `/documents` | Fast (SSR cached) | Slower (cold Supabase + Next.js) |
| `/admin` | Fast (< 5s) | **Very slow** (analytics API: 5 parallel COUNT queries over ~396k segments; allow 60s) |
| Reader | Fast (< 3s) | Slower (5–15s) |
| Editor (small doc) | Fast (< 3s) | Slower (5–15s) |
| Editor (large doc) | Medium (5–15s) | Very slow (15–60s+) |

### 4.5 Small vs. Large Document

| Flow | Small doc ("Kendo Philosophy", 3 segs) | Large doc (Kendojidai 2014, ~23,529 segs) |
|------|----------------------------------------|------------------------------------------|
| Editor initial load | < 2s warm | < 15s warm |
| Reader page turn | Instant | < 3s |
| Filter in editor | Instant (client-side, 3 items) | < 2s (client-side, 23k items) |
| Search in reader sidebar | Fast (3 pages) | Moderate (many pages) |

---

## 5. Measurement Methodology

All flows in Section 3 will be instrumented in a downstream Playwright implementation as follows.

### 5.1 Per-step timing

| Measurement | Technique | API / tool |
|---|---|---|
| **Navigation time** | `performance.getEntriesByType('navigation')[0]` via `page.evaluate` after `domcontentloaded` | Performance API: `domContentLoadedEventEnd - navigationStart`, `loadEventEnd - navigationStart` |
| **Content-visible time** | `page.waitForSelector` with a content-specific selector + `Date.now()` delta from nav start | Playwright `waitForSelector` + manual `Date.now()` |
| **Action→response time** | `Date.now()` before action (click/fill/keypress) and after expected UI response element is visible | `test.step` wrapper with `performance.now()` bookends |
| **Hydration-to-content** | Delta between `domcontentloaded` and first non-skeleton content element visible | Two `Date.now()` snapshots |
| **API RTT** | Wait for network response (`page.waitForResponse`) + UI update delta | Playwright network interception + content wait |
| **Cold-start retry** | 3-attempt pattern from `production-smoke.spec.ts`: retry with 2s backoff | `for` loop in `beforeAll` / per-test |

**Key principle**: Use `domcontentloaded`, NOT `networkidle`. Realtime WebSocket subscriptions (Supabase Realtime for presence, activity badges) mean `networkidle` never settles. All content-visible waits must target specific DOM elements (testids, text content, role selectors), not generic load states.

### 5.2 UX / readability capture

| Concern | Technique |
|---|---|
| **Contrast ratio** | After content-visible, call `page.evaluate` to read `getComputedStyle(el).color` and `getComputedStyle(el).backgroundColor`; compute relative luminance per WCAG 2.1 formula; assert ≥ 4.5:1 for body text, ≥ 3:1 for large text (≥18px or ≥14px bold). Optionally integrate `@axe-core/playwright` for automated a11y scans. |
| **Gray-on-white detection** | Specific check: if `color` is a gray hex (`#6b7280`, `#9ca3af`, etc.) and background is white/near-white, flag as potential issue even if mathematically passing (subjective readability). |
| **Skeleton vs. real content** | Screenshot at `domcontentloaded` (skeleton) and after content-visible (real content). Compare; if identical, content never loaded. Flag if skeleton visible for > 3s without progress indicator. |
| **Layout shift (CLS)** | Use `page.evaluate` to read `performance.getEntriesByType('layout-shift')` (where supported) or snapshot-based visual diff: two screenshots 500ms apart after content-visible; compute pixel diff area. |
| **Screenshot capture** | Full-page or viewport-only screenshots at key moments: (a) skeleton/loading state, (b) content-visible, (c) post-interaction. Saved to `test-results/user-flow-screenshots/[flow-id]/[step]-[label].png`. |
| **Mobile-specific** | Viewport 375×812; check for horizontal overflow, touch target size (≥44px), font legibility at mobile scale. |

### 5.3 Cookie-injected auth for efficiency

Replicate `production-smoke.spec.ts` `injectSession` pattern: log in via Supabase REST API `POST /auth/v1/token?grant_type=password` in `beforeAll`, set `sb-<ref>-auth-token` cookies on the `BrowserContext`. This avoids per-flow form-login overhead and is faster than browser-based login.

### 5.4 Document selection strategy

- **Quick flows** (RF-READER theme switch, RF-TRANS edit cycle): Use smallest segmented doc ("Kendo Philosophy", 3 segments).
- **Realistic flows** (RF-READER browse + search, RF-TRANS full TEP): Use a medium doc (100–500 segments, identified at test runtime from `/api/documents`).
- **Large-book flows** (RF-CROSS-02): Use the largest segmented doc (Kendojidai 2014, ~23,529 segs).

---

## 6. Prioritisation

### P0 — Critical path (must pass for launch)

| Flow ID | Name | Rationale |
|---------|------|-----------|
| `RF-TRANS-01` | Login → edit → save → advance phase | Core TEP workflow |
| `RF-READER-01` | Browse → open → read → bookmark → resume | Primary user-facing flow |
| `RF-ADMIN-01` | Dashboard review (all widgets) | Admin monitoring |
| `RF-ANON-01` | Landing → register → login | Onboarding funnel |
| `RF-CROSS-01` | Cold-start latency baseline | Production reliability |

### P1 — High priority (strongly recommended)

| Flow ID | Name |
|---------|------|
| `RF-READER-02` | Theme switch cycle (all 7 themes) |
| `RF-READER-03` | ZH toggle + PDF view |
| `RF-TRANS-02` | Agent suggestion → accept (EditPatternModal) |
| `RF-TRANS-05` | Context Builder two-stage MAC-RAG |
| `RF-TRANS-06` | Comment thread |
| `RF-ADMIN-02` | User role change |
| `RF-ADMIN-04` | Assignment management |
| `RF-CROSS-02` | Large-book performance |
| `RF-CROSS-03` | Global theme persistence |
| `RF-CROSS-04` | Error / empty states |

### P2 — Nice to have

| Flow ID | Name |
|---------|------|
| `RF-READER-04` | Full-text search with context |
| `RF-READER-05` | Status filter sidebar |
| `RF-TRANS-03` | StyleRuleModal on edited phase |
| `RF-TRANS-04` | MemoryWriteBanner |
| `RF-TRANS-07` | QA issue resolve |
| `RF-TRANS-08` | Batch advance |
| `RF-TRANS-09` | Filter bar (status + text + myPhase) |
| `RF-TRANS-10` | Keyboard shortcuts |
| `RF-TRANS-11` | Mobile editor phone-block |
| `RF-ADMIN-03` | Publish policy toggle |
| `RF-ADMIN-05` | Per-user assignments |
| `RF-ADMIN-06` | Segmentize |
| `RF-ANON-02` | 401 gate |
| `RF-CROSS-05` | EN/ZH language switcher |

### Recommended first 3–5 flows to instrument

1. **`RF-TRANS-01`** (Login → edit → save → advance phase) — Exercises auth, editor hydration, segment CRUD, phase transition, and history. Single-flow coverage of the core value proposition.
2. **`RF-READER-01`** (Browse → open → read → bookmark → resume) — Exercises document list sorting, reader rendering, bookmarking, and progress persistence. Covers reader features end-to-end.
3. **`RF-ADMIN-01`** (Dashboard review) — Exercises the most timing-sensitive page (cold-start analytics). Validates skeleton→content transition, stat card hydration, all widget sections.
4. **`RF-READER-02`** (Theme switch cycle) — Highest-density UX/readability check: 7 themes, font size range, font color picker, layout widths. Finds contrast regressions quickly.
5. **`RF-CROSS-01`** (Cold-start baseline) — Establishes timing budgets for all other flows. Failure here indicates infra issues, not app bugs.

---

## 7. Pass/Fail & UX-Grading Rubric

### 7.1 Time budgets per step type

| Step type | Warm (ms) | Cold (s) | Hard timeout (s) | Notes |
|-----------|-----------|----------|-------------------|-------|
| Page navigation (static) | < 2,000 | < 8 | 30 | `/login`, `/` landing |
| Page navigation (SSR + auth) | < 3,000 | < 15 | 30 | `/documents`, reader, editor (small doc) |
| Page navigation (analytics) | < 5,000 | < 60 | 75 | `/admin` dashboard |
| Editor segment activation | < 500 | < 2,000 | 10 | Click segment → editor visible |
| Save (Ctrl+S) | < 1,000 | < 3,000 | 10 | Text save → API → confirmation |
| Phase advance | < 2,000 | < 5,000 | 15 | Confirm → API → badge update |
| Agent suggestion generation | — | < 30,000 | 60 | LLM call; variable |
| MAC-RAG compose | — | < 10,000 | 30 | API call |
| MAC-RAG generate | — | < 30,000 | 60 | LLM call |
| Theme switch (reader) | < 300 | < 1,000 | 5 | CSS variable swap; should be instant |
| Filter apply (small doc) | < 100 | < 500 | 5 | Client-side array filter |
| Filter apply (large doc) | < 2,000 | < 5,000 | 15 | Client-side on 23k items |
| Reader page turn | < 1,000 | < 3,000 | 10 | Page navigation |
| Search sidebar debounce | < 300 | < 1,000 | 5 | After last keystroke |
| **Second-nav article LCP** (reader) | **< 2,000** | **< 4,000** | **10** | **Straggler E (2026-06-27): second navigation to same article after `unstable_cache` warm. Live gate: 1,193ms PASS. See `tests/reader-second-nav-lcp.spec.ts`.** |

**Grading**:
- **PASS**: Within warm budget.
- **WARN**: Between warm and cold budget, but under hard timeout.
- **FAIL**: Exceeds hard timeout.

### 7.2 Readability / UX severity scale

| Severity | Criteria | Example |
|----------|----------|---------|
| **BLOCKING** | Content unreadable (contrast < 2.5:1); page crashes; blank white screen; action fails silently with no feedback | White text on white background; `text-gray-100` on `bg-white` |
| **MAJOR** | WCAG AA failure (contrast 2.5–4.5:1 for body text); skeleton visible > 10s; layout shift > 0.2 CLS; touch target < 24px on mobile | `text-gray-400` on `bg-white` before N1 fix (gray-on-white); page jumps 200px during hydration |
| **MINOR** | WCAG AA bare pass but subjectively hard to read; skeleton flash < 2s; minor overflow on narrow viewport; focus indicator missing | `text-gray-500` on `bg-white` (passes 4.5:1 but feels washed out); horizontal scrollbar on tablet for admin table |

**Check**: Every flow in Section 3 must have at least one BLOCKING check (contrast audit on primary content area) and one MAJOR check (skeleton→content transition).

### 7.3 Flow-level verdict

- **PASS**: All steps pass timing + UX. 0 BLOCKING, 0 MAJOR issues.
- **PASS WITH OBSERVATIONS**: All steps pass timing. ≤ 2 MINOR issues documented.
- **WARN**: 1 MAJOR issue or ≥ 3 MINOR issues. Flow still completes.
- **FAIL**: Any BLOCKING issue, or any step exceeds hard timeout.

---

## 8. Assumptions & Gaps

### 8.1 Selector assumptions

The following testids/selectors are **not confirmed** in the current codebase and are assumed based on component patterns:

| Assumed selector | Component / area | Basis |
|---|---|---|
| Reader view-mode buttons (Bilingual, Aligned, etc.) | `ReaderView.tsx` | `MODE_LABELS` constant; assume buttons have `aria-pressed` or text content |
| Reader bookmark button | Reader toolbar | No `data-testid` found for bookmark toggle; assume icon button with bookmark-related aria-label |
| Reader pagination controls | Reader footer | Assumed "Next" / "Previous" buttons or page number links |
| Reader theme buttons (Dark, Solarized, etc.) | `ReaderSettingsPanel.tsx` | Theme buttons currently use color swatch buttons without `data-testid`; assume `aria-label` or text |
| Font selector (sans/serif/mincho) | `ReaderSettingsPanel.tsx` | Assumed radio/button group with font family labels |
| Register page form | `/register` page | Assume similar structure to `/login` (email + password inputs) |

### 8.2 Known gaps

1. **Reader theme/SiteNav interaction** (RF-CROSS-03 Step 6): The reader has its own 7-theme system. The global SiteNav gear sets a separate theme. The interaction between these two theme systems (does global dark mode override reader-selected light theme? Does reader setting survive navigation to non-reader pages?) needs **manual verification** before the instrumented test can assert behavior.

2. **Agent suggestion availability**: Flows RF-TRANS-02 and RF-TRANS-03 assume the agent suggestion feature is available and functional. If the backend LLM integration is down or rate-limited, these flows will fail for infra reasons, not code reasons. The test should detect this and skip (not fail) gracefully.

3. **WebSocket realtime subscriptions**: The editor uses `usePresence` which opens a Supabase Realtime WebSocket. This connection is persistent and never closes, so `networkidle` waits will hang. All content-visible waits must use explicit element selectors — this is already documented in Section 5.1.

4. **Vercel Hobby cold-start variability**: Cold-start times on Vercel Hobby (free tier) are highly variable. The 3-attempt retry with 2s delay may not be sufficient in all cases. Consider 5-attempt for `/admin` analytics.

5. **Document availability**: Some flows assume the existence of a document with ZH segments and a paired PDF. If the production DB changes (e.g., all ZH segments removed), those flows will skip. The test runner should log skips distinctly from failures.

6. **No `data-testid` on reader view-mode controls, bookmark button, theme buttons**: These are critical for user-flow testing. Recommendation: add testids during the downstream instrumentation phase before writing Playwright code.

---

## 9. Downstream Implementation Notes

When instrumented Playwright tests are written from this plan:

- Use `test.describe` grouping by flow ID (e.g., `RF-READER-01`).
- Use `test.step` for each numbered step with embedded `performance.now()` timing.
- Tag top-level describes with `@user-flow` and priority (`@p0`, `@p1`, `@p2`).
- Use shared `beforeAll` auth (Supabase REST token + cookie injection) to avoid per-flow login cost.
- Small-doc selection: sort by `segment_count` ascending, pick first with `segment_count > 0`.
- Screenshot naming: `[flow-id]/[step-number]-[label].png`.
- Contrast checking: extract `getComputedStyle` color + backgroundColor, compute WCAG relative luminance.
- Never use `page.waitForLoadState('networkidle')`.

---

**Total flows**: 27 flows across 4 personas + 5 cross-cutting.
- Reader: 5 flows
- Translator: 11 flows
- Admin: 6 flows
- Anonymous: 2 flows
- Cross-cutting: 5 flows (cold-start, large-book, theme persistence, error states, lang switcher)

**Ready for review**. Instrumented Playwright implementation to follow in a subsequent phase.

---

## 10. Addendum — Changes Since 2026-06-16 Baseline

This section records features, fixes, and infrastructure changes that landed **after** the 2026-06-16 baseline and materially affect the test plan. Targeted inline updates have been woven into the relevant flow sections above; this addendum provides a consolidated changelog, expanded coverage notes, and a deploy-preconditions checklist.

### 10.1 Changelog

| Date | Commit | Area | What Changed | Test Impact |
|------|--------|------|-------------|-------------|
| 2026-06-26 | `e942fac` | **Furigana engine** | KANJIDIC2 per-character ON/KUN reading fallback (12,356 kanji, `lib/furigana/annotate.ts`). When Sudachi tokenizer returns surface-as-reading, the pipeline decomposes to per-character KANJIDIC2 lookups. KUN for standalone kanji, ON for compounds; katakana→hiragana conversion; okurigana stripping. Build green, integration 19/19 (`scripts/test-kanjidic2-integration.ts`). | New UX checkpoint: `<ruby>/<rt>` readability in JP reader (`RF-READER-01`, `RF-READER-03`). Coverage ~56% on primary test doc `86adf815`. Known visual gap: furigana screenshots were captured on documents-list, not reader; reader JP-mode screenshot needed to close. |
| 2026-06-26 | `eccf1a8` | **Search RPC** | Migration 016 rewrites `search_segments()` to remove `ORDER BY`, replacing expensive btree index scan with early-stopping sequential scan. Cold kote: 1471ms → <100ms; warm: 33.7ms. Column shape unchanged; no app code change. | `RF-READER-04` full-text search now performant. ⚠️ Migration must be applied to live DB (applied 2026-06-27). Rollback: re-apply migration 011. |
| 2026-06-26 | `8e45463` | **Auth (Straggler D)** | Admin role read from JWT `app_metadata.role` claim (fast path), falling back to `profiles` table for stale JWTs. Touches `lib/auth/requireAdmin.ts`, `lib/supabase/proxy.ts`, and 4 API routes (`auth/me`, `batch-advance`, `terminology` GET + PATCH). | `RF-ADMIN-*` role checks, `RF-ANON-02` 401 gate: verify `app_metadata.role` present in JWT for newly-issued tokens. Stale-token fallback still correct but slower (extra DB query). |
| 2026-06-26 | `8e45463` | **Perf (Straggler E)** | New `tests/reader-second-nav-lcp.spec.ts`: measures LCP on second navigation to same article (`unstable_cache` warm). Gate: <2000ms. Live result: 1193ms PASS (TTFB 348ms). | New performance budget added to §7.1 time budgets table. `RF-CROSS-01` cold-start section should consider a warm-repeat variant. |
| 2026-06-26 | `ed4fa61` | **Design tokens** | 21 files (editor components, terminology page, AssignmentTable): hardcoded Tailwind neutral colors → 7 semantic CSS custom properties (`--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-link`, `--color-accent`). Dark-mode variants removed (tokens handle it). | Editor/terminology/admin color contrast checks now depend on CSS custom property values, not hardcoded Tailwind classes. `RF-READER-02` theme-switch and §4.1 contrast matrix should validate that the tokens produce WCAG AA-compliant colors in all 7 reader themes + global light/dark. |
| 2026-06-27 | `f32ad47` | **Build fix + QA hardening** | Fixes type-check regression in KANJIDIC2 integration test (type predicate on `findKanjiSpan`). Hardens 2 flaky QA specs: mobile 320px banner (now uses `waitFor` instead of `isVisible()`), PWA reading-position (now polls `toHaveValue()`). **1 commit ahead of origin/main — NOT YET PUSHED.** | Build green (27 static pages, type-check passes). Mobile-qa and PWA-offline specs now non-flaky. |

### 10.2 Expanded Flow Coverage Notes

#### 10.2.1 Furigana/Ruby Rendering in JP Reader

The KANJIDIC2 fallback engine (commit `e942fac`, `lib/furigana/annotate.ts` lines 218–333) extends furigana annotation coverage beyond what Sudachi alone can provide. Key implementation details relevant to testing:

- **Data source**: `lib/furigana/kanjidic2-readings.json` — 12,356 kanji with ON/KUN reading arrays (CC-BY-SA 4.0, KANJIDIC2).
- **Fallback trigger**: When Sudachi tokenizer returns `reading === surface` (could not resolve reading), `kanjidic2Fallback()` decomposes the kanji run character by character, looks up each in the dictionary, and concatenates per-character readings.
- **Heuristic**: Single-kanji → prefer KUN (kun-yomi context, e.g. 込 → こ); multi-kanji → prefer ON (on-yomi compound context, e.g. 上下 → じょうげ).
- **Output**: All readings are hiragana. ON readings (katakana in KANJIDIC2) are converted via `katakanaToHiragana()`. KUN okurigana is stripped (e.g. `かえ.す` → `かえ`).
- **Romaji**: Derived from hiragana via `wanakana.toRomaji()` with doubled-vowel Hepburn post-processing (`ō` → `ou`, etc.).
- **Coverage**: ~56% of kanji in test doc `86adf815-b0ca-46eb-bab7-b6fb040b845c` have KANJIDIC2 entries; the remaining ~44% rely solely on Sudachi (which covers most common vocabulary).

**Visual rendering**: The `RubyText` component (`components/reader/RubyText.tsx`) renders furigana as semantic `<ruby>kanji<rt>reading</rt></ruby>` elements. CSS in `globals.css` (lines 253–279) explicitly sets:

- `[data-reader-theme] [data-paragraph-index] { line-height: 2.0; }` — constant line spacing regardless of furigana on/off, preventing `<rt>` annotation crowning of adjacent lines.
- `ruby { ruby-position: over; }` — consistent across browser engines.
- `rt { font-size: 0.5em; line-height: 1; }` — readable annotation size.

**Test checkpoints** (added inline to `RF-READER-01` and `RF-READER-03`):
1. Verify `<ruby>/<rt>` elements are present for kanji in JP source documents.
2. Verify `<rt>` text is hiragana (not katakana, not surface kanji).
3. Verify no line-height crowding: adjacent lines must not overlap.
4. Verify furigana renders in all 7 reader themes (themes use `--rt-*` CSS custom properties).
5. Verify JLPT filter dropdown (N5–N1) correctly shows/hides annotations.
6. Verify romaji mode renders romaji text in `<rt>` (not hiragana).
7. **Known visual gap**: Furigana reader screenshots were captured on the documents-list page, not the reader. JP single-language mode screenshot on the reader needed to close this QA gap (see evolving plan 2026-06-27).

#### 10.2.2 Search Flow (RF-READER-04) — Migration 016 Dependency

Migration 016 (`supabase/migrations/016_fix_search_kote.sql`, commit `eccf1a8`) is a **blocking precondition** for acceptable `RF-READER-04` performance:

| Metric | Before (011) | After (016) | Speedup |
|--------|-------------|-------------|---------|
| `search_segments('kote', 20)` cold | ~1471ms | <100ms | 15×+ |
| `search_segments('kote', 20)` warm | 26ms | 33.7ms | ~1× |
| `search_segments('men', 20)` warm | 0.7ms | 0.68ms | ~1× |
| `search_segments('剣道', 20)` warm | 0.8ms | 17.5ms | regressed but <50ms |

The RPC rewrite removes the `ORDER BY s.article_id, s.position` clause that forced the PostgreSQL planner to use an ordered index scan on `idx_segments_article_position`, requiring expensive ILIKE rechecks on long text columns. Without ordering, the planner chooses an early-stopping sequential scan. The tradeoff: result ordering is no longer deterministic (heap order), but the app route never depended on ordering (all `rank` values are hardcoded to 0.0).

Migration 016 was **applied to the live DB on 2026-06-27**. If a rollback is ever needed, re-apply migration 011. The migration is a pure `CREATE OR REPLACE FUNCTION` — instant apply, no data migration, no lock, no index change.

Testing `RF-READER-04` without migration 016 applied will produce **FAIL** for common search terms on cold cache (1471ms > 1000ms warm budget for search sidebar debounce).

#### 10.2.3 LCP / Second-Navigation Performance Budget

Straggler E (commit `8e45463`) added `tests/reader-second-nav-lcp.spec.ts`, which establishes a **second-navigation LCP gate**: after priming Next.js `unstable_cache` via a first navigation, the second navigation to the same article (doc `86adf815`) must have LCP < 2000ms. Live measurement: **1193ms LCP, 348ms TTFB** — PASS.

This gate has been added to the §7.1 time budgets table. For `RF-CROSS-01` (cold-start latency measurement), consider adding a **warm-repeat** variant that measures this second-nav LCP as a distinct timing point, since it exercises the `unstable_cache` path rather than fresh SSR.

#### 10.2.4 app_metadata Role Change — Auth/Role-Gating Implications

Straggler D (commit `8e45463`, `ed4fa61`) introduces a fast path for role checks:

- **New helper**: `lib/auth/requireAdmin.ts` — `requireAdmin()` reads `app_metadata.role` from the JWT claim first; falls back to `profiles` table only for stale JWTs.
- **Middleware**: `lib/supabase/proxy.ts` — admin path guard now checks `app_metadata.role` instead of querying `profiles` table.
- **API routes**: `auth/me`, `batch-advance`, `terminology` GET/PATCH — all now use the same pattern.

**Test implications for RF-ADMIN-* and RF-ANON-02**:

1. Role checks are now faster (no per-request DB query) but depend on the `app_metadata.role` claim being present in the JWT. Migration 010's `sync_profile_role_trigger` is responsible for syncing this claim.
2. Stale JWTs (minted before the trigger backfill) will fall back to the `profiles` table query — still correct but slower. Tests should not fail if the fallback fires, but performance expectations differ.
3. `RF-ADMIN-02` (user role change): verify that after changing a user's role via the admin dashboard, the new role is reflected in the JWT `app_metadata.role` claim on the next token refresh.
4. `RF-ANON-02` (401 gate): the 401/403 responses are unchanged; only the internal resolution path differs.

### 10.3 Deploy Preconditions & Known Caveats

| # | Condition | Status | Impact if unmet |
|---|-----------|--------|-----------------|
| 1 | **Migration 016 applied to live DB** | ✅ Applied 2026-06-27 (kote 33.7ms) | `RF-READER-04` fails hard timeout for common search terms on cold cache |
| 2 | **Commit `f32ad47` pushed to origin/main** | ❌ NOT pushed (1 commit ahead) | Build type-check regression on `main` (KANJIDIC2 integration test fails `npm run build`); 2 flaky QA specs not hardened |
| 3 | **Furigana visual QA gap closed** | ❌ Screenshots captured on wrong page (documents-list, not reader) | Furigana rendering not visually confirmed in reader JP single-language mode; CSS spacing fix (`line-height: 2.0`) not screenshot-verified |
| 4 | **KANJIDIC2 re-precompute** (optional) | ❌ Not yet run; 439k existing JP rows use pre-fallback engine | Existing furigana annotations lack KANJIDIC2 fallback readings; coverage improves only after `--force` re-precompute via `npx tsx scripts/precompute-furigana.ts --force` |
| 5 | **`app_metadata.role` trigger 010 functional** | ✅ Presumed functional per deploy history | If trigger fails, admin role checks fall back to profiles table (correct but slower); no auth breakage |
| 6 | **Design token contrast audit** | ❌ Not systematically verified post-`ed4fa61` | 21 editor/terminology/admin files now reference CSS custom properties; contrast depends on theme variable values. `RF-READER-02` and §4.1 matrix should validate all 7 reader themes + global light/dark against WCAG AA |

**Git state at time of writing (2026-06-27)**:
- `HEAD` = `f32ad47` (1 commit ahead of `origin/main` which is at `e942fac`)
- Working tree: clean
- Migration 016 file: `supabase/migrations/016_fix_search_kote.sql`
- KANJIDIC2 readings: `lib/furigana/kanjidic2-readings.json` (CC-BY-SA 4.0)
- Integration test: `scripts/test-kanjidic2-integration.ts` (19/19)
- Second-nav LCP spec: `tests/reader-second-nav-lcp.spec.ts` (LCP gate <2000ms, live 1193ms PASS)
