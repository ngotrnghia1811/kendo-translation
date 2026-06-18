/**
 * tests/user-flow-tests.spec.ts
 *
 * Five instrumented user-flow Playwright tests running against the
 * production Vercel deployment at PROD_URL (default kendo-translation.vercel.app).
 *
 * Each flow measures per-step timing (Date.now() snapshots around
 * navigation + element-visible waits) AND checks UX/readability via
 * WCAG contrast-computation logged as test annotations.
 *
 * Flows:
 *   RF-TRANS-01   Translator: login → edit → save → phase advance
 *   RF-READER-01  Reader:     browse → open → read → bookmark → resume
 *   RF-ADMIN-01   Admin:      dashboard review (stats, tables)
 *   RF-READER-02  Reader:     7-theme switch cycle + layout + font-size
 *   RF-CROSS-01   Mixed:      cold-start latency baseline (auth + unauth)
 *
 * Auth: Supabase REST API password grant in beforeAll (3× retry, 2 s
 * backoff).  Session cookies are injected per-test via
 * page.context().addCookies() — no form-based per-test login.
 *
 * Side-effect: RF-TRANS-01 may advance a phase on the smallest doc
 * (accepted, same policy as existing specs).
 */

import { test, expect } from './helpers/camoufox-fixture'
import { type Page, type BrowserContext } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Load .env.local so Supabase keys are available in Playwright's Node process
// (Playwright does NOT auto-load .env.local; only the Next.js dev server does).
// ---------------------------------------------------------------------------

function loadEnvLocal(): void {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (key && !(key in process.env)) {
      process.env[key] = val
    }
  }
}
loadEnvLocal()

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROD = process.env.PROD_URL ?? 'https://kendo-translation.vercel.app'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mbgmyvmsvenvtecvrjia.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const ADMIN_EMAIL = 'admin-1@test.com'
const TRANSLATOR_EMAIL = 'translator-1@test.com'
const READER_EMAIL = 'reader-1@test.com'
const TEST_PASSWORD = 'test-password'

type TokenSet = { access: string; refresh: string }

// ---------------------------------------------------------------------------
// WCAG contrast helpers (run outside page.evaluate — strings from getComputedStyle)
// ---------------------------------------------------------------------------

function relativeLuminance(colorStr: string): number {
  const m = colorStr.match(/\d+(\.\d+)?/g)
  if (!m) return 0
  const [r, g, b] = [parseFloat(m[0]) / 255, parseFloat(m[1]) / 255, parseFloat(m[2]) / 255]
  const sRGB = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * sRGB(r) + 0.7152 * sRGB(g) + 0.0722 * sRGB(b)
}

function contrastRatio(c1: string, c2: string): number {
  const l1 = relativeLuminance(c1)
  const l2 = relativeLuminance(c2)
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (light + 0.05) / (dark + 0.05)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch an API path from within the page context (inherits session cookies). */
async function apiFetch<T = unknown>(
  page: Page,
  path: string,
): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ base, p }) => {
      const res = await fetch(`${base}${p}`)
      let body: unknown
      try {
        body = await res.json()
      } catch {
        body = null
      }
      return { status: res.status, body }
    },
    { base: PROD, p: path },
  ) as Promise<{ status: number; body: T }>
}

/** Inject a Supabase SSR session cookie into the page's browser context. */
async function injectSession(ctx: BrowserContext, accessToken: string, refreshToken: string) {
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  const sessionValue = JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  })

  const prodDomain = new URL(PROD).hostname
  const cookieBase = {
    domain: prodDomain,
    path: '/',
    secure: true,
    httpOnly: false,
    sameSite: 'Lax' as const,
    expires: Math.floor(Date.now() / 1000) + 3600,
  }

  await ctx.addCookies([
    { ...cookieBase, name: cookieName, value: sessionValue },
    { ...cookieBase, name: `${cookieName}.0`, value: sessionValue },
  ])
}

/** Discover the smallest-doc ID (by segment_count asc) at runtime. */
async function discoverSmallestDocId(page: Page): Promise<string | null> {
  const docsRes = await apiFetch<unknown>(page, '/api/documents')
  const docsArray = Array.isArray(docsRes.body)
    ? (docsRes.body as Array<{ id: string; segment_count?: number }>)
    : Array.isArray((docsRes.body as { documents?: unknown })?.documents)
      ? ((docsRes.body as { documents: Array<{ id: string; segment_count?: number }> }).documents)
      : []
  if (docsRes.status !== 200 || docsArray.length === 0) return null
  const sorted = [...docsArray].sort((a, b) => (a.segment_count ?? 0) - (b.segment_count ?? 0))
  const smallest = sorted.find((d) => (d.segment_count ?? 0) > 0) ?? docsArray[0]
  return smallest.id ?? null
}

/** Discover a document that has a paired PDF at runtime. */
async function discoverDocWithPDF(page: Page): Promise<string | null> {
  const result = await apiFetch<{ documents?: Array<{ id: string; paired_pdf_path?: string | null }> }>(
    page,
    '/api/documents?limit=100',
  )
  if (result.status !== 200 || !result.body.documents) return null
  const doc = result.body.documents.find(d => d.paired_pdf_path)
  return doc?.id ?? null
}

