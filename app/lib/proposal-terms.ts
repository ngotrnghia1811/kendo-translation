// Unit VW129 (Q-A 3:128.1 "Repeated terms should be ground into 1, with user can click it to view the infor of where/when/why/etc it was proposed",
// Q-A 3:129.4 "Accept rows 1 to 6"): the pure rules of the tab "Agent proposals" of /dictionary after unit VW129.
//   row 2  ONE group per term: the add and the revise proposals of one Japanese term sit in one group (the VW126 groups were kind + term).
//   row 3  every proposal of the group, newest first, with its time, book, page, box, kind, EN form, short English explanation, and reason.
//   row 4  the mark "Already in the dictionary": the term is the headword or another writing of an entry. Accept then writes a revise of that entry, never an add.
// No server-only marker and no file access, so the server code, the client panel (types only), and the test script can load it.
// The decision lines still come from buildDecision of lib/proposals-core.ts (the TR102 formats). A term group is a ProposalGroup, so buildDecision takes it as it is.

import { groupId, mergeKey, normTerm, type EntryFacts, type GroupView, type ProposalGroup, type ReviewLine } from "./proposals-core";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const cmpStr = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The address of a term group in a request: the word "term", a TAB, and the normalized Japanese term. Example: "term\t稽古". */
export const TERM_GROUP_PREFIX = "term";
export const termGroupId = (term: string): string => `${TERM_GROUP_PREFIX}\t${term}`;

/** One proposal row as the details list shows it (row 3). */
export interface ProposalDetail {
  proposal_id: string;
  utc: string;
  kind: "add" | "revise";
  entry_id: string | null;
  ja_term: string;
  reading: string;
  romaji: string;
  concise_en: string;
  detailed_en: string | null;
  reason: string;
  book: string;
  page_id: string;
  box: string;
}

/** The entry that holds the term (row 4). `writing` is the writing of the entry that equals the term: the headword or one of the other writings. */
export interface ExistingEntry {
  entry_id: string;
  headword: string;
  writing: string;
  /** True when the term is the headword. False when it is another writing (x-headword-variants). */
  isHeadword: boolean;
}

/**
 * One group per term. The fields of ProposalGroup keep their meaning, with these rules:
 *   kind      what Accept writes: "revise" when the term is in the dictionary (row 4) or only revise rows name it, else "add".
 *   key       the normalized term.
 *   entry_id  the entry that Accept revises, or null for an add.
 *   ja_term, reading, romaji   the values of the newest row that has them (the add values of Accept).
 *   newest    the newest row of any kind (the EN form and the detailed text of Accept, as in unit VW126).
 */
export interface TermGroup extends ProposalGroup {
  term: string;
  add_count: number;
  revise_count: number;
  /** The VW126 group IDs (kind + term) of the rows. Old review lines name these IDs. */
  legacy_ids: string[];
  /** Every row of the group, newest first (row 3). */
  rows: ProposalDetail[];
  existing: ExistingEntry | null;
}

/** The index of the writings of the entries: the normalized headword and the normalized other writings, each to its entry. A headword wins over another writing. */
export function writingIndex(entries: Map<string, EntryFacts>): Map<string, ExistingEntry> {
  const out = new Map<string, ExistingEntry>();
  const ids = [...entries.keys()].sort(cmpStr);
  for (const id of ids) {
    const e = entries.get(id)!;
    const k = normTerm(e.headword);
    if (k && !(out.get(k)?.isHeadword ?? false)) out.set(k, { entry_id: e.id, headword: e.headword, writing: e.headword, isHeadword: true });
  }
  for (const id of ids) {
    const e = entries.get(id)!;
    for (const v of e.variants) {
      const k = normTerm(v);
      if (k && !out.has(k)) out.set(k, { entry_id: e.id, headword: e.headword, writing: v, isHeadword: false });
    }
  }
  return out;
}

