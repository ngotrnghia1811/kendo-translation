#!/usr/bin/env node
// Sync command S2 (unit S2C, round 56, VISION-viewer 15.14 and 15.15).
// It uploads one snapshot for each finished page run from the run folders on this Mac into the PocketBase collection page_runs.
// It also fills catalog_items with one record for each item that has a finished run (the book titles and page counts).
// Unit UXC (round 59 answer 4, Q-A 2026-10-28 l222): it also fills magazine_chapters with the 103 month chapters of
// item-metadata/magazine-chapters.jsonl (the month headings of the book screen). The chapters do not depend on --page or --list.
// Unit UXC2 (round 61 answer 6, Q-A 2026-10-29 l266): catalog_items also gets the 36 book folders of pilot-sample/book-slugs.json, with or without a run.
// The titles and page counts come from item-metadata/items.filled.jsonl.
// Unit RC4 (round 69 answer 7, round 70): catalog_items now gets all 347 rows of that file, also the 311 web articles. The slug of a web article is the first
// 8 characters of its item_id (the ID rule). The column pages stays 0 for a web article. The /translate list keeps its 37 rows (app/lib/htv-books.ts).
// Each record also gets the column translated (the English pages that readers can read, round 69 answers 8 and 9) and, for a web article, the column placement
// (web date and print stamp, for the folds of the Reader dashboard). Each reader_pages record gets the folded search columns search_ja and search_en (round 69 answer 10).
// Unit RC1 (round 63 answer 3, Q-A 2026-10-28 l309): it also fills reader_pages, one record for each page that has an agent translation to show readers.
// Unit RT74 (round 75 answer 3, qa-memory-2026-10-31.md:53: "Admin opens any run"): only an OPEN run can reach readers. The admin opens a run with the button "Open to readers"
// (collection reader_opens, migration 1793300012). The shown run of a page is the run of the admin run mark (collection run_marks) if that run is open, else the newest open PASS run,
// else no Agent text. A page whose record holds a run that is not open any more loses the Agent text: a web article page goes back to its Original text record (run_id web-ja),
// a book page loses its record. Nothing is open by default. Without the collection reader_opens, S2 stops.
// A record holds the rows (JA text, agent EN text, term marks), the term entries that the marks cite, the captions and the running head (extras),
// and the group keys that a translator ticked "agree" for exactly this agent text (agree, without any name). It holds no verdict, no score, no TL_3 panel, and no reasoning.
// Unit RT73a (round 73, VISION-viewer 15.26): it also reads the page file of the Translator (item-metadata/web-pages.jsonl, made by data/scripts/web_pages.py)
// and uploads the 311 web articles as 1,124 A4 pages: reader_pages records with run_id "web-ja" (Original text rows), the kendojidai.com text as the chosen
// Human version (reader_versions, chosen_by empty), a copy of that text in own_translations under the disabled system account "kendojidai.com" (version 1),
// and the page counts of catalog_items. The v1 placeholder is not uploaded (owner answer 8 of round 73d: the Viewer reads the v1 md files on this Mac).
// Unit VW90 (Q-A 3:1.6, 3:4.7, design 9.24.11): a sentence that crosses a page end. The Translator (units TR90 and TR91) writes two files:
// results/cross_page.json (role first_half) in the run folder of the earlier page and results/cross_page_from.json (role second_half) in the run folder of the later page.
// A middle page can hold both. For the SHOWN run of a page, the reader record uses the files (lib/cross-page-reader.ts). Role first_half: the row of the tail gets the full English text,
// no EN marks, and the key continues. Role second_half: the row of the head gets the key continues_from. The snapshot (page_runs) does not change. A run without the files gives the same record as before.
// A damaged file, or a file with the wrong role for its name, is skipped with one warning line. The reader record is the only place that changes.
// The same safety rules apply to all collections: dry run by default, compare then skip or update, never delete.
// The deployed app cannot read the run folders, so it reads these records (config key runSource "pocketbase").
//
// Dry run is the default and writes nothing. Only --apply writes. The command is safe to run twice:
// an equal record stays as it is, a different record is updated, a missing record is created.
// A record whose run folder is gone stays on the server. The report lists it as "on the server only".
// Node built-ins only. The build rules come from app/lib/htv-build.ts, the same file that the app uses.
// Run `node scripts/sync-runs.mjs --help` in the app folder.
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "..");
const { installTsResolveHook } = await import("./ts-resolve-hook.mjs");
installTsResolveHook();
const { buildRun, finishedRunOf, makeReaderPage, makeSnapshot, parseTermbase, readerExtras, RUN_FOLDER_RULE, SNAPSHOT_FORMAT, sortRuns } = await import("../lib/htv-build.ts");
const { folderToPageId } = await import("../lib/format.ts");
const { isTranslatedPage } = await import("../lib/reader-translated.ts");
const { SEARCH_COLUMN_MAX, searchColumns } = await import("../lib/reader-search.ts");
const { hasAgentRecord, WEB_RUN_ID, WEB_SYSTEM_EMAIL, WEB_SYSTEM_NAME, WEB_VERSION } = await import("../lib/reader-web.ts");
const { openKey, pickReaderRun, PILOT_SOURCE } = await import("../lib/reader-opens-rule.ts");
const { CROSS_PAGE_FROM_REL, CROSS_PAGE_REL, crossPageForReader } = await import("../lib/cross-page-reader.ts");

// ---------------------------------------------------------------- constants and small helpers

const DEFAULT_URL = "http://127.0.0.1:8090";
const LOCAL_HOSTS = ["127.0.0.1", "localhost"];
const MB = 1048576; // 1 MB = 1,048,576 bytes. The limit of the snapshot field is 5 MB.
const SNAPSHOT_LIMIT = 5 * MB;
const READER_FIELD_LIMIT = 5 * MB; // the limit of each JSON field of reader_pages (migration 1793300007)
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

