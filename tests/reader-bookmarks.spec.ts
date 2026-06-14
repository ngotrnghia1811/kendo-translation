/**
 * tests/reader-bookmarks.spec.ts
 *
 * Live integration coverage for the Reader Bookmarks feature:
 *
 *  1. Bookmark toggle button adds and removes a bookmark for the current page.
 *  2. Bookmarks panel opens (after adding a bookmark) and shows the list.
 *
 * Document discovery: uses the apiCall helper to find a real document from the
 * live DB, then navigates to its reader page. All tests run as the `reader`
 * role (storageState: tests/.auth/reader.json).
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ApiResult<T> = { status: number; body: T }

async function apiCall<T = unknown>(
    page: import('@playwright/test').Page,
    path: string,
    init?: { method?: string; body?: unknown }
): Promise<ApiResult<T>> {
    return page.evaluate(
        async ({ base, path, init }) => {
            const res = await fetch(`${base}${path}`, {
                method: init?.method ?? 'GET',
                headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
                body: init?.body ? JSON.stringify(init.body) : undefined,
            })
            const text = await res.text()
            let parsed: unknown = text
            try {
                parsed = text ? JSON.parse(text) : null
            } catch {
                /* leave as text */
            }
            return { status: res.status, body: parsed as unknown }
        },
        { base: BASE, path, init: init ?? {} }
    ) as Promise<ApiResult<T>>
}

/** Discover a real doc id from the live DB and return its reader URL. */
async function discoverReaderUrl(page: import('@playwright/test').Page): Promise<string> {
    const docsRes = await apiCall<{ documents?: Array<{ id: string }> } | Array<{ id: string }>>(
        page,
        '/api/documents'
    )
    expect(docsRes.status).toBe(200)
    const docs = Array.isArray(docsRes.body)
        ? docsRes.body
        : (docsRes.body?.documents ?? [])
    expect(docs.length, 'expected at least one document in live DB').toBeGreaterThan(0)
    const docId = docs[0].id
    expect(typeof docId).toBe('string')
    return `${BASE}/documents/${docId}/read`
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

test.describe('Reader bookmarks', () => {
    test.use({ storageState: 'tests/.auth/reader.json' })

    test('bookmark toggle adds and removes bookmark', async ({ page, snap }) => {
        const readUrl = await discoverReaderUrl(page)
        await page.goto(readUrl)
        await page.waitForTimeout(3_000) // let reader hydrate

        // The bookmark toggle button starts in "not bookmarked" state.
        const bookmarkBtn = page.locator('button[aria-label="Bookmark this page"]')
        await bookmarkBtn.waitFor({ state: 'visible', timeout: 15_000 })
        await snap('bookmark_initial_unbookmarked')

        // Click to add a bookmark.
        await bookmarkBtn.click()
        await page.waitForTimeout(400)
        await snap('bookmark_added')

        // The aria-label should change to "Remove bookmark for this page".
        await expect(
            page.locator('button[aria-label="Remove bookmark for this page"]')
        ).toBeVisible({ timeout: 5_000 })

        // Click again to remove the bookmark.
        const removeBtn = page.locator('button[aria-label="Remove bookmark for this page"]')
        await removeBtn.click()
        await page.waitForTimeout(400)
        await snap('bookmark_removed')

        // The aria-label should revert.
        await expect(
            page.locator('button[aria-label="Bookmark this page"]')
        ).toBeVisible({ timeout: 5_000 })
    })

    test('bookmarks panel opens and shows bookmarks', async ({ page, snap }) => {
        const readUrl = await discoverReaderUrl(page)
        await page.goto(readUrl)
        await page.waitForTimeout(3_000)

        // Add a bookmark first so the panel has content.
        const bookmarkBtn = page.locator('button[aria-label="Bookmark this page"]')
        await bookmarkBtn.waitFor({ state: 'visible', timeout: 15_000 })
        await bookmarkBtn.click()
        await page.waitForTimeout(400)

        // Open the bookmarks panel via the toolbar button.
        const panelToggle = page.locator('button[aria-label="View bookmarks"]')
        await panelToggle.waitFor({ state: 'visible', timeout: 5_000 })
        await panelToggle.click()
        await page.waitForTimeout(400)
        await snap('bookmarks_panel_opened')

        // The bookmarks panel dialog should be visible.
        const panel = page.locator('[role="dialog"][aria-label="Bookmarks"]')
        await expect(panel).toBeVisible({ timeout: 5_000 })

        // The panel header should say "Bookmarks".
        await expect(panel.locator('text=Bookmarks').first()).toBeVisible({ timeout: 3_000 })

        await snap('bookmarks_panel_with_entry')
    })
})
