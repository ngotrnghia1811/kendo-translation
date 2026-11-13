"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import type { RunDetail } from "@/lib/types";
import { isLive, minutes } from "@/lib/format";
import { TOKENS_LABEL } from "@/lib/tokens-view";
import { TokenCells, TokenHeads, TokensDetail } from "./Tokens";
import { pstDateTimeOrDash } from "@/lib/pst-more";
import { StatePill, VerdictPill } from "./Pills";
import { LiveBadge, useLive } from "./useLive";
import PauseButton from "./PauseButton";
import ReaderOpenRows from "./ReaderOpenRows";
import { ChainTable, ComparePanel, FailureLists, MemoryPanel } from "./ChainPanels";
// Unit VW94 (round 91), Q-A 3:17.4 and 3:17.5: article names, readable state words and box names, and the mark "accepted before restart".
import { ACCEPTED_BEFORE_HELP } from "@/lib/phase2-articles";
// Fix round: plain words for the heading and the state pills (Q-A 3:17.4), box codes with a hover (Q-A 3:18.5 "Keep codes, explain on hover").
import { listKindWord, listStateWord, pageStateWord, runHeading } from "@/lib/run-view-words";
import { BoxCode } from "./BoxCode";
// Unit VW96 (card P31.3, Q-A 3:17.4): plain words for the critic mode, the book jobs, the page kind and the page run folder.
import { bookJobsText, capFirst, criticModeWord, pageKindWord, pageNumberText, pageRunName } from "@/lib/readable-names";
import { RawId } from "./Named";
// Unit VW95 (round 91), Q-A 3:18.3: a phase 2 list shows the same tree as the step view /monitor/phase-2, plus the section "Prompt updates".
import StepView from "./StepView";
// Unit VW98 (round 91), Q-A 3:23.3: section "Training monitor" with the box picker.
import { TrainingMonitor } from "./TrainingMonitor";
// Unit VW85 (round 91), Q-A 3:26.3 (a): the same two sections for a book-run list.
import BookRunSections from "./BookRunSections";

