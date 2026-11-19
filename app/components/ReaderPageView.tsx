"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkedText, type PickedTerm } from "./HtvMarkedText";
import { ImagePane } from "./ReaderImage";
import ReaderPanels, { type PanelSpec } from "./ReaderPanels";
import { FONT_STACKS, type ComponentId } from "@/lib/htv-settings";
import {
  COMPONENT_NAMES,
  factLine,
  firstEn,
  groupsOf,
  hasAnyText,
  missingNote,
  pageHas,
  pageRows,
  resolveLayout,
  rowsOf,
  type EffectiveSettings,
  type Group,
  type PageRow,
} from "@/lib/reader-layout";
import { LABEL_AGENT_UNCHECKED, LABEL_V1_JA, NO_PAGE_TEXT, type ReaderFact, type ReaderMark, type ReaderPageData } from "@/lib/reader-types";
import type { TermMark } from "@/lib/htv-types";

/*
 * The text of one page on the reader pages (unit RC1, round 63). Unit RT73b (round 73c answer 4, VISION-viewer 15.26): the page draws one panel for each
 * checked component that has data, in the saved order (ReaderPanels). The research layer never reaches this component: the data has no verdict, no score,
 * no QA, no TL_3 panel, and no reasoning.
 *   Page image      the scan of the printed page (books and magazine years)
 *   Original text   the JA source text (the run lines, the rows of a web article, or the v1 JA lines)
 *   Agent text      the ED_3 text of the shown run, with the AI label
 *   Human version   the kendojidai.com text or the version that an admin chose, with the fact marks (15.26.8), no AI label
 *   v1 placeholders the v1 EN and ZH lines of the browser Gemini agent of v1, for display testing only (15.26.9)
 * Bilingual pairing draws Original text and the first EN panel as one panel, JA beside EN (15.26.6.5).
 * A page with no text at all shows the line "No text for this page yet." (15.26.6.12).
 */

/** What the book screen does when the reader changes the layout on a page. */
export interface LayoutActions {
  /** Move the panel group `from` to the place `to` (Move left, Move right, or a drag of the title bar). */
  move: (groups: Group[], from: number, to: number) => void;
  /** Hide a panel: it unchecks the component, or Bilingual pairing for the merged panel. */
  hide: (group: Group, drawn: ComponentId[]) => void;
  /** Resize: the width goes under the first component of the panel. */
  width: (id: ComponentId, w: number) => void;
  /** Unit VW115: set the old width of the panel again (a double click on its corner). The width key of the component leaves the account. */
  widthReset: (id: ComponentId) => void;
}

/** A reader mark has no EN form check. The term pop-up reads the fields result and detail, so they are null here. */
function asTermMarks(marks: ReaderMark[]): TermMark[] {
  return marks.map((m) => ({ ...m, result: null, detail: null }));
}

function Tag({ text }: { text: string }) {
  if (!text) return null;
  return (
    <span className="ml-2 rounded bg-stone-200 px-1.5 py-0.5 align-middle text-[11px] font-medium text-stone-700" data-row-tag>
      {text}
    </span>
  );
}

// ---------------------------------------------------------------- fact marks (VISION-viewer 15.26.8)

interface FactOpen {
  left: number;
  top: number;
  facts: Pick<ReaderFact, "ja" | "kind">[];
}

function FactPopup({ open, onClose }: { open: FactOpen; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest("[data-fact-popup]") && !t?.closest("[data-fact], [data-fact-tag]")) onClose();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", down);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);
  const width = 320;
  const left = Math.max(8, Math.min(open.left, window.innerWidth - width - 16));
  return (
    <div data-fact-popup role="dialog" aria-label="Fact mark" style={{ left, top: open.top + 6, width }} className="fixed z-50 rounded border border-line bg-white p-3 text-sm shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          {open.facts.map((f, i) => (
            <p key={i} lang="ja" className={i > 0 ? "mt-1" : ""} data-fact-line>
              {factLine(f)}
            </p>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-foreground">
          ×
        </button>
      </div>
    </div>
  );
}

function openFrom(e: React.MouseEvent<HTMLElement>, facts: FactOpen["facts"], set: (o: FactOpen) => void) {
  const r = e.currentTarget.getBoundingClientRect();
  set({ left: r.left, top: r.bottom, facts });
}

