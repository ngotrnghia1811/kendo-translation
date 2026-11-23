"use client";
import Link from "next/link";
import type { RunSummary } from "@/lib/types";
import { isLive } from "@/lib/format";
import { TOKENS_SHORT_HELP, TOKENS_SHORT_LABEL } from "@/lib/tokens-view";
import { TokensShort } from "./Tokens";
import { pstClockOrDash, pstDateTimeOrDash } from "@/lib/pst-more";
import { ListStatePill, RawId } from "./Named";
import { bookJobsText, criticModeWord, listTitle } from "@/lib/readable-names";
import { listKindWord } from "@/lib/run-view-words";
import { LiveBadge, useLive } from "./useLive";
// Unit VW127 (Q-A 3:122.4 rows 4 and 6): times green, counts bold, a failed count above 0 red. No text changes.
import { HlCount, HlFailed, HlText, HlTimeText } from "./HlSpan";

// Unit VW77a (round 80): the tab is called Lists and sits at /runs. Round 44 answer 13 (Q-A l142), tab Runs: "runs with state and cost". Newest first.
// Viewer goals: fast lookup (one table, state and cost in one row) and few steps (one click opens a run).
// Round 48 answer 9 (Q-A 2026-10-27 l55): the table also shows the list kind, the critic mode and the book jobs.
// Unit VW77b1 (round 81 answer 17, Q-A 2026-11-02 l22): "PST there too". Times show as "2026-10-28 23:50 PST", like the Monitor dashboard.
export default function RunsTable({ initial }: { initial: RunSummary[] }) {
  const { data, live } = useLive<RunSummary[]>("/api/runs", initial, (d) => d.some((r) => isLive(r.state)));
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-4">
        <h1 className="text-xl font-semibold">Lists</h1>
        <span className="text-sm text-muted">
          <HlCount>{data.length} lists</HlCount>, newest first
        </span>
        <LiveBadge live={live} />
      </div>
      {data.length === 0 ? (
        <p className="text-muted">No list folder found under pilot-run/lists.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">List</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2 text-right" title="Pages translated / pages in the list">Pages</th>
                <th className="px-3 py-2 text-right" title="Model calls done / model calls in the list">Calls</th>
                <th className="px-3 py-2 text-right" title="Model calls that failed">Failed</th>
                <th className="px-3 py-2 text-right" title="Model calls that carry a flag">Flagged</th>
                {/* Unit VW93 (Q-A 3:15.2 "Short in tables, all 5 in details"): input / output tokens in place of the two cost columns. */}
                <th className="px-3 py-2 text-right whitespace-nowrap" title={TOKENS_SHORT_HELP}>{TOKENS_SHORT_LABEL}</th>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.stamp} className="border-t border-line hover:bg-stone-50">
                  <td className="px-3 py-2">
                    {/* Unit VW96 (Q-A 3:17.4): the plain name first, the raw stamp in small grey text (the folder name under pilot-run/lists). */}
                    <Link href={`/runs/${r.stamp}`} className="text-accent underline-offset-2 hover:underline">
                      {listTitle(r.stamp)}
                    </Link>
                    <div>
                      <RawId>{r.stamp}</RawId>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {/* Unit VW77e (Q-A 3:11.3 V4): the Kind of a run-book list folder is "book-run". The colors are the pair of "chain" (blue-50 on blue-800), so no new pair. */}
                    {/* Unit VW96 (Q-A 3:17.4): the kind, the critic mode and the book jobs in plain words. The hover names the stored key and value. */}
                    {r.phase2List || r.listKind === "chain" || r.listKind === "book-run" ? (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-800" title={`List kind "${r.listKind}" (key kind of progress.json and list.json)`}>
                        {listKindWord(r.listKind, !!r.phase2List)}
                      </span>
                    ) : (
                      <span className="text-muted" title={`List kind "${r.listKind}" (key kind of progress.json and list.json)`}>
                        {listKindWord(r.listKind, false)}
                      </span>
                    )}
                    <div className="mt-0.5 text-muted">
                      {r.criticMode || r.bookJobs !== null ? (
                        <>
                          <span title={criticModeWord(r.criticMode).help}>{criticModeWord(r.criticMode).label}</span>, <HlText text={bookJobsText(r.bookJobs)} />
                        </>
                      ) : (
                        <span title={criticModeWord(null).help}>Critic mode and book jobs not stored (older run)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <ListStatePill state={r.state} />
                    {r.state === "paused" && r.pausedSinceEpoch ? <span className="ml-2 text-xs text-muted">since <HlTimeText text={pstClockOrDash(r.pausedSinceEpoch)} /></span> : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <HlCount>
                      {r.pagesDone} / {r.pagesTotal}
                    </HlCount>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <HlCount>
                      {r.callsDone} / {r.callsTotal}
                    </HlCount>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <HlFailed n={r.callsFailed}>{r.callsFailed}</HlFailed>
                  </td>
                  <td className={"px-3 py-2 text-right tabular-nums " + (r.callsFlagged ? "font-semibold text-amber-700" : "")}>
                    <HlCount>{r.callsFlagged}</HlCount>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                    <TokensShort tokens={r.tokens} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <HlTimeText text={pstDateTimeOrDash(r.startedEpoch)} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <HlTimeText text={pstDateTimeOrDash(r.updatedEpoch)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
