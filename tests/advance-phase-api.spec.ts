/**
 * tests/advance-phase-api.spec.ts
 *
 * Wave-2 BE Unit 4: live integration coverage for the advance-phase API
 * (POST /api/segments/[id]/advance-phase).
 *
 * Strategy:
 *  - Happy-path uses the **admin** storageState because the phase-assigned
 *    RLS policy (`segments_update_phase_assigned`) would otherwise reject
 *    writes from a translator who has no `document_assignments` row for
 *    the chosen document. Admin bypasses via `is_admin()`.
 *  - Validation-only tests (illegal transition, empty target_text, wrong
 *    expected_current_status, missing note type) authenticate as
 *    translator and target a segment we never intend to mutate — the
 *    400/409 paths return before any RLS-gated write occurs.
 *  - Unauthenticated test uses a stateless context.
 *
 * Acknowledged side-effect (matches Wave-2 BE policy): the happy-path
 * test advances one real `draft` segment to `translated` and writes a
 * `segment_phase_transitions` row. With 85 draft segments seeded in the
 * live DB this is sustainable for many test runs; cleanup is out of
 * scope for this commit.
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

/**
 * Fetch a single segment matching the given filter via the cross-doc
 * discovery endpoint introduced in Wave-2 BE Unit 4 support. Returns
 * null if none exist.
 */
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
    const list = res.body.segments ?? []
    return list[0] ?? null
}

test.describe('Advance-phase API', () => {
    test.describe('Authenticated as admin (happy path bypasses phase RLS)', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('POST advances draft → translated, writes transition row', async ({
            page,
            snap,
        }) => {
            await page.goto(`${BASE}/`)

            // 1. Find ANY draft segment. Seed data has 85 draft segments
            //    all with empty target_text, so we will seed the
            //    target_text ourselves below.
            const segment = await findSegment(page, {
                status: 'draft',
                hasTargetText: false,
            })
            test.skip(!segment, 'no draft segment available in live DB')
            if (!segment) return

            // 2. Seed target_text on the chosen segment as admin. This
            //    creates the precondition the advance endpoint requires
            //    for moving past draft. Admin storage state bypasses the
            //    phase-assignment RLS policy via is_admin().
            const seedText = `[wave-2 advance probe seed @ ${new Date().toISOString()}]`
            const seedRes = await apiCall<{ id: string; target_text: string | null }>(
                page,
                `/api/segments/${segment.id}`,
                { method: 'PATCH', body: { target_text: seedText } }
            )
            expect(seedRes.status, 'seed PATCH should succeed').toBe(200)
            await snap('advance_phase_target_chosen')

            // 2. Advance draft → translated with a note.
            const noteText = `wave-2 advance probe @ ${new Date().toISOString()}`
            const advanceRes = await apiCall<{
                segment: { id: string; status: string }
                transition: {
                    id: string
                    segment_id: string
                    from_status: string
                    to_status: string
                    actor_id: string
                    note: string | null
                }
            }>(page, `/api/segments/${segment.id}/advance-phase`, {
                method: 'POST',
                body: {
                    to_status: 'translated',
                    expected_current_status: 'draft',
                    note: noteText,
                },
            })
            expect(advanceRes.status).toBe(200)
            expect(advanceRes.body.segment.id).toBe(segment.id)
            expect(advanceRes.body.segment.status).toBe('translated')
            expect(advanceRes.body.transition.segment_id).toBe(segment.id)
            expect(advanceRes.body.transition.from_status).toBe('draft')
            expect(advanceRes.body.transition.to_status).toBe('translated')
            expect(advanceRes.body.transition.note).toBe(noteText)
            await snap('advance_phase_success')

            // 3. Second call with the same expected_current_status='draft'
            //    must now 409 because the row has moved forward.
            const staleRes = await apiCall<{ error: string; current_status: string }>(
                page,
                `/api/segments/${segment.id}/advance-phase`,
                {
                    method: 'POST',
                    body: {
                        to_status: 'translated',
                        expected_current_status: 'draft',
                    },
                }
            )
            expect(staleRes.status).toBe(409)
            expect(staleRes.body.current_status).toBe('translated')
        })
    })

    test.describe('Authenticated as translator (validation paths)', () => {
        test.use({ storageState: 'tests/.auth/translator.json' })

        test('illegal transition (draft → edited) returns 400 without DB write', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)
            const segment = await findSegment(page, { status: 'draft' })
            test.skip(!segment, 'no draft segment available')
            if (!segment) return

            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${segment.id}/advance-phase`,
                {
                    method: 'POST',
                    body: {
                        to_status: 'edited',
                        expected_current_status: 'draft',
                    },
                }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/Illegal transition/i)
        })

        test('empty target_text + to_status=translated returns 400', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)
            // Find a draft with empty/null target_text.
            const segment = await findSegment(page, {
                status: 'draft',
                hasTargetText: false,
            })
            test.skip(
                !segment,
                'no draft segment with empty target_text available in live DB'
            )
            if (!segment) return

            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${segment.id}/advance-phase`,
                {
                    method: 'POST',
                    body: {
                        to_status: 'translated',
                        expected_current_status: 'draft',
                    },
                }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/target_text/)
        })

        test('wrong expected_current_status returns 409 with actual status', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)
            // Use a translated segment (4 of these exist in seed data, all
            // with content). Claim it's 'edited' so we reach the 409 path
            // (edited→proofread is a legal transition; the segment is
            // actually 'translated').
            const segment = await findSegment(page, { status: 'translated' })
            test.skip(!segment, 'no translated segment available')
            if (!segment) return

            const res = await apiCall<{ error: string; current_status: string }>(
                page,
                `/api/segments/${segment.id}/advance-phase`,
                {
                    method: 'POST',
                    body: {
                        to_status: 'proofread',
                        expected_current_status: 'edited',
                    },
                }
            )
            expect(res.status).toBe(409)
            expect(res.body.current_status).toBe('translated')
        })

        test('invalid to_status returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const fakeId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeId}/advance-phase`,
                {
                    method: 'POST',
                    body: {
                        to_status: 'bogus',
                        expected_current_status: 'draft',
                    },
                }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/to_status/)
        })
    })

    test.describe('Unauthenticated', () => {
        test('POST without auth returns 401', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const fakeId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeId}/advance-phase`,
                {
                    method: 'POST',
                    body: {
                        to_status: 'translated',
                        expected_current_status: 'draft',
                    },
                }
            )
            expect(res.status).toBe(401)
            expect(res.body.error).toMatch(/Unauthorized/i)
        })
    })
})