/** The English text of a Human row. A fact on a phrase gets a dotted line under the words. A fact on the whole sentence gets a small tag after the sentence. */
function FactText({ row, terms, onPick, onFact }: { row: PageRow; terms: boolean; onPick: (p: PickedTerm) => void; onFact: (o: FactOpen) => void }) {
  const cps = Array.from(row.text);
  // A fact whose words cannot be placed (no range, a range outside the text, or an overlap) goes to the tag after the sentence, so no fact is lost.
  const phrase: ReaderFact[] = [];
  const whole: ReaderFact[] = [];
  let edge = 0;
  for (const f of [...row.facts].sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity))) {
    if (f.start !== null && f.end !== null && f.start >= edge && f.end > f.start && f.end <= cps.length) {
      phrase.push(f);
      edge = f.end;
    } else whole.push(f);
  }
  const out: React.ReactNode[] = [];
  let pos = 0;
  for (const f of phrase) {
    const start = f.start as number;
    const end = f.end as number;
    if (start > pos) out.push(cps.slice(pos, start).join(""));
    out.push(
      <button
        key={`${start}-${end}`}
        type="button"
        data-fact={f.kind}
        title="Show what the Japanese says"
        onClick={(e) => openFrom(e, [f], onFact)}
        className="underline decoration-dotted decoration-amber-700 underline-offset-2 hover:bg-amber-100"
      >
        {cps.slice(start, end).join("")}
      </button>,
    );
    pos = end;
  }
  if (pos < cps.length && out.length > 0) out.push(cps.slice(pos).join(""));
  return (
    <>
      {out.length > 0 ? out : <MarkedText text={row.text} marks={terms ? asTermMarks(row.marks) : []} onPick={onPick} />}
      {(["changed", "dropped"] as const).map((k) => {
        const list = whole.filter((f) => f.kind === k);
        return list.length > 0 ? (
          <button
            key={k}
            type="button"
            data-fact-tag={k}
            title="Show what the Japanese says"
            onClick={(e) => openFrom(e, list, onFact)}
            className="ml-2 rounded bg-stone-200 px-1.5 py-0.5 align-middle text-[11px] font-medium text-stone-700 underline decoration-dotted"
          >
            {`fact ${k}`}
          </button>
        ) : null;
      })}
    </>
  );
}

// ---------------------------------------------------------------- bodies of the panels

interface Merged {
  key: string;
  order: number;
  part: "lines" | "block_title";
  ja: string;
  jaMarks: ReaderMark[];
  en: PageRow | null;
}

/**
 * The rows of the merged panel of Bilingual pairing. Rows of one family (same keys) merge by key and keep the order of the page.
 * Rows of another family (Original text of an agent run beside the Human version of the same page, which have different keys) do not merge:
 * the panel then uses the rows of the EN panel with the Japanese text that they carry (D13).
 */
function mergePair(ja: PageRow[], en: PageRow[]): Merged[] {
  const enKeys = new Set(en.map((r) => r.key));
  const one = (e: PageRow, j?: PageRow): Merged => ({ key: e.key, order: e.order, part: e.part, ja: j?.text ?? e.ja, jaMarks: j?.marks ?? e.jaMarks, en: e });
  const jaByKey = new Map(ja.map((r) => [r.key, r]));
  if (!ja.some((r) => enKeys.has(r.key))) return en.map((e) => one(e));
  const rows = new Map<string, Merged>();
  for (const j of ja) rows.set(j.key, { key: j.key, order: j.order, part: j.part, ja: j.text, jaMarks: j.marks, en: null });
  for (const e of en) rows.set(e.key, one(e, jaByKey.get(e.key)));
  return [...rows.values()].sort((a, b) => a.order - b.order);
}

