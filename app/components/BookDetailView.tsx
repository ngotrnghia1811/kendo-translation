"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { agoText, lineText, progressText } from "@/lib/book-status-rules";
import { TOKENS_LABEL } from "@/lib/tokens-view";
import { TokenCells, TokenHeads, TokensDetail } from "./Tokens";
import { pstClockSeconds } from "@/lib/format";
import { pstDateTimeOrDash } from "@/lib/pst-more";
import { shareText, rejectLines } from "@/lib/critique-share";
import { jsonViewHref } from "@/lib/json-view";
import {
  BOX_TYPES,
  NO_CRITIQUE_TEXT,
  NO_ERROR_TEXT,
  NO_LIST_TEXT,
  NO_RUNS_TEXT,
  NO_SHARE_TEXT,
  SETTINGS_CHANGED_TEXT,
  critiqueTotals,
  type BookDetail,
  type DetailList,
} from "@/lib/book-detail-rules";
import { bookTagText } from "@/lib/book-run-rules";
import { StatePill, VerdictPill } from "./Pills";
import StateLabel from "./StateLabel";
import RowButtons from "./RowButtons";
import BookRunsTable from "./BookRunsTable";
import { useLive } from "./useLive";

// Unit VW77c (round 86), VISION-viewer 15.24.5: the Details view of one book on the Monitor dashboard. It follows the Monitor dashboard `/` in its rules:
// the same row (label, sentence, buttons, dialogs), times in PST, a poll every 3 s while the tab is visible.
// Built parts: 1 header with the row actions, 2 last error, 3 list folders, 6 critiques against N with the stop flag, 7 settings used, and from 15.27.5
// Critique share of the current run and Runs. Not built: 4 box grid and 5 list of memory pairs (see lib/book-detail.ts).
// Unit VW77e (Q-A 3:11.3): the part Runs replaces Archived runs. It lists the current run, the archived runs and the phase 3 run, with Place, Readers and the button
// "Open to readers" (components/BookRunsTable.tsx). The tag "book-run" replaces "pilot list" for a book with a run-book run (V4).
// Not in this unit: the Run settings page (unit VW77d).
const TH = "px-3 py-2";
const POLL_BANNER_AFTER = 3;

