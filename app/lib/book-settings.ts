import "server-only";
import { promises as fs } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadConfig } from "./config";
import { PathError } from "./safe-path";
import { parseSettingsJson, incrementInteger, stringifySettingsJson, type JsonInteger } from "./settings-json";
import { KEY_ORDER, SCHEMA, diffSettings, nestSettings, object, validateSettings, type FlatSettings } from "./settings-schema";
import { readSettings, SettingsWriteError, type Change } from "./settings-run";
import type { Oc2Block } from "./oc2-models-rules"; // unit VW125
import { BOOK_CONFLICT, BOOK_FOLDER, bookFileLabel, effectiveRows, isSafeBookName, labelBookError, type EffectiveRow } from "./book-settings-rules";

// Unit VW122 (plan P61, card P61.2, Q-A 3:112.3 rows 1 to 6 and 11). Server side of the Run settings of one book.
// It reads and writes <translatorConfigDir>/book-settings/<book>.json and <book>.history.jsonl (TR101 report, "The book file format").
// The save follows saveSettings of lib/settings-run.ts (lock file, temp file, sha1 check, rename, history line), but it is a new file, because the dev server keeps old module instances.
// The Python code never writes these files. The Translator reads the book file on every page, so a half written file is a fault: write a temp file, then rename.

export type BookHistory = { utc: string; revision: number | JsonInteger; changes: Change[]; sha1_before: string | null; sha1_after: string };
export type BookSettingsSnapshot = {
  book: string;
  /** The fixed text of the file in errors and on the screen: config/book-settings/<book>.json. */
  file: string;
  /** sha1 of the book file bytes, null when there is no file. The save sends it back (optimistic lock). */
  sha1: string | null;
  exists: boolean;
  revision: number | JsonInteger;
  updated_utc: string | null;
  /** The keys that the book file holds. */
  overrides: FlatSettings;
  /** The error line of a book file that cannot be read or fails the checks. The form then keeps the file as it is. */
  error: string | null;
  history_error: string | null;
  history: BookHistory[];
  /** The global side (the same reading as the panel /settings/run). */
  global_error: string | null;
  global_overrides: FlatSettings;
  defaults: FlatSettings;
  models: string[];
  variants: string[];
  /** Unit VW125 (Q-A 3:118.2 rows 1, 2, 4): the list of all oc2 models, read with the global side. */
  oc2: Oc2Block;
  n_rule: string | null;
  n_rule_error: string | null;
  /** For each field: the value of the next page and its source (this book or global). */
  effective: EffectiveRow[];
};

const hash = (text: string) => createHash("sha1").update(text).digest("hex");
const code = (e: unknown) => (e as NodeJS.ErrnoException).code;
async function readOrNull(file: string) { try { return await fs.readFile(file, "utf8"); } catch (e) { if (code(e) === "ENOENT") return null; throw e; } }

type Paths = { dir: string; file: string; history: string };
/**
 * The paths of one book. The name is checked first, so no path leaves the folder. The folder must be a real folder, not a link.
 * A file must be a regular file with no links (the rule of settingsFile in lib/safe-path.ts). `make` creates the folder (the first save).
 */
async function bookPaths(root: string, book: string, make = false): Promise<Paths> {
  if (!isSafeBookName(book)) throw new PathError("Not a safe book name.");
  if (!root) throw new PathError("No Translator configuration folder.");
  const base = await fs.realpath(root);
  const dir = path.join(base, BOOK_FOLDER);
  let st = await fs.lstat(dir).catch((e: unknown) => { if (code(e) === "ENOENT") return null; throw e; });
  if (!st && make) { await fs.mkdir(dir, { recursive: true }); st = await fs.lstat(dir); }
  if (st && !st.isDirectory()) throw new PathError("The book settings folder must be a real folder.");
  const out = { dir, file: path.join(dir, `${book}.json`), history: path.join(dir, `${book}.history.jsonl`) };
  for (const f of [out.file, out.history]) {
    const fst = await fs.lstat(f).catch((e: unknown) => { if (code(e) === "ENOENT") return null; throw e; });
    if (fst && (!fst.isFile() || fst.nlink !== 1)) throw new PathError("A book settings file must be a regular file without links.");
  }
  return out;
}

