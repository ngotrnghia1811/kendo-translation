// Unit VW126 (Q-A 3:115.5 "agent can propose update to the kendo dict (add/revise)", Q-A 3:116.8 "a agent-proposal tab (not for reader)",
// Q-A 3:117.7 "Accept rows 1 to 5", Q-A 3:121.2 "Accept all 3"): the pure rules of the tab "Agent proposals" of /dictionary.
// No server-only marker and no file access, so the server code, the client panel (types only), and the test script can load it.
// The formats come from unit TR102 (data/scripts/translator/proposals.py and data/scripts/termbase_build.py in the Translator folder):
//   proposals.jsonl      one JSON line per proposal (schema dictionary-proposal-v1). The merged view groups the lines per term (merged() of proposals.py).
//   decisions.jsonl      the action add (a new term) and the action wording (a revise of an entry). Old lines stay as they are. Only a revise puts the key superseded_by on the old line.

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

// ---------------------------------------------------------------- the proposal rows and the merged view

export interface ProposalNewest {
  proposal_id: string;
  utc: string;
  concise_en: string;
  detailed_en: string | null;
  reason: string;
  book: string;
  page_id: string;
  box: string;
}

/** One group of the merged view. The fields and their order are the fields of merged() in proposals.py. */
export interface ProposalGroup {
  kind: "add" | "revise";
  key: string;
  entry_id: string | null;
  ja_term: string;
  reading: string;
  romaji: string;
  count: number;
  books: string[];
  pages: string[];
  boxes: string[];
  first_utc: string;
  last_utc: string;
  concise_en_forms: { text: string; count: number }[];
  newest: ProposalNewest;
  proposal_ids: string[];
}

/** The JA term as a merge key: NFKC, no spaces (norm_term of proposals.py). */
export const normTerm = (s: unknown): string => (typeof s === "string" ? s : "").normalize("NFKC").replace(/\s+/gu, "");

