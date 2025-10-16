/**
 * tests/auth.spec.ts
 *
 * Tests for authentication flow:
 *  - GET /api/auth/me (unauthenticated → null user)
 *  - Login page renders
 *  - Login form submission with invalid credentials
 *  - Login form submission with valid credentials (env-driven)
 *  - Logout
 *
 * Screenshots are taken at every significant UI state.
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123'

test.describe('Authentication', () => {
    test('GET /api/auth/me returns null when not logged in', async ({ page, screenshot }) => {
        await page.goto(`${BASE}/api/auth/me`)
        await screenshot('api_auth_me_response')

        const body = await page.evaluate(() => document.body.innerText)
        const json = JSON.parse(body)
        expect(json.user).toBeNull()
        expect(json.profile).toBeNull()
    })

    test('Login page renders correctly', async ({ page, screenshot }) => {
        await page.goto(`${BASE}/login`)
        await screenshot('login_page_initial')

        // Check for email and password inputs
        await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
        await screenshot('login_inputs_visible')

        await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
        await screenshot('login_password_visible')

        // Check for submit button
        await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")')).toBeVisible()
        await screenshot('login_button_visible')
    })

    test('Login fails with invalid credentials', async ({ page, screenshot }) => {
        await page.goto(`${BASE}/login`)
        await screenshot('login_page_before_fill')

        const emailInput = page.locator('input[type="email"], input[name="email"]').first()
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first()

        await emailInput.fill('invalid@example.com')
        await screenshot('email_filled')

        await passwordInput.fill('wrongpassword')
        await screenshot('password_filled')

        await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click()
        await screenshot('after_submit_invalid')

        // Should still be on login page or show an error
        await page.waitForTimeout(1500)
        await screenshot('after_error_display')

        // Should not have redirected to /documents
        expect(page.url()).not.toContain('/documents')
    })

    test('Login succeeds with valid credentials (skipped if env not set)', async ({ page, screenshot }) => {
        if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
            test.skip()
        }

        await page.goto(`${BASE}/login`)
        await screenshot('login_page_before_valid_login')

        const emailInput = page.locator('input[type="email"], input[name="email"]').first()
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first()

        await emailInput.fill(TEST_EMAIL)
        await screenshot('email_filled_valid')

        await passwordInput.fill(TEST_PASSWORD)
        await screenshot('password_filled_valid')

        await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click()
        await screenshot('after_submit_valid')

        // Wait for redirect
        await page.waitForURL(`${BASE}/documents`, { timeout: 10_000 })
        await screenshot('redirected_to_documents')

        expect(page.url()).toContain('/documents')
    })

    test('/api/auth/logout returns success', async ({ page, screenshot }) => {
        // Call logout via POST (using fetch in page context)
        await page.goto(`${BASE}/`)
        await screenshot('home_before_logout')

        const response = await page.evaluate(async (base: string) => {
            const res = await fetch(`${base}/api/auth/logout`, { method: 'POST' })
            return { status: res.status, body: await res.json() }
        }, BASE)

        await screenshot('after_logout_api_call')

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
    })
})
