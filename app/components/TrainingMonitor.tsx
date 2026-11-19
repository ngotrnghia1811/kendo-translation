"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { POLL_MS } from "./useLive";
import { BoxCode } from "./BoxCode";
import { boxHelp } from "@/lib/box-names";
import { pstClock } from "@/lib/format";
import { EVENT_KINDS, MONITOR_BOXES, parseBoxParam, type BoxMonitor, type EventKind, type MonitorUnchanged } from "@/lib/training-monitor";
import { KindTicks, MonitorHeader, TimeLine } from "./TrainingMonitorView";
// Unit VW85 (Q-A 3:26.3): the same monitor for a book run, with the frozen line (b) and the overflow list (c).
import { FROZEN_HELP, storeQuery } from "@/lib/run-store";
import { RunStoreQueryProvider } from "./RunStoreQuery";
import { FrozenLine, OverflowList } from "./RunStoreParts";

// Unit VW98 (round 91). Section "Training monitor" of the run view /runs/<stamp> of a phase 2 list (Q-A 3:23.3 "Section with box picker in the run view").
// 16 box buttons; a click shows the history of that box below and sets ?box=TL_2 in the address, so a kept link opens that box.
// Live (Q-A 3:23.4): the summary updates every 3 s while the tab is visible. The poll sends the signature of the data that the screen holds,
// and the server answers {unchanged: true} when nothing changed. Opened lines stay open across the updates.

const ALL_ON: Record<EventKind, boolean> = Object.fromEntries(EVENT_KINDS.map((k) => [k, true])) as Record<EventKind, boolean>;

/**
 * `book`: the slug of the book of a book-run list (unit VW85), else undefined for a phase 2 list. A phase 2 list keeps its words and addresses (VW98).
 * A book run sends "list=<stamp>" with each opened line too, so the server reads book-store/<book>/ (components/RunStoreQuery.tsx).
 */
export function TrainingMonitor({ stamp, book }: { stamp: string; book?: string | null }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const box = parseBoxParam(params.get("box"));
  const wrongBox = params.get("box") !== null && box === null;
  const pick = (code: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (code) next.set("box", code);
    else next.delete("box");
    const q = next.toString();
    // Next.js: window.history.pushState updates useSearchParams with no server round trip.
    window.history.pushState(null, "", `${pathname}${q ? `?${q}` : ""}`);
  };
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (box && window.location.hash === "#training-monitor") ref.current?.scrollIntoView({ block: "start" });
  }, [box]);
  return (
    <section ref={ref} id="training-monitor" data-training-monitor className="scroll-mt-4">
      <h2 className="section-band mb-1 text-lg font-semibold">Training monitor</h2>
      <p className="mb-2 text-sm text-muted">
        {book ? (
          <>
            Pick a box to see its whole history in this book run, across restarts: its page calls, the critiques that it got, its update points, the
            rubric table changes (QA boxes), whether it is frozen, and the overflow critiques that started at it. Hover a code for the name of the box.
          </>
        ) : (
          <>
            Pick a box to see its whole history in this phase 2 run, across restarts: its page calls, the critiques that it got, its update points, and the
            rubric table changes (QA boxes). Hover a code for the name of the box.
          </>
        )}
      </p>
      <BoxPicker box={box} pick={pick} />
      {wrongBox ? <p className="mt-2 text-sm text-red-700">The address names an unknown box ({params.get("box")}). Pick one of the 16 boxes.</p> : null}
      <RunStoreQueryProvider query={storeQuery({ book: book ?? null, list: stamp })}>
        {box ? <BoxPanel key={box} stamp={stamp} box={box} /> : <p className="mt-3 text-sm text-muted">No box picked yet.</p>}
      </RunStoreQueryProvider>
    </section>
  );
}

