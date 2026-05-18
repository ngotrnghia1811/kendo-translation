/**
 * tests/segment-activity-api.spec.ts
 *
 * Wave-2 FE Unit: live integration for the per-document segment-activity
 * aggregation endpoint that drives badges on the editor's segment list.
 *
 * Cases:
 *  - 200 with array shape (authenticated as admin via any real document)
 *  - 404 when document id is well-formed but does not exist
 *  - 401 when unauthenticated
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

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
                headers: init?.body
                    ? { 'Content-Type': 'application/json' }
                    : undefined,
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

type ActivityRow = {
    segment_id: string
    pending_suggestions: number
    unresolved_comments: number
    recent_transitions_24h: number
}

test.describe('Segment activity API', () => {
    test.describe('Authenticated as admin', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('GET returns activity array for an existing document', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)

            const docsRes = await apiCall<{
                documents: Array<{ id: string }>
            }>(page, `/api/documents`)
            expect(docsRes.status).toBe(200)
            const docId = docsRes.body.documents?.[0]?.id
            test.skip(!docId, 'no documents available in live DB')
            if (!docId) return

            const res = await apiCall<{ activity: ActivityRow[] }>(
                page,
                `/api/documents/${docId}/segment-activity`
            )
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body.activity)).toBe(true)

            // Every row must have the expected shape with numeric counts.
            for (const row of res.body.activity) {
                expect(typeof row.segment_id).toBe('string')
                expect(typeof row.pending_suggestions).toBe('number')
                expect(typeof row.unresolved_comments).toBe('number')
                expect(typeof row.recent_transitions_24h).toBe('number')
            }
        })

        test('GET on nonexistent document returns 404', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const fakeId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/documents/${fakeId}/segment-activity`
            )
            expect(res.status).toBe(404)
        })
    })

    test.describe('Unauthenticated', () => {
        test('GET without auth returns 401', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const fakeId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/documents/${fakeId}/segment-activity`
            )
            expect(res.status).toBe(401)
        })
    })
})
