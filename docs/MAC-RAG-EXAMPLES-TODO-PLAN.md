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
W1  research:  read gemini_kendo_book_translator prompts            (TODO 6)
W2  research:  pick a real DB segment to use as running example     (TODO 5)
W3  doc:       hierarchical context model — Phase 0 rewrite         (TODO 1)
W4  doc:       Context Builder Panel as explicit pipeline step      (TODO 2)
W5  doc:       prose-first [HUMAN SEES] rewrite across all 4 tasks  (TODO 3)
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

### W5 — Prose-first `[HUMAN SEES]` rewrite (TODO 3)

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

## 7. Appendices (populated as work units execute)

- **Appendix A — W1 findings: prompt conventions in
  `_references/gemini_kendo_book_translator`.** Empty.
- **Appendix B — W2 findings: real DB segment candidates.** Empty.

End of plan.
