/**
 * tests/assignments-api.spec.ts
 *
 * Wave-2 BE Unit 3: live integration coverage for the Document
 * Assignments API (/api/documents/[id]/assignments and
 * .../assignments/[userId]).
 *
 * Strategy mirrors the suggestions and comments specs:
 *  - Authenticate as admin via storageState for write paths; as
 *    translator for the forbidden-write path.
 *  - Discover a real document via /api/documents and a real
 *    translator-role user via /api/admin/users so the assignment row
 *    references real data.
 *  - Happy path POST \u2192 GET \u2192 PATCH \u2192 GET \u2192 DELETE \u2192 GET so the test
 *    cleans up its own row; the live DB is left exactly as found.
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

async function discoverDocumentId(
    page: import('@playwright/test').Page
): Promise<string> {
    const docsRes = await apiCall<
        { documents?: Array<{ id: string }> } | Array<{ id: string }>
    >(page, '/api/documents')
    expect(docsRes.status).toBe(200)
    const docs = Array.isArray(docsRes.body)
        ? docsRes.body
        : (docsRes.body?.documents ?? [])
    expect(docs.length, 'expected at least one document in live DB').toBeGreaterThan(0)
    return docs[0].id
}

async function discoverTranslatorUserId(
    page: import('@playwright/test').Page
): Promise<string> {
    const usersRes = await apiCall<{
        users: Array<{ id: string; role: string; username: string }>
    }>(page, '/api/admin/users')
    expect(usersRes.status).toBe(200)
    const translator = usersRes.body.users.find((u) => u.role === 'translator')
    expect(translator, 'expected at least one translator-role user').toBeTruthy()
    return translator!.id
}

test.describe('Document Assignments API', () => {
    test.describe('Authenticated as admin', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('POST creates, PATCH updates phases, DELETE removes', async ({
            page,
            snap,
        }) => {
            await page.goto(`${BASE}/`)
            const documentId = await discoverDocumentId(page)
            const userId = await discoverTranslatorUserId(page)
            await snap('assignments_api_discovered')

            // Defensive: clean up any pre-existing assignment row from
            // a previous failed run so the 201-on-insert assertion is
            // meaningful.
            await apiCall(page, `/api/documents/${documentId}/assignments/${userId}`, {
                method: 'DELETE',
            })

            // 1. POST \u2014 create.
            const createRes = await apiCall<{
                user_id: string
                document_id: string
                allowed_phases: string[]
                assigned_by: string | null
            }>(page, `/api/documents/${documentId}/assignments`, {
                method: 'POST',
                body: { user_id: userId, allowed_phases: ['translate'] },
            })
            expect(createRes.status).toBe(201)
            expect(createRes.body.user_id).toBe(userId)
            expect(createRes.body.document_id).toBe(documentId)
            expect(createRes.body.allowed_phases).toEqual(['translate'])
            expect(createRes.body.assigned_by).not.toBeNull()

            // 2. GET \u2014 list shows the new assignment.
            const listRes = await apiCall<{
                assignments: Array<{ user_id: string; allowed_phases: string[] }>
            }>(page, `/api/documents/${documentId}/assignments`)
            expect(listRes.status).toBe(200)
            const found = listRes.body.assignments.find((a) => a.user_id === userId)
            expect(found).toBeTruthy()
            expect(found!.allowed_phases).toEqual(['translate'])

            // 3. PATCH \u2014 grow allowed_phases.
            const patchRes = await apiCall<{ allowed_phases: string[] }>(
                page,
                `/api/documents/${documentId}/assignments/${userId}`,
                { method: 'PATCH', body: { allowed_phases: ['translate', 'edit'] } }
            )
            expect(patchRes.status).toBe(200)
            expect(patchRes.body.allowed_phases).toEqual(['translate', 'edit'])

            // 4. GET \u2014 confirm.
            const listRes2 = await apiCall<{
                assignments: Array<{ user_id: string; allowed_phases: string[] }>
            }>(page, `/api/documents/${documentId}/assignments`)
            const found2 = listRes2.body.assignments.find((a) => a.user_id === userId)
            expect(found2!.allowed_phases).toEqual(['translate', 'edit'])

            // 5. DELETE \u2014 cleanup.
            const delRes = await apiCall(
                page,
                `/api/documents/${documentId}/assignments/${userId}`,
                { method: 'DELETE' }
            )
            expect(delRes.status).toBe(204)

            // 6. GET \u2014 confirm absent.
            const listRes3 = await apiCall<{
                assignments: Array<{ user_id: string }>
            }>(page, `/api/documents/${documentId}/assignments`)
            const found3 = listRes3.body.assignments.find((a) => a.user_id === userId)
            expect(found3).toBeUndefined()
        })

        test('POST returns 200 (not 201) on second call \u2014 upsert semantics', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)
            const documentId = await discoverDocumentId(page)
            const userId = await discoverTranslatorUserId(page)

            // Clean slate.
            await apiCall(page, `/api/documents/${documentId}/assignments/${userId}`, {
                method: 'DELETE',
            })

            // First call \u2014 inserts.
            const first = await apiCall(page, `/api/documents/${documentId}/assignments`, {
                method: 'POST',
                body: { user_id: userId, allowed_phases: ['translate'] },
            })
            expect(first.status).toBe(201)

            // Second call \u2014 upserts with replaced phases.
            const second = await apiCall<{ allowed_phases: string[] }>(
                page,
                `/api/documents/${documentId}/assignments`,
                {
                    method: 'POST',
                    body: { user_id: userId, allowed_phases: ['edit', 'proofread'] },
                }
            )
            expect(second.status).toBe(200)
            expect(second.body.allowed_phases).toEqual(['edit', 'proofread'])

            // Cleanup.
            await apiCall(page, `/api/documents/${documentId}/assignments/${userId}`, {
                method: 'DELETE',
            })
        })

        test('POST with invalid phase value returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const documentId = await discoverDocumentId(page)
            const userId = await discoverTranslatorUserId(page)
            const res = await apiCall<{ error: string }>(
                page,
                `/api/documents/${documentId}/assignments`,
                {
                    method: 'POST',
                    body: { user_id: userId, allowed_phases: ['translate', 'bogus'] },
                }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/allowed_phases/)
        })

        test('POST with empty allowed_phases returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const documentId = await discoverDocumentId(page)
            const userId = await discoverTranslatorUserId(page)
            const res = await apiCall<{ error: string }>(
                page,
                `/api/documents/${documentId}/assignments`,
                { method: 'POST', body: { user_id: userId, allowed_phases: [] } }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/non-empty/)
        })
    })

    test.describe('Authenticated as translator (non-admin)', () => {
        test.use({ storageState: 'tests/.auth/translator.json' })

        test('POST returns 403', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const documentId = await discoverDocumentId(page)
            const fakeUserId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/documents/${documentId}/assignments`,
                {
                    method: 'POST',
                    body: { user_id: fakeUserId, allowed_phases: ['translate'] },
                }
            )
            expect(res.status).toBe(403)
            expect(res.body.error).toMatch(/admin/i)
        })
    })

    test.describe('Unauthenticated', () => {
        test('POST returns 401', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const fakeDocId = '00000000-0000-0000-0000-000000000000'
            const fakeUserId = '00000000-0000-0000-0000-000000000001'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/documents/${fakeDocId}/assignments`,
                {
                    method: 'POST',
                    body: { user_id: fakeUserId, allowed_phases: ['translate'] },
                }
            )
            expect(res.status).toBe(401)
            expect(res.body.error).toMatch(/Unauthorized/i)
        })
    })
})
