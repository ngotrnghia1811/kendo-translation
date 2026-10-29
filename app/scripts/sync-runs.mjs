#!/usr/bin/env node
// Sync command S2 (unit S2C, round 56, VISION-viewer 15.14 and 15.15).
// It uploads one snapshot for each finished page run from the run folders on this Mac into the PocketBase collection page_runs.
// It also fills catalog_items with one record for each item that has a finished run (the book titles).
// The deployed app cannot read the run folders, so it reads these records (config key runSource "pocketbase").
//
// Dry run is the default and writes nothing. Only --apply writes. The command is safe to run twice:
// an equal record stays as it is, a different record is updated, a missing record is created.
// A record whose run folder is gone stays on the server. The report lists it as "on the server only".
// Node built-ins only. The build rules come from app/lib/htv-build.ts, the same file that the app uses.
// Run `node scripts/sync-runs.mjs --help` in the app folder.
import { register } from "node:module";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "..");
register("./ts-resolve-hook.mjs", import.meta.url);
const { buildRun, finishedRunOf, makeSnapshot, parseTermbase, RUN_FOLDER_RULE, SNAPSHOT_FORMAT, sortRuns } = await import("../lib/htv-build.ts");
const { folderToPageId } = await import("../lib/format.ts");

// ---------------------------------------------------------------- constants and small helpers

const DEFAULT_URL = "http://127.0.0.1:8090";
const LOCAL_HOSTS = ["127.0.0.1", "localhost"];
const MB = 1048576; // 1 MB = 1,048,576 bytes. The limit of the snapshot field is 5 MB.
const SNAPSHOT_LIMIT = 5 * MB;
const PILOT = "pilot-run";

/** Size in MB with two decimals. A size that would show 0.00 gets four decimals. */
function mb(bytes) {
  const v = bytes / MB;
  return (v > 0 && v < 0.005 ? v.toFixed(4) : v.toFixed(2)) + " MB";
}

function fail(message) {
  console.error("Error: " + message);
  process.exit(2);
}

const HELP = `Sync command S2: upload finished page runs from the run folders into PocketBase (page_runs and catalog_items).

Usage (run it in the app folder):
  node scripts/sync-runs.mjs [options]

Dry run is the default. It builds every snapshot, signs in to compare with the server, and writes nothing.
Only --apply writes.

Options:
  --url URL          PocketBase address. Default ${DEFAULT_URL}. Plain http is allowed for 127.0.0.1 and localhost only.
  --superuser EMAIL  Superuser email. Default: the env variable PB_SUPERUSER_EMAIL.
  --data DIR         Translator data folder. Default: translatorDataDir of viewer.config.json
                     (the file that the env variable VIEWER_CONFIG names, else app/viewer.config.json).
  --page ID          Sync this page only, for example mental_full/p014. Repeat the option for more pages.
  --list PATH        Sync the pages of a list: a folder with list.json (key pages), a .json file, or a text file with one page ID per line.
  --apply            Write to PocketBase. Without it the command writes nothing.
  --offline          Dry run without sign-in. It skips the compare with the server.
  --help             Show this text.

Without --page and --list the command syncs every page with a finished run.
The password comes from a hidden prompt on the terminal. If stdin is not a terminal, the command reads one line from stdin.
The command never takes a password from an option, an env variable, or a file. It never prints the password or the token.
Sizes are in MB (1 MB = 1,048,576 bytes).
`;

// ---------------------------------------------------------------- options

function parseArgs(argv) {
  const o = { url: DEFAULT_URL, superuser: process.env.PB_SUPERUSER_EMAIL ?? "", data: "", pages: [], list: "", apply: false, offline: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) fail(`The option ${a} needs a value.`);
      return v;
    };
    if (a === "--url") o.url = value();
    else if (a === "--superuser") o.superuser = value();
    else if (a === "--data") o.data = value();
    else if (a === "--page") o.pages.push(value());
    else if (a === "--list") o.list = value();
    else if (a === "--apply") o.apply = true;
    else if (a === "--offline") o.offline = true;
    else if (a === "--help" || a === "-h") o.help = true;
    else fail(`Unknown option ${a}. Run with --help.`);
  }
  return o;
}

