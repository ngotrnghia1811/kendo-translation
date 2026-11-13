import { Fragment } from "react";
import { boxHelp, splitBoxCodes } from "@/lib/box-names";

// Unit VW94 fix round (round 91). Owner pick Q-A 3:18.5 (2026-11-11): "Keep codes, explain on hover".
// The screen shows the code ("TL_2"). The hover (title) shows the full name. A dotted underline shows that the code has a hover,
// the same pattern as HtvMarkedText.tsx. A visually hidden text gives the full name to a screen reader.
// The class "relative" keeps that hidden text inside the code, so it adds no sideways scroll inside a table that scrolls in its own box.

// Unit VW99 (Q-A 3:27.4): a chip colored by the box kind: TS grey, TL blue, ED green, QA purple. The code text stays on the chip,
// so the color is never the only sign. The colors are theme variables of app/globals.css (scripts/contrast-dark.mjs tests them at 7 to 1).
// Exported for components/Named.tsx (GroupCode). Full class names, so that Tailwind finds them.
export const KIND_CHIP: Record<string, string> = {
  TS: "bg-chip-ts text-chip-ts-ink",
  TL: "bg-chip-tl text-chip-tl-ink",
  ED: "bg-chip-ed text-chip-ed-ink",
  QA: "bg-chip-qa text-chip-qa-ink",
};

function chipOf(code: string): string {
  const kind = /(TS|TL|ED|QA)(?:_\d|$)/.exec(code)?.[1];
  return kind ? `rounded px-1 ${KIND_CHIP[kind]}` : "";
}

/** One box code with its hover. A text that is not a box code shows as it is. */
export function BoxCode({ code }: { code: string }) {
  const help = boxHelp(code);
  if (!help) return <>{code}</>;
  return (
    <span data-box-code={code} title={help} className={`relative cursor-help underline decoration-dotted underline-offset-2 ${chipOf(code)}`}>
      {code}
      <span className="sr-only"> ({help})</span>
    </span>
  );
}

/** A text in which each box code gets its hover. */
export function BoxText({ text }: { text: string }) {
  return (
    <>
      {splitBoxCodes(text).map((p, i) => (p.box ? <BoxCode key={i} code={p.text} /> : <Fragment key={i}>{p.text}</Fragment>))}
    </>
  );
}
