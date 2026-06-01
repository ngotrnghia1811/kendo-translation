/**
 * tests/helpers/camoufox-fixture.ts
 *
 * Provides a Playwright `test` object that uses a Camoufox browser instead of
 * a standard Chromium/Firefox browser.  Each test file imports `test` and
 * `expect` from this module instead of `@playwright/test`.
 *
 * The fixture also exposes a `screenshot(name)` helper that saves a numbered
 * screenshot to `test-results/screenshots/<test-title>/` so reviewers can
 * walk through every UI state.
 */

import { test as base, expect, type Page, type Browser, type BrowserContext } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepIndex = { value: number }

type CamoufoxFixtures = {
    page: Page
    snap: (label: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitize(str: string): string {
    return str.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
}

function screenshotDir(testTitle: string): string {
    const dir = path.join(
        process.cwd(),
        'test-results',
        'screenshots',
        sanitize(testTitle),
    )
    fs.mkdirSync(dir, { recursive: true })
    return dir
}

/**
 * Resolve the `storageState` declared via `test.use({ storageState })` or
 * `project.use.storageState` so that our self-launched browser context can
 * honour it.  Returns either an absolute path, a storage-state object, or
 * `undefined` if none configured.
 */
function resolveStorageState(
    raw: unknown,
): string | undefined {
    if (!raw) return undefined
    if (typeof raw === 'string') {
        const abs = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
        return fs.existsSync(abs) ? abs : undefined
    }
    return undefined
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

export const test = base.extend<CamoufoxFixtures>({
    // Override the default `page` fixture to use Camoufox when available.
    // We honour `storageState` from the test/project config so that auth
    // cookies produced by `tests/global-setup.ts` are loaded into the
    // self-launched browser context.
    page: async ({ browser }, use, testInfo) => {
        let camoufoxBrowser: Browser | null = null
        let context: BrowserContext | null = null
        let page: Page

        const storageState = resolveStorageState(testInfo.project.use.storageState)
        const contextOptions = storageState ? { storageState } : undefined

        try {
            // Attempt to launch Camoufox (requires `camoufox` npm package +
            // binaries downloaded via `npx camoufox fetch`)
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { Camoufox } = require('camoufox') as {
                Camoufox: (opts: Record<string, unknown>) => Promise<Browser>
            }
            camoufoxBrowser = await Camoufox({
                headless: true,
                os: 'windows',
                humanize: false,
            })
            context = await camoufoxBrowser.newContext(contextOptions)
            page = await context.newPage()
            console.log('[camoufox-fixture] Using Camoufox browser' + (storageState ? ` (storageState=${path.basename(storageState)})` : ''))
        } catch {
            // Fall back to the standard Playwright browser (useful in CI
            // environments where Camoufox binaries haven't been fetched)
            console.log('[camoufox-fixture] Camoufox not available – falling back to standard browser' + (storageState ? ` (storageState=${path.basename(storageState)})` : ''))
            context = await browser.newContext(contextOptions)
            page = await context.newPage()
        }

        await use(page)

        await page.close()
        if (context) await context.close()
        if (camoufoxBrowser) await camoufoxBrowser.close()
    },

    // Convenience screenshot helper with auto-incrementing step counter
    snap: [async ({ page }, use, testInfo) => {
        const stepIndex: StepIndex = { value: 0 }
        const dir = screenshotDir(testInfo.title)

        const take = async (label: string) => {
            stepIndex.value += 1
            const filename = `${String(stepIndex.value).padStart(3, '0')}_${sanitize(label)}.png`
            const fullPath = path.join(dir, filename)
            // Attempt a true full-page screenshot. Firefox enforces a hard
            // 32 767 px physical limit; for book-sized pages (thousands of
            // segments rendered at once) the DOM can exceed that, causing
            // page.screenshot to throw. Fall back to a viewport-height clip
            // so the test continues and still captures the visible state.
            try {
                await page.screenshot({ path: fullPath, fullPage: true })
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                if (!/larger than 32767|too large|screenshot/i.test(msg)) throw err
                console.warn(`[snap] fullPage failed for "${label}" (${msg}); falling back to viewport clip`)
                await page.screenshot({ path: fullPath })
            }
            // Also attach to the Playwright HTML report
            await testInfo.attach(label, { path: fullPath, contentType: 'image/png' })
        }

        await use(take)
    }, { scope: 'test' }],
})

export { expect }
