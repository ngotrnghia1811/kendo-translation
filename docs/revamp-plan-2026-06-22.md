# Kendo Translation — Comprehensive Revamp Plan

**Date:** 2026-06-22  
**Status:** Proposal (awaiting review before any implementation)  
**Rev 2 (2026-06-22):** Corrected data-layer SQL to actual single-table `segments` schema; verified Next.js caching APIs against installed version (16.2.4 — `updateTag` and `cacheComponents` are valid); removed duplicate index proposal; fixed minor task-level issues.  
**Rev 3 (2026-06-24):** Phase 4 hardening — aki-judge verdict I-4.1: `cacheComponents:true` (PPR) found **incompatible** with the app's pervasive `cookies()` (Supabase SSR `createClient`) usage and per-route `dynamic='force-dynamic'`/`revalidate=0` segment configs (global enablement caused prerender rejections). The accepted approach is **`unstable_cache`** (stable Data Cache) scoped to the reader page, with `revalidateTag(tag,'max')` on write paths. PPR is recorded as a deferred future option (isolate auth-gated routes into a separate layout group). Per-article cache tags (`article-${id}`) and `revalidatePath()` for CDN/edge added to the 5 write paths. `updateTag` removed from plan prescriptions — it is Server-Action-only; Route Handlers use the 2-arg `revalidateTag`.  
**Stack:** Next.js 16 (App Router, RSC), React 19, Tailwind CSS 4, Supabase SSR, Vercel  
**Scale:** ~993 articles, ~134,000 bilingual JP↔EN segments  
**Inputs:** aki-inspector audit (24 findings), aki-research report (3-domain best-practices + comparable products)

---

## 1. Executive Summary

The kendo-translation platform has a strong product core — a 7-theme token system, keyboard shortcuts, playbook-driven reading flows, and a solid Supabase SSR foundation. However, the audit reveals systemic fragility: the reader loads **all** segments client-side (~15MB for a 29k-seg book), search does full-table `.ilike()` scans on 134k rows, theming is split between `--rt-*` tokens and hardcoded Tailwind values, and mobile is a second-class citizen (editor blocked <768px, unreadable columns, no PWA). These issues compound as the article corpus grows.

### Goals

1. **Performance** — LCP <2.0s, INP <150ms, CLS near 0 on article pages. Eliminate all N+1 queries and full-table scans on hot paths.
2. **Visual/UX consistency** — Single unified design-token system (Tailwind 4 `@theme` + semantic tokens) with dark mode everywhere, not just the reader.
3. **Mobile-native experience** — Responsive bilingual layout that works on phones (stacked + toggle, not broken columns). Editor at least usable on tablet. PWA for offline reading.
4. **Scalability** — Keyset pagination on all public feeds, postgres-level search indexing, and PPR caching so the platform stays fast at 10k+ articles.
5. **Maintainability** — Remove dead code, fix `ignoreBuildErrors`, establish clean data-layer patterns that prevent future N+1 accumulation.

### Foundation-first principle

**Phase 0** ships quick wins (housekeeping + low-effort fixes). **Phase 1** builds the foundation: a unified design-token system and a clean Supabase data layer (RPC functions, indexes, keyset pagination). Everything else — virtualization, bilingual UX overhaul, mobile experience, caching, PWA — depends on Phase 1 and strictly follows it. This sequencing prevents the "change everything at once and break the build" anti-pattern.

### Expected outcomes

| Metric | Current (estimated) | Target |
|--------|---------------------|--------|
| Article page LCP | 4–8s (cold, large book) | <2.0s |
| Article page INP | 200–400ms (DOM from 15MB payload) | <150ms |
| Search latency (134k rows) | 800–3000ms (full scan) | <200ms (GIN index) |
| Documents list load | 1.2s (900 rows, `*`) | <300ms (keyset + column select) |
| JS bundle (reader) | ~300KB (TipTap in bundle) | <150KB gzipped |
| Mobile reader usability | Broken (columns-2, no toggle) | Thumb-zone controls, stacked+toggle |
| Dark mode coverage | Reader-only | App-wide via `[data-theme="dark"]` |

---

## 2. Phased Roadmap

### Phase 0 — Quick Wins & Housekeeping

**Goal:** Ship 10 low-risk, high-visibility fixes in a single sprint. Each task is <1 hour, independently testable, and safe to deploy immediately — no foundation dependency.

**Dependencies:** None. Can run in parallel with Phase 1 planning.

| # | Task | Audit Ref | Affected Files | Effort | Acceptance Criteria |
|---|------|-----------|----------------|--------|---------------------|
| 0.1 | **Remove TipTap dependencies** | P5 | `package.json:19-22` | S (15m) | `npm ls @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder` returns empty; `npm run build` passes; bundle analyzer shows ~240KB reduction |
| 0.2 | **Flip `ignoreBuildErrors` → false, fix surfacing TS errors** | P10 | `next.config.ts:5` | S (30m) | `npm run build` passes with `ignoreBuildErrors: false`; no new `// @ts-expect-error` without documented reason |
| 0.3 | **Add CJK font fallback to body** | D5 | `app/globals.css:15-18` | S (10m) | `body { font-family: ... }` includes `"Hiragino Sans", "Yu Gothic UI", "Noto Sans CJK JP", sans-serif` for JP text; `:lang(ja)` block added |
| 0.4 | **Wrap layout children in `<main>` landmark** | D3 | `app/layout.tsx:16-17` | S (5m) | `<main>{children}</main>`; axe-core landmark audit passes |
| 0.5 | **~~Add `<main>` landmark to reader empty-state~~** | D3 | — | — | **ALREADY SATISFIED.** Verified 2026-06-22: `app/documents/[id]/read/page.tsx:88` already has `<main className="max-w-4xl mx-auto px-6 py-10">` in the empty-state block. No implementation needed. **(Removed — 0 hours.)** |
| 0.6 | **Trim documents `select('*')` to column list** | P3 | `app/documents/page.tsx:11-13`, `app/api/documents/route.ts:17-19` | S (20m) | Queries select only `id, title, created_at, segmented, segment_count` instead of `*`; verify no missing field in UI |
| 0.7 | **Add per-document `generateMetadata`** | D4 | `app/documents/[id]/read/page.tsx` | S (20m) | Each article page has unique `<title>` and `<meta name="description">`; Open Graph tags populated |
| 0.8 | **Delete dead `AuthHeader.tsx` and `RoleBasedNavigation.tsx`** | D7 | `components/shared/AuthHeader.tsx`, `components/shared/RoleBasedNavigation.tsx` | S (10m) | Files removed; grep confirms zero imports anywhere in codebase |
| 0.9 | **Replace reader hardcoded dark borders with `--rt-*` tokens** | D8 | `components/reader/BilingualParagraphView.tsx:76,84,90,102` | S (15m) | `dark:border-red-600`, `dark:border-blue-600`, `dark:border-gray-600/700` replaced with `var(--rt-border)` or semantic equivalents; visual parity |
| 0.10 | **Add explicit viewport meta** | M2 | `app/layout.tsx` | S (5m) | `<meta name="viewport" content="width=device-width, initial-scale=1">` present in `<head>`; Playwright mobile tests confirm no horizontal overflow at 320px |