/** Same rule as pb_users.py: plain http only for 127.0.0.1 or localhost, else https only. */
function checkUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    fail("The URL must start with http:// or https:// and name a host.");
  }
  if (!["http:", "https:"].includes(u.protocol) || !u.hostname) fail("The URL must start with http:// or https:// and name a host.");
  if (u.protocol === "http:" && !LOCAL_HOSTS.includes(u.hostname)) fail(`Plain http is only allowed for 127.0.0.1 or localhost. Use https:// for ${u.hostname}.`);
  return url.replace(/\/+$/, "");
}

const PAGE_ID_RULE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/p\d+$/;
const SEGMENT_RULE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/; // same rule as isSafeSegment in app/lib/safe-path.ts

async function readListPages(listPath) {
  const full = path.resolve(listPath);
  let file = full;
  let st;
  try {
    st = await fs.stat(full);
  } catch {
    fail(`The list ${full} does not exist.`);
  }
  if (st.isDirectory()) file = path.join(full, "list.json");
  let text;
  try {
    text = await fs.readFile(file, "utf-8");
  } catch {
    fail(`The list file ${file} cannot be read.`);
  }
  let pages;
  if (file.endsWith(".json")) {
    let j;
    try {
      j = JSON.parse(text);
    } catch {
      fail(`The list file ${file} is not valid JSON.`);
    }
    pages = Array.isArray(j) ? j : j?.pages;
    if (!Array.isArray(pages)) fail(`The list file ${file} has no key pages.`);
  } else {
    pages = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  }
  for (const p of pages) if (typeof p !== "string" || !PAGE_ID_RULE.test(p)) fail(`The list file ${file} holds a bad page ID: ${JSON.stringify(p)}.`);
  return pages;
}

async function dataDirOf(o) {
  if (o.data) return path.resolve(o.data);
  const cfgFile = process.env.VIEWER_CONFIG ? path.resolve(process.env.VIEWER_CONFIG) : path.join(appDir, "viewer.config.json");
  let cfg;
  try {
    cfg = JSON.parse(await fs.readFile(cfgFile, "utf-8"));
  } catch {
    fail(`Cannot read ${cfgFile}. Use --data DIR.`);
  }
  if (!cfg.translatorDataDir || typeof cfg.translatorDataDir !== "string") fail(`${cfgFile} has no key translatorDataDir. Use --data DIR.`);
  return path.resolve(cfg.translatorDataDir);
}

// ---------------------------------------------------------------- password

/** Read the password without echo. A terminal gets a hidden prompt. A pipe gives one line from stdin. */
function readPassword(label) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (stdin.isTTY) {
      process.stderr.write(label);
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf-8");
      let buf = "";
      const onData = (chunk) => {
        for (const ch of chunk) {
          if (ch === "\r" || ch === "\n" || ch === "\u0004") {
            stdin.setRawMode(false);
            stdin.pause();
            stdin.off("data", onData);
            process.stderr.write("\n");
            resolve(buf);
            return;
          }
          if (ch === "\u0003") {
            stdin.setRawMode(false);
            process.stderr.write("\n");
            process.exit(130);
          }
          if (ch === "\u007f" || ch === "\b") buf = buf.slice(0, -1);
          else buf += ch;
        }
      };
      stdin.on("data", onData);
    } else {
      let buf = "";
      stdin.setEncoding("utf-8");
      stdin.on("data", (chunk) => {
        buf += chunk;
        const i = buf.indexOf("\n");
        if (i >= 0) {
          stdin.pause();
          resolve(buf.slice(0, i).replace(/\r$/, ""));
        }
      });
      stdin.on("end", () => resolve(buf.replace(/\r?\n$/, "")));
      stdin.on("error", reject);
    }
  });
}

// ---------------------------------------------------------------- PocketBase calls

