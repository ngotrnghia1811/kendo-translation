"use client";
import { useRef } from "react";
import { TL3_WIDTH } from "@/lib/htv-settings";
import { SIZE_LIMITS, type SizeLimits } from "@/lib/panel-size";
import { CornerHandle, useStoredSize } from "./PanelResize";

// Frames of the two side panels of the book screen (unit UXC step B, unit UXC2 round 61).
// Round 58 answer 5 (Q-A 2026-10-28 l203): "drag width". Round 60 answer 7 (Q-A l244): "Instead of `closing`, Make the left and right panel collapsible".
// Round 61 answer 4 (Q-A l264): each panel gets a collapse button in its header, and the close button is gone. A collapsed panel is a thin bar of about 28 px
// with the panel name and an arrow. A click on the bar opens the panel again at its old width. The open state and the width stay in the account.
// The default width of the TL_3 information panel is 416 px. A drag on the left edge changes it between 280 and 720 px. The handle also works with the arrow keys.
// Unit VW115 (Q-A 3:94.2 row 4): the panel also has a corner handle. The panel stands at the right end of the row, so the corner is at the bottom LEFT (the mirror image):
// a drag to the left and down makes the panel bigger, as the left edge handle does. [unit default VW115] The height stays in this browser (localStorage key
// vw115:size:translate:tl3). The width stays in the account as before. A double click on the corner sets the old width (416 px) and the old height again.

/** Width of a collapsed panel in px. */
export const BAR_WIDTH = 28;

const clamp = (w: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(w)));

