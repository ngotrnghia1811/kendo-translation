# MAC-RAG: A Generic 5-Phase RAG Pipeline for Cooperation Tasks

MAC-RAG (**M**ulti-**A**spect **C**ontextual **R**etrieval-**A**ugmented
**G**eneration) is the platform's general-purpose pipeline for any task
where an LLM agent contributes a suggestion to a human-led cooperation
workflow. It produces context-aware, multi-candidate, quality-scored
suggestions for **translate**, **edit**, **proofread**, and **QA-advisory**
tasks.

This document describes:

1. The generic 5-phase pipeline template (task-agnostic).
2. Four concrete task instantiations.
3. The plan to subsume today's lightweight per-phase agents.
4. The implementation-gap map between this design and current code.
5. A short worked example for each task.

The original translation-only canonical reference is
`docs/mac_rag_implementation_plan.md` (v1.0). This document **supersedes**
the translation-only framing while preserving its 5-phase structure.

> **Scope reminder.** MAC-RAG produces *suggestions*. Acceptance, rejection,
> and the actual edits to `segments.target_text` are always human decisions
> mediated by the cooperation surface (`segment_suggestions`, soft-lock
> editing, phase advance, comments). MAC-RAG never bypasses the human.

---

## 1. Why generalize

Today the codebase has two parallel agent paths:

- **MAC-RAG** (`app/api/translate/mac-rag/route.ts`) — heavy, multi-stage,
  multi-candidate, retrieval-augmented. Translate only.
- **Per-phase agents** (`app/api/agents/[phase]/route.ts` +
  `lib/agents/phase-prompts.ts`) — one LLM call, no retrieval, no
  candidates, no scoring. Translate / edit / proofread.

These differ in **how much pipeline machinery they apply**, not in *what
kind of task* they perform. Both produce a single text suggestion for a
single segment. The asymmetry is accidental: MAC-RAG was ported as a
translation system; per-phase agents were added later as a fast path for
edit and proofread.

A single pipeline that **parameterises by task** lets us:

- Give edit, proofread, and QA the same retrieval-augmented quality MAC-RAG
  gives translate.
- Stop maintaining two divergent paths.
- Make the "agent contribution" surface uniform: every agent call goes
  through the same 5-phase template, with task-specific plug-points.
- Open the door to a real **Phase 4b** (memory update) shared across all
  tasks — the largest current gap.

---

## 2. The generic 5-phase template

