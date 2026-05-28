# MAC-RAG Worked Examples

This document is a companion to `docs/MAC-RAG.md`. Where MAC-RAG.md describes
the **pipeline** abstractly, this document shows what actually happens in a
real session: who clicks what, which API gets called, what the agent
receives, what the agent returns, what the human sees on screen, and what
ends up in the database.

Conventions used throughout:

- `[HUMAN SEES]` — content rendered in the browser at this moment.
- `[HUMAN ACTS]` — an action the human takes (click, type, accept, etc.).
- `[AGENT IN]` — concrete payload sent into a pipeline phase.
- `[AGENT OUT]` — concrete payload returned by that phase.
- `[DB]` — a database write/read that just happened.
- `[GAP]` — the step is in the design but **not yet implemented**.

Strings are illustrative. LLM outputs in real runs will vary in wording but
not in structural shape.

This first edition covers **the translate task only**. Edit, proofread, and
QA-advisory walkthroughs will follow in later additions.

---

## Phase 0 — Hierarchical Context Model

> Addresses TODO 1 (broader context) and the hard dependency from
> `docs/MAC-RAG-EXAMPLES-TODO-PLAN.md` Appendix A.2.5 (first-occurrence
> annotation requires document-scope context).

Every MAC-RAG agent run begins by **assembling context for a single segment**.
"Context" is not just the segment's source text. It is a **four-level
hierarchy**, each level answering a different question:

| Level | Question it answers | Cost/latency | Shown to HUMAN | Shown to AGENT |
|---|---|---|---|---|
| **L1 — Segment** | "What exact text am I working on right now?" | trivial (1 row) | yes (the editor pane) | yes (every phase) |
| **L2 — Neighbour window** | "What did the immediately surrounding text say?" | cheap (≤ 2k segments scan, hot cache) | yes (the editor scrolls; surfaced verbatim above/below) | yes (translate, edit, proofread) |
| **L3 — Article** | "What is the whole piece about; what choices have already been made in it?" | moderate (article metadata + every translated sibling segment) | yes (a collapsible "article context" panel; W4 will make this editable) | yes (translate, edit, proofread, QA) |
| **L4 — Corpus** | "How has this expression been handled elsewhere in our memory?" | costly (pgvector `translation_memory` lookup + `terminology` lookup) | yes (rendered as prose summary, not raw rows — TODO 3) | yes (translate, edit, proofread) |

The walkthroughs that follow this section use **L1 only** in Steps 1–3 today
(that is the current shipped state); the explicit hierarchy laid out here is
what the implementation must converge to. Walkthrough integration is the
follow-up work unit **W3.5** in
`docs/MAC-RAG-EXAMPLES-TODO-PLAN.md`.

### L1 — Segment

The single row from `segments` for the segment currently in focus.

Fields surfaced:

- `segments.id`, `segments.article_id`, `segments.position`,
  `segments.status`.
- `segments.source_text` — the JA sentence to operate on.
- `segments.target_text` — empty for `translate`, populated for downstream
  phases.
- `segments.metadata` (JSONB) — phase-specific notes from prior phases.
- `segments.locked_by`, `segments.locked_at` — soft-lock state (informational
  to the agent; the lock is enforced by the API, not by the prompt).

**Example (running example, from
`docs/MAC-RAG-EXAMPLES-TODO-PLAN.md` Appendix B candidate A):**

```text
id:           d644d349-325e-4098-a7b4-0ec2fa7e4318
article_id:   c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe
position:     0
status:       draft        (state at start of translate)
source_text:  剣道は単なる武術ではなく、精神的な修養の道でもあります。
target_text:  (empty)
```

### L2 — Neighbour window

The ± k segments around the current segment within the same article.

- **Translate / edit / proofread:** k = 2 by default. Both source_text and
  target_text (if any) for each neighbour are surfaced; their `status` is
  surfaced so the agent knows which neighbours are reliable and which are
  still `draft`.
- **QA-advisory:** k = 2 for span context, plus the previous and next
  segments that share a paragraph boundary in `articles.content_ja`.

Fields surfaced per neighbour: `position, status, source_text, target_text`.
Empty-source-text neighbours (article-meta rows) are kept but flagged
`(meta)`.

**Example (running example):**

Article `c914a0bb` has only 3 segments and the current segment is at
`position = 0`, so the natural neighbour-list is `position 1` and `position
2`:

```text
position 1, status=translated, source_text=(empty/meta), target_text="This translation aims to preserve the essence …"  (meta)
position 2, status=translated, source_text=(empty/meta), target_text="The word \"修養\" (shūyō) is translated …"        (meta)
```

When the natural neighbour window is degenerate (as here), the context
builder **must escalate to L4** rather than silently shipping a thin
context — see L4 below.

### L3 — Article

Article-level metadata plus the article-level glossary state.

Fields surfaced:

- `articles.id`, `articles.title`, `articles.title_ja`, `articles.tags[]`,
  `articles.translation_status`, `articles.segment_count`.
- `articles.content_ja` head (first N chars, for chapter-level orientation —
  not the full content).
- `articles.source_url`, `articles.source_url_ja`, `articles.source_url_en`
  (so the agent can recognise the publication context, e.g. KENDOJIDAI).
- **Glossary state:** the set of terms already annotated at first-occurrence
  in this article. This is the field that satisfies Appendix A.2.5. It is
  computed by scanning every `status ∈ {translated, edited, proofread,
  qa_approved}` segment of this article for `*rōmaji* (漢字 — gloss)`
  patterns and listing the rōmaji forms already used. The agent uses this to
  decide whether to annotate or just write the rōmaji.

**Example (running example):**

```text
article.id:                 c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe
article.title:              Kendo Philosophy: The Way of the Sword
article.title_ja:           (null)
article.tags:               (empty)
article.translation_status: draft
article.segment_count:      3
article.glossary_state:     []   (this is segment 0; nothing annotated yet)
```

### L4 — Corpus

Cross-article retrieval from `translation_memory` and `terminology`. This is
the level that satisfies Appendix A.2.4 (dictionary-as-SoT policy) and
Appendix A.2.10(a) (terminology consistency across the corpus).

Retrieval queries:

- **Terminology lookup** — for each kendo-domain term that appears in
  `segments.source_text`, look up `terminology.source_term` exact-match
  first, then `reading` and `target_term` fuzzy-match fallback. Returns
  `source_term, target_term, reading, domain, term_type, notes`.
- **Translation-memory lookup** — `translation_memory` rows filtered by
  `domain = articles.tags` (when set) or `domain = 'kendo'`, ordered by
  (a) tsvector match against `source_text`, then (b) pgvector cosine
  similarity against the embedding of the current segment, then (c)
  `human_approved DESC, quality DESC, usage_count DESC`. Top-N (default 3)
  returned.
- **Article-internal prior translations** — when L2 is degenerate (as in the
  running example), L4 additionally pulls translated rows from other
  articles that share `articles.tags` or have high TM similarity, **flagged
  explicitly as cross-article**.

**Example (running example):**

```text
terminology hits (real rows from `terminology` table):
  剣道 → kendō    "The way of the sword."                        (preferred)
  武術 → bujutsu  "Martial art" or "military art." Bujutsu …      (preferred)
  道   → dō (1)   "The way", i.e. a way of enlightenment …       (preferred)
  修養 → (no entry)                                                → translator note candidate

translation_memory neighbours (real rows, domain=kendo, top-3):
  1. source: [JA] 伸びる剣道の法則（笠村浩二）
     target: <KENDOJIDAI body using 剣道 in philosophical context>
     quality: silver, human_approved: false
  2. source: [JA] 攻撃主体の剣道構築に向けて（竹中健太郎）
     target: <KENDOJIDAI essay using 剣道 in instructional context>
     quality: silver, human_approved: false
  3. source: [JA] 大人開始組のための剣道講座（前編）
     target: <KENDOJIDAI piece using 剣道 in introductory context>
     quality: silver, human_approved: false
```

### How the four levels compose into a single prompt

The context builder concatenates the four levels in order (L1 → L2 → L3 →
L4) into a single human-readable block, wraps it with the
phase-appropriate role card, and emits two outputs:

- **the composed prompt**, sent to the LLM; and
- **the context preview**, rendered as prose in the cooperation surface so
  the HUMAN can see exactly what the agent is being told (TODO 1 + TODO 3).