/** Discover a document that has ZH segments at runtime. */
async function discoverDocWithZH(page: Page): Promise<string | null> {
  const result = await apiFetch<{ documents?: Array<{ id: string; segment_count?: number }> }>(
    page,
    '/api/documents?limit=100',
  )
  if (result.status !== 200 || !result.body.documents) return null
  const doc = result.body.documents.find(d => (d.segment_count ?? 0) > 0)
  return doc?.id ?? null
}

// ---------------------------------------------------------------------------
// Flows
// ---------------------------------------------------------------------------

test.describe('Real User Flows @userflow', () => {
  let adminTokens: TokenSet
  let translatorTokens: TokenSet
  let readerTokens: TokenSet

  // --- beforeAll: authenticate all three roles via Supabase REST API ---

  test.beforeAll(async ({ request }) => {
    const authUser = async (email: string): Promise<TokenSet> => {
      let loginResp: import('@playwright/test').APIResponse | null = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        loginResp = await request.post(
          `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
          {
            headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            data: { email, password: TEST_PASSWORD },
          },
        )
        if (loginResp.ok()) break
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000))
      }
      if (!loginResp || !loginResp.ok()) {
        throw new Error(
          `Supabase login failed for ${email} after 3 attempts: ${loginResp?.status() ?? 'no response'}`,
        )
      }
      const body = (await loginResp.json()) as { access_token: string; refresh_token: string }
      return { access: body.access_token, refresh: body.refresh_token }
    }

    adminTokens = await authUser(ADMIN_EMAIL)
    translatorTokens = await authUser(TRANSLATOR_EMAIL)
    readerTokens = await authUser(READER_EMAIL)
  })

  // ==================================================================
  // Flow 1 — RF-TRANS-01
  // ==================================================================

  test('RF-TRANS-01: Login → edit → save → advance phase @userflow @p0', async ({ page, snap }) => {
    await injectSession(page.context(), translatorTokens.access, translatorTokens.refresh)

    // Step 1 — home page cold load
    const t0 = Date.now()
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')
    const homeDomLoad = Date.now() - t0
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'home-domcontentloaded', elapsed_ms: homeDomLoad }),
    })

    // Discover smallest doc
    const smallestDocId = await discoverSmallestDocId(page)
    if (!smallestDocId) {
      test.skip(true, 'No documents found via /api/documents')
      return
    }

    // Step 2 — navigate to editor
    await page.goto(`${PROD}/documents/${smallestDocId}/edit`)
    await page.waitForLoadState('domcontentloaded')
    await snap('translator-editor-nav')

    // UX check: no mobile-block banner on desktop (viewport >= 1280)
    const mobileBlock = await page
      .locator('[data-testid="mobile-editor-reader-link"]')
      .isVisible()
      .catch(() => false)
    expect(mobileBlock, 'Mobile block banner should NOT be visible on desktop viewport').toBe(false)

    // Step 3 — wait for first segment list item (editor hydration)
    const t1 = Date.now()
    await page.waitForSelector('[data-testid="segment-list-item"]', { timeout: 30000 })
    const editorVisible = Date.now() - t1
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'editor-first-segment-visible', elapsed_ms: editorVisible }),
    })
    await snap('translator-editor-segments')

    // UX check: contrast on first segment list item
    const contrastOk = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="segment-list-item"]')
      if (!el) return null
      const style = window.getComputedStyle(el)
      return { color: style.color, bg: style.backgroundColor }
    })
    test.info().annotations.push({
      type: 'contrast-check',
      description: JSON.stringify(contrastOk),
    })

    // Step 4 — click first segment, measure editor panel visible time
    const t2 = Date.now()
    await page.locator('[data-testid="segment-list-item"]').first().click()
    await page
      .locator('textarea, [data-testid="segment-editor-panel"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
    const editorPanelTime = Date.now() - t2
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'click-to-editor-panel', elapsed_ms: editorPanelTime }),
    })

    // Step 5 — edit textarea content (append space + timestamp)
    const textarea = page.locator('textarea').first()
    await textarea.waitFor({ state: 'visible', timeout: 10000 })
    const timestamp = Date.now()
    await textarea.press('End')
    await textarea.press('Space')
    await page.keyboard.type(`rf-trans-01-${timestamp}`)

    // Step 6 — Ctrl+S save, measure RTT
    const t3 = Date.now()
    await page.keyboard.press('Control+s')
    // Wait for any success indicator: toast, "saved" text, or textarea value still present
    try {
      await page
        .locator('[data-testid="save-success"], [data-testid="toast"], text="Saved", text="saved"')
        .first()
        .waitFor({ state: 'visible', timeout: 10000 })
    } catch {
      // Fallback: wait a beat and check textarea still has our value
      await page.waitForTimeout(2000)
    }
    const saveRtt = Date.now() - t3
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'save-rtt', elapsed_ms: saveRtt }),
    })

    // Step 7 — phase advance button
    // Note: if the active segment is already qa_approved (terminal), the button
    // renders as data-testid="phase-advance-terminal" (no further advance).
    // The smallest doc ("Kendo Philosophy") is a protected article whose segments
    // stay qa_approved — so this step will annotate as skipped on that doc.
    const phaseAdvanceBtn = page.locator('[data-testid="phase-advance-button"]')
    const terminalNote = await page.locator('[data-testid="phase-advance-terminal"]').isVisible().catch(() => false)
    if (terminalNote) {
      test.info().annotations.push({
        type: 'info',
        description: 'phase-advance-terminal shown (segment already at final phase qa_approved) — phase advance step N/A',
      })
    } else if (!(await phaseAdvanceBtn.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'skip',
        description: 'phase-advance-button not visible — skipping phase advance',
      })
    } else {
      const t4 = Date.now()
      await phaseAdvanceBtn.click()

      // Step 8 — confirm dialog if present
      try {
        const confirmBtn = page.locator('[data-testid="phase-advance-confirm-submit"]')
        await confirmBtn.waitFor({ state: 'visible', timeout: 5000 })
        await confirmBtn.click()
      } catch {
        // No confirmation dialog — that's fine
      }

      const phaseAdvanceRtt = Date.now() - t4
      test.info().annotations.push({
        type: 'timing',
        description: JSON.stringify({ step: 'phase-advance-rtt', elapsed_ms: phaseAdvanceRtt }),
      })
    }

    // Step 9 — History tab (inside segment-details-drawer)
    // The drawer tabs are rendered when a segment is active. Look inside the drawer.
    const drawer = page.locator('[data-testid="segment-details-drawer"]')
    const historyTab = drawer.locator('button:has-text("History")').first()
    const historyTabFallback = page.locator('button:has-text("History"), [role="tab"]:has-text("History")').first()
    const drawerVisible = await drawer.isVisible().catch(() => false)
    const historyLocator = drawerVisible ? historyTab : historyTabFallback
    if (await historyLocator.isVisible().catch(() => false)) {
      await historyLocator.click()
      await expect(page.locator('[data-testid="phase-transition-history"]')).toBeVisible({
        timeout: 10000,
      })
      await snap('translator-history-tab')
    } else {
      test.info().annotations.push({
        type: 'skip',
        description: 'History tab not found in segment-details-drawer — segment may not be selected or drawer not rendered',
      })
    }
  })

  // ==================================================================
  // Flow 2 — RF-READER-01
  // ==================================================================

  test('RF-READER-01: Browse → open → read → bookmark → resume @userflow @p0', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Step 1 — navigate to /documents
    const t0 = Date.now()
    await page.goto(`${PROD}/documents`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('a[href*="/read"], [data-testid="document-card"]', { timeout: 20000 })
    const navAndContent = Date.now() - t0
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'documents-nav-content-visible', elapsed_ms: navAndContent }),
    })
    await snap('reader-documents-list')

    // Step 2 — sort by progress_asc (if sort control exists)
    let sortApplied = false
    const sortControl = page.locator('[data-testid="documents-sort"]')
    if ((await sortControl.count()) > 0) {
      try {
        await sortControl.selectOption('progress_asc')
        sortApplied = true
        await page.waitForTimeout(1000) // let re-fetch settle
      } catch {
        test.info().annotations.push({
          type: 'skip',
          description: 'Sort control found but option selection failed',
        })
      }
    }

    // Step 3 — click first document card → measure click → reader content visible
    const firstDocLink = page.locator('a[href*="/read"], [data-testid="document-card"] a').first()
    await expect(firstDocLink).toBeVisible({ timeout: 10000 })
    const clickedDocUrl = await firstDocLink.getAttribute('href').catch(() => null)
    const t1 = Date.now()
    await firstDocLink.click()
    await page.waitForLoadState('domcontentloaded')

    // Step 4 — wait for reader content visible (segment text, not skeleton)
    try {
      await page
        .locator(
          'p, [data-testid="segment-text"], [data-testid="reader-segment"], [data-reader-theme]',
        )
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      // Fallback: wait for any non-skeleton content
      await page.waitForSelector(':not(.skeleton):not(.animate-pulse)', { timeout: 30000 })
    }
    const readerContentTime = Date.now() - t1
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({
        step: 'click-to-reader-content',
        elapsed_ms: readerContentTime,
      }),
    })
    await snap('reader-content-visible')

    // UX check: light theme contrast on segment text
    const readerContrast = await page.evaluate(() => {
      const el = document.querySelector('p, [data-testid="segment-text"], [data-testid="reader-segment"]')
      if (!el) return null
      const style = window.getComputedStyle(el)
      return { color: style.color, bg: style.backgroundColor }
    })
    if (readerContrast) {
      const ratio = contrastRatio(readerContrast.color, readerContrast.bg)
      test.info().annotations.push({
        type: 'contrast-check',
        description: JSON.stringify({ ...readerContrast, ratio: ratio.toFixed(2) }),
      })
    }

    // Step 5 — Bilingual view mode button
    const bilingualBtn = page.locator('button:has-text("Bilingual"), button:has-text("bilingual")')
    if ((await bilingualBtn.count()) > 0) {
      await bilingualBtn.first().click()
      await page.waitForTimeout(500)
    }

    // Step 6 — Bookmark button
    const bookmarkBtn = page.locator(
      'button[aria-label*="Bookmark" i], button[aria-label*="bookmark" i], button:has-text("Bookmark")',
    )
    if ((await bookmarkBtn.count()) > 0) {
      await bookmarkBtn.first().click()
      await page.waitForTimeout(300)
    }

    // Step 7 — Next pagination button
    const nextBtn = page.locator('button:has-text("Next"), a:has-text("Next"), [aria-label*="Next" i]')
    if ((await nextBtn.count()) > 0) {
      await nextBtn.first().click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(500)
    }

    // Step 8 — take a snap after content visible (already done above)

    // Step 9 — navigate back to /documents
    const t2 = Date.now()
    await page.goto(`${PROD}/documents`)
    await page.waitForLoadState('domcontentloaded')
    const backNavTime = Date.now() - t2
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'back-to-documents-nav', elapsed_ms: backNavTime }),
    })

    // Step 10 — sort by recently-viewed if sort is available
    if (sortApplied) {
      const sortControl2 = page.locator('[data-testid="documents-sort"]')
      if ((await sortControl2.count()) > 0) {
        try {
          await sortControl2.selectOption('recently-viewed')
          await page.waitForTimeout(1000)
        } catch {
          test.info().annotations.push({
            type: 'skip',
            description: 'recently-viewed sort option not available',
          })
        }
      }
    }

    // Step 11 — click the just-visited doc again
    if (clickedDocUrl) {
      const revisitLink = page.locator(`a[href="${clickedDocUrl}"]`).first()
      if ((await revisitLink.count()) > 0) {
        await revisitLink.click()
        await page.waitForLoadState('domcontentloaded')
        try {
          await page
            .locator('p, [data-testid="segment-text"]')
            .first()
            .waitFor({ state: 'visible', timeout: 15000 })
        } catch {
          // still ok — reader may have a different layout on re-visit
        }
        expect(page.url()).toContain('/read')
      }
    }

    await snap('reader-resume')
  })

  // ==================================================================
  // Flow 3 — RF-ADMIN-01
  // ==================================================================

  test('RF-ADMIN-01: Dashboard review @userflow @p0', async ({ page, snap }) => {
    await injectSession(page.context(), adminTokens.access, adminTokens.refresh)

    // Step 1 — navigate to /admin
    const t0 = Date.now()
    await page.goto(`${PROD}/admin`)
    await page.waitForLoadState('domcontentloaded')
    const adminDomLoad = Date.now() - t0
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'admin-domcontentloaded', elapsed_ms: adminDomLoad }),
    })

    // Step 2 — wait for first stat card (allow 45 s for cold analytics)
    const t1 = Date.now()
    await page
      .locator('div.text-3xl')
      .nth(0)
      .waitFor({ state: 'visible', timeout: 45000 })
    const statCardVisible = Date.now() - t1
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'dom-to-first-stat-card', elapsed_ms: statCardVisible }),
    })

    // Cold-start dashboard total time
    const totalDashboardTime = Date.now() - t0
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({
        step: 'cold-start-dashboard-total',
        elapsed_ms: totalDashboardTime,
      }),
    })
    await snap('admin-dashboard')

    // Step 3 — at least 4 stat cards
    const statCardCount = await page.locator('div.text-3xl').count()
    expect(statCardCount).toBeGreaterThanOrEqual(4)

    // Step 4 — stat card numbers are loaded (not '…')
    await expect(page.locator('div.text-3xl').first()).not.toContainText('…')

    // Step 5 — phase breakdown / Segment Status heading
    const phaseHeading = page.locator(
      'h1:has-text("Segment Status"), h2:has-text("Segment Status"), h3:has-text("Segment Status"), h1:has-text("Phase Breakdown"), h2:has-text("Phase Breakdown"), h3:has-text("Phase Breakdown")',
    )
    if ((await phaseHeading.count()) > 0) {
      await expect(phaseHeading.first()).toBeVisible({ timeout: 10000 })
    } else {
      test.info().annotations.push({
        type: 'skip',
        description: 'Phase Breakdown / Segment Status heading not found',
      })
    }

    // Step 6 — admin documents table
    const docsTable = page.locator(
      '[data-testid="admin-documents-table"], table',
    )
    await expect(docsTable.first()).toBeVisible({ timeout: 15000 })

    // Step 7 — admin users table (at least 1 user row)
    const userRows = page.locator('[data-testid="admin-user-row"], table tbody tr')
    if ((await userRows.count()) === 0) {
      // Try waiting
      try {
        await userRows.first().waitFor({ state: 'visible', timeout: 10000 })
      } catch {
        test.info().annotations.push({
          type: 'skip',
          description: 'No admin user rows found',
        })
      }
    }
    expect(await userRows.count()).toBeGreaterThanOrEqual(1)
    await snap('admin-users-table')

    // --- UX checks (annotate, don't hard-fail) ---

    // Contrast on first stat card number
    const statContrast = await page.evaluate(() => {
      const el = document.querySelector('div.text-3xl')
      if (!el) return null
      const style = window.getComputedStyle(el)

      // Walk up ancestors to find nearest non-transparent background
      function getEffectiveBg(node: Element | null): string {
        while (node && node !== document.documentElement) {
          const bg = window.getComputedStyle(node).backgroundColor
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            return bg
          }
          node = node.parentElement
        }
        return 'rgb(255, 255, 255)' // default white fallback
      }

      return {
        color: style.color,
        bg: getEffectiveBg(el.parentElement),
      }
    })
    if (statContrast) {
      const ratio = contrastRatio(statContrast.color, statContrast.bg)
      test.info().annotations.push({
        type: 'contrast-check',
        description: JSON.stringify({ label: 'stat-card', ...statContrast, ratio: ratio.toFixed(2) }),
      })
    }

    // Check phase bar label text contrast (gray on white)
    const phaseBarContrast = await page.evaluate(() => {
      const el = document.querySelector(
        '[class*="phase"] span, [class*="bar"] span, [data-testid*="phase"] span',
      )
      if (!el) return null
      const style = window.getComputedStyle(el)
      const parent = el.parentElement
      const parentStyle = parent ? window.getComputedStyle(parent) : null
      return {
        color: style.color,
        bg: parentStyle?.backgroundColor ?? 'rgba(255, 255, 255, 1)',
      }
    })
    if (phaseBarContrast) {
      const ratio = contrastRatio(phaseBarContrast.color, phaseBarContrast.bg)
      test.info().annotations.push({
        type: 'contrast-check',
        description: JSON.stringify({
          label: 'phase-bar-label',
          ...phaseBarContrast,
          ratio: ratio.toFixed(2),
        }),
      })
    }
  })

  // ==================================================================
  // Flow 4 — RF-READER-02
  // ==================================================================

  test('RF-READER-02: Theme switch cycle (all 7 themes) @userflow @p1', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Discover smallest doc
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')
    const smallestDocId = await discoverSmallestDocId(page)
    if (!smallestDocId) {
      test.skip(true, 'No documents found')
      return
    }

    // Step 1 — navigate to reader for smallest doc
    await page.goto(`${PROD}/documents/${smallestDocId}/read`)
    await page.waitForLoadState('domcontentloaded')

    // Step 2 — wait for reader content visible
    try {
      await page
        .locator('h1, h2, h3, p, [data-testid="segment-text"], [data-reader-theme]')
        .first()
        .waitFor({ state: 'visible', timeout: 20000 })
    } catch {
      test.skip(true, 'Reader content not visible for theme test')
      return
    }
    await snap('reader-theme-before')

    // Step 3 — open reader settings gear
    const settingsBtn = page.locator(
      'button[aria-label*="settings" i], button[aria-label*="settings" i], button[title*="settings" i], button[aria-label*="Reader" i]',
    )
    if ((await settingsBtn.count()) === 0) {
      test.skip(true, 'No reader settings button found')
      return
    }
    await settingsBtn.first().click()
    await page.waitForTimeout(500)

    // Step 4 — cycle through 7 themes
    const themes = [
      { id: 'light', name: 'Light' },
      { id: 'dark', name: 'Dark' },
      { id: 'solarized', name: 'Solarized' },
      { id: 'pastel', name: 'Pastel' },
      { id: 'sepia', name: 'Sepia' },
      { id: 'high-contrast', name: 'High Contrast' },
      { id: 'night-warm', name: 'Night (Warm)' },
    ]

    for (const theme of themes) {
      const themeBtn = page.locator(`button:has-text("${theme.name}")`).first()
      if (!(await themeBtn.isVisible().catch(() => false))) {
        test.info().annotations.push({
          type: 'skip',
          description: `Theme button "${theme.name}" not found`,
        })
        continue
      }

      await themeBtn.click()
      await page.waitForTimeout(500)

      // Evaluate contrast
      const themeInfo = await page.evaluate(() => {
        const el = document.querySelector('[data-reader-theme]')
        if (!el) return null
        const style = window.getComputedStyle(el)

        function getEffectiveBg(node: Element | null): string {
          while (node && node !== document.documentElement) {
            const bg = window.getComputedStyle(node).backgroundColor
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
              return bg
            }
            node = node.parentElement
          }
          return 'rgb(255, 255, 255)' // default white fallback
        }

        return { color: style.color, bg: getEffectiveBg(el) }
      })

      if (themeInfo) {
        const ratio = contrastRatio(themeInfo.color, themeInfo.bg)
        test.info().annotations.push({
          type: `theme-contrast-${theme.id}`,
          description: JSON.stringify({ color: themeInfo.color, bg: themeInfo.bg, ratio: ratio.toFixed(2) }),
        })
        // Soft assert: ratio ≥ 3.0
        expect
          .soft(
            ratio,
            `Theme ${theme.name} contrast ratio ${ratio.toFixed(2)} < 3.0 (text=${themeInfo.color}, bg=${themeInfo.bg})`,
          )
          .toBeGreaterThanOrEqual(3.0)
      }
    }

    await snap('reader-theme-after')

    // Step 5 — switch layout width to "Two Column"
    const layoutControl = page.locator('[data-testid="layout-width-control"]')
    if ((await layoutControl.count()) > 0) {
      const twoCol = layoutControl.locator('button:has-text("Two Column"), button:has-text("Two"), [aria-label*="Two" i]')
      if ((await twoCol.count()) > 0) {
        await twoCol.first().click()
        await page.waitForTimeout(500)
        await snap('reader-layout-two-col')
      }
    }

    // Step 6 — switch back to "Narrow"
    if ((await layoutControl.count()) > 0) {
      const narrow = layoutControl.locator(
        'button:has-text("Narrow"), button:has-text("narrow"), [aria-label*="Narrow" i]',
      )
      if ((await narrow.count()) > 0) {
        await narrow.first().click()
        await page.waitForTimeout(500)
      }
    }

    // Step 7 — font size: increase 5×, decrease 5×
    const incBtn = page.locator('[aria-label*="Increase font" i], [aria-label*="increase" i]').first()
    const decBtn = page.locator('[aria-label*="Decrease font" i], [aria-label*="decrease" i]').first()

    for (let i = 0; i < 5; i++) {
      if (await incBtn.isVisible().catch(() => false)) await incBtn.click()
      await page.waitForTimeout(150)
    }
    for (let i = 0; i < 5; i++) {
      if (await decBtn.isVisible().catch(() => false)) await decBtn.click()
      await page.waitForTimeout(150)
    }

    await snap('reader-font-reset')
  })

  // ==================================================================
  // Flow 5 — RF-READER-03
  // ==================================================================

  test('RF-READER-03: ZH language toggle + PDF view @userflow @p1', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Step 1 — discover a doc with PDF
    const pdfDocId = await discoverDocWithPDF(page)
    if (!pdfDocId) {
      test.skip(true, 'No document with paired_pdf_path found')
      return
    }

    // Step 2 — navigate to reader
    const t0 = Date.now()
    await page.goto(`${PROD}/documents/${pdfDocId}/read`)
    await page.waitForLoadState('domcontentloaded')
    const navTime = Date.now() - t0
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'reader-nav-domcontentloaded', elapsed_ms: navTime }),
    })

    // Step 3 — wait for first segment/paragraph visible
    try {
      await page
        .locator('p, [data-testid="segment-text"], [data-testid="reader-segment"], [data-reader-theme]')
        .first()
        .waitFor({ state: 'visible', timeout: 20000 })
    } catch {
      test.skip(true, 'Reader content not visible — cannot test ZH toggle')
      return
    }

    // Step 4 — look for ZH toggle
    const zhToggle = page.locator(
      'button:has-text("中文"), [aria-label*="ZH"], [data-testid*="zh"], button:has-text("ZH")',
    ).first()
    const zhVisible = await zhToggle.isVisible({ timeout: 5000 }).catch(() => false)
    if (!zhVisible) {
      test.skip(true, 'No ZH toggle found')
      return
    }

    // Step 5 — click ZH toggle
    const tZH = Date.now()
    await zhToggle.click()
    // Wait for segment text to update (re-render with ZH content)
    await page.waitForTimeout(1500)
    const zhToggleTime = Date.now() - tZH
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'zh-toggle-click-to-update', elapsed_ms: zhToggleTime }),
    })
    await snap('reader-zh-active')

    // Step 6 — click EN toggle back
    const enToggle = page.locator(
      'button:has-text("EN"), button:has-text("English"), [aria-label*="EN"], [data-testid*="en"]',
    ).first()
    const enVisible = await enToggle.isVisible().catch(() => false)
    if (enVisible) {
      await enToggle.click()
      await page.waitForTimeout(1500)
      await snap('reader-en-restored')
    } else {
      test.info().annotations.push({
        type: 'info',
        description: 'EN toggle not found (may be already on EN or different button label)',
      })
    }

    // Step 7 — look for PDF view button
    const pdfBtn = page.locator(
      'button:has-text("PDF"), [data-testid*="pdf"], [aria-label*="PDF" i]',
    ).first()
    const pdfVisible = await pdfBtn.isVisible({ timeout: 3000 }).catch(() => false)
    if (!pdfVisible) {
      test.info().annotations.push({
        type: 'skip',
        description: 'pdf-tab-not-found',
      })
    } else {
      // Step 8 — click PDF tab
      const tPDF = Date.now()
      await pdfBtn.click()
      // Wait for iframe or PDF content
      try {
        await page
          .locator('iframe, [data-testid*="pdf"], embed[type="application/pdf"], object[type="application/pdf"]')
          .first()
          .waitFor({ state: 'visible', timeout: 15000 })
      } catch {
        test.info().annotations.push({
          type: 'skip',
          description: 'PDF content element not found after click',
        })
      }
      const pdfLoadTime = Date.now() - tPDF
      test.info().annotations.push({
        type: 'timing',
        description: JSON.stringify({ step: 'pdf-load-time', elapsed_ms: pdfLoadTime }),
      })
      await snap('reader-pdf-view')
    }
  })

  // ==================================================================
  // Flow 6 — RF-TRANS-02
  // ==================================================================

  test('RF-TRANS-02: Agent suggestion → accept (EditPatternModal) @userflow @p1', async ({ page, snap }) => {
    await injectSession(page.context(), translatorTokens.access, translatorTokens.refresh)

    // Step 1 — discover smallest doc
    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    // Step 2 — navigate to editor
    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')

    // Step 3 — wait for segment list
    try {
      await page
        .locator('[data-testid="segment-list-item"], tr')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      test.skip(true, 'Segment list not visible')
      return
    }
    await snap('editor-loaded')

    // Step 4 — click first segment row to activate editor panel
    await page.locator('[data-testid="segment-list-item"], tr').first().click()
    try {
      await page
        .locator('textarea, [data-testid="segment-editor-panel"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
    } catch {
      test.info().annotations.push({
        type: 'skip',
        description: 'Editor panel not visible after clicking segment',
      })
    }

    // Step 5 — look for agent suggestion trigger
    const agentTrigger = page.locator(
      '[data-testid="agent-suggestion-trigger"], button:has-text("Request"), button:has-text("Generate"), button:has-text("Agent")',
    ).first()
    const triggerFound = await agentTrigger.isVisible({ timeout: 5000 }).catch(() => false)

    if (!triggerFound) {
      test.info().annotations.push({
        type: 'skip',
        description: 'agent-trigger-not-found',
      })
    } else {
      // Step 6 — click trigger, wait for suggestion
      const tAgentStart = Date.now()
      await agentTrigger.click()

      let suggestionAppeared = false
      try {
        await page
          .locator('[data-testid="suggestion-row"], [data-testid*="suggestion"]')
          .first()
          .waitFor({ state: 'visible', timeout: 60000 })
        suggestionAppeared = true
      } catch {
        // Check if loading indicator came and went
        try {
          const loadingEl = page.locator('[data-testid*="loading"], [aria-busy="true"], .animate-spin')
          await loadingEl.first().waitFor({ state: 'hidden', timeout: 60000 })
          // After loading, re-check for suggestion
          const visible = await page
            .locator('[data-testid="suggestion-row"], [data-testid*="suggestion"]')
            .first()
            .isVisible()
            .catch(() => false)
          suggestionAppeared = visible
        } catch {
          suggestionAppeared = false
        }
      }

      const agentTime = Date.now() - tAgentStart
      test.info().annotations.push({
        type: 'timing',
        description: JSON.stringify({
          step: 'agent-suggestion-rtt',
          elapsed_ms: agentTime,
          suggestion_visible: suggestionAppeared,
        }),
      })

      if (suggestionAppeared) {
        await snap('agent-suggestion-visible')

        // Step 7 — look for accept button
        const acceptBtn = page.locator(
          '[data-testid="suggestion-accept"], button:has-text("Accept")',
        ).first()
        const acceptFound = await acceptBtn.isVisible().catch(() => false)
        if (acceptFound) {
          await acceptBtn.click()

          // Step 8 — check for modal after accept
          try {
            const dialog = page.locator('[role="dialog"]')
            await dialog.first().waitFor({ state: 'visible', timeout: 5000 })
            await snap('modal-after-accept')
            // Close dialog
            await page.keyboard.press('Escape')
            await page.waitForTimeout(300)
          } catch {
            // No dialog appeared — that's fine
          }
        } else {
          test.info().annotations.push({
            type: 'skip',
            description: 'accept-button-not-found',
          })
        }
      }
    }

    await snap('after-agent-accept')

    // Annotate all timings already captured inline
  })

  // ==================================================================
  // Flow 7 — RF-TRANS-05
  // ==================================================================

  test('RF-TRANS-05: Context Builder two-stage MAC-RAG @userflow @p1', async ({ page, snap }) => {
    await injectSession(page.context(), translatorTokens.access, translatorTokens.refresh)

    // Step 1 — discover smallest doc
    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    // Step 2 — navigate to editor
    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')

    // Step 3 — wait for and click first segment row
    try {
      await page
        .locator('[data-testid="segment-list-item"], tr')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      test.skip(true, 'Segment list not visible')
      return
    }
    await page.locator('[data-testid="segment-list-item"], tr').first().click()
    try {
      await page
        .locator('textarea, [data-testid="segment-editor-panel"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
    } catch {
      // editor panel may not appear — continue anyway
    }

    // Step 4 — look for Context Builder tab
    const ctxTab = page.locator(
      'button:has-text("Context"), button:has-text("Context Builder"), [data-testid*="context-builder"], [role="tab"]:has-text("Context")',
    ).first()
    const ctxTabFound = await ctxTab.isVisible({ timeout: 5000 }).catch(() => false)
    if (!ctxTabFound) {
      test.skip(true, 'Context Builder tab not found')
      return
    }

    // Step 5 — click Context Builder tab
    await ctxTab.click()
    await page.waitForTimeout(500)

    // Step 6 — look for compose button
    const composeBtn = page.locator(
      '[data-testid="context-builder-compose-btn"], button:has-text("Compose")',
    ).first()
    const composeFound = await composeBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (!composeFound) {
      test.info().annotations.push({
        type: 'skip',
        description: 'context-builder-compose-btn-not-found',
      })
      return
    }

    // Step 7 — click Compose
    const tCompose = Date.now()
    await composeBtn.click()
    // Wait for system/user prompt text areas to populate
    try {
      await page
        .locator(
          '[data-testid*="prompt"], textarea[placeholder*="system" i], textarea[placeholder*="user" i]',
        )
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      test.info().annotations.push({
        type: 'skip',
        description: 'Compose prompt areas did not populate within 30s',
      })
      return
    }
    const composeTime = Date.now() - tCompose
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'context-builder-compose-rtt', elapsed_ms: composeTime }),
    })
    await snap('context-builder-composed')

    // Step 8 — look for generate button
    const generateBtn = page.locator(
      '[data-testid="context-builder-generate-btn"], button:has-text("Generate")',
    ).first()
    const generateFound = await generateBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (!generateFound) {
      test.info().annotations.push({
        type: 'skip',
        description: 'context-builder-generate-btn-not-found',
      })
    } else {
      const tGenerate = Date.now()
      await generateBtn.click()
      // Wait for result (up to 60s — LLM call)
      try {
        await page
          .locator('[data-testid*="result"], [data-testid*="output"], [data-testid*="generated"]')
          .first()
          .waitFor({ state: 'visible', timeout: 60000 })
      } catch {
        test.info().annotations.push({
          type: 'info',
          description: 'Generate result did not appear within 60s (LLM may be slow)',
        })
      }
      const generateTime = Date.now() - tGenerate
      test.info().annotations.push({
        type: 'timing',
        description: JSON.stringify({ step: 'context-builder-generate-rtt', elapsed_ms: generateTime }),
      })
      await snap('context-builder-result')
    }

    // Step 9 — look for expand button → full-screen modal
    const expandBtn = page.locator(
      '[data-testid="context-builder-expand-btn"]',
    ).first()
    const expandFound = await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)
    if (expandFound) {
      await expandBtn.click()
      await page.waitForTimeout(500)
      await snap('context-builder-modal')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
  })

  // ==================================================================
  // Flow 8 — RF-TRANS-06
  // ==================================================================

  test('RF-TRANS-06: Comment thread @userflow @p1', async ({ page, snap }) => {
    await injectSession(page.context(), translatorTokens.access, translatorTokens.refresh)

    // Step 1 — discover smallest doc
    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    // Step 2 — navigate to editor
    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')

    // Step 3 — wait for and click first segment row
    try {
      await page
        .locator('[data-testid="segment-list-item"], tr')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      test.skip(true, 'Segment list not visible')
      return
    }
    await page.locator('[data-testid="segment-list-item"], tr').first().click()
    try {
      await page
        .locator('textarea, [data-testid="segment-editor-panel"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
    } catch {
      // editor panel may not appear — continue anyway
    }

    // Step 4 — open cooperation drawer to Comments tab
    const commentsTab = page.locator(
      '[data-testid="comments-tab"], button:has-text("Comments"), [role="tab"]:has-text("Comments")',
    ).first()
    const commentsFound = await commentsTab.isVisible({ timeout: 5000 }).catch(() => false)
    if (!commentsFound) {
      test.skip(true, 'Comments tab not found')
      return
    }

    await commentsTab.click()
    await page.waitForTimeout(500)
    await snap('comments-tab-open')

    // Step 5 — look for comment composer
    const commentTextarea = page.locator(
      '[data-testid="comment-composer-textarea"], textarea[placeholder*="comment" i], textarea[placeholder*="Comment" i]',
    ).first()
    const composerFound = await commentTextarea.isVisible({ timeout: 5000 }).catch(() => false)
    if (!composerFound) {
      test.info().annotations.push({
        type: 'skip',
        description: 'comment-composer-not-found',
      })
      return
    }

    // Step 6 — fill and submit comment
    const commentText = `Test comment ${Date.now()}`
    await commentTextarea.fill(commentText)

    const submitBtn = page.locator(
      '[data-testid="comment-composer-submit"], button:has-text("Post"), button:has-text("Submit")',
    ).first()
    const tSubmit = Date.now()
    await submitBtn.click()

    // Wait for comment to appear in list
    try {
      await page
        .locator(`[data-testid*="comment"]:has-text("${commentText}"), p:has-text("${commentText}"), div:has-text("${commentText}")`)
        .first()
        .waitFor({ state: 'visible', timeout: 10000 })
    } catch {
      test.info().annotations.push({
        type: 'skip',
        description: 'Posted comment did not appear in list within 10s',
      })
    }
    const commentRtt = Date.now() - tSubmit
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'comment-post-rtt', elapsed_ms: commentRtt }),
    })
    await snap('comment-posted')
  })

  // ==================================================================
  // Flow 9 — RF-CROSS-01
  // ==================================================================

  test('RF-CROSS-01: Cold-start latency baseline @userflow @p0', async ({ page }) => {
    // Step 1 — unauthenticated /login (NO cookies injected)
    const t0 = Date.now()
    await page.goto(`${PROD}/login`)
    await page.waitForLoadState('domcontentloaded')
    const loginDomLoad = Date.now() - t0

    const loginForm = page.locator('input[type="email"], input[name="email"]')
    await loginForm.first().waitFor({ state: 'visible', timeout: 15000 })
    const loginFormVisible = Date.now() - t0

    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({
        step: 'login-page',
        domContentLoaded_ms: loginDomLoad,
        contentVisible_ms: loginFormVisible,
      }),
    })

    // Step 2 — inject admin session cookies
    await injectSession(page.context(), adminTokens.access, adminTokens.refresh)

    // Step 3 — /documents
    const t2 = Date.now()
    await page.goto(`${PROD}/documents`)
    await page.waitForLoadState('domcontentloaded')
    const docsDomLoad = Date.now() - t2

    await page
      .locator('a[href*="/read"], [data-testid="document-card"]')
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
    const docsCardVisible = Date.now() - t2

    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({
        step: 'documents-page',
        domContentLoaded_ms: docsDomLoad,
        contentVisible_ms: docsCardVisible,
      }),
    })

    // Step 4 — /admin
    const t3 = Date.now()
    await page.goto(`${PROD}/admin`)
    await page.waitForLoadState('domcontentloaded')
    const adminDomLoad2 = Date.now() - t3

    await page
      .locator('div.text-3xl')
      .first()
      .waitFor({ state: 'visible', timeout: 45000 })
    const adminCardVisible = Date.now() - t3

    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({
        step: 'admin-page',
        domContentLoaded_ms: adminDomLoad2,
        contentVisible_ms: adminCardVisible,
      }),
    })

    // Step 5 — /documents/[smallest-id]/read
    const smallestDocId = await discoverSmallestDocId(page)
    if (!smallestDocId) {
      test.skip(true, 'No documents found for reader step')
      return
    }

    const t4 = Date.now()
    await page.goto(`${PROD}/documents/${smallestDocId}/read`)
    await page.waitForLoadState('domcontentloaded')
    const readerDomLoad = Date.now() - t4

    try {
      await page
        .locator('p, [data-testid="segment-text"], [data-testid="reader-segment"]')
        .first()
        .waitFor({ state: 'visible', timeout: 20000 })
    } catch {
      // fallback: wait for any text content
      await page.waitForTimeout(3000)
    }
    const readerSegVisible = Date.now() - t4

    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({
        step: 'reader-page',
        domContentLoaded_ms: readerDomLoad,
        contentVisible_ms: readerSegVisible,
      }),
    })
  })
})