const HELP = `Sync command S2: upload finished page runs from the run folders into PocketBase (page_runs, catalog_items, magazine_chapters, and reader_pages).

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
  --web-pages FILE   Page file of the web articles. Default: <data>/item-metadata/web-pages.jsonl (made by data/scripts/web_pages.py in the Translator folder).
  --help             Show this text.

Without --page and --list the command syncs every page with a finished run.
The collection magazine_chapters always gets all rows of item-metadata/magazine-chapters.jsonl (the month headings of the book screen).
The collection reader_pages gets one record for each selected page with an agent translation to show. Only an OPEN run can show (round 75 answer 3: the admin opens a run with "Open to readers", collection reader_opens).
The shown run is the run of the admin run mark if that run is open, else the newest open PASS run, else no Agent text. A page whose record holds a run that is not open loses it:
a web article page goes back to its Original text record (run_id "web-ja"), a book page loses its record. Migration 1793300012 adds reader_opens. Without it, S2 stops.
With --offline the server is not read, so the plan counts every run as open. The record holds no verdict, no score, no TL_3 panel, and no reasoning. The report lists the count and the sizes in MB.
A sentence that crosses a page end (unit VW90): the Translator writes two files (schema cross-page-v1) after the QA_3 PASS of the later page. If the shown run has results/cross_page.json (role first_half, earlier page),
the reader record shows the full English text on the row of the tail (the EN term marks of that row are dropped) and has the key continues. If it has results/cross_page_from.json (role second_half, later page),
the reader record gets the key continues_from on the row of the head. A middle page can have both files. The snapshot does not change.
The report lists each such change in a line "cross_page | ...". A damaged file, or a file with the wrong role for its name, is skipped with one line "Warning: ...". A run without the files gives the same record as before.
The collection catalog_items always gets all rows of item-metadata/items.filled.jsonl (347 rows: 36 folders and 311 web articles), plus the item of each selected run that has no row.
The slug of a web article is the first 8 characters of its item_id. The column translated holds the English pages that readers can read (a reader_pages record exists for the page).
The column placement of a web article holds the web date and the print stamp of web-magazine-candidates.jsonl (the folds of the Reader dashboard use it).
The columns search_ja and search_en of reader_pages hold the folded text for the search. Migration 1793300010 adds the four columns. Without it, --apply stops.
The page file of the web articles (unit RT73a) gives the 311 web articles their A4 pages: 1,124 pages. For each page S2 writes a reader_pages record with run_id "web-ja"
(the Original text rows, no Agent text), the kendojidai.com text as the chosen Human version in reader_versions (chosen_by empty, written once: a page whose choice an admin removed stays without it),
and a copy of that text in own_translations under the disabled account kendojidai.com (version 1). S2 creates the account if it is missing. It has a random password that nobody sees.
catalog_items.pages of a web article is the A4 page count. The search columns hold the kendojidai.com text. The v1 placeholder is not uploaded. Migration 1793300011 adds own_translations.facts. Without it, --apply stops.
The column row of catalog_items holds the metadata row without 14 research keys (sources, confidence, filled_by, confirmed_by, notes, source_url, hint_secondary, confidence_draft, notes_draft, issue_evidence, status, title_en_source, author_en_source, synopsis_source).
An --apply run replaces the row of a record that exists already, so one run cleans the records of an earlier run.
The password comes from a hidden prompt on the terminal. If stdin is not a terminal, the command reads one line from stdin.
The command never takes a password from an option, an env variable, or a file. It never prints the password or the token.
Sizes are in MB (1 MB = 1,048,576 bytes).
`;

// ---------------------------------------------------------------- options

function parseArgs(argv) {
  const o = { url: DEFAULT_URL, superuser: process.env.PB_SUPERUSER_EMAIL ?? "", data: "", pages: [], list: "", apply: false, offline: false, help: false, webPages: "" };
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
    else if (a === "--web-pages") o.webPages = value();
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
  /** All records of a collection. opts: filter (a PocketBase filter), fields (a field list), perPage (default 100, 500 at most). */
  async listAll(collection, opts = {}) {
    const out = [];
    const extra = (opts.filter ? `&filter=${encodeURIComponent(opts.filter)}` : "") + (opts.fields ? `&fields=${encodeURIComponent(opts.fields)}` : "");
    for (let page = 1; page < 500; page++) {
      const d = await this.call("GET", `/api/collections/${collection}/records?perPage=${opts.perPage ?? 100}&page=${page}&sort=id${extra}`);
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

/** Run fn for every item with `size` calls at the same time. The own_translations copy of the web articles has 32,937 records. */
async function pool(items, size, fn) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const k = next++;
        await fn(items[k], k);
      }
    }),
  );
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
  return Number(stored.pages ?? 0) === want.pages && same(stored.row ?? null, want.row) && same(stored.translated ?? null, want.translated) && same(stored.placement ?? null, want.placement);
}

function readerRecordEqual(stored, want) {
  for (const k of ["page_id", "item_id", "run_id"]) {
    if (String(stored[k] ?? "") !== want[k]) return false;
  }
  return (
    Number(stored.n ?? 0) === want.n &&
    same(stored.rows ?? null, want.rows) &&
    same(stored.terms ?? null, want.terms) &&
    same(stored.extras ?? null, want.extras) &&
    same(stored.agree ?? null, want.agree) &&
    String(stored.search_ja ?? "") === want.search_ja &&
    String(stored.search_en ?? "") === want.search_en
  );
}

/** A reader_pages row of a web article page (unit RT73a, VISION-viewer 15.26.4): the Original text of one aligned unit, with no Agent text. "site" marks page chrome (site_text). */
function webRowOf(r) {
  return { key: r.key, shortKey: r.shortKey, part: r.part, ja: r.ja, ed3: "", jaMarks: [], edMarks: [], ...(r.site ? { site: true } : {}) };
}

