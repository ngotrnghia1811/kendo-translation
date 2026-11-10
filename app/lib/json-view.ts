// JSON viewer (unit VW89, round 90). Owner note Q-A 2:9.2 (2026-11-08 12:10 PST):
// "Implement a simple beautiful json viewer so human can read the result/report on viewer".
// Accepted design Q-A 3:1.7 and 3:1.8 (2026-11-09 16:55 PST). Pure helpers: no file access, no server code.
// The page app/json/page.tsx, the client tree components/JsonViewer.tsx, and the links on the monitor screens use them.

/** Kind of a file that the JSON viewer can open. */
export type JsonViewKind = "json" | "jsonl" | "text";

/**
 * Q-A 3:1.7 item 1: the viewer opens any .json, .jsonl or .txt file under the Translator data folder.
 * Unit default VW89: also the prompt label file `current` (no extension, prompts.py:128) as plain text.
 */
export function kindOfFile(name: string): JsonViewKind | null {
  const base = name.split("/").pop() ?? "";
  const lower = base.toLowerCase();
  if (lower.endsWith(".jsonl")) return "jsonl";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".txt")) return "text";
  if (base === "current") return "text";
  return null;
}

/** Link to the JSON viewer for a path relative to the Translator data folder (Q-A 3:1.7 item 3). */
export function jsonViewHref(rel: string): string {
  return `/json?path=${encodeURIComponent(rel)}`;
}

