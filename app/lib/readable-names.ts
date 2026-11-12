// Unit VW96 (round 91), card P31.3. Owner rule Q-A 3:17.4 (2026-11-11): "Annotate the names intuitively and properly. I cant understand what they are
// if you just write `Running` and each name is a long id number. Apply this for EVERYTHING."
// Owner pick Q-A 3:18.4: "Sweep as VW96 after VW95". Owner pick Q-A 3:20.3: "Confirm, start VW96" (defaults D1-D5).
// This file holds the plain words for the screens that VW94 and VW95 did not change: Lists page /runs, page view, Details view /monitor/<slug>,
// Run settings panel /settings/run, Books page /books, Reader screens. It reuses the words of lib/run-view-words.ts (VW94) and lib/phase2-articles.ts.
// Pure: no file read, no server code. A client component can import it. It is a new file, because the dev server keeps old module instances (VW77a).
// All words are unit defaults of VW96 (aki-main lists them for the owner). Box codes stay as codes and get a hover (lib/box-names.ts, Q-A 3:18.5).

import { listLabel, PHASE2_BOOK, stampEpoch } from "./phase2-articles";
import { pstDateTime, runIdText } from "./pst";
import { BOX_ROLE } from "./box-names";
import { listStateWord, type StateWord } from "./run-view-words";
import { providerWords } from "./model-card"; // Unit VW97 (Q-A 3:21.3): Claude card names in place of provider IDs.

/** Plain name of the book key of a status.json or a list. The phase 2 store has the key paired-dataset (it holds articles, not a book). */
export function bookKeyLabel(book: string): string {
  return book === PHASE2_BOOK ? "The phase 2 run" : book;
}

