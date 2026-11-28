import type { ReactNode } from "react";
import { aliveTone, failedTone, hlSplit, type HlSeg, type HlTone } from "@/lib/hl-rules";

// Color highlight pieces of the Monitor pages (unit VW127, Q-A 3:122.4 rows 1, 2, 4, 5, 6, 7, 8).
// Every piece is a <span> with the attribute data-hl (the kind) and, for a tone, data-hl-tone. The colors are CSS variables of app/globals.css
// (class hl-*, one value for each of the 5 themes, tested by scripts/vw127-test.mjs). No color literal here. The text of a piece is never changed.
// Box codes and critics (row 3) with a hover name are drawn by components/BoxCode.tsx (BoxText). Where the old text had no hover, HlText draws the same
// chip with the stage color and no hover text, so the text of the page stays the same.
// Pure components: no hook, no browser API, so a server page and a client component can use them.

/** Row 3: the chip classes of the 4 stages (TS teal, TL blue, ED purple, QA orange). Full class names, so that Tailwind finds them. */
export const STAGE_CHIP: Record<string, string> = {
  TS: "hl-box hl-box-ts",
  TL: "hl-box hl-box-tl",
  ED: "hl-box hl-box-ed",
  QA: "hl-box hl-box-qa",
};

/** One segment: page chip, box chip (no hover), time, duration, count, failed count, reason, last sign of life, plain. */
export function HlSpan({ seg }: { seg: HlSeg }) {
  switch (seg.kind) {
    case "plain":
      return <>{seg.text}</>;
    case "box":
    case "critic":
      return (
        <span data-hl={seg.kind} data-stage={seg.stage} className={`rounded px-1 ${seg.stage ? STAGE_CHIP[seg.stage] : ""}${seg.kind === "critic" ? " hl-critic" : ""}`}>
          {seg.text}
        </span>
      );
    case "reason":
    case "alive":
    case "failed":
      return (
        <span data-hl={seg.kind} data-hl-tone={seg.tone ?? "none"} className={`hl-${seg.kind}`}>
          {seg.text}
        </span>
      );
    default:
      return (
        <span data-hl={seg.kind} className={`hl-${seg.kind}`}>
          {seg.text}
        </span>
      );
  }
}

/** Row 1: a book title, bold, in the accent color. */
export function HlTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span data-hl="title" className={"hl-title" + (className ? " " + className : "")}>
      {children}
    </span>
  );
}

/** Row 8: a folder name or a raw ID, gray monospace, small. */
export function HlFolder({ children, title, className }: { children: ReactNode; title?: string; className?: string }) {
  return (
    <span data-hl="folder" title={title} className={"hl-folder" + (className ? " " + className : "")}>
      {children}
    </span>
  );
}

/** Row 4: a clock time or a date (PST), green. */
export function HlTime({ children }: { children: ReactNode }) {
  return (
    <span data-hl="time" className="hl-time">
      {children}
    </span>
  );
}

/** Row 4: a length of time, bold. */
export function HlDuration({ children }: { children: ReactNode }) {
  return (
    <span data-hl="duration" className="hl-duration">
      {children}
    </span>
  );
}

/** Row 6: a count, bold. */
// Unit VW132 (Q-A 3:140.3): the optional `title` is the hover text of "done / total" when a page skips box-critic calls. Without it the span has no title attribute.
export function HlCount({ children, title }: { children: ReactNode; title?: string | null }) {
  return (
    <span data-hl="count" className="hl-count" title={title ?? undefined}>
      {children}
    </span>
  );
}

/** Row 6: a failed count. Above 0 it is bold and red, else bold only (it is still a count). */
export function HlFailed({ n, children }: { n: number | null | undefined; children?: ReactNode }) {
  const tone: HlTone = failedTone(n);
  if (tone === "none") return <HlCount>{children ?? String(n ?? "–")}</HlCount>;
  return (
    <span data-hl="failed" data-hl-tone={tone} className="hl-failed">
      {children ?? String(n)}
    </span>
  );
}

/** Row 5: the text of an age with the color of the last sign of life, from the exact age in seconds (null: unknown, gray). */
export function HlAlive({ ageSeconds, children }: { ageSeconds: number | null; children: ReactNode }) {
  return (
    <span data-hl="alive" data-hl-tone={aliveTone(ageSeconds)} className="hl-alive">
      {children}
    </span>
  );
}

/** Row 6: a line of parts "1 needs attention · 0 waiting for a run · 2 running": the number at the start of each part is bold. The text stays the same. */
export function HlNumberParts({ text, separator = " · " }: { text: string; separator?: string }) {
  return (
    <>
      {text.split(separator).map((part, i) => {
        const m = /^(\d[\d,]*)([\s\S]*)$/.exec(part);
        return (
          <span key={i}>
            {i > 0 ? separator : ""}
            {m ? (
              <>
                <HlCount>{m[1]}</HlCount>
                {m[2]}
              </>
            ) : (
              part
            )}
          </span>
        );
      })}
    </>
  );
}

/** Row 2: a page ID (p023) as a small blue chip, for example in the "Page" column. */
export function HlPage({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span data-hl="page" title={title} className="hl-page">
      {children}
    </span>
  );
}

/**
 * A finished text cut into colored pieces (lib/hl-rules.ts hlSplit): box chips, page chips, times, durations, counts, reasons.
 * Use it where the old screen showed the text as plain text. A box chip here has no hover text (BoxText in components/BoxCode.tsx adds the hover).
 * The pieces joined give the text byte for byte.
 */
export function HlText({ text }: { text: string }) {
  return (
    <>
      {hlSplit(text).map((s, i) => (
        <HlSpan key={i} seg={s} />
      ))}
    </>
  );
}

/** Row 4: a text that is a PST time ("2026-11-22 17:29 PST") is green. Another text (a dash, a note) stays as it is. */
export function HlTimeText({ text }: { text: string }) {
  return / PST(?: \(UTC-8\))?$/.test(text) ? <HlTime>{text}</HlTime> : <>{text}</>;
}
