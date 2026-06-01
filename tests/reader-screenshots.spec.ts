/**
 * tests/reader-screenshots.spec.ts
 *
 * High-resolution visual-review screenshots of the REAL re-imported reader
 * content (no API mocking). Produces full-page PNGs plus zoomed/clipped crops
 * of key regions so a human can confirm:
 *   (a) backend parse-artifact fixes worked (front-matter cover headings are
 *       clean, e.g. '*Ken* (剣 — sword)' with NO trailing '*Ken*（' garbage),
 *   (b) the reader's heading rendering (<h2>, font-semibold).
 *
 * This spec deliberately imports from '@playwright/test' directly (NOT the
 * camoufox-fixture) and launches Firefox itself with per-test storageState so
 * it can switch auth identity (reader vs translator). This sidesteps the
 * global-project storageState role-gating problem: the "Aligned (sentence)"
 * tab is canEdit-gated and only visible to translator/admin.
 *
 * Screenshots are written to test-results/screenshots/reader-real/.
 *
 * NOTE: This spec is self-sufficient. If tests/.auth/<role>.json is missing it
 * performs the same login flow as tests/global-setup.ts loginAndSaveState().
 */

import {
    test,
    expect,
    firefox,
    type Page,
    type Browser,
    type BrowserContext,
} from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

// Real article "Baba 1 Clean" — ~3271 segments.
const DOC_ID = '86adf815-b0ca-46eb-bab7-b6fb040b845c'
const READ_PATH = `/documents/${DOC_ID}/read`

// High-res capture knobs.
const VIEWPORT = { width: 1280, height: 1600 }
const DEVICE_SCALE_FACTOR = 2

// Mirror the ROLES creds from tests/global-setup.ts so the spec can self-login.
const ROLE_CREDS: Record<string, { email: string; password: string }> = {
    reader: { email: 'reader-1@test.com', password: 'test-password' },
    translator: { email: 'translator-1@test.com', password: 'test-password' },
}

// ---------------------------------------------------------------------------
// Screenshot output
// ---------------------------------------------------------------------------

const SCREENSHOT_DIR = path.join(
    process.cwd(),
    'test-results',
    'screenshots',
    'reader-real',
)