/** "list started" becomes "List started". */
export function capFirst(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** "2026-11-11 20:41 PST" for a stamp such as 20261112T044149Z, else null. */
export function stampPst(stamp: string): string | null {
  const e = stampEpoch(stamp);
  return e === null ? null : pstDateTime(e);
}

/** Text of a list folder for the Lists page: "List started 2026-11-11 20:41 PST". The raw stamp goes into small grey text next to it. */
export function listTitle(stamp: string): string {
  return capFirst(listLabel(stamp));
}

// ---------------------------------------------------------------- page run folders

/** A page run folder is "<UTC stamp>-r<number>", for example 20261112T044149Z-r41. */
const PAGE_RUN_RE = /^(\d{8}T\d{6}Z)(-r\d+)?$/;
const CRITIC_FOLDER_RE = /^critic-([a-z]+)-(\d{8}T\d{6}Z)$/;

export interface RunName {
  /** The plain name, for example "Page run started 2026-11-11 20:41 PST". */
  label: string;
  /** The folder name as it is on disk (small grey text). */
  raw: string;
}

/** Plain name of a page run folder. A name of another form stays as it is. */
export function pageRunName(folder: string): RunName {
  const m = PAGE_RUN_RE.exec(folder);
  const when = m ? stampPst(m[1]) : null;
  return { label: when ? `Page run started ${when}` : folder, raw: folder };
}

/**
 * Text for the run ID of a pair of the book translation memory. The form "<list stamp>/<page run folder>" (20261029T051152Z/20261029T054303Z-r41)
 * gives "Page run started 2026-10-28 21:43 PST". The form "2026-11-04T00:15:00-08:00" gives "2026-11-04 00:15 PST". Another form gives null.
 */
export function pairRunText(runId: unknown): string | null {
  if (typeof runId !== "string") return null;
  const m = /^\d{8}T\d{6}Z\/(\d{8}T\d{6}Z(?:-r\d+)?)$/.exec(runId);
  if (m) {
    const n = pageRunName(m[1]);
    return n.label === m[1] ? null : n.label;
  }
  return runIdText(runId);
}

/** Plain name of a critic-only subfolder, for example critic-separate-20261105T010203Z. */
export function criticFolderName(folder: string): RunName {
  const m = CRITIC_FOLDER_RE.exec(folder);
  const when = m ? stampPst(m[2]) : null;
  if (!m || !when) return { label: folder, raw: folder };
  return { label: `Critic-only run started ${when}`, raw: folder };
}

/** "p002" gives "page 2". "94380515/p002" gives "page 2" too. Another text stays as it is. */
export function pageNumberText(pageId: string): string {
  const last = pageId.split("/").pop() ?? pageId;
  const m = /^p(\d+)$/.exec(last);
  return m ? `page ${Number(m[1])}` : pageId;
}

// ---------------------------------------------------------------- critic mode, kind, jobs

/** The critic mode of a list or a page run (key critic_mode). Source of the meaning: lib/settings-schema.ts (field critic mode). */
export function criticModeWord(mode: string | null | undefined): StateWord {
  if (mode === "separate") return { label: "One critic session per box", help: 'Critic mode "separate" (key critic_mode): the Translator starts a new critic session for each box.' };
  if (mode === "session") return { label: "One critic session per page", help: 'Critic mode "session" (key critic_mode): the Translator keeps one critic session for the whole page.' };
  if (!mode) return { label: "Not stored (older run)", help: "This run has no key critic_mode. It ran before the Translator stored the critic mode." };
  return { label: mode, help: `Critic mode "${mode}" (key critic_mode). The Viewer has no plain word for it.` };
}

/** Count of books that run at the same time (key book_jobs). */
export function bookJobsText(n: number | null | undefined): string {
  if (n === null || n === undefined) return "Not stored (older run)";
  return n === 1 ? "1 book at a time" : `${n} books at a time`;
}

/** Kind of a page (key kind of page.json and of the page rows in progress.json). */
export function pageKindWord(kind: string | null | undefined): StateWord {
  if (kind === "web") return { label: "Web article page", help: 'Page kind "web" (key kind): a page of a web article.' };
  if (kind === "book") return { label: "Book page", help: 'Page kind "book" (key kind): a page of a book.' };
  if (!kind) return { label: "–", help: "No page kind stored." };
  return { label: kind, help: `Page kind "${kind}" (key kind). The Viewer has no plain word for it.` };
}

// ---------------------------------------------------------------- status of a page run

/**
 * The status of a page run (summary.json key status). "completed" and "completed with failures" use the words of the list states.
 * "no summary" is the Viewer's own text for a page run folder without summary.json.
 */
export function pageRunStatusWord(status: string): StateWord {
  if (status === "no summary") return { label: "No summary yet", help: "This page run folder has no summary.json. The page run did not end, or it is still running." };
  return listStateWord(status);
}

/** Plain word of the state of a chain row in a list-summary (stopped states carry a reason). */
export function chainStateWord(state: string): StateWord {
  if (/^stopped/i.test(state)) return { label: capFirst(state), help: `State "${state}" of the chain: the chain stopped before its end. The text after "stopped" is the reason.` };
  return listStateWord(state);
}

// ---------------------------------------------------------------- verdict and critique groups

/** Hover text of a QA verdict pill. The pill keeps the word PASS or FAIL. */
export function verdictHelp(verdict: string, score?: number | null): string {
  const base =
    verdict === "PASS"
      ? "Verdict PASS of the quality check stage: it accepted the English text."
      : verdict === "FAIL"
        ? "Verdict FAIL of the quality check stage: it did not accept the English text."
        : `Verdict ${verdict} of the quality check stage.`;
  return score !== null && score !== undefined ? `${base} The number is its score.` : base;
}

/** Hover text of a critique group code (TS, TL, ED, QA): the group holds the critiques against the boxes of that stage, at every level. */
export function groupHelp(code: string): string | null {
  const role = BOX_ROLE[code];
  return role ? `${code}: critique group of the ${role}. It holds the critiques against the boxes of this stage at every level (0 to 3).` : null;
}

/** A critique ID such as rdc-94380515-p002-01 ends in the number of the critique on the page. "Critique 1". Another ID gives "Critique". */
export function critiqueLabel(id: string): string {
  const m = /-(\d+)$/.exec(id);
  return m ? `Critique ${Number(m[1])}` : "Critique";
}

// ---------------------------------------------------------------- session id

/** Short form of a session ID: the last 6 characters, with the full ID in the hover. */
export function sessionShort(id: string): string {
  return id.length > 8 ? `…${id.slice(-6)}` : id;
}

// ---------------------------------------------------------------- settings

/** Split a model option "provider/model" into the model and its provider. "Other…" and a value with no slash stay as they are. */
export function modelOption(value: string): { label: string; provider: string | null } {
  const i = value.indexOf("/");
  if (i <= 0 || i === value.length - 1) return { label: value, provider: null };
  return { label: value.slice(i + 1), provider: value.slice(0, i) };
}

/**
 * Text of a model option in a list: "claude-haiku-5-5 (Claude card ntngh)" for a known Claude card (Q-A 3:21.3, 3:17.4), "some-model (provider xai)" for
 * another provider. The option value stays "provider/model". The card ID shows next to this text in small grey text (components/ModelCardId.tsx).
 */
export function modelOptionText(value: string): string {
  const m = modelOption(value);
  return m.provider ? `${m.label} (${providerWords(m.provider)})` : m.label;
}

/**
 * The models text of a page run ("L0 antigravity-gemini-3.8-flash-high high, L1 claude-haiku-5-5 xhigh") with "level 0:" in place of "L0".
 * Grid level n is the number of the box code (Q-A 3:18.5, translator.md "grid").
 */
export function levelModelsText(models: string): string {
  return models.replace(/\bL([0-3])\s+/g, (_m, n: string) => `Level ${n}: `);
}

/** Plain word for an option value of a yes or no setting. */
export function yesNoWord(value: string): string {
  return value === "true" ? "Yes" : value === "false" ? "No" : value;
}

/** Text of an option value in the Run settings panel: critic mode words, yes or no, model with provider. */
export function optionText(key: string, value: string): string {
  if (key === "run.critic_mode" || key.endsWith("critic_mode")) return criticModeWord(value).label;
  if (value === "true" || value === "false") return yesNoWord(value);
  if (/^levels\.\d\.model$|\.model$/.test(key)) return modelOptionText(value);
  return value;
}