/** The reading as a merge key: NFKC, no spaces, no middle dots, katakana as hiragana (norm_reading of proposals.py). */
export function normReading(s: unknown): string {
  const t = (typeof s === "string" ? s : "").normalize("NFKC").replace(/[\s\u30fb\uff65]+/gu, "");
  let out = "";
  for (const c of t) out += c >= "\u30a1" && c <= "\u30f6" ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c;
  return out;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** The text of the lines of proposals.jsonl as rows. A line that is not JSON, not an object, or without proposal_id counts in `bad` (read_rows of proposals.py). */
export function parseProposalRows(fileText: string): { rows: J[]; bad: number } {
  const rows: J[] = [];
  let bad = 0;
  for (const line of fileText.split("\n")) {
    if (!line.trim()) continue;
    let row: J;
    try {
      row = JSON.parse(line);
    } catch {
      bad++;
      continue;
    }
    if (row && typeof row === "object" && !Array.isArray(row) && row.proposal_id) rows.push(row);
    else bad++;
  }
  return { rows, bad };
}

/** The group of a row: revise + entry ID, or add + JA term + TAB + reading, both normalized (merge_key of proposals.py). */
export function mergeKey(row: J): { kind: "add" | "revise"; key: string } {
  if (row.kind === "revise") return { kind: "revise", key: str(row.entry_id) };
  return { kind: "add", key: normTerm(row.ja_term) + "\t" + normReading(row.reading) };
}

const cmpStr = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Compare two lists of numbers like Python: element by element, a shorter list that is a prefix comes first. */
function cmpNums(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return a.length - b.length;
}

const negCodes = (s: string): number[] => Array.from(s, (c) => -(c.codePointAt(0) ?? 0));

/** One group per term, with a count (merged() of proposals.py). Sorted by count (largest first), then by the newest row (newest first), then by kind and key. */
export function mergedProposals(rows: J[]): ProposalGroup[] {
  const sorted = [...rows].sort((a, b) => cmpStr(str(a.utc), str(b.utc)) || cmpStr(str(a.proposal_id), str(b.proposal_id)));
  const groups = new Map<string, ProposalGroup & { forms: Map<string, number> }>();
  for (const row of sorted) {
    const mk = mergeKey(row);
    const id = mk.kind + "\u0000" + mk.key;
    let g = groups.get(id);
    if (!g) {
      g = {
        kind: mk.kind,
        key: mk.key,
        entry_id: row.entry_id ?? null,
        ja_term: "",
        reading: "",
        romaji: "",
        count: 0,
        books: [],
        pages: [],
        boxes: [],
        first_utc: str(row.utc),
        last_utc: "",
        concise_en_forms: [],
        newest: { proposal_id: "", utc: "", concise_en: "", detailed_en: null, reason: "", book: "", page_id: "", box: "" },
        proposal_ids: [],
        forms: new Map(),
      };
      groups.set(id, g);
    }
    g.count++;
    for (const [name, val] of [["books", row.book], ["pages", row.page_id], ["boxes", row.box]] as const) {
      const v = str(val);
      if (!g[name].includes(v)) g[name].push(v);
    }
    const form = str(row.concise_en);
    g.forms.set(form, (g.forms.get(form) ?? 0) + 1);
    g.proposal_ids.push(str(row.proposal_id));
    g.last_utc = str(row.utc);
    g.ja_term = str(row.ja_term);
    g.reading = str(row.reading);
    g.romaji = str(row.romaji);
    g.newest = {
      proposal_id: str(row.proposal_id),
      utc: str(row.utc),
      concise_en: str(row.concise_en),
      detailed_en: typeof row.detailed_en === "string" ? row.detailed_en : null,
      reason: str(row.reason),
      book: str(row.book),
      page_id: str(row.page_id),
      box: str(row.box),
    };
  }
  const out: ProposalGroup[] = [];
  for (const g of groups.values()) {
    const forms = [...g.forms.entries()].sort((a, b) => b[1] - a[1] || cmpStr(a[0], b[0])).map(([text, count]) => ({ text, count }));
    out.push({
      kind: g.kind,
      key: g.key,
      entry_id: g.entry_id,
      ja_term: g.ja_term,
      reading: g.reading,
      romaji: g.romaji,
      count: g.count,
      books: g.books,
      pages: g.pages,
      boxes: g.boxes,
      first_utc: g.first_utc,
      last_utc: g.last_utc,
      concise_en_forms: forms,
      newest: g.newest,
      proposal_ids: g.proposal_ids,
    });
  }
  out.sort((a, b) => b.count - a.count || cmpNums(negCodes(a.last_utc), negCodes(b.last_utc)) || cmpStr(a.kind, b.kind) || cmpStr(a.key, b.key));
  return out;
}

/** The address of a group in a request: kind, a TAB, and the key. */
export const groupId = (g: { kind: string; key: string }): string => `${g.kind}\t${g.key}`;

// ---------------------------------------------------------------- the review file (proposal-reviews.jsonl)

export type ReviewAction = "comment" | "accept" | "edit-accept" | "reject";

/** One line of proposal-reviews.jsonl (Q-A 3:117.7 row 3: time UTC, person name and role, proposal key, action, text). */
export interface ReviewLine {
  utc: string;
  name: string;
  role: string;
  group: string;
  action: ReviewAction;
  text: string;
  decision_id: string;
  proposal_ids: string[];
}

const ACTIONS: ReviewAction[] = ["comment", "accept", "edit-accept", "reject"];

export function parseReviewLines(fileText: string): { lines: ReviewLine[]; bad: number } {
  const lines: ReviewLine[] = [];
  let bad = 0;
  for (const line of fileText.split("\n")) {
    if (!line.trim()) continue;
    let o: J;
    try {
      o = JSON.parse(line);
    } catch {
      bad++;
      continue;
    }
    if (!o || typeof o !== "object" || !ACTIONS.includes(o.action) || typeof o.group !== "string") {
      bad++;
      continue;
    }
    lines.push({
      utc: str(o.utc),
      name: str(o.name),
      role: str(o.role),
      group: o.group,
      action: o.action,
      text: str(o.text),
      decision_id: str(o.decision_id),
      proposal_ids: Array.isArray(o.proposal_ids) ? o.proposal_ids.map(String) : [],
    });
  }
  return { lines, bad };
}

/** The time of a review line: UTC with seconds, the same shape as the field utc of a proposal row. Example: 2026-11-22T23:10:00Z */
export const utcNow = (d: Date = new Date()): string => d.toISOString().replace(/\.\d{3}Z$/, "Z");

export type GroupStatus = "open" | "accepted" | "rejected";

/** A group of the merged view with its state from the review file. */
export interface GroupView extends ProposalGroup {
  id: string;
  status: GroupStatus;
  /** The action of the decision: accept, edit-accept, or reject. Empty while the group is open. */
  decision: string;
  decision_id: string;
  decided_utc: string;
  decided_by: string;
  decision_text: string;
  /** Proposal rows that came after the decision (the decision stays). */
  since: number;
  comments: { utc: string; name: string; role: string; text: string }[];
  /** For an accepted group: true when the entry or the decision is in the dictionary file (termbase.draft.jsonl) already. */
  in_dictionary: boolean;
  /** For a revise: the current EN form and detailed text of the entry. For an add: empty. */
  current: { headword: string; concise_en: string; detailed_en: string } | null;
  /** A plain line that says why Accept cannot work now (for example the term is an entry already). Empty when Accept can work. */
  problem: string;
}

/**
 * The state of each group. The newest line of the actions accept, edit-accept, or reject decides the status. The decision stays when later proposals of the same term arrive:
 * they count in `since` (unit default VW126: a new proposal never opens a decided group again, because the runs keep proposing the term until the next book start).
 * Comments never change the status.
 */
export function viewGroups(groups: ProposalGroup[], reviews: ReviewLine[], inDictionary: (decisionId: string) => boolean, utcOf: (proposalId: string) => string): GroupView[] {
  return groups.map((g) => {
    const id = groupId(g);
    const mine = reviews.filter((r) => r.group === id);
    const decided = [...mine].reverse().find((r) => r.action !== "comment");
    const view: GroupView = {
      ...g,
      id,
      status: !decided ? "open" : decided.action === "reject" ? "rejected" : "accepted",
      decision: decided?.action ?? "",
      decision_id: decided?.decision_id ?? "",
      decided_utc: decided?.utc ?? "",
      decided_by: decided ? `${decided.name} (${decided.role})` : "",
      decision_text: decided?.text ?? "",
      since: decided ? g.proposal_ids.filter((p) => utcOf(p) > decided.utc).length : 0,
      comments: mine.filter((r) => r.action === "comment").map((r) => ({ utc: r.utc, name: r.name, role: r.role, text: r.text })),
      in_dictionary: Boolean(decided && decided.decision_id && inDictionary(decided.decision_id)),
      current: null,
      problem: "",
    };
    return view;
  });
}

// ---------------------------------------------------------------- Python-like JSON

/** Text like Python json.dumps(value, ensure_ascii=False): separators ", " and ": ", the keys in insertion order. A number must be a whole number (no decision line holds another). */
export function pyJson(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") {
    if (!Number.isInteger(v)) throw new Error("pyJson: only whole numbers are allowed.");
    return String(v);
  }
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(pyJson).join(", ") + "]";
  if (typeof v === "object") return "{" + Object.entries(v as Record<string, unknown>).map(([k, x]) => JSON.stringify(k) + ": " + pyJson(x)).join(", ") + "}";
  throw new Error("pyJson: this value has no JSON form.");
}

