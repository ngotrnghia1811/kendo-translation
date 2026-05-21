!TODO: Context building process should not be just about the current segment. It should also consider the surrounding segments, or more general context like the chapter, or the document as a whole. This is especially important for edit, where the current target may have been written with a certain style or interpretation that the agent should respect. The context builder should surface this broader context and any relevant metadata to the agent, and ideally also to the human if they want to review or edit it before generation.

!TODO: The output of the context building process would be a fully composed prompt that will be fed into the LLM for generation. The HUMAN should be able to see this prompt and edit it if they want, before it goes into the LLM. This would allow them to add instructions, clarify ambiguities, or provide additional information that the agent might have missed.

!TODO: HUMAN should almost always see the litreal `human readable text`, instead of data or code.

!TODO: We need to develop a memory DB system for MAC-RAG. Currently our DB only consists of the segment data (either monolingual (japanense or english), or bilingual pairs)

!TODO: When you write the example, use the example from our actual database

!TODO: Review the prompts in _references/gemini_kendo_book_translator to understand how the LLMs will be prompted for translation 

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

## Translate — full walkthrough

### Setup

- Document: `docs/A2L-001 — "Itto-Ryu Foundations, Chapter 3"`.
- Segment 47 of 89. Source (ja):

  > 打突の機会を見逃さず、間合いを詰める。

- Segment status: `draft`. Target text: empty string.
- Document is assigned for the `translate` phase to user `wenqian`
  (translator).
- Document policy: `auto_accept_threshold` unset (default off).

---

### Step 1 — Translator opens the editor

`[HUMAN ACTS]` `wenqian` navigates to `/documents/<doc-id>/edit` and
scrolls to segment 47.

`[HUMAN SEES]`

```
┌─ Segment 47 ────────────────────────────── status: draft ─┐
│ JA:  打突の機会を見逃さず、間合いを詰める。               │
│ EN:  (empty)                                              │
│                                                           │
│ [ ✎ Edit ]  [ 🤖 Suggest with agent ]  [ 💬 Comment ]    │
└───────────────────────────────────────────────────────────┘
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
  "segmentId": "5f3a…-47",
  "documentId": "a2l-001-uuid",
  "sourceText": "打突の機会を見逃さず、間合いを詰める。",
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
and the document.

`[AGENT IN]`

```json
{ "sourceText": "打突の機会を見逃さず、間合いを詰める。",
  "documentId": "a2l-001-uuid", "segmentId": "5f3a…-47" }
```

`[AGENT OUT]` (a `ContextObject`)

```json
{
  "domain":        { "label": "kendo",         "confidence": 0.94 },
  "register":      "formal",
  "subRegister":   "instructional",
  "politeness":    "teineigo",
  "entities":      ["打突", "間合い"],
  "keyTerms":      ["打突", "間合い"],
  "documentTitle": "Itto-Ryu Foundations, Chapter 3",
  "neighbours":    {
     "prev": { "id": "…-46", "ja": "残心を保ち、構えを崩さない。",
               "en": "Maintain zanshin; do not break kamae." },
     "next": { "id": "…-48", "ja": "気剣体一致を旨とする。",
               "en": "Aim for ki-ken-tai-itchi." }
  }
}
```

No human-visible UI yet. This object exists only on the server and is
threaded into Phase 1.

`[GAP]` `audienceProfile` field is in the design but not produced today.

---

### Step 4 — Phase 1: RAG Retrieval

The server fans out across retrieval sources.

**TM search** (`lib/retrieval/tm-search.ts`).

`[AGENT IN]`

```json
{ "query": "打突の機会を見逃さず、間合いを詰める。",
  "documentId": "a2l-001-uuid", "minMatchScore": 50, "topK": 5 }
```

`[AGENT OUT]`

```json
[
  { "id": "tm-1", "ja": "打突の機会を捉える。",
    "en": "Seize the opportunity to strike.", "score": 0.78 },
  { "id": "tm-2", "ja": "間合いを詰めて打突する。",
    "en": "Close the maai and strike.",       "score": 0.71 }
]
```

**Terminology lookup** (`lib/retrieval/terminology.ts`).

`[AGENT OUT]`

```json
[
  { "ja": "間合い",  "en": "maai",     "type": "required",
    "note": "leave romanized" },
  { "ja": "剣道",    "en": "kendo",    "type": "do_not_translate" },
  { "ja": "道場",    "en": "dojo",     "type": "do_not_translate" },
  { "ja": "打突",    "en": "datotsu",  "type": "preferred",
    "note": "romanize on first technical use" }
]
```

**Domain Corpus** and **Cross-Lingual KB**: `[GAP]` — sources defined in
plan, not yet implemented. The pipeline currently proceeds without them.

Still no human-visible UI. All retrieval is internal.

`[DB]` Read-only at this point. No writes.

---

### Step 5 — Phase 2: Context Pairing

`lib/context/context-pairer.ts` fuses Phase 0 + Phase 1 into a prompt
context and a coverage report.

`[AGENT OUT]`

```json
{
  "promptContext": {
    "domain": "kendo",
    "register": "formal/instructional/teineigo",
    "tmExamples": [
      "打突の機会を捉える。 → Seize the opportunity to strike.",
      "間合いを詰めて打突する。 → Close the maai and strike."
    ],
    "termsRequired":      ["間合い → maai"],
    "termsPreferred":     ["打突 → datotsu (first technical use)"],
    "termsDoNotTranslate":["剣道 → kendo", "道場 → dojo"],
    "neighbourTargets":   ["… zanshin …", "… ki-ken-tai-itchi …"]
  },
  "coverageReport": {
    "overall": 0.85,
    "gaps":    []
  }
}
```

The high coverage (0.85) means the agent has enough grounding to proceed
to multi-candidate generation without flagging the human for context help.

`[GAP]` If a Context Builder Panel existed, this is the moment it would
surface to the human ("here is what the agent will use; want to edit?").
Today the panel does not exist; `useMacRag` keeps `promptContext` in
memory but renders no UI for it.

---

### Step 6 — Phase 3: Multi-Candidate Generation

`lib/translation/multi-gen.ts` issues **three parallel LLM calls**, one per
approach. Each call uses a shared system prompt (literary register +
preserve kendo romanizations) plus an approach-specific instruction.

`[AGENT IN]` (one of three; the `natural` call shown)

```
system: You are a Japanese→English literary translator working on a kendo
        text in formal instructional register. Preserve kendo romanizations
        (men, kote, dō, tsuki, kiai, kamae, seme, zanshin). Use the
        retrieved TM and terminology faithfully.

user:   Source: 打突の機会を見逃さず、間合いを詰める。
        TM:
          - 打突の機会を捉える。 → Seize the opportunity to strike.
          - 間合いを詰めて打突する。 → Close the maai and strike.
        Required terms: 間合い→maai
        Preferred terms: 打突→datotsu (first technical use)
        Approach: natural — render fluently for an instructional reader.
        Return only the English translation.
