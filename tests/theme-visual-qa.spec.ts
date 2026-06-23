/**
 * tests/theme-visual-qa.spec.ts
 *
 * Phase 1.1f visual QA: captures every key route in BOTH light and dark theme
 * so a vision specialist can judge contrast/layout correctness across themes.
 *
 * Architecture: mirrors tests/reader-screenshots.spec.ts — imports from
 * @playwright/test directly (NOT the camoufox fixture), launches Firefox
 * per-role with self-sufficient login fallback, and uses bounded top-region
 * clips (1280×1200) to stay under Firefox's 32767px physical screenshot limit.
 *
 * Theme control: the app has TWO coupled localStorage keys:
 *   1. kt-theme            — read by the FOUC inline <script> in app/layout.tsx;
 *                            sets html[data-theme] before first paint.
 *   2. reader-theme-settings — read by the ThemeProvider (wraps the entire app);
 *                              sets data-reader-theme on its wrapper div and
 *                              overrides semantic --color-* CSS tokens on ALL
 *                              pages (not just the reader route).
 *
 * Setting kt-theme ALONE is insufficient for visual change on non-reader routes
 * because the ThemeProvider defaults to theme:'light'.  We set BOTH keys to the
 * same value via context.addInitScript (runs before any page script).
 *
 * For the reader route the reader subtree keeps its own --rt-* theme tokens;
 * that's expected/correct behaviour.
 *
 * Screenshots → test-results/screenshots/theme-qa/<route>__<light|dark>.png
 */

import { test, expect, firefox, type Page, type Browser, type BrowserContext } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

// Real document id for reader + editor routes
const DOC_ID = '86adf815-b0ca-46eb-bab7-b6fb040b845c'
const READ_PATH = `/documents/${DOC_ID}/read`
const EDIT_PATH = `/documents/${DOC_ID}/edit`

// High-res capture knobs (mirrors reader-screenshots)
const VIEWPORT = { width: 1280, height: 1600 }
const DEVICE_SCALE_FACTOR = 2

// Stable top-region clip so contrast is judgeable
const CLIP_HEIGHT = 1200

// Mirror the ROLES creds from tests/global-setup.ts for self-login fallback
const ROLE_CREDS: Record<string, { email: string; password: string }> = {
    reader: { email: 'reader-1@test.com', password: 'test-password' },
    translator: { email: 'translator-1@test.com', password: 'test-password' },
    admin: { email: 'admin-1@test.com', password: 'test-password' },
}

// ---------------------------------------------------------------------------
// Screenshot output
// ---------------------------------------------------------------------------

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'screenshots', 'theme-qa')

function ensureDir(): void {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

/**
 * Write a bounded top-region clip screenshot.
 * First scrolls to top, then captures the top CLIP_HEIGHT CSS px.
 * Returns the absolute path, or null on failure.
 */
async function snapTheme(page: Page, route: string, theme: 'light' | 'dark'): Promise<string | null> {
    ensureDir()
    const filename = `${route.replace(/^\/+/, '').replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}__${theme}.png`
    const fullPath = path.join(SCREENSHOT_DIR, filename)
    try {
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(400)
        await page.screenshot({
            path: fullPath,
            clip: { x: 0, y: 0, width: VIEWPORT.width, height: CLIP_HEIGHT },
        })
        console.log(`[theme-qa] ✓ ${filename}`)
        return fullPath
    } catch (err) {
        console.warn(`[theme-qa] ✗ FAILED ${filename}: ${err instanceof Error ? err.message : String(err)}`)
        return null
    }
}

// ---------------------------------------------------------------------------
// Auth — self-sufficient login mirroring global-setup.loginAndSaveState
// ---------------------------------------------------------------------------

function authStatePath(role: string): string {
    return path.join(process.cwd(), 'tests', '.auth', `${role}.json`)
}

async function ensureAuthState(role: string): Promise<string> {
    const statePath = authStatePath(role)
    if (fs.existsSync(statePath)) {
        console.log(`[auth] reusing existing storage state for ${role}`)
        return statePath
    }

    const creds = ROLE_CREDS[role]
    if (!creds) throw new Error(`No creds configured for role "${role}"`)

    fs.mkdirSync(path.dirname(statePath), { recursive: true })
    console.log(`[auth] logging in ${role} (${creds.email}) to create ${statePath}`)

    const browser = await firefox.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
        await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })

        const emailInput = page.locator('input[type="email"]')
        const passwordInput = page.locator('input[type="password"]')
        await emailInput.waitFor({ state: 'visible', timeout: 15_000 })

        async function typeAndVerify(loc: typeof emailInput, value: string): Promise<void> {
            await loc.click()
            await loc.fill('')
            await loc.pressSequentially(value, { delay: 25 })
            await expect(loc).toHaveValue(value, { timeout: 5_000 })
        }
        await typeAndVerify(emailInput, creds.email)
        await typeAndVerify(passwordInput, creds.password)
        await page.waitForTimeout(300)

        const tokenResponsePromise = page.waitForResponse(
            (resp) => resp.url().includes('/auth/v1/token') && resp.request().method() === 'POST',
            { timeout: 20_000 },
        )
        await page.click('button[type="submit"]')
        const tokenResp = await tokenResponsePromise
        if (tokenResp.status() !== 200) {
            const body = await tokenResp.text().catch(() => '<unreadable>')
            throw new Error(`auth status ${tokenResp.status()}: ${body.slice(0, 200)}`)
        }
        await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 }).catch(() => {})
        await page.waitForTimeout(800)
        await context.storageState({ path: statePath })
        console.log(`[auth] ✓ saved ${role} state -> ${statePath}`)
        return statePath
    } finally {
        await context.close()
        await browser.close()
    }
}

