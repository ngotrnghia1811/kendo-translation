// Smoke tests for the Viewer app. Round 44 unit APP, updated in round 49 unit V3.
// Usage:
//   node scripts/smoke.mjs smoke                       real config, GET requests only
//   node scripts/smoke.mjs pause --config FILE --fixture DIR   pause test, fixture folder only
//   node scripts/smoke.mjs htv                         human-translation-view test (unit H1, round 54). Needs a throwaway PocketBase
//                                                      and the env variables HTV_ADMIN_EMAIL, HTV_ADMIN_PASSWORD, HTV_TR1_EMAIL,
//                                                      HTV_TR1_PASSWORD, HTV_TR2_EMAIL, HTV_TR2_PASSWORD, HTV_READER_EMAIL, HTV_READER_PASSWORD.
//                                                      The script never prints a password or a token.
//   node scripts/smoke.mjs deploy                      deploy shape (unit DPC, round 58). No viewer.config.json in the app folder. Set the env variables
//                                                      VIEWER_RUN_SOURCE=pocketbase, VIEWER_POCKETBASE_URL (throwaway server on port 8092 only), VIEWER_MONITOR=off,
//                                                      HTV_TR1_EMAIL, HTV_TR1_PASSWORD, HTV_READER_EMAIL, HTV_READER_PASSWORD. Needs the S2 upload in that server.
//                                                      GET requests, one sign-in per account, and one refused POST. The script never prints a password or a token.
// The script starts `next start` on a free port and stops it at the end.
// Run `npm run build` first. Run the script in a copy of the app, not in the folder of the dev server.
// Mode `pause` sends POST requests. Never run it with the real data folder.
// Mode `htv` writes records into PocketBase (versions, comments, run marks). Point pocketbaseUrl of the config at a throwaway server only.
// A check prints PASS, FAIL, or SKIP. A SKIP names the reason and does not count as a failure.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { promises as fs } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const mode = args[0] ?? "smoke";
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const configFile = opt("--config");
const fixture = opt("--fixture");

function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
    s.on("error", reject);
  });
}

const timings = [];
let failures = 0;
let base = "";

async function get(url, init) {
  const t0 = performance.now();
  const res = await fetch(base + url, init);
  const body = await res.text();
  const ms = performance.now() - t0;
  timings.push({ url, status: res.status, ms: Math.round(ms) });
  return { status: res.status, body, ms, type: res.headers.get("content-type") ?? "" };
}

let skips = 0;

function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
}

function skip(name, reason) {
  skips++;
  console.log(`SKIP  ${name}  ${reason}`);
}

// Text that a reader sees: no script blocks, no tags, one space between words.
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function startServer() {
  const port = await freePort();
  const env = { ...process.env, PORT: String(port) };
  if (configFile) env.VIEWER_CONFIG = path.resolve(configFile);
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(base + "/api/runs");
      if (r.status < 500) return child;
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  throw new Error("Server did not start.\n" + log);
}

async function smoke() {
  const stamp = "20261026T182511Z";
  let r = await get("/");
  check("Runs page 200 and shows the real list", r.status === 200 && r.body.includes(stamp) && r.body.includes("completed with failures"), `${Math.round(r.ms)} ms`);

  r = await get(`/runs/${stamp}`);
  check("Run view 200 and shows 22 pages", r.status === 200 && r.body.includes("men0/p005") && r.body.includes("kendojidai_2014/p0839"), `${Math.round(r.ms)} ms`);

  r = await get("/books");
  check("Books page 200, groups Books and Articles", r.status === 200 && r.body.includes("lifelong_full") && r.body.includes("Articles") && r.body.includes("18d4ac29"), `${Math.round(r.ms)} ms`);
  // Round 48 unit V2: the list rows carry hasMeta and chapterCount only. The Details part loads from /api/books/<id>.
  const booksText = visibleText(r.body);
  check("Books page is small (under 500 KB, no inline metadata)", r.body.length < 500_000, `${Math.round(r.body.length / 1024)} KB`);
  check("Books page rows carry hasMeta and chapterCount", r.body.includes("hasMeta") && r.body.includes("chapterCount"));
  check("Books page: a magazine year shows its chapter count", /Details of kendojidai_2014 and month chapters \(13\)/.test(booksText));
  check("Books page: an article without a metadata row says so", /Details of 18d4ac29 \(no metadata row\)/.test(booksText));
  check("Books page holds no chapter rows (they load on request)", !r.body.includes("kendojidai_2014/2014-01"));

  const run = JSON.parse((await get(`/api/runs/${stamp}`)).body);
  check("Run API gives 22 page rows", run.pages.length === 22, String(run.pages.length));

  let ok = 0;
  for (const p of run.pages) {
    const res = await get(p.href);
    const verdict = p.qa3Verdict;
    const good = res.status === 200 && res.body.includes(p.pageId) && res.body.includes("QA_3") && res.body.includes("Reasoning") && (verdict ? res.body.includes(verdict) : true);
    if (good) ok++;
    check(`Page view ${p.pageId} (${p.href})`, good, `status ${res.status}, QA_3 ${verdict} ${p.qa3Score}, ${Math.round(res.ms)} ms`);
  }
  check("All 22 page views pass", ok === 22, `${ok} of 22`);

  // Page text check: the first ED_3 line of one page must appear in the HTML.
  const first = run.pages.find((p) => p.pageId === "lifelong_full/p140");
  const html = (await get(first.href)).body;
  check("Page view shows ED_3 text and JA text", html.includes("Kufū") && html.includes("工夫"));
  check("Page view shows the 8 cell names", ["Facts", "Meaning and term sense", "Omission and addition", "EN form of kendo terms", "English language", "Style and register", "JA text", "Page structure"].every((n) => html.includes(n)));
  // The page data holds the reasoning text in the script payload. The visible markup must not show it before the owner presses the button.
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, "");
  check("Reasoning text is not in the visible markup before the owner asks", !visible.includes("I read JA L01 to L15") && visible.includes("Reasoning of ED_3"));

  // Extra items, one request each.
  const runRel = first.href.includes("run=") ? `pilot-run/lifelong_full_p140/${decodeURIComponent(first.href.split("run=")[1])}` : "";
  for (const part of ["calls", "messages", "lookup", "failed", "programs", "critiques"]) {
    const e = await get(`/api/page-extra?run=${encodeURIComponent(runRel)}&part=${part}&stage=3`);
    let json = null;
    try {
      json = JSON.parse(e.body);
    } catch {}
    check(`Extra item ${part} 200 with data`, e.status === 200 && json !== null && (Array.isArray(json) ? json.length > 0 || part === "critiques" : Object.keys(json).length > 0), `${Math.round(e.ms)} ms`);
  }

  // Page image.
  const pg = await get(`/api/file?path=${encodeURIComponent("pilot-run/cache/page-images/lifelong_full/page_140.jpeg")}`);
  check("Page image 200 image/jpeg", pg.status === 200 && pg.type.startsWith("image/jpeg"), `${Math.round(pg.ms)} ms`);

  // Path tests.
  for (const bad of ["../", "../../../../etc/passwd", "pilot-run/../../x.json", "/etc/passwd", "pilot-run/..\\..\\x.json"]) {
    const x = await get(`/api/file?path=${encodeURIComponent(bad)}`);
    check(`Path test: ${JSON.stringify(bad)} fails`, x.status === 403 || x.status === 404 || x.status === 415, `status ${x.status}`);
  }
  const x1 = await get("/api/file?path=" + encodeURIComponent("../") );
  check("Path test: ../ gives 403", x1.status === 403, `status ${x1.status}`);
  const x2 = await get("/api/runs/..%2F..%2F");
  check("Path test: bad list name fails", x2.status === 403 || x2.status === 404, `status ${x2.status}`);
  const x3 = await get(`/api/page-extra?run=${encodeURIComponent("pilot-run/../../x")}&part=calls&stage=3`);
  check("Path test: bad run path in page-extra gives 403", x3.status === 403, `status ${x3.status}`);
  const x4 = await get("/runs/..%2F..");
  check("Path test: bad list name page gives 404", x4.status === 404, `status ${x4.status}`);
  const x5 = await get("/api/file?path=" + encodeURIComponent("pilot-run/lists/" + stamp + "/progress.json"));
  check("Inside the folder a json file reads fine", x5.status === 200);

  // Round 49 unit V3: Books Details route.
  const bk = await get("/api/books/kendojidai_2014");
  const bkJson = parseJson(bk.body);
  const chapters = bkJson?.chapters ?? [];
  check("Books API: kendojidai_2014 gives 200 and 13 chapters (front chapter included)", bk.status === 200 && bk.type.includes("json") && Array.isArray(chapters) && chapters.length === 13, `status ${bk.status}, ${chapters.length} chapters, ${Math.round(bk.ms)} ms`);
  check("Books API: kendojidai_2014 has its metadata row", bkJson?.group === "magazine" && bkJson?.meta?.item_id === "kendojidai_2014");
  // The API names the key `webLink` (camel case). The file item-metadata/magazine-chapters.jsonl names it `web_link`.
  const articles = Array.isArray(chapters) ? chapters.flatMap((c) => c.articles ?? []) : [];
  const linked = articles.filter((a) => a.webLink);
  check("Books API: every article of kendojidai_2014 carries the key webLink", articles.length > 0 && articles.every((a) => "webLink" in a), `${articles.length} articles`);
  // The links come from the data. If the data holds no link now, the check cannot run.
  if (linked.length > 0) check("Books API: kendojidai_2014 has an article with a web link that holds a URL", typeof linked[0].webLink.url === "string", `${linked.length} of ${articles.length} articles`);
  else skip("Books API: kendojidai_2014 has an article with a web link that holds a URL", `the data holds no web link for kendojidai_2014 now (0 of ${articles.length} articles)`);
  const bkArticle = await get("/api/books/18d4ac29");
  const bkArticleJson = parseJson(bkArticle.body);
  check("Books API: a web article without a metadata row gives 200 and meta null", bkArticle.status === 200 && bkArticleJson?.group === "article" && bkArticleJson?.meta === null);
  const bk403 = await get("/api/books/..%2Fx");
  check("Books API: bad item name gives 403", bk403.status === 403, `status ${bk403.status}`);
  const bk404 = await get("/api/books/zzz_none");
  check("Books API: unknown item gives 404", bk404.status === 404, `status ${bk404.status}`);

  // Pilot list: memory and compare routes.
  const memNone = await get(`/api/runs/${stamp}/memory`);
  check("Memory API without a book name gives 403", memNone.status === 403, `status ${memNone.status}`);
  const memPilot = await get(`/api/runs/${stamp}/memory?book=lifelong_full`);
  check("Memory API: a list that is not a chain list gives 404", memPilot.status === 404, `status ${memPilot.status}`);
  const cmp = await get(`/api/runs/${stamp}/compare`);
  check("Compare API for the pilot list gives 200 and a JSON array", cmp.status === 200 && Array.isArray(parseJson(cmp.body)), `status ${cmp.status}, ${cmp.body.slice(0, 20)}`);
  const cmpBad = await get("/api/runs/..%2Fx/compare");
  check("Compare API: bad list name gives 403", cmpBad.status === 403, `status ${cmpBad.status}`);

  // Chain list S1. It can still run, so no check reads a count that changes.
  const chainStamp = "20261028T023006Z";
  const chainBooks = ["mental_full", "left_foot_full", "kendojidai_2014"];
  const chainApi = await get(`/api/runs/${chainStamp}`);
  if (chainApi.status !== 200) {
    const why = `list ${chainStamp} not readable (status ${chainApi.status})`;
    for (const name of ["Chain list: Runs page shows the list", "Chain list: run view shows kind, books, and critic mode", "Chain list: run API gives 200", "Chain list: memory API gives 200 for the first book"]) skip(name, why);
  } else {
    const home = visibleText((await get("/")).body);
    check("Chain list: Runs page shows the list as chain with critic session", home.includes(chainStamp) && /chain critic session/.test(home));
    const view = await get(`/runs/${chainStamp}`);
    const text = visibleText(view.body);
    check("Chain list: run view shows kind chain, three books, and critic mode session", view.status === 200 && /List kind chain/.test(text) && /Critic mode session/.test(text) && chainBooks.every((b) => text.includes(b)), `status ${view.status}`);
    const api = parseJson(chainApi.body);
    check("Chain list: run API gives 200 with kind chain and critic mode session", api?.listKind === "chain" && api?.criticMode === "session" && api?.stamp === chainStamp);
    const mem = await get(`/api/runs/${chainStamp}/memory?book=${chainBooks[0]}`);
    const memJson = parseJson(mem.body);
    check("Chain list: memory API gives 200 for the first book", mem.status === 200 && memJson?.book === chainBooks[0] && Array.isArray(memJson?.pages), `status ${mem.status}`);
    const memBad = await get(`/api/runs/${chainStamp}/memory?book=zzz_none`);
    check("Chain list: memory API gives 404 for a book outside the list", memBad.status === 404, `status ${memBad.status}`);
    const memTrav = await get(`/api/runs/${chainStamp}/memory?book=..%2Fx`);
    check("Chain list: memory API gives 403 for a bad book name", memTrav.status === 403, `status ${memTrav.status}`);
    const cmpChain = await get(`/api/runs/${chainStamp}/compare`);
    check("Chain list: compare API gives 200 and a JSON array", cmpChain.status === 200 && Array.isArray(parseJson(cmpChain.body)), `status ${cmpChain.status}`);
  }
}