function Section({ part, title, children }: { part: string; title: string; children: React.ReactNode }) {
  return (
    <section data-part={part} className="mb-6">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ListFold({ list, open }: { list: DetailList; open: boolean }) {
  const end = list.live ? "running" : pstDateTimeOrDash(list.updatedEpoch);
  return (
    <details data-list-fold={list.stamp} open={open} className="mb-3 rounded border border-line bg-white">
      <summary className="cursor-pointer px-3 py-2 text-sm">
        <Link href={`/runs/${encodeURIComponent(list.stamp)}`} data-run-link className="font-mono font-semibold text-accent underline-offset-2 hover:underline">
          {list.stamp}
        </Link>
        <span className="ml-3 text-muted">
          Started {pstDateTimeOrDash(list.startedEpoch)}. Ended {end}. Kind {list.listKind}. Critic mode {list.criticMode ?? "not stored"}.
          {list.bookJobs !== null ? ` Book jobs ${list.bookJobs}.` : ""}
        </span>{" "}
        <StatePill state={list.state} />
      </summary>
      <div className="overflow-x-auto border-t border-line">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className={TH}>Page</th>
              <th className={TH}>State</th>
              <th className={TH + " text-right"}>Calls</th>
              <th className={TH}>QA_3</th>
              {/* Unit VW93 (Q-A 3:15.2): the 5 token kinds of the page row in place of the cost. */}
              <TokenHeads className={TH + " text-right whitespace-nowrap"} />
              <th className={TH + " text-right"}>Time</th>
              <th className={TH}>Memory pairs</th>
            </tr>
          </thead>
          <tbody>
            {list.pages.map((p) => (
              <tr key={p.pageId} data-page-row={p.page} className="border-t border-line">
                <td className="px-3 py-2">
                  {p.href ? (
                    <Link href={p.href} className="font-mono text-accent underline-offset-2 hover:underline">
                      {p.page}
                    </Link>
                  ) : (
                    <span className="font-mono text-muted">{p.page}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatePill state={p.state} />
                  {p.running.length > 0 ? <div className="mt-1 text-xs text-muted">{p.running.join(", ")}</div> : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {p.callsDone} / {p.callsTotal}
                  {p.callsFailed ? <span className="ml-1 font-semibold text-red-700">({p.callsFailed} failed)</span> : null}
                </td>
                <td className="px-3 py-2">
                  <VerdictPill verdict={p.qa3Verdict} score={p.qa3Score} />
                </td>
                <TokenCells tokens={p.tokens} className="px-3 py-2 text-right tabular-nums" />
                <td className="px-3 py-2 text-right tabular-nums">{p.minutes === null ? "–" : `${p.minutes.toFixed(1)} min`}</td>
                <td className="px-3 py-2 text-xs">{p.pairs === null ? <span className="text-muted">–</span> : `${p.pairs} ${p.pairs === 1 ? "pair" : "pairs"}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default function BookDetailView({ initial }: { initial: BookDetail }) {
  const slug = initial.row.slug;
  const { data, refresh, failures } = useLive<BookDetail>(`/api/monitor/books/${encodeURIComponent(slug)}`, initial, () => true);
  // The clock of the page. The relative times update every 30 s with no request (VISION 15.24.4.6).
  const [tick, setTick] = useState(initial.generatedAt);
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now() / 1000), 30_000);
    return () => clearInterval(id);
  }, []);
  const now = Math.max(tick, data.generatedAt);
  const row = data.row;
  const sentence = lineText(row.line2, now);
  const totals = critiqueTotals(data.critiques);
  const named = row.title !== row.slug;
  // V4: a book with a run in the book store, or a list folder of kind book-run, gets the tag "book-run". A pilot list keeps "pilot list".
  const tag = bookTagText(data.runs.length > 0 || data.lists.some((l) => l.listKind === "book-run"), row.pilot);
  return (
    <section data-book-detail={slug}>
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Monitor dashboard
      </Link>
      {failures >= POLL_BANNER_AFTER ? (
        <p role="alert" data-poll-banner className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The Viewer server does not answer. This page shows the data from {pstClockSeconds(data.generatedAt)}.
        </p>
      ) : null}

      {/* Part 1: header */}
      <div data-part="header" className="mt-2 mb-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-xl font-semibold">
            {named ? <span>{row.title} </span> : null}
            <code className={"font-mono " + (named ? "text-base font-normal text-muted" : "")}>{named ? `(${row.slug})` : row.slug}</code>
          </h1>
          {tag === "book-run" ? (
            <span data-book-run-tag className="rounded border border-line px-1.5 py-0.5 text-xs text-muted">
              book-run
            </span>
          ) : tag === "pilot list" ? (
            <span data-pilot-tag className="rounded border border-line px-1.5 py-0.5 text-xs text-muted">
              pilot list
            </span>
          ) : null}
          <span data-updated className="text-sm text-muted">
            Updated {pstClockSeconds(data.generatedAt)} ({agoText(data.generatedAt, now, true)})
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <StateLabel row={row} />
          {row.phase ? (
            <span data-col="phase" className="text-sm">
              {row.phase}
              {row.run ? <span className="ml-2 text-muted">{row.run}</span> : null}
            </span>
          ) : null}
          <RowButtons row={row} onChanged={refresh} />
        </div>
        {sentence || row.note ? (
          <p data-row-line2 className="mt-2 text-sm text-muted">
            {sentence}
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
        <dl data-header-facts className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Pages done</dt>
            <dd data-fact="pages" className="tabular-nums">
              {progressText(row)}
            </dd>
          </div>
          <div>
            {/* Unit VW93 (Q-A 3:15.2, 3:15.3): the 5 token kinds of the book in place of the cost, or "no token data". */}
            <dt className="text-xs uppercase tracking-wide text-muted">{TOKENS_LABEL}</dt>
            <dd data-fact="tokens" className="tabular-nums">
              <TokensDetail tokens={row.tokens} sum={{ tokens: row.tokens, missing: row.tokensMissing ?? 0 }} one="page run" many="page runs" />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Page time</dt>
            <dd data-fact="time" className="tabular-nums">
              {row.minutes === null ? "–" : `${row.minutes} min`}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">List folders</dt>
            <dd data-fact="lists" className="tabular-nums">
              {data.lists.length}
            </dd>
          </div>
        </dl>
      </div>

      {/* Part 2: last error */}
      <Section part="last-error" title="Last error">
        {data.lastError ? (
          <div data-last-error className="text-sm break-words text-red-700">
            <p>{data.lastError.text}</p>
            {data.lastError.epoch !== null ? <p data-error-time>Time: {pstDateTimeOrDash(data.lastError.epoch)}</p> : null}
            {data.lastError.file ? (
              <p>
                {/* Unit VW89 (round 90), Q-A 3:1.7 item 3: the file path opens in the JSON viewer (before: the plain text from /api/file). */}
                <a data-error-file href={jsonViewHref(data.lastError.file)} className="underline underline-offset-2">
                  File: {data.lastError.file}
                </a>
              </p>
            ) : null}
          </div>
        ) : (
          <p data-no-error className="text-sm text-muted">
            {NO_ERROR_TEXT}
          </p>
        )}
      </Section>

      {/* Part 3: list folders, newest first, the newest fold starts open */}
      <Section part="list-folders" title="List folders">
        {data.lists.length === 0 ? (
          <p className="text-sm text-muted">{NO_LIST_TEXT}</p>
        ) : (
          data.lists.map((l, i) => <ListFold key={l.stamp} list={l} open={i === 0} />)
        )}
      </Section>

      {/* Part 6: critiques against N, with the stop flag */}
      <Section part="critiques" title={`Critiques against N${totals.n !== null ? ` = ${totals.n}` : ""}`}>
        {data.flags.map((f) => (
          <div key={f.box} data-stop-flag={f.box} role="note" className="mb-3 rounded border border-red-700 bg-red-50 px-3 py-2 text-sm text-red-800">
            <p className="font-medium">
              <span aria-hidden="true">▲ </span>
              {f.text}
            </p>
            <ol className="mt-1 list-decimal pl-5">
              {rejectLines(f).map((r, i) => (
                <li key={i} data-reject-reason>
                  {r.head}: {r.reasons.join(" ")}
                </li>
              ))}
            </ol>
          </div>
        ))}
        {data.critiques.length === 0 ? (
          <p className="text-sm text-muted">{NO_CRITIQUE_TEXT}</p>
        ) : (
          <div className="overflow-x-auto rounded border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className={TH}>Page</th>
                  {BOX_TYPES.map((t) => (
                    <th key={t} className={TH + " text-right"}>
                      {t}
                    </th>
                  ))}
                  <th className={TH + " text-right"}>N</th>
                </tr>
              </thead>
              <tbody>
                {/* The total row sits on top, so the sum shows with no scroll over the pages [unit default VW77c]. */}
                <tr data-critique-total className="border-b-2 border-line bg-stone-50 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  {BOX_TYPES.map((t) => (
                    <td key={t} className="px-3 py-2 text-right tabular-nums">
                      {totals.counts[t]}
                      {data.flags.filter((f) => f.box.startsWith(t + "_")).map((f) => (
                        <span key={f.box} data-flag-mark={f.box} className="ml-1 text-xs font-normal text-red-700">
                          ▲ {f.box} stopped
                        </span>
                      ))}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right tabular-nums">{totals.nMixed ? "varies" : (totals.n ?? "–")}</td>
                </tr>
                {data.critiques.map((r) => (
                  <tr key={r.pageId} data-critique-row={r.page} className="border-t border-line">
                    <td className="px-3 py-2 font-mono">{r.page}</td>
                    {BOX_TYPES.map((t) => (
                      <td key={t} className="px-3 py-2 text-right tabular-nums">
                        {r.counts[t]}
                        {r.reached[t] ? (
                          <span title="This count reached N" className="ml-1">
                            ★<span className="sr-only"> reached N</span>
                          </span>
                        ) : null}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right tabular-nums">{r.n ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Part 7: settings used */}
      <Section part="settings" title="Settings used">
        {data.settings.length === 0 ? (
          <p className="text-sm text-muted">No page folder holds a run.json yet.</p>
        ) : (
          <details className="rounded border border-line bg-white">
            <summary className="cursor-pointer px-3 py-2 text-sm">
              {data.settings.length} {data.settings.length === 1 ? "page" : "pages"}, {data.settings.filter((s) => s.changed).length} with a change of settings
            </summary>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className={TH}>Page</th>
                    <th className={TH + " text-right"}>N</th>
                    <th className={TH}>Models</th>
                    <th className={TH}>Mark</th>
                  </tr>
                </thead>
                <tbody>
                  {data.settings.map((s) => (
                    <tr key={s.pageId} data-settings-row={s.page} className="border-t border-line">
                      <td className="px-3 py-2 font-mono">{s.page}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.n ?? "–"}</td>
                      <td className="px-3 py-2 text-xs">{s.models ?? "Not stored"}</td>
                      <td className="px-3 py-2 text-xs font-medium">{s.changed ? SETTINGS_CHANGED_TEXT : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </Section>

      {/* VISION 15.27.5: Critique share of the current run */}
      <Section part="critique-share" title="Critique share of the current run">
        {data.share === null ? (
          <p className="text-sm text-muted">{NO_SHARE_TEXT}</p>
        ) : (
          <div className="overflow-x-auto rounded border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className={TH}>Box</th>
                  <th className={TH}>Critiques used in live rewrites</th>
                  <th className={TH}>Critiques dropped after a double REJECT</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.share.boxes).map(([box, s]) => (
                  <tr key={box} data-share-row={box} className="border-t border-line">
                    <td className="px-3 py-2 font-mono">{box}</td>
                    <td data-share-used className="px-3 py-2 tabular-nums">
                      {shareText(s.used, s.total, s.used_percent)}
                    </td>
                    <td data-share-dropped className="px-3 py-2 tabular-nums">
                      {shareText(s.dropped, s.total, s.dropped_percent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* VISION 15.27.5 and 15.31.3, Q-A 3:11.3 V1 to V3: one table "Runs" (current run, archived runs, phase 3 run) with Place, Readers and the button */}
      <Section part="runs" title={`Runs (${data.runs.length})`}>
        {data.runs.length === 0 ? <p className="text-sm text-muted">{NO_RUNS_TEXT}</p> : <BookRunsTable slug={slug} runs={data.runs} />}
      </Section>
    </section>
  );
}
