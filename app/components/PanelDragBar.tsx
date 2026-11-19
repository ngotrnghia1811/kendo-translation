"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { dropGap, finalIndex, markerSpot, stepTarget, type Box } from "@/lib/panel-order";

// Unit VW117 (Q-A 3:95.2 and 3:96.6): one drag, one drop marker, one slide and one pair of ◀ ▶ buttons for the panels of the 3 page views
// (the Reader dashboard /read/<book>, the Monitor page view /page/<book>/<page>, and /translate/<book> with its page columns).
// Owner words (Q-A 3:95.2): "Also I should be able to drag each panel around to reorder them, and the should snap into place when I do so"
// Owner rule (Q-A 3:95.7): a feature of one page view goes to every page view.
// Terms: title bar = the bar at the top of a panel that you grab. drop marker = a colored bar that shows where the dragged panel lands.
//   snap = the panel slides into its new place when you let go (about 0.15 s, no slide when the system asks for less motion).
// [unit default VW117] The drag uses pointer events, not the HTML5 drag and drop (the old /read way). Reasons:
//   - the resize handles of unit VW115 use pointer events too, and the two never meet: a drag starts only on a title bar, never on a button, a link, a box or a handle;
//   - the drop marker and the slide need the pointer position all the time, which HTML5 drag and drop does not give on every browser;
//   - one code path works for a mouse, a pen and a finger.
// How it works:
//   - The caller marks each panel with data-reorder-item="<id>" and gives it a title bar. The parent element of the panels is the group.
//   - barFor(id) gives the props of a title bar (dragProps) and the move function of the ◀ ▶ buttons (moveBy).
//   - The caller keeps the order and moves in onMove(from, to). `to` is the place that the panel has in the new list.
//   - Before the order changes this hook notes where every panel stands. After the change it slides each panel from the old place to the new place.

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Length of the slide in ms. [unit default VW117] */
export const SLIDE_MS = 150;
/** The pointer must move this far (px) before a press on a title bar counts as a drag, so that a click stays a click. */
const DRAG_START_PX = 4;
/** A press on one of these does not start a drag. */
const INTERACTIVE = "button, a, input, select, textarea, summary, label, [role=separator], [role=button], [contenteditable=true], [data-reorder-no-drag]";

type Dir = "left" | "right";

export interface BarApi {
  id: string;
  /** The place of the panel in the list of panels that the screen draws, from 0. */
  index: number;
  /** The number of panels that the screen draws. */
  count: number;
  /** Spread these on the title bar. */
  dragProps: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
    onLostPointerCapture: (e: ReactPointerEvent<HTMLElement>) => void;
    "data-reorder-bar": string;
  };
  /** A step of a ◀ or ▶ button. `from` is the button: it names the group. */
  moveBy: (delta: -1 | 1, from: Element) => void;
}

interface Item {
  id: string;
  el: HTMLElement;
}

interface Session {
  id: string;
  pointerId: number;
  x: number;
  y: number;
  started: boolean;
  bar: HTMLElement;
  container: Element;
  gap: number;
}

interface Pending {
  container: Element;
  rects: Map<string, DOMRect>;
  at: number;
  focus: { id: string; dir: Dir } | null;
}

const boxOf = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

/** The panels of a group, in the order of the page. A panel inside a wrapper that has no box (display: contents) counts. A panel with no box on the screen drops out. */
function itemsOf(container: Element): Item[] {
  const out: Item[] = [];
  const take = (el: Element) => {
    if (el instanceof HTMLElement && el.dataset.reorderItem) out.push({ id: el.dataset.reorderItem, el });
  };
  for (const child of Array.from(container.children)) {
    if (child instanceof HTMLElement && !child.dataset.reorderItem && getComputedStyle(child).display === "contents") Array.from(child.children).forEach(take);
    else take(child);
  }
  return out.filter((x) => {
    const r = x.el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  });
}

const reducedMotion = (): boolean => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface Reorder {
  /** The props and the move function of the title bar of one panel. Null when the panel is not in the list. */
  barFor: (id: string) => BarApi | null;
  /** The drop marker. Draw it once, anywhere in the screen. It is null while no panel is dragged. */
  marker: ReactNode;
  /** The ID of the panel that is dragged now, or null. */
  draggingId: string | null;
}

/**
 * The drag and the buttons of one group of panels.
 * `ids` are the panels that the screen draws, in the order of the page. `onMove(from, to)` changes the order.
 * `minWidth`: below this screen width (px) the panels stack and do not move (Q-A 3:96.6 row 7). `moveAttr`: the attribute of the ◀ ▶ buttons (to find the button again).
 */
