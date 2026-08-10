# Memory DB Design — extension over existing substrate

> **Status.** Design-only. No migration is created in this document. Every
> `CREATE TABLE`, `CREATE VIEW`, `ALTER TABLE`, and RLS policy below is a
> **proposed** shape, to be materialised in a follow-up migration unit.
>
> **Scope decision.** Per `MAC-RAG-EXAMPLES-TODO-PLAN.md` decision D6
> (Option B), this document is an **extension** over the live substrate,
> not a from-scratch design. Section 2 documents what already exists;
> Section 3 onward documents only the additions needed to close the
> `[GAP]` markers in `MAC-RAG.md` and `MAC-RAG-EXAMPLES.md`.

---

## 1. Goals and Non-Goals

### 1.1 Goals

1. **Close every `[GAP]` marker related to Phase 4b (Memory Update)**
   across the four task walkthroughs (translate, edit, proofread,
   QA-advisory). The walkthroughs describe four task-shaped memory
   updates today; the schema must support all four without leaking task
   assumptions into shared tables.
2. **Preserve the cooperation-first invariant.** Every memory write that
   reflects a human-approved outcome must be **gated by a human action**
   in the Post-Production Panel (see MAC-RAG.md §3.5). Agents may
   propose memory updates; agents must never commit them. This applies
   especially to QA-advisory, which has the strongest "agents propose;
   humans dispose" constraint in the system.
3. **Extend, do not replace.** Treat `translation_memory` (1,264 rows),
   `terminology` (920 rows), and `agent_prompts` (1 row) as the
   substrate. New columns and helper tables augment what is already
   queryable. No data migration. No data loss.
4. **Keep the read path cheap.** Retrieval in Phase 1 must be a small
   number of indexed queries against materialised tables and views, not
   join graphs over edit-history. Long-tail learning artifacts
   (`edit_patterns`, `qa_issue_patterns`) live in their own tables with
   their own indexes; they do not join into the hot retrieval path.
5. **Make agent learning auditable.** Every Phase-4b write records
   *which segment*, *which suggestion*, *which actor*, and *which
   approach* (when applicable) produced it, so a future user can ask
   "why is this in the terminology table?" and get a chain back to the
   accept event.

### 1.2 Non-Goals

1. **CRDTs, OT, real-time merge.** Cooperation uses soft-lock plus
   `segment_suggestions`; the memory layer inherits that model. No
   collaborative-editing primitives are introduced here.
2. **Threshold self-tuning at runtime.** The QA walkthrough's
   Step 11 mock-up exposes a threshold-tuning checkbox, but the actual
   threshold lives in `agent_prompts` (or a sibling config table) and is
   updated only through explicit user action. No silent drift.
3. **Cross-project / cross-instance federation.** All tables are scoped
   to this Supabase project. The `domain` column on
   `translation_memory` and `terminology` is the only cross-project hint
   we keep; we do not design a multi-tenant export path here.
4. **Embedding retraining.** The `embedding pgvector` column on
   `translation_memory` is populated by an external pipeline (out of
   scope). This document defines only **how the column is read and
   written**, not how vectors are generated.
5. **Schema migrations.** This is a design document. A separate work
   unit will produce `supabase/migrations/00X_memory_db_extension.sql`.

### 1.3 Invariants the memory layer must enforce

- **I-MEM-1.** No agent identity may directly INSERT into
  `translation_memory`, `terminology`, `style_guide`,
  `qa_issue_patterns`, or `edit_patterns`. Writes happen via an RPC
  that the Post-Production Panel calls on behalf of a confirmed human
  action. RLS forbids the agent's service-role from those tables.
- **I-MEM-2.** Every Phase-4b row carries a `source_suggestion_id`
  (where applicable) or `source_qa_issue_id` (for QA-derived rows),
  pointing back to the cooperation-surface row that occasioned the
  write.
- **I-MEM-3.** Promotion from `preferred` to `required` (terminology,
  style_guide) is **idempotent and reversible**: an idempotency key
  prevents double-promotion; an explicit demotion path exists.
- **I-MEM-4.** Dismissed QA issues are recorded with the same fidelity
  as confirmed ones. False-positive data is training data; we do not
  throw it away.

---

## 2. Existing Substrate (inventory)

The three memory tables that already exist, as observed live on
`mbgmyvmsvenvtecvrjia` at the time of writing.

### 2.1 `translation_memory` (1,264 rows)

```
id              uuid PK             default gen_random_uuid()
source_text     text NOT NULL
target_text     text NOT NULL
source_lang     varchar             default 'ja'
target_lang     varchar             default 'en'
domain          varchar             default 'kendo'
quality         varchar             nullable
human_approved  boolean             default false
source_url      varchar             nullable
embedding       USER-DEFINED        nullable    -- pgvector
created_at      timestamptz         default now()
source_tsv      tsvector            nullable    -- full-text index
created_by      uuid                nullable
article_id     uuid                nullable    -- back-reference
usage_count     integer             default 0
last_used_at    timestamptz         nullable
updated_at      timestamptz         default now()
```

**What's there.**

- **`embedding pgvector`** — populated; the substrate for semantic
  retrieval in Phase 1 already exists. The retrieval code at
  `lib/retrieval/tm-search.ts` does not yet use it (current ranking is
  trigram + tsvector); this is a code gap, not a schema gap.