export default function ReaderPageView({
  data,
  s,
  kind,
  images,
  work,
  imageOk,
  band,
  onPick,
  focus,
  actions,
}: {
  data: ReaderPageData;
  s: EffectiveSettings;
  kind: "book" | "article";
  /** True for a work with page images. */
  images: boolean;
  /** The components that the work has on some page. The note line names only these (D16). */
  work: Record<ComponentId, boolean>;
  /** False in Scroll view and in Focus mode: the Page image does not draw there. */
  imageOk: boolean;
  /** True in Scroll view and in Focus mode: the panels have their natural height. */
  band: boolean;
  onPick: (p: PickedTerm) => void;
  focus: boolean;
  actions: LayoutActions;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [fact, setFact] = useState<FactOpen | null>(null);
  const closeFact = useCallback(() => setFact(null), []);
  const tap = useCallback((key: string) => setActive((a) => (a === key ? null : key)), []);

  const rows = useMemo(() => pageRows(data), [data]);
  const has = pageHas(rows, images);
  const drawn = resolveLayout(has, s.components, s.shown?.[kind], kind, imageOk);
  const groups = groupsOf(drawn.ids, s.pair);

  const enStyle = { fontFamily: FONT_STACKS[s.fontEn], fontSize: `${s.size}px`, lineHeight: s.line };
  const jaStyle = { fontFamily: FONT_STACKS[s.fontJa], fontSize: `${s.size}px`, lineHeight: s.line };
  const rowClass = (key: string) => "border-l-4 pl-2 " + (key === active ? "border-amber-700 bg-amber-100" : "border-transparent");
  const rowAttrs = (r: { key: string; order: number; part: string }) => ({ "data-row": r.key, "data-order": r.order, "data-row-kind": r.part === "block_title" ? "title" : "text", ...(r.key === active ? { "data-pair-active": "" } : {}) });

  const jaNode = (text: string, marks: ReaderMark[], title: boolean) => (
    <p lang="ja" style={jaStyle} className={title ? "font-semibold" : ""} data-ja>
      <MarkedText text={text} marks={s.terms ? asTermMarks(marks) : []} onPick={onPick} />
    </p>
  );
  const enNode = (r: PageRow, title: boolean) => (
    <p lang="en" style={enStyle} className={title ? "font-semibold" : ""} data-en>
      {r.dropped ? (
        <button
          type="button"
          data-fact-tag="dropped"
          title="Show what the Japanese says"
          onClick={(e) => openFrom(e, [{ ja: r.ja, kind: "dropped" }], setFact)}
          className="rounded bg-stone-200 px-1.5 py-0.5 align-middle text-[11px] font-medium text-stone-700 underline decoration-dotted"
        >
          fact dropped
        </button>
      ) : r.text ? (
        <>
          <FactText row={r} terms={s.terms} onPick={onPick} onFact={setFact} />
          <Tag text={focus ? "" : r.tag} />
          {/* Unit VW90 (Q-A 3:1.6): the small note of a sentence that crosses a page end. It shows in Focus mode too, because it explains why the Japanese text is shorter. */}
          {r.note ? (
            <span className="mt-1 block text-sm text-muted" data-cross-note>
              {r.note}
            </span>
          ) : null}
        </>
      ) : (
        <span className="text-muted">No English text for this row.</span>
      )}
    </p>
  );

  /** The page line at the top of a text panel (VISION-viewer 15.26.7). The Human version and the v1 lines carry no AI label. */
  const pageLine = (id: ComponentId) => {
    const line =
      id === "ja" ? (rows.jaFromV1 ? { text: LABEL_V1_JA, kind: "v1" } : null) : id === "agent" ? { text: data.label.agent || LABEL_AGENT_UNCHECKED, kind: "agent" } : id === "human" ? { text: data.label.human, kind: "human" } : id === "v1en" || id === "v1zh" ? { text: data.label.v1, kind: "v1" } : null;
    return line && !focus ? (
      <p className="mb-2 text-sm text-muted" data-ai-label data-label-kind={line.kind}>
        {line.text}
      </p>
    ) : null;
  };

  const build = (g: Group): PanelSpec => {
    if (g.ids[0] === "image") {
      return { key: "image", ids: g.ids, title: COMPONENT_NAMES.image, body: <ImagePane pageId={data.pageId} n={data.n} /> };
    }
    const wrap = (width: string, children: React.ReactNode) => (
      <div className="mx-auto space-y-5" style={{ maxWidth: width }}>
        {children}
      </div>
    );
    const narrow = focus ? "72ch" : s.width === "wide" ? "96ch" : "72ch";
    if (g.pair) {
      const enId = g.ids.find((x) => x !== "ja") as ComponentId;
      const merged = mergePair(rows.ja, rowsOf(rows, enId));
      return {
        key: "pair",
        ids: g.ids,
        title: `${COMPONENT_NAMES.ja} and ${COMPONENT_NAMES[enId]}`,
        body: wrap(
          focus ? "100ch" : s.width === "wide" ? "120ch" : "100ch",
          <>
            {pageLine(enId)}
            {merged.map((r) => (
              <div key={r.key} {...rowAttrs(r)} className={rowClass(r.key)}>
                <div className="grid gap-2 md:grid-cols-2 md:gap-6" data-pair>
                  <div className="border-l-4 border-red-700 pl-3">{r.ja ? jaNode(r.ja, r.jaMarks, r.part === "block_title") : null}</div>
                  <div className="border-l-4 border-blue-800 pl-3">{r.en ? enNode(r.en, r.part === "block_title") : null}</div>
                </div>
              </div>
            ))}
          </>,
        ),
      };
    }
    const id = g.ids[0];
    return {
      key: id,
      ids: g.ids,
      title: COMPONENT_NAMES[id],
      body: wrap(
        narrow,
        <>
          {pageLine(id)}
          {rowsOf(rows, id).map((r) => (
            <div key={r.key} {...rowAttrs(r)} className={rowClass(r.key)}>
              {id === "ja" ? jaNode(r.text, r.marks, r.part === "block_title") : enNode(r, r.part === "block_title")}
            </div>
          ))}
        </>,
      ),
    };
  };
  const panels = groups.map(build);
  const en = firstEn(drawn.ids);
  const startKey = (panels.find((p) => en !== undefined && p.ids.includes(en)) ?? panels[0])?.key ?? "";
  const note = missingNote(drawn, work);
  const jaDrawn = drawn.ids.includes("ja");
  const enDrawn = en !== undefined;
  const anyText = hasAnyText(has);

  return (
    <section id={`p${String(data.n).padStart(3, "0")}`} data-section={data.pageId} data-page-n={data.n} className="mx-auto w-full scroll-mt-28">
      {focus ? null : (
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-1">
          <h2 className="text-base font-semibold" data-page-name>
            {data.name}
          </h2>
        </header>
      )}
      {note && !focus ? (
        <p className="mb-2 text-xs text-muted" data-page-note>
          {note}
        </p>
      ) : null}
      {panels.length > 0 ? (
        <ReaderPanels
          panels={panels}
          widths={s.widths}
          focus={focus}
          band={band}
          activeKey={active}
          startTab={startKey}
          onTap={tap}
          onMove={(from, to) => actions.move(groups, from, to)}
          onHide={(spec) => actions.hide(groups.find((g) => (g.pair ? "pair" : g.ids[0]) === spec.key) as Group, drawn.ids)}
          onWidth={(spec, w) => actions.width(spec.ids[0], w)}
          onWidthReset={(spec) => actions.widthReset(spec.ids[0])}
        />
      ) : null}
      {!anyText ? (
        <p className="mt-3 rounded border border-line p-3 text-sm text-muted" data-no-text>
          {NO_PAGE_TEXT}
          {drawn.ids.includes("image") ? " Only the page image exists." : ""}
        </p>
      ) : null}
      {data.extras.length > 0 && (jaDrawn || enDrawn) ? (
        <aside className="mt-5 border-t border-line pt-3" data-extras aria-label="Photo captions and running head">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Photo captions</h3>
          <ul className="space-y-2">
            {data.extras.map((x) => (
              <li key={x.id} data-extra={x.id} className="text-[0.9em]">
                {jaDrawn && x.ja ? (
                  <p lang="ja" style={{ ...jaStyle, fontSize: `${s.size * 0.9}px` }}>
                    {x.ja}
                  </p>
                ) : null}
                {enDrawn ? (
                  <p lang="en" style={{ ...enStyle, fontSize: `${s.size * 0.9}px` }}>
                    {x.kind === "running_head" ? <span className="mr-1 text-xs uppercase text-muted">Running head</span> : null}
                    {x.en}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
      {fact ? <FactPopup open={fact} onClose={closeFact} /> : null}
    </section>
  );
}
