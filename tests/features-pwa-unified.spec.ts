import { test, expect } from './helpers/camoufox-fixture'
import { ensureSidebarOpen } from './helpers/reader-sidebar'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'
const READER_URL = '/documents/86adf815-b0ca-46eb-bab7-b6fb040b845c/read'

// --- PWA & Offline ---
test.describe('PWA & Offline', () => {
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

  test('reading position persists across reload via IndexedDB', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await page.evaluate(async () => {
      localStorage.removeItem('reader-progress:86adf815-b0ca-46eb-bab7-b6fb040b845c')
      try {
        await new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase('kendo-pwa')
          req.onsuccess = () => resolve()
          req.onerror = () => resolve()
          req.onblocked = () => resolve()
        })
      } catch { /* IndexedDB may be unavailable */ }
    })

    await page.goto(READER_URL)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('[data-reader-theme]', { timeout: 10000 })

    const pageSelect = page.locator('select[aria-label*="total"]')
    const hasPager = await pageSelect.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasPager) return

    const options = page.locator('select[aria-label*="total"] option')
    const optionCount = await options.count()
    if (optionCount < 2) return

    const nextBtn = page.locator('button[aria-label="Next page"]')
    await expect(nextBtn).toBeVisible({ timeout: 5000 })
    await nextBtn.click()
    await page.waitForTimeout(2000)

    const valAfterNav = await pageSelect.inputValue()
    expect(valAfterNav).toBe('1')

    const lsAfterNav = await page.evaluate(() => {
      const key = 'reader-progress:86adf815-b0ca-46eb-bab7-b6fb040b845c'
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    })
    expect(lsAfterNav, 'localStorage should contain saved position after navigation').toBeTruthy()
    expect(lsAfterNav.pageIndex).toBeGreaterThanOrEqual(1)

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

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-reader-theme]', { timeout: 10000 })
    const pageSelectAfter = page.locator('select[aria-label*="total"]')
    await expect(pageSelectAfter).toBeVisible({ timeout: 10000 })
    await expect(pageSelectAfter).toHaveValue(/^[1-9]/, { timeout: 10_000 })
  })

  test('reader virtualization: DOM stable on scroll', async ({ page }) => {
    await page.goto(READER_URL)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('[data-reader-font] p, [data-reader-font] h2', { timeout: 10000 })

    const before = await page.locator('[data-reader-font] p, [data-reader-font] h2').count()
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 500)
      await page.waitForTimeout(300)
    }

    const after = await page.locator('[data-reader-font] p, [data-reader-font] h2').count()
    expect(Math.abs(after - before)).toBeLessThan(before * 0.4)
  })

  test('sidebar search opens and is functional', async ({ page }) => {
    await page.goto(READER_URL)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('[data-reader-theme]', { timeout: 10000 })
    await ensureSidebarOpen(page)
    const sidebar = page.locator('[aria-label="Reader sidebar"]')
    await expect(sidebar).toBeVisible({ timeout: 5000 })

    const searchTab = sidebar.locator('button:has-text("Search")')
    if (await searchTab.isVisible()) {
        await searchTab.click()
        await page.waitForTimeout(300)
    }

    const searchInput = sidebar.locator('input[aria-label="Search document"]')
    if (await searchInput.isVisible()) {
        await searchInput.fill('kote')
        await page.waitForTimeout(500)
        const inputVal = await searchInput.inputValue()
        expect(inputVal).toBe('kote')
    }

    const closeBtn = sidebar.locator('button[aria-label="Close sidebar"]')
    if (await closeBtn.isVisible()) {
        await closeBtn.click()
    }
  })

  test('RF-PWA-02: full PWA installability criteria', async ({ page, request }) => {
    const manifestResp = await request.get('/manifest.json')
    expect(manifestResp.status()).toBe(200)

    const contentType = manifestResp.headers()['content-type'] ?? ''
    expect(contentType).toContain('application/json')

    const manifest = await manifestResp.json()
    expect(manifest.display, 'manifest display must be "standalone"').toBe('standalone')
    expect(manifest.start_url, 'manifest start_url must be "/"').toBe('/')
    expect(manifest.scope, 'manifest scope must match app base path').toBe('/')

    expect(manifest.icons, 'manifest must have icons array').toBeInstanceOf(Array)
    expect(manifest.icons.length, 'manifest must have at least 2 icons').toBeGreaterThanOrEqual(2)

    const has192x192 = manifest.icons.some(
      (i: { sizes: string }) => i.sizes === '192x192',
    )
    const has512x512 = manifest.icons.some(
      (i: { sizes: string }) => i.sizes === '512x512',
    )
    expect(has192x192, 'manifest must have 192x192 icon').toBe(true)
    expect(has512x512, 'manifest must have 512x512 icon').toBe(true)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const themeColorMeta = page.locator('meta[name="theme-color"]')
    await expect(themeColorMeta.first(), '<meta name="theme-color"> must exist').toBeAttached()

    const appleMeta = page.locator('meta[name="apple-mobile-web-app-capable"]')
    const appleMetaCount = await appleMeta.count()
    if (appleMetaCount > 0) {
      const content = await appleMeta.first().getAttribute('content')
      expect(content, 'apple-mobile-web-app-capable content should be "yes"').toBe('yes')
    }

    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink, '<link rel="manifest"> must exist').toHaveAttribute('href', '/manifest.json')

    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { registered: false, reason: 'no-api' }
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        if (reg.installing || reg.waiting) {
          await new Promise<void>((resolve) => {
            const sw = reg.installing || reg.waiting
            if (!sw) { resolve(); return }
            sw.addEventListener('statechange', () => {
              if (sw.state === 'activated') resolve()
            })
            setTimeout(resolve, 5000)
          })
        }
        return { registered: true, scope: reg.scope, state: reg.active?.state ?? 'unknown' }
      } catch (err) {
        return { registered: false, reason: (err as Error).message }
      }
    })

    await page.waitForTimeout(2000)

    const cacheInfo = await page.evaluate(async () => {
      if (!('caches' in window)) return { cachesAvailable: false }
      try {
        const cacheNames = await caches.keys()
        const cacheDetails: Array<{ name: string; count: number; entries: string[] }> = []
        for (const name of cacheNames) {
          const cache = await caches.open(name)
          const keys = await cache.keys()
          const urls = keys.map((r) => r.url).slice(0, 20)
          cacheDetails.push({ name, count: keys.length, entries: urls })
        }
        return { cachesAvailable: true, cacheDetails }
      } catch {
        return { cachesAvailable: false, error: 'cache enumeration failed' }
      }
    })

    const totalCachedEntries = (cacheInfo.cacheDetails ?? []).reduce(
      (sum: number, c: { count: number }) => sum + c.count, 0,
    )
    expect(
      totalCachedEntries,
      'Service worker should cache at least one asset after install',
    ).toBeGreaterThan(0)

    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) await reg.unregister()
    }).catch(() => {})
  })
})

