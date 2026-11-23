#!/usr/bin/env node
// Sync command of the dictionary (unit VW126, plan item P65, Q-A 3:117.6 row 2).
// Owner pick (Q-A 3:117.6 "Live site and this Mac"): the live site has no access to the Translator files, so the entries of the dictionary file
// <Translator folder>/data/termbase/termbase.draft.jsonl (1,030 entries) are copied into the PocketBase list dictionary_entries (migration 1793300019).
// Dry run is the default and writes nothing. Only --apply writes. The command is safe to run twice:
// an equal record stays as it is, a different record is updated, a missing record is created.
// An entry that the file no longer holds stays on the server. The report lists it as "on the server only (kept)". The command never deletes a record.
// Node built-ins only. The record rules come from app/lib/dictionary-record.ts and app/lib/dictionary-sync-rules.ts, the same files that the tests use.
// Run `node scripts/sync-dictionary.mjs --help` in the app folder.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "..");
const { installTsResolveHook } = await import("./ts-resolve-hook.mjs");
installTsResolveHook();
const { DICT_COLLECTION } = await import("../lib/dictionary-core.ts");
const { bodyOf, planDictionary, recordsOfTermbase } = await import("../lib/dictionary-sync-rules.ts");

// ---------------------------------------------------------------- constants and small helpers

const DEFAULT_URL = "http://127.0.0.1:8090";
const LOCAL_HOSTS = ["127.0.0.1", "localhost"];
const MB = 1048576;
const SHOW = 10; // the most names that the report lists for one group

/** Size in MB with two decimals. */
const mb = (bytes) => (bytes / MB).toFixed(2) + " MB";

function fail(message) {
  console.error("Error: " + message);
  process.exit(2);
}

const HELP = `Sync the dictionary: copy the entries of termbase.draft.jsonl into the PocketBase list ${DICT_COLLECTION}.
Dry run is the default. It reads the file and the server and writes nothing. Only --apply writes.

Usage: node scripts/sync-dictionary.mjs [options]
  --url URL          PocketBase address. Default ${DEFAULT_URL}. Plain http is allowed for 127.0.0.1 and localhost only.
  --superuser EMAIL  Superuser email. Default: the env variable PB_SUPERUSER_EMAIL. The password comes from a hidden prompt, or one line on stdin.
  --termbase FILE    The dictionary file. Default: the env variable VIEWER_TERMBASE_DIR plus /termbase.draft.jsonl, else translatorDataDir of viewer.config.json plus /termbase/termbase.draft.jsonl.
  --apply            Write to PocketBase. Without it the command writes nothing.
  --offline          Dry run without sign-in. It skips the compare with the server, so every entry counts as new.
  --help             This text.

The command creates and updates records. It never deletes one. An entry that the file no longer holds stays on the server.
Migration 1793300019 adds the list. Without it, the command stops. Restart PocketBase after you add the migration file.
`;

function parseArgs(argv) {
  const o = { url: DEFAULT_URL, superuser: process.env.PB_SUPERUSER_EMAIL ?? "", termbase: "", apply: false, offline: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) fail(`The option ${a} needs a value.`);
      return v;
    };
    if (a === "--url") o.url = value();
    else if (a === "--superuser") o.superuser = value();
    else if (a === "--termbase") o.termbase = value();
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

