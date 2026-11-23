// Unit VW126: made-up data for scripts/vw126-test.mjs and for the browser check. Plain JavaScript, no import of an app file, no network.
// The shapes follow the real files: termbase.draft.jsonl (one raw entry per line), decisions.jsonl (Python json.dumps lines), and proposals.jsonl (schema dictionary-proposal-v1 of unit TR102).
// Every name is made up or taken from the public kendo words of the dictionary. No real e-mail address.
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/** Text like Python json.dumps(value, ensure_ascii=False): separators ", " and ": ". */
export function pyDumps(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(pyDumps).join(", ") + "]";
  return "{" + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ": " + pyDumps(x)).join(", ") + "}";
}

const PREF = "preferredTerm-admn-sts";
const ADM = "admittedTerm-admn-sts";

/** One raw entry in the real layout (the keys that the Viewer and the Python reader use). */
function entry(id, o) {
  const en = o.enTerms ?? [];
  return {
    crossReference: [],
    id,
    langSec: [
      { definition: [], lang: "ja", termSec: [{ administrativeStatus: null, source: [o.keys[0]], term: o.headword, termType: null }] },
      {
        definition: (o.enDefs ?? []).map((t, i) => ({ source: [`s1:${i}`], text: t, ...(i === 0 && o.agentWritten ? { "x-agent-written": true } : {}) })),
        lang: "en",
        termSec: en.map((t, i) => ({ administrativeStatus: o.noPreferred ? ADM : i === 0 ? PREF : ADM, source: ["s1:1"], term: t, termType: null })),
      },
      { definition: [{ source: ["s1:2"], text: o.zhDef ?? "" }], lang: "zh", termSec: [{ administrativeStatus: PREF, source: ["s1:2"], term: o.zh ?? "", termType: null }] },
    ],
    note: [],
    subjectField: "kendo",
    "x-common": { decision: o.decision, en_only: 0, romaji_only: 3, units: 3, value: o.common ?? "common" },
    "x-decisions": [o.decision],
    "x-flags": [],
    "x-headword": o.headword,
    ...(o.variants ? { "x-headword-variants": o.variants } : {}),
    "x-readings": [{ source: [o.keys[0]], text: o.reading }],
    "x-records": o.keys.map((k) => ({ en: k, ja: k, zh: k })),
    "x-romaji": [{ source: [o.keys[0]], text: o.romaji }, ...(o.romajiAlt ? [{ source: [o.keys[0]], text: o.romajiAlt }] : [])],
    "x-romaji-preferred": { source: `refinement:${o.decision}`, text: o.romaji },
    "x-sections": [],
    "x-senseNote": [],
    ...(o.insideLonger ? { "x-inside-longer-words": { value: true } } : {}),
  };
}

const LONG_DEF = "Dandori (段取り) is the arrangement of steps, preparation, and plans for a task. In kendo, it names the planned, step-by-step progress of keiko, for example the two types of metsuke.";
const VERY_LONG = "Zanshin is the state of alert mind and body that stays after a strike with no gap and no loose point and no relaxing of the posture or of the attention that a person keeps toward the opponent until the exchange is over completely and the bow is made";

/** Six made-up entries: a normal entry, a macron romaji, a katakana headword with a variant, a long explanation, no preferred English term, and one without a wording line. */
export function madeUpEntries() {
  return [
    entry("c-aaaaaaaa0001", { headword: "引き面", reading: "ひきめん", romaji: "Hiki-men", enTerms: ["retreating head strike", "Backward strike to the head"], enDefs: ["Hiki-men (引き面) is a technique that strikes the opponent's men while the practitioner moves backward. It is one of the hiki-waza."], zh: "退击面", decision: "d-0001", keys: ["s1:122", "s1:956"] }),
    entry("c-aaaaaaaa0002", { headword: "小手", reading: "こて", romaji: "kōte", romajiAlt: "Kote", enTerms: ["wrist", "forearm guard"], enDefs: ["Kote (小手) is the wrist guard and the wrist target."], zh: "护手", decision: "d-0003", keys: ["s1:200"] }),
    entry("c-aaaaaaaa0003", { headword: "ヒキワザ", variants: ["引き技"], reading: "ひきわざ", romaji: "hiki-waza", enTerms: ["retreating techniques"], enDefs: ["Hiki-waza are the techniques that you make while you move back."], zh: "退击技", decision: "d-0004", keys: ["s1:300"] }),
    entry("c-aaaaaaaa0004", { headword: "段取り", reading: "だんどり", romaji: "dandori", enTerms: ["preparation"], enDefs: [LONG_DEF, "The arrangement of steps and preparation."], agentWritten: true, zh: "准备", decision: "d-0005", keys: ["s1:620"], insideLonger: true }),
    entry("c-aaaaaaaa0005", { headword: "残心", reading: "ざんしん", romaji: "zanshin", enTerms: ["lingering spirit", "alert mind"], noPreferred: true, enDefs: [VERY_LONG], zh: "残心", decision: "d-0006", keys: ["s1:400"], common: "not common" }),
    entry("c-aaaaaaaa0006", { headword: "鍔迫り合い", reading: "つばぜりあい", romaji: "tsuba-zeriai", enTerms: ["close-quarters fight"], enDefs: ["Tsuba-zeriai (鍔迫り合い) is the close contest with the tsubas joined."], zh: "鍔迫", decision: "d-0006", keys: ["s1:500"] }),
  ];
}

