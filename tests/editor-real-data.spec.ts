import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

test.use({ storageState: 'tests/.auth/translator.json' })

test.describe('Real-Data Editor Workflow', () => {
    test('Editor loads segments for Kendojidai 2010-07', async ({ page, snap }, testInfo) => {
        testInfo.setTimeout(180000); // 3 minutes
        const articleId = '567aa0d5-f576-03b1-9e88-cac41f7d3374'

        // NOTE: EditorClient.tsx loads segments via fetchAllSegments() (lib/pocketbase/fetch-all-segments.ts),
        // which talks directly to the PocketBase JS SDK client-side — it does NOT call
        // /api/documents/[id]/segments. Waiting for that network response would hang forever.
        // Wait on real rendered DOM content instead (a segment row, per SegmentListItem.tsx's
        // data-testid="segment-list-item").

        // Use the correct document edit URL
        const url = `${BASE}/documents/${articleId}/edit`
        console.log(`Navigating to: ${url}`)

        await page.goto(url)

        // Loading state should clear once fetchAllSegments() resolves
        await expect(page.locator('text=Loading editor…')).not.toBeVisible({ timeout: 60000 })

        // At least one real segment row should render
        await expect(page.locator('[data-testid="segment-list-item"]').first()).toBeVisible({ timeout: 60000 })

        await snap('editor_real_data_loaded')

        // Verify some content loaded
        const bodyText = await page.evaluate(() => document.body.innerText)
        expect(bodyText.trim().length).toBeGreaterThan(0)
        
        // Ensure it's not showing a loading state indefinitely
        expect(bodyText).not.toContain('Loading') 
        
        // Check for specific article content if possible
        await snap('editor_content_final')
    })
})
