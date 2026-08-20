# Architecture

Audience: new contributors and future maintainers.

For the product vision and "why," see [VISION.md](./VISION.md). For the complete development arc from Day 1 to 2026 future roadmap, see [OVERALL_ROADMAP_2026.md](./OVERALL_ROADMAP_2026.md). This document covers the technical "how" for the current PocketBase-era codebase.

## 1. System overview

```
   ┌──────────────┐        ┌──────────────────────┐        ┌─────────────────┐
   │  Browser     │ HTTPS  │  Next.js 16          │  REST  │  PocketBase     │
   │  (React 19)  │ ─────▶ │  (App Router,        │ ─────▶ │  v0.39.10       │
   │              │        │   Turbopack)         │  SDK   │  - SQLite DB    │
   │              │ WSS    │                      │        │  - Auth & Admin │
   │              │ ─────▶ │  /api/** + RSC pages │ ─────▶ │  - JS Hooks     │
   └──────────────┘        └──────────┬───────────┘        └─────────────────┘
                                      │ HTTPS
                                      ▼
                           ┌──────────────────────┐
                           │  OpenRouter          │
                           │  (LLM provider pool, │
                           │   free-tier models)  │
                           └──────────────────────┘
```

- **Frontend**: Next.js 16 (App Router) with React 19. Pages under `app/`, client components marked with `'use client'`. Tailwind CSS for styling.
- **Backend**: Next.js route handlers under `app/api/**/route.ts` and PocketBase server actions. Self-hosted PocketBase v0.39.10 on Oracle Cloud ARM (Tokyo region, $0/month budget).
- **Database**: Self-hosted PocketBase (SQLite underlying). Schema defined via JS migrations under `migration/pocketbase/pb_migrations/`.
- **Auth**: PocketBase Auth (`users` collection). Server-side auth via `lib/pocketbase/server.ts` using `pb_auth` cookies. Roles: `admin`, `translator`, `reader`.
- **LLM**: OpenRouter, accessed via `lib/llm/provider.ts`. Key rotation and fallback chains (`nvidia/nemotron-3-super-120b-a12b:free`, etc.) protect against rate limits.

## 2. Data model & PocketBase collections

```
users (profiles) ─────────┐
   id, email, role        │
   (admin, translator,    │
    reader)               │
                          │
books ────────────────────┼───────────────────────────┐
   id, title, title_ja,   │                           │
   author, book_type      │ 1:N                       │
        │                 │                           │
        │ 1:N             │                           │
        ▼                 ▼                           │
articles                  │                           │
   id, title, title_ja,   │                           │
   book (FK books),       │                           │
   segment_count, ...     │                           │
        │                 │                           │
        │ 1:N             │                           │
        ▼                 │                           │
segments                  │                           │
   id, article (FK),      │                           │
   position, source_text, │                           │
   target_text,           │                           │
   source_lang (ja),      │                           │
   target_lang (en/zh/ko/vi),                         │
   status ◀──── { draft, translated, edited, proofread, qa_approved }
        │                                             │
        ├─ 1:N ─▶ segment_suggestions ──▶ suggester_id│
        │           proposed_text, status             │
        │           suggester_kind ∈ { human, agent }│
        │                                             │
        ├─ 1:N ─▶ segment_comments ──▶ user (FK)      │
        │           parent_comment_id (self-ref tree) │
        │           content, resolved, mentions[]     │
        │                                             │
        └─ 1:N ─▶ segment_phase_transitions           │
                    from_status, to_status, note      │
                                                      │
document_assignments                                  │
   user (FK users), article (FK articles)             │
   allowed_phases text[]                              │
                                                      │
glossary (terminology) ───────────────────────────────┘
   id, category, term_ja, reading, notes_ja,
   term_en, notes_en, term_ko, notes_ko,
   term_vi, notes_vi, term_zh, notes_zh
```

Key invariants:

- PocketBase relation fields use bare names (`article`, `book`, `user`), **not** `_id` suffixes.
- `segments.target_lang` supports `en`, `zh`, `ko`, `vi`. All non-EN target segments mirror the position space of the primary EN segments.
- `article_bilingual_window.pb.js` hook uses a position-IN subquery (`SELECT s2.position FROM segments s2 WHERE s2.article = ... AND s2.target_lang = 'en' AND metadata.page = ...`) to correctly resolve non-EN segments even when `metadata.page` is missing on non-EN records.
- `glossary` collection stores 382 multi-lingual kendo terminology terms across Japanese, English, Korean, Vietnamese, and Chinese.

## 3. Authentication and authorization

### Auth
PocketBase cookie-based auth via `lib/pocketbase/server.ts`. Route handlers create a PocketBase client with the request's `pb_auth` cookie.

### Authorization layers
1. **`pb.authStore.isValid`** check in API route handlers (401 if unauthenticated).
2. **Role check**: admin-only endpoints verify `user.role === 'admin'`; translator/admin endpoints verify `role === 'translator' || role === 'admin'`.
3. **Phase-level assignment check**: `app/api/segments/[id]/advance-phase/route.ts` enforces `document_assignments` permissions per phase (translate, edit, proofread, qa) for translator role users, while admins bypass.

## 4. API surface & Route structure

### Browse & Reader routes
- `/books` — Miller-column book & article browser (`components/books/BookBrowsePanels.tsx`).
- `/books/[bookId]/[articleId]/[page]` — Main multi-language page reader (`components/books/PageReader.tsx`).
- `/books/[bookId]/[articleId]/edit` — Editor workflow routed through the book hierarchy (`components/editor/EditorClient.tsx`).

### Core API endpoints
- `/api/books` & `/api/books/[bookId]/[articleId]/[page]` — Book & article page segment feeds.
- `/api/custom/article-bilingual-window` — Optimized bilingual/multilingual window fetcher via PocketBase JS hook.
- `/api/segments/[id]` — Segment content update (requires translator/admin role).
- `/api/segments/[id]/advance-phase` — Optimistic-concurrency phase transition with assignment check.
- `/api/segments/[id]/lock` — Soft-lock management for concurrent editing.
- `/api/segments/cleanup-locks` — Cron job endpoint (requires `CRON_SECRET` bearer token) running every 15 minutes.
- `/api/admin/users` & `/api/admin/assignments` — Admin user and assignment management.

## 5. Test suite & Quality gates

- **Playwright E2E Suite**: 48 spec files under `tests/*.spec.ts`. Consolidated into domain-unified suites (`auth-profile-unified.spec.ts`, `api-collaboration-unified.spec.ts`, `api-workflow-unified.spec.ts`, `features-pwa-unified.spec.ts`, etc.).
- **Subagent Discipline**: `@playwright-test` agent operates under strict verification rules (disk-verifying artifacts, `grep` test-count self-audits, zero baseline TypeScript drift).
- **TSC Baseline**: Maintained at exactly 26 errors (all pre-existing type errors in spec files, zero errors in app code).

## 6. Environment & Deployment

- **Production**: Vercel deployment connected to `origin/main` at [kendotranslation.com](https://kendotranslation.com).
- **PocketBase Server**: Self-hosted on Oracle Cloud ARM (Tokyo region), Caddy reverse proxy with SSL, Resend SMTP for transactional email.
