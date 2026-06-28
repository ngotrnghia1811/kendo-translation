/**
 * tests/reader-lcp-repeat.spec.ts
 *
 * Repeated LCP measurement harness for the 29k-segment book (Kendojidai 2011).
 * Runs N iterations sequentially against the dev server and reports per-run
 * LCP + min/median/max summary.
 *
 * Run: npx playwright test tests/reader-lcp-repeat.spec.ts --project=camoufox
 */
// Camoufox fixture intentionally NOT used — performance measurement doesn't
// need anti-detection, and the fixture context overhead would skew LCP timing.
import { test } from '@playwright/test'

const LARGE_ARTICLE_ID = '84f5be1e-6cbf-4753-9fe3-f3146769c1eb'
const READ_URL = `/documents/${LARGE_ARTICLE_ID}/read`
const ITERATIONS = 5

test.use({ storageState: 'tests/.auth/reader.json' })

// Collect results across serial runs
const lcpValues: number[] = []

test.describe.serial('LCP repeatability — 29k book (Kendojidai 2011)', () => {

  for (let i = 1; i <= ITERATIONS; i++) {
    test(`run ${i} of ${ITERATIONS}`, async ({ page }) => {
      const startWall = Date.now()

      await page.goto(READ_URL, { waitUntil: 'load', timeout: 45_000 })

      // Wait for h1 to be visible
      const title = page.locator('h1').first()
      try {
        await title.waitFor({ state: 'visible', timeout: 15_000 })
      } catch {
        console.log(`[RUN ${i}] WARNING: h1 not visible within 15s`)
      }

      // Measure LCP from Performance API
      const lcpMs = await page.evaluate(() => {
        const entries = performance.getEntriesByType('largest-contentful-paint')
        if (entries.length > 0) {
          return entries[entries.length - 1].startTime
        }
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (nav) return nav.domContentLoadedEventEnd
        return -1
      })
      const wallMs = Date.now() - startWall

      // First Contentful Paint
      const fcpMs = await page.evaluate(() => {
        const entries = performance.getEntriesByType('paint')
        const fcp = entries.find(e => e.name === 'first-contentful-paint')
        return fcp ? fcp.startTime : -1
      })

      // DOM node count
      const nodeCount = await page.evaluate(() => document.body.querySelectorAll('*').length)

      // Navigation timing
      const navTiming = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (!nav) return null
        return {
          ttfb: nav.responseStart - nav.requestStart,
          domComplete: nav.domComplete,
          dns: nav.domainLookupEnd - nav.domainLookupStart,
          tcp: nav.connectEnd - nav.connectStart,
        }
      })

      lcpValues.push(lcpMs)

      console.log(`\n========== [RUN ${i}/${ITERATIONS}] ==========`)
      console.log(`  LCP:          ${lcpMs.toFixed(0)} ms`)
      console.log(`  FCP:          ${fcpMs.toFixed(0)} ms`)
      console.log(`  Wall clock:   ${wallMs} ms`)
      console.log(`  DOM nodes:    ${nodeCount}`)
      if (navTiming) {
        console.log(`  TTFB:         ${navTiming.ttfb.toFixed(0)} ms`)
        console.log(`  DOM complete: ${navTiming.domComplete.toFixed(0)} ms`)
        console.log(`  DNS:          ${navTiming.dns.toFixed(0)} ms`)
      }
    })
  }

  // Summary test — runs last
  test('SUMMARY — min / median / max', async () => {
    const sorted = [...lcpValues].sort((a, b) => a - b)
    const n = sorted.length
    const min = sorted[0]
    const max = sorted[n - 1]
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)]
    const mean = sorted.reduce((s, v) => s + v, 0) / n

    console.log(`\n===============================================`)
    console.log(`  LCP SUMMARY (${n} runs, dev server)`)
    console.log(`  Min:    ${min.toFixed(0)} ms`)
    console.log(`  Median: ${median.toFixed(0)} ms`)
    console.log(`  Max:    ${max.toFixed(0)} ms`)
    console.log(`  Mean:   ${mean.toFixed(0)} ms`)
    console.log(`  Spread: ${(max - min).toFixed(0)} ms`)
    console.log(`  Values: [${sorted.map(v => v.toFixed(0)).join(', ')}]`)
    console.log(`===============================================\n`)

    // No gate assertion — measurement only
  })
})
