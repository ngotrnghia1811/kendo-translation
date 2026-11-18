// Parser of messages/TL_3.txt for the TL_3 information panel of the human-translation-view.
// Round 51 answer 8 (Q-A 2026-10-28 l53): the panel shows the information that the TL_3 agent got.
// Round 52 answer 12 (l83): the panel hides grid_place and reads the TL_3 message.
// Round 53 answer 5 (l99): hide the fixed text (sections 1 to 3). Answer 6 (l100): blocks of the whole page.
// Round 54 answer 9 (l128): the panel also hides section 4 (the box header).
// The file has no import and no server-only marker, so that a script can load it with Node type stripping.

/** Blocks that the panel shows, in the order of the message. All other blocks (grid_place) and all fixed text stay hidden. */
export const PANEL_BLOCKS: { name: string; label: string }[] = [
  { name: "ja_text", label: "Japanese text of the page" },
  { name: "lower_pair", label: "Lower pair from TL_2" },
  { name: "previous_page_pair", label: "Previous page pair" },
  { name: "earlier_term_marks", label: "Earlier term marks" },
  { name: "dictionary_lookup", label: "Dictionary lookup" },
  { name: "book_translation_memory", label: "Book translation memory" },
  { name: "aligned_translation_memory", label: "Aligned translation memory" },
];

export interface PanelPart {
  /** `text` for lines outside an item, `ENTRY` or `PAIR` for an item. */
  kind: "text" | "ENTRY" | "PAIR";
  lines: string[];
}

export interface PanelBlock {
  name: string;
  label: string;
  /** Line numbers in the message, counted from 1, marker lines included. */
  startLine: number;
  endLine: number;
  lineCount: number;
  /** Count of ENTRY and PAIR items in the block. */
  itemCount: number;
  parts: PanelPart[];
}

export interface PanelData {
  /** False when the message file is missing or holds no block. */
  available: boolean;
  /** Plain note for the screen when the panel has no blocks. */
  note: string;
  totalLines: number;
  /** Sum of the lines of the shown blocks, marker lines included. */
  shownLines: number;
  blocks: PanelBlock[];
  /**
   * Unit VW111 (Q-A 3:76.2): the title of each book that the cards of the panel name (slug to title). The server adds it when it loads a page
   * (lib/htv-book-titles.ts). The snapshot of S2 does not hold it. A book with no title is left out, and the panel then shows the older text.
   */
  bookTitles?: Record<string, string>;
}

const BLOCK_START = /^\[BLOCK ([a-z_]+)\]$/;
const BLOCK_END = /^\[END ([a-z_]+)\]$/;

export function parseTl3Message(text: string | null): PanelData {
  if (text === null) {
    return { available: false, note: "No TL_3 message file for this run.", totalLines: 0, shownLines: 0, blocks: [] };
  }
  const lines = text.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const shown = new Map(PANEL_BLOCKS.map((b) => [b.name, b.label]));
  const found = new Map<string, PanelBlock>();
  let i = 0;
  while (i < lines.length) {
    const m = BLOCK_START.exec(lines[i]);
    if (!m) {
      i++;
      continue;
    }
    const name = m[1];
    let end = i + 1;
    while (end < lines.length) {
      const e = BLOCK_END.exec(lines[end]);
      if (e && e[1] === name) break;
      end++;
    }
    // A block without an end marker runs to the end of the file. Section lines then stay out of the block.
    const closed = end < lines.length;
    const last = closed ? end : lines.length - 1;
    if (!shown.has(name)) {
      // A hidden block (grid_place) leaves nothing in the result, not even its name.
      i = last + 1;
      continue;
    }
    const inner = lines.slice(i + 1, closed ? end : lines.length);
    const parts: PanelPart[] = [];
    let cur: PanelPart | null = null;
    let items = 0;
    for (const line of inner) {
      if (line === "[ENTRY]" || line === "[PAIR]") {
        if (cur) parts.push(cur);
        cur = { kind: line === "[ENTRY]" ? "ENTRY" : "PAIR", lines: [] };
        items++;
        continue;
      }
      if (line === "[END ENTRY]" || line === "[END PAIR]") {
        if (cur) parts.push(cur);
        cur = null;
        continue;
      }
      if (!cur) cur = { kind: "text", lines: [] };
      cur.lines.push(line);
    }
    if (cur) parts.push(cur);
    found.set(name, {
      name,
      label: shown.get(name) as string,
      startLine: i + 1,
      endLine: last + 1,
      lineCount: last - i + 1,
      itemCount: items,
      parts,
    });
    i = last + 1;
  }
  const blocks = PANEL_BLOCKS.map((b) => found.get(b.name)).filter((b): b is PanelBlock => !!b);
  if (blocks.length === 0) {
    return {
      available: false,
      note: "This TL_3 message has no input blocks. Runs from before the block markers hold no panel.",
      totalLines: lines.length,
      shownLines: 0,
      blocks: [],
    };
  }
  return {
    available: true,
    note: "",
    totalLines: lines.length,
    shownLines: blocks.reduce((s, b) => s + b.lineCount, 0),
    blocks,
  };
}
