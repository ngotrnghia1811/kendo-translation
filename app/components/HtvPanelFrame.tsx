"use client";
import { useRef } from "react";
import { TL3_WIDTH } from "@/lib/htv-settings";

// Frames of the two side panels of the book screen (unit UXC step B, unit UXC2 round 61).
// Round 58 answer 5 (Q-A 2026-10-28 l203): "drag width". Round 60 answer 7 (Q-A l244): "Instead of `closing`, Make the left and right panel collapsible".
// Round 61 answer 4 (Q-A l264): each panel gets a collapse button in its header, and the close button is gone. A collapsed panel is a thin bar of about 28 px
// with the panel name and an arrow. A click on the bar opens the panel again at its old width. The open state and the width stay in the account.
// The default width of the TL_3 information panel is 416 px. A drag on the left edge changes it between 280 and 720 px. The handle also works with the arrow keys.

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

/** A drag handle on one edge of a panel. `side` names the edge. A drag away from the panel makes it wider. */
export function DragHandle({
  side,
  width,
  min,
  max,
  onWidth,
  label,
  attr,
}: {
  side: "left" | "right";
  width: number;
  min: number;
  max: number;
  onWidth: (w: number) => void;
  label: string;
  /** Name of the data attribute, for tests. */
  attr: string;
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
      title="Drag to change the width"
      className={`absolute inset-y-0 z-10 w-2 cursor-col-resize bg-line/40 hover:bg-accent/50 focus:bg-accent/50 ${side === "left" ? "left-0" : "right-0"}`}
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
      }}
      {...marker}
    />
  );
}

export default function HtvPanelFrame({
  width,
  onWidth,
  onCollapse,
  title,
  style,
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
  return (
    <aside
      className="sticky top-3 flex max-h-[calc(100vh-1.5rem)] shrink-0 flex-col rounded border border-line bg-white/60"
      style={{ width, ...style }}
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
    </aside>
  );
}