// ---------------------------------------------------------------------------
// Context factories
// ---------------------------------------------------------------------------

/** Launch a fresh high-res Firefox context for a given role. */
async function newRoleContext(role: string): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
    const statePath = await ensureAuthState(role)
    const browser = await firefox.launch({ headless: true })
    const context = await browser.newContext({
        storageState: statePath,
        viewport: VIEWPORT,
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
    })
    const page = await context.newPage()
    return { browser, context, page }
}

/** Launch a fresh anonymous (unauthenticated) high-res Firefox context. */
async function newAnonContext(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
    const browser = await firefox.launch({ headless: true })
    const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
    })
    const page = await context.newPage()
    return { browser, context, page }
}

// ---------------------------------------------------------------------------
// Page-content wait helpers
// ---------------------------------------------------------------------------

async function waitForHome(page: Page): Promise<void> {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
    // Home has a hero section. Wait for any nav or heading.
    await page.waitForSelector('nav, h1, h2', { timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(1500)
}

async function waitForLogin(page: Page): Promise<void> {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15_000 })
    await page.waitForTimeout(500)
}

async function waitForSearch(page: Page): Promise<void> {
    await page.goto(`${BASE}/search`, { waitUntil: 'domcontentloaded' })
    // Search page has a search input
    await page.locator('input[type="search"], input[placeholder*="search" i], input[name="q"]').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {
        // Fallback: wait for any input
        return page.locator('input').first().waitFor({ state: 'visible', timeout: 10_000 })
    })
    await page.waitForTimeout(1500)
}

async function waitForDocuments(page: Page): Promise<void> {
    await page.goto(`${BASE}/documents`, { waitUntil: 'domcontentloaded' })
    // Document list has a table or document cards
    await page.waitForSelector('table, [data-testid="document-list"], [class*="document"]', { timeout: 15_000 }).catch(() => {
        // Fallback: wait for the main heading or any rendered content
        return page.waitForSelector('h1, h2', { timeout: 10_000 })
    })
    await page.waitForTimeout(1500)
}