/** The term of a row: the normalized Japanese term, else (a revise without a term) the normalized headword of its entry, else the entry ID. */
export function termOf(row: J, entries: Map<string, EntryFacts>): string {
  const t = normTerm(row?.ja_term);
  if (t) return t;
  const e = entries.get(str(row?.entry_id));
  return normTerm(e?.headword) || str(row?.entry_id);
}

function detailOf(row: J): ProposalDetail {
  return {
    proposal_id: str(row.proposal_id),
    utc: str(row.utc),
    kind: row.kind === "revise" ? "revise" : "add",
    entry_id: typeof row.entry_id === "string" && row.entry_id ? row.entry_id : null,
    ja_term: str(row.ja_term),
    reading: str(row.reading),
    romaji: str(row.romaji),
    concise_en: str(row.concise_en),
    detailed_en: typeof row.detailed_en === "string" ? row.detailed_en : null,
    reason: str(row.reason),
    book: str(row.book),
    page_id: str(row.page_id),
    box: str(row.box),
  };
}

const negCodes = (s: string): number[] => Array.from(s, (c) => -(c.codePointAt(0) ?? 0));
function cmpNums(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return a.length - b.length;
}

/**
 * One group per term (row 2). The order of the groups is the VW126 order: count (largest first), then the newest row (newest first), then the term.
 * `entries` maps the entry ID to its facts (termbase.draft.jsonl). It gives the mark of row 4 and the entry of a revise.
 */
export function mergedTerms(rows: J[], entries: Map<string, EntryFacts>): TermGroup[] {
  const index = writingIndex(entries);
  const sorted = [...rows].sort((a, b) => cmpStr(str(a.utc), str(b.utc)) || cmpStr(str(a.proposal_id), str(b.proposal_id)));
  const byTerm = new Map<string, J[]>();
  for (const row of sorted) {
    const t = termOf(row, entries);
    const list = byTerm.get(t);
    if (list) list.push(row);
    else byTerm.set(t, [row]);
  }
  const out: TermGroup[] = [];
  for (const [term, list] of byTerm) {
    const newestRow = list[list.length - 1];
    const newestWith = (field: string): string => {
      for (let i = list.length - 1; i >= 0; i--) if (str(list[i][field])) return str(list[i][field]);
      return "";
    };
    const newestAdd = [...list].reverse().find((r) => r.kind !== "revise");
    const newestRevise = [...list].reverse().find((r) => r.kind === "revise" && str(r.entry_id));
    let existing: ExistingEntry | null = index.get(term) ?? null;
    if (!existing && newestRevise) {
      const e = entries.get(str(newestRevise.entry_id));
      if (e) existing = { entry_id: e.id, headword: e.headword, writing: e.headword, isHeadword: true };
    }
    const books: string[] = [];
    const pages: string[] = [];
    const boxes: string[] = [];
    const forms = new Map<string, number>();
    const legacy: string[] = [];
    for (const r of list) {
      for (const [arr, v] of [[books, str(r.book)], [pages, str(r.page_id)], [boxes, str(r.box)]] as const) if (!arr.includes(v)) arr.push(v);
      const f = str(r.concise_en);
      forms.set(f, (forms.get(f) ?? 0) + 1);
      const old = groupId(mergeKey(r));
      if (!legacy.includes(old)) legacy.push(old);
    }
    const kind: "add" | "revise" = existing || (!newestAdd && newestRevise) ? "revise" : "add";
    out.push({
      kind,
      key: term,
      entry_id: existing ? existing.entry_id : kind === "revise" ? str(newestRevise?.entry_id) || null : null,
      ja_term: newestAdd ? str(newestAdd.ja_term) : str(newestRow.ja_term) || existing?.headword || term,
      reading: newestAdd ? str(newestAdd.reading) : newestWith("reading"),
      romaji: newestAdd ? str(newestAdd.romaji) : newestWith("romaji"),
      count: list.length,
      books,
      pages,
      boxes,
      first_utc: str(list[0].utc),
      last_utc: str(newestRow.utc),
      concise_en_forms: [...forms.entries()].sort((a, b) => b[1] - a[1] || cmpStr(a[0], b[0])).map(([text, count]) => ({ text, count })),
      newest: {
        proposal_id: str(newestRow.proposal_id),
        utc: str(newestRow.utc),
        concise_en: str(newestRow.concise_en),
        detailed_en: typeof newestRow.detailed_en === "string" ? newestRow.detailed_en : null,
        reason: str(newestRow.reason),
        book: str(newestRow.book),
        page_id: str(newestRow.page_id),
        box: str(newestRow.box),
      },
      proposal_ids: list.map((r) => str(r.proposal_id)),
      term,
      add_count: list.filter((r) => r.kind !== "revise").length,
      revise_count: list.filter((r) => r.kind === "revise").length,
      legacy_ids: legacy,
      rows: [...list].reverse().map(detailOf),
      existing,
    });
  }
  out.sort((a, b) => b.count - a.count || cmpNums(negCodes(a.last_utc), negCodes(b.last_utc)) || cmpStr(a.key, b.key));
  return out;
}

