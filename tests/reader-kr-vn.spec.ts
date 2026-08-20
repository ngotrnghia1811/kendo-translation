import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'
const HAYASHI_FULL_ID = '42f1851e-1d21-4bbf-966b-d1cfef54471d'

test.describe('Reader Language Support', () => {
    test.use({ storageState: 'tests/.auth/reader.json' })

    test('should support Korean and Vietnamese target languages', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents/${HAYASHI_FULL_ID}/read`)
        await snap('reader_initial_load')

        // 1. Check for Korean language selection
        const langSelector = page.locator('select').filter({ has: page.locator('option[value="ko"]') })
        await expect(langSelector).toBeVisible({ timeout: 10000 })
        
        // Select Korean
        await langSelector.selectOption({ value: 'ko' })
        await snap('reader_selected_korean')
        
        // Verify Korean text: look for Hangul characters
        // The page might need a slight wait for the segment update.
        await page.waitForTimeout(2000)
        
        let pageContent = await page.textContent('body')
        // Regex for Hangul: [\uAC00-\uD7A3]
        expect(pageContent).toMatch(/[\uAC00-\uD7A3]/)
        await snap('reader_korean_content_visible')

        // 2. Check for Vietnamese language selection
        const options = await langSelector.evaluate((select: HTMLSelectElement) => 
            Array.from(select.options).map(o => o.value)
        )
        expect(options).toContain('vi')

        // Select Vietnamese
        await langSelector.selectOption({ value: 'vi' })
        await snap('reader_selected_vietnamese')

        await page.waitForTimeout(2000)
        pageContent = await page.textContent('body')
        // Verify Vietnamese text
        expect(pageContent).toMatch(/Những|trải nghiệm|kendo/i)
        await snap('reader_vietnamese_content_visible')
    })
})