- **`source_tsv tsvector`** — populated and indexed. Lexical retrieval
  is live.
- **`human_approved`** — boolean; today populated truthfully by the
  ingest path. Phase 4b writes from translate-accept set this to `true`.
- **`usage_count` / `last_used_at`** — already there. Recency weighting
  ("prefer recently-confirmed-helpful TM entries") only requires the
  retrieval code to read these columns and the Post-Production Panel to
  bump them on accept.
- **`article_id`** — back-reference for "where in the project did this
  pair come from?"; used by W3's L3-vs-L4 distinction.

**What's missing.**

- **`source_suggestion_id uuid REFERENCES segment_suggestions(id)`** —
  Phase 4b writes from translate must record the suggestion that was
  accepted. Without this, the audit chain "TM row ← accept ← suggestion
  ← Phase 3 candidate" is broken.
- **`origin text`** — one of `'ingest'`, `'phase_4b_translate'`,
  `'phase_4b_edit_update'`, `'manual'`. Lets retrieval and the
  Post-Production Panel filter by origin.
- **`approach text`** — for Phase 4b writes from translate, which of
  `literal / natural / formal` produced the accepted candidate. Useful
  for the per-approach confidence weighting described in Appendix A.2.10.
- **`feedback_score integer DEFAULT 0`** — incremented when retrieved-
  then-confirmed-helpful; decremented when retrieved-then-marked-
  unhelpful. Drives the "boost helpful TM examples" checkbox in the
  Translate Step 13 memory-update UI.
- **`superseded_by uuid REFERENCES translation_memory(id)`** — when an
  edit-phase Phase 4b decides to *update* an existing TM entry (rather
  than insert a new one), we either overwrite `target_text` in place or
  insert a new row and link the old via `superseded_by`. The design
  below chooses **insert-and-link** to preserve history (I-MEM-2).

### 2.2 `terminology` (920 rows)

```
id            uuid PK             default gen_random_uuid()
source_term   text NOT NULL
target_term   text NOT NULL
reading       text                nullable
domain        text                default 'kendo'
term_type     text                default 'preferred'   -- preferred|required|do_not_translate
notes         text                nullable
created_at    timestamptz         default now()
```

**What's there.**

- `term_type` already exists with the three-value vocabulary the
  walkthroughs reference (`preferred`, `required`, `do_not_translate`).
  Promotion is therefore an `UPDATE … SET term_type = 'required'`, not
  a schema change.
- `reading` (e.g. *kendō* for 剣道) is already a column; A.2.5
  first-occurrence annotation can write here for furigana hints.
- `domain` is multi-valued ready: today all rows are `'kendo'` but the
  column supports broader scoping.

**What's missing.**

- **`promotion_count integer DEFAULT 0`** — increments every time a
  human-confirmed Phase 4b cycle proposes "promote to required". The
  promotion fires (changes `term_type` to `'required'`) when
  `promotion_count >= promotion_threshold` AND a human confirms in the
  Post-Production Panel. Today the count exists nowhere; the
  walkthroughs hand-wave with "(seen N consistent accepts)".
- **`promotion_threshold integer DEFAULT 3`** — per-row override of the
  default threshold; admins can lower this for high-importance terms.
- **`promoted_at timestamptz`** and **`promoted_by uuid REFERENCES profiles(id)`**
  — audit trail for the actual term-type change. Demotion sets these
  to NULL and decrements `promotion_count` per I-MEM-3.
- **`casing text`** — `'lowercase'` / `'capitalize'` / `'italic_first_occurrence'`
  / `'none'`. Proofread Phase 4b writes here. Today casing rules live
  only as ad-hoc text in `notes`.
- **`source_suggestion_id uuid REFERENCES segment_suggestions(id)`** —
  same audit-chain requirement as TM (I-MEM-2). Nullable because
  manually-curated terms have no suggestion of origin.
- **`first_occurrence_per text`** — `'document'` / `'chapter'` /
  `'section'` / `null`. Drives A.2.5 first-occurrence annotation.
  `null` = annotate every occurrence.

### 2.3 `agent_prompts` (1 row)

```
id           uuid PK     default gen_random_uuid()
user_id      uuid        nullable    -- NULL = global default
agent_type   varchar NOT NULL        -- 'translate'|'edit'|'proofread'|'qa'
approach     varchar     nullable    -- task-specific
template     text NOT NULL
created_at   timestamptz default now()
updated_at   timestamptz default now()
```

**What's there.**

- Per-`(agent_type, approach)` template, with optional `user_id` scope
  for per-user overrides. The structure already supports the W6
  5-module schema as a single `template` blob.
- Update timestamps already track edits.

**What's missing.**

- **`active boolean DEFAULT true`** — soft-delete / rollback. Editing a
  prompt should insert a new row and flip the previous row's `active`
  to false; the audit trail then reads "row X was active from T0 to T1,
  row Y from T1 onward".
- **`version integer`** + **UNIQUE (agent_type, approach, user_id, version)**
  — explicit versioning instead of relying on `updated_at` ordering.
  Useful for the prompt-edit audit trail flagged as a cross-cutting
  `[GAP]` in W6 (particularly weighty for QA reviewer-bias).
- **`edited_by uuid REFERENCES profiles(id)`** — who changed the
  prompt. Today there's no actor on the row.