export function useReorder({ ids, onMove, minWidth, moveAttr = "data-panel-move" }: { ids: readonly string[]; onMove: (from: number, to: number) => void; minWidth: number; moveAttr?: string }): Reorder {
  const [drag, setDrag] = useState<{ id: string; gap: number; x: number; top: number; height: number } | null>(null);
  const session = useRef<Session | null>(null);
  const pending = useRef<Pending | null>(null);
  const latest = useRef({ ids, onMove, minWidth, moveAttr });
  useEffect(() => {
    latest.current = { ids, onMove, minWidth, moveAttr };
  });

  // The page DOM that a drag changes: the dim of the dragged panel, no text selection, the grabbing cursor. Put it back on every end.
  const clearDom = useCallback((s: Session | null) => {
    document.body.style.userSelect = "";
    document.body.removeAttribute("data-reorder-active");
    if (s) {
      try {
        if (s.bar.hasPointerCapture(s.pointerId)) s.bar.releasePointerCapture(s.pointerId);
      } catch {
        // The pointer is gone already.
      }
      for (const x of itemsOf(s.container)) x.el.removeAttribute("data-reorder-dragging");
    }
  }, []);

  const finish = useCallback(
    (commit: boolean, x: number, y: number) => {
      const s = session.current;
      if (!s) return;
      session.current = null;
      const ids = latest.current.ids;
      const from = ids.indexOf(s.id);
      let to: number | null = null;
      if (commit && s.started && from >= 0) {
        // The gap counts the panels that the screen shows. It becomes a gap of the list `ids` through the panel after it.
        const items = itemsOf(s.container);
        const shownGap = dropGap(items.map((i) => boxOf(i.el)), x, y);
        const gap = shownGap < items.length ? ids.indexOf(items[shownGap].id) : ids.length;
        const target = gap < 0 ? from : finalIndex(from, gap);
        to = target !== from ? target : null;
      }
      clearDom(s);
      setDrag(null);
      if (to !== null) {
        const rects = new Map<string, DOMRect>();
        for (const i of itemsOf(s.container)) rects.set(i.id, i.el.getBoundingClientRect());
        pending.current = { container: s.container, rects, at: performance.now(), focus: null };
        latest.current.onMove(from, to);
      }
    },
    [clearDom],
  );

  // Esc cancels a drag.
  useEffect(() => {
    if (!drag) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false, 0, 0);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [drag, finish]);
  // A screen that closes during a drag leaves no trace.
  useEffect(
    () => () => {
      const s = session.current;
      session.current = null;
      clearDom(s);
    },
    [clearDom],
  );

  // After the order changed: slide each panel from the old place to the new place, then give the focus back to the button that moved the panel.
  const key = ids.join("\u0001");
  useBrowserLayoutEffect(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    if (performance.now() - p.at > 1500) return;
    const items = itemsOf(p.container);
    if (!reducedMotion()) {
      for (const { id, el } of items) {
        const before = p.rects.get(id);
        if (!before || typeof el.animate !== "function") continue;
        const after = el.getBoundingClientRect();
        const dx = before.left - after.left;
        const dy = before.top - after.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        el.setAttribute("data-reorder-sliding", "");
        const slide = el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: SLIDE_MS, easing: "ease-out" });
        const done = () => el.removeAttribute("data-reorder-sliding");
        slide.onfinish = done;
        slide.oncancel = done;
      }
    }
    if (p.focus) {
      // A move can remove the button that was pressed (the first panel has no ◀). Then the other button of the same panel takes the focus.
      const el = items.find((x) => x.id === p.focus?.id)?.el;
      const attr = latest.current.moveAttr;
      const other: Dir = p.focus.dir === "left" ? "right" : "left";
      (el?.querySelector<HTMLElement>(`[${attr}="${p.focus.dir}"]`) ?? el?.querySelector<HTMLElement>(`[${attr}="${other}"]`))?.focus({ preventScroll: true });
    }
  }, [key]);

  const barFor = (id: string): BarApi | null => {
    const index = ids.indexOf(id);
    if (index < 0) return null;
    return {
      id,
      index,
      count: ids.length,
      moveBy: (delta, from) => {
        const cur = latest.current.ids;
        const i = cur.indexOf(id);
        const to = stepTarget(i, delta, cur.length);
        if (to === null) return;
        const container = from.closest("[data-reorder-item]")?.parentElement;
        if (container) {
          const rects = new Map<string, DOMRect>();
          for (const x of itemsOf(container)) rects.set(x.id, x.el.getBoundingClientRect());
          pending.current = { container, rects, at: performance.now(), focus: { id, dir: delta < 0 ? "left" : "right" } };
        }
        latest.current.onMove(i, to);
      },
      dragProps: {
        "data-reorder-bar": id,
        onPointerDown: (e) => {
          if (e.button !== 0 || latest.current.ids.length < 2 || window.innerWidth < latest.current.minWidth) return;
          const bar = e.currentTarget;
          const hit = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
          if (hit && bar.contains(hit)) return;
          const container = bar.closest("[data-reorder-item]")?.parentElement;
          if (!container) return;
          session.current = { id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, started: false, bar, container, gap: -1 };
          bar.setPointerCapture(e.pointerId);
        },
        onPointerMove: (e) => {
          const s = session.current;
          if (!s || s.pointerId !== e.pointerId) return;
          if (!s.started) {
            if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < DRAG_START_PX) return;
            s.started = true;
            document.body.style.userSelect = "none";
            document.body.setAttribute("data-reorder-active", "");
            for (const x of itemsOf(s.container)) if (x.id === s.id) x.el.setAttribute("data-reorder-dragging", "");
          }
          const boxes = itemsOf(s.container).map((x) => boxOf(x.el));
          const gap = dropGap(boxes, e.clientX, e.clientY);
          const spot = markerSpot(boxes, gap);
          if (!spot) return;
          // The marker stays on the screen: a tall panel (the pages of /translate) is cut at the top and the bottom of the window.
          const top = Math.max(spot.top, 0);
          const height = Math.max(0, Math.min(spot.top + spot.height, window.innerHeight) - top);
          setDrag((p) => (p && p.gap === gap && p.x === spot.x && p.top === top && p.height === height ? p : { id: s.id, gap, x: spot.x, top, height }));
        },
        onPointerUp: (e) => {
          if (session.current?.pointerId === e.pointerId) finish(true, e.clientX, e.clientY);
        },
        onPointerCancel: () => finish(false, 0, 0),
        onLostPointerCapture: () => finish(false, 0, 0),
      },
    };
  };

  const marker = drag ? (
    <div aria-hidden="true" data-drop-marker className="pointer-events-none fixed z-50 rounded-sm bg-accent" style={{ left: drag.x - 2, top: drag.top, width: 4, height: drag.height }} />
  ) : null;
  return { barFor, marker, draggingId: drag?.id ?? null };
}