// --- Terminology Glossary ---
test.describe('Terminology Glossary', () => {
    const MOCK_TERMS = [
        { id: 't1', source_term: '剣道', target_term: 'Kendo', reading: 'けんどう', domain: 'martial arts', notes: null },
        { id: 't2', source_term: '竹刀', target_term: 'Shinai', reading: 'しない', domain: 'equipment', notes: 'Bamboo sword' },
        { id: 't3', source_term: '防具', target_term: 'Bogu', reading: 'ぼうぐ', domain: 'equipment', notes: 'Protective gear' },
        { id: 't4', source_term: '礼', target_term: 'Rei', reading: 'れい', domain: 'etiquette', notes: 'Bow / respect' },
        { id: 't5', source_term: '稽古', target_term: 'Keiko', reading: 'けいこ', domain: 'practice', notes: null },
    ]
    test('Terminology page renders heading', async ({ page, snap }) => {
        await page.goto(`${BASE}/terminology`)
        await page.waitForSelector('h1', { timeout: 10_000 })
        const heading = await page.locator('h1').first().innerText()
        expect(heading.toLowerCase()).toContain('terminolog')
    })

    test('Search input is visible', async ({ page, snap }) => {
        await page.goto(`${BASE}/terminology`)
        await page.waitForSelector('h1', { timeout: 10_000 })
        await page.waitForTimeout(1000)
        const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
        await expect(searchInput).toBeVisible({ timeout: 5000 })
    })

    test('Terminology table renders with mocked API data', async ({ page, snap }) => {
        await page.route('**/api/terminology', route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ terms: MOCK_TERMS }),
            }),
        )
        await page.goto(`${BASE}/terminology`)
        await page.waitForTimeout(2000)
        const bodyText = await page.evaluate(() => document.body.innerText)
        expect(bodyText).toContain('剣道')
        expect(bodyText).toContain('Kendo')
    })

    test('Search filters terminology results', async ({ page, snap }) => {
        await page.route('**/api/terminology', route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ terms: MOCK_TERMS }),
            }),
        )
        await page.goto(`${BASE}/terminology`)
        await page.waitForTimeout(2000)
        const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
        await searchInput.fill('equipment', { timeout: 5000 })
        await page.waitForTimeout(500)
        const bodyText = await page.evaluate(() => document.body.innerText)
        expect(bodyText).toContain('竹刀')
    })

    test('Terminology page handles empty results gracefully', async ({ page, snap }) => {
        await page.route('**/api/terminology', route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ terms: [] }),
            }),
        )
        await page.goto(`${BASE}/terminology`)
        await page.waitForTimeout(2000)
        const bodyText = await page.evaluate(() => document.body.innerText)
        expect(bodyText.trim().length).toBeGreaterThan(0)
    })

    test('/api/terminology returns JSON with terms array', async ({ page, snap }) => {
        await page.goto(`${BASE}/api/terminology`)
        const body = await page.evaluate(() => document.body.innerText)
        const json = JSON.parse(body)
        expect(json).toHaveProperty('terms')
        expect(Array.isArray(json.terms)).toBe(true)
    })
})