```
┌────────────────────────────────────────────────────────────────────────┐
│                         GENERIC MAC-RAG PIPELINE                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  PRE-PRODUCTION    │→ │   PRODUCTION     │→ │  POST-PRODUCTION   │  │
│  │  (Phases 0–2)      │  │   (Phase 3)      │  │  (Phase 4)         │  │
│  ├────────────────────┤  ├──────────────────┤  ├────────────────────┤  │
│  │ 0. Context Init    │  │ 3. Multi-cand.   │  │ 4a. Quality Assess │  │
│  │ 1. RAG Retrieval   │  │   Generation     │  │ 4b. Memory Update  │  │
│  │ 2. Context Pairing │  │   (task-specific │  │   (task-specific   │  │
│  │ → user reviews ctx │  │    generator)    │  │    evaluator+save) │  │
│  └────────────────────┘  └──────────────────┘  └────────────────────┘  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

The five inner phases are task-agnostic in **structure** and task-specific
in **content**. Each phase has a generic contract:

### Phase 0 — Context Initialization

**Generic contract.** Build a `ContextObject` from the task input. The
`ContextObject` is structured as a four-level **hierarchical context
model** — each level a strictly broader scope of grounding. Phase 0 is
responsible for materialising L1 and L2 directly from the segment and its
article; L3 and L4 are deferred to Phase 1 retrieval (they require
cross-segment / cross-article queries).

**The four levels.**

| Level | Name              | Scope                                      | Phase   | Purpose                                              |
|-------|-------------------|--------------------------------------------|---------|------------------------------------------------------|
| L1    | Segment-local     | The segment itself (source ± current target) | Phase 0 | Domain, style, entities, key terms, task-specific signals on the unit of work |
| L2    | Article-local     | Sibling segments in the same `articles` row | Phase 0 | Adjacent prose for register / consistency / co-reference; degrades to L4 escalation when sparse |
| L3    | Project-corpus    | All accepted segments across articles in the project | Phase 1 | TM neighbours, terminology in active use, prior phase transitions |
| L4    | External / cross-domain | TM/terminology beyond the project, Wikidata, domain corpora | Phase 1 | Fallback when L1–L3 are thin; brings in canonical renderings and entity anchors |

L2 may be **degenerate** (e.g., an article with two empty-source meta
segments and one real segment). When degenerate, Phase 2 must flag the
gap and mandate L4 escalation. See `docs/MAC-RAG-EXAMPLES.md`
"Phase 0 — Hierarchical Context Model" for the worked taxonomy.

**Task plug-points.**
- Which inputs the task receives at L1 (source text only, source+target,
  source+target+notes, etc.).
- Which task-specific signals matter at L1 (e.g., honorific level for
  translate; consistency targets for edit; surface-form rules for
  proofread; quality dimensions for QA).
- Which L2 signals matter (adjacent target renderings for edit/proofread;
  adjacent source register for translate).

### Phase 1 — RAG Retrieval

**Generic contract.** In parallel, retrieve everything that might inform the
task from N sources, each with its own relevancy threshold. Phase 1 is
where **L3 (project-corpus)** and **L4 (external / cross-domain)** are
materialised; L1/L2 are direct lookups owned by Phase 0 and need no
retrieval.

**Generic source taxonomy** (the canonical four, extensible). Each source
maps to one or more hierarchy levels:

| Source           | Query method                | Level(s) | Purpose                                  |
|------------------|------------------------------|----------|------------------------------------------|
| Translation Memory | Lexical or semantic match  | L3 (in-project) + L4 (cross-project) | Prior accepted text in same language pair |
| Terminology DB   | Exact + fuzzy term match     | L3 (project-curated) + L4 (canonical) | Required/forbidden/preferred renderings   |
| Domain Corpus    | Semantic similarity          | L4       | Domain prose for style and pattern grounding |
| Cross-Lingual KB | Entity lookup                | L4       | Wikidata/Wikipedia anchors for proper nouns |

**Task plug-points.**
- Which sources are relevant (translate uses all four; proofread mainly
  uses TM + style guide; QA uses prior QA-flagged segments).
- Which thresholds (translate cares about ≥70% TM; proofread can use ≥50%).
- Which **L4 channels** are appropriate for the task (translate: TM
  neighbours + Wikidata; edit: parallel-renderings TM; proofread: style
  guide; QA: past `qa_issues` patterns).
- Optional task-specific retrieval sources (e.g., edit pulls the segment's
  own revision history as an L1-extension; QA pulls past `qa_issues` for
  similar segments as an L3/L4 signal).

### Phase 2 — Context Pairing

**Generic contract.** Weight, align, gap-detect, and synthesize the
retrieval results into a single prompt-ready context. Produce a
`CoverageReport`. Surface this to the user via the **Context Builder
Panel** (gap today — see § 5) so the human can edit, remove, or add
context before Phase 3 fires.

**Task plug-points.**
- Weighting heuristics (recency matters more for proofread style; quality
  score matters more for translate).
- What counts as a "gap" (missing terminology is a translate-gap; missing
  surface-form rule is a proofread-gap; missing prior QA issue is a QA-gap).

### Phase 3 — Multi-Candidate Generation

**Generic contract.** Generate **N candidates in parallel**, each driven by
a distinct **approach**. Return them with confidence, and pick a
`recommendedIndex`. The approaches express *how* the task can be done, not
*what* it does.

**Task plug-points (canonical approach sets).**

| Task        | Approaches                                       | Recommended default |
|-------------|--------------------------------------------------|---------------------|
| translate   | `literal` / `natural` / `formal`                 | `natural`           |
| edit        | `light_touch` / `accuracy_focus` / `fluency_focus` | `accuracy_focus`  |
| proofread   | `conservative` / `standard` / `house_style`      | `standard`          |
| QA-advisory | (single pass, N=1; not really "candidates") `issue_scan` | n/a            |

For QA the abstraction degrades gracefully: Phase 3 generates one
artefact — a list of issues — rather than three text candidates.

### Phase 4a — Quality Assessment

**Generic contract.** Evaluate the recommended (or user-supplied) Phase 3
output along **task-specific dimensions** with **task-specific weights**.
Produce `scores`, `issues`, `routing`, `summary`.

**Task plug-points (canonical dimension sets).**

| Task        | Dimensions (weights)                                                |
|-------------|---------------------------------------------------------------------|
| translate   | Fluency 0.30 / Adequacy 0.35 / Terminology 0.20 / Style 0.15        |
| edit        | Accuracy-improvement 0.40 / Fluency-preservation 0.25 / Minimal-change 0.20 / Terminology 0.15 |
| proofread   | Surface-correctness 0.50 / Consistency 0.30 / Meaning-preservation 0.20 |
| QA-advisory | Issue-recall 0.50 / False-positive-rate 0.30 / Severity-calibration 0.20 (computed differently — see § 3.4) |

Routing is the same 5-band map (`auto_accept` / `light_pe` / `standard_pe`
/ `full_revision` / `reject`) but the bands' *meaning* is task-specific:
`auto_accept` for translate means "save and advance"; for QA-advisory it
means "the issue list is trustworthy."

### Phase 4b — Memory Update

**Generic contract.** Human-controlled write-back to the cooperation
surface and learning stores. Per-task choices:

- Save the produced artefact (translation pair / edited target / proofread
  target / QA issues) to its appropriate persistent store.
- Promote new task-specific signals (new terminology / new style rule /
  new QA pattern) to the appropriate database.
- Record which retrieved context elements were actually helpful, to
  improve future retrieval relevancy scoring.

**Task plug-points.**
- Which tables to write (translate: `translation_memory` + `terminology`;
  edit/proofread: revisions only; QA: `qa_issues`).
- What promotion rules apply (translate: only TM-save above quality 0.85;
  QA: human must confirm each issue before write).

---

## 3. The four task instantiations

Each instantiation is the generic template specialised at the
plug-points listed in § 2. Code today implements translate as a heavy
MAC-RAG and edit/proofread as one-shot agents; QA has no agent. After
subsumption, all four follow this template.

### 3.1 Translate

| Phase | Behaviour                                                          |
|-------|--------------------------------------------------------------------|
| 0     | Build `ContextObject`. **L1**: source text, domain, style, keigo level, entities, key terms. **L2**: sibling segments in the same article for register continuity. |
| 1     | **L3/L4** in parallel: TM + Terminology + Domain Corpus + Cross-Lingual KB. JA-side analysis via `ja-en-agent.ts` runs alongside. L4 channels: cross-article TM neighbours, Wikidata entity lookups. |
| 2     | Weight TM by match%/recency/domain; weight terms by type (required > do-not-translate > preferred); flag missing terminology gaps; mandate L4 escalation when L2 is degenerate. |
| 3     | 3 candidates: `literal` / `natural` / `formal`. Default recommended: `natural`. |
| 4a    | LLM-scored 4-dim quality (0.30/0.35/0.20/0.15). |
| 4b    | Save TM pair (gated by quality threshold); promote new terms; record helpful context. |

**Writes to cooperation surface.** Phase 3 output should write a
`segment_suggestions` row with `suggester_kind='agent'`. (Today MAC-RAG
stamps the editor directly — see § 5.)

### 3.2 Edit

| Phase | Behaviour                                                          |
|-------|--------------------------------------------------------------------|
| 0     | Build `ContextObject`. **L1**: source + current target; detect divergence hotspots between source meaning and target rendering. **L2**: sibling segments for adjacent rendering patterns. |
| 1     | **L3/L4**: TM (for parallel renderings of same source) + Terminology + the segment's **own revision history** (L1-extension retrieval source). |
| 2     | Weight prior edits to similar segments; flag accuracy gaps where target may diverge from source meaning. |
| 3     | 3 candidates: `light_touch` (minimal change) / `accuracy_focus` (correct meaning errors) / `fluency_focus` (improve readability). Default: `accuracy_focus`. |
| 4a    | LLM-scored 4-dim: Accuracy-improvement 0.40 / Fluency-preservation 0.25 / Minimal-change 0.20 / Terminology 0.15. |
| 4b    | Promote any new term mappings observed in the edit; record helpful context. No TM save (edits aren't first translations). |

**Writes to cooperation surface.** `segment_suggestions` row,
`suggester_kind='agent'`, on a segment whose status is `translated`.

### 3.3 Proofread

| Phase | Behaviour                                                          |
|-------|--------------------------------------------------------------------|
| 0     | Build `ContextObject`. **L1**: source + current target; capture house-style signals (capitalization, punctuation). **L2**: sibling segments for cross-segment surface-form consistency (e.g., 'datotsu' vs. 'Datotsu' in neighbours). |
| 1     | **L3/L4**: TM (for surface-form precedent) + **Style Guide** (new L4 retrieval source — capitalisation, italics for romanizations, punctuation). |
| 2     | Weight style-guide entries by directness of match; flag consistency gaps (e.g., "men" vs. "*men*" used inconsistently in adjacent segments). |
| 3     | 3 candidates: `conservative` (touch nothing semantic) / `standard` (apply house style) / `house_style` (aggressive normalisation). Default: `standard`. |
| 4a    | LLM-scored 3-dim: Surface-correctness 0.50 / Consistency 0.30 / Meaning-preservation 0.20. |
| 4b    | Promote any new style-guide rule observed; record helpful context. |

**Writes to cooperation surface.** `segment_suggestions` row,
`suggester_kind='agent'`, on a segment whose status is `edited`.

### 3.4 QA-advisory

QA-advisory is the unusual instantiation: it generates **issues**, not
text, and it is strictly **advisory** to the human QA gate.

| Phase | Behaviour                                                          |
|-------|--------------------------------------------------------------------|
| 0     | Build `ContextObject`. **L1**: source + final target; identify QA risk signals (numbers, names, terminology, register shifts). **L2**: sibling segments for cross-segment QA-risk patterns. |
| 1     | **L3/L4**: source segment + final target + **past `qa_issues` for similar segments** (new L3/L4 retrieval source) + Terminology + Style Guide. |
| 2     | Weight past QA issues by similarity; flag any unresolved-prior-issue gaps. |
| 3     | **Single pass** (`approaches: ['issue_scan']`, N=1). LLM produces a structured list of `{ type, severity, location, description, suggestion }` issues. No multi-candidate. |
| 4a    | Score the *issue list itself*: Issue-recall (estimate vs. plausible-true-issues), False-positive-rate (LLM self-critique of each issue), Severity-calibration (do severities match historical patterns). |
| 4b    | Human reviews each issue: confirm → write to `qa_issues` table; dismiss → record dismissal as helpful-context-feedback. Human **alone** advances `qa_approved`. |

**Cooperation surface contract.**
- QA-advisory **never** advances a segment to `qa_approved`. Only the
  human can, via `POST /api/segments/[id]/advance-phase`.
- QA-advisory writes **no** `segment_suggestions` rows. Issues land in
  `qa_issues` after human confirmation, not before.
- Multiple advisory runs are allowed; the human can re-run before deciding.

This satisfies the cooperation-first principle from `docs/VISION.md`: the
agent is a **second opinion** for the human QA reviewer, not a gate.

---

## 4. Subsuming the per-phase agents

Today's `app/api/agents/[phase]/route.ts` + `lib/agents/phase-prompts.ts`
implements translate / edit / proofread as **one-LLM-call agents with no
retrieval and no scoring** — essentially Phase 3 alone, with no Phase 0–2
and no Phase 4. They write `segment_suggestions` rows.

The generalized MAC-RAG **subsumes** these: each per-phase agent becomes
the Phase-3 generator of its task's MAC-RAG instantiation. The other four
phases (Context Init, RAG Retrieval, Context Pairing, Quality+Memory) wrap
around the existing prompt to provide context grounding and quality
feedback.

### Migration path

1. **Keep one shared route surface.** Replace `POST /api/agents/[phase]`
   and `POST /api/translate/mac-rag` with a single `POST /api/mac-rag`
   accepting `{ task: 'translate'|'edit'|'proofread'|'qa', segmentId, ... }`.
   Old routes stay as thin shims that call the new one with `task=<phase>`
   for one release, then are removed.
2. **Move per-task plug-points to a registry.** A `lib/mac-rag/tasks/`
   directory with one file per task, exporting `{ phase0, phase1Sources,
   phase2Weights, phase3Approaches, phase3Prompts, phase4Dimensions,
   phase4bWriter }`. The route is a thin dispatcher over this registry.
3. **Phase 3 prompts unify with the current per-phase ones.** The current
   `translatePrompt` / `editPrompt` / `proofreadPrompt` become the
   default `phase3Prompts` for each task; MAC-RAG enriches the user
   message with Phase 0–2 context (TM matches, terminology constraints,
   coverage hints) on top of the existing prompt.
4. **All four tasks write to `segment_suggestions`** (except QA, which
   writes to `qa_issues` after human confirmation). The contract for
   acceptance/rejection stays identical: human accepts a suggestion via
   the existing accept/reject endpoints.
5. **Quality-aware acceptance is opt-in.** A high-quality auto_accept
   suggestion can be auto-accepted *only if* the document's policy
   permits (`document.policy.auto_accept_threshold`, new field, defaults
   to off). Without that, MAC-RAG quality scores remain advisory and the
   human always clicks accept.

### What this buys us

- Edit / proofread / QA become as grounded as translate: TM-aware,
  terminology-aware, style-aware.
- The `qa_issues` table — currently unused — gets a producer.
- The "agent vs MAC-RAG" choice the user faces today disappears. There is
  one agent surface; how heavy it runs is a per-task internal detail.
- Phase 4b memory updates apply uniformly: every task can promote new
  signals back into the retrieval substrate.

---

## 5. Implementation-gap map

What exists today vs. what the generalized design needs.

### Cross-cutting

| Concern                  | Today                                      | Needed for generalization                          |
|--------------------------|--------------------------------------------|----------------------------------------------------|
| Unified route surface    | Two routes (MAC-RAG, per-phase agents)     | One route `/api/mac-rag` parameterised by `task`   |
| Task registry            | None                                       | `lib/mac-rag/tasks/{translate,edit,proofread,qa}.ts` |
| Context Builder Panel UI | None                                       | UI surface to review/edit Phase 0–2 output         |
| Translation Candidates UI | Inline buttons in segment editor          | Generic Candidates UI usable for all tasks         |
| Post-Production Panel UI | None                                       | UI for Phase 4b memory-update decisions            |
| Phase 4b endpoint        | None                                       | `POST /api/mac-rag/save` (per-task writers)         |

### Per-task gaps

| Task        | What works today                            | What's missing                                       |
|-------------|---------------------------------------------|------------------------------------------------------|
| translate   | Phase 0–3 + 4a (no 4b)                      | Phase 4b memory write; full embeddings-based TM ranking on top of the existing `pgvector` column; Cross-Lingual KB (Wikidata) lookup; **L2-degenerate detection** that mandates L4 escalation when sibling segments are sparse |
| edit        | Phase 3 only (single LLM call)              | Phases 0, 1, 2, 4a, 4b; revision-history retrieval; edit-specific quality dimensions |
| proofread   | Phase 3 only (single LLM call)              | Phases 0, 1, 2, 4a, 4b; style-guide retrieval source; proofread-specific quality dimensions |
| QA-advisory | Nothing (no agent today)                    | Entire pipeline; `qa_issues` similarity retrieval; issue-list scorer; human-confirmation UI for write-back |

### Retrieval substrate (corrects earlier framing)

The pgvector and terminology substrates already exist; the gap is in
*ranking and integration*, not in *presence*:

- `translation_memory` (1,264 rows) has an `embedding pgvector` column and
  a `source_tsv tsvector` column. Today MAC-RAG uses lexical/tsvector
  ranking; embedding-based ranking is plumbed in schema but not in
  retrieval code.
- `terminology` (920 rows) is populated and queryable; the L3 channel is
  live.
- **Domain Corpus** as a *separate* L4 source (beyond cross-article TM
  neighbours) and **Cross-Lingual KB** (Wikidata) remain not implemented.
  The earlier framing of "Domain Corpus missing" should be read as
  "missing as a *distinct* L4 retrieval source separate from cross-article
  TM" — basic in-project corpus access via TM is live.

### Database

The schema already supports the generalization:

- `segment_suggestions(suggester_kind ∈ {human, agent})` — accepts agent
  rows for any task that produces text.
- `qa_issues` — exists, currently unused; QA-advisory's write target.
- `translation_memory`, `terminology` — exist; need a new `style_guide`
  table for proofread and a `qa_issue_patterns` view (or table) for QA
  retrieval.

### Priority

In order of leverage:

1. **Phase 4b for translate** (highest single gap; closes the learning loop).
2. **Unified route + task registry** (the structural prerequisite for
   anything else).
3. **Edit / proofread MAC-RAG-ification** (turns one-shot agents into
   grounded suggestions).
4. **QA-advisory** (new functionality; needs `qa_issues` UI).
5. **Phase 1 retrieval gaps** (Domain Corpus, Cross-Lingual KB,
   embeddings-based TM, style guide).
6. **The three User Panels** (Context Builder, Candidates, Post-Production).

---

## 6. Worked examples — one per task

Each example uses a short, fictional but plausible kendo segment and
shows the structural shape of each phase. Actual LLM output will vary.

### 6.1 Translate

**Source (ja):** 打突の機会を見逃さず、間合いを詰める。
**Status precondition:** `draft`. **Status postcondition:** `translated`
(after human accepts).

```
Phase 0 — Context (L1 + L2)
  L1 (segment-local):
    domain: kendo (0.94)   style: formal/instructional/teineigo
    entities: [打突, 間合い]    keyTerms: [打突, 間合い]
  L2 (article-local):
    sibling segments scanned for register/keigo continuity