**Total Phase 0 effort:** ~2.4 hours (9 tasks, task 0.5 removed — already satisfied).

---

### Phase 1 — Foundation: Design Tokens + Data Layer

**Goal:** Establish the two bedrock systems that all subsequent feature phases depend on. No feature work begins until Phase 1 is complete and verified.

**Dependencies:** Phase 0 (trivial; can overlap but finish Phase 0 first to reduce noise).

#### 1.1 Unified Design-Token System (D1, D9)

**Effort:** L (1.5 days)  
**Audit refs:** D1 (inconsistent theming), D9 (no dark mode outside reader), D8 (hardcoded dark borders)  
**Research refs:** §2a (Tailwind 4 `@theme` + semantic tokens), §2b.4 (token system technique)

**Tasks:**

| # | Task | Files | Effort | Depends On |
|---|------|-------|--------|------------|
| 1.1a | Define raw palette tokens in `@theme {}` | `app/globals.css` | M (1h) | None |
| 1.1b | Define semantic tokens on `:root` and `[data-theme="dark"]` | `app/globals.css` | M (2h) | 1.1a |
| 1.1c | Migrate reader `--rt-*` tokens to reference semantic tokens (keep `--rt-*` aliases for backward compat) | `app/globals.css`, reader components | M (2h) | 1.1b |
| 1.1d | Replace hardcoded colors in login/search/editor/admin/profile with semantic tokens | `app/login/**`, `app/search/**`, `app/documents/[id]/edit/**`, `app/admin/**`, `app/profile/**`, `components/shared/**` | L (4h) | 1.1b |
| 1.1e | Wire `[data-theme="dark"]` to user preference + system detection | `components/shared/ThemeProvider.tsx`, `app/layout.tsx` | M (2h) | 1.1b |
| 1.1f | Visual QA — all routes in light + dark mode | All routes | S (1h) | 1.1d, 1.1e |

**Acceptance criteria:**
- Every route renders correctly under `:root` (light) and `[data-theme="dark"]`.
- No component uses raw Tailwind color classes (`bg-white`, `text-gray-900`, `border-gray-200`) except inside `@theme` definitions.
- `--rt-*` tokens still function in reader; reader themes map to semantic token overrides.
- WCAG contrast ratio 4.5:1 maintained in both modes (verify via axe-core or Lighthouse).

**Implementation sketch — token architecture:**

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Raw palette (oklch) */
  --color-stone-50: oklch(0.985 0.001 106.423);
  --color-stone-950: oklch(0.147 0.004 49.25);
  /* ... full palette ... */

  /* Typography */
  --font-body: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-jp: "Hiragino Sans", "Yu Gothic UI", "Noto Sans CJK JP", sans-serif;

  /* Reading scale */
  --text-reading: 1rem;
  --text-reading-lg: 1.125rem;
}

/* Semantic tokens — light (default) */
:root {
  --color-bg: var(--color-stone-50);
  --color-surface: var(--color-white);
  --color-text: var(--color-stone-900);
  --color-text-muted: var(--color-stone-500);
  --color-border: var(--color-stone-200);
  --color-link: var(--color-blue-600);
  --color-accent: var(--color-blue-600);
}

/* Semantic tokens — dark */
[data-theme="dark"] {
  --color-bg: var(--color-stone-950);
  --color-surface: var(--color-stone-900);
  --color-text: var(--color-stone-100);
  --color-text-muted: var(--color-stone-400);
  --color-border: var(--color-stone-700);
  --color-link: var(--color-blue-400);
  --color-accent: var(--color-blue-400);
}

/* Reader themes override semantic tokens within [data-reader-theme] scope */
[data-reader-theme="light"] {
  --color-bg: #ffffff;
  --color-text: #000000;
  /* ... (existing --rt-* maps) ... */
}
```

**Component convention:**
```tsx
// BEFORE (audit finding D1)
<div className="bg-white text-gray-900 border-gray-200">

