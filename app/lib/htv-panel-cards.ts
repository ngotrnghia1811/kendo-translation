// Cards of the TL_3 information panel (unit UXC step B, round 59).
// Round 58 answer 5 (Q-A 2026-10-28 l203): "Option 1": dictionary entries as cards, the lower pair as plain EN lines with their IDs,
// memory pairs as JA and EN with page IDs, hide entry_id, store, and source, drop the JA text block.
// This file is a pure parser of PanelPart.lines. The snapshot keeps the raw lines (SNAPSHOT_FORMAT stays 1).
// Every raw line goes to a field of a card or to a "more" list. The function rawLines() rebuilds the raw lines of a card, so that a test can compare them.
// The file has no server-only marker, so that a script can load it with Node type stripping.
import type { PanelBlock, PanelPart } from "./htv-panel";

/** One `name: value` field. `lines` holds the raw lines (the first line and the continuation lines). */
export interface CardField {
  name: string;
  value: string;
  lines: string[];
}

export interface EntryCard {
  kind: "entry";
  headword: string;
  /** The text in brackets after the headword, for example "written variants: 触刃, 触刃の間合", or null when it says "none". */
  variants: string | null;
  reading: string;
  romaji: string;
  common: "common" | "not common" | "";
  concise: string;
  detailed: string;
  /** The fields entry_id, store, and source stay in the card and the panel hides them. */
  hidden: CardField[];
  /** All other lines: unknown fields and lines before the first field. */
  more: string[];
  fields: CardField[];
  lead: string[];
}

export interface PairCard {
  kind: "pair";
  /** Short chip text. For the book translation memory it is "left_foot_full/p049 · P02". */
  chip: string;
  /** The page of a book translation memory pair (the link target), or null. */
  page: { slug: string; page: string } | null;
  /** The pair name of the source, for example "P01". Empty when the source has no page. Unit VW111. */
  pair: string;
  source: string;
  ja: string;
  en: string;
  more: string[];
  fields: CardField[];
  lead: string[];
}

export interface ResultLine {
  /** Short line ID, for example "ts2/L01". */
  id: string;
  /** The full IDs of the line, for the tooltip. */
  full: string;
  text: string;
}

export interface ResultCard {
  kind: "result";
  from: string;
  /** The fixed line `stance` is hidden (round 59 answer 6). */
  stance: string;
  /** The lines of `result`, or null when the JSON is not readable. */
  lines: ResultLine[] | null;
  /** The raw `result` text when the JSON is not readable. */
  resultRaw: string;
  rationale: string;
  more: string[];
  fields: CardField[];
  lead: string[];
}

export interface MarkRow {
  entryId: string;
  ja: string;
  enTerm: string;
  firstPage: { slug: string; page: string } | null;
  firstPageText: string;
  result: string;
  raw: string;
}

export interface MarksCard {
  kind: "marks";
  bookId: string;
  pagesRead: string;
  rows: MarkRow[];
  /** Header text, rows that are not readable, and other lines. */
  more: string[];
  /** The raw lines in the original order. */
  lines: string[];
}

/** The lines before the first item of a dictionary or memory block: store, lookup_source, requested_words, entries_found, pairs_found, book_id. */
export interface NoteCard {
  kind: "note";
  requested: string;
  /** For example "32 entries found." or "0 pairs found.", or an empty text. */
  found: string;
  bookId: string;
  /** The line `store` is hidden. */
  hidden: CardField[];
  /** The line lookup_source and all other lines. */
  more: string[];
  fields: CardField[];
  lead: string[];
}

export interface TextCard {
  kind: "text";
  lines: string[];
}

export type PanelCard = EntryCard | PairCard | ResultCard | MarksCard | NoteCard | TextCard;

export interface CardBlock {
  name: string;
  label: string;
  lineCount: number;
  itemCount: number;
  cards: PanelCard[];
}

/** Order of the blocks on the screen. Round 58 answer 5, round 59 answer 6 (previous_page_pair after the lower pair). The block ja_text is not shown. */
export const CARD_ORDER = ["dictionary_lookup", "book_translation_memory", "aligned_translation_memory", "lower_pair", "previous_page_pair", "earlier_term_marks"];

const FIELD_START = /^([a-z_]+):(?: (.*))?$/;

/** Split lines into fields. A line that starts with a name from `known` begins a field. Any other line joins the field before it. */
function parseFields(lines: string[], known: string[]): { fields: CardField[]; lead: string[] } {
  const fields: CardField[] = [];
  const lead: string[] = [];
  for (const line of lines) {
    const m = FIELD_START.exec(line);
    if (m && known.includes(m[1])) {
      fields.push({ name: m[1], value: m[2] ?? "", lines: [line] });
    } else if (fields.length > 0) {
      const f = fields[fields.length - 1];
      f.value += "\n" + line;
      f.lines.push(line);
    } else {
      lead.push(line);
    }
  }
  return { fields, lead };
}

function valueOf(fields: CardField[], name: string): string {
  return fields.find((f) => f.name === name)?.value ?? "";
}

