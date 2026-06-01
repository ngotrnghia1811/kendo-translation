/**
 * tests/global-setup.ts
 *
 * Runs once before all Playwright tests.  For each test role we drive the
 * app's own /login page in a headless browser, capture the resulting
 * authenticated cookies (`sb-<projectref>-auth-token`, possibly chunked) via
 * `context.storageState()`, and write the state to `tests/.auth/<role>.json`.
 *
 * Individual tests opt in to a state with:
 *     test.use({ storageState: 'tests/.auth/admin.json' })
 *
 * The custom Camoufox `page` fixture in `tests/helpers/camoufox-fixture.ts`
 * propagates `storageState` from the test config into its self-launched
 * browser context, so the cookies are honoured even when Camoufox is used.
 *
 * Roles that fail to log in are skipped with a warning so the rest of the
 * suite can still proceed.  Tests that require an unavailable role will
 * fail loudly when their storage-state file is missing.
 */

import { firefox, type FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

interface RoleCreds {
    role: string
    email: string
    password: string
}

const ROLES: RoleCreds[] = [
    { role: 'admin', email: 'admin-1@test.com', password: 'test-password' },
    { role: 'translator', email: 'translator-1@test.com', password: 'test-password' },
    { role: 'reader', email: 'reader-1@test.com', password: 'test-password' },
    { role: 'wenqian', email: 'wenqian@test.com', password: '11011995' },
]

function authDir(): string {
    const dir = path.join(process.cwd(), 'tests', '.auth')
    fs.mkdirSync(dir, { recursive: true })
    return dir
}

/**
 * Remove any *.json files left over from a previous run. Stale auth state
 * silently masks login failures (tests opt into a storageState path and
 * happily reuse an old cookie set), making global-setup failures invisible.
 * Clearing up-front means every run produces a faithful pass/fail signal.
 */
function clearStaleAuthState(): void {
    const dir = authDir()
    let cleared = 0
    for (const entry of fs.readdirSync(dir)) {
        if (entry.endsWith('.json')) {
            fs.rmSync(path.join(dir, entry), { force: true })
            cleared++
        }
    }
    console.log(`[global-setup] Cleared ${cleared} stale auth state file(s) from ${dir}`)
}

async function loginAndSaveState(
    baseURL: string,
    creds: RoleCreds,
): Promise<boolean> {
    const browser = await firefox.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
        await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
        await page.fill('input[type="email"]', creds.email)
        await page.fill('input[type="password"]', creds.password)

        // Wait for the Supabase token endpoint to return 200 (auth success)
        // rather than the post-login client-side navigation, which is brittle.
        const tokenResponsePromise = page.waitForResponse(
            (resp) =>
                resp.url().includes('/auth/v1/token') &&
                resp.request().method() === 'POST',
            { timeout: 30_000 },
        )
        await page.click('button[type="submit"]')
        const tokenResp = await tokenResponsePromise

        if (tokenResp.status() !== 200) {
            const body = await tokenResp.text().catch(() => '<unreadable>')
            throw new Error(`auth status ${tokenResp.status()}: ${body.slice(0, 200)}`)
        }

        // Give the browser a brief moment to persist cookies returned by the
        // Supabase client (synchronous in current versions, but defensive).
        await page.waitForTimeout(500)

        const statePath = path.join(authDir(), `${creds.role}.json`)
        await context.storageState({ path: statePath })
        console.log(`[global-setup] ✓ Saved auth state for ${creds.role} (${creds.email}) → ${statePath}`)
        return true
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[global-setup] ✗ Login failed for ${creds.role} (${creds.email}): ${msg}`)
        return false
    } finally {
        await context.close()
        await browser.close()
    }
}

async function globalSetup(config: FullConfig): Promise<void> {
    const baseURL =
        config.projects[0]?.use?.baseURL ||
        process.env.TEST_BASE_URL ||
        'http://localhost:3000'

    console.log(`[global-setup] Authenticating test users against ${baseURL}`)

    clearStaleAuthState()

    for (const creds of ROLES) {
        await loginAndSaveState(baseURL, creds)
        // Brief pause between sequential logins to avoid Supabase rate-limiting
        // the /auth/v1/token endpoint (seen as 15 s timeout on the 3rd login).
        await new Promise((r) => setTimeout(r, 5_000))
    }
}

export default globalSetup