/** The lines of the made-up decisions.jsonl (Python layout). d-0002 is superseded by d-0003 (an old line that the active-line rule must skip). The entry c-aaaaaaaa0006 has no active wording line. */
export function madeUpDecisionLines() {
  const w = (id, head, keys, concise, extra = {}) => ({
    id,
    action: "wording",
    records: keys,
    headword: head,
    round: "refinement 14 part 2, screen 1",
    answer: 3,
    tag: "[accepted recommendation 2026-10-22 23:00]",
    owner_words: "Ticked all entries of this group",
    wording: { concise_en: concise, concise_zh: "中", detailed_en: `${head} detail text.`, detailed_zh: "详细" },
    common: { value: "common", romaji_only: null, en_only: null, units: null, rule: "made-up rule text", answer: 8, tag: "[user 2026-10-24 12:06]" },
    ...extra,
  });
  return [
    w("d-0001", "引き面", ["s1:122", "s1:956"], "retreating head strike"),
    w("d-0002", "小手", ["s1:200"], "wrist", { superseded_by: ["d-0003"] }),
    w("d-0003", "小手", ["s1:200"], "wrist guard"),
    w("d-0004", "ヒキワザ", ["s1:300"], "retreating techniques"),
    w("d-0005", "段取り", ["s1:620"], "preparation"),
    w("d-0006", "残心", ["s1:400"], "lingering spirit"),
  ].map(pyDumps);
}

const hex16 = (seed) => createHash("sha1").update(seed).digest("hex").slice(0, 16);

let clock = 0;
/** One proposal row (schema dictionary-proposal-v1 of unit TR102). `n` orders the time. */
export function proposalRow(o) {
  const n = o.n ?? ++clock;
  const utc = `2026-11-22T23:${String(10 + Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}Z`;
  return {
    schema: "dictionary-proposal-v1",
    proposal_id: "dp-" + hex16(`${o.kind}|${o.ja_term ?? ""}|${o.entry_id ?? ""}|${o.concise_en}|${o.box}|${o.page}|${n}`),
    kind: o.kind,
    entry_id: o.entry_id ?? null,
    ja_term: o.ja_term ?? "",
    reading: o.reading ?? "",
    romaji: o.romaji ?? "",
    concise_en: o.concise_en,
    detailed_en: o.detailed_en ?? null,
    reason: o.reason ?? "The page uses this word.",
    book: o.book ?? "made_up_book",
    page_id: `${o.book ?? "made_up_book"}/p${String(o.page ?? 1).padStart(3, "0")}`,
    run_id: `20261122T230000Z/made_up_book_p${String(o.page ?? 1).padStart(3, "0")}`,
    box: o.box ?? "ED_3",
    box_type: (o.box ?? "ED_3").slice(0, 2),
    level: 3,
    utc,
    folder: "data/pilot-run/made-up",
  };
}

