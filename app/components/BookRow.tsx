import { lineText, progressText, type MonitorRow } from "@/lib/book-status-rules";
import { TOKENS_SHORT_HELP, TOKENS_SHORT_LABEL } from "@/lib/tokens-view";
import { TokensShort } from "./Tokens";
import { BoxText } from "./BoxCode"; // Unit VW96 (Q-A 3:18.5): box codes in the sentences keep their place and show the readable name on hover.
import StateLabel from "./StateLabel";
import RowButtons from "./RowButtons";
import { jsonViewHref } from "@/lib/json-view";

// Unit VW77a (round 80), VISION-viewer 15.24.4.3: a row has two lines. Line 1 holds the facts in fixed columns, line 2 holds one sentence in words.
// A third line shows only when an error text exists. It is red, it names the page and the box, and it is never cut.
// Unit VW77b1 (round 81): the buttons Run, Run phase 4, Pause, and Resume sit at the end of line 1 (components/RowButtons.tsx).
// Unit VW77b2 (round 82): the buttons Restart and Clear mark sit in the same place.
// Unit VW77c (round 86): every row gets a link "Details" to the Details view `/monitor/<slug>` (round 85 answer 30 and round 86 answer 18: "VW77c Details view (Recommended)").
// The link sits outside RowButtons, so a Running row while a Restart waits keeps it with no button (round 80 answer 18: "Keep the Details link (Recommended)").
// A refused Restart adds its own line (round 81 answers 15 and 16).
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
          {/* Unit TF85 (owner round 87 answer 9, "Title opens Details (Recommended)"; VISION 15.24.4.7, line 4017: "Enter on the title opens the detail view"):
              the title and the slug are one link to the Details view `/monitor/<slug>`, the same href as the link Details (round 87 answer 8, D1: Details stays on every row).
              The link is the first element of the row in the DOM, so Tab reaches it before the buttons (RowButtons) and before the link Details. */}
          <a data-title-link href={`/monitor/${encodeURIComponent(row.slug)}`} className="underline-offset-2 hover:underline focus-visible:underline">
            {row.title !== row.slug ? <span className="font-medium">{row.title} </span> : null}
            <code className={"font-mono text-xs " + (row.title !== row.slug ? "text-muted" : "font-medium")}>{row.title !== row.slug ? `(${row.slug})` : row.slug}</code>
          </a>
          {/* Unit VW96 (Q-A 3:17.4): an article slug (8 hex digits) with no title in items.filled.jsonl says so. */}
          {row.title === row.slug && /^[0-9a-f]{8}$/.test(row.slug) ? <span className="ml-2 text-xs text-muted">(title not found)</span> : null}
          {row.pilot ? (
            <span data-pilot-tag title="A pilot list ran this book. A pilot list is a test, not a real run." className="ml-2 rounded border border-line px-1.5 py-0.5 text-xs text-muted">
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
                <div role="progressbar" aria-label={`Pages done of ${row.slug}`} aria-valuemin={0} aria-valuemax={row.pagesTotal} aria-valuenow={row.pagesDone} aria-valuetext={progressText(row)} className="h-2 w-16 shrink-0 overflow-hidden rounded bg-bar-wait">
                  <div className="h-2 bg-bar-ok" style={{ width: `${pct}%` }} />
                </div>
              ) : null}
              <span className="tabular-nums">{progressText(row)}</span>
            </div>
            {/* Unit VW93 (Q-A 3:15.2): input / output tokens in place of the cost. The column is wider for two counts with thousands separators.
                [unit default VW93] The row has no column heads, so a small grey line under the counts names them, as the run text under the phase does. */}
            <div className="w-40 text-right text-sm tabular-nums" data-col="tokens">
              <TokensShort tokens={row.tokens} />
              {row.tokens ? (
                <div className="text-xs text-muted" title={TOKENS_SHORT_HELP}>
                  {TOKENS_SHORT_LABEL}
                </div>
              ) : null}
            </div>
            <div className="w-20 text-right text-sm tabular-nums" data-col="time">
              {row.minutes === null ? "–" : `${row.minutes} min`}
            </div>
          </>
        ) : null}
        <RowButtons row={row} onChanged={onChanged} />
        <div data-col="details">
          <a data-details-link href={`/monitor/${encodeURIComponent(row.slug)}`} aria-label={`Details of ${row.slug}`} className="rounded border border-line bg-white px-3 py-1 text-sm font-medium text-foreground hover:bg-stone-50">
            Details
          </a>
        </div>
      </div>
      {line2 || row.note ? (
        <p data-row-line2 className="mt-1 text-sm text-muted">
          <BoxText text={line2} />
          {row.note ? (
            <span data-row-note className="ml-2 font-medium text-foreground">
              <BoxText text={row.note} />
            </span>
          ) : null}
        </p>
      ) : null}
      {row.refused ? (
        <p data-row-refused className="mt-1 text-sm font-medium text-foreground">
          <BoxText text={row.refused} />
        </p>
      ) : null}
      {row.warning ? (
        <p data-row-warning className="mt-1 text-sm text-amber-800">
          Warning: <BoxText text={row.warning} />
        </p>
      ) : null}
      {row.error ? (
        <p data-row-error className="mt-1 text-sm break-words text-red-700">
          <BoxText text={row.error} />
          {row.errorFile ? (
            <>
              {" "}
              {/* Unit VW89 (round 90), Q-A 3:1.7 item 3: the file path opens in the JSON viewer (before: the plain text from /api/file). */}
              <a data-error-file href={jsonViewHref(row.errorFile)} className="underline underline-offset-2">
                File: {row.errorFile}
              </a>
            </>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}
