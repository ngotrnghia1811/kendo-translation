# MAC-RAG Worked Examples — TODO Implementation Plan

This plan addresses the six `!TODO` markers the user added to the top of
`docs/MAC-RAG-EXAMPLES.md`. It decomposes them into work units, sequences
them, and names the deliverables, dependencies, and open questions for
each. The point-in-time companion is `docs/DEV-STATE-2026-05-20.md`.

The plan is the artifact; it is not yet execution. Each work unit below
will be authorized one at a time through the standard scope-confirm →
act → report loop.

The memory-DB system (TODO 4) is the only code/schema item and is large
enough that its detailed design is deferred to a separate stub:
`docs/MEMORY-DB-DESIGN.md` (to be written as work unit W7). This plan
keeps the memory DB at a planning-level summary in §3.4.

---

## 1. The six TODOs, verbatim and reread

### TODO 1 — Broader context

> "Context building process should not be just about the current segment.
> It should also consider the surrounding segments, or more general
> context like the chapter, or the document as a whole. This is
> especially important for edit, where the current target may have been
> written with a certain style or interpretation that the agent should
> respect. The context builder should surface this broader context and
> any relevant metadata to the agent, and ideally also to the human if
> they want to review or edit it before generation."

**Technical reading.** The current `docs/MAC-RAG-EXAMPLES.md` Phase 0
shows neighbours (prev/next segment) but stops there. The user wants
context to be **hierarchical**:

- Segment-local (current source/target, immediate neighbours).
- Section/paragraph-local (the surrounding ~5–10 segments forming a
  semantic unit).
- Chapter-local (chapter title, key terms recurring in chapter,
  established choices made earlier in the chapter — e.g. "Chapter 3
  has already chosen *kendo* not *kendō*").
- Document-global (document title, target audience profile, document-
  level style choices, terminology baseline, translator/editor
  identities, history of major decisions).

Edit and proofread especially benefit because they can respect the
*line of interpretation* a chapter has already established. The agent
should receive this context **and** the human should be able to inspect
it.

### TODO 2 — Human-visible, human-editable composed prompt

> "The output of the context building process would be a fully composed
> prompt that will be fed into the LLM for generation. The HUMAN should
> be able to see this prompt and edit it if they want, before it goes
> into the LLM. This would allow them to add instructions, clarify
> ambiguities, or provide additional information that the agent might
> have missed."

**Technical reading.** This is a UI integration point: the **Context
Builder Panel** that has been a `[GAP]` in MAC-RAG.md and
MAC-RAG-EXAMPLES.md. Concretely:

- After Phase 2 (Context Pairing), the orchestrator does *not* go
  straight into Phase 3. Instead it returns the **composed prompt** to
  the client.
- The client renders the prompt as editable plain text.
- The human inspects, optionally edits, and clicks "Generate".
- Phase 3 then runs with the (possibly human-modified) prompt.

This changes the orchestrator's response shape (two-stage rather than
one-stage) and adds at least one new endpoint
(`POST /api/mac-rag/generate` separate from `/api/mac-rag/prepare`), or
keeps a single endpoint with a `stage` field.

It also introduces a human decision point that today doesn't exist
mid-pipeline — the user has to be willing to wait. This affects which
tasks should have it on by default (edit and proofread benefit most;
QA likely does not need it since N=1 and structural).

### TODO 3 — Human sees text, not data

> "HUMAN should almost always see the litreal `human readable text`,
> instead of data or code."

**Technical reading.** Several `[HUMAN SEES]` blocks in
`docs/MAC-RAG-EXAMPLES.md` currently show structured strings (scores
as `0.92`, bullet lists of internal token names, raw approach names
like `accuracy_focus`). The user wants these reframed:

- "fluency 0.92" → "Reads smoothly."
- "adequacy 0.86" → "Captures most of the source's meaning; a small
  nuance may have shifted."
- "accuracy_focus" → "Prioritising faithfulness."
- routing band → "Light review suggested" / "Worth considering" / etc.
- raw approach JSON in agent UI → bullet list with human-readable labels
  and the actual candidate text.

JSON and field names belong in `[AGENT IN]` / `[AGENT OUT]` blocks (which
the human never sees) and in `[DB]` blocks (which represent actual
storage). The `[HUMAN SEES]` mockups should be ruthlessly prose.

### TODO 4 — Memory DB system

> "We need to develop a memory DB system for MAC-RAG. Currently our DB
> only consists of the segment data (either monolingual (japanense or
> english), or bilingual pairs)"

**Technical reading.** This is the code/schema work item. Today's DB
holds segments, suggestions, comments, phase transitions, locks, and
`qa_issues` (empty). There is no:

- TM table (translation memory is currently fuzzy-search over historical
  segments).
- Terminology table with structure (`required` / `preferred` /
  `do_not_translate`, with confidence and casing rules).
- Style guide table.
- QA issue patterns view.
- Edit-pattern table.
- Document audience profile field.
- Document policy field (auto_accept_threshold).
- Chapter-level metadata table (chapter terms, chapter decisions log).

All of these are referenced as `[GAP]` throughout the docs. The memory
DB is the implementation that closes those gaps. **Detailed design
deferred to `docs/MEMORY-DB-DESIGN.md`** (work unit W7).

### TODO 5 — Use real DB examples

> "When you write the example, use the example from our actual database"

**Technical reading.** The current walkthroughs use fictional "segment
47" with invented JA text (`打突の機会を見逃さず、間合いを詰める。`).
Replace with a real row from the live Supabase project. Constraints on
the choice:

- Should be one of the 4 segments currently at `translated` status (so
  translate walkthrough corresponds to reality) — or one of the 85
  `draft` segments if we want to show translate from scratch.
- Should have at least 1–2 terminology hits and ideally a TM neighbour.
- Should be representative of kendo prose, not a degenerate edge case.

This is a query-then-rewrite operation, not a green-field write.

### TODO 6 — Align with `_references/gemini_kendo_book_translator`

> "Review the prompts in _references/gemini_kendo_book_translator to
> understand how the LLMs will be prompted for translation"