/** 4 x 4 grid: one row per level (0 weakest model, 3 strongest model), one column per role. */
export function BoxPicker({ box, pick }: { box: string | null; pick: (code: string | null) => void }) {
  const rows = [0, 1, 2, 3].map((n) => MONITOR_BOXES.filter((b) => b.endsWith(`_${n}`)));
  return (
    <div data-box-picker role="group" aria-label="Box picker" className="grid max-w-md grid-cols-[auto_repeat(4,minmax(0,1fr))] items-center gap-1 text-sm">
      {rows.map((codes, n) => (
        <div key={n} className="contents">
          <span className="pr-1 text-xs text-muted">Level {n}</span>
          {codes.map((c) => {
            const on = c === box;
            return (
              <button
                key={c}
                type="button"
                data-box-button={c}
                aria-pressed={on}
                title={boxHelp(c) ?? c}
                onClick={() => pick(on ? null : c)}
                className={`rounded border px-1 py-1 font-mono ${on ? "border-tab-on bg-tab-on font-semibold text-tab-on-ink" : "border-line bg-white hover:bg-stone-50"}`}
              >
                <BoxCode code={c} />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function BoxPanel({ stamp, box }: { stamp: string; box: string }) {
  const [data, setData] = useState<BoxMonitor | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [updated, setUpdated] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [shown, setShownState] = useState<Record<EventKind, boolean>>(ALL_ON);
  const [opened, setOpenedState] = useState<Record<string, boolean>>({});
  const sig = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const q = new URLSearchParams({ list: stamp, box });
      if (sig.current) q.set("sig", sig.current);
      const r = await fetch(`/api/monitor/phase-2/box?${q}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`answer ${r.status}`);
      const d = (await r.json()) as BoxMonitor | MonitorUnchanged;
      if ("unchanged" in d) {
        setUpdated(d.generatedEpoch);
      } else {
        sig.current = d.error ? null : d.sig;
        setData(d);
        setUpdated(d.generatedEpoch);
        setTick((t) => t + 1);
      }
      setFailed(null);
    } catch (e) {
      setFailed(`The training monitor did not load (${(e as Error).message}). The next update tries again.`);
    }
  }, [stamp, box]);
  useEffect(() => {
    // Unit VW116 (Q-A 3:95.4 row d): the code checker rule react-hooks/set-state-in-effect found the direct call `void refresh()` here, because refresh sets state.
    // The first read now starts from a timer of 0 ms (one tick later, not visible), like the later reads that start from the interval. The cleanup clears the timer.
    const first = setTimeout(() => void refresh(), 0);
    const visible = () => document.visibilityState === "visible";
    const id = setInterval(() => {
      if (visible()) void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (visible()) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);
  return (
    <div data-monitor-box={box} className="mt-3">
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted">
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        Live, refresh every 3 seconds{updated !== null ? ` · last check ${pstClock(updated)}` : ""}
      </p>
      {failed ? <p className="mb-2 text-sm text-red-700">{failed}</p> : null}
      {data ? (
        <>
          <MonitorHeader data={data} />
          {data.book ? (
            <>
              <p data-monitor-frozen className="mt-1 rounded border border-line bg-white px-3 py-2 text-sm">
                {data.frozen ? (
                  <FrozenLine f={data.frozen} title={data.book.title} />
                ) : (
                  <span className="text-muted" title={FROZEN_HELP}>
                    Not frozen in this run.
                  </span>
                )}
              </p>
              <OverflowList box={data.box} rows={data.overflow} title={data.book.title} />
            </>
          ) : null}
          <KindTicks events={data.events} shown={shown} setShown={(k, on) => setShownState((s) => ({ ...s, [k]: on }))} />
          <TimeLine data={data} shown={shown} opened={opened} setOpened={(k, o) => setOpenedState((s) => ({ ...s, [k]: o }))} tick={tick} />
        </>
      ) : (
        <p className="text-sm text-muted">Loading the training monitor of {box}…</p>
      )}
    </div>
  );
}
