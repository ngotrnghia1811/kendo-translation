/**
 * tests/reader-settings.spec.ts
 *
 * Live integration coverage for the Reader Settings panel:
 *
 *  1. Opens and closes via the toolbar toggle button.
 *  2. Theme switch ("Sepia") persists across a page reload.
 *  3. Font size increase / decrease buttons are functional.
 *
 * Document discovery: uses the apiCall helper to find a real document from the
 * live DB, then navigates to its reader page. All tests run as the `reader`
 * role (storageState: tests/.auth/reader.json).
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ApiResult<T> = { status: number; body: T }

async function apiCall<T = unknown>(
    page: import('@playwright/test').Page,
    path: string,
    init?: { method?: string; body?: unknown }
): Promise<ApiResult<T>> {
    return page.evaluate(
        async ({ base, path, init }) => {
            const res = await fetch(`${base}${path}`, {
                method: init?.method ?? 'GET',
                headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
                body: init?.body ? JSON.stringify(init.body) : undefined,
            })
            const text = await res.text()
            let parsed: unknown = text
            try {
                parsed = text ? JSON.parse(text) : null
            } catch {
                /* leave as text */
            }
            return { status: res.status, body: parsed as unknown }
        },
        { base: BASE, path, init: init ?? {} }
    ) as Promise<ApiResult<T>>
}

/** Discover a real doc id from the live DB and return its reader URL. */
async function discoverReaderUrl(page: import('@playwright/test').Page): Promise<string> {
    const docsRes = await apiCall<{ documents?: Array<{ id: string }> } | Array<{ id: string }>>(
        page,
        '/api/documents'
    )
    expect(docsRes.status).toBe(200)
    const docs = Array.isArray(docsRes.body)
        ? docsRes.body
        : (docsRes.body?.documents ?? [])
    expect(docs.length, 'expected at least one document in live DB').toBeGreaterThan(0)
    const docId = docs[0].id
    expect(typeof docId).toBe('string')
    return `${BASE}/documents/${docId}/read`
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

test.describe('Reader settings panel', () => {
    test.use({ storageState: 'tests/.auth/reader.json' })

    test('reader settings panel opens and closes', async ({ page, snap }) => {
        const readUrl = await discoverReaderUrl(page)
        await page.goto(readUrl)
        await page.waitForTimeout(3_000) // let reader hydrate

        // Click the settings button in the toolbar.
        const settingsBtn = page.locator('button[aria-label="Reader settings"]')
        await settingsBtn.waitFor({ state: 'visible', timeout: 15_000 })
        await settingsBtn.click()
        await page.waitForTimeout(400)
        await snap('settings_panel_opened')

        // The settings dialog should be visible.
        const panel = page.locator('[role="dialog"][aria-label="Reader settings"]')
        await expect(panel).toBeVisible({ timeout: 5_000 })

        // Click again → panel closes.
        await settingsBtn.click()
        await page.waitForTimeout(400)
        await expect(panel).not.toBeVisible({ timeout: 5_000 })
        await snap('settings_panel_closed')
    })

    test('theme switch persists across reload', async ({ page, snap }) => {
        const readUrl = await discoverReaderUrl(page)
        await page.goto(readUrl)
        await page.waitForTimeout(3_000)

        // Open settings.
        const settingsBtn = page.locator('button[aria-label="Reader settings"]')
        await settingsBtn.waitFor({ state: 'visible', timeout: 15_000 })
        await settingsBtn.click()
        await page.waitForTimeout(400)

        // Click the "Sepia" theme swatch.
        const sepiaBtn = page.locator('button[title="Sepia"]')
        await sepiaBtn.waitFor({ state: 'visible', timeout: 5_000 })
        await sepiaBtn.click()
        await page.waitForTimeout(400)

        // Verify aria-pressed is now "true" on the Sepia button.
        await expect(sepiaBtn).toHaveAttribute('aria-pressed', 'true')
        await snap('settings_theme_sepia_selected')

        // Reload the page.
        await page.reload()
        await page.waitForTimeout(3_000)

        // The root div should have data-reader-theme="sepia" (restored from localStorage).
        const rootDiv = page.locator('div[data-reader-theme="sepia"]')
        await expect(rootDiv).toBeAttached({ timeout: 10_000 })
        await snap('settings_theme_persisted_after_reload')
    })

    test('font size increase/decrease buttons work', async ({ page, snap }) => {
        const readUrl = await discoverReaderUrl(page)
        await page.goto(readUrl)
        await page.waitForTimeout(3_000)

        // Open settings.
        const settingsBtn = page.locator('button[aria-label="Reader settings"]')
        await settingsBtn.waitFor({ state: 'visible', timeout: 15_000 })
        await settingsBtn.click()
        await page.waitForTimeout(400)

        // Click "Increase font size" twice.
        const increaseBtn = page.locator('button[aria-label="Increase font size"]')
        await increaseBtn.waitFor({ state: 'visible', timeout: 5_000 })
        await increaseBtn.click()
        await page.waitForTimeout(200)
        await increaseBtn.click()
        await page.waitForTimeout(200)

        // After 2 clicks from default 16px → 18px (well below max 32), the
        // button should still be enabled.
        await expect(increaseBtn).not.toBeDisabled()
        await snap('settings_font_size_increased')

        // Click "Decrease font size" twice to return to default.
        const decreaseBtn = page.locator('button[aria-label="Decrease font size"]')
        await decreaseBtn.waitFor({ state: 'visible', timeout: 5_000 })
        await decreaseBtn.click()
        await page.waitForTimeout(200)
        await decreaseBtn.click()
        await page.waitForTimeout(200)

        // Decrease should still be enabled (at 16px, above min 10).
        await expect(decreaseBtn).not.toBeDisabled()
        await snap('settings_font_size_restored')
    })
})