// Round 44 answer 13 (Q-A l142): a list opens a run view with one row per page: state, calls, cost (unit VW93: tokens, Q-A 3:15.2), minutes,
// QA_3 verdict and score, link to the page view. Viewer goal: few steps from a run to a page text.
// Round 48 answer 9 (Q-A 2026-10-27 l55): a chain list also shows the list kind, the critic mode, the book jobs, a table per book,
// skipped pages with their reason, the failure lists, the book translation memory pairs, and the compare table of the critic modes.
// Unit VW77b1 (round 81 answer 17, Q-A 2026-11-02 l22): "PST there too". Started and Updated show as "2026-10-28 23:50 PST".
export default function RunView({ initial }: { initial: RunDetail }) {
  const { data: run, refresh, live } = useLive<RunDetail>(`/api/runs/${initial.stamp}`, initial, (d) => isLive(d.state));
  const isChain = run.listKind === "chain";
  const runWord = listStateWord(run.state);
  return (
    <section>
      <Link href="/runs" className="text-sm text-muted hover:text-foreground">
        ← Lists
      </Link>
      <div data-run-head className="mt-2 mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <h1 data-run-heading className="text-xl font-semibold">
          {runHeading(run.stamp, run.listKind, run.phase2List === true)}{" "}
          <span data-run-stamp className="ml-1 font-mono text-sm font-normal text-muted" title="List folder name (UTC stamp), the same as in the URL">
            {run.stamp}
          </span>
        </h1>
        <StatePill state={run.state} label={runWord.label} help={runWord.help} />
        <LiveBadge live={live} />
      </div>
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <Stat label="Pages" value={`${run.pagesDone} / ${run.pagesTotal}`} />
        <Stat label="Calls" value={`${run.callsDone} / ${run.callsTotal}`} />
        <Stat label="Failed" value={String(run.callsFailed)} warn={run.callsFailed > 0} />
        <Stat label="Flagged" value={String(run.callsFlagged)} warn={run.callsFlagged > 0} />
        {/* Unit VW93 (Q-A 3:15.2): the 5 token kinds of the list in place of the two costs. An older list shows "no token data" (Q-A 3:15.3). */}
        <Stat label={TOKENS_LABEL} value={<TokensDetail tokens={run.tokens} />} />
        <Stat label="Started" value={pstDateTimeOrDash(run.startedEpoch)} />
        <Stat label="Updated" value={pstDateTimeOrDash(run.updatedEpoch)} />
        <Stat label="List kind" value={<span title={`List kind ${run.listKind} (progress.json key kind)`}>{listKindWord(run.listKind, run.phase2List === true)}</span>} />
        <Stat label="Critic mode" value={<span title={criticModeWord(run.criticMode).help}>{criticModeWord(run.criticMode).label}</span>} />
        {run.bookJobs !== null ? <Stat label="Book jobs" value={bookJobsText(run.bookJobs)} /> : null}
      </div>
      <div className="mb-4">
        <PauseButton stamp={run.stamp} state={run.state} fileExists={run.pauseFileExists} pausedSinceEpoch={run.pausedSinceEpoch} onDone={refresh} />
      </div>
      {run.phase2Note ? (
        <p data-phase2-note className="mb-4 text-sm text-muted">
          {run.phase2Note}
        </p>
      ) : null}
      <ReaderOpenRows stamp={run.stamp} pages={run.pages} />
      {isChain ? (
        <div className="mb-6 space-y-6">
          <section>
            <h2 className="mb-2 text-lg font-semibold">Chain state per book</h2>
            {run.chains ? <ChainTable chains={run.chains} /> : <p className="text-sm text-muted">This list has no chains table yet.</p>}
          </section>
          {run.chains ? <MemoryPanel stamp={run.stamp} chains={run.chains} /> : null}
        </div>
      ) : null}
      <div className="mb-6">
        <ComparePanel stamp={run.stamp} isChain={isChain} />
      </div>
      {isChain ? <h2 className="mb-2 text-lg font-semibold">Pages</h2> : null}
      <div className="overflow-x-auto rounded border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Page</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2 text-right">Calls</th>
              <TokenHeads className="px-3 py-2 text-right whitespace-nowrap" />
              <th className="px-3 py-2 text-right">Minutes</th>
              <th className="px-3 py-2">
                <BoxCode code="QA_3" />
              </th>
              {isChain ? <th className="px-3 py-2">Book memory</th> : null}
            </tr>
          </thead>
          <tbody>
            {run.pages.map((p) => (
              <tr key={p.pageId} className="border-t border-line hover:bg-stone-50">
                <td className="px-3 py-2" data-run-page={p.pageId}>
                  {p.runFolder ? (
                    <Link href={p.href} className="font-mono text-accent underline-offset-2 hover:underline">
                      {p.pageId}
                    </Link>
                  ) : p.acceptedBefore ? (
                    <Link href={p.acceptedBefore.href} className="font-mono text-accent underline-offset-2 hover:underline">
                      {p.pageId}
                    </Link>
                  ) : (
                    <span className="font-mono text-muted">{p.pageId}</span>
                  )}
                  {p.article ? (
                    <div data-run-page-article className="mt-0.5 max-w-xs text-xs">
                      <span className={p.article.found ? "text-foreground" : "italic text-muted"}>{p.article.title}</span>
                      {p.article.pageOf ? <span className="text-muted">, {p.article.pageOf}</span> : null}
                      {p.article.titleJa ? (
                        <span lang="ja" className="block text-muted">
                          {p.article.titleJa}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div data-run-page-number className="mt-0.5 text-xs text-muted">
                      {capFirst(pageNumberText(p.pageId))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-muted">
                  <span title={pageKindWord(p.kind).help}>{pageKindWord(p.kind).label}</span>
                </td>
                <td className="px-3 py-2">
                  {p.acceptedBefore ? (
                    <div data-accepted-before title={ACCEPTED_BEFORE_HELP}>
                      <StatePill state="accepted before restart" />
                      <div className="mt-1 max-w-xs text-xs text-muted">
                        {p.acceptedBefore.text}{" "}
                        <Link href={p.acceptedBefore.href} className="text-accent underline underline-offset-2">
                          {p.acceptedBefore.runFolder ? pageRunName(p.acceptedBefore.runFolder).label : "Page run"}
                        </Link>
                        {p.acceptedBefore.runFolder ? (
                          <>
                            {" "}
                            <RawId>{p.acceptedBefore.runFolder}</RawId>
                          </>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">This list: not started yet, 0 calls.</div>
                    </div>
                  ) : (
                    <PageStatePill state={p.skippedReason && p.state === "waiting" ? "skipped" : p.state} />
                  )}
                  {p.running.length > 0 ? (
                    <div data-run-boxes className="mt-1 text-xs text-muted">
                      {p.running.map((b, i) => (
                        <span key={b}>
                          {i > 0 ? ", " : ""}
                          <BoxCode code={b} />
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {p.skippedReason ? <div className="mt-1 text-xs text-amber-800">Skipped: {p.skippedReason}</div> : null}
                  <FailureLists forward={p.forwardFailures} critic={p.criticFailures} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {p.callsDone} / {p.callsTotal}
                  {p.callsFailed ? <span className="ml-1 font-semibold text-red-700">({p.callsFailed} failed)</span> : null}
                </td>
                <TokenCells tokens={p.tokens} className="px-3 py-2 text-right tabular-nums" />
                <td className="px-3 py-2 text-right tabular-nums">{minutes(p.minutes === null ? null : p.minutes * 60)}</td>
                <td className="px-3 py-2">
                  <VerdictPill verdict={p.qa3Verdict} score={p.qa3Score} />
                </td>
                {isChain ? (
                  <td className="px-3 py-2 text-xs">
                    {p.bookMemory ? (p.bookMemory.written ? `${p.bookMemory.pairs ?? "?"} pairs written` : `${p.bookMemory.verdict ?? "no verdict"}, nothing written`) : <span className="text-muted">–</span>}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Unit VW98 (Q-A 3:23.3): the training monitor of one box, above the step tree. */}
      {run.phase2List === true ? <TrainingMonitor stamp={run.stamp} /> : null}
      {run.phase2List === true ? (
        <section data-run-steps className="mt-6">
          <h2 className="mb-1 text-lg font-semibold">Steps of this phase 2 run</h2>
          <p className="mb-2 text-sm text-muted">The same tree as the step view /monitor/phase-2: all lists of this run, in run order across restarts.</p>
          <StepView initial={null} list={run.stamp} showUpdates />
        </section>
      ) : null}
      {/* Unit VW85 (Q-A 3:26.3 (a)): a book-run list of a real book shows the same training monitor and step tree as a phase 2 list. */}
      {run.phase2List !== true && run.bookRunBook ? <BookRunSections stamp={run.stamp} book={run.bookRunBook} title={run.bookRunTitle ?? null} /> : null}
    </section>
  );
}

function PageStatePill({ state }: { state: string }) {
  const w = pageStateWord(state);
  return <StatePill state={state} label={w.label} help={w.help} />;
}

function Stat({ label, value, warn }: { label: string; value: ReactNode; warn?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={"tabular-nums " + (warn ? "font-semibold text-red-700" : "")}>{value}</div>
    </div>
  );
}