Phase 1 — Retrieval (L3 + L4)
  TM (L3):   "打突の機会を捉える" → "seize the opportunity to strike" (78%)
  Terms (L3): required(間合い→maai); do-not-translate(剣道, 道場)
  Corpus (L4):    [GAP — not implemented as distinct source]
  Cross-KB (L4):  [GAP — not implemented]

Phase 2 — Pairing
  promptContext built; coverageReport: overall=0.85, no gaps

Phase 3 — Candidates (recommended: natural)
  literal:  "Without missing the opportunity for datotsu, close the maai."
  natural:  "Seize every opportunity for datotsu and close the maai."   ★
  formal:   "Let no opportunity for datotsu pass; close the maai."

Phase 4a — Quality
  fluency 0.92, adequacy 0.86, terminology 0.95, style 0.82 → overall 0.882
  routing: light_pe

Phase 4b — Memory (CURRENTLY MISSING)
  would offer: save TM pair (q=0.88)? promote 打突→datotsu? record TM[0] helpful?

Cooperation write
  segment_suggestions row inserted (suggester_kind='agent', proposed_text=★)
  human reviews and accepts → segments.target_text PATCHed via soft-lock
```

### 6.2 Edit

**Source (ja):** 打突の機会を見逃さず、間合いを詰める。
**Current target (en):** "Don't miss the chance to hit. Close the distance."
**Status precondition:** `translated`. **Status postcondition:** `edited`.

```
Phase 0 — Context (L1 + L2)
  L1 (segment-local):
    domain: kendo   style: formal/instructional
    detected target weaknesses: "chance to hit" undertranslates 打突;
                                "distance" untransliterated for 間合い
  L2 (article-local):
    sibling segments scanned for adjacent target renderings

