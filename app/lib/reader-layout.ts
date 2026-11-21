// Layout of the reader panels (unit RT73b, round 73c answer 4, VISION-viewer 15.26.6). Pure functions, no import of React and no server-only marker,
// so the page components and the smoke test load the same code.
//   effectiveSettings   the settings of the screen: text settings, layout, and the conversion of the old keys text, en, and image (15.26.6.9)
//   pageRows, pageHas   the rows of each component and the data that a page has for each component (15.26.5)
//   resolveLayout       which panels a page draws: the checked components (R1), else the first layout (R2 and R3a to R3f, 15.26.6.7)
//   groupsOf            Bilingual pairing merges Original text and the first EN panel (15.26.6.5)
//   moveGroups          the new order after Move left, Move right, or a drag of a title bar (15.26.6.3)
//   componentRows       the rows of the component list (15.26.6.2)
import {
  LAYOUT_DEFAULTS,
  READER_DEFAULTS,
  legacyLayout,
  type ComponentId,
  type ReaderSettings,
  type ReaderShown,
  type ViewName,
  type WorkKind,
} from "./htv-settings";
import { rowNote } from "./cross-page-reader";
import {
  KEEP_ONE,
  LABEL_AGREE_ROW,
  LABEL_V1,
  NO_HUMAN,
  NO_IMAGE,
  NO_JA,
  NO_TERMS,
  NO_TEXT,
  NO_V1,
  PAGE_VIEW_ONLY,
  PAIR_NEEDS,
  type ReaderBookIndex,
  type ReaderFact,
  type ReaderMark,
  type ReaderPageData,
} from "./reader-types";

/** The settings of the screen: every text setting and every layout key has a value. "shown" has none while the account has no saved layout. */
export type EffectiveSettings = typeof READER_DEFAULTS & {
  components: ComponentId[];
  widths: Partial<Record<ComponentId, number>>;
  pair: boolean;
  terms: boolean;
  shown?: ReaderShown;
  panelSeen?: boolean;
};

/** Merge the saved reader settings with the defaults. An account without "shown" gets the checked lists of its old keys (15.26.6.9). */
export function effectiveSettings(r: ReaderSettings, view: ViewName): EffectiveSettings {
  const legacy = r.shown === undefined ? legacyLayout(r) : null;
  return {
    view,
    fontEn: r.fontEn ?? READER_DEFAULTS.fontEn,
    fontJa: r.fontJa ?? READER_DEFAULTS.fontJa,
    size: r.size ?? READER_DEFAULTS.size,
    line: r.line ?? READER_DEFAULTS.line,
    width: r.width ?? READER_DEFAULTS.width,
    focus: r.focus ?? READER_DEFAULTS.focus,
    index: r.index ?? READER_DEFAULTS.index,
    panelSeen: r.panelSeen,
    components: r.components ?? LAYOUT_DEFAULTS.components,
    widths: r.widths ?? LAYOUT_DEFAULTS.widths,
    pair: r.pair ?? legacy?.pair ?? LAYOUT_DEFAULTS.pair,
    terms: r.terms ?? LAYOUT_DEFAULTS.terms,
    shown: r.shown ?? legacy?.shown,
  };
}

// Unit VW119 (Q-A 3:103.4): a reader sees "AI translation" for the component id "agent" (the id stays, so old saved settings load). These names are used on the reader screens only.
export const COMPONENT_NAMES: Record<ComponentId, string> = {
  image: "Page image",
  ja: "Original text",
  agent: "AI translation",
  human: "Human version",
  v1en: "v1 EN placeholder",
  v1zh: "v1 ZH placeholder",
  enorig: "EN-original",
};

/** The components that hold an English text (or a v1 placeholder), in the default order of the first layout. */
const EN_IDS: ComponentId[] = ["agent", "human", "v1en", "v1zh"];

export const workKind = (images: boolean): WorkKind => (images ? "book" : "article");

// ---------------------------------------------------------------- rows of the components

/** One row of a panel. `ja` is the Japanese text of the same row, for Bilingual pairing. */
export interface PageRow {
  key: string;
  /** Place in the source list of the page. Rows of one family compare by it. */
  order: number;
  part: "lines" | "block_title";
  ja: string;
  jaMarks: ReaderMark[];
  /** The text of the component (JA for Original text). */
  text: string;
  marks: ReaderMark[];
  tag: string;
  facts: ReaderFact[];
  /** True for a Human row with no English text and a Japanese text: the muted line with the tag "fact dropped" (VISION-viewer 15.26.8, D21). */
  dropped: boolean;
  /** Unit VW90: the small note under the English text of a row at a page end inside a sentence, for example "The sentence continues on page 54.". Absent on other rows. */
  note?: string;
}

