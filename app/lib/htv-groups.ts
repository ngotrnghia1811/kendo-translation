// Sentence groups of a page for the human-translation-view.
// This file is a TypeScript port of translator.book_memory.sentence_groups and the ED_3 part of cut_pairs
// (kendo-translation-translator/data/scripts/translator/book_memory.py:59-132).
// Round 51 answer 9 (Q-A 2026-10-28 l54): "Book memory rule (Recommended)". Round 51 answer 15 (l60): a group with no
// ED_3 text keeps its row with an empty agent text.
// The file has no import and no server-only marker, so that the parity script can load it with Node type stripping.

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

export const SENTENCE_END = "。！？";
export const CLOSERS = "」』）)";

// Python str.rstrip() and str.strip() remove these characters (str.isspace). JavaScript trimEnd() differs at the edges.
const PY_SPACE = "\\t\\n\\v\\f\\r \\x1c-\\x1f\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const PY_TRAIL = new RegExp("[" + PY_SPACE + "]+$");
const PY_LEAD = new RegExp("^[" + PY_SPACE + "]+");

export function pyRstrip(s: string): string {
  return s.replace(PY_TRAIL, "");
}

export function pyStrip(s: string): string {
  return pyRstrip(s.replace(PY_LEAD, ""));
}

/** Number of leading characters (code points) that Python strip() removes. */
export function leadingSpace(s: string): number {
  const m = PY_LEAD.exec(s);
  return m ? Array.from(m[0]).length : 0;
}

/** True if the line text ends a sentence: 。 ！ or ？ at the end, with closing marks after it allowed. */
export function endsSentence(text: string): boolean {
  let s = pyRstrip(text);
  while (s.length > 0 && CLOSERS.includes(s[s.length - 1])) s = s.slice(0, -1);
  return s.length > 0 && SENTENCE_END.includes(s[s.length - 1]);
}

export interface SentenceGroup {
  part: "lines" | "block_title";
  ts_ids: string[];
  ja: string;
}

/** Groups of TS_3 items in reading order (same rule as Python). `ts` is the key after_program_step of results/TS_3.json. */
export function sentenceGroups(ts: J): SentenceGroup[] {
  const series: { part: "lines" | "block_title"; it: J }[] = [
    ...((ts?.lines ?? []) as J[]).map((it) => ({ part: "lines" as const, it })),
    ...((ts?.block_title ?? []) as J[]).map((it) => ({ part: "block_title" as const, it })),
  ];
  // Array.prototype.sort is stable, like Python sort.
  series.sort((a, b) => Number(a.it.reading_order) - Number(b.it.reading_order));
  const groups: SentenceGroup[] = [];
  let cur: SentenceGroup | null = null;
  for (const { part, it } of series) {
    if (part === "block_title") {
      if (cur) {
        groups.push(cur);
        cur = null;
      }
      groups.push({ part: "block_title", ts_ids: [it.item_id], ja: it.text });
      continue;
    }
    if (cur === null) cur = { part: "lines", ts_ids: [], ja: "" };
    cur.ts_ids.push(it.item_id);
    cur.ja += it.text;
    if (endsSentence(it.text)) {
      groups.push(cur);
      cur = null;
    }
  }
  if (cur) groups.push(cur);
  return groups;
}

/** Short ID of an item ID: the last segment, for example L01. */
export function shortId(itemId: string): string {
  const i = itemId.lastIndexOf("/");
  return i >= 0 ? itemId.slice(i + 1) : itemId;
}

/** Round 53 answer 9 / round 54 answer 9: `<page_id>/ts3/<first short ID>-<last short ID>`. A one-item group repeats the ID (T01-T01). */
export function groupKey(pageId: string, g: SentenceGroup): string {
  return `${pageId}/ts3/${shortId(g.ts_ids[0])}-${shortId(g.ts_ids[g.ts_ids.length - 1])}`;
}

export interface EdPiece {
  /** Index in the ED list of the part, counts from 0. */
  n: number;
  itemId: string;
  /** Text of the piece after strip(), the part that joins into the row text. */
  text: string;
  /** Number of characters (code points) that strip() removed at the start. Mark offsets count from the raw text. */
  lead: number;
}

export interface GroupEd {
  /** ED_3 text of the row. Empty when no ED_3 item cites the group. */
  text: string;
  pieces: EdPiece[];
}

/**
 * ED_3 text for each group, same rule as cut_pairs: an ED item goes to the group of the first TS item that it cites
 * (the lowest group index), and only items of the same part count. Pieces sort by `order` (missing order last), then by index.
 * `ed` is the key after_program_step of results/ED_3.json. The result has one entry for each group, in group order.
 */
