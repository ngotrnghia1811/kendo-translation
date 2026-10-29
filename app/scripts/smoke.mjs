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
//   node scripts/smoke.mjs read                        reader pages (unit RC1, round 63). Needs a throwaway PocketBase after the S2 upload (reader_pages), a saved version of
//                                                      translator tr1 on left_foot_full/p048 (run_all.py prepares it), and the env variables HTV_ADMIN_*, HTV_TR1_*, HTV_READER_*
//                                                      (approved) and HTV_READER2_* (not approved). It writes sign-up, approval, choice, check, bookmark, and progress records.
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
    // Unit UXC2 (round 61): app/translate/loading.tsx makes Next stream the page. A redirect() or notFound() inside a page then answers HTTP 200:
    // the redirect comes as <meta id="__next-page-redirect" ... content="1;url=...">, and the missing page as the not-found UI with the marker NEXT_HTTP_ERROR_FALLBACK;404.
    // So `go` names the target of a redirect (header or meta tag), and `missing` is true for a 404 in both forms.
    const location = res.headers.get("location") ?? "";
    const meta = /<meta id="__next-page-redirect"[^>]*content="\d+;url=([^"]*)"/.exec(body);
    return { status: res.status, body, setCookies, location, go: location || (meta ? meta[1].replace(/&amp;/g, "&") : ""), missing: res.status === 404 || /NEXT_HTTP_ERROR_FALLBACK;404/.test(body), json: parseJson(body) };
  }
  token() {
    return this.jar.get("htv_token") ?? "";
  }
}

// Text of an HTML page for the htv checks. React writes `<!-- -->` between two text parts, so remove it before the tags go.
function htvText(html) {
  return visibleText(html.replace(/<!--[\s\S]*?-->/g, ""));
}

// Facts from the Translator data folder, so that the checks read the expected counts and texts from the data and do not go stale
// (unit UXC2, round 61). It loads the build rules of the app (finishedRunOf, sortRuns) with the same hook as the sync command S2.
let factsCache = null;
async function dataFacts(dataDir) {
  if (factsCache) return factsCache;
  const { pathToFileURL } = await import("node:url");
  const { register } = await import("node:module");
  register(pathToFileURL(path.resolve("scripts/ts-resolve-hook.mjs")).href, pathToFileURL(path.resolve(".") + path.sep).href);
  const build = await import(pathToFileURL(path.resolve("lib/htv-build.ts")).href);
  const slugsFile = JSON.parse(await fs.readFile(path.join(dataDir, "pilot-sample/book-slugs.json"), "utf-8"));
  const bookSlugs = (slugsFile.books ?? []).map((b) => b.slug);
  const readJson = async (f) => JSON.parse(await fs.readFile(f, "utf-8").catch(() => "null"));
  const exists = (f) => fs.stat(f).then(() => true, () => false);
  const pilot = path.join(dataDir, "pilot-run");
  const runsOf = {}; // "slug/pNNN" -> finished runs, newest first
  for (const folder of await fs.readdir(pilot)) {
    const m = /^(.+)_(p\d+)$/.exec(folder);
    if (!m) continue;
    const found = [];
    for (const runId of (await fs.readdir(path.join(pilot, folder)).catch(() => [])).filter((n) => build.RUN_FOLDER_RULE.test(n))) {
      const dir = path.join(pilot, folder, runId);
      const run = build.finishedRunOf(runId, await readJson(path.join(dir, "summary.json")), await readJson(path.join(dir, "run.json")), await exists(path.join(dir, "results/TS_3.json")), await exists(path.join(dir, "results/ED_3.json")));
      if (run) found.push({ run, dir });
    }
    if (found.length) {
      const order = build.sortRuns(found.map((f) => f.run));
      runsOf[`${m[1]}/${m[2]}`] = order.map((r) => found.find((f) => f.run.runId === r.runId));
    }
  }
  const pages = Object.keys(runsOf);
  const slugsWithRun = new Set(pages.map((p) => p.split("/")[0]));
  factsCache = { bookSlugs, runsOf, pages, slugsWithRun, listed: new Set([...bookSlugs, ...slugsWithRun]) };
  return factsCache;
}

