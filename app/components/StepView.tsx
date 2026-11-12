"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StepSummary } from "@/lib/step-tree";
import { openParam, runWord } from "@/lib/step-tree";
import { LiveBadge, useLive } from "./useLive";
import { PromptUpdates, StepTree, type Choices } from "./StepTree";

// Unit VW95 (round 91). The live wrapper of the tree: the step view /monitor/phase-2 (list null) and the run view /runs/<stamp> of a phase 2 list
// (list = the stamp, initial null: the summary loads after the first paint). Q-A 3:19.3 D3: it updates every 3 s while the tab is visible
// (useLive, POLL_MS 3000). The fold choices stay in this component, so open nodes stay open across updates.

const EMPTY: StepSummary = {
  runId: null,
  runLabel: "phase 2 run",
  runWord: runWord(null),
  lists: [],
  pages: [],
  notStarted: [],
  updates: [],
  generatedEpoch: 0,
  millis: 0,
  error: null,
};

export default function StepView({ initial, list, showUpdates = false }: { initial: StepSummary | null; list: string | null; showUpdates?: boolean }) {
  const [choices, setChoices] = useState<Choices>({});
  const setChoice = useCallback((key: string, open: boolean) => setChoices((c) => ({ ...c, [key]: open })), []);
  // The open pages go into the query, so the next answer carries their steps. The running page carries them always.
  const openPages = Object.keys(choices)
    .filter((k) => k.startsWith("page:") && choices[k])
    .map((k) => k.slice(5));
  const params = new URLSearchParams();
  if (list) params.set("list", list);
  const open = openParam(openPages);
  if (open) params.set("open", open);
  const qs = params.toString();
  const url = qs ? `/api/monitor/phase-2?${qs}` : "/api/monitor/phase-2";
  const { data, refresh, live } = useLive<StepSummary>(url, initial ?? EMPTY, () => true);
  const [loaded, setLoaded] = useState(initial !== null);
  const first = useRef(true);
  useEffect(() => {
    // The first paint of the step view has its data from the server. Later, a new set of open pages loads at once.
    if (first.current && initial !== null) {
      first.current = false;
      return;
    }
    first.current = false;
    void refresh().then(() => setLoaded(true));
  }, [url, initial, refresh]);
  if (!loaded) return <p className="text-sm text-muted">Loading the steps of the phase 2 run…</p>;
  return (
    <div data-step-view>
      <div className="mb-2">
        <LiveBadge live={live} />
      </div>
      <StepTree summary={data} choices={choices} setChoice={setChoice} />
      {showUpdates ? <PromptUpdates updates={data.updates} choices={choices} setChoice={setChoice} tick={data.generatedEpoch} /> : null}
    </div>
  );
}
