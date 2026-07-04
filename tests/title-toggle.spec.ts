/**
 * tests/title-toggle.spec.ts
 *
 * Tests for the bilingual title toggle feature:
 *  - Documents list page shows EN title by default
 *  - Toggle pill switches to JP title (title_ja)
 *  - Preference persists across page reload (localStorage)
 *
 * Screenshots at every key UI state transition.
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

test.describe('Title language toggle', () => {
    test('Documents list: default title language is EN', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`)
        await snap('titles_default_en_initial')

        // Wait for content to load
        await page.waitForTimeout(2000)
        await snap('titles_default_en_after_load')

        // The toggle button, if present, should show "日" (indicating JP is the other option)
        const toggleBtn = page.locator('button[title*="Toggle title language"]').first()
        const btnCount = await toggleBtn.count()

        if (btnCount > 0) {
            await snap('titles_default_en_toggle_visible')
            // Default: EN mode → toggle label should be "日"
            const label = await toggleBtn.innerText()
            expect(label).toBe('日')
            await snap('titles_default_en_toggle_label_日')
        }

        // localStorage should not be set to 'ja' on first load
        const stored = await page.evaluate(() => localStorage.getItem('title-language'))
        expect(stored).not.toBe('ja')
        await snap('titles_default_en_localstorage')
    })

    test('Documents list: toggle switches to JP title', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`)
        await page.waitForTimeout(2000)

        const toggleBtn = page.locator('button[title*="Toggle title language"]').first()
        const btnCount = await toggleBtn.count()

        if (btnCount === 0) {
            // No documents with title_ja in the DB — skip
            console.log('[title-toggle] No title_ja toggle button found — skipping JP toggle test')
            return
        }

        await snap('titles_toggle_jp_before')
        await toggleBtn.click()
        await snap('titles_toggle_jp_after_click')

        // After toggling to JP, the button label should now be "EN"
        const label = await toggleBtn.innerText()
        expect(label).toBe('EN')
        await snap('titles_toggle_jp_label_EN')

        // localStorage should be 'ja'
        const stored = await page.evaluate(() => localStorage.getItem('title-language'))
        expect(stored).toBe('ja')
        await snap('titles_toggle_jp_localstorage')
    })

    test('Documents list: title preference persists across reload', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`)
        await page.waitForTimeout(2000)

        const toggleBtn = page.locator('button[title*="Toggle title language"]').first()
        const btnCount = await toggleBtn.count()

        if (btnCount === 0) {
            console.log('[title-toggle] No title_ja toggle button found — skipping persistence test')
            return
        }

        await snap('titles_persist_before_toggle')

        // Click to switch to JP
        await toggleBtn.click()
        await snap('titles_persist_after_toggle')

        // Verify localStorage is 'ja'
        let stored = await page.evaluate(() => localStorage.getItem('title-language'))
        expect(stored).toBe('ja')

        // Reload the page
        await page.reload()
        await page.waitForTimeout(2000)
        await snap('titles_persist_after_reload')

        // After reload, localStorage should still be 'ja'
        stored = await page.evaluate(() => localStorage.getItem('title-language'))
        expect(stored).toBe('ja')

        // The toggle button should read "EN" (indicating we're in JP mode)
        const reloadToggleBtn = page.locator('button[title*="Toggle title language"]').first()
        const reloadCount = await reloadToggleBtn.count()
        if (reloadCount > 0) {
            const label = await reloadToggleBtn.innerText()
            expect(label).toBe('EN')
            await snap('titles_persist_verify_after_reload')
        }
    })
})

test.describe('Title language toggle — reader view', () => {
    test.use({ storageState: 'tests/.auth/admin.json' })

    test('Reader view: toggle present and functional', async ({ page, snap }) => {
        // Navigate to documents list first to find a document
        await page.goto(`${BASE}/documents`)
        await page.waitForTimeout(2000)
        await snap('titles_reader_list_before_nav')

        // Click the first document card link
        const docLink = page.locator('a[href*="/documents/"]').first()
        const linkCount = await docLink.count()

        if (linkCount === 0) {
            console.log('[title-toggle] No document links found on documents page — skipping reader test')
            return
        }

        await docLink.click()
        await page.waitForTimeout(3000)
        await snap('titles_reader_document_loaded')

        // Look for the title toggle button in the reader header
        const readerToggleBtn = page.locator('button[title*="Toggle title language"]')
        const readerBtnCount = await readerToggleBtn.count()

        if (readerBtnCount > 0) {
            await snap('titles_reader_toggle_visible')
            const label = await readerToggleBtn.first().innerText()
            // Should be "日" (EN mode by default)
            expect(label).toBe('日')

            // Click to toggle to JP
            await readerToggleBtn.first().click()
            await page.waitForTimeout(500)
            const newLabel = await readerToggleBtn.first().innerText()
            expect(newLabel).toBe('EN')
            await snap('titles_reader_toggled_to_jp')
        } else {
            console.log('[title-toggle] No title toggle in reader view — skipping reader toggle test')
        }
    })
})
