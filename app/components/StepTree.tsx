"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import type { PageNode, StepGroup, StepNode, StepSummary, UpdatePoint } from "@/lib/step-tree";
import { isOpen, pageWordOf, secondsText, stepWord, updateNote } from "@/lib/step-tree";
import type { Section, StepData } from "@/lib/step-data";
import { diffBlocks } from "@/lib/line-diff";
import { minutes, pageHref, pstClock, pstDateTime } from "@/lib/format";
import { jsonViewHref } from "@/lib/json-view";
import { tokensShort, TOKENS_SHORT_HELP, TOKENS_SHORT_LABEL } from "@/lib/tokens-view";
import { modelOptionText } from "@/lib/readable-names";
import { ModelCardId } from "./ModelCardId"; // Unit VW97 (Q-A 3:21.3): the Claude card ID in small grey text next to the card name.
import { StatePill, VerdictPill } from "./Pills";
import { BoxText } from "./BoxCode";
// Unit VW98 (Q-A 3:23.3): a box code links to the training monitor of its box.
import { BoxMonitorLink } from "./TrainingMonitorLink";
import { useRunStoreQuery, withStoreQuery } from "./RunStoreQuery"; // unit VW85
// Unit VW103 (Q-A 3:36.4): the update point that runs now (box, role n of 4, try, card, time, wait). It shows on its page row, under its step, and in the tab "Prompt updates".
import { updateSummaryText } from "@/lib/update-live";
import type { UpdateLive } from "@/lib/update-live";
import { UpdateLiveBlock } from "./UpdateLiveBlock";

// Unit VW95 (round 91). One tree for the step view /monitor/phase-2 and the run view /runs/<stamp> of a phase 2 list (Q-A 3:18.3 "Reuse one tree").
// Level 1: one line per page in run order (Q-A 3:17.7, 3:18.2). Level 2: the steps of a page in the order of the owner (Q-A 3:17.1 note).
// Level 3: the data of one step, loaded only when the owner opens it (Q-A 3:19.3 D2). Open nodes stay open across the 3 s updates (D3):
// the fold choices live in the state of StepView, keyed by page ID and step ID. Box codes keep their code and get a hover (Q-A 3:18.5).

export type Choices = Record<string, boolean>;

export interface TreeProps {
  summary: StepSummary;
  choices: Choices;
  setChoice: (key: string, open: boolean) => void;
}

function stepQuery(page: PageNode, step: StepNode): string {
  if (step.id.startsWith("update:")) return `page=${encodeURIComponent(page.pageId)}&step=${encodeURIComponent(step.id)}`;
  return `folder=${encodeURIComponent(page.folder ?? "")}&step=${encodeURIComponent(step.id)}`;
}

function Code({ code }: { code: string }) {
  return (
    <span className="font-mono">
      <BoxMonitorLink code={code} />
    </span>
  );
}

