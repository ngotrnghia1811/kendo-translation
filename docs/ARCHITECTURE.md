# Architecture

Audience: new contributors and future maintainers.

For the product vision and "why," see [VISION.md](./VISION.md). This document
covers the "how."

## 1. System overview

```
   ┌──────────────┐        ┌──────────────────────┐        ┌─────────────────┐
   │  Browser     │ HTTPS  │  Next.js 16          │  PG    │  Supabase       │
   │  (React 19)  │ ─────▶ │  (App Router,        │ ─────▶ │  - Postgres     │
   │              │        │   Turbopack)         │        │  - Auth         │
   │              │ WSS    │                      │ WSS    │  - Realtime     │
   │              │ ─────▶ │  /api/** + RSC pages │ ─────▶ │  - RLS policies │
   └──────────────┘        └──────────┬───────────┘        └─────────────────┘
                                      │ HTTPS
                                      ▼
                           ┌──────────────────────┐
                           │  OpenRouter          │
                           │  (LLM provider pool, │
                           │   free-tier models)  │
                           └──────────────────────┘
```

- **Frontend**: Next.js 16 (App Router) with React 19. Pages under `app/`,
  client components marked with `'use client'`. Tailwind for styling.
- **Backend**: Next.js route handlers under `app/api/**/route.ts`. Each
  resource owns one or more files. No separate server.
- **Database**: Supabase Postgres. Schema lives under `supabase/migrations/`
  (baseline `000_baseline_snapshot.sql` + workflow `004_phase_workflow.sql`).
- **Auth**: Supabase Auth (email/password). Session cookies via `@supabase/ssr`.
- **Realtime**: Supabase Realtime channels filtered per-segment. Used by the
  suggestion / comment / transition panels to refresh on mutation.
- **LLM**: OpenRouter, accessed via `lib/llm/provider.ts`. A pool of free-tier
  API keys is loaded from env and rotated randomly per call; a fallback chain
  of three model ids absorbs upstream 429s.

## 2. Data model

```
profiles ─────────────────┐
   id, username, role     │
                          │
articles                  │
   id, title, ...         │
       │                  │
       │ 1:N              │
       ▼                  │
   segments               │
       id, article_id     │
       position           │
       source_text        │
       target_text        │
       status ◀──── { draft, translated, edited, proofread, qa_approved }
       │                  │
       ├─ 1:N ─▶ segment_suggestions ──▶ suggester_id (FK profiles)
       │           proposed_text, status (pending/accepted/rejected/superseded)
       │           suggester_kind ∈ { human, agent }
       │
       ├─ 1:N ─▶ segment_comments ──▶ user_id (FK profiles)
       │           parent_comment_id (self-ref, tree)
       │           content, resolved, mentions[]
       │
       └─ 1:N ─▶ segment_phase_transitions ──▶ actor_id (FK profiles)
                   from_status, to_status, note, acknowledged_minor

document_assignments
   (user_id, document_id) UNIQUE
   allowed_phases  text[]  -- ⊂ { translate, edit, proofread, qa }
   assigned_by FK profiles

qa_issues   (schema present, UI unused as of this writing)
   segment_id, raised_by, kind, content, resolved, resolved_by, resolved_at
```

Key invariants:

- A segment's `status` is the single source of truth for its phase. Every
  transition is mirrored into `segment_phase_transitions` as an append-only
  audit trail.
- Suggestions are immutable proposals; accepting one **does not** modify
  `segments.target_text`. The acceptor must PATCH the segment separately. This
  preserves the soft-lock contract (see § 6).
- Per-document phase capability is the combination of role + a row in
  `document_assignments`. Admins bypass.

## 3. Authentication and authorization

### Auth

`@supabase/ssr` issues cookie-based sessions. The browser holds the session
cookie; route handlers call `await createClient()` from `lib/supabase/server.ts`
to get an RLS-aware client bound to that session.

### Authorization layers

There are three guard layers, applied in order:

1. **`auth.getUser()` in the route handler.** Anonymous → 401. Cheap, explicit.
2. **Role pre-check** for admin-only endpoints. Looks up `profiles.role`; non-
   admin → 403. This gives clean 403s before hitting any RLS surprises.
3. **Row-Level Security (RLS) in Postgres.** The authoritative guard. Every
   table has policies referencing helper functions:
   - `is_admin()` — true if the caller's profile has `role='admin'`.
   - `is_translator()` — true for `role IN ('admin','translator')`.
   - `is_assigned_to_phase(document_id, phase)` — true if the caller has a
     `document_assignments` row covering that phase, OR is an admin.

A 404 returned for a row that exists but is RLS-hidden is intentional: we
never leak existence.

### Service-role client