/** Parse and check the text of a book file. The errors name the book file (TR101 unit default 7). */
function parseBookFile(raw: string, book: string) {
  let doc: unknown;
  try { doc = parseSettingsJson(raw); }
  catch (e) { throw new Error(`${bookFileLabel(book)}: the file is not valid JSON (${(e as Error).message})`); }
  let overrides: FlatSettings;
  try { overrides = validateSettings(doc); }
  catch (e) { throw new Error(labelBookError((e as Error).message, book)); }
  return { doc: doc as Record<string, unknown>, overrides };
}

async function currentBook(paths: Paths, book: string) {
  const raw = await readOrNull(paths.file);
  if (raw === null) return { raw, doc: {} as Record<string, unknown>, overrides: {} as FlatSettings, sha1: null as string | null };
  return { raw, ...parseBookFile(raw, book), sha1: hash(raw) };
}

async function readHistory(paths: Paths, book: string): Promise<BookHistory[]> {
  const text = (await readOrNull(paths.history)) ?? "";
  return text.trim().split("\n").filter(Boolean).slice(-20).reverse().map((line) => {
    const h = parseSettingsJson(line);
    if (!object(h) || !Array.isArray(h.changes) || typeof h.utc !== "string") throw new Error(`${book}.history.jsonl: a history record is malformed.`);
    return { utc: h.utc, revision: h.revision as number | JsonInteger, sha1_before: h.sha1_before as string | null, sha1_after: String(h.sha1_after), changes: h.changes.filter((c) => object(c) && KEY_ORDER.includes(String(c.key))) as Change[] };
  });
}

/**
 * The reading for the form and the dialogs. It never throws for a broken file: the error goes into `error` (book file) or `history_error`.
 * Q-A 3:112.3 row 11: a book file that cannot be read or fails the checks gives the error line, and the form keeps the file as it is.
 */
export async function readBookSettings(book: string): Promise<BookSettingsSnapshot> {
  const cfg = await loadConfig();
  const g = await readSettings();
  const snap: BookSettingsSnapshot = {
    book, file: bookFileLabel(book), sha1: null, exists: false, revision: 0, updated_utc: null, overrides: {}, error: null, history_error: null, history: [],
    global_error: g.error, global_overrides: g.overrides, defaults: g.defaults, models: g.models, variants: g.variants, oc2: g.oc2, n_rule: g.n_rule, n_rule_error: g.n_rule_error, effective: [],
  };
  try {
    const paths = await bookPaths(cfg.translatorConfigDir, book);
    const raw = await readOrNull(paths.file);
    if (raw !== null) { snap.exists = true; snap.sha1 = hash(raw); }
    if (raw !== null) {
      const c = parseBookFile(raw, book);
      Object.assign(snap, { revision: c.doc.revision ?? 0, updated_utc: typeof c.doc.updated_utc === "string" ? c.doc.updated_utc : null, overrides: c.overrides });
    }
    try { snap.history = await readHistory(paths, book); } catch (e) { snap.history_error = (e as Error).message; }
  } catch (e) { snap.error = (e as Error).message; }
  // A broken book file or a broken global file gives no merge view: the run does not use these values, so the screens must not show them as in use.
  snap.effective = snap.error || snap.global_error || !Object.keys(snap.defaults).length ? [] : effectiveRows(snap.overrides, snap.global_overrides, snap.defaults);
  return snap;
}

