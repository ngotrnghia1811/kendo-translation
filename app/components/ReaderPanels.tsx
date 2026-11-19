"use client";
import { useEffect, useRef, useState } from "react";
import { DragHandle } from "./HtvPanelFrame";
import { CornerHandle, useStoredSize } from "./PanelResize";
import { PanelTitleBar, useReorder, type BarApi } from "./PanelDragBar";
import { PANEL_WIDTH, type ComponentId } from "@/lib/htv-settings";
import { SIZE_LIMITS, type SizeLimits } from "@/lib/panel-size";

/*
 * The row of panels on the reader pages (unit RT73b, round 73c answer 4, round 73d answers 5 and 6; VISION-viewer 15.26.6).
 * A panel has a title bar (name, Move left, Move right, Hide) and a body. The caller builds the bodies. This component does the layout:
 *   - wide screen: the panels side by side. The title bar moves a panel by its buttons or by a drag. A handle on the right edge resizes it (DragHandle, 280 to 720 px).
 *   - phone: one tab for each panel, no title bar, no handle, no move (15.26.6.10)
 *   - Focus mode: no title bars and no handles, equal widths (15.26.6.11)
 *   - band (Scroll view): the bodies have their natural height, so there is no scroll together in a band (unit default)
 * A tap on a row marks the pair in the panels that share the row key. The panels scroll so that the pair is in view, and a scroll in one panel moves the others (15.26.6.6).
 *
 * Unit VW115 (Q-A 3:93.5 and 3:94.2 row 4): each panel also has a handle on its bottom right corner (CornerHandle in components/PanelResize.tsx).
 *   - Width: the same width as the handle on the right edge (280 to 720 px), kept in the account as before. The last panel takes the rest of the row, so it has no width.
 *   - Height: all panels of a row share one height, because they stand side by side in one row. The corner of any panel changes the height of the row (120 to 20000 px).
 *   - [unit default VW115] The height stays in this browser (localStorage key vw115:size:read:row), not in the account, so the account needs no new key.
 *   - A double click on a corner sets the old width of that panel and the old height again.
 *   - Scroll view (band) and Focus mode have no corner: the bodies have their natural height there.
 *
 * Unit VW117 (Q-A 3:95.2 and 3:96.6 rows 1, 2 and 5), owner words: "Also I should be able to drag each panel around to reorder them, and the should snap into place when I do so"
 *   - The drag of the title bar is a pointer drag now (components/PanelDragBar.tsx), shared with the other 2 page views. A drop marker shows the place and the panel slides into it.
 *   - The buttons ◀ ▶ keep their names and their labels. After a move the focus stays on a button of the moved panel.
 *   - The order stays in the account (key components) as before. "Reset layout" in the component list stays as it was.
 */
/** The limits of a corner drag on the Reader dashboard page view: the width range of the old handle and the general height range. */
const CORNER_LIMITS: SizeLimits = { w: PANEL_WIDTH, h: SIZE_LIMITS.h };

export interface PanelSpec {
  /** Key of the panel: the component ID, or "pair" for the merged panel of Bilingual pairing. */
  key: string;
  /** The components that the panel draws. */
  ids: ComponentId[];
  title: string;
  body: React.ReactNode;
}

const BTN = "rounded border border-line bg-white px-1.5 text-sm leading-5 hover:bg-stone-100";