`createAdminClient()` in `lib/supabase/server.ts` returns a service-role client
that **bypasses RLS**. It is only safe to use *after* a role pre-check in the
route handler, and only when wider visibility is intentional (e.g.
`/api/admin/users` needs to see all profiles regardless of any future RLS
tightening on `profiles`). Treat it like a sharp knife.

## 4. API surface

All endpoints live under `app/api/`. The cooperation-relevant ones, organised
by resource:

### Documents
- `GET /api/documents` — list (RLS-filtered).
- `GET /api/documents/[id]` — single.
- `POST /api/documents/[id]/segmentize` — split source into segments.
- `GET /api/documents/[id]/segments` — list segments for a document.
- `GET /api/documents/[id]/segment-activity` — per-segment counts of pending
  suggestions, unresolved comments, and transitions in the last 24h.

### Document assignments (admin)
- `GET /api/documents/[id]/assignments`
- `POST /api/documents/[id]/assignments` (upsert)
- `PATCH /api/documents/[id]/assignments/[userId]`
- `DELETE /api/documents/[id]/assignments/[userId]`
- `GET /api/admin/users/[userId]/assignments` (per-user view)

### Segments
- `GET /api/segments?status=&has_target_text=&limit=` — cross-document
  discovery filter.
- `GET /api/segments/[id]` / `PATCH /api/segments/[id]` — the latter holds the
  soft-lock contract and is the *only* way to change `target_text`.
- `POST /api/segments/[id]/lock` / `DELETE /api/segments/[id]/lock` — opt-in
  collaborative-edit hint, not a hard mutex.
- `POST /api/segments/[id]/advance-phase` — optimistic-concurrency phase
  transition (see § 5).
- `GET /api/segments/[id]/transitions` — append-only audit feed.
- `GET|POST /api/segments/[id]/suggestions` and
  `PATCH /api/segments/[id]/suggestions/[suggestionId]` —
  human or agent proposals.
- `GET|POST /api/segments/[id]/comments` and
  `PATCH /api/segments/[id]/comments/[commentId]` —
  threaded discussion (single-table adjacency list, `parent_comment_id`).

### Agents
- `POST /api/agents/translate`
- `POST /api/agents/edit`
- `POST /api/agents/proofread`

Each writes a row to `segment_suggestions` with `suggester_kind='agent'`,
`suggester_id=auth.uid()`, `status='pending'`. Output is the LLM's revised
English only; per-phase system prompts in `lib/agents/phase-prompts.ts`
preserve kendo romanizations.

### Admin / misc
- `GET /api/admin/users` — admin-only profile listing.
- `GET /api/profiles?search=&limit=` — admin-only profile search (drives
  the assignment user-picker).
- `GET /api/auth/me` / `POST /api/auth/login` / `POST /api/auth/logout`
- `GET /api/terminology` — kendo glossary read.
- `POST /api/translate/mac-rag` — legacy MAC-RAG pipeline (kept for the
  AI-translate button on the edit page; not the model for new agent work).

## 5. The phase state machine

Legal forward edges, single source of truth:

```
draft ──▶ translated ──▶ edited ──▶ proofread ──▶ qa_approved
```

`qa_approved` is terminal in the UI. Reverts ("send back") are schema-
permitted (the transition table records `from_status` and `to_status`
freely) but not yet wired into the UI.

### Optimistic concurrency

`POST /api/segments/[id]/advance-phase` accepts:

```json
{
  "to_status": "translated",
  "expected_current_status": "draft",
  "note": "optional",
  "acknowledged_minor": false
}
```

The implementation runs **one guarded UPDATE**:

```sql
UPDATE segments
SET status = :to_status
WHERE id = :id AND status = :expected_current_status
```

If zero rows match, the request returns 409 with the actual `current_status`
in the body so the client can reconcile. If one row matches, an audit row is
inserted into `segment_phase_transitions`. PostgREST does not support
multi-statement transactions, so the audit insert can in principle fail after
the status flip commits; in that case the route returns 500 and the audit row
is reconciled on the next mutation. The frequency is low and the cost is
acceptable.

Non-draft targets additionally require non-empty `target_text` (422 if not).

## 6. The soft-lock contract

Editing a segment's `target_text` is a single-writer operation. The platform
does not use CRDTs; it uses an opt-in soft lock:

1. A client `POST`s `/api/segments/[id]/lock` when entering edit mode.
2. The presence indicator surfaces "X is editing this" to peers.
3. `DELETE /api/segments/[id]/lock` releases on blur / segment switch.
4. The lock is a hint, not a mutex. The server does not refuse PATCH from a
   non-holder. The presence channel and good UI discipline are what prevent
   conflicts.
5. `/api/segments/cleanup-locks` reaps stale rows.

