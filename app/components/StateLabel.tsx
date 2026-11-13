import type { MonitorRow } from "@/lib/book-status-rules";

// Unit VW77a (round 80), VISION-viewer 15.24.4.2: "A state label is a symbol and a word. Color is never the only sign. The symbols differ in shape."
// Unit VW99 (Q-A 3:27.4): the colors by meaning are theme variables of app/globals.css, tested at 7 to 1 in all 5 themes by scripts/contrast-dark.mjs:
// running blue, stopped amber, failure dark red, completed green, not started grey. The mark that waits keeps its tested amber pair.
const STYLE: Record<MonitorRow["key"], string> = {
  running: "bg-state-run text-state-run-ink",
  "running-pause": "bg-state-run text-state-run-ink",
  stopped: "bg-state-stop text-state-stop-ink",
  unexpected: "bg-state-fail text-state-fail-ink",
  failure: "bg-state-fail text-state-fail-ink",
  completed: "bg-state-ok text-state-ok-ink",
  "not-started": "bg-state-wait text-state-wait-ink",
  "mark-waiting": "bg-amber-100 text-amber-800",
  unreadable: "bg-state-fail text-state-fail-ink",
};

export default function StateLabel({ row }: { row: Pick<MonitorRow, "key" | "label" | "symbol"> }) {
  return (
    <span data-state-label={row.key} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STYLE[row.key]}`}>
      <span aria-hidden="true">{row.symbol}</span>
      {row.label}
    </span>
  );
}
