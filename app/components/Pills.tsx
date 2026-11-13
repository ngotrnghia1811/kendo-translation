// Small colored labels for list state, page state, and QA verdict.
import { verdictHelp } from "@/lib/readable-names";

// Unit VW99 (Q-A 3:27.4): colors by meaning, theme variables of app/globals.css (7 to 1 in all 5 themes, scripts/contrast-dark.mjs).
// Translated or accepted green, translating now blue, not started yet grey, failed dark red, stopped or paused amber. The word stays on the pill.
const STATE_STYLE: Record<string, string> = {
  running: "bg-state-run text-state-run-ink",
  paused: "bg-state-stop text-state-stop-ink",
  "paused after page": "bg-state-stop text-state-stop-ink",
  stopped: "bg-state-stop text-state-stop-ink",
  interrupted: "bg-state-stop text-state-stop-ink",
  completed: "bg-state-ok text-state-ok-ink",
  done: "bg-state-ok text-state-ok-ink",
  "accepted before restart": "bg-state-ok text-state-ok-ink", // unit VW94 (Q-A 3:17.5)
  "completed with failures": "bg-orange-100 text-orange-800",
  failed: "bg-state-fail text-state-fail-ink",
  waiting: "bg-state-wait text-state-wait-ink",
  skipped: "bg-state-wait text-state-wait-ink",
};

// Unit VW94 fix round (Q-A 3:17.4): label shows a plain word in place of the state value, and help goes into the hover.
// The color still follows the state value. Without label the pill shows the state value as before (other screens stay as they are).
export function StatePill({ state, label, help }: { state: string; label?: string; help?: string }) {
  const cls = STATE_STYLE[state] ?? "bg-state-wait text-state-wait-ink";
  return (
    <span data-state-pill={state} title={help} className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {label ?? state}
    </span>
  );
}

export function VerdictPill({ verdict, score }: { verdict: string | null; score?: number | null }) {
  if (!verdict) return <span className="text-muted">–</span>;
  const pass = verdict === "PASS";
  return (
    // Unit VW96 (Q-A 3:17.4): the pill keeps the word PASS or FAIL and gets a hover that says what it means.
    <span title={verdictHelp(verdict, score)} className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${pass ? "bg-state-ok text-state-ok-ink" : "bg-state-fail text-state-fail-ink"}`}>
      {verdict}
      {score !== null && score !== undefined ? <span className="font-normal">{score.toFixed(1)}</span> : null}
    </span>
  );
}
