"use client";
import Link from "next/link";
import type { RunSummary } from "@/lib/types";
import { isLive, usd } from "@/lib/format";
import { pstClockOrDash, pstDateTimeOrDash } from "@/lib/pst-more";
import { StatePill } from "./Pills";
import { LiveBadge, useLive } from "./useLive";

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
        <span className="text-sm text-muted">{data.length} lists, newest first</span>
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
                <th className="px-3 py-2 text-right">Pages</th>
                <th className="px-3 py-2 text-right">Calls</th>
                <th className="px-3 py-2 text-right">Failed</th>
                <th className="px-3 py-2 text-right">Flagged</th>
                <th className="px-3 py-2 text-right">Cost (models)</th>
                <th className="px-3 py-2 text-right">Cost (listed)</th>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.stamp} className="border-t border-line hover:bg-stone-50">
                  <td className="px-3 py-2">
                    <Link href={`/runs/${r.stamp}`} className="font-mono text-accent underline-offset-2 hover:underline">
                      {r.stamp}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {/* Unit VW77e (Q-A 3:11.3 V4): the Kind of a run-book list folder is "book-run". The colors are the pair of "chain" (blue-50 on blue-800), so no new pair. */}
                    {r.listKind === "chain" || r.listKind === "book-run" ? <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-800">{r.listKind}</span> : <span className="text-muted">list</span>}
                    <div className="mt-0.5 text-muted">
                      {r.criticMode ? `critic ${r.criticMode}` : "critic mode not stored"}
                      {r.bookJobs !== null ? `, ${r.bookJobs} book jobs` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <StatePill state={r.state} />
                    {r.state === "paused" && r.pausedSinceEpoch ? <span className="ml-2 text-xs text-muted">since {pstClockOrDash(r.pausedSinceEpoch)}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.pagesDone} / {r.pagesTotal}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.callsDone} / {r.callsTotal}
                  </td>
                  <td className={"px-3 py-2 text-right tabular-nums " + (r.callsFailed ? "font-semibold text-red-700" : "")}>{r.callsFailed}</td>
                  <td className={"px-3 py-2 text-right tabular-nums " + (r.callsFlagged ? "font-semibold text-amber-700" : "")}>{r.callsFlagged}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{usd(r.costModelsUsd)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{usd(r.costListedUsd)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{pstDateTimeOrDash(r.startedEpoch)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{pstDateTimeOrDash(r.updatedEpoch)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
