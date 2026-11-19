"use client";
import type { CSSProperties, ReactNode } from "react";
import { DragHandle } from "./HtvPanelFrame";
import { CornerHandle, useStoredSize, type StoredSize } from "./PanelResize";
import { PAGE_COLUMNS, SIZE_LIMITS, pageColumns } from "@/lib/panel-size";

// Unit VW115 (Q-A 3:93.5, accepted design rows 1, 2 and 7 in Q-A 3:94.2), owner words: "I want to be able to resize every panel in /page/<book>/<page> by dragging the borders/corners."
// The 3 panels of the Monitor page view (page image, text, QA verdict and extras) stand side by side from the lg width (1024 px) on.
// - A border handle sits on each border between two columns: the right edge of the image panel and the left edge of the QA panel. It changes that column.
//   The text panel takes the rest of the width, so each border has one handle.
// - A corner handle sits on the bottom right corner of each panel and changes its width and its height. The panel then scrolls inside.
// - A double click on a handle sets the old size again. The sizes stay in this browser, one set for this screen (keys vw115:size:page:<panel>).
// - Below the lg width the panels stand one under the other, with no handles and the old sizes (row 7), as /read does.
// [unit default VW115] A text panel with a width of its own can make the row wider than the window. The page then scrolls sideways, as the owner chose that width.

type Id = "image" | "text" | "qa";

function Panel({ id, label, stored, edge, edgeWidth, sticky, children }: { id: Id; label: string; stored: StoredSize; edge?: "left" | "right"; edgeWidth?: number; sticky?: boolean; children: ReactNode }) {
  const h = stored.size.h;
  // The outer box does not scroll, so the handles stay in place. The inner box scrolls.
  const box =
    id === "text"
      ? "min-w-0 rounded border border-line bg-white p-5" + (h !== undefined ? " lg:overflow-auto" : "")
      : id === "image"
        ? "overflow-auto rounded border border-line bg-white"
        : "overflow-auto";
  const limit = sticky ? (h !== undefined ? " lg:max-h-none" : " max-h-[calc(100vh-2rem)]") : "";
  return (
    <div className={`relative min-w-0 ${sticky ? "lg:sticky lg:top-4" : ""}`} data-page-panel={id}>
      <div className={box + limit + (h !== undefined ? " lg:h-[var(--panel-h)]" : "")} style={h !== undefined ? ({ "--panel-h": `${h}px` } as CSSProperties) : undefined}>
        {children}
      </div>
      {edge ? (
        <DragHandle
          side={edge}
          width={edgeWidth ?? PAGE_COLUMNS.image}
          min={SIZE_LIMITS.w.min}
          max={SIZE_LIMITS.w.max}
          onWidth={(w) => stored.set({ w })}
          onReset={() => stored.set({ w: null })}
          label={`Drag to change the width of the ${label}`}
          attr={`data-page-edge-${id}`}
          className="max-lg:hidden"
        />
      ) : null}
      <CornerHandle label={`Drag to change the width and the height of the ${label}`} attr={`data-page-corner-${id}`} onSize={stored.set} onReset={stored.reset} className="max-lg:hidden" />
    </div>
  );
}

/** The panels of the Monitor page view. `image` is null when the page image is off. */
export default function PagePanels({ image, text, side }: { image: ReactNode | null; text: ReactNode; side: ReactNode }) {
  const img = useStoredSize("page", "image");
  const txt = useStoredSize("page", "text");
  const qa = useStoredSize("page", "qa");
  const cols = pageColumns(image !== null, { image: img.size, text: txt.size, qa: qa.size });
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:[grid-template-columns:var(--page-cols)]" style={{ "--page-cols": cols } as CSSProperties} data-page-grid>
      {image !== null ? (
        <Panel id="image" label="page image" stored={img} edge="right" edgeWidth={img.size.w ?? PAGE_COLUMNS.image} sticky>
          {image}
        </Panel>
      ) : null}
      <Panel id="text" label="text panel" stored={txt}>
        {text}
      </Panel>
      <Panel id="qa" label="QA panel" stored={qa} edge="left" edgeWidth={qa.size.w ?? PAGE_COLUMNS.qa} sticky>
        {side}
      </Panel>
    </div>
  );
}