class Pb {
  constructor(base) {
    this.base = base;
    this.token = "";
  }
  async call(method, urlPath, body) {
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.token) headers.Authorization = this.token;
    let res;
    try {
      res = await fetch(this.base + urlPath, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(120000) });
    } catch (e) {
      throw new Error(`PocketBase at ${this.base} is not reachable (${e?.cause?.code ?? e?.name ?? "network error"}).`);
    }
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (res.status < 200 || res.status >= 300) throw new Error(describeFailure(res.status, data));
    return data;
  }
  async signIn(email, password) {
    try {
      const d = await this.call("POST", "/api/collections/_superusers/auth-with-password", { identity: email, password });
      this.token = d.token;
    } catch (e) {
      throw new Error(`Superuser sign-in failed for ${email}: ${e.message}`);
    }
  }
  async listAll(collection) {
    const out = [];
    for (let page = 1; page < 500; page++) {
      const d = await this.call("GET", `/api/collections/${collection}/records?perPage=100&page=${page}&sort=id`);
      out.push(...(d.items ?? []));
      if (page >= Number(d.totalPages ?? 1)) break;
    }
    return out;
  }
}

/** Plain message of a failed answer: status, message, and the message of each bad field. No body, no token. */
function describeFailure(status, data) {
  let msg = `HTTP ${status} ${typeof data?.message === "string" ? data.message : ""}`.trim();
  for (const [field, info] of Object.entries(data?.data ?? {})) msg += ` [${field}: ${info?.message ?? ""}]`;
  return msg;
}

// ---------------------------------------------------------------- compare

function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]));
  return v;
}
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

function sameDate(a, b) {
  const x = a ? Date.parse(String(a).replace(" ", "T")) : NaN;
  const y = b ? Date.parse(String(b).replace(" ", "T")) : NaN;
  if (Number.isNaN(x) && Number.isNaN(y)) return true;
  return x === y;
}

function runRecordEqual(stored, want) {
  return (
    String(stored.page_id ?? "") === want.page_id &&
    String(stored.item_id ?? "") === want.item_id &&
    String(stored.run_id ?? "") === want.run_id &&
    String(stored.verdict ?? "") === want.verdict &&
    Number(stored.qa3_page_score ?? 0) === want.qa3_page_score &&
    String(stored.started_utc ?? "") === want.started_utc &&
    String(stored.status ?? "") === want.status &&
    sameDate(stored.finished, want.finished) &&
    same(stored.snapshot, want.snapshot)
  );
}

function catalogRecordEqual(stored, want) {
  for (const k of ["item_id", "kind", "folder", "title_ja", "title_en", "author_ja", "author_en", "publisher", "publish_year"]) {
    if (String(stored[k] ?? "") !== want[k]) return false;
  }
  return Number(stored.pages ?? 0) === want.pages && same(stored.row ?? null, want.row);
}

// ---------------------------------------------------------------- read the run folders

async function readJsonFile(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8"));
  } catch {
    return null;
  }
}
async function readTextFile(file) {
  try {
    return await fs.readFile(file, "utf-8");
  } catch {
    return null;
  }
}
async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
async function listDir(dir) {
  try {
    return (await fs.readdir(dir)).sort();
  } catch {
    return [];
  }
}

/** Finished runs of one page folder (the rule of htv-build.ts). */
async function finishedRunsOf(dataDir, pageFolder) {
  const out = [];
  for (const runId of (await listDir(path.join(dataDir, PILOT, pageFolder))).filter((n) => RUN_FOLDER_RULE.test(n))) {
    const dir = path.join(dataDir, PILOT, pageFolder, runId);
    const summary = await readJsonFile(path.join(dir, "summary.json"));
    const runJson = await readJsonFile(path.join(dir, "run.json"));
    const run = finishedRunOf(runId, summary, runJson, await fileExists(path.join(dir, "results/TS_3.json")), await fileExists(path.join(dir, "results/ED_3.json")));
    if (run) out.push({ run, summary, dir });
  }
  return sortRuns(out.map((x) => x.run)).map((r) => out.find((x) => x.run.runId === r.runId));
}

/** The time when the run ended: started_utc plus wall_seconds of summary.json. Empty when one value is missing. */
function finishedOf(startedUtc, summary) {
  const t = Date.parse(startedUtc);
  const w = summary?.wall_seconds;
  if (Number.isNaN(t) || typeof w !== "number" || !Number.isFinite(w)) return "";
  return new Date(t + Math.round(w * 1000)).toISOString();
}

