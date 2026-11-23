import { PHASE2_LINE, agoText } from "@/lib/book-status-rules";
import { phase2Text } from "@/lib/phase2-row";
import type { Phase2Line, Phase2View } from "@/lib/phase2-row";
import { PHASE2_STATE_HELP, pageText, phase2Overrides } from "@/lib/phase2-articles";
import type { Phase2ArticlesView } from "@/lib/phase2-articles";
// Unit VW103 (round 91), Q-A 3:36.4: the running update point. The lines come from lib/update-live.ts, so a node test checks the same words.
import { updateLines } from "@/lib/update-live";
import { BoxText } from "./BoxCode";
// Unit VW127 (Q-A 3:122.4 row 5): the age of the last sign of life gets its color from the exact heartbeat age (the text stays the same).
import { HlAlive } from "./HlSpan";

const STEPS_LINE: Phase2Line = { key: "steps", text: "Step view of the whole run, page by page and step by step: ", links: [{ text: "Steps", href: "/monitor/phase-2" }] };
// Unit VW106 (Q-A 3:64.5 row 3): the vector map of the prompt points, one map for each box type, read only.
const VECTOR_MAP_LINE: Phase2Line = { key: "vector-map", text: "Points of the stored prompt versions, one map for each box type: ", links: [{ text: "Vector map", href: "/monitor/vector-map" }] };

// Unit VW91 (round 91), Q-A 3:4.6 (2026-11-11 10:42 PST): "Small live row now (VW91)". Read only: no button (the owner runs phase 2 in his terminal, Q-A 3:3.7).
// It replaces the fixed line "Phase 2 (paired dataset): no run record yet." when book-store/paired-dataset/status.json exists. Without the file the old line stays.
// The text comes from phase2Text (lib/phase2-row.ts), so a node test checks the same words. Colors: only classes that scripts/contrast-dark.mjs already tests.
// Unit VW94 (round 91), Q-A 3:17.4 note "Annotate the names intuitively and properly": the state word gets plain words, the page IDs get the article title
// and "page 1 of 3", and a new line holds the link "Run view". The texts come from phase2Overrides (lib/phase2-articles.ts).
// Fix round, Q-A 3:18.5 "Keep codes, explain on hover": a box code in a line stays a code and gets a hover (BoxText, components/BoxCode.tsx).
// Unit VW99 (Q-A 3:27.4): the state of the phase 2 run in a pill colored by meaning, the same theme variables as components/StateLabel.tsx.
// A local map, because scripts/phase2-row-test.mjs compiles this file with components/BoxCode.tsx only.
const PHASE2_STATE_STYLE: Record<string, string> = {
  running: "bg-state-run text-state-run-ink",
  "running-pause": "bg-state-run text-state-run-ink",
  stopped: "bg-state-stop text-state-stop-ink",
  failure: "bg-state-fail text-state-fail-ink",
  unexpected: "bg-state-fail text-state-fail-ink",
  unreadable: "bg-state-fail text-state-fail-ink",
  completed: "bg-state-ok text-state-ok-ink",
  "not-started": "bg-state-wait text-state-wait-ink",
};

/** Readable name of the page of the update point: "<title>, page 4 of 5 (0a9f6ca7/p004)". Without the list of the run, only the page ID. */
function updatePageLabel(page: string | null, articles: Phase2ArticlesView | null | undefined): string | null {
  if (!page) return null;
  if (!articles) return page;
  return pageText(page, articles.order, new Map(articles.articles.map((a) => [a.shortId, a.name])));
}

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
  // Unit VW103: the update point shows after the progress line, before the wait and the sign of life. The wait lines come from the key "waiting" of the row itself.
  const update = view.update ? updateLines(view.update, now, { pageLabel: updatePageLabel(view.update.page, articles), place: "row", withWait: false }) : [];
  let updatePlaced = false;
  const lines: Phase2Line[] = [];
  for (const l of t.lines) {
    if (!updatePlaced && update.length > 0 && (l.key === "waiting" || l.key === "alive" || l.key === "last-accepted")) {
      lines.push(...update);
      updatePlaced = true;
    }
    if (l.key === "links" && over["run-view"]) lines.push({ key: "run-view", ...over["run-view"] });
    // Unit VW95 (round 91), Q-A 3:17.6: the link "Steps" opens the step view /monitor/phase-2 (the whole run, page by page and step by step).
    if (l.key === "links") lines.push(STEPS_LINE, VECTOR_MAP_LINE);
    const o = l.key === "error" ? undefined : over[l.key];
    lines.push(o ? { ...l, text: o.text, links: o.links ?? l.links } : l);
  }
  const help = PHASE2_STATE_HELP[view.key];
  return (
    <div data-phase2-row data-phase2-state={view.key} className="rounded border border-line bg-white px-3 py-2 text-sm">
      <p data-phase2-title className="font-semibold">
        {t.lead}{" "}
        <span data-phase2-state-pill className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ${PHASE2_STATE_STYLE[view.key] ?? PHASE2_STATE_STYLE["not-started"]}`}>
          <span aria-hidden="true">{t.symbol}</span> {t.label}
        </span>
        {help ? (
          <span data-phase2-state-help className="font-normal text-muted">
            : {help}
          </span>
        ) : null}
      </p>
      <ul className="mt-1 space-y-0.5 text-muted">
        {lines.map((l) => (
          <li key={l.key} data-phase2-item={l.key} className={l.error ? "break-words text-red-700" : undefined}>
            {l.key === "alive" && view.heartbeat !== null && l.text === `Last sign of life ${agoText(view.heartbeat, now, true)}.` ? (
              <>
                Last sign of life <HlAlive ageSeconds={now - view.heartbeat}>{agoText(view.heartbeat, now, true)}</HlAlive>.
              </>
            ) : (
              <BoxText text={l.text} />
            )}
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