async function waitForProfile(page: Page): Promise<void> {
    await page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' })
    // Profile has user info / card
    await page.waitForSelector('h1, h2, [class*="profile"], [class*="user"]', { timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(1500)
}

async function waitForReader(page: Page): Promise<void> {
    await page.goto(`${BASE}${READ_PATH}`, { waitUntil: 'domcontentloaded' })
    // Wait for the reader toolbar / breadcrumb
    try {
        await page.waitForSelector('text=← Documents', { timeout: 15_000 })
    } catch {
        await page.waitForSelector('button:has-text("Single language")', { timeout: 15_000 }).catch(() => {})
    }
    await page.waitForTimeout(2500)
}

async function waitForEditor(page: Page): Promise<void> {
    await page.goto(`${BASE}${EDIT_PATH}`, { waitUntil: 'domcontentloaded' })
    // Editor has segment cards or text areas; desktop viewport shows editor not mobile block
    try {
        await page.waitForSelector('textarea, [class*="segment"], [class*="editor"], [data-testid="segment"]', { timeout: 20_000 })
    } catch {
        // Fallback: any main content
        await page.waitForSelector('main', { timeout: 10_000 })
    }
    await page.waitForTimeout(3000)
}

async function waitForAdmin(page: Page): Promise<void> {
    await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' })
    // Admin dashboard has stat cards, table, or heading
    await page.waitForSelector('h1, h2, [class*="stat"], [class*="admin"], table', { timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(1500)
}

// ---------------------------------------------------------------------------
// Core capture logic
// ---------------------------------------------------------------------------

interface CaptureResult {
    route: string
    theme: 'light' | 'dark'
    path: string | null
    themeAttr: string | null   // actual html[data-theme] after load
    error: string | null
    redirected: string | null  // final URL if different from requested
}

async function captureRoute(
    context: BrowserContext,
    page: Page,
    route: string,
    theme: 'light' | 'dark',
    waitFn: (p: Page) => Promise<void>,
): Promise<CaptureResult> {
    const result: CaptureResult = { route, theme, path: null, themeAttr: null, error: null, redirected: null }

    // 1. Set both theme keys before any script runs.
    //    kt-theme → html[data-theme] (FOUC inline script)
    //    reader-theme-settings → data-reader-theme (ThemeProvider wrapper)
    try {
        await context.addInitScript((t: string) => {
            localStorage.setItem('kt-theme', t)
            localStorage.setItem('reader-theme-settings', JSON.stringify({
                theme: t,
                font: 'sans',
                fontSize: 16,
                fontColor: null,
                layoutWidth: 'narrow',
            }))
        }, theme)
    } catch (err) {
        result.error = `addInitScript failed: ${err instanceof Error ? err.message : String(err)}`
        return result
    }

    // 2. Navigate and wait for content
    try {
        await waitFn(page)
    } catch (err) {
        result.error = `navigation/content-wait failed: ${err instanceof Error ? err.message : String(err)}`
        // Continue anyway — capture whatever rendered
    }

    // 3. Check final URL (redirect detection)
    const currentUrl = page.url()
    const expectedBase = route === '/' ? BASE : `${BASE}${route}`
    if (!currentUrl.startsWith(expectedBase) && !currentUrl.startsWith(BASE + route.replace(/\/+$/, ''))) {
        result.redirected = currentUrl
    }

    // 4. Verify html[data-theme] AND data-reader-theme
    try {
        // html data-theme: only present for 'dark' (FOUC script sets it iff dark)
        const htmlTheme = await page.locator('html').getAttribute('data-theme')
        // ThemeProvider wrapper: data-reader-theme should match
        const readerTheme = await page.locator('[data-reader-theme]').first().getAttribute('data-reader-theme')
        // For light: htmlTheme is null (expected), readerTheme should be 'light'
        // For dark:  both should be 'dark'
        if (
            (theme === 'light' && htmlTheme !== null) ||
            (theme === 'dark' && htmlTheme !== 'dark') ||
            readerTheme !== theme
        ) {
            result.themeAttr = `html=${htmlTheme} reader=${readerTheme}`
        } else {
            result.themeAttr = theme // verified OK
        }
    } catch {
        result.themeAttr = null
    }

    // 5. Take screenshot
    try {
        const pngPath = await snapTheme(page, route, theme)
        result.path = pngPath
    } catch (err) {
        result.error = (result.error ? result.error + '; ' : '') + `screenshot failed: ${err instanceof Error ? err.message : String(err)}`
    }

    return result
}

// Per-test timeout: multiple navigations across contexts can be slow
test.setTimeout(300_000)

// ===========================================================================
// THEME QA — all routes × both themes
// ===========================================================================

test('theme-visual-qa: all key routes in light + dark', async () => {
    const results: CaptureResult[] = []
    const anomalies: string[] = []

    // --- Public routes (anonymous context) ---
    console.log('\n══════ PUBLIC ROUTES (anonymous) ══════')
    for (const route of ['/', '/login']) {
        for (const theme of ['light', 'dark'] as const) {
            const { browser, context, page } = await newAnonContext()
            try {
                const waitFn = route === '/' ? waitForHome : waitForLogin
                const r = await captureRoute(context, page, route, theme, waitFn)
                results.push(r)
            } finally {
                await context.close()
                await browser.close()
            }
        }
    }

    // --- Search (reader state, may need auth) ---
    console.log('\n══════ /search (reader state) ══════')
    for (const theme of ['light', 'dark'] as const) {
        const { browser, context, page } = await newRoleContext('reader')
        try {
            const r = await captureRoute(context, page, '/search', theme, waitForSearch)
            results.push(r)
        } finally {
            await context.close()
            await browser.close()
        }
    }

    // --- Documents (reader state) ---
    console.log('\n══════ /documents (reader state) ══════')
    for (const theme of ['light', 'dark'] as const) {
        const { browser, context, page } = await newRoleContext('reader')
        try {
            const r = await captureRoute(context, page, '/documents', theme, waitForDocuments)
            results.push(r)
        } finally {
            await context.close()
            await browser.close()
        }
    }

    // --- Profile (reader state) ---
    console.log('\n══════ /profile (reader state) ══════')
    for (const theme of ['light', 'dark'] as const) {
        const { browser, context, page } = await newRoleContext('reader')
        try {
            const r = await captureRoute(context, page, '/profile', theme, waitForProfile)
            results.push(r)
        } finally {
            await context.close()
            await browser.close()
        }
    }

    // --- Reader route (translator state) ---
    console.log('\n══════ /documents/{id}/read (translator state) ══════')
    for (const theme of ['light', 'dark'] as const) {
        const { browser, context, page } = await newRoleContext('translator')
        try {
            const r = await captureRoute(context, page, READ_PATH, theme, waitForReader)
            results.push(r)
        } finally {
            await context.close()
            await browser.close()
        }
    }

    // --- Editor route (translator state, desktop viewport) ---
    console.log('\n══════ /documents/{id}/edit (translator state, desktop) ══════')
    for (const theme of ['light', 'dark'] as const) {
        const { browser, context, page } = await newRoleContext('translator')
        try {
            const r = await captureRoute(context, page, EDIT_PATH, theme, waitForEditor)
            results.push(r)
        } finally {
            await context.close()
            await browser.close()
        }
    }

    // --- Admin (admin state) ---
    console.log('\n══════ /admin (admin state) ══════')
    for (const theme of ['light', 'dark'] as const) {
        const { browser, context, page } = await newRoleContext('admin')
        try {
            const r = await captureRoute(context, page, '/admin', theme, waitForAdmin)
            results.push(r)
        } finally {
            await context.close()
            await browser.close()
        }
    }

    // =====================================================================
    // Report
    // =====================================================================
    console.log('\n══════════════════════════════════════════')
    console.log(' THEME VISUAL QA — CAPTURE MANIFEST')
    console.log('══════════════════════════════════════════')

    let successCount = 0
    let failCount = 0

    for (const r of results) {
        const status = r.path ? '✓' : '✗'
        if (r.path) successCount++
        else failCount++

        console.log(`  ${status} ${r.route.padEnd(42)} ${r.theme.padEnd(6)} → ${r.path || '(no file)'}`)

        // Theme mismatch check
        if (r.themeAttr === null) {
            const msg = `[THEME UNKNOWN] ${r.route}: could not read theme attributes`
            anomalies.push(msg)
            console.log(`    ⚠ ${msg}`)
        } else if (r.themeAttr !== r.theme) {
            const msg = `[THEME MISMATCH] ${r.route} requested=${r.theme} actual=[${r.themeAttr}]`
            anomalies.push(msg)
            console.log(`    ⚠ ${msg}`)
        }

        // Redirect check
        if (r.redirected) {
            const msg = `[REDIRECT] ${r.route} → ${r.redirected}`
            anomalies.push(msg)
            console.log(`    ↪ ${msg}`)
        }

        // Error check
        if (r.error) {
            const msg = `[ERROR] ${r.route}: ${r.error}`
            anomalies.push(msg)
            console.log(`    ❌ ${msg}`)
        }
    }

    console.log(`\n  Total: ${successCount} captured, ${failCount} failed, ${anomalies.length} anomalies`)

    if (anomalies.length > 0) {
        console.log('\n  ANOMALIES:')
        for (const a of anomalies) console.log(`    - ${a}`)
    }

    // Sanity: we expect at least some captures
    expect(successCount).toBeGreaterThan(0)
})