async function loadMetadata(dataDir) {
  const readRows = async (rel) => {
    const text = await readTextFile(path.join(dataDir, rel));
    const rows = [];
    for (const line of (text ?? "").split("\n")) {
      if (!line.trim()) continue;
      try {
        rows.push(JSON.parse(line));
      } catch {
        /* skip a broken line */
      }
    }
    return rows;
  };
  let rows = await readRows("item-metadata/items.filled.jsonl");
  let source = "items.filled.jsonl";
  if (rows.length === 0) {
    rows = await readRows("item-metadata/items.draft.jsonl");
    source = "items.draft.jsonl";
  }
  return { map: new Map(rows.map((r) => [String(r.item_id), r])), source };
}

function catalogBody(slug, row) {
  const text = (v) => (v === null || v === undefined ? "" : String(v));
  return {
    item_id: slug,
    kind: text(row?.kind),
    folder: text(row?.folder),
    pages: typeof row?.pages === "number" ? row.pages : 0,
    title_ja: text(row?.title_ja),
    title_en: text(row?.title_en),
    author_ja: text(row?.author_ja),
    author_en: text(row?.author_en),
    publisher: text(row?.publisher),
    publish_year: text(row?.publish_year),
    row: row ?? null,
  };
}

// ---------------------------------------------------------------- main

const o = parseArgs(process.argv.slice(2));
if (o.help) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (o.apply && o.offline) fail("--apply needs the server. Do not use --apply with --offline.");
const base = checkUrl(o.url);
const dataDir = await dataDirOf(o);
for (const p of o.pages) if (!PAGE_ID_RULE.test(p)) fail(`Bad page ID ${JSON.stringify(p)}. Use the form mental_full/p014.`);
const filter = new Set(o.pages);
if (o.list) for (const p of await readListPages(o.list)) filter.add(p);
const filtered = filter.size > 0;
if (!(await listDir(path.join(dataDir, PILOT))).length) fail(`No run folders in ${path.join(dataDir, PILOT)}.`);

// 1. All finished runs of all pages (the full local set), then the selected ones.
const folders = (await listDir(path.join(dataDir, PILOT))).filter((n) => SEGMENT_RULE.test(n) && folderToPageId(n));
const localAll = new Map(); // "pageId|runId" -> { pageId, slug, folder, run, summary, dir }
const runsOfPage = new Map();
for (const folder of folders) {
  const parsed = folderToPageId(folder);
  const pageId = `${parsed.slug}/${parsed.page}`;
  const found = await finishedRunsOf(dataDir, folder);
  runsOfPage.set(pageId, found.length);
  for (const f of found) localAll.set(`${pageId}|${f.run.runId}`, { pageId, slug: parsed.slug, folder, run: f.run, summary: f.summary, dir: f.dir });
}
const candidates = filtered ? [...filter].sort() : [...runsOfPage.keys()].sort();
const skipped = [];
for (const pageId of candidates) {
  if (!runsOfPage.has(pageId)) skipped.push({ pageId, reason: "no run folder" });
  else if (runsOfPage.get(pageId) === 0) skipped.push({ pageId, reason: "no finished run" });
}
const selected = [...localAll.values()].filter((x) => !filtered || filter.has(x.pageId));
selected.sort((a, b) => (a.folder < b.folder ? -1 : a.folder > b.folder ? 1 : a.run.runId < b.run.runId ? -1 : 1));

