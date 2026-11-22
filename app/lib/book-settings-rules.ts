// Unit VW122 (plan P61, card P61.2, Q-A 3:110.3 "Settings form on the book page", Q-A 3:112.3 rows 1 to 12).
// Owner words (Q-A 3:109.5, 2026-11-21): "I want to be able to set the config of each run, before pressing run button in `http://localhost:3000/monitor/etiqu1_full`".
// Pure rules of the Run settings of one book: the name check, the error label, the merge view (book file over global file), the words, and the time form.
// No file read and no server code, so a client component and the tests can import it. It is a new file, because the dev server keeps old module instances (VW77a).
// The book file format and the merge rules come from the TR101 report (Translator part). The Python run reads the same file on every page.
import { KEY_ORDER, FIELDS, showValue, type FlatSettings, type Scalar } from "./settings-schema";
import { optionText } from "./readable-names";

/** Folder of the book files and their history files, inside the Translator configuration folder. TR101 unit default 1. */
export const BOOK_FOLDER = "book-settings";
/** The two source words of a value (Q-A 3:112.3 rows 4 and 9). */
export const SOURCE_BOOK = "this book";
export const SOURCE_GLOBAL = "global";
/** Unit VW122 (design point 1): the optimistic lock refusal. Same case as CONFLICT of the global file. */
export const BOOK_CONFLICT = "The book file changed since you opened it. Reload the page.";

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
/**
 * Safe book name, the rule of TR101 unit default 3: 1 to 100 characters, starts with a letter or a digit, then letters, digits, "_", "-", ".". No "..".
 * Examples refused: "../x", "a/b", "x y", "_x", "a\n". The name is part of a file name, so a path can never leave the folder.
 */
export function isSafeBookName(name: unknown): name is string {
  return typeof name === "string" && NAME_RE.test(name) && !name.includes("..");
}

/** The file label that the Translator uses in its errors (TR101 unit default 7): a fixed text, not the absolute path. */
export function bookFileLabel(book: string): string {
  return `config/${BOOK_FOLDER}/${book}.json`;
}

/** The validation of settings-schema.ts names the global file in its text. A book file error names the book file in its place. */
export function labelBookError(message: string, book: string): string {
  return message.replace(/^translator-settings\.json:/, bookFileLabel(book) + ":");
}

/** One row of the merge view: the value that the next page uses for a key and where it comes from. */
export type EffectiveRow = {
  key: string;
  label: string;
  /** The value of the next page. Null only for update.N with no value in any file (the phase rule decides). Null, not undefined, because the row travels as JSON. */
  value: Scalar;
  source: typeof SOURCE_BOOK | typeof SOURCE_GLOBAL;
  /** The global value (global file, else the default). Shows in gray under the field. Null only for update.N with no saved N. */
  globalValue: Scalar;
  /** True when the global file holds no value for the key, so the global value is the default (or the phase rule for N). */
  globalIsDefault: boolean;
};

/**
 * Q-A 3:112.3 row 4: the book file lies over the global file. A key that the book file does not hold follows the global file, then the default.
 * `book` and `globalFile` hold only the keys that the file holds. `defaults` is the defaults list of the global panel (file, yaml).
 */
export function effectiveRows(book: FlatSettings, globalFile: FlatSettings, defaults: FlatSettings): EffectiveRow[] {
  return FIELDS.map((f) => {
    const inGlobal = Object.hasOwn(globalFile, f.key);
    // N is the one key where the defaults file does not count: with no saved N the phase rule of translator-models.yaml decides (as in the global panel).
    const globalValue = inGlobal ? globalFile[f.key] : f.key === "update.N" ? null : defaults[f.key];
    const inBook = Object.hasOwn(book, f.key);
    return { key: f.key, label: f.label, value: inBook ? book[f.key] : globalValue, source: inBook ? SOURCE_BOOK : SOURCE_GLOBAL, globalValue, globalIsDefault: !inGlobal };
  });
}

/** Text of a value in a list, with the readable words of the Run settings panel (mode words, yes or no, model with provider). */
export function valueText(key: string, v: Scalar | undefined): string {
  return typeof v === "string" || typeof v === "boolean" ? optionText(key, String(v)) : showValue(v, key);
}

/** The text of the global value under a field. "(default)" says that the global file holds no value. Example: "xai/grok-4.7 (default)". */
export function globalValueText(row: Pick<EffectiveRow, "key" | "globalValue" | "globalIsDefault">): string {
  return row.key === "update.N" && row.globalValue == null ? "phase rule (no saved N)" : valueText(row.key, row.globalValue) + (row.globalIsDefault ? " (default, the global file has no value)" : "");
}

/** The heading of the closed section. N is the number of keys that the book file holds (Q-A 3:112.3 row 1). */
export function sectionTitle(changed: number): string {
  return `Run settings of this book (${changed} changed)`;
}

/** How many keys the book file holds. */
export function changedCount(book: FlatSettings): number {
  return KEY_ORDER.filter((k) => Object.hasOwn(book, k)).length;
}

/** "2026-11-21 00:08:00 PST" for an ISO time. PST (UTC minus 8) all year. */
export function pstText(utc: string): string {
  const t = Date.parse(utc);
  if (Number.isNaN(t)) return "Time unreadable";
  return new Date(t - 8 * 3600_000).toISOString().slice(0, 19).replace("T", " ") + " PST";
}

/** Value of a history side. A key that the book file did not hold shows "global" (the key follows the global file). */
export function historyValueText(key: string, v: Scalar | null, present: boolean): string {
  return present ? valueText(key, v as Scalar) : SOURCE_GLOBAL;
}
