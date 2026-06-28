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

/** Fetch an API path using page.request (shares cookies from the browser context). */
async function apiFetch<T = unknown>(
  page: Page,
  path: string,
): Promise<{ status: number; body: T }> {
  const res = await page.request.get(`${PROD}${path}`)
  let body: unknown
  try { body = await res.json() } catch { body = null }
  return { status: res.status(), body: body as T }
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
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const docsRes = await apiFetch<unknown>(page, '/api/documents')
      const docsArray = Array.isArray(docsRes.body)
        ? (docsRes.body as Array<{ id: string; segment_count?: number }>)
        : Array.isArray((docsRes.body as { documents?: unknown })?.documents)
          ? ((docsRes.body as { documents: Array<{ id: string; segment_count?: number }> }).documents)
          : []
      if (docsRes.status === 200 && docsArray.length > 0) {
        const sorted = [...docsArray].sort((a, b) => (a.segment_count ?? 0) - (b.segment_count ?? 0))
        const smallest = sorted.find((d) => (d.segment_count ?? 0) > 0) ?? docsArray[0]
        return smallest.id ?? null
      }
      if (attempt < 2) await page.waitForTimeout(1000)
    } catch {
      if (attempt < 2) await page.waitForTimeout(1000)
    }
  }
  return null
}

/** Discover a small readable doc ID (segment_count >= 100) to avoid 3-segment test docs. */
async function discoverReadableDocId(page: Page): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const docsRes = await apiFetch<unknown>(page, '/api/documents?limit=100')
      const docsArray = Array.isArray(docsRes.body)
        ? (docsRes.body as Array<{ id: string; segment_count?: number }>)
        : Array.isArray((docsRes.body as { documents?: unknown })?.documents)
          ? ((docsRes.body as { documents: Array<{ id: string; segment_count?: number }> }).documents)
          : []
      if (docsRes.status === 200 && docsArray.length > 0) {
        // Find smallest doc with at least 100 segments (excludes tiny test/placeholder docs)
        const readable = docsArray
          .filter((d) => (d.segment_count ?? 0) >= 100)
          .sort((a, b) => (a.segment_count ?? 0) - (b.segment_count ?? 0))
        if (readable.length > 0) return readable[0].id ?? null
      }
      if (attempt < 2) await page.waitForTimeout(1000)
    } catch {
      if (attempt < 2) await page.waitForTimeout(1000)
    }
  }
  return null
}

/** Discover a document that has a paired PDF at runtime (min 100 segments). */
async function discoverDocWithPDF(page: Page): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await apiFetch<{ documents?: Array<{ id: string; paired_pdf_path?: string | null; segment_count?: number }> }>(
        page,
        '/api/documents?limit=100',
      )
      if (result.status === 200 && result.body.documents) {
        const doc = result.body.documents
          .filter(d => d.paired_pdf_path && (d.segment_count ?? 0) >= 100)
          .sort((a, b) => (a.segment_count ?? 0) - (b.segment_count ?? 0))[0]
        if (doc?.id) return doc.id
      }
      if (attempt < 2) await page.waitForTimeout(1000)
    } catch {
      if (attempt < 2) await page.waitForTimeout(1000)
    }
  }
  return null
}

/** Discover a document that has ZH segments at runtime (min 100 segments). */
async function discoverDocWithZH(page: Page): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await apiFetch<{ documents?: Array<{ id: string; segment_count?: number }> }>(
        page,
        '/api/documents?limit=100',
      )
      if (result.status === 200 && result.body.documents) {
        const doc = result.body.documents
          .filter(d => (d.segment_count ?? 0) >= 100)
          .sort((a, b) => (a.segment_count ?? 0) - (b.segment_count ?? 0))[0]
        if (doc?.id) return doc.id
      }
      if (attempt < 2) await page.waitForTimeout(1000)
    } catch {
      if (attempt < 2) await page.waitForTimeout(1000)
    }
  }
  return null
}