/** A term group with its state (the fields of the VW126 GroupView). */
export type TermView = GroupView & TermGroup;

/**
 * The state of each term group. The review lines of the group are the lines that name the new term ID or one of its VW126 IDs (legacy_ids).
 * The newest line of the actions accept, edit-accept, or reject decides the status, as in unit VW126. Comments never change the status.
 */
export function viewTerms(groups: TermGroup[], reviews: ReviewLine[], inDictionary: (decisionId: string) => boolean, utcOf: (proposalId: string) => string): TermView[] {
  return groups.map((g) => {
    const id = termGroupId(g.term);
    const names = new Set([id, ...g.legacy_ids]);
    const mine = reviews.filter((r) => names.has(r.group));
    const decided = [...mine].reverse().find((r) => r.action !== "comment");
    return {
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
  });
}

/** True when a review line decides the group: it names the term ID or a VW126 ID of the group, and its action is not a comment. */
export function hasDecision(g: TermGroup, reviews: ReviewLine[]): boolean {
  const names = new Set([termGroupId(g.term), ...g.legacy_ids]);
  return reviews.some((r) => names.has(r.group) && r.action !== "comment");
}

/** The group that Edit then accept decides (row 4): `as` "add" writes a new entry, "revise" changes the entry of the term. Without `as`, the kind of the group holds. */
export function groupAs(g: TermGroup, as: "add" | "revise" | undefined): ProposalGroup {
  if (!as || as === g.kind) return g;
  if (as === "add") return { ...g, kind: "add", entry_id: null };
  return { ...g, kind: "revise" };
}

/** The address of the page view of this Mac for a page ID such as "left_foot_full/p038", or "" when the ID has another form. */
export function pageViewHref(pageId: string): string {
  const m = /^([A-Za-z0-9_-]+)\/(p\d+)$/.exec(pageId);
  return m ? `/page/${m[1]}/${m[2]}` : "";
}

/** The readable name of a book (Q-A 3:17.4): the title and the folder name, never the folder name alone. */
export function bookName(slug: string, titles: Record<string, string>): string {
  const t = titles[slug];
  return t ? `${t} (${slug})` : `${slug} (title not found)`;
}

/** The window event that carries the new number of open terms to the button "Agent proposals (N open)" (row 1). */
export const OPEN_COUNT_EVENT = "vw129-proposals-open-count";

/** The text of the button (row 1): "Agent proposals (N open)", or "Agent proposals" when the count is not known. */
export function proposalsButtonText(count: number | null): string {
  return count === null ? "Agent proposals" : `Agent proposals (${count} open)`;
}

/** The plain counts line of a row (row 2), for example "Proposed 12 times · 10 add, 2 revise". */
export function countsText(g: Pick<TermGroup, "count" | "add_count" | "revise_count">): string {
  return `Proposed ${g.count} ${g.count === 1 ? "time" : "times"} · ${g.add_count} add, ${g.revise_count} revise`;
}
