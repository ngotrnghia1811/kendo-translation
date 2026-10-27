// Smoke tests for the Viewer app. Round 44 unit APP.
// Usage:
//   node scripts/smoke.mjs smoke                       real config, read-only requests
//   node scripts/smoke.mjs pause --config FILE --fixture DIR   pause test, fixture folder only
// The script starts `next start` on a free port and stops it at the end.
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

function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
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
console.log(`Failures: ${failures}`);
await fs.writeFile(`smoke-output.json`, JSON.stringify({ mode, timings, failures }, null, 1));
process.exit(failures ? 1 : 0);
