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
 * Remove *.json auth-state files left over from a **previous** run.
 *
 * We keep any file created/modified within the last FRESH_WINDOW_MS so that
 * a partially-successful setup run doesn't wipe auth files that were just
 * written during the same run (or a run that completed only minutes ago).
 * This prevents Supabase rate-limit cascades where only the first 1-2 logins
 * succeed and subsequent runs can reuse those fresh tokens.
 *
 * Files older than FRESH_WINDOW_MS are still removed so stale cookies don't
 * silently mask real login failures on the next full run.
 */
const FRESH_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

function clearStaleAuthState(): void {
    const dir = authDir()
    const now = Date.now()
    let cleared = 0
    let kept = 0
    for (const entry of fs.readdirSync(dir)) {
        if (!entry.endsWith('.json')) continue
        const filePath = path.join(dir, entry)
        const { mtimeMs } = fs.statSync(filePath)
        if (now - mtimeMs > FRESH_WINDOW_MS) {
            fs.rmSync(filePath, { force: true })
            cleared++
        } else {
            kept++
        }
    }
    if (cleared > 0 || kept > 0) {
        console.log(
            `[global-setup] Cleared ${cleared} stale auth state file(s) from ${dir}` +
            (kept > 0 ? ` (kept ${kept} fresh file(s) < 10 min old)` : ''),
        )
    } else {
        console.log(`[global-setup] No stale auth state files in ${dir}`)
    }
}

async function loginAndSaveState(
    baseURL: string,
    creds: RoleCreds,
): Promise<boolean> {
    // If a fresh auth file already exists for this role, reuse it.
    const statePath = path.join(authDir(), `${creds.role}.json`)
    if (fs.existsSync(statePath)) {
        const { mtimeMs } = fs.statSync(statePath)
        if (Date.now() - mtimeMs <= FRESH_WINDOW_MS) {
            console.log(
                `[global-setup] ↩ Reusing fresh auth state for ${creds.role} (${creds.email})`,
            )
            return true
        }
    }

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

    // Run all logins in parallel — each role gets its own browser instance.
    // This avoids sequential Supabase rate-limiting (seen as 30s timeouts on
    // the 3rd/4th login when run serially even with a 5s pause between them).
    // Roles that already have a fresh auth file are skipped immediately.
    await Promise.all(ROLES.map((creds) => loginAndSaveState(baseURL, creds)))
}

export default globalSetup