// ---------------------------------------------------------------- the decision lines (the formats of termbase_build.py, unit TR102)

/** An error with a plain message and an HTTP status. The route turns it into the answer. */
export class ProposalProblem extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ProposalProblem";
    this.status = status;
  }
}

/** The values of the decision lines that the admin can edit. A field that is left out takes the value of the newest proposal. */
export interface DecideValues {
  ja_term?: string;
  reading?: string;
  romaji?: string;
  concise_en?: string;
  detailed_en?: string | null;
}

export const DECISION_ROUND = "dictionary-page";
export const DECISION_TAG = "[admin click on the dictionary page]";
const PROPOSAL_PREFIX = "proposal:";
const ADD_COMMON_DEFAULT = "not common"; // Q-A 3:121.2 row 2: a new entry starts as "not common"

/** Kana as the builder reads it: hiragana U+3041..U+3096 and U+309D..U+309F, katakana U+30A1..U+30FA and U+30FD..U+30FF, and the long vowel mark U+30FC (is_kana of termbase_build.py). */
export function isKana(ch: string): boolean {
  return (ch >= "\u3041" && ch <= "\u3096") || (ch >= "\u309d" && ch <= "\u309f") || (ch >= "\u30a1" && ch <= "\u30fa") || (ch >= "\u30fd" && ch <= "\u30ff") || ch === "\u30fc";
}

