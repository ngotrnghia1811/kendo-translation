// Unit VW126 (Q-A 3:117.6 rows 1 to 4): the record of one dictionary entry in the PocketBase list dictionary_entries.
// The sync command (scripts/sync-dictionary.mjs) builds the records from the lines of termbase.draft.jsonl with these rules.
// No server-only marker and no file access, so the sync command and the test script can load it. The list on the live site has the same fields.
import { DICT_COLLECTION, dictFold, shortExplanation, type DictEntryView } from "./dictionary-core";
import { termEntryView } from "./htv-build";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

export { DICT_COLLECTION };

/** The size limits of the text fields (migration 1793300019 uses the same numbers). */
export const DICT_LIMITS = { entry_id: 64, headword: 300, reading: 300, romaji: 300, concise_en: 600, short_en: 400, common: 40, sort_key: 300, search: 30000, variants: 100000 } as const;

/** One record of the list. `view` is the full entry that the page shows when you open it. */
export interface DictRecord {
  entry_id: string;
  headword: string;
  variants: string[];
  reading: string;
  romaji: string;
  concise_en: string;
  short_en: string;
  common: string;
  view: DictEntryView;
  search_ja: string;
  search_en: string;
  sort_key: string;
}

const PREFERRED = "preferredTerm-admn-sts";

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const cut = (s: string, n: number): string => (s.length > n ? s.slice(0, n) : s);

/** The sources of the Japanese and English definitions, each once, in file order (the rule of Entry.sources in translator/termbase.py). */
function sourcesOf(raw: J): string[] {
  const out: string[] = [];
  for (const ls of (raw.langSec ?? []) as J[]) {
    if (ls?.lang !== "ja" && ls?.lang !== "en") continue;
    for (const d of (ls.definition ?? []) as J[]) for (const s of (d.source ?? []) as J[]) if (typeof s === "string" && !out.includes(s)) out.push(s);
  }
  return out;
}

/**
 * The record of one raw termbase entry (a parsed line of termbase.draft.jsonl).
 * EN form (concise_en): the preferred English term, like translator/termbase.py. An entry with no preferred English term gets the first English term (unit default).
 * Short English explanation (short_en): the first sentence of the first English definition (shortExplanation).
 * Search columns: search_ja holds headword, other writings, readings, Japanese terms, and Japanese definitions. search_en holds all romaji, English terms, and English definitions.
 * Both columns use the dictionary fold (dictFold), so a query in kana, katakana, romaji with or without macrons, or English finds the entry.
 */
export function dictRecordOf(raw: J): DictRecord {
  const base = termEntryView(raw);
  const variants = ((raw["x-headword-variants"] ?? []) as J[]).map(text).filter(Boolean);
  const en = ((raw.langSec ?? []) as J[]).find((l) => l?.lang === "en");
  const enTerms = ((en?.termSec ?? []) as J[]).map((t) => ({ term: text(t.term), preferred: t.administrativeStatus === PREFERRED })).filter((t) => t.term);
  const conciseEn = enTerms.find((t) => t.preferred)?.term ?? enTerms[0]?.term ?? "";
  const detailedEn = text(((en?.definition ?? []) as J[]).find((d) => text(d?.text))?.text);
  const reading = base.readings[0] ?? "";
  const ja = ((raw.langSec ?? []) as J[]).find((l) => l?.lang === "ja");
  const jaParts = [base.headword, ...variants, ...base.readings, ...((ja?.termSec ?? []) as J[]).map((t) => text(t.term)), ...((ja?.definition ?? []) as J[]).map((d) => text(d.text))];
  const romajiAll = ((raw["x-romaji"] ?? []) as J[]).map((r) => text(r?.text));
  const enParts = [base.romaji, ...romajiAll, ...enTerms.map((t) => t.term), ...((en?.definition ?? []) as J[]).map((d) => text(d.text))];
  const join = (parts: string[]) => cut(dictFold(parts.filter(Boolean).join(" ")), DICT_LIMITS.search);
  const view: DictEntryView = {
    id: base.id,
    headword: base.headword,
    variants,
    readings: base.readings,
    romaji: base.romaji,
    common: base.common,
    langs: base.langs,
    sources: sourcesOf(raw),
    insideLonger: Boolean(raw["x-inside-longer-words"]?.value),
  };
  return {
    entry_id: base.id,
    headword: cut(base.headword, DICT_LIMITS.headword),
    variants,
    reading: cut(reading, DICT_LIMITS.reading),
    romaji: cut(base.romaji, DICT_LIMITS.romaji),
    concise_en: cut(conciseEn, DICT_LIMITS.concise_en),
    short_en: cut(shortExplanation(detailedEn), DICT_LIMITS.short_en),
    common: cut(base.common, DICT_LIMITS.common),
    view,
    search_ja: join(jaParts),
    search_en: join(enParts),
    sort_key: cut(dictFold(reading || base.headword), DICT_LIMITS.sort_key),
  };
}
