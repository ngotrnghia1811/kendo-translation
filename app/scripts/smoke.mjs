// Smoke tests for the Viewer app. Round 44 unit APP, updated in round 49 unit V3.
// Usage:
//   node scripts/smoke.mjs smoke                       real config, GET requests only
//   node scripts/smoke.mjs pause --config FILE --fixture DIR   pause test, fixture folder only
//   node scripts/smoke.mjs htv                         human-translation-view test (unit H1, round 54). Needs a throwaway PocketBase
//                                                      and the env variables HTV_ADMIN_EMAIL, HTV_ADMIN_PASSWORD, HTV_TR1_EMAIL,
//                                                      HTV_TR1_PASSWORD, HTV_TR2_EMAIL, HTV_TR2_PASSWORD, HTV_READER_EMAIL, HTV_READER_PASSWORD.
//                                                      The script never prints a password or a token.
//   node scripts/smoke.mjs deploy                      deploy shape (unit DPC, round 58). No viewer.config.json in the app folder. Set the env variables
//                                                      VIEWER_RUN_SOURCE=pocketbase, VIEWER_POCKETBASE_URL (a throwaway server on a local port, never 8090), VIEWER_MONITOR=off,
//                                                      HTV_TR1_EMAIL, HTV_TR1_PASSWORD, HTV_READER_EMAIL, HTV_READER_PASSWORD. Needs the S2 upload in that server.
//                                                      GET requests, one sign-in per account, and one refused POST. The script never prints a password or a token.
//   node scripts/smoke.mjs read                        reader pages (unit RC1, round 63). Needs a throwaway PocketBase after the S2 upload (reader_pages), a saved version of
//                                                      translator tr1 on left_foot_full/p048 (run_all.py prepares it), and the env variables HTV_ADMIN_*, HTV_TR1_*, HTV_READER_*
//                                                      (approved) and HTV_READER2_* (not approved). It writes sign-up, approval, choice, check, bookmark, and progress records.
//   node scripts/smoke.mjs web                         text-only works and the v1 placeholder (unit RT73a, round 73). Needs a throwaway PocketBase after the S2 upload with the page file
//                                                      of the web articles, the env variables HTV_ADMIN_*, HTV_READER_* (approved), HTV_READER2_* (not approved), VIEWER_V1_DIR (a test
//                                                      folder, run_all.py prepares it), and RT73A_WEB_PAGES (the page file). It writes settings, one choice, and one removal of a choice.
//   node scripts/smoke.mjs layout                     reader panels (unit RT73b, round 73c answer 4): the saved layout, the conversion of the old keys text, en, and image, the first layout,
//                                                      Bilingual pairing, Move and drag, the component list, and the rows of the components. Pure code, no server, no PocketBase.
//   node scripts/smoke.mjs folds                       Reader dashboard rules (unit RC4, round 70): the folds, the hidden works, the fold rule of the search, and the progress words.
//                                                      Pure code on the real metadata files. It starts no server and needs no PocketBase.
//   node scripts/smoke.mjs tolerance                   Reader dashboard on a PocketBase that has the migrations up to 1793300010 only, the state before unit RT73a (unit RC4, round 70). Needs the old S2 upload,
//                                                      the env variables HTV_ADMIN_*, HTV_TR1_*, HTV_READER_* (approved) and HTV_READER2_* (not approved). It writes the sign-in and one settings record.
//   node scripts/smoke.mjs monitor-rules --t2 DIR       Monitor dashboard rules (unit VW77a, round 80): lib/book-status-rules.ts and the PST helpers of lib/format.ts. Pure code, no server.
//                                                      Unit TF85 (round 87 answer 9): also the row order of lib/row-order.ts (a strict total order: transitivity, the 6 input orders of the fixture dt rows, the VISION rule).
//                                                      --t2 is the data folder of the Translator (read only: the three pilot lists). It runs python3 -B once to compare the labels with `label_of` of store.py.
//   node scripts/smoke.mjs monitor --config FILE --fixture DIR   Monitor dashboard on a fixture (unit VW77a). The fixture is made by fake_translator.py (real store.py code).
//                                                      GET / and /api/monitor/books and /runs, the monitor off, a broken file, and the end of the process. Reads only. It kills the pid in DIR/PID at the end.
//   node scripts/smoke.mjs monitor-actions --config FILE --fixture DIR   Buttons of the Monitor dashboard (unit VW77b1, round 81): the write routes /api/monitor/books/<slug>/mark and /pause,
//                                                      every 404, 403, 415, 400, and 409 case, the exact bytes of request.json, the file PAUSE, the refused Restart row, the summary line,
//                                                      the empty phase cell of a pilot row, and PST on /runs. It WRITES into the fixture DIR (never the real data folder). fake_translator.py builds it.
//   node scripts/smoke.mjs guards                      The safety guards of this script (unit TF83): the PocketBase address and the fixture folder, one pass and one refuse example each. Pure code, no server.
//   node scripts/smoke.mjs monitor-restart             Restart and Clear mark buttons and the data of the Restart dialog (unit VW77b2, round 82): lib/book-status-rules.ts and lib/restart-rules.ts. Pure code, no server.
//   node scripts/smoke.mjs monitor-restart-api --config FILE --fixture DIR   The routes GET /api/monitor/books/<slug>/restart-options, POST .../mark with action restart, POST .../clear-mark
//                                                      on the fixture of restart_fixture.py (real Translator code). It WRITES into the fixture DIR (a folder outside the protected data folders, see scripts/smoke-guards.mjs).
//   node scripts/smoke.mjs details --config FILE --fixture DIR --t2-scripts DIR   Details view of one book `/monitor/<slug>` (unit VW77c, round 86): the link Details on each row, the route and the page, the 404 cases,
//                                                      the Run ID text of archived runs, the critique share (equal to critique_share of the Translator, run from --t2-scripts), the stop flag with its 3 reasons,
//                                                      the Restart button in the Details view, and the Running row with a waiting Restart. Reads only. The fixture is made by restart_fixture.py --details.
//                                                      Unit TF85 (round 87 answer 9): also the title link (data-title-link) of each row, with the same href as the link Details.
// The script starts `next start` on a free port and stops it at the end (the modes folds, layout, monitor-rules, and monitor-restart start no server).
// Run `npm run build` first. Run the script in a copy of the app, not in the folder of the dev server.
// Mode `pause` sends POST requests. Never run it with the real data folder.
// Mode `htv` writes records into PocketBase (versions, comments, run marks). Point pocketbaseUrl of the config at a throwaway server only.
// A check prints PASS, FAIL, or SKIP. A SKIP names the reason and does not count as a failure.
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { pbGuard, fixtureGuard, protectedDirs } from "./smoke-guards.mjs"; // unit TF83: the guards read the config (round 83 answer 20)

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

// Unit TF83 (round 83 answer 20, round 84 answer 6: "Test guards from config"). The config of the run (--config FILE, else viewer.config.json) names the PocketBase address
// and the data folder. The guards live in scripts/smoke-guards.mjs. A refused guard prints a FAIL line and stops the run before any write.
async function activeConfig() {
  return JSON.parse(await fs.readFile(configFile ? path.resolve(configFile) : path.resolve("viewer.config.json"), "utf-8"));
}
function mustBeThrowawayPb(label, url) {
  const g = pbGuard(url);
  check(`${label} uses a throwaway PocketBase (a local address, not the port 8090 of the owner)`, g.ok, g.why);
  if (!g.ok) throw new Error(g.why);
}
async function mustBeFixture(mode, fx) {
  const g = await fixtureGuard(fx, await activeConfig());
  if (!g.ok) throw new Error(`${mode} writes files. ${g.why}`);
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
  // Unit VW77a (round 80): the old runs table moved from "/" to "/runs" (tab Lists).
  let r = await get("/runs");
  check("Lists page /runs 200 and shows the real list", r.status === 200 && r.body.includes(stamp) && r.body.includes("completed with failures"), `${Math.round(r.ms)} ms`);

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
    const home = visibleText((await get("/runs")).body);
    check("Chain list: Lists page shows the list as chain with critic session", home.includes(chainStamp) && /chain critic session/.test(home));
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

// Unit TF83 (round 83 answer 20: "Stable monitor-actions test"). The fake Translator (fake_translator.py) writes these three files while a test compares folder states:
// a Heartbeat thread rewrites status.json every 3 s, a loop rewrites progress.json of each fake list every 3 s, and the thread appends to history.jsonl
// (event pause-requested) when a PAUSE file appears. The size of each file changes between two listings. TF82 saw a failure in 5 of 5 runs with a start delay of 5 s
// (the check "The new files in the fixture ..." named history.jsonl:87, status.json:811, progress.json:915). A listing entry has the form "path:size".
// The Viewer never writes these files. The files that the Viewer writes are PAUSE, request.json, request.done.json, translator-settings.json, and translator-settings.history.jsonl.
const HEARTBEAT_FILES = ["history.jsonl", "status.json", "progress.json"];
const isHeartbeat = (entry) => HEARTBEAT_FILES.includes(path.basename(entry.slice(0, entry.lastIndexOf(":"))));

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
  // Unit TF84 (round 85 answer 20 "Fix pause test"): the run view shows PST all year (UTC minus 8 hours, round 79 answer 9), so the test reads the UTC fields and subtracts 8 hours. Old: getHours() and getMinutes() read the time zone of the Mac and failed in any other zone.
  const d = new Date((sinceEpoch - 8 * 3600) * 1000);
  const hhmm = String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
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
    return { status: res.status, ms: Math.round(performance.now() - t0), body, setCookies, location, go: location || (meta ? meta[1].replace(/&amp;/g, "&") : ""), missing: res.status === 404 || /NEXT_HTTP_ERROR_FALLBACK;404/.test(body), json: parseJson(body) };
  }
  token() {
    return this.jar.get("htv_token") ?? "";
  }
}

// Unit RT73b (round 73c answer 4): the layout keys that the route clears ("Reset layout"), and readers of the panels in the HTML of a reader page.
// A panel is <section data-panel="ja|agent|human|image|v1en|v1zh|pair">. The rows of a panel are the data-row attributes inside it.
const LAYOUT_CLEAR = ["components", "shown", "widths", "pair", "terms", "text", "en", "image"];
const clearLayout = (c) => c.req("/api/read/settings", { method: "PUT", json: { clear: LAYOUT_CLEAR } });
const panelHtml = (html, id) => (html.match(new RegExp(`<section[^>]*data-panel="${id}"[\\s\\S]*?</section>`)) ?? [""])[0];
const panelIds = (html) => [...html.matchAll(/<section[^>]*data-panel="([^"]+)"/g)].map((m) => m[1]);
const rowKeysIn = (html, id) => [...panelHtml(html, id).matchAll(/data-row="([^"]+)"/g)].map((m) => m[1]);
const panelLabel = (html, id) => htvText((panelHtml(html, id).match(/<p[^>]*data-ai-label[^>]*>[\s\S]*?<\/p>/) ?? [""])[0]).trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Unit RC4: true when the HTML holds a link <a> with this href, this attribute (or none), and this label. Next writes the attributes in its own order.
function hasLink(html, href, attr, label) {
  return [...html.matchAll(/<a [^>]*>[^<]*<\/a>/g)].some((m) => m[0].includes(`href="${href}"`) && (!attr || m[0].includes(attr)) && (!label || m[0].includes(`>${label}<`)));
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
  const { installTsResolveHook } = await import(pathToFileURL(path.resolve("scripts/ts-resolve-hook.mjs")).href);
  installTsResolveHook();
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
  // RC4 (round 70): the words "with its title empty" ended. After S2 copies the metadata rows, the title of 18d4ac29 is "Kendo droplet guard" (round 69 answer 7). The mode read tests the title.
  check("The list holds the web article 18d4ac29 with 1 page and 1 page with an agent translation", /data-book="18d4ac29" data-pages="1" data-tagged="1"/.test(web?.body ?? ""));

  // --- the six fixes of the Next guide review
  const titleOf = (h) => (/<title>([^<]*)<\/title>/.exec(h) ?? [])[1];
  const titles = [titleOf((await c2.req("/translate")).body), titleOf((await c2.req(`/translate/${LF}`)).body), titleOf((await anon.req("/translate/sign-in")).body), titleOf((await c2.req(`/translate/${LF}?view=page&at=p048`)).body)];
  // Unit VW77a (round 80): the first screen "/" has its own title "(N) Monitor dashboard". The other monitor pages (here /books) keep 'agent-translation-monitor'.
  const monTitle = titleOf((await anon.req("/books")).body);
  const homeTitle = titleOf((await anon.req("/")).body);
  check("Fix 6: the browser title of /translate, a book, the sign-in page, and the page view is 'human-translation-view', and the monitor keeps 'agent-translation-monitor'", titles.every((t) => t === "human-translation-view") && monTitle === "agent-translation-monitor", titles.join(" | ") + " | " + monTitle);
  check("The first screen / has the title 'Monitor dashboard' with the count of Needs attention in front when it is above 0 (unit VW77a)", /^(\(\d+\) )?Monitor dashboard$/.test(homeTitle ?? ""), String(homeTitle));

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
  mustBeThrowawayPb("Config", pbUrl);
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
  // Unit VW77a (round 80): the tabs are Monitor dashboard, Lists, Books, and Human translation.
  check("Page tab labels: monitor tabs stay (Monitor dashboard, Lists, Books), fourth tab Human translation", /Human translation/.test(listText) && /Monitor dashboard/.test(listText) && /Lists/.test(listText) && /Books/.test(listText));

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
  // PST on /translate (unit TF84, round 85 answer 20 "Add PST test"; unit TF83 built the PST text, round 82 answer 14). The old version history time read 'YYYY-MM-DD HH:MM UTC'.
  const savedCell = (n) => { const tds = [...(html.match(new RegExp(`<tr[^>]*data-version="${n}"[\\s\\S]*?<\\/tr>`))?.[0] ?? "").matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1].replace(/<[^>]*>/g, "").trim()); return tds[1] ?? ""; };
  check("PST /translate: the version history time of version 5 reads 'YYYY-MM-DD HH:MM PST' (old: '... UTC'), and the page shows no 'UTC'", /^\d{4}-\d\d-\d\d \d\d:\d\d PST$/.test(savedCell(5)) && /^\d{4}-\d\d-\d\d \d\d:\d\d PST$/.test(savedCell(3)) && !/UTC/.test(text), `v5 '${savedCell(5)}', v3 '${savedCell(3)}', UTC on page ${/UTC/.test(text)}`);

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
  mustBeThrowawayPb("Deploy shape: env VIEWER_POCKETBASE_URL", pbUrl);

  const anon = new Client("anon");
  // --- monitor pages
  let r = await anon.req("/");
  // RC4 (round 70; round 69 answer 11): the old check "/ redirects to /translate" changed. With the monitor off, / goes by the sign-in state and the role.
  check("Deploy front door: a visitor who is not signed in goes from / to /sign-in", r.status === 307 && /\/sign-in$/.test(r.location), `status ${r.status}, location ${r.location}`);
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
  // RC4 (round 70, round 61 answer 6): catalog_items holds 347 rows now, but the /translate list keeps its 37 rows (36 folders and the web article 18d4ac29 that has a run).
  check(`Deploy: /translate 200 with the books from PocketBase: ${booksInList.size} rows (the old check "one row for each row of catalog_items" changed: catalog_items holds ${catalogTotal} rows, the list stays at 37), left_foot_full and 18d4ac29 among them, no web article without a run`, r.status === 200 && catalogTotal === 347 && booksInList.size === 37 && booksInList.has("left_foot_full") && booksInList.has("18d4ac29") && booksInList.has("kendojidai_2013") && !booksInList.has("63654ba0") && !booksInList.has("d7835263"), `status ${r.status}, ${booksInList.size} books, ${catalogTotal} catalog rows`);
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
  r = await cr.req("/");
  check("Deploy front door: a reader goes from / to /read", r.status === 307 && /\/read$/.test(r.location), `status ${r.status}, location ${r.location}`);
  r = await c.req("/");
  check("Deploy front door: a translator goes from / to /translate", r.status === 307 && /\/translate$/.test(r.location), `status ${r.status}, location ${r.location}`);
  const adm = envPair("ADMIN");
  const ca = new Client("admin");
  r = await ca.req("/api/htv/login", { method: "POST", json: adm });
  r = await ca.req("/");
  check("Deploy front door: an admin goes from / to /translate", r.status === 307 && /\/translate$/.test(r.location), `status ${r.status}, location ${r.location}`);
  const stale = new Client("stale token");
  stale.jar.set("htv_token", "not-a-token");
  r = await stale.req("/");
  check("Deploy front door: a cookie with a bad token counts as no session and goes to /sign-in", r.status === 307 && /\/sign-in$/.test(r.location), `status ${r.status}, location ${r.location}`);
  r = await cr.req("/read");
  check("Deploy: /read works with the monitor off (Reader dashboard heading, 31 rows at once and the total 342 works and 14,135 pages)", r.status === 200 && /<h1[^>]*>Reader dashboard<\/h1>/.test(r.body) && (r.body.match(/data-book="/g) ?? []).length === 31 && /342 works, 14,135 pages/.test(htvText(r.body)), `status ${r.status}`);
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

// ---------------------------------------------------------------- mode tolerance (unit RC4, round 70)
// The Reader dashboard on a PocketBase with the migrations up to 1793300009 only: the state of the owner PocketBase (port 8090) until the owner restarts it.
// The old S2 of the unit RC3 filled it: 37 catalog_items rows without translated and placement, 29 reader_pages without search columns, 103 month chapters.
// The pages /read, /read/<slug>, /translate, and / must answer without a 500 error. The dashboard shows the data that exists, and a search says "Search needs the next database update (S2)."

async function toleranceTest() {
  // Unit RT73a: the state of the owner PocketBase on 8090 before this unit. The migrations stop at 1793300010 and the old S2 filled it: 347 catalog rows, 29 reader_pages records
  // (28 on the dashboard, because men0 is hidden), no web page, no Human version, no field own_translations.facts. The new app must open every page there.
  const accounts = { admin: envPair("ADMIN"), tr1: envPair("TR1"), reader: envPair("READER"), reader2: envPair("READER2") };
  const pbUrl = (process.env.VIEWER_POCKETBASE_URL ?? (JSON.parse(await fs.readFile(configFile ? path.resolve(configFile) : path.resolve("viewer.config.json"), "utf-8")).pocketbaseUrl ?? "")).replace(/\/+$/, "");
  mustBeThrowawayPb("Tolerance: the app", pbUrl);
  const login = async (who) => {
    const c = new Client(who);
    const r = await c.req("/api/htv/login", { method: "POST", json: accounts[who] });
    return { c, r };
  };
  const countOf = (html, re) => (html.match(re) ?? []).length;
  const keysOf = (html) => [...html.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1]);
  const label = (html) => htvText((html.match(/<p[^>]*data-ai-label[^>]*>[\s\S]*?<\/p>/) ?? [""])[0]).trim();
  const cr = (await login("reader")).c;
  const wr = (await login("reader2")).c;
  const tr = (await login("tr1")).c;
  const ad = (await login("admin")).c;
  const probe = await pbCall(pbUrl, "GET", "/api/collections/catalog_items/records?perPage=1", ad.token());
  const ownCol = await pbCall(pbUrl, "GET", "/api/collections/own_translations", ad.token());
  const rp = await pbCall(pbUrl, "GET", "/api/collections/reader_pages/records?perPage=1", ad.token());
  const rv = await pbCall(pbUrl, "GET", "/api/collections/reader_versions/records?perPage=1", ad.token());
  check("Tolerance: the database state of 8090 before RT73a: 347 catalog_items rows with the key translated, 29 reader_pages records, 0 reader_versions, and no field own_translations.facts", probe.json?.totalItems === 347 && "translated" in (probe.json?.items?.[0] ?? {}) && rp.json?.totalItems === 29 && rv.json?.totalItems === 0 && !(ownCol.json?.fields ?? []).some((f) => f.name === "facts"), `rows ${probe.json?.totalItems}, reader_pages ${rp.json?.totalItems}`);

  let r = await cr.req("/read");
  let text = htvText(r.body);
  check("Tolerance, approved reader: /read answers 200 with the heading 'Reader dashboard' and the numbers of today: '342 works, 13,322 pages. English: 28 of 13,322 pages translated (0.2 percent).' (a web article with pages 0 counts as 1 page until S2 runs)", r.status === 200 && /<h1[^>]*>Reader dashboard<\/h1>/.test(r.body) && /342 works, 13,322 pages\. English: 28 of 13,322 pages translated \(0\.2 percent\)\./.test(text), (text.match(/342 works[^.]*\. English: [\d,]+ of [\d,]+ pages translated \([\d.]+ percent\)/) ?? [""])[0]);
  check("Tolerance, approved reader: the word 'finished' is not in /read, no research field leaks, and the year folds 2019 to 2025 already read 'Kendo Jidai 2019' to 'Kendo Jidai 2025'", !/finished/i.test(r.body) && !/confidence|filled_by/.test(r.body) && [2019, 2020, 2021, 2022, 2023, 2024, 2025].every((y) => htvText((r.body.match(new RegExp(`<details[^>]*data-fold="kj-${y}"[\\s\\S]*?</summary>`)) ?? [""])[0]).trim().startsWith(`Kendo Jidai ${y}`)));
  const tMonths = [...r.body.matchAll(/data-fold="(kj-\d{4}-\d{2})"/g)].map((m) => m[1]);
  const tApi = await Promise.all(tMonths.map((id) => cr.req(`/api/read/month?id=${id}`)));
  check(`Tolerance, approved reader: ${tMonths.length} month folds show with no rows in the HTML, and the month API gives the 1,155 article rows`, countOf(r.body, /<li data-article=/g) === 0 && tApi.every((x) => x.status === 200) && tApi.reduce((t, x) => t + (x.json?.children ?? []).filter((n) => n.type === "article").length, 0) === 1155, `months ${tMonths.length}`);
  r = await cr.req("/read?q=seme");
  const sumOf = (html) => htvText((html.match(/data-search-summary[\s\S]*?<\/p>/) ?? [""])[0]);
  check("Tolerance, search 'seme': 10 pages in 3 works (the agent pages only, no web text in the database yet)", r.status === 200 && /10 pages in 3 works by text/.test(sumOf(r.body)), sumOf(r.body));
  r = await wr.req("/read");
  text = htvText(r.body);
  check("Tolerance, waiting reader: /read answers 200 with the waiting line, the total, the progress lines, and no link to a page", r.status === 200 && text.includes("Your account waits for approval by an admin.") && /342 works, 13,322 pages/.test(text) && countOf(r.body, /<span data-progress="true"/g) > 0 && !/data-start|data-resume|data-article-link/.test(r.body), `status ${r.status}`);

  // the example pages
  r = await cr.req("/read/left_foot_full");
  check("Tolerance: /read/left_foot_full (book screen) answers 200 with 120 pages and the work block 'AI translation: 6 of 120 pages. Human check: 0 of 6 pages.'", r.status === 200 && countOf(r.body, /data-index-page="p\d+"/g) === 120 && htvText(r.body).includes("AI translation: 6 of 120 pages. Human check: 0 of 6 pages."), `status ${r.status}`);
  await cr.req("/api/read/settings", { method: "PUT", json: { reader: { panelSeen: true }, clear: LAYOUT_CLEAR } });
  r = await cr.req("/read/left_foot_full?view=page&at=p048");
  check("Tolerance: left_foot_full p048 answers 200 with 5 agent rows and the AI label", r.status === 200 && keysOf(r.body).length === 5 && /AI translation/.test(label(r.body)), `status ${r.status}, rows ${keysOf(r.body).length}`);
  r = await cr.req("/read/left_foot_full?view=page&at=p051");
  check("Tolerance: left_foot_full p051 (no record) answers 200 with the v1 EN placeholder in 17 rows and the page line 'v1 Gemini translation placeholder.'", r.status === 200 && keysOf(r.body).length === 17 && label(r.body) === "v1 Gemini translation placeholder.", `status ${r.status}, rows ${keysOf(r.body).length}`);
  r = await cr.req("/read/ogawa_lecture_part1?view=page&at=p281");
  check("Tolerance: ogawa_lecture_part1 p281 answers 200 with the line 'No text for this page yet.'", r.status === 200 && htvText(r.body).includes("No text for this page yet."), `status ${r.status}`);
  r = await cr.req("/read/18d4ac29?view=page&at=p001");
  check("Tolerance: 18d4ac29 p001 answers 200 with the agent rows and the AI label (no Human version in the database yet)", r.status === 200 && keysOf(r.body).length >= 5 && /AI translation/.test(label(r.body)), `status ${r.status}`);
  r = await cr.req("/read/d7835263");
  check("Tolerance: /read/d7835263 (a web article that S2 has not given A4 pages yet) answers 200: the metadata line says '1 page' and the work block says 'AI translation: 0 of 1 page.'", r.status === 200 && /\b1 page\b/.test(htvText(r.body)) && htvText(r.body).includes("AI translation: 0 of 1 page.") && !/1 pages/.test(htvText(r.body)), `status ${r.status}`);
  r = await cr.req("/read/d7835263?view=page&at=p001");
  check("Tolerance: /read/d7835263?view=page&at=p001 answers 200 with the line 'No text for this page yet.' and no crash", r.status === 200 && htvText(r.body).includes("No text for this page yet."), `status ${r.status}`);
  r = await cr.req("/read/d7835263?view=page&at=p002");
  check("Tolerance: /read/d7835263?view=page&at=p002 (the A4 page 2 is unknown before S2) answers 200 with the note, no 500", r.status === 200 && /No such page/.test(htvText(r.body)), `status ${r.status}`);
  r = await cr.req("/api/read/page?ids=d7835263/p001,d7835263/p002");
  check("Tolerance: the page API answers 200 for a web page that has no record (hasText false, hasAgent false, hasHuman false)", r.status === 200 && r.json?.pages?.length === 2 && r.json.pages.every((p) => p.hasText === false && p.hasAgent === false && p.hasHuman === false), `status ${r.status}`);
  r = await cr.req("/read/63654ba0");
  check("Tolerance: /read/63654ba0 (the Teramoto article) answers 200", r.status === 200 && !r.missing, `status ${r.status}`);
  r = await ad.req("/admin/versions");
  check("Tolerance: the admin page /admin/versions answers 200 with the 29 pages that have reader text", r.status === 200 && new Set([...r.body.matchAll(/href="\/admin\/versions\?page=([^"]+)"/g)].map((m) => m[1])).size === 29, `status ${r.status}`);
  r = await tr.req("/translate");
  check("Tolerance: /translate answers 200 for a translator with 37 rows", r.status === 200 && countOf(r.body, /data-book="/g) === 37, `status ${r.status}, rows ${countOf(r.body, /data-book="/g)}`);
  r = await new Client("anon").req("/");
  check("Tolerance: / answers 200 with the Monitor dashboard (the monitor is on in this config; unit VW77a moved the runs table to /runs)", r.status === 200 && /Monitor dashboard/.test(htvText(r.body)), `status ${r.status}`);
  r = await cr.req("/api/read/page?ids=left_foot_full/p048");
  check("Tolerance: the page API answers 200", r.status === 200, `status ${r.status}`);
}

// Unit RT73a (round 73; VISION-viewer 15.26): text-only works and the v1 placeholder. Run after S2 --apply with the page file on a throwaway PocketBase (8092).
// The environment variable VIEWER_V1_DIR names a test folder with left_foot_full page_050.md and page_051.md (real copies), a file link that leaves the folder
// (left_foot_full page_052.md) and a folder link that leaves the folder (ogawa_lecture_part2). The variable RT73A_WEB_PAGES names the page file.
async function webTest() {
  const accounts = { admin: envPair("ADMIN"), reader: envPair("READER"), reader2: envPair("READER2") };
  const pbUrl = (process.env.VIEWER_POCKETBASE_URL ?? (JSON.parse(await fs.readFile(configFile ? path.resolve(configFile) : path.resolve("viewer.config.json"), "utf-8")).pocketbaseUrl ?? "")).replace(/\/+$/, "");
  mustBeThrowawayPb("Web: the app", pbUrl);
  const cfg = JSON.parse(await fs.readFile(configFile ? path.resolve(configFile) : path.resolve("viewer.config.json"), "utf-8"));
  const file = process.env.RT73A_WEB_PAGES ? path.resolve(process.env.RT73A_WEB_PAGES) : path.join(path.resolve(cfg.translatorDataDir), "item-metadata/web-pages.jsonl");
  const PG = new Map();
  for (const line of (await fs.readFile(file, "utf-8")).split("\n")) if (line.trim()) PG.set(JSON.parse(line).page_id, JSON.parse(line));
  check("Web: the page file holds 1,124 pages", PG.size === 1124, `pages ${PG.size}`);
  const countOf = (html, re) => (html.match(re) ?? []).length;

  const login = async (who) => {
    const c = new Client(who);
    const r = await c.req("/api/htv/login", { method: "POST", json: accounts[who] });
    return { c, r };
  };
  const cr = (await login("reader")).c;
  const ad = (await login("admin")).c;
  const wr = (await login("reader2")).c;
  const putText = (c, reader) => c.req("/api/read/settings", { method: "PUT", json: { reader } });
  await clearLayout(cr);
  await putText(cr, { view: "page", panelSeen: true });

  // --- Reader dashboard /read
  let r = await cr.req("/read");
  let text = htvText(r.body);
  check("Reader dashboard /read: '342 works, 14,135 pages. English: 1,151 of 14,135 pages translated (8.1 percent).' (28 agent pages, 28 - 1 + 1,124)", /342 works, 14,135 pages\. English: 1,151 of 14,135 pages translated \(8\.1 percent\)\./.test(text), (text.match(/342 works[^.]*\. English: [\d,]+ of [\d,]+ pages translated \([\d.]+ percent\)/) ?? [""])[0]);
  const kjSum = htvText((r.body.match(/<details[^>]*data-fold="kj"[\s\S]*?<\/summary>/) ?? [""])[0]);
  check("Reader dashboard /read: the Kendo Jidai fold reads '320 works · 9,295 pages English: 1,131 of 9,295 pages translated (12.2 percent)' (2 + 5 magazine pages + 1,124 A4 pages; 18d4ac29 p001 counts once)", /320 works · 9,295 pages English: 1,131 of 9,295 pages translated \(12\.2 percent\)/.test(kjSum), kjSum);
  const yearTitles = [2019, 2020, 2021, 2022, 2023, 2024, 2025].map((y) => htvText((r.body.match(new RegExp(`<details[^>]*data-fold="kj-${y}"[\\s\\S]*?</summary>`)) ?? [""])[0]).trim());
  check("Reader dashboard /read: the year folds are named 'Kendo Jidai 2019' to 'Kendo Jidai 2025'", yearTitles.every((t, i) => t.startsWith(`Kendo Jidai ${2019 + i}`)), yearTitles.map((t) => t.slice(0, 30)).join(" | "));
  check("Reader dashboard /read: no fold of 2019 to 2025 is named only with the year", !yearTitles.some((t) => /^20\d\d\b/.test(t)));
  // Unit TF83 (round 83 answer 4 "Show web year"): d7835263 (stamp 2012.2, web date 2019-10-21) sits in October 2019. Old test: /read?open=kj-2012-02 (the print month).
  const feb = await cr.req("/read?open=kj-2019-10");
  const row = (feb.body.match(/<li data-book="d7835263"[\s\S]*?<\/li>/) ?? [""])[0];
  check("Reader dashboard /read: the row of d7835263 (opened with /read?open=kj-2019-10, old: kj-2012-02) reads 'English: 3 of 3 pages translated (100.0 percent)' and has the link 'Start at Page 1'", /English: 3 of 3 pages translated \(100\.0 percent\)/.test(htvText(row)) && hasLink(row, "/read/d7835263?view=page&amp;at=p001", "data-start", "Start at Page 1"), htvText(row).slice(0, 160));
  check("Reader dashboard /read: no number or word of the dashboard names the v1 placeholder", !/\bv1\b|placeholder|Gemini/i.test(htvText(r.body)), "");

  // --- book screen
  r = await cr.req("/read/d7835263");
  text = htvText(r.body);
  check("Book screen /read/d7835263: the metadata line reads '3 pages', the work block reads 'AI translation: 0 of 3 pages. Human translation: 3 of 3 pages.', and the button 'Start reading at Page 1' shows", /\b3 pages\b/.test(text) && text.includes("AI translation: 0 of 3 pages. Human translation: 3 of 3 pages.") && !/Human check/.test(text) && /Start reading at Page 1/.test(text), (text.match(/AI translation:[^.]*\.[^.]*\./) ?? [""])[0]);
  r = await cr.req("/read/left_foot_full");
  text = htvText(r.body);
  check("Book screen /read/left_foot_full: the work block reads 'AI translation: 6 of 120 pages. Human check: 0 of 6 pages.' with no Human translation line and no v1 line (the v1 folder holds p050 and p051)", text.includes("AI translation: 6 of 120 pages. Human check: 0 of 6 pages.") && !/Human translation/.test(text) && !/\bv1\b|placeholder|Gemini/i.test(text), (text.match(/AI translation:[^.]*\.[^.]*\./) ?? [""])[0]);
  r = await cr.req("/read/18d4ac29");
  text = htvText(r.body);
  check("Book screen /read/18d4ac29: '1 page' (not '1 pages') and the work block 'AI translation: 1 of 1 page. Human check: 0 of 1 page. Human translation: 1 of 1 page.'", /\b1 page\b/.test(text) && !/1 pages/.test(text) && text.includes("AI translation: 1 of 1 page. Human check: 0 of 1 page. Human translation: 1 of 1 page."), (text.match(/AI translation:[^]*?Human translation:[^.]*\./) ?? [""])[0]);

  // --- page view d7835263
  const want = (pid, f) => PG.get(pid)[f];
  const jaRows = (pid) => want(pid, "ja_rows").filter((x) => x.ja.trim()).length;
  const enRows = (pid) => want(pid, "human_rows").length;
r = await cr.req("/read/d7835263?view=page&at=p001");
  check("d7835263 p001, first layout (no saved layout): the bar has the button Original text and no button Image, the panels are Original text and Human version, the Human panel holds the 32 Human rows with the page line 'Human translation from kendojidai.com.', and the page shows no AI label", r.status === 200 && /data-toolbar="Original text:toggle"/.test(r.body) && !/data-toolbar="Image:toggle"/.test(r.body) && same(panelIds(r.body), ["ja", "human"]) && rowKeysIn(r.body, "human").length === 32 && rowKeysIn(r.body, "human").every((k) => /^d7835263\/p001\/web\/U\d+$/.test(k)) && panelLabel(r.body, "human") === "Human translation from kendojidai.com." && !/AI translation/.test(htvText(r.body)), `panels ${panelIds(r.body)}, human rows ${rowKeysIn(r.body, "human").length}, label ${panelLabel(r.body, "human")}`);
  check(`d7835263 p001: the Original text panel holds the ${jaRows("d7835263/p001")} JA rows (the EN-only row U006 stays out), the Human text of U004 'Why is kendo all about men?' shows, and the button Components comes after the View buttons`, rowKeysIn(r.body, "ja").length === jaRows("d7835263/p001") && htvText(panelHtml(r.body, "human")).includes("Why is kendo all about men?") && htvText(panelHtml(r.body, "ja")).includes("剣道はなぜ面なのか。") && htvText(panelHtml(r.body, "ja")).includes("※この記事は『剣道時代 2012年2月号』に掲載されたものです。") && r.body.indexOf('data-toolbar="View:scroll"') < r.body.indexOf("data-components-open"), `ja rows ${rowKeysIn(r.body, "ja").length}`);
  check("d7835263 p001: the first panel has Move right and Hide and no Move left, the last panel has Move left and Hide and no Move right (two panels, so both can hide)", /aria-label="Move the Original text panel right"/.test(r.body) && !/aria-label="Move the Original text panel left"/.test(r.body) && /aria-label="Move the Human version panel left"/.test(r.body) && !/aria-label="Move the Human version panel right"/.test(r.body) && /aria-label="Hide the Original text panel"/.test(r.body) && /aria-label="Hide the Human version panel"/.test(r.body));
  check("d7835263 p001: the first panel has a handle to resize it, the last panel has none (aria-label 'Drag to change the width of the Original text panel')", /aria-label="Drag to change the width of the Original text panel"/.test(r.body) && !/aria-label="Drag to change the width of the Human version panel"/.test(r.body) && countOf(r.body, /data-reader-handle/g) === 1);
  await putText(cr, { shown: { article: ["ja"] } });
  r = await cr.req("/read/d7835263?view=page&at=p001");
  check("d7835263 p001, only Original text checked: one panel with the 31 JA rows and no Human text, and the last panel has no Hide button and no Move button (its title bar says 'Keep at least one panel')", same(panelIds(r.body), ["ja"]) && rowKeysIn(r.body, "ja").length === jaRows("d7835263/p001") && !htvText(r.body).includes("Why is kendo all about men") && !/data-panel-hide/.test(r.body) && !/data-panel-move/.test(r.body) && /title="Keep at least one panel"/.test(r.body));
  await putText(cr, { shown: { article: ["ja", "human"] }, pair: true });
  r = await cr.req("/read/d7835263?view=page&at=p001");
  check("d7835263 p001, Bilingual pairing: Original text and Human version are ONE panel 'Original text and Human version' with 32 rows, the JA text beside the Human text (data-pair)", same(panelIds(r.body), ["pair"]) && rowKeysIn(r.body, "pair").length === 32 && countOf(r.body, /data-pair/g) === 32 && htvText(r.body).includes("Original text and Human version") && /aria-label="Hide the Original text and Human version panel"/.test(r.body) === false, `panels ${panelIds(r.body)}, pairs ${countOf(r.body, /data-pair/g)}`);
  await clearLayout(cr);
  await putText(cr, { text: "pair", en: "human" });
  r = await cr.req("/read/d7835263?view=page&at=p001");
  check("Old saved value {text: 'pair', en: 'human'} (no 'shown'): d7835263 p001 shows Original text and Human version as one pairing panel (pair true, read time only)", same(panelIds(r.body), ["pair"]) && countOf(r.body, /data-pair/g) === 32, `panels ${panelIds(r.body)}`);
  await clearLayout(cr);
  await putText(cr, { text: "ja", image: false });
  r = await cr.req("/read/d7835263?view=page&at=p001");
  check("Old saved value {text: 'ja'}: d7835263 p001 shows Original text only (one panel)", same(panelIds(r.body), ["ja"]), `panels ${panelIds(r.body)}`);
  await clearLayout(cr);
  await putText(cr, { text: "en", en: "agent" });
  r = await cr.req("/read/d7835263?view=page&at=p001");
  check("Old saved value {text: 'en', en: 'agent'}: d7835263 p001 has no Agent text, so no checked component has data and the first layout shows (Original text and Human version)", same(panelIds(r.body), ["ja", "human"]) && !/data-page-note/.test(r.body), `panels ${panelIds(r.body)}`);
  await clearLayout(cr);
  r = await cr.req("/read/d7835263?view=page&at=p003");
  check(`d7835263 p003: the Human panel holds ${enRows("d7835263/p003")} rows (19: the JA-only site row 関連 makes no line), the page line is 'Human translation from kendojidai.com.'`, rowKeysIn(r.body, "human").length === enRows("d7835263/p003") && enRows("d7835263/p003") === 19 && panelLabel(r.body, "human") === "Human translation from kendojidai.com.", `rows ${rowKeysIn(r.body, "human").length}`);
  // fact marks on the screen (VISION-viewer 15.26.8): U071 a changed fact on a phrase, U072 a dropped fact on the whole sentence, U059 a dropped fact with no EN words
  const rowHtml = (html, id, key) => (panelHtml(html, id).match(new RegExp(`<div[^>]*data-row="${key}"[\\s\\S]*?</p></div>`)) ?? [""])[0];
  const pf071 = want("d7835263/p003", "human_rows").find((x) => x.key.endsWith("U071"));
  const phrase071 = Array.from(pf071.text).slice(pf071.facts[0].start, pf071.facts[0].end).join("");
  const r071 = rowHtml(r.body, "human", "d7835263/p003/web/U071");
  check(`Fact mark U071 (changed, on a phrase): the words '${phrase071}' are a button with a dotted line (data-fact="changed"), and the row has no tag`, new RegExp(`<button[^>]*data-fact="changed"[^>]*>${phrase071}</button>`).test(r071) && !/data-fact-tag/.test(r071), r071.slice(0, 200));
  const r072 = rowHtml(r.body, "human", "d7835263/p003/web/U072");
  check("Fact mark U072 (dropped, on the whole sentence): a tag 'fact dropped' after the sentence and no dotted words", /<button[^>]*data-fact-tag="dropped"[^>]*>fact dropped<\/button>/.test(r072) && !/data-fact="/.test(r072), r072.slice(0, 200));
  const r2 = await cr.req("/read/d7835263?view=page&at=p002");
  const r059 = rowHtml(r2.body, "human", "d7835263/p002/web/U059");
  check("Fact mark U059 (dropped, the EN has no word for 右足): the tag 'fact dropped' follows the sentence 'Rather than jumping forward ...'", /Rather than jumping forward, you can land it through a good fumikomi and tenouchi\./.test(r059) && /<button[^>]*data-fact-tag="dropped"[^>]*>fact dropped<\/button>/.test(r059), r059.slice(0, 200));
  const r1 = await cr.req("/read/d7835263?view=page&at=p001");
  const r013 = rowHtml(r1.body, "human", "d7835263/p001/web/U013");
  check("Fact mark U013 (the dropped mark of p001, a dropped mark on a phrase, the JA fact ３０歳): the mark is on a phrase, so it is one dotted button data-fact=\"dropped\" and the row has no tag", countOf(r013, /data-fact="dropped"/g) === 1 && !/data-fact-tag/.test(r013), r013.slice(0, 160));
  // every page of three articles: the marks in the HTML equal the marks of the page file (phrase marks, tags, and muted lines of JA-only sentences)
  const expectMarks = (pid) => {
    const pg = PG.get(pid);
    const hum = new Map(pg.human_rows.map((h) => [h.key, h]));
    let phrase = 0, tags = 0, lines = 0;
    for (const row of pg.ja_rows) {
      const h = hum.get(row.key);
      if (h && h.text.trim()) {
        const cps = Array.from(h.text);
        let edge = 0;
        const whole = new Set();
        for (const f of [...(h.facts ?? [])].sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity))) {
          if (f.start !== null && f.end !== null && f.start >= edge && f.end > f.start && f.end <= cps.length) { phrase++; edge = f.end; } else whole.add(f.kind);
        }
        tags += whole.size;
      } else if (!row.site && row.ja.trim()) lines++;
    }
    return { phrase, tags: tags + lines, lines };
  };
  await putText(cr, { shown: { article: ["ja", "human"] } });
  let marksOk = true;
  const marksDetail = [];
  for (const pid of ["d7835263/p001", "d7835263/p002", "d7835263/p003", "18d4ac29/p001", "396571c1/p001"]) {
    if (!PG.has(pid)) continue;
    const slug = pid.split("/")[0];
    const html = (await cr.req(`/read/${slug}?view=page&at=${pid.split("/")[1]}`)).body;
    const e = expectMarks(pid);
    const human = panelHtml(html, "human");
    const got = { phrase: countOf(human, /data-fact="/g), tags: countOf(human, /data-fact-tag="/g) };
    if (got.phrase !== e.phrase || got.tags !== e.tags) marksOk = false;
    marksDetail.push(`${pid} phrase ${got.phrase}/${e.phrase} tags ${got.tags}/${e.tags}`);
  }
  await clearLayout(cr);
  check("Fact marks, 5 pages (d7835263 p001 to p003, 18d4ac29 p001, 396571c1 p001): the dotted words and the tags in the Human panel equal the marks of the page file (a JA-only sentence that is not site text makes a muted line with the tag 'fact dropped')", marksOk, marksDetail.join(" | "));
  // a JA-only sentence that is not site text: the line has the tag and no text; a site_text row makes no line
  let jaOnlyPid = null;
  for (const [pid, pg] of PG) {
    const hum = new Map(pg.human_rows.map((h) => [h.key, h]));
    if (pg.ja_rows.some((x) => !x.site && x.ja.trim() && !(hum.get(x.key)?.text ?? "").trim())) { jaOnlyPid = pid; break; }
  }
  if (jaOnlyPid) {
    const pg = PG.get(jaOnlyPid);
    const hum = new Map(pg.human_rows.map((h) => [h.key, h]));
    const row = pg.ja_rows.find((x) => !x.site && x.ja.trim() && !(hum.get(x.key)?.text ?? "").trim());
    const html = (await cr.req(`/read/${jaOnlyPid.split("/")[0]}?view=page&at=${jaOnlyPid.split("/")[1]}`)).body;
    const line = rowHtml(html, "human", row.key);
    const siteRow = pg.ja_rows.find((x) => x.site && x.ja.trim() && !(hum.get(x.key)?.text ?? "").trim());
    check(`JA-only sentence ${row.key} ('${row.ja.slice(0, 18)}'): the Human panel has a muted line with the tag 'fact dropped' and no English text${siteRow ? `, and the site_text row ${siteRow.key} makes no line` : ""}`, /data-fact-tag="dropped"/.test(line) && !/No English text/.test(line) && (!siteRow || !panelHtml(html, "human").includes(`data-row="${siteRow.key}"`)), line.slice(0, 200));
  } else skip("JA-only sentence: no page in the page file has one", "");
  await putText(cr, { pair: true, shown: { article: ["ja", "human"] } });
  await clearLayout(cr);
  r = await cr.req("/read/d7835263?view=scroll&at=p002");
  check("d7835263 scroll view: 3 page sections, each band has its Original text and Human version panels (6 panels) within the window", r.status === 200 && countOf(r.body, /data-section="d7835263\/p00\d"/g) >= 3 && panelIds(r.body).length >= 6 && countOf(r.body, /data-row=/g) >= 64, `panels ${panelIds(r.body).length}`);
  r = await cr.req("/read/d7835263?view=page&at=p004");
  check("d7835263 p004 (beyond the 3 pages) gives the note, not a crash", r.status === 200 && /No such page/.test(htvText(r.body)) || r.missing === false, `status ${r.status}`);

  // --- 18d4ac29 : Original text, Agent text and Human version
  r = await cr.req("/read/18d4ac29?view=page&at=p001");
  const agentKeys = rowKeysIn(r.body, "agent");
  check("18d4ac29 p001, first layout: the panels are Original text and Agent text, the agent rows (ts3 keys) show with the AI label, the Original text rows carry the same ts3 keys (they pair), and the bar has Original text and no Image", r.status === 200 && same(panelIds(r.body), ["ja", "agent"]) && agentKeys.length >= 5 && agentKeys.every((k) => /\/ts3\//.test(k)) && /AI translation/.test(panelLabel(r.body, "agent")) && rowKeysIn(r.body, "ja").length > 0 && rowKeysIn(r.body, "ja").every((k) => agentKeys.includes(k)) && /data-toolbar="Original text:toggle"/.test(r.body) && !/data-toolbar="Image:toggle"/.test(r.body), `panels ${panelIds(r.body)}, agent rows ${agentKeys.length}`);
  await putText(cr, { shown: { article: ["ja", "agent", "human"] } });
  r = await cr.req("/read/18d4ac29?view=page&at=p001");
  const humanKeys = rowKeysIn(r.body, "human");
  check(`18d4ac29 p001, after a check of Human version: three panels (Original text, Agent text, Human version), the Human panel holds ${enRows("18d4ac29/p001")} rows (web keys) with the page line 'Human translation from kendojidai.com.' and no AI label, the Agent panel keeps its label`, same(panelIds(r.body), ["ja", "agent", "human"]) && humanKeys.length === enRows("18d4ac29/p001") && humanKeys.every((k) => /\/web\/U/.test(k)) && panelLabel(r.body, "human") === "Human translation from kendojidai.com." && /AI translation/.test(panelLabel(r.body, "agent")), `rows ${humanKeys.length}, label ${panelLabel(r.body, "human")}`);
  check("18d4ac29 p001: the Human version rows (web keys) share no key with the Agent text rows (ts3 keys), so they do not pair (unit default D13)", humanKeys.every((k) => !agentKeys.includes(k)) && agentKeys.every((k) => !humanKeys.includes(k)));
  await putText(cr, { pair: true });
  r = await cr.req("/read/18d4ac29?view=page&at=p001");
  check("18d4ac29 p001, Bilingual pairing: Original text merges with the FIRST EN panel (Agent text), the Human version stays a panel of its own", same(panelIds(r.body), ["pair", "human"]) && countOf(panelHtml(r.body, "pair"), /data-pair/g) === agentKeys.length && htvText(r.body).includes("Original text and Agent text"), `panels ${panelIds(r.body)}, pairs ${countOf(panelHtml(r.body, "pair"), /data-pair/g)}`);
  await putText(cr, { pair: false, shown: { article: ["ja", "human"] } });
  r = await cr.req("/read/18d4ac29?view=page&at=p001");
  check("18d4ac29 p001, swap (round 73b answer 13): uncheck Agent text and check Human version, the panels are Original text and Human version", same(panelIds(r.body), ["ja", "human"]) && !/AI translation/.test(htvText(r.body)), `panels ${panelIds(r.body)}`);
  await clearLayout(cr);

  // --- a book page with an Agent text, a book page with only a v1 file, a page with nothing
  r = await cr.req(`/read/left_foot_full?view=page&at=p050`);
  check("left_foot_full p050 (Agent text, v1 file exists), first layout: the panels are Page image and Agent text, the agent rows show with the AI label, the bar has Image and no Original text, and no v1 text shows", r.status === 200 && same(panelIds(r.body), ["image", "agent"]) && rowKeysIn(r.body, "agent").length >= 5 && /AI translation/.test(panelLabel(r.body, "agent")) && !/v1 Gemini/.test(htvText(r.body)) && /api\/read\/image\/left_foot_full\/p050/.test(r.body) && /data-toolbar="Image:toggle"/.test(r.body) && !/data-toolbar="Original text:toggle"/.test(r.body), `label ${panelLabel(r.body, "agent")}`);
  r = await cr.req(`/read/left_foot_full?view=page&at=p051`);
  const t51 = htvText(r.body);
  check("left_foot_full p051 (no Agent text, v1 file), first layout: the panels are Page image and v1 EN placeholder, the v1 EN panel has 17 rows with the page line 'v1 Gemini translation placeholder.', no AI label", r.status === 200 && same(panelIds(r.body), ["image", "v1en"]) && rowKeysIn(r.body, "v1en").length === 17 && panelLabel(r.body, "v1en") === "v1 Gemini translation placeholder." && !/AI translation/.test(t51) && t51.includes("Kendo is about hidari-te, hidari-koshi, and hidari-ashi.") && !t51.includes("*") && /api\/read\/image\/left_foot_full\/p051/.test(r.body), `panels ${panelIds(r.body)}, rows ${rowKeysIn(r.body, "v1en").length}, label ${panelLabel(r.body, "v1en")}`);
  check("left_foot_full p051: the v1 row keys have the form left_foot_full/p051/v1/NN", rowKeysIn(r.body, "v1en")[0] === "left_foot_full/p051/v1/01" && rowKeysIn(r.body, "v1en").at(-1) === "left_foot_full/p051/v1/17", rowKeysIn(r.body, "v1en").slice(0, 2).join(","));
  await putText(cr, { shown: { book: ["ja"] } });
  r = await cr.req(`/read/left_foot_full?view=page&at=p051`);
  check("left_foot_full p051, Original text checked: the v1 JA line shows with the page line 'v1 Gemini placeholder text.' (16 rows, the one-line block has no JA)", same(panelIds(r.body), ["ja"]) && panelLabel(r.body, "ja") === "v1 Gemini placeholder text." && htvText(r.body).includes("剣道は左手・左腰・左足である") && rowKeysIn(r.body, "ja").length === 16, `label ${panelLabel(r.body, "ja")}, rows ${rowKeysIn(r.body, "ja").length}`);
  await putText(cr, { shown: { book: ["image", "ja", "v1en", "v1zh"] } });
  r = await cr.req(`/read/left_foot_full?view=page&at=p051`);
  check("left_foot_full p051, all v1 components checked: the panels are Page image, Original text, v1 EN placeholder, v1 ZH placeholder (the ZH panel has 16 rows and the page line 'v1 Gemini translation placeholder.'), and all three text panels share the v1 keys", same(panelIds(r.body), ["image", "ja", "v1en", "v1zh"]) && rowKeysIn(r.body, "v1zh").length === 16 && panelLabel(r.body, "v1zh") === "v1 Gemini translation placeholder." && htvText(panelHtml(r.body, "v1zh")).includes("Kendo在于hidari-te") && rowKeysIn(r.body, "v1zh").every((k) => rowKeysIn(r.body, "v1en").includes(k) && rowKeysIn(r.body, "ja").includes(k)), `panels ${panelIds(r.body)}`);
  await putText(cr, { pair: true });
  r = await cr.req(`/read/left_foot_full?view=page&at=p051`);
  check("left_foot_full p051, Bilingual pairing with the v1 components: Original text merges with v1 EN placeholder (the first EN panel), v1 ZH placeholder stays alone", same(panelIds(r.body), ["image", "pair", "v1zh"]) && countOf(panelHtml(r.body, "pair"), /data-pair/g) === 17, `panels ${panelIds(r.body)}`);
  await putText(cr, { pair: false, shown: { book: ["image", "agent"] } });
  r = await cr.req(`/read/left_foot_full?view=page&at=p051`);
  check("left_foot_full p051, saved layout Page image + Agent text (no Agent text on this page): the page draws the Page image only, and the note line reads 'Not on this page: Agent text. On this page, in the Components list: Original text, v1 EN placeholder, v1 ZH placeholder.' (unit default D16)", same(panelIds(r.body), ["image"]) && htvText((r.body.match(/<p[^>]*data-page-note[^>]*>[\s\S]*?<\/p>/) ?? [""])[0]).trim() === "Not on this page: Agent text. On this page, in the Components list: Original text, v1 EN placeholder, v1 ZH placeholder.", htvText((r.body.match(/<p[^>]*data-page-note[^>]*>[\s\S]*?<\/p>/) ?? [""])[0]).trim());
  r = await cr.req(`/read/left_foot_full?view=page&at=p050`);
  check("left_foot_full p050 with the same saved layout: Page image and Agent text, no note", same(panelIds(r.body), ["image", "agent"]) && !/data-page-note/.test(r.body));
  await clearLayout(cr);
  r = await cr.req(`/api/read/page?ids=left_foot_full/p051`);
  const pg51 = r.json?.pages?.[0];
  check("API p051: hasText false, hasAgent false, hasHuman false, 17 v1 blocks, the first block has JA, EN, and ZH, the last block has EN only", r.status === 200 && pg51?.hasText === false && pg51.hasAgent === false && pg51.hasHuman === false && pg51.v1?.length === 17 && pg51.v1[0].ja === "剣道は左手・左腰・左足である" && pg51.v1[0].zh === "Kendo在于hidari-te、hidari-koshi与hidari-ashi。" && pg51.v1[16].ja === "" && pg51.v1[16].zh === "", JSON.stringify(pg51?.v1?.[0]));
  r = await cr.req(`/api/read/page?ids=left_foot_full/p050`);
  check("API p050: hasAgent true, hasHuman false, and the v1 blocks (EN and ZH for a later component) come with the page", r.json?.pages?.[0]?.hasAgent === true && r.json.pages[0].hasHuman === false && r.json.pages[0].v1.length > 5 && r.json.pages[0].v1.every((x) => x.key.startsWith("left_foot_full/p050/v1/")), `v1 ${r.json?.pages?.[0]?.v1?.length}`);
  r = await cr.req(`/read/ogawa_lecture_part1?view=page&at=p281`);
  check("ogawa_lecture_part1 p281 (no text, no v1 file): one panel (Page image) with no Move and no Hide button, the page image, and the line 'No text for this page yet.'", r.status === 200 && same(panelIds(r.body), ["image"]) && /data-no-text/.test(r.body) && htvText(r.body).includes("No text for this page yet.") && /api\/read\/image\/ogawa_lecture_part1\/p281/.test(r.body) && !/data-panel-hide/.test(r.body) && !/data-panel-move/.test(r.body) && !/data-panel-tabs/.test(r.body), `status ${r.status}, panels ${panelIds(r.body)}`);

  // --- the v1 path guard
  r = await cr.req(`/read/left_foot_full?view=page&at=p052`);
  const api52 = await cr.req(`/api/read/page?ids=left_foot_full/p052`);
  check("v1 path guard: a file link that leaves the v1 folder (left_foot_full page_052.md) gives no v1 text and no secret, in the page and in the API", r.status === 200 && !/SECRET-OUTSIDE/.test(r.body) && !/SECRET-OUTSIDE/.test(api52.body) && api52.json?.pages?.[0]?.v1?.length === 0 && /No text for this page yet\./.test(htvText(r.body)), `v1 ${api52.json?.pages?.[0]?.v1?.length}`);
  const apiDir = await cr.req(`/api/read/page?ids=ogawa_lecture_part2/p001`);
  const scrollDir = await cr.req(`/read/ogawa_lecture_part2?view=scroll&at=p001`);
  check("v1 path guard: a folder link that leaves the v1 folder (ogawa_lecture_part2) gives no v1 text and no secret", apiDir.status === 200 && !/SECRET-DIR/.test(apiDir.body) && !/SECRET-DIR/.test(scrollDir.body) && apiDir.json?.pages?.[0]?.v1?.length === 0, `v1 ${apiDir.json?.pages?.[0]?.v1?.length}`);
  const bad = await cr.req(`/api/read/page?ids=${encodeURIComponent("left_foot_full/p051/../../x")}`);
  check("v1 path guard: a page ID with .. is refused (400 or 403) and shows no text", [400, 403, 404].includes(bad.status) && !/SECRET/.test(bad.body), `status ${bad.status}`);

  // --- v1 adds to no count and no search
  const pre = await cr.req("/read");
  const sH = await cr.req("/read?q=" + encodeURIComponent("hidari-koshi"));
  const hitsOf = (html) => [...html.matchAll(/data-hit-page="([^"]+)"/g)].map((m) => m[1]);
  const sV = await cr.req("/read?q=" + encodeURIComponent("Kendo在于"));
  check("v1 placeholder, search: the v1 EN text of p051 ('hidari-koshi') finds no hit on p051, and the v1 ZH text finds no page", !hitsOf(sH.body).includes("left_foot_full/p051") && hitsOf(sV.body).length === 0, `hits ${hitsOf(sH.body).length}`);
  check("v1 placeholder, counts: the dashboard total is the same with a v1 folder as without (1,151 translated of 14,135) and the p051 and p052 pages add 0", /English: 1,151 of 14,135 pages translated/.test(htvText(pre.body)), "");

  // --- search finds the kendojidai.com text
  const sW = await cr.req("/read?q=" + encodeURIComponent("Why is kendo all about men"));
  check("Search by the kendojidai.com text 'Why is kendo all about men': d7835263/p001 is a page hit with the words marked", hitsOf(sW.body).includes("d7835263/p001") && /<mark[^>]*>/.test(sW.body), hitsOf(sW.body).slice(0, 3).join(","));
  const sJ = await cr.req("/read?q=" + encodeURIComponent("剣道はなぜ面なのか"));
  check("Search by the Japanese text of a web article '剣道はなぜ面なのか': d7835263/p001 is a page hit", hitsOf(sJ.body).includes("d7835263/p001"), hitsOf(sJ.body).slice(0, 3).join(","));

  // --- waiting reader
  const wRead = await wr.req("/read/d7835263?view=page&at=p001");
  check("A reader who waits for approval gets the book screen with the work block and no text on /read/d7835263?at=p001", wRead.status === 200 && !/Why is kendo all about men/.test(wRead.body) && /waits for approval/.test(htvText(wRead.body)), `status ${wRead.status}`);

  // --- admin: the default choice, remove the choice, choose again
  const apiV = await ad.req("/api/admin/versions?pageId=d7835263/p001");
  const sysV = (apiV.json?.versions ?? []).find((v) => v.userName === "kendojidai.com");
  check("Admin /api/admin/versions: the page d7835263/p001 lists the version 'kendojidai.com' #1 with 32 rows, and it is the chosen one", apiV.status === 200 && sysV?.version === 1 && sysV.rows === 32 && apiV.json.chosen?.userId === sysV.userId && apiV.json.chosen.version === 1, JSON.stringify(apiV.json?.chosen));
  r = await ad.req("/admin/versions?page=" + encodeURIComponent("d7835263/p001"));
  check("Admin page /admin/versions?page=d7835263/p001 answers 200 and lists the page", r.status === 200 && r.body.includes('data-version-panel="d7835263/p001"'), `status ${r.status}`);
  const prev = await ad.req(`/api/admin/versions?pageId=d7835263/p001&userId=${sysV?.userId}&version=1`);
  check("Admin preview of the kendojidai.com version: 32 rows (web keys) with the Japanese text and the Human text, kind own", prev.status === 200 && prev.json?.rows?.length === 32 && prev.json.rows.filter((x) => x.human).length >= 31 && prev.json.rows.every((x) => x.kind === "own"), `rows ${prev.json?.rows?.length}`);
  const prev3 = await ad.req(`/api/admin/versions?pageId=d7835263/p003&userId=${sysV?.userId}&version=1`);
  const p071 = (prev3.json?.rows ?? []).find((x) => x.key.endsWith("U071"));
  const p072 = (prev3.json?.rows ?? []).find((x) => x.key.endsWith("U072"));
  check("Admin preview of d7835263/p003: the row U071 carries its changed fact (JA その上がった手元に小手を打たれる) and U072 its dropped fact, so the preview can show them", prev3.status === 200 && p071?.facts?.[0]?.kind === "changed" && p071.facts[0].ja === "その上がった手元に小手を打たれる" && p072?.facts?.[0]?.kind === "dropped", JSON.stringify([p071?.facts, p072?.facts]).slice(0, 200));
  const clr = await ad.req("/api/admin/versions", { method: "POST", json: { action: "clear", pageId: "d7835263/p001" } });
  r = await cr.req("/read/d7835263?view=page&at=p001");
  check("Admin 'Remove the choice' on d7835263/p001, first layout: the page still shows the full Original text (one panel, 31 JA rows) and no Human text, and no note line", clr.status === 200 && same(panelIds(r.body), ["ja"]) && rowKeysIn(r.body, "ja").length === jaRows("d7835263/p001") && !/Why is kendo all about men/.test(r.body) && htvText(r.body).includes("剣道はなぜ面なのか。") && !/data-page-note/.test(r.body) && !/data-panel-hide/.test(r.body), `panels ${panelIds(r.body)}, rows ${rowKeysIn(r.body, "ja").length}`);
  await putText(cr, { shown: { article: ["ja", "human"] } });
  r = await cr.req("/read/d7835263?view=page&at=p001");
  check("After the removal, with Original text and Human version checked: the page draws Original text only and the note line reads 'Not on this page: Human version.' (unit default D16)", same(panelIds(r.body), ["ja"]) && htvText((r.body.match(/<p[^>]*data-page-note[^>]*>[\s\S]*?<\/p>/) ?? [""])[0]).trim() === "Not on this page: Human version.");
  await clearLayout(cr);
  r = await cr.req("/read/d7835263");
  check("After the removal the work block reads 'Human translation: 2 of 3 pages.' and d7835263 p001 is not translated any more on the book screen", htvText(r.body).includes("AI translation: 0 of 3 pages. Human translation: 2 of 3 pages."), (htvText(r.body).match(/AI translation:[^]*?Human translation:[^.]*\./) ?? [""])[0]);
  const pick = await ad.req("/api/admin/versions", { method: "POST", json: { action: "choose", pageId: "d7835263/p001", userId: sysV?.userId, version: 1 } });
  r = await cr.req("/read/d7835263?view=page&at=p001");
  check("Admin chooses the kendojidai.com version again: the Human panel returns with 32 rows and the page line 'Human translation. Chosen by an admin.'", pick.status === 200 && same(panelIds(r.body), ["ja", "human"]) && rowKeysIn(r.body, "human").length === 32 && panelLabel(r.body, "human") === "Human translation. Chosen by an admin.", `label ${panelLabel(r.body, "human")}`);

  // --- PocketBase facts
  const ownRec = await pbCall(pbUrl, "GET", "/api/collections/own_translations/records?perPage=5&filter=" + encodeURIComponent('group_key="d7835263/p003/web/U071"'), ad.token());
  check("PocketBase: the own_translations copy of d7835263/p003/web/U071 holds one fact mark (kind changed, JA その上がった手元に小手を打たれる)", ownRec.status === 200 && ownRec.json?.items?.length === 1 && ownRec.json.items[0].facts?.length === 1 && ownRec.json.items[0].facts[0].kind === "changed" && ownRec.json.items[0].facts[0].ja === "その上がった手元に小手を打たれる", JSON.stringify(ownRec.json?.items?.[0]?.facts));
  const dRec = await pbCall(pbUrl, "GET", "/api/collections/reader_versions/records?perPage=1&filter=" + encodeURIComponent('page_id="d7835263/p003"'), ad.token());
  const u071 = (dRec.json?.items?.[0]?.rows ?? []).find((x) => x.key.endsWith("U071"));
  const u072 = (dRec.json?.items?.[0]?.rows ?? []).find((x) => x.key.endsWith("U072"));
  check("PocketBase: the reader_versions record of d7835263/p003 (default choice, chosen_by empty) has the changed mark of U071 on a phrase and the dropped mark of U072 on the whole sentence", dRec.json?.items?.[0]?.chosen_by === "" && u071?.facts?.[0]?.kind === "changed" && u071.facts[0].start === 75 && u071.facts[0].end === 111 && u072?.facts?.[0]?.kind === "dropped" && u072.facts[0].start === null, JSON.stringify({ u071: u071?.facts, u072: u072?.facts, by: dRec.json?.items?.[0]?.chosen_by }));
  const jaRec = await pbCall(pbUrl, "GET", "/api/collections/reader_pages/records?perPage=1&filter=" + encodeURIComponent('page_id="d7835263/p003"'), ad.token());
  check("PocketBase: the reader_pages record of d7835263/p003 has run_id web-ja, 20 rows, ed3 empty on every row, and site true on the 4 site_text rows U083 to U086", jaRec.json?.items?.[0]?.run_id === "web-ja" && jaRec.json.items[0].rows.length === 20 && jaRec.json.items[0].rows.every((x) => x.ed3 === "") && jaRec.json.items[0].rows.filter((x) => x.site === true).length === 4, `rows ${jaRec.json?.items?.[0]?.rows?.length}, site ${jaRec.json?.items?.[0]?.rows?.filter((x) => x.site).length}`);
  const dApi = await cr.req("/api/read/page?ids=d7835263/p003");
  const rowsApi = dApi.json?.pages?.[0]?.rows ?? [];
  check("API d7835263/p003: hasAgent false, hasHuman true, humanBy admin (after the second choice), 20 rows with web true, and the facts of U071 come with the Human row", dApi.json?.pages?.[0]?.hasAgent === false && dApi.json.pages[0].hasHuman === true && rowsApi.length === 20 && rowsApi.every((x) => x.web === true) && rowsApi.find((x) => x.key.endsWith("U071"))?.human?.facts?.[0]?.kind === "changed" && rowsApi.filter((x) => x.site).length === 4, `rows ${rowsApi.length}`);
  const dApi1 = await cr.req("/api/read/page?ids=d7835263/p002");
  check("API d7835263/p002: humanBy default (this choice stays the default one), the label line is 'Human translation from kendojidai.com.'", dApi1.json?.pages?.[0]?.humanBy === "default" && dApi1.json.pages[0].label.human === "Human translation from kendojidai.com.", dApi1.json?.pages?.[0]?.humanBy);
  const sysUsers = await pbCall(pbUrl, "GET", "/api/collections/users/records?perPage=5&filter=" + encodeURIComponent('name="kendojidai.com"'), ad.token());
  check("PocketBase: the system account exists with disabled true and role reader and approved false", sysUsers.json?.items?.length === 1 && sysUsers.json.items[0].disabled === true && sysUsers.json.items[0].approved === false && sysUsers.json.items[0].name === "kendojidai.com", JSON.stringify(sysUsers.json?.items?.[0] && { d: sysUsers.json.items[0].disabled, r: sysUsers.json.items[0].role }));

  // --- saved layout keys (unit RT73b): sanitizer, widths, order, Reset layout
  await clearLayout(cr);
  let st = await putText(cr, { widths: { agent: 9999, ja: 10, image: 421.6, bogus: 400 }, components: ["agent", "bogus", "agent", "image"], shown: { book: ["image", "bogus", "agent", "image"], article: "ja", other: ["ja"] }, pair: "yes", terms: false });
  check("Settings route (layout): widths are clamped to 280 to 720 and rounded (agent 720, ja 280, image 422), a key that is not a component drops out", st.status === 200 && st.json?.reader?.widths?.agent === 720 && st.json.reader.widths.ja === 280 && st.json.reader.widths.image === 422 && !("bogus" in st.json.reader.widths), JSON.stringify(st.json?.reader?.widths));
  check("Settings route (layout): components keeps the order of the request without repeats and adds the missing IDs of the default order (agent, image, ja, human, v1en, v1zh)", same(st.json?.reader?.components, ["agent", "image", "ja", "human", "v1en", "v1zh"]), JSON.stringify(st.json?.reader?.components));
  check("Settings route (layout): shown.book keeps image and agent once, shown.article as text and the key other drop out, pair as text drops out, terms false is saved", same(st.json?.reader?.shown, { book: ["image", "agent"] }) && st.json.reader.pair === undefined && st.json.reader.terms === false, JSON.stringify(st.json?.reader));
  r = await cr.req("/read/left_foot_full?view=page&at=p050");
  check("Saved order and width in the HTML: components with agent before image puts Agent text left of Page image, the Agent panel (first) has the saved width 720 px and a handle, the last panel has no handle", same(panelIds(r.body), ["agent", "image"]) && /data-panel="agent" data-panel-width="720"/.test(r.body) && countOf(r.body, /data-reader-handle/g) === 1, `panels ${panelIds(r.body)}`);
  check("Saved terms false: no term highlight button in the page (data-term count 0)", countOf(r.body, /data-term="/g) === 0, `terms ${countOf(r.body, /data-term="/g)}`);
  st = await cr.req("/api/read/settings", { method: "PUT", json: { clear: ["view", "size", "shown"] } });
  check("Settings route (layout): a clear list keeps only layout keys (shown is cleared, view and size stay), and the answer holds no shown", st.status === 200 && !("shown" in (st.json?.reader ?? {})) && st.json.reader.view === "page" && st.json.reader.terms === false, JSON.stringify(st.json?.reader));
  st = await cr.req("/api/read/settings", { method: "PUT", json: { clear: ["view", "size"] } });
  check("Settings route (layout): a clear list with no layout key and no reader value gives 400", st.status === 400, `status ${st.status}`);
  st = await putText(cr, { widths: { image: 400 }, pair: true, shown: { book: ["agent"] } });
  const rs = await cr.req("/api/read/settings", { method: "PUT", json: { clear: LAYOUT_CLEAR } });
  check("Reset layout: PUT with clear removes components, shown, widths, pair, terms and the old keys, and the text settings (view) and panelSeen stay", rs.status === 200 && ["components", "shown", "widths", "pair", "terms", "text", "en", "image"].every((k) => !(k in rs.json.reader)) && rs.json.reader.view === "page" && rs.json.reader.panelSeen === true, JSON.stringify(rs.json?.reader));
  r = await cr.req("/read/left_foot_full?view=page&at=p050");
  check("After Reset layout: the first layout returns (Page image and Agent text) and the term buttons return", same(panelIds(r.body), ["image", "agent"]) && countOf(r.body, /data-term="/g) >= 9, `panels ${panelIds(r.body)}`);
  // the 'Reset text settings' button sends only the text settings: it leaves the layout alone
  await putText(cr, { shown: { book: ["agent"] }, widths: { agent: 500 }, pair: false });
  const resetText = await putText(cr, { view: "page", fontEn: "serif", fontJa: "mincho", size: 18, line: 1.7, width: "narrow", focus: false, index: true });
  check("'Reset text settings' sends view, fonts, size, line, width, focus, and index only: the layout (shown, widths) stays", resetText.status === 200 && same(resetText.json?.reader?.shown, { book: ["agent"] }) && resetText.json.reader.widths?.agent === 500, JSON.stringify(resetText.json?.reader));
  await clearLayout(cr);
}

async function readTest() {
  const accounts = { admin: envPair("ADMIN"), tr1: envPair("TR1"), reader: envPair("READER"), reader2: envPair("READER2") };
  const pbUrl = (process.env.VIEWER_POCKETBASE_URL ?? (JSON.parse(await fs.readFile(configFile ? path.resolve(configFile) : path.resolve("viewer.config.json"), "utf-8")).pocketbaseUrl ?? "")).replace(/\/+$/, "");
  mustBeThrowawayPb("Read: the app", pbUrl);
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
  r = await anon.req(`/api/read/image/${LF}/p048`);
  check("GET /api/read/image without sign-in gives 401 and no image", r.status === 401 && !/RIFF/.test(r.body.slice(0, 4)), `status ${r.status}`);

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
  // RC4 (round 70): the old checks "the 37 books" and "the book cards show no progress line" changed. The Reader dashboard shows 342 works and their progress to a reader who waits (round 69 answer 9), and no link to a page.
  check("Waiting reader: /read shows the heading 'Reader dashboard', the line 'Your account waits for approval by an admin.', the total '342 works, 14,135 pages' (RT73a: a web article counts its A4 pages), and the two first-level folds Books (22 works) and Kendo Jidai (320 works)", r.status === 200 && /<h1[^>]*>Reader dashboard<\/h1>/.test(r.body) && text.includes("Your account waits for approval by an admin.") && /342 works, 14,135 pages/.test(text) && countOf(r.body, /data-fold-level="1"/g) === 2 && /Books[^<]*<\/span>[^<]*<span[^>]*>22 works/.test(r.body.replace(/<!--[\s\S]*?-->/g, "")) && /Kendo Jidai[\s\S]{0,200}320 works/.test(r.body.replace(/<!--[\s\S]*?-->/g, "")), `rows ${countOf(r.body, /data-book="/g)}`);
  check("Waiting reader: the 22 books and the 9 year volumes show their progress line at once, also at zero, and the row of left_foot_full reads 'English: 6 of 120 pages translated (5.0 percent)'", countOf(r.body, /data-book="/g) === 31 && countOf(r.body, /<span data-progress="true"/g) === 31 && /English: 6 of 120 pages translated \(5\.0 percent\)/.test(text) && /English: 0 of 176 pages translated \(0\.0 percent\)/.test(text));
  const nrMonth = await nr.req("/read?open=kj-2011-08");
  check("Waiting reader: no row and no month article links to a page (no Start at, no Continue at, no link with ?view=page), also in an opened month", !/data-start|data-resume|data-article-link/.test(r.body + nrMonth.body) && !/view=page&amp;at=p|view=page&at=p/.test(r.body + nrMonth.body) && !/Start at Page|Continue at Page/.test(text) && countOf(nrMonth.body, /<li data-article=/g) === 14, `articles ${countOf(nrMonth.body, /<li data-article=/g)}`);
  const nrApi = await nr.req("/api/read/month?id=kj-2011-08");
  check("Waiting reader: GET /api/read/month gives the rows of a month (titles and page numbers, no text, status 200)", nrApi.status === 200 && nrApi.json?.children?.length === 14 && !/Kensen|わたしは/.test(nrApi.body), `status ${nrApi.status}, rows ${nrApi.json?.children?.length}`);
  check("Waiting reader: the first-level folds are open and the deeper folds are closed", countOf(r.body, /<details open=""[^>]*data-fold-level="1"/g) === 2 && countOf(r.body, /<details[^>]*data-fold-level="2"/g) > 0 && countOf(r.body, /<details open=""[^>]*data-fold-level="[23]"/g) === 0);
  const nrSearch = await nr.req("/read?q=seme");
  check("Waiting reader: /read?q=seme gives the note 'Page text search opens after approval.' and no page hit", nrSearch.status === 200 && htvText(nrSearch.body).includes("Page text search opens after approval.") && !/data-hit-page/.test(nrSearch.body), `status ${nrSearch.status}`);
  const nrSearchTitle = await nr.req("/read?q=droplet");
  check("Waiting reader: a title word still finds the work (/read?q=droplet gives the work 18d4ac29)", /data-book="18d4ac29"/.test(nrSearchTitle.body) && /Page text search opens after approval\./.test(htvText(nrSearchTitle.body)));
  r = await nr.req(`/read/${LF}`);
  text = htvText(r.body);
  check("Waiting reader: the book screen shows the title, the author, and the waiting line, and no page list", r.status === 200 && /data-waiting/.test(r.body) && text.includes("The Secret of Kendo and the Left Foot") && !/data-index-page=/.test(r.body) && !/data-book-screen/.test(r.body), `status ${r.status}`);
  r = await nr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("Waiting reader: ?at=p048 shows no page text (no Japanese line, no English line, no row)", r.status === 200 && !text.includes("Kensen") && !r.body.includes(JA_START) && !/data-row=/.test(r.body) && /data-waiting/.test(r.body));
  r = await nr.req(`/api/read/page?ids=${P48}`);
  check("Waiting reader: GET /api/read/page gives 403", r.status === 403, `status ${r.status}`);
  r = await nr.req(`/api/read/image/${LF}/p048`);
  check("Waiting reader: GET /api/read/image gives 403 and no image", r.status === 403 && !/^RIFF/.test(r.body.slice(0, 4)), `status ${r.status}`);
  const nrList = await pbCall(pbUrl, "GET", "/api/collections/reader_pages/records", nr.token());
  check("Waiting reader: PocketBase gives no reader_pages record (rule)", nrList.status === 403 || (nrList.status === 200 && (nrList.json?.items ?? []).length === 0), `status ${nrList.status}`);
  const nrHit = await pbCall(pbUrl, "GET", `/api/collections/reader_pages/records?filter=${encodeURIComponent('search_en ~ "chuzumi"')}`, nr.token());
  check("Waiting reader: PocketBase gives no page hit for the filter search_en ~ \"chuzumi\" (rule READ_OK; round 69 answer 10)", nrHit.status === 403 || (nrHit.status === 200 && (nrHit.json?.items ?? []).length === 0), `status ${nrHit.status}`);
  const nrProg = await pbCall(pbUrl, "GET", "/api/collections/catalog_items/records?perPage=1&filter=" + encodeURIComponent('item_id="left_foot_full"'), nr.token());
  check("Waiting reader: PocketBase gives catalog_items.translated to a reader who waits (progress with one request; round 69 answer 9)", nrProg.status === 200 && JSON.stringify(nrProg.json?.items?.[0]?.translated) === JSON.stringify({ en: [46, 47, 48, 49, 50, 75] }), `status ${nrProg.status}`);
  check("Waiting reader: the catalog_items record of left_foot_full has no key 'finished' (RC4b: the field is named translated)", nrProg.status === 200 && !("finished" in (nrProg.json?.items?.[0] ?? {})) && "translated" in (nrProg.json?.items?.[0] ?? {}));
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
  // RC4 (round 70): the old checks "37 cards", "the card shows AI translation: 6 of 120 pages", "the link of the web article card", and the synopsis note on the card changed.
  // The synopsis and its AI note moved away from the row (the book screen keeps them, check below). The progress line has the new words (round 69 answer 8).
  const dashRow = (slug) => (r.body.match(new RegExp(`<li data-book="${slug}"[\\s\\S]*?</li>`)) ?? [""])[0];
  check("Reader dashboard: the two first-level folds Books (22 works) and Kendo Jidai (320 works), 31 rows at once (22 books and 9 year volumes), the 311 web articles in the month folds, no waiting line", r.status === 200 && countOf(r.body, /data-book="/g) === 31 && countOf(r.body, /data-fold-level="1"/g) === 2 && /data-fold="books"/.test(r.body) && /data-fold="kj"/.test(r.body) && /22 works/.test(text) && /320 works/.test(text) && !text.includes("waits for approval"), `rows ${countOf(r.body, /data-book="/g)}`);
  check("Reader dashboard: the heading 'Reader dashboard', the search box, and the total line '342 works, 14,135 pages. English: 1,151 of 14,135 pages translated (8.1 percent).' (RT73a: 28 agent pages, men0 hidden, so 28 - 1 + 1,124 = 1,151)", /<h1[^>]*>Reader dashboard<\/h1>/.test(r.body) && /data-search-input/.test(r.body) && /342 works, 14,135 pages\. English: 1,151 of 14,135 pages translated \(8\.1 percent\)\./.test(text), (text.match(/342 works[^.]*\. English: [\d,]+ of [\d,]+ pages translated \([\d.]+ percent\)/) ?? [""])[0]);
  const lfRow = htvText(dashRow("left_foot_full"));
  check("Reader dashboard: the left_foot_full row shows the English title, the Japanese title, the author, the year, and the page count, and no synopsis", /The Secret of Kendo and the Left Foot/.test(lfRow) && /剣道の極意と左足/.test(lfRow) && /Mitsuru Kobayashi/.test(lfRow) && /2017/.test(lfRow) && /120 pages/.test(lfRow) && !/Written by an AI agent/.test(lfRow), lfRow.slice(0, 160));
  check("Reader dashboard: the left_foot_full row reads 'English: 6 of 120 pages translated (5.0 percent)' and the link 'Start at Page 46' (the first translated page)", /English: 6 of 120 pages translated \(5\.0 percent\)/.test(lfRow) && hasLink(dashRow("left_foot_full"), "/read/left_foot_full?view=page&amp;at=p046", "data-start", "Start at Page 46"), lfRow.slice(-80));
  check("Reader dashboard: the kendojidai_2014 row reads 'English: 5 of 1051 pages translated (0.5 percent)' and 'Start at Page 794' (four digits in the address)", /English: 5 of 1051 pages translated \(0\.5 percent\)/.test(htvText(dashRow("kendojidai_2014"))) && hasLink(dashRow("kendojidai_2014"), "/read/kendojidai_2014?view=page&amp;at=p0794", "data-start", "Start at Page 794"));
  check("Reader dashboard: the etiqu1_full row reads 'English: 0 of 176 pages translated (0.0 percent)' and has no link to the text; the title link opens the book screen", /English: 0 of 176 pages translated \(0\.0 percent\)/.test(htvText(dashRow("etiqu1_full"))) && !/data-start|data-resume/.test(dashRow("etiqu1_full")) && hasLink(dashRow("etiqu1_full"), "/read/etiqu1_full", "data-book-link", ""));
  check("Reader dashboard: hidden works are absent (men0, men1, mental2_clean, matsubara, morishima; round 69 answers 12 and 15) and men_full, mental_full, ogawa_lecture_part1 to part3 show", ["men0", "men1", "mental2_clean", "matsubara", "morishima"].every((h) => !new RegExp(`data-book="${h}"`).test(r.body)) && ["men_full", "mental_full", "ogawa_lecture_part1", "ogawa_lecture_part2", "ogawa_lecture_part3"].every((h) => new RegExp(`data-book="${h}"`).test(r.body)));
  const open2020 = await cr.req("/read?open=kj-2020-08");
  const row18 = (open2020.body.match(/<li data-book="18d4ac29"[\s\S]*?<\/li>/) ?? [""])[0];
  check("Reader dashboard: the web article 18d4ac29 sits in Kendo Jidai > 2020 > August 2020 (web date 2020-08-17), shows the title 'Kendo droplet guard' (round 69 answer 7), 'English: 1 of 1 page translated (100.0 percent)', and 'Start at Page 1'", /Kendo droplet guard/.test(htvText(row18)) && /English: 1 of 1 page translated \(100\.0 percent\)/.test(htvText(row18)) && hasLink(row18, "/read/18d4ac29?view=page&amp;at=p001", "data-start", "Start at Page 1") && /data-fold="kj-2020"/.test(open2020.body), htvText(row18).slice(0, 120));
  const openR = await cr.req("/read?open=kj-2011-08");
  const augFold = (openR.body.match(/<details[^>]*data-fold="kj-2011-08"[\s\S]*?<\/details>/) ?? [""])[0];
  // Unit TF83 (round 83 answer 4 "Show web year", round 84 answer 1): the Teramoto article sits in its web month. Old check: Kendo Jidai > 2011 > August 2011, "14 articles · pages 591-674 · 2 web articles".
  const openA25 = await cr.req("/read?open=kj-2025-04");
  const apr25Fold = (openA25.body.match(/<details[^>]*data-fold="kj-2025-04"[\s\S]*?<\/details>/) ?? [""])[0];
  check("Reader dashboard: the Teramoto article 63654ba0 (stamp 2011.8) sits in Kendo Jidai > 2025 > April 2025 (web date 2025-04-28), drawn on the server by /read?open=kj-2025-04", /Interview with Kendo Legends Teramoto and Takanabe \(part 2\)/.test(htvText(apr25Fold)) && /data-book="63654ba0"/.test(apr25Fold) && /data-fold="kj-2025"/.test(openA25.body) && /4 web articles/.test(htvText(apr25Fold)) && countOf(apr25Fold, /<li data-book=/g) === 4, htvText(apr25Fold).slice(0, 140));
  check("Reader dashboard: August 2011 (opened with /read?open=kj-2011-08) holds its 14 magazine articles and no web article, the note reads '14 articles · pages 591-674' (old: '... · 2 web articles')", /14 articles · pages 591-674/.test(htvText(augFold)) && !/web article/.test(htvText(augFold)) && countOf(augFold, /<li data-article=/g) === 14 && !/data-book="63654ba0"/.test(augFold), htvText(augFold).slice(0, 140));
  check("Reader dashboard: a closed month sends no rows (the HTML has no article row), and its summary has the progress line; the link 'Show this month' is there for a browser without script", countOf(r.body, /<li data-article=/g) === 0 && countOf(r.body, /data-lazy-fold/g) > 150 && /data-show-month/.test(r.body) && /href="\/read\?open=kj-2014-10#kj-2014-10"/.test(r.body), `lazy months ${countOf(r.body, /data-lazy-fold/g)}`);
  const months = [...r.body.matchAll(/data-fold="((?:kj|web)-\d{4}-\d{2})"/g)].map((m) => m[1]);
  const monthJson = await Promise.all(months.map((id) => cr.req(`/api/read/month?id=${id}`)));
  const artRows = monthJson.reduce((t, x) => t + (x.json?.children ?? []).filter((n) => n.type === "article").length, 0);
  const webRows = monthJson.reduce((t, x) => t + (x.json?.children ?? []).filter((n) => n.type === "work").length, 0);
  check(`Reader dashboard: GET /api/read/month for each of the ${months.length} months gives status 200, 1,155 article rows (answer 14) and 311 web article rows in all`, months.length > 150 && monthJson.every((x) => x.status === 200) && artRows === 1155 && webRows === 311, `months ${months.length}, articles ${artRows}, web ${webRows}`);
  const apiAug = (await cr.req("/api/read/month?id=kj-2011-08")).json;
  check("Month API: kj-2011-08 gives 14 article rows and no web article row (old: 2 web article rows 63654ba0 and 6f19be05), the first article row opens p0591, and the draft titles show without the asterisks of the italic words", apiAug?.children.filter((n) => n.type === "article").length === 14 && apiAug.children.filter((n) => n.type === "work").length === 0 && apiAug.children.find((n) => n.type === "article")?.pageStart === 591 && !JSON.stringify(apiAug.children.filter((n) => n.type === "article").map((n) => n.titleEn)).includes("*"));
  const apiApr25 = (await cr.req("/api/read/month?id=kj-2025-04")).json;
  check("Month API: kj-2025-04 gives 4 web article rows, among them 63654ba0 and 6f19be05 (stamp 2011.8, web dates 2025-04-28 and 2025-04-07), and no article row", apiApr25?.children.filter((n) => n.type === "work").length === 4 && ["63654ba0", "6f19be05"].every((x) => apiApr25.children.some((n) => n.type === "work" && n.work.slug === x)) && apiApr25.children.filter((n) => n.type === "article").length === 0 && apiApr25.children.every((n) => n.type !== "work" || n.work.synopsis === ""));
  const apiBad = await cr.req("/api/read/month?id=" + encodeURIComponent("../x"));
  const apiNone = await cr.req("/api/read/month?id=kj-1999-01");
  const apiAnon = await new Client("anon month").req("/api/read/month?id=kj-2011-08");
  check("Month API: a bad ID gives 400, an unknown month 404, and no sign-in 401", apiBad.status === 400 && apiNone.status === 404 && apiAnon.status === 401, `${apiBad.status}, ${apiNone.status}, ${apiAnon.status}`);
  check("Reader dashboard: each article row of an opened month links to its first page (p0591 for kendojidai_2011)", hasLink(openR.body, "/read/kendojidai_2011?view=page&amp;at=p0591", "data-article-link", ""));
  check("Reader dashboard: the months of Kendo Jidai 2014 show 'October 2014 ... English: 5 of 91 pages translated (5.5 percent)'", /October 2014[^<]*<\/span>[\s\S]{0,200}English: 5 of 91 pages translated \(5\.5 percent\)/.test((r.body.match(/<details[^>]*data-fold="kj-2014-10"[\s\S]*?<\/summary>/) ?? [""])[0]));
  // RC5 (round 72, round 71 answer 4): article rows and chapter lines show the full form of the work rows: "English: N of M pages translated (P percent)", M = pageEnd - pageStart + 1.
  // They show it only when N is above 0 (a zero is ambiguous: the counts of a waiting reader or of a database without migration 1793300010 are 0 and unknown).
  const open14 = await cr.req("/read?open=kj-2014-10");
  const api14 = (await cr.req("/api/read/month?id=kj-2014-10")).json;
  const fullForm = (tr, n) => `English: ${tr} of ${n} ${n === 1 ? "page" : "pages"} translated (${((tr / n) * 100).toFixed(1)} percent)`;
  const artRowsOf = (html) => [...html.matchAll(/<li data-article="([^"]*)"[\s\S]*?<\/li>/g)].map((m) => ({ id: m[1], progress: (m[0].match(/<span[^>]*data-article-progress[^>]*>([^<]*)<\/span>/) ?? [])[1] ?? "" }));
  const expectOf = (api) => api.children.filter((n) => n.type === "article").sort((a, b) => a.order - b.order).map((n) => ({ id: `${n.book}/${n.order}`, progress: n.translated ? fullForm(n.translated, n.pageEnd - n.pageStart + 1) : "", tr: n.translated, pages: n.pageEnd - n.pageStart + 1 }));
  const augRows = artRowsOf(augFold), augWant = expectOf(apiAug);
  check("Reader dashboard (RC5): the 14 article rows of August 2011 have no translated page, so no row shows a progress line (a zero stays hidden)", augRows.length === 14 && augWant.length === 14 && augRows.every((x, i) => x.id === augWant[i].id && x.progress === "") && augWant.every((x) => x.tr === 0), JSON.stringify(augRows.slice(0, 2)));
  const rows14 = artRowsOf(open14.body), want14 = expectOf(api14);
  const hit14 = want14.filter((x) => x.tr > 0);
  check("Reader dashboard (RC5): the article rows of October 2014 show the full form for the rows with translated pages (example: " + (hit14[0]?.progress ?? "none") + ") and their counts add up to the 5 translated pages p0794 to p0798", rows14.length === want14.length && rows14.length > 5 && rows14.every((x, i) => x.id === want14[i].id && x.progress === want14[i].progress) && want14.reduce((t, x) => t + x.tr, 0) === 5 && hit14.length >= 1, JSON.stringify(rows14.filter((x) => x.progress)));
  check("Reader dashboard (RC5): the number M of a row is pageEnd - pageStart + 1 (example: " + (hit14[0] ? `${hit14[0].id} holds ${hit14[0].pages} pages` : "none") + ")", hit14.length >= 1 && hit14.every((x) => x.progress.includes(` of ${x.pages} page`)));
  const lineRe = /<li[^>]*data-chapter-line[^>]*>([\s\S]*?)<\/li>/g;
  const lineTexts = [...r.body.matchAll(lineRe)].map((m) => htvText(m[0]));
  check(`Reader dashboard (RC5): the ${lineTexts.length} chapter lines (front pages of a year volume, for example '${(lineTexts[0] ?? "").replace(/\s+/g, " ").trim()}') have no translated page, so no line shows a progress text`, lineTexts.length === 9 && lineTexts.every((x) => !/translated/.test(x) && /pages \d+-\d+/.test(x)), lineTexts.slice(0, 2).join(" | "));
  check("Reader dashboard (RC5): no text 'N translated' without 'English:' stays on /read, /read?open=kj-2011-08, and /read?open=kj-2014-10", ![text, htvText(openR.body), htvText(open14.body)].some((t) => /\d translated/.test(t)), [text, htvText(openR.body), htvText(open14.body)].map((t) => (t.match(/\d translated/g) ?? []).length).join("/"));
  // RC4b (round 71): the word 'translated' in all fold lines (round 70 answers 3 and 9). The word 'finished' must not show on the Reader dashboard.
  const chuHtml = (await cr.req("/read?q=chuzumi")).body;
  check("Reader dashboard (RC4b): the word 'finished' is in none of the HTML of /read, of the opened month August 2011, and of the search result 'chuzumi'", ![r.body, openR.body, chuHtml].some((b) => /finished/i.test(b)), [r.body, openR.body, chuHtml].map((b) => (b.match(/finished/gi) ?? []).length).join("/"));
  const foldTexts = [...r.body.matchAll(/<span[^>]*data-fold-progress[^>]*>([^<]*)<\/span>/g)].map((m) => m[1]);
  check(`Reader dashboard (RC4b): each of the ${foldTexts.length} fold lines (first level, year, month) has the full form 'English: N of M pages translated (P percent)'`, foldTexts.length > 180 && foldTexts.every((x) => /^English: [\d,]+ of [\d,]+ pages? translated \([\d.]+ percent\)$/.test(x)), foldTexts.filter((x) => !/of [\d,]+ pages? translated/.test(x)).slice(0, 2).join(" | "));
  const yearFold = (id) => htvText((r.body.match(new RegExp(`<details[^>]*data-fold="${id}"[\\s\\S]*?</summary>`)) ?? [""])[0]);
  check("Reader dashboard (RC4b, unit TF83): the year rows of Kendo Jidai 2012 and 2014 read 'English: 2 of 949 pages translated' and 'English: 5 of 1,051 pages translated' (magazine pages only: the 3 and 3 web articles with a print stamp moved to their web years; old: 11 of 958 and 15 of 1,061)", /English: 2 of 949 pages translated \(0\.2 percent\)/.test(yearFold("kj-2012")) && /English: 5 of 1,051 pages translated \(0\.5 percent\)/.test(yearFold("kj-2014")) && /Kendo Jidai 2012 949 pages(?! ·)/.test(yearFold("kj-2012")) && !/web article/.test(yearFold("kj-2012")), `${yearFold("kj-2012").slice(0, 120)} || ${yearFold("kj-2014").slice(0, 120)}`);
  check("Reader dashboard (RC4b): the first-level folds read the full form with the thousands separator of their page count (Books 22 works, Kendo Jidai 320 works)", /22 works · [\d,]+ pages English: [\d,]+ of [\d,]+ pages translated \([\d.]+ percent\)/.test(text) && /320 works · [\d,]+ pages English: [\d,]+ of [\d,]+ pages translated \([\d.]+ percent\)/.test(text), text.slice(text.indexOf("22 works") - 10, text.indexOf("22 works") + 110));
  check("Reader dashboard: the folds are details and summary (keyboard works without script): " + countOf(r.body, /<summary/g) + " summaries, the first level open and the deeper levels closed", countOf(r.body, /<summary/g) > 40 && countOf(r.body, /<details open=""[^>]*data-fold-level="1"/g) === 2 && countOf(r.body, /<details open=""[^>]*data-fold-level="[23]"/g) === 0);
  check("Reader dashboard: a field that is empty does not show the word unknown", !/unknown/i.test(text.replace(/Date unknown/g, "")));
  check("Reader dashboard: no research field of the metadata row (sources, confidence, filled_by, confirmed_by)", !/confidence|filled_by|confirmed_by|"sources"/.test(r.body));
  check("Reader dashboard HTML holds no verdict, score, QA, TL_3, or reasoning", !leakList);
  const dashMb = Buffer.byteLength(r.body) / 1048576;
  check(`Reader dashboard: the HTML has ${dashMb.toFixed(2)} MB (limit 1 MB: with a larger page the months would load when a fold opens), the server answered in ${Math.round(r.ms ?? 0)} ms`, dashMb < 1);
  const timesOf = async (url, n) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push((await cr.req(url)).ms);
    return out.sort((a, b) => a - b);
  };
  const tDash = await timesOf("/read", 5);
  const tMonth = await timesOf("/api/read/month?id=kj-2011-08", 5);
  const tSearch = await timesOf("/read?q=seme", 5);
  console.log(`INFO  Reader dashboard: ${dashMb.toFixed(3)} MB (${r.body.length} characters), /read server time over 5 requests ${tDash.join(", ")} ms, month API ${tMonth.join(", ")} ms, search seme ${tSearch.join(", ")} ms`);

  // --- front door with the monitor on (the Mac): / keeps the Monitor dashboard for every role (round 69 answer 11; unit VW77a: the first screen is the Monitor dashboard, the runs table moved to /runs)
  const fdAnon = await new Client("front anon").req("/");
  const fdReader = await cr.req("/");
  const fdAdmin = await ad.req("/");
  check("Front door, monitor on: / shows the Monitor dashboard (no redirect) for a visitor, a reader, and an admin", [fdAnon, fdReader, fdAdmin].every((x) => x.status === 200 && !x.go && /Monitor dashboard/.test(htvText(x.body))), [fdAnon, fdReader, fdAdmin].map((x) => `${x.status}${x.go ? " -> " + x.go : ""}`).join(", "));

  // --- first-visit panel (round 68 answer 5, round 69 answer 13): the HTML of a text screen for an account without the mark
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("First-visit panel: the page view p048 of an account without reader.panelSeen has the panel with 'Start reading', the Image line, and no 'Close' button", /data-first-visit/.test(r.body) && /data-start-reading/.test(r.body) && /Use the Image button in the bar above the text to show or hide the page image\./.test(htvText(r.body)) && !/data-settings-close/.test(r.body));
  check("First-visit panel (unit default D5): the panel holds the component list as its first group: Page image, Original text, Agent text, v1 EN placeholder, v1 ZH placeholder (no Human version row, no page of this book has one), 'Added to the panels' with Bilingual pairing and Kendo term highlights, and the button Reset layout", /data-components-embedded/.test(r.body) && ["image", "ja", "agent", "v1en", "v1zh", "pair", "terms"].every((id) => new RegExp(`data-component-check="${id}"`).test(r.body)) && !/data-component-check="human"/.test(r.body) && /Added to the panels/.test(htvText(r.body)) && /Bilingual pairing/.test(htvText(r.body)) && /Kendo term highlights/.test(htvText(r.body)) && /data-layout-reset/.test(r.body) && r.body.indexOf("data-components-embedded") < r.body.indexOf(">Reading settings<"), `checks ${countOf(r.body, /data-component-check=/g)}`);
  r = await cr.req(`/read/${LF}`);
  check("First-visit panel: the book screen (no ?at) has no panel", !/data-reader-settings/.test(r.body));
  r = await cr.req("/read/18d4ac29?view=page&at=p001");
  check("First-visit panel: for a web article (no page image) the panel has 'Start reading', the line about the Original text button instead of the Image line, and a list without a Page image row (rows: Original text, Agent text, Human version)", /data-start-reading/.test(r.body) && !/Use the Image button/.test(htvText(r.body)) && /Use the Original text button in the bar above the text to show or hide the Japanese text\./.test(htvText(r.body)) && !/data-component-check="image"/.test(r.body) && ["ja", "agent", "human"].every((id) => new RegExp(`data-component-check="${id}"`).test(r.body)) && !/data-component-check="v1en"/.test(r.body));
  const wait2 = (await login("reader2", "waiting reader panel")).c;
  r = await wait2.req(`/read/${LF}?view=page&at=p048`);
  check("First-visit panel: an account that waits for approval gets no panel (no text screen)", r.status === 200 && /data-waiting/.test(r.body) && !/data-reader-settings/.test(r.body));
  const keep0 = await cr.req("/api/read/settings", { method: "PUT", json: { reader: { panelSeen: true } } });
  check("First-visit panel: PUT /api/read/settings with panelSeen true gives 200 and keeps the key", keep0.status === 200 && keep0.json?.reader?.panelSeen === true, `status ${keep0.status}`);
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("First-visit panel: the next visit has no panel in the HTML (the panel is absent after the mark)", !/data-reader-settings/.test(r.body) && !/data-first-visit/.test(r.body));
  const resetBody = { view: "page", fontEn: "serif", fontJa: "mincho", size: 18, line: 1.7, width: "narrow", focus: false, index: true };
  const keep1 = await cr.req("/api/read/settings", { method: "PUT", json: { reader: resetBody } });
  check("First-visit panel: 'Reset text settings' (all defaults of READER_DEFAULTS, no panelSeen) keeps panelSeen true", keep1.status === 200 && keep1.json?.reader?.panelSeen === true && keep1.json.reader.size === 18, JSON.stringify(keep1.json?.reader).slice(0, 120));
  const keep2 = await cr.req("/api/read/settings", { method: "PUT", json: { reader: { panelSeen: "yes" } } });
  check("First-visit panel: a bad value (panelSeen as text) gives 400", keep2.status === 400, `status ${keep2.status}`);
  const t1 = await login("tr1", "tr1 panel");
  r = await t1.c.req(`/read/${LF}?view=page&at=p048`);
  check("First-visit panel: a translator also sees the panel once (no mark yet)", /data-first-visit/.test(r.body));
  await t1.c.req("/api/read/settings", { method: "PUT", json: { reader: { panelSeen: true } } });

  // --- search (round 68 answer 3, round 69 answer 10)
  const hitsOf = (html) => [...html.matchAll(/data-hit-page="([^"]+)"/g)].map((m) => m[1]);
  const sumOf = (html) => htvText((html.match(/data-search-summary[\s\S]*?<\/p>/) ?? [""])[0]);
  const sq = await cr.req("/read?q=seme");
  // RT73a: the 10 agent pages (left_foot_full p046 p047 p048 p075, kendojidai_2014 p0794 to p0798, 100_practice_full p067) plus the web pages that hold the word (page file, own fold).
  // 18d4ac29/p001 may add one page and one work: its search columns hold the agent text and the Human text.
  const wSeme = await webHits("seme");
  const nOf = (html) => Number(/(\d+) pages? in (\d+) works? by text/.exec(sumOf(html))?.[1] ?? -1);
  const mOf = (html) => Number(/(\d+) pages? in (\d+) works? by text/.exec(sumOf(html))?.[2] ?? -1);
  check(`Search 'seme': the 10 agent pages in 3 works plus ${wSeme.pages.size} web pages in ${wSeme.works.size} web articles (page file), 18d4ac29/p001 may add one`, sq.status === 200 && nOf(sq.body) - 10 - wSeme.pages.size >= 0 && nOf(sq.body) - 10 - wSeme.pages.size <= 1 && mOf(sq.body) - 3 - wSeme.works.size >= 0 && mOf(sq.body) - 3 - wSeme.works.size <= 1 && hitsOf(sq.body).length >= 10, `${sumOf(sq.body)} | expected ${10 + wSeme.pages.size} pages in ${3 + wSeme.works.size} works`);
  const sqJa = await cr.req("/read?q=" + encodeURIComponent("攻め"));
  const wJa = await webHits("攻め");
  check(`Search 攻め: the 10 agent pages plus ${wJa.pages.size} web pages (page file, own fold), 18d4ac29/p001 may add one`, sqJa.status === 200 && nOf(sqJa.body) - 10 - wJa.pages.size >= 0 && nOf(sqJa.body) - 10 - wJa.pages.size <= 1, `${sumOf(sqJa.body)} | expected ${10 + wJa.pages.size} pages`);
  const sqC1 = await cr.req("/read?q=chuzumi");
  const sqC2 = await cr.req("/read?q=" + encodeURIComponent("Chūzumi"));
  const CHU = ["left_foot_full/p048", "left_foot_full/p049"];
  check("Search 'chuzumi' without the macron: left_foot_full p048 and p049 (2 pages in 1 work), the hit shows as Chūzumi", JSON.stringify(hitsOf(sqC1.body)) === JSON.stringify(CHU) && /2 pages in 1 work by text/.test(sumOf(sqC1.body)) && /<mark[^>]*>Chūzumi<\/mark>/.test(sqC1.body), sumOf(sqC1.body));
  check("Search 'Chūzumi' with the macron: the same 2 pages", JSON.stringify(hitsOf(sqC2.body)) === JSON.stringify(CHU));
  check("Search hit: the link goes to /read/left_foot_full?view=page&at=p048 (one click from the result to the text)", /<a[^>]*href="\/read\/left_foot_full\?view=page&amp;at=p048"[^>]*data-hit-link|<a[^>]*data-hit-link[^>]*href="\/read\/left_foot_full\?view=page&amp;at=p048"/.test(sqC1.body) && /Page 48/.test(htvText(sqC1.body)), (sqC1.body.match(/<a[^>]*data-hit-link[^>]*>/) ?? [""])[0].slice(0, 200));
  const sqK = await cr.req("/read?q=kendo");
  const screensK = Number(/Screen 1 of (\d+)/.exec(htvText(sqK.body))?.[1] ?? 1);
  const sqKAll = [sqK, ...(await Promise.all(Array.from({ length: screensK - 1 }, (_, i) => cr.req(`/read?q=kendo&screen=${i + 2}`))))];
  check(`Search 'kendo' finds Kendō on left_foot_full p046 (the fold rule removes the macron): ${screensK} screens, the title hits come first and the page hits follow`, sqKAll.some((x) => hitsOf(x.body).includes("left_foot_full/p046")), sqKAll.map((x) => hitsOf(x.body).length).join(","));
  const sqT = await cr.req("/read?q=droplet");
  check("Search 'droplet': the work 18d4ac29 'Kendo droplet guard' is a hit by title, and its page p001 is a page hit with the word marked", /data-book="18d4ac29"/.test(sqT.body) && /1 work by title or author/.test(sumOf(sqT.body)) && hitsOf(sqT.body).includes("18d4ac29/p001") && /<mark[^>]*>Droplet<\/mark>/.test(sqT.body), sumOf(sqT.body));
  const sqAu = await cr.req("/read?q=" + encodeURIComponent("kobayashi"));
  check("Search by author 'kobayashi': the work left_foot_full is a hit by author", /data-book="left_foot_full"/.test(sqAu.body));
  const sqNone = await cr.req("/read?q=qqzzxx");
  check("Search with no match: the plain line 'No match.' and the link 'Clear search'", /No match\./.test(htvText(sqNone.body)) && /data-search-clear/.test(sqNone.body) && sqNone.status === 200);
  const sqPage1 = await cr.req("/read?q=the");
  const sqPage2 = await cr.req("/read?q=the&screen=2");
  check("Search 'the': more than 20 hits give the pager with 'Next ›', 20 hits on a screen, and screen 2 shows other hits", /data-search-next/.test(sqPage1.body) && countOf(sqPage1.body, /<li /g) === 20 && countOf(sqPage2.body, /<li /g) > 0 && sqPage2.body.match(/data-(book|hit-page)="[^"]+"/)?.[0] !== sqPage1.body.match(/data-(book|hit-page)="[^"]+"/)?.[0], `screen 1 ${countOf(sqPage1.body, /<li /g)} items`);
  check("Search: the search form is a GET form to /read with the field q, and the box keeps the query", /<form[^>]*action="\/read"[^>]*method="get"/.test(sqC1.body) && /name="q"[^>]*value="chuzumi"|value="chuzumi"[^>]*name="q"/.test(sqC1.body));
  const sqEmpty = await cr.req("/read?q=");
  const sqPct = await cr.req("/read?q=%25%5C");
  check("Search with an empty query or only % and a backslash shows the folds, not an empty result list", /data-folds/.test(sqEmpty.body) && /data-folds/.test(sqPct.body) && !/data-search-results/.test(sqPct.body));
  const sqQuote = await cr.req("/read?q=" + encodeURIComponent('" || true || "'));
  const sqLong = await cr.req("/read?q=" + "a".repeat(400));
  check("Search with a quote and with 400 characters gives 200, no error page", sqQuote.status === 200 && sqLong.status === 200 && !/Application error|Internal Server Error/.test(sqQuote.body + sqLong.body));
  const men0 = await pbCall(pbUrl, "GET", `/api/collections/reader_pages/records?filter=${encodeURIComponent('page_id="men0/p005"')}&fields=search_en`, ad.token());
  const word = (men0.json?.items?.[0]?.search_en ?? "").split(" ").sort((x, y) => y.length - x.length)[0] ?? "";
  const sqMen0 = await cr.req("/read?q=" + encodeURIComponent(word));
  check(`Search for a word of the hidden work men0 ('${word}'): no page hit of men0 (round 69 answer 12: hidden in reader search)`, word.length > 4 && !hitsOf(sqMen0.body).some((h) => h.startsWith("men0/")), hitsOf(sqMen0.body).join(","));
  const sqN = await cr.req("/read?q=narazaki");
  check("Search 'narazaki': men_full is a hit by title, men0 and men1 are not", /data-book="men_full"/.test(sqN.body) && !/data-book="men0"|data-book="men1"/.test(sqN.body));
  check("Search results HTML holds no verdict, score, QA, TL_3, or reasoning", !LEAK_HTML.test(sq.body + sqC1.body));

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
  await clearLayout(cr);
  await put(cr, { view: "page", focus: false, shown: { book: ["agent"] } });
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
  r = await put(cr, { shown: { book: ["ja"] } });
  check("Settings route: PUT /api/read/settings with shown.book ['ja'] is saved (200)", r.status === 200 && same(r.json?.reader?.shown, { book: ["ja"] }), `status ${r.status}`);
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("Single language JA: the Japanese lines show (starts with the p048 sentence), no English line", squash(text).includes(squash(JA_START)) && countOf(r.body, /\sdata-ja(?:=|\s|>)/g) === 5 && countOf(r.body, /\sdata-en(?:=|\s|>)/g) === 0 && !text.includes("I keep applying"));
  r = await put(cr, { shown: { book: ["ja", "agent"] }, pair: true });
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("Bilingual pairing: each of the 5 rows has a pair of Japanese and English (red bar and blue bar), JA above EN on a phone", countOf(r.body, /\sdata-pair(?:=|\s|>)/g) === 5 && squash(text).includes(squash(JA_START)) && squash(text).includes(squash(EN_START)) && /md:grid-cols-2/.test(r.body) && /border-red-700/.test(r.body) && /border-blue-800/.test(r.body));
  r = await put(cr, { pair: false, shown: { book: ["agent"] }, size: 20, line: 1.9, width: "wide", fontEn: "sans", fontJa: "gothic" });
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("Settings: size 20 px, line height 1.9, and the sans font reach the text", /font-size:\s*20px/.test(r.body) && /line-height:\s*1\.9/.test(r.body) && /Helvetica/.test(r.body), `size ${/font-size:\s*20px/.test(r.body)}`);
  r = await put(cr, { size: 99, pair: "bad" });
  check("Settings route: a size above 28 is clamped to 28, a bad pair value is dropped (pair stays false)", r.status === 200 && r.json?.reader?.size === 28 && r.json?.reader?.pair === false, JSON.stringify(r.json));
  r = await put(cr, { nonsense: 1 });
  check("Settings route: a body with no valid key gives 400", r.status === 400, `status ${r.status}`);
  r = await cr.req("/api/read/settings", { method: "PUT", json: { reader: { size: 18 } }, headers: { origin: "https://evil.example" } });
  check("Settings route: a foreign origin gives 403", r.status === 403, `status ${r.status}`);
  await put(cr, { size: 18, line: 1.7, width: "narrow", fontEn: "serif", fontJa: "mincho" });
  const st = await cr.req("/api/htv/settings");
  check("The account keeps the reader key next to panes (GET /api/htv/settings returns reader.size 18 and the saved layout shown.book ['agent'])", st.status === 200 && st.json?.panes?.reader?.size === 18 && same(st.json?.panes?.reader?.shown, { book: ["agent"] }), JSON.stringify(st.json?.panes?.reader));
  const atr = await tr1c.req("/api/htv/settings", { method: "PUT", json: { panes: { v: 1, panes: { agent: { size: 21 } } } } });
  check("A translator saves pane settings and the reader key of that account stays (no reader key lost)", atr.status === 200);
  // reader key survives a pane-settings save of the same account
  const keep = await cr.req("/api/htv/settings", { method: "PUT", json: { panes: { v: 1, panes: { agent: { size: 22 } } } } });
  const after = await cr.req("/api/htv/settings");
  check("A save of the pane settings keeps the reader settings of the account", keep.status === 200 && after.json?.panes?.reader?.size === 18 && after.json?.panes?.panes?.agent?.size === 22, JSON.stringify(after.json?.panes));

  // --- scroll view and focus mode
  r = await cr.req(`/read/${LF}?view=scroll&at=p048`);
  const secs = [...new Set([...r.body.matchAll(/data-section="([^"]+)"/g)].map((m) => m[1]))];
  check("Scroll view: all 120 pages are sections, 5 pages near p048 hold text (p046 to p050), p075 loads later, and the pages with a v1 file (p051, p052 in this test folder) load later too, and the other 112 pages say 'No text for this page yet.'", r.status === 200 && /data-view="scroll"/.test(r.body) && secs.length === 120 && countOf(r.body, /data-lazy="75"/g) === 1 && countOf(r.body, /data-lazy="51"/g) === 1 && countOf(r.body, /data-lazy="52"/g) === 1 && countOf(r.body, /data-row="/g) >= 25 && countOf(htvText(r.body), /No text for this page yet\./g) === 112, `sections ${secs.length}, lazy75 ${countOf(r.body, /data-lazy="75"/g)}, empty ${countOf(htvText(r.body), /No text for this page yet\./g)}`);
  r = await cr.req(`/api/read/page?ids=${LF}/p075`);
  check("Scroll view lazy load: GET /api/read/page for p075 gives the page with text", r.status === 200 && r.json?.pages?.[0]?.hasText === true && r.json.pages[0].rows.length === 13, `rows ${r.json?.pages?.[0]?.rows?.length}`);
  r = await cr.req(`/api/read/page?ids=${LF}/p051`);
  check("GET /api/read/page for p051 (no reader_pages record) gives hasText false, no rows, hasAgent false, hasHuman false (the v1 blocks are the test of mode web)", r.status === 200 && r.json?.pages?.[0]?.hasText === false && r.json.pages[0].rows.length === 0 && r.json.pages[0].hasAgent === false && r.json.pages[0].hasHuman === false);
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
  await put(cr, { shown: { book: ["agent"] } });
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("Layout with Agent text only: the agent text shows with the AI label", squash(text).includes(squash(EN_START)) && /AI translation, not yet checked by a person/.test(text) && !/No human version for this page/.test(text));
  await put(cr, { shown: { book: ["human"] } });
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("Layout with Human version only: the page label reads 'Human translation. Chosen by an admin.' and the own text of the translator shows", /Human translation\. Chosen by an admin\./.test(text) && /My own words for the second row/.test(text) && !/AI translation, not yet checked by a person/.test(text));
  check("Layout with Human version only: the agreed row shows the agent text with the tag 'AI translation, checked by a translator', and the agent-kind rows carry the tag 'AI translation'", squash(text).includes(squash(EN_START)) && /AI translation, checked by a translator/.test(text) && countOf(r.body, /data-row-tag/g) >= 3, `tags ${countOf(r.body, /data-row-tag/g)}`);
  check("Layout with Human version only: the human page shows no translator name", !new RegExp(v1?.userName ?? "@@@").test(text));
  await put(cr, { shown: { book: ["agent", "human"] } });
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("Agent text and Human version both checked on p048: two panels, each with its own page line, and they share the run keys (the rows pair, D12)", same(panelIds(r.body), ["agent", "human"]) && /AI translation, not yet checked by a person/.test(panelLabel(r.body, "agent")) && panelLabel(r.body, "human") === "Human translation. Chosen by an admin." && same(rowKeysIn(r.body, "agent"), rowKeysIn(r.body, "human")) && rowKeysIn(r.body, "agent").length === 5, `panels ${panelIds(r.body)}`);
  await put(cr, { shown: { book: ["human"] } });
  r = await cr.req(`/read/${LF}?view=page&at=p049`);
  check("Only Human version checked, on a page with no human version (p049): the first layout shows (Page image and Agent text with the AI label) and no note", same(panelIds(r.body), ["image", "agent"]) && /AI translation, not yet checked by a person/.test(htvText(r.body)) && !/Human translation/.test(htvText(r.body)) && !/data-page-note/.test(r.body), `panels ${panelIds(r.body)}`);
  r = await ad.req("/api/admin/versions", { method: "POST", json: { action: "clear", pageId: P48 } });
  check("Admin removes the choice (200)", r.status === 200);
  const gone = await cr.req(`/api/read/page?ids=${P48}`);
  check("After the removal the page has no human version again", gone.json?.pages?.[0]?.hasHuman === false);
  await put(cr, { shown: { book: ["agent"] } });

  // --- page check
  r = await tr1c.req("/api/admin/checks", { method: "POST", json: { action: "set", pageId: P48 } });
  check("A translator cannot add a page check (403)", r.status === 403, `status ${r.status}`);
  r = await ad.req("/api/admin/checks", { method: "POST", json: { action: "set", pageId: P48, note: "Read by a person." } });
  check("Admin adds a page check on p048 (200)", r.status === 200, `status ${r.status}`);
  r = await ad.req("/api/admin/checks", { method: "POST", json: { action: "set", pageId: "left_foot_full/p051" } });
  check("A page check on a page without reader text gives 404", r.status === 404, `status ${r.status}`);
  r = await cr.req(`/read/${LF}?view=page&at=p048`);
  text = htvText(r.body);
  check("With a page check the label reads 'AI translation, checked by a person' and the PST date, for example '(2026-10-27 PST)' (round 82 answer 15)", /AI translation, checked by a person \(\d{4}-\d\d-\d\d PST\)/.test(text) && !/not yet checked by a person/.test(text));
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
  check("Admin page /admin/versions: the page list has the pages with reader text and the panel of p048", r.status === 200 && new Set([...r.body.matchAll(/href="\/admin\/versions\?page=([^"]+)"/g)].map((m) => m[1])).size === 1152 && r.body.includes(`data-version-panel="${P48}"`), `links ${new Set([...r.body.matchAll(/href="\/admin\/versions\?page=([^"]+)"/g)].map((m) => m[1])).size}`);
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
  check("PocketBase: the reader_pages records (29 agent records and 1,123 web-ja records) hold no key verdict, score, panel, reasoning, result, detail, tsIds (the first 500 are read)", rpList.json?.totalItems === 1152 && rpKeys.length === 0, `total ${rpList.json?.totalItems}, keys ${rpKeys.join(",")}`);
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
  // --- original page image and research fields in catalog_items (unit RC2, round 65)
  await imageChecks({ anon, nr, cr, tr1c, ad, adminToken, pbUrl, LF, put, countOf });
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

// ---------------------------------------------------------------- original page image (unit RC2, round 65)

// A request that returns the raw bytes and does not follow a redirect. `client` carries the sign-in cookie. `port` picks another app server.
async function rawGet(client, url, { port, absolute } = {}) {
  const h = {};
  if (client && client.jar.size) h.cookie = [...client.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(absolute ? url : (port ? `http://127.0.0.1:${port}` : base) + url, { headers: h, redirect: "manual" });
  const bytes = Buffer.from(await res.arrayBuffer());
  return { status: res.status, headers: res.headers, bytes, text: bytes.subarray(0, 2000).toString("utf-8") };
}

// An extra app server (a copy of this app on another port) with its own environment.
async function startExtra(extraEnv) {
  const port = await freePort();
  const env = { ...process.env, PORT: String(port), ...extraEnv };
  if (configFile) env.VIEWER_CONFIG = path.resolve(configFile);
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { env, stdio: "ignore" });
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/sign-in`);
      if (r.status < 500) return { child, port };
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  throw new Error("Extra server did not start.");
}

async function imageChecks({ anon, cr, tr1c, ad, adminToken, pbUrl, LF, put, countOf }) {
  const dir = process.env.VIEWER_PAGE_IMAGE_DIR;
  const key = process.env.VIEWER_PAGE_IMAGE_TEST_KEY;
  if (!dir || !key) {
    skip("Page images: all checks", "Set VIEWER_PAGE_IMAGE_DIR (test images) and VIEWER_PAGE_IMAGE_TEST_KEY (the signing key of the test PocketBase).");
    return;
  }
  const url = (slug, page) => `/api/read/image/${slug}/${page}`;
  const file = (slug, page) => fs.readFile(path.join(dir, slug, page + ".webp"));
  const NO_IMAGE_BODY = /No page image available/;

  // --- files mode (the main server of this run reads the folder in VIEWER_PAGE_IMAGE_DIR)
  const want48 = await file(LF, "p048");
  let r = await rawGet(cr, url(LF, "p048"));
  check("Page image (files): an approved reader gets p048 with status 200", r.status === 200, `status ${r.status}`);
  check("Page image (files): the bytes equal the file, Content-Type image/webp, Cache-Control private, max-age=600", r.bytes.equals(want48) && r.headers.get("content-type") === "image/webp" && r.headers.get("cache-control") === "private, max-age=600", `${r.bytes.length} bytes, ${r.headers.get("content-type")}, ${r.headers.get("cache-control")}`);
  check("Page image (files): the file is a WebP (RIFF ... WEBP)", r.bytes.subarray(0, 4).toString() === "RIFF" && r.bytes.subarray(8, 12).toString() === "WEBP");
  r = await rawGet(tr1c, url(LF, "p048"));
  check("Page image (files): a translator gets p048 (200)", r.status === 200 && r.bytes.equals(want48), `status ${r.status}`);
  r = await rawGet(ad, url(LF, "p048"));
  check("Page image (files): an admin gets p048 (200)", r.status === 200 && r.bytes.equals(want48), `status ${r.status}`);
  r = await rawGet(null, url(LF, "p048"));
  check("Page image (files): no session gives 401 and no bytes", r.status === 401 && !r.bytes.equals(want48), `status ${r.status}`);
  r = await rawGet(cr, url("kendojidai_2014", "p0839"));
  check("Page image (files): a four-digit page of a magazine year (kendojidai_2014/p0839) gives 200 and its file", r.status === 200 && r.bytes.equals(await file("kendojidai_2014", "p0839")), `status ${r.status}`);
  r = await rawGet(cr, url(LF, "p100"));
  check("Page image (files): a page in range with no file gives 404 and a short JSON body", r.status === 404 && NO_IMAGE_BODY.test(r.text) && r.headers.get("content-type")?.includes("json"), `status ${r.status}`);
  r = await rawGet(cr, url("18d4ac29", "p001"));
  check("Page image (files): the web article 18d4ac29 gives 404", r.status === 404 && NO_IMAGE_BODY.test(r.text), `status ${r.status}`);
  const badIds = [
    ["p48 (two digits)", url(LF, "p48"), 400],
    ["p048.webp (suffix)", url(LF, "p048.webp"), 400],
    ["P048 (capital)", url(LF, "P048"), 400],
    ["pabc", url(LF, "pabc"), 400],
    ["slug in capitals", url("Left_Foot_Full", "p048"), 400],
    ["slug with a dash", url("left-foot", "p048"), 400],
    ["slug %2e%2e (Next reads it as a path with ..; the route is not matched)", url("%2e%2e", "p048"), 404],
    ["slug ..%2f..%2fetc", url("..%2f..%2fetc", "p048"), 400],
    ["page ..%2fp048", url(LF, "..%2fp048"), 400],
    ["page %2e%2e%2f%2e%2e%2fsecret", url(LF, "%2e%2e%2f%2e%2e%2fsecret"), 400],
    ["slug with a NUL byte", url("left%00foot", "p048"), 400],
    ["page p0048 (four digits for a 120-page book)", url(LF, "p0048"), 404],
    ["page p000", url(LF, "p000"), 404],
    ["page p121 (after the last page)", url(LF, "p121"), 404],
    ["page p999", url(LF, "p999"), 404],
    ["a book that the app does not know", url("no_such_book", "p048"), 404],
  ];
  for (const [name, u, status] of badIds) {
    r = await rawGet(cr, u);
    check(`Page image (files): ${name} gives ${status}`, r.status === status && !r.bytes.equals(want48), `status ${r.status}`);
  }
  r = await rawGet(cr, url("mental_full", "p015"));
  check("Page image (files): a link inside the image folder that leaves the folder gives 403 and no bytes (safe-path)", r.status === 403 && !/OUTSIDE-SECRET/.test(r.text), `status ${r.status}`);
  r = await rawGet(cr, `/api/read/image/${LF}/p048?x=1`);
  check("Page image (files): a query string does not matter (200)", r.status === 200 && r.bytes.equals(want48));

// --- Unit RC3 (round 66 answers 1, 4, 5) and RT73b: the Image button sits in the reader bar, the default is on, the Settings panel has no switch. The image is the panel "Page image".
  const btnTag = (html) => (html.match(/<button[^>]*data-toolbar="Image:toggle"[^>]*>/) ?? [""])[0];
  await clearLayout(cr);
  const fresh = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("Default (no saved layout): the page view shows the panel Page image without any setting (first layout: Page image and Agent text)", fresh.status === 200 && same(panelIds(fresh.body), ["image", "agent"]) && /data-page-image/.test(fresh.body), `panels ${panelIds(fresh.body)}`);
  check("Default: the Image button is in the bar next to the View buttons, pressed (aria-pressed true), not disabled", /aria-pressed="true"/.test(btnTag(fresh.body)) && !/\sdisabled=""/.test(btnTag(fresh.body)) && /data-view-tools[\s\S]*data-toolbar="View:page"[\s\S]*data-toolbar="Image:toggle"/.test(fresh.body), btnTag(fresh.body).slice(0, 120));
  check("The Image button comes after the View buttons and before the Components button (same bar row), and the bar has no Text button and no English text button", fresh.body.indexOf('data-toolbar="View:scroll"') < fresh.body.indexOf('data-toolbar="Image:toggle"') && fresh.body.indexOf('data-toolbar="Image:toggle"') < fresh.body.indexOf("data-components-open") && !/data-toolbar="Text:/.test(fresh.body) && !/data-toolbar="English text:/.test(fresh.body));
  const scrollBtn = await cr.req(`/read/${LF}?view=scroll&at=p048`);
  check("Scroll view: the Image button stays, is disabled, and its title says 'Page image shows in Page view only'", /\sdisabled=""/.test(btnTag(scrollBtn.body)) && /title="Page image shows in Page view only"/.test(scrollBtn.body), btnTag(scrollBtn.body).slice(0, 120));
  const webBtn = await cr.req("/read/18d4ac29?view=page&at=p001");
  check("Web article (no page images): no Image button in the bar, the button Original text instead (pressed, aria-pressed true)", webBtn.status === 200 && btnTag(webBtn.body) === "" && /<button[^>]*data-toolbar="Original text:toggle"[^>]*aria-pressed="true"|<button[^>]*aria-pressed="true"[^>]*data-toolbar="Original text:toggle"/.test(webBtn.body));
  check("The Settings panel code has no 'Page image' switch (no data-setting 'Page image' in the page HTML)", !/data-setting="Page image/.test(fresh.body));
  // --- the layout is saved in the account like the other reader settings
  r = await put(cr, { image: "yes" });
  check("Setting image: a value that is not true or false gives 400 (nothing valid to save)", r.status === 400, `status ${r.status}`);
  r = await put(cr, { shown: { book: ["image", "agent"] } });
  check("Layout shown.book ['image', 'agent'] is saved (200)", r.status === 200 && same(r.json?.reader?.shown, { book: ["image", "agent"] }), `status ${r.status}`);
  const pageOn = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("Page view with Page image checked: the image panel is in the page (alt, lazy, async, Open full size) and, below a phone width, the panels have tabs", pageOn.status === 200 && same(panelIds(pageOn.body), ["image", "agent"]) && /alt="Original page image, Page 48"/.test(pageOn.body) && /loading="lazy"/.test(pageOn.body) && /decoding="async"/.test(pageOn.body) && /Open full size/.test(pageOn.body) && /role="tablist"[^>]*data-panel-tabs/.test(pageOn.body) && countOf(pageOn.body, /data-panel-tab="/g) === 2, `status ${pageOn.status}`);
  check("Page view with Page image checked: the img src is the route /api/read/image/left_foot_full/p048 and the link opens a new tab", /<img[^>]*src="\/api\/read\/image\/left_foot_full\/p048"/.test(pageOn.body) && /<a[^>]*href="\/api\/read\/image\/left_foot_full\/p048"[^>]*target="_blank"/.test(pageOn.body));
  check("Page view with Page image checked: the 5 rows of the text stay in the Agent panel", rowKeysIn(pageOn.body, "agent").length === 5, `rows ${rowKeysIn(pageOn.body, "agent").length}`);
  const noText = await cr.req("/read/kendojidai_2014?view=page&at=p0839");
  check("A page with no agent translation (kendojidai_2014/p0839) shows its page image and the line 'No text for this page yet.'", noText.status === 200 && /data-no-text/.test(noText.body) && same(panelIds(noText.body), ["image"]) && /alt="Original page image, Page 839"/.test(noText.body) && /src="\/api\/read\/image\/kendojidai_2014\/p0839"/.test(noText.body), `status ${noText.status}`);
  const scroll = await cr.req(`/read/${LF}?view=scroll&at=p048`);
  check("Scroll view with Page image checked: text only, no image", scroll.status === 200 && !/data-page-image/.test(scroll.body) && !/data-panel="image"/.test(scroll.body));
  r = await put(cr, { focus: true });
  const focus = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("Focus mode with Page image checked: text only, no image, no title bar, no handle", focus.status === 200 && /data-focus-mode/.test(focus.body) && !/data-page-image/.test(focus.body) && !/data-panel="image"/.test(focus.body) && !/data-panel-title=/.test(focus.body) && !/data-reader-handle/.test(focus.body) && same(panelIds(focus.body), ["agent"]), `panels ${panelIds(focus.body)}`);
  await put(cr, { focus: false });
  const web = await cr.req("/read/18d4ac29?view=page&at=p001");
  check("Web article with Page image checked in the book layout: no image pane", web.status === 200 && !/data-panel="image"/.test(web.body) && !/data-page-image/.test(web.body), `status ${web.status}`);
  r = await put(cr, { shown: { book: ["agent"] } });
  const pageOff = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("Page image unchecked: no image panel in the page view, the Image button shows aria-pressed false", r.status === 200 && pageOff.status === 200 && !/data-panel="image"/.test(pageOff.body) && !/data-page-image/.test(pageOff.body) && /aria-pressed="false"/.test(btnTag(pageOff.body)));
  await clearLayout(cr);
  r = await put(cr, { image: false });
  const legacyOff = await cr.req(`/read/${LF}?view=page&at=p048`);
  check("Old saved value {image: false}: the page view has no image panel (read time conversion), Agent text only", r.status === 200 && same(panelIds(legacyOff.body), ["agent"]) && /aria-pressed="false"/.test(btnTag(legacyOff.body)), `panels ${panelIds(legacyOff.body)}`);
  r = await clearLayout(cr);
  check("Layout cleared again: the image panel returns (the reader stays at the default state for the next checks)", r.status === 200 && same(panelIds((await cr.req(`/read/${LF}?view=page&at=p048`)).body), ["image", "agent"]));
  const waiting = anon;
  r = await waiting.req(`/read/${LF}?view=page&at=p048`);
  check("No session: the page view still goes to the sign-in page (no image pane)", /^\/sign-in/.test(r.go));

  // --- research fields are not in catalog_items.row after S2
  // Unit RC3 (round 66 answer 6): 14 keys, the six of round 65 plus eight more (hint_secondary holds a file path of the Mac of the owner).
  const RESEARCH = ["sources", "confidence", "filled_by", "confirmed_by", "notes", "source_url", "hint_secondary", "confidence_draft", "notes_draft", "issue_evidence", "status", "title_en_source", "author_en_source", "synopsis_source"];
  const cat = await pbCall(pbUrl, "GET", "/api/collections/catalog_items/records?perPage=500", adminToken);
  const items = cat.json?.items ?? [];
  const withRow = items.filter((x) => x.row && typeof x.row === "object");
  const leaked = withRow.filter((x) => RESEARCH.some((k) => k in x.row)).map((x) => x.item_id);
  check(`catalog_items: ${items.length} records (RC4 round 70: 347, was 37), none holds one of the 14 research keys in row (${RESEARCH.join(", ")})`, items.length === 347 && withRow.length > 0 && leaked.length === 0 && RESEARCH.length === 14, `records ${items.length}, with row ${withRow.length}, leaking ${leaked.join(",")}`);
  const leakedKeys = [...new Set(withRow.flatMap((x) => RESEARCH.filter((k) => k in x.row)))];
  check("catalog_items: for each of the 14 keys, no record holds it (checked one key at a time)", RESEARCH.every((k) => !withRow.some((x) => k in x.row)) && leakedKeys.length === 0, `keys found: ${leakedKeys.join(",")}`);
  check("catalog_items: no row holds a Mac path (no '/Volumes/' and no '/Users/' in any row)", !withRow.some((x) => /\/Volumes\/|\/Users\//.test(JSON.stringify(x.row))));
  check("catalog_items: the keys that the reader pages use stay (isbn and synopsis of left_foot_full)", (() => { const x = withRow.find((y) => y.item_id === LF); return Boolean(x) && "synopsis" in x.row && "isbn" in x.row; })());
  const lf = items.find((x) => x.item_id === LF);
  check("catalog_items: the other fields of row stay (title_en, isbn, synopsis, pages) for left_foot_full", Boolean(lf?.row?.title_en && lf.row.isbn && lf.row.synopsis && lf.row.pages === 120) && lf.title_en === lf.row.title_en, JSON.stringify(Object.keys(lf?.row ?? {})));
  const crCat = await pbCall(pbUrl, "GET", "/api/collections/catalog_items/records?perPage=500", cr.token());
  check("catalog_items: a reader reads the records and finds no research field in row", crCat.status === 200 && (crCat.json?.items ?? []).every((x) => !x.row || !RESEARCH.some((k) => k in x.row)));

  // --- signed mode: the route sends the browser to a signed link of the PocketBase hook (a second app server)
  const pbBase = pbUrl + "/page-images";
  const signed = await startExtra({ VIEWER_PAGE_IMAGE_SOURCE: "signed", VIEWER_PAGE_IMAGE_URL: pbBase, VIEWER_PAGE_IMAGE_KEY: key, VIEWER_PAGE_IMAGE_DIR: undefined });
  const extras = [signed.child];
  try {
    const sp = signed.port;
    r = await rawGet(null, url(LF, "p048"), { port: sp });
    check("Page image (signed): no session gives 401", r.status === 401, `status ${r.status}`);
    r = await rawGet(cr, url(LF, "p048"), { port: sp });
    const loc = r.headers.get("location") ?? "";
    const m = new RegExp(`^${pbBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/${LF}/p048\\.webp\\?exp=(\\d+)&sig=([0-9a-f]{64})$`).exec(loc);
    const now = Math.floor(Date.now() / 1000);
    check("Page image (signed): an approved reader gets 302 to <url>/left_foot_full/p048.webp?exp=<seconds>&sig=<64 hex>", r.status === 302 && Boolean(m), `status ${r.status}, location ${loc.replace(/sig=[0-9a-f]+/, "sig=...")}`);
    check("Page image (signed): exp is about now + 600 seconds, and the answer is not cached (Cache-Control private, no-store)", Boolean(m) && Math.abs(Number(m[1]) - (now + 600)) <= 15 && r.headers.get("cache-control") === "private, no-store", `exp-now ${m ? Number(m[1]) - now : "-"}`);
    check("Page image (signed): the answer shows no key", !JSON.stringify([...r.headers]).includes(key) && !r.text.includes(key));
    if (m) {
      const hook = await rawGet(null, loc, { absolute: true });
      check("Page image (signed): the PocketBase hook accepts the link: 200, image/webp, the bytes equal the file", hook.status === 200 && hook.headers.get("content-type") === "image/webp" && hook.bytes.equals(want48), `status ${hook.status}`);
      const flip = (s) => s.slice(0, -1) + (s.endsWith("0") ? "1" : "0");
      const bad = await rawGet(null, loc.replace(m[2], flip(m[2])), { absolute: true });
      check("Page image (signed): a link with a changed signature gives 403 at the hook", bad.status === 403, `status ${bad.status}`);
      const other = await rawGet(null, loc.replace("/p048.webp", "/p049.webp"), { absolute: true });
      check("Page image (signed): the link of p048 does not open p049 (403)", other.status === 403, `status ${other.status}`);
      const late = await rawGet(null, loc.replace(`exp=${m[1]}`, `exp=${Number(m[1]) + 400}`), { absolute: true });
      check("Page image (signed): a link with a later exp and the old signature gives 403", late.status === 403, `status ${late.status}`);
    }
    r = await rawGet(tr1c, url("kendojidai_2014", "p0839"), { port: sp });
    check("Page image (signed): a translator gets 302 for a four-digit page", r.status === 302 && /\/kendojidai_2014\/p0839\.webp\?exp=\d+&sig=[0-9a-f]{64}$/.test(r.headers.get("location") ?? ""), `status ${r.status}`);
    r = await rawGet(cr, url(LF, "p100"), { port: sp });
    const noFile = r.status === 302 ? await rawGet(null, r.headers.get("location"), { absolute: true }) : null;
    check("Page image (signed): a page with no file on the server gives 302 and the hook answers 404", r.status === 302 && noFile?.status === 404, `status ${r.status}, hook ${noFile?.status}`);
    r = await rawGet(cr, url("18d4ac29", "p001"), { port: sp });
    check("Page image (signed): the web article gives 404 and no redirect", r.status === 404 && !r.headers.get("location"), `status ${r.status}`);
    for (const [name, u, status] of [["p48", url(LF, "p48"), 400], ["slug %2e%2e", url("%2e%2e", "p048"), 404], ["page p0048", url(LF, "p0048"), 404], ["page p121", url(LF, "p121"), 404], ["unknown book", url("no_such_book", "p048"), 404]]) {
      r = await rawGet(cr, u, { port: sp });
      check(`Page image (signed): ${name} gives ${status} and no redirect`, r.status === status && !r.headers.get("location"), `status ${r.status}`);
    }
  } finally {
    for (const c of extras) c.kill("SIGTERM");
  }

  // --- wrong settings: a clear 500 that names the missing key and never shows a key value
  const cases = [
    ["signed mode with no VIEWER_PAGE_IMAGE_KEY", { VIEWER_PAGE_IMAGE_SOURCE: "signed", VIEWER_PAGE_IMAGE_URL: pbBase, VIEWER_PAGE_IMAGE_KEY: undefined }, "VIEWER_PAGE_IMAGE_KEY"],
    ["signed mode with no VIEWER_PAGE_IMAGE_URL", { VIEWER_PAGE_IMAGE_SOURCE: "signed", VIEWER_PAGE_IMAGE_URL: undefined, VIEWER_PAGE_IMAGE_KEY: key }, "VIEWER_PAGE_IMAGE_URL"],
    ["signed mode with a key under 32 characters", { VIEWER_PAGE_IMAGE_SOURCE: "signed", VIEWER_PAGE_IMAGE_URL: pbBase, VIEWER_PAGE_IMAGE_KEY: key.slice(0, 31) }, "VIEWER_PAGE_IMAGE_KEY"],
    ["signed mode with plain http to a remote host", { VIEWER_PAGE_IMAGE_SOURCE: "signed", VIEWER_PAGE_IMAGE_URL: "http://pb.example.com/page-images", VIEWER_PAGE_IMAGE_KEY: key }, "VIEWER_PAGE_IMAGE_URL"],
    ["an unknown VIEWER_PAGE_IMAGE_SOURCE", { VIEWER_PAGE_IMAGE_SOURCE: "cloud" }, "VIEWER_PAGE_IMAGE_SOURCE"],
  ];
  for (const [name, env, named] of cases) {
    const x = await startExtra({ VIEWER_PAGE_IMAGE_KEY: undefined, VIEWER_PAGE_IMAGE_URL: undefined, ...env });
    try {
      r = await rawGet(cr, url(LF, "p048"), { port: x.port });
      check(`Page image config: ${name} gives 500 and the message names ${named}`, r.status === 500 && r.text.includes(named) && !r.text.includes(key.slice(0, 31)), `status ${r.status}`);
    } finally {
      x.child.kill("SIGTERM");
    }
  }
  const nodir = await startExtra({ VIEWER_PAGE_IMAGE_SOURCE: "files", VIEWER_PAGE_IMAGE_DIR: path.join(path.dirname(dir), "no-such-image-folder") });
  try {
    r = await rawGet(cr, url(LF, "p048"), { port: nodir.port });
    check("Page image (files): a missing image folder gives 404 'No page image available' (not 500)", r.status === 404 && NO_IMAGE_BODY.test(r.text), `status ${r.status}`);
  } finally {
    nodir.child.kill("SIGTERM");
  }
}

// Parity of the reader_pages rows with the build of the human-translation-view (VISION-viewer 15.19.10).
// Unit RT73a: pages and works of the web articles whose kendojidai.com text or Japanese text holds a folded query, read from the page file (with the fold rule of the app).
// 18d4ac29/p001 is left out: its search columns hold the agent text and the Human text together.
async function webHits(query) {
  const { pathToFileURL } = await import("node:url");
  const { installTsResolveHook } = await import(pathToFileURL(path.resolve("scripts/ts-resolve-hook.mjs")).href);
  installTsResolveHook();
  const S = await import(pathToFileURL(path.resolve("lib/reader-search.ts")).href);
  const cfg = JSON.parse(await fs.readFile(configFile ? path.resolve(configFile) : path.resolve("viewer.config.json"), "utf-8"));
  const file = process.env.RT73A_WEB_PAGES ? path.resolve(process.env.RT73A_WEB_PAGES) : path.join(path.resolve(cfg.translatorDataDir), "item-metadata/web-pages.jsonl");
  const q = S.foldQuery(query);
  const pages = new Set();
  for (const line of (await fs.readFile(file, "utf-8")).split("\n")) {
    if (!line.trim()) continue;
    const pg = JSON.parse(line);
    if (pg.page_id === "18d4ac29/p001") continue;
    if (S.foldText(pg.human_rows.map((h) => h.text).join(" ")).includes(q) || S.foldText(pg.ja_rows.map((x) => x.ja).join(" ")).includes(q)) pages.add(pg.page_id);
  }
  return { pages, works: new Set([...pages].map((x) => x.split("/")[0])) };
}

async function parityReaderRows(pbUrl, adminToken) {
  const { pathToFileURL } = await import("node:url");
  const { installTsResolveHook } = await import(pathToFileURL(path.resolve("scripts/ts-resolve-hook.mjs")).href);
  installTsResolveHook();
  const build = await import(pathToFileURL(path.resolve("lib/htv-build.ts")).href);
  const cfg = JSON.parse(await fs.readFile(configFile ? path.resolve(configFile) : path.resolve("viewer.config.json"), "utf-8"));
  const dataDir = path.resolve(cfg.translatorDataDir);
  const tb = build.parseTermbase(await fs.readFile(path.join(dataDir, "termbase/termbase.draft.jsonl"), "utf-8"));
  const rj = async (f) => JSON.parse(await fs.readFile(f, "utf-8").catch(() => "null"));
  const rt = (f) => fs.readFile(f, "utf-8").catch(() => null);
  // Unit RT73a: only the agent records (run_id is not "web-ja"). 18d4ac29/p001 also holds the web Original text rows, merged by key. They are not part of the run build.
  const recs = ((await pbCall(pbUrl, "GET", "/api/collections/reader_pages/records?perPage=500&filter=" + encodeURIComponent('run_id != "web-ja"'), adminToken)).json?.items ?? []).map((x) => ({ ...x, rows: x.rows.filter((r) => !/\/web\/[A-Za-z0-9_]+$/.test(r.key)) }));
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


// ---------------------------------------------------------------- Reader dashboard rules without a server (unit RC4, round 70)

async function foldsTest() {
  const { installTsResolveHook } = await import("./ts-resolve-hook.mjs");
  installTsResolveHook();
  const F = await import("../lib/reader-folds.ts");
  const S = await import("../lib/reader-search.ts");
  const R = await import("../lib/reader-translated.ts");
  const cfg = JSON.parse(await fs.readFile(configFile ? path.resolve(configFile) : path.resolve("viewer.config.json"), "utf-8"));
  const dir = path.join(path.resolve(cfg.translatorDataDir), "item-metadata");
  const jsonl = async (name) => (await fs.readFile(path.join(dir, name), "utf-8")).split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  const rows = await jsonl("items.filled.jsonl");
  const stamps = new Map((await jsonl("web-magazine-candidates.jsonl")).map((r) => [r.record_id, r]));
  // Unit RT73a: a web article has the pages of the A4 cut and a Human version on each of them (the page file of the Translator, S2 default choice).
  const webFile = process.env.RT73A_WEB_PAGES ? path.resolve(process.env.RT73A_WEB_PAGES) : path.join(dir, "web-pages.jsonl");
  const webPageCount = new Map();
  for (const line of (await fs.readFile(webFile, "utf-8")).split("\n")) {
    if (!line.trim()) continue;
    const pg = JSON.parse(line);
    webPageCount.set(pg.item_id, Math.max(webPageCount.get(pg.item_id) ?? 0, pg.n));
  }
  const translatedOf = { left_foot_full: [46, 47, 48, 49, 50, 75], kendojidai_2014: [794, 795, 796, 797, 798] };
  for (const [slug, n] of webPageCount) translatedOf[slug] = Array.from({ length: n }, (_, i) => i + 1);
  const works = rows.map((r) => {
    const web = r.kind === "web-article";
    const slug = web ? r.item_id.slice(0, 8) : r.item_id;
    const d = web ? /^(\d{4})-(\d{2})/.exec(r.publish_date_text) : null;
    const st = web ? stamps.get(r.item_id) : null;
    return {
      slug, kind: r.kind, titleEn: r.title_en ?? "", titleJa: r.title_ja ?? "", author: r.author_en ?? "", publisher: r.publisher ?? "", year: r.publish_year == null ? "" : String(r.publish_year),
      pages: web ? webPageCount.get(slug) ?? 0 : typeof r.pages === "number" ? r.pages : 0, synopsis: r.synopsis ?? "", isbn: "", partOf: r.part_of ?? "", webDate: web ? r.publish_date_text : "",
      placement: { webYear: d ? Number(d[1]) : null, webMonth: d ? Number(d[2]) : null, printYear: st?.stamp_year ?? null, printMonth: st?.stamp_month ?? null },
      translated: translatedOf[slug] ?? [], known: true, resumeAt: null,
    };
  });
  const chapters = (await jsonl("magazine-chapters.jsonl")).map((c) => ({
    chapter: c.chapter, book: c.book, month: c.month ?? null, year: c.year ?? null, titleEn: c.chapter_title_en ?? "", pageStart: c.page_start ?? 0, pageEnd: c.page_end ?? 0,
    articles: (c.articles ?? []).map((a) => ({ order: a.order, titleEn: a.title_en ?? "", titleJa: a.title_ja ?? "", pageStart: a.page_start ?? 0, pageEnd: a.page_end ?? 0 })),
  }));
  const find = (nodes, id) => {
    for (const n of nodes) {
      if (n.type !== "fold") continue;
      if (n.id === id) return n;
      const hit = find(n.children, id);
      if (hit) return hit;
    }
    return null;
  };
  const rowSlugs = (nodes) => nodes.flatMap((n) => (n.type === "fold" ? [...(n.head ? [n.head.work.slug] : []), ...rowSlugs(n.children)] : n.type === "work" ? [n.work.slug] : []));
  const rowsOf = (nodes, slug) => {
    for (const n of nodes) {
      if (n.type === "work" && n.work.slug === slug) return n;
      if (n.type === "fold") {
        const hit = rowsOf([...(n.head ? [n.head] : []), ...n.children], slug);
        if (hit) return hit;
      }
    }
    return null;
  };
  const articleCount = (nodes) => nodes.reduce((t, n) => t + (n.type === "fold" ? articleCount(n.children) : n.type === "article" ? 1 : 0), 0);

  // --- default reading A
  const A = F.buildFolds(works, chapters);
  check("Folds: the data holds 347 works", works.length === 347 && F.DEFAULT_OPTIONS.webPlace === "kendo-jidai" && F.DEFAULT_OPTIONS.stampedPlace === "web"); // unit TF83: round 83 answer 4 "Show web year", old value "print"
  check("Folds A: two first-level folds, Books and Kendo Jidai", A.folds.map((f) => f.id).join(",") === "books,kj" && A.folds.every((f) => f.level === 1), A.folds.map((f) => f.id).join(","));
  check("Folds A: Books holds 22 works (25 books, men0, men1, and mental2_clean hidden)", A.folds[0].counts.works === 22, `works ${A.folds[0].counts.works}`);
  check("Folds A: Kendo Jidai holds 320 works (9 year volumes and 311 web articles)", A.folds[1].counts.works === 320, `works ${A.folds[1].counts.works}`);
  check("Folds A: 342 visible works in all, and 14,135 pages (RT73a: 4,840 book pages + 8,171 magazine pages + 1,124 A4 pages of the web articles)", A.visible.length === 342 && A.totals.works === 342 && A.totals.pages === 14135, `works ${A.totals.works}, pages ${A.totals.pages}`);
  check("Folds A (RT73a): d7835263 is a work row with 3 pages and 3 translated pages, and 18d4ac29 has 1 page", (() => { const r3 = rowsOf(A.folds, "d7835263"); const r1 = rowsOf(A.folds, "18d4ac29"); return r3?.pages === 3 && r3.translated === 3 && r3.start === 1 && r1?.pages === 1 && r1.translated === 1 && R.progressLine(r3.translated, r3.pages) === "English: 3 of 3 pages translated (100.0 percent)"; })());
  check("Folds A (RT73a): the year folds 2019 to 2025 are named 'Kendo Jidai 2019' to 'Kendo Jidai 2025'; 2013 and 2014 keep the titles of the magazine volumes", (() => { const t = (y) => find(A.folds, `kj-${y}`)?.title; return [2019, 2020, 2021, 2022, 2023, 2024, 2025].every((y) => t(y) === `Kendo Jidai ${y}`) && t(2013) === "Kendo Jidai 2013" && t(2014) === "Kendo Jidai 2014"; })(), [2019, 2025, 2013].map((y) => find(A.folds, `kj-${y}`)?.title).join(" | "));
  check("Folds A (RT73a): Books 6 translated of 4,840 pages, Kendo Jidai 9,295 pages (8,171 + 1,124) with 1,129 translated pages (5 + 1,124)", A.folds[0].counts.pages === 4840 && A.folds[0].counts.translated === 6 && A.folds[1].counts.pages === 9295 && A.folds[1].counts.translated === 1129, `kj pages ${A.folds[1].counts.pages}, translated ${A.folds[1].counts.translated}`);
  const hidden = ["men0", "men1", "mental2_clean", "matsubara", "morishima"];
  check("Folds: hidden works are absent from the rows (men0, men1, mental2_clean, matsubara, morishima; round 69 answers 12 and 15)", hidden.every((h) => !rowSlugs(A.folds).includes(h)) && hidden.every((h) => !A.visible.some((w) => w.slug === h)));
  check("Folds: ogawa_lecture_part1, part2, and part3 stay as three rows in one fold", find(A.folds, "books-series-1")?.children.length === 3 && ["ogawa_lecture_part1", "ogawa_lecture_part2", "ogawa_lecture_part3"].every((x) => rowSlugs(A.folds).includes(x)));
  check("Folds: men_full and mental_full are plain rows of Books", rowSlugs([A.folds[0]]).includes("men_full") && rowSlugs([A.folds[0]]).includes("mental_full"));
  const kj = A.folds[1];
  check("Folds A: Kendo Jidai has 16 year folds, 2010 to 2025", kj.children.length === 16 && kj.children[0].id === "kj-2010" && kj.children.at(-1).id === "kj-2025", kj.children.map((c) => c.id).join(","));
  const web = works.filter((w) => w.kind === "web-article");
  const all = rowSlugs(A.folds);
  check("Folds A: each of the 311 web articles shows exactly once", web.every((w) => all.filter((x) => x === w.slug).length === 1), `rows ${all.length}`);
  const aug = find(A.folds, "kj-2011-08");
  // Unit TF83 (round 83 answer 4 "Show web year", round 84 answer 1): a stamped web article sits in the fold of its web year and month. Old expectations: see the git history of this file.
  const apr25d = find(A.folds, "kj-2025-04");
  check("Folds A: the Teramoto article 63654ba0 (stamp 2011.8, web date 2025-04-28) sits in Kendo Jidai > 2025 > April 2025 (old: 2011 > August 2011)", Boolean(apr25d && rowSlugs([apr25d]).includes("63654ba0")) && apr25d.title === "April 2025" && !rowSlugs([aug]).includes("63654ba0"), apr25d?.note);
  check("Folds A: August 2011 holds its 14 magazine articles and no web article (old: 2 web articles, 63654ba0 and 6f19be05, now in April 2025)", aug && aug.children.filter((c) => c.type === "article").length === 14 && aug.children.filter((c) => c.type === "work").length === 0 && /14 articles/.test(aug.note) && !/web article/.test(aug.note) && rowSlugs([apr25d]).includes("6f19be05"), aug?.note);
  check("Folds A: April 2025 holds 4 web articles with 11 pages (old: 2 web articles with 3 pages)", apr25d?.counts.works === 4 && apr25d.counts.pages === 11, JSON.stringify(apr25d?.counts));
  const stampedWebs = web.filter((w) => w.placement.printYear);
  check("Folds A: the 36 web articles with a print stamp each sit in the month fold of their web date, and the years 2011 to 2018 hold no web article", stampedWebs.length === 36 && stampedWebs.every((w) => rowSlugs([find(A.folds, `kj-${w.placement.webYear}-${String(w.placement.webMonth).padStart(2, "0")}`) ?? { children: [], type: "fold" }]).includes(w.slug)) && web.every((w) => w.placement.webYear >= 2019) && [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018].every((y) => !web.some((w) => rowSlugs([find(A.folds, `kj-${y}`)]).includes(w.slug))), `stamped ${stampedWebs.length}`);
  const yearNums = (y) => { const f = find(A.folds, `kj-${y}`); return `${f.counts.works} ${f.counts.pages}`; };
  check("Folds A: the year folds 2019 to 2025 hold 14, 54, 55, 51, 48, 45, 44 web articles with 39, 182, 224, 201, 172, 148, 158 pages (old: 9, 39, 48, 51, 48, 40, 40 articles with 24, 131, 189, 201, 172, 130, 142 pages)", [2019, 2020, 2021, 2022, 2023, 2024, 2025].map(yearNums).join(" | ") === "14 39 | 54 182 | 55 224 | 51 201 | 48 172 | 45 148 | 44 158", [2019, 2020, 2021, 2022, 2023, 2024, 2025].map(yearNums).join(" | "));
  check("Folds A: the 36 stamped web articles leave the years 2011 to 2018: 2 (8 pages), 3 (9), 7 (21), 3 (10), 1 (5), 4 (15), 7 (25), 9 (42) web articles with their pages, and the year folds lose the note 'N web articles'", (() => { const gone = { 2011: [2, 8], 2012: [3, 9], 2013: [7, 21], 2014: [3, 10], 2015: [1, 5], 2016: [4, 15], 2017: [7, 25], 2018: [9, 42] }; return Object.entries(gone).every(([y, [n, pg]]) => stampedWebs.filter((w) => w.placement.printYear === +y).length === n && stampedWebs.filter((w) => w.placement.printYear === +y).reduce((t, w) => t + w.pages, 0) === pg && !/web article/.test(find(A.folds, `kj-${y}`).note)); })());
  check("Folds A: the 1,155 magazine articles all show as article rows", articleCount(A.folds) === 1155, `articles ${articleCount(A.folds)}`);
  const oct14 = find(A.folds, "kj-2014-10");
  check("Folds A: kendojidai_2014 October 2014 counts 5 translated pages of 91 (pages 778-868)", oct14?.counts.translated === 5 && oct14.counts.pages === 91, JSON.stringify(oct14?.counts));
  check("Folds A: the year fold kendojidai_2014 shows the work row with 5 translated pages of 1051", find(A.folds, "kj-2014")?.head?.translated === 5 && find(A.folds, "kj-2014").head.pages === 1051);
  check("Folds A: a 2020 web article sits in a month fold of its web date (Kendo droplet guard: 18d4ac29)", (() => { const w = works.find((x) => x.slug === "18d4ac29"); const m = find(A.folds, `kj-2020-${String(w.placement.webMonth).padStart(2, "0")}`); return Boolean(m) && rowSlugs([m]).includes("18d4ac29") && w.titleEn === "Kendo droplet guard"; })());
  check("Folds A: the web-only month folds of 2018 (June, July, September, October; the magazine volume ends in April) are gone, and 2024 gets the month fold February 2024 (2 stamped web articles, old: no such fold)", ["06", "07", "09", "10"].every((m) => find(A.folds, `kj-2018-${m}`) === null) && find(A.folds, "kj-2024-02")?.counts.works === 2);
  check("Folds: the first level starts open, the deeper levels start closed (level numbers 1, 2, 3)", A.folds.every((f) => f.level === 1) && kj.children.every((f) => f.level === 2) && aug.level === 3);

  // --- fork: print month (the old default before unit TF83, kept as a switch)
  const W = F.buildFolds(works, chapters, { webPlace: "kendo-jidai", stampedPlace: "print" });
  const aug0 = find(W.folds, "kj-2011-08");
  check("Folds, stamped placed by the print month (the old default): the Teramoto article 63654ba0 sits in August 2011 and not in April 2025", Boolean(aug0) && rowSlugs([aug0]).includes("63654ba0") && !rowSlugs([find(W.folds, "kj-2025-04") ?? { children: [], type: "fold" }]).includes("63654ba0"));
  check("Folds, stamped placed by the print month: Kendo Jidai has 16 years and 320 works, 2019 holds 9 web articles with 24 pages, September 2018 holds 5 web articles", W.folds[1].counts.works === 320 && W.folds[1].children.length === 16 && find(W.folds, "kj-2019").counts.works === 9 && find(W.folds, "kj-2019").counts.pages === 24 && find(W.folds, "kj-2018-09")?.children.length === 5);

  // --- reading B
  const B = F.buildFolds(works, chapters, { webPlace: "separate", stampedPlace: "print" });
  check("Folds B: three first-level folds, Books, Kendo Jidai (9 works), and Web articles (311 works)", B.folds.map((f) => f.id).join(",") === "books,kj,web" && B.folds[1].counts.works === 9 && B.folds[2].counts.works === 311, B.folds.map((f) => `${f.id}:${f.counts.works}`).join(","));
  check("Folds B: the Teramoto article sits in Web articles > 2011 > August 2011", rowSlugs([find(B.folds, "web-2011-08") ?? { children: [], type: "fold" }]).includes("63654ba0"));
  check("Folds B: Kendo Jidai holds no web article", web.every((w) => !rowSlugs([B.folds[1]]).includes(w.slug)));

  // --- a work with no date
  const odd = F.buildFolds([{ ...works.find((w) => w.slug === "18d4ac29"), placement: { webYear: null, webMonth: null, printYear: null, printMonth: null } }], []);
  check("Folds: a web article with no date goes to the fold 'Date unknown' (no crash)", odd.folds[0].children[0].title === "Date unknown" && odd.folds[0].counts.works === 1);

  // --- fold rule of the search
  check("Fold rule: 'Seme-ai and Chūzumi' becomes 'semeai and chuzumi' (lowercase, no macron, no hyphen)", S.foldText("Seme-ai and Chūzumi") === "semeai and chuzumi", S.foldText("Seme-ai and Chūzumi"));
  check("Fold rule: Japanese stays as it is, also a kana with a voiced mark (攻めつづけ、がぎ)", S.foldText("攻めつづけ、がぎ") === "攻めつづけ、がぎ");
  check("Fold rule: 'Kendō' becomes 'kendo' and 'Ai-te' becomes 'aite'", S.foldText("Kendō") === "kendo" && S.foldText("Ai-te's") === "aite's");
  check("Query rule: '  Chūzumi% \\ ' becomes 'chuzumi' (% and backslash removed, trimmed)", S.foldQuery("  Chūzumi% \\ ") === "chuzumi", JSON.stringify(S.foldQuery("  Chūzumi% \\ ")));
  const line = "I keep applying Seme without letting my Kensen leave the Ai-te's Chūzumi (centerline), and if I think";
  const sn = S.snippetOf(line, "chuzumi");
  check("Snippet: the hit of 'chuzumi' keeps the spelling 'Chūzumi' and the text around it", sn?.hit === "Chūzumi" && sn.before.endsWith("the Ai-te's ") && sn.after.startsWith(" (centerline)"), JSON.stringify(sn));
  check("Snippet: 'aite' marks the whole word 'Ai-te'", S.snippetOf(line, "aite")?.hit === "Ai-te");
  check("Snippet: a text without the query gives null", S.snippetOf(line, "xyz") === null);
  const cols = S.searchColumns({ ja: ["わたしは剣先を相手の中墨から外さず"], en: ["Ai-te's Chūzumi", "Seme"] });
  check("Search columns: search_en 'aite's chuzumi seme' and search_ja unchanged", cols.search_en === "aite's chuzumi seme" && cols.search_ja === "わたしは剣先を相手の中墨から外さず" && cols.cut === false, JSON.stringify(cols));
  const longCols = S.searchColumns({ ja: [], en: ["a".repeat(S.SEARCH_COLUMN_MAX + 50)] });
  check("Search columns: text over 100,000 characters is cut and flagged", longCols.search_en.length === S.SEARCH_COLUMN_MAX && longCols.cut === true);
  check("Title search: 'kendo droplet' finds 18d4ac29, and 'jidai' finds the nine year volumes", F.matchWorks(A.visible, "kendo droplet").map((w) => w.slug).join() === "18d4ac29" && F.matchWorks(A.visible.filter((w) => w.kind === "magazine-year"), "jidai").length === 9);
  check("Title search: hidden works never match (men0 has the title of men_full)", !F.matchWorks(A.visible, "narazaki").some((w) => ["men0", "men1"].includes(w.slug)) && F.matchWorks(A.visible, "narazaki").some((w) => w.slug === "men_full"));

  // --- the progress words (round 69 answer 8)
  check("Progress words: 'English: 6 of 120 pages translated (5.0 percent)' for left_foot_full", R.progressLine(6, 120) === "English: 6 of 120 pages translated (5.0 percent)", R.progressLine(6, 120));
  check("Progress words: 'English: 5 of 1051 pages translated (0.5 percent)' for kendojidai_2014", R.progressLine(5, 1051) === "English: 5 of 1051 pages translated (0.5 percent)", R.progressLine(5, 1051));
  check("Progress words: 'English: 0 of 176 pages translated (0.0 percent)' for etiqu1_full", R.progressLine(0, 176) === "English: 0 of 176 pages translated (0.0 percent)");
  check("Progress words: 'English: 1 of 1 page translated (100.0 percent)' for a web article", R.progressLine(1, 1) === "English: 1 of 1 page translated (100.0 percent)");
  check("Progress words: the fold form is the full form 'English: 20 of 4,821 pages translated (0.4 percent)' with the thousands separator of the fold line (round 70 answer 9)", R.foldProgress(20, 4821) === "English: 20 of 4,821 pages translated (0.4 percent)", R.foldProgress(20, 4821));
  check("Translated rule (RT73a): a page counts when it has an Agent text or a Human version; a page with only the Original text rows (web-ja) or only a v1 placeholder does not", R.isTranslatedPage({ agent: true }) === true && R.isTranslatedPage({ human: true }) === true && R.isTranslatedPage({ agent: true, human: true }) === true && R.isTranslatedPage({ agent: false, human: false }) === false && R.isTranslatedPage({}) === false && R.isTranslatedPage(undefined) === false && R.isTranslatedPage(null) === false && R.TRANSLATED_WORD === "translated");
  const WEBM = await import("../lib/reader-web.ts");
  check("Web rule (RT73a): a reader_pages record counts as an agent record unless its run_id is empty or 'web-ja'", WEBM.hasAgentRecord({ run_id: "20261026T182512Z-r41" }) === true && WEBM.hasAgentRecord({ runId: "20261026T182512Z-r41" }) === true && WEBM.hasAgentRecord({ run_id: "web-ja" }) === false && WEBM.hasAgentRecord({ run_id: "" }) === false && WEBM.hasAgentRecord(null) === false && WEBM.isWebKey("d7835263/p001/web/U004") === true && WEBM.isWebKey("left_foot_full/p048/ts3/L01-L05") === false);
  const V1 = await import("../lib/reader-v1.ts");
  {
    const md = await fs.readFile("/Volumes/NghiaHDD2T/universal-agent_v2/book-postprocessing/Left foot full/pages/page_051.md", "utf-8").catch(() => null);
    if (md === null) skip("v1 block rule on the real file left_foot_full page_051.md", "the v1 folder is not mounted");
    else {
      const v = V1.parseV1Md(md, "left_foot_full/p051");
      check("v1 block rule (RT73a): page_051.md has 17 blocks, the first is the heading block (JA, EN without asterisks, ZH without asterisks), the key form is <page_id>/v1/<NN>, the last block (1 line) has EN only", v.length === 17 && v[0].key === "left_foot_full/p051/v1/01" && v[0].ja === "剣道は左手・左腰・左足である" && v[0].en === "Kendo is about hidari-te, hidari-koshi, and hidari-ashi." && v[0].zh === "Kendo在于hidari-te、hidari-koshi与hidari-ashi。" && v[16].ja === "" && v[16].zh === "" && v[16].en.startsWith("[Figure/Diagram referenced in original]") && v.filter((x) => x.zh !== "").length === 16, JSON.stringify(v[0]));
    }
    const t4 = V1.parseV1Md("Page 9\n\n---\n\nJA line\nEN line with *marks* and [T/N: a note]\nZH line\np. 948\n\n---\n\nonly one\n\n---\n\na\nb\nc\nd\ne\n\n---\n\nJA two\nEN two\n", "x/p009");
    check("v1 block rule (RT73a): a block of 4 lines joins line 4 to EN, asterisks go, [T/N: ...] notes stay, a block of 1 or 5 lines is EN only, a block of 2 lines is JA and EN, 'Page N' is not a row", t4.length === 4 && t4[0].en === "EN line with marks and [T/N: a note] p. 948" && t4[0].zh === "ZH line" && t4[1].ja === "" && t4[1].en === "only one" && t4[2].ja === "" && t4[2].en === "a b c d e" && t4[3].ja === "JA two" && t4[3].en === "EN two" && t4[3].zh === "" && t4[0].key === "x/p009/v1/01" && t4[3].key === "x/p009/v1/04", JSON.stringify(t4));
    check("v1 file names (RT73a): page 51 is page_051.md, page 794 is page_794.md, page 1000 is page_1000.md", V1.v1FileName(51) === "page_051.md" && V1.v1FileName(794) === "page_794.md" && V1.v1FileName(1000) === "page_1000.md" && V1.v1PageOfFile("page_1000.md") === 1000 && V1.v1PageOfFile("._page_001.md") === 0 && V1.v1PageOfFile("page_1.md") === 0);
  }
  check("Progress words (RC4b): the total line of the folds data (1,135 translated pages: 6 + 5 + 1,124) is 'English: 1,135 of 14,135 pages translated (8.0 percent)' and the first-level folds have the full form", (() => { const t = A.totals; return R.foldProgress(t.translated, t.pages) === "English: 1,135 of 14,135 pages translated (8.0 percent)" && A.folds.every((f) => /^English: [\d,]+ of [\d,]+ pages translated \([\d.]+ percent\)$/.test(R.foldProgress(f.counts.translated, f.counts.pages))); })(), `${A.totals.translated} of ${A.totals.pages}`);
  check("Progress words (RC4b): a fold of one page reads '1 of 1 page translated' (singular) and a fold with 0 pages reads '0 of 0 pages translated (0.0 percent)'", R.foldProgress(1, 1) === "English: 1 of 1 page translated (100.0 percent)" && R.foldProgress(0, 0) === "English: 0 of 0 pages translated (0.0 percent)");
  check("Progress words (RC4b): the word 'finished' is in none of the progress forms", ![R.progressLine(6, 120), R.foldProgress(21, 5067), R.foldProgress(0, 0), R.progressLine(1, 1)].some((x) => /finished/i.test(x)));
}

// Unit RT73b (round 73c answer 4; VISION-viewer 15.26.6): the pure rules of the reader panels. Pure code, no server and no PocketBase.
async function layoutTest() {
  const { installTsResolveHook } = await import("./ts-resolve-hook.mjs");
  installTsResolveHook();
  const H = await import("../lib/htv-settings.ts");
  const Y = await import("../lib/reader-layout.ts");
  const T = await import("../lib/reader-types.ts");
  const eff = (r) => Y.effectiveSettings(r, "page");

  // --- old saved values turn into the new value at read time (15.26.6.9)
  const conv = (r) => ({ shown: eff(r).shown, pair: eff(r).pair });
  check("Old value {text: 'en', en: 'agent'} gives shown.book [image, agent], shown.article [agent], pair false", same(conv({ text: "en", en: "agent" }), { shown: { book: ["image", "agent"], article: ["agent"] }, pair: false }), JSON.stringify(conv({ text: "en", en: "agent" })));
  check("Old value {text: 'en', en: 'human'} gives the same with Human version", same(conv({ text: "en", en: "human" }), { shown: { book: ["image", "human"], article: ["human"] }, pair: false }));
  check("Old value {text: 'ja'} gives Original text only (and Page image on a book)", same(conv({ text: "ja" }), { shown: { book: ["image", "ja"], article: ["ja"] }, pair: false }));
  check("Old value {text: 'pair', en: 'human'} gives Original text and Human version with pair true", same(conv({ text: "pair", en: "human" }), { shown: { book: ["image", "ja", "human"], article: ["ja", "human"] }, pair: true }), JSON.stringify(conv({ text: "pair", en: "human" })));
  check("Old value {image: false} takes Page image out of shown.book (text en and en agent are the defaults)", same(conv({ image: false }), { shown: { book: ["agent"], article: ["agent"] }, pair: false }));
  check("An account with none of the old keys and no 'shown' has no checked list (the first layout runs)", eff({ size: 20 }).shown === undefined && eff({}).shown === undefined);
  check("When 'shown' exists the old keys are ignored (shown wins, pair comes from its own key)", same(conv({ shown: { book: ["image"] }, text: "pair", en: "human" }), { shown: { book: ["image"] }, pair: false }));
  const d = eff({});
  check("Defaults: the order is Page image, Original text, Agent text, Human version, v1 EN placeholder, v1 ZH placeholder, no widths, pair false, terms true", same(d.components, ["image", "ja", "agent", "human", "v1en", "v1zh"]) && same(d.widths, {}) && d.pair === false && d.terms === true);
  check("READER_DEFAULTS (the button 'Reset text settings') holds no layout key and no old key", !["components", "shown", "widths", "pair", "terms", "text", "en", "image"].some((k) => k in H.READER_DEFAULTS), Object.keys(H.READER_DEFAULTS).join(","));

  // --- the sanitizer
  const san = H.sanitizeReader({ components: ["agent", "x", "agent", "enorig"], shown: { book: ["image", "q"], article: [] }, widths: { agent: 9999, ja: 1, human: 333.4, x: 5 }, pair: true, terms: "no" });
  check("Sanitizer: components keep the order, drop repeats and unknown IDs (enorig is accepted) and append the IDs of the default order that are missing", same(san.components, ["agent", "enorig", "image", "ja", "human", "v1en", "v1zh"]), JSON.stringify(san.components));
  check("Sanitizer: shown keeps known IDs per kind (an empty list stays), widths clamp to 280 to 720 and round, pair true stays, terms as text drops", same(san.shown, { book: ["image"], article: [] }) && same(san.widths, { ja: 280, agent: 720, human: 333 }) && san.pair === true && san.terms === undefined, JSON.stringify(san));
  check("Sanitizer: a clear list keeps only layout keys", same(H.sanitizeClear(["shown", "size", "text", "view", "shown", 5]), ["shown", "text"]) && same(H.sanitizeClear("shown"), []));

  // --- which panels a page draws (R1, R2, R3a to R3f) on the five pages of the design
  const has = (o) => ({ image: false, ja: false, agent: false, human: false, v1en: false, v1zh: false, enorig: false, terms: false, ...o });
  const order = d.components;
  const ids = (h, shown, kind, imageOk = true) => Y.resolveLayout(has(h), order, shown, kind, imageOk).ids;
  check("First layout d7835263 p001 (article, Original text and Human version): [ja, human]", same(ids({ ja: true, human: true }, undefined, "article"), ["ja", "human"]));
  check("First layout 18d4ac29 p001 (article, Original text, Agent text, Human version): [ja, agent] and Human version is one click away", same(ids({ ja: true, agent: true, human: true }, undefined, "article"), ["ja", "agent"]));
  check("First layout left_foot_full p050 (book, run, v1 file): [image, agent] (no Original text on a book, no v1 while an Agent text exists)", same(ids({ image: true, ja: true, agent: true, v1en: true, v1zh: true }, undefined, "book"), ["image", "agent"]));
  check("First layout left_foot_full p051 (book, v1 file only): [image, v1en]", same(ids({ image: true, ja: true, v1en: true, v1zh: true }, undefined, "book"), ["image", "v1en"]));
  check("First layout ogawa_lecture_part1 p281 (book, nothing else): [image]", same(ids({ image: true }, undefined, "book"), ["image"]));
  check("R3e: a book page with a JA text and no EN text draws the Original text with the image", same(ids({ image: true, ja: true }, undefined, "book"), ["image", "ja"]));
  check("R3f: a page with no component at all draws no panel", same(ids({}, undefined, "article"), []));
  check("Scroll view and Focus mode (imageOk false): the first layout of a book page has no Page image", same(ids({ image: true, ja: true, agent: true }, undefined, "book", false), ["agent"]));
  check("R1: the checked list wins when one of its components has data (shown.book [agent, image] draws the saved order, Page image first)", same(ids({ image: true, agent: true, human: true }, ["agent", "image"], "book"), ["image", "agent"]));
  const lfIndex = { images: true, agentPages: [46, 47, 48, 49, 50, 75], humanPages: [], v1Pages: [50, 51] };
  const miss = Y.resolveLayout(has({ image: true, ja: true, v1en: true, v1zh: true }), order, ["image", "agent"], "book", true);
  check("D16: shown.book [image, agent] on p051 draws [image] and names the absent component in the note line", same(miss.ids, ["image"]) && same(miss.missing, ["agent"]) && Y.missingNote(miss, Y.workHas(lfIndex)) === "Not on this page: Agent text. On this page, in the Components list: Original text, v1 EN placeholder, v1 ZH placeholder.", Y.missingNote(miss, Y.workHas(lfIndex)));
  check("D16, unit default: the note names only components that the work has on some page (a work with no Agent text on any page gets no 'Not on this page: Agent text.' note)", Y.missingNote(miss, Y.workHas({ ...lfIndex, agentPages: [] })) === "");
  const none = Y.resolveLayout(has({ ja: true, human: false }), order, ["human"], "article", true);
  check("R2 after 'Remove the choice': shown.article [human] with no Human version falls back to the first layout [ja] and shows no note", same(none.ids, ["ja"]) && none.first === true && Y.missingNote(none, Y.workHas({ images: false, agentPages: [], humanPages: [2, 3], v1Pages: [] })) === "");

  // --- Bilingual pairing, move, drag, toggle
  const g = (list, pair) => Y.groupsOf(list, pair).map((x) => (x.pair ? `pair:${x.ids.join("+")}` : x.ids[0]));
  check("Bilingual pairing merges Original text and the first EN panel: [image, ja, agent, human] gives image, pair ja+agent, human", same(g(["image", "ja", "agent", "human"], true), ["image", "pair:ja+agent", "human"]));
  check("Bilingual pairing off, or no Original text, or no EN panel: no merge", same(g(["ja", "agent"], false), ["ja", "agent"]) && same(g(["agent", "human"], true), ["agent", "human"]) && same(g(["image", "ja"], true), ["image", "ja"]));
  check("Bilingual pairing with the EN panel before Original text: the merged panel stands at the first of the two", same(g(["human", "ja", "agent"], true), ["pair:human+ja", "agent"]));
  const grp = (list) => Y.groupsOf(list, false);
  check("Move right swaps with the next drawn panel and the components that the page does not draw keep their places: p050 [image, agent], Page image right gives [agent, ja, image, human, v1en, v1zh]", same(Y.moveGroups(order, grp(["image", "agent"]), 0, 1), ["agent", "ja", "image", "human", "v1en", "v1zh"]), JSON.stringify(Y.moveGroups(order, grp(["image", "agent"]), 0, 1)));
  check("Move left on the second panel gives the same order, and a move out of range changes nothing", same(Y.moveGroups(order, grp(["image", "agent"]), 1, 0), ["agent", "ja", "image", "human", "v1en", "v1zh"]) && Y.moveGroups(order, grp(["image", "agent"]), 0, -1) === order && Y.moveGroups(order, grp(["image", "agent"]), 1, 2) === order);
  check("A drag of the first title bar to the third place: [image, ja, agent] gives ja, agent, image", same(Y.moveGroups(order, grp(["image", "ja", "agent"]), 0, 2), ["ja", "agent", "image", "human", "v1en", "v1zh"]));
  check("The merged panel moves as one block: groups [pair ja+agent, human], Move right gives human, ja, agent", same(Y.moveGroups(order, Y.groupsOf(["ja", "agent", "human"], true), 0, 1), ["image", "human", "ja", "agent", "v1en", "v1zh"]));
  check("Toggle keeps the saved order: [agent] plus image gives [image, agent], minus agent gives [image]", same(Y.toggled(["agent"], "image", order), ["image", "agent"]) && same(Y.toggled(["image", "agent"], "agent", order), ["image"]));

  // --- the component list
  const drawn51 = Y.resolveLayout(has({ image: true, ja: true, v1en: true, v1zh: true }), order, undefined, "book", true);
  const m51 = Y.componentRows(lfIndex, eff({}), has({ image: true, ja: true, v1en: true, v1zh: true }), drawn51, null, true, "book");
  check("List, left_foot_full p051: the rows are Page image, Original text, Agent text, v1 EN placeholder, v1 ZH placeholder (no Human version row), checked: image and v1en, Agent text is grey with 'No agent translation yet'", same(m51.rows.map((x) => x.name), ["Page image", "Original text", "Agent text", "v1 EN placeholder", "v1 ZH placeholder"]) && same(m51.rows.filter((x) => x.checked).map((x) => x.id), ["image", "v1en"]) && m51.rows.find((x) => x.id === "agent").disabled && m51.rows.find((x) => x.id === "agent").note === "No agent translation yet", JSON.stringify(m51.rows.map((x) => [x.id, x.checked, x.disabled])));
  check("List, p051: Bilingual pairing is grey ('Needs Original text and one English text') because Original text is not drawn, Kendo term highlights are grey ('No term marks on this page')", m51.pair.disabled && m51.pair.note === "Needs Original text and one English text" && m51.terms.disabled && m51.terms.note === "No term marks on this page");
  const wIndex = { images: false, agentPages: [], humanPages: [1, 2, 3], v1Pages: [] };
  const drawnW = Y.resolveLayout(has({ ja: true, human: true }), order, undefined, "article", true);
  const mW = Y.componentRows(wIndex, eff({}), has({ ja: true, human: true }), drawnW, "default", true, "article");
  check("List, d7835263 p001: the rows are Original text and Human version only (no Page image, no Agent text, no v1), the note of Human version is 'from kendojidai.com', Bilingual pairing is enabled", same(mW.rows.map((x) => x.name), ["Original text", "Human version"]) && mW.rows[1].note === "from kendojidai.com" && !mW.pair.disabled && same(mW.rows.map((x) => x.checked), [true, true]), JSON.stringify(mW.rows));
  const drawnOne = Y.resolveLayout(has({ ja: true, human: true }), order, ["ja"], "article", true);
  const mOne = Y.componentRows(wIndex, eff({ shown: { article: ["ja"] } }), has({ ja: true, human: true }), drawnOne, "admin", true, "article");
  check("List, one panel left: the checked row of the last panel cannot be unchecked ('Keep at least one panel'), the note of Human version says 'chosen by an admin'", mOne.rows[0].disabled && mOne.rows[0].note === "Keep at least one panel" && !mOne.rows[1].disabled && mOne.rows[1].note === "chosen by an admin");
  const mScroll = Y.componentRows(lfIndex, eff({}), null, { ids: [], missing: [], others: [], first: true }, null, false, "book");
  check("List in Scroll view with the page not loaded: no row is grey except Page image ('Page view only')", mScroll.rows.find((x) => x.id === "image").note === "Page view only" && mScroll.rows.filter((x) => x.id !== "image").every((x) => !x.disabled));

  // --- rows of the components
  const web = (key, ja, text, extra = {}) => ({ key, shortKey: key.split("/").pop(), part: "lines", ja, jaMarks: [], agent: { text: "", marks: [], agreedByTranslator: false }, human: { text, marks: [], kind: "own", facts: extra.facts ?? [] }, web: true, site: extra.site === true });
  const page = { pageId: "x/p001", n: 1, name: "Page 1", hasText: true, rows: [web("x/p001/web/U1", "日本語1", "English 1"), web("x/p001/web/U2", "日本語2", ""), web("x/p001/web/U3", "関連", "", { site: true }), web("x/p001/web/U4", "", "English only"), web("x/p001/web/U5", "日本語5", "Site English", { site: true })], terms: {}, extras: [], hasHuman: true, hasAgent: false, humanBy: "default", v1: [], label: { agent: "", human: "", v1: "" }, checked: false };
  const rows = Y.pageRows(page);
  check("Rows: Original text has the rows with a JA text (U1, U2, U3, U5), Human version has U1 and U4 and the site row with English U5, a JA-only sentence that is not site text (U2) is a 'dropped' line, a JA-only site row (U3) makes no line", same(rows.ja.map((r) => r.key.slice(-2)), ["U1", "U2", "U3", "U5"]) && same(rows.human.map((r) => r.key.slice(-2)), ["U1", "U2", "U4", "U5"]) && rows.human.find((r) => r.key.endsWith("U2")).dropped === true && rows.human.filter((r) => r.dropped).length === 1 && rows.agent.length === 0, JSON.stringify(rows.human.map((r) => [r.key.slice(-2), r.dropped])));
  const withV1 = { ...page, rows: [], hasText: false, hasHuman: false, v1: [{ key: "x/p001/v1/01", ja: "日", en: "en", zh: "中" }, { key: "x/p001/v1/02", ja: "", en: "only en", zh: "" }] };
  const rv = Y.pageRows(withV1);
  check("Rows, v1: Original text takes the v1 JA lines (flag jaFromV1 true), v1 EN has 2 rows, v1 ZH has 1 row, all with the same keys", rv.jaFromV1 && same(rv.ja.map((r) => r.key), ["x/p001/v1/01"]) && rv.v1en.length === 2 && same(rv.v1zh.map((r) => r.key), ["x/p001/v1/01"]));
  check("Fact lines (15.26.8): changed 'Japanese says: その上がった手元に小手を打たれる', dropped 'Japanese says: 右足. The English leaves this out.', a JA sentence keeps its own full stop", Y.factLine({ kind: "changed", ja: "その上がった手元に小手を打たれる" }) === "Japanese says: その上がった手元に小手を打たれる" && Y.factLine({ kind: "dropped", ja: "右足" }) === "Japanese says: 右足. The English leaves this out." && Y.factLine({ kind: "dropped", ja: "また、攻防の際、間合取りにも注意しています。" }) === "Japanese says: また、攻防の際、間合取りにも注意しています。 The English leaves this out.");
  check("Words of the screen: the reasons and names follow VISION-viewer 15.26.6.2", T.NO_PAGE_TEXT === "No text for this page yet." && Y.COMPONENT_NAMES.v1en === "v1 EN placeholder" && T.KEEP_ONE === "Keep at least one panel" && T.PAGE_VIEW_ONLY === "Page view only");
}


// ---------------------------------------------------------------- Monitor dashboard (unit VW77a, round 80)

const T2DATA = opt("--t2");

// Rules of the Monitor dashboard without a server: lib/book-status-rules.ts and the PST helpers. VISION-viewer 15.24.4.1 to 15.24.4.7.
async function monitorRulesTest() {
  const { installTsResolveHook } = await import("./ts-resolve-hook.mjs");
  installTsResolveHook();
  const R = await import("../lib/book-status-rules.ts");
  const F = await import("../lib/format.ts");
  const M = await import("../lib/pst-more.ts");
  const { spawnSync } = await import("node:child_process");
  const NOW = Date.UTC(2026, 10, 2, 8, 0, 0) / 1000; // 2026-11-02 00:00 PST
  const iso = (off) => new Date((NOW + off) * 1000).toISOString().replace(/\.\d+Z$/, "Z");
  const facts = (over = {}) => ({ slug: "mental_full", title: "Making the Difference on the Day", bookPages: 169, status: null, statusUnreadable: false, statusFile: "book-store/mental_full/status.json", pauseExists: false, mark: null, markUnreadable: false, pidAlive: true, runNumber: null, derived: null, phase2Ready: true, refusal: null, ...over });
  const st = (over = {}) => ({ book: "mental_full", phase: "agent-phase-4", state: "running", stop_reason: null, stop_text: null, pid: 4821, heartbeat_utc: iso(-30), running_page: "mental_full/p051", running_boxes: ["TL_2"], last_accepted_page: "mental_full/p050", next_page: "mental_full/p052", pages_done: 50, pages_total: 169, cost_usd_models_phase: 8.3, seconds_phase: 9540, started_utc: iso(-54 * 60), run_id: "2026-11-04T00:15:00-08:00", updated_utc: iso(-30), last_error: null, ...over });
  const row = (over, now = NOW) => R.buildRow(facts(over), now);
  const text = (r, now = NOW) => R.lineText(r.line2, now);
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // --- PST helpers (round 80 answer 19): UTC minus 8 hours all year
  check("PST: 2026-07-10T16:00:00Z shows 08:00 PST (July, the wall clock in Pacific summer time reads 09:00)", F.pstClock(F.parseUtcIso("2026-07-10T16:00:00Z")) === "08:00 PST", F.pstClock(F.parseUtcIso("2026-07-10T16:00:00Z")));
  check("PST: 2026-01-15T16:00:00Z shows 08:00 PST (January, the same offset)", F.pstClock(F.parseUtcIso("2026-01-15T16:00:00Z")) === "08:00 PST");
  check("PST: stamp 'Oct 29 21:12 PST', date text '2026-11-04 00:15 PST', seconds '22:06:12 PST'", F.pstStamp(F.parseUtcIso("2026-10-30T05:12:00Z")) === "Oct 29 21:12 PST" && F.pstDateTime(F.parseUtcIso("2026-11-04T08:15:00Z")) === "2026-11-04 00:15 PST" && F.pstClockSeconds(F.parseUtcIso("2026-10-30T06:06:12Z")) === "22:06:12 PST");
  check("PST: the day changes at 08:00 UTC (2026-11-02T07:59:00Z is Nov 1 23:59 PST, 08:00Z is Nov 2 00:00 PST)", F.pstStamp(F.parseUtcIso("2026-11-02T07:59:00Z")) === "Nov 1 23:59 PST" && F.pstStamp(F.parseUtcIso("2026-11-02T08:00:00Z")) === "Nov 2 00:00 PST");
  check("PST: the run ID 2026-11-04T00:15:00-08:00 reads '2026-11-04 00:15 PST'; another offset gives null", F.runIdText("2026-11-04T00:15:00-08:00") === "2026-11-04 00:15 PST" && F.runIdText("2026-07-10T09:00:00-07:00") === null && F.runIdText(null) === null);
  check("PST: parseUtcIso refuses a bad stamp (month 13, 30 February, a stamp with an offset, a number)", ["2026-13-01T00:00:00Z", "2026-02-30T00:00:00Z", "2026-07-10T16:00:00+00:00", 5, null].every((x) => F.parseUtcIso(x) === null) && F.parseUtcIso("2026-07-10T16:00:00Z") === 1783699200);
  check("Relative time: 59 s just now, 60 s 1 min ago, 59 min 59 min ago, 60 min 1 h ago, 47 h 59 min 47 h ago, 48 h 2 days ago", [59, 60, 3599, 3600, 48 * 3600 - 1, 48 * 3600].map((x) => F.relativeTime(NOW - x, NOW)).join("|") === "just now|1 min ago|59 min ago|1 h ago|47 h ago|2 days ago", [59, 60, 3599, 3600, 48 * 3600 - 1, 48 * 3600].map((x) => F.relativeTime(NOW - x, NOW)).join("|"));
  check("PST on the Lists tab and the run view (round 81 answer 17): the stamp 2026-10-29T07:50:00Z shows '2026-10-28 23:50 PST', and 0 or null gives '–' like the old helper", M.pstFromUtcText("2026-10-29T07:50:00Z") === "2026-10-28 23:50 PST" && M.pstDateTimeOrDash(1793260200) === "2026-10-28 23:50 PST" && M.pstDateTimeOrDash(0) === "–" && M.pstDateTimeOrDash(null) === "–" && M.pstClockOrDash(1793260200) === "23:50 PST" && M.pstClockOrDash(null) === "–", M.pstDateTimeOrDash(1793260200));
  check("PST text of a compare file: a text that is not a UTC stamp stays as it is, an empty text stays empty", M.pstFromUtcText("yesterday") === "yesterday" && M.pstFromUtcText("") === "");
  check("PST date of a PocketBase time (round 81 answer 18, page check on the Reader book screen): '2026-10-28 03:00:00.123Z' is '2026-10-27', '2026-10-28 08:00:00.000Z' is '2026-10-28', a bad text gives ''", M.pstDateOfPb("2026-10-28 03:00:00.123Z") === "2026-10-27" && M.pstDateOfPb("2026-10-28 08:00:00.000Z") === "2026-10-28" && M.pstDateOfPb("2026-10-28 07:59:59.999Z") === "2026-10-27" && M.pstDateOfPb("2026-01-01T00:00:00Z") === "2025-12-31" && M.pstDateOfPb("nope") === "" && M.pstDateOfPb(undefined) === "");
  check("utcIso gives the form of store.py utc_iso: no milliseconds, 'Z' at the end", M.utcIso(Date.UTC(2026, 10, 5, 9, 30, 0, 999)) === "2026-11-05T09:30:00Z");
  // ---- PST on /translate and /admin (unit TF83, round 82 answer 14 "PST in a later unit", round 84 answer 6): lib/htv-pst.ts
  const H = await import("../lib/htv-pst.ts");
  check("PST /translate and /admin: a PocketBase time '2026-10-27 18:04:12.345Z' gives '2026-10-27 10:04 PST' (old utcTime: '2026-10-27 18:04 UTC')", H.pstTime("2026-10-27 18:04:12.345Z") === "2026-10-27 10:04 PST", H.pstTime("2026-10-27 18:04:12.345Z"));
  check("PST /translate and /admin: the day changes with the zone: '2026-10-28 03:00:00.000Z' gives '2026-10-27 19:00 PST', and '2026-10-28 08:00:00Z' gives '2026-10-28 00:00 PST'", H.pstTime("2026-10-28 03:00:00.000Z") === "2026-10-27 19:00 PST" && H.pstTime("2026-10-28 08:00:00Z") === "2026-10-28 00:00 PST");
  check("PST /translate and /admin: PST all year (UTC-8), also in summer: '2026-07-10 16:00:00.000Z' gives '2026-07-10 08:00 PST'", H.pstTime("2026-07-10 16:00:00.000Z") === "2026-07-10 08:00 PST");
  check("PST /translate and /admin: the UTC stamp of a run '2026-10-27T18:04:12Z' gives '2026-10-27 10:04 PST', a stamp with an offset '2026-10-27T10:04:12-08:00' gives the same time", H.pstTime("2026-10-27T18:04:12Z") === "2026-10-27 10:04 PST" && H.pstTime("2026-10-27T10:04:12-08:00") === "2026-10-27 10:04 PST");
  check("PST /translate and /admin: a text that is no time gives '' (like the removed utcTime), so 'at this moment' still shows; pstTimeOrText keeps the text", H.pstTime("") === "" && H.pstTime("yesterday") === "" && H.pstTime(undefined) === "" && H.pstTimeOrText("yesterday") === "yesterday" && H.pstTimeOrText("") === "" && H.pstTimeOrText("2026-10-27T18:04:12Z") === "2026-10-27 10:04 PST");
  check("PST /admin/readers: the day of 'signed up' keeps the date form and gets the zone word: '2026-10-27 18:04:12.000Z' gives '2026-10-27 PST', '2026-10-28 03:00:00.000Z' gives '2026-10-27 PST' (old: slice(0, 10) gave 2026-10-28)", H.pstDay("2026-10-27 18:04:12.000Z") === "2026-10-27 PST" && H.pstDay("2026-10-28 03:00:00.000Z") === "2026-10-27 PST" && H.pstDay("") === "" && H.pstDay("x") === "");
  const HF = await import("../lib/htv-format.ts");
  check("PST /translate and /admin: lib/htv-format.ts has no export utcTime (unit TF84, round 85 answer 20; old: utcTime stayed and read '2026-10-27 18:04 UTC') and still exports parsePageNumber ('p048' of 169 gives 48)", !("utcTime" in HF) && typeof HF.parsePageNumber === "function" && HF.parsePageNumber("p048", 169) === 48, Object.keys(HF).join(","));
  check("Old local-time helpers stay for the other screens (dateTime and clock still exist)", typeof F.dateTime === "function" && typeof F.clock === "function" && F.dateTime(1793156218).length === 16);

  // --- same label as label_of of store.py for the same input
  const T2 = path.resolve(T2DATA ?? "");
  const cases = [
    ["no status", null, false, true, 0], ["state not-started", st({ state: "not-started" }), false, true, 0],
    ["running, heartbeat 30 s", st(), false, true, 30], ["running, heartbeat 119 s", st(), false, true, 119], ["running, heartbeat 120 s", st(), false, true, 120], ["running, heartbeat 121 s", st(), false, true, 121],
    ["running, pid gone", st(), false, false, 30], ["running, PAUSE", st(), true, true, 30], ["running, PAUSE, stale", st(), true, true, 500], ["running, PAUSE, pid gone", st(), true, false, 30],
    ["running, no heartbeat", st({ heartbeat_utc: null }), false, true, 0], ["running, bad heartbeat text", st({ heartbeat_utc: "yesterday" }), false, true, 0], ["running, pid null", st({ pid: null }), false, false, 30],
    ["stopped ctrl-c", st({ state: "stopped", stop_reason: "ctrl-c" }), false, false, 0], ["stopped pause", st({ state: "stopped", stop_reason: "pause" }), false, false, 0], ["stopped restart", st({ state: "stopped", stop_reason: "restart" }), false, false, 0],
    ["stopped target-reached", st({ state: "stopped", stop_reason: "target-reached" }), false, false, 0], ["stopped no reason", st({ state: "stopped", stop_reason: null }), false, false, 0],
    ["stopped forward-failure", st({ state: "stopped", stop_reason: "forward-failure" }), false, false, 0], ["stopped cost-guard", st({ state: "stopped", stop_reason: "cost-guard" }), false, false, 0], ["stopped rule", st({ state: "stopped", stop_reason: "rule" }), false, false, 0],
    ["stopped rule, PAUSE", st({ state: "stopped", stop_reason: "rule" }), true, false, 0], ["completed", st({ state: "completed" }), false, false, 0], ["old state paused", st({ state: "paused" }), false, true, 30], ["unknown state", st({ state: "weird" }), false, true, 30],
  ];
  const py = `import json,sys,time
sys.dont_write_bytecode=True
from translator import store as BS
out=[]
for c in json.load(sys.stdin):
    lab,grp=BS.label_of(c["status"],c["pause"],now=c["now"],alive=lambda pid,a=c["alive"]:a)
    out.append([lab,grp])
print(json.dumps(out))`;
  const input = cases.map(([, status, pause, alive, hb]) => ({ status: status ? { ...status, heartbeat_utc: status.heartbeat_utc && hb !== undefined ? iso(-hb) : status.heartbeat_utc } : null, pause, alive, now: NOW }));
  const res = spawnSync("python3", ["-B", "-c", py], { input: JSON.stringify(input), encoding: "utf-8", env: { ...process.env, PYTHONPATH: path.join(T2, "scripts"), PYTHONDONTWRITEBYTECODE: "1" } });
  let pyOut = null;
  try {
    pyOut = JSON.parse(res.stdout);
  } catch {
    pyOut = null;
  }
  check("label_of of store.py ran on the examples (python3 -B, read only)", Array.isArray(pyOut) && pyOut.length === cases.length, (res.stderr || "").slice(0, 200));
  const bad = [];
  cases.forEach(([name], i) => {
    const key = R.baseLabelOf(input[i].status, input[i].pause, input[i].alive, NOW);
    const mine = [R.LABELS[key].text, R.LABELS[key].group];
    if (!pyOut || !eq(mine, pyOut[i])) bad.push(`${name}: ${mine} vs ${pyOut?.[i]}`);
  });
  check(`Same label and group as label_of for ${cases.length} examples (heartbeat edges 119, 120, 121 s, pid gone, PAUSE, every stop reason, completed, old state paused)`, bad.length === 0, bad.join(" | "));

  // --- rows of the table 15.24.4.2 with a status.json
  let r = row({ status: st() });
  check("Running: heartbeat 30 s, pid alive gives label Running, group Running, symbol ●, line 2 with the page, the box, the start, and the last sign of life", r.label === "Running" && r.group === "Running" && r.symbol === "●" && text(r) === "Now: p051, box TL_2. Running since Nov 1 23:06 PST (54 min). Last sign of life 30 s ago. Next page: p052.", text(r));
  check("Running row: phase 'Phase 4 · production run', '50 of 169 pages', $8.30, 159 min, no run number without a prompt file ('phase 4, started 2026-11-04 00:15 PST')", r.phase === "Phase 4 · production run" && R.progressText(r) === "50 of 169 pages" && R.money(r.cost) === "$8.30" && r.minutes === 159 && r.run === "phase 4, started 2026-11-04 00:15 PST", `${r.run}`);
  r = row({ status: st(), runNumber: 1 });
  check("Run text (round 80 answers 11 and 16): 'phase 4 run 1, started 2026-11-04 00:15 PST'", r.run === "phase 4 run 1, started 2026-11-04 00:15 PST", r.run);
  check("Run number from the labels: v4.2.3 gives run 2, a label of another phase gives null, a bad label gives null, the first fitting label wins", R.runNumberOf(["v4.2.3"], "agent-phase-4") === 2 && R.runNumberOf(["v3.1.0"], "agent-phase-4") === null && R.runNumberOf(["x"], "agent-phase-4") === null && R.runNumberOf(["v3.1.0", "v4.5.0"], "agent-phase-4") === 5 && R.runNumberOf([], "agent-phase-4") === null && R.parseLabel("v4.2.3")?.updates === 3);
  r = row({ status: st({ heartbeat_utc: iso(-120) }) });
  check("Edge 120 s: a heartbeat 120 s old is still Running", r.key === "running");
  r = row({ status: st({ heartbeat_utc: iso(-121) }) });
  check("Edge 121 s: a heartbeat 121 s old gives Stopped unexpectedly, group Needs attention, 'No update for 2 min: the process is gone' is not used because the pid lives: 'the process is silent'", r.key === "unexpected" && r.group === "Needs attention" && text(r) === "No update for 2 min: the process is silent. Last page done: p050.", text(r));
  r = row({ status: st({ pid: 99999999, heartbeat_utc: iso(-12 * 60), last_accepted_page: "mental_full/p711" }), pidAlive: false });
  check("Stopped unexpectedly (dead pid): 'No update for 12 min: the process is gone. Last page done: p711.'", r.key === "unexpected" && r.symbol === "▲" && text(r) === "No update for 12 min: the process is gone. Last page done: p711.", text(r));
  r = row({ status: st(), pauseExists: true });
  check("Running with pause requested (file PAUSE): label 'Running with pause requested' (store.py wording), group Running", r.label === "Running with pause requested" && r.group === "Running" && /^Pause requested\. The process finishes the current page, then ends\. Now: p051/.test(text(r)), r.label);
  const pst = (extra = {}) => st({ state: "stopped", pid: null, heartbeat_utc: iso(-3600), updated_utc: "2026-07-10T16:40:00Z", last_accepted_page: "mental_full/p080", next_page: "mental_full/p081", ...extra });
  r = row({ status: pst({ stop_reason: "pause" }), pidAlive: false });
  check("Stopped by Pause (round 76 answer 4): 'Stopped by Pause at 08:40 PST. Last saved page p080. Resume starts at p081.' (the time is the PST form of updated_utc)", r.label === "Stopped" && r.group === "Stopped" && r.symbol === "■" && text(r) === "Stopped by Pause at 08:40 PST. Last saved page p080. Resume starts at p081.", text(r));
  r = row({ status: pst({ stop_reason: "ctrl-c", next_page: "mental_full/p080", last_accepted_page: "mental_full/p079" }), pidAlive: false });
  check("Stopped by Ctrl-C: 'Stopped by Ctrl-C at 08:40 PST. Page p080 was not saved. Resume starts at p080.'", r.label === "Stopped" && text(r) === "Stopped by Ctrl-C at 08:40 PST. Page p080 was not saved. Resume starts at p080.", text(r));
  r = row({ status: pst({ stop_reason: "forward-failure", stop_text: "stopped: QA_3 FAIL on mental_full/p014", last_error: { page: "mental_full/p014", box: "TL_3", text: "TL_3: invalid JSON: Expecting ',' delimiter", file: "data/pilot-run/x/failed/TL_3.json", utc: iso(-100) } }), pidAlive: false });
  check("Stopped by failure (forward-failure): group Needs attention, the stop text, the red error line 'Error on p014, box TL_3: invalid JSON: Expecting ',' delimiter', error count 1, the file path without 'data/'", r.label === "Stopped by failure" && r.group === "Needs attention" && /QA_3 FAIL on mental_full\/p014\./.test(text(r)) && r.error === "Error on p014, box TL_3: invalid JSON: Expecting ',' delimiter" && r.errorCount === 1 && r.errorFile === "pilot-run/x/failed/TL_3.json", `${text(r)} | ${r.error}`);
  check("Stopped by failure for cost-guard and rule (the three failure reasons), Stopped for restart and for a stop with no reason", ["cost-guard", "rule"].every((x) => row({ status: pst({ stop_reason: x }), pidAlive: false }).key === "failure") && row({ status: pst({ stop_reason: "restart" }), pidAlive: false }).key === "stopped" && row({ status: pst({ stop_reason: null }), pidAlive: false }).key === "stopped");
  r = row({ status: st({ state: "completed", stop_reason: "target-reached", pid: null, pages_done: 20, pages_total: 20, updated_utc: iso(-3 * 3600) }), pidAlive: false });
  check("Completed: group Completed, symbol ✓, 'Completed at Nov 1 21:00 PST, 3 h ago. 20 of 20 pages done.'", r.label === "Completed" && r.group === "Completed" && r.symbol === "✓" && text(r) === "Completed at Nov 1 21:00 PST, 3 h ago. 20 of 20 pages done.", text(r));
  check("Not started: no status gives group Not started, symbol ○, no column; state not-started in the file gives the same", row({}).key === "not-started" && row({}).group === "Not started" && row({}).symbol === "○" && row({ status: st({ state: "not-started" }) }).group === "Not started");
  r = row({ status: null, statusUnreadable: true });
  check("Broken status.json: label 'Status file unreadable' with the file path (no Mac path), group Needs attention, the other rows stay", r.label === "Status file unreadable" && r.group === "Needs attention" && r.statusFile === "book-store/mental_full/status.json" && !/\/Users\//.test(text(r)) && text(r).includes("book-store/mental_full/status.json"), text(r));
  check("Status wins over a list: a status.json of state not-started with a derived row gives Not started (pilot lists do not count)", row({ status: st({ state: "not-started" }), derived: { listCount: 1, pagesDone: 3, costUsd: 1, seconds: 1, lastEventEpoch: NOW, newest: { stamp: "x", state: "completed", final: true, updatedEpoch: NOW, startedEpoch: NOW, pauseFile: false, chainState: null, runningPage: null, runningBoxes: [], anyRunning: false, anyWaiting: false, stopPage: null, nextPage: null, errors: [], forwardFailure: null } } }).key === "not-started");

  // --- marks
  const mark = (over) => ({ schema: "book-request-v1", book: "mental_full", action: "resume", phase: "agent-phase-4", requested_by: "Monitor dashboard", requested_utc: "2026-07-10T16:40:00Z", ...over });
  r = row({ status: st(), mark: mark({ action: "restart", prompts: {} }) });
  check("Running row with a Restart mark stays Running with the note 'Restart requested 08:40 PST' (round 78 answer 10, round 80 answer 19)", r.key === "running" && r.group === "Running" && r.note === "Restart requested 08:40 PST", `${r.group} ${r.note}`);
  r = row({ status: pst({ stop_reason: "forward-failure" }), pidAlive: false, mark: mark({ action: "resume" }) });
  check("Resume mark on a book that does not run: group Waiting for a run, label 'Mark waiting', line 'Mark waiting: Resume requested 08:40 PST', the label of label_of stays in baseLabel ('Stopped by failure')", r.group === "Waiting for a run" && r.label === "Mark waiting" && text(r) === "Mark waiting: Resume requested 08:40 PST" && r.baseLabel === "Stopped by failure");
  r = row({ mark: mark({ action: "run", phase: "agent-phase-3" }) });
  check("Run mark on a book with no run: 'Mark waiting: Run requested 08:40 PST', phase from the mark ('Phase 3 · warm initialization')", r.group === "Waiting for a run" && text(r) === "Mark waiting: Run requested 08:40 PST" && r.phase === "Phase 3 · warm initialization", text(r));
  r = row({ status: pst({ stop_reason: "pause" }), pidAlive: false, mark: mark({ action: "restart", prompts: {} }) });
  check("Restart mark on a stopped book: 'Mark waiting: Restart requested 08:40 PST'", r.group === "Waiting for a run" && text(r) === "Mark waiting: Restart requested 08:40 PST");
  r = row({ mark: mark({ action: "run", after: "restart", restart_requested_utc: "2026-07-10T16:40:00Z", requested_utc: "2026-07-10T16:52:00Z" }) });
  check("Run mark with after 'restart' (code of TR77c today): the press time restart_requested_utc shows (16:40Z = 08:40 PST), not the mark time 16:52Z", r.group === "Waiting for a run" && text(r) === "Mark waiting: Restart requested 08:40 PST", text(r));
  r = row({ mark: mark({ action: "run", after: "restart", requested_utc: "2026-07-10T16:40:00Z" }) });
  check("Run mark with after 'restart' after the code change of round 80 answer 14 (no restart_requested_utc, the press time sits in requested_utc): the same text", text(r) === "Mark waiting: Restart requested 08:40 PST", text(r));
  r = row({ status: st(), mark: mark({ action: "run", after: "restart", restart_requested_utc: iso(-600), requested_utc: iso(-60) }) });
  check("Run mark on a Running row: the row stays Running with a note (unit default VW77a)", r.group === "Running" && /^Restart requested/.test(r.note ?? ""));
  r = row({ mark: mark({ action: "frobnicate" }) });
  check("A mark with an unknown action changes no group and shows a warning", r.group === "Not started" && /does not know/.test(r.warning ?? ""));
  r = row({ markUnreadable: true });
  check("A broken request.json shows a warning and changes no group", r.group === "Not started" && /cannot be read/.test(r.warning ?? ""));

  // --- derived rows from the three real pilot lists (read only)
  const lists = [];
  for (const stamp of (await fs.readdir(path.join(T2, "pilot-run/lists"))).sort()) {
    const j = async (n) => JSON.parse(await fs.readFile(path.join(T2, "pilot-run/lists", stamp, n), "utf-8"));
    lists.push({ stamp, progress: await j("progress.json"), list: await j("list.json"), summary: await j("list-summary.json"), pauseExists: false });
  }
  const slugs = JSON.parse(await fs.readFile(path.join(T2, "pilot-sample/book-slugs.json"), "utf-8")).books;
  const pagesOf = (slug) => slugs.find((b) => b.slug === slug)?.pages ?? null;
  const dnow = Date.UTC(2026, 9, 30, 5, 0, 0) / 1000; // 2026-10-29 21:00 PST, 21 h after the end of the newest list (23:50 PST on Oct 28)
  const drow = (slug, ls = lists, now = dnow) => R.buildRow(facts({ slug, title: slug, bookPages: pagesOf(slug), derived: R.deriveFacts(slug, ls) }), now);
  const lf = drow("left_foot_full");
  check("Derived row left_foot_full (pilot list): Stopped, '6 of 120 pages', $22.16, 414 min, an empty phase cell (round 81 answer 22), flag pilot", lf.key === "stopped" && R.progressText(lf) === "6 of 120 pages" && R.money(lf.cost) === "$22.16" && lf.minutes === 414 && lf.phase === null && lf.pilot === true, `${R.progressText(lf)} ${lf.cost} ${lf.minutes}`);
  check("Derived row left_foot_full line 2: 'Stopped at p050: the list finished. Oct 28 23:50 PST, 21 h ago. 3 list folders. Next page: not stored.'", text(lf, dnow) === "Stopped at p050: the list finished. Oct 28 23:50 PST, 21 h ago. 3 list folders. Next page: not stored.", text(lf, dnow));
  const mf = drow("mental_full");
  check("Derived row mental_full: Stopped by failure in Needs attention, '2 of 169 pages', $5.48, 102 min, 'Stopped at p014: QA_3 FAIL (old rule). Oct 27 18:56 PST, 2 days ago. 2 list folders. Next page: p015.'", mf.key === "failure" && mf.group === "Needs attention" && R.progressText(mf) === "2 of 169 pages" && R.money(mf.cost) === "$5.48" && mf.minutes === 102 && text(mf, dnow) === "Stopped at p014: QA_3 FAIL (old rule). Oct 27 18:56 PST, 2 days ago. 2 list folders. Next page: p015.", text(mf, dnow));
  const og = drow("ogawa_lecture_part2");
  check("Derived row ogawa_lecture_part2: Stopped (a critic error is no failure), '1 of 150 pages', $3.73, 76 min, 'Stopped at p089: the list ended with 1 error. Oct 26 11:25 PST, 3 days ago.' and the red error line with the file", og.key === "stopped" && og.group === "Stopped" && R.progressText(og) === "1 of 150 pages" && R.money(og.cost) === "$3.73" && og.minutes === 76 && text(og, dnow) === "Stopped at p089: the list ended with 1 error. Oct 26 11:25 PST, 3 days ago." && og.error === "Error on p089, box box-critic.TS_3: invalid JSON: Expecting ',' delimiter: line 1 column 913 (char 912)" && og.errorFile === "pilot-run/ogawa_lecture_part2_p089/20261026T185029Z-r41/failed/box-critic.TS_3.json" && og.errorCount === 1, `${text(og, dnow)} | ${og.error}`);
  const kj = drow("kendojidai_2014");
  check("Derived row kendojidai_2014: '6 of 1051 pages', $15.77, 269 min, 'Stopped at p0798: the list finished. Oct 27 20:46 PST, 2 days ago. 2 list folders. Next page: not stored.'", R.progressText(kj) === "6 of 1051 pages" && R.money(kj.cost) === "$15.77" && kj.minutes === 269 && text(kj, dnow) === "Stopped at p0798: the list finished. Oct 27 20:46 PST, 2 days ago. 2 list folders. Next page: not stored.", text(kj, dnow));
  check("A book that no list holds has no derived facts (Not started)", R.deriveFacts("zzz_none", lists) === null && R.buildRow(facts({ slug: "zzz_none", derived: null }), dnow).group === "Not started");
  const totalCost = slugs.map((b) => b.slug).concat(["18d4ac29"]).reduce((sum, sl) => sum + (drow(sl).cost ?? 0), 0);
  check("Cost of all derived rows is $73.95 (the sum over the three list folders, VISION sketch 1)", R.money(totalCost) === "$73.95", R.money(totalCost));

  // --- derived rows of a list that runs: synthetic list folders
  const mk = (over = {}, pageOver = {}, chain = "running", pause = false) => [{ stamp: "20261102T000000Z", pauseExists: pause, list: { chains: [{ book: "bk", state: chain }] }, summary: null, progress: { state: "running", started_epoch: NOW - 3600, updated_epoch: NOW - 30, pages: [{ page_id: "bk/p001", state: "done", models_usd: 1, started_epoch: NOW - 3000, ended_epoch: NOW - 2000, folder: "data/pilot-run/bk_p001/x" }, { page_id: "bk/p002", state: "running", running: ["TL_2"], models_usd: 0, started_epoch: NOW - 1000, ended_epoch: null, ...pageOver }, { page_id: "bk/p003", state: "waiting", models_usd: 0 }], ...over } }];
  const dr = (ls, now = NOW) => R.buildRow(facts({ slug: "bk", title: "bk", bookPages: 10, derived: R.deriveFacts("bk", ls) }), now);
  let d = dr(mk());
  check("Derived Running: list running, chain running, updated 30 s ago: label Running, 'Now: p002, box TL_2. Running since Nov 1 23:00 PST (60 min). Last sign of life 30 s ago. Next page: p003.'", d.key === "running" && text(d) === "Now: p002, box TL_2. Running since Nov 1 23:00 PST (60 min). Last sign of life 30 s ago. Next page: p003." && d.warning === null, text(d));
  d = dr(mk({}, {}, "running", true));
  check("Derived Running with pause requested: the file PAUSE in the list folder", d.key === "running-pause" && d.group === "Running");
  d = dr(mk({ state: "paused" }));
  check("Derived list in the state paused shows as 'Running with pause requested' in the group Running (round 77 answer 9, default E)", d.key === "running-pause" && d.group === "Running");
  const ageRow = (age) => dr(mk({ updated_epoch: NOW - age }));
  check("Heartbeat warning of a derived Running row: 599 s none, 600 s 'No update for 10 min. A long call can take 25 min.', 1799 s '29 min', 1800 s still Running with the warning", ageRow(599).warning === null && ageRow(600).warning === "No update for 10 min. A long call can take 25 min." && ageRow(1799).warning === "No update for 29 min. A long call can take 25 min." && ageRow(1800).key === "running" && ageRow(1800).warning === "No update for 30 min. A long call can take 25 min.", `${ageRow(600).warning}`);
  d = ageRow(1801);
  check("Edge 1801 s: a derived list that 'runs' with no update for 1801 s gives Stopped unexpectedly, 'No update for 30 min: the process is gone. Last page done: p001.', no warning", d.key === "unexpected" && d.group === "Needs attention" && text(d) === "No update for 30 min: the process is gone. Last page done: p001." && d.warning === null, text(d));
  check("A status row never shows the 600 s warning (its limit is 120 s)", row({ status: st({ heartbeat_utc: iso(-700) }) }).warning === null);
  d = dr(mk({ state: "completed with failures" }, {}, "stopped: QA_3 FAIL on bk/p002"));
  check("Derived chain 'stopped: QA_3 FAIL on bk/p002' gives Stopped by failure and the page of the text", d.key === "failure" && /^Stopped at p002: QA_3 FAIL \(old rule\)\./.test(text(d)), text(d));
  d = dr(mk({ state: "interrupted" }, { state: "waiting", started_epoch: null }, "stopped: interrupted"));
  check("Derived chain 'stopped: interrupted' (Ctrl-C) gives Stopped, not a failure, 'the list was interrupted'", d.key === "stopped" && /the list was interrupted/.test(text(d)), text(d));
  d = dr(mk({ state: "completed with failures" }, { state: "failed", ended_epoch: NOW - 500 }, "completed"));
  const withFwd = mk({ state: "completed with failures" }, { state: "failed", ended_epoch: NOW - 500 }, "completed");
  withFwd[0].summary = { pages: [{ page_id: "bk/p002", folder: "data/pilot-run/bk_p002/x", failures: ["TL_3: HTTP 500"], forward_failures: ["TL_3: HTTP 500"], critic_failures: [] }] };
  d = dr(withFwd);
  check("Derived page with a forward failure and no chain state: Stopped by failure [unit default VW77a], error line 'Error on p002, box TL_3: HTTP 500'", d.key === "failure" && d.error === "Error on p002, box TL_3: HTTP 500", `${d.key} ${d.error}`);

  // --- groups, summary line, tab title
  const mkRow = (key, over = {}) => ({ ...R.buildRow(facts({ slug: over.slug ?? key }), NOW), key, group: R.LABELS[key].group, label: R.LABELS[key].text, ...over });
  const rows = [mkRow("failure", { slug: "a", cost: 5.48, errorCount: 0 }), ...Array.from({ length: 11 }, (_, i) => mkRow("stopped", { slug: "s" + i, cost: 1 })), ...Array.from({ length: 25 }, (_, i) => mkRow("not-started", { slug: "n" + String(i).padStart(2, "0") }))];
  const sum = R.summarize(rows);
  check("Summary line: '1 needs attention · 0 waiting for a run · 0 running · 11 stopped · 0 completed · 25 not started' (VISION sketch 1) and the cost line", sum.text === "1 needs attention · 0 waiting for a run · 0 running · 11 stopped · 0 completed · 25 not started" && sum.costText === "Model cost of all books: $16.48", sum.text);
  check("Summary line has no error count (round 81 answer 21): a row with 1 error and a row with 2 errors add nothing, the data keeps errors", !/error/.test(R.summarize([mkRow("stopped", { errorCount: 1 })]).text) && !/error/.test(R.summarize([mkRow("stopped", { errorCount: 2 })]).text) && R.summarize([mkRow("stopped", { errorCount: 2 })]).errors === 2);
  check("Group order: Needs attention, Waiting for a run, Running, Stopped, Completed, Not started", eq(R.GROUPS, ["Needs attention", "Waiting for a run", "Running", "Stopped", "Completed", "Not started"]) && eq(R.groupRows(rows).map((g) => g.group), [...R.GROUPS]));
  check("Group shows: Needs attention, Running, and Not started always; Waiting for a run, Stopped, and Completed only when not empty", R.GROUPS.every((g) => R.groupShows(g, 0) === ["Needs attention", "Running", "Not started"].includes(g)) && R.GROUPS.every((g) => R.groupShows(g, 2)));
  check("Group start state: Needs attention, Waiting for a run, Running, and Stopped open; Completed and Not started closed", eq(R.GROUPS.map((g) => R.groupStartsOpen(g)), [true, true, true, true, false, false]));
  check("Order in a group: the newest event first; Not started by slug", eq(R.sortRows([mkRow("stopped", { slug: "x", eventEpoch: 100 }), mkRow("stopped", { slug: "y", eventEpoch: 300 }), mkRow("stopped", { slug: "z", eventEpoch: 200 })]).map((x) => x.slug), ["y", "z", "x"]) && eq(R.sortRows([mkRow("not-started", { slug: "b" }), mkRow("not-started", { slug: "a" })]).map((x) => x.slug), ["a", "b"]));
  check("Tab title: '(1) Monitor dashboard' with 1 in Needs attention, 'Monitor dashboard' with 0", R.tabTitle(1) === "(1) Monitor dashboard" && R.tabTitle(0) === "Monitor dashboard");
  check("Empty group lines: 'Nothing needs attention.' and 'Nothing runs now. The last list ended Oct 28 23:50 PST (21 h ago).'", R.emptyLine("Needs attention", null, dnow) === "Nothing needs attention." && R.emptyLine("Running", 1793260231.2455308, dnow) === "Nothing runs now. The last list ended Oct 28 23:50 PST (21 h ago)." && R.emptyLine("Running", null, dnow) === "Nothing runs now." && R.emptyLine("Stopped", null, dnow) === null);
  check("Row labels follow store.py LABELS word for word (seven labels, their groups)", eq(["running", "running-pause", "stopped", "unexpected", "failure", "completed", "not-started"].map((k) => [R.LABELS[k].text, R.LABELS[k].group]), [["Running", "Running"], ["Running with pause requested", "Running"], ["Stopped", "Stopped"], ["Stopped unexpectedly", "Needs attention"], ["Stopped by failure", "Needs attention"], ["Completed", "Completed"], ["Not started", "Not started"]]));
  const noGloss = JSON.stringify([R.NO_RUN_TEXT, R.DATA_ERROR_TEXT, R.PHASE2_LINE, ...Object.values(R.LABELS).map((l) => l.text)]);
  check("Screen text holds no word 'gloss', 'rendering', or 'finished'", !/gloss|rendering|finished/i.test(noGloss));
  // --- buttons (unit VW77b1, round 81): VISION 15.27.3 table, 15.29.2 buttons for each state, 15.33.3 Running row
  // The helper lists the buttons of unit VW77b1. The buttons Restart and Clear mark (unit VW77b2) have their own checks in the mode monitor-restart.
  const btn = (x) => x.buttons.filter((b) => b.show && b.id !== "restart" && b.id !== "clear").map((b) => b.id + (b.enabled ? "" : "~")).join(",");
  const why = (x, id) => x.buttons.find((b) => b.id === id)?.reason;
  check("Buttons: a Not started book shows Run, enabled once the phase 2 prompt files exist (round 78 answer 16)", btn(row({})) === "run" && why(row({}), "run") === null);
  r = row({ phase2Ready: false });
  check("Buttons: without the 16 phase 2 prompt files Run is grayed with 'Run is off until phase 2 prompt files exist'", btn(r) === "run~" && why(r, "run") === R.PHASE2_GATE_REASON && R.PHASE2_GATE_REASON === "Run is off until phase 2 prompt files exist");
  r = row({ status: st({ state: "not-started" }) });
  check("Buttons: a status.json with the state not-started shows Run too", btn(r) === "run");
  r = row({ status: st() });
  check("Buttons: Running shows Pause, with Run and Resume grayed: 'Resume is off because this book runs now (pid 4821)' (VISION 4003, 15.33.3)", btn(r) === "pause,run~,resume~" && why(r, "resume") === "Resume is off because this book runs now (pid 4821)" && why(r, "run") === "Run is off because this book runs now (pid 4821)", `${btn(r)} ${why(r, "resume")}`);
  r = row({ status: st(), pauseExists: true });
  check("Buttons: Running with pause requested shows Pause grayed with 'Pause is already requested'", btn(r) === "pause~,run~,resume~" && why(r, "pause") === "Pause is already requested");
  r = row({ status: st(), mark: mark({ action: "restart", prompts: {} }) });
  check("Buttons: Running while a Restart mark waits shows no button (round 79 answer 13)", btn(r) === "" && r.buttons.every((b) => !b.show) && r.buttons.find((b) => b.id === "pause").stateReason === "Pause is off because a Restart mark waits.");
  r = row({ status: st(), mark: mark({ action: "run", phase: "agent-phase-3" }) });
  check("Buttons: Running with a Run mark keeps Pause, Run and Resume grayed", btn(r) === "pause,run~,resume~");
  r = row({ status: st({ state: "running", pid: null }), pidAlive: true });
  check("Buttons: the reason of a Running row without a pid has no '(pid ...)' text", why(r, "resume") === "Resume is off because this book runs now");
  r = row({ status: pst({ stop_reason: "pause" }), pidAlive: false });
  check("Buttons: Stopped by Pause shows Resume", btn(r) === "resume" && why(r, "resume") === null);
  r = row({ status: pst({ stop_reason: "ctrl-c" }), pidAlive: false });
  check("Buttons: Stopped by Ctrl-C shows Resume", btn(r) === "resume");
  r = row({ status: pst({ stop_reason: "forward-failure" }), pidAlive: false });
  check("Buttons: Stopped by failure shows Resume (VISION 15.29.2 table; 15.27.3 names Pause and Ctrl-C only)", btn(r) === "resume");
  r = row({ status: st({ pid: 99999999, heartbeat_utc: iso(-12 * 60) }), pidAlive: false });
  check("Buttons: Stopped unexpectedly shows Resume (VISION 15.29.2)", r.key === "unexpected" && btn(r) === "resume");
  r = row({ status: pst({ stop_reason: "target-reached" }), pidAlive: false });
  check("Buttons: a Stopped book with the reason target-reached shows no button, and the 409 reason names the reason", btn(r) === "" && r.buttons.find((b) => b.id === "resume").stateReason === "Resume does not fit this stop (target-reached).");
  check("Buttons: a Stopped book with the reason restart shows no button", btn(row({ status: pst({ stop_reason: "restart" }), pidAlive: false })) === "");
  r = row({ status: st({ state: "completed", phase: "agent-phase-3", pid: null }), pidAlive: false });
  check("Buttons: Completed in phase 3 shows 'Run phase 4' (VISION 15.24.4.5)", btn(r) === "run4" && why(r, "run4") === null && r.buttons.find((b) => b.id === "run4").label === "Run phase 4");
  r = row({ status: st({ state: "completed", phase: "agent-phase-3", pid: null }), pidAlive: false, phase2Ready: false });
  check("Buttons: Run phase 4 has no phase 2 gate", btn(r) === "run4");
  check("Buttons: Completed in phase 4 shows no button of unit VW77b1 (the Restart button is checked in monitor-restart)", btn(row({ status: st({ state: "completed", phase: "agent-phase-4", pid: null }), pidAlive: false })) === "");
  r = row({ mark: mark({ action: "run", phase: "agent-phase-3" }) });
  check("Buttons: a Run mark that waits (no process) grays Run and Resume: 'A mark waits: Run requested 08:40 PST'", btn(r) === "run~,resume~" && why(r, "run") === "A mark waits: Run requested 08:40 PST" && why(r, "resume") === "A mark waits: Run requested 08:40 PST", `${btn(r)} ${why(r, "run")}`);
  r = row({ status: pst({ stop_reason: "pause" }), pidAlive: false, mark: mark({ action: "resume" }) });
  check("Buttons: a Resume mark that waits grays Run and Resume: 'A mark waits: Resume requested 08:40 PST'", btn(r) === "run~,resume~" && why(r, "resume") === "A mark waits: Resume requested 08:40 PST");
  r = row({ markUnreadable: true });
  check("Buttons: a request.json that cannot be read grays Run and Resume with a reason", btn(r) === "run~,resume~" && /^A mark waits: the file request.json is there$/.test(why(r, "run") ?? ""));
  r = row({ status: null, statusUnreadable: true });
  check("Buttons: a Status file unreadable row shows no button", btn(r) === "" && r.buttons.every((b) => b.stateReason !== null));
  // pilot rows
  const pl = drow("left_foot_full");
  check("Buttons: a pilot row (Stopped, no status.json) shows Run, because a pilot list is no real run [unit default VW77b1]; Resume is not offered", btn(pl) === "run" && pl.buttons.find((b) => b.id === "resume").stateReason === "Resume is for a stopped book. This book has no run yet.", btn(pl));
  const plRun = dr(mk());
  check("Buttons: a pilot row that runs in a pilot list shows Run grayed, and the reason names the Lists tab [unit default VW77b1]", btn(plRun) === "run~" && /Lists tab/.test(why(plRun, "run") ?? ""), `${btn(plRun)} ${why(plRun, "run")}`);
  // refused Restart (round 81 answers 15 and 16)
  const doneRow = (over) => row({ status: st({ state: "completed", phase: "agent-phase-4", pid: null }), pidAlive: false, ...over });
  const rm = mark({ action: "restart", prompts: {} });
  r = doneRow({ mark: rm, refusal: { reason: "ED_2 v4.1.3 has no file", requested_utc: rm.requested_utc } });
  check("Refused Restart: the row keeps its group Completed and shows the second line 'Restart refused: ED_2 v4.1.3 has no file'", r.group === "Completed" && r.label === "Completed" && r.refused === "Restart refused: ED_2 v4.1.3 has no file" && !/Mark waiting/.test(text(r)), `${r.group} ${r.refused}`);
  check("Refused Restart: Run and Resume are grayed with 'A mark waits: Restart requested 08:40 PST (refused)'", btn(r) === "run~,resume~" && why(r, "run") === "A mark waits: Restart requested 08:40 PST (refused)");
  r = doneRow({ mark: rm, refusal: { reason: "x", requested_utc: "2026-01-01T00:00:00Z" } });
  check("Restart refused earlier (another requested_utc): the mark waits, the row is Mark waiting", r.group === "Waiting for a run" && r.refused === null && text(r) === "Mark waiting: Restart requested 08:40 PST");
  r = doneRow({ mark: rm, refusal: null });
  check("Restart mark with no refusal event: Mark waiting", r.group === "Waiting for a run" && r.refused === null);
  r = doneRow({ mark: rm, refusal: { reason: null, requested_utc: rm.requested_utc } });
  check("Refused Restart with no reason in the event: 'Restart refused: no reason is stored.'", r.refused === "Restart refused: no reason is stored.");
  r = doneRow({ mark: mark({ action: "resume" }), refusal: { reason: "x", requested_utc: "2026-07-10T16:40:00Z" } });
  check("A refusal event does not change a Resume mark (only the action restart counts)", r.refused === null && r.group === "Waiting for a run");
  r = row({ status: st(), mark: rm, refusal: { reason: "ED_2 v4.1.3 has no file", requested_utc: rm.requested_utc } });
  check("Refused Restart on a Running row: no 'Restart requested' note, the refusal line shows, Pause stays", r.note === null && r.refused !== null && btn(r) === "pause,run~,resume~");
  const word = JSON.stringify(r.buttons.map((b) => b.label).concat(r.buttons.map((b) => b.reason ?? ""), r.buttons.map((b) => b.stateReason ?? "")));
  check("Button texts hold no word 'gloss', 'rendering', or 'finished'", !/gloss|rendering|finished/i.test(word));

  // --- row order (unit TF85, owner round 87 answer 9 "Fix the row sort (Recommended)"; VISION 15.24.4.1, line 3916): lib/row-order.ts
  const O = await import("../lib/row-order.ts");
  const perms = (xs) => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
  // The three rows of the fixture dt of unit VW77c: the old comparator found rs_mark_broken < rs_ns (slug), rs_ns < rs_pilot (newer event), rs_pilot < rs_mark_broken (no time goes last): a cycle.
  const dt3 = [mkRow("stopped", { slug: "rs_pilot", eventEpoch: 100 }), mkRow("not-started", { slug: "rs_mark_broken", eventEpoch: null }), mkRow("not-started", { slug: "rs_ns", eventEpoch: 500 })];
  const dtOut = perms(dt3).map((p) => R.sortRows(p).map((x) => x.slug).join(","));
  check("Row order, fixture dt: rs_pilot, rs_mark_broken, rs_ns in all 6 input orders give one output order: rs_pilot, rs_mark_broken, rs_ns (old: the order depended on the input order, a cycle)", dtOut.length === 6 && new Set(dtOut).size === 1 && dtOut[0] === "rs_pilot,rs_mark_broken,rs_ns", dtOut.join(" | "));
  // Rows over all groups, with and without event times, with equal times, with unique slugs.
  const gen = [];
  for (const [gi, g] of R.GROUPS.entries()) {
    const key = { "Needs attention": "failure", "Waiting for a run": "mark-waiting", Running: "running", Stopped: "stopped", Completed: "completed", "Not started": "not-started" }[g];
    [null, 100, 100, 200, 300, null, 200].forEach((t, i) => gen.push(mkRow(key, { slug: `g${gi}_${String.fromCharCode(97 + ((i * 5) % 7))}${i}`, eventEpoch: t })));
  }
  const cmp = (a, b) => O.compareRows(a, b, R.GROUPS);
  let badAnti = 0, badTrans = 0, zero = 0;
  for (const a of gen) for (const b of gen) { if (a !== b && cmp(a, b) === 0) zero++; if (cmp(a, b) !== -cmp(b, a)) badAnti++; }
  for (const a of gen) for (const b of gen) for (const c of gen) if (cmp(a, b) < 0 && cmp(b, c) < 0 && !(cmp(a, c) < 0)) badTrans++;
  check(`Row order, transitivity: for every triple of the ${gen.length} generated rows (6 groups, with and without event time, equal times) a<b and b<c give a<c (${gen.length ** 3} triples, ${badTrans} broken)`, gen.length === 42 && badTrans === 0, `broken triples ${badTrans}`);
  check(`Row order, strict order: no two different rows compare equal and cmp(a,b) = -cmp(b,a) for every pair (${gen.length ** 2} pairs, ${zero} equal, ${badAnti} not antisymmetric)`, zero === 0 && badAnti === 0);
  // The VISION rule, computed in a second, independent way: one group at a time.
  const reference = R.GROUPS.flatMap((g) => {
    const inG = gen.filter((x) => x.group === g);
    return g === "Not started" ? [...inG].sort((x, y) => (x.slug < y.slug ? -1 : 1)) : [...inG].sort((x, y) => (y.eventEpoch ?? -Infinity) - (x.eventEpoch ?? -Infinity) || (x.slug < y.slug ? -1 : 1));
  });
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const outs = new Set();
  for (let k = 0; k < 200; k++) {
    const sh = [...gen];
    for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
    outs.add(R.sortRows(sh).map((x) => x.slug).join(","));
  }
  check("Row order, VISION rule: the groups in GROUPS order, the newest event first inside a group (no time last, slug breaks a tie), Not started by slug, the same output for 200 random input orders", outs.size === 1 && [...outs][0] === reference.map((x) => x.slug).join(","), `${outs.size} different outputs`);
  const before = gen.map((x) => x.slug).join(",");
  R.sortRows(gen);
  check("Row order: sortRows keeps the input array as it is, groupRows lists every row once, and an unknown group sorts after the known groups", gen.map((x) => x.slug).join(",") === before && R.groupRows(gen).reduce((n, g) => n + g.rows.length, 0) === gen.length && O.orderRows([{ slug: "a", group: "Zzz", eventEpoch: 1 }, { slug: "b", group: "Not started", eventEpoch: null }], R.GROUPS).map((x) => x.slug).join(",") === "b,a");
  check("Row order, a missing time and a time that is NaN sort last in a group, equal times sort by slug", R.sortRows([mkRow("stopped", { slug: "a", eventEpoch: NaN }), mkRow("stopped", { slug: "c", eventEpoch: 5 }), mkRow("stopped", { slug: "b", eventEpoch: 5 }), mkRow("stopped", { slug: "d", eventEpoch: null })]).map((x) => x.slug).join(",") === "b,c,a,d");
}

// Monitor dashboard on a fixture (unit VW77a). The fixture and the fake Translator process come from fake_translator.py (real store.py code).
async function monitorTest() {
  if (!fixture) throw new Error("Need --fixture DIR");
  const data = path.join(path.resolve(fixture), "data");
  const before = await listing(data);
  const api = async () => JSON.parse((await get("/api/monitor/books")).body);
  const rowOf = (d, slug) => d.rows.find((x) => x.slug === slug);
  let r = await get("/api/monitor/books");
  const d = parseJson(r.body);
  check("GET /api/monitor/books gives 200 and JSON with ok, rows, summary, generatedAt", r.status === 200 && r.type.includes("json") && d?.ok === true && Array.isArray(d.rows) && typeof d.summary?.text === "string" && typeof d.generatedAt === "number", `status ${r.status}, ${d?.rows?.length} rows`);
  const label = (slug) => rowOf(d, slug)?.label;
  check("API rows of the fake Translator: Running, Running with pause requested, Stopped unexpectedly (dead pid and silent heartbeat), Stopped (Pause, Ctrl-C), Stopped by failure (3 reasons), Completed, Not started, Status file unreadable", label("fx_running") === "Running" && label("fx_pause_req") === "Running with pause requested" && label("fx_dead") === "Stopped unexpectedly" && label("fx_silent") === "Stopped unexpectedly" && label("fx_pause") === "Stopped" && label("fx_ctrlc") === "Stopped" && ["fx_fail", "fx_costguard", "fx_rule"].every((s) => label(s) === "Stopped by failure") && label("fx_done") === "Completed" && label("fx_ns") === "Not started" && label("fx_broken") === "Status file unreadable", JSON.stringify(d?.rows?.filter((x) => x.slug.startsWith("fx_")).map((x) => [x.slug, x.label])));
  check("Marks: Mark waiting rows sit in Waiting for a run (Resume, Run, Restart, and the Run mark of a Restart); the Restart mark on a Running book gives the note and the row stays in Running", ["fx_wait_resume", "fx_wait_run", "fx_wait_restart", "fx_wait_after"].every((s) => rowOf(d, s)?.group === "Waiting for a run" && rowOf(d, s)?.label === "Mark waiting") && rowOf(d, "fx_restart_note")?.group === "Running" && /^Restart requested \d\d:\d\d PST$/.test(rowOf(d, "fx_restart_note")?.note ?? "") && rowOf(d, "fx_run_mark_running")?.group === "Running");
  check("Run number from the prompt pointer: fx_running (v4.2.3) reads 'phase 4 run 2, started 2026-11-04 00:15 PST', fx_restart_note (v4.1.6) reads run 1, fx_pause (no prompt file) shows no run number", rowOf(d, "fx_running")?.run === "phase 4 run 2, started 2026-11-04 00:15 PST" && rowOf(d, "fx_restart_note")?.run === "phase 4 run 1, started 2026-11-04 00:15 PST" && rowOf(d, "fx_pause")?.run === "phase 4, started 2026-11-04 00:15 PST", `${rowOf(d, "fx_running")?.run}`);
  check("Derived rows of the real pilot lists: mental_full Stopped by failure in Needs attention, left_foot_full '6 of 120 pages', ogawa_lecture_part2 with the error file that exists, kendojidai_2014 6 of 1051", rowOf(d, "mental_full")?.group === "Needs attention" && rowOf(d, "left_foot_full")?.pagesDone === 6 && rowOf(d, "left_foot_full")?.pagesTotal === 120 && rowOf(d, "left_foot_full")?.pilot === true && rowOf(d, "ogawa_lecture_part2")?.errorFile?.endsWith("failed/box-critic.TS_3.json") && rowOf(d, "kendojidai_2014")?.pagesTotal === 1051);
  check("Derived rows of the fake pilot lists: a running list gives Running, a paused list with a PAUSE file gives Running with pause requested", rowOf(d, "fx_pilot_run")?.label === "Running" && rowOf(d, "fx_pilot_pause")?.label === "Running with pause requested");
  check("A status.json wins over a pilot list: lifelong_full (pilot pages in list 20261026T182511Z) shows Completed from its status.json", rowOf(d, "lifelong_full")?.label === "Completed" && rowOf(d, "lifelong_full")?.pilot === false);
  check("Summary counts equal the groups of the rows and the cost is the sum of the row costs", (() => { const c = Object.fromEntries(["Needs attention", "Waiting for a run", "Running", "Stopped", "Completed", "Not started"].map((g) => [g, d.rows.filter((x) => x.group === g).length])); return JSON.stringify(c) === JSON.stringify(d.summary.counts) && Math.abs(d.summary.costUsd - d.rows.reduce((a, x) => a + (x.cost ?? 0), 0)) < 1e-6; })(), d.summary.text);
  check("No row text holds a Mac path (/Users/ or /private/var)", !JSON.stringify(d.rows).match(/\/Users\/|\/private\/var|\/var\/folders/));

  r = await get("/");
  const text = visibleText(r.body.replace(/<!--[\s\S]*?-->/g, "")); // React 19 writes <!-- --> between two text nodes
  check("GET / 200 shows the Monitor dashboard: title, summary line, the six groups in order, the Phase 2 line", r.status === 200 && /Monitor dashboard/.test(text) && text.includes(d.summary.text) && /Needs attention \(\d+\).*Waiting for a run \(\d+\).*Running \(\d+\).*Stopped \(\d+\).*Completed \(\d+\).*Not started \(\d+\)/.test(text) && text.includes("Phase 2 (paired dataset): no run record yet."), `${Math.round(r.ms)} ms`);
  check("GET / shows rows as the design says: 'Stopped by Pause at', 'Mark waiting: Resume requested', 'Making the Difference on the Day: Mental Strengthening for Kendo (mental_full)' with pilot list, '6 of 120 pages', the error line with 'Error on p089'", /Stopped by Pause at \d\d:\d\d PST\. Last saved page p080\. Resume starts at p081\./.test(text) && /Mark waiting: Resume requested \d\d:\d\d PST/.test(text) && text.includes("Making the Difference on the Day: Mental Strengthening for Kendo (mental_full)") && text.includes("pilot list") && text.includes("6 of 120 pages") && text.includes("Error on p089, box box-critic.TS_3: invalid JSON"));
  check("GET / title tag holds the count of Needs attention in the first paint ('(N) Monitor dashboard' in <title>, N from the summary line)", new RegExp(`<title>\\(${d.summary.counts["Needs attention"]}\\) Monitor dashboard</title>`).test(r.body), (r.body.match(/<title>.*?<\/title>/) ?? [""])[0]);
  check("GET / groups are details elements with summary; the open state comes from the start rule (Needs attention open, Not started closed)", /<details[^>]*data-group="Needs attention"[^>]*open=""/.test(r.body) && !/<details[^>]*data-group="Not started"[^>]*open=""/.test(r.body) && !/<details[^>]*data-group="Completed"[^>]*open=""/.test(r.body) && (r.body.match(/<summary/g) ?? []).length >= 6);
  check("GET / has a progressbar for a row with a total, a state label with a symbol and a word, the buttons of unit VW77b1 (data-action), the Restart button of unit VW77b2 on a row with a run, and the link Details of unit VW77c on a row", /role="progressbar"/.test(r.body) && /data-state-label="running"[^>]*>.{0,80}●.{0,40}Running/.test(r.body.replace(/<!--.*?-->/g, "")) && /data-action="(run|resume|pause)"/.test(r.body) && /data-action="restart"/.test(r.body) && /<a[^>]*data-details-link[^>]*href="\/monitor\/[A-Za-z0-9_.-]+"[^>]*>Details<\/a>/.test(r.body.replace(/<script[\s\S]*?<\/script>/g, "")));
  check("GET / sends the nav with the tabs Monitor dashboard, Lists, Books, Human translation (no Run settings tab yet)", (() => { const nav = r.body.match(/<nav[^>]*aria-label="Main tabs"[\s\S]*?<\/nav>/)?.[0] ?? ""; const t = visibleText(nav).trim().replace(/\s+/g, " "); return t === "Monitor dashboard Lists Books Human translation" && /href="\/runs"/.test(nav); })());
  r = await get("/runs");
  const rt = visibleText(r.body);
  check("GET /runs 200 shows the Lists table: heading 'Lists', the three list stamps, the column 'Cost (listed)'", r.status === 200 && /Lists/.test(rt) && ["20261026T182511Z", "20261028T023006Z", "20261029T051152Z"].every((s) => rt.includes(s)) && rt.includes("Cost (listed)"));
  r = await get("/runs/20261029T051152Z");
  check("GET /runs/<stamp> 200 and the back link reads '← Lists' and points to /runs", r.status === 200 && /href="\/runs"[^>]*>\s*← Lists/.test(r.body));

  // The end of the process: kill the fake Translator. fx_running turns to Stopped unexpectedly at the next read (the pid check, signal 0).
  const pid = Number((await fs.readFile(path.join(path.resolve(fixture), "PID"), "utf-8")).trim());
  process.kill(pid, "SIGTERM");
  await new Promise((res) => setTimeout(res, 1500));
  const d2 = await api();
  check("After the fake Translator ends: fx_running turns to Stopped unexpectedly (pid gone) in Needs attention, and the Running rows of that process leave the group Running", rowOf(d2, "fx_running")?.label === "Stopped unexpectedly" && rowOf(d2, "fx_running")?.group === "Needs attention" && /the process is gone/.test(R_line(rowOf(d2, "fx_running"))), R_line(rowOf(d2, "fx_running")));
  check("The summary after the end: more in Needs attention than before, tab title count follows", d2.summary.counts["Needs attention"] > d.summary.counts["Needs attention"]);

  // A broken file never stops the page: break fx_ns/status.json in the fixture and read again.
  await fs.writeFile(path.join(data, "book-store", "fx_ns", "status.json"), "{ not json");
  const d3 = await api();
  check("A status.json broken after the first read gives the row 'Status file unreadable' and the other rows stay", rowOf(d3, "fx_ns")?.label === "Status file unreadable" && d3.rows.length === d.rows.length && rowOf(d3, "fx_done")?.label === "Completed");
  await fs.writeFile(path.join(data, "book-store", "fx_ns", "status.json"), JSON.stringify({ state: "completed", phase: "agent-phase-3", pages_done: 3, pages_total: 3, updated_utc: "2026-11-02T08:00:00Z" }));
  const d4 = await api();
  check("A changed status.json is read again (the mtime check): fx_ns turns to Completed", rowOf(d4, "fx_ns")?.label === "Completed");

  // The Monitor dashboard writes no file.
  const after = await listing(data);
  const diff = after.filter((x) => !before.includes(x)).concat(before.filter((x) => !after.includes(x))).filter((x) => !/status\.json|progress\.json|PAUSE/.test(x));
  check("The reads wrote no file in the fixture (only the fake Translator and this test changed files)", diff.length === 0, diff.join(", "));
  r = await get("/api/monitor/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  check("The route is GET only: POST gives 405", r.status === 405, `status ${r.status}`);

  // Monitor off: a second server with VIEWER_MONITOR=off.
  const off = await startServerWith({ VIEWER_MONITOR: "off" });
  try {
    r = await get("/api/monitor/books");
    check("Monitor off: /api/monitor/books gives 404 with the body of monitorOffResponse", r.status === 404 && parseJson(r.body)?.error === "Not found", `status ${r.status} ${r.body}`);
    const noFollow = await fetch(base + "/", { redirect: "manual" });
    check("Monitor off: / follows frontDoor (no session goes to the sign-in page)", noFollow.status >= 300 && noFollow.status < 400 && /\/sign-in/.test(noFollow.headers.get("location") ?? ""), `status ${noFollow.status} ${noFollow.headers.get("location")}`);
    r = await get("/runs");
    check("Monitor off: /runs gives 404", r.status === 404, `status ${r.status}`);
  } finally {
    off.child.kill("SIGTERM");
    base = off.old;
  }
  // The data folder is not readable: a second server with a config that names a folder that does not exist.
  const bad = path.join(path.resolve(fixture), "cfg-missing.json");
  await fs.writeFile(bad, JSON.stringify({ translatorDataDir: path.join(path.resolve(fixture), "no-such-folder"), pocketbaseUrl: (await activeConfig()).pocketbaseUrl })); // unit TF83: the address of the run config, not a fixed port
  const miss = await startServerWith({ VIEWER_CONFIG: bad });
  try {
    r = await get("/api/monitor/books");
    const m = parseJson(r.body);
    check("Data folder missing: the route answers 200 with ok false and the message of VISION 15.24.4.6, with no Mac path", r.status === 200 && m?.ok === false && m.error === "The Monitor dashboard cannot read the Translator data folder. Check the key translatorDataDir in viewer.config.json." && !/no-such-folder/.test(r.body), r.body.slice(0, 200));
    r = await get("/");
    check("Data folder missing: / shows that message", r.status === 200 && visibleText(r.body.replace(/<!--[\s\S]*?-->/g, "")).includes("The Monitor dashboard cannot read the Translator data folder."));
  } finally {
    miss.child.kill("SIGTERM");
    base = miss.old;
  }
}

// Buttons of the Monitor dashboard (unit VW77b1, round 81). Needs the fixture of fake_translator.py (real store.py code) and WRITES into it.
// Never point it at the real data folder: the first step refuses a fixture folder inside a protected data folder, and a config that names another data folder (unit TF83, scripts/smoke-guards.mjs).
async function monitorActionsTest() {
  if (!fixture) throw new Error("Need --fixture DIR");
  const fx = path.resolve(fixture);
  const data = path.join(fx, "data");
  const store = path.join(data, "book-store");
  await mustBeFixture("monitor-actions", fx); // unit TF83: from the config, no fixed folder name
  const JSONH = { "Content-Type": "application/json" };
  const post = (slug, kind, body, headers = JSONH) => get(`/api/monitor/books/${slug}/${kind}`, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
  const api = async () => JSON.parse((await get("/api/monitor/books")).body);
  const rowOf = (d, slug) => d.rows.find((x) => x.slug === slug);
  const err = (r) => parseJson(r.body)?.error;
  const exists = async (p) => fs.stat(p).then(() => true, () => false);
  const RUN3 = { action: "run", phase: "agent-phase-3" };
  const RUN4 = { action: "run", phase: "agent-phase-4" };
  const BOXES = ["TS", "TL", "ED", "QA"].flatMap((s) => [0, 1, 2, 3].map((l) => `${s}_${l}`));
  const ph2 = (box) => path.join(store, "paired-dataset", "prompts", box, "current");
  // unit VW77b2 (round 82): the Restart press and the Clear mark press
  const lab = (l) => Object.fromEntries(BOXES.map((b) => [b, l]));
  const RST = (phase = "agent-phase-4", label = "v4.1.0") => ({ action: "restart", phase, prompts: lab(label) });
  const before = await listing(data);

  // ---- the answers before any state check
  let r;
  check("GET on the mark route gives 405, the list route still refuses POST", (await get("/api/monitor/books/fx_ns/mark")).status === 405 && (await get("/api/monitor/books", { method: "POST", headers: JSONH, body: "{}" })).status === 405);
  r = await post("fx_ns", "mark", RUN3, { ...JSONH, Origin: "http://evil.example" });
  check("Foreign Origin on the mark route gives 403", r.status === 403 && err(r) === "Foreign origin.", `status ${r.status} ${r.body}`);
  r = await post("fx_running", "pause", {}, { ...JSONH, Origin: "http://evil.example" });
  check("Foreign Origin on the pause route gives 403 and writes no PAUSE", r.status === 403 && !(await exists(path.join(store, "fx_running", "PAUSE"))));
  r = await post("fx_ns", "mark", RUN3, { ...JSONH, Origin: base });
  check("The Origin of the page itself passes the check (the answer is 409 for the missing phase 2 files, not 403)", r.status === 409, `status ${r.status} ${r.body}`);
  r = await post("fx_ns", "mark", JSON.stringify(RUN3), { "Content-Type": "text/plain" });
  check("A content type that is not JSON gives 415 on the mark route", r.status === 415 && err(r) === "Send JSON.");
  r = await post("fx_running", "pause", "{}", { "Content-Type": "text/plain" });
  check("A content type that is not JSON gives 415 on the pause route", r.status === 415);
  for (const bad of ["no_such_book", "paired-dataset", "a%20b", "..", "x%2F..%2Fy", "%2e%2e"]) {
    r = await post(bad, "mark", RUN3);
    check(`Slug '${bad}' is not in the book set or not safe: 404`, r.status === 404, `status ${r.status} ${r.body.slice(0, 80)}`);
  }
  check("Slug check comes before the body check: a bad slug with a bad body gives 404", (await post("no_such_book", "mark", "not json")).status === 404);
  r = await post("fx_ns", "mark", "not json");
  check("A body that is not JSON gives 400", r.status === 400, `status ${r.status} ${r.body}`);
  r = await post("fx_ns", "mark", { action: "restart", phase: "agent-phase-3" });
  check("The action restart with no prompts map gives 400 (the Restart route is checked in monitor-restart-api and below)", r.status === 400 && /^The body needs prompts/.test(err(r) ?? ""), `status ${r.status} ${r.body}`);
  r = await post("fx_ns", "mark", { action: "run", phase: "agent-phase-2" });
  check("A phase other than agent-phase-3 and agent-phase-4 gives 400", r.status === 400);
  check("A body that is an array gives 400", (await post("fx_ns", "mark", "[]")).status === 400);
  r = await post("fx_ns", "mark", RST(), { ...JSONH, Origin: "http://evil.example" });
  check("Foreign Origin on a Restart press gives 403 (the Origin check comes before the body and state checks)", r.status === 403 && err(r) === "Foreign origin.");
  r = await post("fx_pause", "clear-mark", {}, { ...JSONH, Origin: "http://evil.example" });
  check("Foreign Origin on the clear-mark route gives 403", r.status === 403 && err(r) === "Foreign origin.");
  check("A content type that is not JSON gives 415 on the clear-mark route", (await post("fx_pause", "clear-mark", "{}", { "Content-Type": "text/plain" })).status === 415);
  check("Slug check on the clear-mark route: a book outside the set gives 404, before the body check", (await post("no_such_book", "clear-mark", "not json")).status === 404);
  check("GET on the clear-mark route gives 405", (await get("/api/monitor/books/fx_pause/clear-mark")).status === 405);
  check("A restart body with a missing prompts map or the old value 'start' gives 400 (VISION 15.32.4: the old values are gone)", (await post("fx_pause", "mark", { action: "restart", phase: "agent-phase-4", prompts: "start" })).status === 400 && (await post("fx_pause", "mark", { action: "restart", phase: "agent-phase-4" })).status === 400);
  check("No request.json and no PAUSE appeared yet in the fixture", !(await exists(path.join(store, "fx_ns", "request.json"))) && !(await exists(path.join(store, "fx_running", "PAUSE"))));

  // ---- 409 when the action does not fit the book (a fresh read of status.json)
  const d0 = await api();
  const cases = [
    ["fx_running", "mark", RUN3, /^Run is off because this book runs now \(pid \d+\)$/, "Run on a Running book"],
    ["fx_running", "mark", { action: "resume", phase: "agent-phase-4" }, /^Resume is off because this book runs now \(pid \d+\)$/, "Resume on a Running book"],
    ["fx_pause", "mark", RUN3, /^Run is for a book with no run yet\. This book is: Stopped\.$/, "Run on a Stopped book"],
    ["fx_pause", "mark", RUN4, /^Run phase 4 is for a Completed book of phase 3\. This book is: Stopped\.$/, "Run phase 4 on a Stopped book"],
    ["fx_done4", "mark", RUN4, /^Run phase 4 is for a Completed book of phase 3\./, "Run phase 4 on a Completed book of phase 4"],
    ["fx_done", "mark", { action: "resume", phase: "agent-phase-3" }, /^Resume is for a stopped book\. This book is: Completed\.$/, "Resume on a Completed book"],
    ["fx_target", "mark", { action: "resume", phase: "agent-phase-3" }, /^Resume does not fit this stop \(target-reached\)\.$/, "Resume after a stop by target-reached"],
    ["fx_ns", "mark", { action: "resume", phase: "agent-phase-3" }, /^Resume is for a stopped book\. This book has no run yet\.$/, "Resume on a book with no run"],
    ["fx_pause", "mark", { action: "resume", phase: "agent-phase-3" }, /^Resume must use the phase of the run \(agent-phase-4\)\.$/, "Resume with the wrong phase"],
    ["fx_pause", "pause", {}, /^Pause is for a Running book\. This book is: Stopped\.$/, "Pause on a Stopped book"],
    ["fx_ns", "pause", {}, /^Pause is for a Running book\./, "Pause on a Not started book"],
    ["fx_pause_req", "pause", {}, /^Pause is already requested$/, "Pause with the file PAUSE in place"],
    ["fx_restart_note", "pause", {}, /^Pause is off because a Restart mark waits\.$/, "Pause while a Restart mark waits"],
    ["fx_pilot_run", "mark", RUN3, /^Run is off because a pilot list runs this book now\. Use Pause on the Lists tab\.$/, "Run on a book that a pilot list runs"],
    ["fx_pilot_run", "pause", {}, /^Pause of a pilot list is on the Lists tab\.$/, "Pause on a pilot row"],
    ["fx_broken", "mark", RUN3, /^The file status\.json cannot be read\.$/, "Run on a book with a broken status.json"],
    ["fx_ns", "mark", RUN3, /^Run is off until phase 2 prompt files exist$/, "Run on a Not started book while the phase 2 files are missing"],
    ["mental_full", "mark", RUN3, /^Run is off until phase 2 prompt files exist$/, "Run on a pilot row while the phase 2 files are missing"],
    // unit VW77b2: the Restart press and the Clear mark press
    ["fx_ns", "mark", RST("agent-phase-3", "v3.1.0"), /^Restart is for a book with a run\. This book has no run yet\.$/, "Restart on a Not started book"],
    ["fx_restart_note", "mark", RST(), /^A Restart is requested already\.$/, "Restart on a Running book while a Restart mark waits"],
    ["fx_broken", "mark", RST(), /^The file status\.json cannot be read\.$/, "Restart on a book with a broken status.json"],
    ["fx_pilot_run", "mark", RST(), /^Restart is for a real run\. A pilot list is no real run\.$/, "Restart on a book that a pilot list runs"],
    ["mental_full", "mark", RST(), /^Restart is for a real run\. A pilot list is no real run\.$/, "Restart on a pilot row"],
    ["fx_pause", "mark", RST("agent-phase-3", "v3.1.0"), /^Restart must use the phase of the run \(agent-phase-4\)\.$/, "Restart with the wrong phase"],
    ["fx_wait_resume", "mark", RST(), /^A mark waits already$/, "Restart while a Resume mark waits"],
    ["fx_refused", "mark", RST(), /^A mark waits already$/, "Restart while a refused Restart mark still waits"],
    ["fx_run_mark_running", "mark", RST("agent-phase-3", "v3.1.0"), /^A mark waits already$/, "Restart on a Running book with a Run mark"],
    ["fx_pause", "mark", RST(), /^Box TS_0 has the label v4\.1\.0, but no file has it\. Pick another version\.$/, "Restart with a label that has no file (fx_pause has no prompt files)"],
    ["fx_running", "mark", RST(), /^Box TS_0 has the label v4\.1\.0, but no file has it\. Pick another version\.$/, "Restart on a Running book with a label that has no file"],
    ["fx_pause", "clear-mark", {}, /^There is no mark to clear\.$/, "Clear mark on a book with no mark"],
    ["fx_pilot_run", "clear-mark", {}, /^There is no mark to clear\.$/, "Clear mark on a pilot row"],
    ["fx_broken", "clear-mark", {}, /^The file status\.json cannot be read\.$/, "Clear mark on a book with a broken status.json"],
    ["fx_run_mark_running", "clear-mark", {}, /^Clear mark is for a book with no live process\. This book runs now \(pid \d+\)$/, "Clear mark on a Running book with a Run mark"],
    ["fx_restart_note", "clear-mark", {}, /^Clear mark is for a book with no live process\./, "Clear mark on a Running book with a Restart mark"],
  ];
  for (const [slug, kind, body, re, name] of cases) {
    r = await post(slug, kind, body);
    check(`409: ${name} (${slug}): '${err(r)}'`, r.status === 409 && re.test(err(r) ?? ""), `status ${r.status} ${r.body.slice(0, 160)}`);
  }
  check("The row buttons of the API agree: fx_ns shows Run grayed with the phase 2 reason, fx_running shows Pause and two grayed buttons", (() => { const a = rowOf(d0, "fx_ns").buttons.find((b) => b.id === "run"); const b = rowOf(d0, "fx_running").buttons.filter((x) => x.show).map((x) => x.id + (x.enabled ? "" : "~")).join(","); return a.show && !a.enabled && a.reason === "Run is off until phase 2 prompt files exist" && b === "pause,restart,run~,resume~"; })());
  const mid = await listing(data);
  const moved = mid.filter((x) => !before.includes(x)).concat(before.filter((x) => !mid.includes(x))).filter((x) => !isHeartbeat(x) && !/\bPAUSE\b/.test(x));
  check("All the refused presses wrote no file", moved.length === 0, moved.join(", "));

  // ---- the phase 2 files appear in the fixture: Run turns on
  for (const b of BOXES) {
    await fs.mkdir(path.dirname(ph2(b)), { recursive: true });
    await fs.writeFile(ph2(b), "v2.1.0\n");
  }
  const d1 = await api();
  check("With the 16 phase 2 prompt files, Run shows enabled on a Not started row, and the folder paired-dataset is no book row", rowOf(d1, "fx_ns").buttons.find((b) => b.id === "run").enabled === true && !rowOf(d1, "paired-dataset") && d1.rows.length === d0.rows.length);
  await fs.rm(ph2("QA_3"));
  check("With 15 of the 16 files, Run is grayed again", rowOf(await api(), "fx_ns").buttons.find((b) => b.id === "run").enabled === false);
  await fs.writeFile(ph2("QA_3"), "v2.1.0\n");

  // ---- 409 because a mark waits already (state fits, request.json exists)
  r = await post("fx_wait_run", "mark", RUN3);
  check("409: Run on a book whose Run mark waits: 'A mark waits already'", r.status === 409 && err(r) === "A mark waits already", `status ${r.status} ${r.body}`);
  r = await post("fx_wait_resume", "mark", { action: "resume", phase: "agent-phase-4" });
  check("409: Resume on a book whose Resume mark waits: 'A mark waits already'", r.status === 409 && err(r) === "A mark waits already", `status ${r.status} ${r.body}`);

  // ---- 200: the exact bytes of store.write_mark
  const now0 = Date.now();
  r = await post("fx_ns", "mark", RUN3);
  const j = parseJson(r.body);
  const fileNs = path.join(store, "fx_ns", "request.json");
  const bytes = await fs.readFile(fileNs, "utf-8");
  const want = (slug, action, phase, utc) => JSON.stringify({ schema: "book-request-v1", book: slug, action, phase, requested_utc: utc, requested_by: "Monitor dashboard" }, null, 1) + "\n";
  check("200: Run on a Not started book writes request.json", r.status === 200 && j?.ok === true && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(j.requested_utc ?? ""), `status ${r.status} ${r.body}`);
  check("request.json holds the exact bytes of store.write_mark (indent 1, key order schema, book, action, phase, requested_utc, requested_by, one newline at the end)", bytes === want("fx_ns", "run", "agent-phase-3", j.requested_utc) && bytes.endsWith("}\n") && !bytes.endsWith("\n\n"), JSON.stringify(bytes));
  check("The press time is the clock of the server (within 5 s), in UTC with no milliseconds", Math.abs(Date.parse(j.requested_utc) - now0) < 5000 + 1000);
  check("No request.json.part stays, and the folder holds only status.json and request.json", (await fs.readdir(path.join(store, "fx_ns"))).sort().join(",") === "request.json,status.json");
  r = await post("fx_ns", "mark", RUN3);
  check("A second press on the same book: 409 'A mark waits already', the file stays as it was", r.status === 409 && err(r) === "A mark waits already" && (await fs.readFile(fileNs, "utf-8")) === bytes);
  const d2 = await api();
  const ns = rowOf(d2, "fx_ns");
  check("The row turns to Mark waiting in the group Waiting for a run with 'Mark waiting: Run requested HH:MM PST', Run and Resume grayed with 'A mark waits: Run requested HH:MM PST'", ns.group === "Waiting for a run" && /^Mark waiting: Run requested \d\d:\d\d PST$/.test(ns.line2.join("")) && ns.buttons.filter((b) => b.show).map((b) => b.id + (b.enabled ? "" : "~")).join(",") === "run~,resume~,clear" && /^A mark waits: Run requested \d\d:\d\d PST$/.test(ns.buttons.find((b) => b.id === "run").reason), `${ns.group} ${ns.line2.join("")}`);

  // a book with no folder: the route makes it (store.write_mark does the same)
  const fresh = d2.rows.find((x) => x.key === "not-started" && !x.pilot && !x.slug.startsWith("fx_") && !x.slug.startsWith("lifelong"));
  const freshDir = path.join(store, fresh?.slug ?? "none");
  const hadFolder = await exists(freshDir);
  r = await post(fresh?.slug ?? "none", "mark", RUN3);
  check(`200: Run on '${fresh?.slug}', a book with no folder in the store: the route makes book-store/<slug>/request.json`, !hadFolder && r.status === 200 && (await exists(path.join(freshDir, "request.json"))), `hadFolder ${hadFolder} status ${r.status} ${r.body}`);
  const pilot = await post("mental_full", "mark", RUN3);
  check("200: Run on a pilot row (mental_full has pilot pages and no status.json) [unit default VW77b1]", pilot.status === 200 && (await exists(path.join(store, "mental_full", "request.json"))), `status ${pilot.status} ${pilot.body}`);

  r = await post("fx_done", "mark", RUN4);
  const j4 = parseJson(r.body);
  check("200: Run phase 4 on a Completed book of phase 3 writes action run with phase agent-phase-4", r.status === 200 && (await fs.readFile(path.join(store, "fx_done", "request.json"), "utf-8")) === want("fx_done", "run", "agent-phase-4", j4.requested_utc), `status ${r.status} ${r.body}`);
  r = await post("fx_pause", "mark", { action: "resume", phase: "agent-phase-4" });
  const jr = parseJson(r.body);
  check("200: Resume on a book stopped by a Pause writes action resume with the phase of the run", r.status === 200 && (await fs.readFile(path.join(store, "fx_pause", "request.json"), "utf-8")) === want("fx_pause", "resume", "agent-phase-4", jr.requested_utc), `status ${r.status} ${r.body}`);
  for (const [slug, ph] of [["fx_ctrlc", "agent-phase-4"], ["fx_fail", "agent-phase-4"], ["fx_dead", "agent-phase-3"]]) {
    r = await post(slug, "mark", { action: "resume", phase: ph });
    check(`200: Resume on ${slug} (${(await api()).rows.find((x) => x.slug === slug).baseLabel})`, r.status === 200, `status ${r.status} ${r.body}`);
  }

  // ---- Pause writes the file PAUSE
  r = await post("fx_running", "pause", {});
  const pauseFile = path.join(store, "fx_running", "PAUSE");
  const pauseText = await fs.readFile(pauseFile, "utf-8").catch(() => "");
  check("200: Pause on a Running book writes the file PAUSE (one JSON line with who and when_utc) and no other file", r.status === 200 && parseJson(pauseText)?.who === "viewer" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(parseJson(pauseText)?.when_utc ?? "") && pauseText.endsWith("\n") && !(await exists(path.join(store, "fx_running", "request.json"))), `status ${r.status} ${r.body} ${pauseText}`);
  const run = rowOf(await api(), "fx_running");
  check("The row turns to 'Running with pause requested' and the Pause button is grayed with 'Pause is already requested'", run.label === "Running with pause requested" && run.buttons.find((b) => b.id === "pause").reason === "Pause is already requested" && run.buttons.find((b) => b.id === "pause").enabled === false);
  r = await post("fx_running", "pause", {});
  check("A second Pause press gives 409 'Pause is already requested'", r.status === 409 && err(r) === "Pause is already requested");

  // ---- refused Restart rows, summary line, pilot rows
  const d3 = await api();
  const rf = rowOf(d3, "fx_refused");
  check("Refused Restart (fx_refused): the row keeps the group Completed and the second line reads 'Restart refused: ED_2 v4.1.3 has no file'", rf.group === "Completed" && rf.label === "Completed" && rf.refused === "Restart refused: ED_2 v4.1.3 has no file", `${rf.group} ${rf.refused}`);
  check("Old refusal (another requested_utc, fx_refused_old): the row is Mark waiting in Waiting for a run", rowOf(d3, "fx_refused_old").group === "Waiting for a run" && rowOf(d3, "fx_refused_old").refused === null);
  check("The summary line has no error count, though ogawa_lecture_part2 and fx_fail hold error texts", !/error/.test(d3.summary.text) && d3.rows.some((x) => x.errorCount > 0), d3.summary.text);
  const lf = rowOf(d3, "left_foot_full");
  check("A pilot row has an empty phase cell: phase null in the data, and the text 'Phase not stored' appears nowhere on /", lf.pilot === true && lf.phase === null && !/Phase not stored/.test((await get("/")).body));
  check("A status row keeps its phase text (fx_pause: 'Phase 4 · production run')", rowOf(d3, "fx_pause").phase === "Phase 4 · production run");

  // ---- first paint: the buttons in the HTML, the grayed reason as tooltip and screen reader text
  const home = await get("/");
  const html = home.body.replace(/<!--.*?-->/g, "");
  const rowHtml = (slug) => (html.match(new RegExp(`<li[^>]*data-book-row="${slug}"[\\s\\S]*?</li>`)) ?? [""])[0];
  check("GET / draws the buttons: Resume on fx_rule (Stopped by failure), Run phase 4 on lifelong_full (Completed, phase 3), Run on a Not started row, no button on fx_done4 (Completed, phase 4)", /data-action="resume"/.test(rowHtml("fx_rule")) && !/data-grayed/.test(rowHtml("fx_rule")) && />Run phase 4</.test(rowHtml("lifelong_full")) && /data-action="run"/.test(rowHtml(fresh.slug)) && !/data-action="(run|run4|resume|pause)"/.test(rowHtml("fx_done4")) && /data-action="restart"/.test(rowHtml("fx_done4")));
  check("After a press the row of fx_pause shows Run and Resume grayed (a Resume mark waits), and fx_done shows them grayed too", /data-grayed/.test(rowHtml("fx_pause")) && (rowHtml("fx_pause").match(/data-grayed/g) ?? []).length === 2 && (rowHtml("fx_done").match(/data-grayed/g) ?? []).length === 2);
  check("GET / draws a grayed button with aria-disabled, a tooltip (title), and the reason for a screen reader: Resume on fx_pause_req", /<button[^>]*data-grayed[^>]*aria-disabled="true"[^>]*title="Resume is off because this book runs now \(pid \d+\)"/.test(rowHtml("fx_pause_req")) || /<button[^>]*aria-disabled="true"[^>]*data-action="resume"[^>]*title="Resume is off because this book runs now/.test(rowHtml("fx_pause_req")), rowHtml("fx_pause_req").slice(0, 400));
  check("The grayed button stays in the Tab order (no disabled attribute, no tabindex -1)", !/<button[^>]*data-grayed[^>]*\sdisabled/.test(rowHtml("fx_pause_req")) && !/tabindex="-1"/.test(rowHtml("fx_pause_req")));
  check("Running while a Restart mark waits (fx_restart_note): no button, the note stays", !/data-action/.test(rowHtml("fx_restart_note")) && /Restart requested \d\d:\d\d PST/.test(rowHtml("fx_restart_note")));
  check("The refused row shows its own line with data-row-refused", /data-row-refused[^>]*>Restart refused: ED_2 v4.1.3 has no file</.test(rowHtml("fx_refused")));
  check("GET / draws the Restart button (unit VW77b2) on a Running, a Stopped, and a Completed row, and a Details link on each of them (unit VW77c)", /data-action="restart"/.test(rowHtml("fx_running")) && /data-action="restart"/.test(rowHtml("fx_rule")) && /data-action="restart"/.test(rowHtml("fx_done4")) && !/data-action="restart"/.test(rowHtml("fx_ns")) && !/data-action="restart"/.test(rowHtml("fx_wait_restart")) && ["fx_running", "fx_rule", "fx_done4", "fx_ns", "fx_wait_restart"].every((sl) => new RegExp(`data-details-link="[^"]*"[^>]*href="/monitor/${sl}"`).test(rowHtml(sl))));

  // ---- PST on the Lists tab and the run view (round 81 answer 17)
  r = await get("/runs");
  const rt = visibleText(r.body.replace(/<!--[\s\S]*?-->/g, ""));
  check("Lists tab /runs shows the times in PST: '2026-10-28 23:50 PST' (the end of list 20261029T051152Z, 07:50 UTC)", r.status === 200 && rt.includes("2026-10-28 23:50 PST"), (rt.match(/\d{4}-\d\d-\d\d \d\d:\d\d( PST)?/g) ?? []).slice(0, 6).join(" | "));
  check("Lists tab: every time has the word PST (no 'YYYY-MM-DD HH:MM' without a zone)", !/\d{4}-\d\d-\d\d \d\d:\d\d(?! PST)/.test(rt));
  r = await get("/runs/20261029T051152Z");
  const rv = visibleText(r.body.replace(/<!--[\s\S]*?-->/g, ""));
  check("Run view /runs/<stamp> shows Started and Updated in PST", r.status === 200 && /Started \d{4}-\d\d-\d\d \d\d:\d\d PST/.test(rv) && /Updated 2026-10-28 23:50 PST/.test(rv) && !/\d{4}-\d\d-\d\d \d\d:\d\d(?! PST)/.test(rv), (rv.match(/(Started|Updated) [\d: -]+(PST)?/g) ?? []).join(" | "));

  // ---- Clear mark (unit VW77b2, round 82 answer 10): the Run mark of a book that had no folder, the refused Restart of fx_refused, the Restart mark of fx_wait_restart
  const dc = await api();
  const nsMark = JSON.parse(await fs.readFile(path.join(store, fresh.slug, "request.json"), "utf-8"));
  r = await post(fresh.slug, "clear-mark", { requested_utc: rowOf(dc, fresh.slug).markUtc });
  const nsDone = JSON.parse(await fs.readFile(path.join(store, fresh.slug, "request.done.json"), "utf-8").catch(() => "null"));
  const nsRow = rowOf(await api(), fresh.slug);
  check("Clear mark: the Run mark of the fresh book is cleared: 200, request.json gone, request.done.json holds the mark plus cleared_utc and cleared_by, the row is Not started with Run enabled again", r.status === 200 && !(await exists(path.join(store, fresh.slug, "request.json"))) && JSON.stringify(Object.keys(nsDone)) === JSON.stringify([...Object.keys(nsMark), "cleared_utc", "cleared_by"]) && nsDone.cleared_by === "Monitor dashboard" && nsDone.requested_utc === nsMark.requested_utc && nsRow.label === "Not started" && nsRow.buttons.filter((b) => b.show).map((b) => b.id + (b.enabled ? "" : "~")).join(",") === "run", `status ${r.status} ${r.body} ${nsRow.label}`);
  check("Clear mark: the answer says 'Mark cleared: Run requested HH:MM PST. The book stays Not started. No run starts.'", /^Mark cleared: Run requested \d\d:\d\d PST\. The book stays Not started\. No run starts\.$/.test(parseJson(r.body)?.message ?? ""), r.body);
  r = await post("fx_refused", "clear-mark", {});
  const rfRow = rowOf(await api(), "fx_refused");
  check("Clear mark: the refused Restart of fx_refused is cleared, the book stays Completed with no refusal line, and Restart is enabled again", r.status === 200 && rfRow.group === "Completed" && rfRow.refused === null && rfRow.buttons.filter((b) => b.show).map((b) => b.id + (b.enabled ? "" : "~")).join(",") === "restart", `status ${r.status} ${rfRow.group} ${rfRow.refused}`);
  r = await post("fx_wait_restart", "clear-mark", {});
  check("Clear mark: the Restart mark of fx_wait_restart (Stopped by a Pause) is cleared, the row leaves Waiting for a run and is Stopped again", r.status === 200 && rowOf(await api(), "fx_wait_restart").group === "Stopped");
  check("Clear mark: a second press on the fresh book gives 409 'There is no mark to clear.'", (await post(fresh.slug, "clear-mark", {})).status === 409);
  // unit TF83 (round 83 answer 11, round 84 answer 2): fx_wait_after holds a Run mark with after "restart" (written by the Translator after a Restart). Clear mark is grayed, the route gives 409 with the same words.
  const waf = rowOf(await api(), "fx_wait_after");
  const OFF_AFTER = "Clear mark is off because this mark starts the new run after a Restart.";
  r = await post("fx_wait_after", "clear-mark", {});
  check("Clear mark: the Run mark that a Restart leaves (fx_wait_after) is not cleared: 409 'Clear mark is off because this mark starts the new run after a Restart.', request.json stays, the button shows grayed with the same reason", r.status === 409 && err(r) === OFF_AFTER && (await exists(path.join(store, "fx_wait_after", "request.json"))) && !(await exists(path.join(store, "fx_wait_after", "request.done.json"))) && waf.buttons.find((x) => x.id === "clear")?.show === true && waf.buttons.find((x) => x.id === "clear")?.enabled === false && waf.buttons.find((x) => x.id === "clear")?.reason === OFF_AFTER, `status ${r.status} ${r.body}`);

  // ---- the writes touched only the expected names
  const after = await listing(data);
  // The fake Translator rewrites progress.json and status.json every 3 s and appends history.jsonl (event pause-requested, after a PAUSE file appears). Their sizes change between two reads (flaky before unit VW77b2), so they stay out (HEARTBEAT_FILES, unit TF83).
  const changed = after.filter((x) => !before.includes(x)).filter((x) => !/paired-dataset/.test(x) && !isHeartbeat(x));
  check("The new files in the fixture are request.json, request.done.json, and PAUSE files in book-store/<slug>/ only", changed.length > 0 && changed.every((x) => /book-store\/[A-Za-z0-9_.-]+\/(request\.json|request\.done\.json|PAUSE):\d+$/.test(x)), changed.filter((x) => !/book-store\/[A-Za-z0-9_.-]+\/(request\.json|request\.done\.json|PAUSE):\d+$/.test(x)).join(", "));

  // ---- the monitor off: 404 on both routes
  const off = await startServerWith({ VIEWER_MONITOR: "off" });
  try {
    r = await post("fx_ns", "mark", RUN3);
    const r2 = await post("fx_running", "pause", {});
    const r3 = await post("fx_ns", "mark", RUN3, { ...JSONH, Origin: "http://evil.example" });
    check("Monitor off: the mark route and the pause route give 404 'Not found', also for a foreign Origin (the 404 comes first)", r.status === 404 && r2.status === 404 && r3.status === 404 && err(r) === "Not found", `status ${r.status} ${r2.status} ${r3.status}`);
    const r4 = await post("fx_pause", "mark", RST());
    const r5 = await post("fx_pause", "clear-mark", {});
    const r6 = await get("/api/monitor/books/fx_pause/restart-options");
    check("Monitor off: a Restart press, the clear-mark route, and restart-options give 404 'Not found'", r4.status === 404 && r5.status === 404 && r6.status === 404 && err(r4) === "Not found" && err(r5) === "Not found", `status ${r4.status} ${r5.status} ${r6.status}`);
  } finally {
    off.child.kill("SIGTERM");
    base = off.old;
  }
}

// Rules of the Restart and Clear mark buttons and of the Restart dialog data, without a server (unit VW77b2, round 82).
// lib/book-status-rules.ts (buttons) and lib/restart-rules.ts (quick select rows, notes, facts, the mark bytes). Pure code.
async function monitorRestartTest() {
  const { installTsResolveHook } = await import("./ts-resolve-hook.mjs");
  installTsResolveHook();
  const R = await import("../lib/book-status-rules.ts");
  const X = await import("../lib/restart-rules.ts");
  const NOW = Date.UTC(2026, 10, 2, 8, 0, 0) / 1000;
  const iso = (off) => new Date((NOW + off) * 1000).toISOString().replace(/\.\d+Z$/, "Z");
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const facts = (over = {}) => ({ slug: "mental_full", title: "Making the Difference on the Day", bookPages: 169, status: null, statusUnreadable: false, statusFile: "book-store/mental_full/status.json", pauseExists: false, mark: null, markUnreadable: false, pidAlive: true, runNumber: null, derived: null, phase2Ready: true, refusal: null, ...over });
  const st = (over = {}) => ({ book: "mental_full", phase: "agent-phase-4", state: "running", stop_reason: null, stop_text: null, pid: 4821, heartbeat_utc: iso(-30), running_page: "mental_full/p051", running_boxes: ["TL_2"], last_accepted_page: "mental_full/p050", next_page: "mental_full/p052", pages_done: 50, pages_total: 169, cost_usd_models_phase: 8.3, seconds_phase: 9540, started_utc: iso(-54 * 60), run_id: "2026-11-04T00:15:00-08:00", updated_utc: iso(-30), last_error: null, ...over });
  const pst = (extra = {}) => st({ state: "stopped", pid: null, heartbeat_utc: iso(-3600), updated_utc: "2026-07-10T16:40:00Z", last_accepted_page: "mental_full/p080", next_page: "mental_full/p081", ...extra });
  const mark = (over) => ({ schema: "book-request-v1", book: "mental_full", action: "resume", phase: "agent-phase-4", requested_by: "Monitor dashboard", requested_utc: "2026-07-10T16:40:00Z", ...over });
  const row = (over) => R.buildRow(facts(over), NOW);
  const shown = (x) => x.buttons.filter((b) => b.show).map((b) => b.id + (b.enabled ? "" : "~")).join(",");
  const btn = (x, id) => x.buttons.find((b) => b.id === id);
  let r;

  // ---- the Restart button (VISION 15.29.2, 15.29.3; round 76 answer 5)
  check("Restart: the six buttons come in the order Pause, Restart, Run, Run phase 4, Resume, Clear mark, with their labels", eq(row({ status: st() }).buttons.map((b) => b.id), ["pause", "restart", "run", "run4", "resume", "clear"]) && eq(row({ status: st() }).buttons.map((b) => b.label), ["Pause", "Restart", "Run", "Run phase 4", "Resume", "Clear mark"]));
  r = row({ status: st() });
  check("Restart: a Running row shows Pause and Restart enabled, with Run and Resume grayed (VISION 15.33.3)", shown(r) === "pause,restart,run~,resume~" && btn(r, "restart").reason === null && btn(r, "restart").stateReason === null);
  r = row({ status: st(), pauseExists: true });
  check("Restart: Running with pause requested keeps Restart enabled, Pause is grayed (round 80 answer 12: Restart wins over Pause)", shown(r) === "pause~,restart,run~,resume~");
  for (const [name, over] of [["Stopped by Pause", { status: pst({ stop_reason: "pause" }), pidAlive: false }], ["Stopped by Ctrl-C", { status: pst({ stop_reason: "ctrl-c" }), pidAlive: false }], ["Stopped by failure", { status: pst({ stop_reason: "forward-failure" }), pidAlive: false }], ["Stopped unexpectedly", { status: st({ pid: 99999999, heartbeat_utc: iso(-12 * 60) }), pidAlive: false }], ["Completed in phase 4", { status: st({ state: "completed", phase: "agent-phase-4", pid: null }), pidAlive: false }], ["Stopped with the reason target-reached", { status: pst({ stop_reason: "target-reached" }), pidAlive: false }]]) {
    r = row(over);
    check(`Restart: ${name} shows Restart enabled (round 76 answer 5: every state with a run)`, shown(r).split(",").includes("restart") && btn(r, "restart").enabled === true, shown(r));
  }
  r = row({ status: st({ state: "completed", phase: "agent-phase-3", pid: null }), pidAlive: false });
  check("Restart: Completed in phase 3 shows Restart and Run phase 4", shown(r) === "restart,run4");
  r = row({});
  check("Restart: a Not started book (no status.json) shows no Restart button", shown(r) === "run" && btn(r, "restart").stateReason === "Restart is for a book with a run. This book has no run yet.");
  r = row({ status: st({ state: "not-started", pid: null }) });
  check("Restart: a status.json with the state not-started shows no Restart button", shown(r) === "run");
  r = row({ status: pst({ stop_reason: "pause" }), pidAlive: false, mark: mark({ action: "resume" }) });
  check("Restart: a Waiting for a run row (a Resume mark waits) shows no Restart button (VISION 15.29.3), and Clear mark is there", r.group === "Waiting for a run" && shown(r) === "run~,resume~,clear");
  r = row({ status: null, mark: mark({ action: "run", after: "restart", requested_by: "run program" }) });
  check("Restart: the Run mark that a Restart leaves (no status.json) shows no Restart button, Clear mark shows grayed (unit TF83; old: Clear mark enabled)", shown(r) === "run~,resume~,clear~" && r.markText === "Restart requested 08:40 PST");
  r = row({ status: st(), mark: mark({ action: "restart", prompts: {} }) });
  check("Restart: a Running row while a Restart mark waits shows no button at all (round 79 answer 13), and the 409 reason says so", shown(r) === "" && btn(r, "restart").stateReason === "A Restart is requested already." && btn(r, "clear").show === false);
  r = row({ status: st(), mark: mark({ action: "run", phase: "agent-phase-3" }) });
  check("Restart: a Running row with a Run mark shows Restart grayed: 'A mark waits: Run requested 08:40 PST'", shown(r) === "pause,restart~,run~,resume~" && btn(r, "restart").reason === "A mark waits: Run requested 08:40 PST" && btn(r, "restart").stateReason === null);
  const doneRow = (over) => row({ status: st({ state: "completed", phase: "agent-phase-4", pid: null }), pidAlive: false, ...over });
  const rm = mark({ action: "restart", prompts: {} });
  r = doneRow({ mark: rm, refusal: { reason: "ED_2 v4.1.3 has no file", requested_utc: rm.requested_utc } });
  check("Restart: a refused Restart row shows Restart grayed ('A mark waits: Restart requested 08:40 PST (refused)') and Clear mark enabled", shown(r) === "restart~,run~,resume~,clear" && btn(r, "restart").reason === "A mark waits: Restart requested 08:40 PST (refused)" && btn(r, "clear").enabled === true);
  r = row({ status: null, statusUnreadable: true });
  check("Restart: a Status file unreadable row shows neither Restart nor Clear mark, both carry the reason", shown(r) === "" && btn(r, "restart").stateReason === "The file status.json cannot be read." && btn(r, "clear").stateReason === "The file status.json cannot be read.");
  r = row({ status: null, statusUnreadable: true, mark: mark({ action: "run" }) });
  check("Restart: an unreadable status.json with a mark waiting still shows no Clear mark button", shown(r) === "");
  const pl = R.buildRow(facts({ slug: "left_foot_full", title: "left_foot_full", derived: { listCount: 1, pagesDone: 3, costUsd: 4.5, seconds: 300, lastEventEpoch: NOW - 5000, newest: { stamp: "20261101T000000Z", state: "completed", final: true, updatedEpoch: NOW - 4000, startedEpoch: NOW - 9000, pauseFile: false, chainState: "stopped: interrupted", runningPage: null, runningBoxes: [], anyRunning: false, anyWaiting: false, stopPage: "left_foot_full/p003", nextPage: null, errors: [], forwardFailure: null } } }), NOW);
  check("Restart: a pilot row shows no Restart button (pilot runs do not count toward real runs), reason 'Restart is for a real run. A pilot list is no real run.'", pl.pilot === true && shown(pl) === "run" && btn(pl, "restart").stateReason === "Restart is for a real run. A pilot list is no real run.", shown(pl));

  // ---- the Clear mark button (round 82 answer 10)
  r = row({ status: st(), mark: mark({ action: "run", phase: "agent-phase-3" }) });
  check("Clear mark: a Running row never shows it, and the 409 reason says a process runs", btn(r, "clear").show === false && /^Clear mark is for a book with no live process\. This book runs now \(pid 4821\)$/.test(btn(r, "clear").stateReason ?? ""));
  r = row({ status: pst({ stop_reason: "pause" }), pidAlive: false });
  check("Clear mark: a row with no mark does not show it, stateReason 'There is no mark to clear.'", btn(r, "clear").show === false && btn(r, "clear").stateReason === "There is no mark to clear.");
  r = row({ markUnreadable: true });
  check("Clear mark: an unreadable request.json shows Clear mark, and the dialog words name the file", btn(r, "clear").enabled === true && r.markText === "request.json (cannot be read)" && r.markUtc === null);
  r = row({ mark: mark({ action: "bogus" }) });
  check("Clear mark: a mark with an unknown action shows Clear mark with the words 'request.json (unknown action)'", btn(r, "clear").enabled === true && r.markText === "request.json (unknown action)");
  r = row({ status: pst({ stop_reason: "pause" }), pidAlive: false, mark: mark({ action: "restart", prompts: {} }) });
  check("Clear mark: the row carries the mark in words 'Restart requested 08:40 PST' and its requested_utc for the press", r.markText === "Restart requested 08:40 PST" && r.markUtc === "2026-07-10T16:40:00Z");
  check("Clear mark: a row with no mark has markText and markUtc null", row({}).markText === null && row({}).markUtc === null);

  // ---- unit TF83 (round 83 answer 11 "Gray it out", round 84 answer 2): Clear mark is grayed on the Run mark that a Restart leaves
  const OFF = "Clear mark is off because this mark starts the new run after a Restart.";
  r = row({ status: null, mark: mark({ action: "run", after: "restart", requested_by: "run program" }) });
  check("Clear mark grayed: a Run mark with after 'restart' (book with no status.json) shows Clear mark grayed, the button reason and the 409 reason are the owner text", btn(r, "clear").show === true && btn(r, "clear").enabled === false && btn(r, "clear").reason === OFF && btn(r, "clear").stateReason === OFF, JSON.stringify(btn(r, "clear")));
  r = row({ status: pst({ stop_reason: "restart" }), pidAlive: false, mark: mark({ action: "run", after: "restart", requested_by: "run program", phase: "agent-phase-4" }) });
  check("Clear mark grayed: the same on a Stopped book that holds a Run mark with after 'restart' (Run and Resume wait, Clear mark is off)", btn(r, "clear").show === true && btn(r, "clear").enabled === false && btn(r, "clear").reason === OFF && btn(r, "run").enabled === false && btn(r, "run").reason === "A mark waits: Restart requested 08:40 PST", `${shown(r)} ${btn(r, "clear").reason}`);
  r = row({ status: null, mark: mark({ action: "run", phase: "agent-phase-3" }) });
  check("Clear mark stays active: a plain Run mark (no key after) shows Clear mark enabled with no reason", btn(r, "clear").show === true && btn(r, "clear").enabled === true && btn(r, "clear").reason === null && btn(r, "clear").stateReason === null, JSON.stringify(btn(r, "clear")));
  r = row({ status: null, mark: mark({ action: "run", after: null, phase: "agent-phase-3" }) });
  check("Clear mark stays active: a Run mark with after null shows Clear mark enabled", btn(r, "clear").enabled === true);
  r = row({ status: null, mark: mark({ action: "resume" }) });
  check("Clear mark stays active: a Resume mark and a refused Restart mark keep Clear mark enabled (see the checks above)", btn(r, "clear").enabled === true);
  r = row({ status: st(), mark: mark({ action: "run", after: "restart", requested_by: "run program" }) });
  check("Clear mark grayed: a Running book keeps the older reason (a process runs), the Clear mark button stays hidden", btn(r, "clear").show === false && /^Clear mark is for a book with no live process\./.test(btn(r, "clear").stateReason ?? ""));
  const C = await import("../lib/clear-mark-rule.ts");
  check("Clear mark rule (lib/clear-mark-rule.ts): the text is the owner text, Run with after 'restart' gives it, every other mark and null give null", C.CLEAR_OFF_AFTER_RESTART === OFF && C.clearOffReason({ action: "run", after: "restart" }) === OFF && C.clearOffReason({ action: "run", after: null }) === null && C.clearOffReason({ action: "resume", after: "restart" }) === null && C.clearOffReason({ action: "restart" }) === null && C.clearOffReason(null) === null);

  // ---- the data of the dialog: the owner example (mental_full, ED_2 v4.1.0 to v4.1.6, run 2 with v4.2.0 copied from v4.1.3)
  const T0 = Date.UTC(2026, 10, 4, 8, 15, 0);
  const at = (run1, n) => new Date(T0 + (run1 ? 0 : 86400000 * 3) + n * 600000).toISOString().replace(/\.\d+Z$/, "Z");
  const BOXES = X.BOXES;
  const V = (box, label, over = {}) => ({ box, label, parent: null, updatePoint: null, createdUtc: null, critiqueCount: null, ...over });
  const edUpdates = [[1, 20], [2, 40], [3, 60], [4, 65], [5, 70], [6, 75]];
  const versions = [];
  for (const b of BOXES) versions.push(V(b, "v4.1.0"), V(b, "v4.2.0", { parent: b === "ED_2" ? "v4.1.3" : "v4.1.0" }));
  for (const [u, p] of edUpdates) versions.push(V("ED_2", `v4.1.${u}`, { updatePoint: u, createdUtc: at(true, p + 0) .replace(/:00Z$/, ":30Z"), critiqueCount: u === 6 ? 6 : 5 }));
  versions.push(V("TL_1", "v4.1.1", { updatePoint: "p020", createdUtc: at(true, 20), critiqueCount: 5 }), V("TL_1", "v4.1.2", { updatePoint: "mental_full/p040", createdUtc: at(true, 40), critiqueCount: 5 }));
  versions.push(V("ED_2", "v4.2.1", { updatePoint: 1, createdUtc: at(false, 25).replace(/:00Z$/, ":30Z"), critiqueCount: 5 }), V("ED_2", "v4.2.2", { updatePoint: 2, createdUtc: at(false, 40).replace(/:00Z$/, ":30Z"), critiqueCount: 5 }));
  versions.push(V("ED_2", "v3.2.2"), V("TS_0", "v3.1.0"), V("ED_2", "v5.1.0"), V("ED_2", "v4.1.07"));
  const live = (plan, n) => (b) => { let k = 0; for (const [u, p] of plan[b] ?? []) if (p < n && u > k) k = u; return k; };
  const page = (n, run1, used, over = {}) => ({ id: `mental_full/p${String(n).padStart(3, "0")}`, n, accepted: true, verdict: n % 6 === 0 ? "FAIL" : "PASS", acceptedUtc: at(run1, n), used, ...over });
  const plan1 = { ED_2: edUpdates, TL_1: [[1, 20], [2, 40]] };
  const plan2 = { ED_2: [[1, 25], [2, 40]] };
  const pages1 = [];
  for (let n = 1; n <= 80; n++) pages1.push(page(n, true, Object.fromEntries(BOXES.map((b) => [b, `v4.1.${live(plan1, n)(b)}`]))));
  const pages2 = [];
  for (let n = 1; n <= 50; n++) pages2.push(page(n, false, Object.fromEntries(BOXES.map((b) => [b, `v4.2.${live(plan2, n)(b)}`]))));
  const ptr1 = Object.fromEntries(BOXES.map((b) => [b, b === "ED_2" ? "v4.1.6" : b === "TL_1" ? "v4.1.2" : "v4.1.0"]));
  const ptr2 = Object.fromEntries(BOXES.map((b) => [b, b === "ED_2" ? "v4.2.2" : "v4.2.0"]));
  const input = { phase: "agent-phase-4", versions, runs: [{ run: 2, archive: null, pointers: ptr2, pages: pages2 }, { run: 1, archive: "20261104T001500-0800", pointers: ptr1, pages: pages1 }], previousChosen: { ED_2: ["v4.1.3"], TL_1: ["v4.1.2"] } };
  const o = X.buildRestartOptions(input);
  const ed = o.boxes.find((b) => b.box === "ED_2");
  const edv = (l) => ed.versions.find((v) => v.label === l);
  check("Dialog data: the quick select rows come in the order Starting versions, Last live versions, then run 1 by page, then run 2 by page (DZ78 default 5)", eq(o.quick.map((q) => q.text), ["Starting versions", "Last live versions", "Run 1, after the update point at p020", "Run 1, after the update point at p040", "Run 1, after the update point at p060", "Run 1, after the update point at p065", "Run 1, after the update point at p070", "Run 1, after the update point at p075", "Run 2, after the update point at p025", "Run 2, after the update point at p040"]), o.quick.map((q) => q.text).join(" | "));
  check("Dialog data: 'Starting versions' means the phase start versions v4.1.0 for all 16 boxes, also while run 2 runs (round 80 answer 17)", o.quick[0].id === "start" && BOXES.every((b) => o.quick[0].prompts[b] === "v4.1.0"));
  check("Dialog data: 'Last live versions' are the 16 pointers of the current run (ED_2 v4.2.2, the others v4.2.0)", o.quick[1].prompts.ED_2 === "v4.2.2" && o.quick[1].prompts.TS_0 === "v4.2.0" && Object.keys(o.quick[1].prompts).length === 16);
  const q75 = o.quick.find((q) => q.text === "Run 1, after the update point at p075");
  check("Dialog data: 'Run 1, after the update point at p075' holds ED_2 v4.1.6, TL_1 v4.1.2, and v4.1.0 for the boxes with no update", q75.prompts.ED_2 === "v4.1.6" && q75.prompts.TL_1 === "v4.1.2" && q75.prompts.QA_3 === "v4.1.0" && q75.prompts.TS_0 === "v4.1.0");
  const q50 = o.quick.find((q) => q.text === "Run 1, after the update point at p040");
  check("Dialog data: 'Run 1, after the update point at p040' holds the version that was live then (ED_2 v4.1.2, TL_1 v4.1.2), and 'p020' holds v4.1.1 for both", q50.prompts.ED_2 === "v4.1.2" && q50.prompts.TL_1 === "v4.1.2" && o.quick.find((q) => q.id === "run1-p020").prompts.ED_2 === "v4.1.1" && o.quick.find((q) => q.id === "run1-p020").prompts.TL_1 === "v4.1.1");
  const r2 = o.quick.find((q) => q.id === "run2-p040");
  check("Dialog data: 'Run 2, after the update point at p040' equals 'Last live versions' and both rows stay (DZ78 default 3)", eq(r2.prompts, o.quick[1].prompts));
  check("Dialog data: every quick select row holds the 16 boxes and only labels of the phase", o.quick.every((q) => eq(Object.keys(q.prompts), BOXES) && Object.values(q.prompts).every((l) => /^v4\./.test(l))));
  check("Dialog data: the pick list of ED_2 holds v4.1.0 to v4.1.6 and v4.2.0 to v4.2.2 in order, and no v3.2.2, v5.1.0, or v4.1.07 (same phase only, round 79 answer 8)", eq(ed.versions.map((v) => v.label), ["v4.1.0", "v4.1.1", "v4.1.2", "v4.1.3", "v4.1.4", "v4.1.5", "v4.1.6", "v4.2.0", "v4.2.1", "v4.2.2"]));
  check("Dialog data: TS_0 has v4.1.0 and v4.2.0 only (the v3.1.0 file of another phase stays out)", eq(o.boxes.find((b) => b.box === "TS_0").versions.map((v) => v.label), ["v4.1.0", "v4.2.0"]));
  check("Notes: v4.1.0 'starting version'", edv("v4.1.0").noteText === "starting version");
  check("Notes: v4.1.3 'previous restart version, update after p060' (the order of DZ78 default 1: previous restart before the update note)", edv("v4.1.3").noteText === "previous restart version, update after p060", edv("v4.1.3").noteText);
  check("Notes: v4.1.6 'last version of run 1, update after p075'", edv("v4.1.6").noteText === "last version of run 1, update after p075");
  check("Notes: v4.2.0 'restart start version (copy of v4.1.3)'", edv("v4.2.0").noteText === "restart start version (copy of v4.1.3)");
  check("Notes: v4.2.2 'current live version, update after p040'", edv("v4.2.2").noteText === "current live version, update after p040");
  check("Notes: two notes share one cell in the fixed order (TS_0 v4.1.0 'starting version, last version of run 1'), and the option text is the label, a dot, and the notes", o.boxes.find((b) => b.box === "TS_0").versions[0].noteText === "starting version, last version of run 1" && edv("v4.1.4").optionText === "v4.1.4 · update after p065");
  const tl = o.boxes.find((b) => b.box === "TL_1");
  check("Notes: TL_1 v4.1.2 (update_point as page ID text 'mental_full/p040') reads 'last version of run 1, previous restart version, update after p040'", tl.versions.find((v) => v.label === "v4.1.2").noteText === "last version of run 1, previous restart version, update after p040", tl.versions.find((v) => v.label === "v4.1.2").noteText);
  check("Notes: ED_2 update_point numbers (1 to 6) are no page IDs, so the page comes from created_utc and accepted_utc", edv("v4.1.1").notes.includes("update after p020") && edv("v4.1.5").notes.includes("update after p070"));
  check("Facts: v4.1.3 was live on p061 to p065, 5 pages", edv("v4.1.3").pagesLive === "run 1, p061-p065 (5)", edv("v4.1.3").pagesLive);
  check("Facts: PASS and FAIL counts of those pages (p066 would be FAIL but is not in the span): v4.1.3 5 / 0, v4.1.6 p076-p080 4 / 1", edv("v4.1.3").passFail === "5 / 0" && edv("v4.1.6").passFail === "4 / 1", `${edv("v4.1.3").passFail} ${edv("v4.1.6").passFail}`);
  check("Facts: critiques used 'none' for a start version, a count for an update (v4.1.1 5, v4.1.6 6), and 'none' also for v4.2.0", edv("v4.1.0").critiquesUsed === "none" && edv("v4.1.1").critiquesUsed === "5" && edv("v4.1.6").critiquesUsed === "6" && edv("v4.2.0").critiquesUsed === "none");
  check("Facts: the pages of run 2 name the run: v4.2.2 'run 2, p041-p050 (10)'", edv("v4.2.2").pagesLive === "run 2, p041-p050 (10)", edv("v4.2.2").pagesLive);
  check("Facts: a version that no page used shows 'none' when all page files are readable (here v4.1.07 does not count, TS_0 v4.2.0 was live on p001 to p050 of run 2)", o.boxes.find((b) => b.box === "TS_0").versions[1].pagesLive === "run 2, p001-p050 (50)");
  check("Dialog data: no problem line for a complete store", o.problems.length === 0, o.problems.join(" | "));

  // Not stored: no page records, unreadable run.json, an update point that no page names, a missing start version
  const noPages = X.buildRestartOptions({ ...input, runs: [{ run: 2, archive: null, pointers: ptr2, pages: [] }, { run: 1, archive: "20261104T001500-0800", pointers: ptr1, pages: pages1 }] });
  const e2 = noPages.boxes.find((b) => b.box === "ED_2").versions.find((v) => v.label === "v4.2.2");
  check("Not stored: a run with no page record gives 'Not stored' for pages and PASS / FAIL (v4.2.2), and the other run keeps its facts", e2.pagesLive === "Not stored" && e2.passFail === "Not stored" && noPages.boxes.find((b) => b.box === "ED_2").versions.find((v) => v.label === "v4.1.3").pagesLive === "run 1, p061-p065 (5)");
  const holes = pages1.map((p) => (p.n === 62 ? { ...p, used: null } : p));
  const withHole = X.buildRestartOptions({ ...input, runs: [{ run: 2, archive: null, pointers: ptr2, pages: pages2 }, { run: 1, archive: "20261104T001500-0800", pointers: ptr1, pages: holes }] });
  check("Not stored: a page with no readable run.json is named in the pages of the versions (v4.1.3 'run 1, p061-p065 (4), p062 Not stored')", withHole.boxes.find((b) => b.box === "ED_2").versions.find((v) => v.label === "v4.1.3").pagesLive === "run 1, p061-p065 (4), p062 Not stored", withHole.boxes.find((b) => b.box === "ED_2").versions.find((v) => v.label === "v4.1.3").pagesLive);
  const noCrit = X.buildRestartOptions({ ...input, versions: versions.map((v) => (v.label === "v4.1.4" && v.box === "ED_2" ? { ...v, critiqueCount: null } : v)) });
  check("Not stored: an update version with no critique_ids list shows 'Not stored' in Critiques used", noCrit.boxes.find((b) => b.box === "ED_2").versions.find((v) => v.label === "v4.1.4").critiquesUsed === "Not stored");
  const lost = X.buildRestartOptions({ ...input, versions: versions.map((v) => (v.label === "v4.1.4" && v.box === "ED_2" ? { ...v, createdUtc: null, updatePoint: 4 } : v)) });
  check("Not stored: an update version whose page cannot be found reads 'update, page not stored', gets no quick select row, and the dialog says so", lost.boxes.find((b) => b.box === "ED_2").versions.find((v) => v.label === "v4.1.4").noteText === "update, page not stored" && !lost.quick.some((q) => q.id === "run1-p065") && lost.problems.some((p) => /^ED_2 v4\.1\.4: the page of its update point is not stored/.test(p)), lost.problems.join(" | "));
  const noStart = X.buildRestartOptions({ ...input, versions: versions.filter((v) => !(v.box === "QA_1" && v.label === "v4.1.0")) });
  check("Dialog data: a box with no v4.1.0 file drops the quick select 'Starting versions' and names the box in a problem line", !noStart.quick.some((q) => q.id === "start") && noStart.problems.some((p) => /Starting versions.*QA_1 has no file for v4\.1\.0/.test(p)), noStart.problems.join(" | "));
  const noBox = X.buildRestartOptions({ ...input, versions: versions.filter((v) => v.box !== "TS_3") });
  check("Dialog data: a box with no version at all gets an empty list and a problem line", noBox.boxes.find((b) => b.box === "TS_3").versions.length === 0 && noBox.problems.some((p) => p === "Box TS_3 has no saved version of agent-phase-4."));
  // one update point where every rewrite was rejected twice has no version, so no row: p030 has no ED_2 version
  check("Quick select rows only for update points with a live rewrite: no row for p030 or p080 (no version names them)", !o.quick.some((q) => /p030|p080/.test(q.text)));
  const oneRun = X.buildRestartOptions({ phase: "agent-phase-4", versions: versions.filter((v) => /^v4\.1\./.test(v.label)), runs: [{ run: 1, archive: null, pointers: ptr1, pages: pages1 }], previousChosen: {} });
  check("A quick select row names its run also when the phase has one run only (DZ78 default 4)", oneRun.quick.filter((q) => q.id.startsWith("run")).length === 6 && oneRun.quick.every((q) => q.id.startsWith("run") ? /^Run 1, after the update point at p\d{3}$/.test(q.text) : true) && oneRun.quick[1].prompts.ED_2 === "v4.1.6");
  check("mapProblem: a map that names a label with no file gives words, a good map gives null", X.mapProblem(o, { ...q75.prompts, ED_2: "v4.1.9" }) === "ED_2 v4.1.9 has no file." && X.mapProblem(o, { ...q75.prompts, ED_2: "v4.1.3" }) === null);

  // ---- the mark bytes and the body check
  const pick = { ...q75.prompts, ED_2: "v4.1.3" };
  const bytes = X.restartMarkText("mental_full", "agent-phase-4", pick, "2026-11-05T09:30:00Z");
  const parsed = JSON.parse(bytes);
  check("Restart mark: keys in the order schema, book, action, phase, prompts, requested_utc, requested_by, with ED_2 'v4.1.3' and 15 other labels", eq(Object.keys(parsed), ["schema", "book", "action", "phase", "prompts", "requested_utc", "requested_by"]) && eq(Object.keys(parsed.prompts), BOXES) && parsed.prompts.ED_2 === "v4.1.3" && parsed.prompts.TL_1 === "v4.1.2" && parsed.requested_by === "Monitor dashboard");
  check("Restart mark: json indent 1, one newline at the end, the prompts block indented by 2 spaces (the form of json.dumps(indent=1))", bytes.startsWith('{\n "schema": "book-request-v1",\n "book": "mental_full",\n "action": "restart",\n "phase": "agent-phase-4",\n "prompts": {\n  "TS_0": "v4.1.0",') && bytes.endsWith('"requested_utc": "2026-11-05T09:30:00Z",\n "requested_by": "Monitor dashboard"\n}\n'));
  const body = (over) => ({ phase: "agent-phase-4", prompts: pick, ...over });
  check("Body check: a good body gives null", X.restartBodyProblem(body()) === null);
  check("Body check: a phase outside agent-phase-3 and agent-phase-4 gives words", /^The body needs phase/.test(X.restartBodyProblem(body({ phase: "agent-phase-2" })) ?? "") && /^The body needs phase/.test(X.restartBodyProblem(body({ phase: undefined })) ?? ""));
  check("Body check: prompts that is not a map, or a list, gives words", /^The body needs prompts/.test(X.restartBodyProblem(body({ prompts: "start" })) ?? "") && /^The body needs prompts/.test(X.restartBodyProblem(body({ prompts: [] })) ?? ""));
  const miss = { ...pick };
  delete miss.QA_3;
  check("Body check: 15 boxes give words that name the missing box (QA_3)", X.restartBodyProblem(body({ prompts: miss })) === "prompts must name exactly the 16 boxes. These differ: QA_3.");
  check("Body check: 17 boxes give words that name the extra key", /These differ: ZZ_9\.$/.test(X.restartBodyProblem(body({ prompts: { ...pick, ZZ_9: "v4.1.0" } })) ?? ""));
  check("Body check: a label that is no label (v4.1, 'start', 5, v4.01.0) gives words that name the box", ["v4.1", "start", 5, "v4.01.0", "v1.1.0"].every((l) => /^prompts: box TS_0 has /.test(X.restartBodyProblem(body({ prompts: { ...pick, TS_0: l } })) ?? "")));
  check("Body check: a label of another phase (v3.1.0 in a phase 4 mark) gives words 'must start with v4'", /^prompts: box TS_0 has label v3\.1\.0\. The mark names agent-phase-4, so the label must start with v4\.$/.test(X.restartBodyProblem(body({ prompts: { ...pick, TS_0: "v3.1.0" } })) ?? ""));
  check("Body check: the label of phase 3 is right in a phase 3 mark", X.restartBodyProblem({ phase: "agent-phase-3", prompts: Object.fromEntries(BOXES.map((b) => [b, "v3.2.1"])) }) === null);
  check("Run ID folder (store.py run_id_folder): 2026-11-04T00:15:00-08:00 gives 20261104T001500-0800, another offset or text gives null", X.runIdFolder("2026-11-04T00:15:00-08:00") === "20261104T001500-0800" && X.runIdFolder("2026-07-10T09:00:00-07:00") === null && X.runIdFolder(null) === null);
  check("Page names: p061 from 61, 61 from 'mental_full/p061', null from 'x'", X.pageName(61) === "p061" && X.pageNumberOf("mental_full/p061") === 61 && X.pageNumberOf("p7") === 7 && X.pageNumberOf("x") === null && X.pageNumberOf(60) === null);
  const words = JSON.stringify([o.quick.map((q) => q.text), o.boxes.flatMap((b) => b.versions.map((v) => [v.noteText, v.pagesLive, v.passFail, v.critiquesUsed])), o.problems, row({ status: st(), mark: mark({ action: "run" }) }).buttons.map((b) => [b.reason, b.stateReason])]);
  check("Dialog texts hold no word 'gloss', 'rendering', 'finished', or 'rollback'", !/gloss|rendering|finished|rollback/i.test(words));
}

// Restart and Clear mark on the fixture of restart_fixture.py (unit VW77b2, round 82). Real Translator code made the fixture. The test WRITES into it.
// The first step refuses a fixture folder inside a protected data folder, and a config that names another data folder (unit TF83, scripts/smoke-guards.mjs).
async function monitorRestartApiTest() {
  if (!fixture) throw new Error("Need --fixture DIR");
  const fx = path.resolve(fixture);
  const data = path.join(fx, "data");
  const store = path.join(data, "book-store");
  await mustBeFixture("monitor-restart-api", fx); // unit TF83: from the config, no fixed folder name
  const JSONH = { "Content-Type": "application/json" };
  const post = (slug, kind, body, headers = JSONH) => get(`/api/monitor/books/${slug}/${kind}`, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
  const opts = async (slug) => {
    const r = await get(`/api/monitor/books/${slug}/restart-options`);
    return { status: r.status, j: parseJson(r.body), body: r.body };
  };
  const api = async () => JSON.parse((await get("/api/monitor/books")).body);
  const rowOf = (d, slug) => d.rows.find((x) => x.slug === slug);
  const err = (r) => parseJson(r.body)?.error;
  const exists = async (p) => fs.stat(p).then(() => true, () => false);
  const shown = (x) => x.buttons.filter((b) => b.show).map((b) => b.id + (b.enabled ? "" : "~")).join(",");
  const BOXES = ["TS", "TL", "ED", "QA"].flatMap((s) => [0, 1, 2, 3].map((l) => `${s}_${l}`));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const before = await listing(data);
  let r;

  // ---- GET restart-options: mental_full, run 2 running, run 1 archived (made by restart_run of the Translator)
  let o = await opts("mental_full");
  const j = o.j;
  check("restart-options: mental_full answers 200 with ok, the title, the phase, running true, and the archive folder of the run ID (2026-11-05T09:50:00-08:00)", o.status === 200 && j.ok === true && j.title === "Making the Difference on the Day" && j.phase === "agent-phase-4" && j.running === true && j.stateLabel === "Running" && j.archiveFolder === "20261105T095000-0800", o.body.slice(0, 300));
  check("restart-options: the quick select rows are Starting versions, Last live versions, run 1 at p020 p040 p050 p060 p065 p070 p075, run 2 at p025 p040", same(j.quick.map((q) => q.text), ["Starting versions", "Last live versions", "Run 1, after the update point at p020", "Run 1, after the update point at p040", "Run 1, after the update point at p050", "Run 1, after the update point at p060", "Run 1, after the update point at p065", "Run 1, after the update point at p070", "Run 1, after the update point at p075", "Run 2, after the update point at p025", "Run 2, after the update point at p040"]), j.quick.map((q) => q.text).join(" | "));
  const q = (id) => j.quick.find((x) => x.id === id);
  check("restart-options: the owner example: 'Run 1, after the update point at p075' holds ED_2 v4.1.6, TL_1 v4.1.2, QA_3 v4.1.1 (live then), TS_0 v4.1.0", q("run1-p075").prompts.ED_2 === "v4.1.6" && q("run1-p075").prompts.TL_1 === "v4.1.2" && q("run1-p075").prompts.QA_3 === "v4.1.1" && q("run1-p075").prompts.TS_0 === "v4.1.0" && Object.keys(q("run1-p075").prompts).length === 16);
  check("restart-options: 'Starting versions' is v4.1.0 for all 16 boxes in run 2 (round 80 answer 17), 'Last live versions' is the pointers (ED_2 v4.2.2, TL_1 v4.2.1, QA_3 v4.2.0)", BOXES.every((b) => q("start").prompts[b] === "v4.1.0") && q("last").prompts.ED_2 === "v4.2.2" && q("last").prompts.TL_1 === "v4.2.1" && q("last").prompts.QA_3 === "v4.2.0");
  const box = (b) => j.boxes.find((x) => x.box === b);
  const ver = (b, l) => box(b).versions.find((v) => v.label === l);
  check("restart-options: 16 boxes in the order TS_0 to QA_3, each with a current pointer", same(j.boxes.map((x) => x.box), BOXES) && j.boxes.every((x) => /^v4\.2\./.test(x.current ?? "")));
  check("restart-options: ED_2 holds v4.1.0 to v4.1.6 (archive) and v4.2.0 to v4.2.2 (current run) in order", same(box("ED_2").versions.map((v) => v.label), ["v4.1.0", "v4.1.1", "v4.1.2", "v4.1.3", "v4.1.4", "v4.1.5", "v4.1.6", "v4.2.0", "v4.2.1", "v4.2.2"]));
  check("restart-options: notes from the files of the Translator: v4.1.0 'starting version', v4.1.3 'previous restart version, update after p060' (the history event restart names it), v4.1.6 'last version of run 1, update after p075', v4.2.0 'restart start version (copy of v4.1.3)', v4.2.2 'current live version, update after p040'", ver("ED_2", "v4.1.0").noteText === "starting version" && ver("ED_2", "v4.1.3").noteText === "previous restart version, update after p060" && ver("ED_2", "v4.1.6").noteText === "last version of run 1, update after p075" && ver("ED_2", "v4.2.0").noteText === "restart start version (copy of v4.1.3)" && ver("ED_2", "v4.2.2").noteText === "current live version, update after p040", box("ED_2").versions.map((v) => v.noteText).join(" | "));
  check("restart-options: facts of v4.1.3: pages 'run 1, p061-p065 (5)', PASS / FAIL '5 / 0', critiques '5'", ver("ED_2", "v4.1.3").pagesLive === "run 1, p061-p065 (5)" && ver("ED_2", "v4.1.3").passFail === "5 / 0" && ver("ED_2", "v4.1.3").critiquesUsed === "5");
  check("restart-options: facts of v4.1.0 'run 1, p001-p020 (20)' '17 / 3' 'none', v4.2.2 'run 2, p041-p050 (10)' '8 / 2' '5'", ver("ED_2", "v4.1.0").pagesLive === "run 1, p001-p020 (20)" && ver("ED_2", "v4.1.0").passFail === "17 / 3" && ver("ED_2", "v4.1.0").critiquesUsed === "none" && ver("ED_2", "v4.2.2").pagesLive === "run 2, p041-p050 (10)" && ver("ED_2", "v4.2.2").passFail === "8 / 2" && ver("ED_2", "v4.2.2").critiquesUsed === "5");
  check("restart-options: TL_1 v4.1.1 (update_point 'p020' as text) reads 'update after p020', QA_3 v4.1.1 (the version live at the end of run 1 and picked by the Restart) reads 'last version of run 1, previous restart version, update after p050'", ver("TL_1", "v4.1.1").noteText === "update after p020" && ver("QA_3", "v4.1.1").noteText === "last version of run 1, previous restart version, update after p050", ver("QA_3", "v4.1.1").noteText);
  check("restart-options: no problem line, and the answer holds no Mac path", Array.isArray(j.problems) && j.problems.length === 0 && !/\/Users\/|\/private\/|\/var\/folders/.test(o.body));
  const kx = (await opts("kendo_mix")).j;
  check("restart-options: kendo_mix has a phase 3 run in archive/ (v3.1.x) and phase 4 files: the lists hold labels of phase 4 only (round 79 answer 8)", kx.ok === true && kx.boxes.every((b) => b.versions.every((v) => /^v4\./.test(v.label))) && kx.quick.every((x) => Object.values(x.prompts).every((l) => /^v4\./.test(l))) && same(kx.boxes.find((b) => b.box === "ED_2").versions.map((v) => v.label), ["v4.1.0", "v4.1.1"]) && kx.phase === "agent-phase-4");
  check("restart-options: kendo_mix 'Last live versions' is v4.1.1 for ED_2, and ED_2 v4.1.0 has no 'last version of run' note (the phase 3 archive is not a run of phase 4)", kx.quick.find((x) => x.id === "last").prompts.ED_2 === "v4.1.1" && !/last version of run/.test(kx.boxes.find((b) => b.box === "ED_2").versions.map((v) => v.noteText).join("|")));
  const nf = (await opts("rs_nofacts")).j;
  check("restart-options: rs_nofacts has two page folders with no readable run.json: the pages name them 'Not stored' (p002 and p004)", /Not stored/.test(nf.boxes.find((b) => b.box === "ED_2").versions[0].pagesLive) && /p002/.test(nf.boxes.find((b) => b.box === "ED_2").versions[0].pagesLive), nf.boxes.find((b) => b.box === "ED_2").versions.map((v) => v.pagesLive).join(" | "));
  const dn = (await opts("rs_done")).j;
  check("restart-options: a Completed book (rs_done) answers 200, running false, stateLabel Completed", dn.ok === true && dn.running === false && dn.stateLabel === "Completed" && dn.archiveFolder === "20261104T001500-0800");

  // ---- GET: the 404 and 409 answers
  for (const bad of ["no_such_book", "paired-dataset", "a%20b", "..", "%2e%2e"]) {
    o = await opts(bad);
    // '..' and '%2e%2e' never reach the route: Next answers its own 404 page. The other slugs reach the route and get the JSON body.
    check(`restart-options: slug '${bad}' gives 404${/^\.|%2e/.test(bad) ? "" : " 'Not found'"}`, o.status === 404 && (/^\.|%2e/.test(bad) || o.j?.error === "Not found"), `status ${o.status} ${o.body.slice(0, 80)}`);
  }
  for (const [slug, re, name] of [["rs_ns", /^Restart is for a book with a run\. This book has no run yet\.$/, "a Not started book"], ["rs_pilot", /^Restart is for a real run\. A pilot list is no real run\.$/, "a pilot row"], ["rs_broken", /^The file status\.json cannot be read\.$/, "a broken status.json"], ["rs_running_restart", /^A Restart is requested already\.$/, "a Running book while a Restart waits"]]) {
    o = await opts(slug);
    check(`restart-options: ${name} (${slug}) gives 409 '${o.j?.error}'`, o.status === 409 && re.test(o.j?.error ?? ""), `status ${o.status} ${o.body.slice(0, 120)}`);
  }
  r = await get("/api/monitor/books/mental_full/restart-options", { method: "POST", headers: JSONH, body: "{}" });
  check("restart-options: the route is GET only (POST gives 405)", r.status === 405);
  const afterGets = await listing(data);
  const gDiff = afterGets.filter((x) => !before.includes(x)).concat(before.filter((x) => !afterGets.includes(x))).filter((x) => !/status\.json|progress\.json/.test(x));
  check("restart-options: all the reads wrote no file in the fixture", gDiff.length === 0, gDiff.join(", "));
  // fresh read: a new version file appears and the next answer holds it (no cache)
  const edDir = path.join(store, "rs_done", "prompts", "ED_2");
  const v0 = JSON.parse(await fs.readFile(path.join(edDir, "v4.1.1.json"), "utf-8"));
  await fs.writeFile(path.join(edDir, "v4.1.2.json"), JSON.stringify({ ...v0, version: "v4.1.2", update_point: "p015", critique_ids: ["a", "b", "c", "d", "e", "f", "g"] }, null, 1) + "\n");
  o = await opts("rs_done");
  check("restart-options: a version file that appeared after the first read shows in the next read (no cache), 'update after p015', 7 critiques used", o.j.boxes.find((b) => b.box === "ED_2").versions.some((v) => v.label === "v4.1.2" && v.noteText === "update after p015" && v.critiquesUsed === "7"), o.body.slice(0, 200));
  await fs.rm(path.join(edDir, "v4.1.2.json"));

  // ---- POST restart: every answer before the write
  const p16 = (label) => Object.fromEntries(BOXES.map((b) => [b, label]));
  const RS = (over = {}) => ({ action: "restart", phase: "agent-phase-4", prompts: p16("v4.1.0"), ...over });
  r = await post("rs_done", "mark", RS(), { ...JSONH, Origin: "http://evil.example" });
  check("Restart route: a foreign Origin gives 403 and writes no file", r.status === 403 && err(r) === "Foreign origin." && !(await exists(path.join(store, "rs_done", "request.json"))));
  r = await post("rs_done", "mark", JSON.stringify(RS()), { "Content-Type": "text/plain" });
  check("Restart route: a content type that is not JSON gives 415", r.status === 415 && err(r) === "Send JSON.");
  r = await post("no_such_book", "mark", RS());
  check("Restart route: a slug outside the book set gives 404, before the body check", r.status === 404 && (await post("no_such_book", "mark", "not json")).status === 404);
  r = await post("rs_done", "mark", "not json");
  check("Restart route: a body that is not JSON gives 400", r.status === 400);
  const miss = p16("v4.1.0");
  delete miss.QA_3;
  const bad400 = [
    [RS({ phase: "agent-phase-2" }), /^The body needs phase/, "phase agent-phase-2"],
    [RS({ phase: undefined }), /^The body needs phase/, "no phase"],
    [RS({ prompts: undefined }), /^The body needs prompts/, "no prompts"],
    [RS({ prompts: "start" }), /^The body needs prompts/, "prompts 'start' (the old form)"],
    [RS({ prompts: miss }), /^prompts must name exactly the 16 boxes\. These differ: QA_3\.$/, "15 boxes"],
    [RS({ prompts: { ...p16("v4.1.0"), ZZ_9: "v4.1.0" } }), /These differ: ZZ_9\.$/, "17 boxes"],
    [RS({ prompts: { ...p16("v4.1.0"), ED_2: "latest" } }), /^prompts: box ED_2 has "latest"/, "a label that is no label"],
    [RS({ prompts: { ...p16("v4.1.0"), ED_2: 3 } }), /^prompts: box ED_2 has 3/, "a number as label"],
    [RS({ prompts: { ...p16("v4.1.0"), ED_2: "v3.2.2" } }), /^prompts: box ED_2 has label v3\.2\.2\. The mark names agent-phase-4, so the label must start with v4\.$/, "a label of phase 3 in a phase 4 mark"],
    [RS({ prompts: [] }), /^The body needs prompts/, "prompts as a list"],
  ];
  for (const [body, re, name] of bad400) {
    r = await post("rs_done", "mark", body);
    check(`Restart route: 400 for ${name}: '${err(r)}'`, r.status === 400 && re.test(err(r) ?? ""), `status ${r.status} ${r.body.slice(0, 160)}`);
  }
  check("Restart route: a body array gives 400", (await post("rs_done", "mark", "[]")).status === 400);
  check("Restart route: the 400 checks come before the state checks (a bad body on a Not started book gives 400 too)", (await post("rs_ns", "mark", RS({ prompts: "start" }))).status === 400);
  for (const [slug, re, name] of [["rs_ns", /^Restart is for a book with a run\. This book has no run yet\.$/, "a Not started book"], ["rs_pilot", /^Restart is for a real run\. A pilot list is no real run\.$/, "a pilot row"], ["rs_broken", /^The file status\.json cannot be read\.$/, "a broken status.json"], ["rs_running_restart", /^A Restart is requested already\.$/, "a Running book while a Restart waits"], ["rs_done3", /^Restart must use the phase of the run \(agent-phase-3\)\.$/, "a phase 3 book with a phase 4 mark"]]) {
    r = await post(slug, "mark", RS());
    check(`Restart route: 409 for ${name} (${slug}): '${err(r)}'`, r.status === 409 && re.test(err(r) ?? ""), `status ${r.status} ${r.body.slice(0, 160)}`);
  }
  for (const slug of ["rs_wait_resume", "rs_wait_restart", "rs_refused", "rs_running_runmark"]) {
    r = await post(slug, "mark", RS());
    check(`Restart route: 409 'A mark waits already' on ${slug}`, r.status === 409 && err(r) === "A mark waits already", `status ${r.status} ${r.body.slice(0, 160)}`);
  }
  r = await post("rs_done", "mark", RS({ prompts: { ...p16("v4.1.0"), ED_2: "v4.1.9" } }));
  check("Restart route: a label with no file gives 409 that names the box and the label: 'Box ED_2 has the label v4.1.9, but no file has it. Pick another version.'", r.status === 409 && err(r) === "Box ED_2 has the label v4.1.9, but no file has it. Pick another version.", `status ${r.status} ${r.body}`);
  r = await post("rs_done", "mark", RS({ prompts: p16("v4.2.0") }));
  check("Restart route: v4.2.0 exists in mental_full but not in rs_done: the files of another book do not count (409)", r.status === 409 && /^Box TS_0 has the label v4\.2\.0/.test(err(r) ?? ""));
  check("Restart route: all refused presses wrote no request.json and no .part file", !(await exists(path.join(store, "rs_done", "request.json"))) && !(await exists(path.join(store, "rs_done", "request.json.part"))));

  // ---- POST restart on the Running book: the owner example (quick select p075, ED_2 changed to v4.1.3), a label from the archive folder
  const pick = { ...q("run1-p075").prompts, ED_2: "v4.1.3" };
  const t0 = Date.now();
  r = await post("mental_full", "mark", RS({ prompts: pick }));
  const wj = parseJson(r.body);
  const bytes = await fs.readFile(path.join(store, "mental_full", "request.json"), "utf-8").catch(() => "");
  const want = JSON.stringify({ schema: "book-request-v1", book: "mental_full", action: "restart", phase: "agent-phase-4", prompts: pick, requested_utc: wj?.requested_utc, requested_by: "Monitor dashboard" }, null, 1) + "\n";
  check("Restart route: 200 on the Running book with the picks of the owner example, the answer holds ok, action restart, the press time, and a message", r.status === 200 && wj.ok === true && wj.action === "restart" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(wj.requested_utc) && /^Mark written: Restart requested \d\d:\d\d PST\. The process finishes the current page and its update point, then it archives the run and ends\.$/.test(wj.message), `status ${r.status} ${r.body}`);
  check("Restart route: request.json holds the exact bytes of store.write_mark (keys schema, book, action, phase, prompts in box order, requested_utc, requested_by; indent 1; one newline)", bytes === want && bytes.endsWith("}\n") && !bytes.endsWith("\n\n"), JSON.stringify(bytes.slice(0, 200)));
  check("Restart route: the press time is the clock of the server (within 6 s), and ED_2 holds 'v4.1.3' from the archive folder", Math.abs(Date.parse(wj.requested_utc) - t0) < 6000 && JSON.parse(bytes).prompts.ED_2 === "v4.1.3" && JSON.parse(bytes).prompts.TL_1 === "v4.1.2");
  await fs.copyFile(path.join(store, "mental_full", "request.json"), path.join(fx, "pressed-mental_full-request.json"));
  check("Restart route: no .part file stays in the book folder", !(await exists(path.join(store, "mental_full", "request.json.part"))));
  const d1 = await api();
  const mf = rowOf(d1, "mental_full");
  check("After the press the row stays Running with the note 'Restart requested HH:MM PST' and no button (round 78 answer 10, round 79 answer 13)", mf.group === "Running" && mf.label === "Running" && /^Restart requested \d\d:\d\d PST$/.test(mf.note ?? "") && shown(mf) === "", `${mf.group} ${mf.note} ${shown(mf)}`);
  check("After the press the row of mental_full has markText and markUtc for the Clear mark dialog, but no Clear mark button (a process runs)", /^Restart requested \d\d:\d\d PST$/.test(mf.markText ?? "") && mf.markUtc === wj.requested_utc && mf.buttons.find((b) => b.id === "clear").show === false);
  r = await post("mental_full", "mark", RS({ prompts: pick }));
  check("A second Restart press while the Restart waits: 409 'A Restart is requested already.', the file stays as it was", r.status === 409 && err(r) === "A Restart is requested already." && (await fs.readFile(path.join(store, "mental_full", "request.json"), "utf-8")) === bytes);
  r = await post("mental_full", "clear-mark", {});
  check("Clear mark on the Running book: 409 'Clear mark is for a book with no live process. This book runs now (pid ...)', the mark stays", r.status === 409 && /^Clear mark is for a book with no live process\. This book runs now \(pid \d+\)$/.test(err(r) ?? "") && (await exists(path.join(store, "mental_full", "request.json"))));
  o = await opts("mental_full");
  check("restart-options while the Restart waits: 409 'A Restart is requested already.'", o.status === 409 && o.j.error === "A Restart is requested already.");

  // ---- POST restart on a Completed book: the row moves to Waiting for a run
  r = await post("rs_done", "mark", RS({ prompts: dn.quick.find((x) => x.id === "start").prompts }));
  const dj = parseJson(r.body);
  check("Restart route: 200 on a Completed book (rs_done) with 'Starting versions', the message says an opencode agent runs the restart", r.status === 200 && /^Mark written: Restart requested \d\d:\d\d PST\. An opencode agent runs the restart\.$/.test(dj?.message ?? ""), `status ${r.status} ${r.body}`);
  const dd = rowOf(await api(), "rs_done");
  check("After the press the Completed row moves to Waiting for a run with 'Mark waiting: Restart requested HH:MM PST', no Restart button, Clear mark shown", dd.group === "Waiting for a run" && /^Mark waiting: Restart requested \d\d:\d\d PST$/.test(dd.line2.join("")) && shown(dd) === "run~,resume~,clear", `${dd.group} ${dd.line2.join("")} ${shown(dd)}`);
  r = await post("rs_fail", "mark", RS({ prompts: { ...p16("v4.1.0"), ED_2: "v4.1.1" } }));
  check("Restart route: 200 on a Stopped by failure book (rs_fail) with ED_2 v4.1.1", r.status === 200 && JSON.parse(await fs.readFile(path.join(store, "rs_fail", "request.json"), "utf-8")).prompts.ED_2 === "v4.1.1");
  r = await post("rs_dead", "mark", RS());
  check("Restart route: 200 on a Stopped unexpectedly book (rs_dead)", r.status === 200);
  r = await post("rs_running_pause", "mark", RS());
  const rp = rowOf(await api(), "rs_running_pause");
  check("Restart route: 200 on a Running with pause requested book, the row stays Running with the note", r.status === 200 && rp.group === "Running" && /^Restart requested/.test(rp.note ?? ""));
  r = await post("rs_done3", "mark", RS({ phase: "agent-phase-3", prompts: p16("v3.1.0") }));
  check("Restart route: 200 on a Completed book of phase 3 with labels of phase 3", r.status === 200 && JSON.parse(await fs.readFile(path.join(store, "rs_done3", "request.json"), "utf-8")).phase === "agent-phase-3");

  // ---- Clear mark
  const clearBefore = await listing(data);
  r = await post("rs_wait_restart", "clear-mark", {}, { ...JSONH, Origin: "http://evil.example" });
  check("Clear mark: a foreign Origin gives 403 and the mark stays", r.status === 403 && err(r) === "Foreign origin." && (await exists(path.join(store, "rs_wait_restart", "request.json"))));
  r = await post("rs_wait_restart", "clear-mark", "{}", { "Content-Type": "text/plain" });
  check("Clear mark: a content type that is not JSON gives 415", r.status === 415);
  for (const bad of ["no_such_book", "paired-dataset", "a%20b", ".."]) check(`Clear mark: slug '${bad}' gives 404`, (await post(bad, "clear-mark", {})).status === 404);
  check("Clear mark: the slug check comes before the body check (404 for a bad slug with a bad body)", (await post("no_such_book", "clear-mark", "not json")).status === 404);
  check("Clear mark: a body that is not JSON gives 400, a list gives 400, a number as requested_utc gives 400", (await post("rs_wait_restart", "clear-mark", "not json")).status === 400 && (await post("rs_wait_restart", "clear-mark", "[]")).status === 400 && (await post("rs_wait_restart", "clear-mark", { requested_utc: 5 })).status === 400);
  r = await post("rs_nofacts", "clear-mark", {});
  check("Clear mark: 409 'There is no mark to clear.' on a book with no mark", r.status === 409 && err(r) === "There is no mark to clear.");
  r = await post("rs_running_runmark", "clear-mark", {});
  check("Clear mark: 409 on a Running book with a Run mark (a live process runs it)", r.status === 409 && /^Clear mark is for a book with no live process\./.test(err(r) ?? "") && (await exists(path.join(store, "rs_running_runmark", "request.json"))));
  r = await post("rs_broken", "clear-mark", {});
  check("Clear mark: 409 on a book with a broken status.json", r.status === 409 && err(r) === "The file status.json cannot be read.");
  r = await post("rs_wait_restart", "clear-mark", { requested_utc: "2000-01-01T00:00:00Z" });
  check("Clear mark: a press time that differs from the file gives 409 'The mark changed since the dialog opened. Read the row again.' and the mark stays", r.status === 409 && err(r) === "The mark changed since the dialog opened. Read the row again." && (await exists(path.join(store, "rs_wait_restart", "request.json"))));
  check("Clear mark: the refused presses wrote no request.done.json", !(await exists(path.join(store, "rs_wait_restart", "request.done.json"))) && !(await exists(path.join(store, "rs_nofacts", "request.done.json"))));
  // the refused Restart (rs_refused): the dialog names the mark, the route clears it, the book stays Stopped
  const dr0 = rowOf(await api(), "rs_refused");
  check("Refused Restart row (rs_refused): the group stays Stopped, the second line 'Restart refused: ...', Restart grayed, Clear mark shown; markText 'Restart requested HH:MM PST'", dr0.group === "Stopped" && /^Restart refused: restart mark: box ED_2 has the label v4\.1\.9/.test(dr0.refused ?? "") && shown(dr0) === "restart~,run~,resume~,clear" && /^Restart requested \d\d:\d\d PST$/.test(dr0.markText ?? ""), shown(dr0));
  const markRef = JSON.parse(await fs.readFile(path.join(store, "rs_refused", "request.json"), "utf-8"));
  r = await post("rs_refused", "clear-mark", { requested_utc: dr0.markUtc });
  const cj = parseJson(r.body);
  check("Clear mark on the refused Restart: 200, the message 'Mark cleared: Restart requested HH:MM PST. The book stays Stopped. No run starts.'", r.status === 200 && cj.ok === true && /^Mark cleared: Restart requested \d\d:\d\d PST\. The book stays Stopped\. No run starts\.$/.test(cj.message ?? ""), `status ${r.status} ${r.body}`);
  const doneRef = JSON.parse(await fs.readFile(path.join(store, "rs_refused", "request.done.json"), "utf-8").catch(() => "null"));
  check("Clear mark: request.json is gone, request.done.json holds the mark with two added keys cleared_utc and cleared_by 'Monitor dashboard' (aki-main proposal)", !(await exists(path.join(store, "rs_refused", "request.json"))) && same(Object.keys(doneRef), [...Object.keys(markRef), "cleared_utc", "cleared_by"]) && doneRef.cleared_by === "Monitor dashboard" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(doneRef.cleared_utc) && same(doneRef.prompts, markRef.prompts) && doneRef.requested_utc === markRef.requested_utc);
  check("Clear mark: the history.jsonl of the book is not changed (the Viewer writes no history)", (await fs.readFile(path.join(store, "rs_refused", "history.jsonl"), "utf-8")).trim().split("\n").length === 1);
  check("Clear mark: no .part file stays", (await fs.readdir(path.join(store, "rs_refused"))).every((n) => !n.endsWith(".part")));
  const dr1 = rowOf(await api(), "rs_refused");
  check("After Clear mark the row is Stopped with no refusal line, and Restart, Resume are enabled again, no Clear mark button", dr1.group === "Stopped" && dr1.refused === null && shown(dr1) === "restart,resume", `${dr1.group} ${dr1.refused} ${shown(dr1)}`);
  r = await post("rs_refused", "clear-mark", {});
  check("A second Clear mark press: 409 'There is no mark to clear.'", r.status === 409 && err(r) === "There is no mark to clear.");
  // a refused Restart no longer blocks: a new Restart with a good label is written
  r = await post("rs_refused", "mark", RS());
  check("After Clear mark a new Restart press on rs_refused is written (200)", r.status === 200);
  // Waiting rows
  const w = rowOf(await api(), "rs_wait_restart");
  check("Waiting row (rs_wait_restart): group Waiting for a run, buttons Run and Resume grayed and Clear mark", w.group === "Waiting for a run" && shown(w) === "run~,resume~,clear" && w.baseLabel === "Stopped", shown(w));
  r = await post("rs_wait_restart", "clear-mark", {});
  check("Clear mark with no press time in the body works too (200), and the row leaves Waiting for a run to Stopped", r.status === 200 && rowOf(await api(), "rs_wait_restart").group === "Stopped");
  // Unit TF83 (round 83 answer 11 "Gray it out", round 84 answer 2). Old check: 200 and the mark moved to request.done.json. The button is grayed now and the route refuses with the same words.
  const OFF = "Clear mark is off because this mark starts the new run after a Restart.";
  const wa0 = rowOf(await api(), "rs_wait_after");
  check("Clear mark button on the Run mark that a Restart leaves (rs_wait_after, no status.json): shown grayed with the reason 'Clear mark is off because this mark starts the new run after a Restart.' in the API row", wa0.buttons.find((b) => b.id === "clear")?.show === true && wa0.buttons.find((b) => b.id === "clear")?.enabled === false && wa0.buttons.find((b) => b.id === "clear")?.reason === OFF && shown(wa0) === "run~,resume~,clear~", shown(wa0));
  r = await post("rs_wait_after", "clear-mark", {});
  check("Clear mark route on the Run mark that a Restart leaves (rs_wait_after): 409 with the same words as the button, request.json stays, no request.done.json is written", r.status === 409 && err(r) === OFF && (await exists(path.join(store, "rs_wait_after", "request.json"))) && !(await exists(path.join(store, "rs_wait_after", "request.done.json"))), `status ${r.status} ${r.body}`);
  r = await post("rs_wait_after", "clear-mark", { requested_utc: wa0.markUtc });
  check("Clear mark route on the same mark with its press time in the body: 409 too, the mark stays", r.status === 409 && err(r) === OFF && (await exists(path.join(store, "rs_wait_after", "request.json"))), `status ${r.status} ${r.body}`);
  const wa1 = rowOf(await api(), "rs_wait_after");
  check("After the refused presses the row rs_wait_after is unchanged: Waiting for a run, 'Mark waiting', Clear mark still grayed", wa1.group === "Waiting for a run" && wa1.label === "Mark waiting" && shown(wa1) === "run~,resume~,clear~", `${wa1.group} ${wa1.label} ${shown(wa1)}`);
  r = await post("rs_wait_resume", "clear-mark", {});
  check("Clear mark on a Resume mark (rs_wait_resume): 200, the book stays Stopped by Ctrl-C and shows Resume enabled again", r.status === 200 && rowOf(await api(), "rs_wait_resume").group === "Stopped" && shown(rowOf(await api(), "rs_wait_resume")) === "restart,resume");
  const rawBad = await fs.readFile(path.join(store, "rs_mark_broken", "request.json"), "utf-8");
  r = await post("rs_mark_broken", "clear-mark", {});
  const bd = JSON.parse(await fs.readFile(path.join(store, "rs_mark_broken", "request.done.json"), "utf-8").catch(() => "null"));
  check("Clear mark on a request.json that cannot be read: 200, the text moves into request.done.json under unreadable_text", r.status === 200 && bd?.unreadable_text === rawBad && bd?.cleared_by === "Monitor dashboard" && !(await exists(path.join(store, "rs_mark_broken", "request.json"))));
  check("The writes of the Clear mark routes stay in book-store/<slug>/: request.done.json appears, request.json goes away, nothing else changes", (await listing(data)).filter((x) => !clearBefore.includes(x)).every((x) => /book-store\/[A-Za-z0-9_.-]+\/(request\.json|request\.done\.json):\d+$/.test(x)));

  // ---- first paint: the buttons in the HTML
  const home = await get("/");
  const html = home.body.replace(/<!--.*?-->/g, "");
  const rowHtml = (slug) => (html.match(new RegExp(`<li[^>]*data-book-row="${slug}"[\\s\\S]*?</li>`)) ?? [""])[0];
  check("GET / draws Restart on Stopped (kendo_mix), Stopped by failure (rs_fail is Waiting now: rs_nofacts is Stopped), Completed phase 3 (rs_done3 waits), no Restart on rs_ns and rs_pilot", /data-action="restart"/.test(rowHtml("kendo_mix")) && /data-action="restart"/.test(rowHtml("rs_nofacts")) && !/data-action="restart"/.test(rowHtml("rs_ns")) && !/data-action="restart"/.test(rowHtml("rs_pilot")) && !/data-action="restart"/.test(rowHtml("rs_fail")));
  check("GET / draws Clear mark on a Waiting row (rs_done) and no button on the Running row with a Restart mark (mental_full)", /data-action="clear"/.test(rowHtml("rs_done")) && !/data-action/.test(rowHtml("mental_full")) && /Restart requested \d\d:\d\d PST/.test(rowHtml("mental_full")));
  check("GET / draws Restart grayed with the reason in words on the Running row with a Run mark (rs_running_runmark)", /<button[^>]*data-action="restart"[^>]*aria-disabled="true"[^>]*title="A mark waits: Run requested \d\d:\d\d PST"/.test(rowHtml("rs_running_runmark")) || /<button[^>]*aria-disabled="true"[^>]*data-action="restart"[^>]*title="A mark waits: Run requested/.test(rowHtml("rs_running_runmark")), rowHtml("rs_running_runmark").slice(0, 500));

  // ---- the monitor off: 404 on the three routes
  const off = await startServerWith({ VIEWER_MONITOR: "off" });
  try {
    const a = await get("/api/monitor/books/rs_done3/restart-options");
    const b = await post("rs_nofacts", "mark", RS());
    const c = await post("rs_wait_resume", "clear-mark", {}, { ...JSONH, Origin: "http://evil.example" });
    check("Monitor off: restart-options, the Restart press, and Clear mark give 404 'Not found' (also with a foreign Origin: the 404 comes first)", a.status === 404 && b.status === 404 && c.status === 404 && err(c) === "Not found", `${a.status} ${b.status} ${c.status}`);
  } finally {
    off.child.kill("SIGTERM");
    base = off.old;
  }
}

// Details view of one book `/monitor/<slug>` (unit VW77c, round 86). Needs the fixture of restart_fixture.py --details (real Translator code made it). Reads only.
// The Python side: critique_share and double_reject_row of translator/critique_queue.py, run from --t2-scripts (the snapshot of <T2>/data/scripts). No model call.
async function detailsTest() {
  if (!fixture) throw new Error("Need --fixture DIR");
  const t2s = opt("--t2-scripts");
  if (!t2s) throw new Error("Need --t2-scripts DIR (the folder data/scripts of the Translator, or a snapshot of it)");
  const fx = path.resolve(fixture);
  const data = path.join(fx, "data");
  await mustBeFixture("details", fx);
  const before = await listing(data);
  const { installTsResolveHook } = await import("./ts-resolve-hook.mjs");
  installTsResolveHook();
  const CS = await import("../lib/critique-share.ts");
  const BD = await import("../lib/book-detail-rules.ts");
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const api = async (slug) => {
    const r = await get(`/api/monitor/books/${slug}`);
    return { status: r.status, j: parseJson(r.body), body: r.body, type: r.type };
  };
  const page = async (slug) => {
    const r = await get(`/monitor/${slug}`);
    const html = r.body.replace(/<!--.*?-->/g, "");
    return { status: r.status, html, text: visibleText(html).trim() };
  };
  const py = (code, input) => JSON.parse(execFileSync("python3", ["-B", "-c", code, t2s], { input: JSON.stringify(input), encoding: "utf-8", maxBuffer: 1 << 26, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } }));
  const history = async (slug) => (await fs.readFile(path.join(data, "book-store", slug, "history.jsonl"), "utf-8")).split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

  // ---- pure code: Python round(x, 1) against pyRound1
  const xs = [];
  for (let k = 0; k <= 1600; k++) xs.push(k / 16);
  for (let t = 1; t <= 80; t++) for (let u = 0; u <= t; u++) xs.push((100.0 * u) / t);
  const pyr = py("import sys, json\nxs = json.load(sys.stdin)\nprint(json.dumps([round(x, 1) for x in xs]))", xs);
  let bad = 0;
  let firstBad = "";
  xs.forEach((x, i) => {
    if (CS.pyRound1(x) !== pyr[i]) {
      bad++;
      if (!firstBad) firstBad = `${x}: js ${CS.pyRound1(x)} py ${pyr[i]}`;
    }
  });
  check(`pyRound1 gives the same value as Python round(x, 1) for ${xs.length} values (ties like 6.25 and 93.75 included)`, bad === 0, firstBad);
  check("pyRound1 ties: 6.25 gives 6.2, 93.75 gives 93.8, 66.66666666666667 gives 66.7, 0.05 gives 0.1 (the same as Python)", CS.pyRound1(6.25) === 6.2 && CS.pyRound1(93.75) === 93.8 && CS.pyRound1(100 * 2 / 3) === 66.7 && CS.pyRound1(0.05) === 0.1);

  // ---- pure code: critique share against critique_queue.critique_share on the fixture histories and on made-up events
  const SHARE_PY = "import sys, json\nsys.dont_write_bytecode = True\nsys.path.insert(0, sys.argv[1])\nfrom translator import critique_queue as CQ\nsets = json.load(sys.stdin)\nprint(json.dumps([{'share': CQ.critique_share(ev), 'rows': {b: CQ.double_reject_row(ev, b) for b in ('ED_2', 'TL_1', 'QA_3')}} for ev in sets]))";
  const mk = (event, o = {}) => ({ utc: "2026-11-03T10:00:00Z", event, ...o });
  const ids = (n) => Array.from({ length: n }, (_, i) => `x:${i}`);
  const made = [
    [mk("update-point-ended", { box: "ED_2", result: "rejected twice", queue_ids: ids(4) }), mk("restart"), mk("update-point-ended", { box: "TL_1", result: "rewrite live", queue_ids: ids(5) }), mk("update-point-ended", { box: "ED_2", result: "rejected twice", queue_ids: ids(1) }), mk("update-point-ended", { box: "ED_2", result: "rewrite live", queue_ids: ids(15) })],
    [mk("update-point-ended", { box: "QA_3", result: "rewrite live", queue_ids: [] }), mk("phase-changed"), mk("update-point-ended", { box: "QA_3", result: "rewrite live", queue_ids: ids(1) }), mk("update-point-ended", { box: "QA_3", result: "rejected twice", queue_ids: ids(15) }), mk("update-point-ended", { box: "TL_1", result: "other", queue_ids: ids(2) })],
    [],
    [mk("update-point-ended", { box: "ED_2", result: "rejected twice", queue_ids: ids(5) }), mk("box-stopped", { box: "ED_2", reason: "rule", count: 1 }), mk("resumed"), mk("update-point-ended", { box: "ED_2", result: "rejected twice", queue_ids: ids(5) })],
  ];
  const sets = [await history("mental_full"), await history("left_foot_full"), ...made];
  const pyOut = py(SHARE_PY, sets);
  sets.forEach((ev, i) => {
    const ts = CS.critiqueShare(ev);
    const name = i === 0 ? "mental_full (fixture history)" : i === 1 ? "left_foot_full (fixture history)" : `made-up events ${i - 1}`;
    check(`Critique share, ${name}: same boxes, same order, same numbers and percentages as critique_share of the Translator`, eq(Object.keys(ts.boxes), Object.keys(pyOut[i].share.boxes)) && eq(ts.boxes, pyOut[i].share.boxes) && eq(ts.total, pyOut[i].share.total), JSON.stringify(ts.total) + " / " + JSON.stringify(pyOut[i].share.total));
  });
  const ex = CS.critiqueShare(sets[0]);
  check("Critique share, mental_full: ED_2 10 of 15 (66.7 percent) used and 5 of 15 (33.3 percent) dropped, TL_1 5 of 5 (100.0 percent) and 0 of 5 (0.0 percent), QA_3 1 of 16 (6.2 percent) and 15 of 16 (93.8 percent). The update point of run 1 is not counted",
    CS.shareText(ex.boxes.ED_2.used, ex.boxes.ED_2.total, ex.boxes.ED_2.used_percent) === "10 of 15 (66.7 percent)" && CS.shareText(ex.boxes.ED_2.dropped, ex.boxes.ED_2.total, ex.boxes.ED_2.dropped_percent) === "5 of 15 (33.3 percent)" &&
    CS.shareText(ex.boxes.TL_1.used, ex.boxes.TL_1.total, ex.boxes.TL_1.used_percent) === "5 of 5 (100.0 percent)" && CS.shareText(ex.boxes.TL_1.dropped, ex.boxes.TL_1.total, ex.boxes.TL_1.dropped_percent) === "0 of 5 (0.0 percent)" &&
    CS.shareText(ex.boxes.QA_3.used, ex.boxes.QA_3.total, ex.boxes.QA_3.used_percent) === "1 of 16 (6.2 percent)" && CS.shareText(ex.boxes.QA_3.dropped, ex.boxes.QA_3.total, ex.boxes.QA_3.dropped_percent) === "15 of 16 (93.8 percent)", JSON.stringify(ex.boxes));
  check("Critique share text: a box with no critique reads '0 of 0' and has no percentage", CS.shareText(0, 0, null) === "0 of 0");

  // ---- pure code: the stop flag against double_reject_row
  const lf = CS.stopFlags(sets[1]);
  check("Stop flag, left_foot_full: one flag, box ED_2, count 3, text 'ED_2 stopped after 3 double REJECTs in a row', and the count equals double_reject_row of the Translator", lf.length === 1 && lf[0].box === "ED_2" && lf[0].count === 3 && lf[0].text === "ED_2 stopped after 3 double REJECTs in a row" && pyOut[1].rows.ED_2 === 3 && lf[0].rejects.length === 3);
  const lines = lf.length ? CS.rejectLines(lf[0]) : [];
  check("Stop flag: the 3 reasons are the reasons of the last try of each double REJECT, with the page, the try, and the names of the failed checks", eq(lines, [
    { head: "After p020, try 2, check audit", reasons: ["AUDIT FAIL: the new text drops the rule for term lists."] },
    { head: "After p030, try 2, check audit", reasons: ["AUDIT FAIL: the new text keeps a critique that the judge marked as a bad critique."] },
    { head: "After p040, try 2, checks message-rebuild and audit", reasons: ["MESSAGE REBUILD FAIL: page left_foot_full/p038, box ED_2: section 3 does not hold the new label and the new text.", "AUDIT FAIL: the new text changes the output format."] },
  ]), JSON.stringify(lines));
  check("Stop flag: no flag for mental_full (no box-stopped event)", CS.stopFlags(sets[0]).length === 0);
  const withResume = [...sets[1], mk("resumed")];
  const pyAfter = py(SHARE_PY, [withResume])[0];
  check("Stop flag: a 'resumed' event after the box stop removes the flag, and the Translator row of ED_2 goes back to 0", CS.stopFlags(withResume).length === 0 && pyAfter.rows.ED_2 === 0);
  const pauseResume = [...sets[1].filter((e) => e.event !== "box-stopped" && e.event !== "stopped"), mk("stopped", { reason: "pause" }), mk("resumed")];
  check("Stop flag: with no box-stopped event there is no flag, and the Translator row keeps its 3 (a Pause and a Resume leave the row alone)", CS.stopFlags(pauseResume).length === 0 && py(SHARE_PY, [pauseResume])[0].rows.ED_2 === 3);
  const afterRewrite = [...sets[1].slice(0, -2), mk("update-point-ended", { box: "TL_1", result: "rewrite live", queue_ids: ids(5) })];
  check("Stop flag: a restart event hides an older flag (the flag belongs to the current run)", CS.stopFlags([...sets[1], mk("restart")]).length === 0 && afterRewrite.length > 0);
  const old = { event: "prompt-rejected", box: "ED_2", try: 2, check: "audit", reasons: ["AUDIT FAIL: x."] };
  const oldForm = CS.stopFlags([mk("update-point-started", { box: "ED_2", page: "b/p010", queue_ids: ["q"] }), old, mk("update-point-ended", { box: "ED_2", result: "rejected twice", queue_ids: ["q"] }), mk("box-stopped", { box: "ED_2", count: 1 })]);
  check("Stop flag: an old event with the field check and no field checks still names its check", oldForm.length === 1 && CS.rejectLines(oldForm[0])[0].head === "After p010, try 2, check audit");

  // ---- pure code: archived runs, settings, critiques
  check("Run ID text: folder 20261104T001500-0800 reads '2026-11-04 00:15 PST', the summer folder 20260710T080000-0800 reads '2026-07-10 08:00 PST'", BD.archiveRunText("20261104T001500-0800").text === "2026-11-04 00:15 PST" && BD.archiveRunText("20260710T080000-0800").text === "2026-07-10 08:00 PST" && BD.archiveRunText("20261104T001500-0800").isRunId);
  check("Run ID text: the old UTC form 20261105T093000Z and a folder name in no known form stay as plain text", BD.archiveRunText("20261105T093000Z").text === "20261105T093000Z" && !BD.archiveRunText("20261105T093000Z").isRunId && BD.archiveRunText("old-run").text === "old-run" && BD.archiveRunText("20261304T001500-0800").text === "20261304T001500-0800");
  check("Prompt cells: only the changed boxes show, 'ED_2 v4.1.0, TL_1 v4.1.0' at the start and 'ED_2 v4.1.6, TL_1 v4.1.2' at the end (the example of VISION 15.27.5)", eq(BD.promptsCells({ ED_2: "v4.1.0", TL_1: "v4.1.0", QA_3: "v4.1.0" }, { ED_2: "v4.1.6", TL_1: "v4.1.2", QA_3: "v4.1.0" }), { start: "ED_2 v4.1.0, TL_1 v4.1.0", end: "ED_2 v4.1.6, TL_1 v4.1.2" }));
  check("Prompt cells: no change reads 'No update, all boxes keep their label v4.1.0' on both cells, a missing map reads 'Not stored'", BD.promptsCells({ ED_2: "v4.1.0" }, { ED_2: "v4.1.0" }).end === "No update, all boxes keep their label v4.1.0" && BD.promptsCells(null, null).start === "Not stored" && BD.promptsCells(null, { ED_2: "v4.1.1" }).start === "Not stored" && BD.promptsCells(null, { ED_2: "v4.1.1" }).end === "ED_2 v4.1.1");
  check("Pages done text: '80 of 169', '80' with no total, 'Not stored' with no count", BD.pagesDoneText(80, 169) === "80 of 169" && BD.pagesDoneText(80, null) === "80" && BD.pagesDoneText(null, 169) === "Not stored");
  const f = (page, n, models, sha) => ({ pageId: `b/${page}`, page, byType: { TS: { critiques: 1, reached: false }, TL: { critiques: 3, reached: true } }, n, models, settingsSha1: sha });
  const rowsS = BD.settingsRows([f("p003", 2, "L0 a", "s1"), f("p001", 2, "L0 a", "s1"), f("p002", 2, "L0 a", "s1"), f("p004", 3, "L0 a", "s1"), f("p005", 3, "L0 b", "s1"), f("p006", 3, "L0 b", "s1")]);
  check("Settings used: pages sort by page number, the mark 'Settings changed before this page' sits on p004 (N changed) and p005 (models changed), not on p001 or p006", eq(rowsS.map((r) => r.page), ["p001", "p002", "p003", "p004", "p005", "p006"]) && eq(rowsS.map((r) => r.changed), [false, false, false, true, true, false]) && BD.SETTINGS_CHANGED_TEXT === "Settings changed before this page");
  const cr = BD.critiqueRows([f("p002", 2, null, null), f("p001", 2, null, null)]);
  const ct = BD.critiqueTotals(cr);
  check("Critiques against N: rows in page order with a star flag where the count reached N, the total row sums each box type (TS 2, TL 6, ED 0, QA 0) and N = 2", eq(cr.map((r) => r.page), ["p001", "p002"]) && cr[0].reached.TL === true && cr[0].reached.TS === false && eq(ct.counts, { TS: 2, TL: 6, ED: 0, QA: 0 }) && ct.n === 2 && !ct.nMixed && BD.critiqueTotals([...cr, ...BD.critiqueRows([f("p003", 3, null, null)])]).nMixed === true);
  check("Models text: 'L0 antigravity-gemini-3.8-flash-high high, L1 claude-haiku-5-5 xhigh, critic claude-opus-5-5 medium' from the models block, null for no block", BD.modelsText({ level_0: ["google/antigravity-gemini-3.8-flash-high", "high"], level_1: ["anthropic/claude-haiku-5-5", "xhigh"], "box-critic": ["anthropic/claude-opus-5-5", "medium"] }) === "L0 antigravity-gemini-3.8-flash-high high, L1 claude-haiku-5-5 xhigh, critic claude-opus-5-5 medium" && BD.modelsText(null) === null);
  check("Fixed texts: 'No error stored for this book.' (VISION 15.24.5)", BD.NO_ERROR_TEXT === "No error stored for this book.");

  // ---- the Monitor dashboard `/`: the link Details on each row
  const list = parseJson((await get("/api/monitor/books")).body);
  const home = await get("/");
  const homeHtml = home.body.replace(/<!--.*?-->/g, "");
  const rowHtml = (slug) => (homeHtml.match(new RegExp(`<li[^>]*data-book-row="${slug}"[\\s\\S]*?</li>`)) ?? [""])[0];
  const linkOf = (slug) => /<a[^>]*data-details-link="[^"]*"[^>]*href="([^"]+)"[^>]*>Details<\/a>/.exec(rowHtml(slug))?.[1];
  const missing = list.rows.filter((r) => linkOf(r.slug) !== `/monitor/${r.slug}`).map((r) => r.slug);
  check(`GET / draws the link Details on every one of the ${list.rows.length} rows, with href /monitor/<slug>`, home.status === 200 && list.rows.length > 15 && missing.length === 0, missing.join(", "));
  check("GET / gives the link Details to the kinds of rows: Running, Stopped, Stopped by failure, Completed, Not started, Mark waiting, a pilot row, a broken status.json", ["mental_full", "rs_done3", "rs_fail", "rs_done", "rs_ns", "rs_wait_resume", "rs_pilot", "rs_broken"].every((s) => linkOf(s) === `/monitor/${s}`));
  check("Running row while a Restart waits (rs_running_restart): no button and the link Details stays (round 80 answer 18)", !/data-action/.test(rowHtml("rs_running_restart")) && linkOf("rs_running_restart") === "/monitor/rs_running_restart" && /Restart requested \d\d:\d\d PST/.test(rowHtml("rs_running_restart")));
  check("The link Details is a plain link, not a button, and it sits outside the buttons (data-col details)", /<div[^>]*data-col="details"[^>]*><a /.test(rowHtml("mental_full")) && !/<button[^>]*>Details</.test(homeHtml));

  // ---- the title link (unit TF85, owner round 87 answer 9 "Title opens Details (Recommended)"; VISION 15.24.4.7, line 4017)
  const tagsOf = (slug, attr) => rowHtml(slug).match(new RegExp(`<a\\b[^>]*\\b${attr}\\b[^>]*>`, "g")) ?? [];
  const hrefOf = (tag) => /href="([^"]*)"/.exec(tag ?? "")?.[1];
  const badTitle = list.rows.filter((r) => tagsOf(r.slug, "data-title-link").length !== 1 || tagsOf(r.slug, "data-details-link").length !== 1 || hrefOf(tagsOf(r.slug, "data-title-link")[0]) !== `/monitor/${encodeURIComponent(r.slug)}` || hrefOf(tagsOf(r.slug, "data-title-link")[0]) !== hrefOf(tagsOf(r.slug, "data-details-link")[0])).map((r) => r.slug);
  check(`GET / gives each of the ${list.rows.length} rows exactly one title link (data-title-link) and exactly one link Details, both with the href /monitor/<slug>`, list.rows.length > 15 && badTitle.length === 0, badTitle.join(", "));
  const titleText = (slug) => (/<a\b[^>]*\bdata-title-link\b[^>]*>([\s\S]*?)<\/a>/.exec(rowHtml(slug))?.[1] ?? "").replace(/<[^>]*>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const badText = list.rows.filter((r) => titleText(r.slug) !== (r.title !== r.slug ? `${r.title} (${r.slug})` : r.slug)).map((r) => r.slug);
  check("The title link keeps the visible text of the old title: 'Making the Difference on the Day (mental_full)' for a row with a title, the slug alone for a row with no title (old: plain text, no link)", titleText("mental_full") === "Making the Difference on the Day (mental_full)" && badText.length === 0, `${badText.join(", ")} / ${titleText("mental_full")}`);
  const mh = rowHtml("mental_full"), rr = rowHtml("rs_running_restart");
  check("The title link comes first in the row, before the buttons and before the link Details (Tab order, VISION 15.24.4.7), and it holds no button", mh.indexOf("data-title-link") > 0 && mh.indexOf("data-title-link") < mh.indexOf("<button") && mh.indexOf("<button") < mh.indexOf("data-details-link") && !/<a\b[^>]*\bdata-title-link\b[^>]*>(?:(?!<\/a>)[\s\S])*<button/.test(mh) && rr.indexOf("data-title-link") > 0 && rr.indexOf("data-title-link") < rr.indexOf("data-details-link"));
  check("The title link is not inside the cell of the link Details (data-col details), so the link Details stays a second door (round 87 answer 8, D1)", !/data-col="details"[^>]*>(?:(?!<\/div>)[\s\S])*data-title-link/.test(mh));

  // ---- the route
  let a = await api("mental_full");
  check("GET /api/monitor/books/mental_full gives 200 JSON with ok, generatedAt, the row, and the parts", a.status === 200 && a.type.includes("json") && a.j?.ok === true && typeof a.j.generatedAt === "number" && a.j.row?.slug === "mental_full" && ["lists", "critiques", "settings", "archived", "flags"].every((k) => Array.isArray(a.j[k])), `status ${a.status} ${a.body.slice(0, 200)}`);
  check("The route answers a row equal to the row of /api/monitor/books (same label, group, buttons, sentence)", eq(a.j.row.buttons, list.rows.find((r) => r.slug === "mental_full").buttons) && a.j.row.label === "Running" && a.j.row.group === "Running");
  check("The answer holds no Mac path", !/\/Users\/|\/private\/var|\/var\/folders/.test(a.body));
  const share = a.j.share;
  check("API share of mental_full equals critique_share of the Translator, box by box", eq(share.boxes, pyOut[0].share.boxes) && eq(share.total, pyOut[0].share.total) && eq(Object.keys(share.boxes), ["ED_2", "TL_1", "QA_3"]));
  check("API archived runs of mental_full: the folder 20261104T001500-0800 (made by restart_run) reads '2026-11-04 00:15 PST', phase agent-phase-4, '80 of 169', the old folder 20261105T093000Z stays plain text with its own phase and '80 of 169'", a.j.archived.length === 2 && a.j.archived[0].folder === "20261104T001500-0800" && a.j.archived[0].runText === "2026-11-04 00:15 PST" && a.j.archived[0].runIdForm === true && a.j.archived[0].phase === "agent-phase-4" && a.j.archived[0].pagesText === "80 of 169" && a.j.archived[1].folder === "20261105T093000Z" && a.j.archived[1].runText === "20261105T093000Z" && a.j.archived[1].runIdForm === false && a.j.archived[1].pagesText === "80 of 169", JSON.stringify(a.j.archived.map((x) => [x.folder, x.runText, x.phase, x.pagesText])));
  check("API archived run 1: prompts at start 'TL_1 v4.1.0, ED_2 v4.1.0, QA_3 v4.1.0' (run.json of p001), prompts at end 'TL_1 v4.1.2, ED_2 v4.1.6, QA_3 v4.1.1' (pointer files of the archive)", a.j.archived[0].promptsStart === "TL_1 v4.1.0, ED_2 v4.1.0, QA_3 v4.1.0" && a.j.archived[0].promptsEnd === "TL_1 v4.1.2, ED_2 v4.1.6, QA_3 v4.1.1", `${a.j.archived[0].promptsStart} | ${a.j.archived[0].promptsEnd}`);
  check("API archived run 2 (old folder, no pointer files, no page records): prompts read 'Not stored'", a.j.archived[1].promptsStart === "Not stored" && a.j.archived[1].promptsEnd === "Not stored");
  check("API list folders of mental_full: one fold 20261105T175000Z, kind list (the run view treats only a chain list as chain), critic mode separate, book jobs 1, state running", a.j.lists.length === 1 && a.j.lists[0].stamp === "20261105T175000Z" && a.j.lists[0].listKind === "list" && a.j.lists[0].criticMode === "separate" && a.j.lists[0].bookJobs === 1 && a.j.lists[0].state === "running", JSON.stringify(a.j.lists.map((l) => [l.stamp, l.listKind, l.criticMode, l.bookJobs, l.state, l.pages.length])));
  check("API list folder rows: 51 page rows, p051 running with TL_2, QA_3 verdicts from summary.json (p006 FAIL, p001 PASS), pairs from the list summary", a.j.lists[0].pages.length === 51 && a.j.lists[0].pages[50].state === "running" && eq(a.j.lists[0].pages[50].running, ["TL_2"]) && a.j.lists[0].pages[5].qa3Verdict === "FAIL" && a.j.lists[0].pages[0].qa3Verdict === "PASS" && a.j.lists[0].pages[0].pairs === 5 && a.j.lists[0].live === true);
  // sums from the fixture files, independent of the Viewer code
  const sums = { TS: 0, TL: 0, ED: 0, QA: 0 };
  for (let n = 1; n <= 50; n++) {
    const sm = JSON.parse(await fs.readFile(path.join(data, "pilot-run", `mental_full_p${String(n).padStart(3, "0")}`, "r2", "summary.json"), "utf-8"));
    for (const t of Object.keys(sums)) sums[t] += sm.critiques_by_box_type[t].critiques;
  }
  check("API critiques: 50 rows of the current run (r2 folders, from the page records), the total of each box type equals the sum of the summary.json files of the fixture", a.j.critiques.length === 50 && eq(BD.critiqueTotals(a.j.critiques).counts, sums) && BD.critiqueTotals(a.j.critiques).nMixed === true, JSON.stringify(sums));
  check("API critiques: the star flag follows reached_N of the file (p005 ED 0 no star, p003 TL 3 with N 2 star, p033 TL 1 with N 3 no star)", a.j.critiques[2].reached.TL === true && a.j.critiques[4].reached.ED === false && a.j.critiques[32].reached.TL === false && a.j.critiques[0].n === 2 && a.j.critiques[40].n === 3);
  check("API settings: the mark 'Settings changed' sits on p031 only (N 2 to 3 and the models of level 1 changed)", a.j.settings.length === 50 && eq(a.j.settings.filter((s) => s.changed).map((s) => s.page), ["p031"]) && /^L0 antigravity-gemini-3\.8-flash-high high, L1 claude-haiku-5-5 xhigh, critic claude-opus-5-5 medium$/.test(a.j.settings[0].models ?? ""), JSON.stringify(a.j.settings.filter((s) => s.changed)));
  check("API flags of mental_full is empty, last error is null", a.j.flags.length === 0 && a.j.lastError === null);

  let b = await api("left_foot_full");
  check("API left_foot_full: Stopped by failure, one flag ED_2 with 3 rejects, share ED_2 5 of 20 used and 15 of 20 dropped, TL_1 5 of 5, and the same numbers as critique_share of the Translator", b.status === 200 && b.j.row.label === "Stopped by failure" && b.j.flags.length === 1 && b.j.flags[0].rejects.length === 3 && eq(b.j.share.boxes, pyOut[1].share.boxes) && b.j.share.boxes.ED_2.used === 5 && b.j.share.boxes.ED_2.dropped === 15 && b.j.share.boxes.TL_1.used === 5, JSON.stringify(b.j.share?.boxes));
  check("API left_foot_full: the last error carries the red line, the time from status.json (utc), and the file that exists", b.j.lastError?.text.startsWith("Error on p040, box ED_2:") && b.j.lastError.file === "book-store/left_foot_full/failed/ED_2.json" && typeof b.j.lastError.epoch === "number", JSON.stringify(b.j.lastError));
  check("API left_foot_full: no list folder holds the book and no archive folder exists", b.j.lists.length === 0 && b.j.archived.length === 0);

  let pil = await api("rs_pilot");
  check("API rs_pilot (a pilot row): pilot true, one list folder 20261101T000000Z with 3 pages, no share, no flag, no archive", pil.status === 200 && pil.j.row.pilot === true && pil.j.lists.length === 1 && pil.j.lists[0].stamp === "20261101T000000Z" && pil.j.lists[0].pages.length === 3 && pil.j.share === null && pil.j.flags.length === 0 && pil.j.archived.length === 0 && pil.j.critiques.length === 0);

  // ---- 404 and 405
  for (const [name, slug] of [["a slug that is not in the book set", "no_such_book"], ["the store folder of phase 2", "paired-dataset"], ["a slug with a space", "a%20b"]]) {
    const r = await get(`/api/monitor/books/${slug}`);
    const p = await get(`/monitor/${slug}`);
    check(`404: ${name} gives 404 on the route and on the page`, r.status === 404 && p.status === 404, `route ${r.status}, page ${p.status}`);
  }
  // '%2e%2e' never reaches the code: Next resolves '/monitor/..' to '/', so the page is the Monitor dashboard and the route gives its own 404.
  const dd = await get("/api/monitor/books/%2e%2e");
  const ddp = await get("/monitor/%2e%2e");
  check("A slug '..' (%2e%2e) gives 404 on the route and never opens a Details view on the page", dd.status === 404 && !/data-book-detail=/.test(ddp.body), `route ${dd.status}, page ${ddp.status}`);
  check("The error body of an unknown slug is the JSON {\"error\":\"Not found\"}", eq(parseJson((await get("/api/monitor/books/no_such_book")).body), { error: "Not found" }));
  const post = await get("/api/monitor/books/mental_full", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  check("The route /api/monitor/books/<slug> is GET only: POST gives 405", post.status === 405, `status ${post.status}`);

  // ---- the page
  let pg = await page("mental_full");
  const T = pg.text;
  check("GET /monitor/mental_full gives 200 with the title, the slug, the state label, the phase and the run text, and the header facts", pg.status === 200 && T.includes("Making the Difference on the Day") && T.includes("(mental_full)") && /Running/.test(T) && T.includes("Phase 4 · production run") && T.includes("phase 4 run 2, started 2026-11-05 09:50 PST") && T.includes("50 of 169 pages") && /Cost\s+\$5\.00/.test(T) && /List folders\s+1/.test(T), T.slice(0, 600));
  const order = ["header", "last-error", "list-folders", "critiques", "settings", "critique-share", "archived-runs"].map((p) => pg.html.indexOf(`data-part="${p}"`));
  check("The parts come in the order header, Last error, List folders, Critiques against N, Settings used, Critique share, Archived runs", order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), order.join(","));
  check("The Details view draws the buttons of the row, with the Restart button (round 74 answer 11), and the back link to the Monitor dashboard", /data-action="pause"/.test(pg.html) && /data-action="restart"/.test(pg.html) && /<a[^>]*href="\/"[^>]*>\s*← Monitor dashboard/.test(pg.html));
  check("Part 2: 'Last error' with the fixed text 'No error stored for this book.' when none", /Last error/.test(T) && T.includes("No error stored for this book."));
  check("Part 3: the newest fold starts open, its heading links to the run view /runs/20261105T175000Z and shows start and end in PST, the kind, and the critic mode", /<details[^>]*data-list-fold="20261105T175000Z"[^>]*open=""/.test(pg.html) && /<a[^>]*data-run-link[^>]*href="\/runs\/20261105T175000Z"/.test(pg.html) && /Started \d{4}-\d\d-\d\d \d\d:\d\d PST\. Ended running\. Kind list\. Critic mode separate\. Book jobs 1\./.test(T), (T.match(/Started [^|]{0,120}/) ?? [""])[0]);
  check("Part 3: a page row links to the page view and shows the pairs written (p001 '5 pairs')", /<a[^>]*href="\/page\/mental_full\/p001\?run=r2"[^>]*>p001</.test(pg.html) && /data-page-row="p001"[\s\S]*?5 pairs/.test(pg.html));
  check("Part 6: 'Critiques against N' with a total row, a star mark, and no flag for mental_full", /Critiques against N/.test(T) && /data-critique-total/.test(pg.html) && /★/.test(pg.html) && !/data-stop-flag/.test(pg.html));
  check("Part 7: 'Settings used' with the text 'Settings changed before this page' once", /Settings used/.test(T) && (T.match(/Settings changed before this page/g) ?? []).length === 1);
  check("Critique share part: headings 'Critiques used in live rewrites' and 'Critiques dropped after a double REJECT', and the lines for ED_2, TL_1, QA_3 with the numbers of the example", T.includes("Critique share of the current run") && T.includes("Critiques used in live rewrites") && T.includes("Critiques dropped after a double REJECT") && /ED_2\s+10 of 15 \(66\.7 percent\)\s+5 of 15 \(33\.3 percent\)/.test(T) && /TL_1\s+5 of 5 \(100\.0 percent\)\s+0 of 5 \(0\.0 percent\)/.test(T) && /QA_3\s+1 of 16 \(6\.2 percent\)\s+15 of 16 \(93\.8 percent\)/.test(T), (T.match(/Critique share of the current run.{0,400}/) ?? [""])[0]);
  check("Archived runs part: 'Archived runs (2)', the columns Run ID, Phase, Pages done, Prompts at start, Prompts at end, the Run ID text '2026-11-04 00:15 PST', and the old folder name as plain text '20261105T093000Z'", T.includes("Archived runs (2)") && /Run ID\s+Phase\s+Pages done\s+Prompts at start\s+Prompts at end/.test(T) && />2026-11-04 00:15 PST</.test(pg.html) && />20261105T093000Z</.test(pg.html) && /2026-11-04 00:15 PST\s+agent-phase-4\s+80 of 169\s+TL_1 v4\.1\.0, ED_2 v4\.1\.0, QA_3 v4\.1\.0\s+TL_1 v4\.1\.2, ED_2 v4\.1\.6, QA_3 v4\.1\.1/.test(T), (T.match(/Archived runs \(2\).{0,500}/) ?? [""])[0]);
  check("The Run ID cell of an archived run holds the time in PST only: no 'UTC', no 'Z' stamp, and no first column named 'UTC time'", !/UTC time/.test(T) && !/>2026-11-04T/.test(pg.html));
  check("The stale note 'The run program has no update step yet.' is gone, and the page has no text about the box freeze", !/no update step yet/i.test(T) && !/freeze|frozen/i.test(T));

  pg = await page("left_foot_full");
  const LT = pg.text;
  const flagHtml = (pg.html.match(/<div[^>]*data-stop-flag="ED_2"[\s\S]*?<\/div>/) ?? [""])[0];
  check("GET /monitor/left_foot_full gives 200, the label 'Stopped by failure', the slug alone as title, and the Resume and Restart buttons", pg.status === 200 && /Stopped by failure/.test(LT) && /<h1[^>]*>[\s\S]*left_foot_full/.test(pg.html) && /data-action="resume"/.test(pg.html) && /data-action="restart"/.test(pg.html));
  check("Stop flag: the text 'ED_2 stopped after 3 double REJECTs in a row' sits in a note with no button", /ED_2 stopped after 3 double REJECTs in a row/.test(visibleText(flagHtml)) && !/<button/.test(flagHtml) && /role="note"/.test(flagHtml), visibleText(flagHtml).slice(0, 200));
  const reasons = [...flagHtml.matchAll(/<li[^>]*data-reject-reason[^>]*>([\s\S]*?)<\/li>/g)].map((m) => visibleText(m[1]).trim());
  check("Stop flag: the 3 reject reasons show as 3 list items with the page, the try, the checks, and the reason text", reasons.length === 3 && reasons[0] === "After p020, try 2, check audit: AUDIT FAIL: the new text drops the rule for term lists." && reasons[1] === "After p030, try 2, check audit: AUDIT FAIL: the new text keeps a critique that the judge marked as a bad critique." && reasons[2] === "After p040, try 2, checks message-rebuild and audit: MESSAGE REBUILD FAIL: page left_foot_full/p038, box ED_2: section 3 does not hold the new label and the new text. AUDIT FAIL: the new text changes the output format.", JSON.stringify(reasons));
  check("Stop flag: the total row marks the ED column with '▲ ED_2 stopped'", /data-flag-mark="ED_2"/.test(pg.html) && /▲ ED_2 stopped/.test(LT));
  check("Part 2 with an error: the red line 'Error on p040, box ED_2:', the time in PST, and the link 'File: book-store/left_foot_full/failed/ED_2.json'", /Error on p040, box ED_2: /.test(LT) && /Time: \d{4}-\d\d-\d\d \d\d:\d\d PST/.test(LT) && /<a[^>]*data-error-file[^>]*href="\/api\/file\?path=book-store%2Fleft_foot_full%2Ffailed%2FED_2\.json"/.test(pg.html) && !/No error stored/.test(LT));
  check("Part 3 with no list folder: 'No list folder holds this book.', and 'Archived runs (0)' with 'No archived run.'", LT.includes("No list folder holds this book.") && LT.includes("Archived runs (0)") && LT.includes("No archived run."));
  check("Critique share part, left_foot_full: ED_2 '5 of 20 (25.0 percent)' used and '15 of 20 (75.0 percent)' dropped", /ED_2\s+5 of 20 \(25\.0 percent\)\s+15 of 20 \(75\.0 percent\)/.test(LT), (LT.match(/Critique share of the current run.{0,300}/) ?? [""])[0]);

  pg = await page("rs_running_restart");
  check("Details view of a Running row while a Restart waits: the note 'Restart requested' stays, the header has no button", pg.status === 200 && /Restart requested \d\d:\d\d PST/.test(pg.text) && !/data-action/.test(pg.html));
  pg = await page("rs_pilot");
  check("Details view of a pilot row: the tag 'pilot list', one list folder, 'No archived run.', 'No update point ended in the current run.', and a Run button only", pg.status === 200 && /pilot list/.test(pg.text) && /List folders\s+1/.test(pg.text) && pg.text.includes("No archived run.") && pg.text.includes("No update point ended in the current run.") && !/data-action="restart"/.test(pg.html));
  pg = await page("rs_broken");
  check("Details view of a row with a broken status.json: 200, the label 'Status file unreadable', no button", pg.status === 200 && /Status file unreadable/.test(pg.text) && !/data-action/.test(pg.html));
  for (const slug of ["mental_full", "left_foot_full", "rs_pilot", "rs_wait_restart"]) {
    const t = (await page(slug)).text;
    check(`Wording on /monitor/${slug}: no 'finished', 'gloss', 'rendering', 'rollback', and no contraction with an apostrophe-t`, !/finished|gloss|rendering|rollback|n't\b/i.test(t));
  }

  // ---- monitor off, and no write
  const off = await startServerWith({ VIEWER_MONITOR: "off" });
  try {
    const r1 = await get("/api/monitor/books/mental_full");
    const r2 = await get("/monitor/mental_full");
    check("Monitor off: the route gives 404 with {\"error\":\"Not found\"} and the page gives 404", r1.status === 404 && parseJson(r1.body)?.error === "Not found" && r2.status === 404, `route ${r1.status}, page ${r2.status}`);
  } finally {
    off.child.kill("SIGTERM");
    base = off.old;
  }
  const after = await listing(data);
  const diff = after.filter((x) => !before.includes(x)).concat(before.filter((x) => !after.includes(x))).filter((x) => !/status\.json|progress\.json|PAUSE/.test(x));
  check("The reads wrote no file in the fixture (only the fake process changed its heartbeat files)", diff.length === 0, diff.join(", "));
}

function R_line(row) {
  return (row?.line2 ?? []).map((x) => (typeof x === "string" ? x : "")).join("");
}

// A second `next start` for one mode check. The caller restores `base` from `old` and kills the child.
// The guards of scripts/smoke-guards.mjs (unit TF83). Pure code. It makes two small folders in the temp folder of this run (TMPDIR) and removes them.
async function guardsTest() {
  const T2DATA = "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/data";
  const V2DATA = "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-viewer/data";
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "smoke-guards-"));
  try {
    // ---- the PocketBase address
    check("PocketBase guard, pass: http://127.0.0.1:8092 (the port of the harness)", pbGuard("http://127.0.0.1:8092").ok);
    check("PocketBase guard, pass: http://127.0.0.1:8093/ and http://localhost:8099 (another port, a trailing slash)", pbGuard("http://127.0.0.1:8093/").ok && pbGuard("http://localhost:8099").ok);
    const r90 = pbGuard("http://127.0.0.1:8090");
    check("PocketBase guard, refuse: http://127.0.0.1:8090 (the PocketBase of the owner) with a clear message", !r90.ok && /port 8090 is the PocketBase of the owner/.test(r90.why), r90.why);
    check("PocketBase guard, refuse: port 8090 with a trailing slash or on localhost", !pbGuard("http://127.0.0.1:8090/").ok && !pbGuard("http://localhost:8090").ok);
    const rHost = pbGuard("http://pb.example.com:8092");
    check("PocketBase guard, refuse: a host that is not on this Mac", !rHost.ok && /not on this Mac/.test(rHost.why), rHost.why);
    check("PocketBase guard, refuse: no address and a text that is no address", !pbGuard(undefined).ok && !pbGuard("not an address").ok);
    // ---- the fixture folder
    const fx = path.join(tmp, "harness", "fx");
    await fs.mkdir(path.join(fx, "data", "book-store"), { recursive: true });
    const cfg = { translatorDataDir: path.join(fx, "data"), pocketbaseUrl: "http://127.0.0.1:8093" };
    const ok = await fixtureGuard(fx, cfg);
    check("Fixture guard, pass: <harness>/fx with a config that names <harness>/fx/data (any folder name, any port)", ok.ok, ok.why);
    const inT2 = await fixtureGuard(path.join(T2DATA, "book-store"), { translatorDataDir: T2DATA });
    check("Fixture guard, refuse: <T2>/data/book-store with a clear message", !inT2.ok && /inside the protected data folder/.test(inT2.why), inT2.why);
    const inV2 = await fixtureGuard(V2DATA, null);
    check("Fixture guard, refuse: <V2>/data", !inV2.ok && /inside the protected data folder/.test(inV2.why), inV2.why);
    const other = await fixtureGuard(fx, { translatorDataDir: path.join(tmp, "elsewhere", "data") });
    check("Fixture guard, refuse: a config that names another data folder than the fixture", !other.ok && /must use the same folder/.test(other.why), other.why);
    const noData = await fixtureGuard(path.join(tmp, "harness"), null);
    check("Fixture guard, refuse: a folder with no data folder below it", !noData.ok && /does not exist/.test(noData.why), noData.why);
    const custom = await fixtureGuard(fx, cfg, protectedDirs({ SMOKE_PROTECTED_DIRS: path.join(tmp, "harness") }));
    check("Fixture guard, refuse: a folder that the owner names in SMOKE_PROTECTED_DIRS", !custom.ok && /protected data folder/.test(custom.why), custom.why);
    check("Fixture guard, refuse: no fixture given", !(await fixtureGuard(undefined, null)).ok);
    check("Protected folders: the list holds <V2>/data and <T2>/data", protectedDirs({}).includes(V2DATA) && protectedDirs({}).includes(T2DATA));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

async function startServerWith(extraEnv) {
  const port = await freePort();
  const env = { ...process.env, PORT: String(port) };
  if (configFile) env.VIEWER_CONFIG = path.resolve(configFile);
  Object.assign(env, extraEnv);
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { env, stdio: "ignore" });
  const old = base;
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(base + "/api/monitor/books");
      if (r.status < 500) break;
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return { child, old };
}

if (mode === "layout") {
  await layoutTest();
  console.log(`\nFailures: ${failures}, skipped: ${skips}`);
  process.exit(failures ? 1 : 0);
}

if (mode === "monitor-rules") {
  await monitorRulesTest();
  console.log(`\nFailures: ${failures}, skipped: ${skips}`);
  process.exit(failures ? 1 : 0);
}

if (mode === "monitor-restart") {
  await monitorRestartTest();
  console.log(`\nFailures: ${failures}, skipped: ${skips}`);
  process.exit(failures ? 1 : 0);
}

if (mode === "guards") {
  await guardsTest();
  console.log(`\nFailures: ${failures}, skipped: ${skips}`);
  process.exit(failures ? 1 : 0);
}

if (mode === "folds") {
  await foldsTest();
  console.log(`\nFailures: ${failures}, skipped: ${skips}`);
  process.exit(failures ? 1 : 0);
}

const server = await startServer();
try {
  if (mode === "tolerance") await toleranceTest();
  else if (mode === "pause") await pauseTest();
  else if (mode === "monitor") await monitorTest();
  else if (mode === "monitor-actions") await monitorActionsTest();
  else if (mode === "monitor-restart-api") await monitorRestartApiTest();
  else if (mode === "details") await detailsTest();
  else if (mode === "htv") await htvTest();
  else if (mode === "deploy") await deployTest();
  else if (mode === "read") await readTest();
  else if (mode === "web") await webTest();
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
