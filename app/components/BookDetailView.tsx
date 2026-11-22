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
import { VerdictPill } from "./Pills"; // Unit VW116 (Q-A 3:95.4 row d): the unused import StatePill is gone.
import { BoxCode, BoxText } from "./BoxCode";
import { GroupCode, ListStatePill, PageListStatePill, RawId } from "./Named";
import { bookJobsText, capFirst, criticModeWord, levelModelsText, listTitle, pageNumberText } from "@/lib/readable-names";
import { listKindWord } from "@/lib/run-view-words";
import StateLabel from "./StateLabel";
import RowButtons from "./RowButtons";
import BookRunsTable from "./BookRunsTable";
import { useLive } from "./useLive";
import { BookRunWatch } from "./RunStoreParts"; // unit VW85 (Q-A 3:26.3)
// Unit VW99 (Q-A 3:27.3): the tabs, and the step tree and the training monitor of the book run in their tabs.
import { Tabs } from "./Tabs";
import { DETAIL_DEFAULT_TAB, DETAIL_TABS } from "@/lib/tabs";
import StepView from "./StepView";
import { TrainingMonitor } from "./TrainingMonitor";

// Unit VW77c (round 86), VISION-viewer 15.24.5: the Details view of one book on the Monitor dashboard. It follows the Monitor dashboard `/` in its rules:
// the same row (label, sentence, buttons, dialogs), times in PST, a poll every 3 s while the tab is visible.
// Built parts: 1 header with the row actions, 2 last error, 3 list folders, 6 critiques against N with the stop flag, 7 settings used, and from 15.27.5
// Critique share of the current run and Runs. Not built: 4 box grid and 5 list of memory pairs (see lib/book-detail.ts).
// Unit VW77e (Q-A 3:11.3): the part Runs replaces Archived runs. It lists the current run, the archived runs and the phase 3 run, with Place, Readers and the button
// "Open to readers" (components/BookRunsTable.tsx). The tag "book-run" replaces "pilot list" for a book with a run-book run (V4).
// Not in this unit: the Run settings page (unit VW77d).
const TH = "px-3 py-2";
const POLL_BANNER_AFTER = 3;
// Unit VW99: the words of the tabs "Steps" and "Training monitor" for a book with no book run.
const NO_BOOK_RUN_STEPS_TEXT = "This book has no book run yet, so it has no step tree. A pilot list shows its pages in the tab Pages, under List folders.";
const NO_BOOK_RUN_TRAINING_TEXT = "This book has no book run yet, so no box has a history to show.";

