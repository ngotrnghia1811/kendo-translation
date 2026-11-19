"use client";
import { memo, useState } from "react";
import type { ChapterHead, HtvPageTag } from "@/lib/htv-types";
import { INDEX_WIDTH } from "@/lib/htv-settings";
import { SIZE_LIMITS, type SizeLimits } from "@/lib/panel-size";
import { parsePageNumber } from "@/lib/htv-format";
import { CollapseButton, CollapsedBar, DragHandle } from "./HtvPanelFrame";
import { PaneCog, usePaneSetting } from "./PaneSettings";
import { CornerHandle, useStoredSize } from "./PanelResize";
import { MoveButtons, grabClass, type BarApi } from "./PanelDragBar";

// Left index of the book screen (unit UXC step D, round 59 answer 4, Q-A 2026-10-28 l222): "Left index with Go to page".
// A column lists the pages with their tags, and the box "Go to page" jumps to a page. Month headings group the pages of a magazine year.
// Unit UXC2 (round 61 answer 4, Q-A l264): the header holds the name, one cog, and a collapse button. A collapsed index is a bar of about 28 px.
// The width changes by drag on the right edge. The open state and the width stay in the account. In the page view a click on a page opens that page.
// Unit VW115 (Q-A 3:94.2 row 4): a corner handle at the bottom right changes the width (160 to 400 px, in the account as before) and the height.
// [unit default VW115] The height stays in this browser (localStorage key vw115:size:translate:index). A double click on the corner sets the old width (192 px) and height again.
// Unit VW117 (Q-A 3:95.2 and 3:96.6 rows 4 and 5): the panel moves in the row of the book screen. The header is its title bar: a drag of it moves the panel, ◀ ▶ do the same by keyboard.
// The width handle and the corner handle sit on the side that faces the pages (prop edge), so they stay at the border that they change after a move. The old place is the right side.

interface Item {
  n: number;
  name: string;
}

/** The limits of a corner drag of the book index: the width range of the edge handle and the general height range. */
const CORNER_LIMITS: SizeLimits = { w: INDEX_WIDTH, h: SIZE_LIMITS.h };

const IndexLink = memo(function IndexLink({ item, tag, current, onPick }: { item: Item; tag: HtvPageTag | undefined; current: boolean; onPick: ((n: number) => void) | null }) {
  return (
    <a
      href={`#${item.name}`}
      onClick={
        onPick
          ? (e) => {
              if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              onPick(item.n);
            }
          : undefined
      }
      data-index-page={item.name}
      aria-current={current ? "location" : undefined}
      className={"flex items-center justify-between rounded px-1.5 py-0.5 text-sm hover:bg-stone-100 " + (current ? "bg-stone-200 font-semibold" : "")}
    >
      <span className="font-mono text-xs">{item.name}</span>
      {tag ? (
        <span className={"text-xs " + (tag.verdict === "PASS" ? "text-green-800" : "text-red-800")} data-index-tag={tag.verdict}>
          {tag.verdict} {tag.score === null ? "" : tag.score.toFixed(1)}
        </span>
      ) : null}
    </a>
  );
});