function chapterRecordEqual(stored, want) {
  for (const k of ["chapter", "book", "chapter_title_ja", "chapter_title_en", "first_page_id", "last_page_id"]) {
    if (String(stored[k] ?? "") !== want[k]) return false;
  }
  for (const k of ["year", "month", "page_start", "page_end", "article_count"]) {
    if (Number(stored[k] ?? 0) !== want[k]) return false;
  }
  return same(stored.articles ?? null, want.articles);
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

/** The 36 book folders of pilot-sample/book-slugs.json: slug and page count. An empty list when the file is missing. */
async function loadBookSlugs(dataDir) {
  const text = await readTextFile(path.join(dataDir, "pilot-sample/book-slugs.json"));
  let json = null;
  try {
    json = JSON.parse(text ?? "");
  } catch {
    /* missing or broken file */
  }
  const out = new Map();
  for (const b of Array.isArray(json?.books) ? json.books : []) {
    if (typeof b?.slug === "string" && SEGMENT_RULE.test(b.slug)) out.set(b.slug, typeof b.pages === "number" ? b.pages : 0);
  }
  return out;
}

async function readJsonlRows(dataDir, rel) {
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
}

/** The ID rule (round 69 answer 7): the slug of a web article is the first 8 characters of its item_id. Another row keeps its item_id. */
function catalogSlug(row) {
  const id = String(row.item_id);
  return row.kind === "web-article" ? id.slice(0, 8) : id;
}

/** All rows of the metadata file by slug. A clash (two rows with one slug) goes into `clashes`; the first row stays. */
async function loadMetadata(dataDir) {
  let rows = await readJsonlRows(dataDir, "item-metadata/items.filled.jsonl");
  let source = "items.filled.jsonl";
  if (rows.length === 0) {
    rows = await readJsonlRows(dataDir, "item-metadata/items.draft.jsonl");
    source = "items.draft.jsonl";
  }
  const map = new Map();
  const clashes = [];
  for (const r of rows) {
    if (typeof r?.item_id !== "string" || !r.item_id) continue;
    const slug = catalogSlug(r);
    if (map.has(slug)) clashes.push(`${slug}: ${map.get(slug).item_id} and ${r.item_id}`);
    else map.set(slug, r);
  }
  return { map, source, clashes, rows: rows.length };
}

/**
 * Placement facts of the web articles (unit RC4, round 69 answer 7). The Reader dashboard puts a web article in a year and a month.
 *   web_year, web_month      from the web date (publish_date_text, for example 2019-10-21)
 *   print_year, print_month  from the print stamp of web-magazine-candidates.jsonl (for example "2011.8 KENDOJIDAI"), else null
 * A row of web-magazine-overrides.jsonl with the action link names the chapter of the magazine article (for example kendojidai_2011/2011-08).
 * That chapter wins over the stamp when its month differs from the stamp. The other override rows (unlink) do not change a month.
 */
async function loadPlacements(dataDir) {
  const stamps = new Map();
  for (const r of await readJsonlRows(dataDir, "item-metadata/web-magazine-candidates.jsonl")) {
    if (typeof r?.record_id === "string" && Number.isInteger(r.stamp_year) && Number.isInteger(r.stamp_month)) stamps.set(r.record_id, { year: r.stamp_year, month: r.stamp_month });
  }
  const changed = [];
  for (const o of await readJsonlRows(dataDir, "item-metadata/web-magazine-overrides.jsonl")) {
    if (o?.action !== "link" || typeof o.chapter !== "string") continue;
    const m = /\/(\d{4})-(\d{2})$/.exec(o.chapter);
    const stamp = stamps.get(o.record_id);
    if (!m || !stamp) continue;
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (year !== stamp.year || month !== stamp.month) {
      changed.push(`${o.record_id}: stamp ${stamp.year}-${stamp.month}, override ${o.chapter}`);
      stamps.set(o.record_id, { year, month });
    }
  }
  return { stamps, changed };
}

function placementOf(row, stamps) {
  if (!row || row.kind !== "web-article") return null;
  const m = /^(\d{4})-(\d{2})/.exec(String(row.publish_date_text ?? ""));
  const stamp = stamps.get(String(row.item_id));
  return {
    web_year: m ? Number(m[1]) : null,
    web_month: m ? Number(m[2]) : null,
    print_year: stamp ? stamp.year : null,
    print_month: stamp ? stamp.month : null,
  };
}

/** One record for each row of magazine-chapters.jsonl. A missing number is 0 (month 0 is the front chapter). */
async function loadChapters(dataDir) {
  const text = await readTextFile(path.join(dataDir, "item-metadata/magazine-chapters.jsonl"));
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const str = (v) => (v === null || v === undefined ? "" : String(v));
  const out = [];
  for (const line of (text ?? "").split("\n")) {
    if (!line.trim()) continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    if (!r || typeof r.chapter !== "string" || !r.chapter) continue;
    out.push({
      chapter: r.chapter,
      book: str(r.book),
      year: num(r.year),
      month: num(r.month),
      chapter_title_ja: str(r.chapter_title_ja),
      chapter_title_en: str(r.chapter_title_en),
      page_start: num(r.page_start),
      page_end: num(r.page_end),
      first_page_id: str(r.first_page_id),
      last_page_id: str(r.last_page_id),
      article_count: num(r.article_count),
      articles: Array.isArray(r.articles) ? r.articles : [],
    });
  }
  return out;
}

// Research fields of a metadata row (unit RC2, round 65; owner round 64 answer 7: "Strip research fields"). Every signed-in user can read catalog_items,
// so the column row must not hold them. VISION-viewer 15.19.4 names the six. The files in item-metadata keep them.
// Unit RC3 (round 66 answer 6, Q-A 2026-10-29 l32): eight more keys leave the row. hint_secondary holds a file path of the Mac of the owner.
const RESEARCH_FIELDS = [
  "sources", "confidence", "filled_by", "confirmed_by", "notes", "source_url",
  "hint_secondary", "confidence_draft", "notes_draft", "issue_evidence", "status", "title_en_source", "author_en_source", "synopsis_source",
];

function withoutResearch(row) {
  if (!row || typeof row !== "object") return row ?? null;
  return Object.fromEntries(Object.entries(row).filter(([k]) => !RESEARCH_FIELDS.includes(k)));
}

function catalogBody(slug, row, folderPages = 0, translated = [], placement = null, webPageCount = 0) {
  const text = (v) => (v === null || v === undefined ? "" : String(v));
  return {
    item_id: slug,
    kind: text(row?.kind),
    folder: text(row?.folder),
    // Unit RT73a (VISION-viewer 15.26.3): a web article has the pages of the A4 cut (page file of the Translator). Without the page file the column stays as before.
    pages: webPageCount > 0 && row?.kind === "web-article" ? webPageCount : typeof row?.pages === "number" ? row.pages : folderPages,
    title_ja: text(row?.title_ja),
    title_en: text(row?.title_en),
    author_ja: text(row?.author_ja),
    author_en: text(row?.author_en),
    publisher: text(row?.publisher),
    publish_year: text(row?.publish_year),
    row: withoutResearch(row),
    // Round 69 answers 8 and 9: the English pages that readers can read. One rule function: isTranslatedPage (lib/reader-translated.ts).
    translated: { en: translated },
    placement,
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
  const ts3File = await readJsonFile(path.join(d, "results/TS_3.json"));
  const ed3File = await readJsonFile(path.join(d, "results/ED_3.json"));
  const built = buildRun(x.pageId, {
    ts3: ts3File,
    ed3: ed3File,
    termMarks: await readJsonFile(path.join(d, "programs/term_marks.ED_3.json")),
    enFormCheck: await readJsonFile(path.join(d, "programs/en_form_check.ED_3.json")),
    tl3Message: await readTextFile(path.join(d, "messages/TL_3.txt")),
    termbase,
  });
  const snapshot = makeSnapshot(x.pageId, x.run, built);
  const bytes = Buffer.byteLength(JSON.stringify(snapshot), "utf-8");
  x.snapshot = snapshot;
  x.built = built;
  x.extras = readerExtras(ts3File, ed3File);
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
const bookSlugs = await loadBookSlugs(dataDir);
if (bookSlugs.size === 0) console.error("Warning: pilot-sample/book-slugs.json is missing or empty. catalog_items gets the metadata rows and the items of the selected runs.");
for (const c of meta.clashes) problems.push(`Two metadata rows have one slug: ${c}.`);
// Unit RC4 (round 69 answer 7): every row of the metadata file (347), the 36 folders, and the item of each selected run. The body comes after the reader plan (it needs the translated pages).
const slugs = [...new Set([...meta.map.keys(), ...bookSlugs.keys(), ...selected.map((x) => x.slug)])].sort();
const placements = await loadPlacements(dataDir);
for (const slug of slugs) {
  const row = meta.map.get(slug) ?? null;
  items.push({ slug, row, folderPages: bookSlugs.get(slug) ?? 0, placement: placementOf(row, placements.stamps) });
}

const chapters = await loadChapters(dataDir);

// 2b. Web articles (unit RT73a, round 73; VISION-viewer 15.26.3 and 15.26.13). The page file of the Translator holds one line for each A4 page.
const webFile = o.webPages ? path.resolve(o.webPages) : path.join(dataDir, "item-metadata/web-pages.jsonl");
const webAll = [];
{
  const text = await readTextFile(webFile);
  if (text === null) console.error(`Warning: the page file ${webFile} is missing. The web articles get no pages. Run python3 -B data/scripts/web_pages.py in the Translator folder.`);
  else {
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      let p = null;
      try {
        p = JSON.parse(line);
      } catch {
        /* skip a broken line */
      }
      if (p && typeof p.page_id === "string" && PAGE_ID_RULE.test(p.page_id) && Array.isArray(p.ja_rows) && Array.isArray(p.human_rows)) webAll.push(p);
    }
  }
}
const webById = new Map(webAll.map((p) => [p.page_id, p]));
const webPageCount = new Map(); // slug -> number of A4 pages
for (const p of webAll) webPageCount.set(p.item_id, Math.max(webPageCount.get(p.item_id) ?? 0, p.n));
const webSel = filtered ? webAll.filter((p) => filter.has(p.page_id)) : webAll;
const webTotals = { articles: webPageCount.size, pages: webAll.length, rows: 0, human: 0, changed: 0, dropped: 0 };
for (const p of webAll) {
  webTotals.rows += p.ja_rows.length;
  webTotals.human += p.human_rows.length;
  for (const h of p.human_rows) for (const f of h.facts ?? []) webTotals[f.kind === "dropped" ? "dropped" : "changed"]++;
}
for (const slug of webPageCount.keys()) if (!meta.map.has(slug)) problems.push(`The page file has the article ${slug}, and items.filled.jsonl has no row with this slug.`);
const fmt = (n) => Number(n).toLocaleString("en-US");

// 3. Compare with the server.
const pb = new Pb(base);
let serverRuns = null;
let serverItems = null;
let serverChapters = null;
let serverReader = null;
let marks = new Map(); // page ID to the run ID of the admin run mark
let openSet = null; // unit RT74: the opened runs, as openKey(source, book, run ID). null = not read (--offline): every run counts as open
let ownRows = []; // all saved own translations of the translators, for the agree ticks (names are not copied). The copies of the system account stay out.
let sysUser = null; // the disabled system account kendojidai.com (unit RT73a), or null
let sysOwn = null; // its own_translations records: "pageId|groupKey" -> record
let serverVersions = null; // reader_versions: page ID -> record
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
    const catalogFields = new Set(((await pb.call("GET", "/api/collections/catalog_items")).fields ?? []).map((f) => f.name));
    serverChapters = new Map((await pb.listAll("magazine_chapters")).map((r) => [String(r.chapter), r]));
    // Unit RC1 (round 63): reader_pages, the run marks, and the agree ticks.
    try {
      await pb.call("GET", "/api/collections/reader_pages");
    } catch {
      fail("The collection reader_pages is missing. Restart PocketBase so that the migrations 1793300006 to 1793300009 run.");
    }
    // Unit RC4 (round 70): migration 1793300010 adds translated and placement to catalog_items and search_ja and search_en to reader_pages. --apply stops without them.
    const readerFields = new Set(((await pb.call("GET", "/api/collections/reader_pages")).fields ?? []).map((f) => f.name));
    const lacking = [
      ...["translated", "placement"].filter((n) => !catalogFields.has(n)).map((n) => `catalog_items.${n}`),
      ...["search_ja", "search_en"].filter((n) => !readerFields.has(n)).map((n) => `reader_pages.${n}`),
    ];
    if (lacking.length) {
      const text = `The server has no field ${lacking.join(", ")}. Restart PocketBase so that migration 1793300010 runs.`;
      if (o.apply) fail(text);
      console.error("Warning: " + text + " The dry run goes on, and every record counts as different.");
    }
    serverReader = new Map((await pb.listAll("reader_pages")).map((r) => [String(r.page_id), r]));
    marks = new Map((await pb.listAll("run_marks")).map((r) => [String(r.page_id), String(r.run_id)]));
    // Unit RT73a: the system account of the web articles, its copy of the kendojidai.com text, and the chosen versions.
    const ownFields = new Set(((await pb.call("GET", "/api/collections/own_translations")).fields ?? []).map((f) => f.name));
    if (webAll.length > 0 && !ownFields.has("facts")) {
      const text = "The server has no field own_translations.facts. Restart PocketBase so that migration 1793300011 runs.";
      if (o.apply) fail(text);
      console.error("Warning: " + text + " The dry run goes on, and the copies of the web articles count as different.");
    }
    // Unit RT74 (round 75 answer 3): the opened runs. The plan needs them, so S2 stops without the collection (dry run too).
    // Unit default RT74. Other option: treat as nothing open. Benefit: a dry run still works on an old database. Cost: the plan shows "remove" for every agent page and hides the real cause.
    try {
      await pb.call("GET", "/api/collections/reader_opens");
    } catch {
      fail("Collection reader_opens is missing. Restart PocketBase so that migration 1793300012 runs.");
    }
    openSet = new Set((await pb.listAll("reader_opens")).map((r) => openKey(String(r.source), String(r.book), String(r.run_id))));
    const qs = (v) => JSON.stringify(String(v)); // a PocketBase filter text
    sysUser = (await pb.listAll("users", { filter: `email=${qs(WEB_SYSTEM_EMAIL)}`, fields: "id,email,disabled" }))[0] ?? null;
    ownRows = await pb.listAll("own_translations", sysUser ? { filter: `user!=${qs(sysUser.id)}` } : {});
    sysOwn = new Map();
    if (sysUser) for (const r of await pb.listAll("own_translations", { filter: `user=${qs(sysUser.id)}`, perPage: 500, fields: "id,page_id,group_key,item_id,part,ja_text,text,version,facts" })) sysOwn.set(`${r.page_id}|${r.group_key}`, r);
    serverVersions = new Map((await pb.listAll("reader_versions")).map((r) => [String(r.page_id), r]));
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
const chapterPlan = chapters.map((c) => {
  if (!serverChapters) return { c, action: "not compared" };
  const stored = serverChapters.get(c.chapter);
  if (!stored) return { c, action: "create" };
  return { c, action: chapterRecordEqual(stored, c) ? "unchanged" : "update", id: stored.id };
});
const serverOnly = serverRuns
  ? [...serverRuns.values()].filter((r) => !localAll.has(`${r.page_id}|${r.run_id}`) && (!filtered || filter.has(String(r.page_id))))
  : [];

// 3b. reader_pages: the shown run of each selected page (unit RT74, round 75 answer 3). Only an open run can show. The run mark of the admin wins if that run is open.
// Else the newest open PASS run. Else no Agent text: the page gets no record, and a record that it has is removed (book page) or goes back to the Original text (web article page).
const isOpenRun = (book, runId) => openSet === null || openSet.has(openKey(PILOT_SOURCE, book, runId));
const newestFirst = (a, b) => (a.run.startedUtc < b.run.startedUtc ? 1 : a.run.startedUtc > b.run.startedUtc ? -1 : a.run.runId < b.run.runId ? 1 : a.run.runId > b.run.runId ? -1 : 0);
const runsByPage = new Map();
for (const x of selected) {
  if (!runsByPage.has(x.pageId)) runsByPage.set(x.pageId, []);
  runsByPage.get(x.pageId).push(x);
}
// Agree ticks: the newest saved version of each translator on a page. A row counts when the tick is set and the translator saw exactly this agent text.
const newestVersion = new Map();
for (const r of ownRows) {
  const k = `${r.page_id}|${r.user}`;
  newestVersion.set(k, Math.max(newestVersion.get(k) ?? 0, Number(r.version)));
}
const agreedTexts = new Map(); // "pageId|groupKey" -> Set of ed3_text that a translator agreed with
for (const r of ownRows) {
  if (r.agree !== true || Number(r.version) !== newestVersion.get(`${r.page_id}|${r.user}`)) continue;
  const k = `${r.page_id}|${r.group_key}`;
  if (!agreedTexts.has(k)) agreedTexts.set(k, new Set());
  agreedTexts.get(k).add(String(r.ed3_text ?? ""));
}
const readerPlan = [];
const readerSkipped = [];
const readerNotOpen = []; // pages with a finished run and no open run: no Agent text
const searchCut = [];
const crossLines = []; // unit VW90: one report line for each file of the shown run that changes the reader record (cross_page.json, cross_page_from.json)
const crossWarnings = []; // unit VW90: one warning line for each skipped file
for (const [pageId, xs] of [...runsByPage].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  xs.sort(newestFirst);
  const markedId = marks.get(pageId);
  const hit = pickReaderRun(xs.map((x) => ({ runId: x.run.runId, verdict: x.run.verdict, x })), markedId, (runId) => isOpenRun(xs[0].slug, runId));
  if (!hit) {
    if (xs.some((x) => isOpenRun(x.slug, x.run.runId))) readerSkipped.push(`${pageId}: no open PASS run`);
    else readerNotOpen.push(pageId);
    continue;
  }
  const pick = hit.run.x;
  const markedHere = markedId ? xs.find((x) => x.run.runId === markedId) : undefined;
  const why = hit.why === "run mark" ? "run mark (open)" : markedId ? `newest open PASS (${markedHere ? "the marked run is not open" : "the marked run has no finished folder here"})` : "newest open PASS";
  // Unit VW90 (Q-A 3:1.6, 3:4.7): the files results/cross_page.json and results/cross_page_from.json of the SHOWN run change the reader record only (the snapshot of the run stays as it is).
  // The agree tick counts for exactly the text that the reader sees, so a translator tick on the half text does not carry over to the full sentence (unit default VW90).
  const cross = crossPageForReader(pageId, pick.built, {
    first: await readTextFile(path.join(pick.dir, CROSS_PAGE_REL)),
    from: await readTextFile(path.join(pick.dir, CROSS_PAGE_FROM_REL)),
  });
  crossLines.push(...cross.lines);
  for (const w of cross.warnings) crossWarnings.push(`${pageId} run ${pick.run.runId}: ${w}`);
  const agree = cross.built.rows.filter((r) => agreedTexts.get(`${pageId}|${r.key}`)?.has(r.ed3)).map((r) => r.key);
  const body = makeReaderPage(pageId, pick.slug, pick.run.runId, cross.built, pick.extras, agree, cross.links);
  // Unit RT73a (VISION-viewer 15.26.14): an agent page that also has a Human version (18d4ac29/p001) searches the kendojidai.com text too. The rows stay as they are.
  // It also gets the web Original text rows (keys <page_id>/web/<unit>), merged by key, so that the Human rows find their Japanese text (VISION-viewer 15.26.13).
  const webHere = webById.get(pageId);
  if (webHere) {
    body.rows = [...body.rows, ...webHere.ja_rows.map(webRowOf)];
    body.search_en = searchColumns({ ja: [], en: [body.search_en, ...webHere.human_rows.map((h) => h.text)] }).search_en;
  }
  const bytes = Buffer.byteLength(JSON.stringify(body), "utf-8");
  for (const f of ["rows", "terms", "extras", "agree"]) {
    const fb = Buffer.byteLength(JSON.stringify(body[f]), "utf-8");
    if (fb >= READER_FIELD_LIMIT) problems.push(`${pageId} reader_pages.${f}: ${mb(fb)}. The limit is 5 MB.`);
  }
  // A search column that reaches the limit was cut. The text after the cut is not searchable. The report lists such pages.
  for (const f of ["search_ja", "search_en"]) if (body[f].length >= SEARCH_COLUMN_MAX) searchCut.push(`${pageId} ${f}`);
  const stored = serverReader?.get(pageId);
  const action = !serverReader ? "not compared" : !stored ? "create" : readerRecordEqual(stored, body) ? "unchanged" : "update";
  readerPlan.push({ pageId, x: pick, why, body, bytes, action, id: stored?.id });
}
// Unit RT74: a stored record with an Agent text that the plan does not keep. A page that has finished local runs was decided above, so its record goes.
// A page without any finished local run (the run folder is gone) keeps its record when its run is open (the old rule: S2 never deletes what it cannot judge). Its run is not open: the record goes.
// The records of the web articles are handled in 3b2, and a page outside --page and --list stays as it is.
const readerPlanned = new Set(readerPlan.map((p) => p.pageId));
const readerRemove = []; // book pages that lose the record: { pageId, id, runId }
const readerServerOnly = [];
if (serverReader) {
  for (const [id, rec] of serverReader) {
    if (readerPlanned.has(id) || webById.has(id) || (filtered && !filter.has(id))) continue;
    const agent = hasAgentRecord(rec);
    if (agent && (runsByPage.has(id) || !isOpenRun(String(rec.item_id), String(rec.run_id)))) readerRemove.push({ pageId: id, id: rec.id, runId: String(rec.run_id) });
    else readerServerOnly.push(id);
  }
}

// 3b2. Web articles (unit RT73a). For each A4 page of the page file:
//   reader_pages    a record with run_id "web-ja" (Original text rows, no Agent text). A page whose plan keeps an Agent text keeps that record. A page whose agent run is not open goes back to this record (unit RT74).
//   reader_versions the chosen Human version, chosen_by empty (chosen by default, round 73 answer 5). S2 writes it once. A choice that an admin removed or changed stays.
//   own_translations a copy of each Human row under the disabled system account (design D26), so that an admin can choose the version again.
const sys = { id: sysUser?.id ?? "" };
const webReaderPlan = [];
const webKept = [];
const versionPlan = [];
const ownPlan = [];
const sysPages = new Set(sysOwn ? [...sysOwn.values()].map((r) => String(r.page_id)) : []);
const humanPages = new Set(serverVersions ? serverVersions.keys() : []);
const agentPlanned = new Set(readerPlan.map((p) => p.pageId));
for (const w of webSel) {
  const pageId = w.page_id;
  const stored = serverReader?.get(pageId);
  // Unit RT74: an agent record of a web page stays only when the plan keeps an Agent text for the page, or when the page has no finished local run and the stored run is open.
  // Else the page goes back to its Original text record (run_id web-ja) below. The compare with the stored record then says "update".
  const storedAgent = Boolean(stored && hasAgentRecord(stored));
  const keepStored = storedAgent && !runsByPage.has(pageId) && isOpenRun(String(stored.item_id), String(stored.run_id));
  if (agentPlanned.has(pageId) || keepStored) {
    webKept.push(`${pageId}: agent record`);
  } else {
    const rows = w.ja_rows.map(webRowOf);
    const cols = searchColumns({ ja: w.ja_rows.map((r) => r.ja), en: w.human_rows.map((h) => h.text) });
    if (cols.cut) searchCut.push(`${pageId} web`);
    const body = { page_id: pageId, item_id: w.item_id, n: w.n, run_id: WEB_RUN_ID, rows, terms: {}, extras: [], agree: [], search_ja: cols.search_ja, search_en: cols.search_en };
    const bytes = Buffer.byteLength(JSON.stringify(body), "utf-8");
    const fb = Buffer.byteLength(JSON.stringify(rows), "utf-8");
    if (fb >= READER_FIELD_LIMIT) problems.push(`${pageId} reader_pages.rows: ${mb(fb)}. The limit is 5 MB.`);
    const action = !serverReader ? "not compared" : !stored ? "create" : readerRecordEqual(stored, body) ? "unchanged" : "update";
    webReaderPlan.push({ pageId, body, bytes, action, id: stored?.id, reverted: storedAgent ? String(stored.run_id) : "" });
  }
  if (w.human_rows.length === 0) continue;
  const versionRows = w.human_rows.map((h) => ({ key: h.key, text: h.text, ...(h.facts?.length ? { facts: h.facts } : {}) }));
  const vbody = { page_id: pageId, user: sys.id, version: WEB_VERSION, run_id: "", rows: versionRows };
  const vbytes = Buffer.byteLength(JSON.stringify(vbody), "utf-8");
  if (Buffer.byteLength(JSON.stringify(versionRows), "utf-8") >= READER_FIELD_LIMIT) problems.push(`${pageId} reader_versions.rows: over 5 MB.`);
  const sv = serverVersions?.get(pageId);
  let vaction;
  if (!serverVersions) vaction = "not compared";
  else if (sv) vaction = String(sv.chosen_by ?? "") !== "" ? "kept (chosen by an admin)" : same(sv.rows ?? null, versionRows) && (!sys.id || String(sv.user ?? "") === sys.id) && Number(sv.version) === WEB_VERSION ? "unchanged" : "update";
  else vaction = sysPages.has(pageId) ? "kept (choice removed by an admin)" : "create";
  versionPlan.push({ pageId, body: vbody, bytes: vbytes, action: vaction, id: sv?.id });
  if (vaction === "create" || vaction === "not compared") humanPages.add(pageId);
  const jaOf = new Map(w.ja_rows.map((r) => [r.key, r]));
  for (const h of w.human_rows) {
    const jr = jaOf.get(h.key);
    const body = { user: sys.id, item_id: w.item_id, page_id: pageId, group_key: h.key, ts_ids: [], part: jr?.part ?? "lines", ja_text: jr?.ja ?? "", run_id: "", ed3_text: "", text: h.text, version: WEB_VERSION, agree: false, facts: h.facts ?? [] };
    const st = sysOwn?.get(`${pageId}|${h.key}`);
    const factsOf = (v) => (Array.isArray(v) && v.length ? v : []);
    const equal = st && String(st.item_id ?? "") === body.item_id && String(st.part ?? "") === body.part && String(st.ja_text ?? "") === body.ja_text && String(st.text ?? "") === body.text && Number(st.version) === WEB_VERSION && same(factsOf(st.facts), factsOf(body.facts));
    ownPlan.push({ pageId, key: h.key, body, bytes: Buffer.byteLength(JSON.stringify(body), "utf-8"), action: !sysOwn ? "not compared" : !st ? "create" : equal ? "unchanged" : "update", id: st?.id });
  }
}


// 3c. catalog_items (unit RC4, round 70). The translated pages of a work are the pages with an Agent text or a Human version, by the one rule function isTranslatedPage
// (unit RT73a, round 73c answer 2): the pages of the plan, and the records that stay on the server (a record whose run folder is gone, or a page outside --page and --list).
// A page with only the Original text rows of a web article (run_id "web-ja") does not count. The v1 placeholder is not in this script at all.
// The body of each record holds them, so that a reader who waits for approval sees the progress with one request (round 69 answer 9).
const translatedBy = new Map(); // slug -> Set of page numbers
const countTranslated = (rec, agent, human) => {
  if (!isTranslatedPage({ agent, human })) return;
  const slug = String(rec.item_id);
  const n = Number(rec.n);
  if (!Number.isInteger(n) || n < 1) return;
  if (!translatedBy.has(slug)) translatedBy.set(slug, new Set());
  translatedBy.get(slug).add(n);
};
const planned = new Set([...readerPlan, ...webReaderPlan].map((p) => p.pageId));
for (const p of readerPlan) countTranslated(p.body, hasAgentRecord(p.body), humanPages.has(p.pageId));
for (const p of webReaderPlan) countTranslated(p.body, false, humanPages.has(p.pageId));
const removedIds = new Set(readerRemove.map((r) => r.pageId));
if (serverReader) for (const [id, rec] of serverReader) if (!planned.has(id)) countTranslated(rec, hasAgentRecord(rec) && !removedIds.has(id), humanPages.has(id));
for (const it of items) it.body = catalogBody(it.slug, it.row, it.folderPages, [...(translatedBy.get(it.slug) ?? [])].sort((a, b) => a - b), it.placement, webPageCount.get(it.slug) ?? 0);
const catalogBytes = items.reduce((t, it) => t + Buffer.byteLength(JSON.stringify(it.body), "utf-8"), 0);
for (const it of items) {
  const fb = Buffer.byteLength(JSON.stringify(it.body.translated), "utf-8");
  if (fb >= 1048576) problems.push(`${it.slug} catalog_items.translated: ${mb(fb)}. The limit is 1 MB.`);
}
const itemPlan = items.map((it) => {
  if (!serverItems) return { it, action: "not compared" };
  const stored = serverItems.get(it.slug);
  if (!stored) return { it, action: "create" };
  return { it, action: catalogRecordEqual(stored, it.body) ? "unchanged" : "update", id: stored.id };
});

// 4. Print the plan.
const total = selected.reduce((s, x) => s + x.bytes, 0);
console.log(`Mode: ${o.apply ? "APPLY (writes to the server)" : "DRY RUN (writes nothing)"}`);
console.log(`Server: ${base}${o.offline ? " (offline, not compared)" : ""}`);
console.log(`Data: ${dataDir}`);
console.log(`Selection: ${filtered ? `${filter.size} page ID(s) from --page and --list` : "all pages with a finished run"}`);
console.log(`Metadata file: ${meta.source}`);
const webItems = items.filter((it) => it.body.kind === "web-article");
const stamped = webItems.filter((it) => it.placement?.print_year);
console.log(`Catalog: ${meta.rows} metadata rows (${items.length - webItems.length} other items, ${webItems.length} web articles), ${bookSlugs.size} book folders of book-slugs.json, ${items.length} rows in all, ${mb(catalogBytes)}`);
console.log(`Placement: ${webItems.length} web articles, ${stamped.length} with a print stamp, ${placements.changed.length} override row(s) change a month${placements.changed.length ? " (" + placements.changed.join("; ") + ")" : ""}`);
console.log(`Translated pages (rule isTranslatedPage, an Agent text or a Human version exists): ${[...translatedBy.values()].reduce((t, set) => t + set.size, 0)} in ${translatedBy.size} work(s)`);
console.log(`Web articles (page file ${webFile}): articles ${fmt(webTotals.articles)}, pages ${fmt(webTotals.pages)}, rows ${fmt(webTotals.rows)}, Human rows ${fmt(webTotals.human)}, changed marks ${fmt(webTotals.changed)}, dropped marks ${fmt(webTotals.dropped)}${filtered ? ` (selected by --page and --list: ${fmt(webSel.length)} pages)` : ""}`);
console.log("");
console.log("page_id | run_id | verdict | score | snapshot size | action");
for (const p of plan) {
  const x = p.x;
  console.log(`${x.pageId} | ${x.run.runId} | ${x.run.verdict} | ${x.run.score ?? "none"} | ${mb(x.bytes)} | ${p.action}`);
}
console.log("");
console.log("catalog_items | title | translated pages | action");
const countsOf = (list) => ({ create: list.filter((p) => p.action === "create").length, update: list.filter((p) => p.action === "update").length, unchanged: list.filter((p) => p.action === "unchanged").length });
// The 36 folders and the items of the selected runs show one line each. The web articles without a run show one summary line (311 lines would hide the rest).
for (const p of itemPlan) {
  const quiet = p.it.body.kind === "web-article" && !selected.some((x) => x.slug === p.it.slug);
  if (!quiet) console.log(`${p.it.slug} | ${p.it.body.title_en || p.it.body.title_ja || "(no title: no metadata row has this item_id)"} | ${p.it.body.translated.en.length} | ${p.action}`);
}
{
  const quietPlans = itemPlan.filter((p) => p.it.body.kind === "web-article" && !selected.some((x) => x.slug === p.it.slug));
  const c = countsOf(quietPlans);
  const tp = quietPlans.reduce((t, p) => t + p.it.body.translated.en.length, 0);
  const pg = quietPlans.reduce((t, p) => t + p.it.body.pages, 0);
  console.log(`web articles | ${quietPlans.length} rows | ${fmt(tp)} translated pages of ${fmt(pg)} pages | ${serverItems ? `create ${c.create}, update ${c.update}, unchanged ${c.unchanged}` : "not compared"}`);
}
console.log("");
console.log("magazine_chapters | rows | create | update | unchanged");
for (const book of [...new Set(chapters.map((c) => c.book))].sort()) {
  const mine = chapterPlan.filter((p) => p.c.book === book);
  const n = (a) => (serverChapters ? mine.filter((p) => p.action === a).length : "-");
  console.log(`${book} | ${mine.length} | ${n("create")} | ${n("update")} | ${n("unchanged")}`);
}
console.log("");
console.log("reader_pages | page_id | run_id | why | size | rows | agree | action");
for (const p of readerPlan) console.log(`reader_pages | ${p.pageId} | ${p.x.run.runId} | ${p.why} | ${mb(p.bytes)} | ${p.body.rows.length} | ${p.body.agree.length} | ${p.action}`);
// Unit VW90: the files of the shown run that change a reader record, and the files that S2 skipped. Nothing prints for a run without the files.
for (const l of crossLines) console.log(l);
for (const w of crossWarnings) console.log(`Warning: ${w}`);
// Unit RT74: the pages that lose the Agent text because their run is not open (round 75 answer 3).
{
  const lose = [
    ...readerRemove.map((r) => ({ pageId: r.pageId, runId: r.runId, action: "remove agent text (run not open)" })),
    ...webReaderPlan.filter((p) => p.reverted).map((p) => ({ pageId: p.pageId, runId: p.reverted, action: "back to Original text record web-ja (run not open)" })),
  ].sort((a, b) => (a.pageId < b.pageId ? -1 : 1));
  for (const l of lose) console.log(`reader_pages | ${l.pageId} | ${l.runId} | ${l.action}`);
  const warn = readerRemove.filter((r) => humanPages.has(r.pageId));
  for (const r of warn) console.log(`Warning: ${r.pageId} has a Human version. After the removal of its record the page shows no text to readers.`);
}
console.log("");
{
  const cnt = (list) => ({ create: list.filter((p) => p.action === "create").length, update: list.filter((p) => p.action === "update").length, unchanged: list.filter((p) => p.action === "unchanged").length, kept: list.filter((p) => p.action.startsWith("kept")).length });
  const w1 = cnt(webReaderPlan);
  const w2 = cnt(versionPlan);
  const w3 = cnt(ownPlan);
  const sum = (list) => list.reduce((t, p) => t + p.bytes, 0);
  console.log("web articles | collection | records | size | create | update | unchanged | kept");
  console.log(`web articles | reader_pages (run_id web-ja) | ${fmt(webReaderPlan.length)} | ${mb(sum(webReaderPlan))} | ${w1.create} | ${w1.update} | ${w1.unchanged} | ${webKept.length} agent record(s) kept${webKept.length ? " (" + webKept.join(", ") + ")" : ""}`);
  console.log(`web articles | reader_versions (chosen_by empty) | ${fmt(versionPlan.length)} | ${mb(sum(versionPlan))} | ${w2.create} | ${w2.update} | ${w2.unchanged} | ${w2.kept}`);
  console.log(`web articles | own_translations (account ${WEB_SYSTEM_NAME}) | ${fmt(ownPlan.length)} | ${mb(sum(ownPlan))} | ${w3.create} | ${w3.update} | ${w3.unchanged} | 0`);
  console.log(`web articles | system account ${WEB_SYSTEM_EMAIL} | 1 | - | ${serverReader ? (sysUser ? "exists" : "create") : "not compared"} | | |`);
  console.log("");
}
if (problems.length) {
  console.log("Snapshot checks FAILED:");
  for (const m of problems) console.log("  " + m);
  console.log("The command writes nothing.");
  process.exit(1);
}
const sizes = selected.map((x) => x.bytes).sort((a, b) => a - b);
if (sizes.length) console.log(`Snapshot sizes: min ${mb(sizes[0])}, median ${mb(sizes[Math.floor(sizes.length / 2)])}, max ${mb(sizes[sizes.length - 1])}, total ${mb(total)} (limit 5 MB each, 1 MB = 1,048,576 bytes)`);

const readerSizes = readerPlan.map((p) => p.bytes).sort((a, b) => a - b);
const readerTotal = readerSizes.reduce((t, n) => t + n, 0);
if (readerSizes.length) console.log(`reader_pages sizes: ${readerSizes.length} record(s), min ${mb(readerSizes[0])}, median ${mb(readerSizes[Math.floor(readerSizes.length / 2)])}, max ${mb(readerSizes[readerSizes.length - 1])}, total ${mb(readerTotal)} (limit 5 MB for each JSON field)`);
else console.log("reader_pages sizes: 0 records");

// 5. Apply.
const done = { created: [], updated: [], unchanged: [], failed: [] };
const itemDone = { created: [], updated: [], unchanged: [], failed: [] };
const chapterDone = { created: [], updated: [], unchanged: [], failed: [] };
const readerDone = { created: [], updated: [], unchanged: [], removed: [], failed: [] };
// Unit RT73a: results of the web articles. user is "created", "exists", or "".
const webDone = {
  user: sysUser ? "exists" : "",
  reader: { created: [], updated: [], unchanged: [], failed: [] },
  versions: { created: [], updated: [], unchanged: [], kept: [], failed: [] },
  own: { created: [], updated: [], unchanged: [], failed: [] },
};
if (sysUser && sysUser.disabled !== true) console.error(`Warning: the system account ${WEB_SYSTEM_EMAIL} is not disabled. S2 does not change it. Disable it in PocketBase.`);
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
  for (const p of chapterPlan) {
    if (p.action === "unchanged") {
      chapterDone.unchanged.push(p.c.chapter);
      continue;
    }
    try {
      if (p.action === "create") await pb.call("POST", "/api/collections/magazine_chapters/records", p.c);
      else await pb.call("PATCH", `/api/collections/magazine_chapters/records/${encodeURIComponent(p.id)}`, p.c);
      (p.action === "create" ? chapterDone.created : chapterDone.updated).push(p.c.chapter);
    } catch (e) {
      chapterDone.failed.push(`${p.c.chapter}: ${e.message}`);
    }
  }
  for (const p of readerPlan) {
    if (p.action === "unchanged") {
      readerDone.unchanged.push(p.pageId);
      continue;
    }
    try {
      if (p.action === "create") await pb.call("POST", "/api/collections/reader_pages/records", p.body);
      else await pb.call("PATCH", `/api/collections/reader_pages/records/${encodeURIComponent(p.id)}`, p.body);
      (p.action === "create" ? readerDone.created : readerDone.updated).push(p.pageId);
    } catch (e) {
      readerDone.failed.push(`${p.pageId}: ${e.message}`);
    }
  }
  // Unit RT74: a book page whose run is not open loses its record. The web article pages go back to the Original text record in the loop below (update).
  for (const r of readerRemove) {
    try {
      await pb.call("DELETE", `/api/collections/reader_pages/records/${encodeURIComponent(r.id)}`);
      readerDone.removed.push(r.pageId);
    } catch (e) {
      readerDone.failed.push(`${r.pageId}: ${e.message}`);
    }
  }
  // Unit RT73a. 1. The system account (a random password that nobody sees, disabled, so it can never sign in). 2. reader_pages "web-ja". 3. own_translations. 4. reader_versions.
  for (const p of webReaderPlan) {
    if (p.action === "unchanged") {
      webDone.reader.unchanged.push(p.pageId);
      continue;
    }
    try {
      if (p.action === "create") await pb.call("POST", "/api/collections/reader_pages/records", p.body);
      else await pb.call("PATCH", `/api/collections/reader_pages/records/${encodeURIComponent(p.id)}`, p.body);
      (p.action === "create" ? webDone.reader.created : webDone.reader.updated).push(p.pageId);
    } catch (e) {
      webDone.reader.failed.push(`${p.pageId}: ${e.message}`);
    }
  }
  const needAccount = [...versionPlan, ...ownPlan].some((p) => p.action === "create" || p.action === "update");
  if (needAccount && !sys.id) {
    try {
      const pw = randomBytes(24).toString("base64url"); // in memory only, never printed, never stored by S2
      const d = await pb.call("POST", "/api/collections/users/records", {
        email: WEB_SYSTEM_EMAIL, name: WEB_SYSTEM_NAME, password: pw, passwordConfirm: pw, verified: true, emailVisibility: false, role: "reader", approved: false, disabled: true,
      });
      sys.id = String(d.id);
      webDone.user = "created";
    } catch (e) {
      webDone.own.failed.push(`system account ${WEB_SYSTEM_EMAIL}: ${e.message}`);
    }
  }
  if (sys.id) {
    for (const p of [...versionPlan, ...ownPlan]) p.body.user = sys.id;
    await pool(ownPlan, 8, async (p) => {
      if (p.action === "unchanged") {
        webDone.own.unchanged.push(p.key);
        return;
      }
      try {
        if (p.action === "create") await pb.call("POST", "/api/collections/own_translations/records", p.body);
        else await pb.call("PATCH", `/api/collections/own_translations/records/${encodeURIComponent(p.id)}`, p.body);
        (p.action === "create" ? webDone.own.created : webDone.own.updated).push(p.key);
      } catch (e) {
        webDone.own.failed.push(`${p.key}: ${e.message}`);
      }
    });
    for (const p of versionPlan) {
      if (p.action === "unchanged") {
        webDone.versions.unchanged.push(p.pageId);
        continue;
      }
      if (p.action.startsWith("kept")) {
        webDone.versions.kept.push(p.pageId);
        continue;
      }
      try {
        if (p.action === "create") await pb.call("POST", "/api/collections/reader_versions/records", p.body);
        else await pb.call("PATCH", `/api/collections/reader_versions/records/${encodeURIComponent(p.id)}`, p.body);
        (p.action === "create" ? webDone.versions.created : webDone.versions.updated).push(p.pageId);
      } catch (e) {
        webDone.versions.failed.push(`${p.pageId}: ${e.message}`);
      }
    }
  }
} else {
  for (const p of readerPlan) if (p.action !== "not compared") (p.action === "create" ? readerDone.created : p.action === "update" ? readerDone.updated : readerDone.unchanged).push(p.pageId);
  for (const r of readerRemove) readerDone.removed.push(r.pageId);
  for (const p of chapterPlan) if (p.action !== "not compared") (p.action === "create" ? chapterDone.created : p.action === "update" ? chapterDone.updated : chapterDone.unchanged).push(p.c.chapter);
  for (const p of plan) if (p.action !== "not compared") (p.action === "create" ? done.created : p.action === "update" ? done.updated : done.unchanged).push(`${p.x.pageId} ${p.x.run.runId}`);
  for (const p of itemPlan) if (p.action !== "not compared") (p.action === "create" ? itemDone.created : p.action === "update" ? itemDone.updated : itemDone.unchanged).push(p.it.slug);
  // Unit RT73a
  const sortIn = (done, list, id) => {
    for (const p of list) if (p.action !== "not compared") (p.action === "create" ? done.created : p.action === "update" ? done.updated : p.action.startsWith("kept") ? (done.kept ?? done.unchanged) : done.unchanged).push(id(p));
  };
  sortIn(webDone.reader, webReaderPlan, (p) => p.pageId);
  sortIn(webDone.own, ownPlan, (p) => p.key);
  sortIn(webDone.versions, versionPlan, (p) => p.pageId);
  if (serverReader && !sysUser && [...versionPlan, ...ownPlan].some((p) => p.action === "create")) webDone.user = "would create";
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
// Up to 40 slugs show in the line. A longer list shows the first 5 and the count (310 slugs would fill the screen).
const shortLine = (name, list) => console.log(`  ${name}: ${list.length}${list.length ? " (" + (list.length > 40 ? list.slice(0, 5).join(", ") + ", ..." : list.join(", ")) + ")" : ""}`);
const itemCompared = (name, list) => (o.offline ? console.log(`  ${name}: not compared`) : shortLine(name, list));
itemCompared(word[0], itemDone.created);
itemCompared(word[1], itemDone.updated);
itemCompared(word[2], itemDone.unchanged);
if (o.apply) shortLine("failed", itemDone.failed);
console.log("magazine_chapters");
const chapterLine = (name, list) => (o.offline ? console.log(`  ${name}: not compared`) : console.log(`  ${name}: ${list.length}`));
chapterLine(word[0], chapterDone.created);
chapterLine(word[1], chapterDone.updated);
chapterLine(word[2], chapterDone.unchanged);
if (o.apply) console.log(`  failed: ${chapterDone.failed.length}${chapterDone.failed.length ? " (" + chapterDone.failed.join(", ") + ")" : ""}`);
console.log("web articles (unit RT73a)");
{
  const cmp = (name, list) => (o.offline ? console.log(`  ${name}: not compared`) : console.log(`  ${name}: ${fmt(list.length)}`));
  console.log(`  system account ${WEB_SYSTEM_EMAIL}: ${o.offline ? "not compared" : webDone.user || "none needed"}`);
  for (const [name, d] of [["reader_pages web-ja", webDone.reader], ["reader_versions", webDone.versions], ["own_translations", webDone.own]]) {
    cmp(`${name} ${word[0]}`, d.created);
    cmp(`${name} ${word[1]}`, d.updated);
    cmp(`${name} ${word[2]}`, d.unchanged);
    if (d.kept) cmp(`${name} kept (choice removed or changed by an admin)`, d.kept);
    if (o.apply) line(`${name} failed`, d.failed);
  }
  line("agent records kept (no web-ja record written)", webKept);
}
console.log("reader_pages");
compared(word[0], readerDone.created);
compared(word[1], readerDone.updated);
compared(word[2], readerDone.unchanged);
compared(o.apply ? "removed (run not open)" : "would remove (run not open)", readerDone.removed);
if (o.apply) line("failed", readerDone.failed);
line("no Agent text: the page has a finished run, but no open run", readerNotOpen);
line("no Agent text: open run without PASS verdict and no run mark on an open run", readerSkipped);
if (o.offline) console.log("  Opened runs: not read (--offline). The plan counts every run as open.");
line("search column reached 100,000 characters and was cut", searchCut);
line("on the server only (kept)", readerServerOnly);
console.log(`Total snapshot size: ${mb(total)} for ${selected.length} run(s)`);
console.log(`Total reader_pages size: ${mb(readerTotal)} for ${readerPlan.length} record(s)`);
if (!o.apply) console.log("Nothing was written. Add --apply to write.");
process.exit(done.failed.length || itemDone.failed.length || chapterDone.failed.length || readerDone.failed.length || webDone.reader.failed.length || webDone.versions.failed.length || webDone.own.failed.length ? 1 : 0);
