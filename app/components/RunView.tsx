"use client";
import Link from "next/link";
import type { RunDetail } from "@/lib/types";
import { dateTime, isLive, minutes, usd } from "@/lib/format";
import { StatePill, VerdictPill } from "./Pills";
import { LiveBadge, useLive } from "./useLive";
import PauseButton from "./PauseButton";

// Round 44 answer 13 (Q-A l142): a list opens a run view with one row per page: state, calls, USD, minutes,
// QA_3 verdict and score, link to the page view. Viewer goal: few steps from a run to a page text.
export default function RunView({ initial }: { initial: RunDetail }) {
  const { data: run, refresh, live } = useLive<RunDetail>(`/api/runs/${initial.stamp}`, initial, (d) => isLive(d.state));
  return (
    <section>
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← All runs
      </Link>
      <div className="mt-2 mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <h1 className="text-xl font-semibold font-mono">{run.stamp}</h1>
        <StatePill state={run.state} />
        <LiveBadge live={live} />
      </div>
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <Stat label="Pages" value={`${run.pagesDone} / ${run.pagesTotal}`} />
        <Stat label="Calls" value={`${run.callsDone} / ${run.callsTotal}`} />
        <Stat label="Failed" value={String(run.callsFailed)} warn={run.callsFailed > 0} />
        <Stat label="Flagged" value={String(run.callsFlagged)} warn={run.callsFlagged > 0} />
        <Stat label="Cost (models)" value={usd(run.costModelsUsd)} />
        <Stat label="Cost (listed)" value={usd(run.costListedUsd)} />
        <Stat label="Started" value={dateTime(run.startedEpoch)} />
        <Stat label="Updated" value={dateTime(run.updatedEpoch)} />
      </div>
      <div className="mb-4">
        <PauseButton stamp={run.stamp} state={run.state} fileExists={run.pauseFileExists} pausedSinceEpoch={run.pausedSinceEpoch} onDone={refresh} />
      </div>
      <div className="overflow-x-auto rounded border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Page</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2 text-right">Calls</th>
              <th className="px-3 py-2 text-right">USD</th>
              <th className="px-3 py-2 text-right">Minutes</th>
              <th className="px-3 py-2">QA_3</th>
            </tr>
          </thead>
          <tbody>
            {run.pages.map((p) => (
              <tr key={p.pageId} className="border-t border-line hover:bg-stone-50">
                <td className="px-3 py-2">
                  {p.runFolder ? (
                    <Link href={p.href} className="font-mono text-accent underline-offset-2 hover:underline">
                      {p.pageId}
                    </Link>
                  ) : (
                    <span className="font-mono text-muted">{p.pageId}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted">{p.kind}</td>
                <td className="px-3 py-2">
                  <StatePill state={p.state} />
                  {p.running.length > 0 ? <div className="mt-1 text-xs text-muted">{p.running.join(", ")}</div> : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {p.callsDone} / {p.callsTotal}
                  {p.callsFailed ? <span className="ml-1 font-semibold text-red-700">({p.callsFailed} failed)</span> : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{usd(p.usd)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{minutes(p.minutes === null ? null : p.minutes * 60)}</td>
                <td className="px-3 py-2">
                  <VerdictPill verdict={p.qa3Verdict} score={p.qa3Score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={"tabular-nums " + (warn ? "font-semibold text-red-700" : "")}>{value}</div>
    </div>
  );
}
