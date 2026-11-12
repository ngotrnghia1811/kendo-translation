// Small colored labels for list state, page state, and QA verdict.

const STATE_STYLE: Record<string, string> = {
  running: "bg-blue-100 text-blue-800",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  done: "bg-green-100 text-green-800",
  "accepted before restart": "bg-green-100 text-green-800", // unit VW94 (Q-A 3:17.5)
  "completed with failures": "bg-orange-100 text-orange-800",
  failed: "bg-red-100 text-red-800",
  interrupted: "bg-stone-200 text-stone-700",
  waiting: "bg-stone-100 text-stone-600",
};

// Unit VW94 fix round (Q-A 3:17.4): label shows a plain word in place of the state value, and help goes into the hover.
// The color still follows the state value. Without label the pill shows the state value as before (other screens stay as they are).
export function StatePill({ state, label, help }: { state: string; label?: string; help?: string }) {
  const cls = STATE_STYLE[state] ?? "bg-stone-100 text-stone-700";
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
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${pass ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
      {verdict}
      {score !== null && score !== undefined ? <span className="font-normal">{score.toFixed(1)}</span> : null}
    </span>
  );
}
