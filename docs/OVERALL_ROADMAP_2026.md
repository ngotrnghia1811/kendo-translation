# Overall Development Roadmap — Kendo Translation Platform (2026)

This document provides the living single source of truth for the kendo-translation platform's development journey, tracing work from Day 1 through present accomplishments and future architectural horizons.

---

## 🗺️ Completed Milestones & Historical Evolution

### Phase 1: Product Origin & Supabase Co-Translation Era (May – June 2026) [SHIPPED & EVOLVED]
- **Product Vision (`docs/VISION.md`)**: Established a cooperation-first co-translation platform for Japanese kendo literature (works by masters such as Baba Kinji, Ogawa Chutaro, and Kendojidai).
- **Workflow & Roles**: Built segment-level 4-phase translation workflow (`draft` → `translated` → `edited` → `proofread` → `qa_approved`). Defined global roles (`Admin`, `Translator`, `Reader`) and per-document capability grants (`document_assignments`).
- **Cooperation Primitives**: Human & agent suggestions (`segment_suggestions`), threaded segment comments (`segment_comments`), and append-only phase transition audit feeds (`segment_phase_transitions`).
- **Initial Architecture**: Next.js 16 (App Router, Turbopack) + Supabase Postgres backend (RLS policies, `@supabase/ssr`, Realtime channels).
- **MAC-RAG Pipeline**: 5-phase RAG context engine supporting AI-assisted translation suggestions (`/api/translate/mac-rag`).

### Phase 2: Database Migration to Self-Hosted PocketBase (July – Early August 2026) [SHIPPED]
- **Migration Trigger**: Supabase free-tier database quota exceeded (798 articles, 446k segments).
- **Migration Execution**:
  - Migrated 798 articles, 446,418 segments, 40 books, users, and terminology to PocketBase v0.39.10 hosted on Oracle Cloud ARM Tokyo ($0/month hard budget).
  - Auth Cutover: Replaced `@supabase/ssr` with native PocketBase auth & SSR cookie client (`lib/pocketbase/server.ts`).
  - Production Cutover: `kendotranslation.com` live with Cloudflare DNS, Resend SMTP, Caddy HTTPS, Vercel deployments.

### Phase 3: Book Hierarchy & Browsing Redesign (August 2026) [SHIPPED]
- **3-Level Browse Hierarchy (`/books`)**: Replaced flat `/documents` browse with a uniform 3-level Miller-column hierarchy (`/books` → `/books/[bookId]` → `/books/[bookId]/[articleId]` → `/books/[bookId]/[articleId]/[page]`).
- **Hybrid Pagination**: Real source-scan page numbers (`metadata.page`) for Kendojidai & scanned books; 25-segment synthetic chunks for web articles.
- **Editor Workflow Cutover**: Re-routed `/documents/[id]/edit` through `/books/[bookId]/[articleId]/edit` with segment aggregation endpoints & collapsible sidebar.
- **Husk Article Handling**: 11 parent container rows hidden cleanly across all user views (`docs/HUSK_ARTICLES_REVIEW.md`).

### Phase 4: Multi-Language Integration (KR/VN) & Test Consolidation (Mid-August 2026) [SHIPPED]
- **Korean & Vietnamese (KR/VN) Integration**:
  - Phase 0 Reconciliation: Created `UNCATEGORIZED-BOOK` (id `ekdwoyn86cyx2pn`, 92 articles) and resolved alignment logic.
  - Phase 1 Bulk Data Import: 42,274 KO+VI segment rows imported to production PocketBase (commits `d6fa925` & `a8b689d`).
  - Phase 2 Reader UI Enablement: Updated `LanguageSelector.tsx`, `PageReader.tsx`, `ReaderView.tsx`, `useReaderView.ts` for native KO/VI switching (`commit 4b5a1fd`).
- **KR/VN Glossary & Terminology Collection**: Created dedicated `glossary` PocketBase collection (`pbc_4039856986`) and imported 382 trilingual terms from `kendo_dict.md` (commit `3194431`).
- **Playwright Test Suite Consolidation (29 Specs → Unified Suites)**:
  - Enforced strict 0% coverage loss rule with `grep -c "^\s*test("` self-audits.
  - **Slice 1 (Editor)**: `tests/editor-real-data.spec.ts` & `tests/editor.spec.ts` unified.
  - **Slice 2 (Reader)**: `tests/reader-lcp.spec.ts` merged (8/8 exact match).
  - **Slice 3 (Admin)**: `tests/admin-unified.spec.ts` merged (12/12 exact match, commit `4757329`).
  - **Slice 4A (Auth & Profile)**: `tests/auth-profile-unified.spec.ts` merged (17/17 exact match, commit `003d3fd`).
  - **Slice 4B (Segment Collaboration API)**: `tests/api-collaboration-unified.spec.ts` merged (16/16 exact match, commit `d308a70`).
  - **Slice 4C (Workflow API Specs)**: `tests/api-workflow-unified.spec.ts` merged (27/27 exact match, commit `0b65b78`).
  - **Slice 4D (PWA & Feature Specs)**: `tests/features-pwa-unified.spec.ts` merged (34/34 exact match, commit `c3dd7bc`).

### Phase 5: Security & Infrastructure Hardening (August 2026) [SHIPPED]
- **Per-Document Phase Capability Enforcement**: Enforced `document_assignments` allowed-phase check for non-admin translators in `/api/segments/[id]/advance-phase` (commit `3027780`).
- **Automated Soft-Lock Cleanup**: Configured Vercel cron to execute `/api/segments/cleanup-locks` every 15 minutes (`*/15 * * * *`) with `CRON_SECRET` authorization (commit `3027780`).
- **Reader DOM Timing & Test Stabilization**: Updated `tests/reader-features.spec.ts` locators to match the book-hierarchy `PageReader.tsx` DOM (commit `7e3a0e0`).

---

## 🚀 Future Roadmap & Architectural Horizon

1. **MAC-RAG & TM Pipeline Expansion (KR/VN)**
   - Wire Korean & Vietnamese into translation memory search (`tm-search`) and LLM prompt templates (`phase-prompts`, `compose`).
2. **Realtime Multi-User Collaboration**
   - Expand PocketBase SSE (Server-Sent Events) channels to provide live document-wide activity badges and presence indicators across active translation sessions.
3. **Automated QA Issue Tracking UI**
   - Build front-end UI components and API handlers for the `qa_issues` table to enable formal issue raising, review, and resolution during the QA phase.
4. **Offline PWA Sync & Storage Optimization**
   - Expand IndexedDB offline caching in `lib/pwa/storage.ts` for full offline reading of multi-page books with background synchronization.
