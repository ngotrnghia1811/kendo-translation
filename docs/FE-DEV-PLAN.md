# Frontend Development Plan
**Last updated:** 2026-06-07 (all FE sprint items shipped; plan refreshed)  
**Current HEAD:** `origin/main @ a359424`  
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
| **Admins** | `/admin/*` | User management, Document assignments, Analytics, Batch ops |
| **All authenticated** | `/profile`, `/terminology`, `/search` | Profile page, Terminology browser/editor, Global search |

The core design principle: **humans decide, machines suggest.** Every LLM
output lands as a "suggestion" in the same queue as human proposals; a human
must review and accept it before text changes.

---

## 2. Completed FE work (shipped as of `a359424`)

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
| Reader sidebar (TOC + Search + Filter) | `b535407` | Slide-in drawer; full-text cross-page search; filter by SegmentStatus |
| Progress bar | `ad5f2a0` | Page-indexed 1px bar below toolbar |
| Scroll-to-top button | `ad5f2a0` | Floating, appears at 300px scroll |
| Reading progress memory | `52f20e1` | localStorage per-article; auto-resumes last page on reload |
| Paired PDF view | `ecfc927` | `/api/pdfs/[articleId]` streams from local path; `PdfPageView.tsx` |
| ZH (Traditional Chinese) view | `f03492f` | EN/中文 toggle in toolbar; all 3 sub-views support ZH |
| Keyboard shortcuts | `b535407` | j/k/←/→ nav; b bookmark; / search; ? help overlay |
| Keyboard help modal | `5ba1c63` | `ReaderKeyboardHelpModal.tsx`; ? key; toolbar button |
| Publish-policy gate | `90a23a8` | Admin-configurable `any_translated`/`qa_approved` per-doc filter |
| Mobile UX | `6392785` | Responsive grid; bottom-sheet panels; full-screen sidebar; hamburger nav |

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
| Context Builder in SegmentRow | `479df32` | MAC-RAG button toggles inline panel below toolbar |
| Tabbed segment-details drawer | `3879cd6` | History / Suggestions / Context Builder / Comments tabs |
| ZH target_lang support in editor | `26cbd86` | [EN][ZH] pill switcher; amber ZH-draft badge |
| Admin batch phase-advance | `a359424` | Multi-select + sticky bulk toolbar; `POST /api/documents/[id]/batch-advance` |

### 2.3 Global UX

| Feature | Commit | Notes |
|---|---|---|
| Global SiteNav | `b9439cc` | Sticky nav; brand ⚔️, Documents, Terminology, Admin, Search, Avatar |
| Profile page | `aa7961c` | Stats, assigned docs, reading history, inline username edit |
| Profile API | `aa7961c` | `PATCH /api/profile` (username), `GET /api/profile/stats` |
| Admin analytics dashboard | `efa92c8` | Phase breakdown bar, activity sparkline, top-10 leaderboard |
| Terminology CRUD | `efa92c8` | POST/PATCH/DELETE for admins; modal form; optimistic updates |
| Global search | `848fe3d` | `/search` page; debounced; articles + segments; `/api/search` |
| Admin publish-policy toggle | `90a23a8` | Toggle per doc in admin table; `PATCH /api/documents/[id]/settings` |
| Mobile SiteNav hamburger | `6392785` | Hamburger menu on < sm; closes on route change |

### 2.4 Infrastructure / testing

| Feature | Commit | Notes |
|---|---|---|
| Segment-activity chunked `.in()` | `a7b0932` | `chunkedIn<T>` batches 200 IDs; fixes 500 on book-sized docs |
| Snapshot fallback for >32767px pages | `a7b0932` | try/catch in `snap()`; falls back to viewport clip |
| global-setup parallel logins | `52f20e1` | `Promise.all` logins + fresh-file skip; eliminates rate-limit cascade |
| Reader features test suite | `52f20e1` | `tests/reader-features.spec.ts` — pager, filter tab, progress memory (4 tests) |
| Supabase migration 006 (paired_pdf_path) | `ecfc927` | `articles.paired_pdf_path TEXT` |
| Supabase migration 007 (zh_terminology) | `c08bc34` | `terminology.zh_notes TEXT`; unique(article_id, position, target_lang) |
| Supabase migration 008 (publish_filter) | `90a23a8` | `document_settings.publish_filter TEXT DEFAULT 'any_translated'` |

---

## 3. Active / in-flight work

None. All planned sprint items are shipped and tested.

---

## 4. Potential next items (backlog — not yet committed)

These are ideas surfaced during development but not yet prioritised:

| Item | Priority | Notes |
|---|---|---|
| Segment filtering in editor (URL-param synced) | MEDIUM | `?status=draft&q=kiai` filter bar in TranslationEditor; was partly done at ReaderSidebar level |
| ZH smoke test in Playwright | LOW | Add reader screenshot test using a ZH-segmented article |
| Dark-mode consistency on admin pages | LOW | Admin pages use `dark:` classes inconsistently vs `--rt-*` vars |
| SiteNav suppress on new page types | LOW | Confirm no new routes need suppression |
| Editor phone-block banner | LOW | Redirect to reader view on `< md` screens |
| `ARCHITECTURE.md` §12 debt entry | LOW | Drop stale "reader may not reflect new data model" bullet |
| Playwright: reader settings spec | LOW | Theme switch, font size, color picker (coverage gap) |
| Playwright: bookmarks spec | LOW | Add/jump/remove bookmark test |
| Playwright: PDF view spec | LOW | PDF tab visible when `paired_pdf_path` set |
| Playwright: profile page spec | LOW | Username edit, stats load |
| Batch MAC-RAG suggestions | LOW | Extend batch-ops to request MAC-RAG suggestion for multiple draft segments at once |

---

## 5. Infrastructure / tech-debt items

| Item | Priority | Notes |
|---|---|---|
| Playwright: global-setup rate-limit hardening | DONE ✅ | Parallel logins + fresh-file skip (commit `52f20e1`) |
| ZH view smoke test | LOW | When a ZH doc is imported, add a reader screenshot test for it |
| `ARCHITECTURE.md` §12 debt entry | LOW | Drop the "reader may not reflect new data model" stale bullet |
| SiteNav: suppress on more page types | LOW | Currently suppressed on `/`, `/login`, `/register`, `/documents/[id]/*`; check new routes |
| Dark-mode on admin pages | LOW | Admin pages use Tailwind `dark:` classes inconsistently |

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
- Per-document config: `document_settings` (source_lang, target_lang, paragraph_boundaries, publish_filter).

### CSS theming
Reader-scoped CSS custom properties (`--rt-bg`, `--rt-text`, `--rt-surface`, `--rt-border`, `--rt-text-muted`) are set by `[data-reader-theme="..."]` on the `<main>` element in `ReaderView`. `color: var(--rt-text)` re-evaluated at `[data-reader-font]` scope to allow per-div font-color override. Standard Tailwind `dark:` classes don't apply inside the reader subtree.

### Pagination
`useReaderView` groups segments by `metadata.page` (imported books with page metadata) or by 50-segment fixed chunks (legacy/user-uploaded). Output: `pages: ReaderPage[]`, `currentPageIndex`, `goToPage(i)`, `pageSegments`, `paragraphs`.

### Scroll tracking
`ReaderView` uses `height: 100dvh; overflow: hidden` flex layout with `overflow-y-auto` on the content div. Scroll events must attach to the content div ref, not `window`. Page changes reset scroll to top automatically.

### localStorage keys
| Key | Hook | Contents |
|---|---|---|
| `reader-theme-settings` | `useReaderTheme` | `{ theme, font, fontSize, fontColor }` |
| `reader-bookmarks-<articleId>` | `useReaderBookmarks` | `ReaderBookmark[]` |
| `reader-progress:<articleId>` | `useReaderProgress` | `{ pageIndex, pageLabel, savedAt }` |

### ZH language support
- Segments have `target_lang: 'en' | 'zh'` column.
- Reader fetches EN + ZH segments in parallel; `useReaderView` accepts `zhSegments` and builds a `zhByPosition` map.
- EN/中文 toggle pill in toolbar; `targetLangChoice` state drives all sub-views.
- No space-joiner for ZH (handled by the CJK-aware joiner in `getParagraphText`).

---

## 7. Open design questions

All design questions from the previous plan have been resolved:

| Question | Decision |
|---|---|
| Publish-policy gate (§4.10/4.11) | **Implemented** — `document_settings.publish_filter` with admin toggle in `/admin` |
| Context Builder Panel placement | **Implemented** — inline panel in `SegmentRow` (MAC-RAG button) + drawer tab in edit page |
| Batch operations scope | **Implemented** — admin-only; per-segment assignment checks still enforced individually |
| Segment filtering URL params | **Deferred** — component state sufficient for sidebar filter; URL-param linking is a future backlog item |

---

*This doc should be updated whenever a planned item ships or a new requirement surfaces. It lives alongside `DEV-STATE-*.md` as the forward-looking FE complement to those backward-looking snapshots.*
