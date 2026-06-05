# Frontend Development Plan
**Last updated:** 2026-06-04  
**Current HEAD:** `origin/main @ 429e679`  
**Maintained by:** FE lane (aki-main session)

---

## 1. Platform overview (FE scope)

The frontend is a Next.js 14 (App Router, TypeScript) application serving two
distinct audiences on a **cooperation-first co-translation platform** for
Japanese kendo literature:

| Audience | Routes | Key surfaces |
|---|---|---|
| **Readers** (any role) | `/documents`, `/documents/[id]/read` | Browse list, Reader view (Single / Bilingual / Aligned / PDF modes) |
| **Translators / Admins** | `/documents/[id]/edit` | Translation editor, Segment editor, Phase workflow, MAC-RAG agent panel |
| **Admins** | `/admin/*` | User management, Document assignments |
| **All authenticated** | `/profile`, `/terminology` | Profile page, Terminology browser |

The core design principle: **humans decide, machines suggest.** Every LLM
output lands as a "suggestion" in the same queue as human proposals; a human
must review and accept it before text changes.

---

## 2. Completed FE work (shipped as of `429e679`)

### 2.1 Reader view (`/documents/[id]/read`)

| Feature | Commit | Notes |
|---|---|---|
| Role-gated Edit affordances | `2a14f42` | Editors see Edit button; readers see none |
| Empty-state copy per role | `0885711` | Reader: "not published yet"; editor: "Approve segments" |
| Unified toolbar chrome | `542d35d` | Back-link, title, Edit all in ReaderView toolbar |
| Source/target lang from settings | `cd94d28` | Derived from `document_settings` not useState |
| `lang` BCP-47 attributes | `e22389f` | Applied to sub-views for screen readers |
| Conditional bilingual legend | `f24ff6a` | Hidden when language has no content |
| Aligned mode gated to editors | `53fe339` | PDF/Aligned tabs: translators + admins only |
| Page-based pagination | `780eaab` | Groups segments by `metadata.page`; 50-seg fallback |
| Language-aware paragraph joiner | `780eaab` | `''` for ja/zh/ko, `' '` otherwise |
| Theme / font settings panel | `600a1dc` | 5 CSS themes, font family, px size, color picker |
| Per-article bookmarks | `44db1d7` | localStorage; jump-to; badge count |
| Reader sidebar (TOC + Search) | `ad5f2a0` | Slide-in drawer; full-text cross-page search |
| Progress bar | `ad5f2a0` | Page-indexed 1px bar below toolbar |
| Scroll-to-top button | `ad5f2a0` | Floating, appears at 300px scroll |
| Paired PDF view | `ecfc927` | `/api/pdfs/[articleId]` streams from Google Drive / local; `PdfPageView.tsx` |

### 2.2 Translation editor (`/documents/[id]/edit`)

| Feature | Commit | Notes |
|---|---|---|
| Phase-4b memory write-back (translate) | `293baa3` | `rpc_phase_4b_translate_save` on accept |
| Phase-4b edit save | `01aeb78` | `rpc_phase_4b_edit_save` on edit accept |
| QA-issues API + agent | `b139194` | GET/POST/PATCH `/api/segments/[id]/qa-issues`; advisory QA prompt |
| Phase-3 triage UI | `1082d08` | `EditPatternModal`, `StyleRuleModal` wired into `SuggestionPanel` |
| scope_ref wiring | `09c6a0d` | Article-level style_guide anchoring |
| Phase-4 QA resolution screen | `4df926e` | `QAResolveModal`, `QAIssuesList`, `useQAIssues` hook |
| Post-Production memory banner | `fc35a12` | `MemoryWriteBanner` surfaces Phase-4b write-back outcome |
| Two-stage MAC-RAG hook | `75004fc` | `useMacRagTwoStage`; compose + generate calls |
| L2 article-local context | `74cb7b5` | neighbours, title, terms_already_annotated |
| L3/L4 TM split | `76543d9` | Separated same-article TM from cross-article TM |
| Context Builder Panel | `3b8c168` | `ContextBuilderPanel.tsx` — editable compose stage before LLM call |

### 2.3 Global UX

| Feature | Commit | Notes |
|---|---|---|
| Global SiteNav | `b9439cc` | Sticky nav; brand, Documents, Terminology, Admin, Avatar |
| Profile page | `aa7961c` | Stats, assigned docs, reading history, inline username edit |
| Profile API | `aa7961c` | `PATCH /api/profile` (username), `GET /api/profile/stats` |

---

