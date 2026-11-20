"use client";
import { useState } from "react";
import { normalizeBox, type Box, type Point } from "@/lib/visual-issue-rules";
import { UI_ATTR } from "@/lib/visual-issue-capture";

// Unit VW118 (plan item P53, Q-A 3:99.5 row 3), owner words (Q-A 3:98.5): "they will take screenshot of a specific part of the current page (esc to go back)".
// Row 3: "a click dims the page and shows a cross cursor. You drag a box over the part you want. Esc goes back at every step."
// This layer dims the page and reads the drag. The Esc key is read by components/VisualIssueTool.tsx (one place for every step).
// Every element has the attribute of UI_ATTR, so the capture leaves it out. The layer takes the pointer events of the whole window (touch-none: a finger drags a box, the page does not scroll).
// A button Cancel is in the hint, because a phone has no Esc key [unit default VW118].
const MARK = { [UI_ATTR]: "" } as Record<string, string>;

export default function VisualIssueSelect({ notice, onDragStart, onBox, onCancel }: { notice: string; onDragStart: () => void; onBox: (box: Box | null) => void; onCancel: () => void }) {
  const [drag, setDrag] = useState<{ a: Point; b: Point } | null>(null);
  const view = () => ({ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight });
  const box = drag ? normalizeBoxLoose(drag.a, drag.b, view()) : null;
  return (
    <>
      <div
        {...MARK}
        data-visual-issue-select
        className="fixed inset-0 z-[70] cursor-crosshair touch-none select-none"
        style={{ background: drag ? "transparent" : "rgba(0, 0, 0, 0.45)" }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = { x: e.clientX, y: e.clientY };
          setDrag({ a: p, b: p });
          onDragStart();
        }}
        onPointerMove={(e) => {
          if (drag) setDrag({ a: drag.a, b: { x: e.clientX, y: e.clientY } });
        }}
        onPointerUp={(e) => {
          if (!drag) return;
          const end = { x: e.clientX, y: e.clientY };
          setDrag(null);
          onBox(normalizeBox(drag.a, end, view()));
        }}
        onPointerCancel={() => setDrag(null)}
      />
      {box ? (
        <div
          {...MARK}
          data-visual-issue-box
          className="pointer-events-none fixed z-[71]"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h, outline: "2px solid #ffffff", boxShadow: "0 0 0 1px #000000, 0 0 0 100vmax rgba(0, 0, 0, 0.45)" }}
        />
      ) : null}
      <div {...MARK} data-visual-issue-hint role="status" className="fixed bottom-4 left-4 right-[4.5rem] z-[72] flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-line bg-white px-3 py-2 text-sm text-foreground shadow-lg md:right-auto md:max-w-xl">
        <span>{notice || "Drag a box over the part of the page that you want. Press Esc to cancel."}</span>
        <button type="button" onClick={onCancel} data-visual-issue-cancel className="min-h-[36px] rounded border border-line px-3 py-0.5">
          Cancel
        </button>
      </div>
    </>
  );
}

/** The box that the screen shows during a drag: like normalizeBox, but a small box shows too. */
function normalizeBoxLoose(a: Point, b: Point, view: { w: number; h: number }): Box {
  const cut = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  const x1 = cut(Math.min(a.x, b.x), view.w);
  const y1 = cut(Math.min(a.y, b.y), view.h);
  return { x: x1, y: y1, w: cut(Math.max(a.x, b.x), view.w) - x1, h: cut(Math.max(a.y, b.y), view.h) - y1 };
}
