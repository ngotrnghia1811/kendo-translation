import type { MonitorRow } from "@/lib/book-status-rules";

// Unit VW77a (round 80), VISION-viewer 15.24.4.2: "A state label is a symbol and a word. Color is never the only sign. The symbols differ in shape."
// The color pairs are pairs that scripts/contrast-dark.mjs tests already: running (blue), paused chip (amber), interrupted (stone), FAIL pill (red),
// PASS pill (green), waiting (stone).
const STYLE: Record<MonitorRow["key"], string> = {
  running: "bg-blue-100 text-blue-800",
  "running-pause": "bg-blue-100 text-blue-800",
  stopped: "bg-stone-200 text-stone-700",
  unexpected: "bg-red-100 text-red-800",
  failure: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
  "not-started": "bg-stone-100 text-stone-600",
  "mark-waiting": "bg-amber-100 text-amber-800",
  unreadable: "bg-red-100 text-red-800",
};

export default function StateLabel({ row }: { row: Pick<MonitorRow, "key" | "label" | "symbol"> }) {
  return (
    <span data-state-label={row.key} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STYLE[row.key]}`}>
      <span aria-hidden="true">{row.symbol}</span>
      {row.label}
    </span>
  );
}
