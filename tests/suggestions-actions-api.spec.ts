/**
 * tests/suggestions-actions-api.spec.ts
 *
 * Wave-2 FE Unit 3 BE half: coverage for the PATCH transition path on
 * segment suggestions (accept / reject), which the new SuggestionPanel
 * relies on. The original suggestions-api.spec covered GET + POST; this
 * file covers status transitions and the server-stamped accepter_id /
 * accepted_at fields.
 *
 * Strategy:
 *   - Authenticate as admin so RLS (suggestions_update_own_or_accepter)
 *     accepts the PATCH regardless of who created the suggestion.
 *   - For each test, create a fresh pending suggestion as setup; this
 *     keeps the tests self-contained on a live DB without depending on
 *     residue from other runs.
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

type Segment = { id: string; status: string; article_id: string }

async function findSegment(
    page: import('@playwright/test').Page
): Promise<Segment | null> {
    const res = await apiCall<{ segments: Segment[] }>(
        page,
        `/api/segments?limit=5`
    )
    if (res.status !== 200) return null
    return res.body.segments?.[0] ?? null
}

async function createPendingSuggestion(
    page: import('@playwright/test').Page,
    segmentId: string
): Promise<string> {
    const proposed = `[suggestions-actions probe @ ${new Date().toISOString()}]`
    const res = await apiCall<{ id: string }>(
        page,
        `/api/segments/${segmentId}/suggestions`,
        {
            method: 'POST',
            body: { proposed_text: proposed, suggester_kind: 'human' },
        }
    )
    expect(res.status, 'create suggestion setup').toBe(201)
    return res.body.id
}

test.describe('Suggestion-actions API', () => {
    test.describe('Authenticated as admin', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('PATCH status=accepted stamps accepter_id + accepted_at', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)
            const segment = await findSegment(page)
            test.skip(!segment, 'no segment available')
            if (!segment) return

            const suggestionId = await createPendingSuggestion(
                page,
                segment.id
            )

            const res = await apiCall<{
                id: string
                status: string
                accepter_id: string | null
                accepted_at: string | null
            }>(
                page,
                `/api/segments/${segment.id}/suggestions/${suggestionId}`,
                { method: 'PATCH', body: { status: 'accepted' } }
            )
            expect(res.status).toBe(200)
            expect(res.body.status).toBe('accepted')
            expect(res.body.accepter_id).not.toBeNull()
            expect(res.body.accepted_at).not.toBeNull()
        })

        test('PATCH status=rejected leaves accepter_id null', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)
            const segment = await findSegment(page)
            test.skip(!segment, 'no segment available')
            if (!segment) return

            const suggestionId = await createPendingSuggestion(
                page,
                segment.id
            )

            const res = await apiCall<{
                id: string
                status: string
                accepter_id: string | null
                accepted_at: string | null
            }>(
                page,
                `/api/segments/${segment.id}/suggestions/${suggestionId}`,
                { method: 'PATCH', body: { status: 'rejected' } }
            )
            expect(res.status).toBe(200)
            expect(res.body.status).toBe('rejected')
            expect(res.body.accepter_id).toBeNull()
            expect(res.body.accepted_at).toBeNull()
        })
    })
})
