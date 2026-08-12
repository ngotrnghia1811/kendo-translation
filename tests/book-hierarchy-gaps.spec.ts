/**
 * tests/book-hierarchy-gaps.spec.ts
 *
 * Coverage for the book→article→page hierarchy surfaces NOT covered by
 * `page-reader-verification.spec.ts` (the /[page] reader) or
 * `phase-b-verification.spec.ts` (the /books + /books/[bookId] browse lists):
 *
 *   1. The intermediate article page-index level  /books/[bookId]/[articleId]
 *      (3-panel Miller columns: Books | Articles | Pages) — renders, shows the
 *      article title + page count, and its "Chunk N" buttons navigate into the
 *      page reader.
 *   2. The husk-article reader graceful fallback — all 11 empty parent-book
 *      "husk" articles must return a clean 404 (notFound), both at the
 *      page-index level and the /[page] reader level, without crashing.
 *
 * Reads live PocketBase data; read-only (no mutations).
 * Uses pre-authenticated admin state from global-setup.
 */
import { test, expect } from './helpers/camoufox-fixture'
import type { Page } from '@playwright/test'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'
const BOOK_ID = 'ekdwoyn86cyx2pn'
const ARTICLE_ID = '93f7a0e0-a669-43cf-9a06-8f942b9479e8'
const ARTICLE_INDEX_URL = `${BASE}/books/${BOOK_ID}/${ARTICLE_ID}`

// The 11 husk article IDs (mirrors lib/husk-filter.ts HUSK_ARTICLE_IDS).
const HUSK_IDS = [
  '38221898-d3e4-4012-8a23-4a71c6f3a4ee', // Kendojidai 2010
  '84f5be1e-6cbf-4753-9fe3-f3146769c1eb', // Kendojidai 2011
  '4143b5fb-74df-414f-8ea3-fccc1a2b3b1b', // Kendojidai 2012
  '563b88bb-ed67-4f68-abfe-22068c1cf08c', // Kendojidai 2013
  'f8eb8778-b83b-4556-86f7-aaa4092d16d6', // Kendojidai 2014
  '4541dd08-3773-4b5d-9f8c-81efc75831ea', // Kendojidai 2015
  '057c1970-5c75-47f0-85e7-b3a949766148', // Kendojidai 2016
  'c602f1e2-95df-4da9-a3cf-3a389efdce92', // Kendojidai 2017
  'e9cfbf9f-5be9-4a1f-b5c9-5a52270a6d8c', // Kendojidai 2018
  'aea3e1a6-fe6a-408b-b57d-4942900670f4', // Kendo Reiho and Saho
  '3785cd55-421e-4daf-b1ba-546e3a09fdbe', // Ki Breathing Method
]

test.use({ storageState: 'tests/.auth/admin.json' })

// ---------------------------------------------------------------------------
// 01 — Article page-index level renders
// ---------------------------------------------------------------------------
test('01-article-page-index-renders', async ({ page, snap }) => {
  const resp = await page.goto(ARTICLE_INDEX_URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await snap('01_page_index')

  // Must not bounce to login (authenticated state present)
  expect(page.url()).not.toContain('/login')
  expect(resp?.status()).toBe(200)

  // Article title visible (Pages panel header carries a title attribute with
  // the full article name; the Articles panel also lists it as selected)
  const bodyText = (await page.textContent('body')) ?? ''
  const titleEl = page.locator('h2[title*="Shikake"]').first()
  const titleText = await titleEl.textContent().catch(() => '')
  console.log(`01: Article title = "${titleText?.slice(0, 60)}"`)
  expect(bodyText).toContain('Shikake')

  // Page count line ("N pages (chunked)")
  const pageCountLine = page.locator('text=/\\d+ page/').first()
  console.log(`01: Page count line visible = ${await pageCountLine.isVisible().catch(() => false)}`)
  expect(await pageCountLine.isVisible().catch(() => false)).toBe(true)

  // At least one page button ("Chunk 1" / "Page 1")
  const pageBtn = page.locator('button:has-text("Chunk"), button:has-text("Page")').first()
  const pageBtnText = await pageBtn.textContent().catch(() => '')
  console.log(`01: First page button = "${pageBtnText?.trim()}"`)
  expect(await pageBtn.isVisible().catch(() => false)).toBe(true)

  console.log('01: PASS — article page-index renders')
})

// ---------------------------------------------------------------------------
// 02 — Page-index → page reader click-through
// ---------------------------------------------------------------------------
test('02-page-index-to-reader-click-through', async ({ page, snap }) => {
  await page.goto(ARTICLE_INDEX_URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  const pageBtn = page.locator('button:has-text("Chunk"), button:has-text("Page")').first()
  await pageBtn.click()
  await page.waitForURL('**/93f7a0e0-a669-43cf-9a06-8f942b9479e8/1', { timeout: 15000 })
  await snap('02_reader_page1')

  // Reader component should mount
  await page.locator('[data-reader-theme].flex.flex-col').first().waitFor({ state: 'visible', timeout: 30000 })
  console.log(`02: Landed on reader URL = ${page.url()}`)
  expect(page.url()).toContain('/1')

  console.log('02: PASS — page-index button navigates into the reader')
})

// ---------------------------------------------------------------------------
// 03 — Husk reader graceful fallback: /[page] level returns 404 (all 11)
// ---------------------------------------------------------------------------
test('03-husk-reader-page-404', async ({ page }) => {
  for (const huskId of HUSK_IDS) {
    const resp = await page.goto(`${BASE}/books/${BOOK_ID}/${huskId}/1`, { waitUntil: 'domcontentloaded' })
    const status = resp?.status()
    console.log(`03: husk ${huskId.slice(0, 8)} reader /1 → status=${status}`)
    expect(status, `husk ${huskId.slice(0, 8)} reader should 404`).toBe(404)
  }
  console.log('03: PASS — all 11 husk readers return 404 gracefully')
})

// ---------------------------------------------------------------------------
// 04 — Husk article page-index (no page) returns 404 (all 11)
// ---------------------------------------------------------------------------
test('04-husk-article-page-index-404', async ({ page }) => {
  for (const huskId of HUSK_IDS) {
    const resp = await page.goto(`${BASE}/books/${BOOK_ID}/${huskId}`, { waitUntil: 'domcontentloaded' })
    const status = resp?.status()
    console.log(`04: husk ${huskId.slice(0, 8)} page-index → status=${status}`)
    expect(status, `husk ${huskId.slice(0, 8)} page-index should 404`).toBe(404)
  }
  console.log('04: PASS — all 11 husk page-indexes return 404 gracefully')
})