// 2. Build the snapshots.
const termbase = parseTermbase((await readTextFile(path.join(dataDir, "termbase/termbase.draft.jsonl"))) ?? "");
if (termbase.size === 0) console.error("Warning: the termbase file is missing or empty. The snapshots hold no term entries.");
const meta = await loadMetadata(dataDir);
const items = [];
const problems = [];
for (const x of selected) {
  const d = x.dir;
  const built = buildRun(x.pageId, {
    ts3: await readJsonFile(path.join(d, "results/TS_3.json")),
    ed3: await readJsonFile(path.join(d, "results/ED_3.json")),
    termMarks: await readJsonFile(path.join(d, "programs/term_marks.ED_3.json")),
    enFormCheck: await readJsonFile(path.join(d, "programs/en_form_check.ED_3.json")),
    tl3Message: await readTextFile(path.join(d, "messages/TL_3.txt")),
    termbase,
  });
  const snapshot = makeSnapshot(x.pageId, x.run, built);
  const bytes = Buffer.byteLength(JSON.stringify(snapshot), "utf-8");
  x.snapshot = snapshot;
  x.bytes = bytes;
  x.body = {
    page_id: x.pageId,
    item_id: x.slug,
    run_id: x.run.runId,
    verdict: x.run.verdict,
    qa3_page_score: x.run.score ?? 0,
    finished: finishedOf(x.run.startedUtc, x.summary),
    started_utc: x.run.startedUtc,
    status: x.run.status,
    snapshot,
  };
  if (snapshot.snapshot_format !== SNAPSHOT_FORMAT) problems.push(`${x.pageId} run ${x.run.runId}: snapshot_format is missing.`);
  if (bytes >= SNAPSHOT_LIMIT) problems.push(`${x.pageId} run ${x.run.runId}: the snapshot has ${mb(bytes)}. The limit is 5 MB.`);
}
const slugs = [...new Set(selected.map((x) => x.slug))].sort();
for (const slug of slugs) {
  const row = meta.map.get(slug) ?? null;
  items.push({ slug, row, body: catalogBody(slug, row) });
}

// 3. Compare with the server.
const pb = new Pb(base);
let serverRuns = null;
let serverItems = null;
if (!o.offline) {
  if (!o.superuser) fail("Name the superuser with --superuser EMAIL or the env variable PB_SUPERUSER_EMAIL.");
  let password = await readPassword(`Password for ${o.superuser}: `);
  try {
    await pb.signIn(o.superuser, password);
  } catch (e) {
    console.error("Error: " + e.message);
    process.exit(1);
  }
  password = "";
  try {
    const col = await pb.call("GET", "/api/collections/page_runs");
    const names = new Set((col.fields ?? []).map((f) => f.name));
    const missing = ["started_utc", "status", "snapshot", "finished"].filter((n) => !names.has(n));
    if (missing.length) fail(`The collection page_runs has no field ${missing.join(", ")}. Restart PocketBase so that migration 1793300003 runs.`);
    serverRuns = new Map((await pb.listAll("page_runs")).map((r) => [`${r.page_id}|${r.run_id}`, r]));
    serverItems = new Map((await pb.listAll("catalog_items")).map((r) => [String(r.item_id), r]));
  } catch (e) {
    console.error("Error: " + e.message);
    process.exit(1);
  }
}

const plan = selected.map((x) => {
  if (!serverRuns) return { x, action: "not compared" };
  const stored = serverRuns.get(`${x.pageId}|${x.run.runId}`);
  if (!stored) return { x, action: "create" };
  return { x, action: runRecordEqual(stored, x.body) ? "unchanged" : "update", id: stored.id };
});
const itemPlan = items.map((it) => {
  if (!serverItems) return { it, action: "not compared" };
  const stored = serverItems.get(it.slug);
  if (!stored) return { it, action: "create" };
  return { it, action: catalogRecordEqual(stored, it.body) ? "unchanged" : "update", id: stored.id };
});
const serverOnly = serverRuns
  ? [...serverRuns.values()].filter((r) => !localAll.has(`${r.page_id}|${r.run_id}`) && (!filtered || filter.has(String(r.page_id))))
  : [];

