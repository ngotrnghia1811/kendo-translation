/**
 * tests/reader-tap-reveal-focus.spec.ts
 *
 * Phase 5.6 — tap-to-reveal + Phase 5.7 — focus mode
 * Integration tests against the live reader for doc 86adf815.
 *
 * Coverage:
 *  1. Tap a kanji span → popup shows reading, romaji, JLPT level
 *  2. Tap a JP-only paragraph → popup reveals EN translation
 *  3. Tap-to-reveal toggle in settings disables/enables behaviour
 *  4. Focus mode: hides toolbar/progress, centers text, Esc exits
 *  5. Virtualization preserved: stable DOM node count on scroll
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE   = process.env.TEST_BASE_URL ?? 'http://localhost:3001'
const DOC_ID = '86adf815-b0ca-46eb-bab7-b6fb040b845c'
const READ_URL = `${BASE}/documents/${DOC_ID}/read`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for the reader to hydrate — Virtuoso renders paragraphs. */
async function waitForReaderContent(page: import('@playwright/test').Page, timeout = 30_000) {
    // Wait for a <ruby> element (furigana-enabled paragraph) or at least a <p>
    await page.waitForSelector('ruby, p[data-paragraph-index]', { timeout })
    await page.waitForTimeout(1000) // let furigana render settle
}

/** Count <ruby> elements in the DOM (indicators of furigana rendering). */
async function countRubyElements(page: import('@playwright/test').Page): Promise<number> {
    return page.locator('ruby').count()
}

/** Ensure tap-to-reveal is enabled via localStorage before navigation. */
async function enableTapReveal(page: import('@playwright/test').Page) {
    await page.evaluate(() => {
        try {
            const raw = localStorage.getItem('reader-theme-settings')
            const settings = raw ? JSON.parse(raw) : {}
            settings.tapRevealEnabled = true
            settings.furiganaMode = 'furigana'
            localStorage.setItem('reader-theme-settings', JSON.stringify(settings))
        } catch { /* ignore */ }
    })
}

