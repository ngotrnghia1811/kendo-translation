import type { QaStage } from "@/lib/types";
import { VerdictPill } from "./Pills";
import Reasoning from "./Reasoning";
import { BoxCode } from "./BoxCode"; // Unit VW96 (Q-A 3:18.5)
// Unit VW127 (Q-A 3:122.4 row 6): the score, the penalty and the counts bold. No text changes.
import { HlCount } from "./HlSpan";
import { issueAnchor, markTone } from "@/lib/page-labels";

// Round 44 answer 13 (Q-A l142), page view: QA verdict, score, the 8 cells with row names, and issues.
// Round 47 answer 13 (Q-A 2026-10-27 l35): marks show still_in_ed with a link to the own issue of this QA box, and not_in_ed.
// Old marks (confirmed, false_alarm) show as before.
// Round 43 answer 6 / goal "fast comparison": the panel sits at the right of the text, always in view.
export default function QaPanel({ qa }: { qa: QaStage | undefined }) {
  const ownIds = new Set(qa?.issues.map((i) => i.id));
  if (!qa) return <aside className="rounded border border-line bg-white p-4 text-sm text-muted">No QA result for this stage.</aside>;
  return (
    <aside className="rounded border border-line bg-white p-4 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          <BoxCode code={qa.box} />
        </h2>
        <VerdictPill verdict={qa.verdict} score={qa.score} />
      </div>
      <p className="mt-1 text-xs text-muted">
        Page score <HlCount>{qa.score?.toFixed(1) ?? "–"}</HlCount> of 10. Penalty <HlCount>{qa.penalty?.toFixed(1) ?? "–"}</HlCount>.
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

      <h3 className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Issues (<HlCount>{qa.issues.length}</HlCount>)</h3>
      {qa.issues.length === 0 ? (
        <p className="text-xs text-muted">No issue found.</p>
      ) : (
        <ul className="space-y-3">
          {qa.issues.map((i) => (
            <li key={i.id} id={issueAnchor(i.id)} className="scroll-mt-4 rounded border border-line p-2 target:border-accent">
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
            Marks (<HlCount>{qa.marks.length + qa.programMarks.length}</HlCount>)
          </summary>
          <ul className="mt-2 space-y-2">
            {[...qa.marks, ...qa.programMarks].map((m, k) => (
              <li key={k} className="text-xs">
                <span className="font-mono">{m.target}</span> <span className={"font-semibold " + markTone(m.mark)}>{m.mark}</span>
                {m.ownIssueId ? (
                  <>
                    {" "}
                    <span className="text-muted">own issue</span>{" "}
                    {ownIds.has(m.ownIssueId) ? (
                      <a href={`#${issueAnchor(m.ownIssueId)}`} className="font-mono text-accent underline">
                        {m.ownIssueId}
                      </a>
                    ) : (
                      <span className="font-mono">{m.ownIssueId}</span>
                    )}
                  </>
                ) : null}
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