Phase 1 — Retrieval (L3 + L4)
  TM (L3):           same as translate
  Terms (L3):        required(間合い→maai); preferred(打突→datotsu)
  Revision history:  [L1-extension — segment's prior edits, none yet]

Phase 2 — Pairing
  flag: target uses "distance" where terminology requires "maai"
  flag: "chance to hit" is fluent but undertranslates 打突

Phase 3 — Candidates (recommended: accuracy_focus)
  light_touch:     "Don't miss the chance for a datotsu strike. Close the maai."
  accuracy_focus:  "Without missing the opportunity for datotsu, close the maai." ★
  fluency_focus:   "Never let an opportunity for datotsu pass; close the maai."

Phase 4a — Quality
  accuracy-improvement 0.85, fluency-preservation 0.90,
  minimal-change 0.45, terminology 0.95 → overall (weighted) 0.79
  routing: standard_pe

Phase 4b — Memory
  promote: 打突→datotsu as preferred (already preferred); no TM save (this is an edit)

Cooperation write
  segment_suggestions row inserted (kind='agent', proposed_text=★)
  human accepts → editor PATCHes target_text → status advances to edited
```

### 6.3 Proofread

**Source (ja):** 打突の機会を見逃さず、間合いを詰める。
**Current target (en):** "Without missing the opportunity for Datotsu, close the Maai."
**Status precondition:** `edited`. **Status postcondition:** `proofread`.

```
Phase 0 — Context (L1 + L2)
  L1 (segment-local):
    detected surface issues: 'Datotsu' and 'Maai' capitalised mid-sentence;
                              kendo romanizations should be lowercased
  L2 (article-local):
    cross-segment consistency check: 'datotsu' vs. 'Datotsu' in neighbours

Phase 1 — Retrieval (L3 + L4)
  TM (L3):           neighbouring segments use 'datotsu' (lowercase) consistently
  Terms (L3):        capitalisation rule: kendo romanizations lowercase
  Style Guide (L4):  [new source — italicise romanizations on first mention only]

Phase 2 — Pairing
  flag: cross-segment inconsistency (Datotsu vs datotsu)

Phase 3 — Candidates (recommended: standard)
  conservative:  "Without missing the opportunity for Datotsu, close the Maai."
  standard:      "Without missing the opportunity for datotsu, close the maai." ★
  house_style:   "Without missing the opportunity for *datotsu*, close the *maai*."

Phase 4a — Quality
  surface-correctness 0.98, consistency 0.95, meaning-preservation 1.0
  → overall 0.975
  routing: auto_accept

Phase 4b — Memory
  promote new style rule? no (already encoded)
  record TM[0]/[1] (neighbouring segments) as helpful

Cooperation write
  segment_suggestions row inserted (kind='agent', proposed_text=★)
  policy permits auto_accept (overall ≥ 0.95)? if yes, auto-PATCH and advance;
  otherwise human accepts → status advances to proofread
```

### 6.4 QA-advisory

**Source (ja):** 打突の機会を見逃さず、間合いを詰める。
**Final target (en):** "Without missing the opportunity for datotsu, close the maai."
**Status precondition:** `proofread`. **Status postcondition:** unchanged
(still `proofread`); only human can advance to `qa_approved`.

```
Phase 0 — Context (L1 + L2)
  L1 (segment-local):
    source/target parallel; QA risk signals: technical terms, no numerals,
                                              no proper names, no register shift
  L2 (article-local):
    sibling segments scanned for cross-segment QA-risk patterns

Phase 1 — Retrieval (L3 + L4)
  Past qa_issues (L3/L4):  none for similar segments yet
  Terms (L3):              required terms all present in target
  Style Guide (L4):        all rules satisfied

Phase 2 — Pairing
  no historical issue patterns; light context

Phase 3 — Generation (N=1, approach='issue_scan')
  Issues:
    []           ← LLM finds nothing material to flag

  -- OR --

  Issues:
    [{ type: 'terminology', severity: 'minor',
       location: 'close the maai',
       description: 'maai not italicised; style guide allows but does not require',
       suggestion: 'consider *maai* for first occurrence' }]

Phase 4a — Quality (of the issue list)
  issue-recall: 0.85 (model self-estimate)
  false-positive-rate: 0.10 (one minor flag, low confidence)
  severity-calibration: 0.95 (severities match historical minor-issue rate)
  → overall 0.86
  routing: light_pe — "trust the issue list, light human review"

Phase 4b — Memory (human-gated)
  QA reviewer sees the issue, confirms or dismisses:
    confirm → INSERT into qa_issues
    dismiss → record dismissal as helpful-context-feedback
  Reviewer **separately** clicks 'Advance to qa_approved' on the segment.

Cooperation write
  no segment_suggestions row.
  qa_issues row only on human confirmation.
  qa_approved status only on human advance.
```

---

## 7. Where MAC-RAG ends

A reminder, post-generalization:

- **MAC-RAG** is the *agent contribution* surface for any cooperation
  task. It produces suggestions, never decisions.
- The **cooperation surface** (`segment_suggestions`, `segment_comments`,
  soft-lock editing, `segment_phase_transitions`, `qa_issues`) owns all
  state changes. Humans drive it; MAC-RAG feeds it.
- The **phase advance** endpoint
  (`POST /api/segments/[id]/advance-phase`) is the only path that
  changes `segments.status`. MAC-RAG cannot call it.
- **Acceptance/rejection** of an agent suggestion is human-only via the
  existing accept/reject endpoints. The single exception, behind an
  explicit per-document policy flag, is auto-accept for very-high-
  quality proofread suggestions — and even that is opt-in.

If you find yourself wiring MAC-RAG to mutate `segments.status` or
`segments.target_text` directly, stop. That's a cooperation-surface call.
