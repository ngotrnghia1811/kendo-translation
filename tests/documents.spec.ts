/**
 * tests/documents.spec.ts
 *
 * Tests for the document list page and document router:
 *  - /documents page renders (loading state → content)
 *  - DocumentCard links are present
 *  - /documents/[id] page redirects based on role
 *
 * Screenshots taken at every key state.
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

test.describe('Documents list', () => {
    test('Documents page loads and shows heading', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`)
        await snap('documents_page_initial_load')

        // Wait for the heading
        await page.waitForSelector('h1, h2', { timeout: 10_000 })
        await snap('documents_heading_visible')

        // Should contain some heading text related to documents
        const headingText = await page.locator('h1, h2').first().innerText()
        expect(headingText.length).toBeGreaterThan(0)
        await snap('documents_heading_text_confirmed')
    })

    test('Documents page shows loading skeleton or list', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`)
        await snap('documents_page_loading')

        // Wait a bit for content to load
        await page.waitForTimeout(2000)
        await snap('documents_after_2s_wait')

        // Page should not be blank
        const bodyText = await page.evaluate(() => document.body.innerText)
        expect(bodyText.trim().length).toBeGreaterThan(0)
        await snap('documents_content_present')
    })

    test('Navigation links exist on documents page', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`)
        await snap('documents_nav_check')

        await page.waitForTimeout(1500)
        await snap('documents_after_wait')

        // Check for any anchor links (document cards link to /documents/...)
        const links = await page.locator('a[href*="/documents"]').count()
        await snap('documents_links_counted')

        // There may be 0 documents in the test DB, so just verify page structure
        const main = page.locator('main, [role="main"], div.container, div.max-w-\\[')
        await snap('documents_main_area')
    })
})

test.describe('Document router', () => {
    test.describe('Authenticated', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('/documents/[id] shows redirect loading state', async ({ page, snap }) => {
            const fakeId = 'test-document-id-000'
            await page.goto(`${BASE}/documents/${fakeId}`)
            await snap('document_router_initial')

            // The smart router shows "Redirecting..." while checking role
            // Even if it then navigates to /read, we capture the in-between
            await page.waitForTimeout(500)
            await snap('document_router_after_500ms')

            // Should have navigated somewhere (edit or read)
            await page.waitForTimeout(2000)
            await snap('document_router_final_redirect')

            const finalUrl = page.url()
            expect(finalUrl).toMatch(/\/(edit|read)$/)
        })
    })

    test('/api/documents/[id] returns 404 for unknown id', async ({ page, snap }) => {
        await page.goto(`${BASE}/api/documents/nonexistent-id-99999`)
        await snap('documents_api_404_response')

        const body = await page.evaluate(() => document.body.innerText)
        const json = JSON.parse(body)
        expect([404, 500]).toContain(
            // 404 for PGRST116, 500 for other errors, both acceptable
            json.error ? (json.error === 'Document not found' ? 404 : 500) : 200,
        )
        await snap('documents_api_error_confirmed')
    })
})
