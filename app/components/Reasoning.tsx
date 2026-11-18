"use client";
import { useState } from "react";
import { boxHelp } from "@/lib/box-names";

// Round 41 answer 6: the docs word for the explanation field is "reasoning".
// Round 42 answer 16: "explanation text shows on request". The text stays hidden until the owner presses the button.
export default function Reasoning({ text, label }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={label ? boxHelp(label) ?? undefined : undefined} // Unit VW96 (Q-A 3:18.5): the box code keeps its place, the readable name shows on hover.
        // Unit VW112 (Q-A 3:78.4 note): the open toggle gets the highlight color over its own bg-white.
        className="inline-flex items-center gap-2 rounded border border-line bg-white px-2.5 py-1 text-xs font-medium hover:border-accent aria-expanded:bg-open"
      >
        <span aria-hidden>{open ? "▾" : "▸"}</span>
        {`Reasoning${label ? ` of ${label}` : ""}`}
      </button>
      <span className="ml-2 text-xs text-muted">explanation text of the box</span>
      {open ? (
        text ? (
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-line bg-white p-3 text-xs leading-relaxed">{text}</pre>
        ) : (
          <p className="mt-2 text-xs text-muted">This box has no reasoning text.</p>
        )
      ) : null}
    </div>
  );
}