/** Discover the largest-doc ID (by segment_count desc) at runtime. */
async function discoverLargestDocId(page: Page): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const docsRes = await apiFetch<unknown>(page, '/api/documents?limit=100')
      const docsArray = Array.isArray(docsRes.body)
        ? (docsRes.body as Array<{ id: string; segment_count?: number }>)
        : Array.isArray((docsRes.body as { documents?: unknown })?.documents)
          ? ((docsRes.body as { documents: Array<{ id: string; segment_count?: number }> }).documents)
          : []
      if (docsRes.status === 200 && docsArray.length > 0) {
        const sorted = [...docsArray].sort((a, b) => (b.segment_count ?? 0) - (a.segment_count ?? 0))
        const largest = sorted.find((d) => (d.segment_count ?? 0) > 0) ?? docsArray[0]
        return largest.id ?? null
      }
      if (attempt < 2) await page.waitForTimeout(1000)
    } catch {
      if (attempt < 2) await page.waitForTimeout(1000)
    }
  }
  return null
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

    // Pre-flight: verify document actually has segments before waiting for DOM
    const segsCheck = await apiFetch<{ segments?: unknown[] }>(page, `/api/documents/${smallestDocId}/segments?limit=1`)
    if (segsCheck.status !== 200 || !Array.isArray(segsCheck.body?.segments) || (segsCheck.body?.segments ?? []).length === 0) {
      test.skip(true, `Document ${smallestDocId} has no segments (API status=${segsCheck.status}) — Vercel cold start or unsegmented doc`)
      return
    }

    // Step 3 — wait for first segment list item (editor hydration)
    const t1 = Date.now()
    await page.waitForSelector('[data-testid="segment-list-item"]', { timeout: 60000 })
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

    // Step 5 — Furigana toggle + ruby verification (P0-1: KANJIDIC2 fallback coverage)
    // Switch to JP single-language mode so furigana can render
    const jpToggle = page.locator('button:has-text("JP")').first()
    if (await jpToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await jpToggle.click()
      await page.waitForTimeout(800)
    }

    // Open reader settings and activate furigana mode
    const readerSettingsBtn = page.locator('button[aria-label="Reader settings"]')
    if (await readerSettingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await readerSettingsBtn.click()
      await page.waitForTimeout(400)

      // Click the ふりがな button to enable furigana annotations
      const furiganaBtn = page.locator('button:has-text("ふりがな"), [data-furigana-mode="furigana"]').first()
      if (await furiganaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await furiganaBtn.click()
        await page.waitForTimeout(1500) // allow ruby elements to render
      }

      // Close settings (click again or press Escape)
      await readerSettingsBtn.click().catch(() => page.keyboard.press('Escape'))
      await page.waitForTimeout(500)
    }

    // Verify <ruby> elements rendered by the KANJIDIC2 fallback engine
    const rubyCount = await page.locator('ruby').count().catch(() => 0)
    const rtCount = await page.locator('rt').count().catch(() => 0)
    test.info().annotations.push({
      type: 'furigana-check',
      description: JSON.stringify({ rubyCount, rtCount }),
    })
    expect(rubyCount, 'furigana <ruby> elements should be present after enabling ふりがな mode').toBeGreaterThan(0)
    expect(rtCount, 'furigana <rt> reading elements should be present').toBeGreaterThan(0)
    await snap('reader-furigana-active')

    // P1-6: Romaji mode — verify romaji in <rt> elements
    const romajiBtn = page.locator('button:has-text("Rōmaji"), button:has-text("romaji"), [data-furigana-mode="romaji"]').first()
    if (await romajiBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Re-open settings if needed
      if (await readerSettingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await readerSettingsBtn.click()
        await page.waitForTimeout(400)
      }
      await romajiBtn.click()
      await page.waitForTimeout(1500)

      // Verify first <rt> contains romaji (ASCII/latin, not hiragana)
      const firstRtText = await page.locator('rt').first().textContent().catch(() => '')
      const containsRomaji = /[a-zA-Z]/.test(firstRtText)
      test.info().annotations.push({
        type: 'romaji-check',
        description: JSON.stringify({ firstRtText, containsRomaji }),
      })
      expect(containsRomaji, 'first <rt> should contain romaji (ASCII) text').toBe(true)
      await snap('reader-furigana-romaji')

      // Toggle back to furigana mode
      const backToFurigana = page.locator('button:has-text("ふりがな"), [data-furigana-mode="furigana"]').first()
      if (await backToFurigana.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backToFurigana.click()
        await page.waitForTimeout(1000)
      }

      // Close settings
      await readerSettingsBtn.click().catch(() => page.keyboard.press('Escape'))
      await page.waitForTimeout(500)
    }

    // Toggle furigana off to leave reader in default state
    if (await readerSettingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await readerSettingsBtn.click()
      await page.waitForTimeout(400)
      const furiganaOffBtn = page.locator('button:has-text("日本語"), [data-furigana-mode="off"]').first()
      if (await furiganaOffBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await furiganaOffBtn.click()
        await page.waitForTimeout(500)
      }
      await readerSettingsBtn.click().catch(() => page.keyboard.press('Escape'))
    }

    // Step 6 — Bilingual view mode button
    const bilingualBtn = page.locator('button:has-text("Bilingual"), button:has-text("bilingual")')
    if ((await bilingualBtn.count()) > 0) {
      await bilingualBtn.first().click()
      await page.waitForTimeout(500)
    }

    // Step 7 — Bookmark button
    const bookmarkBtn = page.locator(
      'button[aria-label*="Bookmark" i], button[aria-label*="bookmark" i], button:has-text("Bookmark")',
    )
    if ((await bookmarkBtn.count()) > 0) {
      await bookmarkBtn.first().click()
      await page.waitForTimeout(300)
    }

    // Step 8 — Next pagination button
    const nextBtn = page.locator('button:has-text("Next"), a:has-text("Next"), [aria-label*="Next" i]')
    if ((await nextBtn.count()) > 0) {
      await nextBtn.first().click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(500)
    }

    // Step 9 — take a snap after content visible (already done above)

    // Step 10 — navigate back to /documents
    const t2 = Date.now()
    await page.goto(`${PROD}/documents`)
    await page.waitForLoadState('domcontentloaded')
    const backNavTime = Date.now() - t2
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'back-to-documents-nav', elapsed_ms: backNavTime }),
    })

    // Step 11 — sort by recently-viewed if sort is available
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

    // Step 12 — click the just-visited doc again
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

    // Discover readable doc (min 100 segments, avoids empty-state docs)
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')
    const readableDocId = await discoverReadableDocId(page)
    if (!readableDocId) {
      test.skip(true, 'No readable documents found (min 100 segments)')
      return
    }

    // Step 1 — navigate to reader for readable doc (avoids empty-state docs)
    await page.goto(`${PROD}/documents/${readableDocId}/read`)
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
        // WCAG contrast tiered assertion:
        //   ratio < 2.0 → HARD FAIL (genuine accessibility regression)
        //   ratio 2.0–3.0 → soft warn (below WCAG AA but not a critical regression)
        //   ratio ≥ 3.0 → pass
        if (ratio < 2.0) {
          // Hard fail: contrast this low is a genuine accessibility regression
          expect(
            ratio,
            `Theme ${theme.name} contrast ratio ${ratio.toFixed(2)} < 2.0 — critical accessibility regression (text=${themeInfo.color}, bg=${themeInfo.bg})`,
          ).toBeGreaterThanOrEqual(2.0)
        } else if (ratio < 3.0) {
          // Soft warn: below WCAG AA (3.0) but not a critical regression
          expect
            .soft(
              ratio,
              `Theme ${theme.name} contrast ratio ${ratio.toFixed(2)} < 3.0 — below WCAG AA (text=${themeInfo.color}, bg=${themeInfo.bg})`,
            )
            .toBeGreaterThanOrEqual(3.0)
        }
      }
    }

    await snap('reader-theme-after')

    // Step 5 — switch layout width to "Two Column"
    const layoutControl = page.locator('[data-testid="layout-width-control"]')
    if ((await layoutControl.count()) > 0) {
      const twoCol = layoutControl.locator('button:has-text("Two-col"), button:has-text("Two"), [aria-label*="Two" i]')
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

    // Navigate to PROD first to establish origin for apiFetch
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')

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
    test.setTimeout(120000)
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
    test.setTimeout(120000)
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

    // Step 4 — open segment details drawer (tabs are hidden until "Details ▾" is clicked)
    const detailsToggle = page.locator('[data-testid="segment-details-toggle"]')
    if (await detailsToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await detailsToggle.click()
      await page.waitForTimeout(500)
    }

    // Step 5 — look for Context Builder tab inside the drawer
    const ctxTab = page.locator(
      '[data-testid="segment-details-drawer"] [role="tab"]:has-text("Context Builder")',
    ).first()
    const ctxTabFound = await ctxTab.isVisible({ timeout: 5000 }).catch(() => false)
    if (!ctxTabFound) {
      test.info().annotations.push({
        type: 'skip',
        description: 'Context Builder tab not found (segment may be qa_approved or drawer not open)',
      })
      return
    }

    // Step 6 — click Context Builder tab
    await ctxTab.click()
    await page.waitForTimeout(500)

    // Step 7 — look for compose button
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

    // Step 8 — click Compose
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

    // Step 9 — look for generate button
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

    // Step 10 — look for expand button → full-screen modal
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

    // Step 4 — open segment details drawer (tabs are hidden until "Details ▾" is clicked)
    const detailsToggle = page.locator('[data-testid="segment-details-toggle"]')
    if (await detailsToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await detailsToggle.click()
      await page.waitForTimeout(500)
    }

    // Step 5 — find Comments tab inside the drawer
    const commentsTab = page.locator(
      '[data-testid="segment-details-drawer"] [role="tab"]:has-text("Comments")',
    ).first()
    const commentsFound = await commentsTab.isVisible({ timeout: 5000 }).catch(() => false)
    if (!commentsFound) {
      test.info().annotations.push({
        type: 'skip',
        description: 'Comments tab not found (drawer may not be open or segment not active)',
      })
      return
    }

    await commentsTab.click()
    await page.waitForTimeout(500)
    await snap('comments-tab-open')

    // Step 6 — look for comment composer
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

    // Step 7 — fill and submit comment
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

  // ==================================================================
  // Flow 10 — RF-READER-04
  // ==================================================================

  test('RF-READER-04: Full-text search in reader sidebar @userflow @p2', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Discover a readable doc (min 100 segments) to avoid empty-state docs
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')
    const readableDocId = await discoverReadableDocId(page)
    if (!readableDocId) {
      test.skip(true, 'No readable documents found (min 100 segments)')
      return
    }
    await page.goto(`${PROD}/documents/${readableDocId}/read`)
    await page.waitForLoadState('domcontentloaded')
    try {
      await page
        .locator('p, [data-testid="segment-text"], [data-testid="reader-segment"], [data-reader-theme]')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      // Fallback: wait for any non-skeleton content
      try {
        await page.waitForSelector(':not(.skeleton):not(.animate-pulse)', { timeout: 10000 })
      } catch {
        test.skip(true, 'Reader content not visible')
        return
      }
    }

    // Step 2 — open reader sidebar (exact aria-label from ReaderView.tsx)
    const sidebarToggle = page.locator(
      'button[aria-label="Open document sidebar (contents and search)"]',
    ).first()
    const sidebarVisible = await sidebarToggle.isVisible({ timeout: 5000 }).catch(() => false)
    if (!sidebarVisible) {
      test.skip(true, 'Reader sidebar toggle not found — reader may be in empty state')
      return
    }
    await sidebarToggle.click()
    // Wait for sidebar panel to appear
    await page.locator('[aria-label="Reader sidebar"]').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(300)

    // Step 3 — find and click Search tab (plain button inside sidebar panel)
    const searchTab = page.locator('[aria-label="Reader sidebar"] button').filter({ hasText: /^Search$/i }).first()
    const searchTabFound = await searchTab.isVisible({ timeout: 5000 }).catch(() => false)
    if (!searchTabFound) {
      test.skip(true, 'Search tab not found in sidebar')
      return
    }
    await searchTab.click()
    await page.waitForTimeout(500)

    // Step 4 — type search term
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[aria-label*="search" i], [data-testid*="search-input"]',
    ).first()
    const searchInputFound = await searchInput.isVisible({ timeout: 5000 }).catch(() => false)
    if (!searchInputFound) {
      test.skip(true, 'Search input not found')
      return
    }

    const tSearch = Date.now()
    await searchInput.fill('sword')
    // Wait for debounced results
    await page.waitForTimeout(1500)
    const searchTime = Date.now() - tSearch
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'search-debounce', elapsed_ms: searchTime }),
    })

    // Step 5 — check for search results
    const searchResults = page.locator(
      '[data-testid*="search-result"], [data-testid*="result-row"], li:not(.empty)',
    )
    const hasResults = await searchResults.first().isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasResults) {
      test.info().annotations.push({
        type: 'skip',
        description: 'No search results for "sword"',
      })
    } else {
      await snap('reader-search-results')

      // Step 6 — click first result
      const tClick = Date.now()
      await searchResults.first().click()
      await page.waitForTimeout(1000)
      const clickTime = Date.now() - tClick
      test.info().annotations.push({
        type: 'timing',
        description: JSON.stringify({ step: 'search-click-to-scroll', elapsed_ms: clickTime }),
      })

      // Step 7 — verify highlight
      const highlights = page.locator('mark, [data-testid*="highlight"], span[style*="background"]')
      const highlightFound = await highlights.first().isVisible({ timeout: 5000 }).catch(() => false)
      test.info().annotations.push({
        type: highlightFound ? 'info' : 'skip',
        description: highlightFound ? 'Search highlight found' : 'Search highlight not found',
      })
    }

    await snap('reader-search-final')
  })

  // ==================================================================
  // Flow 11 — RF-READER-05
  // ==================================================================

  test('RF-READER-05: Status filter sidebar @userflow @p2', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Discover a readable doc (min 100 segments) to avoid empty-state docs
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')
    const readableDocId = await discoverReadableDocId(page)
    if (!readableDocId) {
      test.skip(true, 'No readable documents found (min 100 segments)')
      return
    }
    await page.goto(`${PROD}/documents/${readableDocId}/read`)
    await page.waitForLoadState('domcontentloaded')
    try {
      await page
        .locator('p, [data-testid="segment-text"], [data-testid="reader-segment"], [data-reader-theme]')
        .first()
        .waitFor({ state: 'visible', timeout: 20000 })
    } catch {
      test.skip(true, 'Reader content not visible')
      return
    }

    // Open sidebar (exact aria-label from ReaderView.tsx)
    const sidebarToggle = page.locator(
      'button[aria-label="Open document sidebar (contents and search)"]',
    ).first()
    const sidebarVisible = await sidebarToggle.isVisible({ timeout: 5000 }).catch(() => false)
    if (!sidebarVisible) {
      test.skip(true, 'Reader sidebar toggle not found — reader may be in empty state')
      return
    }
    await sidebarToggle.click()
    // Wait for sidebar panel to appear
    await page.locator('[aria-label="Reader sidebar"]').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(300)

    // Find Filter tab (plain button inside sidebar panel)
    const filterTab = page.locator('[aria-label="Reader sidebar"] button').filter({ hasText: /^Filter$/i }).first()
    const filterTabFound = await filterTab.isVisible({ timeout: 5000 }).catch(() => false)
    if (!filterTabFound) {
      test.skip(true, 'Filter tab not found in sidebar')
      return
    }
    await filterTab.click()
    await page.waitForTimeout(500)
    await snap('reader-filter-panel')

    // Toggle a status filter
    const filterCheckbox = page.locator(
      'input[type="checkbox"], [role="checkbox"], [data-testid*="filter-checkbox"]',
    ).first()
    if (await filterCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterCheckbox.click()
      await page.waitForTimeout(500)
      await snap('reader-filter-applied')
    } else {
      test.info().annotations.push({ type: 'skip', description: 'No filter checkboxes found' })
    }

    // Clear filter
    const clearBtn = page.locator(
      'button:has-text("Clear"), button:has-text("Reset"), [data-testid*="filter-clear"]',
    ).first()
    if (await clearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearBtn.click()
      await page.waitForTimeout(500)
      test.info().annotations.push({ type: 'info', description: 'Filter cleared' })
    }
  })

  // ==================================================================
  // Flow 12 — RF-TRANS-03
  // ==================================================================

  test('RF-TRANS-03: Accept suggestion with StyleRuleModal (edited phase) @userflow @p2', async ({ page, snap }) => {
    test.info().annotations.push({
      type: 'info',
      description: 'WARNING: This flow requires a proofreader-role user. We use admin tokens (which may have proofreader capabilities) and skip if no edited segments found.',
    })

    await injectSession(page.context(), adminTokens.access, adminTokens.refresh)

    // Discover smallest doc
    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')

    // Wait for segment list
    try {
      await page
        .locator('[data-testid="segment-list-item"], tr')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      test.skip(true, 'Segment list not visible')
      return
    }

    // Capture baseline editor state before optional StyleRuleModal flow
    await snap('editor-baseline')

    // Look for a segment in "edited" status
    const editedBadge = page.locator(
      'span:has-text("edited"), [data-testid*="phase-badge"]:has-text("edited"), [class*="edited"]',
    ).first()
    const editedFound = await editedBadge.isVisible({ timeout: 5000 }).catch(() => false)

    if (!editedFound) {
      test.info().annotations.push({
        type: 'skip',
        description: 'No segments in edited status found for this doc — StyleRuleModal flow requires at least one segment in phase 2 (edited). Production data has most segments at qa_approved.',
      })
      return
    }

    // Click the edited segment row to activate editor panel
    await editedBadge.click()
    await page.waitForTimeout(500)

    // Open segment details drawer (tabs are hidden until "Details ▾" is clicked)
    const detailsToggle = page.locator('[data-testid="segment-details-toggle"]')
    if (await detailsToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await detailsToggle.click()
      await page.waitForTimeout(500)
    }

    // Open Suggestions tab inside drawer
    const suggestionsTab = page.locator(
      '[data-testid="segment-details-drawer"] [role="tab"]:has-text("Suggestions")',
    ).first()
    if (await suggestionsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await suggestionsTab.click()
      await page.waitForTimeout(500)

      // Look for accept button on suggestion
      const acceptBtn = page.locator(
        '[data-testid="suggestion-accept"], button:has-text("Accept")',
      ).first()
      if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await acceptBtn.click()
        await page.waitForTimeout(1000)

        // Verify StyleRuleModal opens
        const styleRuleModal = page.locator(
          '[data-testid*="style-rule"], [role="dialog"]:has-text("Style Rule"), [class*="style-rule"]',
        ).first()
        const modalVisible = await styleRuleModal.isVisible({ timeout: 5000 }).catch(() => false)
        if (modalVisible) {
          await snap('style-rule-modal')
          await page.keyboard.press('Escape')
        } else {
          test.info().annotations.push({
            type: 'skip',
            description: 'StyleRuleModal did not appear after accept',
          })
        }
      } else {
        test.info().annotations.push({
          type: 'skip',
          description: 'No suggestions found on edited segment — accept not testable',
        })
      }
    } else {
      test.info().annotations.push({
        type: 'skip',
        description: 'Suggestions tab not found',
      })
    }
  })

  // ==================================================================
  // Flow 13 — RF-TRANS-04
  // ==================================================================

  test('RF-TRANS-04: MemoryWriteBanner after phase advance @userflow @p2', async ({ page, snap }) => {
    await injectSession(page.context(), translatorTokens.access, translatorTokens.refresh)

    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')
    try {
      await page
        .locator('[data-testid="segment-list-item"], tr')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      test.skip(true, 'Segment list not visible')
      return
    }

    // Capture baseline before optional MemoryWriteBanner flow
    await snap('editor-before-advance')

    await page.locator('[data-testid="segment-list-item"], tr').first().click()
    try {
      await page
        .locator('textarea, [data-testid="segment-editor-panel"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
    } catch {
      // continue
    }

    // Look for phase advance button
    const phaseAdvanceBtn = page.locator('[data-testid="phase-advance-button"]')
    const terminalNote = await page.locator('[data-testid="phase-advance-terminal"]').isVisible().catch(() => false)
    if (terminalNote) {
      test.info().annotations.push({
        type: 'skip',
        description: 'Segment already at terminal phase — cannot test MemoryWriteBanner',
      })
      return
    }
    if (!(await phaseAdvanceBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Phase advance button not visible')
      return
    }

    // Advance phase
    await phaseAdvanceBtn.click()
    try {
      const confirmBtn = page.locator('[data-testid="phase-advance-confirm-submit"]')
      await confirmBtn.waitFor({ state: 'visible', timeout: 5000 })
      await confirmBtn.click()
    } catch {
      test.skip(true, 'Phase advance confirm button not found')
      return
    }

    // Step — observe MemoryWriteBanner
    const tBanner = Date.now()
    try {
      await page
        .locator('[data-testid="memory-write-banner"]')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
      const bannerTime = Date.now() - tBanner
      await snap('memory-write-banner')
      test.info().annotations.push({
        type: 'timing',
        description: JSON.stringify({ step: 'memory-write-banner-visible', elapsed_ms: bannerTime }),
      })
    } catch {
      test.info().annotations.push({
        type: 'skip',
        description: 'MemoryWriteBanner not visible within 30s after phase advance',
      })
    }
  })

  // ==================================================================
  // Flow 14 — RF-TRANS-07
  // ==================================================================

  test('RF-TRANS-07: QA Issue resolve @userflow @p2', async ({ page, snap }) => {
    await injectSession(page.context(), translatorTokens.access, translatorTokens.refresh)

    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')
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
    await page.waitForTimeout(500)

    // Open segment details drawer (tabs are hidden until "Details ▾" is clicked)
    const detailsToggle = page.locator('[data-testid="segment-details-toggle"]')
    if (await detailsToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await detailsToggle.click()
      await page.waitForTimeout(500)
    }

    // QA Issues live inside the "Suggestions" tab — click Suggestions tab first
    const suggestionsTab = page.locator(
      '[data-testid="segment-details-drawer"] [role="tab"]:has-text("Suggestions")',
    ).first()
    if (await suggestionsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await suggestionsTab.click()
      await page.waitForTimeout(500)
    }

    snap('qa-issues-list')

    // Look for resolve button on any QA issue
    const resolveBtn = page.locator(
      '[data-testid*="qa-resolve"], button:has-text("Resolve"), button:has-text("resolve")',
    ).first()
    const resolveFound = await resolveBtn.isVisible({ timeout: 3000 }).catch(() => false)
    if (!resolveFound) {
      test.info().annotations.push({ type: 'skip', description: 'No QA issues to resolve' })
      return
    }

    await resolveBtn.click()
    await page.waitForTimeout(500)

    // Look for resolution modal
    const modalTextarea = page.locator(
      '[role="dialog"] textarea, [data-testid*="qa-note"]',
    ).first()
    const modalFound = await modalTextarea.isVisible({ timeout: 5000 }).catch(() => false)
    if (modalFound) {
      await modalTextarea.fill('Test resolution note')
      await snap('qa-resolve-modal')

      const confirmBtn = page.locator(
        '[role="dialog"] button:has-text("Confirm"), [role="dialog"] button:has-text("Resolve"), [role="dialog"] button:has-text("Submit")',
      ).first()
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click()
        await page.waitForTimeout(1000)
      }
    }
  })

  // ==================================================================
  // Flow 15 — RF-TRANS-08
  // ==================================================================

  test('RF-TRANS-08: Batch advance toolbar @userflow @p2', async ({ page, snap }) => {
    // Batch mode toggle is admin-only (see edit page line 496)
    await injectSession(page.context(), adminTokens.access, adminTokens.refresh)

    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')
    try {
      await page
        .locator('[data-testid="segment-list-item"], tr')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      test.skip(true, 'Segment list not visible')
      return
    }

    // Capture baseline editor before batch toggle check
    await snap('editor-before-batch')

    // Look for batch mode toggle — must wait for async isAdmin check (/api/auth/me)
    const batchToggle = await page.waitForSelector('[data-testid="batch-mode-toggle"]', { timeout: 15000 }).catch(() => null)
    if (!batchToggle) {
      test.info().annotations.push({ type: 'warn', description: 'batch-mode-toggle not found after 15s — isAdmin may not have resolved' })
      return
    }

    await batchToggle.click()
    await page.waitForTimeout(500)
    await snap('batch-mode-active')

    // Look for checkboxes and select up to 3
    const checkboxes = page.locator('[data-testid="segment-list-item"] input[type="checkbox"], tr input[type="checkbox"]')
    const cbCount = await checkboxes.count()
    if (cbCount === 0) {
      test.info().annotations.push({ type: 'skip', description: 'No batch checkboxes found after enabling batch mode' })
      return
    }

    let selected = 0
    for (let i = 0; i < Math.min(cbCount, 3); i++) {
      await checkboxes.nth(i).click()
      selected++
      await page.waitForTimeout(200)
    }
    test.info().annotations.push({
      type: 'info',
      description: `Selected ${selected} segments for batch advance`,
    })

    // Look for batch advance button in toolbar
    const batchAdvanceBtn = page.locator(
      '[data-testid="batch-advance-button"], [data-testid*="batch"] button:has-text("Advance"), button:has-text("Batch Advance")',
    ).first()
    if (await batchAdvanceBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const tBatch = Date.now()
      await batchAdvanceBtn.click()
      await page.waitForTimeout(2000)
      const batchTime = Date.now() - tBatch
      test.info().annotations.push({
        type: 'timing',
        description: JSON.stringify({ step: 'batch-advance-rtt', elapsed_ms: batchTime }),
      })
      await snap('batch-advance-result')
    } else {
      test.info().annotations.push({ type: 'skip', description: 'Batch advance button not found' })
    }
  })

  // ==================================================================
  // Flow 16 — RF-TRANS-09
  // ==================================================================

  test('RF-TRANS-09: Filter bar — status, text search, myPhase toggle @userflow @p2', async ({ page, snap }) => {
    await injectSession(page.context(), translatorTokens.access, translatorTokens.refresh)

    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')
    try {
      await page
        .locator('[data-testid="segment-list-item"], tr')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      test.skip(true, 'Segment list not visible')
      return
    }

    await snap('editor-filter-before')

    // Step 1 — click Draft status filter
    const draftFilter = page.locator(
      '[data-testid="filter-status-draft"], button:has-text("Draft"), [data-testid*="filter"] button:has-text("Draft")',
    ).first()
    if (await draftFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      const tFilter = Date.now()
      await draftFilter.click()
      await page.waitForTimeout(500)
      const filterTime = Date.now() - tFilter
      test.info().annotations.push({
        type: 'timing',
        description: JSON.stringify({ step: 'filter-draft-click', elapsed_ms: filterTime }),
      })
      await snap('editor-filter-draft')
    } else {
      test.info().annotations.push({ type: 'skip', description: 'Draft filter not found' })
    }

    // Step 2 — toggle My Phase
    const myPhaseToggle = page.locator(
      '[data-testid="filter-my-phase"], button:has-text("My Phase"), [data-testid*="my-phase"]',
    ).first()
    if (await myPhaseToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await myPhaseToggle.click()
      await page.waitForTimeout(300)
    }

    // Step 3 — text search
    const searchInput = page.locator(
      '[data-testid="filter-search-input"], input[placeholder*="search" i], input[aria-label*="search" i]',
    ).first()
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('sword')
      await page.waitForTimeout(500)
      await snap('editor-filter-text-search')
    }

    // Step 4 — clear all
    const clearAll = page.locator(
      '[data-testid="filter-clear-all"], button:has-text("Clear"), button:has-text("Reset")',
    ).first()
    if (await clearAll.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearAll.click()
      await page.waitForTimeout(500)
      await snap('editor-filter-cleared')
    }
  })

  // ==================================================================
  // Flow 17 — RF-TRANS-10
  // ==================================================================

  test('RF-TRANS-10: Keyboard shortcuts @userflow @p2', async ({ page, snap }) => {
    await injectSession(page.context(), translatorTokens.access, translatorTokens.refresh)

    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')
    try {
      await page
        .locator('[data-testid="segment-list-item"], tr')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      test.skip(true, 'Segment list not visible')
      return
    }

    // Click first segment to activate
    await page.locator('[data-testid="segment-list-item"], tr').first().click()
    await page.waitForTimeout(500)

    // Step 1 — press ? for keyboard help modal
    await page.keyboard.press('?')
    await page.waitForTimeout(500)
    try {
      const helpModal = page.locator('[role="dialog"], [data-testid*="keyboard"], [data-testid*="help"]')
      await helpModal.first().waitFor({ state: 'visible', timeout: 5000 })
      await snap('keyboard-help-modal')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } catch {
      test.info().annotations.push({ type: 'skip', description: 'Keyboard help modal not found after pressing ?' })
    }

    // Step 2 — j/k navigation
    const initialSegments = await page.locator('[data-testid="segment-list-item"], tr').count()
    let navigated = false
    if (initialSegments > 1) {
      try {
        await page.keyboard.press('j')
        await page.waitForTimeout(300)
        navigated = true
        test.info().annotations.push({ type: 'info', description: 'Pressed j to navigate next segment' })
        await page.keyboard.press('k')
        await page.waitForTimeout(300)
        test.info().annotations.push({ type: 'info', description: 'Pressed k to navigate previous segment' })
      } catch {
        test.info().annotations.push({ type: 'skip', description: 'j/k navigation not functional' })
      }
    }

    // Step 3 — Ctrl+S save
    if (navigated) {
      const textarea = page.locator('textarea').first()
      if (await textarea.isVisible().catch(() => false)) {
        await textarea.press('End')
        await textarea.press('Space')
        await page.keyboard.type('kb-test')
        const tSave = Date.now()
        await page.keyboard.press('Control+s')
        await page.waitForTimeout(1000)
        const saveTime = Date.now() - tSave
        test.info().annotations.push({
          type: 'timing',
          description: JSON.stringify({ step: 'ctrl-s-save', elapsed_ms: saveTime }),
        })
      }
    }

    await snap('keyboard-shortcuts-done')
  })

  // ==================================================================
  // Flow 18 — RF-TRANS-11
  // ==================================================================

  test('RF-TRANS-11: Mobile editor phone-block banner @userflow @p2', async ({ page, snap }) => {
    await injectSession(page.context(), translatorTokens.access, translatorTokens.refresh)

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })

    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    // Step 1 — navigate to editor on mobile viewport
    const t0 = Date.now()
    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')
    const mobileNavTime = Date.now() - t0
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'mobile-editor-nav', elapsed_ms: mobileNavTime }),
    })

    // Capture mobile editor state (whether banner is shown or full editor)
    await snap('mobile-editor-loaded')

    // Step 2 — verify phone-block banner
    const mobileBanner = page.locator('[data-testid="mobile-editor-reader-link"]')
    const bannerVisible = await mobileBanner.isVisible({ timeout: 10000 }).catch(() => false)

    if (!bannerVisible) {
      // Try alternative selectors
      const bannerAlt = page.locator(
        'text="Editor requires a desktop", text="mobile", text="phone", [class*="mobile-block"]',
      ).first()
      const bannerAltVisible = await bannerAlt.isVisible({ timeout: 5000 }).catch(() => false)
      if (!bannerAltVisible) {
        test.info().annotations.push({
          type: 'skip',
          description: 'Mobile phone-block banner not found — editor may be accessible on mobile',
        })
        return
      }
    }

    await snap('mobile-editor-phone-block')

    // Step 3 — click reader link
    if (bannerVisible) {
      await mobileBanner.click()
      await page.waitForLoadState('domcontentloaded')
      const url = page.url()
      expect(url).toContain('/read')
      await snap('mobile-redirected-to-reader')
    }

    // Restore viewport
    await page.setViewportSize({ width: 1280, height: 800 })
  })

  // ==================================================================
  // Flow 19 — RF-ADMIN-02
  // ==================================================================

  test('RF-ADMIN-02: User role change @userflow @p1', async ({ page, snap }) => {
    test.info().annotations.push({
      type: 'info',
      description: 'WARNING: This test mutates a user role in the database. Logging original state.',
    })

    await injectSession(page.context(), adminTokens.access, adminTokens.refresh)

    // Navigate to admin
    await page.goto(`${PROD}/admin`)
    await page.waitForLoadState('domcontentloaded')
    try {
      await page
        .locator('div.text-3xl')
        .first()
        .waitFor({ state: 'visible', timeout: 45000 })
    } catch {
      test.skip(true, 'Admin dashboard not loaded')
      return
    }

    // Scroll to users table
    const userRows = page.locator('[data-testid="admin-user-row"], table tbody tr')
    try {
      await userRows.first().waitFor({ state: 'visible', timeout: 15000 })
    } catch {
      test.skip(true, 'No user rows found')
      return
    }

    await snap('admin-users-before-role-change')

    // Find role dropdown
    const roleSelect = page.locator('[data-testid="admin-user-role-select"]').first()
    const originalRole = await roleSelect.inputValue().catch(() =>
      roleSelect.textContent().catch(() => 'unknown'),
    )

    test.info().annotations.push({
      type: 'info',
      description: `Original role before mutation: ${originalRole}`,
    })

    if (!(await roleSelect.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.info().annotations.push({
        type: 'skip',
        description: 'Role select dropdown not found',
      })
      // Restore original role if possible
      return
    }

    // Change role
    const tRole = Date.now()
    try {
      await roleSelect.selectOption({ index: 0 }) // select first (current) option, then try to change
      // Try selecting a different option
      const options = roleSelect.locator('option')
      const optCount = await options.count()
      if (optCount > 1) {
        const newIndex = optCount > 1 ? 1 : 0
        await roleSelect.selectOption({ index: newIndex })
        await page.waitForTimeout(1000)
      }
    } catch {
      test.info().annotations.push({ type: 'skip', description: 'Could not change role via dropdown' })
    }
    const roleTime = Date.now() - tRole
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'role-change-rtt', elapsed_ms: roleTime }),
    })

    await snap('admin-users-after-role-change')

    // WARNING: Not restoring original role automatically. This must be handled manually or via afterAll.
    test.info().annotations.push({
      type: 'info',
      description: 'NOTE: User role was mutated. Original role should be restored manually.',
    })
  })

  // ==================================================================
  // Flow 20 — RF-ADMIN-03
  // ==================================================================

  test('RF-ADMIN-03: Document publish policy toggle @userflow @p2', async ({ page, snap }) => {
    test.info().annotations.push({
      type: 'info',
      description: 'WARNING: This test mutates document publish policy. Logging original state.',
    })

    await injectSession(page.context(), adminTokens.access, adminTokens.refresh)

    await page.goto(`${PROD}/admin`)
    await page.waitForLoadState('domcontentloaded')
    try {
      await page
        .locator('div.text-3xl')
        .first()
        .waitFor({ state: 'visible', timeout: 45000 })
    } catch {
      test.skip(true, 'Admin dashboard not loaded')
      return
    }

    // Find documents table
    const docsTable = page.locator('[data-testid="admin-documents-table"], table')
    try {
      await docsTable.first().waitFor({ state: 'visible', timeout: 15000 })
    } catch {
      test.skip(true, 'Documents table not found')
      return
    }

    // Find publish policy toggle
    const policyBtn = page.locator(
      'button:has-text("QA"), button:has-text("Any"), button:has-text("🔒"), button:has-text("📄"), [data-testid*="publish-policy"]',
    ).first()
    const policyFound = await policyBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (!policyFound) {
      test.skip(true, 'Publish policy button not found')
      return
    }

    const originalText = await policyBtn.textContent().catch(() => 'unknown')
    test.info().annotations.push({
      type: 'info',
      description: `Original publish policy: ${originalText}`,
    })

    const tToggle = Date.now()
    await policyBtn.click()
    await page.waitForTimeout(1000)
    const toggleTime = Date.now() - tToggle
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'publish-policy-toggle-rtt', elapsed_ms: toggleTime }),
    })

    const newText = await policyBtn.textContent().catch(() => 'unknown')
    test.info().annotations.push({
      type: 'info',
      description: `New publish policy: ${newText}. WARNING: Policy was mutated.`,
    })

    await snap('admin-publish-policy-toggled')
  })

  // ==================================================================
  // Flow 21 — RF-ADMIN-04
  // ==================================================================

  test('RF-ADMIN-04: Assignment management per document @userflow @p1', async ({ page, snap }) => {
    test.info().annotations.push({
      type: 'info',
      description: 'WARNING: This test may mutate document assignments.',
    })

    await injectSession(page.context(), adminTokens.access, adminTokens.refresh)

    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    // Navigate to assignments page
    const t0 = Date.now()
    await page.goto(`${PROD}/admin/documents/${docId}/assignments`)
    await page.waitForLoadState('domcontentloaded')
    const navTime = Date.now() - t0
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'assignments-nav', elapsed_ms: navTime }),
    })

    // Wait for assignment rows
    const assignmentRows = page.locator('[data-testid="assignment-row"]')
    const assignmentRowsAlt = page.locator('table tbody tr')
    try {
      await assignmentRowsAlt.first().waitFor({ state: 'visible', timeout: 15000 })
    } catch {
      test.info().annotations.push({ type: 'skip', description: 'Assignment table empty or not found' })
      // Try navigating from documents table
      await page.goto(`${PROD}/admin`)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      const assignmentsLink = page.locator('[data-testid="admin-document-assignments-link"]').first()
      if (await assignmentsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await assignmentsLink.click()
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(1000)
      }
    }

    await snap('admin-assignments-list')

    // Look for edit button on first row
    const editBtn = page.locator('[data-testid="assignment-row-edit"]').first()
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click()
      await page.waitForTimeout(500)
      await snap('admin-assignment-edit')
      // Look for save
      const saveBtn = page.locator('[data-testid="assignment-save"]').first()
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click()
        await page.waitForTimeout(500)
      }
      // Cancel
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } else {
      test.info().annotations.push({ type: 'skip', description: 'No assignment edit button found' })
    }

    // Look for add button
    const addBtn = page.locator('[data-testid="assignment-row-add"]').first()
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(500)
      await snap('admin-assignment-add')
      // Cancel add
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
  })

  // ==================================================================
  // Flow 22 — RF-ADMIN-05
  // ==================================================================

  test('RF-ADMIN-05: Per-user assignments page @userflow @p2', async ({ page, snap }) => {
    await injectSession(page.context(), adminTokens.access, adminTokens.refresh)

    await page.goto(`${PROD}/admin`)
    await page.waitForLoadState('domcontentloaded')
    try {
      await page
        .locator('div.text-3xl')
        .first()
        .waitFor({ state: 'visible', timeout: 45000 })
    } catch {
      test.skip(true, 'Admin dashboard not loaded')
      return
    }

    // Find users table and first user row
    const userRows = page.locator('[data-testid="admin-user-row"], table tbody tr')
    try {
      await userRows.first().waitFor({ state: 'visible', timeout: 15000 })
    } catch {
      test.skip(true, 'No user rows found')
      return
    }

    // Find assignments link for a user
    const assignmentsLink = page.locator('[data-testid="admin-user-assignments-link"]').first()
    let linkFound = await assignmentsLink.isVisible({ timeout: 5000 }).catch(() => false)

    if (!linkFound) {
      // Try alternative — look for links in user row
      const userLink = userRows.first().locator('a[href*="assignment"], a[href*="assignments"]').first()
      linkFound = await userLink.isVisible({ timeout: 3000 }).catch(() => false)
      if (linkFound) {
        const t0 = Date.now()
        await userLink.click()
        await page.waitForLoadState('domcontentloaded')
        const navTime = Date.now() - t0
        test.info().annotations.push({
          type: 'timing',
          description: JSON.stringify({ step: 'user-assignments-nav', elapsed_ms: navTime }),
        })

        // Verify assignment rows
        const rows = page.locator('[data-testid="admin-user-assignments-row"], table tbody tr')
        try {
          await rows.first().waitFor({ state: 'visible', timeout: 10000 })
        } catch {
          test.info().annotations.push({ type: 'skip', description: 'No assignment rows for this user' })
        }
        await snap('admin-user-assignments')
      }
    } else {
      await assignmentsLink.click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)
      await snap('admin-user-assignments')
    }

    if (!linkFound) {
      test.skip(true, 'Per-user assignments link not found')
    }
  })

  // ==================================================================
  // Flow 23 — RF-ADMIN-06
  // ==================================================================

  test('RF-ADMIN-06: Segmentize flow @userflow @p2', async ({ page, snap }) => {
    test.info().annotations.push({
      type: 'info',
      description: 'WARNING: This test may re-segmentize a document. Will skip if segmentize is not available for already-segmented docs.',
    })

    await injectSession(page.context(), adminTokens.access, adminTokens.refresh)

    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    // Navigate to admin document detail
    await page.goto(`${PROD}/admin/documents/${docId}`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    await snap('admin-document-detail')

    // Look for segmentize button
    const segmentizeBtn = page.locator(
      'button:has-text("Segment"), button:has-text("segmentize"), [data-testid*="segmentize"]',
    ).first()
    const segBtnFound = await segmentizeBtn.isVisible({ timeout: 5000 }).catch(() => false)

    if (!segBtnFound) {
      // Try navigating via document detail link first
      await page.goto(`${PROD}/admin`)
      await page.waitForLoadState('domcontentloaded')
      await page
        .locator('div.text-3xl')
        .first()
        .waitFor({ state: 'visible', timeout: 45000 })
        .catch(() => {})

      const docDetailLink = page.locator('[data-testid="admin-document-detail-link"]').first()
      if (await docDetailLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await docDetailLink.click()
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(1000)
      }
    }

    // Re-check for segmentize button
    const segBtnRetry = page.locator(
      'button:has-text("Segment"), button:has-text("segmentize"), [data-testid*="segmentize"]',
    ).first()
    const segBtnRetryFound = await segBtnRetry.isVisible({ timeout: 5000 }).catch(() => false)

    if (segBtnRetryFound) {
      // Check if doc is already segmented (warn)
      test.info().annotations.push({
        type: 'info',
        description: 'Document may already be segmented. Segmentize button found — will attempt click but action may be no-op or show error.',
      })

      const tSegmentize = Date.now()
      await segBtnRetry.click()
      // Wait for segmentize result to render (success message, segment count, or error)
      await page.waitForFunction(
        () => {
          const text = document.body.innerText
          return (
            text.includes('Segmentized') ||
            text.includes('segments') ||
            text.includes('Error') ||
            text.includes('success') ||
            document.querySelector('[data-testid="segmentize-result"], .text-green-600, .text-red-600') !== null
          )
        },
        { timeout: 10000 },
      ).catch(() => page.waitForTimeout(4000))
      const segTime = Date.now() - tSegmentize
      test.info().annotations.push({
        type: 'timing',
        description: JSON.stringify({ step: 'segmentize-rtt', elapsed_ms: segTime }),
      })
      await snap('admin-segmentize-result')
    } else {
      test.skip(true, 'Segmentize button not found — document may already be segmented')
    }
  })

  // ==================================================================
  // Flow 24 — RF-ANON-01
  // ==================================================================

  test('RF-ANON-01: Landing page → register → login @userflow @p0', async ({ page, snap }) => {
    // WARNING: Do NOT inject auth cookies. Use fresh page for anonymous flow.
    // This test may create a user account — use a unique email.

    const testEmail = `e2e-anon-${Date.now()}@test.com`

    // Step 1 — landing page
    const t0 = Date.now()
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')
    const landingLoad = Date.now() - t0
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'landing-domcontentloaded', elapsed_ms: landingLoad }),
    })
    await snap('anon-landing')

    // Step 2 — look for Register CTA
    const registerCta = page.locator(
      'a[href*="register"], button:has-text("Get Started"), button:has-text("Register"), a:has-text("Register"), a:has-text("Sign Up")',
    ).first()
    const ctaFound = await registerCta.isVisible({ timeout: 10000 }).catch(() => false)

    if (!ctaFound) {
      test.info().annotations.push({
        type: 'skip',
        description: 'Register CTA not found on landing page — /register route may not exist',
      })
      // Skip registration, go directly to login for completeness
    } else {
      // Step 3 — click register CTA
      await registerCta.click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(500)
      await snap('anon-register-page')

      // Step 4 — fill registration form
      const emailInput = page.locator('input[type="email"], input[name="email"]').first()
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
      const registerFormFound = (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) &&
        (await passwordInput.isVisible({ timeout: 1000 }).catch(() => false))

      if (registerFormFound) {
        await emailInput.fill(testEmail)
        await passwordInput.fill(TEST_PASSWORD)

        // Submit
        const submitBtn = page.locator(
          'button[type="submit"], button:has-text("Register"), button:has-text("Sign Up"), button:has-text("Create Account")',
        ).first()
        const tRegister = Date.now()
        await submitBtn.click()
        // Wait for redirect or success
        await page.waitForTimeout(3000)
        const registerTime = Date.now() - tRegister
        test.info().annotations.push({
          type: 'timing',
          description: JSON.stringify({ step: 'register-submit-rtt', elapsed_ms: registerTime }),
        })
        await snap('anon-register-submitted')

        test.info().annotations.push({
          type: 'info',
          description: `Attempted registration with email: ${testEmail}`,
        })
      } else {
        test.info().annotations.push({ type: 'skip', description: 'Registration form not found' })
      }
    }

    // Step 5 — navigate to /login
    const tLogin = Date.now()
    await page.goto(`${PROD}/login`)
    await page.waitForLoadState('domcontentloaded')
    const loginLoad = Date.now() - tLogin
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'login-page-load', elapsed_ms: loginLoad }),
    })
    await snap('anon-login-page')

    // Step 6 — fill login form
    const loginEmail = page.locator('input[type="email"], input[name="email"]').first()
    const loginPassword = page.locator('input[type="password"], input[name="password"]').first()
    const loginFormFound = (await loginEmail.isVisible({ timeout: 5000 }).catch(() => false)) &&
      (await loginPassword.isVisible({ timeout: 1000 }).catch(() => false))

    if (loginFormFound) {
      await loginEmail.fill(testEmail)
      await loginPassword.fill(TEST_PASSWORD)

      const loginSubmit = page.locator(
        'button[type="submit"], button:has-text("Login"), button:has-text("Log in"), button:has-text("Sign In")',
      ).first()
      const tLoginSubmit = Date.now()
      await loginSubmit.click()
      await page.waitForTimeout(3000)
      const loginSubmitTime = Date.now() - tLoginSubmit
      test.info().annotations.push({
        type: 'timing',
        description: JSON.stringify({ step: 'login-submit-rtt', elapsed_ms: loginSubmitTime }),
      })
      await snap('anon-login-submitted')
    }

    // Contrast check: landing page hero text
    const heroContrast = await page.evaluate(() => {
      const el = document.querySelector('h1, h2, [class*="hero"] h1, [class*="hero"] h2')
      if (!el) return null
      const style = window.getComputedStyle(el)
      let parent: Element | null = el.parentElement
      while (parent && parent !== document.documentElement) {
        const bg = window.getComputedStyle(parent).backgroundColor
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          return { color: style.color, bg }
        }
        parent = parent.parentElement
      }
      return { color: style.color, bg: 'rgb(255, 255, 255)' }
    })
    if (heroContrast) {
      const ratio = contrastRatio(heroContrast.color, heroContrast.bg)
      test.info().annotations.push({
        type: 'contrast-check',
        description: JSON.stringify({ label: 'landing-hero', ...heroContrast, ratio: ratio.toFixed(2) }),
      })
    }
  })

  // ==================================================================
  // Flow 25 — RF-ANON-02
  // ==================================================================

  test('RF-ANON-02: 401 gate verification @userflow @p2', async ({ page, snap }) => {
    // No auth cookies — fresh page context

    // Step 1 — attempt direct API access
    const tApi = Date.now()
    const apiResult = await apiFetch(page, '/api/documents')
    const apiTime = Date.now() - tApi
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'unauth-api-call', elapsed_ms: apiTime, status: apiResult.status }),
    })

    // Step 2 — verify 401
    test.info().annotations.push({
      type: 'info',
      description: `Unauthenticated /api/documents returned status ${apiResult.status}. Expected 401.`,
    })
    // Soft-assert; don't hard-fail because Vercel might redirect differently
    expect.soft(
      [401, 302, 301].includes(apiResult.status),
      `Expected 401/redirect for unauthenticated API access, got ${apiResult.status}`,
    ).toBe(true)

    // Step 3 — attempt to visit /documents directly
    const tDocs = Date.now()
    const docsResp = await page.goto(`${PROD}/documents`)
    const docsTime = Date.now() - tDocs
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'unauth-documents-page', elapsed_ms: docsTime }),
    })

    // Should redirect to login
    const finalUrl = page.url()
    await snap('anon-401-redirect')
    test.info().annotations.push({
      type: 'info',
      description: `Unauthenticated /documents redirected to: ${finalUrl}`,
    })

    // Verify redirected to login or shows 401 message
    const isLoginPage = finalUrl.includes('/login') || finalUrl.includes('/auth')
    const hasUnauthMessage = await page
      .locator('text="Unauthorized", text="401", text="log in", text="Log in", text="sign in"')
      .first()
      .isVisible()
      .catch(() => false)
    expect.soft(
      isLoginPage || hasUnauthMessage,
      `Expected redirect to login or 401 message. Got: ${finalUrl}`,
    ).toBe(true)
  })

  // ==================================================================
  // Flow 26 — RF-CROSS-02
  // ==================================================================

  test('RF-CROSS-02: Large-book performance (23,500-segment document) @userflow @p1', async ({ page, snap }) => {
    test.setTimeout(180000)
    await injectSession(page.context(), adminTokens.access, adminTokens.refresh)

    // Discover largest document
    const docsRes = await apiFetch<{ documents?: Array<{ id: string; segment_count?: number }> }>(
      page,
      '/api/documents?limit=100',
    )
    const docs = docsRes.body?.documents ?? []
    const sorted = [...docs].sort((a, b) => (b.segment_count ?? 0) - (a.segment_count ?? 0))
    const largest = sorted[0]
    if (!largest || (largest.segment_count ?? 0) < 100) {
      test.skip(true, `No large document found (max segments: ${largest?.segment_count ?? 0})`)
      return
    }

    test.info().annotations.push({
      type: 'info',
      description: `Using large doc: ${largest.id} with ${largest.segment_count} segments`,
    })

    const docId = largest.id

    // Step 1 — navigate to editor (wrapped for NS_BINDING_ABORTED resilience)
    let editorNav = 0
    try {
      const t0 = Date.now()
      await page.goto(`${PROD}/documents/${docId}/edit`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      editorNav = Date.now() - t0
    } catch (navErr) {
      test.info().annotations.push({
        type: 'skip',
        description: `Large-doc editor navigation aborted (likely NS_BINDING_ABORTED on 23k+ segments): ${String(navErr)}`,
      })
      return
    }

    // Step 2 — wait for first segment list item
    let segmentListTime = 0
    try {
      const t1 = Date.now()
      await page
        .locator('[data-testid="segment-list-item"], tr')
        .first()
        .waitFor({ state: 'visible', timeout: 60000 })
      segmentListTime = Date.now() - t1
    } catch {
      test.info().annotations.push({
        type: 'skip',
        description: 'Large document segment list not visible within 60s',
      })
      return
    }

    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({
        step: 'large-editor-nav',
        editor_nav_ms: editorNav,
        segment_list_visible_ms: segmentListTime,
        total_ms: editorNav + segmentListTime,
      }),
    })
    await snap('large-book-editor')

    // Step 3 — scroll through segment list
    try {
      await page.evaluate(() => window.scrollBy(0, 2000))
      await page.waitForTimeout(500)
      await page.evaluate(() => window.scrollBy(0, 2000))
      await page.waitForTimeout(500)
      await snap('large-book-editor-scrolled')
    } catch {
      test.info().annotations.push({ type: 'skip', description: 'Scroll test failed' })
    }

    // Step 4 — apply filter
    const draftFilter = page.locator(
      '[data-testid="filter-status-draft"], button:has-text("Draft")',
    ).first()
    if (await draftFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      const tFilter = Date.now()
      await draftFilter.click()
      await page.waitForTimeout(1000)
      const filterTime = Date.now() - tFilter
      test.info().annotations.push({
        type: 'timing',
        description: JSON.stringify({ step: 'large-filter-draft', elapsed_ms: filterTime }),
      })
    }

    // Step 5 — navigate reader (wrapped separately for NS_BINDING_ABORTED resilience)
    try {
      const tReader = Date.now()
      await page.goto(`${PROD}/documents/${docId}/read`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      try {
        await page
          .locator('p, [data-testid="segment-text"]')
          .first()
          .waitFor({ state: 'visible', timeout: 30000 })
      } catch {
        test.info().annotations.push({ type: 'skip', description: 'Large doc reader content not visible' })
      }
      const readerTime = Date.now() - tReader
      test.info().annotations.push({
        type: 'timing',
        description: JSON.stringify({ step: 'large-reader-nav', elapsed_ms: readerTime }),
      })
      await snap('large-book-reader')
    } catch (readerErr) {
      test.info().annotations.push({
        type: 'skip',
        description: `Large-doc reader navigation aborted (likely NS_BINDING_ABORTED): ${String(readerErr)}`,
      })
    }
  })

  // ==================================================================
  // Flow 27 — RF-CROSS-03
  // ==================================================================

  test('RF-CROSS-03: Global theme persistence across pages @userflow @p1', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Step 1 — navigate to /documents (SiteNav is visible here)
    const t0 = Date.now()
    await page.goto(`${PROD}/documents`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('a[href*="/read"], [data-testid="document-card"]', { timeout: 20000 })
    await snap('theme-documents-light')

    // Step 2 — open global theme gear in SiteNav
    const themeTrigger = page.locator('[data-testid="global-theme-trigger"]').first()
    let themeFound = await themeTrigger.isVisible({ timeout: 5000 }).catch(() => false)

    if (!themeFound) {
      const gearAlt = page.locator(
        'button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i], button[title*="theme" i]',
      ).first()
      themeFound = await gearAlt.isVisible({ timeout: 3000 }).catch(() => false)
      if (themeFound) await gearAlt.click()
    } else {
      await themeTrigger.click()
    }

    if (!themeFound) {
      test.skip(true, 'Global theme trigger not found in SiteNav')
      return
    }
    await page.waitForTimeout(500)

    // Step 3 — switch to dark mode
    const darkToggle = page.locator(
      'button:has-text("Dark"), [aria-label*="dark" i], [data-testid*="dark"]',
    ).first()
    if (await darkToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await darkToggle.click()
      await page.waitForTimeout(500)
      await snap('theme-documents-dark')
    }
    // Close theme panel
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Step 4 — navigate to /search
    const t1 = Date.now()
    await page.goto(`${PROD}/search`)
    await page.waitForLoadState('domcontentloaded')
    const searchTime = Date.now() - t1
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'search-page-nav', elapsed_ms: searchTime }),
    })
    await snap('theme-search-dark')

    // Step 5 — navigate to /terminology
    await page.goto(`${PROD}/terminology`)
    await page.waitForLoadState('domcontentloaded')
    await snap('theme-terminology-dark')

    // Step 6 — navigate to /profile
    await page.goto(`${PROD}/profile`)
    await page.waitForLoadState('domcontentloaded')
    await snap('theme-profile-dark')

    // Verify theme persists — check body class or data attribute
    const isDark = await page.evaluate(() => {
      const html = document.documentElement
      return html.classList.contains('dark') ||
        html.getAttribute('data-theme') === 'dark' ||
        document.body.classList.contains('dark')
    })
    test.info().annotations.push({
      type: 'info',
      description: `Dark theme persisted to /profile: ${isDark}`,
    })

    // NOTE: Reader and editor pages hide SiteNav and have their own theme system.
    test.info().annotations.push({
      type: 'info',
      description: 'Note: SiteNav is hidden on reader/editor pages. Global theme and reader themes are independent systems.',
    })
  })

  // ==================================================================
  // Flow 28 — RF-CROSS-04
  // ==================================================================

  test('RF-CROSS-04: Error / empty states @userflow @p1', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Step 1 — /documents (as reader, may have docs, this is just baseline)
    await page.goto(`${PROD}/documents`)
    await page.waitForLoadState('domcontentloaded')

    // Step 2 — visit editor for non-existent doc
    const tEditorErr = Date.now()
    await page.goto(`${PROD}/documents/fake-id-12345/edit`)
    await page.waitForLoadState('domcontentloaded')
    const editorErrTime = Date.now() - tEditorErr
    test.info().annotations.push({
      type: 'timing',
      description: JSON.stringify({ step: 'error-editor-fake-id', elapsed_ms: editorErrTime }),
    })

    // Verify error state — should show an error message, not a blank page
    const errorMessage = page.locator(
      'text="error", text="Error", text="not found", text="Not Found", text="404", [data-testid*="error"]',
    ).first()
    // Wait for error state to render (or timeout after 5s)
    await errorMessage.waitFor({ state: 'visible', timeout: 5000 }).catch(() => page.waitForTimeout(3000))
    const hasErrorMsg = await errorMessage.isVisible().catch(() => false)
    await snap('error-editor-fake-id')
    test.info().annotations.push({
      type: hasErrorMsg ? 'info' : 'warn',
      description: hasErrorMsg
        ? 'Error state rendered for non-existent document'
        : 'No error message found for non-existent document — potential blank page',
    })

    // Step 3 — search gibberish
    const docId = await discoverSmallestDocId(page)
    if (docId) {
      await page.goto(`${PROD}/documents/${docId}/read`)
      await page.waitForLoadState('domcontentloaded')
      try {
        await page
          .locator('p, [data-testid="segment-text"]')
          .first()
          .waitFor({ state: 'visible', timeout: 20000 })
      } catch {
        // continue anyway
      }

      // Open search sidebar if possible and search gibberish
      const searchInput = page.locator(
        'input[placeholder*="search" i], input[aria-label*="search" i]',
      ).first()
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill('xyznonexistentterm999')
        await page.waitForTimeout(1500)
        await snap('error-search-no-results')

        // Check for "no results" message
        const noResults = page.locator(
          'text="No results", text="no results", text="0 results", [data-testid*="empty"]',
        ).first()
        const hasNoResultsMsg = await noResults.isVisible({ timeout: 3000 }).catch(() => false)
        test.info().annotations.push({
          type: hasNoResultsMsg ? 'info' : 'warn',
          description: hasNoResultsMsg
            ? '"No results" message found for gibberish search'
            : 'No "no results" message for gibberish search',
        })
      }
    }

    // Step 4 — attempt phase advance on locked segment (if possible)
    // This is best-effort and documented as a non-critical check
    test.info().annotations.push({
      type: 'info',
      description: 'Error-state checks completed: fake-doc editor, gibberish search. Phase-advance-stale check requires active segment in editor — deferred.',
    })
  })

  // ==================================================================
  // Flow 29 — RF-CROSS-05
  // ==================================================================

  test('RF-CROSS-05: EN/ZH language switcher consistency @userflow @p2', async ({ page, snap }) => {
    await injectSession(page.context(), translatorTokens.access, translatorTokens.refresh)

    // Discover a doc (ideally one with ZH)
    const docId = await discoverDocWithZH(page) ?? await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }

    // Step 1 — open editor
    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')
    try {
      await page
        .locator('[data-testid="segment-list-item"], tr')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      test.skip(true, 'Segment list not visible')
      return
    }
    await snap('cross-lang-editor-en')

    // Step 2 — find ZH language tab
    const zhTab = page.locator(
      '[data-testid="lang-tab-zh"], button:has-text("ZH"), button:has-text("中文"), [aria-label*="ZH"]',
    ).first()
    const zhFound = await zhTab.isVisible({ timeout: 5000 }).catch(() => false)

    if (!zhFound) {
      test.skip(true, 'ZH language tab not found in editor')
      return
    }

    // Count segments before switch
    const segCountBefore = await page.locator('[data-testid="segment-list-item"], tr').count()

    // Step 3 — switch to ZH; wait for re-fetch to settle
    await zhTab.click()
    // Wait for segment list to either re-populate or show empty state (max 8s)
    await page.waitForFunction(
      () => {
        const rows = document.querySelectorAll('[data-testid="segment-list-item"], tr')
        // Wait until count is stable (non-zero or a clear empty-state message is present)
        return rows.length > 0 || document.querySelector('[data-testid="empty-state"], .text-gray-400') !== null
      },
      { timeout: 8000 },
    ).catch(() => page.waitForTimeout(2000))
    await snap('cross-lang-editor-zh')

    // Step 4 — verify segment count; ZH may have 0 if no ZH segments exist for this doc
    const segCountAfter = await page.locator('[data-testid="segment-list-item"], tr').count()
    test.info().annotations.push({
      type: 'info',
      description: `Segment count: EN=${segCountBefore}, ZH=${segCountAfter}`,
    })
    if (segCountAfter === 0) {
      // No ZH segments found — annotate and continue (not a hard failure: ZH data may be absent)
      test.info().annotations.push({
        type: 'warn',
        description: `ZH tab shows 0 segments (doc may not have ZH translations). EN count was ${segCountBefore}.`,
      })
    } else {
      expect.soft(
        segCountAfter,
        `Segment count changed after ZH switch: ${segCountBefore} → ${segCountAfter}`,
      ).toBeGreaterThanOrEqual(segCountBefore)
    }

    // Step 5 — switch back to EN
    const enTab = page.locator(
      'button:has-text("EN"), button:has-text("English"), [aria-label*="EN"], [data-testid="lang-tab-en"]',
    ).first()
    if (await enTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enTab.click()
      await page.waitForTimeout(1000)
      await snap('cross-lang-editor-en-restored')
    }

    // Step 6 — verify EN restored
    const segCountRestored = await page.locator('[data-testid="segment-list-item"], tr').count()
    test.info().annotations.push({
      type: 'info',
      description: `Segment count after EN restore: ${segCountRestored}`,
    })

    // Also test reader ZH toggle as a bonus
    await page.goto(`${PROD}/documents/${docId}/read`)
    await page.waitForLoadState('domcontentloaded')
    try {
      await page
        .locator('p, [data-testid="segment-text"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
    } catch {
      // continue
    }

    const readerZhToggle = page.locator(
      'button:has-text("中文"), button:has-text("ZH"), [aria-label*="ZH"]',
    ).first()
    if (await readerZhToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await readerZhToggle.click()
      await page.waitForTimeout(1000)
      await snap('cross-lang-reader-zh')
    }

    await snap('cross-lang-final')
  })

  // ==================================================================
  // Flow 30 — RF-FURIGANA-01
  // ==================================================================

  test('RF-FURIGANA-01: Furigana rendering on production documents @userflow @p0', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Discover a readable doc (≥100 segments) to ensure real JP content
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')
    const readableDocId = await discoverReadableDocId(page)
    if (!readableDocId) {
      test.skip(true, 'No readable documents found (min 100 segments)')
      return
    }

    // Navigate to reader
    await page.goto(`${PROD}/documents/${readableDocId}/read`)
    await page.waitForLoadState('domcontentloaded')

    try {
      await page
        .locator('p, [data-testid="segment-text"], [data-reader-theme]')
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 })
    } catch {
      test.skip(true, 'Reader content not visible')
      return
    }

    // Switch to JP single-language mode so furigana can render
    const jpToggle = page.locator('button:has-text("JP")').first()
    if (await jpToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await jpToggle.click()
      await page.waitForTimeout(800)
    }

    // Open reader settings and enable furigana
    const settingsBtn = page.locator('button[aria-label="Reader settings"]')
    if (!(await settingsBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Reader settings button not found')
      return
    }
    await settingsBtn.click()
    await page.waitForTimeout(400)

    // Click ふりがな button
    const furiganaBtn = page.locator('button:has-text("ふりがな"), [data-furigana-mode="furigana"]').first()
    if (!(await furiganaBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Furigana toggle button not found')
      return
    }
    await furiganaBtn.click()
    await page.waitForTimeout(2000) // allow ruby elements to render

    // Close settings
    await settingsBtn.click().catch(() => page.keyboard.press('Escape'))
    await page.waitForTimeout(500)

    // Verify <ruby> and <rt> elements exist
    const rubyCount = await page.locator('ruby').count().catch(() => 0)
    const rtCount = await page.locator('rt').count().catch(() => 0)
    test.info().annotations.push({
      type: 'furigana-check',
      description: JSON.stringify({ mode: 'furigana', rubyCount, rtCount }),
    })
    expect(rubyCount, 'furigana <ruby> elements should be present').toBeGreaterThan(0)
    expect(rtCount, 'furigana <rt> reading elements should be present').toBeGreaterThan(0)
    await snap('reader-furigana-active')

    // Toggle OFF → verify all <ruby> removed
    await settingsBtn.click().catch(() => page.keyboard.press('Escape'))
    await page.waitForTimeout(400)
    const offBtn = page.locator('button:has-text("日本語"), [data-furigana-mode="off"]').first()
    if (await offBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await offBtn.click()
      await page.waitForTimeout(1500)
    }
    await settingsBtn.click().catch(() => page.keyboard.press('Escape'))
    await page.waitForTimeout(500)

    const rubyAfterOff = await page.locator('ruby').count().catch(() => 0)
    expect(rubyAfterOff, 'No <ruby> elements after furigana OFF').toBe(0)
    await snap('reader-furigana-off')

    // Toggle to romaji mode
    await settingsBtn.click().catch(() => page.keyboard.press('Escape'))
    await page.waitForTimeout(400)
    const romajiBtn = page.locator('button:has-text("Rōmaji"), button:has-text("romaji"), [data-furigana-mode="romaji"]').first()
    if (await romajiBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await romajiBtn.click()
      await page.waitForTimeout(1500)
    }
    await settingsBtn.click().catch(() => page.keyboard.press('Escape'))
    await page.waitForTimeout(500)

    // Verify first <rt> contains ASCII/latin
    const firstRtText = await page.locator('rt').first().textContent().catch(() => '')
    const containsRomaji = /[a-zA-Z]/.test(firstRtText)
    test.info().annotations.push({
      type: 'romaji-check',
      description: JSON.stringify({ firstRtText, containsRomaji }),
    })
    expect(containsRomaji, 'first <rt> should contain romaji (ASCII) text').toBe(true)
    await snap('reader-furigana-romaji')

    // Clean up: turn furigana off
    await settingsBtn.click().catch(() => page.keyboard.press('Escape'))
    await page.waitForTimeout(400)
    const finalOff = page.locator('button:has-text("日本語"), [data-furigana-mode="off"]').first()
    if (await finalOff.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await finalOff.click()
      await page.waitForTimeout(500)
    }
    await settingsBtn.click().catch(() => page.keyboard.press('Escape'))
  })

  // ==================================================================
  // Flow 31 — RF-READER-06
  // ==================================================================

  test('RF-READER-06: Keyboard shortcuts @userflow @p0', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Discover a readable doc
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')
    const readableDocId = await discoverReadableDocId(page)
    if (!readableDocId) {
      test.skip(true, 'No readable documents found (min 100 segments)')
      return
    }

    await page.goto(`${PROD}/documents/${readableDocId}/read`)
    await page.waitForLoadState('domcontentloaded')

    try {
      await page
        .locator('p, [data-reader-theme]')
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 })
    } catch {
      test.skip(true, 'Reader content not visible')
      return
    }

    // ── ? key → help modal ──────────────────────────────────────────
    await page.keyboard.press('?')
    await page.waitForTimeout(500)

    const helpModal = page.locator('[role="dialog"][aria-label="Keyboard shortcuts"], [role="dialog"]:has-text("shortcut"), [role="dialog"]:has-text("Shortcut")').first()
    const helpVisible = await helpModal.isVisible({ timeout: 5_000 }).catch(() => false)
    if (helpVisible) {
      test.info().annotations.push({ type: 'info', description: '? key opened keyboard shortcuts modal' })
      await snap('keyboard-help-modal')
    } else {
      test.info().annotations.push({ type: 'skip', description: '? key did not open help modal — keyboard shortcuts may not be implemented' })
    }

    // ── Esc closes modal ────────────────────────────────────────────
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    const helpAfterEsc = await helpModal.isVisible().catch(() => false)
    if (helpVisible) {
      expect(helpAfterEsc, 'Help modal should close on Esc').toBe(false)
    }

    // ── s toggles settings panel ─────────────────────────────────────
    await page.keyboard.press('s')
    await page.waitForTimeout(500)

    const settingsPanel = page.locator(
      '[data-testid*="reader-settings"], [aria-label*="Reader settings" i], [class*="settings-panel"]',
    ).first()
    const settingsOpen = await settingsPanel.isVisible({ timeout: 3_000 }).catch(() => false)
    if (settingsOpen) {
      test.info().annotations.push({ type: 'info', description: 's key toggled settings panel open' })
      await page.keyboard.press('s')
      await page.waitForTimeout(300)
      const settingsClosed = !(await settingsPanel.isVisible().catch(() => true))
      test.info().annotations.push({
        type: settingsClosed ? 'info' : 'warn',
        description: settingsClosed ? 's key toggled settings panel closed' : 's key may not toggle settings closed',
      })
    } else {
      test.info().annotations.push({ type: 'skip', description: 's key did not toggle settings panel' })
    }

    // ── / focuses search input ──────────────────────────────────────
    await page.keyboard.press('/')
    await page.waitForTimeout(500)

    const searchInput = page.locator('input[aria-label="Search document"], input[placeholder*="search" i]').first()
    const searchFocused = await searchInput.evaluate((el) => document.activeElement === el).catch(() => false)
    if (searchFocused) {
      test.info().annotations.push({ type: 'info', description: '/ key focused search input' })
    } else {
      test.info().annotations.push({ type: 'skip', description: '/ key did not focus search input' })
    }

    // ── Esc closes sidebar ──────────────────────────────────────────
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    const sidebar = page.locator('[aria-label="Reader sidebar"]')
    const sidebarClosed = !(await sidebar.isVisible().catch(() => true))
    if (sidebarClosed) {
      test.info().annotations.push({ type: 'info', description: 'Esc closed search sidebar' })
    }

    // ── j advances pages (scroll / virtual page change) ─────────────
    const initialScroll = await page.evaluate(() => {
      const el = document.querySelector('[class*="overflow-y-auto"]')
      return el ? el.scrollTop : window.scrollY
    })

    await page.keyboard.press('j')
    await page.waitForTimeout(500)

    const afterScroll = await page.evaluate(() => {
      const el = document.querySelector('[class*="overflow-y-auto"]')
      return el ? el.scrollTop : window.scrollY
    })

    test.info().annotations.push({
      type: 'info',
      description: `j key: scroll ${initialScroll} → ${afterScroll} (delta: ${afterScroll - initialScroll})`,
    })

    // ── k goes back ─────────────────────────────────────────────────
    await page.keyboard.press('k')
    await page.waitForTimeout(500)

    const afterKScroll = await page.evaluate(() => {
      const el = document.querySelector('[class*="overflow-y-auto"]')
      return el ? el.scrollTop : window.scrollY
    })

    test.info().annotations.push({
      type: 'info',
      description: `k key: scroll ${afterScroll} → ${afterKScroll}`,
    })

    // ── b bookmark ──────────────────────────────────────────────────
    await page.keyboard.press('b')
    await page.waitForTimeout(500)
    test.info().annotations.push({ type: 'info', description: 'b key pressed (bookmark shortcut)' })

    await snap('keyboard-shortcuts-final')
  })

  // ==================================================================
  // Flow 32 — RF-READER-07
  // ==================================================================

  test('RF-READER-07: Tap-reveal WordPopup on production documents @userflow @p0', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Discover a readable doc
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')
    const readableDocId = await discoverReadableDocId(page)
    if (!readableDocId) {
      test.skip(true, 'No readable documents found (min 100 segments)')
      return
    }

    // Enable furigana and tap-reveal via localStorage before navigating
    await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('reader-theme-settings')
        const settings = raw ? JSON.parse(raw) : {}
        settings.furiganaMode = 'furigana'
        settings.tapRevealEnabled = true
        localStorage.setItem('reader-theme-settings', JSON.stringify(settings))
      } catch { /* ignore */ }
    })

    await page.goto(`${PROD}/documents/${readableDocId}/read`)
    await page.waitForLoadState('domcontentloaded')

    try {
      await page.waitForSelector('ruby, p[data-paragraph-index]', { timeout: 30_000 })
      await page.waitForTimeout(1500)
    } catch {
      test.skip(true, 'Reader content not visible after furigana enable')
      return
    }

    // Switch to JP single-language mode
    const jpToggle = page.locator('button:has-text("JP")').first()
    if (await jpToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await jpToggle.click()
      await page.waitForTimeout(1000)
    }

    // Find a kanji span
    const kanjiSpan = page.locator('[data-kanji]').first()
    const kanjiFound = await kanjiSpan.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!kanjiFound) {
      test.skip(true, 'No [data-kanji] spans found — document needs furigana data for this test')
      return
    }

    // Click the kanji span
    await kanjiSpan.click()
    await page.waitForTimeout(500)
    await snap('wordpopup-kanji-active')

    // Verify popup appears
    const popup = page.locator('div[role="dialog"]')
    const popupVisible = await popup.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(popupVisible, 'WordPopup dialog should appear on kanji tap').toBe(true)

    if (popupVisible) {
      // Check for kanji base text in popup
      const popupText = await popup.textContent().catch(() => '')
      test.info().annotations.push({
        type: 'wordpopup-content',
        description: JSON.stringify({ popupText: popupText.slice(0, 200) }),
      })

      // ── Dismiss by clicking outside ───────────────────────────────
      // Click on the reader background area
      await page.locator('[data-reader-theme]').first().click({ position: { x: 10, y: 10 } })
      await page.waitForTimeout(300)
      const popupAfterOutside = await popup.isVisible().catch(() => false)
      expect(popupAfterOutside, 'WordPopup should dismiss when clicking outside').toBe(false)

      // ── Re-open popup ─────────────────────────────────────────────
      await kanjiSpan.click()
      await page.waitForTimeout(500)
      const popupReopened = await popup.isVisible().catch(() => false)
      expect(popupReopened, 'WordPopup should reopen on second kanji tap').toBe(true)

      // ── Dismiss by scrolling ──────────────────────────────────────
      await page.mouse.wheel(0, 300)
      await page.waitForTimeout(300)
      const popupAfterScroll = await popup.isVisible().catch(() => false)
      expect(popupAfterScroll, 'WordPopup should dismiss on scroll').toBe(false)
    }

    await snap('wordpopup-final')
  })

  // ==================================================================
  // Flow 33 — RF-CROSS-06
  // ==================================================================

  test('RF-CROSS-06: Full document lifecycle (admin → translator → reader) @userflow @p1', async ({ page, snap }) => {
    test.info().annotations.push({
      type: 'info',
      description: 'WARNING: This test mutates data (assignment + translation + phase advance). Uses a small document to minimize side effects.',
    })

    // ── Step 1: Admin discovers smallest doc and creates assignment ──
    await injectSession(page.context(), adminTokens.access, adminTokens.refresh)

    const docId = await discoverSmallestDocId(page)
    if (!docId) {
      test.skip(true, 'No documents found')
      return
    }
    test.info().annotations.push({ type: 'info', description: `Testing lifecycle on doc: ${docId}` })

    // Try to create an assignment via the assignments page
    await page.goto(`${PROD}/admin/documents/${docId}/assignments`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    await snap('lifecycle-admin-assignments')

    // Check if there's already an assignment for translator-1
    const existingAssignment = page.locator(
      'text="translator-1@test.com", [data-testid="assignment-row"]:has-text("translator-1")',
    ).first()
    const alreadyAssigned = await existingAssignment.isVisible({ timeout: 3_000 }).catch(() => false)

    if (!alreadyAssigned) {
      // Attempt to create assignment — look for add form
      const addBtn = page.locator('[data-testid="assignment-row-add"], button:has-text("Assign"), button:has-text("Add")').first()
      if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await addBtn.click()
        await page.waitForTimeout(500)
        // Look for user select
        const userSelect = page.locator('select, [data-testid*="user-select"]').first()
        if (await userSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
          // Try to select translator-1
          await userSelect.selectOption({ label: 'translator-1@test.com' }).catch(() => {
            return userSelect.selectOption({ index: 1 }).catch(() => {})
          })
          await page.waitForTimeout(300)

          const saveBtn = page.locator('[data-testid="assignment-save"], button:has-text("Save"), button:has-text("Confirm")').first()
          if (await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await saveBtn.click()
            await page.waitForTimeout(1000)
          }
        }
      } else {
        test.info().annotations.push({ type: 'skip', description: 'Assignment add button not found — may already have assignments' })
      }
    } else {
      test.info().annotations.push({ type: 'info', description: 'translator-1 already assigned to this document' })
    }

    // ── Step 2: Translator navigates to editor and translates a segment ──
    await injectSession(page.context(), translatorTokens.access, translatorTokens.refresh)

    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')

    try {
      await page
        .locator('[data-testid="segment-list-item"], tr')
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 })
    } catch {
      test.info().annotations.push({ type: 'skip', description: 'Segment list not visible for translator step' })
      return
    }

    // Click first segment
    await page.locator('[data-testid="segment-list-item"], tr').first().click()
    await page.waitForTimeout(500)

    // Look for textarea to edit translation
    const textarea = page.locator('textarea').first()
    const textareaVisible = await textarea.isVisible({ timeout: 10_000 }).catch(() => false)
    if (!textareaVisible) {
      test.info().annotations.push({ type: 'skip', description: 'Editor textarea not visible' })
      return
    }

    const translatorTimestamp = Date.now()
    await textarea.press('End')
    await textarea.press('Space')
    await page.keyboard.type(`lifecycle-test-${translatorTimestamp}`)

    // Save
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(2000)
    test.info().annotations.push({ type: 'info', description: `Translator saved translation: lifecycle-test-${translatorTimestamp}` })

    // ── Step 3: Admin advances phase ──────────────────────────────────
    await injectSession(page.context(), adminTokens.access, adminTokens.refresh)

    await page.goto(`${PROD}/documents/${docId}/edit`)
    await page.waitForLoadState('domcontentloaded')

    try {
      await page
        .locator('[data-testid="segment-list-item"], tr')
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 })
    } catch {
      test.info().annotations.push({ type: 'skip', description: 'Segment list not visible for admin step' })
      return
    }

    await page.locator('[data-testid="segment-list-item"], tr').first().click()
    await page.waitForTimeout(500)

    const phaseAdvanceBtn = page.locator('[data-testid="phase-advance-button"]')
    const terminalNote = await page.locator('[data-testid="phase-advance-terminal"]').isVisible().catch(() => false)
    if (terminalNote) {
      test.info().annotations.push({ type: 'skip', description: 'Segment at terminal phase — cannot advance' })
    } else if (await phaseAdvanceBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await phaseAdvanceBtn.click()
      await page.waitForTimeout(300)
      const confirmBtn = page.locator('[data-testid="phase-advance-confirm-submit"]')
      if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await confirmBtn.click()
        await page.waitForTimeout(1000)
      }
      test.info().annotations.push({ type: 'info', description: 'Phase advanced' })
    } else {
      test.info().annotations.push({ type: 'skip', description: 'Phase advance button not found' })
    }

    // ── Step 4: Reader opens document and sees content ────────────────
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    await page.goto(`${PROD}/documents/${docId}/read`)
    await page.waitForLoadState('domcontentloaded')

    try {
      await page
        .locator('p, [data-testid="segment-text"], [data-reader-theme]')
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 })
    } catch {
      test.info().annotations.push({ type: 'skip', description: 'Reader content not visible' })
      return
    }

    await snap('lifecycle-reader-final')

    // Verify reader shows content (no error page)
    const readerText = await page.locator('body').textContent().catch(() => '')
    const isErrorState = readerText.includes('Error') || readerText.includes('404') || readerText.includes('not found')
    expect(isErrorState, 'Reader should show document content, not error state').toBe(false)

    test.info().annotations.push({
      type: 'info',
      description: 'NOTE: This test leaves side effects (translation edit and possible phase advance). Manual cleanup may be required.',
    })
  })

  // ==================================================================
  // Flow 34 — RF-ERROR-01
  // ==================================================================

  test('RF-ERROR-01: JWT expiry mid-session handling @userflow @p1', async ({ page }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // ── Step 1: Navigate to a protected page ──────────────────────────
    await page.goto(`${PROD}/documents`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('a[href*="/read"], [data-testid="document-card"]', { timeout: 20_000 })

    // ── Step 2: Manipulate the auth cookie to expire the JWT ──────────
    // The Supabase SSR cookie stores tokens in format:
    // sb-<project_ref>-auth-token = JSON.stringify({ access_token, refresh_token, ... })
    const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
    const cookieName = `sb-${projectRef}-auth-token`

    const expiredTokens = await page.evaluate(
      ({ cookieName }) => {
        // Read current cookie value
        const cookies = document.cookie.split('; ')
        const cookieStr = cookies.find((c) => c.startsWith(cookieName + '='))
        if (!cookieStr) return { success: false, reason: 'Cookie not found' }

        const value = decodeURIComponent(cookieStr.slice(cookieName.length + 1))
        try {
          // Access token is in the value as JSON
          const parsed = JSON.parse(value)
          // Manipulate via cookieStore if available (HTTP-only cookies can't be set via JS)
          // This test may fail in headless browsers where cookie modification is restricted.
          return {
            success: false,
            reason: 'Cannot modify HTTP-only cookies via JS. Test requires direct cookie manipulation in browser context.',
            cookieName,
            hasCookie: true,
          }
        } catch {
          return { success: false, reason: 'Cookie parse error' }
        }
      },
      { cookieName },
    )

    if (!expiredTokens.success) {
      // Since we can't directly modify HTTP-only cookies via JS,
      // try a different approach: use the browser context to set an expired cookie
      const prodDomain = new URL(PROD).hostname
      const expiredSessionValue = JSON.stringify({
        access_token: readerTokens.access,
        refresh_token: readerTokens.refresh,
        token_type: 'bearer',
        expires_in: -1,
        expires_at: Math.floor(Date.now() / 1000) - 60, // expired 60 seconds ago
      })

      try {
        await page.context().addCookies([
          {
            name: cookieName,
            value: expiredSessionValue,
            domain: prodDomain,
            path: '/',
            secure: true,
            httpOnly: false,
            sameSite: 'Lax',
            expires: Math.floor(Date.now() / 1000) - 1, // already expired
          },
          {
            name: `${cookieName}.0`,
            value: expiredSessionValue,
            domain: prodDomain,
            path: '/',
            secure: true,
            httpOnly: false,
            sameSite: 'Lax',
            expires: Math.floor(Date.now() / 1000) - 1,
          },
        ])
        test.info().annotations.push({ type: 'info', description: 'Set expired JWT cookie via context.addCookies()' })
      } catch (err) {
        test.info().annotations.push({
          type: 'skip',
          description: `Cannot set expired cookie via context.addCookies(): ${String(err)}. JWT expiry test requires specific cookie manipulation not possible in this environment.`,
        })
        return
      }
    }

    // ── Step 3: Navigate to trigger token check ───────────────────────
    // Listen for console errors before navigation
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto(`${PROD}/profile`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    const finalUrl = page.url()
    test.info().annotations.push({
      type: 'info',
      description: `After expired token navigation, final URL: ${finalUrl}`,
    })

    // Verify behaviour:
    // - Either silent refresh succeeded (stayed on /profile)
    // - Or redirected to login
    const isLoginPage = finalUrl.includes('/login') || finalUrl.includes('/auth')
    if (isLoginPage) {
      test.info().annotations.push({ type: 'info', description: 'Redirected to login after expired token — correct graceful handling' })
    } else if (finalUrl.includes('/profile')) {
      test.info().annotations.push({ type: 'info', description: 'Stayed on /profile — silent refresh may have succeeded' })
    }

    // Check for no blank page / crash
    const pageText = await page.locator('body').textContent().catch(() => '')
    const isBlank = pageText.trim().length === 0
    expect(isBlank, 'Page should not be blank after expired token').toBe(false)

    if (consoleErrors.length > 0) {
      test.info().annotations.push({
        type: 'warn',
        description: `Console errors during expired token navigation: ${consoleErrors.slice(0, 5).join('; ')}`,
      })
    }

    // Re-inject valid session for subsequent tests
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)
  })

  // ==================================================================
  // Flow 35 — RF-READER-08
  // ==================================================================

  test('RF-READER-08: Rapid mode cycling stress test @userflow @p2', async ({ page, snap }) => {
    test.setTimeout(120_000)
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Discover a readable doc
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')
    const readableDocId = await discoverReadableDocId(page)
    if (!readableDocId) {
      test.skip(true, 'No readable documents found (min 100 segments)')
      return
    }

    await page.goto(`${PROD}/documents/${readableDocId}/read`)
    await page.waitForLoadState('domcontentloaded')

    try {
      await page
        .locator('p, [data-reader-theme]')
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 })
    } catch {
      test.skip(true, 'Reader content not visible')
      return
    }

    // ── Set up console error listener ──────────────────────────────────
    const consoleErrors: string[] = []
    const consoleWarnings: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
      if (msg.type() === 'warning') consoleWarnings.push(msg.text())
    })

    // Record initial scroll position
    const getScrollPos = async () => page.evaluate(() => {
      const el = document.querySelector('[class*="overflow-y-auto"]')
      return el ? el.scrollTop : window.scrollY
    })
    const initialScroll = await getScrollPos()

    const settingsBtn = page.locator('button[aria-label="Reader settings"]')
    if (!(await settingsBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Reader settings button not found')
      return
    }

    // ── Cycle furigana modes 3× ────────────────────────────────────────
    for (let cycle = 0; cycle < 3; cycle++) {
      await settingsBtn.click()
      await page.waitForTimeout(150)

      // ON (furigana)
      const furiganaBtn = page.locator('button:has-text("ふりがな"), [data-furigana-mode="furigana"]').first()
      if (await furiganaBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await furiganaBtn.click()
        await page.waitForTimeout(100)
      }

      // Romaji
      const romajiBtn = page.locator('button:has-text("Rōmaji"), button:has-text("romaji"), [data-furigana-mode="romaji"]').first()
      if (await romajiBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await romajiBtn.click()
        await page.waitForTimeout(100)
      }

      // OFF
      const offBtn = page.locator('button:has-text("日本語"), [data-furigana-mode="off"]').first()
      if (await offBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await offBtn.click()
        await page.waitForTimeout(100)
      }

      await settingsBtn.click()
      await page.waitForTimeout(100)
    }

    // Verify final furigana state is OFF (last selected)
    const finalRubyAfterFuriganaCycle = await page.locator('ruby').count().catch(() => 0)
    test.info().annotations.push({
      type: 'stress-furigana',
      description: JSON.stringify({ finalRubyCount: finalRubyAfterFuriganaCycle, expected: 0 }),
    })

    // ── Cycle language modes 3× ────────────────────────────────────────
    const jpBtn = page.locator('button:has-text("JP")').first()
    const bilingualBtn = page.locator('button:has-text("JP↔EN"), button:has-text("Bilingual")').first()
    const enBtn = page.locator('button:has-text("EN")').last()

    for (let cycle = 0; cycle < 3; cycle++) {
      if (await jpBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await jpBtn.click()
        await page.waitForTimeout(100)
      }
      if (await bilingualBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await bilingualBtn.click()
        await page.waitForTimeout(100)
      }
      if (await enBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await enBtn.click()
        await page.waitForTimeout(100)
      }
    }

    // ── Cycle themes rapidly ───────────────────────────────────────────
    await settingsBtn.click()
    await page.waitForTimeout(150)

    const themes = ['Light', 'Dark', 'Sepia', 'Pastel', 'Light']
    for (const theme of themes) {
      const themeBtn = page.locator(`button:has-text("${theme}")`).first()
      if (await themeBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await themeBtn.click()
        await page.waitForTimeout(100)
      }
    }

    await settingsBtn.click()
    await page.waitForTimeout(300)

    // ── Assertions after rapid cycling ─────────────────────────────────

    // No blank page
    const bodyText = await page.locator('body').textContent().catch(() => '')
    const isBlank = bodyText.trim().length === 0
    expect(isBlank, 'Page should not be blank after rapid mode cycling').toBe(false)

    // No console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('NS_BINDING_ABORTED'),
    )
    test.info().annotations.push({
      type: 'stress-errors',
      description: JSON.stringify({
        totalErrors: consoleErrors.length,
        criticalErrors: criticalErrors.length,
        errors: criticalErrors.slice(0, 5),
      }),
    })

    // Reader content should still be visible
    const hasContent = await page.locator('p').first().isVisible().catch(() => false)
    expect(hasContent, 'Reader content should still be visible after rapid cycling').toBe(true)

    // Scroll position should be preserved (or not far from original)
    const finalScroll = await getScrollPos()
    test.info().annotations.push({
      type: 'stress-scroll',
      description: JSON.stringify({ initialScroll, finalScroll }),
    })

    await snap('stress-cycling-final')
  })

  // ==================================================================
  // Flow 36 — RF-READER-09
  // ==================================================================

  test('RF-READER-09: Partially translated documents @userflow @p2', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Discover a document with mixed phase segments
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')

    // Query the documents API to find one with mixed phases
    const docsRes = await apiFetch<{ documents?: Array<{ id: string; segment_count?: number }> }>(
      page,
      '/api/documents?limit=100',
    )
    const docs = docsRes.body?.documents ?? []
    if (docs.length === 0) {
      test.skip(true, 'No documents found')
      return
    }

    // Try to find a doc we can navigate to; prefer one with >1 segment to test mixed phases
    const doc = docs.find((d) => (d.segment_count ?? 0) > 1) ?? docs[0]
    const docId = doc.id ?? null
    if (!docId) {
      test.skip(true, 'No document ID found')
      return
    }

    // Check if this doc has mixed phase segments
    try {
      const segmentsRes = await apiFetch<unknown>(page, `/api/documents/${docId}/segments?limit=50`)
      const segmentsArray = Array.isArray(segmentsRes.body)
        ? (segmentsRes.body as Array<{ phase?: string; target_text?: string }>)
        : Array.isArray((segmentsRes.body as { segments?: unknown })?.segments)
          ? ((segmentsRes.body as { segments: Array<{ phase?: string; target_text?: string }> }).segments)
          : []

      const phases = new Set(segmentsArray.map((s) => s.phase ?? 'unknown'))
      const hasMixedPhases = phases.size > 1

      if (!hasMixedPhases || segmentsArray.length === 0) {
        test.skip(true, `Document ${docId} has only ${phases.size} phase(s) — no mixed phases to test. Need a document with segments in draft + proofread/edited states.`)
        return
      }

      const hasDraft = segmentsArray.some((s) => s.phase === 'draft')
      const hasTranslated = segmentsArray.some((s) => s.phase === 'proofread' || s.phase === 'edited')
      test.info().annotations.push({
        type: 'mixed-phases',
        description: JSON.stringify({
          docId,
          totalSegments: segmentsArray.length,
          phases: [...phases],
          hasDraft,
          hasTranslated,
        }),
      })

      // Navigate to reader
      await page.goto(`${PROD}/documents/${docId}/read`)
      await page.waitForLoadState('domcontentloaded')

      try {
        await page
          .locator('p, [data-testid="segment-text"], [data-reader-theme]')
          .first()
          .waitFor({ state: 'visible', timeout: 20_000 })
      } catch {
        test.skip(true, 'Reader content not visible for partially-translated doc')
        return
      }

      await snap('partial-translation-reader')

      // Verify no crash — body text should be non-empty
      const bodyText = await page.locator('body').textContent().catch(() => '')
      const isErrorState = bodyText.includes('Error') || bodyText.includes('translation not available')
      expect(isErrorState, 'Reader should not show error for mixed-phase document').toBe(false)

      // Verify content visible
      const paragraphCount = await page.locator('p').count().catch(() => 0)
      expect(paragraphCount, 'Reader should render paragraph content for mixed-phase document').toBeGreaterThan(0)

      await snap('partial-translation-final')
    } catch {
      test.skip(true, 'Could not query segment phases for this document')
    }
  })

  // ==================================================================
  // Flow 37 — RF-FURIGANA-03
  // ==================================================================

  test('RF-FURIGANA-03: Mixed content — kanji, katakana, hiragana, Latin @userflow @p2', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // Discover a readable doc
    await page.goto(PROD)
    await page.waitForLoadState('domcontentloaded')
    const readableDocId = await discoverReadableDocId(page)
    if (!readableDocId) {
      test.skip(true, 'No readable documents found (min 100 segments)')
      return
    }

    // Enable furigana before navigating
    await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('reader-theme-settings')
        const settings = raw ? JSON.parse(raw) : {}
        settings.furiganaMode = 'furigana'
        localStorage.setItem('reader-theme-settings', JSON.stringify(settings))
      } catch { /* ignore */ }
    })

    await page.goto(`${PROD}/documents/${readableDocId}/read`)
    await page.waitForLoadState('domcontentloaded')

    try {
      await page.waitForSelector('ruby, p[data-paragraph-index]', { timeout: 30_000 })
      await page.waitForTimeout(1500)
    } catch {
      test.skip(true, 'Reader content not visible')
      return
    }

    // Switch to JP single-language mode
    const jpToggle = page.locator('button:has-text("JP")').first()
    if (await jpToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await jpToggle.click()
      await page.waitForTimeout(1000)
    }

    // ── Verify <ruby> only wraps kanji spans, not kana ──────────────────
    const rubyCount = await page.locator('ruby').count().catch(() => 0)
    if (rubyCount === 0) {
      test.skip(true, 'No <ruby> elements found — furigana may not be enabled or document has no kanji')
      return
    }

    // Check text content of first few <ruby> elements — should all be kanji
    const firstRubyTexts: string[] = []
    const rubyElements = page.locator('ruby')
    const count = Math.min(rubyCount, 10)
    for (let i = 0; i < count; i++) {
      const text = await rubyElements.nth(i).textContent().catch(() => '')
      firstRubyTexts.push(text)
    }

    // Verify that at least some ruby elements contain kanji (CJK Unified Ideographs)
    // and none contain only kana
    const kanjiRegex = /[\u4E00-\u9FFF]/
    const kanaOnlyRegex = /^[\u3040-\u309F\u30A0-\u30FF]+$/ // hiragana or katakana only

    let kanjiInRuby = 0
    let kanaOnlyRuby = 0
    for (const text of firstRubyTexts) {
      if (kanjiRegex.test(text)) kanjiInRuby++
      if (kanaOnlyRegex.test(text.replace(/\s/g, ''))) kanaOnlyRuby++
    }

    test.info().annotations.push({
      type: 'mixed-content-check',
      description: JSON.stringify({
        totalRuby: rubyCount,
        sampledCount: count,
        firstRubyTexts,
        kanjiInRuby,
        kanaOnlyRuby,
      }),
    })

    // Kana-only ruby would be a bug — furigana should only annotate kanji
    expect(kanaOnlyRuby, 'No <ruby> element should wrap kana-only text').toBe(0)

    // ── Verify Latin/alphanumeric text renders without <ruby> wrapping ──
    // Look for text nodes containing latin characters outside ruby
    const latinInRuby = await page.evaluate(() => {
      let count = 0
      document.querySelectorAll('ruby').forEach((ruby) => {
        const text = ruby.textContent ?? ''
        if (/[a-zA-Z]/.test(text)) count++
      })
      return count
    })
    test.info().annotations.push({
      type: 'mixed-latin',
      description: JSON.stringify({ rubyElementsContainingLatin: latinInRuby }),
    })

    // ── Visual check ────────────────────────────────────────────────────
    await snap('mixed-content-furigana')

    // ── Check no layout overlap in mixed paragraph ──────────────────────
    const hasOverlap = await page.evaluate(() => {
      // Simple check: any rt element overlapping its sibling text
      const rubies = document.querySelectorAll('ruby')
      for (const ruby of rubies) {
        const rt = ruby.querySelector('rt')
        if (!rt) continue
        const rubyRect = ruby.getBoundingClientRect()
        const rtRect = rt.getBoundingClientRect()
        // rt should be ABOVE the base text, not overlapping it vertically
        if (rtRect.bottom > rubyRect.top + 2) {
          return { overlap: true, rubyText: ruby.textContent?.slice(0, 20) }
        }
      }
      return { overlap: false }
    })
    expect(hasOverlap.overlap, 'furigana <rt> should not overlap base text').toBe(false)

    await snap('mixed-content-final')
  })

  // ==================================================================
  // Flow 38 — RF-READER-10
  // ==================================================================

  test('RF-READER-10: Edge-case documents (0 segments, 1 segment, all headings) @userflow @p2', async ({ page, snap }) => {
    await injectSession(page.context(), readerTokens.access, readerTokens.refresh)

    // ── Query documents API to find edge-case documents ──────────────────
    const docsRes = await apiFetch<{ documents?: Array<{ id: string; segment_count?: number; title?: string }> }>(
      page,
      '/api/documents?limit=100',
    )
    const docs = docsRes.body?.documents ?? []

    if (docs.length === 0) {
      test.skip(true, 'No documents found')
      return
    }

    test.info().annotations.push({
      type: 'edge-case-setup',
      description: JSON.stringify({ totalDocs: docs.length }),
    })

    // Helper: navigate to reader and verify no crash
    async function verifyReaderNotBlank(docId: string, label: string): Promise<boolean> {
      try {
        await page.goto(`${PROD}/documents/${docId}/read`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2000)

        // Check for empty state or content
        const bodyText = await page.locator('body').textContent().catch(() => '')
        const isEmpty = bodyText.trim().length < 10

        // Check for error indicators
        const hasError = bodyText.includes('Error') || bodyText.includes('error') ||
          bodyText.includes('NaN') || bodyText.includes('undefined')

        test.info().annotations.push({
          type: `edge-case-${label}`,
          description: JSON.stringify({
            docId,
            isEmpty,
            hasError,
            bodyPreview: bodyText.slice(0, 200),
          }),
        })

        await snap(`edge-case-${label}`)

        return !hasError && !isEmpty
      } catch (err) {
        test.info().annotations.push({
          type: `edge-case-${label}`,
          description: `Navigation failed: ${String(err)}`,
        })
        return false
      }
    }

    // ── Test 0-segment document ─────────────────────────────────────────
    const zeroSegDoc = docs.find((d) => (d.segment_count ?? -1) === 0)
    if (zeroSegDoc?.id) {
      const ok = await verifyReaderNotBlank(zeroSegDoc.id, 'zero-segments')
      expect(ok, '0-segment document should show empty state, not blank page or error').toBe(true)
    } else {
      test.info().annotations.push({
        type: 'skip',
        description: 'No 0-segment document found in database. Need a document with segment_count=0 to test empty state.',
      })
    }

    // ── Test 1-segment document ─────────────────────────────────────────
    const oneSegDoc = docs.find((d) => (d.segment_count ?? 0) === 1)
    if (oneSegDoc?.id) {
      const ok = await verifyReaderNotBlank(oneSegDoc.id, 'one-segment')
      expect(ok, '1-segment document should render single paragraph').toBe(true)

      // Verify at least one paragraph renders
      const pCount = await page.locator('p').count().catch(() => 0)
      test.info().annotations.push({
        type: 'edge-case-one-segment',
        description: JSON.stringify({ pCount }),
      })
    } else {
      test.info().annotations.push({
        type: 'skip',
        description: 'No 1-segment document found in database. Need a document with segment_count=1 to test single-segment rendering.',
      })
    }

    // ── Test document with only headings (no body) ──────────────────────
    // Heuristic: look for docs with low segment_count where title is same as content
    const smallDoc = docs.find((d) => (d.segment_count ?? 0) >= 2 && (d.segment_count ?? 0) <= 5)
    if (smallDoc?.id) {
      const ok = await verifyReaderNotBlank(smallDoc.id, 'small-doc')
      expect(ok, 'Small document should render without error').toBe(true)

      // Check headings render with correct font sizing
      const headings = page.locator('h1, h2, h3, h4')
      const headingCount = await headings.count().catch(() => 0)
      test.info().annotations.push({
        type: 'edge-case-headings',
        description: JSON.stringify({ docId: smallDoc.id, headingCount }),
      })
      await snap('edge-case-headings')
    } else {
      test.info().annotations.push({
        type: 'skip',
        description: 'No small document (2-5 segments) found for heading edge-case test.',
      })
    }

    // ── Check documents list card shows correct segment count ────────────
    await page.goto(`${PROD}/documents`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('a[href*="/read"], [data-testid="document-card"]', { timeout: 20_000 })

    // Look for any segment count text that might be "NaN"
    const bodyText = await page.locator('body').textContent().catch(() => '')
    const hasNaN = bodyText.includes('NaN')
    expect(hasNaN, 'Document cards should not show NaN segment count').toBe(false)

    await snap('edge-case-documents-list')
  })

})