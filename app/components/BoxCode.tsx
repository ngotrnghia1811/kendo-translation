import { boxHelp } from "@/lib/box-names";
import { hlSplit, stageOf } from "@/lib/hl-rules";
import { HlSpan, STAGE_CHIP } from "./HlSpan";

// Unit VW94 fix round (round 91). Owner pick Q-A 3:18.5 (2026-11-11): "Keep codes, explain on hover".
// The screen shows the code ("TL_2"). The hover (title) shows the full name. A dotted underline shows that the code has a hover,
// the same pattern as HtvMarkedText.tsx. A visually hidden text gives the full name to a screen reader.
// The class "relative" keeps that hidden text inside the code, so it adds no sideways scroll inside a table that scrolls in its own box.

// Unit VW99 (Q-A 3:27.4): a chip colored by the box kind: TS grey, TL blue, ED green, QA purple. The code text stays on the chip,
// so the color is never the only sign. The colors are theme variables of app/globals.css (scripts/contrast-dark.mjs tests them at 7 to 1).
// Unit VW127 (Q-A 3:122.4 row 3): the owner set new stage colors: TS teal, TL blue, ED purple, QA orange. A critic of a box (box-critic.ED_3) gets the same color
// with a dashed border. The chip classes hl-box-* sit in app/globals.css (TL reuses --chip-tl and --chip-tl-ink; the other three have their own --hl-* variables).
// Exported for components/Named.tsx (GroupCode). Full class names, so that Tailwind finds them.
export const KIND_CHIP: Record<string, string> = STAGE_CHIP;

function chipOf(code: string): string {
  const kind = /(TS|TL|ED|QA)(?:_\d|$)/.exec(code)?.[1];
  // Unit VW127: the code of a critic call starts with "box-critic." (lib/box-names.ts). It gets the dashed border (class hl-critic).
  return kind ? `rounded px-1 ${KIND_CHIP[kind]}${code.startsWith("box-critic.") ? " hl-critic" : ""}` : "";
}

/** One box code with its hover. A text that is not a box code shows as it is. */
export function BoxCode({ code }: { code: string }) {
  const help = boxHelp(code);
  if (!help) return <>{code}</>;
  const critic = code.startsWith("box-critic.");
  return (
    <span data-box-code={code} title={help} data-hl={critic ? "critic" : "box"} data-stage={stageOf(code) ?? undefined} className={`relative cursor-help underline decoration-dotted underline-offset-2 ${chipOf(code)}`}>
      {code}
      <span className="sr-only"> ({help})</span>
    </span>
  );
}

/** Unit VW127: the words "critic of box ED_3" (or "critic of ED_3") as one chip with the dashed border. The hover is the help of the box in it. */
function CriticWords({ text }: { text: string }) {
  const box = /(?:TS|TL|ED|QA)_[0-3]/.exec(text)?.[0] ?? "";
  const help = boxHelp(box);
  const stage = stageOf(text);
  return (
    <span data-box-code={box} title={help ? `critic of box ${box}. ${help}` : undefined} data-hl="critic" data-stage={stage ?? undefined} className={`relative cursor-help underline decoration-dotted underline-offset-2 rounded px-1 ${stage ? KIND_CHIP[stage] : ""} hl-critic`}>
      {text}
      {help ? <span className="sr-only"> ({help})</span> : null}
    </span>
  );
}

/**
 * A text in which each box code gets its hover and its stage color.
 * Unit VW127 (Q-A 3:122.4 rows 2 to 7): the same text is also cut into page IDs, times, durations, counts and stop reasons (lib/hl-rules.ts hlSplit), each with its color.
 * The text stays byte for byte the same: the parts joined give the old text.
 */
export function BoxText({ text }: { text: string }) {
  return (
    <>
      {hlSplit(text).map((s, i) =>
        s.kind === "box" || (s.kind === "critic" && boxHelp(s.text)) ? (
          <BoxCode key={i} code={s.text} />
        ) : s.kind === "critic" ? (
          <CriticWords key={i} text={s.text} />
        ) : (
          <HlSpan key={i} seg={s} />
        ),
      )}
    </>
  );
}
