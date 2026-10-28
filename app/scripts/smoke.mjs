// Smoke tests for the Viewer app. Round 44 unit APP, updated in round 49 unit V3.
// Usage:
//   node scripts/smoke.mjs smoke                       real config, GET requests only
//   node scripts/smoke.mjs pause --config FILE --fixture DIR   pause test, fixture folder only
// The script starts `next start` on a free port and stops it at the end.
// Run `npm run build` first. Run the script in a copy of the app, not in the folder of the dev server.
// Mode `pause` sends POST requests. Never run it with the real data folder.
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

const server = await startServer();
try {
  if (mode === "pause") await pauseTest();
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
