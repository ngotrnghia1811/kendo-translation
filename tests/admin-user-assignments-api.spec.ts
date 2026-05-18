/**
 * tests/admin-user-assignments-api.spec.ts
 *
 * Coverage for the per-user assignments view at
 * GET /api/admin/users/[userId]/assignments.
 *
 *  (1) admin: 200 with `{assignments: [...]}`, joined `document.title`.
 *      We bootstrap by ensuring at least one assignment exists for a
 *      translator user against a real document (POST via the
 *      per-document route), then GET via the new inverse endpoint.
 *      We clean up the bootstrap assignment when done.
 *  (2) translator: 403 (any well-formed userId).
 *  (3) unauthenticated: 401.
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

interface UserLite {
    id: string
    username: string | null
    role: string
}
interface DocLite {
    id: string
    title: string
}
interface AssignmentRow {
    id: string
    user_id: string
    document_id: string
    allowed_phases: string[]
    document?: { id: string; title: string | null } | { id: string; title: string | null }[] | null
}

test.describe('Admin per-user assignments API', () => {
    test.describe('as admin', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('GET returns array shape with joined document title', async ({ page }) => {
            await page.goto(`${BASE}/`)

            // 1. Pick a translator user.
            const users = await apiCall<{ users: UserLite[] }>(page, '/api/admin/users')
            expect(users.status).toBe(200)
            const translator = users.body.users.find((u) => u.role === 'translator')
            expect(translator, 'need at least one translator user').toBeTruthy()
            const userId = translator!.id

            // 2. Pick any document.
            const docs = await apiCall<{ documents: DocLite[] }>(page, '/api/documents')
            expect(docs.status).toBe(200)
            const doc = (docs.body.documents ?? [])[0]
            expect(doc, 'need at least one document').toBeTruthy()

            // 3. Bootstrap: ensure an assignment exists. Idempotent
            //    upsert; status 200 (existing) or 201 (created) both OK.
            const seed = await apiCall(
                page,
                `/api/documents/${doc.id}/assignments`,
                {
                    method: 'POST',
                    body: { user_id: userId, allowed_phases: ['translate'] },
                }
            )
            expect([200, 201]).toContain(seed.status)

            try {
                // 4. The real call under test.
                const res = await apiCall<{ assignments: AssignmentRow[] }>(
                    page,
                    `/api/admin/users/${userId}/assignments`
                )
                expect(res.status).toBe(200)
                expect(Array.isArray(res.body.assignments)).toBe(true)

                const found = res.body.assignments.find(
                    (a) => a.document_id === doc.id
                )
                expect(found, 'bootstrapped assignment should be present').toBeTruthy()
                // joined document field, accept either object or array shape
                const d = Array.isArray(found!.document)
                    ? found!.document[0]
                    : found!.document
                expect(d?.title).toBeTruthy()
            } finally {
                // 5. Best-effort cleanup of the bootstrap row.
                await apiCall(
                    page,
                    `/api/documents/${doc.id}/assignments/${userId}`,
                    { method: 'DELETE' }
                )
            }
        })
    })

    test.describe('as translator', () => {
        test.use({ storageState: 'tests/.auth/translator.json' })

        test('GET returns 403', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const res = await apiCall(
                page,
                '/api/admin/users/00000000-0000-0000-0000-000000000000/assignments'
            )
            expect(res.status).toBe(403)
        })
    })

    test.describe('unauthenticated', () => {
        test.use({ storageState: { cookies: [], origins: [] } })

        test('GET returns 401', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const res = await apiCall(
                page,
                '/api/admin/users/00000000-0000-0000-0000-000000000000/assignments'
            )
            expect(res.status).toBe(401)
        })
    })
})
