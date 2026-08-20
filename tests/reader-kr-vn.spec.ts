import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'https://155-248-165-196.nip.io'
const HAYASHI_FULL_ID = '42f1851e-1d21-4bbf-966b-d1cfef54471d'

test.describe('Reader Language Support', () => {
    test.use({ storageState: 'tests/.auth/reader.json' })

    test('should support Korean and verify Vietnamese is not supported', async ({ page, snap }) => {
        await page.goto(`${BASE}/documents/${HAYASHI_FULL_ID}/read`)
        await snap('reader_initial_load')

        // 1. Check for Korean language selection
        const langSelector = page.locator('select')
        await expect(langSelector).toBeVisible({ timeout: 10000 })
        
        // Select Korean
        await langSelector.selectOption({ value: 'ko' })
        await snap('reader_selected_korean')
        
        // Verify Korean text: look for Hangul characters
        // The page might need a slight wait for the segment update.
        await page.waitForTimeout(2000)
        
        const pageContent = await page.textContent('body')
        // Regex for Hangul: [\uAC00-\uD7A3]
        expect(pageContent).toMatch(/[\uAC00-\uD7A3]/)
        await snap('reader_korean_content_visible')

        // 2. Check for Vietnamese language selection
        const options = await langSelector.evaluate((select: HTMLSelectElement) => 
            Array.from(select.options).map(o => o.value)
        )
        expect(options).not.toContain('vi')
        await snap('reader_vietnamese_not_in_selector')
    })
})