In a later work unit (**W4**, "Context Builder Panel as explicit pipeline
step"), the HUMAN will also be able to **edit** the composed prompt before
it hits the LLM (TODO 2). W3 (this section) defines only the model. W4
defines the editing surface. W5 defines the prose-rendering rules for the
preview. W7 defines the memory-DB extensions that make L4 queryable
efficiently.

### Mapping levels to phases

| Phase | L1 | L2 | L3 | L4 |
|---|---|---|---|---|
| translate | required | required | required (glossary state critical) | required (TM neighbours + terminology) |
| edit | required | required (style consistency) | required (preserve prior choices) | optional (TM as tie-breaker) |
| proofread | required | required (flow continuity) | required (article-level voice) | optional |
| QA-advisory | required | required (span context) | required (article-level invariants) | not used (QA flags, never proposes) |

This table is the contract that W3.5 (walkthrough integration) will use to
rewrite Steps 1–3 of each walkthrough.

---

## Translate — full walkthrough

### Setup

- Article: `c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe` — *Kendo Philosophy: The Way of the Sword*
  (`title_ja: null`, `segment_count: 3`, `segmented: true`,
  `translation_status: draft`).
- Segment `d644d349-325e-4098-a7b4-0ec2fa7e4318` at `position: 0`.
  Source (ja):

  > 剣道は単なる武術ではなく、精神的な修養の道でもあります。

- Segment status: `draft`. Target text: empty string at the start of
  the walkthrough; the accepted target by Step 12 is the real row in DB.
- Article is assigned for the `translate` phase to user `translator-1`
  (real `profiles` row, role `translator`).
- Article policy: `auto_accept_threshold` unset (default off).

**Note on this article's shape.** Article `c914a0bb` has only three
segments. Position 0 is the running example. Positions 1–2 carry
`source_text = ""` and a translator's commentary in `target_text`
(meta-paragraphs about the translation, not segments to translate).
This is **not** a representative multi-paragraph book chapter — it is
the thinnest possible article — and the walkthrough below makes the
**L2 degeneracy** consequence visible: L2 retrieval returns no usable
neighbour pair, the coverage report flags the gap, and Phase 1
**escalates to L4** for outside context.

---

### Step 1 — Translator opens the editor

`[HUMAN ACTS]` `translator-1` navigates to `/documents/c914a0bb-…/edit`
and scrolls to position 0 — the only translatable segment in this
article.

`[HUMAN SEES]`

```
┌─ Segment d644d349… (position 0) ─────────── status: draft ─┐
│ JA:  剣道は単なる武術ではなく、精神的な修養の道でもあります。│
│ EN:  (empty)                                                │
│                                                             │
│ [ ✎ Edit ]  [ 🤖 Suggest with agent ]  [ 💬 Comment ]      │
└─────────────────────────────────────────────────────────────┘
```

No agent suggestions exist yet for this segment, so the SuggestionPanel
shows "No suggestions yet."

---

### Step 2 — Translator requests an agent suggestion

`[HUMAN ACTS]` Clicks **🤖 Suggest with agent**.

The client hook `useMacRag` POSTs to the orchestrator. In the current code
this is `POST /api/translate/mac-rag` with `phase: 'full'`. In the
generalized design this will be `POST /api/mac-rag` with `task: 'translate'`.

`[AGENT IN]` (request body, current shape)

```json
{
  "phase": "full",
  "segmentId": "d644d349-325e-4098-a7b4-0ec2fa7e4318",
  "documentId": "c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe",
  "sourceText": "剣道は単なる武術ではなく、精神的な修養の道でもあります。",
  "sourceLang": "ja",
  "targetLang": "en",
  "userOverrides": null
}
```

`[HUMAN SEES]` The "Suggest with agent" button becomes a spinner labelled
`Running MAC-RAG…` and the SuggestionPanel renders a placeholder skeleton.

This single request kicks off Phases 0 → 1 → 2 → 3 → 4a on the server. The
human waits (typically 8–20 s). The human does **not** see intermediate
phase output; only the final candidates and quality summary.

---

### Step 3 — Phase 0: Context Initialization

Server-side. `lib/context/context-builder.ts` inspects the source segment
and the document. Phase 0 materialises the **L1 (segment-local)** and
**L2 (article-local)** layers of the hierarchical context model
(see "Phase 0 — Hierarchical Context Model" above).

`[AGENT IN]`

```json
{ "sourceText": "剣道は単なる武術ではなく、精神的な修養の道でもあります。",
  "documentId": "c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe",
  "segmentId":  "d644d349-325e-4098-a7b4-0ec2fa7e4318" }
```

`[AGENT OUT]` (a `ContextObject`)

```json
{
  "domain":        { "label": "kendo",         "confidence": 0.94 },
  "register":      "formal",
  "subRegister":   "philosophical",
  "politeness":    "teineigo",
  "entities":      ["剣道", "武術", "修養", "道"],
  "keyTerms":      ["剣道", "武術", "修養", "道"],
  "documentTitle": "Kendo Philosophy: The Way of the Sword",
  "documentTitleJa": null,
  "neighbours":    {
     "prev": null,
     "next": {
        "id":         "69458817-c69b-4f54-a776-e9b6965587dd",
        "position":   1,
        "ja":         "",
        "en":         "This translation aims to preserve the essence of the original text, conveying the idea that Kendo encompasses not only physical techniques but also a deeper, spiritual aspect.",
        "usable":     false,
        "reason":     "translator commentary; empty source_text"
     }
  }
}
```

**Hierarchy mapping.**
- **L1 (segment-local):** `domain`, `register`, `subRegister`,
  `politeness`, `entities`, `keyTerms` — all derived directly from the
  source segment.
- **L2 (article-local):** `documentTitle`, `documentTitleJa`,
  `neighbours.prev`, `neighbours.next` — derived from sibling segments
  in the same article. Here L2 is **degenerate**: `prev` is null
  (position 0 has no predecessor), and `next` exists but is unusable
  (`usable: false`) because position 1's `source_text` is empty —
  positions 1 and 2 of this article are translator commentary, not
  source paragraphs. The pairer in Step 5 will see L2's only signal as
  the document title.
- **L3 / L4:** not materialised at Phase 0; deferred to Step 4. Because
  L2 is degenerate, the coverage report will mandate L4 escalation
  there.

No human-visible UI yet. This object exists only on the server and is
threaded into Phase 1.

`[GAP]` `audienceProfile` field is in the design but not produced today.

---

### Step 4 — Phase 1: RAG Retrieval

The server fans out across retrieval sources. Phase 1 materialises the
**L3 (project-corpus)** and **L4 (external / cross-domain)** layers of
the hierarchy. L1/L2 are already in hand from Step 3 and are *not*
re-queried here.

**TM search** (`lib/retrieval/tm-search.ts`) — primarily **L3**
(project-curated TM in `translation_memory`); when the query lacks
in-project matches it falls back to **L4** cross-project neighbours.
For this segment, **no in-article TM exists** (the article has only one
translatable segment, itself), so retrieval falls back immediately to
cross-article TM rows; the highest-scoring hits sit in the
**L4 (cross-article)** band.

`[AGENT IN]`

```json
{ "query": "剣道は単なる武術ではなく、精神的な修養の道でもあります。",
  "documentId": "c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe",
  "minMatchScore": 50, "topK": 5 }
```

`[AGENT OUT]`

```json
[
  { "id": "bbc6076b-21d5-4e2a-92e5-cab10677ad06",
    "ja_excerpt": "…「道」や剣の道についての説明も試みました。剣道は身体の健康だけではなく、精神の規律を達成するためのものでもあります。…",
    "en_excerpt": "… we also attempted to explain a little about 'dō' and the way of the sword. Kendo is not only for physical health; it is also for achieving discipline of the spirit. …",
    "domain": "kendo", "quality": "gold", "human_approved": true,
    "article_id": null,
    "match_score": 0.73,
    "layer": "L4_cross_article",
    "note": "Same kendō=武術+道+精神 framing as the running segment."
  }
]
```

**Terminology lookup** (`lib/retrieval/terminology.ts`) — **L3**
(project-curated `terminology` rows). The lookup returns the three
matches present in `terminology`; 修養 is **not** in the table, which
will route to the `[T/N: …]` path during generation.

`[AGENT OUT]`

```json
[
  { "ja": "剣道",  "en": "kendō",   "reading": "kendō",
    "type": "preferred",
    "note": "The way of the sword." },
  { "ja": "武術",  "en": "bujutsu", "reading": "bujutsu",
    "type": "preferred",
    "note": "Martial art / military art." },
  { "ja": "道",    "en": "dō",      "reading": "dō (1)",
    "type": "preferred",
    "note": "The way; a way of enlightenment or of bettering oneself." }
]
```

(Source query covers all three; `修養` is searched but returns no row.)

**Domain Corpus (L4)** and **Cross-Lingual KB (L4)**: `[GAP]` — sources
defined in plan, not yet implemented as distinct channels. The pipeline
currently proceeds with TM-based L3/L4 only. **This is the segment where
that gap actually bites**: L2 is degenerate, no in-project TM exists,
and `修養` is absent from terminology. Phase 1 would benefit from a true
L4 channel (e.g., Wikidata for `修養 → spiritual cultivation /
self-cultivation`); without it, the agent must invent the rendering and
flag a `[T/N]` note.

Still no human-visible UI. All retrieval is internal.

`[DB]` Read-only at this point. No writes.

---

### Step 5 — Phase 2: Context Pairing

`lib/context/context-pairer.ts` fuses Phase 0 + Phase 1 into a prompt
context and a coverage report. Pairing inputs: **L1 + L2** from Step 3,
**L3 + L4** from Step 4.

`[AGENT OUT]`

```json
{
  "promptContext": {
    "domain": "kendo",
    "register": "formal/philosophical/teineigo",
    "tmExamples": [
      "[L4 cross-article, gold/human-approved] 剣道は身体の健康だけではなく、精神の規律を達成するためのものでもあります。 → Kendo is not only for physical health; it is also for achieving discipline of the spirit."
    ],
    "termsRequired":      [],
    "termsPreferred":     [
      "剣道 → kendō",
      "武術 → bujutsu",
      "道   → dō"
    ],
    "termsDoNotTranslate":[],
    "termsAbsent":        ["修養"],
    "neighbourTargets":   [],
    "documentTitle":      "Kendo Philosophy: The Way of the Sword"
  },
  "coverageReport": {
    "overall": 0.62,
    "gaps":    [
      { "field": "neighbours.prev", "reason": "position 0; no predecessor" },
      { "field": "neighbours.next", "reason": "next segment has empty source_text (translator commentary)" },
      { "field": "terminology",     "reason": "修養 not in terminology table",
        "remediation": "agent will emit [T/N] note" },
      { "field": "tm_in_article",   "reason": "no in-article TM rows; using cross-article (L4) fallback" }
    ],
    "l4_escalation_required": true
  }
}
```

Within `promptContext`: `domain`/`register` carry **L1** signals;
`documentTitle` is the only usable **L2** signal (the title itself —
neighbours dropped because they are translator commentary, not source
prose); `tmExamples` carries **L4** (cross-article — the highest-scoring
in-corpus match comes from a different article, the Plano Kendo Dojo
piece, and is explicitly labelled `[L4 cross-article]` rather than
silently presented as if it were same-article); the three `terms*`
arrays carry **L3** (project-curated terminology); `termsAbsent` is the
explicit miss list — the agent will receive it to drive `[T/N]`
emission.

Coverage drops to **0.62** (versus the ~0.85 a richer document would
produce). The pairer flags `l4_escalation_required: true` because L2 is
degenerate. Had L2 had usable neighbour prose, `gaps` would be shorter
and coverage would clear the soft threshold without requiring
escalation. (See "Phase 0 — Hierarchical Context Model" for the
escalation rule.)

`[GAP]` If a Context Builder Panel existed, this is the moment it would
surface to the human ("here is what the agent will use; want to edit?").
Today the panel does not exist; `useMacRag` keeps `promptContext` in
memory but renders no UI for it.

---

### Step 5b — Context Builder Panel (human prompt review)

This is the **first point in the pipeline where the human sees what the
agent will see**. Today the orchestrator runs Phases 0–2 and Phase 3 in
one shot; the design promotes the boundary between them to a UI surface.

**HTTP shape change.** `POST /api/mac-rag` no longer runs end-to-end. It
returns at Phase 2 with the composed prompt. The client then issues a
second call, `POST /api/mac-rag/generate`, with the (possibly
human-edited) prompt to trigger Phase 3.

The composed prompt below matches the five-module skeleton (Role /
Task / Instructions / Examples / Format) used in Step 6 below (the
same prompt as it appears at the LLM boundary). Showing the full
prompt here is intentional: the panel's value is exact transparency,
not a summary.

`[AGENT OUT]` of the first call (`POST /api/mac-rag` for translate) —
**system prompt** (literal):

```
# Role
You are a senior Japanese→English literary translator specialising in kendo
prose. You have publishing-quality experience with budō literature and you
work strictly within a terminology dictionary and a translation-memory
substrate provided by the pipeline.

Cooperation-surface invariant: **I propose; I never commit.** Your output
is a candidate, not a final translation. A human will accept, edit, or
reject it.

# Task
Translate the source segment below into English at a formal instructional
register, suitable for inclusion in a published kendo text.

Fidelity-first hard constraints:
- Do not paraphrase, summarise, omit, or editorialise.
- Preserve sentence count: one source sentence in → one English sentence
  out.
- Preserve kendo romanizations exactly as the dictionary specifies; do
  not anglicise them.
- The retrieved terminology and TM entries below are authoritative; do
  not override them with general-knowledge alternatives.

# Instructions
1. Read the source segment in full before drafting.
2. For every kendo term in the source, consult the retrieved terminology
   first. If a term is present, use its `target_term` verbatim. If a term
   is absent from the retrieved subset, translate it conservatively and
   add an entry to `translator_notes` of the form
   `[T/N: Term not in reference dictionary: <term>]`.
3. Consult the retrieved TM examples for prior project-level choices on
   adjacent phrasings. If a prior project choice exists, prefer it for
   consistency unless it produces a clear infelicity in the current
   segment.
4. Draft the candidate according to the per-approach tail (literal /
   natural / formal — only one is sent per call).
5. Quality-check before emitting: sentence count matches; required terms
   present; do-not-translate terms unchanged; output is valid JSON
   matching the Format schema.

# Examples
**BAD** (violates cooperation-surface; agent commits instead of proposes)
{ "proposed_text": "Strike when the opening appears.",
  "auto_accept": true }
The `auto_accept` field does not exist in the contract; emitting it is a
violation of "I propose; I never commit."

**GOOD**
{ "proposed_text": "Strike at the opening; do not let it pass.",
  "confidence": 0.82,
  "terminology_used": [],
  "translator_notes": [] }
Fits the contract: a proposal with confidence, terminology trace, and an
empty notes array when there is nothing to flag.

# Format
Return strictly valid JSON matching this schema:
{
  "proposed_text":    string,
  "confidence":       number,
  "terminology_used": [ { "source_term": string, "target_term": string } ],
  "translator_notes": [string]
}
```

**user prompt** (literal):

```
Source: 剣道は単なる武術ではなく、精神的な修養の道でもあります。

Document title: Kendo Philosophy: The Way of the Sword
Document title (ja): (none)

Retrieved TM (use for consistency):
  - [L4 cross-article, gold/human-approved]
    剣道は身体の健康だけではなく、精神の規律を達成するためのものでもあります。
    → Kendo is not only for physical health; it is also for achieving
      discipline of the spirit.

Retrieved terminology:
  - 剣道 → kendō   (preferred; "The way of the sword.")
  - 武術 → bujutsu (preferred; martial / military art)
  - 道   → dō      (preferred; "the way" / a way of bettering oneself)

Terms absent from dictionary (emit [T/N: …] if used):
  - 修養 (shūyō)   — likely "spiritual cultivation" / "self-cultivation"

Neighbour targets (for register continuity):
  - prev: (none — this is position 0)
  - next: (none usable — next segment is translator commentary, not source)

Approach: <one of literal | natural | formal — set per parallel call>
```

**HTTP envelope** wrapping the two literal blocks:

```json
{
  "stage": "phase2_complete",
  "segmentId": "d644d349-325e-4098-a7b4-0ec2fa7e4318",
  "task": "translate",
  "composedPrompt": {
    "system": "<system prompt block above, literal>",
    "user":   "<user prompt block above, literal>"
  },
  "approaches": ["literal", "natural", "formal"],
  "coverageReport": { "overall": 0.62, "l4_escalation_required": true }
}
```

`[HUMAN SEES]` the **Context Builder Panel**. Because the literal prompt
is long, the panel uses a five-module accordion (collapsed by default
except Task) plus a flat read-only "view raw" toggle:

```
┌─ Context Builder ────────────────────────────────────────────────────┐
│ Task: translate          Segment: d644d349…          Coverage: 0.62  │
│ ⚠ L4 escalation required (next segment is translator commentary,     │
│   not source prose — see coverage report)                            │
├──────────────────────────────────────────────────────────────────────┤
│ System prompt (accordion; click ▸ to expand a module)                │
│   ▸ Role          (collapsed)                                        │
│   ▾ Task          (expanded — editable)                              │
│       Translate the source segment below into English at a formal    │
│       instructional register, suitable for inclusion in a published  │
│       kendo text.                                                    │
│       Fidelity-first hard constraints:                               │
│         - Do not paraphrase, summarise, omit, or editorialise.       │
│         - Preserve sentence count: one source → one English.         │
│         - Preserve kendo romanizations exactly.                      │
│         - Retrieved terminology and TM are authoritative.            │
│   ▸ Instructions  (collapsed)                                        │
│   ▸ Examples      (collapsed)                                        │
│   ▸ Format        (collapsed — JSON schema)                          │
│   [ View raw system prompt ]                                         │
├──────────────────────────────────────────────────────────────────────┤
│ User prompt (editable, full)                                         │
│   Source: 剣道は単なる武術ではなく、精神的な修養の道でもあります。      │
│                                                                       │
│   Document title: Kendo Philosophy: The Way of the Sword             │
│                                                                       │
│   Retrieved TM (use for consistency):                                │
│     - [L4 cross-article] 剣道は身体の健康だけではなく…精神の規律… →   │
│         Kendo is not only for physical health; it is also for        │
│         achieving discipline of the spirit.                          │
│   Retrieved terminology:                                             │
│     - 剣道 → kendō   (preferred)                                     │
│     - 武術 → bujutsu (preferred)                                     │
│     - 道   → dō      (preferred)                                     │
│   Terms absent from dictionary:                                      │
│     - 修養 (shūyō) — emit [T/N: …] if used                           │
│   Neighbour targets:                                                 │
│     - prev: (none — position 0)                                      │
│     - next: (unusable — translator commentary)                       │
│   Approach: <literal | natural | formal>                             │
├──────────────────────────────────────────────────────────────────────┤
│ Will generate 3 candidates: literal / natural / formal               │
├──────────────────────────────────────────────────────────────────────┤
│        [ Generate ]   [ Cancel ]   [ Skip panel next time ]          │
└──────────────────────────────────────────────────────────────────────┘
```

`[HUMAN ACTS]`. Three typical paths:

- **Accept as-is.** Click **Generate**. The user prompt is sent
  unchanged.
- **Light edit.** Add a one-line note like "prefer 'spiritual
  cultivation' over 'self-cultivation' for 修養 to match the article
  title's philosophical register"; then **Generate**.
- **Cancel.** Click **Cancel**. No Phase 3, no `segment_suggestions`
  write. The orchestrator state is discarded.

`[AGENT IN]` of the second call (`POST /api/mac-rag/generate` for
translate)

```json
{
  "segmentId": "d644d349-325e-4098-a7b4-0ec2fa7e4318",
  "task": "translate",
  "composedPrompt": { "system": "…", "user": "… (possibly edited) …" },
  "approaches": ["literal", "natural", "formal"]
}
```

**Defaults.** The panel is **default-on** for translate (and edit and
proofread). A user-level setting `userPreferences.skip_context_builder`
lets a user opt out per task. Click "Skip panel next time" inside the
panel to set this flag for the current task without leaving the page.

`[GAP]` **Open: prune-retrieval-results UI.** The mock-up above lets the
human edit the *composed prompt as text*. A richer design would let them
click individual TM rows or terminology entries to remove them from the
prompt structurally. Decision deferred.

**Open: prompt-edit audit trail.** If the human edits the
prompt, do we persist the edit (and its diff against the agent's
proposal) for later audit? (See MEMORY-DB-DESIGN.md §3.5 — prompt_edits)

---

### Step 6 — Phase 3: Multi-Candidate Generation

`lib/translation/multi-gen.ts` issues **three parallel LLM calls**, one per
approach. Each call uses a shared five-module system prompt (Role / Task
/ Instructions / Examples / Format — per Appendix A.2.1 of the TODO plan)
plus an approach-specific tail.

`[AGENT IN]` (one of three; the `natural` call shown)

```
system:
# Role
You are a senior Japanese→English literary translator specialising in kendo
prose. You have publishing-quality experience with budō literature and you
work strictly within a terminology dictionary and a translation-memory
substrate provided by the pipeline.

Cooperation-surface invariant: **I propose; I never commit.** Your output
is a candidate, not a final translation. A human will accept, edit, or
reject it.

# Task
Translate the source segment below into English at a formal instructional
register, suitable for inclusion in a published kendo text.

Fidelity-first hard constraints:
- Do not paraphrase, summarise, omit, or editorialise.
- Preserve sentence count: one source sentence in → one English sentence
  out.
- Preserve kendo romanizations exactly as the dictionary specifies; do
  not anglicise them.
- The retrieved terminology and TM entries below are authoritative; do
  not override them with general-knowledge alternatives.

# Instructions
1. Read the source segment in full before drafting.
2. For every kendo term in the source, consult the retrieved terminology
   first. If a term is present, use its `target_term` verbatim. If a term
   is absent from the retrieved subset, translate it conservatively and
   add an entry to `translator_notes` of the form
   `[T/N: Term not in reference dictionary: <term>]`.
3. Consult the retrieved TM examples for prior project-level choices on
   adjacent phrasings. If a prior project choice exists, prefer it for
   consistency unless it produces a clear infelicity in the current
   segment.
4. Draft the candidate according to the per-approach tail (literal /
   natural / formal — only one is sent per call).
5. Quality-check before emitting: sentence count matches; required terms
   present; do-not-translate terms unchanged; output is valid JSON
   matching the Format schema.

First-occurrence annotation policy (Appendix A.2.5) requires the
context builder to surface `terms_already_annotated_in_this_article`. The
per-article tracking column is defined in
(See MEMORY-DB-DESIGN.md §3.6 — terminology.first_occurrence_per); the
application-side `terms_already_annotated_in_this_article` state remains a
Context Builder concern tracked in W3.

# Examples
**BAD** (violates cooperation-surface; agent commits instead of proposes)
```json
{ "proposed_text": "Strike when the opening appears.",
  "auto_accept": true }
```
The `auto_accept` field does not exist in the contract; emitting it is a
violation of "I propose; I never commit."

**GOOD**
```json
{ "proposed_text": "Strike at the opening; do not let it pass.",
  "confidence": 0.82,
  "terminology_used": [],
  "translator_notes": [] }
```
Fits the contract: a proposal with confidence, terminology trace, and an
empty notes array when there is nothing to flag.

# Format
Return strictly valid JSON matching this schema:

```
{
  "proposed_text":    string,   // the English translation, no surrounding quotes
  "confidence":       number,   // self-estimate, 0.0–1.0
  "terminology_used": [         // every dictionary term used in proposed_text
    { "source_term": string, "target_term": string }
  ],
  "translator_notes": [string]  // [T/N: ...] entries; empty if none
}
```

user:
Source: 剣道は単なる武術ではなく、精神的な修養の道でもあります。

Document title: Kendo Philosophy: The Way of the Sword

Retrieved TM (use for consistency):
  - [L4 cross-article, gold/human-approved]
    剣道は身体の健康だけではなく、精神の規律を達成するためのものでもあります。
    → Kendo is not only for physical health; it is also for achieving
      discipline of the spirit.

Retrieved terminology:
  - 剣道 → kendō   (preferred)
  - 武術 → bujutsu (preferred)
  - 道   → dō      (preferred)

Terms absent from dictionary:
  - 修養 (shūyō)   — emit [T/N: …] if used

Neighbour targets (for register continuity):
  - prev: (none — position 0)
  - next: (unusable — translator commentary)

Approach: **natural** — render fluently for an instructional reader while
respecting every constraint above. Prefer rhythm over near-literal mapping
when both honour the source meaning.
```

`[AGENT OUT]` (per-candidate, in parallel)

```json
{
  "literal": "Kendō is not just bujutsu, but is also a spiritual path of cultivation [T/N: 修養 shūyō].",
  "natural": "Kendo is more than a martial art, encompassing a path of mental and spiritual training.",
  "formal":  "Kendō is not merely bujutsu — it is also a dō (way) of spiritual cultivation [T/N: 修養 shūyō]."
}
```

**Note on the `natural` candidate.** It reads smoothly but flattens the
source's `単なる X ではなく、…でもあります` contrastive structure ("not
merely X, but also Y") into a softer "more than X, encompassing Y", and
recasts `修養` as the more general "mental and spiritual training",
losing the philosophical *cultivation* nuance the article title sets up.
The downstream quality scorer rewards its fluency; the human translator
in Step 11 will catch the meaning drift and rewrite substantively.

Still server-only. None of this has reached the human yet — the server
waits for Phase 4a to finish so it can return everything at once.

---

### Step 7 — Phase 4a: Quality Assessment

`lib/quality/scorer.ts` makes a single LLM call per candidate, asking for
four scores on the 0–1 scale: fluency, adequacy, terminology, style.

`[AGENT IN]` (per candidate)

```
system: You are a translation quality assessor for a kendo literary text.
        Score the candidate on fluency, adequacy, terminology, style
        (0.0–1.0). Respond as JSON only.

user:   Source: 剣道は単なる武術ではなく、精神的な修養の道でもあります。
        Candidate: Kendo is more than a martial art, encompassing a path
                   of mental and spiritual training.
        Required terms: (none required; preferred: 剣道→kendō, 武術→bujutsu,
                         道→dō)
        Absent terms:   修養 (expect [T/N: …] if used)
```

`[AGENT OUT]` (combined)

```json
[
  { "approach": "literal",
    "scores": { "fluency": 0.70, "adequacy": 0.88,
                "terminology": 0.92, "style": 0.68 },
    "overall": 0.795 },
  { "approach": "natural",
    "scores": { "fluency": 0.93, "adequacy": 0.78,
                "terminology": 0.70, "style": 0.88 },
    "overall": 0.823 },
  { "approach": "formal",
    "scores": { "fluency": 0.86, "adequacy": 0.90,
                "terminology": 0.95, "style": 0.85 },
    "overall": 0.890 }
]
```

`lib/quality/routing.ts` maps `overall=0.890` to band `light_pe`
(0.85 ≤ x < 0.90 boundary; the `formal` candidate edges into the light-PE
band). The `formal` candidate is flagged `recommended: true`.

**Note on the scorer's blind spot.** The `natural` candidate's adequacy
0.78 is low *for adequacy* but its high fluency/style pull its overall
above the `literal`. The scorer rewards readability and partially
penalises the missing `[T/N]` for 修養 (terminology 0.70), but does not
catch that the contrastive "not merely X, but also Y" structure was
flattened — that judgement is reserved for the human in Step 11. The
`formal` candidate scores best overall because it preserves both the
contrastive structure *and* the `[T/N]` annotation, even though its heavy
romanisation may not match the article's audience.

---

### Step 8 — Server writes the suggestion row

The orchestrator picks the recommended candidate (or all three, depending
on UI mode) and writes to the cooperation surface.

`[DB]`

```sql
INSERT INTO segment_suggestions
  (segment_id, suggester_id, suggester_kind, proposed_text, status)
VALUES
  ('d644d349-325e-4098-a7b4-0ec2fa7e4318',
   '<agent-system-user-uuid>',
   'agent',
   'Kendō is not merely bujutsu — it is also a dō (way) of spiritual cultivation [T/N: 修養 shūyō].',
   'pending');
```

(In the current code only the recommended candidate is persisted as a
suggestion row. The other two are returned in the response for the UI to
display but are not stored unless the human pins them.)

---

### Step 9 — Response returned to the client

`[AGENT OUT]` (HTTP 200 response body)

```json
{
  "candidates": [
    { "approach": "literal", "text": "Kendō is not just bujutsu, but is also a spiritual path of cultivation [T/N: 修養 shūyō].",
      "overall": 0.795 },
    { "approach": "natural", "text": "Kendo is more than a martial art, encompassing a path of mental and spiritual training.",
      "overall": 0.823 },
    { "approach": "formal",  "text": "Kendō is not merely bujutsu — it is also a dō (way) of spiritual cultivation [T/N: 修養 shūyō].",
      "overall": 0.890, "recommended": true,
      "suggestionId": "sugg-9c2e…" }
  ],
  "routing": "light_pe",
  "coverageReport": { "overall": 0.62, "l4_escalation_required": true }
}
```

---

### Step 10 — Human sees the candidates

`[HUMAN SEES]` (SuggestionPanel + AgentSuggestionPanel)

```
┌─ Agent suggestion ─────────────────────────────────────────────┐
│ Light review suggested                                         │
│                                                                │
│ Recommended — preserves the source's structure                 │
│   "Kendō is not merely bujutsu — it is also a dō (way) of      │
│    spiritual cultivation [T/N: 修養 shūyō]."                   │
│   Keeps the "not merely X, but also Y" contrast · uses the     │
│   preferred romanizations · flags 修養 as a translator note    │
│   [ Accept ]  [ Edit & accept ]  [ Reject ]                    │
│                                                                │
│   ▸ Show alternative: a more fluent rendering                  │
│   ▸ Show alternative: a more literal rendering                 │
│   ▸ Why this is recommended (details)                          │
└────────────────────────────────────────────────────────────────┘
```

This is the **first moment the human sees any agent output**. Everything
before this point was server-internal.

Score floats and internal approach names (`natural`, `accuracy_focus`,
…) never reach the human surface. The routing band ("Light review
suggested" / "Worth considering" / "Needs a closer look") summarises
quality on a single calibrated axis, and the four quality dimensions
are spoken in plain English. A "details" drawer (collapsed by default)
surfaces the raw scores for power users who explicitly opt in.

The translator has four real choices at this moment:

1. **Accept** the recommended candidate as-is.
2. Expand the "more literal" or "more formal" alternative, then accept
   one of them.
3. Click **Edit & accept**, hand-modify, then commit.
4. **Reject** all three and write from scratch.

---

### Step 11 — Translator decides

`[HUMAN ACTS]` Reads the recommended `formal` candidate first. The
"not merely X, but also Y" structure is preserved and 修養 is honestly
flagged with a `[T/N]` note — but the heavy romanisation (`Kendō`,
`bujutsu`, `dō`, the inline gloss) reads more like an academic footnote
than the opening line of a piece titled *Kendo Philosophy: The Way of
the Sword*. The translator expands the "more fluent rendering"
alternative — the `natural` candidate — and notices it has flattened
`単なる…ではなく、…でもあります` into "more than X, encompassing Y",
losing the contrastive structure that gives the source its
philosophical weight. Neither candidate is acceptable as a polish; both
need substantive rewriting.

Clicks **Edit & accept**, starts from a blank field, and rewrites
keeping the contrast intact, dropping the heavy romanisation in favour
of the more reader-friendly "Kendo / martial art / path / spiritual
cultivation" rendering that matches the article's audience.

`[HUMAN SEES]`

```
┌─ Edit before accepting ────────────────────────────────────────┐
│ Kendo is not merely a martial art, but also a path of          │
│ spiritual cultivation.                                         │
│                                                                │
│ [ Cancel ]                              [ Accept this version ]│
└────────────────────────────────────────────────────────────────┘
```

`[HUMAN ACTS]` Confirms the rewrite and clicks **Accept this version**.

This is a **substantive rewrite, not a light polish**: the translator
discarded both the agent's `formal` (over-romanised) and `natural`
(meaning-flattening) candidates and produced a third reading the agent
did not propose. The cooperation surface holds — the agent proposed,
the human decided — but the value the agent contributed here is
narrower: it surfaced the choice (romanise heavily vs. flatten meaning)
and let the human see both failure modes side-by-side.

The client does two things atomically through the soft-lock editing path
(`PATCH /api/segments/<id>` with a guard) and the suggestion accept path
(`POST /api/suggestions/<id>/accept`):

`[DB]`

```sql
-- 1. acquire soft-lock (if not already held)
UPDATE segments SET locked_by = '<translator-1>', locked_at = now()
WHERE id = 'd644d349-325e-4098-a7b4-0ec2fa7e4318'
  AND (locked_by IS NULL OR locked_by = '<translator-1>');

-- 2. update the target text
UPDATE segments
  SET target_text = 'Kendo is not merely a martial art, but also a path of spiritual cultivation.',
      status      = 'draft'   -- status stays draft; translate phase advance is separate
WHERE id = 'd644d349-325e-4098-a7b4-0ec2fa7e4318'
  AND locked_by = '<translator-1>';

-- 3. record the suggestion accept (with the human-rewritten text)
UPDATE segment_suggestions
  SET status        = 'accepted',
      accepter_id   = '<translator-1>',
      accepted_at   = now(),
      proposed_text = 'Kendo is not merely a martial art, but also a path of spiritual cultivation.'
WHERE id = 'sugg-9c2e…';
```

Note that **the accept never directly writes `target_text`**. The
sequence is: human edits via soft-lock, then marks the suggestion
accepted. The two writes are correlated but independent — this is the
"acceptance is human, not agent" rule from MAC-RAG.md §1.

---

### Step 12 — Phase advance (separate human action)

`[HUMAN SEES]` The PhaseAdvanceButton becomes enabled once the segment has
non-empty `target_text`:

```
[ Advance to translated ]
```

`[HUMAN ACTS]` Clicks **Advance to translated**.

`[DB]`

```sql
UPDATE segments SET status = 'translated'
WHERE id = 'd644d349-325e-4098-a7b4-0ec2fa7e4318';

INSERT INTO segment_phase_transitions
  (segment_id, from_status, to_status, actor_id)
VALUES
  ('d644d349-325e-4098-a7b4-0ec2fa7e4318', 'draft', 'translated', '<translator-1>');
```

The segment is now ready for whoever holds the `edit` phase assignment on
this document.

---

### Step 13 — Phase 4b: Memory Update (currently missing)

(See MEMORY-DB-DESIGN.md §7.1 — rpc_phase_4b_translate_save) In the
design, after acceptance the agent would offer to:

- Save `(剣道は単なる武術ではなく、精神的な修養の道でもあります。 → Kendo
  is not merely a martial art, but also a path of spiritual cultivation.)`
  to the TM. The confidence would be tempered by the fact that this was
  a **substantive human rewrite, not a light polish on the agent's
  proposal** — the design's Phase 4b notes that human-rewrite acceptances
  weight the TM row differently from accept-as-is acceptances.
- **Add `修養 → spiritual cultivation` to `terminology`** as a new
  `preferred` entry. This was the `termsAbsent` row at Phase 2 and the
  human just supplied a definitive rendering for it; adding it closes
  the dictionary gap that drove the `[T/N]` path.
- Record the L4 cross-article TM hit (`bbc6076b…`, Plano Kendo Dojo) as
  "helpful" for retrieval weighting — it correctly anticipated the
  "Kendo … not only … also … spirit" frame that the accepted target
  uses.

`[HUMAN SEES]` (proposed UI, not yet built)

```
┌─ Save what was learned? ───────────────────────────────────────┐
│ ☑ Add this segment to translation memory                       │
│   (human-rewrite; saved at moderate confidence, not gold)      │
│ ☑ Add 修養 → "spiritual cultivation" to terminology            │
│   (was a [T/N] term; the human just resolved it)               │
│ ☑ Mark the TM example "剣道は身体の健康だけではなく…" as       │
│   helpful (boosts its future retrieval rank)                   │
│                                                                │
│ [ Save selected ]   [ Skip ]                                   │
└────────────────────────────────────────────────────────────────┘
```

Today none of this exists in code (`lib/learning/` doesn't exist). The
loop terminates at Step 12.

---

### Step 14 — What the next role sees

Later, the `edit` assignee opens the document. For segment `d644d349…`
(position 0) they see:

`[HUMAN SEES]`

```
┌─ Segment d644d349… (position 0) ──────── status: translated ─┐
│ JA: 剣道は単なる武術ではなく、精神的な修養の道でもあります。  │
│ EN: Kendo is not merely a martial art, but also a path of    │
│     spiritual cultivation.                                   │
│                                                              │
│ Activity:  🤖 1 suggestion · ✅ accepted by translator-1     │
│            ✎ rewritten before accept · ⬆ advanced by         │
│            translator-1                                      │
│                                                              │
│ [ ✎ Edit ]  [ 🤖 Suggest edit ]  [ 💬 Comment ]              │
└──────────────────────────────────────────────────────────────┘
```

The activity badges (`ae9bbc3`) summarize what cooperation happened on
this segment so far. Note the "rewritten before accept" rather than
"edited before accept" — the badge ideally distinguishes a substantive
human rewrite from a light polish, since downstream readers and
Phase 4b memory-update logic both care about the difference. `[GAP]`
the current implementation emits "edited before accept" for both
cases; a follow-up to differentiate substantive rewrites is filed
under W11.

The next role can now invoke the **edit task** on the same MAC-RAG
pipeline, with the current target text as additional input — that
walkthrough is below.

---

## Edit — full walkthrough

This continues the same document from where the translate walkthrough left
off. The translator `translator-1` has finished the segment at position 0;
the editor `editor-1` `[SYNTHESIZED — no editor profile exists in the
current DB; first use marked]` now picks it up.

### Setup

- Same article `c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe`, same segment
  `d644d349-325e-4098-a7b4-0ec2fa7e4318` (position 0).
- Segment status: `translated`. Target text:

  > Kendo is not merely a martial art, but also a path of spiritual cultivation.

- Article is assigned for the `edit` phase to user `editor-1` (translator
  role globally; assigned to phase `edit` on this article).
- Same article policy: `auto_accept_threshold` unset.

The editor's job is **not** to retranslate. It is to improve the existing
target while preserving the translator's voice and the meaning. The edit
task therefore takes both `sourceText` and the current `targetText` as
input — that is the key shape difference from translate.

**What the editor will actually find here.** The translator's accepted
text is already fluent and faithful, but it writes `Kendo` without the
macron, while the project `terminology` table has `剣道 → kendō`
(macron-`ō`, preferred). The edit pass's most defensible single change
is to add the macron — a one-character revision that materially improves
terminology consistency without touching the translator's deliberately
chosen structure ("not merely X, but also Y"). The walkthrough below
shows the edit agent surfacing exactly that change as `accuracy_focus`,
with `light_touch` recommending no change at all and `fluency_focus`
overstepping into a structural rewrite the editor will reject.

---

### Step 1 — Editor opens the editor

`[HUMAN ACTS]` `editor-1` navigates to `/documents/c914a0bb-…/edit` and
scrolls to position 0.

`[HUMAN SEES]`

```
┌─ Segment d644d349… (position 0) ──────── status: translated ─┐
│ JA: 剣道は単なる武術ではなく、精神的な修養の道でもあります。  │
│ EN: Kendo is not merely a martial art, but also a path of    │
│     spiritual cultivation.                                   │
│                                                              │
│ Activity:  🤖 1 suggestion · ✅ accepted by translator-1     │
│            ✎ rewritten before accept · ⬆ advanced by         │
│            translator-1                                      │
│                                                              │
│ [ ✎ Edit ]  [ 🤖 Suggest edit ]  [ 💬 Comment ]              │
└──────────────────────────────────────────────────────────────┘
```

The SuggestionPanel shows the accepted translate-phase suggestion in a
collapsed "history" row; no pending edit-phase suggestions exist yet.

---

### Step 2 — Editor requests an agent edit suggestion

`[HUMAN ACTS]` Clicks **🤖 Suggest edit**.

In current code this hits `POST /api/agents/edit` (the lightweight
per-phase agent path — see MAC-RAG.md §4 for why this is being subsumed).
In the generalized design this becomes `POST /api/mac-rag` with
`task: 'edit'`. The rest of this walkthrough shows the **post-generalization
shape** so you can see what edit looks like once it gets the same
five-phase machinery translate already has.

`[AGENT IN]` (post-generalization request body)

```json
{
  "task": "edit",
  "segmentId": "d644d349-325e-4098-a7b4-0ec2fa7e4318",
  "documentId": "c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe",
  "sourceText": "剣道は単なる武術ではなく、精神的な修養の道でもあります。",
  "targetText": "Kendo is not merely a martial art, but also a path of spiritual cultivation.",
  "sourceLang": "ja",
  "targetLang": "en",
  "approach":   "accuracy_focus",
  "userOverrides": null
}
```

Note the `targetText` field — present for edit, absent for translate. The
agent treats the current target as the **subject of revision**, not as
ground truth.

`[HUMAN SEES]` The "Suggest edit" button becomes a spinner labelled
`Running MAC-RAG (edit)…`.

---

### Step 3 — Phase 0: Context Initialization (edit-shaped)

Phase 0 builds **L1 (segment-local)** and **L2 (article-local)**, with an
edit-specific twist: L1 is wider here because it covers *both* the source
text **and** the current target. The `targetAnalysis` sub-object is the
edit task's distinctive L1 signal — it scores and diagnoses the existing
target before any revision proposal is generated.

`[AGENT OUT]` (a `ContextObject` with target-side analysis added)

```json
{
  "domain":      { "label": "kendo", "confidence": 0.94 },
  "register":    "formal",
  "subRegister": "philosophical",
  "politeness":  "teineigo",
  "entities":    ["剣道", "武術", "修養", "道"],
  "keyTerms":    ["剣道", "武術", "修養", "道"],
  "targetAnalysis": {
    "fluency":      0.94,
    "adequacy":     0.92,
    "terminology":  0.75,
    "detectedWeaknesses": [
      { "span": "Kendo",
        "note": "missing macron; terminology table prefers 'kendō' (剣道 → kendō)" }
    ],
    "preserveCues": [
      "the 'not merely X, but also Y' contrastive structure (deliberate; was a substantive human rewrite of the agent's natural candidate)",
      "the rendering 'spiritual cultivation' for 修養 (newly minted by the translator; no [T/N] needed)",
      "lowercase 'kendo' avoided macron deliberately or by oversight — flag, but do not assume oversight"
    ]
  },
  "neighbours": {
    "prev": null,
    "next": { "id": "69458817-…", "usable": false,
              "reason": "translator commentary; empty source_text" }
  }
}
```

**Hierarchy mapping.**
- **L1 (segment-local):** `domain`, `register`, `subRegister`,
  `politeness`, `entities`, `keyTerms`, and the entire `targetAnalysis`
  block (source + current target are both segment-local for edit).
- **L2 (article-local):** `neighbours.prev`, `neighbours.next` — same
  degenerate L2 as translate (position 0, next segment is translator
  commentary). The edit task is therefore even more dependent on
  terminology/TM for grounding than a richer article would be.

This is the structural difference: Phase 0 for edit also runs a
diagnostic pass over the existing target to surface what's worth
revising and what is **already good and must not be regressed**. Here
the diagnostic finds exactly one defensible candidate change (the
missing macron on `Kendo`); everything else about the translator's
target is marked as Preserve.

---

### Step 4 — Phase 1: RAG Retrieval

Same **L3/L4** sources as translate, plus one new task-specific source:

**Revision history of this segment** (`segment_suggestions` accepted
rows) — an **L1-extension** retrieval source: it's still segment-scoped,
but reaches *backward in time* on the same segment rather than outward
to siblings or the project corpus.

`[AGENT OUT]`

```json
{
  "tm": [
    { "id": "bbc6076b-21d5-4e2a-92e5-cab10677ad06",
      "ja_excerpt": "…剣道は身体の健康だけではなく、精神の規律を達成するためのものでもあります。…",
      "en_excerpt": "… Kendo is not only for physical health; it is also for achieving discipline of the spirit. …",
      "score": 0.73, "layer": "L4_cross_article",
      "note": "Same kendō=武術+道+精神 framing; also writes 'Kendo' without macron — interesting precedent." }
  ],
  "terminology": [
    { "ja": "剣道", "en": "kendō",   "type": "preferred",
      "note": "Macron required for kendō." },
    { "ja": "武術", "en": "bujutsu", "type": "preferred" },
    { "ja": "道",   "en": "dō",      "type": "preferred" }
  ],
  "revisionHistory": [
    { "from": "(initial agent suggestion: 'Kendō is not merely bujutsu — it is also a dō (way) of spiritual cultivation [T/N: 修養 shūyō].')",
      "to":   "Kendo is not merely a martial art, but also a path of spiritual cultivation.",
      "actor": "translator-1", "kind": "human_rewrite_before_accept",
      "note": "Translator discarded the agent's heavy romanization deliberately." }
  ],
  "domainCorpus":   "[GAP]",
  "crossLingualKb": "[GAP]"
}
```

**Hierarchy mapping.**
- **L3 (project-corpus):** `tm`, `terminology`.
- **L1-extension:** `revisionHistory` (this segment's own history).
- **L4:** `domainCorpus`, `crossLingualKb` — `[GAP]` as in translate.

The revision history matters acutely here. `translator-1` did not just
edit the agent's candidate — they **rewrote it from scratch**, including
the deliberate choice to write `Kendo` (no macron) instead of the
agent's `Kendō`. That signal cuts two ways for the edit agent:

- The "not merely X, but also Y" structure and the "spiritual
  cultivation" rendering are **strong Preserve signals** — the
  translator demonstrably wanted them.
- The unromanised `Kendo` is a **weaker Preserve signal**: the
  translator may have de-romanised on purpose for audience, OR they may
  have written `Kendo` from habit and not noticed the macron was missing.
  The retrieved TM neighbour (Plano Kendo Dojo, `bbc6076b…`) also writes
  `Kendo` without the macron, which is precedent for the
  unromanised form even in published kendo prose.

The edit agent's job is to surface this exact tension so a human can
resolve it.

---

### Step 5 — Phase 2: Context Pairing

Pairing inputs: **L1 + L2** from Step 3, **L3 + L4** from Step 4, plus
the **L1-extension** revision history that distinguishes edit from
translate.

`[AGENT OUT]`

```json
{
  "promptContext": {
    "task": "edit",
    "currentTarget": "Kendo is not merely a martial art, but also a path of spiritual cultivation.",
    "weaknessHints": [
      "'Kendo' is missing the macron 'ō'; terminology prefers 'kendō'"
    ],
    "preserveHints": [
      "the 'not merely X, but also Y' contrastive structure (translator rewrite)",
      "the rendering 'spiritual cultivation' for 修養",
      "the sentence count and overall structure"
    ],
    "tmExamples":    [
      "[L4 cross-article] 剣道は身体の健康だけではなく…精神の規律… → Kendo is not only for physical health; it is also for achieving discipline of the spirit. (note: also unmacroned 'Kendo')"
    ],
    "termsRequired": [],
    "termsPreferred":[
      "剣道 → kendō",
      "武術 → bujutsu",
      "道   → dō"
    ],
    "translatorIntent":
      "translator-1 substantively rewrote the agent's heavy-romanization candidate; deliberately chose 'Kendo / martial art / path / spiritual cultivation'. Macron on 'Kendo' may have been a deliberate de-romanisation OR an oversight — surface both possibilities."
  },
  "coverageReport": {
    "overall": 0.71,
    "gaps": [
      { "field": "neighbours", "reason": "L2 degenerate (position 0; next is commentary)" }
    ]
  }
}
```

Within `promptContext`: `currentTarget`, `weaknessHints`, `preserveHints`
carry **L1**; `tmExamples`, `termsRequired`, `termsPreferred` carry
**L3** (with the L4 cross-article fallback explicitly labelled);
`translatorIntent` is synthesised from the **L1-extension** revision
history and is deliberately ambivalent on the macron question.

Coverage is `0.71` — lower than a richer document's edit pass (≈0.88)
because L2 is still degenerate, but higher than translate's `0.62`
because the **L1-extension** (the segment's own revision history) added
fresh grounding that translate didn't have.

`[GAP]` Again, no Context Builder Panel yet — the human doesn't see this
intermediate object.

---

### Step 5b — Context Builder Panel (edit-shaped)

Same two-stage HTTP contract as translate. The edit version of the panel
emphasises **what the agent has been told to preserve**, because the edit
task carries the most regret risk: a poorly-guided edit can regress the
translator's deliberate choices.

The composed prompt below matches the five-module skeleton (Role /
Task / Instructions / Examples / Format) used in Step 6 below (the
same prompt as it appears at the LLM boundary). Showing the full
prompt here is intentional: the panel's value is exact transparency,
not a summary.

`[AGENT OUT]` of the first call (`POST /api/mac-rag` for edit) —
**system prompt** (literal):

```
# Role
You are a senior bilingual editor of Japanese→English kendo prose. You
work over a translation that has already been produced by a human
translator. You revise it within the same terminology dictionary and
translation-memory substrate that the translator used.

Cooperation-surface invariant: **I propose; I never commit.** Your output
is a proposed revision, not a final edit. A human editor will accept,
amend, or reject it.

# Task
Revise the current English target where it diverges from the source
meaning, regresses terminology, or contains an obvious infelicity.

Fidelity-first hard constraints:
- Preserve sentence count and structure unless a structural change is
  the only way to fix a material adequacy defect.
- Preserve every kendo romanization exactly as the dictionary specifies
  (kendō stays kendō; bujutsu stays bujutsu; dō stays dō).
- Respect the translator's deliberate phrasing choices recorded in the
  revision history; treat them as decisions, not defects.
- Do not introduce a new style register; mirror the translator's
  register.

# Instructions
1. Read source, current target, and the Preserve list before drafting.
2. For every term in the Preserve list, confirm it survives unchanged in
   your revision.
3. For every weakness hint, decide independently whether it is real. If
   you disagree, leave the surface form alone.
4. Draft the revision according to the per-approach tail (light_touch /
   accuracy_focus / fluency_focus — only one is sent per call).
5. If no change is warranted, return the current target unchanged with
   `change_rationale: "no material defect found"`. "No change" is a
   first-class output, not a failure.
6. Quality-check before emitting: all Preserve items present unchanged;
   terminology intact; output is valid JSON matching the Format schema.

# Examples
**BAD** (overturns a deliberate translator rewrite)
{ "proposed_text": "Kendō is more than a martial art, encompassing a path of mental and spiritual training.",
  "change_rationale": "smoother flow, restored macron",
  "confidence": 0.7,
  "preserved_invariants": ["kendō macron"],
  "translator_notes": [] }
This regresses to the agent's earlier rejected `natural` candidate —
flattening the `単なる…ではなく、…でもあります` contrast that the
translator explicitly restored. `preserved_invariants` claims the macron
fix but silently discards the structural Preserve.

**GOOD**
{ "proposed_text": "Kendō is not merely a martial art, but also a path of spiritual cultivation.",
  "change_rationale": "added macron on 'Kendō' to match terminology table (剣道 → kendō); translator's structure and 'spiritual cultivation' rendering preserved",
  "confidence": 0.78,
  "preserved_invariants": ["not merely X, but also Y", "spiritual cultivation", "sentence count"],
  "translator_notes": [] }
A surgical one-character change with the structural Preserve items
explicitly named.

# Format
Return strictly valid JSON matching this schema:
{
  "proposed_text":         string,
  "change_rationale":      string,
  "confidence":            number,
  "preserved_invariants":  [string],
  "translator_notes":      [string]
}
```

**user prompt** (literal):

```
Source:         剣道は単なる武術ではなく、精神的な修養の道でもあります。
Current target: Kendo is not merely a martial art, but also a path of spiritual cultivation.

Preserve (do not regress):
  - the 'not merely X, but also Y' contrastive structure (translator rewrite)
  - the rendering 'spiritual cultivation' for 修養
  - sentence count and overall structure

Translator intent (revision history):
  - translator-1 substantively rewrote the agent's heavy-romanization
    candidate ('Kendō is not merely bujutsu — it is also a dō (way)
    of spiritual cultivation [T/N: 修養 shūyō].') down to the current
    target. Treat the structure and 'spiritual cultivation' as
    deliberate. The unromanised 'Kendo' may be deliberate (audience
    choice) OR an oversight — flag for review, do not assume.

Weakness hints (advisory only — disagree freely):
  - 'Kendo' is missing the macron 'ō'; terminology prefers 'kendō'.

Retrieved TM (for consistency reference):
  - [L4 cross-article] 剣道は身体の健康だけではなく…精神の規律… →
      Kendo is not only for physical health; it is also for achieving
      discipline of the spirit.
    (note: this published reference also writes 'Kendo' without the
    macron — precedent for either choice exists.)

Retrieved terminology:
  - 剣道 → kendō   (preferred; macron required)
  - 武術 → bujutsu (preferred)
  - 道   → dō      (preferred)

Approach: <one of light_touch | accuracy_focus | fluency_focus — set per parallel call>
```

**HTTP envelope** wrapping the two literal blocks:

```json
{
  "stage": "phase2_complete",
  "segmentId": "d644d349-325e-4098-a7b4-0ec2fa7e4318",
  "task": "edit",
  "composedPrompt": {
    "system": "<system prompt block above, literal>",
    "user":   "<user prompt block above, literal>"
  },
  "approaches": ["light_touch", "accuracy_focus", "fluency_focus"],
  "coverageReport": { "overall": 0.71, "gaps": [{ "field": "neighbours", "reason": "L2 degenerate" }] }
}
```

`[HUMAN SEES]` the panel, with an extra **Preserve** band surfaced
prominently before the five-module accordion:

```
┌─ Context Builder (edit) ─────────────────────────────────────────────┐
│ Task: edit              Segment: d644d349…       Coverage: 0.71      │
├──────────────────────────────────────────────────────────────────────┤
│ Preserve (do not regress):                                           │
│   • Structure: 'not merely X, but also Y' (translator rewrite)       │
│   • Rendering: 'spiritual cultivation' for 修養                       │
│   • Sentence count and overall structure                             │
│   ⚠ Translator intent: translator-1 substantively rewrote the        │
│     agent's earlier candidate — be conservative                       │
├──────────────────────────────────────────────────────────────────────┤
│ System prompt (accordion; click ▸ to expand a module)                │
│   ▸ Role          (collapsed)                                        │
│   ▾ Task          (expanded — editable)                              │
│       Revise the current English target where it diverges from the   │
│       source meaning, regresses terminology, or contains an obvious  │
│       infelicity.                                                    │
│       Fidelity-first hard constraints:                               │
│         - Preserve sentence count and structure unless a structural  │
│           change is the only way to fix a material adequacy defect.  │
│         - Preserve every kendo romanization exactly.                 │
│         - Respect the translator's deliberate phrasing choices.      │
│         - Do not introduce a new style register.                     │
│   ▸ Instructions  (collapsed)                                        │
│   ▸ Examples      (collapsed)                                        │
│   ▸ Format        (collapsed — JSON schema)                          │
│   [ View raw system prompt ]                                         │
├──────────────────────────────────────────────────────────────────────┤
│ User prompt (editable, full)                                         │
│   Source:         剣道は単なる武術ではなく、精神的な修養の道でも     │
│                   あります。                                          │
│   Current target: Kendo is not merely a martial art, but also a      │
│                   path of spiritual cultivation.                     │
│                                                                       │
│   Preserve: structure / 'spiritual cultivation' / sentence count     │
│   Translator intent: translator-1 rewrote the agent's earlier        │
│     heavy-romanization candidate; structure is deliberate; unmacroned │
│     'Kendo' is ambiguous (audience choice OR oversight).             │
│   Weakness hint (advisory): macron missing on 'Kendo'                │
│   Retrieved TM: 1 entry (L4 cross-article; also unmacroned)          │
│   Retrieved terminology: 剣道→kendō, 武術→bujutsu, 道→dō (all pref)   │
│   Approach: <light_touch | accuracy_focus | fluency_focus>           │
├──────────────────────────────────────────────────────────────────────┤
│ Will generate 3 candidates: light_touch / accuracy_focus / fluency   │
├──────────────────────────────────────────────────────────────────────┤
│        [ Generate ]   [ Cancel ]   [ Skip panel next time ]          │
└──────────────────────────────────────────────────────────────────────┘
```

`[HUMAN ACTS]`. The editor typically:

- Skims the **Preserve** band first; this is the panel's main value for
  the edit task.
- Notices the L4-TM-also-unmacroned precedent and decides whether to
  weaken the macron weakness hint to "audience-style choice; consider".
- Clicks **Generate**.

`[AGENT IN]` of the second call (`POST /api/mac-rag/generate` for edit)

```json
{
  "segmentId": "d644d349-325e-4098-a7b4-0ec2fa7e4318",
  "task": "edit",
  "composedPrompt": { "system": "…", "user": "… (possibly edited) …" },
  "approaches": ["light_touch", "accuracy_focus", "fluency_focus"]
}
```

**Defaults.** Default-on. Same user-level skip toggle as translate.

`[GAP]` Same two open questions as translate: prune-retrieval-results
UI, and prompt-edit audit trail.

---

### Step 6 — Phase 3: Multi-Candidate Generation

`lib/translation/multi-gen.ts` issues **three parallel LLM calls**, one per
**edit approach** (not translate approaches):

- `light_touch` — surgical changes, minimum diff from current target.
- `accuracy_focus` — prioritise adequacy over fluency; allowed to make
  larger changes if they materially improve faithfulness.
- `fluency_focus` — prioritise readability while preserving terminology.

Each call uses a shared five-module system prompt (Role / Task /
Instructions / Examples / Format — per Appendix A.2.1 of the TODO plan)
plus an approach-specific tail.

`[AGENT IN]` (one of three; the `accuracy_focus` call shown)

```
system:
# Role
You are a senior bilingual editor of Japanese→English kendo prose. You
work over a translation that has already been produced by a human
translator. You revise it within the same terminology dictionary and
translation-memory substrate that the translator used.

Cooperation-surface invariant: **I propose; I never commit.** Your output
is a proposed revision, not a final edit. A human editor will accept,
amend, or reject it.

# Task
Revise the current English target where it diverges from the source
meaning, regresses terminology, or contains an obvious infelicity.

Fidelity-first hard constraints:
- Preserve sentence count and structure unless a structural change is
  the only way to fix a material adequacy defect.
- Preserve every kendo romanization exactly as the dictionary specifies
  (kendō stays kendō; bujutsu stays bujutsu; dō stays dō).
- Respect the translator's deliberate phrasing choices recorded in the
  revision history; treat them as decisions, not defects.
- Do not introduce a new style register; mirror the translator's
  register.

# Instructions
1. Read source, current target, and the Preserve list before drafting.
2. For every term in the Preserve list, confirm it survives unchanged in
   your revision.
3. For every weakness hint, decide independently whether it is real. If
   you disagree, leave the surface form alone.
4. Draft the revision according to the per-approach tail (light_touch /
   accuracy_focus / fluency_focus — only one is sent per call).
5. If no change is warranted, return the current target unchanged with
   `change_rationale: "no material defect found"`. "No change" is a
   first-class output, not a failure.
6. Quality-check before emitting: all Preserve items present unchanged;
   terminology intact; output is valid JSON matching the Format schema.

# Examples
**BAD** (overturns a deliberate translator rewrite)
```json
{ "proposed_text": "Kendō is more than a martial art, encompassing a path of mental and spiritual training.",
  "change_rationale": "smoother flow, restored macron",
  "confidence": 0.7,
  "preserved_invariants": ["kendō macron"],
  "translator_notes": [] }
```
This regresses to the agent's earlier rejected `natural` candidate —
flattening the `単なる…ではなく、…でもあります` contrast that the
translator explicitly restored. `preserved_invariants` claims the macron
fix but silently discards the structural Preserve.

**GOOD**
```json
{ "proposed_text": "Kendō is not merely a martial art, but also a path of spiritual cultivation.",
  "change_rationale": "added macron on 'Kendō' to match terminology table (剣道 → kendō); translator's structure and 'spiritual cultivation' rendering preserved",
  "confidence": 0.78,
  "preserved_invariants": ["not merely X, but also Y", "spiritual cultivation", "sentence count"],
  "translator_notes": [] }
```
A surgical one-character change with the structural Preserve items
explicitly named.

# Format
Return strictly valid JSON matching this schema:

```
{
  "proposed_text":         string,   // the revised English target
  "change_rationale":      string,   // one-sentence reason for the change (or "no material defect found")
  "confidence":            number,   // self-estimate, 0.0–1.0
  "preserved_invariants":  [string], // every Preserve item you verified survived
  "translator_notes":      [string]  // [T/N: ...] entries; empty if none
}
```

user:
Source:         剣道は単なる武術ではなく、精神的な修養の道でもあります。
Current target: Kendo is not merely a martial art, but also a path of spiritual cultivation.

Preserve (do not regress):
  - the 'not merely X, but also Y' contrastive structure (translator rewrite)
  - the rendering 'spiritual cultivation' for 修養
  - sentence count and overall structure

Translator intent (revision history):
  - translator-1 substantively rewrote the agent's heavy-romanization
    candidate ('Kendō is not merely bujutsu — it is also a dō (way)
    of spiritual cultivation [T/N: 修養 shūyō].') down to the current
    target. Treat the structure and 'spiritual cultivation' as
    deliberate. The unromanised 'Kendo' may be deliberate (audience
    choice) OR an oversight — flag for review, do not assume.

Weakness hints (advisory only — disagree freely):
  - 'Kendo' is missing the macron 'ō'; terminology prefers 'kendō'.

Retrieved TM (for consistency reference):
  - [L4 cross-article] 剣道は身体の健康だけではなく…精神の規律… →
      Kendo is not only for physical health; it is also for achieving
      discipline of the spirit.
    (note: this published reference also writes 'Kendo' without the
    macron — precedent for either choice exists.)

Retrieved terminology:
  - 剣道 → kendō   (preferred; macron required)
  - 武術 → bujutsu (preferred)
  - 道   → dō      (preferred)

Approach: **accuracy_focus** — prioritise adequacy over fluency. You may
make larger changes than `light_touch` if they materially improve
faithfulness to the source, but every Preserve item must survive.
```

`[AGENT OUT]` (per-candidate, in parallel)

```json
{
  "light_touch":    "Kendo is not merely a martial art, but also a path of spiritual cultivation.",
  "accuracy_focus": "Kendō is not merely a martial art, but also a path of spiritual cultivation.",
  "fluency_focus":  "Kendō is more than a martial art — it is a path of spiritual cultivation."
}
```

Note `light_touch` returned the input unchanged — a legitimate output. The
edit pipeline treats "no change recommended" as a first-class signal, not
a failure. `accuracy_focus` made exactly one character of change (the
macron). `fluency_focus` is technically valid English but rewrites the
contrastive structure from "not merely X, but also Y" to "more than X —
it is Y", which the editor is likely to reject as overreach against the
explicit Preserve hint.

---

### Step 7 — Phase 4a: Quality Assessment (edit dimensions)

Edit uses **different quality weights** than translate (see MAC-RAG.md
§3.2): accuracy-improvement 0.40 / fluency-preservation 0.25 /
minimal-change 0.20 / terminology 0.15. The fourth dimension penalises
unnecessary churn.

`[AGENT OUT]`

```json
[
  { "approach": "light_touch",
    "scores": { "accuracy_improvement": 0.00,
                "fluency_preservation": 1.00,
                "minimal_change":       1.00,
                "terminology":          0.75 },
    "overall": 0.56,
    "note":    "no change suggested; baseline. Terminology stays at 0.75 because 'Kendo' is still missing the macron." },
  { "approach": "accuracy_focus",
    "scores": { "accuracy_improvement": 0.55,
                "fluency_preservation": 1.00,
                "minimal_change":       0.98,
                "terminology":          1.00 },
    "overall": 0.82 },
  { "approach": "fluency_focus",
    "scores": { "accuracy_improvement": 0.30,
                "fluency_preservation": 0.85,
                "minimal_change":       0.40,
                "terminology":          1.00 },
    "overall": 0.56,
    "note":    "rewrites the contrastive structure; penalised on minimal_change." }
]
```

`accuracy_focus` wins with 0.82 → routing band `standard_pe`
(0.70 ≤ x < 0.85 → "human should consider but is not pushed to accept").

The orchestrator marks `accuracy_focus` as `recommended: true`. Crucially,
because the band is `standard_pe` rather than `light_pe`, the UI will
present the candidate as a **proposal worth thinking about**, not as a
near-auto-accept. The two-way tie at 0.56 between `light_touch` (no
change) and `fluency_focus` (structural rewrite) is itself informative:
the scorer is saying "either keep the current target as-is, or commit to
the one-character macron fix; do not do anything in between."

---

### Step 8 — Server writes the suggestion row

`[DB]`

```sql
INSERT INTO segment_suggestions
  (segment_id, suggester_id, suggester_kind, proposed_text, status)
VALUES
  ('d644d349-325e-4098-a7b4-0ec2fa7e4318',
   '<agent-system-user-uuid>',
   'agent',
   'Kendō is not merely a martial art, but also a path of spiritual cultivation.',
   'pending');
```

Only the recommended candidate is persisted, same as translate. The
unchanged `light_touch` candidate is **not** stored — there is nothing to
suggest. The `fluency_focus` candidate is also not stored — it lost to
`light_touch` on overall score.

---

### Step 9 — Response returned to the client

`[AGENT OUT]` (HTTP 200)

```json
{
  "candidates": [
    { "approach": "light_touch",
      "text": "Kendo is not merely a martial art, but also a path of spiritual cultivation.",
      "overall": 0.56, "unchanged": true },
    { "approach": "accuracy_focus",
      "text": "Kendō is not merely a martial art, but also a path of spiritual cultivation.",
      "overall": 0.82, "recommended": true,
      "suggestionId": "sugg-1d77…" },
    { "approach": "fluency_focus",
      "text": "Kendō is more than a martial art — it is a path of spiritual cultivation.",
      "overall": 0.56 }
  ],
  "routing": "standard_pe",
  "coverageReport": { "overall": 0.71, "gaps": [{ "field": "neighbours", "reason": "L2 degenerate" }] }
}
```

---

### Step 10 — Human sees the candidates

`[HUMAN SEES]`

```
┌─ Agent edit suggestion ──────────────────────────────────────┐
│ Worth considering                                            │
│                                                              │
│ Current:                                                     │
│   "Kendo is not merely a martial art, but also a path of     │
│    spiritual cultivation."                                   │
│                                                              │
│ Recommended — terminology fix                                │
│   "Kendō is not merely a martial art, but also a path of     │
│    spiritual cultivation."                                   │
│   What changes: "Kendo" → "Kendō" (macron added)             │
│   Matches terminology table (剣道 → kendō) · structure       │
│   preserved · 'spiritual cultivation' preserved              │
│   [ Accept ]  [ Edit & accept ]  [ Reject ]                  │
│                                                              │
│   ▸ Show alternative: a lighter touch (the agent suggests    │
│     no change — current target stands; published TM also     │
│     uses unmacroned 'Kendo')                                 │
│   ▸ Show alternative: a more fluent rewrite                  │
│   ▸ Why this is recommended (details)                        │
└──────────────────────────────────────────────────────────────┘
```

Two things to notice about the edit UI vs translate UI:

1. The **current target is rendered at the top**, with a plain-English
   "what changes" summary. Edit is always relative to something.
2. The "lighter touch" alternative is shown explicitly as a valid
   "the agent thinks you're already done" signal — phrased in human
   words, not as `light_touch (no change suggested)`. The L4-precedent
   note ("published TM also uses unmacroned 'Kendo'") is surfaced
   here so the editor can weigh terminology consistency against
   audience convention. Translate has no equivalent — there is always
   a translation to propose.

---

### Step 11 — Editor decides

`[HUMAN ACTS]` `editor-1` reads both candidates and the diff. Weighs
the macron decision: the project's own `terminology` table says
`剣道 → kendō` (macron, preferred); the editor's job is precisely to
enforce that kind of consistency. The L4-cross-article precedent (Plano
Kendo Dojo also uses unmacroned `Kendo`) is real but reflects a
different publication's audience choice — within *this* project the
dictionary is the binding signal. The structural Preserve is intact in
the recommended candidate, so the macron fix carries no regression
risk. Accepts.

Clicks **Accept**.

`[DB]`

```sql
-- 1. acquire soft-lock
UPDATE segments SET locked_by = '<editor-1>', locked_at = now()
WHERE id = 'd644d349-325e-4098-a7b4-0ec2fa7e4318'
  AND (locked_by IS NULL OR locked_by = '<editor-1>');

-- 2. update the target text
UPDATE segments
  SET target_text = 'Kendō is not merely a martial art, but also a path of spiritual cultivation.',
      status      = 'translated'   -- status unchanged; phase advance is separate
WHERE id = 'd644d349-325e-4098-a7b4-0ec2fa7e4318'
  AND locked_by = '<editor-1>';

-- 3. mark the suggestion accepted (no human edit this time)
UPDATE segment_suggestions
  SET status      = 'accepted',
      accepter_id = '<editor-1>',
      accepted_at = now()
WHERE id = 'sugg-1d77…';
```

Same acceptance pattern as translate: target_text is updated through the
soft-lock path; the suggestion row is marked accepted separately. The
agent never wrote `segments.target_text` directly.

**`[GAP]` Real DB state divergence.** Position 0's real target_text in
the live DB is the translator's unmacroned `Kendo is not merely a
martial art, but also a path of spiritual cultivation.` — the edit pass
described above is **synthesised-forward**, not what the DB currently
holds. This is allowed per Appendix B.5(c) (downstream phases may
synthesise forward states); the moment the edit phase is actually
exercised on this segment, this walkthrough's UPDATE is what would
land.

---

### Step 12 — Phase advance

`[HUMAN SEES]`

```
[ Advance to edited ]
```

`[HUMAN ACTS]` Clicks **Advance to edited**.

`[DB]`

```sql
UPDATE segments SET status = 'edited'
WHERE id = 'd644d349-325e-4098-a7b4-0ec2fa7e4318';

INSERT INTO segment_phase_transitions
  (segment_id, from_status, to_status, actor_id)
VALUES
  ('d644d349-325e-4098-a7b4-0ec2fa7e4318', 'translated', 'edited', '<editor-1>');
```

Segment is now ready for the proofread phase.

---

### Step 13 — Phase 4b: Memory Update (edit-shaped, currently missing)

(See MEMORY-DB-DESIGN.md §7.2 — rpc_phase_4b_edit_save) In the design,
the edit pipeline's memory update is **different from translate's**:

- It does **not** typically write a new TM pair — the source→target
  mapping was already saved at translate time.
- It **does** update the existing TM entry's `target` field (overwrite
  the older target with the edited one), if confidence is high enough.
  Here the existing TM row would be the one written at translate time
  (`Kendo is not merely a martial art…`) and the edit would replace its
  `target_text` with the macroned form.
- It **does** record the diff as an "edit pattern": e.g.
  `"Kendo" → "Kendō"` (or more generally `unmacroned-onyomi → macroned`)
  becomes a reusable phrasing hint for future edits in this domain.
- It **may** promote `剣道 → kendō` from `preferred` to `required` based on
  cumulative acceptance count (since multiple translators clearly need
  the macron-enforcement signal escalated).

`[HUMAN SEES]` (proposed UI)

```
┌─ Save what was learned (edit)? ─────────────────────────────┐
│ ☑ Update TM entry to the edited target                      │
│       "Kendo …" → "Kendō …"                                 │
│ ☑ Record edit pattern: unmacroned-onyomi → macroned         │
│       ("Kendo" → "Kendō")                                   │
│ ☐ Promote 剣道 → kendō to required (acceptances: 1/3)        │
│                                                             │
│ [ Save selected ]   [ Skip ]                                │
└─────────────────────────────────────────────────────────────┘
```

Today none of this exists in code. The loop terminates at Step 12.

---

### Step 14 — What the next role sees

The `proofread` assignee opens the segment at position 0:

`[HUMAN SEES]`

```
┌─ Segment d644d349… (position 0) ──────── status: edited ────┐
│ JA: 剣道は単なる武術ではなく、精神的な修養の道でもあります。 │
│ EN: Kendō is not merely a martial art, but also a path of    │
│     spiritual cultivation.                                   │
│                                                              │
│ Activity:  🤖 2 suggestions · ✅ translator-1 (translate)    │
│            ✅ editor-1 (edit) · ⬆ advanced twice             │
│                                                              │
│ [ ✎ Edit ]  [ 🤖 Suggest proofread ]  [ 💬 Comment ]         │
└──────────────────────────────────────────────────────────────┘
```

The activity badges now show two completed agent-assisted human passes.
The proofread walkthrough is below.

---

### Edit task — key differences from translate at a glance

| Aspect            | Translate                                  | Edit                                                 |
|-------------------|--------------------------------------------|------------------------------------------------------|
| Input             | `sourceText`                               | `sourceText` **+ `targetText`**                      |
| Phase 0 extra     | —                                          | Diagnostic pass over current target                  |
| Phase 1 extra     | —                                          | Revision history of this segment                     |
| Phase 3 approaches| `literal / natural / formal`               | `light_touch / accuracy_focus / fluency_focus`       |
| "No-op" candidate | Not possible                               | `light_touch` may return current target unchanged    |
| Quality weights   | fluency .30 / adequacy .35 / term .20 / style .15 | acc-improve .40 / fluency-pres .25 / min-change .20 / term .15 |
| Memory update     | New TM pair                                | Update existing TM entry; record edit pattern        |
| Status transition | `draft → translated`                       | `translated → edited`                                |
| Cooperation write | `segment_suggestions` row                  | `segment_suggestions` row (same surface)             |

---

## Proofread — full walkthrough

This continues the same document, but introduces a **deliberately flawed
target** to make the proofread task pedagogically dramatic. Imagine that
between `editor-1`'s edit and now, a hasty touch-up pass — by a careless
co-editor or an autoformat tool — title-cased the English common nouns
mid-sentence. The segment arrives at proofread in this damaged state.

> Continuity note: in the strict translate→edit chain above, the segment
> at position 0 reached `edited` status as `"Kendō is not merely a
> martial art, but also a path of spiritual cultivation."`. For this
> walkthrough we replace it with the flawed variant below. Treat this
> section as a parallel branch of the same segment's history.

### Setup

- Same article `c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe`, same segment
  `d644d349-325e-4098-a7b4-0ec2fa7e4318` (position 0).
- Segment status: `edited`. Target text **(flawed)**:

  > Kendō is not merely a Martial Art, but also a Path of Spiritual Cultivation.

- Article is assigned for the `proofread` phase to user `proofreader-1`
  `[SYNTHESIZED — no proofreader profile exists in the current DB; first
  use marked]`.
- Article policy: `auto_accept_threshold = 0.95` (opt-in, for this
  walkthrough — to demonstrate the auto-accept branch). The default in
  the platform is off.
- Style guide rule (project-wide): English common nouns are lowercase
  mid-sentence; kendo romanizations carry their dictionary diacritics
  (kendō, dō, shūyō) and are italicised on first occurrence per chapter
  only.
  (See MEMORY-DB-DESIGN.md §3.1 — style_guide); today the rule lives in
  prompts.

The proofread task's job is **not** to retranslate or substantially edit.
It is to enforce surface correctness (spelling, casing, punctuation,
italicization), document-wide consistency, and the style guide — without
changing meaning.

**Consistency-evidence source.** Because this article has only one
translatable segment (L2 is degenerate — see Translate Step 3), the
document-consistency scan must lean on **cross-document corpus
statistics** rather than within-article tallies. The numbers cited below
come from the project-wide `translation_memory` corpus, not from
position 0's siblings.

---

### Step 1 — Proofreader opens the editor

`[HUMAN ACTS]` `proofreader-1` navigates to
`/documents/c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe/edit` and scrolls to
position 0 (`d644d349-…`).

`[HUMAN SEES]`

```
┌─ Position 0 ──────────────────────────── status: edited ────┐
│ JA: 剣道は単なる武術ではなく、精神的な修養の道でもあります。  │
│ EN: Kendō is not merely a Martial Art, but also a Path of    │
│     Spiritual Cultivation.                                   │
│                                                              │
│ Activity:  🤖 1 suggestion · ✅ translator-1 (translate)     │
│            ✅ editor-1 (edit) · ⚠ 3 style hints              │
│                                                              │
│ [ ✎ Edit ]  [ 🤖 Suggest proofread ]  [ 💬 Comment ]         │
└──────────────────────────────────────────────────────────────┘
```

The "⚠ 3 style hints" badge is generated by a passive client-side check
that flags English-mid-sentence capitalisation patterns as soon as the
segment is rendered. It does not block; it is informational. The
proofreader can either fix manually or invoke the agent.

`proofreader-1` invokes the agent.

---

### Step 2 — Proofreader requests an agent proofread suggestion

`[HUMAN ACTS]` Clicks **🤖 Suggest proofread**.

In current code: `POST /api/agents/proofread`. In the generalized design:
`POST /api/mac-rag` with `task: 'proofread'`. The walkthrough uses the
post-generalization shape.

`[AGENT IN]`

```json
{
  "task": "proofread",
  "segmentId": "d644d349-325e-4098-a7b4-0ec2fa7e4318",
  "documentId": "c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe",
  "sourceText": "剣道は単なる武術ではなく、精神的な修養の道でもあります。",
  "targetText": "Kendō is not merely a Martial Art, but also a Path of Spiritual Cultivation.",
  "sourceLang": "ja",
  "targetLang": "en",
  "approach":   "standard",
  "userOverrides": null
}
```

`[HUMAN SEES]` Spinner: `Running MAC-RAG (proofread)…`.

---

### Step 3 — Phase 0: Context Initialization (proofread-shaped)

The Phase 0 pass is heavily **surface-oriented** for proofread. Phase 0
materialises **L1 (segment-local)** surface analysis. **L2
(article-local)** neighbour evidence is degenerate here — positions 1
and 2 of article `c914a0bb` have empty source text and translator
commentary in their targets (see Translate Step 3) — so the consistency
case will be carried by L3 cross-document evidence in Step 4.

`[AGENT OUT]`

```json
{
  "domain":   { "label": "kendo", "confidence": 0.96 },
  "register": "formal",
  "entities": ["剣道", "武術", "道", "修養"],
  "targetSurfaceAnalysis": {
    "casing": [
      { "token": "Martial Art",
        "issue": "English common noun title-cased mid-sentence",
        "expected": "martial art", "severity": "minor" },
      { "token": "Path",
        "issue": "English common noun capitalised mid-sentence",
        "expected": "path",        "severity": "minor" },
      { "token": "Spiritual Cultivation",
        "issue": "English common noun phrase title-cased mid-sentence",
        "expected": "spiritual cultivation", "severity": "minor" }
    ],
    "italicisation": [
      { "token": "Kendō",
        "issue": "no italics; style guide italicises romanizations on first occurrence per chapter",
        "severity": "info",
        "needsChapterContext": true }
    ],
    "diacritics": [
      { "token": "Kendō",
        "status": "ok",
        "note": "macron preserved from edit phase" }
    ],
    "punctuation": [],
    "spelling":    []
  },
  "neighbours": {
    "prev": null,
    "next": {
      "source": "",
      "target": "(translator commentary — not parallel prose)",
      "degenerate": true,
      "reason": "position 1 has empty source_text; article uses commentary segments"
    }
  }
}
```

**Hierarchy mapping.**
- **L1 (segment-local):** `domain`, `register`, `entities`, and the
  entire `targetSurfaceAnalysis` block — all derived from the target
  segment's surface form.
- **L2 (article-local):** `neighbours` — degenerate. `prev` is `null`
  because position 0 has no predecessor; `next` is flagged degenerate
  because the article's other segments are commentary rather than
  parallel translated prose.

Because L2 cannot supply within-article casing evidence, Phase 1 will
lean harder on L3 cross-document corpus statistics — this is the same
sparse-L2 → L3-escalation pattern we saw in Translate Step 3.

---

### Step 4 — Phase 1: RAG Retrieval

Proofread brings in two retrieval sources that translate and edit do not
emphasise: a project-wide `documentConsistency` scan (cross-document
because L2 within-article evidence is degenerate) and the style guide as
a new L4 source.

**Cross-document consistency check** — scan the project corpus for how
the flagged English common-noun forms are cased mid-sentence elsewhere.

`[AGENT OUT]`

```json
{
  "tm": [
    { "ja": "剣道は身体の健康のためだけでなく、精神を鍛えるためのものでもあります。",
      "en": "Kendo is not only for physical health; it is also for achieving discipline of the spirit.",
      "score": 0.88,
      "source": "bbc6076b-21d5-4e2a-92e5-cab10677ad06 (Plano Kendo Dojo)",
      "note": "very high lexical+semantic overlap; same Kendo+spirit-cultivation theme" }
  ],
  "terminology": [
    { "ja": "剣道", "en": "kendō",    "type": "preferred",
      "casing": "lowercase mid-sentence; macron required" },
    { "ja": "武術", "en": "bujutsu",  "type": "preferred",
      "casing": "lowercase mid-sentence" },
    { "ja": "道",   "en": "dō",       "type": "preferred",
      "casing": "lowercase mid-sentence; macron required" }
  ],
  "documentConsistency": {
    "scope": "cross-document (L2 within-article degenerate)",
    "martial art":          { "lowercase_count": 14, "capitalised_count": 1,
                              "this_segment_uses": "title-cased" },
    "path":                 { "lowercase_count": 23, "capitalised_count": 2,
                              "this_segment_uses": "capitalised" },
    "spiritual cultivation":{ "lowercase_count":  6, "capitalised_count": 0,
                              "this_segment_uses": "title-cased" },
    "precedent_note": "cross-article TM row (bbc6076b) uses lowercase 'martial art'-adjacent diction"
  },
  "styleGuide": {
    "rules": [
      "English common nouns lowercase mid-sentence",
      "kendo romanizations carry dictionary diacritics (kendō, dō, shūyō)",
      "italicise romanizations only on first occurrence per chapter"
    ],
    "source": "(See MEMORY-DB-DESIGN.md §3.1 — style_guide); today prompt-embedded"
  },
  "qaIssuePatterns": "(See MEMORY-DB-DESIGN.md §3.2 — qa_issue_patterns)",
  "domainCorpus":    "[GAP]",
  "crossLingualKb":  "[GAP]"
}
```

**Hierarchy mapping.**
- **L3 (project-corpus):** `tm`, `terminology`, `documentConsistency`
  (project-scoped scan, used here in place of the degenerate L2).
- **L4 (external):** `styleGuide` — currently prompt-embedded
  (See MEMORY-DB-DESIGN.md §3.1 — style_guide), but conceptually an L4
  source.
- **L4 (planned):** `qaIssuePatterns`, `domainCorpus`, `crossLingualKb`
  — `[GAP]`.

The `documentConsistency` block is the decisive evidence: a strong
lowercase lean across the corpus for all three flagged phrases. The
proofread agent now has very high confidence that this segment is the
outlier.

---

### Step 5 — Phase 2: Context Pairing

Pairing inputs: **L1** from Step 3 (surface analysis); **L3 + L4** from
Step 4 (TM, terminology, cross-document consistency, style guide). L2
contributes nothing usable here (degenerate neighbours).

`[AGENT OUT]`

```json
{
  "promptContext": {
    "task": "proofread",
    "currentTarget": "Kendō is not merely a Martial Art, but also a Path of Spiritual Cultivation.",
    "surfaceIssues": [
      "Martial Art → martial art (casing; 14:1 corpus consistency)",
      "Path → path (casing; 23:2 corpus consistency)",
      "Spiritual Cultivation → spiritual cultivation (casing; 6:0 corpus consistency)"
    ],
    "italicHint": "first-occurrence italics on Kendō not determinable without chapter scan",
    "diacriticsHint": "macron on Kendō preserved — leave intact",
    "preserveHints": [
      "do not alter sentence structure",
      "do not alter word choice beyond surface corrections",
      "preserve adequacy exactly",
      "preserve the macron on Kendō"
    ]
  },
  "coverageReport": { "overall": 0.91, "gaps": ["L2 degenerate; relying on cross-document L3"] }
}
```

Within `promptContext`: `currentTarget`, `preserveHints`,
`diacriticsHint` carry **L1**; the `surfaceIssues` strings fuse **L1**
(the offending tokens) with **L3** (the consistency ratios);
`italicHint` carries **L4** style-guide provenance.

Coverage is high (proofread is mostly rule-checking once retrieval is
done), but slightly under translate/edit because L2 is degenerate.

---

### Step 5b — Context Builder Panel (proofread-shaped)

Same two-stage HTTP contract. The proofread version of the panel is
notably **shorter** — proofread rests on a small number of explicit
surface rules and decisive document-consistency evidence, so the prompt
fits in a few lines.

The composed prompt below matches the five-module skeleton (Role /
Task / Instructions / Examples / Format) used in Step 6 below.

`[AGENT OUT]` of the first call (`POST /api/mac-rag` for proofread) —
**system prompt** (literal):

```
# Role
You are a senior proofreader of English kendo prose translated from
Japanese. You work over a translation that has already passed translate
and edit phases. You correct surface issues only, using the project's
style guide and document-wide consistency evidence.

Cooperation-surface invariant: **I propose; I never commit.** Your output
is a proposed surface correction, not a final proofread. A human
proofreader will accept or reject it.

# Task
Correct surface issues in the current English target. Surface issues are
limited to: casing, spelling, punctuation, italicisation, diacritics,
and document-wide consistency of romanizations and common nouns.

Fidelity-first hard constraints:
- Do NOT alter word choice, sentence structure, or meaning.
- Do NOT change adequacy in any direction; preserve it exactly.
- Do NOT remove dictionary diacritics on kendo romanizations.
- If the existing text is already correct, return it unchanged with
  `surface_changes: []`. "No change" is a first-class output.
- Follow document-consistency evidence: if a form appears lowercase 14
  times and capitalised once (this segment), the capitalised form is the
  outlier and should be corrected.

# Instructions
1. Read the current target alongside the surface-issues list and style
   rules.
2. For each surface issue, decide whether the evidence is decisive. Only
   apply changes whose consistency evidence is strong.
3. Apply the per-approach tail (conservative / standard / house_style —
   only one is sent per call).
4. Emit `surface_changes` as a structured list, one entry per change:
   `{ "before": string, "after": string, "reason": string }`.
5. Quality-check before emitting: word choice unchanged; sentence
   structure unchanged; only surface attributes differ; macrons
   preserved; output is valid JSON matching the Format schema.

# Examples
**BAD** (rewords for fluency under the guise of proofreading)
{ "proposed_text": "Kendō is more than martial art; it is a way of inner discipline.",
  "surface_changes": [{ "before": "not merely a Martial Art, but also a Path of Spiritual Cultivation",
                        "after":  "more than martial art; it is a way of inner discipline",
                        "reason": "smoother phrasing" }],
  "confidence": 0.7 }
Rewording is out of scope for proofread. This is an edit, not a
proofread.

**GOOD**
{ "proposed_text": "Kendō is not merely a martial art, but also a path of spiritual cultivation.",
  "surface_changes": [{ "before": "Martial Art", "after": "martial art",
                        "reason": "corpus consistency 14:1 lowercase" },
                      { "before": "Path", "after": "path",
                        "reason": "corpus consistency 23:2 lowercase" },
                      { "before": "Spiritual Cultivation", "after": "spiritual cultivation",
                        "reason": "corpus consistency 6:0 lowercase" }],
  "confidence": 0.95 }
Three pure casing fixes; word choice, structure, and macron preserved.

# Format
Return strictly valid JSON matching this schema:
{
  "proposed_text":    string,
  "surface_changes":  [ { "before": string, "after": string, "reason": string } ],
  "confidence":       number
}
```

**user prompt** (literal):

```
Source:         剣道は単なる武術ではなく、精神的な修養の道でもあります。
Current target: Kendō is not merely a Martial Art, but also a Path of Spiritual Cultivation.

Style rules:
  - English common nouns lowercase mid-sentence
  - kendo romanizations carry dictionary diacritics (kendō, dō, shūyō)
  - italicise romanizations only on first occurrence per chapter
    (first-occurrence requires chapter scan — not determinable
    from segment context alone; see MEMORY-DB-DESIGN.md §3.6 —
    terminology.first_occurrence_per)

Doc-wide consistency evidence (cross-document; L2 within-article degenerate):
  - martial art:          14 lowercase, 1 title-cased (this segment)
  - path:                 23 lowercase, 2 capitalised (this segment)
  - spiritual cultivation: 6 lowercase, 0 title-cased (this segment is the first)

Diacritics: Kendō — macron present; preserve.

Surface issues identified upstream:
  - Martial Art           → martial art           (casing; 14:1 corpus)
  - Path                  → path                  (casing; 23:2 corpus)
  - Spiritual Cultivation → spiritual cultivation (casing;  6:0 corpus)

Approach: <one of conservative | standard | house_style — set per parallel call>
```

**HTTP envelope** wrapping the two literal blocks:

```json
{
  "stage": "phase2_complete",
  "segmentId": "d644d349-325e-4098-a7b4-0ec2fa7e4318",
  "task": "proofread",
  "composedPrompt": {
    "system": "<system prompt block above, literal>",
    "user":   "<user prompt block above, literal>"
  },
  "approaches": ["conservative", "standard", "house_style"],
  "coverageReport": { "overall": 0.91, "gaps": ["L2 degenerate; relying on cross-document L3"] }
}
```

`[HUMAN SEES]` the panel, with a leading **Surface issues** band:

```
┌─ Context Builder (proofread) ────────────────────────────────────────┐
│ Task: proofread         Segment: d644d349…       Coverage: 0.91      │
├──────────────────────────────────────────────────────────────────────┤
│ Surface issues:                                                      │
│   • Martial Art           → martial art           (14:1 corpus)      │
│   • Path                  → path                  (23:2 corpus)      │
│   • Spiritual Cultivation → spiritual cultivation ( 6:0 corpus)      │
├──────────────────────────────────────────────────────────────────────┤
│ System prompt (accordion; click ▸ to expand a module)                │
│   ▸ Role          (collapsed)                                        │
│   ▾ Task          (expanded — editable)                              │
│       Correct surface issues in the current English target.          │
│       Surface = casing, spelling, punctuation, italicisation,        │
│       diacritics, document-wide consistency.                         │
│       Fidelity-first hard constraints:                               │
│         - Do NOT alter word choice or structure.                     │
│         - Do NOT change adequacy.                                    │
│         - Do NOT strip macrons.                                      │
│         - "No change" is a first-class output.                       │
│   ▸ Instructions  (collapsed)                                        │
│   ▸ Examples      (collapsed)                                        │
│   ▸ Format        (collapsed — JSON schema)                          │
│   [ View raw system prompt ]                                         │
├──────────────────────────────────────────────────────────────────────┤
│ User prompt (editable, full)                                         │
│   Source:         剣道は単なる武術ではなく、精神的な修養の道でもあります。│
│   Current target: Kendō is not merely a Martial Art, but also a Path │
│                   of Spiritual Cultivation.                          │
│   Style: English common nouns lowercase mid-sentence;                │
│          macrons preserved; italics first-occurrence/chapter         │
│   Corpus consistency: martial art 14:1, path 23:2,                   │
│                       spiritual cultivation 6:0                      │
│   Surface issues: Martial Art→martial art,                           │
│                   Path→path,                                         │
│                   Spiritual Cultivation→spiritual cultivation        │
│   Approach: <conservative | standard | house_style>                  │
├──────────────────────────────────────────────────────────────────────┤
│ Will generate 3 candidates: conservative / standard / house_style    │
├──────────────────────────────────────────────────────────────────────┤
│        [ Generate ]   [ Cancel ]   [ Skip panel next time ]          │
└──────────────────────────────────────────────────────────────────────┘
```

`[HUMAN ACTS]`. Proofreaders typically scan the surface-issues list,
accept, and click **Generate**. The panel exists mostly as a safety
checkpoint — for catching cases where the surface "issue" is actually a
deliberate stylistic choice the human wants to keep.

`[AGENT IN]` of the second call (`POST /api/mac-rag/generate` for
proofread)

```json
{
  "segmentId": "d644d349-325e-4098-a7b4-0ec2fa7e4318",
  "task": "proofread",
  "composedPrompt": { "system": "…", "user": "… (possibly edited) …" },
  "approaches": ["conservative", "standard", "house_style"]
}
```

**Defaults.** Default-on. Some proofreaders may prefer to skip the
panel because the surface-rule space is small; the same user-level skip
toggle applies.

`[GAP]` Same two open questions as translate/edit.

---

### Step 6 — Phase 3: Multi-Candidate Generation

Three parallel LLM calls, **proofread approaches**:

- `conservative` — fix only what is unambiguously wrong; never introduce
  new style choices.
- `standard` — fix surface issues and enforce style guide; default
  approach.
- `house_style` — apply full house style including optional rules
  (e.g. italicise romanizations).

Each call uses a shared five-module system prompt (Role / Task /
Instructions / Examples / Format — per Appendix A.2.1 of the TODO plan)
plus an approach-specific tail.

`[AGENT IN]` (one of three; the `standard` call shown)

```
system:
# Role
You are a senior proofreader of English kendo prose translated from
Japanese. You work over a translation that has already passed translate
and edit phases. You correct surface issues only, using the project's
style guide and document-wide consistency evidence.

Cooperation-surface invariant: **I propose; I never commit.** Your output
is a proposed surface correction, not a final proofread. A human
proofreader will accept or reject it.

# Task
Correct surface issues in the current English target. Surface issues are
limited to: casing, spelling, punctuation, italicisation, diacritics,
and document-wide consistency of romanizations and common nouns.

Fidelity-first hard constraints:
- Do NOT alter word choice, sentence structure, or meaning.
- Do NOT change adequacy in any direction; preserve it exactly.
- Do NOT remove dictionary diacritics on kendo romanizations.
- If the existing text is already correct, return it unchanged with
  `surface_changes: []`. "No change" is a first-class output.
- Follow document-consistency evidence: if a form appears lowercase 14
  times and capitalised once (this segment), the capitalised form is the
  outlier and should be corrected.

# Instructions
1. Read the current target alongside the surface-issues list and style
   rules.
2. For each surface issue, decide whether the evidence is decisive. Only
   apply changes whose consistency evidence is strong.
3. Apply the per-approach tail (conservative / standard / house_style —
   only one is sent per call).
4. Emit `surface_changes` as a structured list, one entry per change:
   `{ "before": string, "after": string, "reason": string }`.
5. Quality-check before emitting: word choice unchanged; sentence
   structure unchanged; only surface attributes differ; macrons
   preserved; output is valid JSON matching the Format schema.

# Examples
**BAD** (rewords for fluency under the guise of proofreading)
```json
{ "proposed_text": "Kendō is more than martial art; it is a way of inner discipline.",
  "surface_changes": [{ "before": "not merely a Martial Art, but also a Path of Spiritual Cultivation",
                        "after":  "more than martial art; it is a way of inner discipline",
                        "reason": "smoother phrasing" }],
  "confidence": 0.7 }
```
Rewording is out of scope for proofread. This is an edit, not a
proofread.

**GOOD**
```json
{ "proposed_text": "Kendō is not merely a martial art, but also a path of spiritual cultivation.",
  "surface_changes": [{ "before": "Martial Art", "after": "martial art",
                        "reason": "corpus consistency 14:1 lowercase" },
                      { "before": "Path", "after": "path",
                        "reason": "corpus consistency 23:2 lowercase" },
                      { "before": "Spiritual Cultivation", "after": "spiritual cultivation",
                        "reason": "corpus consistency 6:0 lowercase" }],
  "confidence": 0.95 }
```
Three pure casing fixes; word choice, structure, and macron preserved.

# Format
Return strictly valid JSON matching this schema:

```
{
  "proposed_text":    string,    // the surface-corrected English target
  "surface_changes":  [          // one entry per change applied
    { "before": string, "after": string, "reason": string }
  ],
  "confidence":       number     // self-estimate, 0.0–1.0
}
```

user:
Source:         剣道は単なる武術ではなく、精神的な修養の道でもあります。
Current target: Kendō is not merely a Martial Art, but also a Path of Spiritual Cultivation.

Style rules:
  - English common nouns lowercase mid-sentence
  - kendo romanizations carry dictionary diacritics (kendō, dō, shūyō)
  - italicise romanizations only on first occurrence per chapter

Doc-wide consistency evidence (cross-document):
  - martial art:          14 lowercase, 1 title-cased (this segment)
  - path:                 23 lowercase, 2 capitalised (this segment)
  - spiritual cultivation: 6 lowercase, 0 title-cased (this segment is the first)

Diacritics: Kendō — macron present; preserve.

Surface issues identified upstream:
  - Martial Art           → martial art           (casing; 14:1 corpus)
  - Path                  → path                  (casing; 23:2 corpus)
  - Spiritual Cultivation → spiritual cultivation (casing;  6:0 corpus)

Approach: **standard** — fix surface issues and enforce documented style
rules. Apply optional rules (e.g., italics) only when their consistency
evidence is strong; otherwise leave them alone.
```

`[AGENT OUT]` (per-candidate, in parallel)

```json
{
  "conservative": "Kendō is not merely a martial art, but also a path of spiritual cultivation.",
  "standard":     "Kendō is not merely a martial art, but also a path of spiritual cultivation.",
  "house_style":  "*Kendō* is not merely a martial art, but also a path of spiritual cultivation."
}
```

Notice `conservative` and `standard` produced **identical** output — both
agreed the casing fixes are unambiguous (decisive corpus evidence on all
three phrases) and italicisation is optional. Only `house_style` adds
italics on `Kendō`. The pipeline keeps both rather than deduplicating;
the human can see that two independent approaches converged, which is
itself a confidence signal. All three preserve the macron.

---

### Step 7 — Phase 4a: Quality Assessment (proofread dimensions)

Proofread weights (MAC-RAG.md §3.3): surface-correctness 0.50 /
consistency 0.30 / meaning-preservation 0.20.

`[AGENT OUT]`

```json
[
  { "approach": "conservative",
    "scores": { "surface_correctness": 1.00,
                "consistency":         1.00,
                "meaning_preservation":1.00 },
    "overall": 1.00 },
  { "approach": "standard",
    "scores": { "surface_correctness": 1.00,
                "consistency":         1.00,
                "meaning_preservation":1.00 },
    "overall": 1.00 },
  { "approach": "house_style",
    "scores": { "surface_correctness": 1.00,
                "consistency":         0.90,
                "meaning_preservation":1.00 },
    "overall": 0.97,
    "note": "italics is optional per style guide; first-occurrence check not performed" }
]
```

`standard` and `conservative` tie at 1.00. The orchestrator's
tiebreaker prefers the **lower-risk** approach when scores tie:
`conservative` wins (in proofread, "less change at equal quality" is
better). The orchestrator marks `conservative` as `recommended: true`.

All three candidates exceed `auto_accept_threshold = 0.95`. This is the
first time in the four walkthroughs that auto-accept becomes possible.

---

### Step 8 — Routing decision: human-confirm vs auto-accept

Routing band for `overall=1.00` is `auto_accept` (≥ 0.95). The
orchestrator now checks the **document policy**:

```
document.policy.auto_accept_threshold = 0.95   (opt-in, this doc only)
candidate.overall                     = 1.00
```

Threshold met → auto-accept path. **Even on the auto-accept path, the
human is not bypassed; they are notified-after rather than asked-before.**

This is the proofread task's signature divergence from translate and
edit, both of which always require an explicit human accept click.

#### Branch A — Auto-accept (this doc's policy)

`[DB]` (server writes happen without waiting for human click)

```sql
-- 1. write the suggestion as already-accepted by the agent system user,
--    flagged as auto-accepted for auditability
INSERT INTO segment_suggestions
  (segment_id, suggester_id, suggester_kind, proposed_text,
   status, accepter_id, accepted_at, auto_accepted)
VALUES
  ('d644d349-325e-4098-a7b4-0ec2fa7e4318',
   '<agent-system-user-uuid>',
   'agent',
   'Kendō is not merely a martial art, but also a path of spiritual cultivation.',
   'accepted',
   '<agent-system-user-uuid>',
   now(),
   TRUE);

-- 2. update target_text via the system path (no soft-lock; auto-accept
--    bypasses the human lock but never bypasses the audit trail)
UPDATE segments
  SET target_text = 'Kendō is not merely a martial art, but also a path of spiritual cultivation.',
      status      = 'edited'   -- status unchanged; phase advance still requires human
WHERE id = 'd644d349-325e-4098-a7b4-0ec2fa7e4318';
```

The `segment_suggestions.auto_accepted` column and the opt-in policy
field `document.policy.auto_accept_threshold` do not currently exist;
both are part of the memory design
(See MEMORY-DB-DESIGN.md §3.6 — column additions to existing tables).

`[GAP]` In the real DB, position 0's `target_text` still holds the
unmacroned `"Kendo is not merely a martial art, but also a path of
spiritual cultivation."` (the W8a accepted output). The flawed
title-cased starting state and the corrected output above are
synthesised-forward for this section per Appendix B.5(c).

`[HUMAN SEES]` (passive notification, not a prompt)

```
┌─ Position 0 ──────────────── status: edited (auto-edited) ───┐
│ JA: 剣道は単なる武術ではなく、精神的な修養の道でもあります。  │
│ EN: Kendō is not merely a martial art, but also a path of    │
│     spiritual cultivation.                                   │
│                                                              │
│ ⚡ Auto-applied by agent — high-confidence surface fix,      │
│   above this article's auto-accept threshold                 │
│   3 surface fixes: Martial Art → martial art,                │
│                    Path → path,                              │
│                    Spiritual Cultivation → spiritual cultivation│
│   [ Review ]  [ Revert ]                                     │
│                                                              │
│ [ Advance to proofread ]                                     │
└──────────────────────────────────────────────────────────────┘
```

`proofreader-1` arrives, sees the auto-applied banner. She has 24 h
(configurable) to **revert** the auto-accept if she disagrees. After
that, the auto-accept becomes part of the audit-trail history but not
easily reversible. Phase advance is still a separate explicit click.

#### Branch B — Policy off (the platform default)

If `auto_accept_threshold` is unset or this segment's overall < threshold:

`[HUMAN SEES]`

```
┌─ Agent proofread suggestion ────────────────────────────────┐
│ This would be auto-accepted if article policy were on       │
│                                                             │
│ Current:                                                    │
│   "Kendō is not merely a Martial Art, but also a Path of    │
│    Spiritual Cultivation."                                  │
│                                                             │
│ Recommended — conservative casing fix                       │
│   "Kendō is not merely a martial art, but also a path of    │
│    spiritual cultivation."                                  │
│   What changes: Martial Art → martial art ·                 │
│                 Path → path ·                               │
│                 Spiritual Cultivation → spiritual cultivation│
│   Pure surface fix · meaning preserved · macron preserved · │
│   matches corpus-wide casing                                │
│   [ Accept ]  [ Edit & accept ]  [ Reject ]                 │
│                                                             │
│   ▸ Show alternative: standard (identical to recommended)   │
│   ▸ Show alternative: house style (also italicises Kendō)   │
│   ▸ Why this is recommended (details)                       │
│                                                             │
│ ⓘ This would be auto-accepted if article policy were on.    │
└─────────────────────────────────────────────────────────────┘
```

The infobox educates the proofreader about the auto-accept path without
ever taking the decision out of their hands. From here the flow is
identical to translate Step 11.

---

### Step 9 — Phase advance (both branches converge here)

`[HUMAN SEES]`

```
[ Advance to proofread ]
```

`[HUMAN ACTS]` `proofreader-1` clicks **Advance to proofread**.

`[DB]`

```sql
UPDATE segments SET status = 'proofread'
WHERE id = 'd644d349-325e-4098-a7b4-0ec2fa7e4318';

INSERT INTO segment_phase_transitions
  (segment_id, from_status, to_status, actor_id)
VALUES
  ('d644d349-325e-4098-a7b4-0ec2fa7e4318', 'edited', 'proofread', '<proofreader-1>');
```

Phase advance **is always human**, even when the content change was
auto-accepted. This is the platform's hard rule: cooperation status
transitions are never automated.

---

### Step 10 — Phase 4b: Memory Update (proofread-shaped, currently missing)

(See MEMORY-DB-DESIGN.md §7.3 — rpc_phase_4b_save_style /
rpc_phase_4b_promote_term) Proofread's memory update is again different
from translate and edit:

- It does **not** touch the TM (no source-target mapping changed beyond
  surface casing, which TM rows store case-insensitively at lookup).
- It **does** record a `qa_issue_pattern` row for future QA retrieval:
  `"English common-noun phrase title-cased mid-sentence"` with the
  resolution `"lowercase"`.
- It **does** add `martial art`, `path`, `spiritual cultivation` to the
  project's common-noun casing inventory if they are not already there,
  so the next segment's Phase 1 retrieval sees an even stronger
  lowercase lean.
- It **does not** promote any kendo terminology entry — none was
  modified by this proofread (the flaw was English-surface, not
  kendo-romanization-surface).

`[HUMAN SEES]` (proposed UI)

```
┌─ Save what was learned (proofread)? ────────────────────────┐
│ ☑ Record QA pattern: "English common-noun phrase            │
│       title-cased mid-sentence" → "lowercase"               │
│ ☑ Update corpus casing inventory:                           │
│       martial art (+1 lowercase, –1 title-cased)            │
│       path (+1 lowercase, –1 capitalised)                   │
│       spiritual cultivation (+1 lowercase)                  │
│ ☐ Promote any terminology rule  (no kendo-term changes)     │
│                                                             │
│ [ Save selected ]   [ Skip ]                                │
└─────────────────────────────────────────────────────────────┘
```

For auto-accepted suggestions, the proposed default is "save all" but
**still requires** a confirmation click — memory updates are never
automated, even when the suggestion itself was.

---

### Step 11 — What the next role sees

The `QA` reviewer opens position 0:

`[HUMAN SEES]`

```
┌─ Position 0 ────────────────────────── status: proofread ───┐
│ JA: 剣道は単なる武術ではなく、精神的な修養の道でもあります。  │
│ EN: Kendō is not merely a martial art, but also a path of    │
│     spiritual cultivation.                                   │
│                                                              │
│ Activity:  🤖 4 suggestions (1 auto-accepted)               │
│            ✅ translator-1 (translate)                       │
│            ✅ editor-1 (edit) ·                              │
│            ⚡ proofread (auto) · ⬆ proofreader-1 advanced    │
│                                                              │
│ [ 🔍 Run QA check ]  [ 💬 Comment ]                          │
└──────────────────────────────────────────────────────────────┘
```

Notice: **no `[ ✎ Edit ]` button at QA stage**. QA is advisory; it does
not edit. The QA walkthrough is below.

---

## QA-advisory — full walkthrough

QA-advisory is the most structurally different of the four tasks. It
exists to give the human reviewer a **second pair of eyes** before the
segment becomes the document's published output, but it deliberately
gives up several of the pipeline conveniences the other three tasks
enjoy:

- It produces an **issue list**, not a revised target. There is no
  candidate to accept.
- It writes **no** `segment_suggestions` row. Ever.
- Each issue lives in `qa_issues` and **only** after the human
  individually confirms it.
- The segment's `status` field does **not** auto-advance from `proofread`
  to `qa_approved`. Only the human can perform that transition.
- There is no auto-accept path. The "auto" word does not appear in QA.

The reason for all this is the same rule applied harder: QA is the last
gate before the segment leaves the cooperation surface. Anything
automated here would silently launder agent decisions into the published
output. So QA does almost nothing automatically.

### Setup

- Same article `c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe`, same segment
  `d644d349-325e-4098-a7b4-0ec2fa7e4318` (position 0).
- Segment status: `proofread`. Target text (clean, from proofread Step 8 / 9):

  > Kendō is not merely a martial art, but also a path of spiritual cultivation.

- Article is assigned for the `QA` phase to user `qa-1`
  `[SYNTHESIZED — no QA-reviewer profile exists in the current DB; first
  use marked]`.
- No document-policy field affects QA. There is no `qa_auto_*` setting.

`[GAP]` Real DB state for this segment after W8c proofread-rewrite is
still the W8a unmacroned target without case fixes; W8c and W8d both
synthesise forward from the corrected state per Appendix B.5(c).

---

### Step 1 — QA reviewer opens the editor

`[HUMAN ACTS]` `qa-1` navigates to `/articles/<article-id>/edit` and
filters the segment list to `status = proofread`. Opens position 0.

`[HUMAN SEES]`

```
┌─ Segment pos 0 ─────────────────────── status: proofread ───┐
│ JA: 剣道は単なる武術ではなく、精神的な修養の道でもあります。  │
│ EN: Kendō is not merely a martial art, but also a path of    │
│     spiritual cultivation.                                   │
│                                                              │
│ Activity:  🤖 4 suggestions (1 auto-accepted)               │
│            ✅ translator-1 (translate)                       │
│            ✅ editor-1 (edit) ·                              │
│            ⚡ proofread (auto) · ⬆ proofreader-1 advanced    │
│                                                              │
│ [ 🔍 Run QA check ]  [ 💬 Comment ]                          │
└──────────────────────────────────────────────────────────────┘
```

The buttonset is intentionally narrower than the other phases — no
`Edit`, no `Suggest`. `qa-1` cannot type into the target field at all
on this page. To change the text she would have to **send the segment
back** to proofread (a separate "Return to previous phase" action, not
covered here), then someone with the proofread assignment fixes and
re-advances. This friction is by design.

---

### Step 2 — QA reviewer requests a QA check

`[HUMAN ACTS]` Clicks **🔍 Run QA check**.

`[AGENT IN]` (post-generalization)

```json
{
  "task": "qa",
  "segmentId": "d644d349-325e-4098-a7b4-0ec2fa7e4318",
  "articleId":  "c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe",
  "sourceText": "剣道は単なる武術ではなく、精神的な修養の道でもあります。",
  "targetText": "Kendō is not merely a martial art, but also a path of spiritual cultivation.",
  "sourceLang": "ja",
  "targetLang": "en",
  "approach":   "issue_scan",
  "userOverrides": null
}
```

`approach` is always `issue_scan` for QA today. There is no menu of
approaches — N=1 generation, single style. Future task variants (e.g.
`issue_scan_terminology_only`) would slot in here.

`[HUMAN SEES]` Spinner: `Running MAC-RAG (QA)…`.

---

### Step 3 — Phase 0: Context Initialization (QA-shaped)

Phase 0 for QA does a **parallel pass on both source and target** and
classifies the segment by its QA-risk profile — what kinds of mistakes
are *possible* for a segment of this shape. **L1 (segment-local)**
carries the risk profile; **L2 (article-local)** is folded in here as
`phaseHistorySummary` — a phase-by-phase audit of how this segment moved
through the pipeline, which is article-scoped through the segment's own
phase-transition rows.

`[AGENT OUT]`

```json
{
  "domain":   { "label": "kendo", "confidence": 0.94 },
  "register": "formal",
  "riskProfile": {
    "hasNumerals":          false,
    "hasProperNames":       false,
    "hasTechnicalTerms":    true,  // 剣道, 武術, 道, 修養
    "hasNegation":          true,  // 〜ではなく、〜でもあります contrast
    "hasRegisterShift":     false,
    "hasIdiomaticPhrase":   false,
    "lengthRatioCheck":     "ok",  // JA 29 chars → EN 78 chars, in band
    "sentenceCount":        { "ja": 1, "en": 1, "match": true }
  },
  "phaseHistorySummary": {
    "translateAccepter": "translator-1",
    "editAccepter":      "editor-1",
    "proofreadAuto":     true,
    "humanEditsBeforeAccept": 1  // translator-1 edited the initial agent text in W8a
  }
}
```

**Hierarchy mapping.**
- **L1 (segment-local):** `domain`, `register`, the entire `riskProfile`
  block — all derived from this segment's source + final target.
- **L2 (article-local, segment-history scope):** `phaseHistorySummary`
  — a compressed read of the segment's own `segment_phase_transitions`
  rows; article-scoped because the workflow is the article's.

The `riskProfile` flags `hasNegation: true`. The JA construction
`〜ではなく、〜でもあります` ("not merely X, but also Y") is a
contrast/negation pattern, and JA→EN polarity flips on such
constructions (model accidentally collapses "not merely X" to "X" or
inverts the "but also" into a contradiction) is a known failure mode
QA will attend to.

The `phaseHistorySummary` matters because **proofread was
auto-accepted** for this segment. That is a signal QA should treat with
slightly more scrutiny than a fully-human-touched segment.

---

### Step 4 — Phase 1: RAG Retrieval

QA's distinctive retrieval source is **past QA issues** — the
`qa_issues` table itself, queried for patterns that historically
appeared on segments with similar risk profiles. This is the QA task's
primary **L3/L4** channel.

`[AGENT OUT]`

```json
{
  "pastQaIssues": [
    { "pattern": "polarity flip on JA contrast (〜ではなく…でもあります)",
      "occurrences": 5,
      "false_positive_rate_historical": 0.12,
      "example": "'not merely X but also Y' collapsed to 'X and Y' (loses contrast)" },
    { "pattern": "untranslated terminology missing [T/N] gloss",
      "occurrences": 4,
      "false_positive_rate_historical": 0.20,
      "example": "'spiritual cultivation' used as bare gloss; original 修養 not surfaced" }
  ],
  "qaIssuePatterns": "(See MEMORY-DB-DESIGN.md §3.2 — qa_issue_patterns); today using ad-hoc query",
  "terminology": [
    { "ja": "剣道", "en": "kendō (italic, first occurrence)", "type": "required",  "present": true },
    { "ja": "武術", "en": "martial art",                       "type": "preferred", "present": true },
    { "ja": "道",   "en": "path / way",                        "type": "preferred", "present": true },
    { "ja": "修養", "en": null,                                "type": null,        "present": false,
      "note": "not in project terminology table; target uses 'spiritual cultivation' as bare gloss without surfacing 修養 / shūyō" }
  ],
  "styleGuide":      "(See MEMORY-DB-DESIGN.md §3.1 — style_guide); today the italic-on-first-occurrence rule for romanizations is enforced at proofread but not formalised in a retrievable style guide",
  "documentConsistency": {
    "kendo_casing":            "K capitalised, ō macron preserved (consistent)",
    "english_common_nouns":    "lowercase mid-sentence — corpus 14:1 for 'martial art', 23:2 for 'path', 6:0 for 'spiritual cultivation'",
    "scope":                   "cross-document (L2 degenerate for this single-segment article — see W8c)"
  },
  "tm":             "not used in QA phase"
}
```

**Hierarchy mapping.**
- **L3 (project-corpus):** `pastQaIssues` (project-scoped `qa_issues`
  rows), `terminology`, `documentConsistency`.
- **L4 (external):** `qaIssuePatterns` (cross-project canonical
  patterns; see MEMORY-DB-DESIGN.md §3.2 — qa_issue_patterns),
  `styleGuide` (see MEMORY-DB-DESIGN.md §3.1 — style_guide).
- TM is explicitly **not used** — QA verifies; it does not generate.

QA does not consult the TM the way translate/edit do. TM is for
generation; QA is for verification.

---

### Step 5 — Phase 2: Context Pairing

Pairing inputs: **L1 + L2** from Step 3 (risk profile + phase history);
**L3 + L4** from Step 4 (past QA issues + terminology + style guide).

`[AGENT OUT]`

```json
{
  "promptContext": {
    "task": "qa",
    "source": "剣道は単なる武術ではなく、精神的な修養の道でもあります。",
    "target": "Kendō is not merely a martial art, but also a path of spiritual cultivation.",
    "riskFocus": [
      "polarity / negation (〜ではなく、〜でもあります ↔ 'not merely … but also …')",
      "terminology coverage (剣道, 武術, 道, 修養)",
      "untranslated-term gloss surfacing (修養 not in terminology table)"
    ],
    "knownPatterns": [
      "polarity flip on JA contrast (5 historical occurrences)",
      "untranslated terminology missing [T/N] gloss (4 historical)"
    ],
    "termsRequired":  ["剣道 → kendō (✓ present, italicised, macron preserved)"],
    "termsPreferred": ["武術 → martial art (✓ present, lowercase)",
                       "道   → path / way (✓ present as 'path', lowercase)"],
    "termsUncovered": ["修養 → no entry in terminology; target renders as 'spiritual cultivation' without surfacing original"]
  },
  "coverageReport": {
    "overall": 0.88,
    "gaps": ["修養 absent from project terminology table — bare-gloss risk"]
  }
}
```

Within `promptContext`: `source`, `target`, `riskFocus` carry **L1**;
`knownPatterns` carries **L3** (past QA issues distilled);
`termsRequired`/`termsPreferred` carry **L3** with presence checks
folded back against **L1**.

---

### Step 5b — Context Builder Panel (QA-shaped, default-off)

QA-advisory is the one task where the panel is **default-off**. Two
reasons:

1. QA is a single-pass generation (`approaches: ['issue_scan']`, N=1).
   There is no candidate diversity to steer with prompt edits.
2. QA-advisory's value comes from being a *fresh* second pair of eyes;
   pre-shaping its prompt risks the human anchoring the agent to the
   issues they already suspect, defeating the point.

Therefore the orchestrator runs Phases 0 → 3 in a single call for QA by
default. The panel can be **turned on per-user** via
`userPreferences.context_builder.qa = true` for users who want to
review or constrain the QA prompt (e.g., to instruct the agent to
ignore a specific known-false-positive pattern for this segment).

When enabled, the panel shape is the same two-stage HTTP contract as
the other tasks. The composed prompt below matches the five-module
skeleton (Role / Task / Instructions / Examples / Format) used in
Step 6 below.

`[AGENT OUT]` of the first call (only emitted when the toggle is on) —
**system prompt** (literal):

```
# Role
You are a senior QA reviewer for Japanese→English kendo translations.
You provide a fresh, independent assessment of an already-edited and
proofread translation. You work over the same terminology dictionary and
translation-memory substrate used upstream, plus a list of historical
risk patterns from the project.

Cooperation-surface invariant: **I propose; I never commit.** Your
output is an advisory issue list, not a verdict. A human reviewer will
triage every flagged issue. You never write fixes; you only flag.

# Task
Examine the source and target for translation issues that survived
translate / edit / proofread. Categorise each issue and assess severity.
If you find no material issues, return an empty list.

Fidelity-first hard constraints:
- Do NOT propose a fixed translation. Output is issues only.
- Do NOT flag stylistic preferences as defects; reserve `major` for
  adequacy-breaking issues, `minor` for clear surface defects, `info`
  for observations.
- Quote the offending span verbatim in `span`; do not paraphrase it.
- An empty `issues` array is a first-class output, not a failure.

# Instructions
1. Read source and target in full; do not skim.
2. Walk the Risk-focus list as a checklist; for each focus, decide
   whether the target exhibits the failure mode.
3. Cross-check Required and Preferred terminology coverage independently.
4. Consult Historical patterns for project-specific failure modes.
5. For every issue found, emit one entry with category, severity, span,
   and a one-line note.
6. Quality-check before emitting: every `span` substring appears in the
   target verbatim; output is valid JSON matching the Format schema.

# Examples
**BAD** (proposes a fix; violates "flag, do not fix")
{ "issues": [
    { "span": "path of spiritual cultivation",
      "category": "terminology",
      "severity": "minor",
      "note": "should read 'path of shūyō (spiritual cultivation)'" }
  ] }
The note proposes a replacement translation. QA must flag, not rewrite.

**GOOD**
{ "issues": [
    { "span": "path of spiritual cultivation",
      "category": "terminology",
      "severity": "info",
      "note": "原語 修養 (shūyō) not surfaced; bare-gloss may lose religious-philosophical connotation; consider [T/N]" }
  ] }
Same observation, framed as a flag for human triage. No fix proposed.

# Format
Return strictly valid JSON matching this schema:
{
  "issues": [
    {
      "span":     string,                                  // verbatim substring of target
      "category": "terminology" | "accuracy" | "fluency" | "consistency" | "style",
      "severity": "major" | "minor" | "info",
      "note":     string                                    // one-line flag; no fix proposed
    }
  ]
}
```

**user prompt** (literal):

```
Source: 剣道は単なる武術ではなく、精神的な修養の道でもあります。
Target: Kendō is not merely a martial art, but also a path of spiritual cultivation.

Risk focus (advisory checklist):
  - polarity / negation (〜ではなく、〜でもあります ↔ "not merely … but also …")
  - terminology coverage (剣道, 武術, 道, 修養)
  - untranslated-term gloss surfacing (修養 not in terminology table)

Historical patterns:
  - polarity flip on JA contrast (5 historical occurrences in this project)
  - untranslated terminology missing [T/N] gloss (4 historical occurrences)

Required terms — coverage check:
  - 剣道 → kendō     ✓ present in target (italicised, macron preserved)

Preferred terms — coverage check:
  - 武術 → martial art  ✓ present in target (lowercase)
  - 道   → path / way   ✓ present in target as "path" (lowercase)

Uncovered terms:
  - 修養 → (no entry in project terminology); target renders as
           "spiritual cultivation" as a bare gloss without surfacing
           the original term.
```

**HTTP envelope** wrapping the two literal blocks:

```json
{
  "stage": "phase2_complete",
  "segmentId": "d644d349-325e-4098-a7b4-0ec2fa7e4318",
  "task": "qa",
  "composedPrompt": {
    "system": "<system prompt block above, literal>",
    "user":   "<user prompt block above, literal>"
  },
  "approaches": ["issue_scan"],
  "coverageReport": { "overall": 0.88, "gaps": ["修養 absent from project terminology table"] }
}
```

`[HUMAN SEES]` (only when toggle is on) — a leaner panel because there
is only one approach and no candidate diversity:

```
┌─ Context Builder (QA, optional) ─────────────────────────────────────┐
│ Task: qa            Segment: d644d349…    Coverage: 0.88             │
├──────────────────────────────────────────────────────────────────────┤
│ Risk focus:                                                          │
│   • polarity / negation (〜ではなく…でもあります)                       │
│   • terminology coverage (剣道, 武術, 道, 修養)                        │
│   • untranslated-term gloss surfacing                                │
│ Known patterns:                                                      │
│   • polarity flip on JA contrast (5 historical)                      │
│   • untranslated terminology missing [T/N] gloss (4 historical)      │
├──────────────────────────────────────────────────────────────────────┤
│ System prompt (accordion; click ▸ to expand a module)                │
│   ▸ Role          (collapsed)                                        │
│   ▾ Task          (expanded — editable)                              │
│       Examine source and target for translation issues that survived │
│       translate / edit / proofread. Categorise and assess severity.  │
│       Fidelity-first hard constraints:                               │
│         - Do NOT propose a fixed translation.                        │
│         - Quote spans verbatim.                                      │
│         - Empty issues array is a first-class output.                │
│   ▸ Instructions  (collapsed)                                        │
│   ▸ Examples      (collapsed)                                        │
│   ▸ Format        (collapsed — JSON schema)                          │
│   [ View raw system prompt ]                                         │
├──────────────────────────────────────────────────────────────────────┤
│ User prompt (editable, full)                                         │
│   Source: 剣道は単なる武術ではなく、精神的な修養の道でもあります。       │
│   Target: Kendō is not merely a martial art, but also a path of      │
│           spiritual cultivation.                                     │
│   Risk focus: polarity; terminology coverage; gloss surfacing        │
│   Historical: polarity flip on JA contrast (5);                      │
│               untranslated-term gloss missing (4)                    │
│   Required ✓ kendō   Preferred ✓ martial art ✓ path                  │
│   Uncovered ✗ 修養 (no entry; rendered as bare gloss)                │
├──────────────────────────────────────────────────────────────────────┤
│ Single-pass issue scan (N=1)                                         │
├──────────────────────────────────────────────────────────────────────┤
│        [ Run QA ]   [ Cancel ]   [ Turn off panel for QA ]           │
└──────────────────────────────────────────────────────────────────────┘
```

`[HUMAN ACTS]` (only when toggle is on). QA reviewer typically clicks
**Run QA** without editing; the panel mainly serves as a transparency
checkpoint ("the agent will scan for these risks") rather than a
steering surface.

`[AGENT IN]` of the second call (only when toggle is on)

```json
{
  "segmentId": "d644d349-325e-4098-a7b4-0ec2fa7e4318",
  "task": "qa",
  "composedPrompt": { "system": "…", "user": "… (possibly edited) …" },
  "approaches": ["issue_scan"]
}
```

**Defaults.** Default-**off**. The per-user toggle is the only path to
the panel for QA. The "Turn off panel for QA" button inside the panel
flips the flag back without leaving the page.

`[GAP]` Same two open questions as the other tasks: prune-retrieval-
results UI, prompt-edit audit trail. For QA, audit-trail is
particularly weighty — pre-shaping a QA prompt has reviewer-bias
implications that may warrant mandatory logging even if optional
elsewhere.

---

### Step 6 — Phase 3: Generation (N=1, `issue_scan`)

A single LLM call. The agent must return a structured issue list (or
empty list), not free text. Unlike translate/edit/proofread, there is
only one approach (`issue_scan`) and no candidate diversity — the
five-module prompt is reused verbatim from the Step 5b composed prompt
above.

`[AGENT IN]`

```
system:
# Role
You are a senior QA reviewer for Japanese→English kendo translations.
You provide a fresh, independent assessment of an already-edited and
proofread translation. You work over the same terminology dictionary and
translation-memory substrate used upstream, plus a list of historical
risk patterns from the project.

Cooperation-surface invariant: **I propose; I never commit.** Your
output is an advisory issue list, not a verdict. A human reviewer will
triage every flagged issue. You never write fixes; you only flag.

# Task
Examine the source and target for translation issues that survived
translate / edit / proofread. Categorise each issue and assess severity.
If you find no material issues, return an empty list.

Fidelity-first hard constraints:
- Do NOT propose a fixed translation. Output is issues only.
- Do NOT flag stylistic preferences as defects; reserve `major` for
  adequacy-breaking issues, `minor` for clear surface defects, `info`
  for observations.
- Quote the offending span verbatim in `span`; do not paraphrase it.
- An empty `issues` array is a first-class output, not a failure.

# Instructions
1. Read source and target in full; do not skim.
2. Walk the Risk-focus list as a checklist; for each focus, decide
   whether the target exhibits the failure mode.
3. Cross-check Required and Preferred terminology coverage independently.
4. Consult Historical patterns for project-specific failure modes.
5. For every issue found, emit one entry with category, severity, span,
   and a one-line note.
6. Quality-check before emitting: every `span` substring appears in the
   target verbatim; output is valid JSON matching the Format schema.

# Examples
**BAD** (proposes a fix; violates "flag, do not fix")
```json
{ "issues": [
    { "span": "path of spiritual cultivation",
      "category": "terminology",
      "severity": "minor",
      "note": "should read 'path of shūyō (spiritual cultivation)'" }
  ] }
```
The note proposes a replacement translation. QA must flag, not rewrite.

**GOOD**
```json
{ "issues": [
    { "span": "path of spiritual cultivation",
      "category": "terminology",
      "severity": "info",
      "note": "原語 修養 (shūyō) not surfaced; bare-gloss may lose religious-philosophical connotation; consider [T/N]" }
  ] }
```
Same observation, framed as a flag for human triage. No fix proposed.

# Format
Return strictly valid JSON matching this schema:

```
{
  "issues": [
    {
      "span":     string,                                  // verbatim substring of target
      "category": "terminology" | "accuracy" | "fluency" | "consistency" | "style",
      "severity": "major" | "minor" | "info",
      "note":     string                                    // one-line flag; no fix proposed
    }
  ]
}
```

user:
Source: 剣道は単なる武術ではなく、精神的な修養の道でもあります。
Target: Kendō is not merely a martial art, but also a path of spiritual cultivation.

Risk focus (advisory checklist):
  - polarity / negation (〜ではなく、〜でもあります ↔ "not merely … but also …")
  - terminology coverage (剣道, 武術, 道, 修養)
  - untranslated-term gloss surfacing (修養 not in terminology table)

Historical patterns:
  - polarity flip on JA contrast (5 historical occurrences in this project)
  - untranslated terminology missing [T/N] gloss (4 historical occurrences)

Required terms — coverage check:
  - 剣道 → kendō     ✓ present in target (italicised, macron preserved)

Preferred terms — coverage check:
  - 武術 → martial art  ✓ present in target (lowercase)
  - 道   → path / way   ✓ present in target as "path" (lowercase)

Uncovered terms:
  - 修養 → (no entry in project terminology); target renders as
           "spiritual cultivation" as a bare gloss without surfacing
           the original term.
```

The agent's response varies. Two realistic branches follow.

---

### Branch X — Agent finds zero issues (clean pass)

`[AGENT OUT]`

```json
{ "issues": [] }
```

---

### Step 7X — Phase 4a: Quality Assessment (of an empty issue list)

For QA the scorer evaluates the **issue list itself**, not a candidate
translation. Dimensions: issue-recall .50 / FPR .30 /
severity-calibration .20.

`[AGENT OUT]`

```json
{
  "scores": {
    "issue_recall":          0.90,
    "false_positive_rate":   1.00,   // higher is better; 1.00 = zero FPs
    "severity_calibration":  1.00
  },
  "overall": 0.95,
  "note":    "high recall self-estimate; nothing flagged; no FPs possible on empty list"
}
```

Routing band for an empty issue list is `clean_pass` — a QA-specific
band that does not exist in translate/edit/proofread's bands. It signals
to the UI: "the agent has reviewed and found nothing; the human still
decides."

---

### Step 8X — Server response (no DB writes yet)

`[DB]` **Nothing written.** Unlike the other three tasks, QA does
not insert any row on its own. The only row that may eventually exist is
in `qa_issues`, and only on human confirm — and there are no issues to
confirm here.

`[AGENT OUT]` (HTTP response)

```json
{
  "issues": [],
  "scores": { "issue_recall": 0.90, "false_positive_rate": 1.00,
              "severity_calibration": 1.00, "overall": 0.95 },
  "routing": "clean_pass",
  "coverageReport": { "overall": 0.88, "gaps": ["修養 absent from project terminology table"] }
}
```

---

### Step 9X — Human sees a clean-pass report

`[HUMAN SEES]`

```
┌─ QA report ─ segment pos 0 ─────────── ✅ Clean pass ──────┐
│ The agent reviewed source and target and found no material │
│ issues.                                                    │
│                                                            │
│ Coverage: 0.88 — every risk-focus area on the checklist    │
│ was examined. One gap noted: 修養 not in terminology table │
│ (target uses 'spiritual cultivation' as a bare gloss).     │
│                                                            │
│ ⓘ The agent's clean-pass is advisory. Approve this segment │
│   yourself if you agree.                                   │
│                                                            │
│ [ Approve segment ]   [ Send back to proofread ]           │
│                                                            │
│ ▸ QA self-assessment (details)                             │
└────────────────────────────────────────────────────────────┘
```

The button is `[ Approve segment ]`, not `[ Accept agent verdict ]`. The
UI deliberately frames the action as the human's own approval, with the
agent's clean-pass as supporting evidence. Raw recall / FPR / calibration
numbers live behind the **QA self-assessment** drawer for users who
explicitly want them.

---

### Step 10X — Human approves

`[HUMAN ACTS]` `qa-1` reads the source and target one more time
herself, agrees, clicks **Approve segment**.

`[DB]`

```sql
UPDATE segments SET status = 'qa_approved'
  WHERE id = 'd644d349-325e-4098-a7b4-0ec2fa7e4318';

INSERT INTO segment_phase_transitions
  (segment_id, from_status, to_status, actor_id)
VALUES
  ('d644d349-325e-4098-a7b4-0ec2fa7e4318',
   'proofread', 'qa_approved', '<qa-1>');
```

`qa_approved` is the terminal status for the segment. No further phase
exists. The agent's `clean_pass` verdict has now produced exactly one DB
write — and that write was performed **by the human, not by the agent**.

`[HUMAN SEES]`

```
┌─ Segment pos 0 ─────────────────────── status: qa_approved ─┐
│ ✅ Approved by qa-1.                                         │
│   Agent QA: clean pass — high confidence                    │
│ Activity:  🤖 4 suggestions · 🔍 1 QA pass (clean)          │
│            ✅ approved by qa-1                               │
└─────────────────────────────────────────────────────────────┘
```

---

### Branch Y — Agent flags one info-severity issue

Replay Step 6 with a different LLM output.

`[AGENT OUT]` (Step 6, branch Y)

```json
{
  "issues": [
    {
      "id":          "iss-1",
      "type":        "terminology",
      "severity":    "info",
      "location":    "path of spiritual cultivation",
      "description": "原語 修養 (shūyō) is not surfaced to the reader. 'spiritual cultivation' is used as a bare gloss; the kendo-philosophical connotation of 修養 (self-cultivation, character training rooted in moral/religious discipline) may be lost. Project terminology table has no entry for 修養.",
      "evidence":    "Source token 修養 has no romanized counterpart in target; appears at char 47–77 ('path of spiritual cultivation').",
      "suggestion":  "Consider a [T/N: shūyō] gloss or italicised romanization on first occurrence.",
      "confidence":  0.62,
      "needsTerminologyDecision": true
    }
  ]
}
```

The flag is **info** (not minor) — bare-gloss is a judgment call, not a
defect. The agent hedges with `confidence: 0.62` and
`needsTerminologyDecision: true`: it cannot decide whether to surface
修養 without a project terminology policy entry, which does not exist.

---

### Step 7Y — Phase 4a: Quality Assessment (of a 1-issue list)

`[AGENT OUT]`

```json
{
  "scores": {
    "issue_recall":          0.80,   // moderate; one flag, may miss others
    "false_positive_rate":   0.80,   // 0.80 = est. 20% chance this flag is spurious
    "severity_calibration":  0.95
  },
  "overall": 0.83,
  "note":    "single info-severity flag with moderate confidence; hedged by needsTerminologyDecision"
}
```

Routing band: `issues_pending_review` (QA-specific). The UI must surface
each issue individually for human triage.

---

### Step 8Y — Server response (still no DB writes)

`[DB]` **Still nothing written.** The `qa_issues` table will be touched
only after the human triages.

`[AGENT OUT]` (HTTP response)

```json
{
  "issues": [
    { "id": "iss-1", "type": "terminology", "severity": "info",
      "location": "path of spiritual cultivation",
      "description": "…", "suggestion": "…", "confidence": 0.62,
      "needsTerminologyDecision": true }
  ],
  "scores": { "issue_recall": 0.80, "false_positive_rate": 0.80,
              "severity_calibration": 0.95, "overall": 0.83 },
  "routing": "issues_pending_review",
  "coverageReport": { "overall": 0.88, "gaps": ["修養 absent from project terminology table"] }
}
```

---

### Step 9Y — Human sees the issue triage panel

`[HUMAN SEES]`

```
┌─ QA report ─ segment pos 0 ──────── 1 issue to triage ─────┐
│ Issue 1 of 1 — info terminology flag                       │
│                                                            │
│ Where: "path of spiritual cultivation"                     │
│                                                            │
│ What the agent says:                                       │
│   原語 修養 (shūyō) is not surfaced to the reader.         │
│   'spiritual cultivation' is used as a bare gloss; the     │
│   kendo-philosophical connotation of 修養 (self-cultivation│
│   rooted in moral/religious discipline) may be lost.       │
│   Project terminology table has no entry for 修養.         │
│                                                            │
│ What the agent suggests considering:                       │
│   A [T/N: shūyō] gloss or italicised romanization          │
│   on first occurrence.                                     │
│                                                            │
│ ⚠ The agent could not decide whether to surface 修養       │
│   without a project terminology policy entry, which        │
│   does not exist — treat this flag as a hint, not          │
│   a finding.                                               │
│                                                            │
│ [ Confirm issue ]  [ Dismiss as false positive ]           │
│ [ Defer (leave open) ]                                     │
│                                                            │
│ Overall: one info-severity flag pending your review        │
│                                                            │
│ [ Approve segment ]   [ Send back to proofread ]           │
│                                                            │
│ ▸ QA self-assessment (details)                             │
└────────────────────────────────────────────────────────────┘
```

Three triage actions per issue, in increasing weight:

- **Confirm issue** — records the issue in `qa_issues`. The segment is
  not blocked; QA-advisory does not gate approval on open issues. It
  merely records them for the document's QA log and for future retrieval.
- **Dismiss as false positive** — records the dismissal as
  helpful-feedback for the agent's future calibration.
- **Defer** — issue stays attached to the segment but in `open` state,
  visible to a senior reviewer or revisited later.

The two segment-level actions are independent of the issue triage:
`qa-1` can approve the segment **even with an open or confirmed
issue** — issues are advisory, approval is the human's call. Raw recall
/ FPR / calibration numbers live behind the **QA self-assessment**
drawer.

---

### Step 10Y — Human triages and approves

`[HUMAN ACTS]` `qa-1` reviews the project's translator notes for other
articles in the corpus and confirms that 修養 has been left as the
bare gloss "spiritual cultivation" in 3 of 4 prior occurrences without
a [T/N] gloss. So the agent's flag is defensible but not project
convention. She clicks **Defer (leave open)** — the issue stays
attached as a memory anchor for a future terminology-table decision,
but does not block this segment.

`[DB]`

```sql
INSERT INTO qa_issues
  (segment_id, issue_type, severity, location, description,
   agent_confidence, status, triaged_by, triaged_at, defer_reason)
VALUES
  ('d644d349-325e-4098-a7b4-0ec2fa7e4318', 'terminology', 'info',
   'path of spiritual cultivation',
   '原語 修養 (shūyō) not surfaced; bare-gloss risk for kendo-philosophical connotation',
   0.62,
   'open_deferred',
   '<qa-1>',
   now(),
   '修養 left as bare gloss in 3 of 4 prior occurrences; defer until project terminology entry is added');
```

Note: the row in `qa_issues` is created **at the moment of human
triage** — confirmed *or* dismissed *or* deferred. The deferred-with-
reason row is valuable training data both for a future terminology
policy decision and for the agent's future calibration, so we record
it rather than discarding.

Then `qa-1` clicks **Approve segment**.

`[DB]`

```sql
UPDATE segments SET status = 'qa_approved'
  WHERE id = 'd644d349-325e-4098-a7b4-0ec2fa7e4318';

INSERT INTO segment_phase_transitions
  (segment_id, from_status, to_status, actor_id)
VALUES
  ('d644d349-325e-4098-a7b4-0ec2fa7e4318',
   'proofread', 'qa_approved', '<qa-1>');
```

`[HUMAN SEES]`

```
┌─ Segment pos 0 ─────────────────────── status: qa_approved ─┐
│ ✅ Approved by qa-1.                                         │
│   Agent QA: 1 flag, deferred for terminology decision       │
│   Reason: '修養 left as bare gloss in 3 of 4 prior          │
│            occurrences; defer until terminology entry added'│
│ Activity:  🤖 4 suggestions · 🔍 1 QA pass (1 flag, deferred)│
│            ✅ approved by qa-1                               │
└─────────────────────────────────────────────────────────────┘
```

---

### Step 11 — Phase 4b: Memory Update (QA-shaped, currently missing)

(See MEMORY-DB-DESIGN.md §7.4 — rpc_phase_4b_qa_save) QA's memory
update has two distinctive shapes:

- On **confirmed** issues: record into `qa_issue_patterns` (the
  retrieval view used in Phase 1 of future QA runs) with severity and
  the dismissal-rate-so-far.
- On **dismissed** issues: record into the same view but as a
  false-positive datapoint. This is how the agent's FPR self-estimate
  gets calibrated over time.
- It does **not** touch the TM, terminology, or style guide. QA learns
  about its **own quality**, not about the source/target mapping.

`[HUMAN SEES]` (proposed UI; appears after triage of any issue)

```
┌─ Save what was learned (QA)? ───────────────────────────────┐
│ ☑ Record deferral in qa_issue_patterns                      │
│       (pattern: 'untranslated-term bare-gloss'; +1 deferred │
│        with terminology-policy gap reason)                  │
│ ☑ Flag 修養 for the terminology-table curation queue        │
│       (5 occurrences across corpus, no entry; recurring     │
│        bare-gloss flag suggests promoting to required term) │
│                                                             │
│ [ Save selected ]   [ Skip ]                                │
└─────────────────────────────────────────────────────────────┘
```

The second checkbox is unusually direct — QA's learning includes
**feeding the terminology curation queue**. Whether the platform
allows QA to nominate terminology entries remains a policy decision;
the design today is that humans see the proposed adjustment and choose.

`qa_issue_patterns` does not currently exist; nor does the threshold
machinery. Today the loop terminates at Step 10Y.

---

### What happens to the segment now

`qa_approved` is the terminal status. The segment leaves the
cooperation surface for the document's published output (export, build,
delivery). No further phase exists for this segment.

If anything is later found wrong with a `qa_approved` segment, the
recovery path is a **revoke**: an admin (or in some workflows, any
proofread+ assignee) can move the segment back to `proofread` with an
explicit revoke audit row. That is a separate workflow not detailed
here.

---

### Four-task summary — Translate / Edit / Proofread / QA at a glance

A per-task summary across the dimensions exercised by the four
walkthroughs above. All four are grounded in the same real DB row:
article `c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe`, segment
`d644d349-325e-4098-a7b4-0ec2fa7e4318` (position 0).

| Dimension                       | Translate                                    | Edit                                                  | Proofread                                                   | QA-advisory                                                 |
|---------------------------------|----------------------------------------------|-------------------------------------------------------|-------------------------------------------------------------|-------------------------------------------------------------|
| Agent role-name                 | `translator-1` (real DB user)                | `editor-1` `[SYNTHESIZED]`                            | `proofreader-1` `[SYNTHESIZED]`                             | `qa-1` `[SYNTHESIZED]`                                      |
| Real-data anchor                | article `c914a0bb…` segment 0                | same row, post-translate                              | same row, post-edit                                         | same row, post-proofread                                    |
| N candidates                    | N=3 (`literal / natural / formal`)           | N=3 (`light_touch / accuracy_focus / fluency_focus`)  | N=3 (`min_change / corpus_consistent / style_guide_strict`) | **N=1** (`issue_scan`)                                      |
| Context Builder Panel default   | **on**                                       | **on**                                                | **on**                                                      | **off** (per-user opt-in)                                   |
| Auto-accept policy              | n/a (always human-confirm)                   | n/a (always human-confirm)                            | opt-in via `auto_accept_threshold` (this doc demos it on)   | n/a (never)                                                 |
| Status transition               | `draft → translated`                         | `translated → edited`                                 | `edited → proofread`                                        | `proofread → qa_approved` (terminal)                        |
| Cooperation write (suggestion)  | `segment_suggestions` row                    | `segment_suggestions` row                             | `segment_suggestions` row                                   | **never writes `segment_suggestions`**                      |
| QA-issues write                 | n/a                                          | n/a                                                   | n/a                                                         | `qa_issues` on human confirm or dismiss only                |
| Phase 4b memory-update writes   | TM pair + terminology candidate (`修養 → spiritual cultivation`) | edit_patterns + TM target overwrite + terminology promotion candidate | `qa_issue_patterns` + corpus casing inventory (no TM write) | `qa_issue_patterns` row only (no TM, no terminology direct write); flags `修養` for curation queue |
| Freshest detail (W8 / this pass)| TM-pair confidence tempered by human rewrite | macron edit pattern recorded                          | corpus casing inventory update (`martial art`, `path`, `spiritual cultivation`) | info-severity flag on `修養` bare-gloss              |

The wider QA-vs-the-others table below preserves contrasts the per-task
view flattens (routing bands, quality dimensions, output shape).

### QA-advisory — key differences from the other three tasks at a glance

| Aspect                | Translate / Edit / Proofread             | QA-advisory                                          |
|-----------------------|------------------------------------------|------------------------------------------------------|
| Generation count      | N=3 (multi-candidate)                    | **N=1**                                              |
| Approach menu         | 3 task-specific approaches               | **Single approach: `issue_scan`**                    |
| Output shape          | Revised target text                      | **Structured issue list (JSON)**                     |
| Recommended candidate | Yes, marked by scorer                    | n/a                                                  |
| segment_suggestions write | Yes, by orchestrator                 | **Never**                                            |
| Auto-accept           | Proofread only (opt-in)                  | **Never**                                            |
| Status auto-advance   | Never (always human-clicked)             | **Never** (same rule, hit harder)                    |
| qa_issues write       | n/a                                      | **Only on human confirm or dismiss**                 |
| Edit button on UI     | Yes                                      | **No** (text is immutable from this page)            |
| Routing bands         | auto_accept / light_pe / standard_pe / full_revision / reject | **clean_pass / issues_pending_review** |
| Quality dimensions    | task-specific weights over candidate text | issue-recall .50 / FPR .30 / severity-calibration .20 |
| Quality target        | The candidate                            | **The issue list itself**                            |
| Memory update target  | TM / terminology / style guide / edit-pattern | `qa_issue_patterns` (+ optional threshold tuning) |
| Terminal status?      | No                                       | **Yes (`qa_approved` is terminal)**                  |
| Phase advance         | Human-clicked                            | Human-clicked; framed as "**approve**", not "advance"|

---

## Glossary

- **Soft-lock** — exclusive write claim on a segment via
  `segments.locked_by` / `locked_at`. Acquired on edit start, released on
  edit save or timeout. Not a transactional lock.
- **Cooperation surface** — the set of tables and endpoints through which
  agents and humans both contribute: `segment_suggestions`,
  `segment_comments`, `segment_phase_transitions`, `qa_issues`.
- **Routing band** — discretization of overall quality score into one of
  `auto_accept` / `light_pe` / `standard_pe` / `full_revision` / `reject`.
- **Approach** — a task-specific generation style. For translate:
  `literal`, `natural`, `formal`.

---

## Revision note — TODOs 1–6

An earlier revision of this document opened with six `!TODO` markers
capturing open work directions. Those TODOs have been addressed by the
work units enumerated in `docs/MAC-RAG-EXAMPLES-TODO-PLAN.md` and by the
companion design `docs/MEMORY-DB-DESIGN.md`. Mapping:

- **TODO 1 — Broader (hierarchical) context.** Addressed by work units
  W3 / W3.5 / W3b: Phase 0 of every walkthrough now surfaces segment,
  section, chapter, and document-level context, and the ContextObject
  schema carries those levels explicitly.
- **TODO 2 — Human-visible, human-editable composed prompt.** Addressed
  by work unit W4 and integrated by W8 into every walkthrough as the
  Step 5b **Context Builder Panel**: the composed prompt is rendered as
  editable text between Phase 2 and Phase 3; default-on for translate /
  edit / proofread, default-off for QA.
- **TODO 3 — Human sees prose, not data.** Addressed by work unit W5:
  every `[HUMAN SEES]` block now uses plain-English prose, routing-band
  labels rather than raw scores, and per-segment narration; numeric
  detail lives behind a collapsed "(details)" drawer where useful.
- **TODO 4 — Memory DB system.** Addressed by work unit W7 in the
  separate design document `docs/MEMORY-DB-DESIGN.md`, which inventories
  the existing substrate (`translation_memory`, `terminology`,
  `agent_prompts`) and proposes additive new tables, columns, views,
  RPCs, and RLS policies. Work unit W10 has replaced the `[GAP]`
  markers in this document with forward-references of the form
  `(See MEMORY-DB-DESIGN.md §N — table_or_section_name)` wherever the
  design closes them; the residual `[GAP]` markers reflect genuinely
  unresolved work (prune-retrieval UI, L4 cross-domain enrichment, and
  a small set of methodology / stale-text items flagged for human
  triage).
- **TODO 5 — Real DB examples.** Addressed by work units W2 and W8: the
  running example is now article
  `c914a0bb-f8d9-4b7f-9c40-fc50dd34bbbe` ("Kendo Philosophy: The Way of
  the Sword"), segment `d644d349-325e-4098-a7b4-0ec2fa7e4318`
  (position 0), with the real source
  `剣道は単なる武術ではなく、精神的な修養の道でもあります。` and the
  real accepted target
  `Kendō is not merely a martial art, but also a path of spiritual
  cultivation.`. Downstream states for edit / proofread / QA are
  synthesised from this base and marked `[SYNTHESIZED]` per Appendix
  B.5(c) of the plan.
- **TODO 6 — Align with `_references/gemini_kendo_book_translator`.**
  Addressed by work unit W1 (research, summarised in plan Appendix A)
  and work unit W6: the agent prompts shown in every walkthrough now
  follow the five-module skeleton (Role / Task / Instructions /
  Examples / Format) adapted to MAC-RAG's segment-keyed,
  cooperation-surface, multi-candidate pipeline, with the deliberate
  divergences from the reference documented in plan Appendix A §A.2 and
  §A.3.

See `docs/MAC-RAG-EXAMPLES-TODO-PLAN.md` for the full work-unit
decomposition (W1–W12) and `docs/MEMORY-DB-DESIGN.md` for the memory
schema design.
