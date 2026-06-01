/**
 * tests/qa-issues-api.spec.ts
 *
 * Integration coverage for the QA-issues API surface:
 *   GET  /api/segments/[id]/qa-issues
 *   POST /api/segments/[id]/qa-issues
 *   PATCH /api/segments/[id]/qa-issues/[issueId]
 *
 * Strategy:
 *   - Authenticate as admin (has all permissions).
 *   - Discover a real document → segment.
 *   - POST a qa_issue, GET it, PATCH it resolved, re-GET to confirm.
 *   - Verify cooperation invariant: POST with author_kind='agent' is rejected.
 *
 * Side-effects: leaves a qa_issues row with resolved=true in the live DB
 * per run.  Consistent with the Wave-2 "live integration, accept side-effects"
 * decision.
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

test.describe('QA Issues API', () => {
    test.describe('Authenticated as admin', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('POST creates a qa_issue, GET lists it, PATCH resolves it', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)

            // 1. Discover a real document + segment.
            const docsRes = await apiCall<Array<{ id: string }>>(page, '/api/documents')
            expect(docsRes.status).toBe(200)
            const docs = Array.isArray(docsRes.body) ? docsRes.body : []
            expect(docs.length, 'expected at least one document').toBeGreaterThan(0)

            const segRes = await apiCall<Array<{ id: string }>>(
                page,
                `/api/documents/${docs[0].id}/segments`
            )
            expect(segRes.status).toBe(200)
            const segments = Array.isArray(segRes.body) ? segRes.body : []
            expect(segments.length, 'expected at least one segment').toBeGreaterThan(0)
            const segmentId = segments[0].id

            // 2. POST a qa_issue.
            const createRes = await apiCall<{
                id: string
                segment_id: string
                category: string
                severity: string
                resolved: boolean
                author_kind: string
            }>(page, `/api/segments/${segmentId}/qa-issues`, {
                method: 'POST',
                body: {
                    category: 'Terminology',
                    severity: 'minor',
                    body: 'qa-issues-api spec probe — safe to ignore',
                },
            })
            expect(createRes.status).toBe(201)
            expect(createRes.body.segment_id).toBe(segmentId)
            expect(createRes.body.category).toBe('Terminology')
            expect(createRes.body.severity).toBe('minor')
            expect(createRes.body.resolved).toBe(false)
            expect(createRes.body.author_kind).toBe('human')
            const issueId = createRes.body.id

            // 3. GET — the new issue should appear in the list.
            const listRes = await apiCall<Array<{ id: string; resolved: boolean }>>(
                page,
                `/api/segments/${segmentId}/qa-issues`
            )
            expect(listRes.status).toBe(200)
            const found = (Array.isArray(listRes.body) ? listRes.body : []).find(
                (i) => i.id === issueId
            )
            expect(found, 'newly created issue should appear in list').toBeTruthy()
            expect(found!.resolved).toBe(false)

            // 4. PATCH — resolve the issue.
            const patchRes = await apiCall<{
                id: string
                resolved: boolean
                resolved_by: string | null
                resolved_at: string | null
            }>(page, `/api/segments/${segmentId}/qa-issues/${issueId}`, {
                method: 'PATCH',
                body: { resolved: true },
            })
            expect(patchRes.status).toBe(200)
            expect(patchRes.body.id).toBe(issueId)
            expect(patchRes.body.resolved).toBe(true)
            expect(patchRes.body.resolved_by).not.toBeNull()
            expect(patchRes.body.resolved_at).not.toBeNull()

            // 5. Re-GET — the issue should now be resolved.
            const listAfter = await apiCall<Array<{ id: string; resolved: boolean }>>(
                page,
                `/api/segments/${segmentId}/qa-issues`
            )
            expect(listAfter.status).toBe(200)
            const foundAfter = (Array.isArray(listAfter.body) ? listAfter.body : []).find(
                (i) => i.id === issueId
            )
            expect(foundAfter).toBeTruthy()
            expect(foundAfter!.resolved).toBe(true)
        })

        test('POST with author_kind=agent is rejected (cooperation invariant)', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)

            const docsRes = await apiCall<Array<{ id: string }>>(page, '/api/documents')
            const docs = Array.isArray(docsRes.body) ? docsRes.body : []
            expect(docs.length).toBeGreaterThan(0)
            const segRes = await apiCall<Array<{ id: string }>>(
                page,
                `/api/documents/${docs[0].id}/segments`
            )
            const segments = Array.isArray(segRes.body) ? segRes.body : []
            expect(segments.length).toBeGreaterThan(0)
            const segmentId = segments[0].id

            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${segmentId}/qa-issues`,
                {
                    method: 'POST',
                    body: {
                        category: 'Fluency',
                        severity: 'minor',
                        body: 'test',
                        author_kind: 'agent',
                    },
                }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/author_kind/)
        })

        test('POST with invalid category returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)

            // Any UUID-shaped id is fine for the validation check.
            const fakeSegmentId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeSegmentId}/qa-issues`,
                {
                    method: 'POST',
                    body: {
                        category: 'BadCategory',
                        severity: 'minor',
                    },
                }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/category/)
        })

        test('PATCH with empty body returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)

            const fakeSegmentId = '00000000-0000-0000-0000-000000000000'
            const fakeIssueId = '00000000-0000-0000-0000-000000000001'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeSegmentId}/qa-issues/${fakeIssueId}`,
                { method: 'PATCH', body: {} }
            )
            expect(res.status).toBe(400)
        })
    })
})