function PanelBox({
  spec,
  bar,
  count,
  saved,
  last,
  focus,
  shownOnPhone,
  onHide,
  onWidth,
  corner,
  onSize,
  onSizeReset,
}: {
  spec: PanelSpec;
  /** Unit VW117: the drag and the ◀ ▶ buttons of the title bar (components/PanelDragBar.tsx). */
  bar: BarApi | null;
  count: number;
  saved: number | undefined;
  last: boolean;
  focus: boolean;
  shownOnPhone: boolean;
  onHide: (spec: PanelSpec) => void;
  onWidth: (spec: PanelSpec, w: number) => void;
  /** True when the panel has a corner handle (not in Focus mode, not in a band). */
  corner: boolean;
  /** The corner changes the width of this panel or the height of the row. */
  onSize: (spec: PanelSpec, patch: { w?: number; h?: number }) => void;
  onSizeReset: (spec: PanelSpec) => void;
}) {
  const box = useRef<HTMLElement>(null);
  const [measured, setMeasured] = useState<number | null>(null);
  // The handle needs the width in px at the start of a drag. A panel without a saved width has the width that the row gives it.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setMeasured(Math.round(el.getBoundingClientRect().width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fixed = saved !== undefined && !last && !focus;
  const width = saved ?? measured ?? 400;
  const cls = ["relative flex min-w-0 flex-col md:flex", shownOnPhone ? "" : "hidden", fixed ? "md:w-[var(--panel-w)] md:flex-none" : focus ? "md:flex-1 md:basis-0" : "md:min-w-[280px] md:flex-1 md:basis-0"].join(" ");
  const style = fixed ? ({ "--panel-w": `${saved}px` } as React.CSSProperties) : undefined;
  const only = count === 1;
  return (
    <section ref={box} className={cls} style={style} data-panel={spec.key} data-panel-width={fixed ? saved : undefined} aria-label={spec.title} data-reorder-item={spec.key}>
      {focus ? null : (
        // Unit VW117 (Q-A 3:95.2, 3:96.6 rows 1, 2 and 5): the title bar moves the panel by a pointer drag (a drop marker shows the place, the panel slides into it) or by the
        // buttons ◀ ▶. The old HTML5 drag and drop is gone (components/PanelDragBar.tsx). The Hide button stays as it was.
        <PanelTitleBar id={spec.key} bar={bar} title={spec.title} name={`${spec.title} panel`} from="md">
          {only ? null : (
            <button type="button" className={BTN} aria-label={`Hide the ${spec.title} panel`} data-panel-hide onClick={() => onHide(spec)}>
              <span aria-hidden="true">×</span>
            </button>
          )}
        </PanelTitleBar>
      )}
      <div className="relative min-h-0 px-3 py-2 md:flex-1 md:overflow-auto" data-panel-body={spec.key}>
        {spec.body}
      </div>
      {!last && !focus ? (
        <div className="hidden md:block">
          <DragHandle side="right" width={width} min={PANEL_WIDTH.min} max={PANEL_WIDTH.max} onWidth={(w) => onWidth(spec, w)} label={`Drag to change the width of the ${spec.title} panel`} attr="data-reader-handle" />
        </div>
      ) : null}
      {corner ? (
        <CornerHandle
          axes={last ? "height" : "both"}
          limits={CORNER_LIMITS}
          label={`Drag to change the ${last ? "height" : "width and the height"} of the ${spec.title} panel`}
          attr="data-reader-corner"
          onSize={(patch) => onSize(spec, patch)}
          onReset={() => onSizeReset(spec)}
          className="max-md:hidden"
        />
      ) : null}
    </section>
  );
}

const nearly = (a: number, b: number) => Math.abs(a - b) < 2;

