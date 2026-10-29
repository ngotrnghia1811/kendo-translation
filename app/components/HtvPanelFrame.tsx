"use client";
import { useRef } from "react";
import { TL3_WIDTH } from "@/lib/htv-settings";

// Frame of the TL_3 information panel (unit UXC step B). Round 58 answer 5 (Q-A 2026-10-28 l203): "drag width and close panel".
// The default width is 416 px. A drag on the left edge changes it between 280 and 720 px. The handle also works with the arrow keys.

const clamp = (w: number) => Math.min(TL3_WIDTH.max, Math.max(TL3_WIDTH.min, Math.round(w)));

export default function HtvPanelFrame({
  width,
  onWidth,
  onClose,
  style,
  cog,
  children,
}: {
  width: number;
  onWidth: (w: number) => void;
  onClose: () => void;
  /** Style of the pane settings (font, size, colors). */
  style?: React.CSSProperties;
  /** The settings cog of the pane. */
  cog?: React.ReactNode;
  children: React.ReactNode;
}) {
  const drag = useRef<{ x: number; w: number } | null>(null);
  return (
    <aside
      className="sticky top-3 max-h-[calc(100vh-1.5rem)] shrink-0 overflow-auto rounded border border-line bg-white/60"
      style={{ width, ...style }}
      data-panel
      data-panel-width={width}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Drag to change the width of the panel"
        aria-valuemin={TL3_WIDTH.min}
        aria-valuemax={TL3_WIDTH.max}
        aria-valuenow={width}
        tabIndex={0}
        data-panel-handle
        title="Drag to change the width"
        className="absolute inset-y-0 left-0 z-10 w-2 cursor-col-resize bg-line/40 hover:bg-accent/50 focus:bg-accent/50"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, w: width };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current) onWidth(clamp(drag.current.w + (drag.current.x - e.clientX)));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") onWidth(clamp(width + 16));
          else if (e.key === "ArrowRight") onWidth(clamp(width - 16));
        }}
      />
      <div className="flex items-center justify-end gap-2 px-3 pt-2" style={{ fontSize: "14px", fontFamily: "var(--font-sans)", lineHeight: 1.5 }}>
        {cog}
        <button type="button" onClick={onClose} className="rounded border border-line px-2 py-0.5 text-sm" data-panel-close>
          Close the panel
        </button>
      </div>
      <div className="px-3 pb-3 pl-4">{children}</div>
    </aside>
  );
}
