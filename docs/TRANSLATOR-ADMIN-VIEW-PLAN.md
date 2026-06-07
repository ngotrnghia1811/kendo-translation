# Translator View & Admin View — Full Plan
**Written:** 2026-06-07  
**Author:** FE lane (aki-main session)  
**HEAD at writing:** `origin/main @ 8498a4e`

---

## Overview

This document is the complete forward-looking plan for the two non-reader surfaces:

1. **Translator View** — the segment editor at `/documents/[id]/edit` used by translators and editors.
2. **Admin View** — the dashboard at `/admin` (+ sub-pages) used by admins for governance, analytics, and assignment management.

Each section starts with an audit of what currently exists, then details the planned improvements in priority order.

---

## Part 1 — Translator View

### 1.1 Current State (as of `8498a4e`)

**Route:** `app/documents/[id]/edit/page.tsx` (654 lines, single monolithic client component)

**What works today:**
| Feature | Notes |
|---|---|
| Segment list | Scrollable left column; PhaseBadge per segment; activity badges (✎ comments ⇺ transitions) |
| Realtime segment updates | Supabase Realtime channel `segments:${id}:${targetLang}` |
| Segment locking | POST/DELETE `/api/segments/[id]/lock` on select/deselect |
| Translation editing | Right column textarea; Save button; Approve (direct `qa_approved`) button |
| AI translate (legacy MAC-RAG) | `useMacRag` hook — builds context then translates; shows candidate list |
| Tabbed cooperation drawer | History / Suggestions / Context Builder / Comments (toggles with Details ▾ button) |
| Phase advance | `PhaseAdvanceButton` in drawer; reads current status; issues API call |
| Suggestions | `SuggestionPanel` + `QAIssuesList` in Suggestions tab |
| Context Builder | `ContextBuilderPanel` + `AgentSuggestionPanel` in Context tab |
| Comments | `CommentThread` in Comments tab |
| Batch mode (admin-only) | Multi-select checkboxes; floating toolbar with → translated/edited/proofread/qa_approved |
| EN/ZH language switcher | Pill tabs in header; filters segments + realtime by target_lang |
| Progress bar | Thin blue bar below header (translated/total) |

**Known gaps / UX debt:**
1. **No segment filtering** — list always shows all N segments; no way to hide `qa_approved`, show only my work, or search source/target text.
2. **No assignment visibility** — translator has no way to see which phases they are assigned to for this document.
3. **No "my phase" focus mode** — translator who is in `edit` phase should see their queue; currently they see all segments.
4. **No segment search** — only full list; can't jump to a specific segment by keyword.
5. **No progress indicator per-segment** — the progress bar is global; segment list has no visual grouping by phase.
6. **Inline Save button** skips the phase workflow — can save directly as `translated` or `qa_approved` without going through the phase sequence; this is intentional for power users but should be gated by assignment.
7. **Drawer is sticky-right but collapses to a Details button** — feels hidden; power users need faster access to suggestions/history.
8. **No keyboard shortcuts in editor** — selecting the next/prev segment, saving, advancing phase all require mouse clicks.
9. **Mobile** — editor is a 2-column layout; shows all features on desktop but unusable on phone (no phone-block banner yet).
10. **Context Builder in SegmentRow** — `SegmentRow.tsx` has an inline MAC-RAG panel, but `TranslationEditor.tsx` / `EditPage` do not use `SegmentRow` — it's orphaned. The editor uses its own inline JSX instead.

---

### 1.2 Planned Improvements (priority-ordered)

#### T1 — Segment filtering bar (HIGH priority)

**Goal:** Filter the visible segment list without navigating away.

**Design:**
```
[ All | Draft | Translated | Edited | Proofread | QA Approved ]   [🔍 Search source/target]
```

- Status filter: toggleable pill buttons; "All" resets others. Multiple statuses can be active simultaneously.
- Text search: debounced 300ms input; matches `source_text` OR `target_text` case-insensitively.
- "My phase" toggle (shown when user has assignment): one click to show only segments at their assigned phase(s).
- URL params: `?status=draft,translated&q=kiai` — enables bookmarking and sharing filtered views.
- Badge/count: each filter pill shows the count of segments at that status.

**Files:**
- `app/documents/[id]/edit/page.tsx`: add `filterStatuses`, `filterQuery`, `showMyPhase` state; computed `filteredSegments` memo; URL sync via `useSearchParams` + `useRouter`.
- NEW `components/editor/SegmentFilterBar.tsx`: the pill + search row component; reusable.
- `app/api/documents/[id]/assignments/route.ts` (GET): already exists — fetch user's `allowed_phases` on mount to power "My phase" toggle.

