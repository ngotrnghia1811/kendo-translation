import type { QaStage } from "@/lib/types";
import { VerdictPill } from "./Pills";
import Reasoning from "./Reasoning";

// Round 44 answer 13 (Q-A l142), page view: QA verdict, score, the 8 cells with row names, and issues.
// Round 43 answer 6 / goal "fast comparison": the panel sits at the right of the text, always in view.
export default function QaPanel({ qa }: { qa: QaStage | undefined }) {
  if (!qa) return <aside className="rounded border border-line bg-white p-4 text-sm text-muted">No QA result for this stage.</aside>;
  return (
    <aside className="rounded border border-line bg-white p-4 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{qa.box}</h2>
        <VerdictPill verdict={qa.verdict} score={qa.score} />
      </div>
      <p className="mt-1 text-xs text-muted">
        Page score {qa.score?.toFixed(1) ?? "–"} of 10. Penalty {qa.penalty?.toFixed(1) ?? "–"}.
      </p>

      <h3 className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Cells</h3>
      <ul className="space-y-0.5">
        {qa.cells.map((c) => (
          <li key={c.row} className="flex items-center justify-between gap-2">
            <span className={c.value > 0 ? "font-medium" : "text-muted"}>
              {c.row}. {c.name}
            </span>
            <span className={"tabular-nums rounded px-1.5 " + (c.value > 0 ? "bg-red-100 text-red-800 font-semibold" : "text-muted")}>{c.value}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Issues ({qa.issues.length})</h3>
      {qa.issues.length === 0 ? (
        <p className="text-xs text-muted">No issue found.</p>
      ) : (
        <ul className="space-y-3">
          {qa.issues.map((i) => (
            <li key={i.id} className="rounded border border-line p-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="font-mono">{i.id}</span>
                <span>
                  row {i.row ?? "–"}, severity {i.severity ?? "–"}
                  {i.suspectedStage ? `, stage ${i.suspectedStage}` : ""}
                </span>
              </div>
              <div className="mt-1 text-xs">
                <span className="font-ja">{i.jaPiece}</span> → <span className="font-serif">{i.enPiece}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed">{i.reason}</p>
            </li>
          ))}
        </ul>
      )}

      {qa.marks.length + qa.programMarks.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted">
            Marks ({qa.marks.length + qa.programMarks.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {[...qa.marks, ...qa.programMarks].map((m, k) => (
              <li key={k} className="text-xs">
                <span className="font-mono">{m.target}</span> <span className="font-semibold">{m.mark}</span>
                <p className="leading-relaxed text-muted">{m.reason}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <Reasoning text={qa.reasoning} label={qa.box} />
    </aside>
  );
}