We model the **audit trail separately** in §3.7 (`prompt_edits`) rather
than relying on version rows alone, because the audit needs a
structured diff and rationale field, not just "the template at version N
was X".

### 2.4 What's adjacent but not memory

These tables are part of the cooperation surface, not the memory
layer. We touch some of them (one column each) but do not redesign
them; they are listed here only to make the diff explicit.

- `segments` — extend with `auto_accept_eligible boolean` (proofread).
- `segment_suggestions` — extend with `auto_accepted boolean DEFAULT false`
  to mark suggestions that bypassed human confirmation under the
  document's auto-accept policy.
- `articles` — extend with `policy jsonb` for per-document policy
  (auto-accept on/off, thresholds, first-occurrence scope).
- `qa_issues` — read-only for memory; it is the source-of-truth that
  feeds `qa_issue_patterns`.

---

## 3. New Tables and Column Additions

### 3.1 `style_guide` (new)

The proofread phase needs a memory destination for casing, italics,
punctuation, and small register decisions. It is **separate from
`terminology`** because a style rule does not bind to a source term: it
may apply to "any kendo romanization", "any chapter-opening sentence",
or "any number followed by a counter". Style rules are *pattern → policy*
mappings.

```sql
CREATE TABLE style_guide (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope                 text NOT NULL,           -- 'global' | 'project' | 'article'
  scope_ref             uuid NULL,               -- article_id when scope='article'
  rule_category         text NOT NULL,           -- 'casing' | 'italics' | 'punctuation'
                                                 -- | 'register' | 'numbers' | 'other'
  pattern               text NOT NULL,           -- human-readable; e.g. 'kendo romanizations'
  policy                text NOT NULL,           -- human-readable; e.g. 'lowercase mid-sentence'
  rationale             text NULL,
  confirmation_count    integer NOT NULL DEFAULT 1,
  status                text NOT NULL DEFAULT 'preferred',  -- 'preferred' | 'required'
  source_suggestion_id  uuid NULL REFERENCES segment_suggestions(id) ON DELETE SET NULL,
  created_by            uuid NULL REFERENCES profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX style_guide_scope_idx
  ON style_guide (scope, scope_ref);

CREATE INDEX style_guide_category_status_idx
  ON style_guide (rule_category, status);
```

**Why not just rows in `terminology`?** Two reasons:

1. Style rules have a `scope` (`global` / `project` / `article`), where
   terminology is project-scoped via `domain`. Conflating them would
   force every terminology query to filter on a `scope_ref` it does not
   care about.
2. The retrieval shape is different. Phase 1 terminology lookup is
   "given source tokens, find rows where `source_term` matches" — a
   trigram lookup against a single text column. Style lookup is "given a
   target candidate, find rows where the pattern applies" — a less
   constrained scan that benefits from a different index.

### 3.2 `qa_issue_patterns` (new)

The QA walkthrough Step 11 mock-up calls for a `qa_issue_patterns` table
that retrieval consults during future QA runs. It is also the
calibration substrate for the agent's false-positive-rate self-estimate.

```sql
CREATE TABLE qa_issue_patterns (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name          text NOT NULL,           -- e.g. 'first-occurrence italics claim'
  category              text NOT NULL,           -- mirrors qa_issues.category
  description           text NOT NULL,
  detection_hint        text NULL,               -- agent-facing prompt fragment
  confirmation_count    integer NOT NULL DEFAULT 0,
  dismissal_count       integer NOT NULL DEFAULT 0,
  needs_chapter_scan    boolean NOT NULL DEFAULT false,
  severity_default      text NULL,               -- 'minor' | 'major' | 'critical'
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX qa_issue_patterns_name_uidx
  ON qa_issue_patterns (pattern_name);

CREATE TABLE qa_issue_pattern_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id            uuid NOT NULL REFERENCES qa_issue_patterns(id)
                                       ON DELETE CASCADE,
  qa_issue_id           uuid NOT NULL REFERENCES qa_issues(id)
                                       ON DELETE CASCADE,
  outcome               text NOT NULL,           -- 'confirmed' | 'dismissed_false_positive'
                                                 -- | 'dismissed_out_of_scope'
  triaged_by            uuid NOT NULL REFERENCES profiles(id),
  triaged_at            timestamptz NOT NULL DEFAULT now(),
  dismissal_reason      text NULL,
  agent_confidence      real NULL                -- snapshot at triage time
);

CREATE INDEX qa_issue_pattern_events_pattern_idx
  ON qa_issue_pattern_events (pattern_id, outcome);
```

**Why the split.** The `qa_issue_patterns` row is the **aggregate**
(counts, current detection hint, current severity); each
`qa_issue_pattern_events` row is a single triage event. The aggregate
is what retrieval reads; events are what calibration replays. This
mirrors the way Postgres advises separating analytic from operational
tables.

### 3.3 `edit_patterns` (new)

The edit-phase Phase 4b records "old phrasing → new phrasing" patterns
that the edit agent can prefer in future runs (described in Edit
Walkthrough Step 13).

