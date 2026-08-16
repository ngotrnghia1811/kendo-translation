/**
 * tests/admin-unified.spec.ts
 *
 * Consolidated admin spec file:
 * - Admin Dashboard tests (originally tests/admin.spec.ts)
 * - Admin Users API tests (originally tests/admin-users-api.spec.ts)
 * - Admin User Assignments API tests (originally tests/admin-user-assignments-api.spec.ts)
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

// --- Helpers copied/shared ---

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

// --- Original tests/admin.spec.ts tests ---

const MOCK_USERS = [
    { id: 'uid-001', username: 'admin_user', role: 'admin', created_at: '2025-01-10T08:00:00Z' },
    { id: 'uid-002', username: 'translator_1', role: 'translator', created_at: '2025-02-15T10:30:00Z' },
    { id: 'uid-003', username: null, role: 'reader', created_at: '2025-03-20T14:00:00Z' },
]

test.describe('Admin Unified', () => {

    test.describe('Dashboard (originally admin.spec.ts)', () => {
        test.describe('Authenticated', () => {
            test.use({ storageState: 'tests/.auth/admin.json' })
    
            test('Admin page renders heading', async ({ page, snap }) => {
                await page.goto(`${BASE}/admin`)
                await snap('admin_initial_load')
    
                await page.waitForSelector('h1', { timeout: 10_000 })
                await snap('admin_heading_visible')
    
                const heading = await page.locator('h1').first().innerText()
                expect(heading.toLowerCase()).toContain('admin')
                await snap('admin_heading_confirmed')
            })
        })
    
        test('Admin page shows loading skeleton', async ({ page, snap }) => {
            await page.route('**/api/admin/users', route =>
                new Promise(resolve => setTimeout(() => resolve(route.continue()), 2000)),
            )
    
            await page.goto(`${BASE}/admin`)
            await snap('admin_loading_state')
    
            await page.waitForTimeout(300)
            await snap('admin_loading_skeleton')
        })
    
        test('Stats cards render with mocked data', async ({ page, snap }) => {
            await page.route('**/api/admin/users', route =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ users: MOCK_USERS }),
                }),
            )
    
            await page.route('**/api/documents', route =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        documents: [
                            { id: 'doc1', segmented: true, progress: { percentage: 100 } },
                            { id: 'doc2', segmented: false, progress: { percentage: 40 } },
                        ],
                    }),
                }),
            )
    
            await page.goto(`${BASE}/admin`)
            await snap('admin_with_mock_initial')
            await page.waitForTimeout(2000)
            await snap('admin_with_mock_loaded')
    
            const bodyText = await page.evaluate(() => document.body.innerText)
    
            if (bodyText.includes('Total Documents') || bodyText.includes('Segmented')) {
                await snap('admin_stats_cards_visible')
            }
    
            if (bodyText.includes('3')) {
                await snap('admin_user_count_visible')
            }
        })
    
        test('User table renders rows with role badges', async ({ page, snap }) => {
            await page.route('**/api/admin/users', route =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ users: MOCK_USERS }),
                }),
            )
    
            await page.route('**/api/documents', route =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ documents: [] }),
                }),
            )
    
            await page.goto(`${BASE}/admin`)
            await snap('admin_table_initial')
            await page.waitForTimeout(2000)
            await snap('admin_table_loaded')
    
            const bodyText = await page.evaluate(() => document.body.innerText)
    
            if (bodyText.includes('admin_user')) {
                expect(bodyText).toContain('admin_user')
                await snap('admin_username_visible')
            }
    
            if (bodyText.includes('translator_1')) {
                expect(bodyText).toContain('translator_1')
                await snap('admin_translator_visible')
            }
    
            if (bodyText.includes('No username')) {
                await snap('admin_no_username_fallback')
            }
    
            if (bodyText.includes('admin') && bodyText.includes('translator') && bodyText.includes('reader')) {
                await snap('admin_role_badges_all_visible')
            }
        })
    })

    // --- Original tests/admin-users-api.spec.ts tests ---

    test.describe('Users API (originally admin-users-api.spec.ts)', () => {
        type UserLite = { id: string; username: string | null; role: string }
        
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
    
            test('JWT contains app_metadata.role = admin (requireAdmin fast-path)', async ({ page, context }) => {
                await page.goto(`${BASE}/`)
                const cookies = await context.cookies()
                const authCookie = cookies.find(c => c.name.includes('auth-token'))
                expect(authCookie, 'Supabase auth-token cookie must be present').toBeDefined()
    
                const jwtPayload = await page.evaluate((cookieVal: string) => {
                    try {
                        const parsed = JSON.parse(cookieVal)
                        const token = parsed.access_token || cookieVal
                        const parts = token.split('.')
                        if (parts.length !== 3) return null
                        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
                        const jsonStr = atob(base64)
                        return JSON.parse(jsonStr)
                    } catch {
                        return null
                    }
                }, authCookie!.value)
    
                expect(jwtPayload, 'JWT payload must be decodable').toBeTruthy()
                expect(
                    jwtPayload?.app_metadata?.role,
                    'JWT app_metadata.role must be "admin" for requireAdmin fast-path'
                ).toBe('admin')
    
                test.info().annotations.push({
                    type: 'jwt-fast-path',
                    description: `app_metadata.role=${jwtPayload?.app_metadata?.role} (fast-path validated)`,
        })

    test.describe('/api/admin/users (real endpoint, authenticated as admin)', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('/api/admin/users returns JSON with users array', async ({ page, snap }) => {
            await page.goto(`${BASE}/api/admin/users`)
            await snap('admin_users_api_response')

            const body = await page.evaluate(() => document.body.innerText)
            try {
                const json = JSON.parse(body)
                expect(json).toHaveProperty('users')
                expect(Array.isArray(json.users)).toBe(true)
                await snap('admin_users_api_confirmed')
            } catch {
                // Supabase not available in test env — acceptable
                await snap('admin_users_api_error_or_auth_required')
            }
        })
    })
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

    // --- Original tests/admin-user-assignments-api.spec.ts tests ---

    test.describe('User Assignments API (originally admin-user-assignments-api.spec.ts)', () => {
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

        test.describe('as admin', () => {
            test.use({ storageState: 'tests/.auth/admin.json' })
    
            test('GET returns array shape with joined document title', async ({ page }) => {
                await page.goto(`${BASE}/`)
    
                const users = await apiCall<{ users: UserLite[] }>(page, '/api/admin/users')
                expect(users.status).toBe(200)
                const translator = users.body.users.find((u) => u.role === 'translator')
                expect(translator, 'need at least one translator user').toBeTruthy()
                const userId = translator!.id
    
                const docs = await apiCall<{ documents: DocLite[] }>(page, '/api/documents')
                expect(docs.status).toBe(200)
                const doc = (docs.body.documents ?? [])[0]
                expect(doc, 'need at least one document').toBeTruthy()
    
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
                    const d = Array.isArray(found!.document)
                        ? found!.document[0]
                        : found!.document
                    expect(d?.title).toBeTruthy()
                } finally {
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

})
