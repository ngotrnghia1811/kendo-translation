# Detailed Development Plan — Kendo Translation Platform (2026)

**Document Status**: Active / Authoritative  
**Last Updated**: 2026-08-20  
**Target Environment**: Next.js 16 (App Router) + Self-Hosted PocketBase v0.39.10 (Oracle Cloud ARM Tokyo)  
**Production Domain**: `https://kendotranslation.com`

---

## 1. Executive Summary & Current System Baseline

The **Kendo Translation Platform** is a cooperation-first co-translation system designed for Japanese kendo literature (works by masters such as Baba Kinji, Ogawa Chutaro, and Kendojidai magazine volumes). It organizes human collaboration around translation, with AI agents as participating assistants rather than independent authors.

### 1.1 Production Infrastructure Baseline
- **Hosting Topology**: Next.js 16 frontend deployed on Vercel; self-hosted PocketBase v0.39.10 backend on Oracle Cloud Always-Free ARM (Tokyo region, 2 OCPU, 12GB RAM, $0/month budget).
- **Network & Security**: Cloudflare DNS & Proxy, Caddy reverse proxy with SSL, Resend SMTP for transactional auth emails.
- **Database & Data Scale**:
  - `articles`: 798 total articles (787 mapped to books, 11 husk container rows hidden from UI).
  - `segments`: 446,418 total bilingual/multilingual segments.
  - `books`: 40 total books (23 topic compilations, 16 year compilations 2010–2025, 1 `UNCATEGORIZED-BOOK`).
  - `glossary`: Dedicated collection (`pbc_4039856986`) containing 382 trilingual Japanese-English-Vietnamese-Korean kendo terminology entries.
  - Multilingual Segments: 42,274 live Korean (`ko`) and Vietnamese (`vi`) target segments in production.

### 1.2 Test Suite & Quality Baseline
- **Consolidated E2E Suite**: 4 unified spec files under `tests/`:
  - `tests/auth-profile-unified.spec.ts` (17 tests)
  - `tests/api-collaboration-unified.spec.ts` (16 tests)
  - `tests/api-workflow-unified.spec.ts` (27 tests)
  - `tests/features-pwa-unified.spec.ts` (34 tests)
- **TypeScript Health**: Baseline clean at 26 pre-existing test-level type errors (`npx tsc --noEmit`); zero application source code type errors.

---

## 2. Recently Completed Accomplishments (August 2026)

### Milestone 1: Slice 4 E2E Test Suite Consolidation [SHIPPED]
- Consolidated 19 fragmented Playwright spec files into 4 domain-unified spec files with 100% test-count preservation (94 total tests merged).
- Enforced strict standing Verification Discipline for the `playwright-test` agent.

### Milestone 2: Terminology Glossary Collection [SHIPPED]
- Created the dedicated `glossary` collection in PocketBase (`pbc_4039856986`).
- Built and executed `migration/pocketbase/scripts/import_glossary.js`, importing 382 structured kendo terminology entries from `kendo_dict.md`.

### Milestone 3: Reader DOM Timing & Test Stabilization [SHIPPED]
- Updated locators and navigation logic in `tests/reader-features.spec.ts` to align with `PageReader.tsx` book-hierarchy DOM attributes.

### Milestone 4: Security & Infrastructure Hardening [SHIPPED]
- Enforced `document_assignments` phase authorization in `/api/segments/[id]/advance-phase` so translators can only advance assigned phases.
- Scheduled lock cleanup cron `/api/segments/cleanup-locks` in Vercel to run every 15 minutes (`*/15 * * * *`).

### Milestone 5: Kendojidai Reader Language Bug Resolution [SHIPPED]
- **Part A (Hook Fix)**: Updated `migration/pocketbase/pb_hooks/article_bilingual_window.pb.js` with position-subquery fallback when `metadata.page` is missing. Deployed to production Oracle Cloud instance (`df1ade7`), verified live.
- **Part B (Backfill Script)**: Created `migration/pocketbase/scripts/import_kr_vn_kendojidai.js`, dry-run verified for 233,954 KO/VI segment rows across 92 Kendojidai child articles (`aa40488`).

