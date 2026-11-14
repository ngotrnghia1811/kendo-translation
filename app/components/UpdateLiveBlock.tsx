import { updateLines } from "@/lib/update-live";
import type { UpdateLive } from "@/lib/update-live";
import { BoxText } from "./BoxCode";

// Unit VW103 (round 91), Q-A 3:36.4: the running update point under its step of the step view and of the run view (the tab "Prompt updates").
// The lines come from updateLines (lib/update-live.ts), so a node test checks the same words. Box codes keep their code and get a hover (Q-A 3:18.5).
// Colors: only the theme variables of unit VW99, in classes that scripts/contrast-dark.mjs already tests (state-run for "Working now", state-stop for a wait).
// The block holds only spans, because it sits inside the button of a step (a button takes no block element).
export function UpdateLiveBlock({ live, now }: { live: UpdateLive; now: number }) {
  const lines = updateLines(live, now, { pageLabel: null, place: "step", withWait: true });
  return (
    <span data-update-live className="mt-0.5 block text-xs text-muted">
      {lines.map((l) => (
        <span key={l.key} data-update-live-line={l.key} className="block">
          {l.key === "update-now" ? (
            <>
              <span className="rounded bg-state-run px-1 text-state-run-ink">Working now</span>:{" "}
            </>
          ) : null}
          {l.key === "waiting" ? (
            <>
              <span className="rounded bg-state-stop px-1 text-state-stop-ink">Waiting</span>:{" "}
            </>
          ) : null}
          <BoxText text={l.text} />
        </span>
      ))}
    </span>
  );
}
