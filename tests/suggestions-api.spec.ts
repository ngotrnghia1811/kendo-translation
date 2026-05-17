/**
 * tests/suggestions-api.spec.ts
 *
 * Wave-2 BE Unit 1: live integration coverage for the Suggestions API
 * (/api/segments/[id]/suggestions and .../[suggestionId]).
 *
 * Strategy:
 *  - Authenticate as the translator role (storageState injected via the
 *    camoufox fixture honouring test.use).
 *  - Discover a real document → real segment via the existing read APIs
 *    so this test exercises the whole stack (RLS + route + DB) end-to-
 *    end against the live Supabase project, matching the integration
 *    style chosen for Wave 2.
 *  - POST a pending suggestion, list it, PATCH it to 'rejected'
 *    (status='accepted' is intentionally avoided so we never leave a
 *    row that would mislead the cooperation workflow), then re-list to
 *    confirm the state transition.
 *
 * Acknowledged side-effect: each run leaves a `segment_suggestions` row
 * in the live DB with status='rejected'. This is consistent with the
 * "live integration, accept side-effects" decision recorded for the
 * Wave-2 BE unit; cleanup is out of scope for this commit.
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

test.describe('Suggestions API', () => {
    test.describe('Authenticated as translator', () => {
        test.use({ storageState: 'tests/.auth/translator.json' })

        test('POST creates a pending suggestion, PATCH transitions to rejected', async ({
            page,
            snap,
        }) => {
            // Anchor a page so subsequent fetch() calls in page.evaluate
            // pick up the auth cookies from storageState. We use `/` (a
            // tiny page) rather than `/documents` so the snap fullPage
            // screenshots stay under the 32767 px browser limit when the
            // live DB has hundreds of documents.
            await page.goto(`${BASE}/`)

            // 1. Discover a real document.
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

            // 2. Discover a real segment for that document.
            const segRes = await apiCall<{ segments?: Array<{ id: string }> } | Array<{ id: string }>>(
                page,
                `/api/documents/${docId}/segments`
            )
            expect(segRes.status).toBe(200)
            const segments = Array.isArray(segRes.body)
                ? segRes.body
                : (segRes.body?.segments ?? [])
            expect(segments.length, 'expected at least one segment for the discovered document').toBeGreaterThan(0)
            const segmentId = segments[0].id
            expect(typeof segmentId).toBe('string')
            await snap('suggestions_api_segment_discovered')

            // 3. POST a new suggestion.
            const proposedText = `wave-2 suggestion probe @ ${new Date().toISOString()}`
            const createRes = await apiCall<{
                id: string
                segment_id: string
                proposed_text: string
                status: string
                suggester_kind: string
            }>(page, `/api/segments/${segmentId}/suggestions`, {
                method: 'POST',
                body: { proposed_text: proposedText },
            })
            expect(createRes.status).toBe(201)
            expect(createRes.body.segment_id).toBe(segmentId)
            expect(createRes.body.proposed_text).toBe(proposedText)
            expect(createRes.body.status).toBe('pending')
            expect(createRes.body.suggester_kind).toBe('human')
            const suggestionId = createRes.body.id
            await snap('suggestions_api_created')

            // 4. GET list — the new suggestion should be present.
            const listRes = await apiCall<{ suggestions: Array<{ id: string; status: string }> }>(
                page,
                `/api/segments/${segmentId}/suggestions`
            )
            expect(listRes.status).toBe(200)
            const found = listRes.body.suggestions.find((s) => s.id === suggestionId)
            expect(found, 'newly created suggestion should appear in list').toBeTruthy()
            expect(found!.status).toBe('pending')

            // 5. PATCH to rejected. (Accept path is deliberately not
            //    exercised here to avoid polluting the workflow.)
            const patchRes = await apiCall<{ id: string; status: string; accepter_id: string | null }>(
                page,
                `/api/segments/${segmentId}/suggestions/${suggestionId}`,
                { method: 'PATCH', body: { status: 'rejected' } }
            )
            expect(patchRes.status).toBe(200)
            expect(patchRes.body.id).toBe(suggestionId)
            expect(patchRes.body.status).toBe('rejected')
            expect(patchRes.body.accepter_id).toBeNull()
            await snap('suggestions_api_rejected')

            // 6. Re-list — the suggestion should now show rejected.
            const listAfter = await apiCall<{ suggestions: Array<{ id: string; status: string }> }>(
                page,
                `/api/segments/${segmentId}/suggestions`
            )
            expect(listAfter.status).toBe(200)
            const foundAfter = listAfter.body.suggestions.find((s) => s.id === suggestionId)
            expect(foundAfter).toBeTruthy()
            expect(foundAfter!.status).toBe('rejected')
        })

        test('POST rejects empty proposed_text with 400', async ({ page }) => {
            await page.goto(`${BASE}/`)

            // Use any segment id; validation happens before the DB read,
            // so a syntactically valid UUID-shaped string is enough — but
            // to keep this self-contained we discover a real one.
            const docsRes = await apiCall<{ documents?: Array<{ id: string }> } | Array<{ id: string }>>(
                page,
                '/api/documents'
            )
            const docs = Array.isArray(docsRes.body)
                ? docsRes.body
                : (docsRes.body?.documents ?? [])
            expect(docs.length).toBeGreaterThan(0)
            const segRes = await apiCall<{ segments?: Array<{ id: string }> } | Array<{ id: string }>>(
                page,
                `/api/documents/${docs[0].id}/segments`
            )
            const segments = Array.isArray(segRes.body)
                ? segRes.body
                : (segRes.body?.segments ?? [])
            expect(segments.length).toBeGreaterThan(0)
            const segmentId = segments[0].id

            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${segmentId}/suggestions`,
                { method: 'POST', body: { proposed_text: '   ' } }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/proposed_text/)
        })

        test('PATCH with invalid status returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)

            // Any UUID-shaped id is fine for the validation check; we
            // never reach the DB.
            const fakeSegmentId = '00000000-0000-0000-0000-000000000000'
            const fakeSuggestionId = '00000000-0000-0000-0000-000000000001'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeSegmentId}/suggestions/${fakeSuggestionId}`,
                { method: 'PATCH', body: { status: 'bogus' } }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/status/)
        })
    })

    test.describe('Unauthenticated', () => {
        test('POST without auth returns 401', async ({ page }) => {
            // No storageState in this describe → unauthenticated context.
            await page.goto(`${BASE}/`)
            const fakeSegmentId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeSegmentId}/suggestions`,
                { method: 'POST', body: { proposed_text: 'hello' } }
            )
            expect(res.status).toBe(401)
            expect(res.body.error).toMatch(/Unauthorized/i)
        })
    })
})
