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

import { test as base, expect, type Page, type Browser } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepIndex = { value: number }

type CamoufoxFixtures = {
    page: Page
    screenshot: (label: string) => Promise<void>
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

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

export const test = base.extend<CamoufoxFixtures>({
    // Override the default `page` fixture to use Camoufox when available
    page: async ({ browser }, use, testInfo) => {
        let camoufoxBrowser: Browser | null = null
        let page: Page

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
            page = await camoufoxBrowser.newPage()
            console.log('[camoufox-fixture] Using Camoufox browser')
        } catch {
            // Fall back to the standard Playwright browser (useful in CI
            // environments where Camoufox binaries haven't been fetched)
            console.log('[camoufox-fixture] Camoufox not available – falling back to standard browser')
            page = await browser.newPage()
        }

        await use(page)

        await page.close()
        if (camoufoxBrowser) await camoufoxBrowser.close()
    },

    // Convenience screenshot helper with auto-incrementing step counter
    screenshot: async ({ page }, use, testInfo) => {
        const stepIndex: StepIndex = { value: 0 }
        const dir = screenshotDir(testInfo.title)

        const take = async (label: string) => {
            stepIndex.value += 1
            const filename = `${String(stepIndex.value).padStart(3, '0')}_${sanitize(label)}.png`
            const fullPath = path.join(dir, filename)
            await page.screenshot({ path: fullPath, fullPage: true })
            // Also attach to the Playwright HTML report
            await testInfo.attach(label, { path: fullPath, contentType: 'image/png' })
        }

        await use(take)
    },
})

export { expect }