## 3. Active / in-flight work

None at the time of this writing. All planned items from the last sprint
(Mac-RAG W1–W12 + FE reader series) are shipped.

---

## 4. Planned FE work (priority-ordered)

### 4.1 Reader: keyboard navigation (HIGH)

**Goal:** Power-user keyboard shortcuts so readers can navigate without the mouse.

| Shortcut | Action |
|---|---|
| `←` / `→` | Previous / next page |
| `b` | Toggle bookmark on current page |
| `/` | Open sidebar search tab and focus search input |
| `c` | Open sidebar contents tab |
| `Escape` | Close any open panel (sidebar, settings, bookmarks) |

**Files to touch:** `hooks/useReaderKeyboard.ts` (new), `components/reader/ReaderView.tsx`

**Acceptance:** Shortcuts must not fire when focus is inside an `<input>` or `<textarea>`.

---

### 4.2 Editor: segment filtering (HIGH)

**Goal:** Let editors filter the segment list by status, assignment, or text search.

| Filter | Options |
|---|---|
| Status | All, draft, translated, edited, proofread, qa_approved |
| My segments | My assigned phase only |
| Text search | Source or target text contains query |
| Has open comment | Boolean |

**Files to touch:** `hooks/useSegmentEditor.ts` (add filter state), `components/editor/SegmentToolbar.tsx` (filter bar), `components/editor/TranslationEditor.tsx` (filter application)

**Note:** Filter state should be URL-param-synced (`?status=draft&q=kiai`) so editors can bookmark and share views.

---

### 4.3 Reader: reading progress memory (MEDIUM)

**Goal:** Remember which page a reader was on for each article, and resume there on next visit.

**Design:** localStorage key `reader-progress-<articleId>` stores last `pageIndex`. On load, `useReaderView` reads it and initialises `currentPageIndex` from it instead of 0.

**Files to touch:** `hooks/useReaderView.ts` (persist + restore), no new components.

---

### 4.4 Admin: analytics / progress dashboard (MEDIUM)

**Goal:** Admin landing page at `/admin` showing real-time translation health.

**Panels to include:**

| Panel | Data source |
|---|---|
| Documents progress | % of segments at each phase per article |
| Active contributors | # edits per user in last 7 days |
| Phase velocity | Avg segments/day advancing by phase |
| Open QA issues | Count by severity |
| Terminology growth | Terms added over time |

**Files to touch:** `app/admin/page.tsx` (new dashboard), `app/api/admin/stats/route.ts` (new aggregate endpoint)

**DB queries:** `segment_phase_transitions` (grouped by phase + day), `qa_issues` (open count), `terminology` (growth).

---

### 4.5 Editor: batch operations (MEDIUM)

**Goal:** Let editors select multiple segments and apply an operation in bulk.

| Operation | Description |
|---|---|
| Request MAC-RAG suggestion | Batch-generate suggestions for selected draft segments |
| Advance phase | Move selected `translated` segments to `edited` (if authorized) |
| Add comment | Post a comment to multiple segments at once |

**Files to touch:** `components/editor/TranslationEditor.tsx` (selection state), new `app/api/documents/[id]/batch/route.ts`

---

### 4.6 Terminology browser: inline editing (MEDIUM)

**Goal:** The `/terminology` page currently shows terms read-only. Add inline editing for admins.

| Feature | Notes |
|---|---|
| Inline edit term / translation | `contenteditable` or a small modal |
| Add new term | Form at bottom of table |
| Delete term | With confirmation |
| Tag filtering | Filter by `tags` array |

**Files to touch:** `app/terminology/page.tsx`, new `app/api/terminology/[id]/route.ts`

---

### 4.7 Reader: ZH (Chinese) single-language view (LOW)

**Goal:** When source language is Chinese (`zh`), ensure the `SingleLanguageView` renders correctly with correct `lang="zh"` attributes and no space-joiner (already handled by the language-aware joiner).

**Deferred** — no Chinese documents in the corpus yet.

---

### 4.8 Test coverage for new features (MEDIUM)

**Goal:** Playwright tests covering the FE features added in the last two sprints.

| Test file | Coverage target |
|---|---|
| `tests/reader-settings.spec.ts` | Theme switch, font family, font size, color picker |
| `tests/reader-sidebar.spec.ts` | Open sidebar, TOC navigation, search results, jump-to |
| `tests/reader-bookmarks.spec.ts` | Add bookmark, badge count, jump, remove |
| `tests/reader-pdf.spec.ts` | PDF tab visible when `paired_pdf_path` set; iframe src correct |
| `tests/profile.spec.ts` | Username edit, stats load, assigned docs list |

