/**
 * tests/assignments-actions-api.spec.ts
 *
 * Wave-2 FE Unit 5: supplementary coverage for the document assignments
 * endpoints, specifically the bits the AssignmentTable UI relies on
 * that are NOT already exercised by `assignments-api.spec.ts`:
 *
 *   (a) GET embeds `user.username` after the route's profile-join.
 *   (b) PATCH on a nonexistent (document_id, user_id) pair returns 404
 *       (untested edge of the [userId] route; needed so the UI can
 *       distinguish stale-row from genuine errors).
 *
 * Both tests run as admin, discover real document + translator user,
 * and clean up their own rows.
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
    expect(docs.length, 'expected at least one document').toBeGreaterThan(0)
    return docs[0].id
}

async function discoverTranslatorUser(
    page: import('@playwright/test').Page
): Promise<{ id: string; username: string }> {
    const usersRes = await apiCall<{
        users: Array<{ id: string; role: string; username: string }>
    }>(page, '/api/admin/users')
    expect(usersRes.status).toBe(200)
    const t = usersRes.body.users.find((u) => u.role === 'translator')
    expect(t, 'expected at least one translator-role user').toBeTruthy()
    return { id: t!.id, username: t!.username }
}

test.describe('Document Assignments API \u2014 supplementary', () => {
    test.use({ storageState: 'tests/.auth/admin.json' })

    test('GET embeds user.username via profile join', async ({ page, snap }) => {
        await page.goto(`${BASE}/`)
        const documentId = await discoverDocumentId(page)
        const user = await discoverTranslatorUser(page)
        await snap('assignments_actions_join_setup')

        // Clean slate.
        await apiCall(
            page,
            `/api/documents/${documentId}/assignments/${user.id}`,
            { method: 'DELETE' }
        )

        // Seed.
        const createRes = await apiCall(
            page,
            `/api/documents/${documentId}/assignments`,
            {
                method: 'POST',
                body: { user_id: user.id, allowed_phases: ['translate'] },
            }
        )
        expect(createRes.status).toBe(201)

        // Read & inspect the join.
        const listRes = await apiCall<{
            assignments: Array<{
                user_id: string
                user:
                    | { username: string }
                    | Array<{ username: string }>
                    | null
            }>
        }>(page, `/api/documents/${documentId}/assignments`)
        expect(listRes.status).toBe(200)
        const row = listRes.body.assignments.find((a) => a.user_id === user.id)
        expect(row, 'expected newly-created assignment in list').toBeTruthy()
        const joined = Array.isArray(row!.user) ? row!.user[0] : row!.user
        expect(joined?.username).toBe(user.username)

        // Cleanup.
        await apiCall(
            page,
            `/api/documents/${documentId}/assignments/${user.id}`,
            { method: 'DELETE' }
        )
    })

    test('PATCH on nonexistent assignment returns 404', async ({ page }) => {
        await page.goto(`${BASE}/`)
        const documentId = await discoverDocumentId(page)
        const user = await discoverTranslatorUser(page)

        // Ensure no row exists for this pair.
        await apiCall(
            page,
            `/api/documents/${documentId}/assignments/${user.id}`,
            { method: 'DELETE' }
        )

        const res = await apiCall<{ error: string }>(
            page,
            `/api/documents/${documentId}/assignments/${user.id}`,
            {
                method: 'PATCH',
                body: { allowed_phases: ['translate'] },
            }
        )
        expect(res.status).toBe(404)
        expect(res.body.error).toMatch(/not found/i)
    })
})
