/**
 * tests/profiles-api.spec.ts
 *
 * Coverage for the admin-only `/api/profiles` search endpoint.
 *
 *  (1) admin: GET returns an array of profiles (200).
 *  (2) admin: ?search=<substring> filters case-insensitively.
 *  (3) translator: 403 (Forbidden).
 *  (4) unauth: 401.
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

type ProfileLite = { id: string; username: string; role: string }

test.describe('Profiles API — admin search', () => {
    test.describe('as admin', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('GET returns profiles array', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const res = await apiCall<{ profiles: ProfileLite[] }>(
                page,
                '/api/profiles'
            )
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body.profiles)).toBe(true)
            expect(res.body.profiles.length).toBeGreaterThan(0)
            // Shape check on first row.
            const row = res.body.profiles[0]
            expect(row).toHaveProperty('id')
            expect(row).toHaveProperty('username')
            expect(row).toHaveProperty('role')
        })

        test('?search= filters case-insensitively', async ({ page }) => {
            await page.goto(`${BASE}/`)
            // Discover a username we know exists, then search by a
            // lowercased fragment.
            const allRes = await apiCall<{ profiles: ProfileLite[] }>(
                page,
                '/api/profiles?limit=50'
            )
            expect(allRes.status).toBe(200)
            const someone = allRes.body.profiles[0]
            expect(someone).toBeTruthy()
            const fragment = someone.username
                .slice(0, Math.min(3, someone.username.length))
                .toLowerCase()

            const filtered = await apiCall<{ profiles: ProfileLite[] }>(
                page,
                `/api/profiles?search=${encodeURIComponent(fragment)}`
            )
            expect(filtered.status).toBe(200)
            expect(filtered.body.profiles.length).toBeGreaterThan(0)
            for (const p of filtered.body.profiles) {
                expect(p.username.toLowerCase()).toContain(fragment)
            }
        })

        test('rejects bad limit with 400', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const res = await apiCall<{ error: string }>(
                page,
                '/api/profiles?limit=999'
            )
            expect(res.status).toBe(400)
        })
    })

    test.describe('as translator', () => {
        test.use({ storageState: 'tests/.auth/translator.json' })

        test('GET returns 403', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const res = await apiCall<{ error: string }>(page, '/api/profiles')
            expect(res.status).toBe(403)
        })
    })

    test.describe('unauthenticated', () => {
        test.use({ storageState: { cookies: [], origins: [] } })

        test('GET returns 401', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const res = await apiCall<{ error: string }>(page, '/api/profiles')
            expect(res.status).toBe(401)
        })
    })
})