/** The next decision ID: the largest d-NNNN of the file plus one, with at least four digits. */
export function nextDecisionId(lines: J[]): string {
  let max = 0;
  for (const d of lines) {
    const m = /^d-(\d+)$/.exec(str(d?.id));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return "d-" + String(max + 1).padStart(4, "0");
}

export interface DecisionLine {
  text: string;
  obj: J;
}

export function readDecisionLines(fileText: string): DecisionLine[] {
  const out: DecisionLine[] = [];
  for (const text of fileText.split("\n")) {
    if (!text.trim()) continue;
    let obj: J;
    try {
      obj = JSON.parse(text);
    } catch {
      throw new ProposalProblem(409, "The file decisions.jsonl has a line that is not JSON. Nothing was written.");
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new ProposalProblem(409, "The file decisions.jsonl has a line that is not an object. Nothing was written.");
    out.push({ text, obj });
  }
  return out;
}

const clean = (v: unknown): string => str(v).normalize("NFC").trim();

/** What the decision writes: the new text of decisions.jsonl and facts for the answer. */
export interface DecisionResult {
  /** The whole new text of decisions.jsonl. */
  text: string;
  id: string;
  action: "add" | "wording";
  line: string;
  /** For a revise: the ID of the old line that gets superseded_by. */
  supersedes: string;
  /** The values that the line holds. */
  values: { headword: string; reading: string; romaji: string; concise_en: string; detailed_en: string | null };
}

/** The raw entries of the termbase that the rules read: the ID, the headword, the other writings, and the JA record keys. */
export interface EntryFacts {
  id: string;
  headword: string;
  variants: string[];
  recordKeys: string[];
  added: string;
  concise_en: string;
  detailed_en: string;
}

export function entryFactsOf(raw: J): EntryFacts {
  const en = ((raw.langSec ?? []) as J[]).find((l) => l?.lang === "en");
  const pref = ((en?.termSec ?? []) as J[]).find((t) => t?.administrativeStatus === "preferredTerm-admn-sts");
  return {
    id: str(raw.id),
    headword: str(raw["x-headword"]),
    variants: ((raw["x-headword-variants"] ?? []) as J[]).map(str).filter(Boolean),
    recordKeys: ((raw["x-records"] ?? []) as J[]).map((r) => str(r?.ja)).filter(Boolean),
    added: raw["x-added"] ? str(raw["x-added"].decision) : "",
    concise_en: str(pref?.term ?? ((en?.termSec ?? []) as J[])[0]?.term),
    detailed_en: str(((en?.definition ?? []) as J[]).find((d) => str(d?.text))?.text),
  };
}

/** The old line that a revise replaces: the active add line of an added entry, or the one active wording line that names a JA record of the entry (revise_line of termbase_build.py). */
function oldLineOf(entry: EntryFacts, lines: DecisionLine[]): DecisionLine {
  const active = lines.filter((l) => !("superseded_by" in l.obj));
  const olds = entry.added ? active.filter((l) => l.obj.id === entry.added) : active.filter((l) => l.obj.action === "wording" && (l.obj.records ?? []).some((k: string) => entry.recordKeys.includes(k)));
  if (olds.length !== 1) throw new ProposalProblem(409, `The entry ${entry.id} needs exactly one active wording or add line in decisions.jsonl. Found ${olds.length}. Nothing was written.`);
  return olds[0];
}

/**
 * Build the new decisions text for one group (Q-A 3:117.7 row 4, the formats of unit TR102).
 *   add     one new line at the end: action add, records proposal:<ID> of every row of the group, headword, new_entry (readings, romaji, concise_en, detailed_en, common "not common").
 *   revise  one new line at the end (action wording of the old line, or action add of an added entry) and the old line with the one key superseded_by added at its end.
 *           Every other byte of the file stays as it was. The builder needs the key on the old line, because it stops with "second wording decision for this concept" without it.
 * It checks the rules of the builder first, so a bad value stops here with a plain message and not at the next rebuild. `entries` maps the entry ID to its facts.
 */
export function buildDecision(opts: { group: ProposalGroup; edited: boolean; values: DecideValues; decisionsText: string; entries: Map<string, EntryFacts>; lines?: DecisionLine[] }): DecisionResult {
  const { group, edited, decisionsText } = opts;
  const lines = opts.lines ?? readDecisionLines(decisionsText);
  const id = nextDecisionId(lines.map((l) => l.obj));
  const newest = group.newest;
  const pids = group.proposal_ids;
  // A proposal is decided once. A line that names one of its IDs in records or in the note blocks a second line.
  for (const l of lines) {
    const hit = pids.find((p) => (Array.isArray(l.obj.records) && l.obj.records.includes(PROPOSAL_PREFIX + p)) || new RegExp(PROPOSAL_PREFIX + p.replace(/[^A-Za-z0-9_-]/g, "") + "(?![A-Za-z0-9_-])").test(str(l.obj.note)));
    if (hit) throw new ProposalProblem(409, `The proposal ${hit} is in decisions.jsonl already (${str(l.obj.id)}). Nothing was written.`);
  }
  const answer = edited ? "edit-accept" : "accept";
  const tail = edited ? " (values edited by the admin)" : "";
  const sources = pids.map((p) => PROPOSAL_PREFIX + p);
  const withEnd = decisionsText.endsWith("\n") || decisionsText === "" ? decisionsText : decisionsText + "\n";

  if (group.kind === "add") {
    const headword = clean(opts.values.ja_term ?? group.ja_term);
    const reading = clean(opts.values.reading ?? group.reading);
    const romaji = clean(opts.values.romaji ?? group.romaji);
    const concise = clean(opts.values.concise_en ?? newest.concise_en);
    const detailedRaw = opts.values.detailed_en === undefined ? newest.detailed_en : opts.values.detailed_en;
    const detailed = detailedRaw === null ? "" : clean(detailedRaw);
    if (!headword) throw new ProposalProblem(400, "The Japanese term is empty.");
    if (!reading || ![...reading].every(isKana)) throw new ProposalProblem(400, "The reading must be kana (hiragana, katakana, or the long vowel mark). Use Edit then accept to fix it.");
    if (!romaji) throw new ProposalProblem(400, "The romaji is empty.");
    if (!concise) throw new ProposalProblem(400, "The EN form is empty.");
    for (const e of opts.entries.values()) if (e.headword === headword || e.variants.includes(headword)) throw new ProposalProblem(409, `The term ${headword} is an entry already (${e.id}). Use a revise of that entry.`);
    for (const l of lines) if (l.obj.action === "add" && !("superseded_by" in l.obj) && l.obj.headword === headword) throw new ProposalProblem(409, `The term ${headword} has an add line already (${str(l.obj.id)}). Rebuild the dictionary first.`);
    const newEntry: Record<string, unknown> = { readings: [reading], romaji, concise_en: concise };
    if (detailed) newEntry.detailed_en = detailed;
    newEntry.common = ADD_COMMON_DEFAULT;
    const line = pyJson({
      id,
      action: "add",
      records: sources,
      round: DECISION_ROUND,
      answer,
      tag: DECISION_TAG,
      note: `add from ${sources.join(", ")}${tail}`,
      headword,
      new_entry: newEntry,
    });
    return { text: withEnd + line + "\n", id, action: "add", line, supersedes: "", values: { headword, reading, romaji, concise_en: concise, detailed_en: detailed || null } };
  }

  // revise
  const entry = opts.entries.get(group.entry_id ?? "");
  if (!entry) throw new ProposalProblem(404, `The entry ${group.entry_id ?? ""} is not in the dictionary file.`);
  const concise = clean(opts.values.concise_en ?? newest.concise_en);
  const detailedRaw = opts.values.detailed_en === undefined ? newest.detailed_en : opts.values.detailed_en;
  const detailed = detailedRaw === null ? "" : clean(detailedRaw);
  if (!concise) throw new ProposalProblem(400, "The EN form is empty.");
  const old = oldLineOf(entry, lines);
  const removed = new Set(["id", "round", "answer", "tag", "owner_words", "note", "superseded_by"]);
  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(old.obj as Record<string, unknown>)) if (!removed.has(k)) copy[k] = JSON.parse(JSON.stringify(v));
  const note = `revise of ${str(old.obj.id)} from ${sources.join(", ")}${tail}`;
  const next: Record<string, unknown> = { ...copy, id, round: DECISION_ROUND, answer, tag: DECISION_TAG, note };
  const texts = (old.obj.action === "add" ? next.new_entry : next.wording) as Record<string, unknown> | undefined;
  if (!texts || typeof texts !== "object") throw new ProposalProblem(409, `The old line ${str(old.obj.id)} has no texts to revise. Nothing was written.`);
  texts.concise_en = concise;
  if (detailed) texts.detailed_en = detailed;
  const line = pyJson(next);
  if (!old.text.endsWith("}")) throw new ProposalProblem(409, `The old line ${str(old.obj.id)} does not end with a closing brace. Nothing was written.`);
  const oldNew = old.text.slice(0, -1) + `, "superseded_by": [${JSON.stringify(id)}]}`;
  const parts = decisionsText.split("\n");
  const at = parts.indexOf(old.text);
  if (at < 0) throw new ProposalProblem(409, "The old line moved. Nothing was written.");
  parts[at] = oldNew;
  const body = parts.join("\n");
  const text = (body.endsWith("\n") || body === "" ? body : body + "\n") + line + "\n";
  return { text, id, action: "wording", line, supersedes: str(old.obj.id), values: { headword: entry.headword, reading: "", romaji: "", concise_en: concise, detailed_en: detailed || null } };
}

/** A plain line that says why Accept cannot work for a group now, or "" when it can. The check builds the decision and drops it. */
export function acceptProblem(group: ProposalGroup, entries: Map<string, EntryFacts>, decisionsText: string, lines?: DecisionLine[]): string {
  try {
    buildDecision({ group, edited: false, values: {}, decisionsText, entries, lines });
    return "";
  } catch (e) {
    if (e instanceof ProposalProblem) return e.message;
    throw e;
  }
}

/**
 * The decisions that came from proposals and are not in the dictionary file yet (Q-A 3:117.7 row 6): lines of decisions.jsonl that name a proposal (records proposal:<ID> or the note of a revise)
 * and whose ID is not in the text of termbase.draft.jsonl. A line with superseded_by does not count: a newer line replaced it.
 */
export function pendingDecisionIds(lines: DecisionLine[], termbaseText: string): string[] {
  const out: string[] = [];
  for (const l of lines) {
    if ("superseded_by" in l.obj) continue;
    const named = (Array.isArray(l.obj.records) && l.obj.records.some((k: unknown) => typeof k === "string" && k.startsWith(PROPOSAL_PREFIX))) || str(l.obj.note).includes(PROPOSAL_PREFIX);
    const id = str(l.obj.id);
    if (named && id && !termbaseText.includes(JSON.stringify(id))) out.push(id);
  }
  return out;
}
