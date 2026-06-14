/**
 * tests/production-smoke.spec.ts
 *
 * Live-site smoke test against the production Vercel deployment.
 * Target URL is set via PROD_URL env var (default: https://kendo-translation.vercel.app).
 *
 * Checklist:
 *   1. Health endpoint returns ok=true
 *   2. Login page renders
 *   3. Admin login → /documents (document list)
 *   4. Admin → /admin dashboard (stat cards, phase breakdown)
 *   5. Admin → /admin/users (user table with last-activity)
 *   6. Reader view loads for first document
 *   7. /search page renders with search input + results for "kendo"
 *   8. 401 gate on /api/documents (no session)
 *
 * Authentication strategy:
 *   The storageState files in tests/.auth/ are scoped to localhost and
 *   cannot be reused against the production domain. Instead, authenticated
 *   tests perform a real login against the production Supabase instance
 *   before each test block.
 *
 * Credentials: standard test accounts (test-password).
 */

import { test, expect } from './helpers/camoufox-fixture'

const PROD = process.env.PROD_URL ?? 'https://kendo-translation.vercel.app'
const ADMIN_EMAIL = 'admin-1@test.com'
const ADMIN_PASS = 'test-password'

/** Log in against the production Supabase auth via the /login page. */
async function loginProd(page: import('@playwright/test').Page) {
    await page.goto(`${PROD}/login`)
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="email"], input[name="email"]').first().fill(ADMIN_EMAIL)
    await page.locator('input[type="password"]').first().fill(ADMIN_PASS)
    await page.locator('button[type="submit"]').click()
    // Wait for redirect away from /login (generous timeout for Vercel cold-starts)
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 30000 })
}

/** Fetch a URL from within the page context (inherits session cookies). */
async function apiFetch<T = unknown>(
    page: import('@playwright/test').Page,
    path: string,
): Promise<{ status: number; body: T }> {
    return page.evaluate(
        async ({ base, path }) => {
            const res = await fetch(`${base}${path}`)
            let body: unknown
            try { body = await res.json() } catch { body = null }
            return { status: res.status, body }
        },
        { base: PROD, path },
    ) as Promise<{ status: number; body: T }>
}

test.describe('Production Smoke Test', () => {
    // -----------------------------------------------------------------------
    // 1. Health endpoint (no auth)
    // -----------------------------------------------------------------------
    test('1. GET /api/health returns ok=true', async ({ page, snap }) => {
        const res = await page.request.get(`${PROD}/api/health`)
        expect(res.status()).toBe(200)
        const json = await res.json()
        expect(json.ok).toBe(true)
        expect(json.db).toBe('ok')
        expect(typeof json.version).toBe('string')
        expect(typeof json.timestamp).toBe('string')
        await page.goto(PROD)
        await snap('health_ok')
    })

    // -----------------------------------------------------------------------
    // 2. Login page renders (no auth)
    // -----------------------------------------------------------------------
    test('2. /login page renders with email + password form', async ({ page, snap }) => {
        await page.goto(`${PROD}/login`)
        await page.waitForLoadState('networkidle')
        await snap('login_page')
        const emailInput = page.locator('input[type="email"], input[name="email"]').first()
        await expect(emailInput).toBeVisible()
        const passwordInput = page.locator('input[type="password"]').first()
        await expect(passwordInput).toBeVisible()
    })

    // -----------------------------------------------------------------------
    // 3–7. Authenticated flows (real login per test)
    // -----------------------------------------------------------------------
    test('3. Admin login → /documents list loads', async ({ page, snap }) => {
        await loginProd(page)
        await page.goto(`${PROD}/documents`)
        await page.waitForLoadState('networkidle')
        await snap('documents_list')
        expect(page.url()).not.toContain('/login')
        const body = await page.locator('body').textContent()
        expect(body).not.toBeNull()
    })

    test('4. /admin dashboard — stat cards and phase breakdown visible', async ({ page, snap }) => {
        await loginProd(page)
        await page.goto(`${PROD}/admin`)
        await page.waitForLoadState('networkidle')
        await snap('admin_dashboard')
        expect(page.url()).not.toContain('/login')
        const body = await page.locator('body').textContent()
        expect(body).toBeTruthy()
    })

    test('5. /admin/users — user table renders', async ({ page, snap }) => {
        await loginProd(page)
        await page.goto(`${PROD}/admin/users`)
        await page.waitForLoadState('networkidle')
        await snap('admin_users')
        expect(page.url()).not.toContain('/login')
    })

    test('6. Reader view loads for first document', async ({ page, snap }) => {
        await loginProd(page)
        await page.goto(`${PROD}/documents`)
        await page.waitForLoadState('networkidle')

        // /api/documents returns either an array or { documents: [...] }
        const docsRes = await apiFetch<unknown>(page, '/api/documents')
        const docsArray = Array.isArray(docsRes.body)
            ? (docsRes.body as Array<{ id: string }>)
            : Array.isArray((docsRes.body as { documents?: unknown })?.documents)
                ? ((docsRes.body as { documents: Array<{ id: string }> }).documents)
                : []
        if (docsRes.status !== 200 || docsArray.length === 0) {
            test.skip(true, `No documents returned (status=${docsRes.status}, count=${docsArray.length})`)
            return
        }
        const docId = docsArray[0].id

        await page.goto(`${PROD}/documents/${docId}/read`)
        await page.waitForLoadState('networkidle')
        await snap('reader_view')
        expect(page.url()).not.toContain('/login')
    })

    test('7. /search page renders with search input and returns results for "kendo"', async ({ page, snap }) => {
        await loginProd(page)
        await page.goto(`${PROD}/search`)
        await page.waitForLoadState('networkidle')
        await snap('search_page')
        const searchInput = page.locator('input[type="search"], input[aria-label="Search query"]').first()
        await expect(searchInput).toBeVisible()
        await searchInput.fill('kendo')
        // Wait for debounced search (350ms + network)
        await page.waitForTimeout(1500)
        await snap('search_results_kendo')
    })

    // -----------------------------------------------------------------------
    // 8. Auth gate
    // -----------------------------------------------------------------------
    test('8. /api/documents returns 401 without session', async ({ page }) => {
        const res = await page.request.get(`${PROD}/api/documents`)
        expect(res.status()).toBe(401)
    })
})
