/**
 * tests/transitions-api.spec.ts
 *
 * Wave-2 FE Unit 1 BE half: live integration for the read-only
 * segment-phase-transitions endpoint.
 *
 * Cases:
 *  - 401 when unauthenticated
 *  - 404 when segment id is malformed (no UUID match)
 *  - 404 when segment id is well-formed but does not exist
 *  - 200 with an ordered array; uses the `translated` seed segments
 *    (4 exist in live DB after Wave-2 BE Unit 4 happy-paths). For at
 *    least one of these we may already have transition rows from
 *    advance-phase test runs; the array shape and ordering is what
 *    matters, not the count.
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

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

type Segment = {
    id: string
    status: string
    target_text: string | null
    article_id: string
}

async function findSegment(
    page: import('@playwright/test').Page,
    opts: { status?: string }
): Promise<Segment | null> {
    const params = new URLSearchParams()
    if (opts.status) params.set('status', opts.status)
    params.set('limit', '5')
    const res = await apiCall<{ segments: Segment[] }>(
        page,
        `/api/segments?${params.toString()}`
    )
    if (res.status !== 200) return null
    return res.body.segments?.[0] ?? null
}

test.describe('Transitions API', () => {
    test.describe('Authenticated as translator', () => {
        test.use({ storageState: 'tests/.auth/translator.json' })

        test('GET returns ordered array for an existing segment', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)
            // Prefer a translated segment (likely to have transition
            // rows from prior advance-phase runs); fall back to any.
            const segment =
                (await findSegment(page, { status: 'translated' })) ??
                (await findSegment(page, {}))
            test.skip(!segment, 'no segment available in live DB')
            if (!segment) return

            const res = await apiCall<{
                transitions: Array<{
                    id: string
                    segment_id: string
                    from_status: string
                    to_status: string
                    created_at: string
                }>
            }>(page, `/api/segments/${segment.id}/transitions`)
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body.transitions)).toBe(true)

            // If we have ≥2 rows, confirm desc ordering by created_at.
            const rows = res.body.transitions
            if (rows.length >= 2) {
                for (let i = 0; i < rows.length - 1; i++) {
                    expect(
                        new Date(rows[i].created_at).getTime()
                    ).toBeGreaterThanOrEqual(
                        new Date(rows[i + 1].created_at).getTime()
                    )
                }
            }
        })

        test('GET with malformed id returns 404', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/not-a-uuid/transitions`
            )
            expect(res.status).toBe(404)
        })

        test('GET with nonexistent uuid returns 404', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const fakeId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeId}/transitions`
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
                `/api/segments/${fakeId}/transitions`
            )
            expect(res.status).toBe(401)
        })
    })
})
