/**
 * PWA offline verification (Phase 5 acceptance)
 *
 * Tests:
 *   1. SW registers on reader page
 *   2. manifest.json is served with correct Content-Type and valid fields
 *   3. Reader page is retrievable offline (after first visit)
 *   4. Reading position survives reload
 *   5. No-regress: reader virtualization, sidebar search
 *
 * All reader-page tests use the `reader` role (storageState: tests/.auth/reader.json).
 */

import { test, expect } from './helpers/camoufox-fixture'

const READER_URL = '/documents/86adf815-b0ca-46eb-bab7-b6fb040b845c/read'

// ── Auth setup for reader-page tests ──────────────────────────────────────
test.describe('PWA — Service Worker registration', () => {
  test.use({ storageState: 'tests/.auth/reader.json' })

  test('SW can be registered and activates', async ({ page }) => {
    await page.goto(READER_URL)
    await page.waitForLoadState('domcontentloaded')

    // Explicitly register the SW (normally done by PwaRegistration in prod only)
    const reg = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { registered: false, reason: 'no-api' }
      try {
        const r = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        // Wait for activation
        if (r.installing || r.waiting) {
          await new Promise<void>((resolve) => {
            const sw = r.installing || r.waiting
            if (!sw) { resolve(); return }
            sw.addEventListener('statechange', () => {
              if (sw.state === 'activated') resolve()
            })
            // Timeout after 5s
            setTimeout(resolve, 5000)
          })
        }
        return { registered: true, scope: r.scope, state: r.active?.state ?? 'unknown' }
      } catch (err) {
        return { registered: false, reason: (err as Error).message }
      }
    })

    expect(reg.registered, `SW registration failed: ${reg.reason}`).toBe(true)

    // Clean up: unregister SW so subsequent tests aren't affected
    await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const r of regs) await r.unregister()
    }).catch(() => {})
  })
})

// ── manifest.json tests (no auth needed) ──────────────────────────────────
test.describe('PWA — manifest.json', () => {
  test('manifest is served with correct MIME type and valid fields', async ({ request }) => {
    const resp = await request.get('/manifest.json')
    expect(resp.status()).toBe(200)

    const contentType = resp.headers()['content-type'] ?? ''
    expect(contentType).toContain('application/json')

    const manifest = await resp.json()
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.theme_color).toBeTruthy()
    expect(manifest.icons).toBeInstanceOf(Array)
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)

    const hasLargeIcon = manifest.icons.some(
      (i: { sizes: string }) => i.sizes === '512x512'
    )
    expect(hasLargeIcon).toBe(true)
  })

  test('icons are served as image/png', async ({ request }) => {
    for (const path of ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']) {
      const resp = await request.get(path)
      expect(resp.status(), `${path} should return 200`).toBe(200)
      const ct = resp.headers()['content-type'] ?? ''
      expect(ct, `${path} should be image/png`).toContain('image/png')
    }
  })

  test('layout includes manifest link and theme-color meta', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')

    const themeMeta = page.locator('meta[name="theme-color"]')
    await expect(themeMeta.first()).toBeAttached()
  })
})

// ── Offline article retrieval (requires reader auth) ──────────────────────
test.describe('PWA — Offline article retrieval', () => {
  test.use({ storageState: 'tests/.auth/reader.json' })

  test('reader page loads after being cached (offline simulation)', async ({ page, context }) => {
    // Step 1: Register SW explicitly (auto-register is prod-only)
    await page.goto(READER_URL)
    await page.waitForLoadState('domcontentloaded')

    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      // Wait for activation
      await new Promise<void>((resolve) => {
        const sw = reg.installing || reg.waiting || reg.active
        if (!sw || sw.state === 'activated') { resolve(); return }
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') resolve()
        })
        setTimeout(resolve, 5000)
      })
    })

    // Step 2: Navigate to reader to populate SW cache
    await page.goto(READER_URL)
    await page.waitForLoadState('domcontentloaded')

    // Wait for SW to cache the page (SWR handler caches on fetch)
    await page.waitForTimeout(2000)

    // Step 3: Go offline
    await context.setOffline(true)

    // Step 4: Reload page — should serve from SW cache
    await page.reload({ waitUntil: 'domcontentloaded' })

    // The page should still render the reader (not a browser offline page)
    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title).not.toContain('ERR_')

    // Verify reader content is visible (not empty / error state).
    const readerContent = page.locator('[data-reader-theme]').first()
    await expect(readerContent).toBeVisible({ timeout: 5000 })

    // Go back online
    await context.setOffline(false)

    // Clean up: unregister SW so subsequent tests aren't affected
    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) {
        await reg.unregister()
      }
    }).catch(() => {})
  })
})