export function edForGroups(groups: SentenceGroup[], ed: J): GroupEd[] {
  const owner: Record<string, Map<string, number>> = { lines: new Map(), block_title: new Map() };
  groups.forEach((g, gi) => {
    for (const id of g.ts_ids) if (!owner[g.part].has(id)) owner[g.part].set(id, gi);
  });
  const taken: { n: number; it: J }[][] = groups.map(() => []);
  for (const part of ["lines", "block_title"] as const) {
    ((ed?.[part] ?? []) as J[]).forEach((it, n) => {
      const hits: number[] = [];
      for (const r of (it?.ja_refs ?? []) as string[]) {
        const gi = owner[part].get(r);
        if (gi !== undefined) hits.push(gi);
      }
      if (hits.length > 0 && it.text !== null && it.text !== undefined) taken[Math.min(...hits)].push({ n, it });
    });
  }
  const sortKey = (e: { n: number; it: J }): [number, number] => [e.it.order !== null && e.it.order !== undefined ? Number(e.it.order) : 1e6, e.n];
  return groups.map((_, gi) => {
    const mine = [...taken[gi]].sort((a, b) => {
      const ka = sortKey(a);
      const kb = sortKey(b);
      return ka[0] - kb[0] || ka[1] - kb[1];
    });
    const pieces: EdPiece[] = [];
    for (const e of mine) {
      const raw = String(e.it.text);
      const text = pyStrip(raw);
      if (text) pieces.push({ n: e.n, itemId: String(e.it.item_id ?? ""), text, lead: leadingSpace(raw) });
    }
    return { text: pieces.map((p) => p.text).join(" "), pieces };
  });
}

export interface PlacedMark {
  /** Offsets count characters (code points) of the row text. */
  start: number;
  end: number;
  markId: string;
  entryId: string;
  surface: string;
  /** Result of the EN form check for this mark, or null when the check file has no item for it. */
  result: string | null;
  detail: string | null;
}

function cpLen(s: string): number {
  return Array.from(s).length;
}

/**
 * Place the stored term marks (programs/term_marks.ED_3.json) in one row.
 * `ja.start` and `ja.end` count characters of the TS_3 item, so they move by the length of the items before it in the row.
 * `en.start` and `en.end` count characters of the raw ED_3 item. The row text holds the stripped item, so they move by the
 * characters that strip() removed, and by the length of the pieces before it plus one space for each join.
 * Round 51 answer 12 (Q-A 2026-10-28 l57): a mark with en null has the JA place only.
 * `checks` maps `<entry_id>|<ja item ID>` to the item of programs/en_form_check.ED_3.json.
 */
export function placeMarks(g: SentenceGroup, jaItemText: Map<string, string>, ed: GroupEd, marks: J[], checks: Map<string, J>): { ja: PlacedMark[]; en: PlacedMark[] } {
  const jaOff = new Map<string, number>();
  let pos = 0;
  for (const id of g.ts_ids) {
    jaOff.set(id, pos);
    pos += cpLen(jaItemText.get(id) ?? "");
  }
  const edOff = new Map<string, { off: number; lead: number; len: number }>();
  pos = 0;
  for (const p of ed.pieces) {
    edOff.set(p.itemId, { off: pos, lead: p.lead, len: cpLen(p.text) });
    pos += cpLen(p.text) + 1;
  }
  const ja: PlacedMark[] = [];
  const en: PlacedMark[] = [];
  for (const m of marks) {
    if (!m || !m.ja) continue;
    const chk = checks.get(`${m.entry_id}|${m.ja.item_id}`);
    const base = {
      markId: String(m.mark_id ?? ""),
      entryId: String(m.entry_id ?? ""),
      surface: String(m.surface ?? ""),
      result: chk ? String(chk.result ?? "") : null,
      detail: chk ? String(chk.detail ?? "") : null,
    };
    const jo = jaOff.get(String(m.ja.item_id));
    if (jo !== undefined) ja.push({ ...base, start: jo + Number(m.ja.start), end: jo + Number(m.ja.end) });
    if (m.en) {
      const eo = edOff.get(String(m.en.item_id));
      if (eo) {
        const start = eo.off + Number(m.en.start) - eo.lead;
        const end = eo.off + Number(m.en.end) - eo.lead;
        if (start >= eo.off && end <= eo.off + eo.len && end > start) en.push({ ...base, start, end });
      }
    }
  }
  ja.sort((a, b) => a.start - b.start);
  en.sort((a, b) => a.start - b.start);
  return { ja, en };
}
