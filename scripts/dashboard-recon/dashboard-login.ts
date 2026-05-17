/**
 * One-shot helper: open Supabase dashboard with headed Firefox, wait for the
 * user to log in, then save the browser session (cookies + storage) to
 * .supabase-session.json and close the browser.
 *
 * Stop signal: the page URL settles to a /dashboard/... path that is NOT a
 * /sign-in or /sign-up URL, for two consecutive 2-second polls. Hard timeout
 * 10 minutes.
 *
 * Run with:  npx tsx dashboard-login.ts
 */
import { firefox } from 'playwright';
import * as fs from 'fs';

const SESSION_PATH = '.supabase-session.json';
const POLL_MS = 2000;
const MAX_WAIT_MS = 10 * 60 * 1000;

function loggedInUrl(u: string): boolean {
  if (!u.startsWith('https://supabase.com/dashboard')) return false;
  if (u.includes('/sign-in')) return false;
  if (u.includes('/sign-up')) return false;
  return true;
}

(async () => {
  const browser = await firefox.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  console.log('Opening https://supabase.com/dashboard ...');
  await page.goto('https://supabase.com/dashboard', { waitUntil: 'domcontentloaded' });

  console.log('Please log in in the opened Firefox window.');
  console.log('I will auto-detect login and save the session.\n');

  const started = Date.now();
  let stableHits = 0;

  while (Date.now() - started < MAX_WAIT_MS) {
    await new Promise(r => setTimeout(r, POLL_MS));
    let currentUrl = '';
    try { currentUrl = page.url(); } catch { /* page may be navigating */ }
    if (loggedInUrl(currentUrl)) {
      stableHits++;
      console.log(`[${Math.round((Date.now() - started) / 1000)}s] logged-in URL detected (${stableHits}/2): ${currentUrl}`);
      if (stableHits >= 2) break;
    } else {
      if (stableHits > 0) console.log('  ... URL changed, resetting');
      stableHits = 0;
    }
  }

  if (stableHits < 2) {
    console.error('Timed out waiting for login.');
    await browser.close();
    process.exit(1);
  }

  console.log('\nSaving session to', SESSION_PATH, '...');
  await ctx.storageState({ path: SESSION_PATH });

  const size = fs.statSync(SESSION_PATH).size;
  console.log(`Saved (${size} bytes). Closing browser.`);

  await browser.close();
})();
