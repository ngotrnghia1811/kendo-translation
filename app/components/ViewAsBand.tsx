"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { bandShowsOn, bandText, BAND_BACK_LABEL } from "@/lib/view-as";
import { sendView, useViewAs } from "./ViewAsProvider";

// Unit VW119 (plan item P56, Q-A 3:103.5 row 3): a colored band at the top of every page in a view: "You view the site as a reader." and the button "Back to admin".
// [unit default VW119] The colors do not follow the theme, because the band is a warning that must look the same in all 5 themes (contrast 4.5 or more):
//   reader view      background #f4c542 (amber), text #1f1d1a, contrast 10.34 to 1
//   translator view  background #8fd0f0 (light blue), text #0b1f2a, contrast 10.01 to 1
// The two views differ by the line of text too, so the color is not the only sign. The Monitor pages show no band (row 8).
const BAND_CLASS = {
  reader: "bg-[#f4c542] text-[#1f1d1a]",
  translator: "bg-[#8fd0f0] text-[#0b1f2a]",
} as const;

export default function ViewAsBand() {
  const state = useViewAs();
  const path = usePathname() ?? "/";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!state || !state.admin || !state.view || !bandShowsOn(path, state.monitor)) return null;
  const view = state.view;

  async function back() {
    setBusy(true);
    setError("");
    const err = await sendView("admin");
    if (err) {
      setError(err);
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div role="status" data-view-band data-view={view} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-2 text-sm font-semibold ${BAND_CLASS[view]}`}>
      <span data-view-band-text>{bandText(view)}</span>
      <span className="flex items-center gap-2">
        {error ? <span role="alert">{error}</span> : null}
        <button type="button" onClick={() => void back()} disabled={busy} data-view-back className="min-h-[36px] rounded border border-current px-3 py-1 font-semibold disabled:opacity-50">
          {BAND_BACK_LABEL}
        </button>
      </span>
    </div>
  );
}