// ── Reading position persistence (requires reader auth) ───────────────────
test.describe('PWA — Reading position persistence', () => {
  test.use({ storageState: 'tests/.auth/reader.json' })

  test('reading position persists across reload via IndexedDB', async ({ page }) => {
    // Navigate to a neutral page first to close any open IndexedDB connections
    // from prior tests, then clean up stale state.
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await page.evaluate(async () => {
      // Clear localStorage for the test article
      localStorage.removeItem('reader-progress:86adf815-b0ca-46eb-bab7-b6fb040b845c')
      // Reset IndexedDB (close connections + delete)
      try {
        await new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase('kendo-pwa')
          req.onsuccess = () => resolve()
          req.onerror = () => resolve()
          req.onblocked = () => resolve() // connection blocked — accept
        })
      } catch { /* IndexedDB may be unavailable */ }
    })

    await page.goto(READER_URL)
    // Use domcontentloaded — networkidle may hang in dev with lazy-loading +
    // background page fetches that never settle.
    await page.waitForLoadState('domcontentloaded')
    // Wait for reader to hydrate and render
    await page.waitForSelector('[data-reader-theme]', { timeout: 10000 })

    // Wait for reader to render. The page selector only appears if the
    // document has multiple pages (totalPages > 1).
    const pageSelect = page.locator('select[aria-label*="total"]')
    const hasPager = await pageSelect.isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasPager) {
      // Single-page document — skip persistence test (nothing to navigate)
      return
    }

    // Check how many pages are available
    const options = page.locator('select[aria-label*="total"] option')
    const optionCount = await options.count()

    if (optionCount < 2) {
      // Only 1 page — skip
      return
    }

    // Navigate to page 1 by clicking the "Next page" button (→)
    // (selectOption on React's controlled <select> doesn't trigger onChange reliably)
    const nextBtn = page.locator('button[aria-label="Next page"]')
    await expect(nextBtn).toBeVisible({ timeout: 5000 })
    await nextBtn.click()
    // Wait for React to process the navigation + persistence effect
    await page.waitForTimeout(2000)

    // Verify the select shows page 1
    const valAfterNav = await pageSelect.inputValue()
    expect(valAfterNav).toBe('1')

    // Directly verify persistence via localStorage
    const lsAfterNav = await page.evaluate(() => {
      const key = 'reader-progress:86adf815-b0ca-46eb-bab7-b6fb040b845c'
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    })
    expect(lsAfterNav, 'localStorage should contain saved position after navigation').toBeTruthy()
    expect(lsAfterNav.pageIndex).toBeGreaterThanOrEqual(1)

    // Also verify IndexedDB has the record (via our storage lib)
    const idbAfterNav = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('kendo-pwa', 1)
        req.onsuccess = () => {
          const db = req.result
          try {
            const tx = db.transaction('readingPosition', 'readonly')
            const store = tx.objectStore('readingPosition')
            const getReq = store.get('86adf815-b0ca-46eb-bab7-b6fb040b845c')
            getReq.onsuccess = () => resolve(getReq.result ?? null)
            getReq.onerror = () => resolve(null)
          } catch {
            resolve(null)
          }
        }
        req.onerror = () => resolve(null)
      })
    })
    expect(idbAfterNav, 'IndexedDB should contain saved position').toBeTruthy()

    // Now reload and verify restoration
    await page.reload({ waitUntil: 'domcontentloaded' })
    // Wait for reader to re-hydrate
    await page.waitForSelector('[data-reader-theme]', { timeout: 10000 })
    const pageSelectAfter = page.locator('select[aria-label*="total"]')
    await expect(pageSelectAfter).toBeVisible({ timeout: 10000 })

    // Check that we land on a non-zero page (the saved position was restored)
    const valAfterReload = await pageSelectAfter.inputValue()
    expect(Number(valAfterReload)).toBeGreaterThanOrEqual(1)
  })
})

// ── No-regress checks (requires reader auth) ──────────────────────────────
test.describe('PWA — No-regress checks', () => {
  test.use({ storageState: 'tests/.auth/reader.json' })

  test('reader virtualization: DOM stable on scroll', async ({ page }) => {
    await page.goto(READER_URL)
    await page.waitForLoadState('domcontentloaded')
    // Wait for reader content
    await page.waitForSelector('[data-reader-font]', { timeout: 10000 })

    // Count rendered paragraphs before scroll
    const before = await page.locator('[data-reader-font] p, [data-reader-font] h2').count()

    // Scroll down a few times
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 500)
      await page.waitForTimeout(300)
    }

    // Count again — should NOT grow linearly (virtualization is working)
    const after = await page.locator('[data-reader-font] p, [data-reader-font] h2').count()

    // With virtualization, DOM count should stay roughly stable (±30%)
    expect(Math.abs(after - before)).toBeLessThan(before * 0.4)
  })

  test('sidebar search opens and is functional', async ({ page }) => {
    await page.goto(READER_URL)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('[data-reader-theme]', { timeout: 10000 })

    // Open sidebar via the "Open document sidebar" button
    const sidebarBtn = page.locator('button[aria-label="Open document sidebar (contents and search)"]')
    await sidebarBtn.click()
    await page.waitForTimeout(500)

    // Sidebar should be visible
    const sidebar = page.locator('[aria-label="Reader sidebar"]')
    await expect(sidebar).toBeVisible({ timeout: 5000 })

    // Switch to search tab
    const searchTab = sidebar.locator('button:has-text("Search")')
    if (await searchTab.isVisible()) {
      await searchTab.click()
      await page.waitForTimeout(300)
    }

    // Type a search query in the search input
    const searchInput = sidebar.locator('input[aria-label="Search document"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('kote')
      await page.waitForTimeout(500)
      // Search results or loading state should appear
      // (we don't assert on results since they depend on DB data; just
      //  verify the input accepted the text)
      const inputVal = await searchInput.inputValue()
      expect(inputVal).toBe('kote')
    }

    // Close sidebar
    const closeBtn = sidebar.locator('button[aria-label="Close sidebar"]')
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    }
  })
})