```sql
CREATE TABLE edit_patterns (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  before_phrase         text NOT NULL,
  after_phrase          text NOT NULL,
  rationale             text NULL,                -- why the edit was preferred
  approach              text NULL,                -- 'light_touch' | 'accuracy_focus'
                                                  -- | 'fluency_focus'
  confirmation_count    integer NOT NULL DEFAULT 1,
  domain                text NOT NULL DEFAULT 'kendo',
  source_suggestion_id  uuid NULL REFERENCES segment_suggestions(id)
                                       ON DELETE SET NULL,
  created_by            uuid NULL REFERENCES profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX edit_patterns_before_phrase_trgm_idx
  ON edit_patterns USING gin (before_phrase gin_trgm_ops);

CREATE INDEX edit_patterns_domain_idx
  ON edit_patterns (domain);
```

**Why not a column on `translation_memory`.** Edit patterns are
phrasing diffs, not source→target pairs. They are queried during edit's
Phase 1 retrieval as "given this target candidate, do any
before-phrases match substrings of it?". That is a target-side lookup;
TM is source-side. The two indexes (target trgm here vs source
embedding/tsv on TM) cannot live happily in the same row.

### 3.4 `document_sections` and `document_decisions` (new)

The L2 (article-local) layer of the hierarchical context model needs a
sectional unit ("chapter 3", "section 2.1") and a place to record
decisions made at document scope ("we are translating 道 as `dō` not
`do` in this article"). Today, MAC-RAG's L2 retrieval relies entirely
on positional neighbours of the segment, which is why article
`c914a0bb` is degenerate (W3 finding).

```sql
CREATE TABLE document_sections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  position        integer NOT NULL,
  title           text NULL,
  start_segment   uuid NULL REFERENCES segments(id) ON DELETE SET NULL,
  end_segment     uuid NULL REFERENCES segments(id) ON DELETE SET NULL,
  summary         text NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX document_sections_article_idx
  ON document_sections (article_id, position);

CREATE TABLE document_decisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  section_id      uuid NULL REFERENCES document_sections(id) ON DELETE SET NULL,
  decision_kind   text NOT NULL,    -- 'terminology' | 'casing' | 'register' | 'pov'
                                    -- | 'other'
  body            text NOT NULL,    -- human-readable
  set_by          uuid NULL REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX document_decisions_article_idx
  ON document_decisions (article_id, decision_kind);
```

`document_sections` is *optional per article*. If absent, retrieval
falls back to positional neighbours. `document_decisions` is the
explicit "we decided X for this document" record; it shows up in the
Context Builder Panel under the L2 accordion.

### 3.5 `prompt_edits` (new)

Audit trail for `agent_prompts` changes. Cross-cutting `[GAP]` from W6.

```sql
CREATE TABLE prompt_edits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_prompt_id uuid NOT NULL REFERENCES agent_prompts(id) ON DELETE CASCADE,
  prev_template   text NULL,
  new_template    text NOT NULL,
  rationale       text NULL,
  edited_by       uuid NOT NULL REFERENCES profiles(id),
  edited_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX prompt_edits_agent_prompt_idx
  ON prompt_edits (agent_prompt_id, edited_at DESC);
```

Together with the proposed `agent_prompts.active`, `.version`, and
`.edited_by` (§2.3), this gives a complete audit history for any
prompt edit. QA's reviewer-bias concern is addressed: every edit to
the QA prompt is timestamped, attributed, and diffable.

### 3.6 Column additions to existing tables

```sql
ALTER TABLE translation_memory
  ADD COLUMN source_suggestion_id uuid NULL
    REFERENCES segment_suggestions(id) ON DELETE SET NULL,
  ADD COLUMN origin               text NOT NULL DEFAULT 'ingest',
  ADD COLUMN approach             text NULL,
  ADD COLUMN feedback_score       integer NOT NULL DEFAULT 0,
  ADD COLUMN superseded_by        uuid NULL
    REFERENCES translation_memory(id) ON DELETE SET NULL;

CREATE INDEX translation_memory_origin_idx
  ON translation_memory (origin);

ALTER TABLE terminology
  ADD COLUMN promotion_count       integer NOT NULL DEFAULT 0,
  ADD COLUMN promotion_threshold   integer NOT NULL DEFAULT 3,
  ADD COLUMN promoted_at           timestamptz NULL,
  ADD COLUMN promoted_by           uuid NULL REFERENCES profiles(id),
  ADD COLUMN casing                text NULL,
  ADD COLUMN source_suggestion_id  uuid NULL
    REFERENCES segment_suggestions(id) ON DELETE SET NULL,
  ADD COLUMN first_occurrence_per  text NULL;

ALTER TABLE agent_prompts
  ADD COLUMN active     boolean NOT NULL DEFAULT true,
  ADD COLUMN version    integer NOT NULL DEFAULT 1,
  ADD COLUMN edited_by  uuid NULL REFERENCES profiles(id);

CREATE UNIQUE INDEX agent_prompts_active_lookup_uidx
  ON agent_prompts (agent_type, COALESCE(approach, ''), COALESCE(user_id::text, ''))
  WHERE active = true;

ALTER TABLE segment_suggestions
  ADD COLUMN auto_accepted boolean NOT NULL DEFAULT false;

ALTER TABLE segments
  ADD COLUMN auto_accept_eligible boolean NOT NULL DEFAULT false;

ALTER TABLE articles
  ADD COLUMN policy jsonb NOT NULL DEFAULT '{}'::jsonb;
```

**`articles.policy` shape.** A small JSON object, validated in
application code (not by Postgres):

```json
{
  "auto_accept": {
    "enabled": false,
    "phase": "proofread",
    "min_quality": 0.95,
    "max_confidence_drift": 0.05
  },
  "first_occurrence": {
    "scope": "chapter"
  },
  "terminology": {
    "enforce_required": true
  }
}
```

Defaults are conservative: auto-accept off, first-occurrence
per-document (the most generous scope).

---

## 4. Views

### 4.1 `tm_search_view`

A retrieval-facing view that joins `translation_memory` with the
minimum fields the Phase 1 ranker needs, masking
operational-but-not-retrieval columns.

```sql
CREATE VIEW tm_search_view AS
SELECT
  tm.id,
  tm.source_text,
  tm.target_text,
  tm.source_lang,
  tm.target_lang,
  tm.domain,
  tm.embedding,
  tm.source_tsv,
  tm.quality,
  tm.human_approved,
  tm.usage_count,
  tm.last_used_at,
  tm.feedback_score,
  tm.origin,
  tm.approach,
  tm.article_id,
  CASE
    WHEN tm.article_id IS NOT NULL THEN 'project'  -- L3
    ELSE 'external'                                -- L4
  END AS retrieval_layer,
  tm.superseded_by IS NULL AS is_current
FROM translation_memory tm
WHERE tm.superseded_by IS NULL;
```

The view filters out superseded rows so Phase 1 retrieval never returns
a stale TM example. The `retrieval_layer` discriminator gives the
ranker its L3-vs-L4 signal without forcing it to compute the case
distinction itself.

### 4.2 `qa_issue_patterns_view`

Retrieval-facing view used in Phase 1 of future QA runs. Exposes
aggregate counts and a derived `fp_rate` calibration estimate.

```sql
CREATE VIEW qa_issue_patterns_view AS
SELECT
  p.id,
  p.pattern_name,
  p.category,
  p.description,
  p.detection_hint,
  p.confirmation_count,
  p.dismissal_count,
  p.needs_chapter_scan,
  p.severity_default,
  CASE
    WHEN (p.confirmation_count + p.dismissal_count) > 0
      THEN p.dismissal_count::real / (p.confirmation_count + p.dismissal_count)
    ELSE NULL
  END AS fp_rate,
  p.confirmation_count + p.dismissal_count AS event_count,
  p.updated_at
FROM qa_issue_patterns p;
```

`fp_rate NULL` means "no triage events yet"; the QA agent should treat
this as "no prior calibration" rather than as 0% or 100%.

### 4.3 `terminology_active_view`

Convenience view that exposes the *effective* term type after
promotion, while preserving the raw `term_type` column. Used by the
gap-detector in `lib/context/gap-detector.ts`.

```sql
CREATE VIEW terminology_active_view AS
SELECT
  t.id,
  t.source_term,
  t.target_term,
  t.reading,
  t.domain,
  t.term_type,
  t.casing,
  t.first_occurrence_per,
  t.notes,
  t.promotion_count,
  t.promotion_threshold,
  (t.promotion_count >= t.promotion_threshold) AS promotion_eligible,
  t.created_at
FROM terminology t;
```

---

## 5. RLS Policies

The roles vocabulary is `{admin, translator, reader}` (from
`profiles.role`). Phase capabilities are granted per-document via
`document_assignments`. The memory tables are not document-scoped, so
the RLS for them is role-scoped only.

### 5.1 Read access

| Table                  | admin | translator | reader | service-role (agent) |
|------------------------|-------|------------|--------|----------------------|
| `translation_memory`   | R     | R          | R      | R                    |
| `terminology`          | R     | R          | R      | R                    |
| `style_guide`          | R     | R          | R      | R                    |
| `qa_issue_patterns`    | R     | R          | —      | R                    |
| `edit_patterns`        | R     | R          | —      | R                    |
| `document_sections`    | R     | R          | R      | R                    |
| `document_decisions`   | R     | R          | R      | R                    |
| `prompt_edits`         | R     | —          | —      | —                    |
| `agent_prompts`        | R     | R          | —      | R                    |

Readers see only the customer-facing memory (TM, terminology, style,
sections, decisions). They do not see QA patterns or edit patterns,
which are internal-loop artifacts.

### 5.2 Write access

| Table                       | admin | translator (via RPC) | service-role (agent) |
|-----------------------------|-------|----------------------|----------------------|
| `translation_memory`        | W     | W via `rpc_phase_4b_translate_save` | **denied** |
| `terminology`               | W     | W via `rpc_phase_4b_promote_term`   | **denied** |
| `style_guide`               | W     | W via `rpc_phase_4b_save_style`     | **denied** |
| `qa_issue_patterns`         | W     | W via `rpc_phase_4b_qa_save`        | **denied** |
| `qa_issue_pattern_events`   | W     | W via `rpc_phase_4b_qa_save`        | **denied** |
| `edit_patterns`             | W     | W via `rpc_phase_4b_edit_save`      | **denied** |
| `document_sections`         | W     | —                                   | **denied** |
| `document_decisions`        | W     | W (translator+ may add)             | **denied** |
| `prompt_edits`              | W     | —                                   | **denied** |
| `agent_prompts`             | W     | —                                   | **denied** |

The RPC pattern is the **enforcement point** for I-MEM-1: the agent's
service-role identity cannot insert into memory tables. The
translator's authenticated session can, but only through the named
RPCs, which validate that:

1. The user is the assignee for the relevant `document_assignments` row.
2. The associated `segment_suggestions` row is in `'accepted'` status
   (for I-MEM-2), or for QA, the `qa_issue` row has a non-null
   `resolved_by` (for triage events).
3. The idempotency key (where applicable, e.g. promotion) has not been
   used in the last N minutes.

### 5.3 Concrete policy bodies (illustrative)

```sql
-- Block service-role inserts on memory tables.
CREATE POLICY tm_no_agent_writes ON translation_memory
  FOR INSERT TO service_role
  WITH CHECK (false);

CREATE POLICY tm_admin_writes ON translation_memory
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  )
  WITH CHECK (true);

-- Translator inserts only via RPC (RPC runs with definer privileges
-- and bypasses the user's USING clause).
CREATE POLICY tm_translator_no_direct ON translation_memory
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin')
  );
```

The translator's path is **always** through `SECURITY DEFINER` RPCs;
the policy above intentionally denies them direct INSERT. This keeps
the audit chain enforced in one code path.

### 5.4 RLS for the cooperation-surface column additions

- `segment_suggestions.auto_accepted` inherits the existing
  `segment_suggestions` RLS unchanged.
- `segments.auto_accept_eligible` inherits the existing `segments` RLS;
  toggled by the proofread-phase code path when a suggestion qualifies.
- `articles.policy` is **admin-only writable** (matches existing
  `articles` UPDATE policy); translator/reader may read.

---

## 6. Migration Plan

Single migration file at:

```
supabase/migrations/005_memory_db_extension.sql
```

(Following the existing `000_baseline_snapshot.sql` + `004_phase_workflow.sql`
numbering.) The migration is **additive only**: every statement is
`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE … ADD COLUMN IF NOT EXISTS`
/ `CREATE INDEX IF NOT EXISTS` / `CREATE OR REPLACE VIEW`. No drops,
no data backfills.

### 6.1 Statement order

1. Column additions to existing tables (`translation_memory`,
   `terminology`, `agent_prompts`, `segment_suggestions`, `segments`,
   `articles`).
2. New tables in dependency order:
   `document_sections` → `document_decisions` → `style_guide` →
   `edit_patterns` → `prompt_edits` → `qa_issue_patterns` →
   `qa_issue_pattern_events`.
3. Indexes (already inlined per-table above; the migration repeats
   them as `IF NOT EXISTS`).
4. Views (`tm_search_view`, `qa_issue_patterns_view`,
   `terminology_active_view`).
5. RLS enables + policy bodies (per §5.3).
6. RPC functions (`rpc_phase_4b_translate_save`,
   `rpc_phase_4b_edit_save`, `rpc_phase_4b_save_style`,
   `rpc_phase_4b_promote_term`, `rpc_phase_4b_qa_save`). All declared
   `SECURITY DEFINER`, all parameterised by `(segment_id,
   suggestion_id, payload jsonb)`.

### 6.2 Idempotency

The migration is safe to re-run. The only non-idempotent surface is
RPC function bodies, which are `CREATE OR REPLACE FUNCTION`.

### 6.3 Backfill

None required. Existing rows continue to function:

- `translation_memory.origin` defaults to `'ingest'` for all current
  rows (factually correct: they entered through the ingest pipeline,
  not Phase 4b).
- `terminology.promotion_count` defaults to 0; rows already at
  `term_type = 'required'` keep that state and are not affected by
  promotion logic.
- `agent_prompts.version` defaults to 1; `active` to true. The single
  existing row becomes version 1.
- `segment_suggestions.auto_accepted` defaults to false; correct for
  every existing row (auto-accept is not yet wired).
- `articles.policy` defaults to `{}`; the application reads it as
  "auto-accept off" by default, which matches today's behaviour.

### 6.4 Rollback

The migration is additive, so rollback = `DROP` the new tables/views
and `ALTER TABLE … DROP COLUMN` the new columns. A companion
`rollback_005.sql` is produced alongside the migration. We do not run
the rollback automatically; it exists for manual recovery.

### 6.5 Verification queries

After applying:

```sql
-- All new tables present
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('style_guide', 'qa_issue_patterns',
                     'qa_issue_pattern_events', 'edit_patterns',
                     'document_sections', 'document_decisions',
                     'prompt_edits');
-- expected: 7 rows

-- All new columns present
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'translation_memory' AND column_name IN
       ('source_suggestion_id','origin','approach','feedback_score','superseded_by'))
    OR (table_name = 'terminology' AND column_name IN
       ('promotion_count','promotion_threshold','promoted_at','promoted_by',
        'casing','source_suggestion_id','first_occurrence_per'))
    OR (table_name = 'agent_prompts' AND column_name IN ('active','version','edited_by'))
    OR (table_name = 'segment_suggestions' AND column_name = 'auto_accepted')
    OR (table_name = 'segments' AND column_name = 'auto_accept_eligible')
    OR (table_name = 'articles' AND column_name = 'policy')
  );
-- expected: 18 rows
```

---

## 7. Phase 4b Memory-Update Flows

This section maps each walkthrough's `[GAP]` Phase 4b mock-up to the
tables defined above, and specifies what the RPC actually does.

### 7.1 Translate — `rpc_phase_4b_translate_save`

Triggered when the translator clicks "Save selected" on the Translate
Step 13 Post-Production Panel. Inputs:

```jsonc
{
  "segment_id":           "<uuid>",
  "suggestion_id":        "<uuid>",   // the accepted suggestion
  "save_to_tm":           true,
  "promote_terms":        [{"term_id": "<uuid>"}],
  "boost_tm_examples":    [{"tm_id":   "<uuid>"}]
}
```

Server actions:

1. **Validate.** Confirm the suggestion is `accepted` and the
   accepter is the calling user (or an admin).
2. **TM insert** (if `save_to_tm`).
   ```sql
   INSERT INTO translation_memory
     (source_text, target_text, source_lang, target_lang, domain,
      human_approved, source_suggestion_id, origin, approach,
      article_id, created_by)
   VALUES
     ($source_text, $target_text, $source_lang, $target_lang, $domain,
      true, $suggestion_id, 'phase_4b_translate', $approach,
      $article_id, auth.uid());
   ```
   The TM `embedding` is populated asynchronously by the embedding
   pipeline; the row is queryable lexically immediately and
   semantically once embedded.
3. **Term promotion** (per `promote_terms` entry).
   ```sql
   UPDATE terminology
     SET promotion_count = promotion_count + 1,
         updated_at      = now()
   WHERE id = $term_id;

   UPDATE terminology
     SET term_type   = 'required',
         promoted_at = now(),
         promoted_by = auth.uid()
   WHERE id = $term_id
     AND promotion_count >= promotion_threshold
     AND term_type <> 'required';
   ```
4. **TM feedback boost** (per `boost_tm_examples` entry).
   ```sql
   UPDATE translation_memory
     SET feedback_score = feedback_score + 1,
         updated_at     = now()
   WHERE id = $tm_id;
   ```

**What this closes.** `MAC-RAG-EXAMPLES.md` Translate Step 13 `[GAP]`
("save TM pair", "promote term", "mark TM example helpful").

### 7.2 Edit — `rpc_phase_4b_edit_save`

Triggered from the Edit Step 13 Post-Production Panel. Edit Phase 4b
is **shaped differently** from translate: typically it *updates* the
existing TM target rather than inserting a new pair, and it records a
diff into `edit_patterns`.

Inputs:

```jsonc
{
  "segment_id":           "<uuid>",
  "suggestion_id":        "<uuid>",
  "update_tm":            true,
  "edit_pattern":         {
    "before_phrase":  "missing the opportunity for X",
    "after_phrase":   "letting an opportunity for X pass",
    "rationale":      "preserves the 見逃さず 'without missing' aspect",
    "approach":       "accuracy_focus"
  },
  "promote_terms":        []
}
```

Server actions:

1. **Validate** as in §7.1.
2. **TM update via supersede** (if `update_tm`). Look up the existing
   TM row for this `(source_text, source_lang, target_lang)` tuple. If
   found, **insert a new row** with the new target and link the old via
   `superseded_by`. The view `tm_search_view` filters out superseded
   rows so retrieval sees only the current target. (We chose
   insert-and-link over in-place UPDATE for I-MEM-2 auditability.)
3. **Edit pattern insert.**
   ```sql
   INSERT INTO edit_patterns
     (before_phrase, after_phrase, rationale, approach,
      domain, source_suggestion_id, created_by)
   VALUES
     ($before_phrase, $after_phrase, $rationale, $approach,
      $domain, $suggestion_id, auth.uid());
   ```
   If a pattern with the same `(before_phrase, after_phrase, domain)`
   already exists, increment `confirmation_count` instead of inserting.
4. **Term promotion** as in §7.1.

**What this closes.** `MAC-RAG-EXAMPLES.md` Edit Step 13 `[GAP]`.

### 7.3 Proofread — `rpc_phase_4b_save_style` + `rpc_phase_4b_promote_term`

Proofread Phase 4b does **not** touch TM (the source→target mapping
hasn't changed); it touches `style_guide` and `terminology`. There are
two RPCs because the proofread Post-Production Panel may invoke each
independently.

`rpc_phase_4b_save_style` inputs:

```jsonc
{
  "segment_id":           "<uuid>",
  "suggestion_id":        "<uuid>",
  "scope":                "article",   // 'global'|'project'|'article'
  "scope_ref":            "<article_uuid>",
  "rule_category":        "casing",
  "pattern":              "kendo romanizations",
  "policy":               "lowercase mid-sentence",
  "rationale":            "consistent with house style"
}
```

Server actions:

1. **Validate** as in §7.1.
2. **Style insert or upgrade.** Look up an existing row by
   `(scope, scope_ref, rule_category, pattern)`. If found, increment
   `confirmation_count`; if the count meets a hard-coded threshold of 3,
   set `status = 'required'`. If not found, insert with
   `confirmation_count = 1`.

`rpc_phase_4b_promote_term` is the same RPC as in §7.1; proofread
calls it when the panel's casing-rule checkbox proposes "promote 打突
→ datotsu casing rule from preferred to required". For terminology
that means writing to the `casing` column and bumping
`promotion_count`.

**What this closes.** `MAC-RAG-EXAMPLES.md` Proofread Step 10 `[GAP]`.

**What is intentionally NOT done.** Auto-accepted suggestions still
require human confirmation in the Post-Production Panel before Phase
4b fires. This implements the walkthrough's "memory updates are never
automated, even when the suggestion itself was" rule.

### 7.4 QA-advisory — `rpc_phase_4b_qa_save`

QA Phase 4b operates on `qa_issues` rows (one per *triage event*,
confirmed or dismissed) and is the calibration substrate for the
agent's FPR self-estimate.

Inputs:

```jsonc
{
  "qa_issue_id":          "<uuid>",
  "pattern_name":         "first-occurrence italics claim",
  "agent_confidence":     0.55,
  "adjust_threshold":     {
    "agent_type":   "qa",
    "approach":     "issue_scan",
    "new_value":    0.65
  }
}
```

Server actions:

1. **Validate.** Confirm `qa_issues.resolved = true` and
   `resolved_by IS NOT NULL`.
2. **Pattern upsert.**
   ```sql
   INSERT INTO qa_issue_patterns (pattern_name, category, description)
   VALUES ($pattern_name, $category, $description)
   ON CONFLICT (pattern_name) DO NOTHING
   RETURNING id;
   ```
3. **Event insert.**
   ```sql
   INSERT INTO qa_issue_pattern_events
     (pattern_id, qa_issue_id, outcome, triaged_by, triaged_at,
      dismissal_reason, agent_confidence)
   VALUES
     ($pattern_id, $qa_issue_id, $outcome, auth.uid(), now(),
      $dismissal_reason, $agent_confidence);
   ```
4. **Aggregate update.**
   ```sql
   UPDATE qa_issue_patterns
     SET confirmation_count =
           confirmation_count + ($outcome = 'confirmed')::int,
         dismissal_count =
           dismissal_count + ($outcome LIKE 'dismissed%')::int,
         updated_at = now()
   WHERE id = $pattern_id;
   ```
5. **Threshold adjust** (if `adjust_threshold` present). This **does
   not** auto-modify `agent_prompts`. Instead it creates a `prompt_edits`
   row marked `rationale = 'qa calibration: …'`, leaves the active
   prompt untouched, and surfaces a notification to admins. The
   actual prompt update is admin-only. This implements the
   walkthrough's "self-modifying memory remains a policy decision"
   stance.

**What this closes.** `MAC-RAG-EXAMPLES.md` QA Step 11 `[GAP]`.

### 7.5 Common shape across all four

Every Phase 4b RPC:

- Runs `SECURITY DEFINER`, so the user's authenticated identity drives
  authorization but the RPC body can write to memory tables.
- Returns `jsonb` with `{ "wrote": <table_name>, "ids": [...] }` so
  the client can show "Saved: 3 entries" feedback.
- Logs to a (proposed, not in this design) `phase_4b_audit` table for
  observability. The audit table is mentioned here as a forward
  reference and is **not part of this design**; if observability is
  needed, it joins this work as a small addendum.
- Is idempotent for a given `(segment_id, suggestion_id,
  rpc_specific_key)` tuple within a short window (e.g. 5 minutes), to
  prevent double-saves from accidental double-clicks.

---

## Appendix — Forward References

The following walkthrough/spec passages refer to memory shapes defined
here. The W10 work unit will replace each `[GAP]` marker in those files
with a forward-reference of the form
`(See MEMORY-DB-DESIGN.md §N — table_name)`.

| Location                                                  | Forward to                                              |
|-----------------------------------------------------------|---------------------------------------------------------|
| `MAC-RAG.md` §3.5 Post-Production Panel UI [GAP]          | §7 (all subsections)                                    |
| `MAC-RAG.md` §3.5 Phase 4b endpoint [GAP]                 | §7 (RPC names)                                          |
| `MAC-RAG.md` §3.5 style_guide / qa_issue_patterns [GAP]   | §3.1 / §3.2                                             |
| `MAC-RAG-EXAMPLES.md` Translate Step 13 [GAP]             | §7.1                                                    |
| `MAC-RAG-EXAMPLES.md` Edit Step 13 [GAP]                  | §7.2                                                    |
| `MAC-RAG-EXAMPLES.md` Proofread Step 10 [GAP]             | §7.3                                                    |
| `MAC-RAG-EXAMPLES.md` QA Step 11 [GAP]                    | §7.4                                                    |
| `MAC-RAG-EXAMPLES.md` Step 5b prompt-edit audit [GAP]     | §3.5 (`prompt_edits`) + §2.3 (`agent_prompts.active/version`) |
| `MAC-RAG-EXAMPLES.md` Step 5b prune-retrieval UI [GAP]    | §3.6 (`segment_suggestions.auto_accepted` is unrelated; prune-retrieval is a UI-only concern not addressed by this design) |
| `MAC-RAG-EXAMPLES.md` Translate Step 6 A.2.5 [GAP]        | §3.6 (`terminology.first_occurrence_per`) + application-side tracking of `terms_already_annotated_in_this_article` (still UI/state concern, partially addressed) |

`[GAP]` markers in walkthroughs that this design does **not** close are
left untouched by W10:

- The prune-retrieval-results UI is a Context Builder Panel concern, not
  a memory-DB concern. It belongs in a future UI-only design unit.
- The L4 cross-domain enrichment (Wikidata lookup) is mentioned in
  MAC-RAG.md §6 as a code gap; this design adds no schema for it.
- The `phase_4b_audit` observability table is mentioned in §7.5 as a
  forward reference and is not part of this design.