/** Nine made-up proposal rows that form seven groups (against the made-up termbase). */
export function madeUpProposalRows() {
  return [
    // Group 1: an add, proposed by 3 boxes on 3 pages with two EN forms (count 3).
    proposalRow({ kind: "add", ja_term: "引き逆胴", reading: "ひきぎゃくどう", romaji: "hiki-gyaku-dō", concise_en: "retreating strike to the left side", detailed_en: "Hiki-gyaku-dō (引き逆胴) is a strike to the left side of the torso made while the player moves back.", box: "ED_3", page: 31, n: 1 }),
    proposalRow({ kind: "add", ja_term: "引き逆胴", reading: "ひきぎゃくどう", romaji: "hiki-gyaku-dō", concise_en: "retreating strike to the left side", box: "TS_3", page: 32, n: 2 }),
    proposalRow({ kind: "add", ja_term: "引き 逆胴", reading: "ヒキギャクドウ", romaji: "hiki-gyaku-dō", concise_en: "backward left-side strike", box: "ED_2", page: 40, book: "second_book", n: 3 }),
    // Group 2: an add with one row.
    proposalRow({ kind: "add", ja_term: "引き小手", reading: "ひきこて", romaji: "hiki-kote", concise_en: "backward wrist strike", box: "ED_3", page: 33, n: 4 }),
    // Group 3: a revise of the entry 引き面 (the old line d-0001).
    proposalRow({ kind: "revise", entry_id: "c-aaaaaaaa0001", ja_term: "引き面", concise_en: "backward-moving head strike", detailed_en: "Hiki-men is a head strike that you make while you move back.", box: "ED_3", page: 34, n: 5 }),
    // Group 4: a revise of the entry 小手 (the active line is d-0003, d-0002 is superseded).
    proposalRow({ kind: "revise", entry_id: "c-aaaaaaaa0002", ja_term: "小手", concise_en: "forearm guard", box: "QA_3", page: 35, n: 6 }),
    // Group 5: a revise of an entry that has no active wording line (Accept must show a problem).
    proposalRow({ kind: "revise", entry_id: "c-aaaaaaaa0006", ja_term: "鍔迫り合い", concise_en: "tsuba contest", box: "ED_3", page: 36, n: 7 }),
    // Group 6: an add with a reading that is not kana (Accept must show a problem, Edit then accept fixes it).
    proposalRow({ kind: "add", ja_term: "抜き胴", reading: "nuki-dou", romaji: "nuki-dō", concise_en: "dodging strike to the torso", box: "ED_3", page: 37, n: 8 }),
    // Group 7: an add of a headword that is an entry already (Accept must show a problem).
    proposalRow({ kind: "add", ja_term: "小手", reading: "こて", romaji: "kōte", concise_en: "wrist", box: "ED_3", page: 38, n: 9 }),
  ];
}

/** Write the made-up termbase folder: the dictionary file, decisions.jsonl, and proposals.jsonl. Returns the folder. */
export async function writeMadeUpTermbase(dir, { proposals = true } = {}) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "termbase.draft.jsonl"), madeUpEntries().map((e) => JSON.stringify(e)).join("\n") + "\n");
  await fs.writeFile(path.join(dir, "decisions.jsonl"), madeUpDecisionLines().join("\n") + "\n");
  if (proposals) await fs.writeFile(path.join(dir, "proposals.jsonl"), madeUpProposalRows().map((r) => pyDumps(r)).join("\n") + "\n");
  return dir;
}

/**
 * Proposal rows for the REAL entries of the copy of termbase.draft.jsonl (the browser check): the revise rows name the real entries 引き面 (c-d9d4f8509527) and 段取り (c-00a61202322b).
 * The new terms are made up (they are not in the dictionary).
 */
export function realProposalRows() {
  return [
    proposalRow({ kind: "add", ja_term: "引き逆胴", reading: "ひきぎゃくどう", romaji: "hiki-gyaku-dō", concise_en: "retreating strike to the left side", detailed_en: "Hiki-gyaku-dō (引き逆胴) is a strike to the left side of the torso made while the player moves back.", box: "ED_3", page: 31, n: 1 }),
    proposalRow({ kind: "add", ja_term: "引き逆胴", reading: "ひきぎゃくどう", romaji: "hiki-gyaku-dō", concise_en: "retreating strike to the left side", box: "TS_3", page: 32, n: 2 }),
    proposalRow({ kind: "add", ja_term: "引き逆胴", reading: "ヒキギャクドウ", romaji: "hiki-gyaku-dō", concise_en: "backward left-side strike", box: "ED_2", page: 40, book: "second_book", n: 3 }),
    proposalRow({ kind: "add", ja_term: "引き払い小手", reading: "ひきはらいこて", romaji: "hiki-harai-kote", concise_en: "backward sweeping wrist strike", box: "ED_3", page: 33, n: 4 }),
    proposalRow({ kind: "revise", entry_id: "c-d9d4f8509527", ja_term: "引き面", concise_en: "backward-moving head strike", detailed_en: null, box: "ED_3", page: 34, n: 5 }),
    proposalRow({ kind: "revise", entry_id: "c-00a61202322b", ja_term: "段取り", concise_en: "planned preparation", box: "QA_3", page: 35, n: 6 }),
    proposalRow({ kind: "add", ja_term: "引き払い胴", reading: "hiki-harai-dou", romaji: "hiki-harai-dō", concise_en: "backward sweeping torso strike", box: "ED_3", page: 37, n: 7 }),
    proposalRow({ kind: "add", ja_term: "剣", reading: "けん", romaji: "ken", concise_en: "sword", box: "ED_3", page: 38, n: 8 }),
  ];
}

/** The proposals text of the real-entry rows, in Python layout. */
export const realProposalsText = () => realProposalRows().map((r) => pyDumps(r)).join("\n") + "\n";
