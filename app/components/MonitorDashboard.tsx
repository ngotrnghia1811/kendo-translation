"use client";
import { useEffect, useState } from "react";
import type { MonitorData, GroupName } from "@/lib/book-status-rules";
import { NO_RUN_TEXT, PHASE2_LINE, agoText, emptyLine, groupRows, groupShows, tabTitle } from "@/lib/book-status-rules";
import { pstClockSeconds } from "@/lib/format";
import { useLive } from "./useLive";
import { useGroupOpen } from "./monitor-open-store";
import BookRow from "./BookRow";

// Unit VW77a (round 80), VISION-viewer 15.24.4: the Monitor dashboard "/" on this Mac. It shows one row per book, in six groups.
// This unit builds the read side: no button, no Details view, no Run settings page.
const GROUP_SYMBOL: Record<GroupName, string> = {
  "Needs attention": "▲",
  "Waiting for a run": "◇",
  Running: "●",
  Stopped: "■",
  Completed: "✓",
  "Not started": "○",
};

// [unit default VW77a] The page polls every 3 s while the tab is visible, with or without a live row, so a new mark and a start show without a click.
// VISION 15.24.4.6 polls only while a row runs. Other option: poll only then and use the button Refresh.
const POLL_BANNER_AFTER = 3;

function Group({ group, rows, data, now }: { group: GroupName; rows: ReturnType<typeof groupRows>[number]["rows"]; data: MonitorData; now: number }) {
  const [open, setOpen] = useGroupOpen(group);
  const empty = rows.length === 0 ? emptyLine(group, data.lastListEnd, now) : null;
  return (
    <details
      data-group={group}
      open={open}
      onToggle={(e) => {
        if (e.currentTarget.open !== open) setOpen(e.currentTarget.open);
      }}
      className="mb-4 rounded border border-line bg-white"
    >
      <summary className="cursor-pointer px-3 py-2 font-semibold">
        <span aria-hidden="true">{GROUP_SYMBOL[group]}</span> {group} ({rows.length})
      </summary>
      {empty ? <p className="px-3 pb-2 text-sm text-muted">{empty}</p> : null}
      {rows.length > 0 ? (
        <ul className="border-t border-line">
          {rows.map((r) => (
            <BookRow key={r.slug} row={r} now={now} />
          ))}
        </ul>
      ) : null}
    </details>
  );
}

export default function MonitorDashboard({ initial }: { initial: MonitorData }) {
  const { data, refresh, failures } = useLive<MonitorData>("/api/monitor/books", initial, () => true);
  // The clock of the page. The relative times ("21 h ago") update every 30 s with no request (VISION 15.24.4.6).
  const [tick, setTick] = useState(initial.generatedAt);
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now() / 1000), 30_000);
    return () => clearInterval(id);
  }, []);
  const now = Math.max(tick, data.generatedAt);
  const needs = data.summary.counts["Needs attention"];
  useEffect(() => {
    document.title = tabTitle(needs);
  }, [needs]);
  const groups = groupRows(data.rows);
  return (
    <section data-monitor-dashboard>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold">Monitor dashboard</h1>
        <span data-updated className="text-sm text-muted">
          Updated {pstClockSeconds(data.generatedAt)} ({agoText(data.generatedAt, now, true)})
        </span>
        <button type="button" onClick={() => void refresh()} className="rounded border border-line px-2.5 py-1 text-sm text-foreground">
          Refresh
        </button>
      </div>
      {failures >= POLL_BANNER_AFTER ? (
        <p role="alert" data-poll-banner className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The Viewer server does not answer. This page shows the data from {pstClockSeconds(data.generatedAt)}.
        </p>
      ) : null}
      {!data.ok ? (
        <p role="alert" data-data-error className="text-red-700">
          {data.error}
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p data-monitor-summary className="text-sm">
              {data.summary.text}
            </p>
            <p data-monitor-cost className="text-sm text-muted">
              {data.summary.costText}
            </p>
            {/* VISION 15.24.4.7: the summary line announces a change of the count of Needs attention only. */}
            <span role="status" aria-live="polite" className="sr-only" data-needs-live>
              {needs} {needs === 1 ? "book needs" : "books need"} attention
            </span>
          </div>
          {data.noRun ? (
            <p data-no-run className="mb-4 text-muted">
              {NO_RUN_TEXT}
            </p>
          ) : null}
          {groups
            .filter((g) => groupShows(g.group, g.rows.length))
            .map((g) => (
              <Group key={g.group} group={g.group} rows={g.rows} data={data} now={now} />
            ))}
          <p data-phase2-line className="text-sm text-muted">
            {PHASE2_LINE}
          </p>
        </>
      )}
    </section>
  );
}
