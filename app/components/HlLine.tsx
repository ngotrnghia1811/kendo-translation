import { hlOfLine } from "@/lib/hl-rules";
import type { Seg } from "@/lib/book-status-rules";
import { BoxText } from "./BoxCode";
import { HlSpan } from "./HlSpan";

// Unit VW127 (Q-A 3:122.4 rows 2 to 7): line 2 of a book row (lib/book-status-rules.ts Seg[]) with its colors.
// The text is the same as lineText(segs, now): hlOfLine only cuts it (the test proves it). The age after "Last sign of life " gets the color of its exact age (row 5).
// A box code keeps its hover and its stage color (BoxText). A new file, because the dev server keeps old module instances (VW77a lesson).
export default function HlLine({ segs, now }: { segs: Seg[]; now: number }) {
  return (
    <>
      {hlOfLine(segs, now).map((s, i) => (s.kind === "box" || s.kind === "critic" ? <BoxText key={i} text={s.text} /> : <HlSpan key={i} seg={s} />))}
    </>
  );
}
