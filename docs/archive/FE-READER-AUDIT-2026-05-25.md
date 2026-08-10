# FE Reader Audit — 2026-05-25

> **Status.** Read-only audit. No FE code touched; no source-of-truth
> doc rewritten. Findings are diagnostic only; follow-up edits to
> VISION/ARCHITECTURE/MAC-RAG land in their own work units.
>
> **Subject.** The seven commits on `agent/frontend-reader` between
> `fea64b1` (state at last session pause) and `53fe339` (current HEAD
> of the sibling worktree at `../kendo-translation-frontend`):
>
> | # | Commit    | Date       | Title (subject) |
> |---|-----------|------------|-----------------|
> | 1 | `2a14f42` | 2026-05-22 | feat(reader): role-gate Edit affordances on public read page (R6) |
> | 2 | `0885711` | 2026-05-22 | feat(reader): reader-appropriate empty-state copy on public read page (M) |
> | 3 | `542d35d` | 2026-05-22 | refactor(reader): unify header chrome inside ReaderView toolbar (G) |
> | 4 | `cd94d28` | 2026-05-23 | fix(reader): derive sourceLang/targetLang from settings instead of useState (AUDIT 1.4 + 1.5) |
> | 5 | `e22389f` | 2026-05-23 | a11y(reader): add lang attributes to reader sub-views (AUDIT 2.3 + 3.4 + 4.3) |
> | 6 | `f24ff6a` | 2026-05-23 | fix(reader): conditionally render bilingual color legend (AUDIT 3.1) |
> | 7 | `53fe339` | 2026-05-24 | feat(reader): role-gate Aligned mode tab to editors (AUDIT 4.1) |
>
> **Source materials read.**
> - FE: `app/documents/[id]/read/page.tsx` (110 L, post-commit-3),
>   `components/reader/ReaderView.tsx` (134 L, post-commit-7).
> - Docs: `docs/VISION.md`, `docs/ARCHITECTURE.md` (esp. §6, §12),
>   `docs/MAC-RAG.md` (§3.5, §6), `docs/MAC-RAG-EXAMPLES.md` (Step
>   markers referencing `qa_approved`), `docs/DEV-STATE-2026-05-20.md`,
>   `docs/MEMORY-DB-DESIGN.md` (§5 RLS roles).

---

## 1. Scoring rubric

For each commit we classify against the doc set on three axes:

- **Alignment** — does the FE behaviour match an existing doc-set
  claim or invariant?  `confirms / extends / contradicts / orthogonal`.
- **Closure** — does the FE change close an explicit doc-set gap
  (`[GAP]` marker, known-debt entry, or open question)?
- **Doc gap** — does the FE introduce a new surface that the doc set
  should mention but does not yet?

---

## 2. Per-commit findings

### 2.1 `2a14f42` — role-gate Edit affordances (R6)

**FE behaviour.** Look up `profiles.role` for the authenticated viewer
via `createAdminClient`; compute `canEdit = role ∈ {translator, admin}`;
gate the header `Edit` button and the empty-state `Open Editor` link
on `canEdit`. Default `canEdit = false` for unauthenticated users and on
any profile lookup failure.

- **Alignment: confirms.** `VISION.md` line 46 enumerates "translator,
  editor, proofreader, or LLM agent" as suggestion-capable identities,
  with readers as a passive consumer. `MEMORY-DB-DESIGN.md` §5 line 623
  takes the canonical roles vocabulary as `{admin, translator,
  reader}`. The FE check `role ∈ {translator, admin}` reads the same
  table column (`profiles.role`) and applies the same split (reader on
  one side; translator + admin on the other) that the memory-DB RLS
  matrix assumes. The `editor` and `proofreader` workflow capabilities
  are *per-document* via `document_assignments.allowed_phases`, not
  *global roles* — so collapsing them under `translator` for the
  read-page Edit affordance is consistent with our role-model.
- **Closure.** Resolves `ARCHITECTURE.md` line 425–427:
  > `app/documents/[id]/read/page.tsx` and `components/reader/*` were
  > not touched in the cooperation-first reframe and may not reflect
  > the new data model in every place.
  This is the first commit in the series that *does* touch the read
  page in the cooperation-first reframe. The role-gating now reflects
  the doc-set's global-role split.