function ensureDir(): void {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

let stepCounter = 0

// Firefox refuses screenshots whose PHYSICAL height exceeds 32767px. At
// deviceScaleFactor=2 that is ~16383 CSS px. The real "Baba 1 Clean" article
// has ~3271 segments and renders far taller than that, so a true fullPage
// capture throws. We cap the clipped fallback well under the limit.
const MAX_CLIP_CSS_HEIGHT = Math.floor(32000 / DEVICE_SCALE_FACTOR) // ~16000 CSS px

/**
 * Full-page PNG -> test-results/screenshots/reader-real/NNN_<label>.png
 * Attempts a true fullPage shot; if the page is taller than Firefox's
 * 32767px physical limit it falls back to a tall bounded clip from the top
 * (still high-res, still shows the document opening + a large body span).
 */
async function snap(page: Page, label: string): Promise<string | null> {
    ensureDir()
    stepCounter += 1
    const filename = `${String(stepCounter).padStart(3, '0')}_${label.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.png`
    const fullPath = path.join(SCREENSHOT_DIR, filename)
    try {
        await page.screenshot({ path: fullPath, fullPage: true })
        console.log(`[snap] ${filename} (fullPage)`)
        return fullPath
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (!/larger than 32767|too large|screenshot/i.test(msg)) {
            console.warn(`[snap] FAILED ${filename}: ${msg}`)
            return null
        }
        // Fallback: bounded tall clip from the top of the document.
        try {
            await page.evaluate(() => window.scrollTo(0, 0))
            await page.waitForTimeout(300)
            const docHeight = await page.evaluate(
                () => document.documentElement.scrollHeight,
            )
            const clipHeight = Math.min(docHeight, MAX_CLIP_CSS_HEIGHT)
            await page.screenshot({
                path: fullPath,
                clip: { x: 0, y: 0, width: VIEWPORT.width, height: clipHeight },
            })
            console.log(`[snap] ${filename} (bounded clip ${clipHeight}px of ${docHeight}px — page too tall for fullPage)`)
            return fullPath
        } catch (err2) {
            console.warn(`[snap] FAILED ${filename} (clip fallback): ${err2 instanceof Error ? err2.message : String(err2)}`)
            return null
        }
    }
}

/** Clipped/zoomed PNG of the top region (no fullPage). */
async function snapClipTop(
    page: Page,
    label: string,
    height = 900,
): Promise<string | null> {
    ensureDir()
    stepCounter += 1
    const filename = `${String(stepCounter).padStart(3, '0')}_${label.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.png`
    const fullPath = path.join(SCREENSHOT_DIR, filename)
    try {
        // Make sure we're at the top before clipping.
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(300)
        await page.screenshot({
            path: fullPath,
            clip: { x: 0, y: 0, width: VIEWPORT.width, height },
        })
        console.log(`[snap-clip] ${filename}`)
        return fullPath
    } catch (err) {
        console.warn(`[snap-clip] FAILED ${filename}: ${err instanceof Error ? err.message : String(err)}`)
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

        // This login form is a CONTROLLED React form (useState + onChange).
        // page.fill() can set the DOM value before React state commits, causing
        // signInWithPassword to fire with empty email/password ("missing email
        // or phone" 400). Type per-key (dispatches input events) and verify the
        // controlled state has committed by re-reading the DOM value before we
        // submit.
        async function typeAndVerify(loc: typeof emailInput, value: string): Promise<void> {
            await loc.click()
            await loc.fill('')
            await loc.pressSequentially(value, { delay: 25 })
            await expect(loc).toHaveValue(value, { timeout: 5_000 })
        }
        await typeAndVerify(emailInput, creds.email)
        await typeAndVerify(passwordInput, creds.password)
        // Let React's controlled state settle before submit.
        await page.waitForTimeout(300)

        const tokenResponsePromise = page.waitForResponse(
            (resp) =>
                resp.url().includes('/auth/v1/token') &&
                resp.request().method() === 'POST',
            { timeout: 20_000 },
        )
        await page.click('button[type="submit"]')
        const tokenResp = await tokenResponsePromise
        if (tokenResp.status() !== 200) {
            const body = await tokenResp.text().catch(() => '<unreadable>')
            throw new Error(`auth status ${tokenResp.status()}: ${body.slice(0, 200)}`)
        }
        // Wait for post-login navigation away from /login so the Supabase
        // client has persisted cookies into storage.
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
// Reader page helpers
// ---------------------------------------------------------------------------

/** Launch a fresh high-res Firefox context for a given role. */
async function newRoleContext(role: string): Promise<{
    browser: Browser
    context: BrowserContext
    page: Page
}> {
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

/** Navigate to the reader and wait for real content (3271 segments) to render. */
async function gotoReader(page: Page): Promise<void> {
    await page.goto(`${BASE}${READ_PATH}`, { waitUntil: 'domcontentloaded' })
    // Wait for the reader toolbar / breadcrumb to appear.
    try {
        await page.waitForSelector('text=← Documents', { timeout: 15_000 })
    } catch {
        // Fall back to any mode button.
        await page.waitForSelector('button:has-text("Single language")', { timeout: 15_000 }).catch(() => {})
    }
    // Real data with thousands of segments needs a moment to paint.
    await page.waitForTimeout(2500)
}

/** Best-effort click of a mode tab by exact label. Returns true if clicked. */
async function clickMode(page: Page, label: string): Promise<boolean> {
    const btn = page.locator(`button:has-text("${label}")`).first()
    try {
        await btn.waitFor({ state: 'visible', timeout: 8_000 })
        await btn.click()
        await page.waitForTimeout(1500)
        return true
    } catch (err) {
        console.warn(`[mode] could not click "${label}": ${err instanceof Error ? err.message : String(err)}`)
        return false
    }
}

// Per-test timeout: real data + multiple navigations can be slow.
test.setTimeout(180_000)

// ===========================================================================
// READER IDENTITY
// ===========================================================================

test('reader-real: single + bilingual (reader identity)', async () => {
    const { browser, context, page } = await newRoleContext('reader')
    const anomalies: string[] = []
    try {
        await gotoReader(page)

        // --- Single language (default mode) ---
        // single_full
        await snap(page, 'single_full')

        // single_frontmatter_zoom — clipped top region, cover headings readable.
        await snapClipTop(page, 'single_frontmatter_zoom', 950)

        // single_source_lang — switch Display select to source (JA), capture, revert.
        try {
            const select = page.locator('select').first()
            await select.waitFor({ state: 'visible', timeout: 5_000 })
            await select.selectOption('source')
            await page.waitForTimeout(1000)
            await snapClipTop(page, 'single_source_lang', 950)
            // revert to target (EN)
            await select.selectOption('target')
            await page.waitForTimeout(800)
        } catch (err) {
            anomalies.push(`single_source_lang: Display select not usable (${err instanceof Error ? err.message : String(err)}) — captured fallback`)
            await snap(page, 'single_source_lang_fallback')
        }

        // --- Pager coverage (SINGLE mode) ---
        // The reader now partitions "Baba 1 Clean" into source-book PAGES.
        // Each rendered page is SHORT. Exercise prev/next + page-select jump.
        const nextBtn = page.getByRole('button', { name: 'Next page' })
        const pagerPresent = await nextBtn
            .isVisible()
            .catch(() => false)
        if (!pagerPresent) {
            anomalies.push('pager absent (expected multi-page for Baba 1 Clean)')
        } else {
            // single_page1_top — first page, top region.
            await snapClipTop(page, 'single_page1_top', 950)

            // Click Next -> page 2.
            await nextBtn.click()
            await page.waitForTimeout(1200)
            await snapClipTop(page, 'single_page2_top', 950)

            // Jump via the page-select to option ~10 (or last if fewer).
            try {
                let pageSelect = page.getByRole('combobox', {
                    name: /^Page,|^Section,/,
                })
                if (!(await pageSelect.isVisible().catch(() => false))) {
                    // Fall back to the SECOND <select> (first is Display lang).
                    pageSelect = page.locator('select').nth(1)
                }
                const optionCount = await pageSelect.locator('option').count()
                const jumpIndex = optionCount > 10 ? 10 : optionCount - 1
                await pageSelect.selectOption({ index: jumpIndex })
                await page.waitForTimeout(1200)
                await snapClipTop(page, 'single_pageJump_top', 950)
            } catch (err) {
                anomalies.push(`single_pageJump: page-select not usable (${err instanceof Error ? err.message : String(err)})`)
            }

            // single_page_full — confirm a single page is now SHORT.
            // snap() logs the real document height (want a few thousand px,
            // not 80k–160k).
            await snap(page, 'single_page_full')
        }

        // --- Bilingual (paragraph) ---
        const bilingualOk = await clickMode(page, 'Bilingual (paragraph)')
        if (!bilingualOk) anomalies.push('Bilingual (paragraph) tab not clickable — captured current state anyway')

        // bilingual_full
        await snap(page, 'bilingual_full')

        // bilingual_frontmatter_zoom — stacked JA/EN headings, top region.
        await snapClipTop(page, 'bilingual_frontmatter_zoom', 950)

        // bilingual_midbody — scroll a few thousand px into real prose.
        try {
            await page.evaluate(() => window.scrollTo(0, 4000))
            await page.waitForTimeout(1000)
            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, `${String(++stepCounter).padStart(3, '0')}_bilingual_midbody.png`),
                clip: { x: 0, y: 0, width: VIEWPORT.width, height: 1400 },
            })
            console.log('[snap-clip] bilingual_midbody (scrolled viewport)')
        } catch (err) {
            anomalies.push(`bilingual_midbody: ${err instanceof Error ? err.message : String(err)}`)
            await snap(page, 'bilingual_midbody_fallback')
        }

        if (anomalies.length) console.log('[reader anomalies]\n - ' + anomalies.join('\n - '))
        // We assert nothing hard — goal is screenshots. Sanity check only.
        expect(stepCounter).toBeGreaterThan(0)
    } finally {
        await context.close()
        await browser.close()
    }
})

// ===========================================================================
// TRANSLATOR IDENTITY (sees all three tabs incl. Aligned)
// ===========================================================================

test('reader-real: aligned (translator identity)', async () => {
    const { browser, context, page } = await newRoleContext('translator')
    const anomalies: string[] = []
    try {
        await gotoReader(page)

        // Switch to Aligned (sentence) — only visible to canEdit roles.
        const alignedOk = await clickMode(page, 'Aligned (sentence)')
        if (!alignedOk) anomalies.push('Aligned (sentence) tab not clickable for translator — captured current state anyway')

        // Wait for the aligned table to render.
        try {
            await page.waitForSelector('table', { timeout: 10_000 })
            await page.waitForTimeout(1500)
        } catch (err) {
            anomalies.push(`aligned table not found: ${err instanceof Error ? err.message : String(err)}`)
        }

        // aligned_full
        await snap(page, 'aligned_full')

        // aligned_frontmatter_zoom — top region of the table, first ~15 rows.
        await snapClipTop(page, 'aligned_frontmatter_zoom', 1100)

        // --- Pager coverage (ALIGNED mode) ---
        const nextBtn = page.getByRole('button', { name: 'Next page' })
        const pagerPresent = await nextBtn.isVisible().catch(() => false)
        if (!pagerPresent) {
            anomalies.push('pager absent (expected multi-page for Baba 1 Clean)')
        } else {
            await nextBtn.click()
            await page.waitForTimeout(1200)
            await snapClipTop(page, 'aligned_page2_top', 1100)
        }

        if (anomalies.length) console.log('[translator anomalies]\n - ' + anomalies.join('\n - '))
        expect(stepCounter).toBeGreaterThan(0)
    } finally {
        await context.close()
        await browser.close()
    }
})
