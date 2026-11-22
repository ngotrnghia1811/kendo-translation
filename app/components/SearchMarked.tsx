// Unit VW124 (Q-A 3:117.4 row 3 "the line with the match in yellow", Q-A 3:117.5 row 3): a line of text with the match in yellow.
// No script and no server-only marker, so the search page and the book search use it. The yellow is `bg-amber-200 text-foreground`:
// the theme blocks of app/globals.css give the colour --color-amber-200 its own value in each of the five themes, so the match stays readable in the dark theme too.
import type { MarkPart } from "@/lib/search-core";

export const MARK_CLASS = "rounded-sm bg-amber-200 px-0.5 text-foreground";

export default function SearchMarked({ parts }: { parts: MarkPart[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.h ? (
          <mark key={i} className={MARK_CLASS} data-hit-mark>
            {p.t}
          </mark>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </>
  );
}