export interface PageRows {
  ja: PageRow[];
  agent: PageRow[];
  human: PageRow[];
  v1en: PageRow[];
  v1zh: PageRow[];
  /** True when the Original text comes from the v1 JA lines (D20). Its page line is LABEL_V1_JA ("Earlier machine text (placeholder)", unit VW119). */
  jaFromV1: boolean;
}

/**
 * The rows of each component for one page.
 *   Original text  the JA lines of the agent run (a page with a run), else the JA lines of the web rows, else the v1 JA lines (D20)
 *   Agent text     the agent rows of the run
 *   Human version  the web rows (a web article), else the rows of the chosen version (a book page). Rows with site true and no English text make no line (D21).
 *   v1 EN, v1 ZH   the blocks of the v1 md file
 */
export function pageRows(data: ReaderPageData): PageRows {
  const at = new Map(data.rows.map((r, i) => [r.key, i]));
  const plain = data.rows.filter((r) => !r.web);
  const web = data.rows.filter((r) => r.web);
  const base = (r: (typeof data.rows)[number]): Omit<PageRow, "text" | "marks" | "tag" | "facts" | "dropped"> => ({ key: r.key, order: at.get(r.key) ?? 0, part: r.part, ja: r.ja, jaMarks: r.jaMarks });

  const jaSource = data.hasAgent && plain.length > 0 ? plain : web.length > 0 ? web : plain;
  let ja: PageRow[] = jaSource.filter((r) => r.ja.trim() !== "").map((r) => ({ ...base(r), text: r.ja, marks: r.jaMarks, tag: "", facts: [], dropped: false }));
  const v1Row = (v: ReaderPageData["v1"][number], i: number, text: string): PageRow => ({ key: v.key, order: i, part: "lines", ja: v.ja, jaMarks: [], text, marks: [], tag: "", facts: [], dropped: false });
  let jaFromV1 = false;
  if (ja.length === 0 && data.v1.some((v) => v.ja.trim() !== "")) {
    ja = data.v1.flatMap((v, i) => (v.ja.trim() !== "" ? [v1Row(v, i, v.ja)] : []));
    jaFromV1 = true;
  }

  // Unit VW90 (Q-A 3:1.6): the note belongs to the English text of the agent. A Human row shows it only when it shows that same text (kind agent, or kind agree with the same text).
  const noted = (r: (typeof data.rows)[number], shown: boolean): { note?: string } => {
    const note = shown ? rowNote(r) : "";
    return note ? { note } : {};
  };
  const agent: PageRow[] = data.hasAgent ? plain.map((r) => ({ ...base(r), text: r.agent.text, marks: r.agent.marks, tag: r.agent.agreedByTranslator ? LABEL_AGREE_ROW : "", facts: [], dropped: false, ...noted(r, true) })) : [];

  let human: PageRow[] = [];
  if (data.hasHuman) {
    if (web.length > 0) {
      for (const r of web) {
        const h = r.human;
        if (!h) continue;
        if (h.text.trim() !== "") human.push({ ...base(r), text: h.text, marks: [], tag: "", facts: h.facts, dropped: false });
        else if (!r.site && r.ja.trim() !== "") human.push({ ...base(r), text: "", marks: [], tag: "", facts: [], dropped: true });
      }
    } else {
      human = plain.flatMap((r) => {
        const h = r.human;
        if (!h) return [];
        const tag = h.kind === "agree" ? LABEL_AGREE_ROW : h.kind === "agent" ? "AI translation" : "";
        return [{ ...base(r), text: h.text, marks: h.marks, tag, facts: h.facts, dropped: false, ...noted(r, h.kind === "agent" || (h.kind === "agree" && h.text === r.agent.text)) }];
      });
    }
  }

  const v1en = data.v1.flatMap((v, i) => (v.en.trim() !== "" ? [v1Row(v, i, v.en)] : []));
  const v1zh = data.v1.flatMap((v, i) => (v.zh.trim() !== "" ? [v1Row(v, i, v.zh)] : []));
  return { ja, agent, human, v1en, v1zh, jaFromV1 };
}

/** What a page has for each component (15.26.5). `terms` is true when any row of the page carries a term mark. */
export type PageHas = Record<ComponentId, boolean> & { terms: boolean };

export function pageHas(rows: PageRows, images: boolean): PageHas {
  const marks = [...rows.ja, ...rows.agent, ...rows.human].some((r) => r.marks.length > 0 || r.jaMarks.length > 0);
  return { image: images, ja: rows.ja.length > 0, agent: rows.agent.length > 0, human: rows.human.length > 0, v1en: rows.v1en.length > 0, v1zh: rows.v1zh.length > 0, enorig: false, terms: marks };
}

