/**
 * create-pat.ts
 *
 * Drives the saved Supabase dashboard session to generate a Personal Access
 * Token (PAT) and scrapes its value (shown only once).
 *
 * Output:  appends SUPABASE_ACCESS_TOKEN=<value> to .env.local
 *          plus diagnostic captures pat-before.png, pat-after.png, pat-modal-text.txt
 *
 * Run:     npx tsx scripts/dashboard-recon/create-pat.ts
 */
import { firefox } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ENV_PATH = path.join(HERE, '..', '..', '.env.local');
const SESSION_PATH = path.join(HERE, '.supabase-session.json');
const TOKEN_NAME = 'kendo-migration-runner';
const TOKENS_URL = 'https://supabase.com/dashboard/account/tokens';

(async () => {
  // Pre-flight: refuse to overwrite an existing SUPABASE_ACCESS_TOKEN
  const envContent = fs.readFileSync(ENV_PATH, 'utf8');
  if (/^SUPABASE_ACCESS_TOKEN=/m.test(envContent)) {
    console.error('SUPABASE_ACCESS_TOKEN already exists in .env.local. Aborting.');
    process.exit(1);
  }
  if (!fs.existsSync(SESSION_PATH)) {
    console.error(`Missing ${SESSION_PATH}. Run dashboard-login.ts first.`);
    process.exit(1);
  }

  const browser = await firefox.launch({ headless: false });
  const ctx = await browser.newContext({ storageState: SESSION_PATH });
  const page = await ctx.newPage();

  console.log(`Navigating: ${TOKENS_URL}`);
  await page.goto(TOKENS_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForTimeout(3000);
  if (page.url().includes('/sign-in')) {
    console.error('Session expired. Re-run dashboard-login.ts.');
    await browser.close();
    process.exit(1);
  }
  console.log('Landed at:', page.url());

  await page.screenshot({ path: path.join(HERE, 'pat-before.png'), fullPage: true });

  // Click "Generate new token" (label may vary: "Generate new token", "Generate token", "New token")
  const generateLabels = [
    /Generate new token/i,
    /Generate token/i,
    /New token/i,
    /Create new token/i,
    /Create token/i,
  ];
  let opened = false;
  for (const re of generateLabels) {
    const btn = page.getByRole('button', { name: re }).first();
    try {
      if ((await btn.count()) > 0) {
        console.log(`Clicking button matching: ${re}`);
        await btn.click({ timeout: 5000 });
        opened = true;
        break;
      }
    } catch (e) {
      console.log(`  match ${re} failed:`, (e as Error).message);
    }
  }
  if (!opened) {
    console.error('Could not find a "Generate new token" button. Saving diagnostics.');
    await page.screenshot({ path: path.join(HERE, 'pat-fail.png'), fullPage: true });
    const txt: string = await page.evaluate('document.body.innerText.slice(0, 4000)');
    fs.writeFileSync(path.join(HERE, 'pat-fail-bodytext.txt'), txt);
    await browser.close();
    process.exit(2);
  }

  // Wait for the modal/form input
  await page.waitForTimeout(1200);

  // Find a text input for the token name
  const nameInputCandidates = [
    'input[placeholder*="name" i]',
    'input[name="name"]',
    'input[type="text"]',
    '[role="dialog"] input[type="text"]',
  ];
  let nameFilled = false;
  for (const sel of nameInputCandidates) {
    const loc = page.locator(sel).first();
    try {
      if ((await loc.count()) > 0) {
        await loc.fill(TOKEN_NAME, { timeout: 4000 });
        nameFilled = true;
        console.log(`Filled name into selector: ${sel}`);
        break;
      }
    } catch (e) {
      console.log(`  fill via ${sel} failed:`, (e as Error).message);
    }
  }
  if (!nameFilled) {
    console.error('Could not find an input to type the token name.');
    await page.screenshot({ path: path.join(HERE, 'pat-fail.png'), fullPage: true });
    await browser.close();
    process.exit(3);
  }

  // Submit: look for "Generate token", "Create", "Submit"
  const submitLabels = [/^Generate token$/i, /^Generate$/i, /^Create token$/i, /^Create$/i, /^Submit$/i];
  let submitted = false;
  for (const re of submitLabels) {
    const btn = page.getByRole('button', { name: re }).first();
    try {
      if ((await btn.count()) > 0) {
        console.log(`Clicking submit matching: ${re}`);
        await btn.click({ timeout: 5000 });
        submitted = true;
        break;
      }
    } catch (e) {
      console.log(`  submit ${re} failed:`, (e as Error).message);
    }
  }
  if (!submitted) {
    console.error('Could not find a submit button.');
    await browser.close();
    process.exit(4);
  }

  // Wait for the token to render (it appears once, usually with prefix `sbp_`)
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(HERE, 'pat-after.png'), fullPage: true });

  // Scrape body text and search for `sbp_...`
  const fullText: string = await page.evaluate('document.body.innerText');
  fs.writeFileSync(path.join(HERE, 'pat-modal-text.txt'), fullText.slice(0, 12000));

  // Also scrape input values and code blocks (the token might be in a readonly input).
  const candidates: string[] = await page.evaluate(`
    (function () {
      var out = [];
      var inputs = document.querySelectorAll('input, textarea');
      for (var i = 0; i < inputs.length; i++) {
        var v = inputs[i].value || '';
        if (/sbp_[A-Za-z0-9]{20,}/.test(v)) out.push(v);
      }
      var codes = document.querySelectorAll('code, pre, span');
      for (var j = 0; j < codes.length; j++) {
        var t = (codes[j].innerText || '').trim();
        if (/^sbp_[A-Za-z0-9]{20,}$/.test(t)) out.push(t);
      }
      var bodyMatch = (document.body.innerText || '').match(/sbp_[A-Za-z0-9]{20,}/g);
      if (bodyMatch) for (var k = 0; k < bodyMatch.length; k++) out.push(bodyMatch[k]);
      return out;
    })();
  `);

  const uniq = Array.from(new Set(candidates));
  console.log(`Found ${uniq.length} candidate(s) for PAT.`);
  for (const c of uniq) {
    const masked = c.slice(0, 8) + '...' + c.slice(-6);
    console.log(`  candidate: ${masked} (len=${c.length})`);
  }

  if (uniq.length === 0) {
    console.error('No `sbp_...` token visible. Check pat-after.png and pat-modal-text.txt.');
    console.error('You may need to click a "Reveal" or "Copy" button manually.');
    await browser.close();
    process.exit(5);
  }
  if (uniq.length > 1) {
    console.error('Multiple candidates found; ambiguous. Pick manually from pat-modal-text.txt.');
    console.error('Candidates:', uniq.map(c => c.slice(0, 8) + '...').join(', '));
    await browser.close();
    process.exit(6);
  }

  const token = uniq[0];

  // Verify with the Management API
  console.log('\nVerifying token with GET https://api.supabase.com/v1/projects ...');
  const verifyResp = await fetch('https://api.supabase.com/v1/projects', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`  status: ${verifyResp.status}`);
  if (verifyResp.status !== 200) {
    const body = await verifyResp.text();
    console.error('Verify failed. Body:', body.slice(0, 500));
    console.error('Token NOT saved to .env.local. Inspect pat-after.png.');
    await browser.close();
    process.exit(7);
  }
  console.log('  Token verified — Management API returned 200.');

  // Append to .env.local
  const append = `\n# Personal Access Token for Supabase Management API (created ${new Date().toISOString()})\nSUPABASE_ACCESS_TOKEN=${token}\n`;
  fs.appendFileSync(ENV_PATH, append);
  console.log(`\nAppended SUPABASE_ACCESS_TOKEN to ${ENV_PATH}`);

  await page.waitForTimeout(3000);
  await browser.close();
})();
