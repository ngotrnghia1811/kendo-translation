// Small colored labels for list state, page state, and QA verdict.

const STATE_STYLE: Record<string, string> = {
  running: "bg-blue-100 text-blue-800",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  done: "bg-green-100 text-green-800",
  "completed with failures": "bg-orange-100 text-orange-800",
  failed: "bg-red-100 text-red-800",
  interrupted: "bg-stone-200 text-stone-700",
  waiting: "bg-stone-100 text-stone-600",
};

export function StatePill({ state }: { state: string }) {
  const cls = STATE_STYLE[state] ?? "bg-stone-100 text-stone-700";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>{state}</span>;
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
