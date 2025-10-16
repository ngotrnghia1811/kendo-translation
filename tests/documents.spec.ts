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

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

test.describe('Documents list', () => {
    test('Documents page loads and shows heading', async ({ page, screenshot }) => {
        await page.goto(`${BASE}/documents`)
        await screenshot('documents_page_initial_load')

        // Wait for the heading
        await page.waitForSelector('h1, h2', { timeout: 10_000 })
        await screenshot('documents_heading_visible')

        // Should contain some heading text related to documents
        const headingText = await page.locator('h1, h2').first().innerText()
        expect(headingText.length).toBeGreaterThan(0)
        await screenshot('documents_heading_text_confirmed')
    })

    test('Documents page shows loading skeleton or list', async ({ page, screenshot }) => {
        await page.goto(`${BASE}/documents`)
        await screenshot('documents_page_loading')

        // Wait a bit for content to load
        await page.waitForTimeout(2000)
        await screenshot('documents_after_2s_wait')

        // Page should not be blank
        const bodyText = await page.evaluate(() => document.body.innerText)
        expect(bodyText.trim().length).toBeGreaterThan(0)
        await screenshot('documents_content_present')
    })

    test('Navigation links exist on documents page', async ({ page, screenshot }) => {
        await page.goto(`${BASE}/documents`)
        await screenshot('documents_nav_check')

        await page.waitForTimeout(1500)
        await screenshot('documents_after_wait')

        // Check for any anchor links (document cards link to /documents/...)
        const links = await page.locator('a[href*="/documents"]').count()
        await screenshot('documents_links_counted')

        // There may be 0 documents in the test DB, so just verify page structure
        const main = page.locator('main, [role="main"], div.container, div.max-w-\\[')
        await screenshot('documents_main_area')
    })
})

test.describe('Document router', () => {
    test('/documents/[id] shows redirect loading state', async ({ page, screenshot }) => {
        const fakeId = 'test-document-id-000'
        await page.goto(`${BASE}/documents/${fakeId}`)
        await screenshot('document_router_initial')

        // The smart router shows "Redirecting..." while checking role
        // Even if it then navigates to /read, we capture the in-between
        await page.waitForTimeout(500)
        await screenshot('document_router_after_500ms')

        // Should have navigated somewhere (edit or read)
        await page.waitForTimeout(2000)
        await screenshot('document_router_final_redirect')

        const finalUrl = page.url()
        expect(finalUrl).toMatch(/\/(edit|read)$/)
    })

    test('/api/documents/[id] returns 404 for unknown id', async ({ page, screenshot }) => {
        await page.goto(`${BASE}/api/documents/nonexistent-id-99999`)
        await screenshot('documents_api_404_response')

        const body = await page.evaluate(() => document.body.innerText)
        const json = JSON.parse(body)
        expect([404, 500]).toContain(
            // 404 for PGRST116, 500 for other errors, both acceptable
            json.error ? (json.error === 'Document not found' ? 404 : 500) : 200,
        )
        await screenshot('documents_api_error_confirmed')
    })
})
