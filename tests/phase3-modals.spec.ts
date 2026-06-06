/**
 * tests/phase3-modals.spec.ts
 *
 * Integration coverage for the Phase-3 triage modals API contract:
 *   EditPatternModal  — PATCH with edit_pattern  payload
 *   StyleRuleModal    — PATCH with style_rule    payload
 *
 * Strategy:
 *   - Authenticate as translator (storageState: tests/.auth/translator.json).
 *   - Discover a real segment via /api/segments?limit=5.
 *   - POST a fresh pending suggestion per sub-test.
 *   - PATCH the suggestion with { status: 'accepted', edit_pattern / style_rule }
 *     to exercise the PATCH route + phase-4b writeback.
 *   - Verify that both full-modal payloads (Save) and empty/missing payloads
 *     (Skip) return 200 with status='accepted'.
 *   - Confirm the route is lenient (no server-side edit_pattern shape validation,
 *     no hard-reject on incomplete style_rule).
 *
 * Side-effects: leaves accepted suggestion rows in the live DB per run.
 * Consistent with the Wave-2 "live integration, accept side-effects" decision.
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

type Segment = { id: string }

async function findSegment(page: import('@playwright/test').Page): Promise<Segment | null> {
    const res = await apiCall<{ segments: Segment[] }>(page, '/api/segments?limit=5')
    if (res.status !== 200) return null
    return res.body.segments?.[0] ?? null
}

async function createPendingSuggestion(
    page: import('@playwright/test').Page,
    segmentId: string
): Promise<string> {
    const proposed = `phase3-modal probe @ ${new Date().toISOString()}`
    const res = await apiCall<{ id: string }>(
        page,
        `/api/segments/${segmentId}/suggestions`,
        { method: 'POST', body: { proposed_text: proposed } }
    )
    expect(res.status, 'create suggestion for test').toBe(201)
    return res.body.id
}

test.describe('Phase-3 Triage Modals API', () => {
    test.describe('Authenticated as translator', () => {
        test.use({ storageState: 'tests/.auth/translator.json' })

        // -----------------------------------------------------------------
        // Test 1 — EditPatternModal API path (translated phase)
        // -----------------------------------------------------------------
        test('EditPatternModal: accept with edit_pattern (save) and without (skip)', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)

            const segment = await findSegment(page)
            test.skip(!segment, 'no segment available')
            if (!segment) return

            // --- save path: full edit_pattern payload ---
            const saveId = await createPendingSuggestion(page, segment.id)
            const saveRes = await apiCall<{ id: string; status: string }>(
                page,
                `/api/segments/${segment.id}/suggestions/${saveId}`,
                {
                    method: 'PATCH',
                    body: {
                        status: 'accepted',
                        edit_pattern: {
                            before_phrase: 'old phrase',
                            after_phrase: 'new phrase',
                            rationale: 'test rationale',
                        },
                    },
                }
            )
            expect(saveRes.status).toBe(200)
            expect(saveRes.body.id).toBe(saveId)
            expect(saveRes.body.status).toBe('accepted')

            // --- skip path: no edit_pattern ---
            const skipId = await createPendingSuggestion(page, segment.id)
            const skipRes = await apiCall<{ id: string; status: string }>(
                page,
                `/api/segments/${segment.id}/suggestions/${skipId}`,
                { method: 'PATCH', body: { status: 'accepted' } }
            )
            expect(skipRes.status).toBe(200)
            expect(skipRes.body.id).toBe(skipId)
            expect(skipRes.body.status).toBe('accepted')
        })

        // -----------------------------------------------------------------
        // Test 2 — StyleRuleModal API path (edited phase)
        // -----------------------------------------------------------------
        test('StyleRuleModal: accept with style_rule (save) and without (skip)', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)

            const segment = await findSegment(page)
            test.skip(!segment, 'no segment available')
            if (!segment) return

            // --- save path: full style_rule payload ---
            const saveId = await createPendingSuggestion(page, segment.id)
            const saveRes = await apiCall<{ id: string; status: string }>(
                page,
                `/api/segments/${segment.id}/suggestions/${saveId}`,
                {
                    method: 'PATCH',
                    body: {
                        status: 'accepted',
                        style_rule: {
                            scope: 'global',
                            rule_category: 'Punctuation',
                            pattern: 'use em-dash',
                            policy: 'must',
                        },
                    },
                }
            )
            expect(saveRes.status).toBe(200)
            expect(saveRes.body.id).toBe(saveId)
            expect(saveRes.body.status).toBe('accepted')

            // --- skip path: no style_rule ---
            const skipId = await createPendingSuggestion(page, segment.id)
            const skipRes = await apiCall<{ id: string; status: string }>(
                page,
                `/api/segments/${segment.id}/suggestions/${skipId}`,
                { method: 'PATCH', body: { status: 'accepted' } }
            )
            expect(skipRes.status).toBe(200)
            expect(skipRes.body.id).toBe(skipId)
            expect(skipRes.body.status).toBe('accepted')
        })

        // -----------------------------------------------------------------
        // Test 3 — edit_pattern validation (route is lenient)
        // -----------------------------------------------------------------
        test('edit_pattern validation: route accepts empty after_phrase', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)

            const segment = await findSegment(page)
            test.skip(!segment, 'no segment available')
            if (!segment) return

            const suggestionId = await createPendingSuggestion(page, segment.id)

            const res = await apiCall<{ id: string; status: string }>(
                page,
                `/api/segments/${segment.id}/suggestions/${suggestionId}`,
                {
                    method: 'PATCH',
                    body: {
                        status: 'accepted',
                        edit_pattern: {
                            before_phrase: 'only before',
                            after_phrase: '',
                        },
                    },
                }
            )
            // Client-side modal enforces both-or-neither rule;
            // the route is lenient and accepts any edit_pattern shape.
            expect(res.status).toBe(200)
            expect(res.body.status).toBe('accepted')
        })

        // -----------------------------------------------------------------
        // Test 4 — style_rule missing required fields
        // -----------------------------------------------------------------
        test('style_rule missing required fields: accept still succeeds', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)

            const segment = await findSegment(page)
            test.skip(!segment, 'no segment available')
            if (!segment) return

            const suggestionId = await createPendingSuggestion(page, segment.id)

            const res = await apiCall<{ id: string; status: string }>(
                page,
                `/api/segments/${segment.id}/suggestions/${suggestionId}`,
                {
                    method: 'PATCH',
                    body: {
                        status: 'accepted',
                        style_rule: { scope: 'global' },
                    },
                }
            )
            // Route skips the phase-4b style RPC when rule_category/pattern/policy
            // are missing, but the accept itself still succeeds.
            expect(res.status).toBe(200)
            expect(res.body.status).toBe('accepted')
        })
    })
})