export default function ReaderPanels({
  panels,
  widths,
  focus,
  band,
  activeKey,
  startTab,
  onTap,
  onMove,
  onHide,
  onWidth,
  onWidthReset,
}: {
  panels: PanelSpec[];
  widths: Partial<Record<ComponentId, number>>;
  focus: boolean;
  band: boolean;
  /** The row key that the reader tapped, or null. */
  activeKey: string | null;
  /** Key of the panel whose tab opens first on a phone. */
  startTab: string;
  /** A tap on the row with this key. A second tap on the marked row clears the mark. */
  onTap: (key: string) => void;
  onMove: (from: number, to: number) => void;
  onHide: (spec: PanelSpec) => void;
  onWidth: (spec: PanelSpec, w: number) => void;
  /** Unit VW115: a double click on a corner sets the old width of the panel again. */
  onWidthReset?: (spec: PanelSpec) => void;
}) {
  const [tab, setTab] = useState(startTab);
  // Unit VW115: the height of the row, kept in this browser.
  const rowSize = useStoredSize("read", "row");
  const rowH = !band ? rowSize.size.h : undefined;
  const current = panels.some((p) => p.key === tab) ? tab : (panels[0]?.key ?? "");
  // Unit VW117 (Q-A 3:96.6 rows 1, 2 and 5): the drag with a drop marker, the slide, and the ◀ ▶ buttons. The order stays in the account as before (onMove).
  // The panels move from the md width (768 px) on. Below it the panels are tabs and do not move.
  const reorder = useReorder({ ids: panels.map((p) => p.key), onMove, minWidth: 768 });
  const holder = useRef<HTMLDivElement>(null);
  // A panel that the code scrolls on purpose fires a scroll event. The map says "ignore it until this time", so the panels do not drive each other in a loop.
  const quiet = useRef(new WeakMap<Element, number>());

  const bodies = () => [...(holder.current?.querySelectorAll<HTMLElement>("[data-panel-body]") ?? [])];
  const rowsOf = (body: HTMLElement) => [...body.querySelectorAll<HTMLElement>("[data-row]")];
  const scrollBody = (body: HTMLElement, top: number) => {
    quiet.current.set(body, performance.now() + 150);
    body.scrollTop = Math.max(0, top);
  };

  // A tap marks the pair: each panel that holds the row scrolls so that the row is in view (15.26.6.6, D12).
  useEffect(() => {
    if (!activeKey || band) return;
    const wide = window.matchMedia("(min-width: 768px)").matches;
    for (const body of bodies()) {
      const row = rowsOf(body).find((r) => r.dataset.row === activeKey);
      if (!row) continue;
      if (!wide) {
        if (body.offsetParent) row.scrollIntoView({ block: "nearest" });
        continue;
      }
      const top = row.offsetTop;
      const inView = top >= body.scrollTop && top + row.offsetHeight <= body.scrollTop + body.clientHeight;
      if (!inView) scrollBody(body, top - 12);
    }
    // The tab (current) is in the list: a switch to the tab of a paired panel scrolls that panel to the marked row.
  }, [activeKey, band, current]);

  // Esc clears the mark. The capture listener stops the key, so Esc does not also leave Focus mode in the same press.
  useEffect(() => {
    if (!activeKey) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onTap(activeKey);
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [activeKey, onTap]);

  // A scroll in one panel moves each panel that shares row keys with it, to the row at the same place. A panel without the row moves to the row before it.
  function onScroll(e: React.UIEvent) {
    const src = e.target;
    if (band || !(src instanceof HTMLElement) || !src.hasAttribute("data-panel-body")) return;
    if ((quiet.current.get(src) ?? 0) > performance.now()) return;
    const srcRows = rowsOf(src);
    const top = srcRows.find((r) => r.offsetTop + r.offsetHeight > src.scrollTop + 1) ?? srcRows.at(-1);
    if (!top) return;
    const keys = new Set(srcRows.map((r) => r.dataset.row));
    const order = Number(top.dataset.order);
    for (const body of bodies()) {
      if (body === src) continue;
      const rows = rowsOf(body);
      if (!rows.some((r) => keys.has(r.dataset.row))) continue;
      const exact = rows.find((r) => r.dataset.row === top.dataset.row);
      const target = exact ?? rows.filter((r) => Number(r.dataset.order) <= order).at(-1) ?? rows[0];
      const want = target.offsetTop + (exact ? src.scrollTop - top.offsetTop : 0);
      if (!nearly(body.scrollTop, want)) scrollBody(body, want);
    }
  }

  function onClick(e: React.MouseEvent) {
    const t = e.target;
    if (!(t instanceof HTMLElement) || t.closest("button, a, [data-fact], [data-term]")) return;
    const row = t.closest<HTMLElement>("[data-row]");
    if (row?.dataset.row) onTap(row.dataset.row);
  }

  return (
    <div data-reader-panels>
      {panels.length > 1 ? (
        <div role="tablist" aria-label="Panels of the page" className="mb-2 flex overflow-hidden rounded border border-line text-sm md:hidden" data-panel-tabs>
          {panels.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={current === p.key}
              data-panel-tab={p.key}
              onClick={() => setTab(p.key)}
              className={"min-h-[44px] min-w-0 flex-1 px-1.5 py-1 text-xs leading-tight " + (current === p.key ? "bg-tab-on font-semibold text-tab-on-ink" : "")}
            >
              {p.title}
            </button>
          ))}
        </div>
      ) : null}
      <div
        ref={holder}
        onClick={onClick}
        onScrollCapture={onScroll}
        className={"md:flex md:items-stretch md:overflow-x-auto md:rounded md:border md:border-line " + (band ? "" : rowH !== undefined ? "md:h-[var(--row-h)] md:min-h-0" : "md:h-[calc(100vh-9.5rem)] md:min-h-[24rem]")}
        style={rowH !== undefined ? ({ "--row-h": `${rowH}px` } as React.CSSProperties) : undefined}
        data-panel-row
        data-resize-height
        data-panel-count={panels.length}
      >
        {panels.map((p, i) => (
          <PanelBox
            key={p.key}
            spec={p}
            bar={reorder.barFor(p.key)}
            count={panels.length}
            saved={widths[p.ids[0]]}
            last={i === panels.length - 1}
            focus={focus}
            shownOnPhone={current === p.key}
            onHide={onHide}
            onWidth={onWidth}
            corner={!focus && !band}
            onSize={(spec, patch) => {
              if (patch.w !== undefined) onWidth(spec, patch.w);
              if (patch.h !== undefined) rowSize.set({ h: patch.h });
            }}
            onSizeReset={(spec) => {
              onWidthReset?.(spec);
              rowSize.set({ h: null });
            }}
          />
        ))}
      </div>
      {reorder.marker}
    </div>
  );
}
