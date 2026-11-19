"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SIZE_LIMITS, cornerKey, dragSize, mergeSize, parseSize, serializeSize, sizeKey, type Size, type SizeLimits } from "@/lib/panel-size";

// Unit VW115 (Q-A 3:93.5, accepted design rows 1, 2 and 4 in Q-A 3:94.2), owner words: "I want to be able to resize every panel ... by dragging the borders/corners."
// Term: handle = a thin bar on a panel edge that you drag. The border handle is DragHandle in components/HtvPanelFrame.tsx (with the new onReset).
// This file holds the corner handle and the hook that keeps the sizes of one screen in this browser (row 2). The size rules are in lib/panel-size.ts.

// useLayoutEffect on the browser, so that a stored size is in place before the first paint. On the server it is a plain effect (no warning).
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface StoredSize {
  /** The size now. A missing key means "the old size". Empty until the stored size is read (after the first render). */
  size: Size;
  /** Change one or both parts. A value of null sets the old size of that part again. The change goes into the browser storage. */
  set: (patch: { w?: number | null; h?: number | null }) => void;
  /** Set the old width and the old height again. */
  reset: () => void;
}

/**
 * The size of one panel, kept in this browser (localStorage). One key for each screen and panel (lib/panel-size.ts sizeKey).
 * Q-A 3:94.2 row 2: "The sizes stay in this browser, one set for each screen."
 * A broken or blocked storage (private mode) gives the old size and no error.
 */
export function useStoredSize(screen: string, panel: string, limits: SizeLimits = SIZE_LIMITS): StoredSize {
  const key = sizeKey(screen, panel);
  const [size, setSize] = useState<Size>({});
  const latest = useRef<Size>({});
  useBrowserLayoutEffect(() => {
    let read: Size = {};
    try {
      read = parseSize(window.localStorage.getItem(key), limits);
    } catch {
      // Storage is blocked: the old size stays.
    }
    latest.current = read;
    setSize(read);
    // `limits` is a constant of the caller, so the key alone names the stored value.
  }, [key]);
  const set = useCallback(
    (patch: { w?: number | null; h?: number | null }) => {
      const next = mergeSize(latest.current, patch);
      latest.current = next;
      setSize(next);
      try {
        const text = serializeSize(next);
        if (text) window.localStorage.setItem(key, text);
        else window.localStorage.removeItem(key);
      } catch {
        // Storage is full or blocked: the size holds until the page closes.
      }
    },
    [key],
  );
  const reset = useCallback(() => set({ w: null, h: null }), [set]);
  return { size, set, reset };
}

/**
 * The handle on the bottom corner of a panel: a drag changes the width and the height, an arrow key changes one of them by 16 px,
 * a double click or the Home key sets the old size again (Q-A 3:94.2 row 1: "A handle on the bottom right corner of each panel changes its width and its height").
 * The handle sits inside the box that it resizes (an element with `position: relative`), so the box is the parent element of the handle.
 * An ancestor with the attribute `data-resize-height` is the box that the height belongs to (the panel row of /read, where all panels share one height).
 */
export function CornerHandle({
  corner = "right",
  axes = "both",
  label,
  attr,
  limits = SIZE_LIMITS,
  onSize,
  onReset,
  className = "",
}: {
  /** The bottom corner. "right": a drag to the right and down makes the box bigger. "left" is the mirror image for a panel at the right end of a row. */
  corner?: "right" | "left";
  /** "height": only the height changes (the last panel of a row takes the rest of the width). */
  axes?: "both" | "height";
  label: string;
  /** Name of the data attribute, for tests. */
  attr: string;
  limits?: SizeLimits;
  /** Called while a drag or a key changes the size. */
  onSize: (patch: { w?: number; h?: number }) => void;
  onReset: () => void;
  /** Extra classes, for example `max-lg:hidden` where the panels stack. */
  className?: string;
}) {
  const drag = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const grow = corner === "left" ? -1 : 1;
  const apply = (next: { w: number; h: number }) => onSize(axes === "height" ? { h: next.h } : next);
  const measure = (handle: HTMLElement) => {
    const box = handle.parentElement?.getBoundingClientRect();
    const heightBox = handle.closest("[data-resize-height]");
    const rect = heightBox ? heightBox.getBoundingClientRect() : box;
    return { w: Math.round(box?.width ?? 0), h: Math.round(rect?.height ?? 0) };
  };
  const stop = () => {
    drag.current = null;
    document.body.style.userSelect = "";
  };
  const marker = { [attr]: "" } as Record<string, string>;
  return (
    <div
      role="separator"
      aria-label={label}
      tabIndex={0}
      title={axes === "height" ? "Drag to change the height. Double click: old size" : "Drag to change the width and the height. Double click: old size"}
      className={`absolute bottom-0 z-10 h-4 w-4 touch-none select-none ${corner === "left" ? "panel-corner-left left-0 cursor-nesw-resize" : "panel-corner right-0 cursor-nwse-resize"} ${className}`}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        drag.current = { x: e.clientX, y: e.clientY, ...measure(e.currentTarget) };
        // No text selection while the pointer moves over other text.
        document.body.style.userSelect = "none";
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d) apply(dragSize(d, grow * (e.clientX - d.x), e.clientY - d.y, limits));
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={(e) => {
        const k = cornerKey(e.key);
        if (!k) return;
        if (axes === "height" && k.dh === 0 && !k.reset) return;
        e.preventDefault();
        if (k.reset) onReset();
        else apply(dragSize(measure(e.currentTarget), grow * k.dw, k.dh, limits));
      }}
      onDoubleClick={onReset}
      {...marker}
    />
  );
}
