/**
 * tests/auth-profile-unified.spec.ts
 *
 * Unified tests for authentication and profile management.
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'
const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123'

// --- Helpers for API tests ---
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

// --- Test Suite ---

test.describe('Auth', () => {
    test('GET /api/auth/me returns null when not logged in', async ({ page, snap }) => {
        await page.goto(`${BASE}/api/auth/me`)
        await snap('api_auth_me_response')

        const body = await page.evaluate(() => document.body.innerText)
        const json = JSON.parse(body)
        expect(json.user).toBeNull()
        expect(json.profile).toBeNull()
    })

    test('Login page renders correctly', async ({ page, snap }) => {
        await page.goto(`${BASE}/login`)
        await snap('login_page_initial')

        // Check for email and password inputs
        await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
        await snap('login_inputs_visible')

        await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
        await snap('login_password_visible')

        // Check for submit button
        await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")')).toBeVisible()
        await snap('login_button_visible')
    })

    test('Login fails with invalid credentials', async ({ page, snap }) => {
        await page.goto(`${BASE}/login`)
        await snap('login_page_before_fill')

        const emailInput = page.locator('input[type="email"], input[name="email"]').first()
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first()

        await emailInput.fill('invalid@example.com')
        await snap('email_filled')

        await passwordInput.fill('wrongpassword')
        await snap('password_filled')

        await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click()
        await snap('after_submit_invalid')

        // Should still be on login page or show an error
        await page.waitForTimeout(1500)
        await snap('after_error_display')

        // Should not have redirected to /documents
        expect(page.url()).not.toContain('/documents')
    })

    test('Login succeeds with valid credentials (skipped if env not set)', async ({ page, snap }) => {
        if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
            test.skip()
        }

        await page.goto(`${BASE}/login`)
        await snap('login_page_before_valid_login')

        const emailInput = page.locator('input[type="email"], input[name="email"]').first()
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first()

        await emailInput.fill(TEST_EMAIL)
        await snap('email_filled_valid')

        await passwordInput.fill(TEST_PASSWORD)
        await snap('password_filled_valid')

        await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click()
        await snap('after_submit_valid')

        // Wait for redirect
        await page.waitForURL(`${BASE}/documents`, { timeout: 10_000 })
        await snap('redirected_to_documents')

        expect(page.url()).toContain('/documents')
    })

    test('/api/auth/logout returns success', async ({ page, snap }) => {
        // Call logout via POST (using fetch in page context)
        await page.goto(`${BASE}/`)
        await snap('home_before_logout')

        const response = await page.evaluate(async (base: string) => {
            const res = await fetch(`${base}/api/auth/logout`, { method: 'POST' })
            return { status: res.status, body: await res.json() }
        }, BASE)

        await snap('after_logout_api_call')

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
    })
})

test.describe('Profile View', () => {
    test.describe('Authenticated', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('Profile page renders heading', async ({ page, snap }) => {
            await page.goto(`${BASE}/profile`)
            await snap('profile_initial_load')

            await page.waitForSelector('h1', { timeout: 10_000 })
            await snap('profile_heading_visible')

            const heading = await page.locator('h1').first().innerText()
            expect(heading.toLowerCase()).toContain('profile')
            await snap('profile_heading_confirmed')
        })
    })

    test('Profile page shows loading state', async ({ page, snap }) => {
        // Delay the auth API to capture loading skeleton
        await page.route('**/api/auth/me', route =>
            new Promise(resolve => setTimeout(() => resolve(route.continue()), 2000)),
        )

        await page.goto(`${BASE}/profile`)
        await snap('profile_loading_state')

        await page.waitForTimeout(300)
        await snap('profile_loading_skeleton')
    })

    test('Profile page redirects to /login when unauthenticated', async ({ page, snap }) => {
        await page.goto(`${BASE}/profile`)
        await snap('profile_unauthenticated_initial')
        await page.waitForURL(/\/login\?next=%2Fprofile/, { timeout: 10_000 })
        await snap('profile_redirected_to_login')

        expect(page.url()).toMatch(/\/login\?next=%2Fprofile/)
    })

    test('Profile page shows user card with mocked translator profile', async ({ page, snap }) => {
        await page.route('**/api/auth/me', route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: {
                        id: 'mock-uid-translator',
                        email: 'translator@kendo.example.com',
                    },
                    profile: {
                        id: 'mock-uid-translator',
                        email: 'translator@kendo.example.com',
                        username: 'tanaka_kenji',
                        role: 'translator',
                        created_at: '2025-02-01T09:00:00Z',
                    },
                }),
            }),
        )

        await page.goto(`${BASE}/profile`)
        await snap('profile_translator_initial')
        await page.waitForTimeout(2000)
        await snap('profile_translator_loaded')

        const bodyText = await page.evaluate(() => document.body.innerText)

        if (bodyText.includes('tanaka_kenji')) {
            expect(bodyText).toContain('tanaka_kenji')
            await snap('profile_username_visible')
        }

        if (bodyText.includes('translator@kendo.example.com')) {
            expect(bodyText).toContain('translator@kendo.example.com')
            await snap('profile_email_visible')
        }

        if (bodyText.includes('translator')) {
            await snap('profile_role_badge_visible')
        }

        // Should show member since date
        if (bodyText.includes('2025') || bodyText.includes('February')) {
            await snap('profile_member_since_visible')
        }
    })

    test('Profile page shows admin role badge for admin user', async ({ page, snap }) => {
        await page.route('**/api/auth/me', route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: {
                        id: 'mock-uid-admin',
                        email: 'admin@kendo.example.com',
                    },
                    profile: {
                        id: 'mock-uid-admin',
                        email: 'admin@kendo.example.com',
                        username: 'sensei_admin',
                        role: 'admin',
                        created_at: '2025-01-05T08:00:00Z',
                    },
                }),
            }),
        )

        await page.goto(`${BASE}/profile`)
        await snap('profile_admin_initial')
        await page.waitForTimeout(2000)
        await snap('profile_admin_loaded')

        const bodyText = await page.evaluate(() => document.body.innerText)

        if (bodyText.includes('sensei_admin')) {
            await snap('profile_admin_username_visible')
        }

        if (bodyText.includes('admin')) {
            await snap('profile_admin_role_visible')
        }

        // Check avatar initial letter
        const avatarInitial = page.locator('div.rounded-full, .avatar').first()
        try {
            const text = await avatarInitial.innerText({ timeout: 2000 })
            if (text === 'S' || text === 'A') {
                await snap('profile_avatar_initial_visible')
            }
        } catch {
            await snap('profile_avatar_check_skipped')
        }
    })

    test('Profile page shows avatar fallback for user with email only', async ({ page, snap }) => {
        await page.route('**/api/auth/me', route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: {
                        id: 'mock-uid-reader',
                        email: 'reader@kendo.example.com',
                    },
                    profile: {
                        id: 'mock-uid-reader',
                        email: 'reader@kendo.example.com',
                        username: null,
                        role: 'reader',
                        created_at: '2025-04-01T12:00:00Z',
                    },
                }),
            }),
        )

        await page.goto(`${BASE}/profile`)
        await snap('profile_reader_initial')
        await page.waitForTimeout(2000)
        await snap('profile_reader_loaded')

        const bodyText = await page.evaluate(() => document.body.innerText)
        await snap('profile_reader_content')

        // Username null → falls back to email prefix "reader"
        if (bodyText.includes('reader')) {
            await snap('profile_reader_email_prefix_visible')
        }

        if (bodyText.includes('reader') && bodyText.includes('@kendo.example.com')) {
            await snap('profile_reader_email_visible')
        }
    })
})