const ENTRY_FIELDS = ["entry_id", "store", "source", "headword_ja", "reading", "romaji", "concise_en", "common", "detailed_en"];
const ENTRY_HIDDEN = ["entry_id", "store", "source"];

function entryCard(lines: string[]): EntryCard {
  const { fields, lead } = parseFields(lines, ENTRY_FIELDS);
  const head = valueOf(fields, "headword_ja");
  const m = /^(.*?)\s*\(written variants: (.*)\)\s*$/.exec(head);
  const headword = m ? m[1] : head;
  const variants = m && m[2].trim() !== "none" ? m[2].trim() : null;
  const common = valueOf(fields, "common").trim();
  return {
    kind: "entry",
    headword,
    variants,
    reading: valueOf(fields, "reading"),
    romaji: valueOf(fields, "romaji"),
    common: common === "common" ? "common" : common === "not common" ? "not common" : "",
    concise: valueOf(fields, "concise_en"),
    detailed: valueOf(fields, "detailed_en"),
    hidden: fields.filter((f) => ENTRY_HIDDEN.includes(f.name)),
    more: [...lead, ...fields.filter((f) => !ENTRY_FIELDS.includes(f.name)).flatMap((f) => f.lines)],
    fields,
    lead,
  };
}

/** Chip text and page of a pair source. The run and the word "split none" stay out of the chip. */
function chipOf(source: string): { chip: string; page: { slug: string; page: string } | null; pair: string } {
  const b = /^page ([^/\s,]+)\/(p\d+), pair (\S+?)(?:,|$)/.exec(source.trim());
  if (b) return { chip: `${b[1]}/${b[2]} · ${b[3]}`, page: { slug: b[1], page: b[2] }, pair: b[3] };
  return { chip: source.trim(), page: null, pair: "" };
}

function pairCard(lines: string[]): PairCard {
  const { fields, lead } = parseFields(lines, ["source", "ja", "en"]);
  const source = valueOf(fields, "source");
  const c = chipOf(source);
  return { kind: "pair", chip: c.chip, page: c.page, pair: c.pair, source, ja: valueOf(fields, "ja"), en: valueOf(fields, "en"), more: [...lead], fields, lead };
}

/** Length of a short title in a pair chip (unit default of VW111). */
export const CHIP_TITLE_LENGTH = 30;

/**
 * Unit VW111 (Q-A 3:76.2 "Short title in the chip"): the first 30 characters of a title. A title of 30 characters or fewer stays whole.
 * A longer title is cut at the last word end inside the first 30 characters, when there is one, else after 30 characters. A cut adds "…".
 * Unit defaults: a word end is a space; the cut drops the spaces and the characters , ; : ( - at its end.
 * The title comes clean (lib/htv-titles.ts cleanTitle). This file imports nothing at run time, so that scripts/smoke.mjs can load it with Node type stripping.
 */
