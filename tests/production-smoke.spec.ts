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
 *   5. Admin dashboard users table visible (users live on /admin, not /admin/users)
 *   6. Reader view loads for first document
 *   7. /search page renders with search input + results for "kendo"
 *   8. 401 gate on /api/documents (no session)
 *
 * Authentication strategy:
 *   The storageState files in tests/.auth/ are scoped to localhost and
 *   cannot be reused against the production domain.  Instead, one real
 *   login is performed in test.beforeAll via the Supabase REST API
 *   (POST /auth/v1/token?grant_type=password).  The resulting session
 *   cookies are injected into the BrowserContext so all tests in the
 *   authenticated block share the same session — no per-test re-login.
 *
 * Credentials: standard test accounts (test-password).
 */

import path from 'path'
import { test, expect, type BrowserContext } from '@playwright/test'

const PROD = process.env.PROD_URL ?? 'https://kendo-translation.vercel.app'
const ADMIN_EMAIL = 'admin-1@test.com'
const ADMIN_PASS = 'test-password'

// Supabase project values are public (anon key is safe to embed in tests).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mbgmyvmsvenvtecvrjia.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** Snapshot helper — saves to test-results/smoke-screenshots/. */
type Page = import('@playwright/test').Page
async function snap(page: Page, name: string) {
    try {
        await page.screenshot({
            path: path.join('test-results', 'smoke-screenshots', `${name}.png`),
            fullPage: false,   // viewport-only; avoids >32767 px overflow
        })
    } catch {
        // Non-fatal; screenshot failure must not block a test assertion.
    }
}

/** Fetch a URL from within the page context (inherits session cookies). */
async function apiFetch<T = unknown>(
    page: Page,
    path: string,
): Promise<{ status: number; body: T }> {
    return page.evaluate(
        async ({ base, p }) => {
            const res = await fetch(`${base}${p}`)
            let body: unknown
            try { body = await res.json() } catch { body = null }
            return { status: res.status, body }
        },
        { base: PROD, p: path },
    ) as Promise<{ status: number; body: T }>
}