async function listing(dir) {
  const out = [];
  async function walk(d) {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) await walk(f);
      else out.push(path.relative(dir, f) + ":" + (await fs.stat(f)).size);
    }
  }
  await walk(dir);
  return out.sort();
}

async function pauseTest() {
  if (!fixture) throw new Error("Need --fixture DIR");
  const data = path.join(path.resolve(fixture), "data");
  const runningStamp = "20261027T000000Z";
  const doneStamp = "20261026T182511Z";
  const runDir = path.join(data, "pilot-run/lists", runningStamp);
  const doneDir = path.join(data, "pilot-run/lists", doneStamp);
  const before = await listing(data);

  const post = (stamp, on, headers = {}) => get("/api/pause", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ stamp, on }) });

  let r = await get(`/runs/${runningStamp}`);
  check("Fixture run view shows the Pause button", r.status === 200 && r.body.includes(">Pause<"));
  r = await post(runningStamp, true);
  check("Pause on gives 200", r.status === 200, r.body);
  const pf = path.join(runDir, "PAUSE");
  let txt = "";
  try {
    txt = await fs.readFile(pf, "utf-8");
  } catch {}
  let j = null;
  try {
    j = JSON.parse(txt);
  } catch {}
  check("PAUSE file exists with one JSON line {who, when_utc}", j && j.who === "viewer" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(j.when_utc) && txt.trim().split("\n").length === 1, txt.trim());
  r = await post(runningStamp, true);
  check("Pause on twice keeps the file (no overwrite)", r.status === 200 && (await fs.readFile(pf, "utf-8")) === txt);
  const api = JSON.parse((await get(`/api/runs/${runningStamp}`)).body);
  check("Run API reports pauseFileExists true", api.pauseFileExists === true);
  r = await get(`/runs/${runningStamp}`);
  check("Run view shows Resume and the pause request text", r.body.includes(">Resume<") && r.body.includes("Pause requested"));

  // Simulate the run program: state paused with a start time.
  const progFile = path.join(runDir, "progress.json");
  const prog = JSON.parse(await fs.readFile(progFile, "utf-8"));
  const sinceEpoch = Math.floor(Date.now() / 1000) - 600;
  prog.state = "paused";
  prog.paused_since_epoch = sinceEpoch;
  prog.paused_since_utc = new Date(sinceEpoch * 1000).toISOString().replace(/\.\d+Z$/, "Z");
  await fs.writeFile(progFile, JSON.stringify(prog));
  const d = new Date(sinceEpoch * 1000);
  const hhmm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  r = await get(`/runs/${runningStamp}`);
  check(`Run view shows "Paused since ${hhmm}"`, r.body.includes("Paused since") && r.body.includes(hhmm), "");

  r = await post(runningStamp, false);
  check("Pause off gives 200", r.status === 200, r.body);
  check("PAUSE file is gone", !(await fs.stat(pf).then(() => true, () => false)));
  r = await post(runningStamp, false);
  check("Pause off twice is harmless", r.status === 200);

  r = await post(doneStamp, true);
  check("Pause on a completed list gives 409", r.status === 409, r.body);
  check("No PAUSE file in the completed fixture list", !(await fs.stat(path.join(doneDir, "PAUSE")).then(() => true, () => false)));
  r = await post("../x", true);
  check("Pause with a bad list name gives 403", r.status === 403, r.body);
  r = await post(runningStamp, true, { Origin: "http://evil.example" });
  check("Pause with a foreign Origin gives 403", r.status === 403, r.body);
  r = await get("/api/pause", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "x" });
  check("Pause with a non-JSON body gives 415", r.status === 415, r.body);

  // Restore progress.json to the running state for the listing compare, then compare folder listings.
  prog.state = "running";
  prog.paused_since_epoch = null;
  prog.paused_since_utc = null;
  await fs.writeFile(progFile, JSON.stringify(prog));
  const after = await listing(data);
  const diff = after.filter((x) => !before.includes(x)).concat(before.filter((x) => !after.includes(x)));
  check("Fixture folder holds the same files as before (no PAUSE left, nothing else written)", diff.length === 0 || (diff.length === 2 && diff.every((x) => x.includes("progress.json"))), diff.join(", "));
}


// ---------------------------------------------------------------- mode htv (unit H1, round 54)

// A client with a cookie jar. It sends no Origin header, like a script. The cookie value never goes into a check detail.
class Client {
  constructor(label) {
    this.label = label;
    this.jar = new Map();
  }
  async req(url, { method = "GET", json, headers = {}, port } = {}) {
    const h = { ...headers };
    if (this.jar.size) h.cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
    if (json !== undefined) h["content-type"] = "application/json";
    const t0 = performance.now();
    const res = await fetch((port ? `http://127.0.0.1:${port}` : base) + url, { method, headers: h, body: json === undefined ? undefined : JSON.stringify(json), redirect: "manual" });
    const body = await res.text();
    timings.push({ url: `${method} ${url.split("?")[0]}`, status: res.status, ms: Math.round(performance.now() - t0) });
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of setCookies) {
      const kv = c.split(";")[0];
      const i = kv.indexOf("=");
      const k = kv.slice(0, i);
      const v = kv.slice(i + 1);
      if (v === "" || /max-age=0/i.test(c) || /expires=thu, 01 jan 1970/i.test(c)) this.jar.delete(k);
      else this.jar.set(k, v);
    }
    return { status: res.status, body, setCookies, location: res.headers.get("location") ?? "", json: parseJson(body) };
  }
  token() {
    return this.jar.get("htv_token") ?? "";
  }
}

// Text of an HTML page for the htv checks. React writes `<!-- -->` between two text parts, so remove it before the tags go.
function htvText(html) {
  return visibleText(html.replace(/<!--[\s\S]*?-->/g, ""));
}

function envPair(name) {
  const email = process.env[`HTV_${name}_EMAIL`];
  const password = process.env[`HTV_${name}_PASSWORD`];
  if (!email || !password) throw new Error(`Set the env variables HTV_${name}_EMAIL and HTV_${name}_PASSWORD.`);
  return { email, password };
}

async function pbCall(pbUrl, method, urlPath, token, json) {
  const res = await fetch(pbUrl + urlPath, { method, headers: { "content-type": "application/json", ...(token ? { authorization: token } : {}) }, body: json === undefined ? undefined : JSON.stringify(json) });
  const text = await res.text();
  return { status: res.status, json: parseJson(text) };
}