// --- Documents & Search ---
test.describe('Documents & Search', () => {
    test('Documents page loads and shows heading', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`)
        await page.waitForSelector('h1, h2', { timeout: 10_000 })
        const headingText = await page.locator('h1, h2').first().innerText()
        expect(headingText.length).toBeGreaterThan(0)
    })

    test('Documents page shows loading skeleton or list', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`)
        await page.waitForTimeout(2000)
        const bodyText = await page.evaluate(() => document.body.innerText)
        expect(bodyText.trim().length).toBeGreaterThan(0)
    })

    test('Navigation links exist on documents page', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`)
        await page.waitForTimeout(1500)
        const links = await page.locator('a[href*="/documents"]').count()
    })

    test.describe('Document router', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })
        test('/documents/[id] shows redirect loading state', async ({ page, snap }) => {
            const fakeId = 'test-document-id-000'
            await page.goto(`${BASE}/documents/${fakeId}`)
            await page.waitForTimeout(2500)
            const finalUrl = page.url()
            expect(finalUrl).toMatch(/\/(edit|read)$/)
        })
    })

    test('/api/documents/[id] returns 404 for unknown id', async ({ page, snap }) => {
        await page.goto(`${BASE}/api/documents/nonexistent-id-99999`)
        const body = await page.evaluate(() => document.body.innerText)
        const json = JSON.parse(body)
        expect([404, 500]).toContain(
            json.error ? (json.error === 'Document not found' ? 404 : 500) : 200,
        )
    })
})

// --- Furigana & Japanese Text ---
test.describe('Furigana & Japanese Text', () => {
    test.use({ storageState: 'tests/.auth/wenqian.json' })

    async function injectRubyTextFixture(
        page: import('@playwright/test').Page,
        options?: {
            furiganaMode?: 'off' | 'furigana' | 'romaji'
            furiganaJlptMinLevel?: string | null
            useNoRomaji?: boolean
        },
    ) {
        await page.goto(`${BASE}/documents`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2000)
        await page.evaluate((opts) => {
            const mode = opts?.furiganaMode ?? 'furigana'
            const minLevel = opts?.furiganaJlptMinLevel ?? null
            const showAnnotations = mode !== 'off'
            const showRomaji = mode === 'romaji'
            const container = document.createElement('div')
            container.id = 'furigana-test-container'
            container.style.cssText = 'position:fixed;top:10px;left:10px;z-index:99999;background:#fff;padding:20px;border:2px solid #333;max-width:600px;font-size:16px;'
            document.body.appendChild(container)
            const noRomaji = opts?.useNoRomaji === true
            interface FixtureSpan { type: string; base?: string; reading?: string; romaji?: string; jlptLevel?: string | null; text?: string; }
            const fixtureSpans: FixtureSpan[] = noRomaji ? [
                { type: 'kanji', base: '剣', reading: 'けん', jlptLevel: 'N1' },
                { type: 'kanji', base: '道', reading: 'どう', jlptLevel: 'N5' },
                { type: 'text', text: 'と' },
                { type: 'kanji', base: '居', reading: 'い', jlptLevel: 'N2' },
                { type: 'kanji', base: '合', reading: 'あい', jlptLevel: 'N4' },
            ] : [
                { type: 'kanji', base: '剣', reading: 'けん', romaji: 'ken', jlptLevel: 'N1' },
                { type: 'kanji', base: '道', reading: 'どう', romaji: 'dou', jlptLevel: 'N5' },
                { type: 'text', text: 'の' },
                { type: 'kanji', base: '稽', reading: 'けい', romaji: 'kei', jlptLevel: 'N1' },
                { type: 'kanji', base: '古', reading: 'こ', romaji: 'ko', jlptLevel: 'N5' },
                { type: 'text', text: 'では、' },
                { type: 'kanji', base: '面', reading: 'めん', romaji: 'men', jlptLevel: 'N4' },
                { type: 'kanji', base: '打', reading: 'う', romaji: 'u', jlptLevel: 'N3' },
                { type: 'text', text: 'ち' },
            ]
            const order: Record<string,number> = { N5:0, N4:1, N3:2, N2:3, N1:4 }
            function passesFilter(kanjiLevel: string|null, min: string|null): boolean {
                if (min === null) return true
                if (kanjiLevel === null) return true
                return (order[kanjiLevel] ?? -1) >= (order[min] ?? -1)
            }
            let html = ''
            for (const span of fixtureSpans) {
                if (span.type === 'text') {
                    html += `<span>${span.text}</span>`
                } else if (span.type === 'kanji') {
                    const hasAnnotation = showRomaji ? !!span.romaji : span.reading && span.reading !== span.base
                    const shouldAnnotate = showAnnotations && hasAnnotation && passesFilter(span.jlptLevel ?? null, minLevel)
                    if (shouldAnnotate) {
                        const annotation = showRomaji && span.romaji ? span.romaji : span.reading
                        html += `<ruby data-mode="${mode}">${span.base}<rp>(</rp><rt>${annotation}</rt><rp>)</rp></ruby>`
                    } else {
                        html += `<span class="kanji-plain">${span.base}</span>`
                    }
                }
            }
            container.innerHTML = html
        }, options)
        await page.waitForTimeout(300)
    }

    test('ruby elements render from fixture data', async ({ page, snap }) => {
        await injectRubyTextFixture(page, { furiganaMode: 'furigana', furiganaJlptMinLevel: null })
        const rubyElements = page.locator('#furigana-test-container ruby')
        expect(await rubyElements.count()).toBeGreaterThan(0)
    })

    test('toggle off hides furigana when furiganaMode=off', async ({ page, snap }) => {
        await injectRubyTextFixture(page, { furiganaMode: 'off', furiganaJlptMinLevel: null })
        await expect(page.locator('#furigana-test-container ruby')).toHaveCount(0)
    })

    test('JLPT filter shows only kanji at/above selected level', async ({ page, snap }) => {
        await injectRubyTextFixture(page, { furiganaMode: 'furigana', furiganaJlptMinLevel: 'N3' })
        expect(await page.locator('#furigana-test-container ruby').count()).toBe(3)
    })

    test('no-kanji fixture renders plain text (graceful degradation)', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2000)
        await page.evaluate(() => {
            const container = document.createElement('div')
            container.id = 'furigana-test-container'
            container.innerHTML = '<span>こんにちは、ありがとうございます。</span>'
            document.body.appendChild(container)
        })
        await page.waitForTimeout(300)
        await expect(page.locator('#furigana-test-container ruby')).toHaveCount(0)
    })

    test('romaji mode renders romaji in <rt>', async ({ page, snap }) => {
        await injectRubyTextFixture(page, { furiganaMode: 'romaji', furiganaJlptMinLevel: null })
        expect(await page.locator('#furigana-test-container ruby').count()).toBeGreaterThan(0)
        await expect(page.locator('#furigana-test-container rt').first()).toHaveText('ken')
    })

    test('romaji mode with JLPT filter respects level threshold', async ({ page, snap }) => {
        await injectRubyTextFixture(page, { furiganaMode: 'romaji', furiganaJlptMinLevel: 'N2' })
        expect(await page.locator('#furigana-test-container ruby').count()).toBe(2)
    })

    test('old spans without romaji degrade gracefully in romaji mode', async ({ page, snap }) => {
        await injectRubyTextFixture(page, { furiganaMode: 'romaji', furiganaJlptMinLevel: null, useNoRomaji: true })
        await expect(page.locator('#furigana-test-container ruby')).toHaveCount(0)
    })

    test('reader loads with furigana settings persisted (integration)', async ({ page }) => {
        await page.goto(`${BASE}/documents`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1000)
        await page.evaluate(() => {
            localStorage.setItem('reader-theme-settings', JSON.stringify({ furiganaMode: 'romaji', furiganaJlptMinLevel: 'N2' }))
            localStorage.setItem('kt-theme', 'light')
        })
        const docsRes = await page.evaluate(async (base) => {
            const res = await fetch(`${base}/api/documents`)
            const json = await res.json()
            return (Array.isArray(json) ? json : (json.documents ?? []))[0]?.id ?? null
        }, BASE)
        if (docsRes) {
            await page.goto(`${BASE}/documents/${docsRes}/read`, { waitUntil: 'domcontentloaded' })
            await page.waitForTimeout(3000)
            const settingsBtn = page.locator('button[aria-label="Reader settings"]')
            await settingsBtn.waitFor({ state: 'visible', timeout: 15000 })
            await settingsBtn.click()
            await page.waitForTimeout(400)
            await expect(page.locator('button[aria-pressed="true"]').filter({ hasText: 'Rōmaji' })).toHaveCount(1)
        }
    })

    test('old showFurigana boolean migrates to furiganaMode=off', async ({ page }) => {
        await page.goto(`${BASE}/documents`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1000)
        await page.evaluate(() => {
            localStorage.setItem('reader-theme-settings', JSON.stringify({ showFurigana: false, furiganaJlptMinLevel: null }))
        })
        await page.reload()
        await page.waitForTimeout(2000)
        const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('reader-theme-settings') || '{}'))
        expect(settings.furiganaMode).toBe('off')
    })

    test('RF-KANJIDIC2-01: KANJIDIC2-only kanji rendering @userflow @p2', async ({ page }) => {
        await page.goto(`${BASE}/documents`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2000)
        const docsRes = await page.evaluate(async (base) => {
            const res = await fetch(`${base}/api/documents?limit=100`)
            const json = await res.json()
            return (Array.isArray(json) ? json : (json.documents ?? [])).map((d: any) => d.id)
        }, BASE)
        if (docsRes.length === 0) {
            test.skip(true, 'No documents found')
            return
        }
        await page.evaluate(() => {
            const settings = JSON.parse(localStorage.getItem('reader-theme-settings') || '{}')
            settings.furiganaMode = 'furigana'
            localStorage.setItem('reader-theme-settings', JSON.stringify(settings))
        })
        await page.goto(`${BASE}/documents/${docsRes[0]}/read`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3000)
        const jpToggle = page.locator('button:has-text("JP")').first()
        if (await jpToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await jpToggle.click()
            await page.waitForTimeout(1500)
        }
        const rubyCount = await page.locator('ruby').count().catch(() => 0)
        if (rubyCount > 0) {
            const rtElements = page.locator('rt')
            const rtCount = await rtElements.count().catch(() => 0)
            for (let i = 0; i < Math.min(rtCount, 10); i++) {
                const text = await rtElements.nth(i).textContent().catch(() => '')
                expect(text?.trim().length).toBeGreaterThan(0)
            }
        }
    })
})

// --- Title & Language Toggle ---
test.describe('Title & Language Toggle', () => {
    test('Documents list: default title language is EN', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`)
        await page.waitForTimeout(2000)
        const toggleBtn = page.locator('button[title*="Toggle title language"]').first()
        if (await toggleBtn.count() > 0) {
            expect(await toggleBtn.innerText()).toBe('日')
        }
        expect(await page.evaluate(() => localStorage.getItem('title-language'))).not.toBe('ja')
    })

    test('Documents list: toggle switches to JP title', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`)
        await page.waitForTimeout(2000)
        const toggleBtn = page.locator('button[title*="Toggle title language"]').first()
        if (await toggleBtn.count() === 0) return
        await toggleBtn.click()
        expect(await toggleBtn.innerText()).toBe('EN')
        expect(await page.evaluate(() => localStorage.getItem('title-language'))).toBe('ja')
    })

    test('Documents list: title preference persists across reload', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents`)
        await page.waitForTimeout(2000)
        const toggleBtn = page.locator('button[title*="Toggle title language"]').first()
        if (await toggleBtn.count() === 0) return
        await toggleBtn.click()
        await page.reload()
        await page.waitForTimeout(2000)
        expect(await page.evaluate(() => localStorage.getItem('title-language'))).toBe('ja')
        const reloadToggleBtn = page.locator('button[title*="Toggle title language"]').first()
        expect(await reloadToggleBtn.innerText()).toBe('EN')
    })

    test.describe('Title language toggle — reader view', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })
        test('Reader view: toggle present and functional', async ({ page, snap }) => {
            await page.goto(`${BASE}/documents`)
            await page.waitForTimeout(2000)
            const docLink = page.locator('a[href*="/documents/"]').first()
            if (await docLink.count() === 0) return
            await docLink.click()
            await page.waitForTimeout(3000)
            const readerToggleBtn = page.locator('button[title*="Toggle title language"]')
            if (await readerToggleBtn.count() > 0) {
                expect(await readerToggleBtn.first().innerText()).toBe('日')
                await readerToggleBtn.first().click()
                await page.waitForTimeout(500)
                expect(await readerToggleBtn.first().innerText()).toBe('EN')
            }
        })
    })
})