```

`[AGENT OUT]` (per-candidate, in parallel)

```json
{
  "literal": "Without missing the opportunity for datotsu, close the maai.",
  "natural": "Seize every opportunity for datotsu and close the maai.",
  "formal":  "Let no opportunity for datotsu pass; close the maai."
}
```

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

user:   Source: 打突の機会を見逃さず、間合いを詰める。
        Candidate: Seize every opportunity for datotsu and close the maai.
        Required terms: 間合い→maai
```

`[AGENT OUT]` (combined)

```json
[
  { "approach": "literal",
    "scores": { "fluency": 0.78, "adequacy": 0.90,
                "terminology": 0.95, "style": 0.74 },
    "overall": 0.840 },
  { "approach": "natural",
    "scores": { "fluency": 0.92, "adequacy": 0.86,
                "terminology": 0.95, "style": 0.82 },
    "overall": 0.882 },
  { "approach": "formal",
    "scores": { "fluency": 0.85, "adequacy": 0.84,
                "terminology": 0.95, "style": 0.88 },
    "overall": 0.860 }
]
```

`lib/quality/routing.ts` maps `overall=0.882` to band `light_pe` (0.85 ≤ x
< 0.90 → "light post-editing recommended"). The `natural` candidate is
flagged `recommended: true`.

---

### Step 8 — Server writes the suggestion row

The orchestrator picks the recommended candidate (or all three, depending
on UI mode) and writes to the cooperation surface.

`[DB]`

```sql
INSERT INTO segment_suggestions
  (segment_id, suggester_id, suggester_kind, proposed_text, status)
VALUES
  ('5f3a…-47',
   '<agent-system-user-uuid>',
   'agent',
   'Seize every opportunity for datotsu and close the maai.',
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
    { "approach": "literal", "text": "…", "overall": 0.840 },
    { "approach": "natural", "text": "Seize every opportunity for datotsu and close the maai.",
      "overall": 0.882, "recommended": true,
      "suggestionId": "sugg-9c2e…" },
    { "approach": "formal",  "text": "…", "overall": 0.860 }
  ],
  "routing": "light_pe",
  "coverageReport": { "overall": 0.85, "gaps": [] }
}
```

---

### Step 10 — Human sees the candidates

`[HUMAN SEES]` (SuggestionPanel + AgentSuggestionPanel)

```
┌─ Agent suggestion (light post-editing recommended) ────────┐
│ ★ natural   overall 0.88                                   │
│   "Seize every opportunity for datotsu and close the maai."│
│   fluency .92 · adequacy .86 · terminology .95 · style .82 │
│   [ Accept ]  [ Edit & accept ]  [ Reject ]                │
│                                                            │
│   literal   0.84   ▾  formal   0.86   ▾                    │
└────────────────────────────────────────────────────────────┘
```

This is the **first moment the human sees any agent output**. Everything
before this point was server-internal.

The translator has four real choices at this moment:

1. **Accept** the recommended candidate as-is.
2. Expand `literal` or `formal`, then accept one of them.
3. Click **Edit & accept**, hand-modify, then commit.
4. **Reject** all three and write from scratch.

---

### Step 11 — Translator decides

`[HUMAN ACTS]` Reads the recommended candidate. Notices "Seize every
opportunity" is slightly stronger than the Japanese 見逃さず ("without
missing"). Clicks **Edit & accept**.

`[HUMAN SEES]`

```
┌─ Edit before accepting ────────────────────────────────────┐
│ Without missing the opportunity for datotsu, close the maai│
│                                                            │
│ [ Cancel ]                          [ Accept this version ]│
└────────────────────────────────────────────────────────────┘
```

`[HUMAN ACTS]` Confirms the edit and clicks **Accept this version**.

The client does two things atomically through the soft-lock editing path
(`PATCH /api/segments/<id>` with a guard) and the suggestion accept path
(`POST /api/suggestions/<id>/accept`):

`[DB]`

```sql
-- 1. acquire soft-lock (if not already held)
UPDATE segments SET locked_by = '<wenqian>', locked_at = now()
WHERE id = '5f3a…-47' AND (locked_by IS NULL OR locked_by = '<wenqian>');

-- 2. update the target text
UPDATE segments
  SET target_text = 'Without missing the opportunity for datotsu, close the maai.',
      status      = 'draft'   -- status stays draft; translate phase advance is separate
WHERE id = '5f3a…-47' AND locked_by = '<wenqian>';

-- 3. record the suggestion accept (with the human-edited text)
UPDATE segment_suggestions
  SET status       = 'accepted',
      accepter_id  = '<wenqian>',
      accepted_at  = now(),
      proposed_text = 'Without missing the opportunity for datotsu, close the maai.'
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
UPDATE segments SET status = 'translated' WHERE id = '5f3a…-47';

INSERT INTO segment_phase_transitions
  (segment_id, from_status, to_status, actor_id)
VALUES
  ('5f3a…-47', 'draft', 'translated', '<wenqian>');
```

The segment is now ready for whoever holds the `edit` phase assignment on
this document.

---

### Step 13 — Phase 4b: Memory Update (currently missing)

`[GAP]` In the design, after acceptance the agent would offer to:

- Save `(打突の機会を見逃さず、間合いを詰める。 → Without missing the
  opportunity for datotsu, close the maai.)` to the TM with confidence
  derived from the quality scores (e.g. q=0.88).
- Promote `打突→datotsu` from `preferred` to `required` if the same
  promotion has been accepted N times.
- Record `tm-1` (the closest TM hit) as "helpful" for retrieval weighting.

`[HUMAN SEES]` (proposed UI, not yet built)

```
┌─ Save what was learned? ───────────────────────────────────┐
│ ☑ Add to translation memory  (confidence 0.88)             │
│ ☐ Promote 打突→datotsu from preferred to required           │
│ ☑ Mark TM hit "打突の機会を捉える" as helpful               │
│                                                            │
│ [ Save selected ]   [ Skip ]                               │
└────────────────────────────────────────────────────────────┘
```