// Checks of the pane settings and the theme in the account.
async function settingsChecks({ c1, c2, ca, cr, anon, accounts, pbUrl }) {
  const countOf = (html, re) => (html.match(re) ?? []).length;
  const URL14 = "/translate/mental_full?at=p014";
  // the sanitizer and the contrast formula (lib/htv-settings.ts has no import, so Node loads it)
  const { pathToFileURL } = await import("node:url");
  const lib = await import(pathToFileURL(path.resolve("lib/htv-settings.ts")).href);
  const dirty = lib.sanitizeSettings({ v: 9, panes: { tl3: { font: "serif", size: 99, line: 0.1, width: 9999, color: { light: "#112233", dark: "red" }, bg: { dark: "#AABBCC" }, evil: 1 }, ja: { font: "sans", width: 10 }, nope: { size: 14 }, own: "x" } });
  check("Settings: the sanitizer keeps a valid font, clamps size, line height and width to the limits, and drops bad colors, unknown fonts, and unknown panes", dirty.panes.tl3?.font === "serif" && dirty.panes.tl3.size === 28 && dirty.panes.tl3.line === 1.2 && dirty.panes.tl3.width === 720 && dirty.panes.tl3.color?.light === "#112233" && dirty.panes.tl3.color?.dark === undefined && dirty.panes.tl3.bg?.dark === "#aabbcc" && dirty.panes.ja?.font === undefined && dirty.panes.ja?.width === 30 && !("nope" in dirty.panes) && !("own" in dirty.panes) && !("evil" in (dirty.panes.tl3 ?? {})), JSON.stringify(dirty));
  check("Settings: the contrast ratio of black on white is 21 to 1, of #777777 on #888888 is below 4.5 to 1, and the theme colors pass 4.5 to 1", Math.abs(lib.contrastRatio("#000000", "#ffffff") - 21) < 0.01 && lib.contrastRatio("#777777", "#888888") < 4.5 && lib.paneContrast(undefined, "light") > 4.5 && lib.paneContrast(undefined, "dark") > 4.5 && lib.paneContrast({ color: { dark: "#333333" } }, "dark") < 4.5);
  check("Settings: the default theme constant is light (DEFAULT_THEME)", lib.DEFAULT_THEME === "light");

  // the route
  let r = await anon.req("/api/htv/settings");
  check("Settings route: GET without sign-in gives 401", r.status === 401, `status ${r.status}`);
  r = await anon.req("/api/htv/settings", { method: "PUT", json: { panes: {} } });
  check("Settings route: PUT without sign-in gives 401", r.status === 401, `status ${r.status}`);
  r = await c1.req("/api/htv/settings");
  check("Settings route: a new account has no settings (empty panes, no theme)", r.status === 200 && JSON.stringify(r.json?.panes) === JSON.stringify({ v: 1, panes: {} }) && r.json?.theme === null, JSON.stringify(r.json));
  r = await c1.req("/api/htv/settings", { method: "PUT", json: { panes: { v: 1, panes: { tl3: { font: "serif", size: 18, line: 1.8, width: 520, color: { dark: "#ffee00" } }, ja: { font: "gothic", size: 20, width: 40 }, own: { size: 22, bg: { light: "#ffffe0" } } } } } });
  check("Settings route: tr1 saves the settings of 3 panes (200)", r.status === 200 && r.json?.ok === true && r.json?.panes?.panes?.tl3?.width === 520, `status ${r.status}`);
  r = await c1.req("/api/htv/settings", { method: "PUT", json: { panes: { v: 1, panes: { tl3: { size: 40, width: 100, font: "comic" } } } } });
  check("Settings route: a second save changes the same record, clamps size to 28 and width to 280, and drops the unknown font", r.status === 200 && r.json?.panes?.panes?.tl3?.size === 28 && r.json.panes.panes.tl3.width === 280 && r.json.panes.panes.tl3.font === undefined && r.json.panes.panes.ja === undefined, JSON.stringify(r.json?.panes));
  r = await c1.req("/api/htv/settings", { method: "PUT", json: { panes: { v: 1, panes: { tl3: { font: "serif", size: 18, line: 1.8, width: 520, color: { dark: "#ffee00" } }, ja: { font: "gothic", size: 20, width: 40 }, own: { size: 22, bg: { light: "#ffffe0" } } } } } });
  r = await c1.req("/api/htv/settings");
  check("Settings route: GET gives back the saved settings", r.status === 200 && r.json?.panes?.panes?.ja?.font === "gothic" && r.json.panes.panes.tl3.color?.dark === "#ffee00" && r.json.panes.panes.own?.bg?.light === "#ffffe0", JSON.stringify(r.json?.panes));
  r = await c1.req("/api/htv/settings", { method: "PUT", json: {} });
  check("Settings route: PUT without panes gives 400", r.status === 400, `status ${r.status}`);
  r = await c1.req("/api/htv/settings", { method: "PUT", json: { panes: {} }, headers: { origin: "http://evil.example" } });
  check("Settings route: PUT with a foreign Origin gives 403", r.status === 403, `status ${r.status}`);

  // the first paint uses the settings of the account
  r = await c1.req(URL14);
  let html = r.body;
  check("Settings in the account: the panel of tr1 has the width 520 px and the font size 18 px at the first paint", /data-panel-width="520"/.test(html) && /<aside[^>]*style="[^"]*width:\s*520px/.test(html) && /<aside[^>]*font-size:\s*18px/.test(html), "");
  check("Settings in the account: the JA pane of tr1 has the share 40 percent and font size 20 px (3 rows)", countOf(html, /grid-template-columns:\s*40fr 60fr/g) === 3 && countOf(html, /data-pane="ja"[^>]*>/g) === 3 && /font-size:\s*20px/.test(html));
  check("Cog: every pane of the translator view has a cog (ja x3, agent x3, own x3, tl3 x1, versions x1)", countOf(html, /data-cog="ja"/g) === 3 && countOf(html, /data-cog="agent"/g) === 3 && countOf(html, /data-cog="own"/g) === 3 && countOf(html, /data-cog="tl3"/g) === 1 && countOf(html, /data-cog="versions"/g) === 1, ["ja", "agent", "own", "tl3", "versions"].map((x) => `${x}:${countOf(html, new RegExp(`data-cog="${x}"`, "g"))}`).join(" "));
  r = await c1.req("/translate");
  check("Cog: the book list has a cog (pane list)", countOf(r.body, /data-cog="list"/g) === 1);
  r = await c2.req(URL14);
  check("Settings are private: tr2 sees the default panel width 416 px, not the settings of tr1", /data-panel-width="416"/.test(r.body) && !/data-panel-width="520"/.test(r.body) && !/font-size:\s*18px/.test(r.body));
  r = await c2.req("/api/htv/settings");
  check("Settings are private: GET /api/htv/settings of tr2 gives the empty settings", r.status === 200 && JSON.stringify(r.json?.panes?.panes) === "{}", JSON.stringify(r.json?.panes));

  // PocketBase rules of user_settings: own record only
  const own1 = await pbCall(pbUrl, "GET", "/api/collections/user_settings/records", c1.token());
  const rec1 = own1.json?.items?.[0];
  check("PocketBase: tr1 lists exactly the own settings record", own1.status === 200 && own1.json?.totalItems === 1 && !!rec1?.id && rec1.panes?.panes?.tl3?.width === 520, `status ${own1.status}, items ${own1.json?.totalItems}`);
  const own2 = await pbCall(pbUrl, "GET", "/api/collections/user_settings/records", c2.token());
  check("PocketBase: tr2 lists no record of tr1", own2.status === 200 && (own2.json?.items ?? []).every((x) => x.id !== rec1?.id), `items ${own2.json?.totalItems}`);
  const view2 = await pbCall(pbUrl, "GET", `/api/collections/user_settings/records/${rec1?.id}`, c2.token());
  check("PocketBase: tr2 cannot view the record of tr1 (404 or 403)", view2.status === 404 || view2.status === 403, `status ${view2.status}`);
  const patch2 = await pbCall(pbUrl, "PATCH", `/api/collections/user_settings/records/${rec1?.id}`, c2.token(), { theme: "dark" });
  check("PocketBase: tr2 cannot change the record of tr1 (404 or 403)", patch2.status === 404 || patch2.status === 403, `status ${patch2.status}`);
  const del2 = await pbCall(pbUrl, "DELETE", `/api/collections/user_settings/records/${rec1?.id}`, c2.token());
  const del1 = await pbCall(pbUrl, "DELETE", `/api/collections/user_settings/records/${rec1?.id}`, c1.token());
  check("PocketBase: nobody deletes a settings record with a user token (the delete rule is null)", [del1.status, del2.status].every((x) => x === 403 || x === 404), `tr1 ${del1.status}, tr2 ${del2.status}`);
  const create2 = await pbCall(pbUrl, "POST", "/api/collections/user_settings/records", c2.token(), { user: rec1?.user, theme: "dark" });
  check("PocketBase: tr2 cannot create a record for tr1 (400 or 403)", create2.status === 400 || create2.status === 403, `status ${create2.status}`);
  const move1 = await pbCall(pbUrl, "PATCH", `/api/collections/user_settings/records/${rec1?.id}`, c1.token(), { user: (await pbCall(pbUrl, "GET", `/api/collections/users/records?filter=${encodeURIComponent(`email="${accounts.tr2.email}"`)}`, ca.token())).json?.items?.[0]?.id });
  check("PocketBase: tr1 cannot give the own record to another user (the rule refuses a change of user)", move1.status === 400 || move1.status === 403 || move1.status === 404, `status ${move1.status}`);
  const dup1 = await pbCall(pbUrl, "POST", "/api/collections/user_settings/records", c1.token(), { user: rec1?.user, theme: "light" });
  check("PocketBase: a second record for the same user is refused (unique index)", dup1.status === 400, `status ${dup1.status}`);
  const anonList = await pbCall(pbUrl, "GET", "/api/collections/user_settings/records", "");
  check("PocketBase: without a token the list is empty or refused", anonList.status === 403 || anonList.status === 401 || (anonList.status === 200 && anonList.json?.totalItems === 0), `status ${anonList.status}`);

  // the reader keeps settings too (a reader has the same screen)
  r = await cr.req("/api/htv/settings", { method: "PUT", json: { panes: { v: 1, panes: { agent: { size: 24 } } } } });
  check("Reader: PUT /api/htv/settings works (200), the reader keeps settings too", r.status === 200 && r.json?.panes?.panes?.agent?.size === 24, `status ${r.status}`);
  r = await cr.req(URL14);
  check("Reader: the agent pane has the font size 24 px, the cog shows on ja x3, agent x3, tl3 x1, and not on own", /font-size:\s*24px/.test(r.body) && countOf(r.body, /data-cog="ja"/g) === 3 && countOf(r.body, /data-cog="agent"/g) === 3 && countOf(r.body, /data-cog="tl3"/g) === 1 && countOf(r.body, /data-cog="own"/g) === 0);

  // the theme in the account (step C and step E)
  const th = await c1.req("/api/theme", { method: "PUT", json: { theme: "dark" } });
  check("Theme in the account: PUT /api/theme with sign-in saves the theme in user_settings (account true)", th.status === 200 && th.json?.account === true, `status ${th.status}, ${th.body}`);
  r = await c1.req("/api/htv/settings");
  check("Theme in the account: GET /api/htv/settings gives theme dark, and the pane settings stay", r.json?.theme === "dark" && r.json?.panes?.panes?.ja?.font === "gothic", JSON.stringify(r.json));
  const again = new Client("tr1 second device");
  const lg = await again.req("/api/htv/login", { method: "POST", json: accounts.tr1 });
  const themeCookie = lg.setCookies.find((x) => x.startsWith("theme=")) ?? "";
  check("Theme in the account: a sign-in on a second device sets the cookie theme=dark from the account", lg.status === 200 && /theme=dark/.test(themeCookie), `status ${lg.status}`);
  r = await again.req("/translate");
  check("Theme in the account: the first HTML of the second device has data-theme=\"dark\"", /<html[^>]*data-theme="dark"/.test(r.body));
  await c1.req("/api/theme", { method: "PUT", json: { theme: "light" } });
  r = await c1.req("/api/htv/settings");
  check("Theme in the account: the switch back to light is saved too, and the pane settings stay", r.json?.theme === "light" && r.json?.panes?.panes?.tl3?.width === 520);
  const rt = await cr.req("/api/theme", { method: "PUT", json: { theme: "dark" } });
  check("Theme in the account: a reader keeps the theme in the account too", rt.status === 200 && rt.json?.account === true, `status ${rt.status}`);
}

