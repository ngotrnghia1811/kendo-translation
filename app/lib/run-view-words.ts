// Unit VW94 fix round (round 91). Owner rule Q-A 3:17.4 (2026-11-11): "Annotate the names intuitively and properly. I cant understand what they are
// if you just write `Running` and each name is a long id number. Apply this for EVERYTHING."
// The run view /runs/<stamp> is a screen that this unit changed, so its heading and its state pills get plain words here.
// Sources of the state values:
//   - list states: <T2>/data/scripts/translator/progress.py:16 (completed, completed with failures, interrupted), :19 (stopped, paused after page),
//     :150 (running), :241 (paused).
//   - page states: progress.py:217-218 (done, interrupted, failed), waiting and running (progress.py:236-237), skipped (Viewer: a skipped reason).
//   - help words for paused: progress.py:323 "New calls wait. Calls that run now will finish."
// Pure: no file read. The words are unit defaults of VW94 (aki-main lists them for the owner).

import { listLabel } from "./phase2-articles";

export interface StateWord {
  /** The plain word on the pill. */
  label: string;
  /** The hover help of the pill. */
  help: string;
}

/** States of a list (progress.json key state). */
export const LIST_STATE_WORDS: Record<string, StateWord> = {
  running: { label: "Translating now", help: "Translating now (state running): the list runs now. The Translator works on its pages." },
  paused: { label: "Paused", help: "Paused (state paused): new calls wait. Calls that run now will finish." },
  "paused after page": { label: "Paused after page", help: "Paused after page (state paused after page): the run paused after the end of a page." },
  completed: { label: "Translated", help: "Translated (state completed): the list ended, and every page ended without a failure." },
  "completed with failures": {
    label: "Translated, with failures",
    help: "Translated, with failures (state completed with failures): the list ended, but one page or more failed. See the State column.",
  },
  interrupted: { label: "Interrupted", help: "Interrupted (state interrupted): the list stopped before its end." },
  stopped: { label: "Stopped", help: "Stopped (state stopped): the run stopped this list before its end. A restart starts a new list." },
  failed: { label: "Failed", help: "Failed (state failed): the list ended with an error." },
};

/** States of a page in a list (progress.json pages[].state), plus "skipped" and "accepted before restart" of the Viewer. */
export const PAGE_STATE_WORDS: Record<string, StateWord> = {
  waiting: { label: "Not started yet", help: "Not started yet (state waiting): this list did not start the page yet." },
  running: { label: "Translating now", help: "Translating now (state running): the Translator works on this page now." },
  done: { label: "Translated", help: "Translated (state done): this list ended the page. See the QA_3 verdict." },
  failed: { label: "Failed", help: "Failed (state failed): the page run ended with an error." },
  interrupted: { label: "Interrupted", help: "Interrupted (state interrupted): the page run stopped before its end." },
  skipped: { label: "Skipped", help: "Skipped: this list did not run the page. See the reason." },
};

function wordOf(table: Record<string, StateWord>, state: string): StateWord {
  return table[state] ?? { label: state || "unknown", help: `State "${state || "unknown"}" of progress.json. The Viewer has no plain word for it.` };
}

export function listStateWord(state: string): StateWord {
  return wordOf(LIST_STATE_WORDS, state);
}

export function pageStateWord(state: string): StateWord {
  return wordOf(PAGE_STATE_WORDS, state);
}

/** Plain name of a list kind (lib/chain.ts listKindOf). "Pilot list" and "book run" are the words of lib/book-run-rules.ts. */
export const LIST_KIND_WORDS: Record<string, string> = {
  chain: "Chain list",
  "book-run": "Book run list",
  list: "Pilot list",
};

export function listKindWord(kind: string, phase2: boolean): string {
  return phase2 ? "Phase 2 run" : (LIST_KIND_WORDS[kind] ?? `List of kind ${kind}`);
}

/**
 * The heading of the run view. A phase 2 list gives "Phase 2 run, list started 2026-11-11 20:41 PST".
 * Another list gives for example "Chain list, started 2026-10-28 18:30 PST". The stamp stays in the URL and shows in small grey text.
 */
export function runHeading(stamp: string, kind: string, phase2: boolean): string {
  const when = listLabel(stamp);
  return phase2 ? `Phase 2 run, ${when}` : `${listKindWord(kind, false)}, ${when.replace(/^list /, "")}`;
}