const BTN = "rounded border border-line bg-white px-1.5 text-sm leading-5 hover:bg-stone-100";
// Unit VW117: the small size is for the column names in the sticky bar of /translate/<book>, so that the 5 names with their buttons take as few lines as possible.
const BTN_SM = "rounded border border-line bg-white px-0.5 text-[11px] leading-4 hover:bg-stone-100";
/** The screen width where the panels stop to stack and the controls show: Tailwind md (768 px, the Reader dashboard) or lg (1024 px, the other two screens). */
export type From = "md" | "lg";
const SHOW: Record<From, string> = { md: "hidden md:flex", lg: "hidden lg:flex" };
const GRAB: Record<From, string> = { md: "md:cursor-grab md:touch-none", lg: "lg:cursor-grab lg:touch-none" };
const HIDE_BELOW: Record<From, string> = { md: "max-md:hidden", lg: "max-lg:hidden" };

/** The class names that a header gets so that it can be grabbed from `from` on: the grab cursor and no scrolling by touch. */
export const grabClass = (from: From): string => `${GRAB[from]} select-none`;

/**
 * The ◀ ▶ buttons of a title bar (Q-A 3:96.6 row 5). `name` is the part after "Move the": for example "page image panel".
 * The first panel has no ◀ and the last panel has no ▶, as the buttons on /read had before. The buttons are not drawn when the screen has one panel.
 */
export function MoveButtons({ bar, name, from, attr = "data-panel-move", small = false }: { bar: BarApi | null; name: string; from: From; attr?: string; small?: boolean }) {
  if (!bar || bar.count < 2) return null;
  const btn = small ? BTN_SM : BTN;
  const props = (dir: Dir) => ({ [attr]: dir }) as Record<string, string>;
  return (
    <>
      {bar.index > 0 ? (
        <button type="button" className={`${btn} ${HIDE_BELOW[from]}`} aria-label={`Move the ${name} left`} title={`Move the ${name} left`} {...props("left")} onClick={(e) => bar.moveBy(-1, e.currentTarget)}>
          <span aria-hidden="true">◀</span>
        </button>
      ) : null}
      {bar.index < bar.count - 1 ? (
        <button type="button" className={`${btn} ${HIDE_BELOW[from]}`} aria-label={`Move the ${name} right`} title={`Move the ${name} right`} {...props("right")} onClick={(e) => bar.moveBy(1, e.currentTarget)}>
          <span aria-hidden="true">▶</span>
        </button>
      ) : null}
    </>
  );
}

/**
 * The title bar of a panel: the name, the ◀ ▶ buttons, and the extra buttons of the caller (children). A drag on the bar moves the panel.
 * It shows from `from` on. Below that width the panels stack and the bar is not drawn (Q-A 3:96.6 row 7).
 */
export function PanelTitleBar({
  id,
  bar,
  title,
  name,
  from,
  tip,
  children,
}: {
  id: string;
  bar: BarApi | null;
  /** The text of the bar. */
  title: string;
  /** The name for the button labels: "Move the <name> left". */
  name: string;
  from: From;
  /** The hover text. The default tells to drag the bar, or that the last panel stays. */
  tip?: string;
  children?: ReactNode;
}) {
  const only = !bar || bar.count < 2;
  return (
    <div
      className={`${SHOW[from]} ${GRAB[from]} select-none items-center gap-1 border-b border-line bg-stone-100 px-2 py-1 text-sm`}
      title={tip ?? (only ? "Keep at least one panel" : "Drag the title bar to move the panel")}
      data-panel-title={id}
      {...bar?.dragProps}
    >
      <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
      <MoveButtons bar={bar} name={name} from={from} />
      {children}
    </div>
  );
}
