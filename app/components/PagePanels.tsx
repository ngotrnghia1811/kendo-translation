"use client";
import type { CSSProperties, ReactNode } from "react";
import { DragHandle } from "./HtvPanelFrame";
import { CornerHandle, useStoredSize, type StoredSize } from "./PanelResize";
import { PanelTitleBar, useReorder, type BarApi } from "./PanelDragBar";
import ResetLayoutButton from "./ResetLayoutButton";
import { usePanelOrder } from "./usePanelOrder";
import { PAGE_PANEL_IDS, edgeToward, moveVisible, pageGrid } from "@/lib/panel-order";
import { PAGE_COLUMNS, SIZE_LIMITS } from "@/lib/panel-size";

// Unit VW115 (Q-A 3:93.5, accepted design rows 1, 2 and 7 in Q-A 3:94.2), owner words: "I want to be able to resize every panel in /page/<book>/<page> by dragging the borders/corners."
// The 3 panels of the Monitor page view (page image, text, QA verdict and extras) stand side by side from the lg width (1024 px) on.
// - A border handle sits on each border between two columns: the right edge of the image panel and the left edge of the QA panel. It changes that column.
//   The text panel takes the rest of the width, so each border has one handle.
// - A corner handle sits on the bottom right corner of each panel and changes its width and its height. The panel then scrolls inside.
// - A double click on a handle sets the old size again. The sizes stay in this browser, one set for this screen (keys vw115:size:page:<panel>).
// - Below the lg width the panels stand one under the other, with no handles and the old sizes (row 7), as /read does.
// [unit default VW115] A text panel with a width of its own can make the row wider than the window. The page then scrolls sideways, as the owner chose that width.
//
// Unit VW117 (Q-A 3:95.2 and 3:96.6 rows 1, 3, 5, 6 and 7), owner words: "Also I should be able to drag each panel around to reorder them, and the should snap into place when I do so"
// - Each panel has a title bar from the lg width on. A drag of the bar moves the panel: a drop marker shows the place and the panel slides into it (components/PanelDragBar.tsx).
//   The buttons ◀ ▶ in the bar do the same by keyboard.
// - The order stays in this browser, one key for this screen (vw117:order:page:panels, components/usePanelOrder.ts), like the sizes.
// - The border handle sits on the side of the panel that faces the text panel, so it keeps its place at the border that it changes after a move.
// - "Reset layout" removes the saved order and the saved sizes of this screen.
// - Below the lg width the panels stand one under the other, with no title bar and no move (row 7). They follow the saved order.

type Id = "image" | "text" | "qa";

const NAMES: Record<Id, { title: string; label: string }> = {
  image: { title: "Page image", label: "page image" },
  text: { title: "Text", label: "text panel" },
  qa: { title: "QA panel", label: "QA panel" },
};

function Panel({
  id,
  stored,
  bar,
  edge,
  edgeWidth,
  sticky,
  children,
}: {
  id: Id;
  stored: StoredSize;
  bar: BarApi | null;
  edge?: "left" | "right";
  edgeWidth?: number;
  sticky?: boolean;
  children: ReactNode;
}) {
  const label = NAMES[id].label;
  const h = stored.size.h;
  // The outer box does not scroll, so the handles stay in place. The inner box scrolls.
  const box =
    id === "text"
      ? "min-w-0 rounded border border-line bg-white p-5" + (h !== undefined ? " lg:overflow-auto" : "")
      : id === "image"
        ? "overflow-auto rounded border border-line bg-white"
        : "overflow-auto";
  // Unit VW117: from the lg width on the title bar stands above the box (about 1.8 rem), so the box gets that much less of the window height.
  const limit = sticky ? (h !== undefined ? " lg:max-h-none" : " max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-4rem)]") : "";
  return (
    // Unit VW117: the outer box is the panel in the grid. It holds the title bar and the old box with its handles, so the handles measure the same box as before.
    <div className={`min-w-0 ${sticky ? "lg:sticky lg:top-4" : ""}`} data-reorder-item={id}>
      <PanelTitleBar id={id} bar={bar} title={NAMES[id].title} name={id === "image" ? "page image panel" : label} from="lg" />
      <div className="relative min-w-0" data-page-panel={id}>
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
    </div>
  );
}

/** The panels of the Monitor page view. `image` is null when the page image is off. */
export default function PagePanels({ image, text, side }: { image: ReactNode | null; text: ReactNode; side: ReactNode }) {
  const img = useStoredSize("page", "image");
  const txt = useStoredSize("page", "text");
  const qa = useStoredSize("page", "qa");
  // Unit VW117 (Q-A 3:96.6 row 3): the order of the 3 panels, kept in this browser. The page image panel is not drawn while it is off, and it keeps its place in the order.
  const saved = usePanelOrder("page", "panels", PAGE_PANEL_IDS);
  const shown = saved.order.filter((id) => image !== null || id !== "image");
  const reorder = useReorder({ ids: shown, onMove: (from, to) => saved.set(moveVisible(saved.order, shown, from, to)), minWidth: 1024 });
  const cols = pageGrid(shown, { image: img.size, text: txt.size, qa: qa.size });
  const parts: Record<Id, { stored: StoredSize; node: ReactNode; sticky: boolean }> = {
    image: { stored: img, node: image, sticky: true },
    text: { stored: txt, node: text, sticky: false },
    qa: { stored: qa, node: side, sticky: true },
  };
  return (
    <>
      {/* Unit VW117 (Q-A 3:96.6 row 6): one button for the order and the sizes of this screen. It stays on the screen at 390 px, because the saved order also applies to the stack. */}
      <div className="mb-2 flex justify-end">
        <ResetLayoutButton screen="page" />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:[grid-template-columns:var(--page-cols)]" style={{ "--page-cols": cols } as CSSProperties} data-page-grid>
        {shown.map((id) => {
          const p = parts[id as Id];
          const sideOfEdge = edgeToward(shown, id, "text");
          return (
            <Panel
              key={id}
              id={id as Id}
              stored={p.stored}
              bar={reorder.barFor(id)}
              edge={sideOfEdge ?? undefined}
              edgeWidth={p.stored.size.w ?? (id === "image" ? PAGE_COLUMNS.image : PAGE_COLUMNS.qa)}
              sticky={p.sticky}
            >
              {p.node}
            </Panel>
          );
        })}
      </div>
      {reorder.marker}
    </>
  );
}