export function shortTitle(title: string, max: number = CHIP_TITLE_LENGTH): string {
  const chars = Array.from(title.trim());
  if (chars.length <= max) return chars.join("");
  let cut = chars.slice(0, max).join("");
  if (!/\s/.test(chars[max])) {
    const i = cut.search(/\s\S*$/);
    if (i > 0) cut = cut.slice(0, i);
  }
  return cut.replace(/[\s,;:(\-\u2013\u2014]+$/u, "") + "\u2026";
}

/**
 * Unit VW111 (Q-A 3:76.2 "Short title in the chip", Q-A 3:72.2): the chip text of a pair with the short title of its book, for example
 * "How to Create an Ideal Kamae · p3 · P01". `titles` maps a book slug to its title (English, else Japanese). The hover text holds the full title and the page ID.
 * A pair with no page, or a book with no title in `titles`, keeps the older text (the chip of the card, "slug/page · pair"), and has no hover text.
 */
export function pairChip(c: PairCard, titles: Record<string, string> = {}): { text: string; hover: string } {
  const title = c.page ? titles[c.page.slug] : "";
  if (!c.page || !title) return { text: c.chip, hover: "" };
  return { text: `${shortTitle(title)} · p${Number(c.page.page.slice(1))} · ${c.pair}`, hover: `${title}. Page ID ${c.page.slug}/${c.page.page}, pair ${c.pair}.` };
}

/** The same for the cell "First used on page" of the marks table: "Short title · p3". The older text (the page ID) stays when the book has no title. */
export function firstPageChip(page: { slug: string; page: string } | null, text: string, titles: Record<string, string> = {}): { text: string; hover: string } {
  const title = page ? titles[page.slug] : "";
  if (!page || !title) return { text, hover: "" };
  return { text: `${shortTitle(title)} · p${Number(page.page.slice(1))}`, hover: `${title}. Page ID ${page.slug}/${page.page}.` };
}

/** The slugs of the books that the cards of a panel name: the pair pages, the first pages of the marks, and the book of the marks. Sorted, no repeat. */
export function panelBookSlugs(blocks: PanelBlock[]): string[] {
  const out = new Set<string>();
  for (const b of panelCards(blocks)) {
    for (const c of b.cards) {
      if (c.kind === "pair" && c.page) out.add(c.page.slug);
      else if (c.kind === "marks") {
        if (c.bookId) out.add(c.bookId);
        for (const r of c.rows) if (r.firstPage) out.add(r.firstPage.slug);
      }
    }
  }
  return [...out].sort();
}

const RESULT_FIELDS = ["from", "stance", "result", "translation_rationale"];

function resultCard(lines: string[]): ResultCard {
  const { fields, lead } = parseFields(lines, RESULT_FIELDS);
  const resultRaw = valueOf(fields, "result");
  let out: ResultLine[] | null = null;
  try {
    const j = JSON.parse(resultRaw) as { lines?: unknown };
    if (Array.isArray(j.lines)) {
      out = (j.lines as { ja_refs?: unknown; text?: unknown }[]).map((l) => {
        const refs = Array.isArray(l?.ja_refs) ? (l.ja_refs as unknown[]).map(String) : [];
        const short = refs.map((r) => r.split("/").slice(-2).join("/"));
        return { id: short.join(", "), full: refs.join(", "), text: typeof l?.text === "string" ? l.text : "" };
      });
    }
  } catch {
    out = null;
  }
  return {
    kind: "result",
    from: valueOf(fields, "from"),
    stance: valueOf(fields, "stance"),
    lines: out,
    resultRaw,
    rationale: valueOf(fields, "translation_rationale"),
    more: [...lead],
    fields,
    lead,
  };
}

const MARK_ROW = /^(\S+) \| (.*) \| (.*) \| first used on page (.*) \| result=(.*)$/;

function marksCard(lines: string[]): MarksCard {
  let bookId = "";
  let pagesRead = "";
  const rows: MarkRow[] = [];
  const more: string[] = [];
  for (const line of lines) {
    let m: RegExpExecArray | null;
    if ((m = /^book_id: (.*)$/.exec(line))) bookId = m[1];
    else if ((m = /^pages_read: (.*)$/.exec(line))) pagesRead = m[1];
    else if ((m = MARK_ROW.exec(line))) {
      const p = /^([^/\s]+)\/(p\d+)$/.exec(m[4].trim());
      rows.push({ entryId: m[1], ja: m[2], enTerm: m[3], firstPage: p ? { slug: p[1], page: p[2] } : null, firstPageText: m[4].trim(), result: m[5].trim(), raw: line });
    } else more.push(line);
  }
  return { kind: "marks", bookId, pagesRead, rows, more, lines };
}

const NOTE_FIELDS = ["store", "lookup_source", "requested_words", "entries_found", "pairs_found", "book_id"];

function noteCard(lines: string[]): NoteCard {
  const { fields, lead } = parseFields(lines, NOTE_FIELDS);
  const entries = valueOf(fields, "entries_found");
  const pairs = valueOf(fields, "pairs_found");
  return {
    kind: "note",
    requested: valueOf(fields, "requested_words"),
    found: entries ? `${entries} entries found.` : pairs ? `${pairs} pairs found.` : "",
    bookId: valueOf(fields, "book_id"),
    hidden: fields.filter((f) => f.name === "store"),
    more: [...lead, ...fields.filter((f) => f.name === "lookup_source").flatMap((f) => f.lines)],
    fields,
    lead,
  };
}

/** Cards of one block. The block ja_text and the hidden blocks give null. */
export function blockCards(b: PanelBlock): CardBlock | null {
  if (!CARD_ORDER.includes(b.name)) return null;
  const cards: PanelCard[] = [];
  for (const p of b.parts as PanelPart[]) {
    if (p.kind === "ENTRY") cards.push(entryCard(p.lines));
    else if (p.kind === "PAIR") cards.push(pairCard(p.lines));
    else if (b.name === "lower_pair" || b.name === "previous_page_pair") cards.push(resultCard(p.lines));
    else if (b.name === "earlier_term_marks") cards.push(marksCard(p.lines));
    else if (b.name === "dictionary_lookup" || b.name === "book_translation_memory" || b.name === "aligned_translation_memory") cards.push(noteCard(p.lines));
    else cards.push({ kind: "text", lines: p.lines });
  }
  return { name: b.name, label: b.label, lineCount: b.lineCount, itemCount: b.itemCount, cards };
}

/** All shown blocks of the panel as card blocks, in the screen order. */
export function panelCards(blocks: PanelBlock[]): CardBlock[] {
  const out: CardBlock[] = [];
  for (const name of CARD_ORDER) {
    const b = blocks.find((x) => x.name === name);
    const cb = b ? blockCards(b) : null;
    if (cb) out.push(cb);
  }
  return out;
}

/** The raw lines of a card, rebuilt from its fields. A test compares them with PanelPart.lines (0 lost lines). */
export function rawLines(c: PanelCard): string[] {
  switch (c.kind) {
    case "entry":
    case "pair":
    case "result":
    case "note":
      return [...c.lead, ...c.fields.flatMap((f) => f.lines)];
    case "marks":
      return c.lines;
    case "text":
      return c.lines;
  }
}
