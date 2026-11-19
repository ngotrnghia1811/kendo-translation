"use client";
import { useEffect } from "react";
import { translateKeyTarget } from "@/lib/translate-page-keys";

// Unit VW116 (Q-A 3:95.4 row a). Owner words of VW115 (Q-A 3:93.5): "These features should also apply to every other relevant reader/monitor pages."
// The page view of /translate/<book> has the buttons Previous page and Next page. This hook gives them the Left and Right arrow keys.
// `onMove` is the same function as the button click (movePage in components/HtvBook.tsx), so the warning about unsaved text applies to a key too.
// [unit default VW116] The Scroll view has no Previous page and no Next page, so it keeps the arrow keys of the browser (the same as /read).
// The keys do nothing while the focus is in a text box, a textarea, a select, editable text, a slider or a handle (lib/page-move.ts),
// and while a pop-up is open (an element with role="dialog": the term pop-up or the cog box of a pane).

export function useTranslatePageKeys(enabled: boolean, cur: number, pages: number, onMove: (n: number) => void): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const dialogOpen = document.querySelector('[role="dialog"]') !== null;
      const to = translateKeyTarget(e, cur, pages, dialogOpen);
      if (to === null) return;
      e.preventDefault();
      onMove(to);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, cur, pages, onMove]);
}