// Text of the first line of the lower pair in a TL_3 message, and the same text in the form of the HTML (no entities, no spaces, no punctuation).
function lowerPairFirstLine(message) {
  const m = /^result: (\{"lines":.*\})$/m.exec(message);
  if (!m) return "";
  try {
    return String(JSON.parse(m[1]).lines?.[0]?.text ?? "");
  } catch {
    return "";
  }
}
const squash = (t) => t.replace(/&[#a-z0-9]+;/gi, "").replace(/[^A-Za-z0-9]/g, "");

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
  // Round 61 answer 5 (Q-A l265): one cog for each column header. No cog inside a row.
  const rowsHtml = [...html.matchAll(/<article[^>]*data-row=[\s\S]*?<\/article>/g)].map((m) => m[0]);
  const ids = ["ja", "agent", "own", "comments", "versions"];
  check("Cog: the translator view has exactly one cog for each of Japanese, Agent translation, Your translation, Comments, and Version history in the sticky header row, one in the book index, one in the TL_3 panel, and 0 cogs inside the 3 rows", rowsHtml.length === 3 && rowsHtml.every((x) => !/data-cog/.test(x)) && /data-column-header/.test(html) && ids.every((x) => countOf(html, new RegExp(`data-column="${x}"`, "g")) === 1 && countOf(html, new RegExp(`data-cog="${x}"`, "g")) === 1) && countOf(html, /data-cog="list"/g) === 1 && countOf(html, /data-cog="tl3"/g) === 1 && countOf(html, /data-cog=/g) === 7, `${countOf(html, /data-cog=/g)} cogs, ${rowsHtml.length} rows`);
  check("Cog: the header row names the columns Japanese, Agent translation, Your translation, Comments, Version history", ["Japanese", "Agent translation", "Your translation", "Comments", "Version history"].every((t) => htvText(html.slice(html.indexOf("data-column-header"), html.indexOf("data-column-header") + 4000)).includes(t)));
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
  // Unit RC1 (round 63 answer 4): a reader goes to /read. The older check of the read-only view changed into a redirect check.
  check("Reader: /translate/mental_full?at=p014 sends the reader to /read (the old check of the agent pane font size and the cogs ended)", r.go === "/read", `status ${r.status}, go ${r.go}`);

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


// Checks of unit UXC2 (round 61): the page view, the collapsible panels, the state in the account, the 36 books, and the six review fixes.
// The clicks of the page view run in Chrome (browser_all.mjs). Here the server side is checked: the first HTML for each URL and each stored state.
async function uxc2Checks({ c2, cr, anon, accounts, pbUrl, dataDir }) {
  const LF = "left_foot_full";
  const countOf = (html, re) => (html.match(re) ?? []).length;
  const keysOf = (html) => new Set([...html.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1]));
  const sectionsOf = (html) => (html.match(/data-section="p\d+"/g) ?? []).map((x) => x.slice(14, -1));
  const putUi = (c, ui, panes = {}) => c.req("/api/htv/settings", { method: "PUT", json: { panes: { v: 1, panes, ...(ui === undefined ? {} : { ui }) } } });
  const btn = (html, attr) => (html.match(new RegExp(`<button[^>]*${attr}[^>]*>`)) ?? [""])[0];
  const off = (tag) => /\sdisabled(=|\s|>)/.test(tag); // the attribute, not the class names disabled:opacity-50

  // --- page view: the first HTML
  const rows48 = (await c2.req(`/api/htv/page?ids=${LF}/p048`)).json?.pages?.[0]?.data?.rows ?? [];
  let r = await c2.req(`/translate/${LF}?view=page&at=p048`);
  let html = r.body;
  let text = htvText(html);
  check("Page view ?view=page&at=p048: one page section (p048) with its 5 rows, own boxes, ticks, Save, and comments, and no other page section", r.status === 200 && JSON.stringify(sectionsOf(html)) === '["p048"]' && rows48.length === 5 && keysOf(html).size === 5 && [...keysOf(html)].every((k) => k.startsWith(`${LF}/p048/`)) && countOf(html, /aria-label="Own translation for /g) === 5 && countOf(html, /data-agree="/g) === 5 && countOf(html, /data-save="/g) === 1 && countOf(text, /Comments \(\d+\)/g) === 5, `${sectionsOf(html).join(",")} ${keysOf(html).size} rows`);
  check("Page view: the switch shows Scroll view and Page view with Page view pressed, the page now reads 'Page p048 of 120', and the panel shows p048", /data-view-switch[^>]*data-view-now="page"/.test(html) && /<button[^>]*aria-pressed="true"[^>]*data-view="page"/.test(html) && /<button[^>]*aria-pressed="false"[^>]*data-view="scroll"/.test(html) && /Scroll view/.test(text) && /Page view/.test(text) && /Page p048 of 120/.test(text) && /data-panel-page="p048"/.test(html));
  check("Page view: the top and the bottom each hold the buttons 'Previous page' and 'Next page' (enabled at p048), and the top holds the page number box", countOf(html, /data-page-prev="/g) === 2 && countOf(html, /data-page-next="/g) === 2 && countOf(text, /Previous page(?! pair)/g) === 2 && countOf(text, /Next page/g) === 2 && !off(btn(html, 'data-page-prev="top"')) && !off(btn(html, 'data-page-next="top"')) && /data-page-input/.test(html) && /Page number/.test(text), `${countOf(html, /data-page-prev="/g)} ${countOf(html, /data-page-next="/g)} ${countOf(text, /Previous page(?! pair)/g)} ${countOf(text, /Next page/g)} ${off(btn(html, 'data-page-prev="top"'))} ${off(btn(html, 'data-page-next="top"'))} ${btn(html, 'data-page-prev="top"').slice(0, 200)}`);
  check("Page view: the left index lists all 120 pages, and the heading of the page is plain text (no pin button)", countOf(html, /data-index-page="p\d+"/g) === 120 && !/data-pin=/.test(html) && /data-page-heading="left_foot_full\/p048"/.test(html));
  r = await c2.req(`/translate/${LF}?view=page&at=p045`);
  html = r.body;
  text = htvText(html);
  check("Page view at p045 (no agent translation): one page section with the page number and the tag 'No agent translation', no rows, and the panel says 'No agent run for this page.'", r.status === 200 && JSON.stringify(sectionsOf(html)) === '["p045"]' && /No agent translation/.test(text) && countOf(html, /data-untagged/g) === 1 && keysOf(html).size === 0 && /No agent run for this page\./.test(text) && /Page p045 of 120/.test(text));
  r = await c2.req(`/translate/${LF}?view=page&at=p001`);
  check("Page view at p001: Previous page is disabled and Next page is enabled", off(btn(r.body, 'data-page-prev="top"')) && !off(btn(r.body, 'data-page-next="top"')));
  r = await c2.req(`/translate/${LF}?view=page&at=p120`);
  check("Page view at p120: Next page is disabled and Previous page is enabled", off(btn(r.body, 'data-page-next="top"')) && !off(btn(r.body, 'data-page-prev="top"')) && JSON.stringify(sectionsOf(r.body)) === '["p120"]');
  r = await c2.req(`/translate/${LF}?view=page&at=p999`);
  text = htvText(r.body);
  check("Page view with a page outside the book (p999): a clear message 'No such page: p999. This book has pages 1 to 120.' and the screen shows p001", r.status === 200 && /data-at-note/.test(r.body) && /No such page: p999\. This book has pages 1 to 120\./.test(text) && JSON.stringify(sectionsOf(r.body)) === '["p001"]', JSON.stringify(sectionsOf(r.body)));
  r = await c2.req(`/translate/${LF}?view=page`);
  check("Page view with no ?at: the first page (p001)", JSON.stringify(sectionsOf(r.body)) === '["p001"]' && !/data-at-note/.test(r.body));
  r = await c2.req(`/translate/${LF}?view=scroll&at=p048`);
  check("?view=scroll keeps the scroll view: 120 page sections, the switch has Scroll view pressed, no Previous page button", countOf(r.body, /data-section="p\d+"/g) === 120 && /data-view-switch[^>]*data-view-now="scroll"/.test(r.body) && !/data-page-prev/.test(r.body) && /data-pin="left_foot_full\/p048"/.test(r.body));
  r = await cr.req(`/translate/${LF}?view=page&at=p048`);
  check("Page view address for the reader: /translate/<book>?view=page&at=p048 sends the reader to /read (the old read-only page view ended)", r.go === "/read" && !/data-row=/.test(r.body), `status ${r.status}, go ${r.go}`);

  // --- the view choice in the account: URL first, then the account, then the scroll view
  r = await c2.req("/api/htv/settings");
  check("View choice: a new setting record has no ui key (older records stay readable)", r.status === 200 && r.json?.panes?.ui === undefined, JSON.stringify(r.json?.panes?.ui));
  r = await c2.req(`/translate/${LF}?at=p048`);
  check("View choice: with no view in the URL and none in the account the scroll view shows (120 sections)", countOf(r.body, /data-section="p\d+"/g) === 120 && /data-view-now="scroll"/.test(r.body));
  r = await putUi(c2, { view: "page" });
  check("View choice: PUT /api/htv/settings with ui.view page gives 200 and the route gives it back", r.status === 200 && r.json?.panes?.ui?.view === "page", JSON.stringify(r.json?.panes));
  r = await c2.req(`/translate/${LF}?at=p049`);
  check("View choice: with the account value page and no view in the URL, the page view shows p049 only", JSON.stringify(sectionsOf(r.body)) === '["p049"]' && /data-view-now="page"/.test(r.body));
  r = await c2.req(`/translate/${LF}?view=scroll&at=p049`);
  check("View choice: a view in the URL wins over the account (view=scroll shows 120 sections)", countOf(r.body, /data-section="p\d+"/g) === 120);
  r = await putUi(c2, { view: "scroll" });
  r = await c2.req(`/translate/${LF}?view=page&at=p049`);
  check("View choice: a view in the URL wins over the account (view=page with account value scroll shows p049 only)", JSON.stringify(sectionsOf(r.body)) === '["p049"]');
  r = await c2.req(`/translate/${LF}`);
  check("View choice: with the account value scroll and no view in the URL the scroll view shows", countOf(r.body, /data-section="p\d+"/g) === 120);

  // --- the panels: state and widths in the account
  r = await c2.req(`/translate/${LF}?at=p048`);
  html = r.body;
  check("Panels open by default: the index is 192 px wide and the TL_3 panel 416 px, both with a collapse button and a cog in the header, and no close button", /data-index-width="192"/.test(html) && /data-panel-width="416"/.test(html) && /data-panel-collapse="index"/.test(html) && /data-panel-collapse="tl3"/.test(html) && countOf(html, /data-cog="list"/g) === 1 && countOf(html, /data-cog="tl3"/g) === 1 && !/data-panel-close|Close the panel|Hide the TL_3|Show the TL_3/.test(html) && !/data-panel-collapsed/.test(html));
  r = await putUi(c2, { view: "scroll", index: { open: false, width: 300 }, tl3: { open: false } });
  check("Panel state: PUT ui with both panels collapsed and the index width 300 gives 200", r.status === 200 && r.json?.panes?.ui?.index?.open === false && r.json.panes.ui.index.width === 300 && r.json.panes.ui.tl3?.open === false, JSON.stringify(r.json?.panes?.ui));
  r = await c2.req(`/translate/${LF}?at=p048`);
  html = r.body;
  text = htvText(html);
  check("Panel state: with both panels collapsed the first HTML holds two bars of 28 px with the names 'Book index' and 'TL_3 information panel' and an arrow, and no open panel", /<aside[^>]*style="[^"]*width:\s*28px[^"]*"[^>]*data-panel-collapsed="index"/.test(html) && /<aside[^>]*style="[^"]*width:\s*28px[^"]*"[^>]*data-panel-collapsed="tl3"/.test(html) && /Book index/.test(text) && /TL_3 information panel/.test(text) && /data-panel-open="index"/.test(html) && /data-panel-open="tl3"/.test(html) && /▶/.test(text) && /◀/.test(text) && !/data-panel-width=/.test(html) && !/data-index-width=/.test(html) && !/data-panel-header|data-index-header/.test(html), "");
  check("Panel state: the collapsed bars hold no cog (the cog sits in the header of an open panel)", countOf(html, /data-cog="list"/g) === 0 && countOf(html, /data-cog="tl3"/g) === 0 && countOf(html, /data-column-header/g) === 1);
  r = await putUi(c2, { view: "scroll", index: { open: true, width: 300 }, tl3: { open: true } });
  r = await c2.req(`/translate/${LF}?at=p048`);
  check("Panel state: open again, the index has its old width (300 px) and the TL_3 panel its width (416 px)", /data-index-width="300"/.test(r.body) && /data-panel-width="416"/.test(r.body) && !/data-panel-collapsed/.test(r.body));
  r = await putUi(c2, { view: "zzz", index: { open: "yes", width: 5000 }, tl3: { open: 1 }, evil: 1 });
  check("Panel state: the sanitizer drops a bad view, a bad open value, and an unknown key, and clamps the width to 400", r.status === 200 && r.json?.panes?.ui?.view === undefined && r.json.panes.ui.index?.open === undefined && r.json.panes.ui.index?.width === 400 && r.json.panes.ui.tl3 === undefined && !("evil" in (r.json.panes.ui ?? {})), JSON.stringify(r.json?.panes?.ui));
  r = await putUi(c2, undefined, { tl3: { width: 520 } });
  check("Panel state: an old record (panes only, no ui) stays readable: the tl3 width 520 shows and no ui key comes back", r.status === 200 && r.json?.panes?.ui === undefined && r.json.panes.panes.tl3.width === 520);
  r = await c2.req(`/translate/${LF}?at=p048`);
  check("Panel state: an old record gives open panels, the default index width 192 px, and the TL_3 width 520 px", /data-index-width="192"/.test(r.body) && /data-panel-width="520"/.test(r.body));
  r = await putUi(c2, { view: "page", index: { open: true, width: 250 }, tl3: { open: false } }, { tl3: { width: 480 } });
  const rec = (await pbCall(pbUrl, "GET", "/api/collections/user_settings/records", c2.token())).json?.items?.[0];
  check("Panel state: PocketBase holds the state in user_settings.panes (ui.view page, index.width 250, tl3.open false, panes.tl3.width 480), and the record has no new column", rec?.panes?.ui?.view === "page" && rec.panes.ui.index?.open === true && rec.panes.ui.index?.width === 250 && rec.panes.ui.tl3?.open === false && rec?.panes?.panes?.tl3?.width === 480 && Object.keys(rec ?? {}).sort().join(",") === "collectionId,collectionName,created,id,panes,theme,updated,user", JSON.stringify(rec?.panes).slice(0, 300));
  r = await c2.req(`/translate/${LF}?at=p048`);
  check("Account state at the first paint: view page, index 250 px, and the TL_3 panel collapsed show together", JSON.stringify(sectionsOf(r.body)) === '["p048"]' && /data-index-width="250"/.test(r.body) && /data-panel-collapsed="tl3"/.test(r.body));
  await putUi(c2, undefined, {});

  // --- a book with no run: the 36 books and the web article
  const facts = await dataFacts(dataDir);
  const noRun = facts.bookSlugs.includes("kendojidai_2013") && !facts.slugsWithRun.has("kendojidai_2013") ? "kendojidai_2013" : facts.bookSlugs.find((x) => !facts.slugsWithRun.has(x));
  r = await c2.req("/translate");
  const row = new RegExp(`data-book="${noRun}" data-pages="(\\d+)" data-tagged="(\\d+)"`).exec(r.body);
  const pagesOfNoRun = Number(row?.[1] ?? 0);
  check(`Book with no run (${noRun}): the book list shows it with its page count and 0 pages with an agent translation`, !!row && pagesOfNoRun > 0 && row[2] === "0", row ? `${row[1]} pages, ${row[2]} tagged` : "no row");
  r = await c2.req(`/translate/${noRun}`);
  text = htvText(r.body);
  check(`Book with no run (${noRun}): the book screen opens with ${pagesOfNoRun} page sections, each with its page number and the tag 'No agent translation', no rows, and no tag of a verdict`, r.status === 200 && countOf(r.body, /data-section="p\d+"/g) === pagesOfNoRun && countOf(r.body, /data-untagged/g) === pagesOfNoRun && keysOf(r.body).size === 0 && countOf(r.body, /data-index-tag=/g) === 0 && /No agent translation/.test(text) && new RegExp(`${pagesOfNoRun} pages\\. 0 pages have an agent translation`).test(text), `status ${r.status}`);
  r = await c2.req(`/translate/${noRun}?view=page&at=p0500`);
  text = htvText(r.body);
  check(`Book with no run (${noRun}) in the page view at p0500: the page number p0500 and the tag 'No agent translation'`, r.status === 200 && JSON.stringify(sectionsOf(r.body)) === '["p0500"]' && /No agent translation/.test(text) && /Page p0500 of \d+/.test(text));
  r = await c2.req("/translate/18d4ac29?view=page&at=p001");
  check("The web article 18d4ac29 opens in the page view with its one page and rows, and both page buttons disabled", r.status === 200 && JSON.stringify(sectionsOf(r.body)) === '["p001"]' && keysOf(r.body).size >= 1 && off(btn(r.body, 'data-page-prev="top"')) && off(btn(r.body, 'data-page-next="top"')));
  r = await c2.req("/translate/zzz_none");
  check("A slug that is no book folder and has no run gives 404", r.missing, `status ${r.status}`);
  const web = facts.listed.has("18d4ac29") ? await c2.req("/translate") : null;
  check("The list holds the web article 18d4ac29 with its title empty (the slug shows), 1 page, and 1 page with an agent translation", /data-book="18d4ac29" data-pages="1" data-tagged="1"/.test(web?.body ?? ""));

  // --- the six fixes of the Next guide review
  const titleOf = (h) => (/<title>([^<]*)<\/title>/.exec(h) ?? [])[1];
  const titles = [titleOf((await c2.req("/translate")).body), titleOf((await c2.req(`/translate/${LF}`)).body), titleOf((await anon.req("/translate/sign-in")).body), titleOf((await c2.req(`/translate/${LF}?view=page&at=p048`)).body)];
  const monTitle = titleOf((await anon.req("/")).body);
  check("Fix 6: the browser title of /translate, a book, the sign-in page, and the page view is 'human-translation-view', and the monitor keeps 'agent-translation-monitor'", titles.every((t) => t === "human-translation-view") && monTitle === "agent-translation-monitor", titles.join(" | ") + " | " + monTitle);

  const P14 = "mental_full/p014";
  const K1 = `${P14}/ts3/L01-L08`;
  r = await c2.req("/api/htv/comments", { method: "POST", json: { pageId: P14, groupKey: K1, runId: "20261028T023007Z-r41", text: "UXC2 uid check", shared: true } });
  const cid = r.json?.comment?.id;
  check("Fix 3: the answer of a new comment holds the keys id, userName, mine, and no key userId", r.status === 200 && !!cid && !("userId" in (r.json.comment ?? {})) && !/userId/.test(r.body) && r.json.comment.mine === true && typeof r.json.comment.userName === "string", `status ${r.status} ${r.body.slice(0, 200)}`);
  r = await c2.req("/translate/mental_full?at=p014");
  const apiPage = await c2.req(`/api/htv/page?ids=${P14}`);
  const apiComments = apiPage.json?.pages?.[0]?.comments ?? [];
  check("Fix 3: the first HTML of the page and the route /api/htv/page hold the comment but no userId", r.body.includes("UXC2 uid check") && !/userId/.test(r.body) && apiComments.length >= 1 && !/userId/.test(apiPage.body));
  r = await c2.req(`/api/htv/comments/${cid}`, { method: "DELETE", json: {} });

  const badOrigins = ["null", "not a url", "http://evil.example", "ftp://x"];
  const routes = [
    ["login", "POST", "/api/htv/login", () => accounts.tr1],
    ["theme", "PUT", "/api/theme", () => ({ theme: "light" })],
    ["logout", "POST", "/api/htv/logout", () => ({})],
    ["settings (guard)", "PUT", "/api/htv/settings", () => ({ panes: {} })],
  ];
  for (const [name, method, url, body] of routes) {
    const out = [];
    for (const o of badOrigins) out.push((await c2.req(url, { method, json: body(), headers: { origin: o } })).status);
    check(`Fix 4: ${name} refuses Origin 'null', 'not a url', a foreign host, and a non-http origin with 403 (no 500)`, out.every((x) => x === 403), out.join(","));
  }
  const base2 = new URL(base).host;
  r = await c2.req("/api/theme", { method: "PUT", json: { theme: "light" }, headers: { origin: `http://${base2}` } });
  check("Fix 4: an Origin that equals the Host passes (200)", r.status === 200, `status ${r.status}`);
  r = await c2.req("/api/theme", { method: "PUT", json: { theme: "light" }, headers: { origin: "https://app.example", "x-forwarded-host": "app.example" } });
  check("Fix 4: an Origin that equals X-Forwarded-Host passes (200)", r.status === 200, `status ${r.status}`);
  r = await c2.req("/api/theme", { method: "PUT", json: { theme: "light" }, headers: { origin: "https://app.example", "x-forwarded-host": "app.example, proxy.example" } });
  check("Fix 4: X-Forwarded-Host with a list uses the first value (200)", r.status === 200, `status ${r.status}`);
  r = await c2.req("/api/theme", { method: "PUT", json: { theme: "light" }, headers: { origin: `http://${base2}`, "x-forwarded-host": "app.example" } });
  check("Fix 4: when X-Forwarded-Host is present it decides, so an Origin that equals only the Host gets 403", r.status === 403, `status ${r.status}`);
  r = await c2.req("/api/theme", { method: "PUT", json: { theme: "light" }, headers: { origin: "https://app.example", "x-forwarded-host": "other.example" } });
  check("Fix 4: an Origin that differs from X-Forwarded-Host gets 403", r.status === 403, `status ${r.status}`);
  r = await c2.req("/api/theme", { method: "PUT", json: { theme: "light" } });
  check("Fix 4: a request with no Origin header passes as before (200)", r.status === 200, `status ${r.status}`);

  const signin = await c2.req(`/translate/sign-in?next=${encodeURIComponent("/translate/" + LF)}`);
  check("Fix 1: the sign-in page of a signed-in user redirects to the next address (redirect outside the try block)", signin.go === "/translate/" + LF, `status ${signin.status}, go ${signin.go}`);
  const bad = await c2.req(`/translate/sign-in?next=${encodeURIComponent("https://evil.example/x")}`);
  check("Fix 1: a next address outside the view goes to /translate", bad.go === "/translate", `status ${bad.status}, go ${bad.go}`);
  const anonSign = await anon.req("/translate/sign-in");
  check("Fix 1: the sign-in page of a visitor shows the form", anonSign.status === 200 && /type="password"/.test(anonSign.body));

  const exists = (f) => fs.stat(f).then(() => true, () => false);
  const loadingRaw = await anon.req("/translate");
  check("Fix 2: the files app/translate/loading.tsx and app/translate/error.tsx exist, and the loading text 'Loading…' is part of the first HTML of a route under /translate", (await exists("app/translate/loading.tsx")) && (await exists("app/translate/error.tsx")) && /data-route-loading/.test((await c2.req("/translate")).body + loadingRaw.body), `status ${loadingRaw.status}`);
  const errSrc = await fs.readFile("app/translate/error.tsx", "utf-8");
  check("Fix 2: error.tsx is a Client Component with the props error and retry (guide error.md)", /^"use client";/.test(errSrc) && /\{ error, retry \}/.test(errSrc) && /retry\(\)/.test(errSrc));
  r = await c2.req("/api/theme", { method: "PUT", json: { theme: "light" } });
}

// Checks of the book screen. They run in both run sources (files and pocketbase).
async function bookScreenChecks({ c1, ca, cr, anon }) {
  const LF = "left_foot_full";
  const countOf = (html, re) => (html.match(re) ?? []).length;
  const keysOf = (html) => new Set([...html.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1]));

  // redirect of the old page URL
  let r = await c1.req(`/translate/${LF}/p048`);
  check("Old page URL /translate/left_foot_full/p048 redirects (307) to /translate/left_foot_full?at=p048#p048", r.go === `/translate/${LF}?at=p048#p048`, `status ${r.status}, location ${r.location}`);
  r = await c1.req("/translate/kendojidai_2014/p0839");
  check("Old page URL with a 4-digit page ID redirects to ?at=p0839#p0839", r.go === "/translate/kendojidai_2014?at=p0839#p0839", `location ${r.location}`);
  r = await c1.req(`/translate/${LF}/x48`);
  check("Old page URL with a bad page name gives 404", r.missing, `status ${r.status}`);
  r = await anon.req(`/translate/${LF}`);
  check("Not signed in: the book screen redirects to the sign-in page", r.go.includes("/translate/sign-in"), `status ${r.status}`);

  // the page index of left_foot_full: 120 pages, 6 tagged
  r = await c1.req(`/translate/${LF}`);
  let html = r.body;
  let text = htvText(html);
  check("Book screen left_foot_full: 120 page sections in order p001 to p120", r.status === 200 && countOf(html, /data-section="p\d+"/g) === 120 && /data-section="p001"/.test(html) && /data-section="p120"/.test(html) && !/data-section="p121"/.test(html), `status ${r.status}`);
  check("Book screen left_foot_full: 114 pages carry the tag 'No agent translation' and 6 carry a verdict", countOf(html, /data-untagged/g) === 114 && countOf(html, /data-index-tag="(PASS|FAIL)"/g) === 6 && text.includes("No agent translation"), `${countOf(html, /data-untagged/g)} untagged, ${countOf(html, /data-index-tag=/g)} tagged`);
  check("Book screen left_foot_full: the index lists 120 pages with the box 'Go to page'", countOf(html, /data-index-page="p\d+"/g) === 120 && /Go to page/.test(text) && /id="go-to-page"/.test(html));
  check("Book screen left_foot_full: the header says 120 pages and 6 with an agent translation, and links to p046", /120 pages\. 6 pages have an agent translation/.test(text) && /href="#p046"[^>]*data-first-tagged|data-first-tagged[^>]*href="#p046"/.test(html));
  check("Book screen left_foot_full: an untranslated page shows no rows, no own box, no image", countOf(html, /aria-label="Own translation for /g) === 0 && countOf(html, /<img/g) === 0 && countOf(html, /data-row="/g) === 0);
  check("Book screen left_foot_full without ?at: tagged pages far from the top say 'Loading the rows' and the panel says 'No agent run for this page.'", countOf(html, /data-loading(?!-)/g) === 6 && /No agent run for this page\./.test(text) && /data-panel-page="p001"/.test(html));

  // the window around p048: p046 to p050
  r = await c1.req(`/translate/${LF}?at=p048`);
  html = r.body;
  text = htvText(html);
  const keys = keysOf(html);
  const perPage = (p) => [...keys].filter((k) => k.startsWith(`${LF}/${p}/`)).length;
  check("Book screen ?at=p048: the server loads the window p046 to p050 (rows for each of the 5 pages), and p075 waits (Loading)", r.status === 200 && ["p046", "p047", "p048", "p049", "p050"].every((p) => perPage(p) >= 1) && perPage("p075") === 0 && countOf(html, /data-loading(?!-)/g) === 1, ["p046", "p047", "p048", "p049", "p050"].map((p) => `${p}:${perPage(p)}`).join(" "));
  check("Book screen ?at=p048: the panel shows the page at ?at (p048)", /data-panel-page="p048"/.test(html) && /TL_3 information panel/.test(text));
  check("Book screen ?at=p048: each loaded page section has its own Save, own version line, and own comments button (translator)", countOf(html, /data-save="/g) === 5 && countOf(text.replace(/\s+/g, " "), /No saved version yet/g) >= 1 && countOf(text, /Comments \(\d+\)/g) >= 5);
  r = await c1.req(`/translate/${LF}?at=p999`);
  check("Book screen with ?at outside the book (p999) gives 200 and starts at the top", r.status === 200 && /data-panel-page="p001"/.test(r.body), `status ${r.status}`);
  r = await c1.req(`/translate/${LF}?at=zzz`);
  check("Book screen with a bad ?at gives 200", r.status === 200, `status ${r.status}`);
  r = await c1.req("/translate/zzz_none");
  check("An unknown book gives 404", r.missing, `status ${r.status}`);
  r = await c1.req("/translate/..%2Fx");
  check("A bad book name gives 404", r.missing, `status ${r.status}`);

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
  check("Reader on the book screen address: /translate/<book>?at=p048 sends the reader to /read and shows no row, no panel, no own box", r.go === "/read" && !/data-row=/.test(html) && !/data-panel-page=/.test(html), `status ${r.status}, go ${r.go}`);
  r = await cr.req(`/api/htv/page?ids=${LF}/p048`);
  check("Reader: GET /api/htv/page answers 403 (the human-translation-view API is for translators and admins)", r.status === 403, `status ${r.status}`);
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
  check("Not signed in: /translate redirects to the sign-in page", r.go.includes("/translate/sign-in"), `status ${r.status}`);
  r = await anon.req(`/translate/${P14}`);
  check("Not signed in: a page redirects and keeps the way back", r.go.includes("/translate/sign-in") && r.go.includes("next="), `status ${r.status}`);
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
  const facts = await dataFacts(dataDir);
  check(`Book list 200 and shows every book of the data (${facts.listed.size} rows: the ${facts.bookSlugs.length} book folders and the items that have a finished run), with ${facts.pages.length} pages that have an agent translation`, r.status === 200 && facts.bookSlugs.length === 36 && bookRows.length === facts.listed.size && new Set(bookRows.map((x) => x.slug)).size === facts.listed.size && facts.listed.has("18d4ac29") && taggedSum === facts.pages.length, `status ${r.status}, ${bookRows.length} books of ${facts.listed.size}, ${taggedSum} tagged pages of ${facts.pages.length}`);
  const nonBook = bookRows.filter((x) => !facts.listed.has(x.slug));
  check("Book list: no web article of items.filled.jsonl (311 rows with long IDs) shows, only the web article with a run", nonBook.length === 0 && !bookRows.some((x) => /^[0-9a-f]{8}-/.test(x.slug)), nonBook.slice(0, 3).map((x) => x.slug).join(","));
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
  check("reader: /translate/mental_full?at=p014 sends the reader to /read and shows no row, no panel, no comments", r.go === "/read" && !r.body.includes("If you apply this") && !/TL_3 information panel/.test(text), `status ${r.status}, go ${r.go}`);
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
  // Unit UXC2 (round 61, finding of unit DPP): the expected text comes from the newest finished run of p050 in the data, so the check does not go stale when a new run ends.
  const p050 = (await dataFacts(dataDir)).runsOf["left_foot_full/p050"]?.[0];
  const p050Line = lowerPairFirstLine(await fs.readFile(path.join(p050?.dir ?? "", "messages/TL_3.txt"), "utf-8").catch(() => ""));
  check("p050 lower pair shows plain EN lines with short IDs (ts2/L01) and the full ID in the tooltip, and the first line equals the first line of the newest finished run", /ts2\/L01/.test(text) && html.includes('title="left_foot_full/p050/ts2/L01"') && p050Line.length > 10 && squash(htvText(html)).includes(squash(p050Line)), `newest run ${p050?.run.runId}, line "${p050Line.slice(0, 50)}"`);
  check("p050 memory pair chip names the page and the pair (left_foot_full/p049 · P02) and hides the run and 'split none'", text.includes("left_foot_full/p049 · P02") && !/split none/.test(text) && !/20261028T023006Z\/20261028T040511Z/.test(text));
  const marksStart = html.indexOf('data-block="earlier_term_marks"');
  const marksHtml = html.slice(marksStart, html.indexOf("<script", marksStart));
  check("p050 earlier term marks show a table with the EN term and the result, and hide the entry IDs", /EN term/.test(text) && text.includes("Kendō (the way of the sword)") && /breaks/.test(text) && marksStart > 0 && !/c-[0-9a-f]{12}/.test(marksHtml.replace(/data-term="[^"]*"/g, "")));
  check("p050 panel has a drag handle (width 416 px at start) and a collapse button, and no close button", /data-panel-width="416"/.test(html) && /data-panel-handle/.test(html) && /data-panel-collapse="tl3"/.test(html) && /Collapse the TL_3 information panel/.test(html) && !/data-panel-close/.test(html) && !/Close the panel/.test(text) && !/Hide the TL_3 information panel|Show the TL_3 information panel/.test(text));

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
  check("A page without a finished run gives 404", r.missing, `status ${r.status}`);
  r = await c1.req("/translate/men0?at=p005");
  check("men0/p005 shows the newest finished run (not the unfinished folder)", r.status === 200 && r.body.includes("20261026T182512Z-r41") && !r.body.includes("20261026T001543Z"), `status ${r.status}`);
  r = await c1.req("/translate/..%2Fx/p001");
  check("A bad page name gives 404", r.missing, `status ${r.status}`);
  r = await c1.req("/translate/zzz_none/p001");
  check("The old route of a page in an unknown book redirects to the book screen, which gives 404", r.go === "/translate/zzz_none?at=p001#p001", `status ${r.status}, location ${r.location}`);

  // --- unit UXC step D: the book screen (round 58 answer 3, round 59 answers 3 and 4)
  await bookScreenChecks({ c1, ca, cr, anon });

  // --- unit UXC step E: the settings cog and the settings in the account (round 58 answer 5, round 59 answer 6)
  await settingsChecks({ c1, c2, ca, cr, anon, accounts, pbUrl });

  // --- unit UXC2: page view, panels, 36 books, six review fixes (round 61)
  await uxc2Checks({ c2, cr, anon, accounts, pbUrl, dataDir });

  // --- sign out
  r = await c1.req("/api/htv/logout", { method: "POST", json: {} });
  check("Sign out clears the cookie", r.status === 200 && c1.token() === "");
  r = await c1.req("/translate");
  check("After sign out /translate redirects to the sign-in page", r.go.includes("/translate/sign-in"), `status ${r.status}`);

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
  check("A changed token counts as not signed in", r.go.includes("/translate/sign-in"), `status ${r.status}`);
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
  check("Deploy: not signed in, /translate redirects to the sign-in page", r.go.includes("/translate/sign-in"), `status ${r.status}`);
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
  const catalogTotal = (await pbCall(pbUrl, "GET", "/api/collections/catalog_items/records?perPage=1", c.token())).json?.totalItems;
  check(`Deploy: /translate 200 with the books from PocketBase (one row for each row of catalog_items: ${catalogTotal}, left_foot_full among them)`, r.status === 200 && typeof catalogTotal === "number" && catalogTotal >= 37 && booksInList.size === catalogTotal && booksInList.has("left_foot_full") && booksInList.has("18d4ac29") && booksInList.has("kendojidai_2013"), `status ${r.status}, ${booksInList.size} books, ${catalogTotal} catalog rows`);
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
  check("Deploy: the old page URL redirects to the book screen", old.go === "/translate/left_foot_full?at=p048#p048", `status ${old.status}`);
  check("Deploy: page view has own boxes for the translator", /aria-label="Own translation for /.test(r.body));
  r = await c.req("/translate/zzz_none?at=p001");
  check("Deploy: a page without a run gives 404 and no Mac path", r.missing && !r.body.includes("/Users/"), `status ${r.status}`);

  const cr = new Client("reader");
  r = await cr.req("/api/htv/login", { method: "POST", json: rd });
  check("Deploy: reader sign-in gives 200 and the role reader", r.status === 200 && r.json?.user?.role === "reader", `status ${r.status}`);
  r = await cr.req("/translate/left_foot_full?at=p048");
  check("Deploy: reader at /translate/left_foot_full?at=p048 goes to /read and sees no row", r.go === "/read" && !/data-row="/.test(r.body), `status ${r.status}, go ${r.go}`);
  r = await cr.req("/api/htv/save", { method: "POST", json: { pageId: P, runId: "x", rows: [] } });
  check("Deploy: reader cannot save (403)", r.status === 403, `status ${r.status}`);
}

// ---------------------------------------------------------------- mode read (unit RC1, round 63)
// Reader pages: sign-up and approval, book list, book screen, page view, text modes, scroll view, focus mode, term pop-up, AI label,
// agree tag, admin choice of a human version, page check, bookmarks, resume, themes, and the closed research layer.
// The server reads PocketBase (runSource pocketbase) after the S2 upload. The prepared data (run_all.py): translator tr1 saved version 1 of
// left_foot_full/p048 (row L01-L05 ticked agree, row L06-L10 and T01 with own text), and S2 ran again so that reader_pages holds the agree list.
// Needs: HTV_ADMIN_*, HTV_TR1_*, HTV_READER_* (approved), HTV_READER2_* (not approved) and the throwaway PocketBase on 8092.

async function readTest() {
  const accounts = { admin: envPair("ADMIN"), tr1: envPair("TR1"), reader: envPair("READER"), reader2: envPair("READER2") };
  const pbUrl = (process.env.VIEWER_POCKETBASE_URL ?? (JSON.parse(await fs.readFile(configFile ? path.resolve(configFile) : path.resolve("viewer.config.json"), "utf-8")).pocketbaseUrl ?? "")).replace(/\/+$/, "");
  check("Read: the app uses the throwaway PocketBase (port 8092)", pbUrl === "http://127.0.0.1:8092", pbUrl);
  const LF = "left_foot_full";
  const P48 = `${LF}/p048`;
  const JA_START = "わたしは剣先を相手の中墨から外さず攻めつづけ、";
  const EN_START = "I keep applying Seme without letting my Kensen leave the Ai-te's Chūzumi (centerline),";
  const countOf = (html, re) => (html.match(re) ?? []).length;
  // A term mark splits a text into parts, and the text of the page has a space at each split. Compare without spaces.
  const squash = (t) => t.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, "");
  const login = async (who, label) => {
    const c = new Client(label ?? who);
    const r = await c.req("/api/htv/login", { method: "POST", json: accounts[who] });
    return { c, r };
  };
  // words and keys of the research layer. None may reach a reader.
  const LEAK_HTML = /"verdict"|\\"verdict\\"|qa3_page_score|"score"|\\"score\\"|\bQA_3\b|\bTL_3\b|"panel"|\\"panel\\"|reasoning|"enFormCheck"|EN form check/;
  const LEAK_KEYS = new Set(["verdict", "score", "panel", "reasoning", "qa", "qa3_page_score", "result", "detail", "tsIds", "tl3Message"]);
  const walkKeys = (v, out = new Set()) => {
    if (Array.isArray(v)) v.forEach((x) => walkKeys(x, out));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
      out.add(k);
      walkKeys(x, out);
    }
    return out;
  };
  const leakKeys = (json) => [...walkKeys(json)].filter((k) => LEAK_KEYS.has(k));
  const put = (c, reader) => c.req("/api/read/settings", { method: "PUT", json: { reader } });

  // --- public pages and sign-up
  const anon = new Client("anon");
  let r = await anon.req("/sign-up");
  check("Sign-up page: 200, the form, a link to sign in", r.status === 200 && /data-sign-up/.test(r.body) && /href="\/sign-in"/.test(r.body), `status ${r.status}`);
  r = await anon.req("/sign-in");
  check("Sign-in page of the reader pages: 200, the form, a link to sign up", r.status === 200 && /Sign in to read/.test(r.body) && /href="\/sign-up"/.test(r.body), `status ${r.status}`);
  check("Default theme of the reader pages: a visitor with no cookie gets the marker solarized-light, and the transient theme of <html> is light until the script runs", /data-reader-default-theme="solarized-light"/.test(r.body) && /data-theme-explicit="no"/.test(r.body));
  r = await anon.req("/translate/sign-in");
  check("Default theme of the human-translation-view stays light (data-theme=\"light\", no reader marker)", /<html[^>]*data-theme="light"/.test(r.body) && !/data-reader-default-theme/.test(r.body));
  r = await anon.req("/read");
  check("/read without sign-in redirects to /sign-in?next=%2Fread", r.go === "/sign-in?next=%2Fread", `status ${r.status}, go ${r.go}`);
  r = await anon.req(`/read/${LF}?at=p048`);
  check("/read/<book> without sign-in redirects to /sign-in", /^\/sign-in\?next=/.test(r.go), `go ${r.go}`);
  r = await anon.req("/admin/readers");
  check("/admin/readers without sign-in redirects to /sign-in", /^\/sign-in\?next=/.test(r.go), `go ${r.go}`);
  r = await anon.req(`/api/read/page?ids=${P48}`);
  check("GET /api/read/page without sign-in gives 401", r.status === 401, `status ${r.status}`);

  const email = `new-reader-${Date.now()}@rc1-test.local`;
  const pw = "Aa1-" + Math.random().toString(36).slice(2, 14);
  const bad = (json) => anon.req("/api/read/sign-up", { method: "POST", json });
  r = await bad({ name: "N", email, password: "short" });
  check("Sign-up route: a password under 8 characters gives 400", r.status === 400, `status ${r.status}`);
  r = await bad({ name: "N", email: "not-an-email", password: pw });
  check("Sign-up route: a bad email gives 400", r.status === 400, `status ${r.status}`);
  r = await bad({ name: "", email, password: pw });
  check("Sign-up route: an empty name gives 400", r.status === 400, `status ${r.status}`);
  r = await anon.req("/api/read/sign-up", { method: "POST", json: { name: "N", email, password: pw }, headers: { origin: "https://evil.example" } });
  check("Sign-up route: a foreign origin gives 403", r.status === 403, `status ${r.status}`);
  r = await bad({ name: "New Reader", email, password: pw, role: "admin", approved: true });
  check("Sign-up route: a body with role admin and approved true still creates a reader that waits (the route ignores both keys)", r.status === 200, `status ${r.status}`);
  r = await bad({ name: "New Reader", email, password: pw });
  check("Sign-up route: the same email twice gives 400 with a plain message", r.status === 400 && /already used/.test(r.json?.error ?? ""), `status ${r.status}`);
  const direct = await pbCall(pbUrl, "POST", "/api/collections/users/records", "", { email: `x-${email}`, password: pw, passwordConfirm: pw, role: "admin" });
  check("PocketBase: a sign-up body with role admin is refused (create rule)", direct.status === 400 || direct.status === 403, `status ${direct.status}`);
  const direct2 = await pbCall(pbUrl, "POST", "/api/collections/users/records", "", { email: `y-${email}`, password: pw, passwordConfirm: pw, role: "reader", approved: true });
  check("PocketBase: a sign-up body with approved true is refused (create rule)", direct2.status === 400 || direct2.status === 403, `status ${direct2.status}`);

  // --- the new reader waits for approval
  const nr = new Client("new reader");
  r = await nr.req("/api/htv/login", { method: "POST", json: { email, password: pw } });
  check("The new account signs in: role reader, approved false", r.status === 200 && r.json?.user?.role === "reader" && r.json?.user?.approved === false, `status ${r.status}`);
  check("The sign-in of a reader with no saved theme sets the cookie theme=solarized-light (default of the reader pages)", r.setCookies.some((x) => /^theme=solarized-light/.test(x)));
  r = await nr.req("/read");
  let text = htvText(r.body);
  check("Waiting reader: /read shows the line 'Your account waits for approval by an admin.' and the 37 books", r.status === 200 && text.includes("Your account waits for approval by an admin.") && countOf(r.body, /data-book="/g) === 37, `books ${countOf(r.body, /data-book="/g)}`);
  check("Waiting reader: the book cards show no progress line", !/data-progress/.test(r.body));
  r = await nr.req(`/read/${LF}`);
  text = htvText(r.body);
  check("Waiting reader: the book screen shows the title, the author, and the waiting line, and no page list", r.status === 200 && /data-waiting/.test(r.body) && text.includes("The Secret of Kendo and the Left Foot") && !/data-index-page=/.test(r.body) && !/data-book-screen/.test(r.body), `status ${r.status}`);
  r = await nr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("Waiting reader: ?at=p048 shows no page text (no Japanese line, no English line, no row)", r.status === 200 && !text.includes("Kensen") && !r.body.includes(JA_START) && !/data-row=/.test(r.body) && /data-waiting/.test(r.body));
  r = await nr.req(`/api/read/page?ids=${P48}`);
  check("Waiting reader: GET /api/read/page gives 403", r.status === 403, `status ${r.status}`);
  const nrList = await pbCall(pbUrl, "GET", "/api/collections/reader_pages/records", nr.token());
  check("Waiting reader: PocketBase gives no reader_pages record (rule)", nrList.status === 403 || (nrList.status === 200 && (nrList.json?.items ?? []).length === 0), `status ${nrList.status}`);
  const nrBm = await nr.req("/api/read/bookmarks", { method: "POST", json: { pageId: P48 } });
  check("Waiting reader: a bookmark is refused (403)", nrBm.status === 403, `status ${nrBm.status}`);
  r = await nr.req("/admin/readers");
  check("Waiting reader: /admin/readers goes to /read", r.go === "/read", `go ${r.go}`);
  r = await nr.req("/api/admin/readers", { method: "POST", json: { id: "abc", approved: true } });
  check("Waiting reader: POST /api/admin/readers gives 403", r.status === 403, `status ${r.status}`);

  // --- admin approval
  const ad = (await login("admin")).c;
  const adminToken = ad.token();
  r = await ad.req("/admin/readers");
  text = htvText(r.body);
  check("Admin page /admin/readers lists the waiting reader with Approve", r.status === 200 && r.body.includes(`data-waiting-user="${email}"`) && /data-approve/.test(r.body), `status ${r.status}`);
  const u = await pbCall(pbUrl, "GET", `/api/collections/users/records?filter=${encodeURIComponent(`email="${email}"`)}`, adminToken);
  const newId = u.json?.items?.[0]?.id;
  check("PocketBase: the new account has approved false", u.json?.items?.[0]?.approved === false);
  r = await ad.req("/api/admin/readers", { method: "POST", json: { id: newId, approved: true } });
  check("Admin approves the reader (POST /api/admin/readers, 200)", r.status === 200, `status ${r.status}`);
  r = await ad.req("/api/admin/readers", { method: "POST", json: { id: newId } });
  check("Admin route: a body with no change gives 400", r.status === 400, `status ${r.status}`);
  const tr1c = (await login("tr1")).c;
  r = await tr1c.req("/api/admin/readers", { method: "POST", json: { id: newId, approved: false } });
  check("A translator cannot use the admin route (403)", r.status === 403, `status ${r.status}`);
  r = await tr1c.req("/admin/readers");
  check("A translator at /admin/readers goes to /read", r.go === "/read", `go ${r.go}`);
  r = await ad.req("/api/admin/readers", { method: "POST", json: { id: newId, approved: true }, headers: { origin: "https://evil.example" } });
  check("Admin route: a foreign origin gives 403", r.status === 403, `status ${r.status}`);
  r = await nr.req(`/api/read/page?ids=${P48}`);
  check("After approval the same reader gets the page API (200) without a new sign-in", r.status === 200, `status ${r.status}`);

  // --- approved reader: book list
  const rd = await login("reader");
  const cr = rd.c;
  check("Approved reader signs in: role reader, approved true", rd.r.status === 200 && rd.r.json?.user?.approved === true);
  r = await cr.req("/read");
  text = htvText(r.body);
  const leakList = LEAK_HTML.test(r.body);
  check("Book list: 37 cards, no waiting line", r.status === 200 && countOf(r.body, /data-book="/g) === 37 && !text.includes("waits for approval"), `books ${countOf(r.body, /data-book="/g)}`);
  check("Book list: the left_foot_full card shows the English title, the Japanese title, the author, the year, the page count, and the AI note on the synopsis", /The Secret of Kendo and the Left Foot/.test(text) && /Mitsuru Kobayashi/.test(text) && /2017/.test(text) && /120 pages/.test(text) && /Written by an AI agent/.test(text));
  check("Book list: the card shows 'AI translation: 6 of 120 pages'", /AI translation: 6 of 120 pages/.test(text));
  check("Book list: a field that is empty does not show the word unknown", !/unknown/i.test(text));
  check("Book list: no research field of the metadata row (sources, confidence, filled_by, confirmed_by)", !/confidence|filled_by|confirmed_by|"sources"/.test(r.body));
  check("Book list HTML holds no verdict, score, QA, TL_3, or reasoning", !leakList);
  check("Book list: the link of the web article card exists with a fallback title", /data-book="18d4ac29"/.test(r.body));

  // --- book screen
  r = await cr.req(`/read/${LF}`);
  text = htvText(r.body);
  check("Book screen: metadata block, the AI label summary 'AI translation: 6 of 120 pages. Human check: 0 of 6 pages.'", r.status === 200 && /data-book-screen/.test(r.body) && /AI translation: 6 of 120 pages\. Human check: 0 of 6 pages\./.test(text), `status ${r.status}`);
  check("Book screen: 120 pages are listed, 6 have reader text, 114 show 'No agent translation yet'", countOf(r.body, /data-index-page="p\d+"/g) === 120 && countOf(r.body, /data-has-text="yes"/g) === 6 && countOf(text, /No agent translation yet/g) === 114, `pages ${countOf(r.body, /data-index-page=/g)}, yes ${countOf(r.body, /data-has-text="yes"/g)}, none ${countOf(text, /No agent translation yet/g)}`);
  check("Book screen: the page name is the file number 'Page 48'", /Page 48/.test(text));
  check("Book screen: the synopsis has the note 'Written by an AI agent'", /data-synopsis/.test(r.body) && /Written by an AI agent/.test(text));
  check("Book screen: 'Start reading at Page 46' (no saved place yet)", /data-continue/.test(r.body) && /Start reading at Page 46/.test(text));
  check("Book screen HTML holds no verdict, score, QA, TL_3, or reasoning", !LEAK_HTML.test(r.body));
  r = await cr.req("/read/kendojidai_2014");
  text = htvText(r.body);
  check("Magazine year: month headings show (kendojidai_2014 has chapters), e.g. a heading with a month name and 2014", r.status === 200 && countOf(r.body, /data-index-chapter="/g) >= 1 && /(January|February|March|April|May|June|July|August|September|October|November|December) 2014/.test(text), `headings ${countOf(r.body, /data-index-chapter="/g)}`);
  check("Magazine year: page 839 has only FAIL runs and shows 'No agent translation yet' (4-digit page names)", /data-index-page="p0839"[^>]*data-has-text="no"/.test(r.body));
  r = await cr.req("/read/kendojidai_2014?view=page&at=p0839");
  text = htvText(r.body);
  check("Page with only FAIL runs: the page view shows 'No agent translation yet' and no row", r.status === 200 && /data-no-text/.test(r.body) && !/data-row=/.test(r.body) && /Page 839/.test(text));
  r = await cr.req("/read/does_not_exist");
  check("An unknown book gives 404", r.missing, `status ${r.status}`);
  r = await cr.req("/read/..%2Fetc");
  check("A bad book name gives 404", r.missing, `status ${r.status}`);
  r = await cr.req(`/read/${LF}?at=p999`);
  check("A page outside the book shows the book screen with a plain note", r.status === 200 && /No such page: p999/.test(htvText(r.body)) && /data-book-screen/.test(r.body));

  // --- page view, text modes
  await put(cr, { text: "en", en: "agent", view: "page", focus: false });
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  const rowKeys = [...new Set([...r.body.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1]))];
  check("Page view p048: 5 rows (T01, T02, L01-L05, L06-L10, L11-L12)", r.status === 200 && rowKeys.length === 5 && rowKeys.some((k) => k.endsWith("/T01-T01")) && rowKeys.some((k) => k.endsWith("/L01-L05")) && rowKeys.some((k) => k.endsWith("/L11-L12")), rowKeys.join(","));
  check("Page view p048: the English text starts with the ED_3 sentence, the Japanese text is not shown in the EN mode", squash(text).includes(squash(EN_START)) && !squash(text).includes(squash(JA_START)) && countOf(r.body, /\sdata-en(?:=|\s|>)/g) === 5);
  check("Page view p048: the page name 'Page 48' and the AI label 'AI translation, not yet checked by a person'", /data-page-name[^>]*>Page 48</.test(r.body) && /AI translation, not yet checked by a person/.test(text));
  check("Page view p048: the titles show 'Unification of the Hidari-te, Left Hip, and Left Foot' and 'All Datotsu Are Decided by the Left'", text.includes("Unification of the Hidari-te, Left Hip, and Left Foot") && text.includes("All Datotsu Are Decided by the Left"));
  check("Page view p048: the term highlight buttons exist (data-term), for the pop-up", countOf(r.body, /data-term="/g) >= 9, `terms ${countOf(r.body, /data-term="/g)}`);
  check("Page view p048: previous and next links, the page box, the bookmark button, the Focus button, the Settings button", /data-page-prev/.test(r.body) && /data-page-next/.test(r.body) && /data-page-box/.test(r.body) && /data-bookmark-toggle/.test(r.body) && /data-focus-enter/.test(r.body) && /data-settings-open/.test(r.body));
  check("Page view p048: captions of the page show in a block 'Photo captions' (6 captions and the running head)", /data-extras/.test(r.body) && countOf(r.body, /data-extra="C0\d"/g) === 6 && /Apply Seme with the Left Hip/.test(text) && /The Gokui \(deepest secrets\) of Kendō and the Left Foot/.test(text), `captions ${countOf(r.body, /data-extra="C0\d"/g)}`);
  check("Page view p048: the page HTML holds no verdict, score, QA, TL_3, reasoning, or EN form check", !LEAK_HTML.test(r.body));
  check("Page view p048: no own box, no tick box, no Save, no comment box (the reader pages are read only)", !/aria-label="Own translation for /.test(r.body) && !/data-agree=/.test(r.body) && !/data-save=/.test(r.body) && !/Comments \(\d+\)/.test(text));
  check("Page view p048: no 'EN form check' line and no 'Version history'", !/EN form check/.test(text) && !/Version history/.test(text));
  r = await put(cr, { text: "ja" });
  check("Settings route: PUT /api/read/settings text ja is saved (200)", r.status === 200 && r.json?.reader?.text === "ja", `status ${r.status}`);
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("Single language JA: the Japanese lines show (starts with the p048 sentence), no English line", squash(text).includes(squash(JA_START)) && countOf(r.body, /\sdata-ja(?:=|\s|>)/g) === 5 && countOf(r.body, /\sdata-en(?:=|\s|>)/g) === 0 && !text.includes("I keep applying"));
  r = await put(cr, { text: "pair" });
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("Bilingual pairing: each of the 5 rows has a pair of Japanese and English (red bar and blue bar), JA above EN on a phone", countOf(r.body, /\sdata-pair(?:=|\s|>)/g) === 5 && squash(text).includes(squash(JA_START)) && squash(text).includes(squash(EN_START)) && /md:grid-cols-2/.test(r.body) && /border-red-700/.test(r.body) && /border-blue-800/.test(r.body));
  r = await put(cr, { text: "en", size: 20, line: 1.9, width: "wide", fontEn: "sans", fontJa: "gothic" });
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("Settings: size 20 px, line height 1.9, and the sans font reach the text", /font-size:\s*20px/.test(r.body) && /line-height:\s*1\.9/.test(r.body) && /Helvetica/.test(r.body), `size ${/font-size:\s*20px/.test(r.body)}`);
  r = await put(cr, { size: 99, text: "bad" });
  check("Settings route: a size above 28 is clamped to 28, a bad text value is dropped", r.status === 200 && r.json?.reader?.size === 28 && r.json?.reader?.text === "en", JSON.stringify(r.json));
  r = await put(cr, { nonsense: 1 });
  check("Settings route: a body with no valid key gives 400", r.status === 400, `status ${r.status}`);
  r = await cr.req("/api/read/settings", { method: "PUT", json: { reader: { size: 18 } }, headers: { origin: "https://evil.example" } });
  check("Settings route: a foreign origin gives 403", r.status === 403, `status ${r.status}`);
  await put(cr, { size: 18, line: 1.7, width: "narrow", fontEn: "serif", fontJa: "mincho" });
  const st = await cr.req("/api/htv/settings");
  check("The account keeps the reader key next to panes (GET /api/htv/settings returns reader.size 18 and reader.view)", st.status === 200 && st.json?.panes?.reader?.size === 18 && st.json?.panes?.reader?.text === "en", JSON.stringify(st.json?.panes?.reader));
  const atr = await tr1c.req("/api/htv/settings", { method: "PUT", json: { panes: { v: 1, panes: { agent: { size: 21 } } } } });
  check("A translator saves pane settings and the reader key of that account stays (no reader key lost)", atr.status === 200);
  // reader key survives a pane-settings save of the same account
  const keep = await cr.req("/api/htv/settings", { method: "PUT", json: { panes: { v: 1, panes: { agent: { size: 22 } } } } });
  const after = await cr.req("/api/htv/settings");
  check("A save of the pane settings keeps the reader settings of the account", keep.status === 200 && after.json?.panes?.reader?.size === 18 && after.json?.panes?.panes?.agent?.size === 22, JSON.stringify(after.json?.panes));

  // --- scroll view and focus mode
  r = await cr.req(`/read/${LF}?view=scroll&at=p048`);
  const secs = [...new Set([...r.body.matchAll(/data-section="([^"]+)"/g)].map((m) => m[1]))];
  check("Scroll view: all 120 pages are sections, 5 pages near p048 hold text (p046 to p050), p075 loads later, and the other pages say 'No agent translation yet'", r.status === 200 && /data-view="scroll"/.test(r.body) && secs.length === 120 && countOf(r.body, /data-lazy="75"/g) === 1 && countOf(r.body, /data-row="/g) >= 25 && countOf(htvText(r.body), /No agent translation yet/g) === 114, `sections ${secs.length}, lazy75 ${countOf(r.body, /data-lazy="75"/g)}`);
  r = await cr.req(`/api/read/page?ids=${LF}/p075`);
  check("Scroll view lazy load: GET /api/read/page for p075 gives the page with text", r.status === 200 && r.json?.pages?.[0]?.hasText === true && r.json.pages[0].rows.length === 13, `rows ${r.json?.pages?.[0]?.rows?.length}`);
  r = await cr.req(`/api/read/page?ids=${LF}/p051`);
  check("GET /api/read/page for p051 (no text) gives hasText false", r.status === 200 && r.json?.pages?.[0]?.hasText === false && r.json.pages[0].rows.length === 0);
  r = await cr.req(`/api/read/page?ids=${LF}/p046,mental_full/p014`);
  check("GET /api/read/page for two books in one call gives 400", r.status === 400, `status ${r.status}`);
  r = await cr.req(`/api/read/page?ids=${LF}/p001,${LF}/p002,${LF}/p003,${LF}/p004,${LF}/p005,${LF}/p006,${LF}/p007,${LF}/p008,${LF}/p009`);
  check("GET /api/read/page for 9 pages gives 400 (8 at most)", r.status === 400, `status ${r.status}`);
  r = await cr.req("/api/read/page?ids=a/b");
  check("GET /api/read/page with a bad page ID gives 403 (path rule)", r.status === 403 || r.status === 400, `status ${r.status}`);
  await put(cr, { focus: true });
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("Focus mode: text only (data-focus-mode), no toolbar, no index, no bottom bar, a button to leave (Esc), the column is 72 characters wide", /data-focus-mode/.test(r.body) && !/data-toolbar-top/.test(r.body) && !/data-index\b/.test(r.body) && !/data-bottom-bar/.test(r.body) && /data-focus-leave/.test(r.body) && /max-width:\s*72ch/.test(r.body));
  await put(cr, { focus: false });

  // --- agree tag (the translator ticked L01-L05 and left the box empty)
  r = await cr.req(`/api/read/page?ids=${P48}`);
  const page = r.json?.pages?.[0];
  const rowOf = (suffix) => page?.rows?.find((x) => x.key.endsWith("/" + suffix));
  check("Agree tag: row L01-L05 is agreed by a translator (agreedByTranslator true), the other rows are not, and the data holds no translator name", rowOf("L01-L05")?.agent?.agreedByTranslator === true && rowOf("L06-L10")?.agent?.agreedByTranslator === false && !/"user"|"userName"|"email"|"translator"/.test(JSON.stringify(page)), JSON.stringify(rowOf("L01-L05")?.agent?.agreedByTranslator));
  check("Agree tag: the page API has the keys of ReaderPageData only (no verdict, score, panel, reasoning, result, detail, tsIds)", leakKeys(r.json).length === 0, leakKeys(r.json).join(","));
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("Agree tag: the screen shows 'AI translation, checked by a translator' once, on the ticked row, in the agent text", countOf(text, /AI translation, checked by a translator/g) === 1 && /data-row-tag/.test(r.body));

  // --- admin choice of a human version
  r = await ad.req(`/api/admin/versions?pageId=${P48}`);
  const v1 = r.json?.versions?.[0];
  check("Admin versions: the saved versions of p048 list the translator, the version 1, the date, and the row count (3 rows, 1 written... agreed 1)", r.status === 200 && r.json?.versions?.length === 1 && v1?.version === 1 && v1?.rows === 3 && v1?.agreed === 1 && v1?.written === 2 && typeof v1?.userName === "string" && v1.userName !== "", JSON.stringify(r.json?.versions));
  check("Admin versions: no version is chosen yet and no page check", r.json?.chosen === null && r.json?.check === null);
  r = await ad.req(`/api/admin/versions?pageId=${P48}&userId=${v1?.userId}&version=1`);
  const prev = r.json?.rows ?? [];
  check("Admin preview: 5 rows, L01-L05 'agree', L06-L10 'own', T01 'own', and the others 'agent'", r.status === 200 && prev.length === 5 && prev.find((x) => x.key.endsWith("/L01-L05"))?.kind === "agree" && prev.find((x) => x.key.endsWith("/L06-L10"))?.kind === "own" && prev.find((x) => x.key.endsWith("/T01-T01"))?.kind === "own" && prev.find((x) => x.key.endsWith("/L11-L12"))?.kind === "agent", prev.map((x) => x.kind).join(","));
  r = await cr.req(`/api/admin/versions?pageId=${P48}`);
  check("A reader cannot read the admin version list (403)", r.status === 403, `status ${r.status}`);
  r = await tr1c.req("/api/admin/versions", { method: "POST", json: { action: "choose", pageId: P48, userId: v1?.userId, version: 1 } });
  check("A translator cannot choose a version (403)", r.status === 403, `status ${r.status}`);
  r = await ad.req("/api/admin/versions", { method: "POST", json: { action: "choose", pageId: "left_foot_full/p051", userId: v1?.userId, version: 1 } });
  check("Choosing a version for a page without reader text gives 404", r.status === 404, `status ${r.status}`);
  r = await ad.req("/api/admin/versions", { method: "POST", json: { action: "choose", pageId: P48, userId: v1?.userId, version: 9 } });
  check("Choosing a version that does not exist gives 404", r.status === 404, `status ${r.status}`);
  const pre = await cr.req(`/api/read/page?ids=${P48}`);
  check("Before the choice the page has no human version (hasHuman false, human null on every row)", pre.json?.pages?.[0]?.hasHuman === false && pre.json.pages[0].rows.every((x) => x.human === null));
  r = await ad.req("/api/admin/versions", { method: "POST", json: { action: "choose", pageId: P48, userId: v1?.userId, version: 1 } });
  check("Admin chooses version 1 of the translator for p048 (200, 3 rows copied)", r.status === 200 && r.json?.rows === 3, `status ${r.status}`);
  r = await ad.req("/api/admin/versions", { method: "POST", json: { action: "choose", pageId: P48, userId: v1?.userId, version: 1 } });
  check("A second choice for the same page replaces the first (200, one record for each page)", r.status === 200);
  const rvList = await pbCall(pbUrl, "GET", `/api/collections/reader_versions/records?filter=${encodeURIComponent(`page_id="${P48}"`)}`, adminToken);
  check("PocketBase: exactly one reader_versions record for p048", rvList.json?.totalItems === 1, `total ${rvList.json?.totalItems}`);
  const hum = await cr.req(`/api/read/page?ids=${P48}`);
  const hp = hum.json?.pages?.[0];
  const hrow = (sfx) => hp?.rows?.find((x) => x.key.endsWith("/" + sfx))?.human;
  check("Reader data after the choice: hasHuman true; L06-L10 own text; L01-L05 the agreed agent text (kind agree); T02 and L11-L12 the agent text (kind agent)", hp?.hasHuman === true && hrow("L06-L10")?.kind === "own" && /My own words for the second row/.test(hrow("L06-L10")?.text ?? "") && hrow("L01-L05")?.kind === "agree" && (hrow("L01-L05")?.text ?? "").startsWith(EN_START) && hrow("T02-T02")?.kind === "agent" && hrow("L11-L12")?.kind === "agent", JSON.stringify(hp?.rows?.map((x) => x.human?.kind)));
  check("Reader data after the choice: the data holds no translator name, no user ID, no version number", !/translator|"user"|userId|"version"|chosen_by|chosenBy/.test(JSON.stringify(hum.json)), "");
  await put(cr, { en: "agent" });
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("EN switch, default Agent: the agent text shows with the AI label, and the English switch is active", squash(text).includes(squash(EN_START)) && /AI translation, not yet checked by a person/.test(text) && !/No human version for this page/.test(text));
  await put(cr, { en: "human" });
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("EN switch Human: the page label reads 'Human translation. Chosen by an admin.' and the own text of the translator shows", /Human translation\. Chosen by an admin\./.test(text) && /My own words for the second row/.test(text) && !/AI translation, not yet checked by a person/.test(text));
  check("EN switch Human: the agreed row shows the agent text with the tag 'AI translation, checked by a translator', and the agent-kind rows carry the tag 'AI translation'", squash(text).includes(squash(EN_START)) && /AI translation, checked by a translator/.test(text) && countOf(r.body, /data-row-tag/g) >= 3, `tags ${countOf(r.body, /data-row-tag/g)}`);
  check("EN switch Human: the human page shows no translator name", !new RegExp(v1?.userName ?? "@@@").test(text));
  r = await cr.req(`/read/${LF}?view=page&at=p049`);
  check("EN switch on a page with no human version: the agent text shows and the switch is disabled with the note 'No human version for this page'", /No human version for this page/.test(htvText(r.body)) && /AI translation, not yet checked by a person/.test(htvText(r.body)));
  r = await ad.req("/api/admin/versions", { method: "POST", json: { action: "clear", pageId: P48 } });
  check("Admin removes the choice (200)", r.status === 200);
  const gone = await cr.req(`/api/read/page?ids=${P48}`);
  check("After the removal the page has no human version again", gone.json?.pages?.[0]?.hasHuman === false);
  await put(cr, { en: "agent" });

  // --- page check
  r = await tr1c.req("/api/admin/checks", { method: "POST", json: { action: "set", pageId: P48 } });
  check("A translator cannot add a page check (403)", r.status === 403, `status ${r.status}`);
  r = await ad.req("/api/admin/checks", { method: "POST", json: { action: "set", pageId: P48, note: "Read by a person." } });
  check("Admin adds a page check on p048 (200)", r.status === 200, `status ${r.status}`);
  r = await ad.req("/api/admin/checks", { method: "POST", json: { action: "set", pageId: "left_foot_full/p051" } });
  check("A page check on a page without reader text gives 404", r.status === 404, `status ${r.status}`);
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("With a page check the label reads 'AI translation, checked by a person' (and the date)", /AI translation, checked by a person \(\d{4}-\d\d-\d\d\)/.test(text) && !/not yet checked by a person/.test(text));
  r = await cr.req(`/read/${LF}`);
  check("Book screen after the check: 'Human check: 1 of 6 pages.'", /Human check: 1 of 6 pages\./.test(htvText(r.body)));
  const wr = await pbCall(pbUrl, "POST", "/api/collections/page_checks/records", cr.token(), { page_id: "x/p001", checked_by: "x" });
  check("PocketBase: a reader cannot write page_checks directly", wr.status === 400 || wr.status === 403, `status ${wr.status}`);
  const wv = await pbCall(pbUrl, "POST", "/api/collections/reader_versions/records", tr1c.token(), { page_id: "x/p001" });
  check("PocketBase: a translator cannot write reader_versions directly", wv.status === 400 || wv.status === 403, `status ${wv.status}`);
  r = await ad.req("/api/admin/checks", { method: "POST", json: { action: "clear", pageId: P48 } });
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("After the page check is removed, the label is 'AI translation, not yet checked by a person' again", /AI translation, not yet checked by a person/.test(htvText(r.body)));
  r = await ad.req("/admin/versions?page=" + encodeURIComponent(P48));
  check("Admin page /admin/versions: the page list has the pages with reader text and the panel of p048", r.status === 200 && new Set([...r.body.matchAll(/href="\/admin\/versions\?page=([^"]+)"/g)].map((m) => m[1])).size === 29 && r.body.includes(`data-version-panel="${P48}"`), `links ${new Set([...r.body.matchAll(/href="\/admin\/versions\?page=([^"]+)"/g)].map((m) => m[1])).size}`);
  r = await cr.req("/admin/versions");
  check("A reader at /admin/versions goes to /read", r.go === "/read", `go ${r.go}`);

  // --- bookmarks
  r = await cr.req("/api/read/bookmarks", { method: "POST", json: { pageId: P48, note: "" } });
  const bmId = r.json?.bookmark?.id;
  check("Bookmark: add p048 (200)", r.status === 200 && bmId && r.json.bookmark.n === 48, `status ${r.status}`);
  r = await cr.req("/api/read/bookmarks", { method: "POST", json: { pageId: P48 } });
  check("Bookmark: a second bookmark on the same page gives 400", r.status === 400, `status ${r.status}`);
  r = await cr.req("/api/read/bookmarks", { method: "POST", json: { pageId: "bad" } });
  check("Bookmark: a bad page ID is refused", r.status === 403 || r.status === 400, `status ${r.status}`);
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("Bookmark: the page shows the bookmark in the panel and the button reads 'Remove bookmark'", /data-bookmark="left_foot_full\/p048"/.test(r.body) && /Remove bookmark/.test(htvText(r.body)));
  r = await cr.req(`/read/${LF}`);
  check("Bookmark: the book screen lists the bookmark 'Page 48'", /data-bookmarks/.test(r.body) && /Page 48/.test(htvText(r.body)));
  const other = await pbCall(pbUrl, "GET", "/api/collections/reader_bookmarks/records", tr1c.token());
  check("PocketBase: another user does not see the bookmark of the reader (own records only)", other.status === 200 && (other.json?.items ?? []).every((x) => x.page_id !== P48), `items ${other.json?.items?.length}`);
  const delOther = await pbCall(pbUrl, "DELETE", `/api/collections/reader_bookmarks/records/${bmId}`, tr1c.token());
  check("PocketBase: another user cannot delete the bookmark", delOther.status === 403 || delOther.status === 404, `status ${delOther.status}`);
  r = await cr.req("/api/read/bookmarks", { method: "DELETE", json: { id: bmId } });
  check("Bookmark: remove (200)", r.status === 200, `status ${r.status}`);
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("Bookmark: after the removal the panel says 'None yet.'", /None yet\./.test(htvText(r.body)));

  // --- resume at the last page
  r = await cr.req("/api/read/progress", { method: "PUT", json: { pageId: `${LF}/p049` } });
  check("Resume: PUT /api/read/progress p049 (200)", r.status === 200, `status ${r.status}`);
  r = await cr.req("/api/read/progress", { method: "PUT", json: { pageId: `${LF}/p050` } });
  check("Resume: a second PUT updates the same record (200)", r.status === 200);
  const prog = await pbCall(pbUrl, "GET", `/api/collections/reader_progress/records?filter=${encodeURIComponent(`item_id="${LF}"`)}`, cr.token());
  check("PocketBase: exactly one reading_progress record for the reader and the book, page p050", prog.json?.totalItems === 1 && prog.json.items[0].page_id === `${LF}/p050`, `total ${prog.json?.totalItems}`);
  const rd2 = await login("reader", "reader again");
  r = await rd2.c.req("/read");
  check("Resume after a new sign-in: the book card says 'Continue at Page 50'", /data-resume/.test(r.body) && /Continue at Page 50/.test(htvText(r.body)));
  r = await rd2.c.req(`/read/${LF}`);
  check("Resume after a new sign-in: the book screen button says 'Continue at Page 50'", /data-continue[^>]*>Continue at Page 50</.test(r.body));
  r = await rd2.c.req("/api/read/progress", { method: "PUT", json: { pageId: `${LF}/p050` }, headers: { origin: "https://evil.example" } });
  check("Progress route: a foreign origin gives 403", r.status === 403, `status ${r.status}`);
  const prog2 = await pbCall(pbUrl, "GET", "/api/collections/reader_progress/records", tr1c.token());
  check("PocketBase: another user does not see the progress of the reader", (prog2.json?.items ?? []).every((x) => x.item_id !== LF || x.user !== prog.json.items[0].user));

  // --- themes
  for (const t of ["sepia", "solarized-light", "solarized-dark", "dark", "light"]) {
    r = await cr.req("/api/theme", { method: "PUT", json: { theme: t } });
    const cookie = r.setCookies.find((x) => x.startsWith("theme=")) ?? "";
    check(`Theme ${t}: PUT /api/theme gives 200, the cookie, and account true`, r.status === 200 && cookie.startsWith(`theme=${t}`) && r.json?.account === true, `status ${r.status}`);
  }
  r = await cr.req("/api/theme", { method: "PUT", json: { theme: "neon" } });
  check("Theme: an unknown theme gives 400", r.status === 400, `status ${r.status}`);
  await cr.req("/api/theme", { method: "PUT", json: { theme: "sepia" } });
  r = await cr.req("/api/htv/settings");
  check("Theme: the account keeps sepia (GET /api/htv/settings)", r.json?.theme === "sepia", JSON.stringify(r.json?.theme));
  const second = await login("reader", "second device");
  const cookie2 = second.r.setCookies.find((x) => x.startsWith("theme=")) ?? "";
  check("Theme: a sign-in on a second device sets the cookie theme=sepia from the account", /^theme=sepia/.test(cookie2));
  r = await second.c.req(`/read/${LF}?view=page&at=p048`);
  check("Theme: the first HTML on the second device has data-theme=\"sepia\" and the reader marker is explicit", /<html[^>]*data-theme="sepia"/.test(r.body) && /data-theme-explicit="yes"/.test(r.body));
  const pbTheme = await pbCall(pbUrl, "GET", "/api/collections/user_settings/records", second.c.token());
  check("PocketBase: user_settings.theme holds sepia", pbTheme.json?.items?.[0]?.theme === "sepia");
  await cr.req("/api/theme", { method: "PUT", json: { theme: "solarized-light" } });

  // --- the research layer stays closed
  const runsApi = await pbCall(pbUrl, "GET", "/api/collections/page_runs/records", cr.token());
  check("PocketBase: an approved reader gets no page_runs record (verdict, score, and TL_3 panel stay closed)", runsApi.status === 403 || (runsApi.json?.items ?? []).length === 0, `status ${runsApi.status}`);
  const runsApi2 = await pbCall(pbUrl, "GET", `/api/collections/page_runs/records?filter=${encodeURIComponent('page_id="left_foot_full/p048"')}&fields=verdict,qa3_page_score,snapshot`, cr.token());
  check("PocketBase: a reader cannot read verdict, score, or snapshot of p048", (runsApi2.json?.items ?? []).length === 0, JSON.stringify(runsApi2.json).slice(0, 100));
  const trRuns = await pbCall(pbUrl, "GET", "/api/collections/page_runs/records?perPage=1", tr1c.token());
  check("PocketBase: a translator still reads page_runs", trRuns.status === 200 && (trRuns.json?.items ?? []).length === 1);
  const rpList = await pbCall(pbUrl, "GET", "/api/collections/reader_pages/records?perPage=500", cr.token());
  const rpKeys = [...walkKeys(rpList.json)].filter((k) => LEAK_KEYS.has(k));
  check("PocketBase: the reader_pages records (29) hold no key verdict, score, panel, reasoning, result, detail, tsIds", rpList.json?.totalItems === 29 && rpKeys.length === 0, `total ${rpList.json?.totalItems}, keys ${rpKeys.join(",")}`);
  const htvApi = await cr.req(`/api/htv/page?ids=${P48}`);
  check("The human-translation-view API gives a reader 403 and no page data", htvApi.status === 403 && !LEAK_HTML.test(htvApi.body), `status ${htvApi.status}`);
  for (const u of ["/translate", `/translate/${LF}`, `/translate/${LF}/p048`, "/translate/mental_full?at=p014"]) {
    r = await cr.req(u);
    check(`Reader at ${u} goes to /read`, r.go === "/read", `status ${r.status}, go ${r.go}`);
  }
  r = await cr.req("/api/htv/version?pageId=" + P48);
  check("The version route gives a reader no saved version", r.status !== 200 || (r.json?.versions ?? []).length === 0, `status ${r.status}`);
  for (const [name, res] of [["list", await cr.req("/read")], ["book", await cr.req(`/read/${LF}`)], ["page EN", await cr.req(`/read/${LF}?view=page&at=p048`)], ["scroll", await cr.req(`/read/${LF}?view=scroll&at=p048`)]]) {
    check(`No research text in the reader HTML (${name}): no verdict, score, QA_3, TL_3, reasoning, EN form check`, !LEAK_HTML.test(res.body) && !/qa3|TL_3/.test(htvText(res.body)));
  }
  r = await cr.req("/api/read/page?ids=" + [46, 47, 48, 49, 50].map((n) => `${LF}/p0${n}`).join(","));
  check("No research key in the page API answer for p046 to p050", r.status === 200 && r.json.pages.length === 5 && leakKeys(r.json).length === 0, leakKeys(r.json).join(","));

  // --- parity: the rows of reader_pages equal the rows of the human-translation-view build, without the research fields
  await parityReaderRows(pbUrl, adminToken);
  // --- a translator and an admin read the reader pages too, and the sign-in page sends a signed-in person on
  r = await tr1c.req(`/read/${LF}?view=page&at=p048`);
  check("A translator reads the reader pages (200, rows) without the approved flag", r.status === 200 && countOf(r.body, /data-row="/g) >= 5);
  r = await tr1c.req("/sign-in");
  check("The sign-in page sends a signed-in translator to /translate", r.go === "/translate", `go ${r.go}`);
  r = await cr.req("/sign-in");
  check("The sign-in page sends a signed-in reader to /read", r.go === "/read", `go ${r.go}`);
  r = await cr.req("/sign-up");
  check("The sign-up page sends a signed-in person to /read", r.go === "/read", `go ${r.go}`);
  r = await ad.req(`/read/${LF}?view=page&at=p048`);
  check("The admin sees the links Readers and Human versions in the reader bar", (r.body.match(/data-admin-link/g) ?? []).length === 2);
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("A reader sees no admin link and no link to the human-translation-view", !/data-admin-link/.test(r.body) && !/href="\/translate"/.test(r.body));
}

// Parity of the reader_pages rows with the build of the human-translation-view (VISION-viewer 15.19.10).
async function parityReaderRows(pbUrl, adminToken) {
  const { pathToFileURL } = await import("node:url");
  const { register } = await import("node:module");
  register(pathToFileURL(path.resolve("scripts/ts-resolve-hook.mjs")).href, pathToFileURL(path.resolve(".") + path.sep).href);
  const build = await import(pathToFileURL(path.resolve("lib/htv-build.ts")).href);
  const cfg = JSON.parse(await fs.readFile(configFile ? path.resolve(configFile) : path.resolve("viewer.config.json"), "utf-8"));
  const dataDir = path.resolve(cfg.translatorDataDir);
  const tb = build.parseTermbase(await fs.readFile(path.join(dataDir, "termbase/termbase.draft.jsonl"), "utf-8"));
  const rj = async (f) => JSON.parse(await fs.readFile(f, "utf-8").catch(() => "null"));
  const rt = (f) => fs.readFile(f, "utf-8").catch(() => null);
  const recs = (await pbCall(pbUrl, "GET", "/api/collections/reader_pages/records?perPage=500", adminToken)).json?.items ?? [];
  let same = 0;
  const diffs = [];
  for (const rec of recs) {
    const d = path.join(dataDir, "pilot-run", rec.page_id.replace("/", "_"), rec.run_id);
    const built = build.buildRun(rec.page_id, { ts3: await rj(path.join(d, "results/TS_3.json")), ed3: await rj(path.join(d, "results/ED_3.json")), termMarks: await rj(path.join(d, "programs/term_marks.ED_3.json")), enFormCheck: await rj(path.join(d, "programs/en_form_check.ED_3.json")), tl3Message: await rt(path.join(d, "messages/TL_3.txt")), termbase: tb });
    const want = build.readerRows(built.rows);
    // PocketBase may keep the order of keys of a JSON field in its own way, so the compare sorts the keys.
    const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
    const canon = (v) => JSON.stringify(sortKeys(v));
    const rowsOk = canon(rec.rows) === canon(want);
    // The rows of the human-translation-view build, with the research fields taken away by hand (a second path to the same result).
    const dropResearch = (m) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== "result" && k !== "detail"));
    const byHand = built.rows.map((r) => ({ key: r.key, shortKey: r.shortKey, part: r.part, ja: r.ja, ed3: r.ed3, jaMarks: r.jaMarks.map(dropResearch), edMarks: r.edMarks.map(dropResearch) }));
    const handOk = canon(rec.rows) === canon(byHand);
    const termsOk = canon(rec.terms) === canon(built.terms);
    if (rowsOk && handOk && termsOk) same++;
    else diffs.push(`${rec.page_id} rows ${rowsOk} hand ${handOk} terms ${termsOk}`);
  }
  check(`Parity: for each of the ${recs.length} reader_pages records the rows (key, part, JA, ED_3 text, marks without result and detail) and the term entries equal the build of the human-translation-view (htv-build.ts) of the same run`, recs.length === 29 && same === recs.length, diffs.join("; "));
  const p48 = recs.find((x) => x.page_id === "left_foot_full/p048");
  check("Parity: p048 uses the run 20261029T061734Z-r41 (newest PASS) with 5 rows", p48?.run_id === "20261029T061734Z-r41" && p48.rows.length === 5);
  check("Parity: a record holds the keys page_id, item_id, n, run_id, rows, terms, extras, agree (and PocketBase fields), and no verdict or score", ["page_id", "item_id", "n", "run_id", "rows", "terms", "extras", "agree"].every((k) => k in (p48 ?? {})) && !("verdict" in p48) && !("score" in p48) && !("panel" in p48));
}

const server = await startServer();
try {
  if (mode === "pause") await pauseTest();
  else if (mode === "htv") await htvTest();
  else if (mode === "deploy") await deployTest();
  else if (mode === "read") await readTest();
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