export const rowsOf = (rows: PageRows, id: ComponentId): PageRow[] => (id === "enorig" || id === "image" ? [] : rows[id]);

// ---------------------------------------------------------------- which panels a page draws

export interface Drawn {
  /** The components that the page draws, in the saved order. */
  ids: ComponentId[];
  /** Checked components with no data on this page (R1 only). The note line names them (D16). */
  missing: ComponentId[];
  /** Components with data on this page that are not checked (R1 only). */
  others: ComponentId[];
  /** True when the page uses the first layout (R2). */
  first: boolean;
}

/**
 * VISION-viewer 15.26.6.7.
 *   R1  the account has a checked list for the kind and at least one of its components has data on this page: draw those that have data
 *   R2  else the first layout: R3a Page image, R3b Original text (an article), R3c the first EN text (Agent text, Human version, v1 EN placeholder),
 *       R3d nothing else, R3e Original text when the page has no EN text, R3f nothing at all
 * `imageOk` is false in Scroll view and in Focus mode: the Page image does not draw there (15.26.6.11).
 */
export function resolveLayout(has: PageHas, order: ComponentId[], shown: ComponentId[] | undefined, kind: WorkKind, imageOk: boolean): Drawn {
  const avail = (id: ComponentId) => (id === "image" ? has.image && imageOk : id === "enorig" ? false : has[id]);
  const sorted = (ids: ComponentId[]) => order.filter((id) => ids.includes(id));
  if (shown) {
    const ids = sorted(shown.filter(avail));
    if (ids.length > 0) {
      return { ids, missing: sorted(shown.filter((id) => !avail(id) && id !== "enorig")), others: order.filter((id) => avail(id) && !shown.includes(id)), first: false };
    }
  }
  const first: ComponentId[] = [];
  if (avail("image")) first.push("image");
  if (kind === "article" && avail("ja")) first.push("ja");
  const en = (["agent", "human", "v1en"] as const).find(avail);
  if (en) first.push(en);
  else if (!first.includes("ja") && avail("ja")) first.push("ja");
  return { ids: sorted(first), missing: [], others: [], first: true };
}

/** True when the page has data for a text component (not for the Page image). R3f and the line "No text for this page yet." use it. */
export const hasAnyText = (has: PageHas): boolean => has.ja || has.agent || has.human || has.v1en || has.v1zh;

/** A group of components that one panel draws. Bilingual pairing makes one group of two components. */
export interface Group {
  ids: ComponentId[];
  pair: boolean;
}

/** Bilingual pairing merges Original text and the first EN panel of the order (15.26.6.5). It has no effect while one of the two is not drawn. */
export function groupsOf(ids: ComponentId[], pair: boolean): Group[] {
  const en = ids.find((id) => EN_IDS.includes(id));
  if (!pair || !en || !ids.includes("ja")) return ids.map((id) => ({ ids: [id], pair: false }));
  const members = ids.filter((id) => id === "ja" || id === en);
  const out: Group[] = [];
  for (const id of ids) {
    if (id === members[0]) out.push({ ids: members, pair: true });
    else if (id !== members[1]) out.push({ ids: [id], pair: false });
  }
  return out;
}

/** The first EN panel of the page (for the phone tab that opens first, 15.26.6.10). */
export const firstEn = (ids: ComponentId[]): ComponentId | undefined => ids.find((id) => EN_IDS.includes(id));

/**
 * The saved order after a panel moves from place `from` to place `to` of the drawn groups (15.26.6.3). Components that the page does not draw keep their places.
 * Move left and Move right use to = from -/+ 1, which swaps with the next drawn panel. A drag of a title bar drops on any place.
 */
export function moveGroups(order: ComponentId[], groups: Group[], from: number, to: number): ComponentId[] {
  if (from === to || from < 0 || to < 0 || from >= groups.length || to >= groups.length) return order;
  const moved = [...groups];
  const [g] = moved.splice(from, 1);
  moved.splice(to, 0, g);
  const drawn = new Set(groups.flatMap((x) => x.ids));
  const next = moved.flatMap((x) => order.filter((id) => x.ids.includes(id)));
  let k = 0;
  return order.map((id) => (drawn.has(id) ? next[k++] : id));
}

/** The checked list after one component is checked or unchecked. The list keeps the saved order. */
export function toggled(list: ComponentId[], id: ComponentId, order: ComponentId[]): ComponentId[] {
  const on = list.includes(id);
  return order.filter((x) => (x === id ? !on : list.includes(x)));
}

// ---------------------------------------------------------------- fact marks (VISION-viewer 15.26.8)

