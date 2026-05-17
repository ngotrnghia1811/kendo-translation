/**
 * extract-db-connection.ts  (Path B-revised)
 *
 * Uses the saved dashboard session (`.supabase-session.json`) to:
 *   1. Land on the project's overview page.
 *   2. Click the top-bar "Connect" button to open the connection modal.
 *   3. Scrape host / port / user / dbname / URI templates from the modal.
 *   4. Save to db-connection.json + connect-modal diagnostic captures.
 *
 * The DB password is intentionally NOT recoverable from the dashboard;
 * Supabase shows `[YOUR-PASSWORD]` placeholder. Operator must supply it
 * out-of-band before any pg connection.
 *
 * Output:  db-connection.json, connect-modal.png, connect-modal-text.txt
 * Run:     npx tsx scripts/dashboard-recon/extract-db-connection.ts
 *
 * NOTE: All page.evaluate calls pass the script body as a STRING.
 * tsx/esbuild rewrites function/arrow declarations with __name() helper
 * refs that don't exist in the browser context. String injection bypasses
 * this transform entirely.
 */
import { firefox } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SESSION_PATH = path.join(HERE, '.supabase-session.json');
const OUT_PATH = path.join(HERE, 'db-connection.json');
const MODAL_PNG = path.join(HERE, 'connect-modal.png');
const MODAL_TXT = path.join(HERE, 'connect-modal-text.txt');
const MODAL_ELEMS = path.join(HERE, 'connect-modal-elements.json');

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const LANDING_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}`;

(async () => {
  if (!fs.existsSync(SESSION_PATH)) {
    console.error(`Missing ${SESSION_PATH}. Run dashboard-login.ts first.`);
    process.exit(1);
  }

  const browser = await firefox.launch({ headless: false });
  const ctx = await browser.newContext({ storageState: SESSION_PATH });
  const page = await ctx.newPage();

  console.log(`Navigating: ${LANDING_URL}`);
  await page.goto(LANDING_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForTimeout(3000);

  if (page.url().includes('/sign-in') || page.url().includes('/sign-up')) {
    console.error('Session expired. Re-run dashboard-login.ts.');
    await browser.close();
    process.exit(1);
  }
  console.log('Landed at:', page.url());

  // Find and click the Connect header button. The label is plain "Connect"
  // and lives in the top-right header bar next to "Feedback".
  // Try several selectors in order of specificity.
  const connectSelectors = [
    'button:has-text("Connect")',
    'a:has-text("Connect")',
    '[role="button"]:has-text("Connect")',
  ];
  let clicked = false;
  for (const sel of connectSelectors) {
    const btn = page.locator(sel).first();
    try {
      if (await btn.count() > 0) {
        console.log(`Clicking selector: ${sel}`);
        await btn.click({ timeout: 5000 });
        clicked = true;
        break;
      }
    } catch (e) {
      console.log(`  selector ${sel} failed:`, (e as Error).message);
    }
  }
  if (!clicked) {
    console.error('Could not locate Connect button. Saving diagnostics and exiting.');
    await page.screenshot({ path: MODAL_PNG, fullPage: true });
    const bodyText: string = await page.evaluate('document.body.innerText.slice(0, 6000)');
    fs.writeFileSync(MODAL_TXT, bodyText);
    await browser.close();
    process.exit(2);
  }

  // Wait for the modal/dialog to render. Supabase typically uses
  // role="dialog" or a portal containing connection-string text.
  console.log('Waiting for Connect modal to render...');
  let modalFound = false;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const hasModal: boolean = await page.evaluate(`
      (function () {
        var dlg = document.querySelector('[role="dialog"]');
        if (!dlg) return false;
        var t = dlg.innerText || '';
        return /postgres(?:ql)?:\\/\\//i.test(t) || /Connection string/i.test(t) || /pooler\\.supabase\\.com/i.test(t);
      })();
    `);
    if (hasModal) {
      modalFound = true;
      console.log(`Modal with connection content visible after ${(i + 1) * 0.5}s.`);
      break;
    }
  }
  if (!modalFound) {
    console.log('No dialog with connection content detected; will still scrape whatever is visible.');
  }

  // The Connect modal has a top-level category switcher:
  //   Framework | Direct | ORM | Third-party library | MCP
  // The default is Framework (sample code). We must click "Direct" to expose
  // the actual Postgres connection string(s).
  console.log('\nClicking the "Direct" category switcher...');
  const directCandidates = [
    '[role="dialog"] >> text="Direct"',
    '[role="dialog"] button:has-text("Direct")',
    '[role="dialog"] [role="tab"]:has-text("Direct")',
    '[role="dialog"] [role="radio"]:has-text("Direct")',
    '[role="dialog"] >> text=/^Direct$/',
  ];
  let directClicked = false;
  for (const sel of directCandidates) {
    try {
      const loc = page.locator(sel).first();
      if ((await loc.count()) > 0) {
        await loc.click({ timeout: 4000 });
        directClicked = true;
        console.log(`  Clicked "Direct" via: ${sel}`);
        break;
      }
    } catch (e) {
      console.log(`  selector ${sel} failed:`, (e as Error).message);
    }
  }
  if (!directClicked) {
    console.log('  Could not click "Direct"; will scrape whatever tab is shown.');
  }
  await page.waitForTimeout(1500);

  // Capture modal diagnostics first.
  try {
    await page.screenshot({ path: MODAL_PNG, fullPage: true });
    const modalText: string = await page.evaluate(`
      (function () {
        var dlg = document.querySelector('[role="dialog"]');
        return dlg ? (dlg.innerText || '').slice(0, 8000) : document.body.innerText.slice(0, 8000);
      })();
    `);
    fs.writeFileSync(MODAL_TXT, modalText);
    const elemDump: unknown = await page.evaluate(`
      (function () {
        var root = document.querySelector('[role="dialog"]') || document.body;
        var nodes = root.querySelectorAll('input, textarea, code, pre, button, [role="tab"], a, span');
        var out = [];
        for (var i = 0; i < nodes.length && i < 200; i++) {
          var e = nodes[i];
          out.push({
            tag: e.tagName,
            type: e.type || '',
            role: e.getAttribute('role') || '',
            name: e.name || '',
            id: e.id || '',
            placeholder: e.placeholder || '',
            value: (e.value || '').slice(0, 200),
            text: (e.innerText || '').trim().slice(0, 200),
            ariaSelected: e.getAttribute('aria-selected') || '',
            href: e.href || '',
          });
        }
        return out;
      })();
    `);
    fs.writeFileSync(MODAL_ELEMS, JSON.stringify(elemDump, null, 2));
    console.log(`Saved: ${MODAL_PNG}, ${MODAL_TXT}, ${MODAL_ELEMS}`);
  } catch (e) {
    console.error('Diagnostic capture failed:', (e as Error).message);
  }

  // Also try clicking each tab in the dialog (Direct connection, Transaction
  // pooler, Session pooler, etc.) and re-scrape between tabs. Supabase usually
  // exposes URI variants per tab.
  const tabFindings: Record<string, unknown> = {};
  const tabs: { label: string; selectedFirst: boolean }[] = await page.evaluate(`
    (function () {
      var dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return [];
      var tabs = dlg.querySelectorAll('[role="tab"], button[role="tab"]');
      var out = [];
      for (var i = 0; i < tabs.length; i++) {
        out.push({
          label: (tabs[i].innerText || '').trim(),
          selectedFirst: tabs[i].getAttribute('aria-selected') === 'true',
        });
      }
      return out;
    })();
  `);
  console.log(`Detected ${tabs.length} tabs in modal:`, tabs.map(t => t.label));

  async function scrapeDialog(): Promise<unknown> {
    return await page.evaluate(`
      (function () {
        var out = { uris: [], inputs: [], codes: [] };
        var dlg = document.querySelector('[role="dialog"]') || document.body;
        var pgRe = /postgres(?:ql)?:\\/\\/[^\\s"'\\\`<>]+/gi;
        var hostRe = /([a-z0-9.-]+\\.(?:supabase\\.(?:co|com)|pooler\\.supabase\\.com))/gi;

        // Extract URIs from any text content
        var bodyText = dlg.innerText || '';
        var m;
        var uriSet = {};
        pgRe.lastIndex = 0;
        while ((m = pgRe.exec(bodyText)) !== null) {
          uriSet[m[0]] = true;
        }

        var inputs = dlg.querySelectorAll('input, textarea');
        for (var i = 0; i < inputs.length; i++) {
          var v = inputs[i].value || '';
          if (v) {
            out.inputs.push({
              type: inputs[i].type || '',
              placeholder: inputs[i].placeholder || '',
              ariaLabel: inputs[i].getAttribute('aria-label') || '',
              value: v.slice(0, 400),
            });
            pgRe.lastIndex = 0;
            while ((m = pgRe.exec(v)) !== null) {
              uriSet[m[0]] = true;
            }
          }
        }
        var codes = dlg.querySelectorAll('code, pre, span');
        for (var j = 0; j < codes.length; j++) {
          var ct = (codes[j].innerText || '').trim();
          if (ct.length > 20 && ct.length < 600) {
            if (/postgres(?:ql)?:\\/\\//i.test(ct) || /pooler\\.supabase\\.com/i.test(ct)) {
              out.codes.push({ tag: codes[j].tagName.toLowerCase(), text: ct });
              pgRe.lastIndex = 0;
              while ((m = pgRe.exec(ct)) !== null) {
                uriSet[m[0]] = true;
              }
            }
          }
        }
        out.uris = Object.keys(uriSet);

        // Try to also extract host:port pairs from any text
        var hosts = {};
        hostRe.lastIndex = 0;
        while ((m = hostRe.exec(bodyText)) !== null) {
          hosts[m[0]] = true;
        }
        out.hosts = Object.keys(hosts);

        return out;
      })();
    `);
  }

  // Initial scrape (whichever tab is currently selected).
  const initial = await scrapeDialog();
  tabFindings['__initial'] = initial;
  console.log('Initial-tab scrape:', JSON.stringify(initial, null, 2).slice(0, 1200));

  for (let i = 0; i < tabs.length; i++) {
    const label = tabs[i].label || `tab_${i}`;
    try {
      console.log(`\nClicking tab: "${label}"`);
      // Re-query each iteration since DOM may rerender.
      const tabLoc = page.locator('[role="dialog"] [role="tab"]').nth(i);
      await tabLoc.click({ timeout: 5000 });
      await page.waitForTimeout(1200);
      const data = await scrapeDialog();
      tabFindings[label] = data;
      console.log(`  uris: ${(data as any).uris?.length || 0}, hosts: ${(data as any).hosts?.length || 0}`);
    } catch (e) {
      console.log(`  failed clicking tab "${label}":`, (e as Error).message);
      tabFindings[label] = { error: (e as Error).message };
    }
  }

  // Final screenshot after iterating tabs.
  try {
    await page.screenshot({ path: MODAL_PNG, fullPage: true });
  } catch {}

  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        landedUrl: page.url(),
        projectRef: PROJECT_REF,
        modalFound,
        tabsDetected: tabs,
        tabFindings,
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote ${OUT_PATH}`);

  console.log('\nKeeping browser open 6 seconds for visual inspection...');
  await page.waitForTimeout(6000);
  await browser.close();
})();
