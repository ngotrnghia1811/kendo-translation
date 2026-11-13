"use client";
import type { ReactNode } from "react";
import { pstDateTime } from "@/lib/format";
import { stepWord, versionChange } from "@/lib/step-tree";
import { TOKENS_SHORT_HELP, TOKENS_SHORT_LABEL, tokensShort } from "@/lib/tokens-view";
import { modelOptionText } from "@/lib/readable-names";
import { TITLES_NOTE } from "@/lib/phase2-articles";
import {
  CRITIQUE_STATUS_WORDS,
  EVENT_KINDS,
  EVENT_KIND_WORDS,
  critiqueHead,
  durationText,
  groupsWords,
  nText,
  pageWords,
  sourceWord,
  waitingText,
  type BoxMonitor,
  type CallEvent,
  type Count,
  type CritiqueEvent,
  type EventKind,
  type MonitorEvent,
  type RubricEvent,
  type UpdateEvent,
} from "@/lib/training-monitor";
import { BoxCode } from "./BoxCode";
import { ModelCardId } from "./ModelCardId";
import { StatePill, VerdictPill } from "./Pills";
import { StepDataPanel } from "./StepTree";

// Unit VW98 (round 91). The header with the training statistics and the time line of one box (Q-A 3:23.4 "Header plus time line as shown",
// note "With training statistics (number of critique, types, updates, etc)"). It only renders: lib/training-monitor.ts builds the data.

const ITEM_API = "/api/monitor/phase-2/box";

function countsText(list: Count[], empty = "none"): string {
  return list.length ? list.map((c) => `${c.label} ${c.n}`).join(" · ") : empty;
}

function Row({ name, help, children }: { name: string; help?: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-xs text-muted" title={help}>
        {name}
      </dt>
      <dd className="mb-1 break-words">{children}</dd>
    </div>
  );
}

function Tokens({ tokens }: { tokens: CallEvent["tokens"] }) {
  return (
    <span title={TOKENS_SHORT_HELP}>
      {TOKENS_SHORT_LABEL} {tokensShort(tokens)}
    </span>
  );
}

function mean(n: number | null, digits = 1): string {
  return n === null ? "–" : n.toFixed(digits);
}