// Checks of the book screen. They run in both run sources (files and pocketbase).
async function bookScreenChecks({ c1, ca, cr, anon }) {
  const LF = "left_foot_full";
  const countOf = (html, re) => (html.match(re) ?? []).length;
  const keysOf = (html) => new Set([...html.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1]));

  // redirect of the old page URL
  let r = await c1.req(`/translate/${LF}/p048`);
  check("Old page URL /translate/left_foot_full/p048 redirects (307) to /translate/left_foot_full?at=p048#p048", r.status === 307 && r.location === `/translate/${LF}?at=p048#p048`, `status ${r.status}, location ${r.location}`);
  r = await c1.req("/translate/kendojidai_2014/p0839");
  check("Old page URL with a 4-digit page ID redirects to ?at=p0839#p0839", r.status === 307 && r.location === "/translate/kendojidai_2014?at=p0839#p0839", `location ${r.location}`);
  r = await c1.req(`/translate/${LF}/x48`);
  check("Old page URL with a bad page name gives 404", r.status === 404, `status ${r.status}`);
  r = await anon.req(`/translate/${LF}`);
  check("Not signed in: the book screen redirects to the sign-in page", r.status === 307 && r.location.includes("/translate/sign-in"), `status ${r.status}`);

  // the page index of left_foot_full: 120 pages, 6 tagged
  r = await c1.req(`/translate/${LF}`);
  let html = r.body;
  let text = htvText(html);
  check("Book screen left_foot_full: 120 page sections in order p001 to p120", r.status === 200 && countOf(html, /data-section="p\d+"/g) === 120 && /data-section="p001"/.test(html) && /data-section="p120"/.test(html) && !/data-section="p121"/.test(html), `status ${r.status}`);
  check("Book screen left_foot_full: 114 pages carry the tag 'No agent translation' and 6 carry a verdict", countOf(html, /data-untagged/g) === 114 && countOf(html, /data-index-tag="(PASS|FAIL)"/g) === 6 && text.includes("No agent translation"), `${countOf(html, /data-untagged/g)} untagged, ${countOf(html, /data-index-tag=/g)} tagged`);
  check("Book screen left_foot_full: the index lists 120 pages with the box 'Go to page'", countOf(html, /data-index-page="p\d+"/g) === 120 && /Go to page/.test(text) && /id="go-to-page"/.test(html));
  check("Book screen left_foot_full: the header says 120 pages and 6 with an agent translation, and links to p046", /120 pages\. 6 pages have an agent translation/.test(text) && /href="#p046"[^>]*data-first-tagged|data-first-tagged[^>]*href="#p046"/.test(html));
  check("Book screen left_foot_full: an untranslated page shows no rows, no own box, no image", countOf(html, /aria-label="Own translation for /g) === 0 && countOf(html, /<img/g) === 0 && countOf(html, /data-row="/g) === 0);
  check("Book screen left_foot_full without ?at: tagged pages far from the top say 'Loading the rows' and the panel says 'No agent run for this page.'", countOf(html, /data-loading/g) === 6 && /No agent run for this page\./.test(text) && /data-panel-page="p001"/.test(html));

  // the window around p048: p046 to p050
  r = await c1.req(`/translate/${LF}?at=p048`);
  html = r.body;
  text = htvText(html);
  const keys = keysOf(html);
  const perPage = (p) => [...keys].filter((k) => k.startsWith(`${LF}/${p}/`)).length;
  check("Book screen ?at=p048: the server loads the window p046 to p050 (rows for each of the 5 pages), and p075 waits (Loading)", r.status === 200 && ["p046", "p047", "p048", "p049", "p050"].every((p) => perPage(p) >= 1) && perPage("p075") === 0 && countOf(html, /data-loading/g) === 1, ["p046", "p047", "p048", "p049", "p050"].map((p) => `${p}:${perPage(p)}`).join(" "));
  check("Book screen ?at=p048: the panel shows the page at ?at (p048)", /data-panel-page="p048"/.test(html) && /TL_3 information panel/.test(text));
  check("Book screen ?at=p048: each loaded page section has its own Save, own version line, and own comments button (translator)", countOf(html, /data-save="/g) === 5 && countOf(text.replace(/\s+/g, " "), /No saved version yet/g) >= 1 && countOf(text, /Comments \(\d+\)/g) >= 5);
  r = await c1.req(`/translate/${LF}?at=p999`);
  check("Book screen with ?at outside the book (p999) gives 200 and starts at the top", r.status === 200 && /data-panel-page="p001"/.test(r.body), `status ${r.status}`);
  r = await c1.req(`/translate/${LF}?at=zzz`);
  check("Book screen with a bad ?at gives 200", r.status === 200, `status ${r.status}`);
  r = await c1.req("/translate/zzz_none");
  check("An unknown book gives 404", r.status === 404, `status ${r.status}`);
  r = await c1.req("/translate/..%2Fx");
  check("A bad book name gives 404", r.status === 404, `status ${r.status}`);

  // the web article and 4-digit page IDs
  r = await c1.req("/translate/18d4ac29?at=p001");
  check("Book screen of the web article 18d4ac29: one page section p001 with rows", r.status === 200 && countOf(r.body, /data-section="p\d+"/g) === 1 && keysOf(r.body).size >= 1 && !r.body.includes("20261026T005532Z"), `status ${r.status}`);
  r = await c1.req("/translate/kendojidai_2014");
  check("Book screen kendojidai_2014: 1051 sections with 4-digit IDs p0001 to p1051, 6 tagged", r.status === 200 && countOf(r.body, /data-section="p\d{4}"/g) === 1051 && /data-section="p1051"/.test(r.body) && countOf(r.body, /data-index-tag=/g) === 6, `status ${r.status}`);

  // month headings of a magazine year (October 2014 = p778 to p868)
  const headings = [...r.body.matchAll(/data-chapter="(\d+)"[^>]*>([^<]*)</g)].map((m) => ({ start: Number(m[1]), title: m[2] }));
  check("Month headings: kendojidai_2014 has 13 chapter headings, and October 2014 starts at p778", headings.length === 13 && headings.some((h) => h.start === 778 && h.title === "October 2014"), headings.map((h) => `${h.start}:${h.title}`).join(", "));
  const oct = headings.findIndex((h) => h.start === 778);
  check("Month headings: the next heading (November 2014) starts at p869, so October 2014 is p778 to p868 and holds p0794 to p0798 and p0839", oct >= 0 && headings[oct + 1]?.start === 869 && [794, 795, 796, 797, 798, 839].every((n) => n >= 778 && n < 869));
  check("Month headings sit before their first page section, and the index shows them", r.body.indexOf('data-chapter="778"') < r.body.indexOf('data-section="p0778"') && r.body.indexOf('data-section="p0777"') < r.body.indexOf('data-chapter="778"') && /data-index-chapter="778"/.test(r.body));
  const y12 = await c1.req("/translate/kendojidai_2012");
  check("Month headings: kendojidai_2012 has 13 chapter headings and left_foot_full has none", countOf(y12.body, /data-chapter="/g) === 13 && countOf(html, /data-chapter="/g) === 0, `${countOf(y12.body, /data-chapter="/g)} headings`);

  // the route /api/htv/page
  r = await c1.req(`/api/htv/page?ids=${LF}/p048,${LF}/p001`);
  const pages = r.json?.pages ?? [];
  check("GET /api/htv/page gives the page data of p048 (rows, panel) and null for the untranslated page p001", r.status === 200 && pages.length === 2 && pages[0].data?.rows?.length >= 1 && pages[0].data?.panel?.available === true && pages[1].data === null && pages[1].n === 1, `status ${r.status}`);
  r = await c1.req("/api/htv/page");
  check("GET /api/htv/page without ids gives 400", r.status === 400, `status ${r.status}`);
  r = await c1.req(`/api/htv/page?ids=${Array.from({ length: 9 }, (_, i) => `${LF}/p00${i + 1}`).join(",")}`);
  check("GET /api/htv/page with 9 pages gives 400 (8 at most)", r.status === 400, `status ${r.status}`);
  r = await c1.req("/api/htv/page?ids=left_foot_full/../x");
  check("GET /api/htv/page with a bad page ID gives 403", r.status === 403, `status ${r.status}`);
  r = await anon.req(`/api/htv/page?ids=${LF}/p048`);
  check("GET /api/htv/page without sign-in gives 401", r.status === 401, `status ${r.status}`);

  // Save per page section: own version numbers for each page
  const rowsOf = async (page) => (await c1.req(`/api/htv/page?ids=${LF}/${page}`)).json?.pages?.[0]?.data?.rows ?? [];
  const r48 = await rowsOf("p048");
  const r49 = await rowsOf("p049");
  const run48 = (await c1.req(`/api/htv/page?ids=${LF}/p048`)).json.pages[0].data.runId;
  const run49 = (await c1.req(`/api/htv/page?ids=${LF}/p049`)).json.pages[0].data.runId;
  const save2 = (page, run, rows, texts) => c1.req("/api/htv/save", { method: "POST", json: { pageId: `${LF}/${page}`, runId: run, rows: rows.map((x, i) => ({ groupKey: x.key, text: texts[i] ?? "", agree: texts[i] === undefined })) } });
  let a = await save2("p048", run48, r48, r48.map((_, i) => (i === 0 ? "UXC own text p048" : undefined)));
  let b = await save2("p049", run49, r49, r49.map(() => undefined));
  let c = await save2("p048", run48, r48, r48.map((_, i) => (i === 1 ? "UXC own text p048 again" : undefined)));
  check("Save per page section: p048 gets version 1, p049 gets its own version 1, and the second save of p048 gets version 2", a.status === 200 && a.json?.version === 1 && b.status === 200 && b.json?.version === 1 && c.status === 200 && c.json?.version === 2 && a.json?.count === r48.length && b.json?.count === r49.length, `${a.status}/${a.json?.version}, ${b.status}/${b.json?.version}, ${c.status}/${c.json?.version}`);
  r = await c1.req(`/api/htv/page?ids=${LF}/p048,${LF}/p049`);
  const got = r.json?.pages ?? [];
  check("The route gives the saved versions of each page: p048 has 2 versions, p049 has 1 version where every row is ticked, and the newest rows", got[0]?.versions?.length === 2 && got[1]?.versions?.length === 1 && got[1]?.versions[0]?.agreed === r49.length && got[0]?.rows?.length === r48.length && got[1]?.rows?.every((x) => x.agree === true));
  r = await c1.req(`/translate/${LF}?at=p048`);
  html = r.body;
  text = htvText(html);
  check("The book screen shows the saved version in the section of p048 (Version 2 is in the boxes) and in the section of p049 (Version 1)", /Version 2 is in the boxes/.test(text) && /Version 1 is in the boxes/.test(text) && html.includes("UXC own text p048 again"));
  r = await ca.req(`/translate/${LF}?at=p048`);
  text = htvText(r.body);
  check("Admin run mark: the control shows once in each loaded page section (5 sections)", countOf(text, /Use this run for the page/g) === 5 && countOf(r.body, /data-save="/g) === 5, `${countOf(text, /Use this run for the page/g)} controls`);
  r = await c1.req(`/translate/${LF}?at=p048`);
  check("Admin run mark: a translator sees no control in any section", !/Use this run for the page/.test(htvText(r.body)));
  r = await ca.req(`/api/htv/page?ids=${LF}/p048`);
  check("Own versions stay with the account: the admin sees no version of the translator in p048", r.status === 200 && (r.json?.pages?.[0]?.versions?.length ?? -1) === 0);

  // reader: read-only on the book screen
  r = await cr.req(`/translate/${LF}?at=p048`);
  html = r.body;
  text = htvText(html);
  check("Reader on the book screen: rows, JA and agent text, the panel, and the tags, but no own box, no tick, no Save, no comments, no saved data", r.status === 200 && keysOf(html).size >= 5 && !/aria-label="Own translation for /.test(html) && !/data-agree=/.test(html) && !/data-save=/.test(html) && !/Comments \(\d+\)/.test(text) && !/Version history/.test(text) && countOf(text, /can read only/g) === 1 && /data-panel-page="p048"/.test(html));
  r = await cr.req(`/api/htv/page?ids=${LF}/p048`);
  check("Reader: GET /api/htv/page gives the rows but no versions, no saved rows, no comments", r.status === 200 && r.json?.pages?.[0]?.data?.rows?.length >= 1 && r.json.pages[0].versions.length === 0 && r.json.pages[0].rows.length === 0 && r.json.pages[0].comments.length === 0);
}

async function htvTest() {
  const accounts = { admin: envPair("ADMIN"), tr1: envPair("TR1"), tr2: envPair("TR2"), reader: envPair("READER") };
  const cfg = JSON.parse(await fs.readFile(configFile ? path.resolve(configFile) : path.resolve("viewer.config.json"), "utf-8"));
  const pbUrl = (cfg.pocketbaseUrl ?? "http://127.0.0.1:8090").replace(/\/+$/, "");
  const dataDir = path.resolve(cfg.translatorDataDir);
  check("Config points at a throwaway PocketBase (port 8092)", pbUrl === "http://127.0.0.1:8092", pbUrl);
  const P14 = "mental_full/p014";
  const K1 = `${P14}/ts3/L01-L08`;
  const K2 = `${P14}/ts3/L09-L13`;
  const K3 = `${P14}/ts3/L14-L15`;
  const RUN_NEW = "20261028T023007Z-r41";
  const RUN_OLD = "20261026T195046Z-r41";
  // Unit UXC step D: one screen for each book. The old page URL redirects to the book screen with ?at=.
  const P14URL = "/translate/mental_full?at=p014";
  const login = async (who) => {
    const c = new Client(who);
    const r = await c.req("/api/htv/login", { method: "POST", json: accounts[who] });
    return { c, r };
  };

  // --- not signed in
  const anon = new Client("anon");
  let r = await anon.req("/translate");
  check("Not signed in: /translate redirects to the sign-in page", r.status === 307 && r.location.includes("/translate/sign-in"), `status ${r.status}`);
  r = await anon.req(`/translate/${P14}`);
  check("Not signed in: a page redirects and keeps the way back", r.status === 307 && r.location.includes("/translate/sign-in") && r.location.includes("next="), `status ${r.status}`);
  r = await anon.req("/translate/sign-in");
  check("Sign-in page 200 with email and password fields", r.status === 200 && /type="password"/.test(r.body) && /type="email"/.test(r.body), `status ${r.status}`);
  r = await anon.req("/");
  check("The agent-translation-monitor stays open without sign-in (Runs page)", r.status === 200, `status ${r.status}`);
  r = await anon.req("/api/runs");
  check("The agent-translation-monitor stays open without sign-in (runs API)", r.status === 200, `status ${r.status}`);
  for (const [name, init] of [["save", { method: "POST", json: { pageId: P14, runId: RUN_NEW, rows: [] } }], ["comments", { method: "POST", json: { pageId: P14, groupKey: K1, text: "x" } }], ["version", { method: "GET" }], ["mark", { method: "PUT", json: { pageId: P14, runId: RUN_NEW } }]]) {
    const u = name === "version" ? `/api/htv/version?pageId=${P14}&version=1` : name === "comments" ? "/api/htv/comments" : `/api/htv/${name}`;
    const x = await anon.req(u, init);
    check(`Not signed in: /api/htv/${name} gives 401`, x.status === 401, `status ${x.status}`);
  }

  // --- unit UXC step C: theme (round 58 answer 6, round 59 answer 7)
  {
    const htmlTheme = (html) => (/<html[^>]*data-theme="([^"]*)"/.exec(html) ?? [])[1] ?? "";
    r = await anon.req("/translate/sign-in");
    check("Theme: no cookie gives data-theme=\"light\" on <html> (the default is light)", htmlTheme(r.body) === "light", htmlTheme(r.body));
    const dk = new Client("dark");
    dk.jar.set("theme", "dark");
    r = await dk.req("/translate/sign-in");
    check("Theme: the cookie theme=dark gives data-theme=\"dark\" in the first HTML (first paint)", htmlTheme(r.body) === "dark", htmlTheme(r.body));
    r = await dk.req("/");
    check("Theme: the monitor page reads the same cookie (data-theme=\"dark\" on /)", r.status === 200 && htmlTheme(r.body) === "dark", `status ${r.status}`);
    const bd = new Client("bad cookie");
    bd.jar.set("theme", "purple");
    r = await bd.req("/translate/sign-in");
    check("Theme: an unknown cookie value gives light", htmlTheme(r.body) === "light", htmlTheme(r.body));
    r = await anon.req("/translate/sign-in");
    check("Theme: the top bar has the switch with the labels Light and High-contrast dark", /data-theme-switch/.test(r.body) && /Light/.test(htvText(r.body)) && /High-contrast dark/.test(htvText(r.body)));
    const sw = new Client("switch");
    r = await sw.req("/api/theme", { method: "PUT", json: { theme: "dark" } });
    const themeCookie = r.setCookies.find((x) => x.startsWith("theme=")) ?? "";
    check("Theme: PUT /api/theme without sign-in sets the cookie (1 year, Path=/, SameSite=Lax)", r.status === 200 && /theme=dark/.test(themeCookie) && /max-age=31536000/i.test(themeCookie) && /path=\//i.test(themeCookie) && /samesite=lax/i.test(themeCookie) && r.json?.account === false, `status ${r.status}`);
    r = await sw.req("/translate/sign-in");
    check("Theme: the next page after the switch has data-theme=\"dark\"", htmlTheme(r.body) === "dark");
    r = await sw.req("/api/theme", { method: "PUT", json: { theme: "purple" } });
    check("Theme: PUT with a bad value gives 400", r.status === 400, `status ${r.status}`);
    r = await sw.req("/api/theme", { method: "PUT", json: { theme: "light" }, headers: { origin: "http://evil.example" } });
    check("Theme: PUT with a foreign Origin gives 403", r.status === 403, `status ${r.status}`);
    r = await sw.req("/api/theme", { method: "PUT", headers: { "content-type": "text/plain" } });
    check("Theme: PUT with a non-JSON body gives 415 or 400", r.status === 415 || r.status === 400, `status ${r.status}`);
    const cssHref = (/href="(\/_next\/static\/[^"]+\.css)"/.exec((await anon.req("/translate/sign-in")).body) ?? [])[1];
    const css = cssHref ? (await anon.req(cssHref)).body : "";
    check("Theme: the built CSS holds the dark block with the Tailwind color variables and the 3 to 1 box edge", /\[data-theme=["']?dark["']?\]/.test(css) && /--color-white:\s*#1a1a1a/.test(css) && /--color-green-100:\s*#052e16/.test(css) && /#777/.test(css) && /color-scheme:\s*dark/.test(css), cssHref ?? "no css link");
    const { spawnSync } = await import("node:child_process");
    const cs = spawnSync(process.execPath, ["scripts/contrast-dark.mjs"], { encoding: "utf-8" });
    check("Theme: scripts/contrast-dark.mjs gives 7 to 1 or more for every dark pair and finds no palette color without a dark value", cs.status === 0, (cs.stdout.split("\n").find((l) => l.startsWith("Palette colors")) ?? "").trim());
  }

  // --- login errors and cookie
  const bad = new Client("bad");
  const wrong = { email: accounts.tr1.email, password: accounts.tr1.password + "x" };
  r = await bad.req("/api/htv/login", { method: "POST", json: wrong });
  check("Wrong password gives 401 and a plain message", r.status === 401 && /wrong/i.test(r.json?.error ?? "") && !r.body.includes(wrong.password), `status ${r.status}`);
  check("Wrong password sets no cookie", r.setCookies.length === 0);
  r = await bad.req("/api/htv/login", { method: "POST", json: { email: "", password: "" } });
  check("Empty form gives 400", r.status === 400, `status ${r.status}`);
  r = await bad.req("/api/htv/login", { method: "POST", json: accounts.tr1, headers: { origin: "http://evil.example" } });
  check("Login with a foreign Origin gives 403", r.status === 403, `status ${r.status}`);
  r = await bad.req("/api/htv/login", { method: "POST", headers: { "content-type": "text/plain" } });
  check("Login with a non-JSON body gives 415", r.status === 415 || r.status === 400, `status ${r.status}`);

  const t1 = await login("tr1");
  const c1 = t1.c;
  const cookie = t1.r.setCookies.find((x) => x.startsWith("htv_token=")) ?? "";
  check("tr1 login gives 200 and the user role translator", t1.r.status === 200 && t1.r.json?.user?.role === "translator", `status ${t1.r.status}`);
  check("Cookie is httpOnly, SameSite=Lax, Path=/ and not Secure (plain http)", /httponly/i.test(cookie) && /samesite=lax/i.test(cookie) && /path=\//i.test(cookie) && !/;\s*secure/i.test(cookie));
  check("Login answer and cookie hold no token text in the body", c1.token().length > 20 && !t1.r.body.includes(c1.token()) && !("token" in (t1.r.json ?? {})));

  // --- book list (unit UXC step D: one row for each book with a finished run)
  r = await c1.req("/translate");
  const listText = htvText(r.body);
  const bookRows = [...r.body.matchAll(/data-book="([^"]+)" data-pages="(\d+)" data-tagged="(\d+)"/g)].map((m) => ({ slug: m[1], pages: Number(m[2]), tagged: Number(m[3]) }));
  const taggedSum = bookRows.reduce((t, x) => t + x.tagged, 0);
  check("Book list 200 and shows the 12 books that have a finished run, with 30 pages that have an agent translation", r.status === 200 && bookRows.length === 12 && taggedSum === 30, `status ${r.status}, ${bookRows.length} books, ${taggedSum} tagged pages`);
  const bookOf = (slug) => bookRows.find((x) => x.slug === slug);
  check("Book list: left_foot_full has 120 pages and 6 with an agent translation, kendojidai_2014 has 1051 and 6, kendojidai_2012 has 949 and 2", bookOf("left_foot_full")?.pages === 120 && bookOf("left_foot_full")?.tagged === 6 && bookOf("kendojidai_2014")?.pages === 1051 && bookOf("kendojidai_2014")?.tagged === 6 && bookOf("kendojidai_2012")?.pages === 949 && bookOf("kendojidai_2012")?.tagged === 2, JSON.stringify(bookRows.filter((x) => /left_foot|kendojidai_201[24]/.test(x.slug))));
  check("Book list: the web article 18d4ac29 has one page, and mental_full has 169 pages and 2 with an agent translation", bookOf("18d4ac29")?.pages === 1 && bookOf("18d4ac29")?.tagged === 1 && bookOf("mental_full")?.pages === 169 && bookOf("mental_full")?.tagged === 2);
  check("Book list links to the book screens, and shows no page table", r.body.includes('href="/translate/left_foot_full"') && !/data-page="/.test(r.body));
  check("Page tab labels: monitor tabs stay, third tab Human translation", /Human translation/.test(listText) && /Runs/.test(listText) && /Books/.test(listText));

  // --- page p014
  r = await c1.req(P14URL);
  let html = r.body;
  let text = htvText(html);
  const rowKeys = [...html.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1]);
  check("p014 page 200 with 3 rows in order L01-L08, L09-L13, L14-L15", r.status === 200 && JSON.stringify(rowKeys) === JSON.stringify([K1, K2, K3]), `status ${r.status}, ${rowKeys.length} rows`);
  check("p014 rows hold 304, 170 and 75 JA characters", /304 JA characters/.test(text) && /170 JA characters/.test(text) && /75 JA characters/.test(text));
  check("p014 shows the newest run (FAIL) and the shown run ID", html.includes(`data-shown-run="">${RUN_NEW}<`) || new RegExp(`Shown run\\s*${RUN_NEW}`).test(text), "");
  check("p014 shows the verdict FAIL and the ED_3 text of the newest run", /FAIL/.test(text) && html.includes("If you apply this, it becomes a great hint"));
  check("p014 has three own boxes, copy buttons, and no saved version yet", (html.match(/aria-label="Own translation for /g) ?? []).length === 3 && (text.match(/Copy the agent text into the box/g) ?? []).length === 3 && /No saved version yet/.test(text));
  check("p014 shows the TL_3 information panel with counted lines", /TL_3 information panel/.test(text) && /Panel lines: \d+ of \d+ message lines/.test(text));
  check("p014 does not show the admin run mark control to a translator", !/Run mark/.test(text) && !/Use this run for the page/.test(text));

  // --- save: version number, empty row, and errors
  const save = (c, rows, run = RUN_NEW, page = P14, extra = {}) => c.req("/api/htv/save", { method: "POST", json: { pageId: page, runId: run, rows, ...extra } });
  const rows3 = (a, b, c) => [{ groupKey: K1, text: a }, { groupKey: K2, text: b }, { groupKey: K3, text: c }];
  r = await save(c1, rows3("H1 own text one", "", "H1 own text three"));
  check("Save 1 gives version 1 with 3 records (the empty row too)", r.status === 200 && r.json?.version === 1 && r.json?.count === 3 && typeof r.json?.created === "string", `status ${r.status}`);
  r = await c1.req(`/api/htv/version?pageId=${P14}&version=1`);
  const v1rows = r.json?.rows ?? [];
  check("Version 1 holds the 3 rows with the run ID, and row 2 is empty", r.status === 200 && v1rows.length === 3 && v1rows.every((x) => x.runId === RUN_NEW) && v1rows.find((x) => x.groupKey === K2)?.text === "" && v1rows.find((x) => x.groupKey === K1)?.text === "H1 own text one");
  r = await save(c1, rows3("H1 own text one", "H1 own text two", ""));
  check("Save 2 gives version 2", r.status === 200 && r.json?.version === 2 && r.json?.count === 3, `status ${r.status}`);
  r = await c1.req(P14URL);
  text = htvText(r.body);
  check("Page after two saves shows version 2 in the boxes and a history of 2 versions", /Version 2 is in the boxes/.test(text) && /Version history \(2\)/.test(text) && r.body.includes("H1 own text two"));
  r = await save(c1, rows3("a", "b", "c").slice(0, 2));
  check("Save with a missing row gives 409 and saves nothing", r.status === 409, `status ${r.status}`);
  r = await save(c1, [...rows3("a", "b", "c"), { groupKey: `${P14}/ts3/L99-L99`, text: "x" }]);
  check("Save with an unknown row key gives 409", r.status === 409, `status ${r.status}`);
  r = await save(c1, rows3("a", "b", "c"), RUN_OLD);
  check("Save with a run that is not the shown run gives 409", r.status === 409, `status ${r.status}`);
  r = await save(c1, rows3("a", "b", "c"), RUN_NEW, "mental_full/../x");
  check("Save with a bad page name gives 403", r.status === 403, `status ${r.status}`);
  r = await c1.req("/api/htv/save", { method: "POST", json: { pageId: P14, runId: RUN_NEW, rows: rows3("a", "b", "c") }, headers: { origin: "http://evil.example" } });
  check("Save with a foreign Origin gives 403", r.status === 403, `status ${r.status}`);
  r = await c1.req(`/api/htv/version?pageId=${P14}&version=3`);
  check("Version 3 does not exist (the failed saves wrote nothing)", r.status === 404, `status ${r.status}`);

  // --- unit UXC step A: the agree tick (round 58 answer 4, round 59 answer 5)
  const rowsAgree = (a1, t1, a2, t2, a3, t3) => [{ groupKey: K1, text: t1, agree: a1 }, { groupKey: K2, text: t2, agree: a2 }, { groupKey: K3, text: t3, agree: a3 }];
  r = await save(c1, rowsAgree(true, "typed", false, "", false, ""));
  check("Save with a tick and own text in one row gives 400 (they exclude each other)", r.status === 400, `status ${r.status}`);
  r = await save(c1, [{ groupKey: K1, text: "", agree: "yes" }, { groupKey: K2, text: "" }, { groupKey: K3, text: "" }]);
  check("Save with a tick that is not true or false gives 400", r.status === 400, `status ${r.status}`);
  r = await c1.req(`/api/htv/version?pageId=${P14}&version=3`);
  check("The refused saves wrote nothing (version 3 still missing)", r.status === 404, `status ${r.status}`);
  r = await save(c1, rowsAgree(true, "", false, "H1 own two again", false, ""));
  check("Save 3 with a tick on row 1 and an empty own box gives version 3 with 3 records", r.status === 200 && r.json?.version === 3 && r.json?.count === 3, `status ${r.status}`);
  r = await c1.req(`/api/htv/version?pageId=${P14}&version=3`);
  const v3rows = r.json?.rows ?? [];
  const v3k1 = v3rows.find((x) => x.groupKey === K1);
  check("Version 3 reads back agree true with empty text for row 1, and agree false for the others", r.status === 200 && v3k1?.agree === true && v3k1?.text === "" && v3rows.filter((x) => x.agree === false).length === 2 && v3rows.find((x) => x.groupKey === K2)?.text === "H1 own two again");
  check("Version 3 keeps the agent text of the run in ed3Text for the ticked row", typeof v3k1?.ed3Text === "string" && v3k1.ed3Text.includes("If you apply this"));
  r = await save(c1, rows3("H1 own text one", "H1 own text two", "H1 own text three"));
  check("A save with no agree field counts every row as not ticked (version 4)", r.status === 200 && r.json?.version === 4, `status ${r.status}`);
  r = await c1.req(`/api/htv/version?pageId=${P14}&version=4`);
  check("Version 4 reads back agree false for all rows", r.status === 200 && (r.json?.rows ?? []).length === 3 && r.json.rows.every((x) => x.agree === false));
  r = await save(c1, rowsAgree(true, "", true, "", false, "H1 own text three"));
  check("Save 5 with two ticks gives version 5", r.status === 200 && r.json?.version === 5, `status ${r.status}`);
  r = await c1.req(P14URL);
  html = r.body;
  text = htvText(html);
  const agreeBox = (key) => (html.match(new RegExp(`<input[^>]*data-agree="${key.replace(/[/]/g, "\\/")}"[^>]*>`)) ?? [""])[0];
  check("Page shows a tick box for each row, rows 1 and 2 ticked (version 5 in the boxes)", (html.match(/data-agree="/g) ?? []).length === 3 && /checked/.test(agreeBox(K1)) && /checked/.test(agreeBox(K2)) && !/checked/.test(agreeBox(K3)) && /Version 5 is in the boxes/.test(text));
  check("Page shows the tick label 'Agree with the agent text' three times", (text.match(/Agree with the agent text/g) ?? []).length === 3);
  check("Version history shows the column Agreed with the count 2 for version 5 and 1 for version 3", /Agreed/.test(text) && />2<\/td>/.test(html.match(/<tr[^>]*data-version="5"[\s\S]*?<\/tr>/)?.[0] ?? "") && />1<\/td>/.test(html.match(/<tr[^>]*data-version="3"[\s\S]*?<\/tr>/)?.[0] ?? ""));

  // --- comments
  const post = (c, body) => c.req("/api/htv/comments", { method: "POST", json: { pageId: P14, groupKey: K1, runId: RUN_NEW, ...body } });
  r = await post(c1, { text: "H1 private note alpha" });
  const cPriv = r.json?.comment;
  check("tr1 writes a comment: it starts private", r.status === 200 && cPriv?.shared === false && cPriv?.mine === true, `status ${r.status}`);
  r = await post(c1, { text: "" });
  check("An empty comment gives 400", r.status === 400, `status ${r.status}`);
  const t2 = await login("tr2");
  const c2 = t2.c;
  check("tr2 login gives 200", t2.r.status === 200);
  r = await c2.req(P14URL);
  check("tr2 cannot read the private comment of tr1", r.status === 200 && !r.body.includes("H1 private note alpha"));
  check("tr2 cannot read the own translations of tr1 (page)", !r.body.includes("H1 own text one") && !r.body.includes("H1 own text two") && /No saved version yet/.test(htvText(r.body)));
  r = await c2.req(`/api/htv/version?pageId=${P14}&version=1`);
  check("tr2 cannot load version 1 of tr1 (route)", r.status === 404, `status ${r.status}`);
  const direct = await pbCall(pbUrl, "GET", `/api/collections/own_translations/records?filter=${encodeURIComponent(`page_id="${P14}"`)}`, c2.token());
  check("tr2 cannot list the own translations of tr1 in PocketBase (token of tr2)", direct.status === 200 && direct.json?.totalItems === 0, `status ${direct.status}, items ${direct.json?.totalItems}`);
  const directC = await pbCall(pbUrl, "GET", `/api/collections/comments/records/${cPriv?.id}`, c2.token());
  check("tr2 cannot view the private comment of tr1 in PocketBase", directC.status === 404 || directC.status === 403, `status ${directC.status}`);
  r = await c2.req(`/api/htv/comments/${cPriv?.id}`, { method: "PATCH", json: { shared: true } });
  check("tr2 cannot change the comment of tr1", r.status >= 400 && r.status < 500, `status ${r.status}`);
  r = await c2.req(`/api/htv/comments/${cPriv?.id}`, { method: "DELETE", json: {} });
  check("tr2 cannot delete the comment of tr1", r.status >= 400 && r.status < 500, `status ${r.status}`);
  r = await c1.req(`/api/htv/comments/${cPriv?.id}`, { method: "PATCH", json: { shared: true, text: "H1 shared note beta" } });
  check("tr1 edits the text and changes private to shared", r.status === 200 && r.json?.comment?.shared === true && r.json?.comment?.text === "H1 shared note beta", `status ${r.status}`);
  r = await c2.req(P14URL);
  check("tr2 reads the shared comment with the writer name tr1", r.status === 200 && r.body.includes("H1 shared note beta") && /userName\\?":\\?"tr1/.test(r.body));
  r = await post(c1, { text: "H1 private note gamma" });
  const cPriv2 = r.json?.comment;
  const ad = await login("admin");
  const ca = ad.c;
  check("admin login gives 200 and the role admin", ad.r.status === 200 && ad.r.json?.user?.role === "admin");
  r = await ca.req(P14URL);
  check("admin reads all comments of tr1 (shared and private)", r.status === 200 && r.body.includes("H1 shared note beta") && r.body.includes("H1 private note gamma"));
  r = await c1.req(P14URL);
  text = htvText(r.body);
  check("The screen of the writer does not tell that the admin reads comments", !/admin (can|will|may)? ?read/i.test(text) && !/visible to (the )?admin/i.test(text) && !/only (you|the writer)/i.test(text));
  r = await c1.req(`/api/htv/comments/${cPriv?.id}`, { method: "DELETE", json: {} });
  check("tr1 deletes the own comment", r.status === 200, `status ${r.status}`);
  r = await ca.req(`/api/htv/comments/${cPriv2?.id}`, { method: "DELETE", json: {} });
  check("The admin deletes the comment of another user", r.status === 200, `status ${r.status}`);
  r = await c1.req(P14URL);
  check("Both comments are gone after the deletes", !r.body.includes("H1 shared note beta") && !r.body.includes("H1 private note gamma"));

  // --- reader
  const rd = await login("reader");
  const cr = rd.c;
  check("reader login gives 200 and the role reader", rd.r.status === 200 && rd.r.json?.user?.role === "reader");
  r = await cr.req(P14URL);
  text = htvText(r.body);
  check("reader sees JA, ED_3 and the panel, but no own box and no comments", r.status === 200 && r.body.includes("If you apply this") && /TL_3 information panel/.test(text) && !/aria-label="Own translation for /.test(r.body) && !/Comments \(\d+\)/.test(text) && /can read only/.test(text));
  check("reader sees no tick box", !/data-agree=/.test(r.body));
  r = await save(cr, rows3("r", "r", "r"));
  check("reader cannot save (403)", r.status === 403, `status ${r.status}`);
  r = await post(cr, { text: "reader comment" });
  check("reader cannot write a comment (403)", r.status === 403, `status ${r.status}`);
  const rdDirect = await pbCall(pbUrl, "POST", "/api/collections/own_translations/records", cr.token(), { user: "x", page_id: P14, group_key: K1, version: 1, text: "r" });
  check("reader cannot write an own translation in PocketBase either", rdDirect.status >= 400 && rdDirect.status < 500, `status ${rdDirect.status}`);
  r = await cr.req(`/api/htv/mark`, { method: "PUT", json: { pageId: P14, runId: RUN_OLD } });
  check("reader cannot set a run mark (403)", r.status === 403, `status ${r.status}`);

  // --- run mark (admin) and the notice
  r = await c1.req(`/api/htv/mark`, { method: "PUT", json: { pageId: P14, runId: RUN_OLD } });
  check("translator cannot set a run mark (403)", r.status === 403, `status ${r.status}`);
  r = await ca.req(`/api/htv/mark`, { method: "PUT", json: { pageId: P14, runId: "20261026T001543Z" } });
  check("admin cannot mark a run that is not finished (400)", r.status === 400, `status ${r.status}`);
  r = await ca.req(P14URL);
  text = htvText(r.body);
  check("admin sees the run mark control", r.status === 200 && /Run mark/.test(text) && /Use this run for the page/.test(text));
  r = await save(ca, rows3("admin text one", "admin text two", "admin text three"));
  check("admin saves version 1 of the admin account", r.status === 200 && r.json?.version === 1, `status ${r.status}`);
  r = await ca.req(`/api/htv/mark`, { method: "PUT", json: { pageId: P14, runId: RUN_OLD } });
  check("admin marks the older run", r.status === 200, `status ${r.status}`);
  r = await ca.req(P14URL);
  html = r.body;
  text = htvText(html);
  const rowKeysOld = [...html.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1]);
  check("With the mark the page shows the older run, with the same 3 group keys", new RegExp(`Shown run\\s*${RUN_OLD}`).test(text) && /Chosen by the admin run mark/.test(text) && JSON.stringify(rowKeysOld) === JSON.stringify([K1, K2, K3]));
  check("The older run has other ED_3 text (first sentence)", html.includes("If applied, it becomes a great hint"));
  check("A saved text of another run shows the notice on the rows (no text compare)", (html.match(/data-row-notice/g) ?? []).length === 3 && text.includes(`You saved this text while the page showed run ${RUN_NEW}. The page now shows run ${RUN_OLD}.`));
  r = await c1.req(P14URL);
  text = htvText(r.body);
  check("A ticked row of another run shows the tick notice, and the tick stays on (version 5)", text.includes(`You ticked this row while the page showed run ${RUN_NEW}. The page now shows run ${RUN_OLD}.`) && /checked/.test((r.body.match(new RegExp(`<input[^>]*data-agree="${K1.replace(/[/]/g, "\\/")}"[^>]*>`)) ?? [""])[0]));
  r = await c1.req(P14URL);
  check("The book screen shows the marked run for the page (shown run, 'Chosen by the admin run mark')", new RegExp(`Shown run\\s*${RUN_OLD}`).test(htvText(r.body)) && /Chosen by the admin run mark/.test(htvText(r.body)));
  r = await ca.req(`/api/htv/mark`, { method: "DELETE", json: { pageId: P14 } });
  check("admin clears the run mark", r.status === 200, `status ${r.status}`);
  r = await ca.req(P14URL);
  text = htvText(r.body);
  check("After the clear the page shows the newest run again, and the notice is gone", new RegExp(`Shown run\\s*${RUN_NEW}`).test(text) && !/data-row-notice/.test(r.body));
  r = await ca.req(`/api/htv/mark`, { method: "DELETE", json: { pageId: P14 } });
  check("Clear of a mark that is not set is harmless", r.status === 200, `status ${r.status}`);

  // --- saved text with no row in the shown run (box below the rows)
  const me = await pbCall(pbUrl, "GET", `/api/collections/users/records?filter=${encodeURIComponent(`email="${accounts.admin.email}"`)}`, ca.token());
  const adminId = me.json?.items?.[0]?.id;
  const orphanKey = `${P14}/ts3/L98-L99`;
  const created = await pbCall(pbUrl, "POST", "/api/collections/own_translations/records", ca.token(), { user: adminId, item_id: "mental_full", page_id: P14, group_key: orphanKey, ts_ids: ["x"], part: "lines", ja_text: "ORPHAN JA", run_id: "20250101T000000Z-old", ed3_text: "", text: "H1 orphan saved text", version: 2 });
  check("Test setup: a saved version with a key that the run does not cut", created.status === 200, `status ${created.status}`);
  const orphanKey2 = `${P14}/ts3/L97-L99`;
  const created2 = await pbCall(pbUrl, "POST", "/api/collections/own_translations/records", ca.token(), { user: adminId, item_id: "mental_full", page_id: P14, group_key: orphanKey2, ts_ids: ["x"], part: "lines", ja_text: "ORPHAN JA 2", run_id: "20250101T000000Z-old", ed3_text: "H1 orphan agent text", text: "", agree: true, version: 2 });
  check("Test setup: a ticked saved row with a key that the run does not cut", created2.status === 200, `status ${created2.status}`);
  const orphanComment = await pbCall(pbUrl, "POST", "/api/collections/comments/records", ca.token(), { user: adminId, page_id: P14, group_key: orphanKey, run_id: "20250101T000000Z-old", text: "H1 orphan comment", shared: false });
  r = await ca.req(P14URL);
  text = htvText(r.body);
  check("The box 'Saved for lines that this run cuts in another way' shows the saved text and the comment", orphanComment.status === 200 && text.includes("Saved for lines that this run cuts in another way") && r.body.includes("H1 orphan saved text") && r.body.includes("H1 orphan comment"));
  check("The box shows a ticked row with the agent text that the user agreed to", /You agreed to this agent text/.test(text) && r.body.includes("H1 orphan agent text"));
  check("Without such a key the box does not show (translator page)", !(await c1.req(P14URL)).body.includes("Saved for lines that this run cuts in another way"));

  // --- p0839: term highlight, panel line count, hidden parts
  const P839URL = "/translate/kendojidai_2014?at=p0839";
  r = await c1.req(P839URL);
  html = r.body;
  text = htvText(html);
  const terms = (html.match(/data-term="c-fefdc125669e"/g) ?? []).length;
  check("p0839 page 200 with 21 rows", r.status === 200 && new Set([...html.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1])).size === 21, `status ${r.status}`);
  check("p0839 highlights the term 剣道 in JA and in ED_3 (marks from term_marks.ED_3.json)", terms >= 2, `${terms} marks of the entry`);
  check("p0839 carries the termbase entry text for the pop-up (first definition and the full entry)", html.includes("Kendō (剣道) is the way of the sword.") && html.includes("The Japanese art of swordsmanship"));
  // Unit UXC step B: the block "Japanese text of the page" is gone from the screen (round 58 answer 5), so the shown line count is 536 - 141 = 395.
  check("p0839 panel line count is 395 of 721 (the JA text block of 141 lines is not shown)", /Panel lines: 395 of 721 message lines/.test(text));
  check("p0839 panel shows 32 dictionary entries and the 5 blocks, and not the JA text block", /Dictionary lookup\s*32 items, 359 lines/.test(text) && ["Lower pair from TL_2", "Earlier term marks", "Book translation memory", "Aligned translation memory"].every((x) => text.includes(x)) && !text.includes("Japanese text of the page"));
  check("p0839 panel hides the fixed text, the box header and the output format", !/ROLE STATEMENT|FIXED RULES|INSTRUCTION TEXT|BOX HEADER|OUTPUT FORMAT|box_type: TL_3|SECTION \d/.test(html));
  // --- unit UXC step B: panel cards
  check("p0839 shows 32 dictionary cards with the card for 剣道: Kendō, common, the short English explanation", (html.match(/data-card="entry"/g) ?? []).length === 32 && /Kendō/.test(text) && text.includes("the way of the sword") && text.includes("Kendō (剣道) is the way of the sword."));
  const dictStart = html.indexOf('data-block="dictionary_lookup"');
  const dictText = htvText(html.slice(dictStart, html.indexOf('data-block="book_translation_memory"', dictStart)));
  check("p0839 dictionary cards hide entry_id, store, source, and the field names of the message", dictStart > 0 && dictText.length > 1000 && !/entry_id|store: |\bsource: |headword_ja|concise_en|detailed_en|c-fefdc125669e|termbase/.test(dictText), `${dictText.length} chars, ` + ((/.{30}(entry_id|store: |\bsource: |headword_ja|concise_en|detailed_en|c-fefdc125669e|termbase).{30}/.exec(dictText) ?? [""])[0]));
  check("p0839 long blocks start closed (dictionary, 359 lines) and short blocks start open (earlier term marks)", !/<details[^>]*open=""[^>]*data-block="dictionary_lookup"/.test(html) && /<details[^>]*open=""[^>]*data-block="earlier_term_marks"/.test(html));
  check("p0839 has no Previous page pair block (first page of the list)", !/Previous page pair/.test(text));
  r = await c1.req("/translate/left_foot_full?at=p047");
  text = htvText(r.body);
  check("p047 panel hides grid_place and shows the previous page pair", r.status === 200 && !/grid_place|this box: TL_3|lower box: TL_2/.test(r.body) && /Previous page pair/.test(text));
  r = await c1.req("/translate/left_foot_full?at=p050");
  html = r.body;
  text = htvText(html);
  const blockPos = ["dictionary_lookup", "book_translation_memory", "aligned_translation_memory", "lower_pair", "previous_page_pair", "earlier_term_marks"].map((n) => html.indexOf(`data-block="${n}"`));
  check("p050 panel blocks come in the owner order: dictionary, book memory, aligned memory, lower pair, previous page pair, earlier term marks", blockPos.every((x) => x >= 0) && blockPos.every((x, i) => i === 0 || x > blockPos[i - 1]), blockPos.join(","));
  check("p050 panel hides the stance line of the lower pair", !text.includes("Assume that this pair holds errors"));
  check("p050 lower pair shows plain EN lines with short IDs (ts2/L01) and the full ID in the tooltip", /ts2\/L01/.test(text) && html.includes('title="left_foot_full/p050/ts2/L01"') && text.includes("so that, by executing Datotsu, the left line works effectively."));
  check("p050 memory pair chip names the page and the pair (left_foot_full/p049 · P02) and hides the run and 'split none'", text.includes("left_foot_full/p049 · P02") && !/split none/.test(text) && !/20261028T023006Z\/20261028T040511Z/.test(text));
  const marksStart = html.indexOf('data-block="earlier_term_marks"');
  const marksHtml = html.slice(marksStart, html.indexOf("<script", marksStart));
  check("p050 earlier term marks show a table with the EN term and the result, and hide the entry IDs", /EN term/.test(text) && text.includes("Kendō (the way of the sword)") && /breaks/.test(text) && marksStart > 0 && !/c-[0-9a-f]{12}/.test(marksHtml.replace(/data-term="[^"]*"/g, "")));
  check("p050 panel has a drag handle (width 416 px at start) and a close button", /data-panel-width="416"/.test(html) && /data-panel-handle/.test(html) && /Close the panel/.test(text));

  // The card parser over all TL_3 messages of finished runs: 0 lost lines (rawLines of each card equal the lines of its part).
  {
    const { pathToFileURL } = await import("node:url");
    const { parseTl3Message } = await import(pathToFileURL(path.resolve("lib/htv-panel.ts")).href);
    const cardLib = await import(pathToFileURL(path.resolve("lib/htv-panel-cards.ts")).href);
    const pilot = path.join(dataDir, "pilot-run");
    let messages = 0, entries = 0, pairs = 0, parts = 0, lost = 0, badEntries = 0, noHeadword = 0, badResult = 0;
    for (const folder of await fs.readdir(pilot)) {
      let runs = [];
      try { runs = await fs.readdir(path.join(pilot, folder)); } catch { continue; }
      for (const run of runs) {
        const msg = path.join(pilot, folder, run, "messages", "TL_3.txt");
        const ed3 = path.join(pilot, folder, run, "results", "ED_3.json");
        const [t, hasEd] = await Promise.all([fs.readFile(msg, "utf-8").catch(() => null), fs.stat(ed3).then(() => true, () => false)]);
        if (t === null || !hasEd) continue;
        messages++;
        const panel = parseTl3Message(t);
        for (const b of panel.blocks) {
          const cb = cardLib.blockCards(b);
          if (!cb) continue;
          if (cb.cards.length !== b.parts.length) lost++;
          b.parts.forEach((part, k) => {
            const c = cb.cards[k];
            parts++;
            if (JSON.stringify(cardLib.rawLines(c)) !== JSON.stringify(part.lines)) lost++;
            if (c.kind === "entry") { entries++; if (c.fields.length !== 9 || c.hidden.length !== 3) badEntries++; if (!c.headword) noHeadword++; }
            if (c.kind === "pair") pairs++;
            if (c.kind === "result" && c.lines === null && /^\d{8}T\d{6}Z-r\d+$/.test(run)) badResult++; // old test runs hold other result shapes and show as raw text
          });
        }
      }
    }
    check("Card parser: every TL_3 message of a finished run gives cards with 0 lost lines", messages >= 60 && lost === 0, `${messages} messages, ${entries} entries, ${pairs} pairs, ${parts} parts, ${lost} lost`);
    check("Card parser: every entry has the 9 fields, the 3 hidden fields, and a headword; every lower pair result is readable", entries >= 1000 && badEntries === 0 && noHeadword === 0 && badResult === 0, `${badEntries} bad entries, ${noHeadword} without headword, ${badResult} bad results`);
  }
  // --- pages that do not exist
  r = await c1.req("/translate/zzz_none?at=p001");
  check("A page without a finished run gives 404", r.status === 404, `status ${r.status}`);
  r = await c1.req("/translate/men0?at=p005");
  check("men0/p005 shows the newest finished run (not the unfinished folder)", r.status === 200 && r.body.includes("20261026T182512Z-r41") && !r.body.includes("20261026T001543Z"), `status ${r.status}`);
  r = await c1.req("/translate/..%2Fx/p001");
  check("A bad page name gives 404", r.status === 404, `status ${r.status}`);
  r = await c1.req("/translate/zzz_none/p001");
  check("The old route of a page in an unknown book redirects to the book screen, which gives 404", r.status === 307 && r.location === "/translate/zzz_none?at=p001#p001", `status ${r.status}, location ${r.location}`);

  // --- unit UXC step D: the book screen (round 58 answer 3, round 59 answers 3 and 4)
  await bookScreenChecks({ c1, ca, cr, anon });

  // --- unit UXC step E: the settings cog and the settings in the account (round 58 answer 5, round 59 answer 6)
  await settingsChecks({ c1, c2, ca, cr, anon, accounts, pbUrl });

  // --- sign out
  r = await c1.req("/api/htv/logout", { method: "POST", json: {} });
  check("Sign out clears the cookie", r.status === 200 && c1.token() === "");
  r = await c1.req("/translate");
  check("After sign out /translate redirects to the sign-in page", r.status === 307 && r.location.includes("/translate/sign-in"), `status ${r.status}`);

  // --- token refresh and a bad token
  const c3 = new Client("tr1 again");
  await c3.req("/api/htv/login", { method: "POST", json: accounts.tr1 });
  r = await c3.req("/api/htv/refresh", { method: "POST", json: {} });
  check("Token refresh gives 200 (the token is young, so it stays)", r.status === 200 && r.json?.ok === true && r.json?.refreshed === false, `status ${r.status}`);
  const payload = JSON.parse(Buffer.from(c3.token().split(".")[1], "base64url").toString("utf-8"));
  const left = payload.exp - Date.now() / 1000;
  check("The PocketBase token lives about 5 days (432000 s)", left > 430000 && left <= 432000, `${Math.round(left)} s left`);
  const refreshedDirect = await pbCall(pbUrl, "POST", "/api/collections/users/auth-refresh", c3.token());
  check("PocketBase auth-refresh gives 200 and a token", refreshedDirect.status === 200 && typeof refreshedDirect.json?.token === "string");
  const forged = new Client("forged");
  forged.jar.set("htv_token", c3.token().slice(0, -3) + "abc");
  r = await forged.req("/translate");
  check("A changed token counts as not signed in", r.status === 307, `status ${r.status}`);
  r = await forged.req(`/api/htv/save`, { method: "POST", json: { pageId: P14, runId: RUN_NEW, rows: rows3("a", "b", "c") } });
  check("A changed token cannot save (401)", r.status === 401, `status ${r.status}`);

  // --- old run folder with missing files stays readable (fixture copy)
  const os = await import("node:os");
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "htv-fixture-"));
  try {
    const runDir = path.join(dataDir, "pilot-run", "mental_full_p014", RUN_OLD);
    const target = path.join(tmp, "data", "pilot-run", "mental_full_p014", RUN_OLD);
    await fs.mkdir(target, { recursive: true });
    for (const f of ["run.json", "summary.json"]) await fs.copyFile(path.join(runDir, f), path.join(target, f));
    await fs.mkdir(path.join(target, "results"));
    for (const f of ["TS_3.json", "ED_3.json"]) await fs.copyFile(path.join(runDir, "results", f), path.join(target, "results", f));
    const fixCfg = path.join(tmp, "viewer.config.json");
    await fs.writeFile(fixCfg, JSON.stringify({ translatorDataDir: path.join(tmp, "data"), pocketbaseUrl: pbUrl }));
    const port2 = await freePort();
    const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port2), "-H", "127.0.0.1"], { env: { ...process.env, PORT: String(port2), VIEWER_CONFIG: fixCfg }, stdio: "ignore" });
    try {
      let up = false;
      for (let i = 0; i < 100 && !up; i++) {
        try {
          up = (await fetch(`http://127.0.0.1:${port2}/translate/sign-in`)).status < 500;
        } catch {
          await new Promise((x) => setTimeout(x, 200));
        }
      }
      const cf = new Client("fixture");
      await cf.req("/api/htv/login", { method: "POST", json: accounts.tr1, port: port2 });
      const fx = await cf.req(P14URL, { port: port2 });
      const fxText = htvText(fx.body);
      check("Old run with no messages and no programs folder: page 200, rows kept, plain notes", fx.status === 200 && (fx.body.match(/data-row="/g) ?? []).length === 3 && /no term marks file/.test(fxText) && /No TL_3 message file/.test(fxText), `status ${fx.status}`);
    } finally {
      child.kill("SIGTERM");
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- mode deploy (unit DPC, round 58)
// Round 58 answer 7 (Q-A 2026-10-28 l205): "Env settings for Vercel", "Hide monitor on deploy". The server runs as on Vercel:
// no config file, settings from env variables, monitor off. The data comes from PocketBase (the S2 upload).

async function deployTest() {
  const tr = envPair("TR1");
  const rd = envPair("READER");
  const P = "left_foot_full/p048";
  const STAMP = "20261026T182511Z"; // a real list stamp (mode smoke reads it with the monitor on)
  const pbUrl = (process.env.VIEWER_POCKETBASE_URL ?? "").replace(/\/+$/, "");
  const cfgFile = path.resolve(process.env.VIEWER_CONFIG ?? "viewer.config.json");
  const hasCfg = await fs.stat(cfgFile).then(() => true, () => false);
  check("Deploy shape: no config file in the app folder", !hasCfg, cfgFile);
  check("Deploy shape: env VIEWER_RUN_SOURCE is pocketbase and VIEWER_MONITOR is off", process.env.VIEWER_RUN_SOURCE === "pocketbase" && process.env.VIEWER_MONITOR === "off");
  check("Deploy shape: env VIEWER_POCKETBASE_URL points at the throwaway PocketBase (port 8092)", pbUrl === "http://127.0.0.1:8092", pbUrl);

  const anon = new Client("anon");
  // --- monitor pages
  let r = await anon.req("/");
  check("Deploy: / redirects to /translate", r.status === 307 && /\/translate$/.test(r.location), `status ${r.status}, location ${r.location}`);
  const pages = ["/books", `/page/${P}`, `/runs/${STAMP}`];
  for (const u of pages) {
    r = await anon.req(u);
    check(`Deploy: ${u} gives 404 and no Mac path`, r.status === 404 && !r.body.includes("/Users/"), `status ${r.status}`);
  }

  // --- the 8 monitor API routes
  const apis = [
    ["GET", "/api/books/mental_full"],
    ["GET", "/api/file?path=pilot-run/x.json"],
    ["GET", "/api/page-extra?run=pilot-run/x&part=calls&stage=3"],
    ["POST", "/api/pause"],
    ["GET", "/api/runs"],
    ["GET", `/api/runs/${STAMP}`],
    ["GET", `/api/runs/${STAMP}/compare`],
    ["GET", `/api/runs/${STAMP}/memory?book=mental_full`],
  ];
  for (const [method, u] of apis) {
    r = await anon.req(u, method === "POST" ? { method, json: { stamp: STAMP, on: false } } : { method });
    check(`Deploy: ${method} ${u.split("?")[0]} gives 404 with the short JSON body and no Mac path`, r.status === 404 && r.json?.error === "Not found" && Object.keys(r.json).length === 1 && !r.body.includes("/Users/"), `status ${r.status}`);
  }

  // --- the human-translation-view
  r = await anon.req("/translate");
  check("Deploy: not signed in, /translate redirects to the sign-in page", r.status === 307 && r.location.includes("/translate/sign-in"), `status ${r.status}`);
  r = await anon.req("/translate/sign-in");
  const navOf = (html) => (html.match(/<nav[^>]*aria-label="Main tabs"[\s\S]*?<\/nav>/) ?? [""])[0];
  check("Deploy: sign-in page 200, fields present, one tab only (Human translation)", r.status === 200 && /type="password"/.test(r.body) && /Human translation/.test(navOf(r.body)) && !/Runs|Books/.test(htvText(navOf(r.body))), `status ${r.status}`);
  // Unit UXC step C: the theme works with the monitor off (cookie only, no sign-in).
  const dkc = new Client("dark");
  dkc.jar.set("theme", "dark");
  r = await dkc.req("/translate/sign-in");
  check("Deploy: the cookie theme=dark gives data-theme=\"dark\" with the monitor off", r.status === 200 && /<html[^>]*data-theme="dark"/.test(r.body) && /data-theme-switch/.test(r.body), `status ${r.status}`);
  r = await dkc.req("/api/theme", { method: "PUT", json: { theme: "light" } });
  check("Deploy: PUT /api/theme works with the monitor off (200)", r.status === 200 && r.json?.theme === "light", `status ${r.status}`);
  r = await anon.req("/api/htv/version?pageId=" + P + "&version=1");
  check("Deploy: /api/htv/version works as before (401 without sign-in)", r.status === 401, `status ${r.status}`);

  const c = new Client("tr1");
  r = await c.req("/api/htv/login", { method: "POST", json: tr });
  const cookie = r.setCookies.find((x) => x.startsWith("htv_token=")) ?? "";
  check("Deploy: translator sign-in gives 200 and the role translator", r.status === 200 && r.json?.user?.role === "translator", `status ${r.status}`);
  check("Deploy: cookie is httpOnly and SameSite=Lax", /httponly/i.test(cookie) && /samesite=lax/i.test(cookie));
  r = await c.req("/translate");
  const booksInList = new Set([...r.body.matchAll(/data-book="([^"]+)"/g)].map((m) => m[1]));
  check("Deploy: /translate 200 with the books from PocketBase (12 books, left_foot_full among them)", r.status === 200 && booksInList.size === 12 && booksInList.has("left_foot_full"), `status ${r.status}, ${booksInList.size} books`);
  const nav = navOf(r.body);
  check("Deploy: /translate has no link to /books and no Runs tab", !r.body.includes('href="/books"') && !/href="\/"/.test(r.body) && /Human translation/.test(nav) && !/Runs|Books/.test(htvText(nav)));
  check("Deploy: /translate title reads human-translation-view", /human-translation-view/.test(htvText(r.body)) || /human-translation-view/.test(r.body));
  r = await c.req("/translate/left_foot_full?at=p048");
  const rowKeys = new Set([...r.body.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1]));
  check(`Deploy: the book screen of ${P} 200 with rows`, r.status === 200 && rowKeys.size > 0, `status ${r.status}, ${rowKeys.size} rows`);
  const lf = await c.req("/translate/left_foot_full");
  check("Deploy: the book screen left_foot_full shows 120 page sections (page count from catalog_items) and 6 pages with an agent translation", lf.status === 200 && (lf.body.match(/data-section="p\d+"/g) ?? []).length === 120 && (lf.body.match(/data-index-tag=/g) ?? []).length === 6 && (lf.body.match(/data-untagged/g) ?? []).length === 114, `status ${lf.status}`);
  const kj = await c.req("/translate/kendojidai_2014");
  const kjHeads = [...kj.body.matchAll(/data-chapter="(\d+)"[^>]*>([^<]*)</g)].map((m) => `${m[1]}:${m[2]}`);
  check("Deploy: the book screen kendojidai_2014 shows 1051 sections and 13 month headings from magazine_chapters (October 2014 at p778)", kj.status === 200 && (kj.body.match(/data-section="p\d{4}"/g) ?? []).length === 1051 && kjHeads.length === 13 && kjHeads.includes("778:October 2014"), kjHeads.join(", "));
  const old = await c.req("/translate/left_foot_full/p048");
  check("Deploy: the old page URL redirects to the book screen", old.status === 307 && old.location === "/translate/left_foot_full?at=p048#p048", `status ${old.status}`);
  check("Deploy: page view has own boxes for the translator", /aria-label="Own translation for /.test(r.body));
  r = await c.req("/translate/zzz_none?at=p001");
  check("Deploy: a page without a run gives 404 and no Mac path", r.status === 404 && !r.body.includes("/Users/"), `status ${r.status}`);

  const cr = new Client("reader");
  r = await cr.req("/api/htv/login", { method: "POST", json: rd });
  check("Deploy: reader sign-in gives 200 and the role reader", r.status === 200 && r.json?.user?.role === "reader", `status ${r.status}`);
  r = await cr.req("/translate/left_foot_full?at=p048");
  const rtext = htvText(r.body);
  check("Deploy: reader sees the read-only view (rows, no own box, no comments)", r.status === 200 && /data-row="/.test(r.body) && !/aria-label="Own translation for /.test(r.body) && !/Comments \(\d+\)/.test(rtext) && /can read only/.test(rtext), `status ${r.status}`);
  r = await cr.req("/api/htv/save", { method: "POST", json: { pageId: P, runId: "x", rows: [] } });
  check("Deploy: reader cannot save (403)", r.status === 403, `status ${r.status}`);
}

const server = await startServer();
try {
  if (mode === "pause") await pauseTest();
  else if (mode === "htv") await htvTest();
  else if (mode === "deploy") await deployTest();
  else await smoke();
} finally {
  server.kill("SIGTERM");
}
const total = timings.reduce((s, t) => s + t.ms, 0);
const sorted = [...timings].sort((a, b) => a.ms - b.ms);
console.log(`\nRequests: ${timings.length}, total ${total} ms, median ${sorted[Math.floor(sorted.length / 2)]?.ms} ms, max ${sorted.at(-1)?.ms} ms`);
console.log(`Failures: ${failures}, skipped: ${skips}`);
await fs.writeFile(`smoke-output.json`, JSON.stringify({ mode, timings, failures, skips }, null, 1));
process.exit(failures ? 1 : 0);