/** File size in MB, 3 decimals (project rule: sizes in MB). */
export function sizeMb(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(3)} MB`;
}

/** Unit default VW89: the tree view opens files up to this size. A larger file shows a message and a link to the raw file. */
export const MAX_VIEW_BYTES = 5_000_000;

/** Unit default VW89: a folder list shows at most this number of entries. */
export const MAX_FOLDER_ENTRIES = 2000;

/** Line and column (both 1-based) of a character position in a text. */
export function lineAndColumn(text: string, position: number): { line: number; column: number } {
  let line = 1;
  let last = -1;
  for (let i = 0; i < position && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      last = i;
    }
  }
  return { line, column: position - last };
}

export type JsonParse = { ok: true; value: unknown } | { ok: false; error: string; line: number | null; column: number | null };

/** Parse a JSON text. A parse error gives the message and, when the engine names a position, the line and the column. */
export function parseJsonText(text: string): JsonParse {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const lc = /line (\d+) column (\d+)/.exec(message);
    if (lc) return { ok: false, error: message, line: Number(lc[1]), column: Number(lc[2]) };
    const pos = /position (\d+)/.exec(message);
    if (pos) {
      const at = lineAndColumn(text, Number(pos[1]));
      return { ok: false, error: message, line: at.line, column: at.column };
    }
    // Some engines (for example Node 26) name no position. A small scan finds the first wrong character.
    const at = firstErrorAt(text);
    if (at === null) return { ok: false, error: message, line: null, column: null };
    const lcAt = lineAndColumn(text, at);
    return { ok: false, error: message, line: lcAt.line, column: lcAt.column };
  }
}

/** Position of the first character that breaks the JSON grammar, or null when the scan finds none. */
export function firstErrorAt(text: string): number | null {
  let i = 0;
  const ws = () => {
    while (i < text.length && " \t\n\r".includes(text[i])) i++;
  };
  const fail = (): never => {
    throw i;
  };
  const lit = (word: string) => {
    if (text.startsWith(word, i)) i += word.length;
    else fail();
  };
  const str = () => {
    i++;
    while (i < text.length && text[i] !== '"') {
      const c = text.charCodeAt(i);
      if (c < 0x20) fail();
      if (text[i] === "\\") {
        i++;
        if (text[i] === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) fail();
          i += 4;
        } else if (!'"\\/bfnrt'.includes(text[i] ?? "")) fail();
      }
      i++;
    }
    if (i >= text.length) fail();
    i++;
  };
  const num = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i));
    if (!m || m[0] === "-") fail();
    i += m![0].length;
  };
  const value = (): void => {
    ws();
    const c = text[i];
    if (c === "{") {
      i++;
      ws();
      if (text[i] === "}") {
        i++;
        return;
      }
      for (;;) {
        ws();
        if (text[i] !== '"') fail();
        str();
        ws();
        if (text[i] !== ":") fail();
        i++;
        value();
        ws();
        if (text[i] === ",") i++;
        else if (text[i] === "}") {
          i++;
          return;
        } else fail();
      }
    }
    if (c === "[") {
      i++;
      ws();
      if (text[i] === "]") {
        i++;
        return;
      }
      for (;;) {
        value();
        ws();
        if (text[i] === ",") i++;
        else if (text[i] === "]") {
          i++;
          return;
        } else fail();
      }
    }
    if (c === '"') return str();
    if (c === "t") return lit("true");
    if (c === "f") return lit("false");
    if (c === "n") return lit("null");
    if (c === "-" || (c !== undefined && c >= "0" && c <= "9")) return num();
    fail();
  };
  try {
    value();
    ws();
    if (i < text.length) fail();
    return null;
  } catch (e) {
    // A very deep text can overflow the stack. Then the viewer shows the message without a line.
    return typeof e === "number" ? Math.min(e, text.length) : null;
  }
}

/** One record of a JSONL file. `line` is the 1-based line number in the file. */
export type JsonlRow = { line: number; raw: string } & ({ ok: true; value: unknown } | { ok: false; error: string });

/** Parse a JSONL text: one record on each line. Empty lines are skipped. A broken line becomes a row with its error. */
export function parseJsonlText(text: string): JsonlRow[] {
  const rows: JsonlRow[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/\r$/, "");
    if (!raw.trim()) continue;
    try {
      rows.push({ line: i + 1, raw, ok: true, value: JSON.parse(raw) });
    } catch (e) {
      rows.push({ line: i + 1, raw, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return rows;
}

/** Short text of a value for a title line: text cut at `max` characters, a count for an object or a list. */
export function shortValue(v: unknown, max = 60): string {
  if (v === null) return "null";
  if (typeof v === "string") {
    const one = v.replace(/\s+/g, " ").trim();
    return one.length > max ? one.slice(0, max - 1) + "…" : one;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return countText(v);
  if (typeof v === "object") return countText(v);
  return String(v);
}

/** "3 keys", "1 key", "5 items", "1 item". */
export function countText(v: unknown): string {
  if (Array.isArray(v)) return `${v.length} ${v.length === 1 ? "item" : "items"}`;
  if (v && typeof v === "object") {
    const n = Object.keys(v).length;
    return `${n} ${n === 1 ? "key" : "keys"}`;
  }
  return "";
}

/** Q-A 3:1.8 item 2: the short title of a JSONL record is its first 3 keys with their short values. */
export function rowTitle(v: unknown): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const keys = Object.keys(v as Record<string, unknown>).slice(0, 3);
    if (keys.length === 0) return "(empty record)";
    return keys.map((k) => `${k}: ${shortValue((v as Record<string, unknown>)[k], 40)}`).join(" · ");
  }
  return shortValue(v);
}

/** Q-A 3:1.8 item 1: the first 2 levels of the tree are open. Depth 0 is the top value. */
export const OPEN_LEVELS = 2;

/** Open state of a node at a depth: "default" opens the first 2 levels, "all" opens every node, "none" closes every node. */
export type OpenMode = "default" | "all" | "none";
export function startsOpen(mode: OpenMode, depth: number): boolean {
  return mode === "all" ? true : mode === "none" ? false : depth < OPEN_LEVELS;
}

/** One entry of a folder list. */
export interface FolderEntry {
  name: string;
  /** Path relative to the Translator data folder. */
  path: string;
  folder: boolean;
  /** Null for a folder. */
  bytes: number | null;
  /** Null when the JSON viewer cannot open the file (and for a folder). */
  kind: JsonViewKind | null;
}

/** Folders first, then files. Each group in name order. Unit default VW89: names that start with "." stay hidden. */
export function sortEntries(entries: FolderEntry[]): FolderEntry[] {
  return entries
    .filter((e) => !e.name.startsWith("."))
    .sort((a, b) => (a.folder === b.folder ? a.name.localeCompare(b.name, "en") : a.folder ? -1 : 1));
}

/** Parts of a path for the path line at the top of the page: each part links to its folder. */
export function pathParts(rel: string): { name: string; path: string }[] {
  const names = rel.split("/").filter(Boolean);
  return names.map((name, i) => ({ name, path: names.slice(0, i + 1).join("/") }));
}

/** Folder that holds a path ("" for the data folder itself). */
export function parentOf(rel: string): string {
  const names = rel.split("/").filter(Boolean);
  return names.slice(0, -1).join("/");
}

/**
 * The page pointer of a run-book store names the page run folder relative to the Translator repo
 * (translator_run.py abs_folder 3314-3315, for example "data/pilot-run/x/20261026T185029Z-r41").
 * Return the path relative to the data folder, or null when the pointer leaves the data folder.
 */
export function pageFolderRel(folder: unknown, dataRoot: string): string | null {
  if (typeof folder !== "string" || !folder.trim()) return null;
  let f = folder.trim();
  const root = dataRoot.replace(/\/+$/, "");
  if (f.startsWith("/")) {
    if (!f.startsWith(root + "/")) return null;
    f = f.slice(root.length + 1);
  } else {
    f = f.replace(/^\.\//, "").replace(/^data\//, "");
  }
  f = f.replace(/\/+$/, "");
  if (!f || f.split("/").some((p) => p === ".." || p === "")) return null;
  return f;
}

/** Store folder of phase 2 (prompts.py:23 PHASE2_BOOK = "paired-dataset"; store root book-store, translator_run.py:129). */
export const PHASE2_STORE = "book-store/paired-dataset";

/** Q-A 3:1.7 item 4: the phase 2 report files that come first in the folder list when they exist. */
export const PHASE2_SUMMARY = `${PHASE2_STORE}/report/summary.json`;
export const PHASE2_TRENDS = `${PHASE2_STORE}/trends`;
export const PHASE2_PAGES = `${PHASE2_STORE}/pages`;