Today none of this exists in code (`lib/learning/` doesn't exist). The
loop terminates at Step 12.

---

### Step 14 — What the next role sees

Later, the `edit` assignee opens the document. For segment 47 they see:

`[HUMAN SEES]`

```
┌─ Segment 47 ─────────────────────────── status: translated ─┐
│ JA: 打突の機会を見逃さず、間合いを詰める。                   │
│ EN: Without missing the opportunity for datotsu, close the   │
│     maai.                                                    │
│                                                              │
│ Activity:  🤖 1 suggestion · ✅ accepted by wenqian          │
│            ✎ edited before accept · ⬆ advanced by wenqian    │
│                                                              │
│ [ ✎ Edit ]  [ 🤖 Suggest edit ]  [ 💬 Comment ]              │
└──────────────────────────────────────────────────────────────┘
```

The activity badges (`ae9bbc3`) summarize what cooperation happened on
this segment so far. The next role can now invoke the **edit task** on
the same MAC-RAG pipeline, with the current target text as additional
input — that walkthrough is below.

---

## Edit — full walkthrough

This continues the same document from where the translate walkthrough left
off. The translator `wenqian` has finished segment 47; the editor
`arashi` now picks it up.

### Setup

- Same document `A2L-001`, same segment 47.
- Segment status: `translated`. Target text:

  > Without missing the opportunity for datotsu, close the maai.

- Document is assigned for the `edit` phase to user `arashi` (translator
  role globally; assigned to phase `edit` on this document).
- Same document policy: `auto_accept_threshold` unset.

The editor's job is **not** to retranslate. It is to improve the existing
target while preserving the translator's voice and the meaning. The edit
task therefore takes both `sourceText` and the current `targetText` as
input — that is the key shape difference from translate.

---

### Step 1 — Editor opens the editor

`[HUMAN ACTS]` `arashi` navigates to `/documents/<doc-id>/edit` and
scrolls to segment 47.

`[HUMAN SEES]`

```
┌─ Segment 47 ─────────────────────────── status: translated ─┐
│ JA: 打突の機会を見逃さず、間合いを詰める。                   │
│ EN: Without missing the opportunity for datotsu, close the   │
│     maai.                                                    │
│                                                              │
│ Activity:  🤖 1 suggestion · ✅ accepted by wenqian          │
│            ✎ edited before accept · ⬆ advanced by wenqian    │
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
  "segmentId": "5f3a…-47",
  "documentId": "a2l-001-uuid",
  "sourceText": "打突の機会を見逃さず、間合いを詰める。",
  "targetText": "Without missing the opportunity for datotsu, close the maai.",
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

`[AGENT OUT]` (a `ContextObject` with target-side analysis added)

```json
{
  "domain":      { "label": "kendo", "confidence": 0.94 },
  "register":    "formal",
  "subRegister": "instructional",
  "politeness":  "teineigo",
  "entities":    ["打突", "間合い"],
  "keyTerms":    ["打突", "間合い"],
  "targetAnalysis": {
    "fluency":      0.92,
    "adequacy":     0.86,
    "terminology":  1.00,
    "detectedWeaknesses": [
      { "span": "Without missing",
        "note": "literal rendering of 見逃さず; could read more naturally" }
    ],
    "preserveCues": [
      "datotsu and maai are correctly romanized — keep them"
    ]
  },
  "neighbours": { "prev": "…", "next": "…" }
}
```

This is the structural difference: Phase 0 for edit also runs a
diagnostic pass over the existing target to surface what's worth
revising and what is **already good and must not be regressed**.

---

### Step 4 — Phase 1: RAG Retrieval

Same retrieval sources as translate, plus one new one:

**Revision history of this segment** (`segment_suggestions` accepted rows).

`[AGENT OUT]`

```json
{
  "tm": [
    { "ja": "打突の機会を捉える。", "en": "Seize the opportunity to strike.",
      "score": 0.78 },
    { "ja": "間合いを詰めて打突する。", "en": "Close the maai and strike.",
      "score": 0.71 }
  ],
  "terminology": [
    { "ja": "間合い", "en": "maai",    "type": "required" },
    { "ja": "打突",   "en": "datotsu", "type": "preferred" }
  ],
  "revisionHistory": [
    { "from": "(initial agent suggestion)",
      "to":   "Without missing the opportunity for datotsu, close the maai.",
      "actor": "wenqian", "kind": "human_edit_before_accept" }
  ],
  "domainCorpus":   "[GAP]",
  "crossLingualKb": "[GAP]"
}
```

The revision history matters: it tells the edit agent that `wenqian`
**chose** "Without missing" over "Seize every opportunity" during
translate. That is a signal to be conservative about overturning it.

---

### Step 5 — Phase 2: Context Pairing

`[AGENT OUT]`

```json
{
  "promptContext": {
    "task": "edit",
    "currentTarget": "Without missing the opportunity for datotsu, close the maai.",
    "weaknessHints": ["'Without missing' is literal; consider rhythm"],
    "preserveHints": ["datotsu (correct romanization)",
                      "maai (correct romanization)"],
    "tmExamples":    ["… → Seize the opportunity to strike.", "…"],
    "termsRequired": ["間合い → maai"],
    "termsPreferred":["打突 → datotsu"],
    "translatorIntent":
      "wenqian explicitly edited 'Seize every' to 'Without missing'; treat as deliberate"
  },
  "coverageReport": { "overall": 0.88, "gaps": [] }
}
```

`[GAP]` Again, no Context Builder Panel yet — the human doesn't see this
intermediate object.

---

### Step 6 — Phase 3: Multi-Candidate Generation

Three parallel LLM calls, **edit approaches** (not translate approaches):

- `light_touch` — surgical changes, minimum diff from current target.
- `accuracy_focus` — prioritise adequacy over fluency; allowed to make
  larger changes if they materially improve faithfulness.
- `fluency_focus` — prioritise readability while preserving terminology.

`[AGENT IN]` (the `accuracy_focus` call)

```
system: You are revising an existing English translation of a Japanese
        kendo text. The current translation is the work of a human
        translator and must be respected — make changes only where they
        materially improve accuracy or terminology. Preserve kendo
        romanizations (datotsu, maai). Approach: accuracy_focus.

user:   Source:  打突の機会を見逃さず、間合いを詰める。
        Current: Without missing the opportunity for datotsu, close the maai.
        TM:
          - 打突の機会を捉える。 → Seize the opportunity to strike.
          - 間合いを詰めて打突する。 → Close the maai and strike.
        Required: 間合い→maai   Preferred: 打突→datotsu
        Revision history: human translator deliberately chose
          "Without missing" over a more idiomatic "Seize every".
        Return only the revised English. If no change is needed, return
        the current translation unchanged.
```

`[AGENT OUT]`

```json
{
  "light_touch":    "Without missing the opportunity for datotsu, close the maai.",
  "accuracy_focus": "Without letting an opportunity for datotsu pass, close the maai.",
  "fluency_focus":  "Never letting a datotsu opportunity slip, close the maai."
}
```

Note `light_touch` returned the input unchanged — a legitimate output. The
edit pipeline treats "no change recommended" as a first-class signal, not
a failure.

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
                "terminology":          1.00 },
    "overall": 0.55,
    "note":    "no change suggested; baseline" },
  { "approach": "accuracy_focus",
    "scores": { "accuracy_improvement": 0.65,
                "fluency_preservation": 0.90,
                "minimal_change":       0.55,
                "terminology":          1.00 },
    "overall": 0.74 },
  { "approach": "fluency_focus",
    "scores": { "accuracy_improvement": 0.40,
                "fluency_preservation": 0.95,
                "minimal_change":       0.30,
                "terminology":          1.00 },
    "overall": 0.62 }
]
```

`accuracy_focus` wins with 0.74 → routing band `standard_pe`
(0.70 ≤ x < 0.85 → "human should consider but is not pushed to accept").

The orchestrator marks `accuracy_focus` as `recommended: true`. Crucially,
because the band is `standard_pe` rather than `light_pe`, the UI will
present the candidate as a **proposal worth thinking about**, not as a
near-auto-accept.

---

### Step 8 — Server writes the suggestion row

`[DB]`

```sql
INSERT INTO segment_suggestions
  (segment_id, suggester_id, suggester_kind, proposed_text, status)
VALUES
  ('5f3a…-47',
   '<agent-system-user-uuid>',
   'agent',
   'Without letting an opportunity for datotsu pass, close the maai.',
   'pending');
```

Only the recommended candidate is persisted, same as translate. The
unchanged `light_touch` candidate is **not** stored — there is nothing to
suggest.

---

### Step 9 — Response returned to the client

`[AGENT OUT]` (HTTP 200)

```json
{
  "candidates": [
    { "approach": "light_touch",
      "text": "Without missing the opportunity for datotsu, close the maai.",
      "overall": 0.55, "unchanged": true },
    { "approach": "accuracy_focus",
      "text": "Without letting an opportunity for datotsu pass, close the maai.",
      "overall": 0.74, "recommended": true,
      "suggestionId": "sugg-1d77…" },
    { "approach": "fluency_focus",
      "text": "Never letting a datotsu opportunity slip, close the maai.",
      "overall": 0.62 }
  ],
  "routing": "standard_pe",
  "coverageReport": { "overall": 0.88, "gaps": [] }
}
```

---

### Step 10 — Human sees the candidates

`[HUMAN SEES]`

```
┌─ Agent edit suggestion (standard post-editing) ─────────────┐
│ Current:                                                    │
│   "Without missing the opportunity for datotsu,             │
│    close the maai."                                         │
│                                                             │
│ ★ accuracy_focus   overall 0.74                             │
│   "Without letting an opportunity for datotsu pass,         │
│    close the maai."                                         │
│   Δ: "missing the opportunity" → "letting an opportunity    │
│        … pass"                                              │
│   accuracy +0.65 · fluency-pres 0.90 · churn 0.55 · term 1.0│
│   [ Accept ]  [ Edit & accept ]  [ Reject ]                 │
│                                                             │
│   light_touch  0.55  (no change suggested) ▾                │
│   fluency_focus 0.62  ▾                                     │
└─────────────────────────────────────────────────────────────┘
```

Two things to notice about the edit UI vs translate UI:

1. The **current target is rendered at the top**, with a diff (`Δ:`)
   showing what would change. Edit is always relative to something.
2. `light_touch (no change suggested)` is shown explicitly as a valid
   "the agent thinks you're already done" signal. Translate has no
   equivalent — there is always a translation to propose.

---

### Step 11 — Editor decides

`[HUMAN ACTS]` `arashi` reads both candidates and the diff. Considers the
revision-history hint (wenqian deliberately picked the literal form).
Decides the accuracy_focus rewording is genuinely better and accepts.

Clicks **Accept**.

`[DB]`

```sql
-- 1. acquire soft-lock
UPDATE segments SET locked_by = '<arashi>', locked_at = now()
WHERE id = '5f3a…-47' AND (locked_by IS NULL OR locked_by = '<arashi>');

-- 2. update the target text
UPDATE segments
  SET target_text = 'Without letting an opportunity for datotsu pass, close the maai.',
      status      = 'translated'   -- status unchanged; phase advance is separate
WHERE id = '5f3a…-47' AND locked_by = '<arashi>';

-- 3. mark the suggestion accepted (no human edit this time)
UPDATE segment_suggestions
  SET status      = 'accepted',
      accepter_id = '<arashi>',
      accepted_at = now()
WHERE id = 'sugg-1d77…';
```

Same acceptance pattern as translate: target_text is updated through the
soft-lock path; the suggestion row is marked accepted separately. The
agent never wrote `segments.target_text` directly.

---

### Step 12 — Phase advance

`[HUMAN SEES]`

```
[ Advance to edited ]
```

`[HUMAN ACTS]` Clicks **Advance to edited**.

`[DB]`

```sql
UPDATE segments SET status = 'edited' WHERE id = '5f3a…-47';

INSERT INTO segment_phase_transitions
  (segment_id, from_status, to_status, actor_id)
VALUES
  ('5f3a…-47', 'translated', 'edited', '<arashi>');
```

Segment is now ready for the proofread phase.

---

### Step 13 — Phase 4b: Memory Update (edit-shaped, currently missing)

`[GAP]` In the design, the edit pipeline's memory update is **different
from translate's**:

- It does **not** typically write a new TM pair — the source→target
  mapping was already saved at translate time.
- It **does** update the existing TM entry's `target` field (overwrite
  the older target with the edited one), if confidence is high enough.