async function termbaseFileOf(o) {
  if (o.termbase) return path.resolve(o.termbase);
  const env = process.env.VIEWER_TERMBASE_DIR?.trim();
  if (env) return path.join(path.resolve(env), "termbase.draft.jsonl");
  const cfgFile = process.env.VIEWER_CONFIG ? path.resolve(process.env.VIEWER_CONFIG) : path.join(appDir, "viewer.config.json");
  let cfg;
  try {
    cfg = JSON.parse(await fs.readFile(cfgFile, "utf-8"));
  } catch {
    fail(`Cannot read ${cfgFile}. Use --termbase FILE.`);
  }
  if (!cfg.translatorDataDir || typeof cfg.translatorDataDir !== "string") fail(`${cfgFile} has no key translatorDataDir. Use --termbase FILE.`);
  return path.join(path.resolve(cfg.translatorDataDir), "termbase", "termbase.draft.jsonl");
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
  /** All records of a collection. opts: fields (a field list), perPage (default 100, 500 at most). */
  async listAll(collection, opts = {}) {
    const out = [];
    const extra = opts.fields ? `&fields=${encodeURIComponent(opts.fields)}` : "";
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

/** Run fn for every item with `size` calls at the same time. */
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

// ---------------------------------------------------------------- run

const o = parseArgs(process.argv.slice(2));
if (o.help) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (o.apply && o.offline) fail("--apply needs the server. Do not use --apply with --offline.");
const base = checkUrl(o.url);
const file = await termbaseFileOf(o);
let text;
try {
  text = await fs.readFile(file, "utf-8");
} catch {
  fail(`Cannot read the dictionary file ${file}.`);
}
const { records, bad, duplicates } = recordsOfTermbase(text);
if (!records.length) fail(`The dictionary file ${file} holds no entry.`);
console.log(`Dictionary file: ${file} (${mb(Buffer.byteLength(text))})`);
console.log(`  Entries: ${records.length}. Bad lines skipped: ${bad}. Repeated entry IDs skipped: ${duplicates}.`);

let server = null; // null = not read (--offline)
const pb = new Pb(base);
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
    const col = await pb.call("GET", `/api/collections/${DICT_COLLECTION}`);
    const names = new Set((col.fields ?? []).map((f) => f.name));
    const missing = ["entry_id", "headword", "variants", "reading", "romaji", "concise_en", "short_en", "common", "view", "search_ja", "search_en", "sort_key"].filter((n) => !names.has(n));
    if (missing.length) fail(`The list ${DICT_COLLECTION} has no field ${missing.join(", ")}. Restart PocketBase so that migration 1793300019 runs.`);
  } catch (e) {
    if (e.message.startsWith("HTTP 404")) fail(`The list ${DICT_COLLECTION} does not exist. Restart PocketBase so that migration 1793300019 runs.`);
    throw e;
  }
  server = await pb.listAll(DICT_COLLECTION, { perPage: 500 });
}

const plan = planDictionary(records, server);
const names = (list) => list.slice(0, SHOW).map((r) => `${r.headword} (${r.entry_id})`).join(", ") + (list.length > SHOW ? `, and ${list.length - SHOW} more` : "");
console.log(`Plan${o.offline ? " (the server was not read, --offline)" : ""}:`);
console.log(`  New (create): ${plan.create.length}${plan.create.length ? ` - ${names(plan.create)}` : ""}`);
console.log(`  Changed (update): ${plan.update.length}${plan.update.length ? ` - ${names(plan.update.map((u) => u.record))}` : ""}`);
console.log(`  Same (nothing to do): ${plan.same}`);
console.log(`  On the server only (kept): ${plan.serverOnly.length}${plan.serverOnly.length ? ` - ${plan.serverOnly.slice(0, SHOW).join(", ")}${plan.serverOnly.length > SHOW ? `, and ${plan.serverOnly.length - SHOW} more` : ""}` : ""}`);
if (o.offline) console.log("  The server was not read (--offline). Run without --offline to see create, update, and same.");

let failed = 0;
if (o.apply) {
  const failures = [];
  const base_ = `/api/collections/${DICT_COLLECTION}/records`;
  await pool(plan.create, 4, async (rec) => {
    try {
      await pb.call("POST", base_, bodyOf(rec));
    } catch (e) {
      failures.push(`create ${rec.entry_id}: ${e.message}`);
    }
  });
  await pool(plan.update, 4, async (u) => {
    try {
      await pb.call("PATCH", `${base_}/${encodeURIComponent(u.id)}`, bodyOf(u.record));
    } catch (e) {
      failures.push(`update ${u.record.entry_id}: ${e.message}`);
    }
  });
  failed = failures.length;
  console.log(`Written: created ${plan.create.length - failures.filter((f) => f.startsWith("create")).length}, updated ${plan.update.length - failures.filter((f) => f.startsWith("update")).length}, failed ${failed}.`);
  for (const f of failures.slice(0, SHOW)) console.log("  " + f);
} else {
  console.log("Nothing was written. Add --apply to write.");
}
process.exit(failed ? 1 : 0);