**Acceptance:** Filter state persists in URL; re-navigation back to editor restores filter; segment count updates as status changes occur via realtime.

---

#### T2 — Assignment visibility + my-phase indicator (HIGH priority)

**Goal:** Translator should immediately see their role for this document.

**Design:**
- Small "My assignments" strip below the header, only visible when the user has at least one `document_assignment` row for this document.
- Shows which phases they are allowed to work on, e.g. `You are assigned: translate, edit`.
- "My phase" button in the filter bar becomes available (hides segments outside their phases).
- Segments **outside** their phase(s) are shown at 50% opacity when "My phase" mode is on but not hidden (they stay visible for context, just de-emphasised).

**Files:**
- `app/documents/[id]/edit/page.tsx`: fetch `/api/documents/[id]/assignments` on mount, filter for current user's `user_id`; `userPhases` state.
- `components/editor/AssignmentBanner.tsx` (NEW): compact strip showing phase tags + dismiss.

---

#### T3 — Keyboard shortcuts in editor (MEDIUM priority)

**Goal:** Power translators can work keyboard-only.

| Shortcut | Action |
|---|---|
| `↑` / `↓` | Select prev / next segment |
| `Ctrl+Enter` | Save current edit as `translated` |
| `Ctrl+Shift+Enter` | Advance to next phase |
| `Ctrl+D` | Open/close Details drawer |
| `Ctrl+/` | Focus segment search input |
| `Escape` | Deselect current segment |

**Files:**
- NEW `hooks/useEditorKeyboard.ts`: `useEffect` on `keydown`; suppress in `<textarea>` (except the Ctrl combos).
- `app/documents/[id]/edit/page.tsx`: wire hook; pass `prevDisabled`, `nextDisabled`, callbacks.

**Note:** The reader's `useReaderKeyboard.ts` is a good model to follow.

---

#### T4 — Refactor: extract editor into component tree (MEDIUM priority)

**Goal:** The 654-line `EditPage` monolith should be split into a maintainable component tree.

**Proposed decomposition:**
```
EditPage (page.tsx) — data fetching, state orchestration
├── EditorHeader — breadcrumb, EN/ZH switcher, stats, progress bar
├── SegmentFilterBar — status pills + search
├── SegmentList — mapped segments + batch controls
│   └── SegmentListItem — single segment row (source/target preview + badges)
├── SegmentEditorPanel — the right-column editing pane (sticky)
│   ├── SourcePane — source text display
│   ├── TargetTextArea — textarea + save/approve buttons
│   ├── MacRagCandidates — AI suggestions list (legacy useMacRag)
│   └── CooperationDrawer — Details toggle + tabbed drawer
│       ├── HistoryTab → PhaseTransitionHistory
│       ├── SuggestionsTab → SuggestionPanel + QAIssuesList
│       ├── ContextTab → ContextBuilderPanel + AgentSuggestionPanel
│       └── CommentsTab → CommentThread
└── BatchToolbar — sticky footer shown in batch mode
```

This refactor is **code-quality work** with no user-visible change. It should be done in a single PR with no behaviour changes and should keep tsc EXIT=0 throughout.

**Files:** Existing `components/editor/SegmentRow.tsx` and `TranslationEditor.tsx` are partially overlapping orphaned components — they should either be wired up to replace the inline JSX in `EditPage`, or removed. The refactor is the right time to decide.

---

#### T5 — Segment editor: progress memory (LOW priority)

**Goal:** Remember which segment was active when the translator leaves the page, and restore it on next visit.

**Design:** localStorage key `editor-segment-<articleId>` stores last `activeSegment` id. On load, automatically select and scroll to that segment.

**Files:**
- `app/documents/[id]/edit/page.tsx`: read on mount, write on `selectSegment()` call.

---

#### T6 — Phone-block banner (LOW priority)

**Goal:** Display a user-friendly "editor not available on mobile" message for phone users with a link to the reader.

**Design:**
```
"The editor is designed for desktop. On small screens, use the reader view."
[Open reader →]
```

Detect `window.innerWidth < 768` on mount; if true, render the banner instead of the full editor (but still render the shell header so breadcrumb is visible). Do NOT show the editor UI below the banner.

**Files:**
- `app/documents/[id]/edit/page.tsx`: `isMobile` state via `window.matchMedia('(max-width: 767px)')`.

---

### 1.3 Translator View Acceptance Criteria (full-feature)

A fully-realised translator view should satisfy:

- [ ] Segment list is filterable by status, text, and my-phase
- [ ] Assignment visibility: translator sees their roles at a glance
- [ ] Keyboard shortcuts for navigation and save
- [ ] No orphaned editor components (SegmentRow / TranslationEditor either wired or removed)
- [ ] Mobile: phone-block banner with reader link
- [ ] URL-param filters enable bookmarkable segment queues

---

## Part 2 — Admin View

### 2.1 Current State (as of `8498a4e`)

**Routes:**
| Route | File | What it does |
|---|---|---|
| `/admin` | `app/admin/page.tsx` (412 lines) | Dashboard: 4 stat cards, analytics row, docs table, users table |
| `/admin/documents/[id]/assignments` | `app/admin/documents/[id]/assignments/page.tsx` | Per-document phase assignment (uses `AssignmentTable` component) |
| `/admin/users/[userId]/assignments` | `app/admin/users/[userId]/assignments/page.tsx` | Per-user assignment matrix (inline edit, PATCH/DELETE) |

**What works today:**
| Feature | Notes |
|---|---|
| 4 stat cards | Documents, Segmented, Users, Total Segments |
| Segment status breakdown | Horizontal phase bars with percentages |
| Activity sparkline | Daily phase transitions for 30 days |
| Top 10 editors | Leaderboard with coloured avatars, 90-day window |
| Documents table | Title, ID, Progress %, Publish Policy toggle, Assignments link |
| Users table | Username, ID, Role badge, Assignments link |
| Publish Policy toggle | `🔒 QA only` / `📄 Any translated` per document; PATCH `/api/documents/[id]/settings` |
| Per-document assignments | `AssignmentTable` component; add/remove user-phase grants |
| Per-user assignments | Inline edit of allowed_phases; PATCH/DELETE per assignment row |

**Known gaps / UX debt:**
1. **No role management** — admin can't change a user's `role` from the UI (e.g. promote a reader to translator, or create new admin accounts).
2. **No document-level progress detail** — the doc table shows an aggregate %; no drill-down to per-phase counts.
3. **Analytics is global-only** — no per-document breakdown of phase velocity; no way to see how specific books are progressing.
4. **No QA issues summary** — open QA issue count not surfaced; admin can't see which documents have unresolved issues.
5. **No terminology per-document** — the `/terminology` page is global; no filtering by document/topic.
6. **Docs table is capped at 25** — pagination not implemented; all 26+ books can't be seen at once.
7. **Users table shows no last-activity** — no timestamp of last edit or login.
8. **No audit trail access** — phase transition history and comment history not navigable from admin.
9. **No notification / alert system** — no way to surface "Segment X has been stuck in `draft` for 14 days."
10. **Admin dashboard not responsive on mobile** — stat cards and tables overflow on narrow screens.

---

### 2.2 Planned Improvements (priority-ordered)

#### A1 — Role management for users (HIGH priority)

**Goal:** Admin can promote/demote users between `reader`, `translator`, `admin` roles from the users table.

**Design:**
- Add a **Role** column action button to each user row in `/admin`: current role badge is clickable; opens an inline popover/dropdown with the 3 role options.
- Clicking a new role sends `PATCH /api/admin/users/[userId]/role { role: 'translator' }`.
- Confirmation required before promoting to `admin`.
- The current user's own row is read-only (can't demote yourself).

**New API route:**
- `app/api/admin/users/[userId]/route.ts` — `PATCH { role }` — admin-only; updates `profiles.role`; returns `{ id, username, role }`.

**Files:**
- `app/api/admin/users/[userId]/route.ts` (NEW)
- `app/admin/page.tsx`: users table action column → inline role picker

**Acceptance:** Role change reflected immediately in users table; non-admins can't reach the endpoint (403).

---

#### A2 — Document detail / per-doc analytics (HIGH priority)

**Goal:** Click on a document in the admin table to see a per-document progress breakdown.

**New route:** `/admin/documents/[id]` — a "document detail" page (distinct from the existing assignments sub-page).

**Contents:**
```
/admin/documents/[id]
├── Header: title, source/target lang, segmented status, paired PDF path
├── Progress breakdown: per-phase segment counts (stacked bar + numbers)
├── Assignments: who is assigned, which phases, with management link
├── Recent activity: last 10 phase transitions + actor usernames
├── Open QA issues: count by severity (critical/major/minor)
└── Quick actions: toggle Publish Policy, link to /read, link to /edit
```

**New API route:**
- `app/api/admin/documents/[id]/overview/route.ts` — admin-gated; returns article metadata + `document_settings` + phase breakdown + recent transitions + open QA issue counts.