**Technical reading.** Research first, then rewrite. We need to
understand:

- The system prompt structure used in that reference (role framing,
  domain framing, instruction layering).
- The user-prompt structure (how source, context, and constraints are
  laid out).
- The output-shape conventions (free text vs JSON vs annotated).
- Any chain-of-thought or self-critique patterns used.

Then update the `[AGENT IN]` example prompts in
`docs/MAC-RAG-EXAMPLES.md` to match conventions where conventions
exist. Where we deliberately diverge (cooperation surface, multi-
candidate, etc.), explain the divergence.

---

## 2. Work-unit decomposition

Twelve work units, ordered by dependency. Some are doc revisions; W7 is
the only code/schema work in this plan, and even W7 is design-only
(implementation comes later).

```
W1  research:  read gemini_kendo_book_translator prompts            (TODO 6)   [DONE → Appendix A]
W2  research:  pick a real DB segment to use as running example     (TODO 5)   [DONE → Appendix B]
W3  doc:       hierarchical context model — Phase 0 rewrite         (TODO 1)   [DONE — model-only first cut; W3.5 follows]
W3b doc:       propagate hierarchical context model into MAC-RAG.md spec (Phase 0/1 + §3 task tables + §5 gap-map refresh + §6 worked-example blocks)
W3.5 doc:      integrate the hierarchical context model into Steps 1–3 of all 4 walkthroughs
W4  doc:       Context Builder Panel as explicit pipeline step      (TODO 2)
W5  doc:       prose-first [HUMAN SEES] rewrite across all 4 tasks  (TODO 3)  [DONE]
W6  doc:       prompt examples aligned with W1 findings             (TODO 6)
W7  design:    write docs/MEMORY-DB-DESIGN.md                       (TODO 4)
W8  doc:       integrate W2 real-segment data through all 4 walkthroughs (TODO 5)
W9  doc:       cross-task consistency pass + 4-way comparison table refresh
W10 doc:       remove [GAP] markers that W7 will close once implemented; replace with forward-references to MEMORY-DB-DESIGN.md
W11 doc:       remove the !TODO markers themselves; replace with a footer noting "this revision addressed TODOs 1–6"
W12 commit:    commit MAC-RAG.md v3, DEV-STATE, plan, memory-DB design, and revised MAC-RAG-EXAMPLES.md, one logical commit per concern
```

Critical path: **W1, W2 in parallel → W3 → W4 → W5 → W6 → W7 → W8 → W9
→ W10 → W11 → W12.** W1 and W2 are independent research tasks and can
run together. Everything else is sequential because each unit operates
on the same file (`docs/MAC-RAG-EXAMPLES.md`) and depends on the prior
unit's structural changes.

---

## 3. Per-unit detail

### W1 — Research: gemini_kendo_book_translator prompts

- **Scope.** Read the prompts under
  `_references/gemini_kendo_book_translator/` and extract: system-prompt
  shape, user-prompt shape, output conventions, any chain-of-thought
  patterns, any self-critique / self-scoring patterns.
- **Inputs.** The reference directory (symlink already in place).
- **Deliverable.** A short summary memo (~50–80 lines) written into the
  same plan file (§ Appendix A) or kept inline in this plan's W1
  section. **No new file.** Pure research; no MAC-RAG-EXAMPLES.md
  changes yet.
- **Depends on.** Nothing.
- **Files touched.** `docs/MAC-RAG-EXAMPLES-TODO-PLAN.md` only
  (Appendix A added).
- **Estimated size.** 1 reading pass + 1 short writeup.
- **Open questions.** None blocking.

### W2 — Research: pick a real DB segment

- **Scope.** Query the live Supabase project `mbgmyvmsvenvtecvrjia` for
  candidate segments. Selection criteria:
  - Status: prefer `translated` (4 candidates) for translate
    walkthrough; OR draft + a fictional already-translated variant for
    edit/proofread/QA. Decision needed.
  - Has identifiable kendo terminology (at least `間合い`, `打突`, or
    similar).
  - Has a meaningful neighbour with non-empty target.
  - Document title and chapter context are recoverable.
- **Inputs.** Supabase Management API at
  `https://api.supabase.com/v1/projects/mbgmyvmsvenvtecvrjia/database/query`
  with `SUPABASE_ACCESS_TOKEN`.
- **Deliverable.** A short table of 3–5 candidate segments with their
  source/target/status/document/neighbours, written into this plan as
  Appendix B. User picks one before W8 executes.
- **Depends on.** Nothing.
- **Files touched.** `docs/MAC-RAG-EXAMPLES-TODO-PLAN.md` only
  (Appendix B added).
- **Estimated size.** ~5 SQL queries + writeup.
- **Open questions.**
  - Should the running example be one segment (with synthesized further
    states for edit/proofread/QA branches) or 1+1+1+1 different segments
    each at the appropriate status? Single-segment-with-branches keeps
    continuity strong but requires fabricating later states.

### W3 — Hierarchical context model (TODO 1)

- **Scope.** Rewrite the Phase 0 section of every task walkthrough so
  context is hierarchical: segment → section → chapter → document.
  Surface each level explicitly in the `[AGENT OUT]` ContextObject and
  in the `[HUMAN SEES]` Context Builder mock-up (W4 will detail the
  Context Builder Panel itself; W3 prepares the data shape).
- **Inputs.** Current Phase 0 sections of all four walkthroughs.
- **Deliverable.** Rewritten Phase 0 sections in
  `docs/MAC-RAG-EXAMPLES.md`. ContextObject schema updated. No UI
  details yet (those are W4).
- **Depends on.** Nothing structural (can run before W1/W2 in principle,
  but reads better after W2 fixes the example segment).