async function exclusiveFile(file: string, kind: "lock" | "temporary") {
  let handle: FileHandle;
  try { handle = await fs.open(file, "wx", 0o600); }
  catch (e) {
    if (code(e) === "EEXIST") throw new SettingsWriteError(409, `Another save or a stale ${kind} file blocks this save (${path.basename(file)}). Reload before you retry. If no save runs, remove the stale file by hand.`);
    throw e;
  }
  try { return { handle, stat: await handle.stat() }; }
  catch (e) { await handle.close(); throw e; }
}

async function releaseFile(file: string, owned: { handle: FileHandle; stat: { dev: number; ino: number } }) {
  await owned.handle.close().catch(() => undefined);
  try {
    const stat = await fs.lstat(file);
    // Never remove a file that replaced this save's file at the same path.
    if (stat.dev === owned.stat.dev && stat.ino === owned.stat.ino) await fs.unlink(file);
  } catch (e) { if (code(e) !== "ENOENT") throw e; }
}

/**
 * Save the book file. `doc` is the nested form of ALL keys that the book file must hold after the save (Q-A 3:112.3 row 3: only the changed values).
 * A key that `doc` lacks leaves the file ("Use global", row 2). The file stays when the last key goes: a valid file with no value key means "follow the global file".
 * Checks: a valid doc (labelled errors), the sha1 of the file that the form read (BOOK_CONFLICT), a readable global side, a readable history, at least one change.
 * Q-A 3:112.3 row 6: a save while the book runs is allowed. The Translator reads the file at the next page.
 */
export async function saveBookSettings(book: string, doc: unknown, expectedSha1: string | null): Promise<BookSettingsSnapshot> {
  let flat: FlatSettings;
  try { flat = validateSettings(doc); }
  catch (e) { throw new Error(labelBookError((e as Error).message, book)); }
  const cfg = await loadConfig();
  const paths = await bookPaths(cfg.translatorConfigDir, book, true);
  const part = paths.file + ".part";
  const lockPath = paths.file + ".lock";
  const lock = await exclusiveFile(lockPath, "lock");
  try {
    const temp = await exclusiveFile(part, "temporary");
    try {
      // A broken book file blocks the save. Never replace a file that the owner may have written by hand.
      const before = await currentBook(paths, book);
      if (before.sha1 !== expectedSha1) throw new SettingsWriteError(409, BOOK_CONFLICT);
      const snapshot = await readBookSettings(book);
      if (snapshot.global_error) throw new SettingsWriteError(400, `The global settings file has an error, so the global values are unknown: ${snapshot.global_error}`);
      if (snapshot.history_error) throw new SettingsWriteError(400, snapshot.history_error);
      const changes = diffSettings(before.overrides, flat);
      if (!changes.length) throw new SettingsWriteError(400, "No changes to save.");
      const utc = new Date().toISOString();
      const revision = incrementInteger(before.doc.revision);
      const text = stringifySettingsJson({ schema: SCHEMA, revision, updated_utc: utc, ...nestSettings(flat) }, 1) + "\n";
      const entry: BookHistory = { utc, revision, changes, sha1_before: before.sha1, sha1_after: hash(text) };
      // Open the history before the replacement, so a normal permission error cannot change only the book file.
      const log = await fs.open(paths.history, "a", 0o600);
      try {
        await temp.handle.writeFile(text, "utf8"); await temp.handle.sync(); await temp.handle.close();
        // Detect an outside edit that occurred while the temporary file was written.
        if ((await currentBook(paths, book)).sha1 !== expectedSha1) throw new SettingsWriteError(409, BOOK_CONFLICT);
        await fs.rename(part, paths.file);
        try { await log.writeFile(stringifySettingsJson(entry) + "\n", "utf8"); await log.sync(); }
        catch { throw new SettingsWriteError(503, "The book file saved, but its history write failed. Reload before any further save.", true); }
      } finally { await log.close(); }
    } finally { await releaseFile(part, temp); }
  } finally { await releaseFile(lockPath, lock); }
  return readBookSettings(book);
}