A cron / Edge Function reaping stale locks is on the roadmap; for now manual
cleanup on the periodic admin pass suffices.

## 7. LLM provider abstraction

`lib/llm/provider.ts` exposes:

- `getProvider(name?)` — returns an `OpenAIProvider` or `OpenRouterProvider`.
- `selectProviderForTask(task)` — heuristic chooser.
- `agentChat(agentType, messages, options)` — model resolution from
  `*_AGENT_MODEL` env vars by agent type.
- `agentChatWithFallback(agentType, messages, options)` — walks
  `DEFAULT_OPENROUTER_MODEL → BACKUP_OPENROUTER_MODEL →
   CHEAP_OPENROUTER_MODEL`, advancing on errors that match
  `/429|rate.?limit|Provider returned error|temporarily/i`. Throws on the
  last failure. This is what the agent endpoints use.

The `OpenRouterProvider` pools keys via `collectKeys()`:

1. `OPENROUTER_API_KEY` if it's not a placeholder (prefix `sk-or-v1-REPLACE`
   is filtered out).
2. `OPENROUTER_API_KEY_<digits>` sorted and deduped.

A random key is picked per call (`pickKey()`). The structure permits swapping
to quota-aware selection later without touching `chat()`.

`'No OpenRouter API key configured'` propagates as a 503 from agent
endpoints; live tests check for it and `test.skip()` to keep the suite green
in dev environments with no key.

## 8. Frontend layout

### Pages (`app/`)

```
app/
├── page.tsx                              -- landing / redirect
├── login/page.tsx
├── profile/page.tsx
├── terminology/page.tsx
├── documents/page.tsx                    -- document list
├── documents/[id]/page.tsx               -- document overview
├── documents/[id]/edit/page.tsx          -- THE editor (integration hub)
├── documents/[id]/read/page.tsx          -- reader view (multiple modes)
├── admin/page.tsx                        -- admin dashboard
├── admin/documents/[id]/assignments/page.tsx
└── admin/users/[userId]/assignments/page.tsx
```

`app/documents/[id]/edit/page.tsx` is the integration hub. It wires:

- Segment list (left pane) with `PhaseBadge` + segment-activity pills.
- Editor panel (right pane) with the source / textarea / save / AI-translate /
  approve / details-toggle.
- The "details drawer" containing `PhaseAdvanceButton`,
  `PhaseTransitionHistory`, `SuggestionPanel`, `AgentSuggestionPanel`,
  `CommentThread`.

### Components

```
components/
├── shared/
│   ├── PhaseBadge.tsx                    -- status pill (also exposes data-status)
│   ├── DocumentCard.tsx
│   ├── LanguageSelector.tsx
│   ├── RoleBasedNavigation.tsx
│   ├── AuthHeader.tsx
│   └── ThemeProvider.tsx
├── editor/
│   ├── PhaseAdvanceButton.tsx            -- inline-confirm + 409 handling
│   ├── PhaseTransitionHistory.tsx        -- read-only history feed
│   ├── SuggestionPanel.tsx               -- list/accept/reject/supersede
│   ├── AgentSuggestionPanel.tsx          -- single button → POST /api/agents/[phase]
│   ├── CommentThread.tsx                 -- recursive tree renderer
│   ├── CommentComposer.tsx               -- @<uuid> mention parsing
│   ├── PresenceIndicator.tsx             -- soft-lock companion
│   ├── ProgressBar.tsx
│   ├── SegmentEditor.tsx, SegmentRow.tsx, SegmentToolbar.tsx,
│   └── TranslationEditor.tsx             -- (legacy / mostly dead code path)
├── admin/
│   └── AssignmentTable.tsx               -- per-doc grant management + user picker
└── reader/
    ├── ReaderView.tsx, BilingualParagraphView.tsx,
    └── SingleLanguageView.tsx, TranslatorAlignedView.tsx
```

### Hooks (`lib/hooks/`)

- `useSuggestions(segmentId)` — list + accept/reject/supersede + realtime sub.
- `useCommentsThread(segmentId)` — list + threaded post + realtime sub.
- `useDocumentAssignment(documentId)` — list + upsert + patch + delete.
- `useMacRag()` — legacy translation pipeline.

Each realtime-bearing hook subscribes to a channel like
`seg-suggestions:<id>` filtered on `segment_id=eq.<id>`, and calls the panel's
`refresh()` on any event. Channels are torn down on segmentId change or
unmount via `supabase.removeChannel()`.

## 9. Key design decisions

These are the choices that shape day-to-day work; revisit them only with care.

- **Soft lock, not CRDT.** The cooperation surface (suggestions + comments +
  phase transitions) is where multi-user coordination lives. Inline textarea
  editing remains single-writer. See § 6.