export default function HtvIndex({
  items,
  tags,
  chapters,
  current,
  pageCount,
  digits,
  onGo,
  onPick,
  open,
  width,
  onOpen,
  onCollapse,
  onWidth,
  reorder = null,
  edge = "right",
}: {
  items: Item[];
  tags: Record<number, HtvPageTag>;
  chapters: ChapterHead[];
  current: number;
  pageCount: number;
  digits: number;
  /** Jump to a page number. */
  onGo: (n: number) => void;
  /** Page view: a click on a page or a month heading opens that page. Scroll view: null (the link scrolls to the section). */
  onPick: ((n: number) => void) | null;
  open: boolean;
  width: number;
  onOpen: () => void;
  onCollapse: () => void;
  onWidth: (w: number) => void;
  /** Unit VW117 (Q-A 3:96.6 rows 4 and 5): the drag and the ◀ ▶ buttons of the title bar (components/PanelDragBar.tsx). Null: the bar has no move. */
  reorder?: BarApi | null;
  /** Unit VW117: the side of the panel that faces the pages panel. The width handle sits there, and the corner handle too. Old place: "right" (the index stands left of the pages). */
  edge?: "left" | "right";
}) {
  const pane = usePaneSetting("list");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const stored = useStoredSize("translate", "index");
  const h = stored.size.h;
  // The height comes in through the style of the pane, so the class list and the style of the nav keep the form that scripts/vw110-test.mjs reads.
  // The rule [data-index][data-sized] in app/globals.css uses it from the lg width on.
  const list = h === undefined ? pane : { ...pane, style: { ...pane.style, ["--panel-h" as string]: `${h}px` } as React.CSSProperties };
  const starts = new Map<number, ChapterHead>();
  for (const c of chapters) if (c.pageStart >= 1 && c.pageStart <= pageCount && !starts.has(c.pageStart)) starts.set(c.pageStart, c);

  function go() {
    const n = parsePageNumber(value, pageCount);
    if (n === null) {
      setNote(`No such page. This book has pages 1 to ${pageCount}.`);
      return;
    }
    setNote("");
    onGo(n);
  }

  // Unit VW110 (Q-A 3:74.5 part 2): below the lg width (1024 px) the book screen stacks its columns (components/HtvBook.tsx). The bar sits in a wrapper that has no box
  // from lg on. Below lg the index is as wide as the screen (min-w-full max-w-full beat the inline width), is not sticky, and scrolls inside a box of 18 rem.
  if (!open)
    return (
      <div className="lg:contents">
        <CollapsedBar id="index" name="Book index" arrow={edge === "right" ? "▶" : "◀"} onOpen={onOpen} />
      </div>
    );

  return (
    <nav
      aria-label="Pages of the book"
      className="flex max-h-72 min-w-full max-w-full shrink-0 flex-col rounded border border-line bg-white/60 max-lg:[&>[role=separator]]:hidden lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:min-w-0 lg:max-w-none"
      style={{ width, ...list.style }}
      data-sized={h !== undefined ? "" : undefined}
      data-index
      data-index-width={width}
      data-reorder-item="index"
    >
      <DragHandle side={edge} width={width} min={INDEX_WIDTH.min} max={INDEX_WIDTH.max} onWidth={onWidth} label="Drag to change the width of the book index" attr="data-index-handle" />
      {/* Unit VW117 (Q-A 3:96.6 rows 1 and 5): the header is the title bar. A drag of the name moves the panel, and ◀ ▶ do the same by keyboard (from the lg width on). */}
      <div
        className={`flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-line/60 px-2 py-1.5 ${grabClass("lg")}`}
        style={{ fontSize: "14px", fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
        data-index-header
        data-panel-title="index"
        title={reorder && reorder.count > 1 ? "Drag the title bar to move the panel" : undefined}
        {...reorder?.dragProps}
      >
        <span className="font-semibold">Book index</span>
        <span className="flex items-center gap-1.5">
          <MoveButtons bar={reorder} name="book index panel" from="lg" />
          <PaneCog id="list" align="left" />
          <CollapseButton id="index" name="Book index" arrow={edge === "right" ? "◀" : "▶"} onCollapse={onCollapse} />
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2 pr-3">
      <form
        className="mb-2"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <label className="block text-xs text-muted" htmlFor="go-to-page">
          Go to page
        </label>
        <div className="mt-0.5 flex gap-1">
          <input
            id="go-to-page"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`1 to ${pageCount}`}
            inputMode="numeric"
            className="w-full min-w-0 rounded border border-line bg-white px-1.5 py-0.5 text-sm placeholder:text-muted"
          />
          <button type="submit" className="rounded border border-line px-2 text-sm">
            Go
          </button>
        </div>
        {note ? (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {note}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted">Page IDs have {digits} digits, for example p{String(1).padStart(digits, "0")}.</p>
      </form>
      <ul>
        {items.map((it) => {
          const ch = starts.get(it.n);
          return (
            <li key={it.n}>
              {ch ? (
                <a
                  href={`#chapter-${it.n}`}
                  onClick={
                    onPick
                      ? (e) => {
                          e.preventDefault();
                          onPick(it.n);
                        }
                      : undefined
                  }
                  className="mt-2 block border-t border-line pt-1 text-xs font-semibold uppercase tracking-wide text-muted"
                  data-index-chapter={it.n}
                >
                  {ch.titleEn || ch.chapter}
                </a>
              ) : null}
              <IndexLink item={it} tag={tags[it.n]} current={current === it.n} onPick={onPick} />
            </li>
          );
        })}
      </ul>
      </div>
      <CornerHandle
        corner={edge}
        limits={CORNER_LIMITS}
        label="Drag to change the width and the height of the book index"
        attr="data-index-corner"
        onSize={(p) => {
          if (p.w !== undefined) onWidth(p.w);
          if (p.h !== undefined) stored.set({ h: p.h });
        }}
        onReset={() => {
          onWidth(INDEX_WIDTH.default);
          stored.set({ h: null });
        }}
      />
    </nav>
  );
}
