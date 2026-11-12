import { PHASE2_LINE } from "@/lib/book-status-rules";
import { phase2Text } from "@/lib/phase2-row";
import type { Phase2Line, Phase2View } from "@/lib/phase2-row";
import { PHASE2_STATE_HELP, phase2Overrides } from "@/lib/phase2-articles";
import type { Phase2ArticlesView } from "@/lib/phase2-articles";
import { BoxText } from "./BoxCode";

const STEPS_LINE: Phase2Line = { key: "steps", text: "Step view of the whole run, page by page and step by step: ", links: [{ text: "Steps", href: "/monitor/phase-2" }] };

// Unit VW91 (round 91), Q-A 3:4.6 (2026-11-11 10:42 PST): "Small live row now (VW91)". Read only: no button (the owner runs phase 2 in his terminal, Q-A 3:3.7).
// It replaces the fixed line "Phase 2 (paired dataset): no run record yet." when book-store/paired-dataset/status.json exists. Without the file the old line stays.
// The text comes from phase2Text (lib/phase2-row.ts), so a node test checks the same words. Colors: only classes that scripts/contrast-dark.mjs already tests.
// Unit VW94 (round 91), Q-A 3:17.4 note "Annotate the names intuitively and properly": the state word gets plain words, the page IDs get the article title
// and "page 1 of 3", and a new line holds the link "Run view". The texts come from phase2Overrides (lib/phase2-articles.ts).
// Fix round, Q-A 3:18.5 "Keep codes, explain on hover": a box code in a line stays a code and gets a hover (BoxText, components/BoxCode.tsx).
export default function Phase2Row({ view, now, articles }: { view: Phase2View | null | undefined; now: number; articles?: Phase2ArticlesView | null }) {
  if (!view) {
    return (
      <p data-phase2-line className="text-sm text-muted">
        {PHASE2_LINE}
      </p>
    );
  }
  const t = phase2Text(view, now);
  const over = articles ? phase2Overrides(articles, now, view.pagesDone, view.pagesTotal) : {};
  const lines: Phase2Line[] = [];
  for (const l of t.lines) {
    if (l.key === "links" && over["run-view"]) lines.push({ key: "run-view", ...over["run-view"] });
    // Unit VW95 (round 91), Q-A 3:17.6: the link "Steps" opens the step view /monitor/phase-2 (the whole run, page by page and step by step).
    if (l.key === "links") lines.push(STEPS_LINE);
    const o = l.key === "error" ? undefined : over[l.key];
    lines.push(o ? { ...l, text: o.text, links: o.links ?? l.links } : l);
  }
  const help = PHASE2_STATE_HELP[view.key];
  return (
    <div data-phase2-row data-phase2-state={view.key} className="rounded border border-line bg-white px-3 py-2 text-sm">
      <p data-phase2-title className="font-semibold">
        {t.lead}{" "}
        <span aria-hidden="true">{t.symbol}</span> {t.label}
        {help ? (
          <span data-phase2-state-help className="font-normal text-muted">
            : {help}
          </span>
        ) : null}
      </p>
      <ul className="mt-1 space-y-0.5 text-muted">
        {lines.map((l) => (
          <li key={l.key} data-phase2-item={l.key} className={l.error ? "break-words text-red-700" : undefined}>
            <BoxText text={l.text} />
            {l.links?.map((k, i) => (
              <span key={k.href}>
                {i > 0 ? " · " : l.text.endsWith(" ") ? "" : " "}
                <a data-phase2-link href={k.href} className="underline underline-offset-2">
                  {k.text}
                </a>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
