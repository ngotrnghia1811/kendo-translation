"use client";
import Link from "next/link";
import type { RunSummary } from "@/lib/types";
import { clock, dateTime, isLive, usd } from "@/lib/format";
import { StatePill } from "./Pills";
import { LiveBadge, useLive } from "./useLive";

// Round 44 answer 13 (Q-A l142), tab Runs: "runs with state and cost". Newest first.
// Viewer goals: fast lookup (one table, state and cost in one row) and few steps (one click opens a run).
// Round 48 answer 9 (Q-A 2026-10-27 l55): the table also shows the list kind, the critic mode and the book jobs.
export default function RunsTable({ initial }: { initial: RunSummary[] }) {
  const { data, live } = useLive<RunSummary[]>("/api/runs", initial, (d) => d.some((r) => isLive(r.state)));
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-4">
        <h1 className="text-xl font-semibold">Runs</h1>
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
                    {r.listKind === "chain" ? <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-800">chain</span> : <span className="text-muted">list</span>}
                    <div className="mt-0.5 text-muted">
                      {r.criticMode ? `critic ${r.criticMode}` : "critic mode not stored"}
                      {r.bookJobs !== null ? `, ${r.bookJobs} book jobs` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <StatePill state={r.state} />
                    {r.state === "paused" && r.pausedSinceEpoch ? <span className="ml-2 text-xs text-muted">since {clock(r.pausedSinceEpoch)}</span> : null}
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
                  <td className="px-3 py-2 whitespace-nowrap">{dateTime(r.startedEpoch)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{dateTime(r.updatedEpoch)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