function Toggle({ open, onClick, label, children, mark }: { open: boolean; onClick: () => void; label: string; children: ReactNode; mark?: boolean }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={label}
      onClick={onClick}
      className={`flex w-full min-w-0 items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-stone-50 ${mark ? "border-l-4 border-blue-800" : ""}`}
    >
      <span aria-hidden="true" className="mt-0.5 w-3 shrink-0 text-muted">
        {open ? "▾" : "▸"}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

export function StepTree({ summary, choices, setChoice }: TreeProps) {
  const ended = summary.pages.filter((p) => !p.running).length;
  const running = summary.pages.filter((p) => p.running).length;
  return (
    <div data-step-tree>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span data-steps-run className="font-semibold">
          {summary.runLabel}
        </span>
        <StatePill state={summary.runWord.pill} label={summary.runWord.label} help={summary.runWord.help} />
        {summary.runId ? (
          <span className="font-mono text-xs text-muted" title="Run ID of history.jsonl (key run_id)">
            {summary.runId}
          </span>
        ) : null}
      </div>
      {summary.lists.length ? (
        <ul data-steps-lists className="mb-3 text-xs text-muted">
          {summary.lists.map((l) => (
            <li key={l.stamp}>
              <Link href={`/runs/${l.stamp}`} className="text-accent underline underline-offset-2">
                {l.label}
              </Link>{" "}
              <span className="font-mono">{l.stamp}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p data-steps-counts className="mb-3 text-sm text-muted">
        {ended} {ended === 1 ? "page" : "pages"} ended, {running} translating now, {summary.notStarted.length} not started yet. The tree updates every 3 s while this tab is visible. Summary read in{" "}
        {summary.millis} ms.
      </p>
      {summary.error ? (
        <p data-steps-error className="mb-3 text-sm text-red-700">
          {summary.error}
        </p>
      ) : null}
      <ol className="space-y-1">
        {summary.pages.map((p, i) => (
          <PageItem key={p.pageId} n={i + 1} page={p} choices={choices} setChoice={setChoice} tick={summary.generatedEpoch} live={summary.updateLive && summary.updateLive.page === p.pageId ? summary.updateLive : null} />
        ))}
      </ol>
      {summary.notStarted.length ? (
        <details data-steps-not-started className="mt-3 rounded border border-line bg-white px-3 py-2 text-sm">
          <summary className="cursor-pointer">Not started yet: {summary.notStarted.length} pages, in list order</summary>
          <ol className="mt-2 space-y-1">
            {summary.notStarted.map((p) => (
              <li key={p.pageId} className="break-words">
                <span>{p.title}</span>
                {p.pageOf ? <span className="text-muted">, {p.pageOf}</span> : null} <span className="font-mono text-xs text-muted">{p.pageId}</span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}

// `live`: the update point that runs after this page, or null. The page is accepted already, so it opens by default while its update point runs.
function PageItem({ n, page, choices, setChoice, tick, live }: { n: number; page: PageNode; choices: Choices; setChoice: (k: string, o: boolean) => void; tick: number; live: UpdateLive | null }) {
  const key = `page:${page.pageId}`;
  const open = isOpen(key, choices, page.running || live !== null);
  const word = pageWordOf(page.state);
  return (
    <li data-step-page={page.pageId} data-step-page-running={page.running ? "yes" : undefined} className="rounded border border-line bg-white">
      <Toggle open={open} onClick={() => setChoice(key, !open)} label={`Page ${n}: ${page.title}, ${page.pageOf ?? page.pageId}`} mark={page.running}>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-mono text-xs text-muted">p{n}</span>
          <span className={page.titleFound ? "font-medium" : "italic text-muted"}>{page.title}</span>
          {page.pageOf ? <span className="text-muted">{page.pageOf}</span> : null}
          <span className="font-mono text-xs text-muted">{page.pageId}</span>
          <StatePill state={word.pill} label={word.label} help={word.help} />
          <span title="QA_3 verdict and page score of this page run">
            <VerdictPill verdict={page.verdict} score={page.score} />
          </span>
        </span>
        {page.titleJa ? (
          <span lang="ja" className="block text-xs text-muted">
            {page.titleJa}
          </span>
        ) : null}
        <span className="block text-xs text-muted">
          {minutes(page.seconds)} min · {page.calls} model calls ·{" "}
          <span title={TOKENS_SHORT_HELP}>
            {TOKENS_SHORT_LABEL} {tokensShort(page.tokens)}
          </span>
          {page.epoch !== null ? ` · ${page.running ? "started" : "ended"} ${pstDateTime(page.epoch)}` : ""}
          {page.listLabel ? ` · ${page.listLabel}` : ""}
        </span>
        {page.running && page.runningBoxes.length ? (
          <span className="block text-xs text-muted">
            {/* Unit VW99 (Q-A 3:27.4): "Working now" in the blue of the running state. */}
            <span className="rounded bg-state-run px-1 text-state-run-ink">Working now</span>:{" "}
            {page.runningBoxes.map((b, i) => (
              <span key={b}>
                {i > 0 ? ", " : ""}
                <Code code={b} />
              </span>
            ))}
          </span>
        ) : null}
        {live ? (
          <span data-page-update-now className="block text-xs text-muted">
            <span className="rounded bg-state-run px-1 text-state-run-ink">Working now</span>: <BoxText text={updateSummaryText(live, tick)} />
          </span>
        ) : null}
      </Toggle>
      {open ? (
        <div className="border-t border-line px-2 pb-2 sm:px-4">
          <p className="mt-2 flex flex-wrap gap-x-4 text-xs">
            {page.folder ? (
              <>
                <Link href={pageHref(page.pageId, page.runFolder ?? undefined)} className="text-accent underline underline-offset-2">
                  Page view of this page run
                </Link>
                <a href={jsonViewHref(page.folder)} className="text-accent underline underline-offset-2">
                  Page run folder in the JSON viewer
                </a>
                <span className="font-mono text-muted">{page.runFolder}</span>
              </>
            ) : null}
          </p>
          {page.error ? <p className="mt-2 text-sm text-red-700">{page.error}</p> : null}
          {!page.stepsShown ? <p className="mt-2 text-xs text-muted">Loading the steps of this page…</p> : null}
          {page.groups.map((g) => (
            <GroupItem key={g.key} page={page} group={g} choices={choices} setChoice={setChoice} tick={tick} live={live} />
          ))}
        </div>
      ) : null}
    </li>
  );
}

function GroupItem({ page, group, choices, setChoice, tick, live }: { page: PageNode; group: StepGroup; choices: Choices; setChoice: (k: string, o: boolean) => void; tick: number; live: UpdateLive | null }) {
  return (
    <div data-step-group={group.key} className="mt-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
        <span title={group.help} className="cursor-help underline decoration-dotted underline-offset-2">
          {group.label}
        </span>
      </h3>
      {group.steps.length === 0 ? (
        <p className="pl-2 text-xs text-muted">{group.key === "update" ? "No update point ran after this page." : "No step yet."}</p>
      ) : (
        <ul className="mt-0.5">
          {group.steps.map((s) => (
            <StepItem key={s.id} page={page} step={s} choices={choices} setChoice={setChoice} tick={tick} live={live} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StepItem({ page, step, choices, setChoice, tick, live }: { page: PageNode; step: StepNode; choices: Choices; setChoice: (k: string, o: boolean) => void; tick: number; live: UpdateLive | null }) {
  const key = `step:${page.pageId}:${step.id}`;
  const open = isOpen(key, choices, false);
  const word = stepWord(step.state);
  return (
    <li data-step={step.id} data-step-running={step.running ? "yes" : undefined} aria-current={step.running ? "step" : undefined}>
      <Toggle open={open} onClick={() => setChoice(key, !open)} label={`${step.code} ${step.text}`} mark={step.running}>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Code code={step.code} />
          <span>
            <BoxText text={step.text} />
          </span>
          <StatePill state={word.pill} label={word.label} help={word.help} />
          {step.verdict ? <VerdictPill verdict={step.verdict} score={step.score} /> : null}
        </span>
        <span className="block text-xs text-muted">
          {step.model ? `model ${modelOptionText(step.model)}` : "no model stored"}
          {step.model ? <ModelCardId value={step.model} /> : null}
          {step.seconds !== null ? ` · ${secondsText(step.seconds)}` : ""}
          {step.calls > 0 ? (
            <>
              {" · "}
              <span title={TOKENS_SHORT_HELP}>
                {TOKENS_SHORT_LABEL} {tokensShort(step.tokens)}
              </span>
            </>
          ) : (
            ""
          )}
          {step.calls > 1 ? ` · ${step.calls} calls` : ""}
          {step.startedEpoch !== null ? ` · started ${pstClock(step.startedEpoch)}` : ""}
        </span>
        {step.note ? (
          <span className="block text-xs text-muted">
            <BoxText text={step.note} />
          </span>
        ) : null}
        {/* Unit VW103: the update step that runs now shows its role, try, card and time, and a wait. */}
        {live && step.running && step.id === `update:${live.box}` ? <UpdateLiveBlock live={live} now={tick} /> : null}
      </Toggle>
      {open ? (
        <div className="mb-2 ml-5 border-l border-line pl-3">
          <StepDataPanel query={stepQuery(page, step)} reloadKey={step.running ? tick : 0} />
        </div>
      ) : null}
    </li>
  );
}

/** Level 3: the data of one step. It loads once when it opens, and again at each update only while the step runs (Q-A 3:19.3 D3). */
// Unit VW98: `base` lets the training monitor load the data of a critique, an update point or a rubric table change (/api/monitor/phase-2/box).
// Unit VW85 (Q-A 3:26.3 (a)): a book run adds the store part (list=<stamp> or book=<slug>) to the query. Phase 2 adds nothing.
export function StepDataPanel({ query: query0, reloadKey, base = "/api/monitor/phase-2/step" }: { query: string; reloadKey: number; base?: string }) {
  const query = withStoreQuery(query0, useRunStoreQuery());
  const [data, setData] = useState<StepData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let gone = false;
    fetch(`${base}?${query}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`answer ${r.status}`);
        const d = (await r.json()) as StepData;
        if (!gone) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => {
        if (!gone) setError(`The step data did not load (${e.message}). The next update tries again.`);
      });
    return () => {
      gone = true;
    };
  }, [base, query, reloadKey]);
  if (!data) return <p className="py-1 text-xs text-muted">{error ?? "Loading the step data…"}</p>;
  return (
    <div data-step-data className="space-y-3 py-2 text-sm">
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {data.sections.map((s, i) => (
        <SectionView key={i} s={s} />
      ))}
    </div>
  );
}

function SectionView({ s }: { s: Section }) {
  switch (s.kind) {
    case "note":
      return <p className="text-xs text-muted">{s.text}</p>;
    case "pairs":
      return (
        <div data-section="pairs">
          <h4 className="text-xs font-semibold text-muted">
            <BoxText text={s.title} />
          </h4>
          <dl className="mt-1 grid grid-cols-1 gap-x-4 sm:grid-cols-[minmax(8rem,max-content)_1fr]">
            {s.rows.map(([k, v], i) => (
              <div key={i} className="contents">
                <dt className="text-xs text-muted">
                  <BoxText text={k} />
                </dt>
                <dd className="mb-1 break-words">
                  <BoxText text={v} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case "units":
      return (
        <div data-section="units">
          <h4 className="text-xs font-semibold text-muted">{s.title}</h4>
          <ol className="mt-1 space-y-1">
            {s.rows.map((r, i) => (
              <li key={i} className="break-words">
                <span className="mr-2 font-mono text-xs text-muted">{r.id}</span>
                <span lang={s.lang}>{r.text}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case "critiques":
      return (
        <div data-section="critiques">
          <h4 className="text-xs font-semibold text-muted">{s.title}</h4>
          {s.rows.length === 0 ? <p className="text-xs text-muted">None.</p> : null}
          <ul className="mt-1 space-y-2">
            {s.rows.map((c) => (
              <li key={c.id} className="break-words rounded bg-stone-50 px-2 py-1">
                <div className="font-mono text-xs text-muted">{c.id}</div>
                <div className="font-medium">{c.head}</div>
                {c.reason ? <div>{c.reason}</div> : null}
                {c.ja ? (
                  <div className="text-xs">
                    <span className="text-muted">JA: </span>
                    <span lang="ja">{c.ja}</span>
                  </div>
                ) : null}
                {c.en ? (
                  <div className="text-xs">
                    <span className="text-muted">EN: </span>
                    {c.en}
                  </div>
                ) : null}
                {c.extra ? (
                  <div className="text-xs text-muted">
                    <BoxText text={c.extra} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      );
    case "text":
      return (
        <details data-section="text">
          <summary className="cursor-pointer text-xs font-semibold text-muted">
            {s.title}
            {s.mb ? ` (${s.mb})` : ""}
            {s.file ? <span className="font-normal"> · {s.file.split("/").slice(-2).join("/")}</span> : null}
          </summary>
          <pre className="mt-1 max-h-96 overflow-auto rounded bg-stone-50 p-2 font-mono text-xs whitespace-pre-wrap break-words">{s.text}</pre>
        </details>
      );
    case "diff":
      return <DiffView title={s.title} lines={s.lines} counts={s.counts} />;
    case "links":
      return (
        <div data-section="links" className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="text-muted">{s.title}:</span>
          {s.links.map((l) => (
            <a key={l.href} href={l.href} className="break-all text-accent underline underline-offset-2">
              {l.text}
            </a>
          ))}
        </div>
      );
  }
}

/** A line diff, closed by default (prompt texts are long). Removed lines start with "-", added lines with "+". */
export function DiffView({ title, lines, counts }: { title: string; lines: Extract<Section, { kind: "diff" }>["lines"]; counts: { removed: number; added: number; same: number } }) {
  const blocks = diffBlocks(lines);
  return (
    <details data-section="diff">
      <summary className="cursor-pointer text-xs font-semibold text-muted">
        {title}: {counts.removed} lines removed, {counts.added} lines added, {counts.same} lines the same
      </summary>
      <div className="mt-1 max-h-[32rem] overflow-auto rounded border border-line font-mono text-xs">
        {blocks.map((b, i) =>
          b.kind === "fold" ? (
            <div key={i} className="bg-stone-50 px-2 py-0.5 text-muted">
              … {b.count} same {b.count === 1 ? "line" : "lines"} (old line {b.fromOld}, new line {b.fromNew})
            </div>
          ) : (
            b.lines.map((l, j) => (
              <div
                key={`${i}-${j}`}
                data-diff={l.op}
                className={`px-2 whitespace-pre-wrap break-words ${l.op === "removed" ? "bg-red-50 text-red-800" : l.op === "added" ? "bg-green-100 text-green-800" : ""}`}
              >
                <span aria-hidden="true">{l.op === "removed" ? "- " : l.op === "added" ? "+ " : "  "}</span>
                <span className="sr-only">{l.op === "removed" ? "removed: " : l.op === "added" ? "added: " : ""}</span>
                {l.text || " "}
              </div>
            ))
          ),
        )}
      </div>
    </details>
  );
}

/** Run view section "Prompt updates" (Q-A 3:18.3): one entry per update point, in run order, with its data and diff on request. */
export function PromptUpdates({ updates, choices, setChoice, tick, live = null }: { updates: (UpdatePoint & { pageText: string })[]; choices: Choices; setChoice: (k: string, o: boolean) => void; tick: number; live?: UpdateLive | null }) {
  return (
    <section data-prompt-updates className="mt-6">
      <h2 className="section-band mb-1 text-lg font-semibold">Prompt updates</h2>
      <p className="mb-2 text-sm text-muted">
        One entry per update point of this run, in run order. Open an entry to see its calls, its critique groups, and the line diff of the prompt text (old version against new version). Rubric table
        changes show in the same entry.
      </p>
      {updates.length === 0 ? <p className="text-sm text-muted">No update point ran in this run yet.</p> : null}
      <ol className="space-y-1">
        {updates.map((u, i) => {
          const key = `update:${u.page}:${u.box}:${i}`;
          const open = isOpen(key, choices, false);
          return (
            <li key={key} data-prompt-update={`${u.box}@${u.page}`} className="rounded border border-line bg-white">
              <Toggle open={open} onClick={() => setChoice(key, !open)} label={`Prompt update of ${u.box} after page ${u.page}`} mark={u.endedEpoch === null}>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="text-muted">{u.startedEpoch !== null ? pstDateTime(u.startedEpoch) : "time not stored"}</span>
                  <Code code={u.box} />
                  <StatePill state={u.endedEpoch === null ? "running" : "done"} label={u.endedEpoch === null ? "Working now" : (u.result ?? "Ended")} help={u.endedEpoch === null ? "The update point started and did not end yet." : `Result of the update point (history.jsonl event update-point-ended): ${u.result ?? "not stored"}.`} />
                </span>
                <span className="block text-xs text-muted">after page: {u.pageText}</span>
                <span className="block text-xs text-muted">
                  <BoxText text={updateNote(u)} />
                </span>
                {/* Unit VW103: the entry of the update point that runs now shows its role, try, card, time and wait. */}
                {live && u.endedEpoch === null && live.box === u.box && live.page === u.page ? <UpdateLiveBlock live={live} now={tick} /> : null}
              </Toggle>
              {open ? (
                <div className="border-t border-line px-3 pb-2">
                  <StepDataPanel query={`page=${encodeURIComponent(u.page)}&step=${encodeURIComponent(`update:${u.box}`)}`} reloadKey={u.endedEpoch === null ? tick : 0} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