function Section({ part, title, children }: { part: string; title: string; children: React.ReactNode }) {
  return (
    <section data-part={part} className="mb-6">
      <h2 className="section-band mb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ListFold({ list, open }: { list: DetailList; open: boolean }) {
  // VW96 (Q-A 3:17.4): "Ended running" read as a bare state word. A live list has no end time yet.
  const end = list.live ? "not yet (the list is still running)" : pstDateTimeOrDash(list.updatedEpoch);
  return (
    <details data-list-fold={list.stamp} open={open} className="mb-3 rounded border border-line bg-white">
      <summary className="cursor-pointer px-3 py-2 text-sm">
        <Link href={`/runs/${encodeURIComponent(list.stamp)}`} data-run-link className="font-semibold text-accent underline-offset-2 hover:underline">
          {listTitle(list.stamp)}
        </Link>{" "}
        <RawId title="Folder name of the list">{list.stamp}</RawId>
        <span className="ml-3 text-muted">
          Started {pstDateTimeOrDash(list.startedEpoch)}. Ended {end}. Kind: {listKindWord(list.listKind, list.phase2List === true)}. Critic mode:{" "}
          <span title={criticModeWord(list.criticMode).help}>{criticModeWord(list.criticMode).label}</span>.
          {list.bookJobs !== null ? ` Jobs: ${bookJobsText(list.bookJobs)}.` : ""}
        </span>{" "}
        <ListStatePill state={list.state} />
      </summary>
      <div className="relative overflow-x-auto border-t border-line">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className={TH}>Page</th>
              <th className={TH}>State</th>
              <th className={TH + " text-right"}>Calls</th>
              <th className={TH}>
                <BoxCode code="QA_3" />
              </th>
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
                    <Link href={p.href} className="text-accent underline-offset-2 hover:underline">
                      {capFirst(pageNumberText(p.page))}
                    </Link>
                  ) : (
                    <span className="text-muted">{capFirst(pageNumberText(p.page))}</span>
                  )}{" "}
                  <RawId title="Page name">{p.page}</RawId>
                </td>
                <td className="px-3 py-2">
                  <PageListStatePill state={p.state} />
                  {p.running.length > 0 ? (
                    <div className="mt-1 text-xs text-muted">
                      Now: <BoxText text={p.running.join(", ")} />
                    </div>
                  ) : null}
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

// Unit VW122 (Q-A 3:112.3 row 1): `settings` is the closed section "Run settings of this book (N changed)". The page passes it, and it shows under the header, before "Last error".
export default function BookDetailView({ initial, settings = null }: { initial: BookDetail; settings?: React.ReactNode }) {
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
            {/* Unit VW96 (Q-A 3:17.4): an article slug (8 hex digits) with no title in items.filled.jsonl says so. */}
            {!named && /^[0-9a-f]{8}$/.test(row.slug) ? <span className="ml-2 text-sm font-normal text-muted">(title not found)</span> : null}
          </h1>
          {tag === "book-run" ? (
            <span data-book-run-tag title="This book has a run in the book store, or a list of kind book-run" className="rounded border border-line px-1.5 py-0.5 text-xs text-muted">
              book-run
            </span>
          ) : tag === "pilot list" ? (
            <span data-pilot-tag title="A pilot list ran this book. A pilot list is a test, not a real run." className="rounded border border-line px-1.5 py-0.5 text-xs text-muted">
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
            <BoxText text={sentence} />
            {row.note ? (
              <span data-row-note className="ml-2 font-medium text-foreground">
                <BoxText text={row.note} />
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

      {/* Unit VW122 (Q-A 3:112.3 row 1): closed section with the Run settings of this book */}
      {settings}

      {/* Part 2: last error */}
      <Section part="last-error" title="Last error">
        {data.lastError ? (
          <div data-last-error className="text-sm break-words text-red-700">
            <p>
              <BoxText text={data.lastError.text} />
            </p>
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

      {/* Unit VW99 (Q-A 3:27.3, D1 of Q-A 3:28.3): tabs "Pages | Steps | Training monitor", "Pages" first. The header and the last error belong
          to the whole book and stay above the tabs. The step tree and the training monitor load only in their open tab. */}
      <Tabs label="Parts of the Details view" idBase="book" tabs={DETAIL_TABS} fallback={DETAIL_DEFAULT_TAB}>
        {(open) => (
          <>
            {open === "pages" ? (
              <>
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
                        <BoxText text={f.text} />
                      </p>
                      <ol className="mt-1 list-decimal pl-5">
                        {rejectLines(f).map((r, i) => (
                          <li key={i} data-reject-reason>
                            <BoxText text={r.head} />: {r.reasons.join(" ")}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                  {data.critiques.length === 0 ? (
                    <p className="text-sm text-muted">{NO_CRITIQUE_TEXT}</p>
                  ) : (
                    <div className="relative overflow-x-auto rounded border border-line bg-white">
                      <table className="w-full text-sm">
                        <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
                          <tr>
                            <th className={TH}>Page</th>
                            {BOX_TYPES.map((t) => (
                              <th key={t} className={TH + " text-right"}>
                                <GroupCode code={t} />
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
                                    ▲ <BoxCode code={f.box} /> stopped
                                  </span>
                                ))}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-right tabular-nums">{totals.nMixed ? "varies" : (totals.n ?? "–")}</td>
                          </tr>
                          {data.critiques.map((r) => (
                            <tr key={r.pageId} data-critique-row={r.page} className="border-t border-line">
                              <td className="px-3 py-2">
                                {capFirst(pageNumberText(r.page))} <RawId title="Page name">{r.page}</RawId>
                              </td>
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
                      <div className="relative overflow-x-auto border-t border-line">
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
                                <td className="px-3 py-2">
                                  {capFirst(pageNumberText(s.page))} <RawId title="Page name">{s.page}</RawId>
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">{s.n ?? "–"}</td>
                                <td className="px-3 py-2 text-xs">{s.models ? levelModelsText(s.models) : "Not stored"}</td>
                                <td className="px-3 py-2 text-xs font-medium">{s.changed ? SETTINGS_CHANGED_TEXT : ""}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </Section>

                {/* VISION 15.27.5 and 15.31.3, Q-A 3:11.3 V1 to V3: one table "Runs" (current run, archived runs, phase 3 run) with Place, Readers and the button */}
                <Section part="runs" title={`Runs (${data.runs.length})`}>
                  {data.runs.length === 0 ? <p className="text-sm text-muted">{NO_RUNS_TEXT}</p> : <BookRunsTable slug={slug} runs={data.runs} title={named ? row.title : null} />}
                </Section>
              </>
            ) : null}
            {open === "steps" ? (
              data.watch ? (
                <>
                  {/* Unit VW85 (Q-A 3:26.3): links "Steps" and "Training monitor", the frozen boxes and the overflow count of the current run. */}
                  <Section part="book-watch" title="Steps, training monitor, frozen boxes, overflow">
                    <BookRunWatch watch={data.watch} title={data.row.title && data.row.title !== data.row.slug ? data.row.title : null} />
                  </Section>
                  <StepView initial={null} list={null} book={slug} />
                </>
              ) : (
                <p data-no-book-run className="text-sm text-muted">{NO_BOOK_RUN_STEPS_TEXT}</p>
              )
            ) : null}
            {open === "training" ? (
              <>
                {data.watch?.monitorStamp ? (
                  <div className="mb-6">
                    <TrainingMonitor stamp={data.watch.monitorStamp} book={slug} />
                  </div>
                ) : (
                  <p data-no-book-run className="mb-6 text-sm text-muted">{NO_BOOK_RUN_TRAINING_TEXT}</p>
                )}
                {/* VISION 15.27.5: Critique share of the current run */}
                <Section part="critique-share" title="Critique share of the current run">
                  {data.share === null ? (
                    <p className="text-sm text-muted">{NO_SHARE_TEXT}</p>
                  ) : (
                    <div className="relative overflow-x-auto rounded border border-line bg-white">
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
                              <td className="px-3 py-2 font-mono">
                                <BoxCode code={box} />
                              </td>
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
              </>
            ) : null}
          </>
        )}
      </Tabs>
    </section>
  );
}