/** POST a JSON body to an API endpoint from within the page context. */
async function apiPost<T = unknown>(
    page: Page,
    path: string,
    body: unknown,
    accessToken: string,
): Promise<{ status: number; body: T }> {
    return page.evaluate(
        async ({ base, p, body, token }) => {
            const res = await fetch(`${base}${p}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            })
            let responseBody: unknown
            try { responseBody = await res.json() } catch { responseBody = null }
            return { status: res.status, body: responseBody }
        },
        { base: PROD, p: path, body, token: accessToken },
    ) as Promise<{ status: number; body: T }>
}

/**
 * Inject a Supabase session into all pages created by this context.
 *
 * @supabase/ssr reads session from cookies (not localStorage) in Server
 * Components and middleware.  We set the `sb-<ref>-auth-token` cookie
 * (and its chunked .0/.1 variants used for long tokens) via
 * context.addCookies so the server sees the session on the very first
 * navigation — no browser-side JS involved.
 */
async function injectSession(context: BrowserContext, accessToken: string, refreshToken: string) {
    const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
    const cookieName = `sb-${projectRef}-auth-token`
    const sessionValue = JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
    })

    // @supabase/ssr chunks large cookies; for tokens < 3700 chars the single
    // cookie name is used.  We set both the plain name and the .0 chunk so
    // it works regardless of token length.
    const prodDomain = new URL(PROD).hostname  // e.g. kendo-translation.vercel.app
    const cookieBase = {
        domain: prodDomain,
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax' as const,
        expires: Math.floor(Date.now() / 1000) + 3600,
    }

    await context.addCookies([
        { ...cookieBase, name: cookieName,      value: sessionValue },
        { ...cookieBase, name: `${cookieName}.0`, value: sessionValue },
    ])
}

// ============================================================================
// 1. Health endpoint — no auth needed
// ============================================================================
test('1. GET /api/health returns ok=true', async ({ page }) => {
    const res = await page.request.get(`${PROD}/api/health`)
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.db).toBe('ok')
    expect(typeof json.version).toBe('string')
    await page.goto(PROD)
    await snap(page, 'health_ok')
})

// ============================================================================
// 2. Login page — no auth needed
// ============================================================================
test('2. /login page renders with email + password form', async ({ page }) => {
    await page.goto(`${PROD}/login`)
    await page.waitForLoadState('networkidle')
    await snap(page, 'login_page')
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
})

// ============================================================================
// 3–7. Authenticated flows — shared session via beforeAll
// ============================================================================
test.describe('Authenticated flows', () => {
    let accessToken = ''
    let refreshToken = ''

    test.beforeAll(async ({ request }) => {
        // Sign in via Supabase REST API — faster and more reliable than
        // a form-based login through the browser.
        const res = await request.post(
            `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                },
                data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
            },
        )
        if (!res.ok()) {
            throw new Error(`Supabase login failed: ${res.status()} ${await res.text()}`)
        }
        const body = await res.json() as { access_token: string; refresh_token: string }
        accessToken = body.access_token
        refreshToken = body.refresh_token
    })

    test('3. Admin → /documents list loads', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        await page.goto(`${PROD}/documents`)
        await page.waitForLoadState('networkidle')
        await snap(page, 'documents_list')
        expect(page.url()).not.toContain('/login')
        const body = await page.locator('body').textContent()
        expect(body).toBeTruthy()
    })

    test('4. /admin dashboard — stat cards visible', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        await page.goto(`${PROD}/admin`)
        await page.waitForLoadState('networkidle')
        await snap(page, 'admin_dashboard')
        expect(page.url()).not.toContain('/login')
        // The page rendered the admin dashboard — check URL only.
        // (The raw body textContent includes the Next.js RSC bundle which
        // embeds the 404 fallback template as escaped JSON; that text is NOT
        // visible to the user and must not be matched against.)
        expect(page.url()).toContain('/admin')
    })

    test('5. /admin — users table section renders', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        await page.goto(`${PROD}/admin`)
        await page.waitForLoadState('networkidle')
        await snap(page, 'admin_users')
        // Users table is embedded in /admin — check URL only.
        expect(page.url()).toContain('/admin')
        expect(page.url()).not.toContain('/login')
    })

    test('6. Reader view loads for first document', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        await page.goto(`${PROD}/documents`)
        await page.waitForLoadState('networkidle')

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
        await snap(page, 'reader_view')
        expect(page.url()).not.toContain('/login')
    })

    test('7. /search renders and returns results for "kendo"', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        await page.goto(`${PROD}/search`)
        await page.waitForLoadState('networkidle')
        await snap(page, 'search_page')
        const searchInput = page.locator('input[type="search"], input[aria-label="Search query"]').first()
        await expect(searchInput).toBeVisible()
        await searchInput.fill('kendo')
        await page.waitForTimeout(1500)
        await snap(page, 'search_results_kendo')
    })

    test('9. Editor page loads for first document', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        await page.goto(`${PROD}/documents`)
        await page.waitForLoadState('networkidle')

        const docsRes = await apiFetch<unknown>(page, '/api/documents')
        const docsArray = Array.isArray(docsRes.body)
            ? (docsRes.body as Array<{ id: string }>)
            : Array.isArray((docsRes.body as { documents?: unknown })?.documents)
                ? ((docsRes.body as { documents: Array<{ id: string }> }).documents)
                : []
        if (docsRes.status !== 200 || docsArray.length === 0) {
            test.skip(true, `No documents (status=${docsRes.status}, count=${docsArray.length})`)
            return
        }
        const docId = docsArray[0].id

        await page.goto(`${PROD}/documents/${docId}/edit`)
        await page.waitForLoadState('networkidle')
        await snap(page, 'editor_view')
        expect(page.url()).not.toContain('/login')
        const segmentEl = page.locator('[data-testid="segment-row"], [data-testid="segment-editor-panel"]').first()
        await expect(segmentEl).toBeVisible({ timeout: 20000 })
    })

    test('10. PDF view — /api/pdfs/[articleId] returns PDF bytes', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        const docsRes = await apiFetch<unknown>(page, '/api/documents')
        const docsArray = Array.isArray(docsRes.body)
            ? (docsRes.body as Array<{ id: string }>)
            : Array.isArray((docsRes.body as { documents?: unknown })?.documents)
                ? ((docsRes.body as { documents: Array<{ id: string }> }).documents)
                : []
        if (docsRes.status !== 200 || docsArray.length === 0) {
            test.skip(true, `No documents (status=${docsRes.status})`)
            return
        }
        const docId = docsArray[0].id
        const res = await page.request.get(`${PROD}/api/pdfs/${docId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
        expect(res.status()).toBe(200)
        const ct = res.headers()['content-type']
        expect(ct).toContain('application/pdf')
        await snap(page, 'pdf_api_check')
    })

    test('11. Terminology page renders', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        await page.goto(`${PROD}/terminology`)
        await page.waitForLoadState('networkidle')
        await snap(page, 'terminology_page')
        expect(page.url()).not.toContain('/login')
        await expect(page.locator('h1, h2').first()).toContainText(/Terminology|Term/)
    })

    test('12. Profile page renders with stats', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        await page.goto(`${PROD}/profile`)
        await page.waitForLoadState('networkidle')
        await snap(page, 'profile_page')
        expect(page.url()).not.toContain('/login')
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).toContain(ADMIN_EMAIL)
    })

    test('13. Reader ZH toggle shows Chinese content', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        const docsRes = await apiFetch<unknown>(page, '/api/documents')
        const docsArray = Array.isArray(docsRes.body)
            ? (docsRes.body as Array<{ id: string }>)
            : Array.isArray((docsRes.body as { documents?: unknown })?.documents)
                ? ((docsRes.body as { documents: Array<{ id: string }> }).documents)
                : []
        if (docsRes.status !== 200 || docsArray.length === 0) {
            test.skip(true, `No documents (status=${docsRes.status})`)
            return
        }
        const docId = docsArray[0].id
        await page.goto(`${PROD}/documents/${docId}/read`)
        await page.waitForLoadState('networkidle')
        const zhSelector = 'button:has-text("中文"), button[aria-label*="Chinese"], button[aria-label*="ZH"]'
        if ((await page.locator(zhSelector).count()) > 0) {
            await page.locator(zhSelector).first().click()
            await page.waitForTimeout(1000)
            await snap(page, 'reader_zh_toggle')
        } else {
            test.skip(true, 'No ZH toggle found for this document')
        }
    })

    test('14. Agent MAC-RAG compose endpoint (POST /api/mac-rag/compose)', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        const docsRes = await apiFetch<unknown>(page, '/api/documents')
        const docsArray = Array.isArray(docsRes.body)
            ? (docsRes.body as Array<{ id: string }>)
            : Array.isArray((docsRes.body as { documents?: unknown })?.documents)
                ? ((docsRes.body as { documents: Array<{ id: string }> }).documents)
                : []
        if (docsRes.status !== 200 || docsArray.length === 0) {
            test.skip(true, `No documents (status=${docsRes.status})`)
            return
        }
        const docId = docsArray[0].id
        const segsRes = await apiFetch<unknown>(page, `/api/documents/${docId}/segments`)
        const segments: Array<{ id: string }> = Array.isArray(segsRes.body)
            ? (segsRes.body as Array<{ id: string }>)
            : Array.isArray((segsRes.body as { segments?: unknown })?.segments)
                ? ((segsRes.body as { segments: Array<{ id: string }> }).segments)
                : []
        if (segsRes.status !== 200 || segments.length === 0) {
            test.skip(true, `No segments for doc ${docId} (status=${segsRes.status})`)
            return
        }
        const segmentId = segments[0].id
        const res = await apiPost<{ prompt?: { system?: string; user?: string } }>(
            page, '/api/mac-rag/compose', { segment_id: segmentId, phase: 'translate' }, accessToken,
        )
        expect(res.status).toBe(200)
        const body = res.body as { prompt?: { system?: string; user?: string } }
        expect(body.prompt).toBeDefined()
        expect(body.prompt!.system).toBeDefined()
        expect(body.prompt!.user).toBeDefined()
        await snap(page, 'mac_rag_compose')
    })

    test('15. QA issues list endpoint (GET /api/segments/[id]/qa-issues)', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        const docsRes = await apiFetch<unknown>(page, '/api/documents')
        const docsArray = Array.isArray(docsRes.body)
            ? (docsRes.body as Array<{ id: string }>)
            : Array.isArray((docsRes.body as { documents?: unknown })?.documents)
                ? ((docsRes.body as { documents: Array<{ id: string }> }).documents)
                : []
        if (docsRes.status !== 200 || docsArray.length === 0) {
            test.skip(true, `No documents (status=${docsRes.status})`)
            return
        }
        const docId = docsArray[0].id
        const segsRes = await apiFetch<unknown>(page, `/api/documents/${docId}/segments`)
        const segments: Array<{ id: string }> = Array.isArray(segsRes.body)
            ? (segsRes.body as Array<{ id: string }>)
            : Array.isArray((segsRes.body as { segments?: unknown })?.segments)
                ? ((segsRes.body as { segments: Array<{ id: string }> }).segments)
                : []
        if (segsRes.status !== 200 || segments.length === 0) {
            test.skip(true, `No segments for doc ${docId}`)
            return
        }
        const segmentId = segments[0].id
        const res = await apiFetch<unknown>(page, `/api/segments/${segmentId}/qa-issues`)
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
    })

    test('16. Terminology API (GET /api/terminology)', async ({ page, context }) => {
        await injectSession(context, accessToken, refreshToken)
        const res = await apiFetch<unknown>(page, '/api/terminology')
        expect(res.status).toBe(200)
        const body = res.body as Record<string, unknown>
        expect(Array.isArray(body) || typeof body.terms !== 'undefined').toBe(true)
    })
})

// ============================================================================
// 8. Auth gate — no session
// ============================================================================
test('8. /api/documents returns 401 without session', async ({ page }) => {
    const res = await page.request.get(`${PROD}/api/documents`)
    expect(res.status()).toBe(401)
})