- **Doc gap.** ARCHITECTURE §12 should drop the "may not reflect the
  new data model" caveat for the read-page after the full series lands.

### 2.2 `0885711` — empty-state copy (M)

**FE behaviour.** Branch the empty-state copy on `canEdit`. Editor
viewers see the existing actionable copy ("Approve segments in the
editor to see them here." + "Open Editor →"). Public readers see
"No translations available yet / This document hasn't been published
for reading yet. Check back later."

- **Alignment: extends.** No doc-set passage prescribed empty-state
  copy. The new behaviour is consistent with `MAC-RAG.md` §3.5's
  framing of `qa_approved` as the terminal "publishable" state
  (`MAC-RAG.md` line 276, `ARCHITECTURE.md` line 186). The reader copy
  "hasn't been published for reading yet" is the natural surface
  language for the doc-set's `qa_approved`-terminal claim.
- **Closure.** None directly; complements R6 (#2.1).
- **Doc gap.** Mild: the doc set uses `qa_approved` everywhere it
  means "publishable". The FE chose the user-facing word "published".
  If we ever write a user-facing glossary, the mapping `qa_approved ↔
  published` should be entered there. Not blocking.

### 2.3 `542d35d` — unify header chrome inside ReaderView (G)

**FE behaviour.** Move back-link, title, and Edit affordance from the
page-level `<header>` into ReaderView's existing sticky toolbar. Empty
state keeps the page-level header (because `ReaderView` is not
rendered then). New props `articleId`, `canEdit` on `ReaderView`.

- **Alignment: orthogonal.** Pure presentational refactor; no
  doc-set claim either way.
- **Closure.** None.
- **Doc gap.** None.

### 2.4 `cd94d28` — derive sourceLang/targetLang from settings (AUDIT 1.4 + 1.5)

**FE behaviour.** Stop using `useState` for `sourceLang` /
`targetLang`; derive them from the `settings` prop on every render.

- **Alignment: confirms.** `ARCHITECTURE.md` line 56 documents
  `document_settings` as the canonical store for per-document
  configuration. The previous `useState` initialisation could drift
  from settings on remount; deriving on each render upholds the
  "single source of truth" invariant.
- **Closure.** None — internal-quality fix.
- **Doc gap.** None.

### 2.5 `e22389f` — `lang` attributes on reader sub-views (AUDIT 2.3 + 3.4 + 4.3)

**FE behaviour.** Add `lang` (BCP-47) attributes:

- `SingleLanguageView`: on `<article>`, derived from `displayLang`.
  Adds `sourceLang`/`targetLang` props (ReaderView call site
  updated).
- `BilingualParagraphView`: on source and target block `<div>`s.
- `TranslatorAlignedView`: on source and target `<td>`s.

- **Alignment: confirms.** `segments.metadata` and the per-article
  language pair (`articles.title_ja` / `content_ja` / `content_en`)
  imply the language pair lives on the document; the FE now propagates
  that information into the rendered DOM. Block-level `lang` is the
  right granularity given segment-level boundaries.
- **Closure.** None.
- **Doc gap.** Mildly interesting forward question: **QA-advisory's
  terminology and style checks could read `lang` from segment metadata
  rather than guessing from text content.** `MAC-RAG-EXAMPLES.md` does
  not currently mention `lang` as a Phase-1 retrieval signal — it is
  implicit in "ja → en" being the only direction the agent runs. If we
  ever expand beyond a single source/target pair, the agent's input
  must include `lang` explicitly. Recorded as a minor forward
  reference for W11/W12; not actionable now.

### 2.6 `f24ff6a` — conditional bilingual color legend (AUDIT 3.1)

**FE behaviour.** Compute `hasAnySource` / `hasAnyTarget` from
paragraphs; omit per-language legend entries (and the whole legend
container) when their language has no content.

- **Alignment: extends.** `MAC-RAG-EXAMPLES.md` repeatedly notes
  segments at `status = draft` may have empty `target_text` (W3
  finding: 73 draft / 16 translated). The reader-side filter at
  `read/page.tsx` line 54–56 already restricts to `qa_approved OR
  target_text` populated. The legend fix is the symmetric UI guard:
  even when filtered, a document may render with mixed populated /
  empty per-language rows, and the legend should match.
- **Closure.** None.
- **Doc gap.** None.

### 2.7 `53fe339` — role-gate Aligned mode tab to editors (AUDIT 4.1)

**FE behaviour.** Hide the `TranslatorAlignedView` tab for public
readers (only `Single` + `Bilingual` visible). Editors retain all
three. Commit body explains: Aligned mode is a per-segment
translation-checking view with no equivalent in the publishable
pipeline; for public readers, the 'Not translated' placeholders look
like a broken page; for translators/admins they are informationally
valuable.

- **Alignment: confirms.** The framing in the commit body —
  "single-language, side-by-side bilingual" as the two publishable
  view modes; aligned-by-sentence as a translator-only working view —
  is a clean restatement of the doc-set's split between editor-side
  cooperation surfaces and reader-side consumption surfaces
  (`MAC-RAG.md` §3.5; `VISION.md` line 46).
- **Closure.** Partial closure of ARCHITECTURE §12 line 425–427: the
  reader-mode now does reflect the cooperation-first split.
- **Doc gap.** `ARCHITECTURE.md` §10 enumerates reader sub-components
  (`components/reader/*`) but does not say which are
  reader-vs-translator. A one-line annotation listing
  `TranslatorAlignedView` as editor-gated would close the gap.

---

## 3. Aggregate findings

### 3.1 What the series achieves for the doc set

The seven commits land a **read-page cooperation-aware rendering**
that was explicitly flagged as missing debt at `ARCHITECTURE.md` §12
line 425–427. The split they implement — public readers see only
`qa_approved`-or-translated segments in the two publishable view modes
(Single, Bilingual), editors additionally see the Aligned working view
plus Edit affordances — is the read-side mirror of the cooperation-
first invariants we already documented for the write side.

**Net effect on doc set:**

- `ARCHITECTURE.md` §12 can drop bullet 1 (or downgrade to "remaining
  cleanup: ...") in a future docs sweep.
- Roles vocabulary (`{admin, translator, reader}`) is now confirmed
  consistent across `MEMORY-DB-DESIGN.md` §5, `VISION.md` line 46, and
  the live FE code path. No drift.
- `qa_approved` semantics ("terminal", "publishable") are confirmed in
  the read-page filter at `read/page.tsx` line 54–56:
  `s.status === 'qa_approved' || s.target_text`.
  The OR-clause is more permissive than the doc set strictly implies —
  see §3.2 below.

### 3.2 One material drift to record

**The read-page exposes `target_text`-populated segments at any
`status`, not only `qa_approved`.**

Doc-set claim (`MAC-RAG.md` line 276; `MAC-RAG-EXAMPLES.md` line
3514–3518): `qa_approved` is the *terminal* publishable state.

FE behaviour (`read/page.tsx` line 54–56):
```js
const readableSegments = (segments || []).filter(
  (s) => s.status === 'qa_approved' || s.target_text
);
```

This means any segment with a populated `target_text` — including
`status ∈ {translated, edited, proofread}` — is shown to public
readers. The page-level comment (lines 36–40) acknowledges this as a
deliberate choice ("If we want a configurable status filter later, it
should live in `document_settings`.").

**Interpretation:** the doc set's claim is **stricter than the live
FE**. The FE chose a "show whatever has a translation" policy as a
pragmatic default for an early-stage corpus with very few
`qa_approved` rows (`DEV-STATE-2026-05-20.md` line 197: "proofread 0,
qa_approved 0"). The doc set should either:

- (a) Soften the claim: "publishable segments are typically
  `qa_approved`, but the read view is permissive of any segment with
  `target_text` until per-document publish-policy is wired"; or
- (b) Tighten the FE: require `qa_approved` strictly, gated by a
  per-document `articles.policy.publish_filter` (proposed in
  `MEMORY-DB-DESIGN.md` §3.6 `articles.policy jsonb`).

This is **not** in scope for the audit; recording as forward work for
W11 (cross-task consistency sweep) or a code-side follow-up.

### 3.3 Doc-set gaps the series surfaces

| # | Gap                                                                  | Doc to touch         | Suggested closure |
|---|----------------------------------------------------------------------|----------------------|-------------------|
| 1 | "Reader page may not reflect new data model" debt entry is now stale | `ARCHITECTURE.md` §12 line 425–427 | Drop bullet 1 or rewrite as "minor copy/glossary work remaining" |
| 2 | Reader-vs-translator split of `components/reader/*` undocumented     | `ARCHITECTURE.md` §10 line 316     | One-line per sub-component: `TranslatorAlignedView` = editor-only |
| 3 | `qa_approved ↔ "published"` user-facing wording mapping unrecorded   | `MAC-RAG-EXAMPLES.md` or a future user-glossary | Add to W11 wording-consistency sweep |
| 4 | Read-page filter is permissive (`qa_approved OR target_text`); doc claims strictly `qa_approved` | `MAC-RAG.md` §3.5 or `MAC-RAG-EXAMPLES.md` Glossary | See §3.2; pick (a) or (b) |
| 5 | `lang` (BCP-47) as a Phase-1 retrieval/QA signal is undocumented; today implicit in single ja→en pair | `MAC-RAG.md` §6 forward refs | Note only; not actionable until language pair becomes a variable |

### 3.4 No contradictions

No commit in the series **contradicts** a doc-set invariant. The
single drift (§3.2) is a permissive widening of the doc-set claim, not
a violation: the FE is showing a *strict superset* of what the doc set
declares publishable.

### 3.5 Pre-existing FE conventions confirmed

These were already implicit in the code-base; the new commits hold
them stable:

- `await createClient()` for the user-scoped Supabase client;
  `createAdminClient()` for the privileged profile lookup. Mirrors
  `/api/auth/me/route.ts` (commit body of `2a14f42` cites this).
- `(await supabase.auth.getUser()).data.user` shape — unchanged.
- `document_settings` as the source of truth for per-document UI
  state (`cd94d28`).
- `articles` (not `documents`) as the table name — confirmed in
  `read/page.tsx` line 10–14 (`supabase.from('articles')`). Doc-set
  schema correction B.1 (recorded in `MAC-RAG-EXAMPLES-TODO-PLAN.md`
  L785) holds.

---

## 4. Recommended follow-up work units

Listed for future routing; **not** executed by this audit.

- **W-FE-DOC-1** (5–10 min, docs-only). Edit `ARCHITECTURE.md`:
  rewrite §12 bullet 1; add a one-line reader-vs-editor annotation in
  §10's `components/reader/*` tree (gap #1 + #2 in §3.3).
- **W-FE-DOC-2** (in W11 sweep). Add `qa_approved ↔ "published"`
  wording note (gap #3).
- **W-FE-POLICY** (design + code; deferred). Decide (a) vs (b) for the
  permissive read-page filter (gap #4). If (b), implement
  `articles.policy.publish_filter` per `MEMORY-DB-DESIGN.md` §3.6.
- **W-FE-LANG** (deferred; only when multi-pair support is on the
  roadmap). Document `lang` as a Phase-1 retrieval signal (gap #5).

---

## 5. Files referenced

- FE worktree: `../kendo-translation-frontend/`
  - `app/documents/[id]/read/page.tsx`
  - `components/reader/{ReaderView,SingleLanguageView,BilingualParagraphView,TranslatorAlignedView}.tsx`
  - `hooks/useReaderView.ts` (implicit via `ReaderView` props)
- Doc set:
  - `docs/VISION.md`
  - `docs/ARCHITECTURE.md` §6, §10, §12
  - `docs/MAC-RAG.md` §3.5, §6
  - `docs/MAC-RAG-EXAMPLES.md` (Glossary, `qa_approved` references)
  - `docs/DEV-STATE-2026-05-20.md`
  - `docs/MEMORY-DB-DESIGN.md` §3.6, §5
  - `docs/MAC-RAG-EXAMPLES-TODO-PLAN.md` (Schema correction B.1, W11 sweep target)

---

## 6. Verdict

The seven-commit reader series **fits the doc set cleanly**. No
invariant is violated; one explicit known-debt entry is closed; one
permissive widening of the publishable-segment filter is flagged for
future decision. No urgent doc rewrites are forced by this work; the
items in §3.3 are best handled in the W11 cross-task consistency
sweep already planned.