- **Suggestions never auto-apply.** `PATCH /api/segments/[id]/suggestions/[sid]`
  with `{status:'accepted'}` only stamps the suggestion. The acceptor's
  client must then PATCH the segment. Two-step on purpose: the soft lock
  still gates writes.
- **Optimistic concurrency on phase advances.** Atomic UPDATE with a guarded
  WHERE clause, 409 echoes the actual `current_status`. No locks, no
  long-running transactions. See § 5.
- **404 over 403 for RLS-hidden rows.** Existence is never leaked. Even
  malformed UUIDs return 404 from the read endpoints.
- **PostgREST has no multi-statement transactions.** Mutations that span
  tables use guarded-UPDATE-then-INSERT (audit). Acceptable in this domain;
  worth knowing.
- **PostgREST nested-relation joins return object or array** depending on
  cardinality. Components handle both via
  `Array.isArray(val) ? val[0] : val`.
- **All admin endpoints layer role pre-check on top of RLS.** Gives clean
  403s and means RLS tightening later won't break clients.
- **Agent endpoints reuse `agentChatWithFallback`** with a three-model chain.
  Free-tier rate limits are the rule, not the exception.
- **Lean global roles, per-document assignments.** Capabilities expand by
  data, not by role inflation.
- **`articles` table, "Document" UX.** Schema name predates the UX rename;
  not worth a migration. Treat as a translation in the head.

## 10. Conventions

### API routes
- `await createClient()` per request.
- `(await supabase.auth.getUser()).data.user` for the caller; null → 401.
- Admin pre-check via `requireAdmin()` idiom (copy-paste, not yet a helper
  module — refactor candidate).
- UUID validation via the regex
  `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`.
- Status codes: 400 shape/value errors, 401 unauth, 403 forbidden,
  404 missing or RLS-hidden, 409 stale state, 422 unprocessable,
  500 server, 502 upstream LLM, 503 LLM-not-configured.

### Tests
- Live integration against the real Supabase + Next.js dev server.
- `tests/helpers/camoufox-fixture.ts` provides the page fixture (Camoufox
  falls back to Firefox).
- Cached auth state in `tests/.auth/<role>.json`. The global-setup login
  flow is intermittently flaky; cached state generally survives.
- `apiCall<T>(page, path, init)` helper via `page.evaluate(fetch...)` so
  cookies attach. Anchor with `page.goto(\`${BASE}/\`)`; never `/documents`
  (the document list is large enough that screenshots exceed Playwright's
  max image height).
- Test-data residue is accepted; specs self-clean where feasible (DELETE in
  `finally`) but no global teardown.
- `data-testid` attributes on every interactive element. New testids ship
  with new components.

### Commits
- Imperative subject: `<type>(<scope>): <subject>`.
- Multi-paragraph body. Last paragraph notes the test-count delta.
- Real wall-clock timestamps (no `--date` overrides).
- Push to origin only on explicit authorization.

## 11. Environment

```
.env.local          (gitignored)
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_ACCESS_TOKEN     -- Supabase Management API PAT
  OPENROUTER_API_KEY        -- optional; placeholder is filtered

.env                (gitignored)
  OPENROUTER_API_KEY_1..N   -- rotation pool
  DEFAULT_OPENROUTER_MODEL
  BACKUP_OPENROUTER_MODEL
  CHEAP_OPENROUTER_MODEL
  *_AGENT_MODEL             -- per-AgentType overrides (optional)
```

Dev server: `nohup npx next dev --turbopack > /tmp/next-dev.log 2>&1 &`,
PID written to `/tmp/next-dev.pid`.

Database migrations are applied via the Supabase Management API (PAT-based)
using scripts under `scripts/dashboard-recon/`; the canonical applier is
`apply-migration.ts`.

## 12. Known gaps / debt

- `app/documents/[id]/read/page.tsx` and `components/reader/*` were not
  touched in the cooperation-first reframe and may not reflect the new data
  model in every place.
- `components/editor/{SegmentRow,TranslationEditor}.tsx` are unreferenced
  legacy paths; left in place pending a cleanup pass.
- `qa_issues` table exists; no API, no UI yet. QA workflow currently
  collapses into the `qa_approved` status with no issue-tracking surface.
- `requireAdmin()` is copy-pasted across four route files; should become
  a shared helper.
- Cross-user activity badges refresh on next mutation by the local user; a
  document-wide realtime channel is the natural next step.
- Mention picker is a UUID-paste stub; a real `@`-autocomplete is pending.
- Lock cleanup is manual; a scheduled job would be ideal.
- LLM rate-limiting depends on free-tier OpenRouter; sustained multi-user
  load requires a paid plan or self-hosted model.

These are intentional debts, sized so they can be paid down one at a time
without invalidating the architecture above.
