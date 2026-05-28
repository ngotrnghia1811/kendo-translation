/**
 * tests/agents-api.spec.ts
 *
 * Wave-2 BE Unit 5: live integration coverage for per-phase agent
 * suggestion endpoints (POST /api/agents/[phase]).
 *
 * Strategy:
 *  - Validation paths (400/401/422) run unconditionally against synthetic
 *    or seed segments without hitting the LLM.
 *  - Live happy-paths (translate, edit) call the real OpenRouter pool and
 *    SKIP if no key is configured (detected by hitting the endpoint with a
 *    valid request and seeing a 503 from the pool-empty branch).
 *
 * Side effects (acknowledged, matches Wave-2 BE policy):
 *  - Live happy-paths insert real `segment_suggestions` rows with
 *    `suggester_kind='agent'`. No cleanup.
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

type Segment = {
    id: string
    status: string
    target_text: string | null
    article_id: string
}

async function findSegment(
    page: import('@playwright/test').Page,
    opts: { status?: string; hasTargetText?: boolean }
): Promise<Segment | null> {
    const params = new URLSearchParams()
    if (opts.status) params.set('status', opts.status)
    if (opts.hasTargetText !== undefined)
        params.set('has_target_text', String(opts.hasTargetText))
    params.set('limit', '5')
    const res = await apiCall<{ segments: Segment[] }>(
        page,
        `/api/segments?${params.toString()}`
    )
    if (res.status !== 200) return null
    return res.body.segments?.[0] ?? null
}

test.describe('Agents API', () => {
    test.describe('Authenticated as translator (validation paths)', () => {
        test.use({ storageState: 'tests/.auth/translator.json' })

        test('bogus phase returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const fakeId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/agents/bogus`,
                { method: 'POST', body: { segment_id: fakeId } }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/phase/i)
        })

        test('missing/invalid segment_id returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)

            const noBody = await apiCall<{ error: string }>(
                page,
                `/api/agents/translate`,
                { method: 'POST', body: {} }
            )
            expect(noBody.status).toBe(400)
            expect(noBody.body.error).toMatch(/segment_id/)

            const badShape = await apiCall<{ error: string }>(
                page,
                `/api/agents/translate`,
                { method: 'POST', body: { segment_id: 'not-a-uuid' } }
            )
            expect(badShape.status).toBe(400)
            expect(badShape.body.error).toMatch(/segment_id/)
        })

        test("phase 'edit' on segment with empty target_text returns 422", async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)
            const segment = await findSegment(page, {
                status: 'draft',
                hasTargetText: false,
            })
            test.skip(!segment, 'no draft segment with empty target_text available')
            if (!segment) return

            const res = await apiCall<{ error: string }>(
                page,
                `/api/agents/edit`,
                { method: 'POST', body: { segment_id: segment.id } }
            )
            expect(res.status).toBe(422)
            expect(res.body.error).toMatch(/target_text/)
        })

        test('LIVE translate phase produces a pending agent suggestion (skip if pool empty)', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)
            const segment = await findSegment(page, {
                status: 'draft',
                hasTargetText: false,
            })
            test.skip(!segment, 'no draft segment available')
            if (!segment) return

            const res = await apiCall<{
                id: string
                segment_id: string
                suggester_kind: string
                status: string
                proposed_text: string
                error?: string
            }>(page, `/api/agents/translate`, {
                method: 'POST',
                body: { segment_id: segment.id },
            })

            if (res.status === 503) {
                test.skip(true, 'OpenRouter pool empty — live test skipped')
                return
            }
            expect(res.status, JSON.stringify(res.body)).toBe(201)
            expect(res.body.segment_id).toBe(segment.id)
            expect(res.body.suggester_kind).toBe('agent')
            expect(res.body.status).toBe('pending')
            expect(res.body.proposed_text.length).toBeGreaterThan(0)
        })

        test('LIVE edit phase produces a pending agent suggestion (skip if pool empty)', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)
            const segment = await findSegment(page, {
                status: 'translated',
                hasTargetText: true,
            })
            test.skip(!segment, 'no translated segment with target_text available')
            if (!segment) return

            const res = await apiCall<{
                id: string
                segment_id: string
                suggester_kind: string
                status: string
                proposed_text: string
                error?: string
            }>(page, `/api/agents/edit`, {
                method: 'POST',
                body: { segment_id: segment.id },
            })

            if (res.status === 503) {
                test.skip(true, 'OpenRouter pool empty — live test skipped')
                return
            }
            expect(res.status, JSON.stringify(res.body)).toBe(201)
            expect(res.body.segment_id).toBe(segment.id)
            expect(res.body.suggester_kind).toBe('agent')
            expect(res.body.status).toBe('pending')
            expect(res.body.proposed_text.length).toBeGreaterThan(0)
        })
    })

    test.describe('Unauthenticated', () => {
        test('POST without auth returns 401', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const fakeId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/agents/translate`,
                { method: 'POST', body: { segment_id: fakeId } }
            )
            expect(res.status).toBe(401)
            expect(res.body.error).toMatch(/Unauthorized/i)
        })
    })
})
