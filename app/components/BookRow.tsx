import { lineText, progressText, money, type MonitorRow } from "@/lib/book-status-rules";
import StateLabel from "./StateLabel";
import RowButtons from "./RowButtons";

// Unit VW77a (round 80), VISION-viewer 15.24.4.3: a row has two lines. Line 1 holds the facts in fixed columns, line 2 holds one sentence in words.
// A third line shows only when an error text exists. It is red, it names the page and the box, and it is never cut.
// Unit VW77b1 (round 81): the buttons Run, Run phase 4, Pause, and Resume sit at the end of line 1 (components/RowButtons.tsx).
// No Restart button yet (unit VW77b2) and no Details link yet (unit VW77c, round 81 answer 25). A refused Restart adds its own line (round 81 answers 15 and 16).
export default function BookRow({ row, now, onChanged }: { row: MonitorRow; now: number; onChanged: () => Promise<void> }) {
  const hasRun = row.key !== "not-started" && row.key !== "unreadable";
  const pct = row.pagesTotal && row.pagesDone !== null ? Math.min(100, Math.round((row.pagesDone / row.pagesTotal) * 100)) : 0;
  const line2 = lineText(row.line2, now);
  return (
    <li data-book-row={row.slug} data-state={row.key} className="border-t border-line px-3 py-2 first:border-t-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <StateLabel row={row} />
        <div className="min-w-0 flex-1 basis-64">
          {/* "Making the Difference on the Day (mental_full)": the title and the slug (VISION 15.24.4.3, item 2). The slug stays alone if no title exists. */}
          {row.title !== row.slug ? <span className="font-medium">{row.title} </span> : null}
          <code className={"font-mono text-xs " + (row.title !== row.slug ? "text-muted" : "font-medium")}>{row.title !== row.slug ? `(${row.slug})` : row.slug}</code>
          {row.pilot ? (
            <span data-pilot-tag className="ml-2 rounded border border-line px-1.5 py-0.5 text-xs text-muted">
              pilot list
            </span>
          ) : null}
        </div>
        {hasRun ? (
          <>
            {/* Round 81 answer 22 (Q-A 2026-11-02 l27): a pilot row has an empty phase cell. */}
            <div className="w-52 text-sm" data-col="phase">
              {row.phase}
              {row.run ? <div className="text-xs text-muted">{row.run}</div> : null}
            </div>
            <div className="flex w-52 items-center gap-2 text-sm" data-col="progress">
              {row.pagesTotal && row.pagesDone !== null ? (
                <div role="progressbar" aria-label={`Pages done of ${row.slug}`} aria-valuemin={0} aria-valuemax={row.pagesTotal} aria-valuenow={row.pagesDone} aria-valuetext={progressText(row)} className="h-2 w-16 shrink-0 rounded bg-line">
                  <div className="h-2 rounded bg-accent" style={{ width: `${pct}%` }} />
                </div>
              ) : null}
              <span className="tabular-nums">{progressText(row)}</span>
            </div>
            <div className="w-16 text-right text-sm tabular-nums" data-col="cost">
              {money(row.cost)}
            </div>
            <div className="w-20 text-right text-sm tabular-nums" data-col="time">
              {row.minutes === null ? "–" : `${row.minutes} min`}
            </div>
          </>
        ) : null}
        <RowButtons row={row} onChanged={onChanged} />
      </div>
      {line2 || row.note ? (
        <p data-row-line2 className="mt-1 text-sm text-muted">
          {line2}
          {row.note ? (
            <span data-row-note className="ml-2 font-medium text-foreground">
              {row.note}
            </span>
          ) : null}
        </p>
      ) : null}
      {row.refused ? (
        <p data-row-refused className="mt-1 text-sm font-medium text-foreground">
          {row.refused}
        </p>
      ) : null}
      {row.warning ? (
        <p data-row-warning className="mt-1 text-sm text-amber-800">
          Warning: {row.warning}
        </p>
      ) : null}
      {row.error ? (
        <p data-row-error className="mt-1 text-sm break-words text-red-700">
          {row.error}
          {row.errorFile ? (
            <>
              {" "}
              <a data-error-file href={`/api/file?path=${encodeURIComponent(row.errorFile)}`} className="underline underline-offset-2">
                File: {row.errorFile}
              </a>
            </>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}
