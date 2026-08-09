/**
 * tests/global-setup.ts
 *
 * Runs once before all Playwright tests.  For each test role we drive the
 * app's own /login page in a headless browser, capture the resulting
 * authenticated cookies (PocketBase's `pb_auth` cookie) via
 * `context.storageState()`, and write the state to `tests/.auth/<role>.json`.
 *
 * PocketBase edition — uses the app's /api/auth/login endpoint, then
 * captures the `pb_auth` cookie rather than the Supabase `sb-*-auth-token`
 * cookies.
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
 *
 * ## Test credentials
 *
 * PocketBase migrated users all share temp password `TempImport2026!`.
 * Set the env vars below to map role names → real PocketBase user emails.
 *
 *   PB_TEST_ADMIN_EMAIL       (default: admin@kendo-translation.local)
 *   PB_TEST_TRANSLATOR_EMAIL
 *   PB_TEST_READER_EMAIL
 *   PB_TEST_WENQIAN_EMAIL
 *   PB_TEST_PASSWORD          (default: TempImport2026!)
 */

import { firefox, type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

interface RoleCreds {
  role: string;
  email: string;
  password: string;
}

const PB_PASSWORD =
  process.env.PB_TEST_PASSWORD ?? 'TempImport2026!';

const ROLES: RoleCreds[] = [
  {
    role: 'admin',
    email:
      process.env.PB_TEST_ADMIN_EMAIL ??
      'admin@kendo-translation.local',
    password: PB_PASSWORD,
  },
  {
    role: 'translator',
    email:
      process.env.PB_TEST_TRANSLATOR_EMAIL ??
      'translator@kendo-translation.local',
    password: PB_PASSWORD,
  },
  {
    role: 'reader',
    email:
      process.env.PB_TEST_READER_EMAIL ??
      'reader@kendo-translation.local',
    password: PB_PASSWORD,
  },
  {
    role: 'wenqian',
    email:
      process.env.PB_TEST_WENQIAN_EMAIL ?? 'wenqian@kendo-translation.local',
    password: PB_PASSWORD,
  },
];

function authDir(): string {
  const dir = path.join(process.cwd(), 'tests', '.auth');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Remove *.json auth-state files older than FRESH_WINDOW_MS from a
 * previous run.  Fresh files (< 10 min) are kept so partially-successful
 * setups can be reused across runs without re-authenticating.
 */
const FRESH_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function clearStaleAuthState(): void {
  const dir = authDir();
  const now = Date.now();
  let cleared = 0;
  let kept = 0;
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith('.json')) continue;
    const filePath = path.join(dir, entry);
    const { mtimeMs } = fs.statSync(filePath);
    if (now - mtimeMs > FRESH_WINDOW_MS) {
      fs.rmSync(filePath, { force: true });
      cleared++;
    } else {
      kept++;
    }
  }
  if (cleared > 0 || kept > 0) {
    console.log(
      `[global-setup] Cleared ${cleared} stale auth state file(s) from ${dir}` +
        (kept > 0 ? ` (kept ${kept} fresh file(s) < 10 min old)` : ''),
    );
  } else {
    console.log(`[global-setup] No stale auth state files in ${dir}`);
  }
}

async function loginAndSaveState(
  baseURL: string,
  creds: RoleCreds,
): Promise<boolean> {
  const statePath = path.join(authDir(), `${creds.role}.json`);
  if (fs.existsSync(statePath)) {
    const { mtimeMs } = fs.statSync(statePath);
    if (Date.now() - mtimeMs <= FRESH_WINDOW_MS) {
      console.log(
        `[global-setup] ↩ Reusing fresh auth state for ${creds.role} (${creds.email})`,
      );
      return true;
    }
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    const browser = await firefox.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`${baseURL}/login`, {
        waitUntil: 'networkidle',
      });

      await page.waitForSelector('input[type="email"]', {
        state: 'visible',
        timeout: 15_000,
      });

      await page.fill('input[type="email"]', creds.email);
      await page.fill('input[type="password"]', creds.password);

      // Give React's controlled-input onChange handlers a tick to flush.
      await page.waitForTimeout(200);

      // Wait for the PocketBase auth endpoint to return 200
      // (the app POSTs to /api/auth/login, which in turn calls
      // PocketBase's /api/collections/users/auth-with-password).
      const loginResponsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/auth/login') &&
          resp.request().method() === 'POST',
        { timeout: 30_000 },
      );

      await page.click('button[type="submit"]');
      const loginResp = await loginResponsePromise;

      if (loginResp.status() !== 200) {
        const body = await loginResp.text().catch(() => '<unreadable>');
        throw new Error(
          `login API status ${loginResp.status()}: ${body.slice(0, 200)}`,
        );
      }

      // Give the browser a moment to persist the pb_auth cookie
      await page.waitForTimeout(500);

      await context.storageState({ path: statePath });
      console.log(
        `[global-setup] ✓ Saved auth state for ${creds.role} (${creds.email}) → ${statePath}`,
      );
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 2) {
        console.warn(
          `[global-setup] ✗ Login failed for ${creds.role} (${creds.email}) after retry: ${msg}`,
        );
      } else {
        console.warn(
          `[global-setup] ⚠ Attempt ${attempt} failed for ${creds.role} (${creds.email}): ${msg} — retrying…`,
        );
      }
    } finally {
      await context.close();
      await browser.close();
    }
  }

  return false;
}

async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    config.projects[0]?.use?.baseURL ||
    process.env.TEST_BASE_URL ||
    'http://localhost:3000';

  console.log(
    `[global-setup] Authenticating test users against ${baseURL} (PocketBase)`,
  );

  clearStaleAuthState();

  await Promise.all(
    ROLES.map((creds) => loginAndSaveState(baseURL, creds)),
  );
}

export default globalSetup;