### Milestone 6: Documentation Audit & Archival [SHIPPED]
- Archived completed feature plans (`BOOK_HIERARCHY_UI_PLAN.md`, `HUSK_ARTICLES_REVIEW.md`) to `docs/archive/`.
- Updated `docs/ARCHITECTURE.md`, `docs/README.md`, and `docs/active_users.md` to reflect current system state.

---

## 3. Actionable Future Development Roadmap (Phases 5 – 8)

```
┌────────────────────────────────────────────────────────────────────────┐
│                      DEVELOPMENT ROADMAP 2026                          │
├───────────────────┬───────────────────┬────────────────┬───────────────┤
│     PHASE 5       │      PHASE 6      │    PHASE 7     │    PHASE 8    │
│  Data Execution   │  Advanced Reader  │  AI & RAG Arch │ Scale & E2E   │
│ & Security Hard.  │ & Multi-Language  │ & Memory Sync  │ Operations    │
└───────────────────┴───────────────────┴────────────────┴───────────────┘
```

---

### Phase 5: Production Data Execution & Security Refinement

#### Step 5.1: Execute Kendojidai KO/VI Segment Backfill
- **Goal**: Run `migration/pocketbase/scripts/import_kr_vn_kendojidai.js --apply` to populate 233,954 KO/VI segment rows across 92 Kendojidai child articles.
- **Action**: Execute via terminal against production PocketBase (`https://155-248-165-196.nip.io`).
- **Verification**: Query `/api/collections/segments/records?filter=(target_lang='ko')` to verify live counts increase from 16,491 to ~133,468 per language.

#### Step 5.2: Refine Assignment Authorization Rules (`segments_update_phase_assigned` RLS MVP)
- **Goal**: Upgrade the stopgap phase-advancement check in `/api/segments/[id]/advance-phase` to cover direct segment text updates via `PATCH /api/segments/[id]`.
- **Action**: Ensure translators can only write segment text when assigned to the active phase or document.
- **Verification**: Run `tests/api-workflow-unified.spec.ts` to confirm 403 Forbidden responses for unassigned translators.

#### Step 5.3: Stale Lock & Session Cleanup Monitoring
- **Goal**: Monitor the 15-minute Vercel cron job `/api/segments/cleanup-locks` with `CRON_SECRET` headers.
- **Action**: Verify locked segments older than 30 minutes are automatically released.

---

### Phase 6: Advanced Reader & Multi-Language UI Enhancements

#### Step 6.1: `reader-features.spec.ts` Book-Hierarchy Navigation Fix
- **Goal**: Address the remaining 4 failing tests in `tests/reader-features.spec.ts` caused by `PageReader.tsx` DOM timing & book-hierarchy redirects.
- **Action**: Update `tests/reader-features.spec.ts` using `@vision` subagent screenshots or DOM traces to synchronize with `PageReader` rendering states.
- **Verification**: Achieve 4/4 passing tests in `reader-features.spec.ts`.

#### Step 6.2: Inline Kendo Terminology Glossary UI
- **Goal**: Render inline tooltips/popovers for kendo terms in `PageReader.tsx` and `EditorClient.tsx` using the 382 terms in the `glossary` collection (`pbc_4039856986`).
- **Action**:
  - Build a client-side terminology matcher or cache.
  - Highlight matched terms (e.g. *zanshin*, *kiai*, *seme*) with a subtle underline.
  - Display trilingual definitions (EN/JA/KO/VI/ZH) on hover/tap.
- **Verification**: Visual test pass and unit test in `tests/features-pwa-unified.spec.ts`.

#### Step 6.3: Paired-PDF & Multi-Language E2E Verification
- **Goal**: Test side-by-side original PDF page display (`paired_pdf_path`) alongside bilingual/trilingual segment view.
- **Action**: Add explicit test cases in `tests/features-pwa-unified.spec.ts` for PDF toggle and language switching (`en`, `zh`, `ko`, `vi`).

