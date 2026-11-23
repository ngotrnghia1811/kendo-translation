"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import type { RunDetail } from "@/lib/types";
import { isLive } from "@/lib/format";
import { TOKENS_LABEL } from "@/lib/tokens-view";
import { TokensDetail } from "./Tokens";
import { pstDateTimeOrDash } from "@/lib/pst-more";
import { StatePill } from "./Pills";
import { LiveBadge, useLive } from "./useLive";
import PauseButton from "./PauseButton";
import ReaderOpenRows from "./ReaderOpenRows";
import { ChainTable, ComparePanel, MemoryPanel } from "./ChainPanels";
// Fix round: plain words for the heading and the state pills (Q-A 3:17.4).
import { listKindWord, listStateWord, runHeading } from "@/lib/run-view-words";
// Unit VW96 (card P31.3, Q-A 3:17.4): plain words for the critic mode and the book jobs.
import { bookJobsText, criticModeWord } from "@/lib/readable-names";
// Unit VW95 (round 91), Q-A 3:18.3: a phase 2 list shows the same tree as the step view /monitor/phase-2, plus the section "Prompt updates".
import StepView from "./StepView";
// Unit VW98 (round 91), Q-A 3:23.3: section "Training monitor" with the box picker.
import { TrainingMonitor } from "./TrainingMonitor";
// Unit VW85 (round 91), Q-A 3:26.3 (a): the same two sections for a book-run list.
import BookRunSections from "./BookRunSections";
// Unit VW99 (round 91), Q-A 3:27.3 and D1, D2 of Q-A 3:28.3: tabs "Pages | Steps | Prompt updates | Training monitor | Chain state per book".
// The title, the state, the facts and the progress bar of the list stay above the tabs.
import { Tabs } from "./Tabs";
import { runDefaultTab, runTabs } from "@/lib/tabs";
import RunPagesTable from "./RunPagesTable";
import { RunProgress } from "./ProgressBar";
// Unit VW127 (Q-A 3:122.4 rows 4, 6, 8): the times green, the counts bold, a failed count above 0 red, the folder name gray monospace. No text changes.
import { HlCount, HlFailed, HlText, HlTimeText } from "./HlSpan";

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
          <span data-run-stamp data-hl="folder" className="hl-folder ml-1" title="List folder name (UTC stamp), the same as in the URL">
            {run.stamp}
          </span>
        </h1>
        <StatePill state={run.state} label={runWord.label} help={runWord.help} />
        <LiveBadge live={live} />
      </div>
      <RunProgress pages={run.pages} />
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <Stat label="Pages" value={<HlCount>{`${run.pagesDone} / ${run.pagesTotal}`}</HlCount>} />
        <Stat label="Calls" value={<HlCount>{`${run.callsDone} / ${run.callsTotal}`}</HlCount>} />
        <Stat label="Failed" value={<HlFailed n={run.callsFailed}>{String(run.callsFailed)}</HlFailed>} />
        <Stat label="Flagged" value={<HlCount>{String(run.callsFlagged)}</HlCount>} warn={run.callsFlagged > 0} />
        {/* Unit VW93 (Q-A 3:15.2): the 5 token kinds of the list in place of the two costs. An older list shows "no token data" (Q-A 3:15.3). */}
        <Stat label={TOKENS_LABEL} value={<TokensDetail tokens={run.tokens} />} />
        <Stat label="Started" value={<HlTimeText text={pstDateTimeOrDash(run.startedEpoch)} />} />
        <Stat label="Updated" value={<HlTimeText text={pstDateTimeOrDash(run.updatedEpoch)} />} />
        <Stat label="List kind" value={<span title={`List kind ${run.listKind} (progress.json key kind)`}>{listKindWord(run.listKind, run.phase2List === true)}</span>} />
        <Stat label="Critic mode" value={<span title={criticModeWord(run.criticMode).help}>{criticModeWord(run.criticMode).label}</span>} />
        {run.bookJobs !== null ? <Stat label="Book jobs" value={<HlText text={bookJobsText(run.bookJobs)} />} /> : null}
      </div>
      <div className="mb-4">
        <PauseButton stamp={run.stamp} state={run.state} fileExists={run.pauseFileExists} pausedSinceEpoch={run.pausedSinceEpoch} onDone={refresh} />
      </div>
      {run.phase2Note ? (
        <p data-phase2-note className="mb-4 text-sm text-muted">
          {run.phase2Note}
        </p>
      ) : null}
      <Tabs label="Parts of the run view" idBase="run" tabs={runTabs(run)} fallback={runDefaultTab(run)}>
        {(open) => (
          <>
            {open === "pages" ? (
              <>
                <ReaderOpenRows stamp={run.stamp} pages={run.pages} />
                <div className="mb-6">
                  <ComparePanel stamp={run.stamp} isChain={isChain} />
                </div>
                {isChain ? <h2 className="section-band mb-2 text-lg font-semibold">Pages</h2> : null}
                <RunPagesTable run={run} isChain={isChain} />
              </>
            ) : null}
            {open === "chain" ? (
              <div className="mb-6 space-y-6">
                <section>
                  <h2 className="section-band mb-2 text-lg font-semibold">Chain state per book</h2>
                  {run.chains ? <ChainTable chains={run.chains} /> : <p className="text-sm text-muted">This list has no chains table yet.</p>}
                </section>
                {run.chains ? <MemoryPanel stamp={run.stamp} chains={run.chains} /> : null}
              </div>
            ) : null}
            {/* Unit VW98 (Q-A 3:23.3) and VW99 (Q-A 3:27.3): the training monitor of one box, in its own tab. */}
            {open === "training" && run.phase2List === true ? <TrainingMonitor stamp={run.stamp} /> : null}
            {open === "steps" && run.phase2List === true ? (
              <section data-run-steps>
                <h2 className="section-band mb-1 text-lg font-semibold">Steps of this phase 2 run</h2>
                <p className="mb-2 text-sm text-muted">The same tree as the step view /monitor/phase-2: all lists of this run, in run order across restarts.</p>
                <StepView initial={null} list={run.stamp} />
              </section>
            ) : null}
            {open === "updates" && run.phase2List === true ? (
              <section data-run-updates>
                <StepView initial={null} list={run.stamp} showTree={false} showUpdates />
              </section>
            ) : null}
            {/* Unit VW85 (Q-A 3:26.3 (a)): a book-run list of a real book shows the same training monitor and step tree as a phase 2 list. */}
            {run.phase2List !== true && run.bookRunBook ? <BookRunSections stamp={run.stamp} book={run.bookRunBook} title={run.bookRunTitle ?? null} open={open} /> : null}
          </>
        )}
      </Tabs>
    </section>
  );
}

function Stat({ label, value, warn }: { label: string; value: ReactNode; warn?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={"tabular-nums " + (warn ? "font-semibold text-red-700" : "")}>{value}</div>
    </div>
  );
}