// AFTER
<div className="bg-[var(--color-bg)] text-[var(--color-text)] border-[var(--color-border)]">
```

---

#### 1.2 Data-Layer Foundation: RPC + Indexes + Pagination

**Effort:** L (2 days)  
**Audit refs:** P1 (fetchAllSegments), P2 (search full-scan), P3 (documents `*`), P4 (middleware DB query), P9 (ZH segments always fetched)  
**Research refs:** §1a (Supabase query optimization), §1b (RPC + keyset + composite index techniques)

**Tasks:**

| # | Task | Files | Effort | Depends On |
|---|------|-------|--------|------------|
| 1.2a | Design and create `get_article_bilingual_v2` RPC function (single `segments` table, `target_lang` filter) | Supabase migration SQL | M (2h) | None |
| 1.2b | Inventory existing indexes; add only new GIN trigram indexes on `segments.source_text` and `segments.target_text` | Supabase migration SQL | S (15m) | None |
| 1.2c | Create `search_segments` RPC function using GIN trigram `%` operator | Supabase migration SQL | M (2h) | 1.2b |
| 1.2d | Implement keyset pagination RPC `get_documents_feed_v1(cursor, limit)` | Supabase migration SQL | M (1.5h) | None |
| 1.2e | Update `app/documents/[id]/read/page.tsx` to call `get_article_bilingual_v2` (server-side) | `app/documents/[id]/read/page.tsx`, `lib/supabase/fetch-all-segments.ts` (deprecate) | M (2h) | 1.2a |
| 1.2f | Update search API to use GIN index via `search_segments` RPC | `app/api/search/route.ts` | M (2h) | 1.2c |
| 1.2g | Update documents feed to keyset pagination | `app/documents/page.tsx`, `app/api/documents/route.ts` | M (2h) | 1.2d |
| 1.2h | Make ZH segment fetch conditional (`source_lang === 'zh'` check) | `app/documents/[id]/read/page.tsx:45-49` | S (15m) | 1.2e |
| 1.2i | Cache admin role in signed cookie/JWT claim (eliminate middleware profile query) | `lib/supabase/proxy.ts:41-53` | M (2h) | None |
| 1.2j | Verify with `EXPLAIN ANALYZE` on all new queries/indexes | Supabase SQL editor | S (1h) | 1.2b, 1.2c, 1.2d |

**Acceptance criteria:**
- `get_article_bilingual_v2(article_id, 'en')` returns all segments for the article with one target language in a single round-trip (verified via Supabase dashboard).
- Searching "kote" uses GIN index on the `segments` table (confirmed by `EXPLAIN ANALYZE` showing index scan, not seq scan).
- Documents feed with `?cursor=...` returns paginated results at constant latency regardless of page depth.
- Middleware no longer queries `profiles` table; admin role read from signed JWT claim.
- ZH segments only fetched when document's target language or settings include Chinese.

**Implementation sketch — `get_article_bilingual_v2` RPC:**

The actual schema uses a single `segments` table (see `supabase/migrations/000_baseline_snapshot.sql:157-182`). Each row contains both `source_text` and `target_text`, with `source_lang` and `target_lang` columns. Bilingual JP→EN data is stored with `source_lang='ja'`, `target_lang='en'` and `target_text` populated. Monolingual rows have `target_text = null` and `metadata->>'monolingual' = true`.

```sql
CREATE OR REPLACE FUNCTION get_article_bilingual_v2(
  p_article_id uuid,
  p_target_lang text DEFAULT 'en'
)
RETURNS TABLE(
  position int,
  source_text text,
  target_text text,
  source_lang text,
  target_lang text,
  status text,
  metadata jsonb
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT
    s.position,
    s.source_text,
    s.target_text,
    s.source_lang,
    s.target_lang,
    s.status,
    s.metadata
  FROM segments s
  WHERE s.article_id = p_article_id
    AND s.target_lang = p_target_lang
  ORDER BY s.position ASC;
$$;
```

**Existing index reused** — no new composite index needed:
- `idx_segments_article_position` ON `segments(article_id, position)` already exists (000_baseline_snapshot.sql:292). This supports the `ORDER BY position` in the RPC.
- `segments_article_id_position_target_lang_key` UNIQUE constraint on `(article_id, position, target_lang)` already exists (migration 007 line 13). This supports the `WHERE target_lang =` filter.

**Implementation sketch — `search_segments` RPC with GIN trigram:**

```sql
-- Enable extension (run once; already available in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- NEW GIN indexes on the single segments table
CREATE INDEX IF NOT EXISTS idx_segments_source_trgm
  ON segments USING gin (source_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_segments_target_trgm
  ON segments USING gin (target_text gin_trgm_ops);

CREATE OR REPLACE FUNCTION search_segments(
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  article_id uuid,
  article_title text,
  position int,
  source_snippet text,
  target_snippet text,
  status text,
  rank real
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT
    s.id,
    s.article_id,
    a.title AS article_title,
    s.position,
    left(s.source_text, 200) AS source_snippet,
    left(s.target_text, 200) AS target_snippet,
    s.status,
    similarity(s.source_text, p_query) AS rank
  FROM segments s
  JOIN articles a ON a.id = s.article_id
  WHERE s.source_text % p_query      -- trigram similarity
     OR s.target_text % p_query      -- also search translated text
  ORDER BY rank DESC
  LIMIT p_limit;
$$;
```

---

### Phase 2 — Virtualization + Search Index

**Goal:** Eliminate the ~15MB client-side payload for large books and make search fast.

**Dependencies:** Phase 1 complete (RPC functions + indexes must exist).

| # | Task | Audit Ref | Affected Files | Effort | Depends On |
|---|------|-----------|----------------|--------|------------|
| 2.1 | Install `react-virtuoso` and create `<VirtualizedReader>` wrapper | P1 | `package.json`, `components/reader/VirtualizedReader.tsx` (new) | M (3h) | 1.2e |
| 2.2 | Integrate `<VirtualizedReader>` into `ReaderView`, fetching pages via `get_article_bilingual_v2` in chunks | P1 | `components/reader/ReaderView.tsx`, `hooks/useReaderView.ts` | L (5h) | 2.1 |
| 2.3 | Server-render full article HTML for SEO bots (progressive enhancement pattern) | P1 | `app/documents/[id]/read/page.tsx` | M (3h) | 2.1 |
| 2.4 | Wire search API to `search_segments` RPC (GIN index) | P2 | `app/api/search/route.ts` | M (2h) | 1.2f |
| 2.5 | Add `<Suspense>` + loading skeleton for search page | P8 | `app/search/**`, `app/search/loading.tsx` (new) | S (1h) | 2.4 |
| 2.6 | Fix duplicate search scope tabs (M7) | M7 | Search UI component | S (30m) | None |
| 2.7 | Performance validation: LCP <2.0s on largest book (29k segs) | P1, P2 | All reader files | S (1h) | 2.2, 2.3 |

**Acceptance criteria:**
- Reader with 29k segments loads in <2.0s LCP (verified by Lighthouse/lab test).
- Memory usage stable during continuous scroll through full book (no linear growth).
- `curl -H "User-Agent: Googlebot" <article-url>` returns full article content (not just Virtuoso shell).
- Search for "kote" returns results in <200ms (verified by `EXPLAIN ANALYZE` and timing in API response).

**Implementation sketch — Virtuoso integration:**

```tsx
// components/reader/VirtualizedReader.tsx
'use client';

import { Virtuoso } from 'react-virtuoso';
import type { Paragraph } from '@/types/reader';
import BilingualParagraphView from './BilingualParagraphView';

interface Props {
  fetchPage: (startIndex: number, count: number) => Promise<Paragraph[]>;
  totalCount: number;
  sourceLang: string;
  targetLang: string;
  layoutWidth: LayoutWidth;
}

export default function VirtualizedReader({ fetchPage, totalCount, ...rest }: Props) {
  // Virtuoso calls itemContent for each visible item.
  // We group pages of 50 segments into one virtual item each for efficiency.
  const PAGE_CHUNK = 50;
  const itemCount = Math.ceil(totalCount / PAGE_CHUNK);

  return (
    <Virtuoso
      totalCount={itemCount}
      itemContent={(index) => <PageChunk index={index} fetchPage={fetchPage} chunkSize={PAGE_CHUNK} {...rest} />}
      increaseViewportBy={800}  // pre-render 800px above/below viewport
      computeItemKey={(index) => `page-${index}`}
    />
  );
}
```

**SEO progressive enhancement pattern (research §5 pitfall mitigation):**

```tsx
// app/documents/[id]/read/page.tsx (server component)
import { headers } from 'next/headers';

export default async function ReadPage({ params }) {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') ?? '';
  const isBot = /bot|crawler|googlebot/i.test(userAgent);

  if (isBot) {
    // Server-render full HTML for crawlers — no Virtuoso
    const data = await supabase.rpc('get_article_bilingual_v2', { ... });
    return <FullArticleHtml segments={data} />;
  }

  // Human users get the virtualized progressive-enhanced reader
  return <ClientReader articleId={id} segmentCount={data.length} />;
}
```

---

### Phase 3 — Bilingual UX Overhaul + Mobile Experience

**Goal:** Fix the bilingual reading experience across all viewports. Readers should not need to pinch-zoom or suffer 150px columns on mobile.

**Dependencies:** Phase 2 complete (virtualized reader in place; rebuilding bilingual views on virtualized foundation).

| # | Task | Audit Ref | Affected Files | Effort | Depends On |
|---|------|-----------|----------------|--------|------------|
| 3.1 | Implement responsive bilingual layout: CSS Grid 2-column (≥768px) → stacked (mobile) | M1, M3 | `components/reader/BilingualParagraphView.tsx`, `components/reader/SingleLanguageView.tsx` | L (5h) | 2.2 |
| 3.2 | Add three-way language toggle: JP Only / EN Only / Bilingual | M1 | `hooks/useReaderView.ts`, `components/reader/ReaderView.tsx` | M (3h) | 3.1 |
| 3.3 | Implement per-script typography: `:lang(ja)` line-height 1.7, `:lang(en)` line-height 1.6, +5% EN font-size | D5 | `app/globals.css`, `components/reader/BilingualParagraphView.tsx` | M (2h) | 1.1b |
| 3.4 | Build sticky bottom reading bar (thumb-zone): language toggle, text-size slider, TOC, article nav | M4 | `components/reader/MobileBottomBar.tsx` (new) | M (4h) | 3.1, 3.2 |
| 3.5 | Mobile editor: replace hard-block with responsive warning or tablet-friendly layout | M1 | `app/documents/[id]/edit/page.tsx:400-419` | M (3h) | None |
| 3.6 | Fix ReaderSidebar full-width drawer on mobile to partial-width or bottom-sheet | M3 | `components/reader/ReaderSidebar.tsx:532` | S (1h) | None |
| 3.7 | Fix doc-list card overflow <320px | M5 | `components/documents/DocumentCard.tsx` | S (1h) | None |
| 3.8 | Mobile visual QA: test all routes at 320px, 375px, 768px | M1–M6 | All affected components | S (1h) | 3.1–3.7 |

**Acceptance criteria:**
- At 375px viewport, bilingual article shows one language at a time with a toggle (not two 150px columns).
- Bottom bar appears on tap during scroll, hides after 3s of inactivity, all targets ≥48×48dp.
- `:lang(ja)` text renders with correct Japanese font stack and line-height 1.7.
- Editor on tablet (≥768px) loads normally; below 768px shows navigation to reader instead of blocking entire viewport.
- Sidebar on mobile is 80vw max-width or bottom-sheet; does not cover entire screen.

---

### Phase 4 — Caching, PPR & Performance

**Goal:** Make the platform feel instant. Cold starts, article loads, and navigation transitions should be sub-second.

**Dependencies:** Phase 2 complete (RPC data layer produces cacheable results). Phase 3 (Bilingual UX + Mobile) is NOT required — Phase 4 can start as soon as Phase 2 is done. The two can be parallelized by separate engineers. In the milestone grouping (Week 2–3), Phase 3 runs alongside Phase 4 once Phase 2 gates pass.

| # | Task | Audit Ref | Affected Files | Effort | Depends On |
|---|------|-----------|----------------|--------|------------|
| 4.1 | Enable `cacheComponents: true` in next.config (verified valid in Next.js 16.2.4; `experimental.ppr` is the deprecated predecessor) | P7 | `next.config.ts` | S (15m) | None |
| 4.2 | Add `"use cache"` + `cacheLife('hours')` + `cacheTag('articles')` to article read page | P7 | `app/documents/[id]/read/page.tsx` | M (2h) | 4.1 |
| 4.3 | Add `<Suspense>` boundaries around personalized sections (reading history, theme) | P8 | Reader components | M (2h) | 4.2 |
| 4.4 | Add `updateTag()` calls to all Supabase write paths (editor save, publish, QA approve) | P7 | Editor actions, API routes | M (3h) | 4.2 |
| 4.5 | Add `app/**/loading.tsx` skeletons for article routes, documents feed, search | P8 | `app/documents/loading.tsx`, `app/search/loading.tsx`, `app/documents/[id]/read/loading.tsx` | M (2h) | None |
| 4.6 | Add `<Link prefetch>` to common navigation paths | P7 | `components/shared/SiteNav.tsx`, document cards | S (1h) | None |
| 4.7 | Fix duplicate `/api/auth/me` fetches (P11) | P11 | Client-side auth hooks/components | S (1h) | None |
| 4.8 | Fix `useDocument` hook unpaginated (P12) | P12 | `hooks/useDocument.ts` | S (30m) | None |
| 4.9 | Core Web Vitals validation: Lighthouse + Playwright lab test | P7, P8 | All routes | M (2h) | 4.1–4.8 |

> **Rev 3 (2026-06-24) — caching approach pivot.** `cacheComponents:true` (task 4.1) and `"use cache"` (task 4.2) were found incompatible with the app's pervasive `cookies()` calls (Supabase SSR `createClient`) used in API routes, middleware, and per-route `dynamic='force-dynamic'`/`revalidate=0` segment configs. Global PPR enablement caused prerender rejections at build time. The **accepted approach** replaces the original PPR plan with:
> - **`unstable_cache`** (stable Next.js Data Cache) scoped to the reader page's article segment fetch, wrapped in `<Suspense>` for streaming.
> - **Tag-based invalidation:** all write paths call `revalidateTag('articles','max')` for bulk + `revalidateTag(\`article-${articleId}\`,'max')` for per-article granularity + `revalidatePath(\`/documents/${articleId}/read\`)` for CDN/edge.
> - **`revalidateTag(tag,'max')`** (2-arg form) is the correct API for Route Handlers in Next.js 16.2.4. `updateTag` is Server-Action-only and is NOT used.
> - PPR enablement is recorded as a **deferred future option** — isolate auth-gated routes into a separate layout group, then enable `cacheComponents` for the reader segment only.
>
> The task table above is preserved as the original plan; tasks 4.1–4.2 are implemented via the `unstable_cache` approach. Tasks 4.3–4.9 are implemented as planned.

**Acceptance criteria (Rev 3 amended):**
- Article page LCP <2.0s on 4G throttling (Lighthouse).
- Second navigation to same article is instant (static shell cached).
- ~~`updateTag('articles')` called from editor server actions after publish; article updates within seconds.~~ → **Replaced:** `revalidateTag('articles','max')` + `revalidateTag(\`article-${articleId}\`,'max')` + `revalidatePath(\`/documents/${articleId}/read\`)` called from all 5 write Route Handlers after mutation; article updates within seconds. (See Rev 3 note above — `updateTag` is Server-Action-only; Route Handlers use the 2-arg `revalidateTag`.)
- No `Uncached data was accessed outside of <Suspense>` build errors.
- All routes have meaningful skeleton loading states (no blank white flashes).

**Critical pitfall (research §5):** `"use cache"` with `cookies()`/`headers()`/`searchParams` MUST be wrapped in `<Suspense>`. Pattern:

```tsx
// app/documents/[id]/read/page.tsx
import { Suspense } from 'react';

export default function ReadPage({ params }) {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <CachedArticleContent params={params} />
    </Suspense>
  );
}

async function CachedArticleContent({ params }) {
  'use cache';
  cacheLife('hours');
  cacheTag(`article-${params.id}`);

  // Safe: runtime data accessed in parent (non-cached) and passed as props
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_article_bilingual_v2', {
    p_article_id: params.id,
  });
  // ...
}
```

---

### Phase 5 — Strategic Investments

**Goal:** Differentiate the platform with offline reading and furigana support. These are lower-urgency but high-value for the kendo/JLPT-learner audience.

**Dependencies:** Phase 4 (platform is fast and stable before adding complexity).

| # | Task | Audit Ref | Affected Files | Effort | Depends On |
|---|------|-----------|----------------|--------|------------|
| 5.1 | PWA: service worker + Cache Storage for app shell + last 5 articles | M6 | `public/sw.js`, `next.config.ts`, `public/manifest.json` | L (1 week) | Phase 4 |
| 5.2 | PWA: IndexedDB for reading position + saved articles | M6 | `lib/pwa/storage.ts` (new), reader hooks | M (4h) | 5.1 |
| 5.3 | PWA: `manifest.json` with standalone display, icons, theme-color | M6 | `public/manifest.json`, icon assets | M (2h) | 5.1 |
| 5.4 | Furigana/ruby: annotation pipeline for kendo terminology | — | `lib/furigana/` (new), DB migration for ruby data | L (1 week) | None (independent) |
| 5.5 | Furigana UI: toggle by JLPT level, reading-mode integration | — | `components/reader/RubyText.tsx` (new) | M (4h) | 5.4 |
| 5.6 | Tap-to-reveal word translations on mobile | M6 | `components/reader/WordPopup.tsx` (new) | M (4h) | 3.4 |
| 5.7 | Reading focus mode: hide chrome, centered column, adjustable typography | — | `components/reader/FocusMode.tsx` (new) | M (4h) | 3.4 |

**Acceptance criteria:**
- PWA: app installable on Android and iOS Safari 16.4+; last 5 opened articles load offline.
- Furigana: `<ruby>剣道<rt>けんどう</rt></ruby>` rendered correctly; toggle "Show furigana" works.
- Focus mode: all chrome hidden, text column centered at `max-w-[72ch]`, typography controls functional.

---

## 3. Per-Task Detail — Big Items

### 3.1 Virtualization (P1) — expanded from Phase 2

**Problem:** `fetchAllSegments` loads all segments client-side (up to 15MB for a 29k-segment book). `useReaderView` paginates after the fact at 50 segments/page, but the data is already fully loaded. This causes 4–8s LCP and 200–400ms INP.

**Approach:**
1. **Replace `fetchAllSegments` with `get_article_bilingual_v2` RPC** on the server. This gives aligned source/target pairs in one query.
2. **Server component passes segment count + initial page** to client as props; client fetches subsequent pages on-demand via server action.
3. **React Virtuoso** renders only visible segments. Bilingual paragraphs remain the virtual item unit (not individual lines), keeping item count manageable.
4. **SEO fallback:** Server component checks `User-Agent` header; if bot, renders full article HTML as static content (no Virtuoso). This is the research-recommended progressive enhancement pattern (§5 pitfall).

**Affected files:** `app/documents/[id]/read/page.tsx`, `lib/supabase/fetch-all-segments.ts` (deprecate), `hooks/useReaderView.ts` (add chunked fetch), `components/reader/ReaderView.tsx` (integrate Virtuoso), new `components/reader/VirtualizedReader.tsx`.

**Effort:** L (8h total across tasks 2.1–2.3).  
**Dependencies:** 1.2e (RPC deployed).  
**Risk:** Medium — Virtuoso dynamic heights may cause scroll position jitter. Mitigation: `increaseViewportBy={800}` and test extensively with mixed-arabic/JP content. Nested scroll prevention: do NOT nest Virtuoso in another scroll container.

### 3.2 Bilingual RPC + GIN Indexes (P1, P2) — expanded from Phase 1

**Problem:** Current segment fetch uses multiple offset-paginated `.range()` calls concatenated client-side (N+1 style via `fetchAllSegments`). Search uses `.ilike('%term%')` which forces sequential scan on 134k rows.

**Actual schema** (verified against `supabase/migrations/000_baseline_snapshot.sql:157-182` and `types/database.ts:46-63`): a single `segments` table with columns `id, article_id, position, source_text, target_text (nullable), source_lang, target_lang, status, …`. Bilingual data is stored with `target_text` on the same row as `source_text`, differentiated by `target_lang`. Monolingual rows have `target_text = null` and `metadata->>'monolingual' = true`. There are NO separate `article_segments` / `article_segment_translations` tables.

**Approach:**
1. Single `get_article_bilingual_v2(article_id, target_lang)` RPC returns all segments for one target language in one query — avoiding `fetchAllSegments`'s multi-pagination pattern.
2. Composite index `idx_segments_article_position` ON `segments(article_id, position)` **already exists** (000_baseline:292) — reused as-is.
3. Unique constraint `segments_article_id_position_target_lang_key` ON `(article_id, position, target_lang)` **already exists** (migration 007:13) — reused as-is.
4. Two NEW GIN trigram indexes (`pg_trgm`): `idx_segments_source_trgm` on `segments.source_text` and `idx_segments_target_trgm` on `segments.target_text`.
5. `search_segments` RPC uses `%` operator (trigram similarity) instead of `ILIKE` for 50–100× speedup — queries the single `segments` table directly (no JOIN to a translations table).

**Affected files:** Supabase migration SQL (new), `app/api/search/route.ts`, `app/documents/[id]/read/page.tsx`.

**Effort:** L (8.5h across tasks 1.2a–1.2d).  
**Dependencies:** None (pure DB work).  
**Risk:** Low — GIN indexes increase write latency slightly and consume ~10–20% additional storage per indexed column. Acceptable tradeoff for read-heavy platform.

### 3.3 Design-Token System (D1, D9) — expanded from Phase 1

**Problem:** Reader has rich `--rt-*` token system; other routes use hardcoded Tailwind `bg-white text-gray-900`. No dark mode outside reader. Tokens and hardcoded values coexist, creating visual inconsistency and making future theming expensive.

**Approach:**
1. Define raw palette tokens in `@theme {}` block (Tailwind 4 native).
2. Define semantic tokens on `:root` with light defaults and `[data-theme="dark"]` overrides.
3. `--rt-*` tokens remain functional; they become aliases that either inherit from semantic tokens or keep their reader-specific values.
4. Component migration: search/replace hardcoded color classes with `bg-[var(--color-bg)]` etc. Start with shared components, then route-by-route.
5. ThemeProvider reads `localStorage` preference or `prefers-color-scheme` and sets `data-theme` attribute on `<html>`.

**Affected files:** `app/globals.css`, `components/shared/ThemeProvider.tsx`, `app/layout.tsx`, and every component with hardcoded colors (~15–20 files).

**Effort:** L (12h across tasks 1.1a–1.1f).  
**Dependencies:** Phase 0 should complete first (dead code removal reduces migration surface).  
**Risk:** Medium — visual regression risk. Mitigation: run Playwright visual tests (16-spec suite) before/after; do route-by-route migration and commit incrementally.

### 3.4 Mobile Bilingual Layout (M1, M3, M4) — expanded from Phase 3

**Problem:** `BilingualParagraphView` uses `columns-2` which produces ~150px unreadable columns on phones. Editor hard-blocks mobile with a full-viewport overlay. Sidebar opens full-width.

**Approach:**
1. **BilingualParagraphView:** `className` switches on viewport: `≥768px` uses CSS Grid `grid-cols-[1fr_1fr]` with synchronized scroll columns; `<768px` uses stacked blocks with source paragraph followed by translation in muted style, separated by visual divider.
2. **Language toggle:** Reader mode picker becomes a three-state toggle: "JP" / "Bilingual" / "EN". On mobile, this lives in the sticky bottom bar. Reading position preserved across toggles via `scrollTop` save/restore.
3. **Sticky bottom bar:** `<nav>` fixed to viewport bottom, visible on first tap, auto-hides after 3s scroll. Contains language toggle, text-size +/- buttons, TOC button, prev/next article navigation. All targets 48×48dp minimum.
4. **Editor:**
   - Replace full-viewport block overlay with a dismissible banner at top of page on <768px.
   - Banner message: "Editor works best on desktop. Switch to Reader View or continue on tablet/desktop."
   - Below banner, the editor content remains scrollable (read-only) so translators can at least review content on phone.
5. **ReaderSidebar:** On mobile (<640px), use `max-w-[85vw]` instead of `w-full` so the backdrop tap area remains accessible; or use a bottom-sheet style.

**Affected files:** `components/reader/BilingualParagraphView.tsx`, `components/reader/SingleLanguageView.tsx`, `components/reader/ReaderView.tsx`, `components/reader/MobileBottomBar.tsx` (new), `app/documents/[id]/edit/page.tsx`, `components/reader/ReaderSidebar.tsx`.

**Effort:** L (16h across tasks 3.1–3.8).  
**Dependencies:** Phase 2 (virtualized reader must be stable before rebuilding the bilingual views on it).  
**Risk:** Medium — scroll position preservation across language toggles is tricky with Virtuoso's virtual list. Mitigation: store Virtuoso `scrollToIndex` before toggle, restore after.

### 3.5 PPR Caching (P7, P8) — expanded from Phase 4

**Problem:** No cache layer exists. Every article page load queries Supabase. Every authenticated route re-validates the session. No Suspense boundaries cause waterfall loading.

**Approach:**
1. **Enable `cacheComponents: true`** in `next.config.ts` to activate Partial Prerendering. (Verified: `cacheComponents` is a valid top-level `NextConfig` key in Next.js 16.2.4 — promoted from the now-deprecated `experimental.ppr`. See `next/dist/server/config-shared.d.ts`.)
2. **`"use cache"` on article page:** The article content (title + segments) is static between edits. Cache for 1 hour with `cacheLife('hours')` and `cacheTag('articles')`.
3. **Runtime data isolation:** Read `cookies()` and `headers()` in a thin non-cached wrapper, pass results as props to the cached component. Every `"use cache"` component must NOT directly access runtime APIs.
4. **Invalidation:** Every Supabase mutation (editor save, QA approve, publish) calls `updateTag('articles')` and `updateTag(\`article-${articleId}\`)` in the server action. (Verified: `updateTag` is a live export from `next/cache` in Next.js 16.2.4, intended for Server Action tag invalidation. The older `revalidateTag()` single-arg form is deprecated in favor of `updateTag`.) Plus `revalidatePath()` for CDN edge cache.
5. **Suspense boundaries:** Article page wraps personalized sections (reading history sidebar, user-specific theme) in `<Suspense>` so the core article shell renders immediately.
6. **Loading skeletons:** `loading.tsx` files at `app/documents/loading.tsx`, `app/search/loading.tsx`, and `app/documents/[id]/read/loading.tsx` provide instant feedback.

**Affected files:** `next.config.ts`, `app/documents/[id]/read/page.tsx`, `app/documents/loading.tsx` (new), `app/search/loading.tsx` (new), editor server actions.

**Effort:** L (14h across tasks 4.1–4.9).  
**Dependencies:** Phase 2 (RPC functions provide the data-fetching surface to cache).  
**Risk:** Medium — cache invalidation bugs are easy to create. Build a checklist: every write path → matching `updateTag()`. Test with Playwright: edit article → verify reader updates within 5s.

> **Rev 3 (2026-06-24) — §3.5 approach superseded.** The `cacheComponents:true` / `"use cache"` / `updateTag` approach prescribed above was found incompatible with the app's pervasive `cookies()` calls across API routes, middleware, and `force-dynamic` routes (see Rev 3 note in Phase 4 task table). **Accepted replacement:** `unstable_cache` (Data Cache) scoped to the reader page with `revalidateTag(tag,'max')` on write Route Handlers (NOT `updateTag`, which is Server-Action-only). The Suspense isolation and runtime-data-as-props patterns (points 3, 5, 6) are preserved unchanged. PPR is deferred — isolate auth-gated routes into a separate layout group before retrying `cacheComponents`.

---

## 4. Risks & Mitigations

| Risk | Severity | Phase | Mitigation |
|------|----------|-------|------------|
| **Virtualization hides content from crawlers** (research §5) | High | 2 | Server-render full article HTML for bots via User-Agent detection. Verify with `curl -H "User-Agent: Googlebot"`. |
| **Full Noto Sans JP web font loaded** (~5MB) | Medium | 3 | Use system font stack only. Subset only if brand-critical (Jōyō Kanji + kana ≈ 500KB woff2). |
| **`"use cache"` throws `Uncached data` errors** at build | High | 4 | Wrap all runtime-data access (`cookies()`, `headers()`, `searchParams`) in non-cached parent; pass as props. Every `"use cache"` function audited for runtime API calls. |
| **Cache invalidation misses** (stale content after edit) | High | 4 | Checklist: every server action that mutates Supabase → matching `updateTag()` + `revalidatePath()`. Playwright test: edit → verify reader update. |
| **Side-by-side columns with misaligned segments** | Medium | 3 | Segment alignment integrity verified in DB before rendering. If paragraph counts diverge, fall back to stacked layout with visual warning. |
| **Interlinear mode doubles scroll height** | Low | 3 | Interlinear is toggleable OFF by default. Default mode is monolingual or stacked bilingual. |
| **Virtuoso nested scroll** (scroll container inside another scroll container) | Medium | 2 | Audit: no `overflow: scroll` on Virtuoso parent. Use `body` as scroll root. |
| **GIN index write latency** | Low | 1 | Write latency increase ~5–10% per indexed column. Read-heavy platform (99% reads) — acceptable tradeoff. |
| **PWA iOS limitations** (50MB cache, no background sync) | Low | 5 | Start with "read saved articles offline" only. Advanced PWA features (push, background sync) deferred. |
| **Design-token migration breaks visual tests** | Medium | 1 | Incremental migration: migrate one route at a time, run Playwright visual tests per commit. Rollback path: tokens are additive, `--rt-*` aliases preserved. |
| **Faux-italic on Japanese text** | Low | 3 | `font-style: italic` restricted to `:lang(en)` selector only. Japanese emphasis via `font-weight` or brackets. |

---

## 5. Verification Strategy

### Per-phase validation gates

**Phase 0:**
- `npm run build` passes with `ignoreBuildErrors: false`.
- `npx depcheck` confirms no unused deps.
- Playwright smoke test: login, browse documents, open reader, toggle themes.
- Lighthouse: no regressions on home page.

**Phase 1:**
- `EXPLAIN ANALYZE` output from Supabase confirms all new queries use index scans.
- Design-token audit: `grep -r 'bg-white\|text-gray-900\|border-gray-200' app/ components/` returns zero matches (or only in `globals.css`).
- Playwright visual regression: all 16 specs pass in both light and dark modes.
- Bilingual RPC: fetch largest book (29k segments) — verify single round-trip, <500ms.

**Phase 2:**
- Largest book LCP <2.0s (Lighthouse, simulated 4G).
- `curl -H "User-Agent: Googlebot" <url>` returns full article HTML.
- Search "kote" → <200ms (API timing + `EXPLAIN ANALYZE`).
- Memory profiler: continuous scroll through 29k-seg book → stable heap (no linear growth).

**Phase 3:**
- Manual QA at 320px, 375px, 768px: no horizontal overflow, all text readable.
- Bottom bar touch targets pass 48×48dp test (Chrome DevTools device mode).
- `:lang(ja)` renders with correct font stack (inspect computed styles).
- Editor on iPad (768px): loads, segments visible, forms usable.

**Phase 4 (Rev 3 amended):**
- Lighthouse: LCP <2.0s, INP <150ms, CLS <0.05 on article pages (4G throttling).
- ~~Build passes with `cacheComponents: true`, no `Uncached data` errors.~~ **SUPERSEDED** — `cacheComponents` is not enabled globally (see Rev 3 note). Build passes with `ignoreBuildErrors: false` (27 static pages). PPR deferred.
- Build passes with `unstable_cache`-based Data Cache on the reader page; tag invalidation verified (per-article + coarse + revalidatePath).
- Playwright: edit article → publish → read article verifies content updates within 5s (`tests/cache-invalidation.spec.ts`).
- `loading.tsx` skeletons visible during navigation (simulated via network throttle).

**Phase 5:**
- Lighthouse PWA audit: installable, offline-capable.
- Furigana toggle: verify `<ruby>` markup renders correctly in Chrome, Firefox, Safari.
- Offline: airplane mode → open app → navigate saved articles → reading position restored.

### Playwright test coverage

The existing 29-spec Playwright suite covers auth, reader, editor, admin, API, search, and profile flows. For this revamp:

- **Pre-migration baseline:** Run full suite, capture visual snapshots.
- **Per-phase:** Add phase-specific specs (e.g., Phase 2: `virtuoso-scroll.spec.ts`, Phase 3: `mobile-bilingual.spec.ts`, Phase 4: `cache-invalidation.spec.ts`).
- **Regressions:** Existing specs serve as regression guard. Any failure during phase work must be resolved before phase gate.

### Core Web Vitals targets

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| LCP (article page) | <2.0s (prefer <1.5s) | Lighthouse (simulated 4G) + Vercel Analytics RUM |
| INP (reader interaction) | <150ms | Chrome DevTools Performance panel + Vercel Web Vitals |
| CLS (article page) | Near 0 (<0.05) | Lighthouse + Layout Shift GIF regions in DevTools |
| TTFB (article page) | <600ms | Vercel Analytics (edge-cached)
| JS bundle (reader) | <150KB gzipped | `next build` output + `@next/bundle-analyzer` |

---

## 6. Effort Summary & Milestone Grouping

### Effort summary table

| Phase | Tasks | Total Effort | Risk | Blocks |
|-------|-------|-------------|------|--------|
| **Phase 0** — Quick Wins | 9 | 2.4 hours | Low | Nothing |
| **Phase 1** — Foundation | 16 | 3.5 days | Medium | Phases 2–5 |
| **Phase 2** — Virtualization + Search | 7 | 2.5 days | Medium | Phases 3–5 (foundation) |
| **Phase 3** — Bilingual UX + Mobile | 8 | 3 days | Medium | None (parallel with Phase 4) |
| **Phase 4** — Caching + PPR | 9 | 2.5 days | Medium | Phase 5 |
| **Phase 5** — Strategic Investments | 7 | 2.5 weeks | Low-Medium | Nothing |
| **Total** | **56 tasks** | **~4.5 weeks** | — | — |

Effort estimates assume a single full-stack engineer familiar with the codebase. With two engineers, Phases 0–4 can complete in ~2.5 weeks (foundation work is not easily parallelizable; feature phases can overlap once foundation is done).

### Suggested milestone grouping

**Milestone A — "Solid Foundation" (Week 1)**
Phase 0 + Phase 1 complete. At this point:
- All quick wins shipped.
- Design tokens live, dark mode works everywhere.
- RPC functions, indexes, and keyset pagination deployed.
- CI builds pass with `ignoreBuildErrors: false`.
- Playwright suite green in both light and dark modes.

**Milestone B — "Fast Reader" (Week 2)**
Phase 2 complete. At this point:
- Reader virtualized; LCP <2.0s on largest book.
- Search returns in <200ms via GIN index.
- SEO bots receive server-rendered full article HTML.

**Milestone C — "Great on Mobile" (Week 3, parallel with Milestone D)**
Phase 3 complete. Note: Phase 3 and Phase 4 can be parallelized by separate engineers once Phase 2 complete — Phase 3 depends on Phase 2 for the virtualized reader foundation; Phase 4 also depends on Phase 2 for the RPC data layer. At this point:
- Bilingual reading works on phones (stacked + toggle, no broken columns).
- Sticky bottom bar with thumb-zone controls.
- Editor accessible on tablet; graceful fallback on phone.
- Per-script typography applied everywhere.

**Milestone D — "Instant & Offline" (Weeks 4–7)**
Phases 4 + 5 complete. At this point:
- PPR caching: article pages load instantly on repeat visits.
- PWAs: installable, offline reading for saved articles.
- Furigana: kendo terminology annotated, toggleable.
- Reading focus mode: distraction-free reading surface.
- All Core Web Vitals targets met.

### Preservation checklist — strengths NOT to regress

- ✅ 7-theme `--rt-*` token system (aliased, not removed)
- ✅ `useReaderView` pagination (augmented with Virtuoso, not replaced)
- ✅ Keyboard shortcut system (unchanged; shortcuts work with virtualized list)
- ✅ Mobile SiteNav hamburger (unchanged)
- ✅ Supabase SSR integration (unchanged; new RPC functions are additive)
- ✅ 29-spec Playwright suite (all must stay green)
- ✅ In-reader client-side search (augmented with server-side GIN-backed search)

---

*End of plan. All audit refs, research sections, and file:line evidence cited inline. Ready for review — no code has been modified.*