**Files:**
- `app/api/admin/documents/[id]/overview/route.ts` (NEW)
- `app/admin/documents/[id]/page.tsx` (NEW — currently only has `assignments/` sub-route)

**Updates to existing:**
- `app/admin/page.tsx` docs table: title column becomes a link to `/admin/documents/[id]`.

---

#### A3 — Docs table pagination (MEDIUM priority)

**Goal:** Currently hard-capped at `docs.slice(0, 25)`. All books must be accessible.

**Design:**
- Add `page` state (default 0) and `PAGE_SIZE = 25`.
- Render pagination controls below the docs table: `← Previous | Page N of M | Next →`.
- No server-side pagination needed at current scale (~30 articles); client-side slice is fine.
- OR: replace with a virtualized table if document count grows beyond ~200.

**Files:**
- `app/admin/page.tsx`: `currentPage` state; `docs.slice(...)` → `pagedDocs`; pagination row.

---

#### A4 — QA issues summary widget (MEDIUM priority)

**Goal:** Surface the health of open QA issues at a glance on the admin dashboard.

**Design:**
```
QA Issues
─────────────────────────────────────────
  Critical  Major  Minor  Total
    0        3      12     15
─────────────────────────────────────────
  Top 3 documents with open issues:
  • Kata Full (5 open, 2 critical)
  • Hayashi Full (4 open, 1 major)
  • Baba 2 Clean (2 open, minor)
─────────────────────────────────────────
```

**New API extension:**
- Add `qaIssues` section to `GET /api/admin/analytics`: total open counts by severity + top-5 documents by open issues.

**Files:**
- `app/api/admin/analytics/route.ts`: add QA issues parallel query.
- `app/admin/page.tsx`: new `QAIssuesSummary` widget in analytics row (widen to 4 columns from 3).

---

#### A5 — Users table: last-activity column (MEDIUM priority)

**Goal:** Admin can see when each user last made an edit (not just who they are).

**Design:**
- Add `Last active` column to users table showing `MAX(created_at)` from `segment_revisions WHERE edited_by = user.id`.
- "Never" if no revisions. "3 days ago" relative format.
- Sortable by last-activity.

**API extension:**
- `app/api/admin/users/route.ts` GET: join `MAX(segment_revisions.created_at) GROUP BY profiles.id` as `last_active_at`.

---

#### A6 — Admin dashboard responsive polish (LOW priority)

**Goal:** The admin pages use `dark:` Tailwind classes inconsistently vs. the reader's `--rt-*` system. On mobile the stat cards and tables overflow.

**Design:**
- Stats row: `grid-cols-2` on mobile, `grid-cols-4` on desktop.
- Tables: horizontally scrollable wrapper on mobile (`overflow-x-auto`).
- Analytics row: single-column stacked on mobile, 3-col on desktop.
- No `--rt-*` migration needed (admin uses standard Tailwind theming, which is fine — just needs `dark:` applied consistently).

**Files:**
- `app/admin/page.tsx`: responsive classes on stat grid + analytics grid.
- `app/admin/users/[userId]/assignments/page.tsx`: `overflow-x-auto` on table.
- `app/admin/documents/[id]/assignments/page.tsx`: ditto.

---

#### A7 — Segmentation trigger from admin (LOW priority)

**Goal:** Allow admins to trigger re-segmentation of a document directly from the admin UI, without needing the developer CLI.

**Design:**
- Add a `⚙ Segmentize` button to the document detail page (A2 above) — only visible when `segmented === false` or as a "re-segmentize" option.
- Calls existing `POST /api/documents/[id]/segmentize`.
- Shows a loading spinner while in progress (poll for `segmented` to flip to `true`).

**Files:**
- `app/admin/documents/[id]/page.tsx` (when A2 is implemented).

---

#### A8 — Stale-segment alerting (LOW priority / future)

**Goal:** Surface "stuck" segments to admins — segments that have been in `draft` or `translated` for >14 days with no activity.

**Design:**
- New analytics sub-section: "Stale segments" count + list of top documents.
- A "stale" segment = `status IN ('draft', 'translated') AND updated_at < NOW() - INTERVAL '14 days'`.
- Admin can use batch-advance (A5) to triage them.

**New API route:**
- `app/api/admin/stale-segments/route.ts` — returns `{ document_id, title, stale_count }[]` sorted by count desc.

---

### 2.3 Admin View Acceptance Criteria (full-feature)

A fully-realised admin view should satisfy:

- [ ] Role management: promote/demote users from the UI
- [ ] Per-document detail page with phase breakdown and QA summary
- [ ] QA issues widget on dashboard
- [ ] Docs table paginated (no 25-cap)
- [ ] Users table shows last-activity timestamp
- [ ] Admin pages responsive on tablet (overflow-x-auto on tables, responsive stat grid)
- [ ] Segmentation trigger from document detail page

---

## Part 3 — Implementation Sequence

Recommended implementation order balancing impact vs. effort:

| Priority | Item | Surface | Effort | Impact |
|---|---|---|---|---|
| 1 | T1 Segment filtering bar | Translator | M | HIGH — translators need this daily |
| 2 | T2 Assignment visibility banner | Translator | S | HIGH — orientation for new translators |
| 3 | A1 Role management | Admin | S | HIGH — currently requires DB access |
| 4 | A2 Per-document detail page | Admin | L | HIGH — replaces ad-hoc analytics queries |
| 5 | T3 Editor keyboard shortcuts | Translator | M | MEDIUM — power-user quality-of-life |
| 6 | A4 QA issues widget | Admin | M | MEDIUM — surfaces translation health |
| 7 | A3 Docs table pagination | Admin | S | MEDIUM — 26+ docs need to be visible |
| 8 | A5 Users last-activity | Admin | S | LOW — useful but not critical |
| 9 | T4 Editor refactor | Translator | L | LOW — code quality; no user-visible change |
| 10 | A6 Admin responsive polish | Admin | S | LOW — desktop-first usage |
| 11 | T5 Segment progress memory | Translator | S | LOW — nice-to-have |
| 12 | T6 Phone-block banner | Translator | S | LOW — guard rails |
| 13 | A7 Segmentation trigger | Admin | M | LOW — dev convenience |
| 14 | A8 Stale-segment alerting | Admin | L | LOW — future analytics |

Effort: S = <1h, M = 1-3h, L = 3-8h

---

## Part 4 — API Surface Summary

### Existing APIs relevant to these plans

| Endpoint | Method | Used by |
|---|---|---|
| `GET /api/documents/[id]/assignments` | GET | T2 (user's phases for this doc) |
| `GET /api/admin/users` | GET | Admin users table |
| `GET /api/admin/analytics` | GET | Analytics widgets |
| `PATCH /api/documents/[id]/settings` | PATCH | Publish policy toggle |
| `POST /api/documents/[id]/batch-advance` | POST | Batch phase-advance |
| `GET /api/admin/users/[userId]/assignments` | GET | Per-user assignment page |
| `PATCH /api/documents/[id]/assignments/[userId]` | PATCH | Edit allowed_phases |
| `DELETE /api/documents/[id]/assignments/[userId]` | DELETE | Remove assignment |
| `GET /api/segments/[id]/qa-issues` | GET | QA issues per segment |

### New APIs needed

| Endpoint | Method | Used by |
|---|---|---|
| `PATCH /api/admin/users/[userId]` | PATCH | A1 role management |
| `GET /api/admin/documents/[id]/overview` | GET | A2 per-doc detail |
| `GET /api/admin/stale-segments` | GET | A8 stale alerting |

---

## Part 5 — Architecture Decisions

### Translator view: state management
The current `EditPage` mixes data-fetching, filter, UI, and realtime all in one component. The refactor (T4) should extract a clean `useEditorState` hook that owns:
- `segments`, `filteredSegments`, `activeSegment`, `editingText`
- `activity` map, `userPhases`, `batchMode` / `selectedIds`
- All mutation handlers (`saveSegment`, `handleBatchAdvance`, `selectSegment`, etc.)

This leaves `EditPage` as a thin shell that passes props down.

### Admin view: server components vs client
The `/admin` pages currently use client-side fetching (`useEffect` + `fetch`). For the new per-document detail page (A2), consider using **Next.js server components** to pre-fetch the overview data server-side — this eliminates loading spinners and improves initial paint. Pattern:
```ts
// app/admin/documents/[id]/page.tsx
export default async function AdminDocPage({ params }) {
  const supabase = createAdminClient()
  const overview = await fetchDocumentOverview(supabase, params.id)
  return <DocDetailClient overview={overview} />
}
```

### Filter URL params
For T1 (segment filtering), use `useSearchParams` + `useRouter.replace()` (not `push`) so that filter changes don't pollute browser history. Format:
```
/documents/{id}/edit?status=draft,translated&q=kiai&myPhase=1
```

---

*This plan supersedes the §4.2 entry in FE-DEV-PLAN.md for the translator view, and the §4.4 entry for admin analytics. The broader FE-DEV-PLAN.md §4 backlog remains the canonical index.*
