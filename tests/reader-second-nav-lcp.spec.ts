/**
 * tests/reader-second-nav-lcp.spec.ts
 *
 * Phase 4 caching acceptance: second navigation to the same article is
 * instant. Measures LCP on the second hit (after the unstable_cache entry
 * and route compilation are warm) using a PerformanceObserver.
 *
 * Run: npx playwright test tests/reader-second-nav-lcp.spec.ts --project=camoufox
 */
import { test, expect } from '@playwright/test'

const TEST_DOC_ID = '86adf815-b0ca-46eb-bab7-b6fb040b845c'
const READ_URL = `/documents/${TEST_DOC_ID}/read`

test.use({ storageState: 'tests/.auth/reader.json' })

test('second navigation to same article has LCP < 2000ms (warm cache)', async ({ page }) => {
    // ---- Warm up: first navigation ----
    // Primes Next.js route compilation and populates the unstable_cache entry.
    const firstWallStart = Date.now()
    await page.goto(READ_URL, { waitUntil: 'load', timeout: 45_000 })
    // Wait for reader content — any <p> or virtuoso item is fine
    try {
        await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15_000 })
    } catch {
        console.log('[WARM] WARNING: h1 not visible within 15s — continuing anyway')
    }
    const firstWall = Date.now() - firstWallStart

    // Capture first-nav LCP for comparison (getEntriesByType is fine here since
    // we're measuring post-hoc after the page fully loaded).
    const firstLcp = await page.evaluate(() => {
        const entries = performance.getEntriesByType('largest-contentful-paint')
        return entries.length > 0 ? entries[entries.length - 1].startTime : -1
    })
    console.log(`[WARM] First-nav LCP: ${firstLcp.toFixed(0)}ms, wall: ${firstWall}ms`)

    // ---- Navigate away ----
    // Move to /documents to clear the page entirely, then navigate back.
    await page.goto('/documents', { waitUntil: 'load', timeout: 15_000 })
    await page.waitForTimeout(500)

    // ---- Install PerformanceObserver for the second navigation ----
    // addInitScript runs before any page scripts on the next navigation.
    // buffered:true ensures the observer sees past LCP entries that fired
    // before the script was registered.
    await page.addInitScript(() => {
        ;(window as any).__lcpValue = -1
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries()
                if (entries.length > 0) {
                    ;(window as any).__lcpValue =
                        entries[entries.length - 1].startTime
                }
            })
            observer.observe({
                type: 'largest-contentful-paint',
                buffered: true,
            })
        } catch {
            // observer not supported — __lcpValue stays -1
        }
    })

    // ---- Second navigation ----
    const secondWallStart = Date.now()
    await page.goto(READ_URL, { waitUntil: 'load', timeout: 45_000 })
    try {
        await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15_000 })
    } catch {
        console.log('[SECOND] WARNING: h1 not visible within 15s')
    }
    const secondWall = Date.now() - secondWallStart

    // Read LCP captured by the PerformanceObserver
    const lcpMs: number = await page.evaluate(() => (window as any).__lcpValue)

    // Read TTFB from navigation timing (available now that the page has loaded)
    const ttfbMs: number = await page.evaluate(() => {
        const entries = performance.getEntriesByType('navigation')
        if (entries.length > 0) {
            const nav = entries[entries.length - 1] as PerformanceNavigationTiming
            return nav.responseStart - nav.requestStart
        }
        return -1
    })

    console.log(`\n========== SECOND NAVIGATION ==========`)
    console.log(`  LCP:          ${lcpMs.toFixed(0)} ms`)
    console.log(`  TTFB:         ${ttfbMs.toFixed(0)} ms`)
    console.log(`  Wall clock:   ${secondWall} ms`)
    console.log(`========================================\n`)

    // Gate: second-nav LCP must be under 2000ms
    expect(
        lcpMs,
        `Second-nav LCP ${lcpMs.toFixed(0)}ms must be < 2000ms (warm cache gate)`,
    ).toBeLessThan(2000)
})