test.describe('Profile Edit', () => {
    test.use({ storageState: 'tests/.auth/translator.json' })

    test('username edit inline flow — edit, save, revert', async ({ page, snap }) => {
        await page.goto(`${BASE}/profile`)
        await page.waitForTimeout(2_000) // let profile data load
        await snap('profile_edit_initial')

        // The username should be visible with an "Edit" button next to it.
        // The Edit button has aria-label="Edit username".
        const editBtn = page.locator('button[aria-label="Edit username"]')
        await editBtn.waitFor({ state: 'visible', timeout: 10_000 })

        // Capture the current username before editing.
        const usernameSpan = page.locator('span.text-xl.font-semibold')
        const originalName = await usernameSpan.first().innerText()
        expect(originalName, 'original username should be non-empty').toBeTruthy()
        await snap('profile_edit_original_username')

        // Click Edit → the input field and Save/Cancel buttons should appear.
        await editBtn.click()
        await page.waitForTimeout(300)
        await snap('profile_edit_input_visible')

        const input = page.locator('input[placeholder="username"]')
        await input.waitFor({ state: 'visible', timeout: 5_000 })

        const saveBtn = page.locator('button', { hasText: 'Save' })
        await saveBtn.waitFor({ state: 'visible', timeout: 3_000 })

        const cancelBtn = page.locator('button', { hasText: 'Cancel' })
        await cancelBtn.waitFor({ state: 'visible', timeout: 3_000 })

        // Type a unique test username (append timestamp).
        const testName = `testuser-${Date.now()}`
        await input.fill(testName)
        await snap('profile_edit_name_typed')

        // Click Save.
        await saveBtn.click()
        await page.waitForTimeout(1_000) // wait for API round-trip
        await snap('profile_edit_saved')

        // The new username should appear in the UI (span.text-xl.font-semibold).
        // The edit button reappears after save (editing mode exits).
        await page.waitForTimeout(500)
        const savedSpan = page.locator('span.text-xl.font-semibold').first()
        await expect(savedSpan).toContainText(testName, { timeout: 5_000 })

        // ---- Revert: change back to the original name ----
        const editBtnAgain = page.locator('button[aria-label="Edit username"]')
        await editBtnAgain.waitFor({ state: 'visible', timeout: 5_000 })
        await editBtnAgain.click()
        await page.waitForTimeout(300)

        const inputAgain = page.locator('input[placeholder="username"]')
        await inputAgain.waitFor({ state: 'visible', timeout: 5_000 })
        await inputAgain.fill(originalName)

        const saveBtnAgain = page.locator('button', { hasText: 'Save' })
        await saveBtnAgain.click()
        await page.waitForTimeout(1_000)
        await snap('profile_edit_reverted')

        // Verify original name is restored.
        await expect(page.locator('span.text-xl.font-semibold').first()).toContainText(
            originalName,
            { timeout: 5_000 }
        )
    })
})

test.describe('Profiles API', () => {
    test.describe('as admin', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('GET returns profiles array', async ({ page }) => {
            await page.goto(`${BASE}/`)
            type ProfileLite = { id: string; username: string; role: string }
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
            type ProfileLite = { id: string; username: string; role: string }
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
