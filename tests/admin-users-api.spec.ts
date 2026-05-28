/**
 * tests/admin-users-api.spec.ts
 *
 * Coverage for the tightened `/api/admin/users` endpoint:
 *
 *  (1) admin: GET returns 200 with `{users: [...]}` shape.
 *  (2) translator: GET returns 403.
 *  (3) unauthenticated: GET returns 401.
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

type UserLite = { id: string; username: string | null; role: string }

test.describe('Admin Users API — role gate', () => {
    test.describe('as admin', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('GET returns users array', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const res = await apiCall<{ users: UserLite[] }>(
                page,
                '/api/admin/users'
            )
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body.users)).toBe(true)
            expect(res.body.users.length).toBeGreaterThan(0)
            const row = res.body.users[0]
            expect(row).toHaveProperty('id')
            expect(row).toHaveProperty('role')
        })
    })

    test.describe('as translator', () => {
        test.use({ storageState: 'tests/.auth/translator.json' })

        test('GET returns 403', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const res = await apiCall<{ error: string }>(
                page,
                '/api/admin/users'
            )
            expect(res.status).toBe(403)
        })
    })

    test.describe('unauthenticated', () => {
        test.use({ storageState: { cookies: [], origins: [] } })

        test('GET returns 401', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const res = await apiCall<{ error: string }>(
                page,
                '/api/admin/users'
            )
            expect(res.status).toBe(401)
        })
    })
})