/** The thin bar of a collapsed panel: an arrow and the name of the panel. A click opens the panel. */
export function CollapsedBar({ id, name, arrow, onOpen }: { id: string; name: string; arrow: string; onOpen: () => void }) {
  return (
    <aside className="sticky top-3 shrink-0 self-start" style={{ width: BAR_WIDTH }} data-panel-collapsed={id}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open the ${name}`}
        title={`Open the ${name}`}
        data-panel-open={id}
        className="flex w-full flex-col items-center gap-2 rounded border border-line bg-white/60 py-2 text-sm hover:bg-stone-100"
      >
        <span aria-hidden="true">{arrow}</span>
        <span style={{ writingMode: "vertical-rl" }} className="whitespace-nowrap">
          {name}
        </span>
      </button>
    </aside>
  );
}

/** The collapse button in the header of a panel. */
export function CollapseButton({ id, name, arrow, onCollapse }: { id: string; name: string; arrow: string; onCollapse: () => void }) {
  return (
    <button
      type="button"
      onClick={onCollapse}
      aria-label={`Collapse the ${name}`}
      title={`Collapse the ${name}`}
      data-panel-collapse={id}
      className="rounded border border-line bg-white px-1.5 text-sm leading-5 hover:bg-stone-100"
    >
      <span aria-hidden="true">{arrow}</span>
    </button>
  );
}

/**
 * A drag handle on one edge of a panel. `side` names the edge. A drag away from the panel makes it wider.
 * Unit VW115 (Q-A 3:94.2 row 1), two additions that change nothing for the old callers: `onReset` (a double click or the Home key sets the old size again)
 * and `className` (for example `max-lg:hidden` on a screen where the panels stack).
 */
export function DragHandle({
  side,
  width,
  min,
  max,
  onWidth,
  label,
  attr,
  onReset,
  className = "",
}: {
  side: "left" | "right";
  width: number;
  min: number;
  max: number;
  onWidth: (w: number) => void;
  label: string;
  /** Name of the data attribute, for tests. */
  attr: string;
  /** Sets the old width again: a double click on the handle or the Home key. */
  onReset?: () => void;
  /** Extra classes. */
  className?: string;
}) {
  const drag = useRef<{ x: number; w: number } | null>(null);
  // On the left edge a move to the left makes the panel wider. On the right edge a move to the right does.
  const sign = side === "left" ? -1 : 1;
  const marker = { [attr]: "" } as Record<string, string>;
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={width}
      tabIndex={0}
      title={onReset ? "Drag to change the width. Double click: old width" : "Drag to change the width"}
      className={`absolute inset-y-0 z-10 w-2 cursor-col-resize touch-none bg-line/40 hover:bg-accent/50 focus:bg-accent/50 ${side === "left" ? "left-0" : "right-0"} ${className}`}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, w: width };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current) onWidth(clamp(drag.current.w + sign * (e.clientX - drag.current.x), min, max));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        const wider = side === "left" ? "ArrowLeft" : "ArrowRight";
        const narrower = side === "left" ? "ArrowRight" : "ArrowLeft";
        if (e.key === wider) onWidth(clamp(width + 16, min, max));
        else if (e.key === narrower) onWidth(clamp(width - 16, min, max));
        else if (e.key === "Home" && onReset) {
          e.preventDefault();
          onReset();
        }
      }}
      onDoubleClick={onReset}
      {...marker}
    />
  );
}

/** The limits of a corner drag of the TL_3 information panel: the width range of the edge handle and the general height range. */
const CORNER_LIMITS: SizeLimits = { w: TL3_WIDTH, h: SIZE_LIMITS.h };

export default function HtvPanelFrame({
  width,
  onWidth,
  onCollapse,
  title,
  style: paneStyle,
  cog,
  children,
}: {
  width: number;
  onWidth: (w: number) => void;
  onCollapse: () => void;
  title: string;
  /** Style of the pane settings (font, size, colors). */
  style?: React.CSSProperties;
  /** The settings cog of the pane. */
  cog?: React.ReactNode;
  children: React.ReactNode;
}) {
  const stored = useStoredSize("translate", "tl3");
  const h = stored.size.h;
  // The height comes in through the style of the pane, so the class list and the style of the aside keep the form that scripts/vw110-test.mjs reads.
  // The rule [data-panel][data-sized] in app/globals.css uses it from the lg width on.
  const style = h === undefined ? paneStyle : ({ ...paneStyle, "--panel-h": `${h}px` } as React.CSSProperties);
  return (
    // Unit VW110 (Q-A 3:74.5 part 2): below the lg width (1024 px) the panel sits under the pages, as wide as the screen (min-w-full max-w-full beat the inline width),
    // not sticky, and without the drag handle (the width has no effect there). From lg on the classes are the old ones.
    <aside
      className="flex max-h-[calc(100vh-1.5rem)] min-w-full max-w-full shrink-0 flex-col rounded border border-line bg-white/60 max-lg:[&>[role=separator]]:hidden lg:sticky lg:top-3 lg:min-w-0 lg:max-w-none"
      style={{ width, ...style }}
      data-sized={h !== undefined ? "" : undefined}
      data-panel
      data-panel-width={width}
    >
      <DragHandle side="left" width={width} min={TL3_WIDTH.min} max={TL3_WIDTH.max} onWidth={onWidth} label="Drag to change the width of the panel" attr="data-panel-handle" />
      <div className="flex items-center justify-between gap-2 px-3 pt-2 pl-4" style={{ fontSize: "14px", fontFamily: "var(--font-sans)", lineHeight: 1.5 }} data-panel-header>
        <span className="font-semibold">{title}</span>
        <span className="flex items-center gap-2">
          {cog}
          <CollapseButton id="tl3" name={title} arrow="▶" onCollapse={onCollapse} />
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3 pl-4">{children}</div>
      <CornerHandle
        corner="left"
        limits={CORNER_LIMITS}
        label="Drag to change the width and the height of the panel"
        attr="data-panel-corner"
        onSize={(p) => {
          if (p.w !== undefined) onWidth(p.w);
          if (p.h !== undefined) stored.set({ h: p.h });
        }}
        onReset={() => {
          onWidth(TL3_WIDTH.default);
          stored.set({ h: null });
        }}
      />
    </aside>
  );
}
