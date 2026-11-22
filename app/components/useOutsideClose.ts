"use client";
// Unit VW123 (plan P63, card P63.1). Shared by the model picker and the Thinking menu: a press outside the element closes the popover.
import { useEffect, type RefObject } from "react";

/** While `open` is true, a pointer press outside `ref` calls `close`. */
export function useOutsideClose(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [ref, open, close]);
}
