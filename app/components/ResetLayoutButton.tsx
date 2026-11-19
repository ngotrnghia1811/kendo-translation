"use client";
import { resetScreenLayout } from "./usePanelOrder";

// Unit VW117 (Q-A 3:96.6 row 6): "Reset layout" for the Monitor page view /page and for /translate/<book>. It removes the saved order keys and the size keys of unit VW115
// of that screen, and every panel takes the old order and the old size again. /read has its own button "Reset layout" in the component list (components/ReaderComponentList.tsx).
// `onReset` runs after the keys are gone, for a size that the screen keeps somewhere else (the widths of /translate/<book> stay in the account).
export default function ResetLayoutButton({ screen, onReset }: { screen: string; onReset?: () => void }) {
  return (
    <button
      type="button"
      data-layout-reset-screen={screen}
      title="Put the order and the sizes of the panels back to the start"
      onClick={() => {
        resetScreenLayout(screen);
        onReset?.();
      }}
      className="rounded border border-line bg-white px-3 py-1 text-sm hover:bg-stone-100"
    >
      Reset layout
    </button>
  );
}
