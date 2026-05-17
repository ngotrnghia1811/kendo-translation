/**
 * One-shot helper: with the saved Supabase-dashboard session, enumerate
 * projects visible to the logged-in account and write them to projects.json.
 *
 * Run with:  npx tsx dashboard-extract.ts
 */
import { firefox } from 'playwright';
import * as fs from 'fs';

const SESSION_PATH = '.supabase-session.json';
const OUT_PATH = 'projects.json';

interface ProjectInfo {
  name: string;
  ref: string;
  url: string;  // full dashboard URL
}

(async () => {
  if (!fs.existsSync(SESSION_PATH)) {
    console.error(`Missing ${SESSION_PATH}. Run dashboard-login.ts first.`);
    process.exit(1);
  }

  const browser = await firefox.launch({ headless: false });
  const ctx = await browser.newContext({ storageState: SESSION_PATH });
  const page = await ctx.newPage();

  // Capture any platform API responses that include project lists
  const apiProjects: any[] = [];
  page.on('response', async (resp) => {
    const u = resp.url();
    if (u.includes('api.supabase.com') && /\/(projects|organizations)/.test(u)) {
      try {
        const ct = resp.headers()['content-type'] || '';
        if (ct.includes('application/json')) {
          const body = await resp.json();
          apiProjects.push({ url: u, status: resp.status(), body });
        }
      } catch { /* ignore */ }
    }
  });

  console.log('Navigating to https://supabase.com/dashboard/projects ...');
  try {
    await page.goto('https://supabase.com/dashboard/projects', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  } catch (e) {
    console.error('goto failed:', (e as Error).message);
    console.error('If you closed the browser window, please re-run and leave it open.');
    process.exit(1);
  }

  // Wait for client-side rendering + any background API calls
  await page.waitForTimeout(5000);

  // If dashboard redirected to /organizations, find the (single) org and follow it
  if (page.url().includes('/dashboard/organizations')) {
    console.log('Redirected to /dashboard/organizations - looking for org link...');
    const orgLinks = await page.evaluate(() => {
      const out: { href: string; text: string }[] = [];
      const links = Array.from(document.querySelectorAll('a[href*="/dashboard/org/"]')) as HTMLAnchorElement[];
      const seen = new Set<string>();
      for (const a of links) {
        if (seen.has(a.href)) continue;
        seen.add(a.href);
        out.push({ href: a.href, text: a.innerText.trim().slice(0, 100) });
      }
      return out;
    });
    console.log(`Found ${orgLinks.length} org link(s):`);
    for (const o of orgLinks) console.log(`  - ${o.text || '(no text)'}  ${o.href}`);

    if (orgLinks.length > 0) {
      const target = orgLinks[0].href;
      console.log(`Following first org: ${target}`);
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForTimeout(5000);
      console.log('After org nav, URL:', page.url());
    }
  }

  console.log('Current URL:', page.url());

  // Strategy 1: scrape DOM for project links
  const domProjects: ProjectInfo[] = await page.evaluate(() => {
    const out: { name: string; ref: string; url: string }[] = [];
    const links = Array.from(document.querySelectorAll('a[href*="/dashboard/project/"]')) as HTMLAnchorElement[];
    const seen = new Set<string>();
    for (const a of links) {
      const m = a.href.match(/\/dashboard\/project\/([a-z0-9-]+)/);
      if (!m) continue;
      const ref = m[1];
      if (seen.has(ref)) continue;
      seen.add(ref);
      // Try to find a human-readable name: first non-empty text in the link or nearest h3/h4
      let name = a.innerText.trim().split('\n')[0] || '';
      if (!name) {
        const card = a.closest('[class*="card"], li, article, div');
        const heading = card?.querySelector('h1, h2, h3, h4') as HTMLElement | null;
        if (heading) name = heading.innerText.trim();
      }
      if (!name) name = ref;
      out.push({ name, ref, url: a.href });
    }
    return out;
  });

  console.log(`\nDOM-scrape found ${domProjects.length} projects:`);
  for (const p of domProjects) console.log(`  - ${p.name}  [ref=${p.ref}]  ${p.url}`);

  // Strategy 2: distill API responses
  console.log(`\nCaptured ${apiProjects.length} relevant API responses.`);
  const apiSummary = apiProjects.map(r => ({
    url: r.url,
    status: r.status,
    body_preview: typeof r.body === 'object'
      ? JSON.stringify(r.body).slice(0, 600)
      : String(r.body).slice(0, 600),
  }));

  fs.writeFileSync(OUT_PATH, JSON.stringify({
    capturedAt: new Date().toISOString(),
    currentUrl: page.url(),
    dom: domProjects,
    api: apiSummary,
  }, null, 2));
  console.log(`\nWrote ${OUT_PATH}`);

  console.log('\nKeeping browser open for 5 seconds for visual confirmation...');
  await page.waitForTimeout(5000);

  await browser.close();
})();
