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

  // --- list
  r = await c1.req("/translate");
  const listText = htvText(r.body);
  const pagesInList = [...r.body.matchAll(/data-page="([^"]+)"/g)].map((m) => m[1]);
  check("List page 200 and shows 30 pages with a finished run", r.status === 200 && new Set(pagesInList).size === 30, `status ${r.status}, ${new Set(pagesInList).size} pages`);
  check("List holds FAIL pages (mental_full/p014, kendojidai_2014/p0839)", pagesInList.includes(P14) && pagesInList.includes("kendojidai_2014/p0839") && /FAIL/.test(listText));
  check("List shows the newest finished run of mental_full/p014", listText.includes(RUN_NEW));
  check("List holds no unfinished run (men0_p005/20261026T001543Z, 18d4ac29_p001/20261026T005532Z)", !r.body.includes("20261026T001543Z") && !r.body.includes("20261026T005532Z"));
  check("Page tab labels: monitor tabs stay, third tab Human translation", /Human translation/.test(listText) && /Runs/.test(listText) && /Books/.test(listText));

  // --- page p014
  r = await c1.req(`/translate/${P14}`);
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
  r = await c1.req(`/translate/${P14}`);
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
  r = await c2.req(`/translate/${P14}`);
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
  r = await c2.req(`/translate/${P14}`);
  check("tr2 reads the shared comment with the writer name tr1", r.status === 200 && r.body.includes("H1 shared note beta") && /userName\\?":\\?"tr1/.test(r.body));
  r = await post(c1, { text: "H1 private note gamma" });
  const cPriv2 = r.json?.comment;
  const ad = await login("admin");
  const ca = ad.c;
  check("admin login gives 200 and the role admin", ad.r.status === 200 && ad.r.json?.user?.role === "admin");
  r = await ca.req(`/translate/${P14}`);
  check("admin reads all comments of tr1 (shared and private)", r.status === 200 && r.body.includes("H1 shared note beta") && r.body.includes("H1 private note gamma"));
  r = await c1.req(`/translate/${P14}`);
  text = htvText(r.body);
  check("The screen of the writer does not tell that the admin reads comments", !/admin (can|will|may)? ?read/i.test(text) && !/visible to (the )?admin/i.test(text) && !/only (you|the writer)/i.test(text));
  r = await c1.req(`/api/htv/comments/${cPriv?.id}`, { method: "DELETE", json: {} });
  check("tr1 deletes the own comment", r.status === 200, `status ${r.status}`);
  r = await ca.req(`/api/htv/comments/${cPriv2?.id}`, { method: "DELETE", json: {} });
  check("The admin deletes the comment of another user", r.status === 200, `status ${r.status}`);
  r = await c1.req(`/translate/${P14}`);
  check("Both comments are gone after the deletes", !r.body.includes("H1 shared note beta") && !r.body.includes("H1 private note gamma"));

  // --- reader
  const rd = await login("reader");
  const cr = rd.c;
  check("reader login gives 200 and the role reader", rd.r.status === 200 && rd.r.json?.user?.role === "reader");
  r = await cr.req(`/translate/${P14}`);
  text = htvText(r.body);
  check("reader sees JA, ED_3 and the panel, but no own box and no comments", r.status === 200 && r.body.includes("If you apply this") && /TL_3 information panel/.test(text) && !/aria-label="Own translation for /.test(r.body) && !/Comments \(\d+\)/.test(text) && /can read only/.test(text));
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
  r = await ca.req(`/translate/${P14}`);
  text = htvText(r.body);
  check("admin sees the run mark control", r.status === 200 && /Run mark/.test(text) && /Use this run for the page/.test(text));
  r = await save(ca, rows3("admin text one", "admin text two", "admin text three"));
  check("admin saves version 1 of the admin account", r.status === 200 && r.json?.version === 1, `status ${r.status}`);
  r = await ca.req(`/api/htv/mark`, { method: "PUT", json: { pageId: P14, runId: RUN_OLD } });
  check("admin marks the older run", r.status === 200, `status ${r.status}`);
  r = await ca.req(`/translate/${P14}`);
  html = r.body;
  text = htvText(html);
  const rowKeysOld = [...html.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1]);
  check("With the mark the page shows the older run, with the same 3 group keys", new RegExp(`Shown run\\s*${RUN_OLD}`).test(text) && /Chosen by the admin run mark/.test(text) && JSON.stringify(rowKeysOld) === JSON.stringify([K1, K2, K3]));
  check("The older run has other ED_3 text (first sentence)", html.includes("If applied, it becomes a great hint"));
  check("A saved text of another run shows the notice on the rows (no text compare)", (html.match(/data-row-notice/g) ?? []).length === 3 && text.includes(`You saved this text while the page showed run ${RUN_NEW}. The page now shows run ${RUN_OLD}.`));
  r = await c1.req("/translate");
  check("List shows the marked run for the page", /marked/.test(htvText(r.body)) && r.body.includes(RUN_OLD));
  r = await ca.req(`/api/htv/mark`, { method: "DELETE", json: { pageId: P14 } });
  check("admin clears the run mark", r.status === 200, `status ${r.status}`);
  r = await ca.req(`/translate/${P14}`);
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
  const orphanComment = await pbCall(pbUrl, "POST", "/api/collections/comments/records", ca.token(), { user: adminId, page_id: P14, group_key: orphanKey, run_id: "20250101T000000Z-old", text: "H1 orphan comment", shared: false });
  r = await ca.req(`/translate/${P14}`);
  text = htvText(r.body);
  check("The box 'Saved for lines that this run cuts in another way' shows the saved text and the comment", orphanComment.status === 200 && text.includes("Saved for lines that this run cuts in another way") && r.body.includes("H1 orphan saved text") && r.body.includes("H1 orphan comment"));
  check("Without such a key the box does not show (translator page)", !(await c1.req(`/translate/${P14}`)).body.includes("Saved for lines that this run cuts in another way"));

  // --- p0839: term highlight, panel line count, hidden parts
  const P839 = "kendojidai_2014/p0839";
  r = await c1.req(`/translate/${P839}`);
  html = r.body;
  text = htvText(html);
  const terms = (html.match(/data-term="c-fefdc125669e"/g) ?? []).length;
  check("p0839 page 200 with 21 rows", r.status === 200 && new Set([...html.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1])).size === 21, `status ${r.status}`);
  check("p0839 highlights the term 剣道 in JA and in ED_3 (marks from term_marks.ED_3.json)", terms >= 2, `${terms} marks of the entry`);
  check("p0839 carries the termbase entry text for the pop-up (first definition and the full entry)", html.includes("Kendō (剣道) is the way of the sword.") && html.includes("The Japanese art of swordsmanship"));
  check("p0839 panel line count is 536 of 721", /Panel lines: 536 of 721 message lines/.test(text));
  check("p0839 panel shows 32 dictionary entries and the 6 blocks", /Dictionary lookup\s*32 items, 359 lines/.test(text) && ["Japanese text of the page", "Lower pair from TL_2", "Earlier term marks", "Book translation memory", "Aligned translation memory"].every((x) => text.includes(x)));
  check("p0839 panel hides the fixed text, the box header and the output format", !/ROLE STATEMENT|FIXED RULES|INSTRUCTION TEXT|BOX HEADER|OUTPUT FORMAT|box_type: TL_3|SECTION \d/.test(html));
  check("p0839 has no Previous page pair block (first page of the list)", !/Previous page pair/.test(text));
  r = await c1.req("/translate/left_foot_full/p047");
  text = htvText(r.body);
  check("p047 panel hides grid_place and shows the previous page pair", r.status === 200 && !/grid_place|this box: TL_3|lower box: TL_2/.test(r.body) && /Previous page pair/.test(text));

  // --- pages that do not exist
  r = await c1.req("/translate/zzz_none/p001");
  check("A page without a finished run gives 404", r.status === 404, `status ${r.status}`);
  r = await c1.req("/translate/men0/p005");
  check("men0/p005 shows the newest finished run (not the unfinished folder)", r.status === 200 && r.body.includes("20261026T182512Z-r41") && !r.body.includes("20261026T001543Z"), `status ${r.status}`);
  r = await c1.req("/translate/..%2Fx/p001");
  check("A bad page name gives 404", r.status === 404, `status ${r.status}`);

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
      const fx = await cf.req(`/translate/${P14}`, { port: port2 });
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
  r = await anon.req("/api/htv/version?pageId=" + P + "&version=1");
  check("Deploy: /api/htv/version works as before (401 without sign-in)", r.status === 401, `status ${r.status}`);

  const c = new Client("tr1");
  r = await c.req("/api/htv/login", { method: "POST", json: tr });
  const cookie = r.setCookies.find((x) => x.startsWith("htv_token=")) ?? "";
  check("Deploy: translator sign-in gives 200 and the role translator", r.status === 200 && r.json?.user?.role === "translator", `status ${r.status}`);
  check("Deploy: cookie is httpOnly and SameSite=Lax", /httponly/i.test(cookie) && /samesite=lax/i.test(cookie));
  r = await c.req("/translate");
  const pagesInList = new Set([...r.body.matchAll(/data-page="([^"]+)"/g)].map((m) => m[1]));
  check("Deploy: /translate 200 with rows from PocketBase", r.status === 200 && pagesInList.size > 0 && pagesInList.has(P), `status ${r.status}, ${pagesInList.size} pages`);
  const nav = navOf(r.body);
  check("Deploy: /translate has no link to /books and no Runs tab", !r.body.includes('href="/books"') && !/href="\/"/.test(r.body) && /Human translation/.test(nav) && !/Runs|Books/.test(htvText(nav)));
  check("Deploy: /translate title reads human-translation-view", /human-translation-view/.test(htvText(r.body)) || /human-translation-view/.test(r.body));
  r = await c.req(`/translate/${P}`);
  const rowKeys = new Set([...r.body.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1]));
  check(`Deploy: /translate/${P} 200 with rows`, r.status === 200 && rowKeys.size > 0, `status ${r.status}, ${rowKeys.size} rows`);
  check("Deploy: page view has own boxes for the translator", /aria-label="Own translation for /.test(r.body));
  r = await c.req("/translate/zzz_none/p001");
  check("Deploy: a page without a run gives 404 and no Mac path", r.status === 404 && !r.body.includes("/Users/"), `status ${r.status}`);

  const cr = new Client("reader");
  r = await cr.req("/api/htv/login", { method: "POST", json: rd });
  check("Deploy: reader sign-in gives 200 and the role reader", r.status === 200 && r.json?.user?.role === "reader", `status ${r.status}`);
  r = await cr.req(`/translate/${P}`);
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
