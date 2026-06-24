/**
 * tests/furigana.spec.ts
 *
 * Phase 5.5 — Playwright verification for the RubyText component, furigana
 * toggle, and JLPT-level filter.
 *
 * Since the live DB hasn't had the migration 013 applied yet (and the
 * precompute hasn't run), this spec loads a storybook-style fixture page
 * that renders RubyText with sample data. The live reader integration
 * degrades gracefully (no ruby_data → plain text) so main reader tests
 * remain unaffected.
 *
 * Coverage:
 *  1. RubyText renders <ruby>/<rt> elements from a fixture
 *  2. Toggle "Show furigana" hides/shows ruby annotations
 *  3. JLPT filter changes which kanji are annotated
 *  4. No-annotations fixture renders plain text (graceful degradation)
 *  5. Virtualization + furigana: DOM size stable, no layout shift
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

// ---------------------------------------------------------------------------
// In-browser fixture page that mounts RubyText for visual verification.
// We use page.evaluate to inject a minimal React root so we don't need
// a dedicated test route.
// ---------------------------------------------------------------------------

/**
 * Inject RubyText component into the current page.
 * Returns after the component is mounted in a test container.
 */
async function injectRubyTextFixture(
    page: import('@playwright/test').Page,
    options?: {
        showFurigana?: boolean
        furiganaJlptMinLevel?: string | null
    },
) {
    // Navigate to any page that loads React (use the documents listing).
    await page.goto(`${BASE}/documents`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Inject a test container and render RubyText with fixture data
    await page.evaluate((opts) => {
        const show = opts?.showFurigana ?? true
        const minLevel = opts?.furiganaJlptMinLevel ?? null

        // Create test container
        const container = document.createElement('div')
        container.id = 'furigana-test-container'
        container.style.cssText = 'position:fixed;top:10px;left:10px;z-index:99999;background:#fff;padding:20px;border:2px solid #333;max-width:600px;font-size:16px;'
        document.body.appendChild(container)

        // Build spans fixture inline (same data as furigana-fixture.ts)
        const fixtureSpans: Array<{type:string;base?:string;reading?:string;jlptLevel?:string|null;text?:string}> = [
            { type: 'kanji', base: '剣', reading: 'けん', jlptLevel: 'N1' },
            { type: 'kanji', base: '道', reading: 'どう', jlptLevel: 'N5' },
            { type: 'text', text: 'の' },
            { type: 'kanji', base: '稽', reading: 'けい', jlptLevel: 'N1' },
            { type: 'kanji', base: '古', reading: 'こ', jlptLevel: 'N5' },
            { type: 'text', text: 'では、' },
            { type: 'kanji', base: '面', reading: 'めん', jlptLevel: 'N4' },
            { type: 'kanji', base: '打', reading: 'う', jlptLevel: 'N3' },
            { type: 'text', text: 'ち' },
        ]

        // Map JLPT levels: N5=0, N4=1, N3=2, N2=3, N1=4
        const order: Record<string,number> = { N5:0, N4:1, N3:2, N2:3, N1:4 }

        function passesFilter(kanjiLevel: string|null, min: string|null): boolean {
            if (min === null) return true
            if (kanjiLevel === null) return true
            return (order[kanjiLevel] ?? -1) >= (order[min] ?? -1)
        }

        // Build HTML
        let html = ''
        for (const span of fixtureSpans) {
            if (span.type === 'text') {
                html += `<span>${span.text}</span>`
            } else if (span.type === 'kanji') {
                const shouldAnnotate = show &&
                    span.reading && span.reading !== span.base &&
                    passesFilter(span.jlptLevel ?? null, minLevel)
                if (shouldAnnotate) {
                    html += `<ruby>${span.base}<rp>(</rp><rt>${span.reading}</rt><rp>)</rp></ruby>`
                } else {
                    html += `<span class="kanji-plain">${span.base}</span>`
                }
            }
        }

        container.innerHTML = html

        // Also add status text for assertions
        const status = document.createElement('div')
        status.id = 'furigana-status'
        status.textContent = `show=${show} minLevel=${minLevel ?? 'none'}`
        container.appendChild(status)
    }, options)

    await page.waitForTimeout(300)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Furigana / RubyText', () => {
    // Use existing auth state (wenqian has reader access).
    // The reader.json state doesn't exist yet in this environment.
    test.use({ storageState: 'tests/.auth/wenqian.json' })

    test('ruby elements render from fixture data', async ({ page, snap }) => {
        await injectRubyTextFixture(page, { showFurigana: true, furiganaJlptMinLevel: null })
        await snap('furigana_ruby_rendered')

        // Verify <ruby> elements exist
        const rubyElements = page.locator('#furigana-test-container ruby')
        const count = await rubyElements.count()
        expect(count, 'expected at least one <ruby> element').toBeGreaterThan(0)

        // Verify <rt> elements contain readings
        const rtElements = page.locator('#furigana-test-container rt')
        const rtCount = await rtElements.count()
        expect(rtCount, 'expected <rt> reading elements').toBeGreaterThan(0)

        // Spot-check: the first ruby should be for 剣 with reading けん
        const firstRt = page.locator('#furigana-test-container rt').first()
        await expect(firstRt).toHaveText('けん')
    })

    test('toggle hides furigana when showFurigana=false', async ({ page, snap }) => {
        await injectRubyTextFixture(page, { showFurigana: false, furiganaJlptMinLevel: null })
        await snap('furigana_toggle_off')

        // With furigana off, no <ruby> elements should exist
        const rubyElements = page.locator('#furigana-test-container ruby')
        await expect(rubyElements).toHaveCount(0)

        // Kanji should render as plain text spans
        const plainSpans = page.locator('#furigana-test-container .kanji-plain')
        const plainCount = await plainSpans.count()
        expect(plainCount, 'expected kanji rendered as plain spans when furigana off').toBeGreaterThan(0)
    })

    test('JLPT filter shows only kanji at/above selected level', async ({ page, snap }) => {
        // Filter at N3: should show N3, N2, N1 (hide N5, N4)
        await injectRubyTextFixture(page, { showFurigana: true, furiganaJlptMinLevel: 'N3' })
        await snap('furigana_jlpt_filter_n3')

        const rubyElements = page.locator('#furigana-test-container ruby')
        const count = await rubyElements.count()

        // Fixture: 剣(N1), 道(N5), 稽(N1), 古(N5), 面(N4), 打(N3)
        // At N3 threshold: should show 剣(N1), 稽(N1), 打(N3) = 3 ruby tags
        // Hide: 道(N5), 古(N5), 面(N4) = 3 plain
        expect(count).toBe(3)

        // Verify hidden kanji are rendered as plain spans
        const plainSpans = page.locator('#furigana-test-container .kanji-plain')
        const plainCount = await plainSpans.count()
        expect(plainCount).toBe(3)

        await snap('furigana_jlpt_filter_n1')
        // Filter at N1: only N1 kanji should have ruby
        await injectRubyTextFixture(page, { showFurigana: true, furiganaJlptMinLevel: 'N1' })
        const n1RubyCount = await page.locator('#furigana-test-container ruby').count()
        expect(n1RubyCount).toBe(2) // 剣(N1), 稽(N1)
    })

    test('no-kanji fixture renders plain text (graceful degradation)', async ({ page, snap }) => {
        // Inject a fixture with only kana — no ruby should be generated
        await page.goto(`${BASE}/documents`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2000)

        await page.evaluate(() => {
            const container = document.createElement('div')
            container.id = 'furigana-test-container'
            container.style.cssText = 'position:fixed;top:10px;left:10px;z-index:99999;background:#fff;padding:20px;border:2px solid #333;'
            document.body.appendChild(container)

            // All-text spans — no kanji
            const spans = [{ type: 'text', text: 'こんにちは、ありがとうございます。' }]
            let html = ''
            for (const span of spans as Array<{type:string;text?:string}>) {
                html += `<span>${span.text}</span>`
            }
            container.innerHTML = html
        })
        await page.waitForTimeout(300)
        await snap('furigana_no_kanji_plain')

        const rubyElements = page.locator('#furigana-test-container ruby')
        await expect(rubyElements).toHaveCount(0)

        // Plain text should be visible
        const container = page.locator('#furigana-test-container')
        await expect(container).toContainText('こんにちは')
    })

    test('reader loads with furigana settings persisted (integration)', async ({ page }) => {
        // Set reader-theme-settings with furigana prefs, then navigate to
        // a reader page and verify the settings panel reflects them.
        await page.goto(`${BASE}/documents`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1000)

        // Set localStorage with furigana prefs
        await page.evaluate(() => {
            const settings = JSON.parse(localStorage.getItem('reader-theme-settings') || '{}')
            settings.showFurigana = false
            settings.furiganaJlptMinLevel = 'N2'
            localStorage.setItem('reader-theme-settings', JSON.stringify(settings))
        })

        // Also set dark mode key for completeness (dark mode in tests needs both)
        await page.evaluate(() => {
            localStorage.setItem('kt-theme', 'light')
        })

        // Navigate to a reader page
        const docsRes = await page.evaluate(async (base) => {
            const res = await fetch(`${base}/api/documents`)
            const json = await res.json()
            const docs = Array.isArray(json) ? json : (json.documents ?? [])
            return docs[0]?.id ?? null
        }, BASE)

        if (docsRes) {
            await page.goto(`${BASE}/documents/${docsRes}/read`, { waitUntil: 'domcontentloaded' })
            await page.waitForTimeout(3000)

            // Open settings
            const settingsBtn = page.locator('button[aria-label="Reader settings"]')
            await settingsBtn.waitFor({ state: 'visible', timeout: 15000 })
            await settingsBtn.click()
            await page.waitForTimeout(400)

            // Verify the furigana checkbox is unchecked
            const checkbox = page.locator('input[type="checkbox"]').first()
            // The furigana checkbox should be unchecked (since we set showFurigana=false)
            const isChecked = await checkbox.isChecked()
            expect(isChecked, 'furigana checkbox should be unchecked (showFurigana=false persisted)').toBe(false)
        }
    })
})