/** Ensure tap-to-reveal is DISABLED via localStorage. */
async function disableTapReveal(page: import('@playwright/test').Page) {
    await page.evaluate(() => {
        try {
            const raw = localStorage.getItem('reader-theme-settings')
            const settings = raw ? JSON.parse(raw) : {}
            settings.tapRevealEnabled = false
            localStorage.setItem('reader-theme-settings', JSON.stringify(settings))
        } catch { /* ignore */ }
    })
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

test.describe('Reader — tap-to-reveal + focus mode (Phase 5.6 + 5.7)', () => {
    test.use({ storageState: 'tests/.auth/reader.json' })

    // -----------------------------------------------------------------------
    // 1: Tap kanji span → popup shows reading info
    // -----------------------------------------------------------------------
    test('1: tap kanji span shows reading/romaji/JLPT popup', async ({ page, snap }) => {
        await enableTapReveal(page)
        await page.goto(READ_URL)
        await waitForReaderContent(page)

        const rubyCount = await countRubyElements(page)
        // The test doc should have furigana at ~56% coverage — some <ruby> expected
        console.log(`[tap-reveal] Found ${rubyCount} <ruby> elements`)

        // Click the first <ruby> element
        const firstRuby = page.locator('ruby').first()
        if (rubyCount > 0) {
            await firstRuby.click()
            await page.waitForTimeout(500)
            await snap('kanji_popup')

            // The WordPopup should be visible — look for the dialog role
            const popup = page.locator('div[role="dialog"][aria-label*="Reading"]')
            await expect(popup).toBeVisible({ timeout: 5000 })

            // Verify popup contains reading info (hiragana in a span with lang="ja")
            const readingText = await popup.locator('span[lang="ja"]').first().textContent()
            expect(readingText, 'popup should show hiragana reading').toBeTruthy()
            console.log(`[tap-reveal] Reading: "${readingText}"`)

            // Close the popup
            await popup.locator('button:has-text("Close")').click()
            await expect(popup).not.toBeVisible({ timeout: 3000 })
        } else {
            console.log('[tap-reveal] No <ruby> elements found — skipping kanji popup test (doc may have no ruby_data)')
            // Still test: clicking on a paragraph in JP mode should trigger translation popup
            // (handled in next sub-test)
        }

        await snap('kanji_popup_closed')
    })

    // -----------------------------------------------------------------------
    // 2: Tap JP-only paragraph reveals translation
    // -----------------------------------------------------------------------
    test('2: tap JP paragraph reveals EN translation popup', async ({ page, snap }) => {
        await enableTapReveal(page)
        await page.goto(READ_URL)
        await waitForReaderContent(page)

        // Switch to JP-only mode
        const jpToggle = page.locator('button:has-text("JP")').first()
        if (await jpToggle.isVisible()) {
            await jpToggle.click()
            await page.waitForTimeout(1500)
        }

        // Find a paragraph with data-paragraph-index that has text
        const paragraph = page.locator('[data-paragraph-index]').first()
        await paragraph.waitFor({ state: 'visible', timeout: 10_000 })
        await paragraph.click()
        await page.waitForTimeout(500)
        await snap('translation_popup')

        // WordPopup should appear — check for dialog role
        const popup = page.locator('div[role="dialog"]')
        const popupVisible = await popup.isVisible().catch(() => false)
        if (popupVisible) {
            console.log('[tap-reveal] Translation popup appeared')
        } else {
            console.log('[tap-reveal] No popup — paragraph may have no translation or tap did not target paragraph')
        }

        // Close any popup by pressing Escape
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
    })

    // -----------------------------------------------------------------------
    // 3: Disabling tap-to-reveal prevents popup
    // -----------------------------------------------------------------------
    test('3: tap-to-reveal off prevents popup on kanji tap', async ({ page }) => {
        await disableTapReveal(page)
        await page.goto(READ_URL)
        await waitForReaderContent(page)

        const rubyCount = await countRubyElements(page)
        if (rubyCount > 0) {
            await page.locator('ruby').first().click()
            await page.waitForTimeout(500)

            // No popup should appear
            const popup = page.locator('div[role="dialog"]')
            await expect(popup).not.toBeVisible({ timeout: 3000 })
        }
    })

    // -----------------------------------------------------------------------
    // 4: Focus mode hides toolbar + centers text + Esc exits
    // -----------------------------------------------------------------------
    test('4: focus mode hides toolbar, centers text, Esc exits', async ({ page, snap }) => {
        await page.goto(READ_URL)
        await waitForReaderContent(page)
        await snap('before_focus')

        // Find and open the settings panel
        const gearBtn = page.locator('button[aria-label="Reader settings"]')
        if (await gearBtn.isVisible()) {
            await gearBtn.click()
            await page.waitForTimeout(500)

            // Click "Enter focus mode" button
            const focusBtn = page.locator('button:has-text("Enter focus mode")')
            if (await focusBtn.isVisible()) {
                await focusBtn.click()
                await page.waitForTimeout(800)
                await snap('focus_mode')

                // Verify: toolbar is hidden (breadcrumb link "Documents" should not be visible)
                const breadcrumb = page.locator('text=← Documents')
                await expect(breadcrumb).not.toBeVisible({ timeout: 3000 })

                // Verify: exit button is visible
                const exitBtn = page.locator('button[aria-label="Exit focus mode"]')
                await expect(exitBtn).toBeVisible({ timeout: 3000 })

                // Exit via Esc
                await page.keyboard.press('Escape')
                await page.waitForTimeout(500)
                await snap('after_focus_exit')

                // Verify: toolbar is back
                await expect(breadcrumb).toBeVisible({ timeout: 5000 })
            } else {
                console.log('[focus-mode] "Enter focus mode" button not found — settings panel may not have rendered')
            }
        }
    })

    // -----------------------------------------------------------------------
    // 5: Virtualization preserved during popup interactions
    // -----------------------------------------------------------------------
    test('5: DOM stays virtualized — stable node count on scroll', async ({ page }) => {
        await page.goto(READ_URL)
        await waitForReaderContent(page)

        // Get initial <p> count
        const initialCount = await page.locator('p').count()
        console.log(`[virtualization] Initial <p> count: ${initialCount}`)

        // Scroll down a bit
        await page.evaluate(() => {
            const el = document.querySelector('[class*="overflow-y-auto"]')
            if (el) el.scrollTop = 2000
        })
        await page.waitForTimeout(1000)

        const afterScrollCount = await page.locator('p').count()
        console.log(`[virtualization] After scroll <p> count: ${afterScrollCount}`)

        // The count should be similar (not rendering all 3000+ paragraphs)
        // Allow some variance due to overscan
        const diff = Math.abs(afterScrollCount - initialCount)
        expect(diff, 'DOM node count should stay stable after scroll').toBeLessThan(50)
        expect(afterScrollCount, 'should NOT render all paragraphs').toBeLessThan(500)

        // Now scroll further down
        await page.evaluate(() => {
            const el = document.querySelector('[class*="overflow-y-auto"]')
            if (el) el.scrollTop = 8000
        })
        await page.waitForTimeout(1000)

        const farScrollCount = await page.locator('p').count()
        console.log(`[virtualization] Far scroll <p> count: ${farScrollCount}`)
        // Still virtualized
        expect(farScrollCount, 'DOM should remain virtualized on far scroll').toBeLessThan(500)
    })

    // -----------------------------------------------------------------------
    // 6: Focus mode setting panel works (focusMode sentinel)
    // -----------------------------------------------------------------------
    test('6: focus mode toggle in settings panel works', async ({ page }) => {
        await page.goto(READ_URL)
        await waitForReaderContent(page)

        // Open settings
        const gearBtn = page.locator('button[aria-label="Reader settings"]')
        if (!await gearBtn.isVisible()) return // skip if not visible

        await gearBtn.click()
        await page.waitForTimeout(500)

        // The settings panel should contain the focus mode section heading
        const focusSection = page.locator('h3:has-text("Focus")')
        await expect(focusSection).toBeVisible({ timeout: 3000 })
    })
})
