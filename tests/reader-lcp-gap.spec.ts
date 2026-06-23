/**
 * tests/reader-lcp-gap.spec.ts
 *
 * Phase 2 LCP gap closure verification.
 * Measures reader LCP on the largest book, confirms DOM stays virtualized,
 * validates sidebar search still works, and verifies SEO bot path.
 *
 * Run: npx playwright test tests/reader-lcp-gap.spec.ts --project=camoufox
 */

import { test, expect } from '@playwright/test'

const LARGE_ARTICLE_ID = '84f5be1e-6cbf-4753-9fe3-f3146769c1eb'
const READ_URL = `/documents/${LARGE_ARTICLE_ID}/read`
const SMALL_ARTICLE_ID = '86adf815-b0ca-46eb-bab7-b6fb040b845c'
const SMALL_READ_URL = `/documents/${SMALL_ARTICLE_ID}/read`

test.use({ storageState: 'tests/.auth/reader.json' })

test.describe('Phase 2 LCP gap closure', () => {
    test('LCP < 2.0s on largest book (human reader)', async ({ page }) => {
        const startTime = Date.now()
        await page.goto(READ_URL, { waitUntil: 'load', timeout: 30_000 })

        // Page should load and render content
        const title = page.locator('h1').first()
        await expect(title).toBeVisible({ timeout: 10_000 })

        // Measure LCP from Performance API
        const lcpMs = await page.evaluate(() => {
            const entries = performance.getEntriesByType('largest-contentful-paint')
            if (entries.length > 0) {
                return entries[entries.length - 1].startTime
            }
            // Fallback: use navigation timing
            const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
            if (nav) return nav.domContentLoadedEventEnd
            return -1
        })
        const loadMs = Date.now() - startTime

        console.log(`\n[LCP] Largest Contentful Paint: ${lcpMs.toFixed(0)}ms`)
        console.log(`[LOAD] Page load: ${loadMs}ms\n`)

        // LCP gate: < 2.0s
        if (lcpMs > 0) {
            expect(lcpMs, `LCP ${lcpMs.toFixed(0)}ms must be < 2000ms`).toBeLessThan(2000)
        } else {
            // If LCP not measurable (rare), at least verify fast load
            expect(loadMs, `Page load ${loadMs}ms must be < 5000ms`).toBeLessThan(5000)
        }
    })

    test('DOM stays virtualized (no node-count regression)', async ({ page }) => {
        await page.goto(SMALL_READ_URL, { waitUntil: 'load', timeout: 30_000 })
        await page.waitForTimeout(2000)

        const initialNodes = await page.evaluate(() => document.body.querySelectorAll('*').length)
        console.log(`\n[DOM] Initial node count: ${initialNodes}`)

        // Scroll to exercise Virtuoso
        const contentArea = page.locator('[class*="overflow-y-auto"]').first()
        if (await contentArea.count() > 0) {
            for (const scrollY of [500, 1500, 3000]) {
                await contentArea.evaluate((el, y) => { el.scrollTop = y }, scrollY)
                await page.waitForTimeout(300)
            }
        }

        const finalNodes = await page.evaluate(() => document.body.querySelectorAll('*').length)
        console.log(`[DOM] Final node count (after scroll): ${finalNodes}`)
        console.log(`[DOM] Growth: ${finalNodes - initialNodes} nodes\n`)

        expect(finalNodes, 'DOM node count should stay bounded (< 2000)').toBeLessThan(2000)
    })

    test('In-reader sidebar search still works', async ({ page }) => {
        await page.goto(SMALL_READ_URL, { waitUntil: 'load', timeout: 30_000 })
        await page.waitForTimeout(2000)

        // Open sidebar
        const sidebarButton = page.locator('button[aria-label="Open document sidebar (contents and search)"]')
        await sidebarButton.click()
        await page.waitForTimeout(500)

        // Switch to search tab
        const searchTab = page.locator('button:has-text("Search")').first()
        if (await searchTab.count() > 0) {
            await searchTab.click()
            await page.waitForTimeout(300)
        }

        // Type search query
        const searchInput = page.locator('input[aria-label="Search document"]')
        await expect(searchInput).toBeVisible({ timeout: 5_000 })

        // Wait for background fill to load most pages before searching
        // (the small doc has ~1000 segments / 50 = ~20 pages, should fill quickly)
        console.log('[SEARCH] Waiting for background fill...')
        await page.waitForTimeout(8000)

        await searchInput.fill('kote')
        await page.waitForTimeout(1500)

        // Check that we have results (not "No results")
        const bodyText = page.locator('body').innerText()
        const hasNoResults = (await bodyText).includes('No results for')
        console.log(`[SEARCH] noResults found: ${hasNoResults}`)
        expect(hasNoResults, 'Search should find results for "kote"').toBe(false)
    })

    test('SEO bot path returns full static HTML', async ({ page }) => {
        const context = await page.context()
        const botPage = await context.newPage()
        await botPage.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        })

        await botPage.goto(SMALL_READ_URL, { waitUntil: 'load', timeout: 30_000 })

        const pCount = await botPage.locator('main p').count()
        console.log(`\n[SEO-BOT] Paragraph count: ${pCount}`)
        expect(pCount, 'Bot should get full article content').toBeGreaterThan(10)

        await botPage.close()
    })
})
