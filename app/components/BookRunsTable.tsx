"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BookRunRow } from "@/lib/book-detail-rules";
import { openKey } from "@/lib/reader-opens-rule";
import { BOOK_RUN_SOURCE } from "@/lib/book-run-rules";
import { phaseText } from "@/lib/book-status-rules";
import { OpenButton, OpenConfirm, OpenGateLine, changeOpens, readOpensFrom, type OpenLoad, type OpensRead } from "./ReaderOpenRows";

/*
 * Unit VW77e (Q-A 3:11.3 V1 to V3): the table "Runs" of the Details view /monitor/<book>.
 * V1: one table. The current run comes first, then the archived runs (newest first), then the phase 3 run.
 * V2: the 5 built columns stay (Run ID, Phase, Pages done, Prompts at start, Prompts at end). Place, Readers and the button come after them.
 * V3: the button, the confirm dialog and the calls are the parts of components/ReaderOpenRows.tsx. The admin gate covers every row (round 77 answer 13).
 * A book run has one open record, with the source "book-store" and the run ID in folder form (round 78 answer 8, Q-A 3:11.2 D1).
 * A person who is not signed in as admin sees the sign-in line and no button (the same rule as the run view of a pilot list).
 */

const TH = "px-3 py-2";

// Unit VW110 (Q-A 3:74.5 part 4, Q-A 3:72.2 "Use the real name of the book, not the file name"): the confirm dialog names the book by its title when one exists.
// `title` comes from the Details view (BookDetailView passes data.row.title, the title that the page header shows). Without a title the dialog shows the file name.
export default function BookRunsTable({ slug, runs, title }: { slug: string; runs: BookRunRow[]; title?: string | null }) {
  const bookName = title || slug;
  // A text key, so that a poll of the Details view with the same run IDs does not read the opens again.
  const idsKey = useMemo(() => runs.map((r) => r.runId ?? "").join(","), [runs]);
  const hasId = runs.some((r) => r.runId !== null);
  const [opens, setOpens] = useState<Set<string>>(new Set());
  const [load, setLoad] = useState<OpenLoad>("loading");
  const [ask, setAsk] = useState<{ row: BookRunRow; open: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const apply = useCallback((r: OpensRead) => {
    if (r.kind === "ready") setOpens(r.opens);
    setLoad(r.kind);
  }, []);

  const url = `/api/admin/opens?source=${encodeURIComponent(BOOK_RUN_SOURCE)}&book=${encodeURIComponent(slug)}`;

  // The effect calls setState in a callback only, after the answer of the server (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!hasId) return;
    let alive = true;
    void readOpensFrom(url).then((r) => {
      if (alive) apply(r);
    });
    return () => {
      alive = false;
    };
  }, [hasId, idsKey, url, apply]);

  async function change(row: BookRunRow, open: boolean) {
    if (row.runId === null) return;
    setBusy(true);
    setMsg("");
    try {
      const err = await changeOpens(BOOK_RUN_SOURCE, slug, [row.runId], open);
      if (err) setMsg(err);
      apply(await readOpensFrom(url));
    } finally {
      setBusy(false);
      setAsk(null);
    }
  }

  const gate = load === "signin" || load === "forbidden" || load === "error" ? load : null;
  return (
    <div data-book-runs>
      <p className="mb-2 text-sm text-muted">Readers see the Agent text of an open run only. Readers see a change after the next S2 run.</p>
      {gate && hasId ? <OpenGateLine load={gate} next={`/monitor/${encodeURIComponent(slug)}`} /> : null}
      {/* Unit VW99 (Q-A 3:28.2): "relative" makes this box the containing block of the hidden label in the last head cell (sr-only is
          position absolute). Without it, the label sat outside the scroll box and made the page wider than a 390 px screen. */}
      <div className="relative mt-2 overflow-x-auto rounded border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className={TH} title="The run ID is the start time of the run, in PST. The column name Run ID stays (Q-A 3:11.3 V2).">
                Run ID
              </th>
              <th className={TH}>Phase</th>
              <th className={TH}>Pages done</th>
              <th className={TH}>Prompts at start</th>
              <th className={TH}>Prompts at end</th>
              <th className={TH}>Place</th>
              <th className={TH}>Readers</th>
              <th className={TH}>
                <span className="sr-only">Open or close to readers</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.map((a) => {
              const isOpen = a.runId !== null && opens.has(openKey(BOOK_RUN_SOURCE, slug, a.runId));
              const readers = a.runId === null || gate ? "–" : load !== "ready" ? "Loading" : isOpen ? "Open" : "Closed";
              return (
                <tr key={a.key} data-book-run={a.runId ?? a.key} data-archived-run={a.place === "archive" ? a.folder : undefined} className="border-t border-line align-top">
                  <td data-archived-id className={"px-3 py-2 " + (a.runIdForm ? "" : "font-mono")}>
                    {a.runText}
                  </td>
                  {/* Unit VW96 (Q-A 3:17.4): "Phase 4 · production run" in place of the raw key "agent-phase-4". */}
                  <td className="px-3 py-2" title={a.phase ?? undefined}>
                    {phaseText(a.phase) ?? a.phase ?? "Not stored"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{a.pagesText}</td>
                  <td className="px-3 py-2 text-xs">{a.promptsStart}</td>
                  <td className="px-3 py-2 text-xs">{a.promptsEnd}</td>
                  <td data-book-run-place className="px-3 py-2">
                    {a.placeText}
                  </td>
                  <td data-book-run-readers className="px-3 py-2">
                    {readers}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {a.runId === null ? (
                      <span data-book-run-no-id className="text-xs text-muted">
                        {a.noRunIdReason}
                      </span>
                    ) : gate ? null : (
                      <OpenButton isOpen={isOpen} disabled={busy || load !== "ready"} onAsk={() => setAsk({ row: a, open: !isOpen })} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {msg ? (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {msg}
        </p>
      ) : null}
      {ask ? (
        <OpenConfirm
          title={ask.open ? `Open the run ${ask.row.runText} of ${bookName} to readers?` : `Close the run ${ask.row.runText} of ${bookName} to readers?`}
          openBody={`Readers see the Agent text of ${ask.row.passPages} of ${ask.row.totalPages} pages after the next S2 run. The number counts the pages with the verdict PASS. You can close the run again.`}
          open={ask.open}
          busy={busy}
          onCancel={() => setAsk(null)}
          onConfirm={() => void change(ask.row, ask.open)}
        />
      ) : null}
    </div>
  );
}