- It **does** record the diff as an "edit pattern": e.g. `"missing the
  opportunity for X" → "letting an opportunity for X pass"` becomes a
  reusable phrasing hint for future edits in this domain.
- It **may** promote `打突→datotsu` from `preferred` to `required` based on
  cumulative acceptance count.

`[HUMAN SEES]` (proposed UI)

```
┌─ Save what was learned (edit)? ─────────────────────────────┐
│ ☑ Update TM entry to the edited target                      │
│ ☑ Record edit pattern: "missing the opportunity for X"      │
│       → "letting an opportunity for X pass"                 │
│ ☐ Promote 打突→datotsu to required (acceptances: 2/3)        │
│                                                             │
│ [ Save selected ]   [ Skip ]                                │
└─────────────────────────────────────────────────────────────┘
```

Today none of this exists in code. The loop terminates at Step 12.

---

### Step 14 — What the next role sees

The `proofread` assignee opens segment 47:

`[HUMAN SEES]`

```
┌─ Segment 47 ──────────────────────────── status: edited ────┐
│ JA: 打突の機会を見逃さず、間合いを詰める。                   │
│ EN: Without letting an opportunity for datotsu pass,         │
│     close the maai.                                          │
│                                                              │
│ Activity:  🤖 2 suggestions · ✅ wenqian (translate)         │
│            ✅ arashi (edit) · ⬆ advanced twice               │
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
between `arashi`'s edit and now, a hasty touch-up pass — by a careless
co-editor or an autoformat tool — capitalised the kendo romanizations
mid-sentence. The segment arrives at proofread in this damaged state.

> Continuity note: in the strict translate→edit chain above, segment 47
> reached the `edited` status as `"Without letting an opportunity for
> datotsu pass, close the maai."`. For this walkthrough we replace it
> with the flawed variant below. Treat this section as a parallel branch
> of the same segment's history.