/** The sentence of the pop-up for one fact: "Japanese says: ..." and, for a dropped fact, "The English leaves this out.". */
export function factLine(f: Pick<ReaderFact, "ja" | "kind">): string {
  if (f.kind === "changed") return `Japanese says: ${f.ja}`;
  return `Japanese says: ${/[。！？.!?]$/.test(f.ja) ? f.ja : f.ja + "."} The English leaves this out.`;
}

// ---------------------------------------------------------------- the component list

export interface ListRow {
  id: ComponentId;
  name: string;
  checked: boolean;
  disabled: boolean;
  /** The note of the row, or the reason when the row is grey. */
  note: string;
}

export interface ComponentListModel {
  rows: ListRow[];
  pair: { checked: boolean; disabled: boolean; note: string };
  terms: { checked: boolean; disabled: boolean; note: string };
}

type WorkFacts = Pick<ReaderBookIndex, "images" | "agentPages" | "humanPages" | "v1Pages">;

/** The components that the work has on at least one page (15.26.6.2). EN-original has no data now and stays out of the list (D17). */
export function workHas(index: WorkFacts): Record<ComponentId, boolean> {
  return { image: index.images, ja: true, agent: index.agentPages.length > 0, human: index.humanPages.length > 0, v1en: index.v1Pages.length > 0, v1zh: index.v1Pages.length > 0, enorig: false };
}

const REASON: Record<ComponentId, string> = { image: NO_IMAGE, ja: NO_JA, agent: NO_TEXT, human: NO_HUMAN, v1en: NO_V1, v1zh: NO_V1, enorig: "" };

function noteOf(id: ComponentId, humanBy: ReaderPageData["humanBy"]): string {
  switch (id) {
    case "image":
      return "Books and magazines only.";
    case "ja":
      return "The JA source text.";
    case "agent":
      // Unit VW119 (Q-A 3:103.4): the name of the row is "AI translation" now, so the note does not repeat it.
      return "";
    case "human":
      return humanBy === "admin" ? "chosen by an admin" : "from kendojidai.com";
    case "v1en":
      return LABEL_V1;
    case "v1zh":
      return "for display testing purpose ONLY";
    default:
      return "";
  }
}

/**
 * The rows of the list for the page on the screen. `has` is null while the data of the page is not loaded (Scroll view): no row is grey then, except by the view rule.
 * A grey row keeps its saved check state. A checked row that is the only drawn panel cannot be unchecked ("Keep at least one panel", D9).
 */
export function componentRows(index: WorkFacts, s: EffectiveSettings, has: PageHas | null, drawn: Drawn, humanBy: ReaderPageData["humanBy"], imageOk: boolean, kind: WorkKind): ComponentListModel {
  const checkedList = s.shown?.[kind] ?? drawn.ids;
  const work = workHas(index);
  const rows: ListRow[] = s.components
    .filter((id) => work[id])
    .map((id) => {
      const checked = checkedList.includes(id);
      let note = noteOf(id, humanBy);
      let disabled = false;
      if (id === "image" && !imageOk) {
        disabled = true;
        note = PAGE_VIEW_ONLY;
      } else if (has && !has[id]) {
        disabled = true;
        note = REASON[id];
      } else if (checked && drawn.ids.length === 1 && drawn.ids[0] === id) {
        disabled = true;
        note = KEEP_ONE;
      }
      return { id, name: COMPONENT_NAMES[id], checked, disabled, note };
    });
  const pairOk = drawn.ids.includes("ja") && firstEn(drawn.ids) !== undefined;
  return {
    rows,
    pair: { checked: s.pair, disabled: !pairOk, note: pairOk ? "" : PAIR_NEEDS },
    terms: { checked: s.terms, disabled: has ? !has.terms : false, note: has && !has.terms ? NO_TERMS : "" },
  };
}

/**
 * The note line above the panels when a checked component has no data on the page (D16, 15.26.6.8). Empty when nothing is missing.
 * It names only components that the work has on some page (`work`, the rows of the list). The checked list is one list for all works of a kind,
 * so a reader who checked Agent text for 18d4ac29 does not see "Not on this page: Agent text." on each of the 310 other articles (unit default).
 */
export function missingNote(drawn: Drawn, work: Record<ComponentId, boolean>): string {
  const missing = drawn.missing.filter((id) => work[id]);
  if (missing.length === 0 || drawn.ids.length === 0) return "";
  const names = (ids: ComponentId[]) => ids.map((id) => COMPONENT_NAMES[id]).join(", ");
  return `Not on this page: ${names(missing)}.` + (drawn.others.length > 0 ? ` On this page, in the Components list: ${names(drawn.others)}.` : "");
}