/** Header: box, live prompt version, what runs now, and the block "Training statistics". */
export function MonitorHeader({ data }: { data: BoxMonitor }) {
  const s = data.stats;
  const qa = s.calls.qa;
  const versions = s.versions.list;
  return (
    <div data-monitor-header className="rounded border border-line bg-white p-3">
      <h3 className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold">
        <span className="font-mono">
          <BoxCode code={data.box} />
        </span>
        <span className="text-sm font-normal">{data.name}</span>
      </h3>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span>
          Live prompt version <span className="font-mono">{s.versions.live ?? "not stored"}</span>
        </span>
        <span className="text-muted">{data.runLabel}</span>
        <StatePill state={data.runWord.pill} label={data.runWord.label} help={data.runWord.help} />
      </p>
      {data.now ? (
        <p data-monitor-now className="mt-1 text-sm">
          {data.now.thisBox ? <StatePill state="running" label="This box works now" help="The box or its critic or its update point runs now (status.json running_boxes, history.jsonl)." /> : null}{" "}
          <span className="text-muted">
            Now: {data.now.pageLabel ? `translating ${data.now.pageLabel}` : data.now.page ? `page ${data.now.page}` : "between pages"}
            {data.now.boxes.length ? ", working box " : ""}
            {data.now.boxes.map((b, i) => (
              <span key={b}>
                {i ? ", " : ""}
                <BoxCode code={b} />
              </span>
            ))}
          </span>
        </p>
      ) : null}
      {data.error ? <p className="mt-2 text-sm text-red-700">{data.error}</p> : null}
      <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Training statistics</h4>
      <dl data-monitor-stats className="mt-1 grid grid-cols-1 gap-x-4 text-sm sm:grid-cols-[minmax(9rem,max-content)_1fr]">
        <Row name="Critiques" help="Rows of critiques/queue-<BOX>.jsonl of each page run of this run.">
          {s.critiques.total} in total
          <span className="block text-xs text-muted">by source: {countsText(s.critiques.bySource)}</span>
          <span className="block text-xs text-muted">by state: {countsText(s.critiques.byStatus)}</span>
          <span className="block text-xs text-muted">
            group marks: {s.critiques.soft} soft, {s.critiques.hard} hard, {s.critiques.noMark} without a mark (not grouped yet, or mark not stored)
          </span>
        </Row>
        <Row name="Waiting in the queue" help="Critiques of accepted pages that no update point used yet (critique_queue.py).">
          <span data-monitor-waiting>{waitingText(s.waiting)}</span>
          <span className="block text-xs text-muted">{nText(s.waiting.n, s.waiting.nSource)}</span>
        </Row>
        <Row name="Failure modes" help="Key critique.failure_mode of each critique, cut to 120 characters.">
          {s.critiques.failureModes} different
          {s.critiques.byFailureMode.length ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted">Show the failure modes, most frequent first{s.critiques.byFailureMode.length < s.critiques.failureModes ? ` (first ${s.critiques.byFailureMode.length})` : ""}</summary>
              <ol className="mt-1 space-y-0.5">
                {s.critiques.byFailureMode.map((c, i) => (
                  <li key={i} className="break-words">
                    <span className="font-mono text-muted">{c.n}×</span> {c.label}
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
        </Row>
        <Row name="Update points" help="history.jsonl: update-point-started and update-point-ended of this box in this run.">
          {s.updates.total} in total{s.updates.running ? `, ${s.updates.running} runs now` : ""}
          <span className="block text-xs text-muted">by result: {countsText(s.updates.byResult)}</span>
          <span className="block text-xs text-muted">audit verdicts: {countsText(s.updates.audit)}</span>
          <span className="block text-xs text-muted">
            prompt rewrites that the program check rejected: {s.updates.rejectedTries} · critique groups: {groupsWords(s.updates.softGroups, s.updates.hardGroups) ?? "–"}
          </span>
        </Row>
        <Row name="Prompt versions" help="Files prompts/<BOX>/v*.json and the file current.">
          {versions.length ? `${versions[0]} to ${versions[versions.length - 1]} (${versions.length} versions)` : "no version file"} · live {s.versions.live ?? "not stored"}
        </Row>
        <Row name="Page calls" help="Rows of calls.jsonl of each page run with the tag of this box.">
          {s.calls.pages} pages{s.calls.failed ? `, ${s.calls.failed} failed` : ""} · {durationText(s.calls.seconds)} in total, mean {durationText(s.calls.meanSeconds)} per page
          <span className="block text-xs text-muted">
            <Tokens tokens={s.calls.tokens} />
          </span>
          {qa ? (
            <span data-monitor-qa className="block text-xs text-muted">
              verdict PASS {qa.pass} · FAIL {qa.fail}
              {qa.other ? ` · other ${qa.other}` : ""} · mean page score {mean(qa.meanScore)}
            </span>
          ) : null}
        </Row>
        {s.rubric ? (
          <Row name="Rubric table" help="rubric-tables/changes.jsonl rows of this box, and rubric-tables/<BOX>/current.">
            {s.rubric.changes} changes in this run · live version {s.rubric.live ?? "not stored"}
          </Row>
        ) : null}
        <Row name="Critiques per page" help="One bar per page in run order. Hover a bar for the page and the count.">
          <Trend trend={s.trend} />
        </Row>
      </dl>
      <p className="mt-2 text-xs text-muted">{TITLES_NOTE}</p>
    </div>
  );
}

/** A small bar per page (plain CSS, no chart package). */
export function Trend({ trend }: { trend: BoxMonitor["stats"]["trend"] }) {
  if (!trend.length) return <span className="text-muted">no page run yet</span>;
  const max = Math.max(1, ...trend.map((t) => t.n));
  const withAny = trend.filter((t) => t.n > 0).length;
  return (
    <span data-monitor-trend className="block">
      <span className="flex flex-wrap items-end gap-px" style={{ minHeight: "1.5rem" }} aria-hidden="true">
        {trend.map((t) => (
          <span
            key={t.pageId}
            title={`${t.label}: ${t.n} ${t.n === 1 ? "critique" : "critiques"}`}
            className={t.n ? "inline-block w-1.5 bg-blue-800" : "inline-block w-1.5 bg-stone-200"}
            style={{ height: `${t.n ? Math.max(4, Math.round((t.n / max) * 24)) : 2}px` }}
          />
        ))}
      </span>
      <span className="block text-xs text-muted">
        {withAny} of {trend.length} pages got critiques · most on one page: {max === 1 && withAny === 0 ? 0 : max}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------- time line

function CallLine({ e }: { e: CallEvent }) {
  const w = stepWord(e.state);
  return (
    <>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="text-xs font-semibold text-muted">Page call</span>
        <span>{pageWords(e.page)}</span>
        <StatePill state={w.pill} label={w.label} help={w.help} />
        {e.verdict ? <VerdictPill verdict={e.verdict} score={e.score} /> : null}
      </span>
      <span className="block text-xs text-muted">
        {e.model ? `model ${modelOptionText(e.model)}` : "no model stored"}
        {e.model ? <ModelCardId value={e.model} /> : null}
        {` · ${durationText(e.seconds)}`}
        {e.calls > 0 ? (
          <>
            {" · "}
            <Tokens tokens={e.tokens} />
          </>
        ) : null}
        {e.calls > 1 ? ` · ${e.calls} calls` : ""}
        {` · prompt ${e.promptVersion ?? "version not stored"}`}
        {e.score !== null ? ` · page score ${e.score}` : ""}
        {e.error ? ` · error: ${e.error}` : ""}
      </span>
      <TimeAndId epoch={e.running ? null : e.epoch} id={e.page.id} running={e.running} />
    </>
  );
}

function CritiqueLine({ e }: { e: CritiqueEvent }) {
  const w = CRITIQUE_STATUS_WORDS[e.status];
  return (
    <>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span title={sourceWord(e.source).help}>{critiqueHead(e)}</span>
        <StatePill state={w.pill} label={w.label} help={w.help} />
      </span>
      <span className="block break-words text-sm">{e.failureMode ?? "no failure mode stored"}</span>
      {e.reason ? <span className="block break-words text-xs text-muted">{e.reason}</span> : null}
      <span className="block text-xs text-muted">
        on {pageWords(e.page)} · prompt {e.instructionVersion ?? "version not stored"}
        {e.usedEpoch !== null ? ` · used by the update point of ${pstDateTime(e.usedEpoch)}` : ""}
      </span>
      <TimeAndId epoch={e.epoch} id={e.queueId} running={false} prefix="critic call" />
    </>
  );
}

function UpdateLine({ e }: { e: UpdateEvent }) {
  const w = e.running ? stepWord("update-running") : stepWord(e.result === "rewrite live" ? "done" : "ended");
  const groups = groupsWords(e.softGroups, e.hardGroups);
  return (
    <>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="text-xs font-semibold text-muted">Update point</span>
        <span>{e.epoch !== null ? pstDateTime(e.epoch) : "time not stored"}</span>
        <StatePill state={w.pill} label={e.running ? w.label : (e.result ?? "result not stored")} help={w.help} />
      </span>
      <span className="block text-sm">
        after {e.pageText} · {groups ?? "group counts not stored"} · audit {e.audit ?? (e.running ? "not yet" : "not stored")} ·{" "}
        <span className="font-mono">{versionChange(e.parent, e.version) ?? "no new version"}</span>
      </span>
      <span className="block text-xs text-muted">
        {e.queueCount} critiques used
        {e.rejected ? ` · ${e.rejected} rewrite ${e.rejected === 1 ? "try" : "tries"} rejected` : ""}
        {e.seconds !== null ? ` · ${durationText(e.seconds)}` : ""}
        {e.calls ? ` · ${e.calls} calls` : ""}
        {e.calls ? (
          <>
            {" · "}
            <Tokens tokens={e.tokens} />
          </>
        ) : null}
        {e.rubric ? ` · rubric table ${e.rubric}` : ""}
      </span>
    </>
  );
}

function RubricLine({ e }: { e: RubricEvent }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="text-xs font-semibold text-muted">Rubric table change</span>
        <span>{e.epoch !== null ? pstDateTime(e.epoch) : "time not stored"}</span>
        <span className="font-mono text-xs">{e.changeId}</span>
      </span>
      <span className="block text-sm">
        {e.changeKind ?? "change"} · row {e.row ?? "?"}
        {e.name ? ` (${e.name})` : ""} · <span className="font-mono">{versionChange(e.parent, e.version) ?? "no version stored"}</span>
      </span>
      {e.pageText ? <span className="block text-xs text-muted">after {e.pageText}</span> : null}
    </>
  );
}

function TimeAndId({ epoch, id, running, prefix }: { epoch: number | null; id: string; running: boolean; prefix?: string }) {
  return (
    <span className="block text-xs text-muted">
      {running ? "runs now" : epoch !== null ? `${prefix ? `${prefix} ` : ""}${pstDateTime(epoch)}` : "time not stored"} · <span className="font-mono">{id}</span>
    </span>
  );
}

/** The query of the data of one opened line. */
export function itemQuery(box: string, e: MonitorEvent): { base?: string; query: string } | null {
  if (e.kind === "call") return e.folder ? { query: `folder=${encodeURIComponent(e.folder)}&step=${encodeURIComponent(`box:${box}`)}` } : null;
  if (e.kind === "critique") return e.folder ? { base: ITEM_API, query: `item=critique&box=${box}&folder=${encodeURIComponent(e.folder)}&queue=${encodeURIComponent(e.queueId)}` } : null;
  if (e.kind === "update") return { base: ITEM_API, query: `item=update&box=${box}&page=${encodeURIComponent(e.page.id)}` };
  return { base: ITEM_API, query: `item=rubric&box=${box}&change=${encodeURIComponent(e.changeId)}` };
}

const KIND_MARK: Record<EventKind, string> = {
  call: "border-l-4 border-line",
  critique: "border-l-4 border-stone-200",
  update: "border-l-4 border-blue-800",
  rubric: "border-l-4 border-blue-800",
};

export function EventItem({ box, e, open, setOpen, tick }: { box: string; e: MonitorEvent; open: boolean; setOpen: (o: boolean) => void; tick: number }) {
  const q = itemQuery(box, e);
  return (
    <li data-monitor-event={e.kind} data-monitor-running={e.running ? "yes" : undefined} aria-current={e.running ? "step" : undefined} className="rounded bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex w-full min-w-0 items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-stone-50 ${e.running ? "border-l-4 border-blue-800 bg-blue-50" : KIND_MARK[e.kind]}`}
      >
        <span aria-hidden="true" className="mt-0.5 w-3 shrink-0 text-muted">
          {open ? "▾" : "▸"}
        </span>
        <span className="min-w-0 flex-1">
          {e.kind === "call" ? <CallLine e={e} /> : null}
          {e.kind === "critique" ? <CritiqueLine e={e} /> : null}
          {e.kind === "update" ? <UpdateLine e={e} /> : null}
          {e.kind === "rubric" ? <RubricLine e={e} /> : null}
        </span>
      </button>
      {open ? (
        <div className="mb-2 ml-5 border-l border-line pl-3">
          {q ? <StepDataPanel base={q.base} query={q.query} reloadKey={e.running ? tick : 0} /> : <p className="py-1 text-xs text-muted">No page run folder is stored for this line.</p>}
        </div>
      ) : null}
    </li>
  );
}

/** Tick boxes per event kind, with the count of each kind. */
export function KindTicks({ events, shown, setShown }: { events: MonitorEvent[]; shown: Record<EventKind, boolean>; setShown: (k: EventKind, on: boolean) => void }) {
  return (
    <fieldset data-monitor-ticks className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <legend className="sr-only">Event kinds to show</legend>
      {EVENT_KINDS.map((k) => (
        <label key={k} className="inline-flex items-center gap-1.5">
          <input type="checkbox" data-monitor-tick={k} checked={shown[k]} onChange={(ev) => setShown(k, ev.target.checked)} />
          {EVENT_KIND_WORDS[k]} ({events.filter((e) => e.kind === k).length})
        </label>
      ))}
    </fieldset>
  );
}

/** The time line in run order across restarts. */
export function TimeLine({
  data,
  shown,
  opened,
  setOpened,
  tick,
}: {
  data: BoxMonitor;
  shown: Record<EventKind, boolean>;
  opened: Record<string, boolean>;
  setOpened: (key: string, open: boolean) => void;
  tick: number;
}) {
  const list = data.events.filter((e) => shown[e.kind]);
  return (
    <div data-monitor-timeline className="mt-2">
      <p className="text-xs text-muted">
        Time line in run order, across restarts: {list.length} of {data.events.length} lines shown. A critique has no time of its own, so it shows at the time of
        its critic call.
      </p>
      {list.length === 0 ? <p className="mt-2 text-sm text-muted">No line to show. Tick an event kind above, or wait for the first page call of this box.</p> : null}
      <ol className="mt-2 space-y-1">
        {list.map((e) => (
          <EventItem key={e.key} box={data.box} e={e} open={opened[e.key] === true} setOpen={(o) => setOpened(e.key, o)} tick={tick} />
        ))}
      </ol>
    </div>
  );
}