---

### 4.9 Context Builder Panel: full page-level integration (LOW)

**Goal:** The `ContextBuilderPanel.tsx` component exists but is not yet exposed
on any page. It needs to be integrated into the editor flow — e.g., an
"Open Context Builder" button in the `SegmentToolbar` that opens a side panel
where the translator can inspect and edit the composed Stage-1 prompt before
triggering the LLM.

**Files to touch:** `components/editor/SegmentToolbar.tsx`, `components/editor/TranslationEditor.tsx`, possibly `app/documents/[id]/edit/page.tsx`

---

### 4.10 Publish-policy gate for reader (LOW / DEFERRED)

**Goal:** The reader currently shows any segment with `target_text` populated,
regardless of status. The doc-set claims `qa_approved` is the terminal
publishable state. A per-document `articles.policy.publish_filter` setting
would let admins enforce strict `qa_approved`-only rendering for finished
documents while keeping the permissive default for WIP.

**Design:** `document_settings.publish_filter: 'any_translated' | 'qa_approved'` (default `'any_translated'`).

**Files to touch:** `supabase/migrations/`, `app/documents/[id]/read/page.tsx`, `types/database.ts`

---

## 5. Infrastructure / tech-debt items

| Item | Priority | Notes |
|---|---|---|
| Playwright: global-setup rate-limit hardening | LOW | Login pause already 5s; occasional timeout on 4th login; consider sequential with individual retry |
| ZH view smoke test | LOW | When a ZH doc is imported, add a reader screenshot test for it |
| `ARCHITECTURE.md` §12 debt entry | LOW | Drop the "reader may not reflect new data model" stale bullet |
| SiteNav: suppress on more page types | LOW | Currently suppressed on `/`, `/login`, `/register`, `/documents/[id]/*`; check if any new routes need suppression |
| Dark-mode on admin pages | LOW | Admin pages use Tailwind `dark:` classes inconsistently; `SiteNav` + `profile` use `--rt-*` vars only in reader context |

---

## 6. Architecture notes (FE conventions)

### Auth pattern
```ts
const supabase = await createClient()      // user-scoped (RLS enforced)
const supabase = createAdminClient()       // service-role (bypass RLS, profile lookups)
const user = (await supabase.auth.getUser()).data.user
```

### DB table names
- Documents are stored in `articles` (not `documents`) — confirmed in `FE-READER-AUDIT-2026-05-25.md` §3.5.
- Per-document config: `document_settings` (source_lang, target_lang, paragraph_boundaries).

### CSS theming
Reader-scoped CSS custom properties (`--rt-bg`, `--rt-text`, `--rt-surface`, `--rt-border`, `--rt-text-muted`) are set by `[data-reader-theme="..."]` on the `<main>` element. These must be used inside `ReaderView`'s subtree; standard Tailwind `dark:` classes don't apply there.

### Pagination
`useReaderView` groups segments by `metadata.page` (imported books with page metadata) or by 50-segment fixed chunks (legacy/user-uploaded). Output: `pages: ReaderPage[]`, `currentPageIndex`, `goToPage(i)`, `pageSegments`, `paragraphs`.

### Scroll tracking
`ReaderView` uses `height: 100dvh; overflow: hidden` flex layout with `overflow-y-auto` on the content div. Scroll events must attach to the content div ref, not `window`. Page changes reset scroll to top automatically.

### localStorage keys
| Key | Hook | Contents |
|---|---|---|
| `reader-theme-settings` | `useReaderTheme` | `{ theme, font, fontSize, fontColor }` |
| `reader-bookmarks-<articleId>` | `useReaderBookmarks` | `ReaderBookmark[]` |

---

## 7. Open design questions

1. **Publish-policy gate** (§4.10): should admin be able to set `qa_approved`-only rendering per document? Decision needed before implementing.
2. **Context Builder Panel placement** (§4.9): where exactly in the editor flow does the panel open? Inline drawer? Separate page? Toolbar button?
3. **Batch operations scope** (§4.5): should phase-advance batch operation bypass per-segment assignment checks? Or strictly enforce them?
4. **Segment filtering URL params** (§4.2): does linking to a filtered view require a URL-param approach, or is component state sufficient?

---

*This doc should be updated whenever a planned item ships or a new requirement surfaces. It lives alongside `DEV-STATE-*.md` as the forward-looking FE complement to those backward-looking snapshots.*