#### Step 6.4: Missing-Page KR/VN Backfill Pipeline
- **Goal**: Address the ~273 missing pages identified in `reconcile_manifest.json` (Kendojidai 2014–2017 & Baba Volume 2).
- **Action**: Create a backfill task when new translation source data becomes available.

---

### Phase 7: AI Translation Memory (MAC-RAG) & Model Architecture

#### Step 7.1: Translation Memory & RAG Archive Stub Integration
- **Goal**: Re-integrate the Memory-Augmented Translation (MAC-RAG) context engine (`docs/MAC-RAG.md`) with the PocketBase backend.
- **Action**:
  - Connect `/api/translate/mac-rag` to query PocketBase segments for vector/keyword similarity.
  - Update `lib/llm/provider.ts` and `lib/llm/agent-logger.ts` for structured logging of translation prompts.
- **Verification**: Unit tests for RAG prompt construction and fallback models.

#### Step 7.2: OpenRouter Model Fallback & Local Environment Synchronization
- **Goal**: Ensure reliable fallback across free/paid OpenRouter models (`nvidia/nemotron-3-super-120b-a12b:free`, `google/gemma-4-31b-it:free`).
- **Action**: Keep `lib/llm/provider.ts` default model fallbacks synchronized with local `.env` configuration.

#### Step 7.3: Multi-Language AI Prompt Engineering (KO/VI)
- **Goal**: Extend AI translation suggestion endpoints (`/api/agents/[phase]`) to generate Korean and Vietnamese suggestions in addition to English.
- **Action**: Add target language prompts for KO and VI in `lib/llm/prompts/`.

---

### Phase 8: System Scaling, E2E Test Suite & Operations

#### Step 8.1: Legacy Test File Cleanup
- **Goal**: Clean up the 19 original spec files under `tests/` that were retained during Slice 4 consolidation once unified specs are 100% verified in CI.
- **Action**: Remove original spec files, keeping `tests/*-unified.spec.ts`.

#### Step 8.2: Reader & Miller-Column Performance Optimization
- **Goal**: Maintain sub-500ms page navigation latency across 446k segments.
- **Action**:
  - Cache `/api/books` and `/api/article_pages` responses at Cloudflare/Vercel edge.
  - Implement Virtuoso list windowing optimizations for 3,000+ segment articles.

#### Step 8.3: Real User Onboarding & SMTP Password Reset Flow
- **Goal**: Transition from test accounts (`TempImport2026!`) to real community translators.
- **Action**:
  - Enable self-service registration or admin invitation flow.
  - Trigger password reset emails via Resend SMTP (`kendotranslation.com`).

---

## 4. Work Unit Execution Matrix

| Phase | Work Unit | Target Files / Scope | Est. Effort | Priority |
|---|---|---|---|---|
| **5.1** | Kendojidai KO/VI Import | `import_kr_vn_kendojidai.js --apply` | User Action | **P0 (Immediate)** |
| **5.2** | Segment Assignment Auth | `app/api/segments/[id]/route.ts` | 1 Day | **P1** |
| **6.1** | `reader-features` E2E Fix | `tests/reader-features.spec.ts` | 1 Day | **P1** |
| **6.2** | Terminology Glossary UI | `components/books/PageReader.tsx`, `components/shared/GlossaryTooltip.tsx` | 2 Days | **P1** |
| **6.3** | Paired-PDF / Multi-Lang E2E | `tests/features-pwa-unified.spec.ts` | 1 Day | **P2** |
| **7.1** | MAC-RAG Memory Integration | `/api/translate/mac-rag`, `lib/llm/provider.ts` | 3 Days | **P2** |
| **7.3** | KO/VI AI Agent Prompts | `lib/llm/prompts/` | 1 Day | **P2** |
| **8.1** | Legacy Test File Cleanup | `tests/*.spec.ts` | 0.5 Day | **P3** |
| **8.3** | User Onboarding & Auth | `app/login/page.tsx`, `app/api/auth/` | 2 Days | **P3** |