### Setup

- Same document `A2L-001`, same segment 47.
- Segment status: `edited`. Target text **(flawed)**:

  > Without letting an opportunity for Datotsu pass, close the Maai.

- Document is assigned for the `proofread` phase to user `kazuko`.
- Document policy: `auto_accept_threshold = 0.95` (opt-in, for this
  walkthrough — to demonstrate the auto-accept branch). The default in
  the platform is off.
- Style guide rule (project-wide): kendo romanizations are lowercase
  mid-sentence, italicised on first occurrence in a chapter only.
  `[GAP]` — no `style_guide` table exists yet; this rule lives in
  prompts.

The proofread task's job is **not** to retranslate or substantially edit.
It is to enforce surface correctness (spelling, casing, punctuation,
italicization), document-wide consistency, and the style guide — without
changing meaning.

---

### Step 1 — Proofreader opens the editor

`[HUMAN ACTS]` `kazuko` navigates to `/documents/<doc-id>/edit` and
scrolls to segment 47.

`[HUMAN SEES]`

```
┌─ Segment 47 ─────────────────────────── status: edited ─────┐
│ JA: 打突の機会を見逃さず、間合いを詰める。                   │
│ EN: Without letting an opportunity for Datotsu pass,         │
│     close the Maai.                                          │
│                                                              │
│ Activity:  🤖 2 suggestions · ✅ wenqian (translate)         │
│            ✅ arashi (edit) · ⚠ 2 style hints                │
│                                                              │
│ [ ✎ Edit ]  [ 🤖 Suggest proofread ]  [ 💬 Comment ]         │
└──────────────────────────────────────────────────────────────┘
```

The "⚠ 2 style hints" badge is generated by a passive client-side check
that flags terminology-casing mismatches as soon as the segment is
rendered. It does not block; it is informational. The proofreader can
either fix manually or invoke the agent.

`kazuko` invokes the agent.

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
  "segmentId": "5f3a…-47",
  "documentId": "a2l-001-uuid",
  "sourceText": "打突の機会を見逃さず、間合いを詰める。",
  "targetText": "Without letting an opportunity for Datotsu pass, close the Maai.",
  "sourceLang": "ja",
  "targetLang": "en",
  "approach":   "standard",
  "userOverrides": null
}
```

`[HUMAN SEES]` Spinner: `Running MAC-RAG (proofread)…`.

---

### Step 3 — Phase 0: Context Initialization (proofread-shaped)

The Phase 0 pass is heavily **surface-oriented** for proofread.

`[AGENT OUT]`

```json
{
  "domain":   { "label": "kendo", "confidence": 0.94 },
  "register": "formal",
  "entities": ["打突", "間合い"],
  "targetSurfaceAnalysis": {
    "casing": [
      { "token": "Datotsu",
        "issue": "kendo romanization capitalised mid-sentence",
        "expected": "datotsu", "severity": "minor" },
      { "token": "Maai",
        "issue": "kendo romanization capitalised mid-sentence",
        "expected": "maai", "severity": "minor" }
    ],
    "italicisation": [
      { "token": "datotsu",
        "issue": "no italics; style guide italicises romanizations on first occurrence per chapter",
        "severity": "info",
        "needsChapterContext": true }
    ],
    "punctuation": [],
    "spelling":    []
  },
  "neighbours": {
    "prev": { "en": "Maintain zanshin; do not break kamae." },
    "next": { "en": "Aim for ki-ken-tai-itchi." }
  }
}
```

The neighbours matter: they confirm the rest of the document uses
lowercase romanizations (`zanshin`, `kamae`, `ki-ken-tai-itchi`), so the
flagged capitalisation is **inconsistent**, not a deliberate choice.

---

### Step 4 — Phase 1: RAG Retrieval

Proofread brings in two retrieval sources that translate and edit do not
emphasise:

**Cross-segment consistency check** — scan the document for how
`datotsu` and `maai` are cased elsewhere.

`[AGENT OUT]`

```json
{
  "tm": [
    { "ja": "打突の機会を捉える。", "en": "Seize the opportunity to strike.",
      "score": 0.78 }
  ],
  "terminology": [
    { "ja": "間合い", "en": "maai",    "type": "required",
      "casing": "lowercase mid-sentence" },
    { "ja": "打突",   "en": "datotsu", "type": "preferred",
      "casing": "lowercase mid-sentence" }
  ],
  "documentConsistency": {
    "datotsu": { "lowercase_count": 12, "capitalised_count": 1,
                 "this_segment_uses": "capitalised" },
    "maai":    { "lowercase_count":  9, "capitalised_count": 1,
                 "this_segment_uses": "capitalised" }
  },
  "styleGuide": {
    "rules": [
      "kendo romanizations lowercase mid-sentence",
      "italicise romanizations only on first occurrence per chapter"
    ],
    "source": "[GAP] — no style_guide table; prompt-embedded"
  },
  "qaIssuePatterns": "[GAP] — no qa_issue_patterns view yet",
  "domainCorpus":    "[GAP]",
  "crossLingualKb":  "[GAP]"
}
```

The `documentConsistency` block is the decisive evidence: 12-to-1 in
favour of lowercase. The proofread agent now has very high confidence
that this segment is the outlier.

---

### Step 5 — Phase 2: Context Pairing

`[AGENT OUT]`

```json
{
  "promptContext": {
    "task": "proofread",
    "currentTarget": "Without letting an opportunity for Datotsu pass, close the Maai.",
    "surfaceIssues": [
      "Datotsu → datotsu (casing; 12:1 doc consistency)",
      "Maai → maai   (casing; 9:1 doc consistency)"
    ],
    "italicHint": "first-occurrence italics not determinable without chapter scan",
    "preserveHints": [
      "do not alter sentence structure",
      "do not alter word choice beyond surface corrections",
      "preserve adequacy exactly"
    ]
  },
  "coverageReport": { "overall": 0.92, "gaps": [] }
}
```

The high coverage reflects that proofread is mostly a rule-checking task
once retrieval is done; little is left to ambiguity.

---

### Step 6 — Phase 3: Multi-Candidate Generation

Three parallel LLM calls, **proofread approaches**:

- `conservative` — fix only what is unambiguously wrong; never introduce
  new style choices.
- `standard` — fix surface issues and enforce style guide; default
  approach.
- `house_style` — apply full house style including optional rules
  (e.g. italicise romanizations).

`[AGENT IN]` (the `standard` call)

```
system: You are proofreading an English translation of a Japanese kendo
        text. Make surface corrections only — casing, spelling,
        punctuation, italicisation, document-wide consistency. Do NOT
        change wording, sentence structure, or meaning. If the existing
        text is already correct, return it unchanged. Approach: standard.

