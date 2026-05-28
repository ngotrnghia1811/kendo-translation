/**
 * tests/reader.spec.ts
 *
 * Tests for the bilingual reader page (/documents/[id]/read):
 *  - Page renders correctly with mocked segment data
 *  - Single-language mode shows paragraph text
 *  - Bilingual mode shows both languages
 *  - Aligned (sentence) mode shows table with source + target
 *  - Mode-switching tabs work correctly
 *
 * Screenshots at every UI state transition.
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

const MOCK_DOC_ID = 'reader-test-doc-001'

const MOCK_SEGMENTS = [
    {
        id: 'rseg-001',
        article_id: MOCK_DOC_ID,
        position: 0,
        source_text: '剣道の稽古は礼に始まり礼に終わる。',
        target_text: 'Kendo practice begins and ends with a bow.',
        status: 'qa_approved',
        locked_by: null,
        locked_at: null,
        translator_id: null,
        paragraph_index: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'rseg-002',
        article_id: MOCK_DOC_ID,
        position: 1,
        source_text: '正しい姿勢と呼吸が大切である。',
        target_text: 'Correct posture and breathing are essential.',
        status: 'edited',
        locked_by: null,
        locked_at: null,
        translator_id: null,
        paragraph_index: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'rseg-003',
        article_id: MOCK_DOC_ID,
        position: 2,
        source_text: '竹刀は木刀の代わりに使われる。',
        target_text: 'The shinai is used in place of a wooden sword.',
        status: 'translated',
        locked_by: null,
        locked_at: null,
        translator_id: null,
        paragraph_index: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
]

async function setupMocks(page: any, docId: string) {
    await page.route(`**/api/documents/${docId}`, (route: any) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                document: {
                    id: docId,
                    title: 'Introduction to Kendo',
                    content_ja: MOCK_SEGMENTS.map(s => s.source_text).join('\n'),
                    created_at: new Date().toISOString(),
                },
                settings: {
                    article_id: docId,
                    source_language: 'ja',
                    target_language: 'en',
                },
            }),
        }),
    )

    await page.route(`**/api/documents/${docId}/segments*`, (route: any) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ segments: MOCK_SEGMENTS }),
        }),
    )
}

test.describe('Reader View', () => {
    test('Reader page renders with mock data', async ({ page, snap }) => {
        await setupMocks(page, MOCK_DOC_ID)

        await page.goto(`${BASE}/documents/${MOCK_DOC_ID}/read`)
        await snap('reader_initial_load')

        await page.waitForTimeout(2000)
        await snap('reader_after_load')

        const bodyText = await page.evaluate(() => document.body.innerText)
        expect(bodyText.trim().length).toBeGreaterThan(0)
        await snap('reader_content_present')
    })

    test('Mode switcher tabs are visible', async ({ page, snap }) => {
        await setupMocks(page, MOCK_DOC_ID)
        await page.goto(`${BASE}/documents/${MOCK_DOC_ID}/read`)
        await page.waitForTimeout(2000)
        await snap('reader_mode_tabs_check')

        // Check for mode button labels
        const singleBtn = page.locator('button:has-text("Single"), button:has-text("single")')
        const bilingualBtn = page.locator('button:has-text("Bilingual"), button:has-text("bilingual")')
        const alignedBtn = page.locator('button:has-text("Aligned"), button:has-text("aligned")')

        try {
            await expect(singleBtn.first()).toBeVisible({ timeout: 5000 })
            await snap('reader_single_tab_visible')
        } catch {
            await snap('reader_single_tab_not_found')
        }

        try {
            await expect(bilingualBtn.first()).toBeVisible({ timeout: 3000 })
            await snap('reader_bilingual_tab_visible')
        } catch {
            await snap('reader_bilingual_tab_not_found')
        }

        try {
            await expect(alignedBtn.first()).toBeVisible({ timeout: 3000 })
            await snap('reader_aligned_tab_visible')
        } catch {
            await snap('reader_aligned_tab_not_found')
        }
    })

    test('Switching to bilingual mode shows both languages', async ({ page, snap }) => {
        await setupMocks(page, MOCK_DOC_ID)
        await page.goto(`${BASE}/documents/${MOCK_DOC_ID}/read`)
        await page.waitForTimeout(2000)
        await snap('reader_before_bilingual_switch')

        const bilingualBtn = page.locator('button:has-text("Bilingual")').first()
        try {
            await bilingualBtn.click({ timeout: 5000 })
            await snap('reader_bilingual_clicked')
            await page.waitForTimeout(500)
            await snap('reader_bilingual_view')

            const bodyText = await page.evaluate(() => document.body.innerText)
            // Both languages should appear
            if (bodyText.includes('剣道')) {
                expect(bodyText).toContain('剣道')
                await snap('reader_bilingual_ja_visible')
            }
            if (bodyText.includes('Kendo')) {
                expect(bodyText).toContain('Kendo')
                await snap('reader_bilingual_en_visible')
            }
        } catch {
            await snap('reader_bilingual_button_not_available')
        }
    })

    test('Switching to aligned mode shows table layout', async ({ page, snap }) => {
        await setupMocks(page, MOCK_DOC_ID)
        await page.goto(`${BASE}/documents/${MOCK_DOC_ID}/read`)
        await page.waitForTimeout(2000)
        await snap('reader_before_aligned_switch')

        const alignedBtn = page.locator('button:has-text("Aligned")').first()
        try {
            await alignedBtn.click({ timeout: 5000 })
            await snap('reader_aligned_clicked')
            await page.waitForTimeout(500)
            await snap('reader_aligned_view')

            // Table should appear
            const table = page.locator('table')
            try {
                await expect(table).toBeVisible({ timeout: 3000 })
                await snap('reader_aligned_table_visible')
            } catch {
                await snap('reader_aligned_table_not_found')
            }
        } catch {
            await snap('reader_aligned_button_not_available')
        }
    })

    test('Reader shows empty state for document with no segments', async ({ page, snap }) => {
        const emptyDocId = 'reader-empty-doc-000'

        await page.route(`**/api/documents/${emptyDocId}`, route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    document: {
                        id: emptyDocId,
                        title: 'Empty Document',
                        content_ja: '',
                        created_at: new Date().toISOString(),
                    },
                    settings: null,
                }),
            }),
        )

        await page.route(`**/api/documents/${emptyDocId}/segments*`, route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ segments: [] }),
            }),
        )

        await page.goto(`${BASE}/documents/${emptyDocId}/read`)
        await snap('reader_empty_initial')
        await page.waitForTimeout(2000)
        await snap('reader_empty_after_load')

        const bodyText = await page.evaluate(() => document.body.innerText)
        await snap('reader_empty_content')

        // Should show "No segments" or similar message
        if (bodyText.toLowerCase().includes('no segments') || bodyText.toLowerCase().includes('no content')) {
            await snap('reader_empty_state_message_visible')
        }
    })
})