// 4. Print the plan.
const total = selected.reduce((s, x) => s + x.bytes, 0);
console.log(`Mode: ${o.apply ? "APPLY (writes to the server)" : "DRY RUN (writes nothing)"}`);
console.log(`Server: ${base}${o.offline ? " (offline, not compared)" : ""}`);
console.log(`Data: ${dataDir}`);
console.log(`Selection: ${filtered ? `${filter.size} page ID(s) from --page and --list` : "all pages with a finished run"}`);
console.log(`Metadata file: ${meta.source}`);
console.log("");
console.log("page_id | run_id | verdict | score | snapshot size | action");
for (const p of plan) {
  const x = p.x;
  console.log(`${x.pageId} | ${x.run.runId} | ${x.run.verdict} | ${x.run.score ?? "none"} | ${mb(x.bytes)} | ${p.action}`);
}
console.log("");
console.log("catalog_items | title | action");
for (const p of itemPlan) console.log(`${p.it.slug} | ${p.it.body.title_en || p.it.body.title_ja || "(no title: no metadata row has this item_id)"} | ${p.action}`);
console.log("");
if (problems.length) {
  console.log("Snapshot checks FAILED:");
  for (const m of problems) console.log("  " + m);
  console.log("The command writes nothing.");
  process.exit(1);
}
const sizes = selected.map((x) => x.bytes).sort((a, b) => a - b);
if (sizes.length) console.log(`Snapshot sizes: min ${mb(sizes[0])}, median ${mb(sizes[Math.floor(sizes.length / 2)])}, max ${mb(sizes[sizes.length - 1])}, total ${mb(total)} (limit 5 MB each, 1 MB = 1,048,576 bytes)`);

// 5. Apply.
const done = { created: [], updated: [], unchanged: [], failed: [] };
const itemDone = { created: [], updated: [], unchanged: [], failed: [] };
if (o.apply) {
  for (const p of plan) {
    const x = p.x;
    const label = `${x.pageId} ${x.run.runId}`;
    if (p.action === "unchanged") {
      done.unchanged.push(label);
      continue;
    }
    try {
      if (p.action === "create") await pb.call("POST", "/api/collections/page_runs/records", x.body);
      else await pb.call("PATCH", `/api/collections/page_runs/records/${encodeURIComponent(p.id)}`, x.body);
      (p.action === "create" ? done.created : done.updated).push(label);
    } catch (e) {
      done.failed.push(`${label}: ${e.message}`);
    }
  }
  for (const p of itemPlan) {
    if (p.action === "unchanged") {
      itemDone.unchanged.push(p.it.slug);
      continue;
    }
    try {
      if (p.action === "create") await pb.call("POST", "/api/collections/catalog_items/records", p.it.body);
      else await pb.call("PATCH", `/api/collections/catalog_items/records/${encodeURIComponent(p.id)}`, p.it.body);
      (p.action === "create" ? itemDone.created : itemDone.updated).push(p.it.slug);
    } catch (e) {
      itemDone.failed.push(`${p.it.slug}: ${e.message}`);
    }
  }
} else {
  for (const p of plan) if (p.action !== "not compared") (p.action === "create" ? done.created : p.action === "update" ? done.updated : done.unchanged).push(`${p.x.pageId} ${p.x.run.runId}`);
  for (const p of itemPlan) if (p.action !== "not compared") (p.action === "create" ? itemDone.created : p.action === "update" ? itemDone.updated : itemDone.unchanged).push(p.it.slug);
}

// 6. Report.
const word = o.apply ? ["created", "updated", "unchanged"] : ["would create", "would update", "unchanged"];
console.log("");
console.log(o.apply ? "Result:" : "Plan (nothing written):");
if (o.offline) console.log("  The server was not read (--offline). Run without --offline to see create, update, and unchanged.");
const line = (name, list) => {
  console.log(`  ${name}: ${list.length}${list.length ? " (" + list.join(", ") + ")" : ""}`);
};
const compared = (name, list) => (o.offline ? console.log(`  ${name}: not compared`) : line(name, list));
console.log("page_runs");
compared(word[0], done.created);
compared(word[1], done.updated);
compared(word[2], done.unchanged);
if (o.apply) line("failed", done.failed);
line("skipped (no finished run)", skipped.map((s) => `${s.pageId}: ${s.reason}`));
line("on the server only (run folder gone, kept)", serverOnly.map((r) => `${r.page_id} ${r.run_id}`));
console.log("catalog_items");
compared(word[0], itemDone.created);
compared(word[1], itemDone.updated);
compared(word[2], itemDone.unchanged);
if (o.apply) line("failed", itemDone.failed);
console.log(`Total snapshot size: ${mb(total)} for ${selected.length} run(s)`);
if (!o.apply) console.log("Nothing was written. Add --apply to write.");
process.exit(done.failed.length || itemDone.failed.length ? 1 : 0);