user:   Source:  打突の機会を見逃さず、間合いを詰める。
        Current: Without letting an opportunity for Datotsu pass, close the Maai.
        Style:
          - kendo romanizations lowercase mid-sentence
          - italicise romanizations only on first occurrence per chapter
        Doc consistency:
          - datotsu: 12 lowercase, 1 capitalised (this segment)
          - maai:     9 lowercase, 1 capitalised (this segment)
        Surface issues identified upstream:
          - Datotsu → datotsu
          - Maai    → maai
        Return only the corrected English.
```

`[AGENT OUT]`

```json
{
  "conservative": "Without letting an opportunity for datotsu pass, close the maai.",
  "standard":     "Without letting an opportunity for datotsu pass, close the maai.",
  "house_style":  "Without letting an opportunity for *datotsu* pass, close the *maai*."
}
```

Notice `conservative` and `standard` produced **identical** output — both
agreed the casing fix is unambiguous and italicisation is optional. Only
`house_style` adds italics. The pipeline keeps both rather than
deduplicating; the human can see that two independent approaches
converged, which is itself a confidence signal.

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
  ('5f3a…-47',
   '<agent-system-user-uuid>',
   'agent',
   'Without letting an opportunity for datotsu pass, close the maai.',
   'accepted',
   '<agent-system-user-uuid>',
   now(),
   TRUE);

-- 2. update target_text via the system path (no soft-lock; auto-accept
--    bypasses the human lock but never bypasses the audit trail)
UPDATE segments
  SET target_text = 'Without letting an opportunity for datotsu pass, close the maai.',
      status      = 'edited'   -- status unchanged; phase advance still requires human
WHERE id = '5f3a…-47';
```

`[GAP]` `segment_suggestions.auto_accepted` column does not currently
exist. The opt-in policy field `document.policy.auto_accept_threshold`
also does not exist. Both are part of the design in MAC-RAG.md.

`[HUMAN SEES]` (passive notification, not a prompt)

```
┌─ Segment 47 ─────────────────── status: edited (auto-edited) ┐
│ JA: 打突の機会を見逃さず、間合いを詰める。                   │
│ EN: Without letting an opportunity for datotsu pass,         │
│     close the maai.                                          │
│                                                              │
│ ⚡ Auto-applied by agent (quality 1.00, policy threshold 0.95)│
│   2 surface fixes: Datotsu → datotsu, Maai → maai            │
│   [ Review ]  [ Revert ]                                     │
│                                                              │
│ [ Advance to proofread ]                                     │
└──────────────────────────────────────────────────────────────┘
```

`kazuko` arrives, sees the auto-applied banner. She has 24 h (configurable)
to **revert** the auto-accept if she disagrees. After that, the
auto-accept becomes part of the audit-trail history but not easily
reversible. Phase advance is still a separate explicit click.

#### Branch B — Policy off (the platform default)

If `auto_accept_threshold` is unset or this segment's overall < threshold:

`[HUMAN SEES]`

```
┌─ Agent proofread suggestion (auto-accept eligible)──────────┐
│ Current:                                                    │
│   "Without letting an opportunity for Datotsu pass,         │
│    close the Maai."                                         │
│                                                             │
│ ★ conservative   overall 1.00                               │
│   "Without letting an opportunity for datotsu pass,         │
│    close the maai."                                         │
│   Δ: Datotsu → datotsu · Maai → maai                        │
│   surface 1.0 · consistency 1.0 · meaning 1.0               │
│   [ Accept ]  [ Edit & accept ]  [ Reject ]                 │
│                                                             │
│   standard 1.00 (identical to conservative) ▾               │
│   house_style 0.97 (with italics) ▾                         │
│                                                             │
│ ⓘ This would be auto-accepted if document policy were on.   │
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

`[HUMAN ACTS]` `kazuko` clicks **Advance to proofread**.

`[DB]`

```sql
UPDATE segments SET status = 'proofread' WHERE id = '5f3a…-47';

INSERT INTO segment_phase_transitions
  (segment_id, from_status, to_status, actor_id)
VALUES
  ('5f3a…-47', 'edited', 'proofread', '<kazuko>');
```

Phase advance **is always human**, even when the content change was
auto-accepted. This is the platform's hard rule: cooperation status
transitions are never automated.

---

### Step 10 — Phase 4b: Memory Update (proofread-shaped, currently missing)

`[GAP]` Proofread's memory update is again different from translate and
edit:

- It does **not** touch the TM (no source-target mapping changed).
- It **does** strengthen the terminology entry's `casing` constraint:
  e.g. promote "datotsu lowercase mid-sentence" from "preferred" to
  "required" if N≥3 segments have confirmed it.
- It **does** record a `qa_issue_pattern` row for future QA retrieval:
  `"capitalised kendo romanization mid-sentence"` with the resolution.
- It **does** update the document's running consistency tally so the
  next segment's Phase 1 retrieval sees an even stronger lowercase lean.

`[HUMAN SEES]` (proposed UI)

```
┌─ Save what was learned (proofread)? ────────────────────────┐
│ ☑ Promote 打突→datotsu casing rule from preferred to required│
│       (3rd confirmation in this document)                   │
│ ☑ Record QA pattern: "capitalised kendo romanization        │
│       mid-sentence" → "lowercase"                           │
│ ☑ Update document consistency stats                         │
│                                                             │
│ [ Save selected ]   [ Skip ]                                │
└─────────────────────────────────────────────────────────────┘
```

For auto-accepted suggestions, the proposed default is "save all" but
**still requires** a confirmation click — memory updates are never
automated, even when the suggestion itself was.

---

### Step 11 — What the next role sees

The `QA` reviewer opens segment 47:

`[HUMAN SEES]`

```
┌─ Segment 47 ──────────────────────── status: proofread ─────┐
│ JA: 打突の機会を見逃さず、間合いを詰める。                   │
│ EN: Without letting an opportunity for datotsu pass,         │
│     close the maai.                                          │
│                                                              │
│ Activity:  🤖 3 suggestions (1 auto-accepted)               │
│            ✅ wenqian (translate) · ✅ arashi (edit)         │
│            ⚡ proofread (auto) · ⬆ kazuko advanced           │
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

- Same document `A2L-001`, same segment 47.
- Segment status: `proofread`. Target text (clean, from proofread Step 8 / 9):

  > Without letting an opportunity for datotsu pass, close the maai.

- Document is assigned for the `QA` phase to user `tanaka`.
- No document-policy field affects QA. There is no `qa_auto_*` setting.