- **Files touched.** `docs/MAC-RAG-EXAMPLES.md`.
- **Estimated size.** ~150–200 lines of edits across 4 walkthroughs.
- **Open questions.**
  - Where does the section/chapter boundary come from? `documents.metadata.toc`?
    A new `document_sections` table? Marked in this plan as a memory-DB
    candidate for W7.
  - Are document-global decisions (e.g. "this doc uses *kendo* not
    *kendō*") stored or inferred? W7 candidate.

### W4 — Context Builder Panel as explicit pipeline step (TODO 2)

- **Scope.** Insert a new section/step in every walkthrough between
  Phase 2 (Context Pairing) and Phase 3 (Generation): "Step N — Human
  reviews and optionally edits the composed prompt." Includes:
  - HTTP shape change: `POST /api/mac-rag` returns the composed prompt
    instead of running through to Phase 3 in one shot. A second call
    (`POST /api/mac-rag/generate` with the prompt) triggers Phase 3.
  - UI mock-up for the Context Builder Panel: shows the prompt in plain
    text, editable, with "Generate" and "Cancel" buttons.
  - Default-on for translate/edit/proofread; default-off for QA (N=1,
    structural).
  - User-level setting to skip the panel for users who don't want it.
- **Inputs.** Current Phase 2 → Phase 3 transitions in all four
  walkthroughs.
- **Deliverable.** New step inserted in each walkthrough. The plan
  documents the orchestrator's new two-stage response shape.
- **Depends on.** W3 (because the panel surfaces the hierarchical
  context).
- **Files touched.** `docs/MAC-RAG-EXAMPLES.md`.
- **Estimated size.** ~80–120 lines per walkthrough; ~400 total.
- **Open questions.**
  - Should the Context Builder Panel also let the human **prune**
    retrieval results (e.g. remove a TM hit they think is misleading)?
    Likely yes; needs UI design.
  - When the human edits the prompt, do we save the diff for audit?
    Likely yes; needs a `prompt_edits` audit table (W7 candidate).

### W5 — Prose-first `[HUMAN SEES]` rewrite (TODO 3) [DONE]

- **Scope.** Sweep through every `[HUMAN SEES]` block in
  `docs/MAC-RAG-EXAMPLES.md` and rewrite the contents to be plain English
  prose, ASCII-art forms with labelled fields, or short bulleted
  summaries. Remove score floats, internal field names, JSON-y syntax.
  Keep all such structure inside `[AGENT IN]`/`[AGENT OUT]`/`[DB]` only.
- **Inputs.** All four walkthroughs.
- **Deliverable.** Rewritten `[HUMAN SEES]` blocks. The number of blocks
  to rewrite is roughly 8 per walkthrough × 4 walkthroughs ≈ 32 blocks.
- **Depends on.** W3, W4 (because their structural changes add new
  `[HUMAN SEES]` blocks that must also follow the prose rule).
- **Files touched.** `docs/MAC-RAG-EXAMPLES.md`.
- **Estimated size.** ~200 lines of rewrites.
- **Open questions.** Score floats are pedagogically useful in some
  places — e.g. "0.85" tells the reader which routing band would apply.
  Compromise: show the *band label* in the UI mock-up
  ("Light review suggested"), keep the raw score in a small "(details)"
  drawer below. Decision: yes, do that.
- **Status.** Rewrites applied at the major offender blocks: Translate
  Step 10 candidates panel + Step 13 memory-update UI; Edit Step 10
  candidates panel + Step 11 narration (`accuracy_focus` → "the
  faithfulness-prioritised rewording"); Proofread Step 8 Branch A
  auto-accept banner + Branch B policy-off panel; QA Step 9X clean-pass
  report + Step 10X final status display + Step 9Y triage panel. Routing
  bands now surface as human labels ("Light review suggested", "Worth
  considering", "Needs a closer look", "Clean pass"); raw scores live
  behind a collapsed "(details)" drawer per the open-question
  resolution. Already-prose blocks (Translate/Edit/Proofread/QA Step 1
  segment cards, spinners, phase-advance buttons, next-role views,
  Proofread Step 10 memory-update, QA Step 10Y triage display) left
  unchanged. Phase-status names (`draft`/`translated`/`edited`/
  `proofread`/`qa_approved`) are retained as human-facing labels. The
  Step 5b Context Builder accordion mock-ups (`Coverage: 0.85` style)
  are intentionally exempt — they are developer-facing diagnostic
  panels, not end-user surfaces. Meta-quotes of internal field names in
  narrator commentary (explaining the design rule itself, or pointing
  to where raw numbers live behind drawers) are retained. The QA Step
  11 memory-update threshold-tuning mock-up retains its raw threshold
  values because exposing the threshold is the explicit purpose of that
  control.

### W6 — Prompt examples aligned with W1 findings (TODO 6)

- **Scope.** Rewrite the `[AGENT IN]` system/user prompts shown in
  Phase 3 of all four walkthroughs to match the conventions found in W1.
  Where we deliberately diverge from those conventions (e.g. because
  cooperation surface requires structured output, or because edit needs
  `targetText`), explain the divergence in a `note:` field.
- **Inputs.** W1 memo (Appendix A of this plan) and current
  `[AGENT IN]` blocks.
- **Deliverable.** Rewritten `[AGENT IN]` blocks. New Phase-3 section
  intro paragraph noting prompt-convention adoption.
- **Depends on.** W1.
- **Files touched.** `docs/MAC-RAG-EXAMPLES.md`.
- **Estimated size.** ~80 lines of edits per walkthrough; ~320 total.
- **Open questions.** Adoption level — full, partial, inspiration-only.
  See §5 decision 3.

### W7 — Write `docs/MEMORY-DB-DESIGN.md` (TODO 4)

- **Scope.** Design-only. Enumerate the memory-DB tables / views /
  triggers / RPCs needed to close the `[GAP]` markers across MAC-RAG.md
  and MAC-RAG-EXAMPLES.md. Produce a separate design document; no
  schema migration in this work unit.
- **Inputs.** All `[GAP]` markers in current docs, plus the gap list in
  `docs/DEV-STATE-2026-05-20.md` §5, plus existing v2 schema at
  `_references/kendo-translation-v2/` (if it has memory tables we can
  lift).
- **Deliverable.** `docs/MEMORY-DB-DESIGN.md`. Sections:
  1. Goals and non-goals.
  2. Tables: `translation_memory`, `terminology`, `style_guide`,
     `qa_issue_patterns`, `edit_patterns`, `document_sections`,
     `document_decisions`, `prompt_edits`, plus column additions to
     existing tables (`segment_suggestions.auto_accepted`,
     `documents.policy`).
  3. Views: `qa_issue_patterns_view`, `tm_search_view`.
  4. RLS policies: who reads/writes which.
  5. Migration plan (separate migration files, ordering).
  6. Phase 4b memory-update flows referenced from each task walkthrough.
  7. Compatibility / rollout strategy.
- **Depends on.** Nothing structurally, but is more useful after W1
  (the prompt-convention research may reveal whether the prompts expect
  certain memory shapes).
- **Files touched.** New file `docs/MEMORY-DB-DESIGN.md`.
- **Estimated size.** ~400–600 lines.
- **Open questions.** See §5 decision 1.

### W8 — Integrate real-segment data through all 4 walkthroughs (TODO 5)

- **Scope.** Replace every occurrence of fictional "segment 47" + its
  invented Japanese with the W2-selected real segment. Update document
  ID, segment ID, JA source text, the agent's TM hits (re-derived from
  real data), terminology hits (from real terminology rows), neighbours
  (from real prev/next), document title and chapter info. Re-derive
  agent output candidates that remain plausible against the new source.
- **Inputs.** W2 selection.
- **Deliverable.** Fully rewritten walkthroughs grounded in real data.
- **Depends on.** W2 (segment selection), W3 (hierarchical context shape
  set), W4 (Context Builder Panel set), W5 (prose UI set), W6 (prompt
  conventions set).
- **Files touched.** `docs/MAC-RAG-EXAMPLES.md`.
- **Estimated size.** ~300 lines of edits across all four walkthroughs.
- **Open questions.**
  - For tasks whose preconditions don't exist in the current DB (edit,
    proofread, QA-advisory), do we (a) fabricate downstream states from
    a real `translated` segment, (b) seed the DB with prerequisite
    states via test fixtures, or (c) document the synthesis explicitly?
    Plan default: (c), explicit synthesis with `[SYNTHESIZED]` markers.

### W9 — Cross-task consistency pass

- **Scope.** Read all four walkthroughs end-to-end as a single document.
  Reconcile: phrasing, role-name conventions, format of code fences,
  comparison-table column ordering, terminology used to describe the
  pipeline itself. Refresh the 4-way comparison table at the end of the
  QA section to reflect all W3–W8 changes.
- **Inputs.** All preceding W-unit changes.
- **Deliverable.** Internally consistent, end-to-end-readable
  `docs/MAC-RAG-EXAMPLES.md`.
- **Depends on.** W3, W4, W5, W6, W8.
- **Files touched.** `docs/MAC-RAG-EXAMPLES.md`.
- **Estimated size.** ~80 lines of edits.
- **Open questions.** None.

### W10 — Replace `[GAP]` markers with forward-references

- **Scope.** Every `[GAP]` marker in `docs/MAC-RAG-EXAMPLES.md` that
  refers to something W7 has designed becomes a forward-reference like
  `(See MEMORY-DB-DESIGN.md §3 — translation_memory table)`. Genuinely
  unresolved gaps stay as `[GAP]`.
- **Depends on.** W7.
- **Files touched.** `docs/MAC-RAG-EXAMPLES.md`.
- **Estimated size.** ~30 lines of edits.

### W11 — Remove the `!TODO` markers; add closure footer

- **Scope.** Delete the six `!TODO` lines at the top of
  `docs/MAC-RAG-EXAMPLES.md`. Add a footer or changelog note crediting
  the TODOs and naming this plan + memory-DB design as their
  resolution.
- **Depends on.** W3 through W10.
- **Files touched.** `docs/MAC-RAG-EXAMPLES.md`.
- **Estimated size.** ~20 lines.

### W12 — Commit cadence

- **Scope.** Produce a tidy commit history. Suggested grouping:
  1. `docs(state): add 2026-05-20 development snapshot` (the snapshot).
  2. `docs(mac-rag): add TODO implementation plan` (this file).
  3. `docs(mac-rag): commit v3 generalized spec`
     (`docs/MAC-RAG.md`).
  4. `docs(mac-rag): add deep walkthroughs for translate/edit/proofread/QA`
     (`docs/MAC-RAG-EXAMPLES.md` as it stands now, before
     TODO-revisions).
  5. `docs(memory): add memory DB design`
     (`docs/MEMORY-DB-DESIGN.md`).
  6. `docs(mac-rag): address TODOs 1–6 in walkthrough examples`
     (the W3–W11 changes, one commit).
- **Depends on.** Everything; this is the last unit.
- **Open question.** Should commits 1–4 happen now (before TODO work)
  or be batched at the end? See §5 decision 4.

---

## 4. Critical-path diagram

```
W1 ──┐
     ├──> (gates W6)
W2 ──┤
     └──> (gates W8)

W3 ──> W4 ──> W5 ──> W6 ──> W7 ──> W8 ──> W9 ──> W10 ──> W11 ──> W12

(W3, W7 can also run earlier; W7 only blocks W10. W6 blocks on W1.)
```

Realistic ordering with parallelism:

```
Day 1:  W1 ∥ W2 ∥ W3 ∥ (W7 spec draft)
Day 2:  W4
Day 3:  W5, W6
Day 4:  W7 finalize → W8
Day 5:  W9 → W10 → W11
Day 6:  W12 commits
```

---

## 5. Outstanding human decisions

These five decisions block plan execution and are also surfaced in
`docs/DEV-STATE-2026-05-20.md` §10.

**Resolution log (session of 2026-05-22):**

- D1: **A** → superseded by **D6 = B** (see below) after Appendix B
  uncovered that `translation_memory` (1,264 rows, pgvector) and
  `terminology` (920 rows) already exist.
- D2: **A** (one real translated segment + synthesized downstream).
- D3: **B** (partial adoption, divergences documented in Appendix A).
- D4: **A** (committed `3dd6842`).
- D5: **A** (pushed to `origin/main` at `3dd6842`).
- **D6 (new): B** — retarget W7 from "full from-scratch" to "**extension
  design**": document existing memory tables, identify gaps for MAC-RAG's
  context-builder needs, propose additions (new tables or columns) without
  removing what is already there. Triggered by Appendix B §B.7.

1. **Memory DB scope** (gates W7).
   - Option A: full from-scratch design tailored to MAC-RAG.
   - Option B: lift the v2 schema at `_references/kendo-translation-v2/`
     and adapt.
   - Option C: minimal — only design the tables strictly needed to
     close current `[GAP]` markers; defer the rest.

2. **Running-example segment selection** (gates W2 outputs and W8).
   - Option A: one real `translated` segment with synthesized
     downstream states for edit/proofread/QA branches (marked
     `[SYNTHESIZED]`).
   - Option B: four different real segments at four different statuses
     (requires seeding edited/proofread/qa_approved states; the DB has
     zero today).
   - Option C: one real `draft` segment, run translate against it for
     real, capture actual MAC-RAG output, then synthesize forward.

3. **Prompt convention adoption** (gates W6).
   - Option A: full adoption of `gemini_kendo_book_translator` style.
   - Option B: partial adoption with cooperation-surface adaptations
     (explicit divergences explained).
   - Option C: inspiration-only — read the reference but write our own.

4. **Commit cadence** (gates W12 and possibly W1).
   - Option A: commit the current doc state now (snapshot + plan +
     MAC-RAG.md v3 + MAC-RAG-EXAMPLES.md as-is with TODOs intact) and
     then make the TODO-revision changes in follow-up commits.
   - Option B: hold all commits until after W11; one big batch.
   - Option A is safer (revertible by file); Option B keeps the
     "before/after" diff cleaner.

5. **Push timing** (gates eventual `git push origin main`).
   - Option A: push the 5 currently-unpushed code commits now; doc
     commits go up later.
   - Option B: push everything together after W12.
   - Option C: wait for explicit user authorization on each push.

---

## 6. Suggested next action

W1 and W2 are independent and unblocking. Both are research, both
produce a short appendix in this same plan file, neither modifies
`docs/MAC-RAG-EXAMPLES.md`. They are the safest starting move.

Recommended immediate execution order:

1. **W2** first — picks the segment that will anchor every later edit.
2. **W1** second — research the reference prompts.
3. Then loop back to user for decisions §5.1, §5.3, §5.4, §5.5.
4. Then proceed W3 → W11.

---

## 7. Appendices

### Appendix A — W1 findings: prompt conventions in `_references/gemini_kendo_book_translator`

Reviewed at commit `3dd6842` against `_references/gemini_kendo_book_translator/`:
`translation_prompt.md` (314 lines), `README.md`, `config.json`,
`source_spec.json`, `kendo_dict.md` (2,395 lines), one fully-rendered output
sample (`translated/100 practice full_trilingual.md`, 40,505 lines, 367 pages),
and the builder code `universal_agents/core/book_prompts.py` that assembles the
system prompt at runtime.

#### A.1 Architectural shape

The reference agent is a **PDF-page batch translator** with a single
deterministic LLM call per page. It is not interactive, not cooperation-first,
and not segment-keyed. One file, one persona, the entire book.

- One **system prompt** (`translation_prompt.md`) is sent once at conversation
  start (and re-sent after every 15-page conversation rollover; see
  `build_book_new_conversation_prompt`).
- The system prompt has **five modules** in a fixed order:
  1. **Role** — persona declaration with credential framing.
  2. **Task Description / Context** — background, objective, constraints,
     audience, consistency policy, reference material pointer.
  3. **Instructions** — six numbered steps (read & analyse → translate
     sentence-by-sentence → terminology rules → quality checks → special
     content types → output format).
  4. **Examples** — three positive few-shot pages plus two `BAD / GOOD`
     contrastive demonstrations.
  5. **Format Reminder** — terminating reference card: an output-shape ASCII
     template, a formatting-rules table, consistency-tracking policy, and tone
     guidance per content type.
- The system prompt is followed by `---\n## Reference Dictionary\n<2,395 lines
  of kendo_dict.md>` appended directly into context.
- Per-page user turns are minimal: `"Here is page N of M. Please translate it
  following the same format and rules as before:"`.
- No retrieval is performed. The full dictionary lives in the prompt every
  conversation. No RAG, no per-page candidate selection.

#### A.2 Twelve conventions worth extracting, ranked by adoption value for MAC-RAG

For each convention: what it is, **why it works there**, and whether it
transplants to MAC-RAG **As-is**, **Adapt** (with stated cooperation-surface
adjustment), or **Reject** (with reason). Per D3, partial adoption with
documented divergences is the policy.

1. **Five-module prompt skeleton** (Role / Task / Instructions / Examples /
   Format).
   - Why it works: it puts the persona before the task before the rules, so
     models bind expertise before reading constraints; the Format section
     terminates context with the schema the model must hit.
   - **Adapt.** MAC-RAG has four task variants (translate/edit/proofread/QA)
     that share modules 1 and 2 but diverge in 3, 4, 5. Use a five-module
     skeleton per task type, factor the shared Role/Task into a reusable
     header.

2. **Persona-by-credentials framing.**
   - "Senior professional translator, 15+ years budō, dictionary-bound,
     publishing-quality." Concrete and bounded.
   - **Adapt.** Replace the bare credential blob with a **role-card per
     phase**: translator-agent, editor-agent, proofreader-agent, QA-advisory
     agent. Each role-card declares its own bounded scope plus the
     cooperation-surface invariant (`I propose; I never commit;` for all four
     phases).

3. **Fidelity-first hard constraint, written at the top of Task Description.**
   - "Do not paraphrase, summarize, omit, or editorialize. Every sentence in
     the source must appear in the output."
   - **As-is** for translate. For edit, replace with "preserve sentence
     boundaries and JA-sentence count from the source; never silently merge
     or drop." For proofread, replace with "you may rewrite freely but every
     change must be justifiable from the source or the edit history." For QA,
     replace with "you may not propose new text; only flag issues with span
     references."

4. **Dictionary as authoritative single source of truth, with a published
   lookup protocol** (Step 3, sub-steps 3a–3e).
   - Every kendo term: consult dictionary first; if present, use dictionary
     gloss; if absent, translate and tag `[T/N: Term not in reference
     dictionary]`.
   - **Adapt.** MAC-RAG already has a populated `terminology` table (920
     rows; see B.6 below). The Phase-1 context builder should retrieve only
     the terms that lexically hit the current segment plus a small radius of
     neighbours; do not paste the whole 2,395-line dictionary into every
     prompt. Adoption note: keep the **"dictionary entry overrides general
     knowledge"** policy verbatim; reject the **"send the entire dictionary
     every turn"** mechanism.

5. **First-occurrence annotation policy.**
   - First occurrence: `*rōmaji* (漢字 — gloss)`. Subsequent: `*rōmaji*`.
   - **Adapt with care.** MAC-RAG translates segment-by-segment, not page-by-
     page. "First occurrence" is a document-level scope. To preserve this in
     a segment-keyed pipeline, the context builder must surface
     `terminology_seen_in_prior_segments_of_this_article` to the agent, plus
     an explicit instruction line: "Annotate at first occurrence within this
     article only. The set of already-annotated terms is: {list}." This is a
     **direct dependency** for W3 (hierarchical context).

6. **Sentence-boundary contract.**
   - Sentences end on `。 ？ ！`. Headings and standalone phrases each count
     as one unit. Sentence count in output must match source.
   - **As-is.** This is already implicit in `segments(position INT, source_text
     TEXT)` — one segment = one unit. Worth re-declaring inside the agent
     prompt as an inviolable rule.

7. **Three positive few-shot examples plus contrastive BAD/GOOD pairs.**
   - Pages 5 (instructional), 12 (philosophical), 28 (headings+technical
     terms) cover content type breadth. Two BAD/GOOD pairs anchor common
     failures.
   - **Adapt.** Translate-agent gets three positive examples drawn from the
     real DB (per D2 + W2 choice in Appendix B). Edit/proofread/QA agents
     each need their own examples; these will largely be **synthesized** per
     D2 because the DB has no edited/proofread/QA data yet. Include at least
     one contrastive BAD/GOOD per phase that demonstrates the
     cooperation-surface invariant from §A.2.2.

8. **Output-shape ASCII template plus a per-rule formatting table.**
   - The system prompt closes with a literal text template (`Page [#] / ...
     / === END OF PAGE [#] ===`) and a 12-row rules table.
   - **Adopt the discipline; change the artefact.** MAC-RAG agent outputs are
     JSON, not free-form trilingual blocks. Each agent's prompt should end
     with the JSON output schema (e.g. for translate-agent: `{
     "proposed_text": str, "confidence": float, "terminology_used":
     [{"source_term": str, "target_term": str}], "translator_notes":
     [str] }`) plus a small table that maps each field to its semantic.

9. **Translator's notes mechanism** `[T/N: ...]`.
   - Used for genuine ambiguity, transcription errors, terms-not-in-
     dictionary. Used sparingly.
   - **Adopt.** Map `[T/N]` text inserts to a structured `translator_notes:
     [str]` field in the agent's JSON output. Surface these to the HUMAN in
     the cooperation surface as "agent notes for this segment." This
     directly serves TODO 3 (humans see prose, not data).

10. **Consistency policy in two parts: (a) terminology consistency, (b) tone
    consistency by content type.**
    - "If translated a certain way on page 1, it must remain identical on
      page 50."
    - Per-content-type tone table (instructional → direct; philosophical →
      contemplative; historical → scholarly).
    - **Adopt both, route differently.** (a) belongs in the context builder
      (retrieve prior chosen translations from `translation_memory` for
      lexical hits in current segment). (b) belongs in the role-card per
      task; the article-level metadata `articles.tags` could declare content
      type if populated, but presently is not — see Appendix B.

11. **Conversation rollover for context-budget management.**
    - Every 15 turns, start a new conversation and re-paste the full system
      prompt + dictionary.
    - **Reject the mechanism, adopt the lesson.** MAC-RAG segments are
      independent prompt instances, not turns in a conversation. The lesson
      to keep: every prompt must self-contain everything it needs;
      conversational state is unreliable. This is already aligned with the
      MAC-RAG-EXAMPLES Phase-1 design.

12. **Reject-list / "Example of What NOT to Do."**
    - Two explicit BAD patterns: translating kendo terms into English
      equivalents, and merging two source sentences into one.
    - **Adopt and extend per phase.** Edit-agent's reject-list must include:
      "do not rewrite for style alone with no error to fix." Proofreader's
      reject-list must include: "do not introduce new content beyond
      polishing." QA-advisory's reject-list must include: "do not write
      replacement text; only flag." The reject-list is the cleanest place to
      encode cooperation-surface invariants in agent-readable form.

#### A.3 Conventions explicitly **not** adopted

- **Full-dictionary in-prompt** (see A.2.4) — replaced by retrieved
  terminology subset.
- **Page-as-unit translation** (see A.2.6) — replaced by segment-as-unit.
- **Browser-automation transport / Gemini Pro UI scraping** — irrelevant;
  MAC-RAG uses OpenRouter API.
- **Trilingual output (JA/EN/ZH)** — MAC-RAG is JA→EN only.
- **`book_title`-as-context-only** framing — MAC-RAG has richer context
  (`articles.title_ja`, `articles.tags`, neighbour segments, prior
  translations); use them.

#### A.4 Direct hand-offs to other work units

- **W3 (hierarchical context).** A.2.5 is a hard dependency: first-occurrence
  annotation requires document-scope context, not just current-segment
  context. The context-builder design in W3 must surface
  `terms_already_annotated_in_this_article` as an explicit field.
- **W4 (Context Builder Panel).** A.2.8 motivates a "preview the composed
  prompt" panel: if the reference agent's failure modes are mostly format
  drift, exposing the literal prompt to a human reviewer catches them.
- **W6 (Prompt examples aligned with W1).** This appendix is the working
  brief. Per-phase agent prompts in W6 should adopt conventions A.2.1, .2,
  .3, .6, .8, .9, .10, .12 directly; adapt .4, .5, .7; reject .11.
- **W7 (memory DB design).** A.2.4 + A.2.10(a) imply the memory DB's primary
  query interface is "given current segment, return: (i) relevant
  terminology entries, (ii) prior chosen translations for the same source
  lemmas in this article, (iii) prior chosen translations across the corpus
  with quality ≥ threshold." Two of those three are already supported by the
  existing `terminology` and `translation_memory` schemas (see Appendix B).

---

### Appendix B — W2 findings: real DB segment candidates

Source: live query of Supabase project `mbgmyvmsvenvtecvrjia` on `2026-05-22`
via the management API. **Several premises in the prior session's compressed
context are wrong; corrections are listed first.**

#### B.1 Corrections to prior context

| Prior assertion | Actual state |
|---|---|
| "89 segments: 85 draft / 4 translated / 0 elsewhere" | **89 segments: 73 draft / 16 translated.** `segments.status` has only these two distinct values in production data; `edited / proofread / qa_approved` are CHECK-allowed but unused. |
| "DB has only segment data (mono or bilingual pairs)" (TODO 4 premise) | **Wrong.** `translation_memory` has **1,264 rows** with pgvector `embedding` column populated and a `tsvector` full-text index; `terminology` has **920 rows** with domain/term-type metadata; `agent_prompts` table exists (1 row, schema: `user_id, agent_type, approach, template`). Memory infrastructure is partially built, not absent. |
| "Documents table; segments.document_id" | **Articles table; segments.article_id; segments.position (not segment_index).** 958 articles total (mostly unsegmented; only the segmented ones surface in the UI). |

These corrections invalidate parts of W7's premise as currently written and
should be propagated into `docs/DEV-STATE-2026-05-20.md` during W12.

#### B.2 The 16 `translated` segments at a glance

| # | article_id (short) | article title | pos | src_len | tgt_len | target text status |
|---|---|---|---:|---:|---:|---|
| 1 | `93f7a0e0` | 相手の心を動かす仕かけとは（清野 忍） | 0 | 81 | 212 | **real** — KENDOJIDAI metadata header, faithfully bilingualised |
| 2 | `93f7a0e0` | 〃 | 2 | 51 | 54 | placeholder `[wave-2 advance probe seed @ 2026-05-17T06:02:00.736Z]` |
| 3 | `93f7a0e0` | 〃 | 3 | 31 | 54 | placeholder seed |
| 4 | `93f7a0e0` | 〃 | 4 | 17 | 54 | placeholder seed |
| 5 | `93f7a0e0` | 〃 | 5 | 16 | 54 | placeholder seed |
| 6 | `93f7a0e0` | 〃 | 6 | 59 | 54 | placeholder seed |
| 7 | `93f7a0e0` | 〃 | 7 | 28 | 54 | placeholder seed |
| 8 | `93f7a0e0` | 〃 | 8 | 86 | 54 | placeholder seed |
| 9 | `93f7a0e0` | 〃 | 9 | 47 | 54 | placeholder seed |
| 10 | `93f7a0e0` | 〃 | 10 | 78 | 54 | placeholder seed |
| 11 | `93f7a0e0` | 〃 | 11 | 36 | 54 | placeholder seed |
| 12 | `93f7a0e0` | 〃 | 12 | 116 | 54 | placeholder seed |
| 13 | `93f7a0e0` | 〃 | 13 | 79 | 54 | placeholder seed |
| 14 | `c914a0bb` | Kendo Philosophy: The Way of the Sword | 0 | 28 | 76 | **real prose translation** |
| 15 | `c914a0bb` | 〃 | 1 | 0 | 175 | empty source, agent meta-commentary in target |
| 16 | `c914a0bb` | 〃 | 2 | 0 | 160 | empty source, agent meta-commentary in target |

So **only two rows out of 16 carry usable real-target translations**: row 1
(article `93f7a0e0`, position 0) and row 14 (article `c914a0bb`, position 0).
The other 14 are seed placeholders or empty-source meta-rows.

#### B.3 Candidate evaluation

Both real-target rows are evaluated as the running example for translate.

##### Candidate A — `c914a0bb` position 0

- **article_id:** `c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe`
- **article title:** "Kendo Philosophy: The Way of the Sword" (no
  `title_ja`)
- **segment id:** `d644d349-325e-4098-a7b4-0ec2fa7e4318`
- **source:** `剣道は単なる武術ではなく、精神的な修養の道でもあります。`
- **target:** `Kendo is not merely a martial art, but also a path of
  spiritual cultivation.`
- **Pros.**
  - Self-contained, grammatically simple JA sentence.
  - Hits four populated `terminology` entries: 剣道 (kendō), 武術 (bujutsu),
    修養 (no entry, will need a `[T/N]` — useful demo of the
    not-in-dictionary path from §A.2.4), 道 (dō).
  - Target translation is clean, idiomatic, faithful — a believable
    human-accepted final state.
  - Article is short (`segment_count = 3`) and segmented, so the full doc
    fits inside the prompt; convenient for W3's hierarchical context
    walkthrough.
- **Cons.**
  - Only 3 segments in the whole article; "surrounding segments" context
    radius is shallow. Positions 1 and 2 are empty-source meta-rows, which
    means the natural neighbour-list is degenerate.
  - No `title_ja` — Japanese article-level context is thin.
  - Article appears to be a synthetic demo, not a real KENDOJIDAI piece
    (translation_status was `draft`; structure is unusual).

##### Candidate B — `93f7a0e0` position 0

- **article_id:** `93f7a0e0-a669-43cf-9a06-8f942b9479e8`
- **article title:** `相手の心を動かす仕かけとは（清野 忍）` (both `title` and
  `title_ja` populated identically — same string)
- **segment id:** `f523bffc-5dc5-4b49-859b-99898b6389ea`
- **source:** `Tweet\n\nPocket\n\n2025.12　KENDOJIDAI\n\n写真＝西口邦彦\n\n構成＝土屋智弘\n\n*本記事に掲載された画像の無断転載・使用を固く禁じます。`
- **target:** `Tweet\n\nPocket\n\nDecember 2025 | KENDOJIDAI\n\nPhotography:
  Kunihiko Nishiguchi\n\nText & Composition: Tomohiro Tsuchiya\n\n*Unauthorized
  reproduction or use of the images featured in this article is strictly
  prohibited.`
- **Pros.**
  - Real KENDOJIDAI article structure. 86 segments total — plenty of
    neighbour radius for W3's hierarchical context.
  - Title contains a Japanese-language piece of editorial flavour for
    document-level context.
- **Cons.**
  - Source is **metadata / boilerplate**, not prose. Date, photographer,
    composer, copyright notice. Translating it does not exercise any kendo
    terminology, sentence-boundary handling, philosophical tone, or
    first-occurrence annotation policy.
  - Almost no value as a running example for the conventions in Appendix A.
  - The downstream segments (positions 2–13) are not really translated; they
    are wave-2 advance-probe placeholders, so the running example cannot be
    "show real article state evolving" — only "show the agent translating
    this single non-representative metadata segment."

#### B.4 Recommendation

**Candidate A.** Despite its short article context, it is the only segment in
the database that:

- has substantive linguistic content,
- has a clean, idiomatic human-accepted target,
- exercises terminology lookup against the populated `terminology` table,
- exercises the `[T/N: term not in dictionary]` path (for 修養),
- and reads naturally as a "real Kendo book sentence" for the reader.

Synthesize all downstream walkthrough states (edit / proofread / QA) on top of
this real translate state, marking each `[SYNTHESIZED]` per D2.

For the W3 hierarchical-context example, since article `c914a0bb` itself is
thin, **augment with a same-domain sibling from `translation_memory`**: the
1,264-row TM is populated with real KENDOJIDAI bilingual content (e.g. rows
matching `source_text ILIKE '%剣道%'` return rich prose paragraphs). The
walkthrough can show the context builder retrieving a TM neighbour from a
different article as a real example of "broader corpus context," explicitly
marked as cross-article retrieval rather than same-article-neighbour
retrieval.

#### B.5 Concrete data block for W8 to consume

```text
ARTICLE
  id:            c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe
  title:         Kendo Philosophy: The Way of the Sword
  title_ja:      (null)
  segment_count: 3
  segmented:     true
  translation_status: draft

SEGMENT (running example)
  id:            d644d349-325e-4098-a7b4-0ec2fa7e4318
  article_id:    c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe
  position:      0
  status:        translated
  source_text:   剣道は単なる武術ではなく、精神的な修養の道でもあります。
  target_text:   Kendo is not merely a martial art, but also a path of spiritual cultivation.

TERMINOLOGY HITS (from terminology table, real)
  剣道 → kendō    — "The way of the sword."
  武術 → bujutsu  — "Martial art" or "military art."
  道   → dō (1)   — "The way", i.e. a way of enlightenment …
  修養 → (not found in terminology table — emits [T/N: shūyō — spiritual cultivation])

CROSS-ARTICLE TM CONTEXT (example, real row from translation_memory)
  source_text: [JA] 伸びる剣道の法則（笠村浩二）
  target_text: <multi-paragraph KENDOJIDAI body containing 剣道 in context>
  domain:      kendo
  quality:     silver
  human_approved: false
```

W8 should treat this block as the canonical input. All downstream walkthrough
states are derived from it and marked `[SYNTHESIZED]`.

#### B.6 Schema discoveries with downstream impact

These corrections to schema knowledge must propagate to W7 (memory DB
design) and W12 (refresh `DEV-STATE-2026-05-20.md`):

- `articles` (not `documents`): `id, title, title_ja, content_ja, content_en,
  source_url, source_url_ja, source_url_en, tags[], translation_status,
  quality_score, match_score, segmented, segment_count, translator_id,
  created_at, updated_at`.
- `segments`: `id, article_id, position (not segment_index), source_text,
  target_text, source_lang, target_lang, status, locked_by, locked_at,
  translated_by, reviewed_by, quality_detail JSONB, metadata JSONB,
  created_at, updated_at`. **No CHECK constraint visible at column-info
  level; in practice only `{draft, translated}` are observed.**
- `terminology` (920 rows): `id, source_term, target_term, reading, domain,
  term_type, notes, created_at`. Already populated for kendo domain;
  `term_type` distinguishes `preferred` from likely alternates.
- `translation_memory` (1,264 rows): `id, source_text, target_text,
  source_lang, target_lang, domain, quality, human_approved, source_url,
  embedding (USER-DEFINED, pgvector), source_tsv (tsvector), created_by,
  article_id, usage_count, last_used_at, created_at, updated_at`. Has
  embedding-based and full-text search infrastructure ready. **W7 should
  treat this as the starting point, not propose building from scratch.**
- `agent_prompts` (1 row): `id, user_id, agent_type, approach, template,
  created_at, updated_at`. Existing prompt-storage scheme. W6 may extend
  this schema rather than design a new one.
- `segment_revisions` (1 row), `segment_phase_transitions` (12 rows): audit
  trails exist but are barely populated.

These findings materially change the framing of TODO 4. The work is not
"build a memory DB from scratch" but **"document the memory tables that
already exist, extend them where MAC-RAG needs more, and define the
context-builder's query interface against them."** This may warrant
revisiting D1 (currently "full from-scratch design") — flagged as **NEW
DECISION D6** at end of this appendix.

#### B.7 New decision raised by this appendix

**D6 — Memory DB framing in W7, given existing tables.**

- Option A: keep W7 as "full from-scratch design," position the existing
  `translation_memory` / `terminology` / `agent_prompts` tables as
  prior-art-to-be-superseded.
- Option B (recommended): retarget W7 as "**extension** design — document the
  existing schemas, identify gaps for MAC-RAG's context-builder needs,
  propose additions (new tables or columns) without removing what is
  already there."
- Option C: split W7 into two units — W7a (document & evaluate existing
  memory tables) → W7b (gap-fill design).

This is a user-blocking decision for W7. It does **not** block W3, W4, W5,
W6, W8.

---

End of plan.