---

### Step 1 — QA reviewer opens the editor

`[HUMAN ACTS]` `tanaka` navigates to `/documents/<doc-id>/edit` and
filters the segment list to `status = proofread`. Opens segment 47.

`[HUMAN SEES]`

```
┌─ Segment 47 ──────────────────────── status: proofread ─────┐
│ JA: 打突の機会を見逃さず、間合いを詰める。                   │
│ EN: Without letting an opportunity for datotsu pass,         │
│     close the maai.                                          │
│                                                              │
│ Activity:  🤖 3 suggestions (1 auto-accepted)               │
│            ✅ wenqian (translate) · ✅ arashi (edit)         │
│            ⚡ proofread (auto) · ⬆ kazuko advanced           │
│                                                              │
│ [ 🔍 Run QA check ]  [ 💬 Comment ]                          │
└──────────────────────────────────────────────────────────────┘
```

The buttonset is intentionally narrower than the other phases — no
`Edit`, no `Suggest`. `tanaka` cannot type into the target field at all
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
  "segmentId": "5f3a…-47",
  "documentId": "a2l-001-uuid",
  "sourceText": "打突の機会を見逃さず、間合いを詰める。",
  "targetText": "Without letting an opportunity for datotsu pass, close the maai.",
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
are *possible* for a segment of this shape.

`[AGENT OUT]`

```json
{
  "domain":   { "label": "kendo", "confidence": 0.94 },
  "register": "formal",
  "riskProfile": {
    "hasNumerals":          false,
    "hasProperNames":       false,
    "hasTechnicalTerms":    true,
    "hasNegation":          true,   // "見逃さず" = without missing
    "hasRegisterShift":     false,
    "hasIdiomaticPhrase":   false,
    "lengthRatioCheck":     "ok",   // JA 21 chars → EN 63 chars, in band
    "sentenceCount":        { "ja": 1, "en": 1, "match": true }
  },
  "phaseHistorySummary": {
    "translateAccepter": "wenqian",
    "editAccepter":      "arashi",
    "proofreadAuto":     true,
    "humanEditsBeforeAccept": 1  // wenqian edited the initial agent text
  }
}
```

The `riskProfile` flags `hasNegation: true`. Negation in JA→EN is a
known source of polarity flips (model accidentally drops the "without"),
so QA will attend to it.

The `phaseHistorySummary` matters because **proofread was
auto-accepted** for this segment. That is a signal QA should treat with
slightly more scrutiny than a fully-human-touched segment.

---

### Step 4 — Phase 1: RAG Retrieval

QA's distinctive retrieval source is **past QA issues** — the
`qa_issues` table itself, queried for patterns that historically
appeared on segments with similar risk profiles.

`[AGENT OUT]`

```json
{
  "pastQaIssues": [
    { "pattern": "polarity flip on JA negation",
      "occurrences": 7,
      "false_positive_rate_historical": 0.08,
      "example": "見逃さず rendered as 'miss the opportunity' (wrong polarity)" },
    { "pattern": "datotsu vs strike inconsistency within paragraph",
      "occurrences": 3,
      "false_positive_rate_historical": 0.25 }
  ],
  "qaIssuePatterns": "[GAP] — qa_issue_patterns view does not exist; using ad-hoc query",
  "terminology": [
    { "ja": "間合い", "en": "maai",    "type": "required", "present": true },
    { "ja": "打突",   "en": "datotsu", "type": "preferred","present": true }
  ],
  "styleGuide":      "[GAP]",
  "documentConsistency": {
    "datotsu_casing": "lowercase mid-sentence (consistent)",
    "maai_casing":    "lowercase mid-sentence (consistent)"
  },
  "tm":             "not used in QA phase"
}
```

QA does not consult the TM the way translate/edit do. TM is for
generation; QA is for verification.

---

### Step 5 — Phase 2: Context Pairing

`[AGENT OUT]`

```json
{
  "promptContext": {
    "task": "qa",
    "source": "打突の機会を見逃さず、間合いを詰める。",
    "target": "Without letting an opportunity for datotsu pass, close the maai.",
    "riskFocus": [
      "polarity / negation (見逃さず ↔ without … pass)",
      "terminology consistency (datotsu, maai)"
    ],
    "knownPatterns": [
      "polarity flip on JA negation (7 historical occurrences)"
    ],
    "termsRequired":  ["間合い → maai (✓ present)"],
    "termsPreferred": ["打突 → datotsu (✓ present)"]
  },
  "coverageReport": { "overall": 0.93, "gaps": [] }
}
```

---

### Step 6 — Phase 3: Generation (N=1, `issue_scan`)

A single LLM call. The agent must return a structured issue list (or
empty list), not free text.

`[AGENT IN]`

```
system: You are a QA reviewer for a Japanese→English kendo translation.
        Examine the source and target for translation issues. Categorise
        each issue as terminology / accuracy / fluency / consistency /
        style with severity major / minor / info. Output a JSON array.
        If you find no material issues, return [].
        Pay particular attention to known risk patterns flagged by the
        pipeline. Do NOT propose a fixed translation — only flag issues.

user:   Source:  打突の機会を見逃さず、間合いを詰める。
        Target:  Without letting an opportunity for datotsu pass, close the maai.
        Risk focus:
          - polarity / negation (見逃さず ↔ "without ... pass")
          - terminology consistency (datotsu, maai)
        Required terms present: 間合い→maai ✓, 打突→datotsu ✓
        Historical patterns:
          - "polarity flip on JA negation" (7 prior occurrences)
        Return JSON only.
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
  "coverageReport": { "overall": 0.93, "gaps": [] }
}
```

---

### Step 9X — Human sees a clean-pass report

`[HUMAN SEES]`

```
┌─ QA report ─ segment 47 ────────────────── clean pass ──────┐
│ The agent reviewed source and target and found no material  │
│ issues.                                                     │
│                                                             │
│ Issue recall (self-est.):     0.90                          │
│ False-positive rate:          n/a (no flags)                │
│ Severity calibration:         n/a (no flags)                │
│ Overall confidence:           0.95                          │
│                                                             │
│ ⓘ The agent's clean-pass is advisory. Approve this segment  │
│   yourself if you agree.                                    │
│                                                             │
│ [ Approve segment ]   [ Send back to proofread ]            │
└─────────────────────────────────────────────────────────────┘
```

The button is `[ Approve segment ]`, not `[ Accept agent verdict ]`. The
UI deliberately frames the action as the human's own approval, with the
agent's clean-pass as supporting evidence.

---

### Step 10X — Human approves

`[HUMAN ACTS]` `tanaka` reads the source and target one more time
herself, agrees, clicks **Approve segment**.

`[DB]`

```sql
UPDATE segments SET status = 'qa_approved' WHERE id = '5f3a…-47';

INSERT INTO segment_phase_transitions
  (segment_id, from_status, to_status, actor_id)
VALUES
  ('5f3a…-47', 'proofread', 'qa_approved', '<tanaka>');
```

`qa_approved` is the terminal status for the segment. No further phase
exists. The agent's `clean_pass` verdict has now produced exactly one DB
write — and that write was performed **by the human, not by the agent**.

`[HUMAN SEES]`

```
┌─ Segment 47 ──────────────────────── status: qa_approved ───┐
│ ✅ Approved by tanaka.                                       │
│   Agent QA: clean pass (overall 0.95)                       │
│ Activity:  🤖 3 suggestions · 🔍 1 QA pass (clean)          │
│            ✅ approved by tanaka                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Branch Y — Agent flags one minor issue

Replay Step 6 with a different LLM output.

`[AGENT OUT]` (Step 6, branch Y)

```json
{
  "issues": [
    {
      "id":          "iss-1",
      "type":        "terminology",
      "severity":    "minor",
      "location":    "close the maai",
      "description": "First occurrence of 'maai' in this chapter is not italicised. The style guide italicises kendo romanizations on first occurrence per chapter.",
      "evidence":    "Target token 'maai' at char 47–51.",
      "suggestion":  "Consider '*maai*' for first occurrence.",
      "confidence":  0.55,
      "needsChapterScan": true
    }
  ]
}
```

The flag is **minor** and the agent itself hedges with `confidence: 0.55`
and `needsChapterScan: true`. It cannot fully verify the "first
occurrence" claim without a chapter scan it did not perform.

---

### Step 7Y — Phase 4a: Quality Assessment (of a 1-issue list)

`[AGENT OUT]`

```json
{
  "scores": {
    "issue_recall":          0.80,   // moderate; one flag, may miss others
    "false_positive_rate":   0.85,   // 0.85 = est. 15% chance this flag is spurious
    "severity_calibration":  0.95
  },
  "overall": 0.85,
  "note":    "single minor flag with moderate confidence; hedged by needsChapterScan"
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
    { "id": "iss-1", "type": "terminology", "severity": "minor",
      "location": "close the maai",
      "description": "…", "suggestion": "…", "confidence": 0.55,
      "needsChapterScan": true }
  ],
  "scores": { "issue_recall": 0.80, "false_positive_rate": 0.85,
              "severity_calibration": 0.95, "overall": 0.85 },
  "routing": "issues_pending_review",
  "coverageReport": { "overall": 0.93, "gaps": [] }
}
```

---

### Step 9Y — Human sees the issue triage panel

`[HUMAN SEES]`

```
┌─ QA report ─ segment 47 ────────────── 1 issue to triage ───┐
│ Issue 1 of 1                                                │
│   type:        terminology                                  │
│   severity:    minor                                        │
│   location:    "close the maai"                             │
│   description: First occurrence of 'maai' in this chapter   │
│                is not italicised. The style guide italicises│
│                kendo romanizations on first occurrence per  │
│                chapter.                                     │
│   suggestion:  Consider '*maai*' for first occurrence.      │
│   agent confidence: 0.55                                    │
│   ⚠ Agent could not verify 'first occurrence' without scan. │
│                                                             │
│   [ Confirm issue ]  [ Dismiss as false positive ]          │
│   [ Defer (leave open) ]                                    │
│                                                             │
│ Overall QA: 0.85 (issues_pending_review)                    │
│                                                             │
│ [ Approve segment ]   [ Send back to proofread ]            │
└─────────────────────────────────────────────────────────────┘
```

Three triage actions per issue, in increasing weight:

- **Confirm issue** — records the issue in `qa_issues`. The segment is
  not blocked; QA-advisory does not gate approval on open issues. It
  merely records them for the document's QA log and for future retrieval.
- **Dismiss as false positive** — records the dismissal as
  helpful-feedback for the agent's future false-positive-rate calibration.
- **Defer** — issue stays attached to the segment but in `open` state,
  visible to a senior reviewer or revisited later.

The two segment-level actions are independent of the issue triage:
`tanaka` can approve the segment **even with an open or confirmed
issue** — issues are advisory, approval is the human's call.

---

### Step 10Y — Human triages and approves

`[HUMAN ACTS]` `tanaka` scans the chapter herself, confirms that `maai`
**does** appear earlier in chapter 3 (segment 12). So the "first
occurrence" claim is wrong — by then `maai` was already used. She
clicks **Dismiss as false positive**.

`[DB]`

```sql
INSERT INTO qa_issues
  (segment_id, issue_type, severity, location, description,
   agent_confidence, status, triaged_by, triaged_at, dismissal_reason)
VALUES
  ('5f3a…-47', 'terminology', 'minor',
   'close the maai',
   'First occurrence claim; agent did not verify with chapter scan',
   0.55,
   'dismissed_false_positive',
   '<tanaka>',
   now(),
   'maai already used at segment 12 of chapter 3');
```

Note: the row in `qa_issues` is created **at the moment of human
triage** — confirmed *or* dismissed. The dismissed-with-reason row is
valuable training data for the agent's future FPR calibration, so we
record it rather than discarding.

Then `tanaka` clicks **Approve segment**.

`[DB]`

```sql
UPDATE segments SET status = 'qa_approved' WHERE id = '5f3a…-47';

INSERT INTO segment_phase_transitions
  (segment_id, from_status, to_status, actor_id)
VALUES
  ('5f3a…-47', 'proofread', 'qa_approved', '<tanaka>');
```

`[HUMAN SEES]`

```
┌─ Segment 47 ──────────────────────── status: qa_approved ───┐
│ ✅ Approved by tanaka.                                       │
│   Agent QA: 1 flag, dismissed as false positive             │
│   Reason: 'maai already used at segment 12 of chapter 3'    │
│ Activity:  🤖 3 suggestions · 🔍 1 QA pass (1 flag, dismissed)│
│            ✅ approved by tanaka                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Step 11 — Phase 4b: Memory Update (QA-shaped, currently missing)

`[GAP]` QA's memory update has two distinctive shapes:

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
│ ☑ Record dismissal in qa_issue_patterns                     │
│       (pattern: 'first-occurrence italics claim'; +1 FP)    │
│ ☑ Adjust agent's first-occurrence-claim threshold           │
│       (currently fires at 0.55 confidence; +1 dismissal     │
│       suggests raising to 0.65)                             │
│                                                             │
│ [ Save selected ]   [ Skip ]                                │
└─────────────────────────────────────────────────────────────┘
```

The second checkbox is unusually direct — QA's learning includes
**adjusting its own thresholds**. Whether the platform allows this kind
of self-modifying memory remains a policy decision; the design today is
that humans see the proposed adjustment and choose.

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
