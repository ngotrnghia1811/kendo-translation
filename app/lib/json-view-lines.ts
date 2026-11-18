// Unit VW96 (round 91), card P31.3. Owner rule Q-A 3:17.4 (2026-11-11): "Annotate the names intuitively and properly. I cant understand what they are
// if you just write `Running` and each name is a long id number. Apply this for EVERYTHING."
// Default D4 of Q-A 3:20.3 ("Confirm, start VW96"): the JSON viewer /json shows one plain line above the path,
// for example "Status of the phase 2 run" for book-store/paired-dataset/status.json.
// This file holds the table of known file names -> plain line, and the fallback line that it builds from the folder.
// Pure: no file read. The server code (lib/json-view-lines-load.ts) finds the article titles and passes them in `ctx`.
// The table is a unit default of VW96 (aki-main lists it for the owner). The words use the project terms of the guideline files.
// The key lists come from a read of the key names (not the values) of one real file of each kind, 2026-11-12.

import { criticFolderName, criticModeWord, listTitle, pageRunName } from "./readable-names";

export interface LineContext {
  /** English (else Japanese) title of each article, by the first 8 hex digits of its ID. A missing ID means "title not found". */
  titles?: ReadonlyMap<string, string>;
  /** Unit VW111 (Q-A 3:76.1 place 4, Q-A 3:72.2): the title of each book folder name (for example 100_practice_full). A missing name means "no title": the phrase keeps the folder name alone. */
  bookNames?: ReadonlyMap<string, string>;
}

const PAGE_DIR = /^([0-9a-f]{8})_p(\d+)$/;
const BOOK_PAGE_DIR = /^(.+)_p(\d+)$/;

/** The first article ID (8 hex digits) in a path such as pilot-run/94380515_p002/..., else null. The server uses it to find the title. */
export function articleIdsIn(rel: string): string[] {
  const out: string[] = [];
  for (const m of rel.matchAll(/(?:^|\/)([0-9a-f]{8})_p\d+(?=\/|\.|$)/g)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/**
 * Unit VW111 (place 4): the book folder names in a path such as pilot-run/100_practice_full_p012/..., the names that pagePhrase writes as "page 12 of the book ...".
 * A page folder of an article (8 hex digits) is not a book name. The server uses the names to find the titles.
 */
export function bookSlugsIn(rel: string): string[] {
  const out: string[] = [];
  for (const segment of rel.split("/")) {
    const name = segment.replace(/\.json$/, "");
    if (PAGE_DIR.test(name)) continue;
    const b = BOOK_PAGE_DIR.exec(name);
    if (b && !out.includes(b[1])) out.push(b[1]);
  }
  return out;
}

/** "page 2 of the article "Title" (94380515)" for a page folder or file name part such as 94380515_p002 or 94380515_p002.json. */
export function pagePhrase(segment: string, ctx?: LineContext): string | null {
  const name = segment.replace(/\.json$/, "");
  const a = PAGE_DIR.exec(name);
  if (a) {
    const title = ctx?.titles?.get(a[1]);
    return title ? `page ${Number(a[2])} of the article "${title}" (${a[1]})` : `page ${Number(a[2])} of the article ${a[1]} (title not found)`;
  }
  const b = BOOK_PAGE_DIR.exec(name);
  if (!b) return null;
  // Unit VW111 (place 4): a book with a title reads `page 12 of the book "Title" (100_practice_full)`, the same form as an article. No title keeps the folder name.
  const bookTitle = ctx?.bookNames?.get(b[1]);
  return bookTitle ? `page ${Number(b[2])} of the book "${bookTitle}" (${b[1]})` : `page ${Number(b[2])} of the book ${b[1]}`;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** The step words of the files in update-points/<page>/... (names like ED_1-optimizer-try1). */
const STEP_WORDS: Record<string, string> = { optimizer: "optimizer", grouper: "grouper", audit: "audit", judge: "judge" };

function updatePointLine(rest: string[], phrase: string): string {
  const [first, second] = rest;
  if (!first) return `Prompt updates after ${phrase}`;
  const commit = /^commit-((?:TS|TL|ED|QA)_[0-3])\.json$/.exec(first);
  if (commit && rest.length === 1) return `Prompt update of box ${commit[1]} after ${phrase}`;
  const kinds: Record<string, string> = { raw: "Raw replies", parsed: "Parsed replies", messages: "Messages" };
  if (kinds[first] && rest.length === 1) return `${kinds[first]} of the prompt update steps after ${phrase}`;
  if (kinds[first] && second) {
    const m = /^((?:TS|TL|ED|QA)_[0-3])-(optimizer|grouper|audit|judge)/.exec(second);
    const one: Record<string, string> = { raw: "Raw reply", parsed: "Parsed reply", messages: "Message" };
    if (m) return `${one[first]} of the ${STEP_WORDS[m[2]]} step for box ${m[1]}, prompt update after ${phrase}`;
  }
  return `${rest.length > 1 ? "File" : "Item"} "${rest.join("/")}" of the prompt updates after ${phrase}`;
}

/** Lines inside a page run folder. `run` is the description such as "the page run started 2026-11-11 20:41 PST (page 2 of ...)". */
function pageRunLine(rest: string[], run: string, folder: boolean): string {
  const path = rest.join("/");
  const box = "((?:TS|TL|ED|QA)_[0-3])";
  let m: RegExpExecArray | null;
  if (path === "calls.jsonl") return `Model calls of ${run}: one line for each call`;
  if (path === "summary.json") return `Summary of ${run}`;
  if (path === "run.json") return `Start settings of ${run}`;
  if (path === "page") return `Page data of ${run}`;
  if (path === "page/page.json") return `Page facts of ${run}`;
  if (path === "page/a4_cut.json") return `A4 cut of the page text of ${run}`;
  if (path === "page/source_parts.json") return `Source parts of the page of ${run}`;
  if (path === "results") return `Results of the boxes of ${run}`;
  if ((m = new RegExp(`^results/${box}\\.json$`).exec(path))) return `Result of box ${m[1]} in ${run}`;
  if (path === "parsed") return `Parsed replies of the boxes of ${run}`;
  if ((m = new RegExp(`^parsed/${box}\\.json$`).exec(path))) return `Parsed reply of box ${m[1]} in ${run}`;
  if (path === "messages") return `Messages sent to the boxes of ${run}`;
  if ((m = new RegExp(`^messages/${box}\\.txt$`).exec(path))) return `Message sent to box ${m[1]} in ${run}`;
  if ((m = new RegExp(`^messages/box-critic\\.${box}\\.txt$`).exec(path))) return `Message sent to the critic of box ${m[1]} in ${run}`;
  if (path === "raw") return `Raw model files of ${run}`;
  if ((m = new RegExp(`^raw/${box}\\.try(\\d+)\\.`).exec(path))) return `Raw file of box ${m[1]}, try ${m[2]}, in ${run}`;
  if (path === "lookup") return `Lookup files of the boxes of ${run}`;
  if ((m = new RegExp(`^lookup/${box}\\.aligned\\.json$`).exec(path))) return `Aligned lookup file of box ${m[1]} in ${run}`;
  if ((m = new RegExp(`^lookup/${box}\\.json$`).exec(path))) return `Lookup file of box ${m[1]} in ${run}`;
  if (path === "programs") return `Program checks of the boxes of ${run}`;
  if ((m = new RegExp(`^programs/([a-z_]+)\\.${box}\\.json$`).exec(path))) return `Program check "${m[1].replace(/_/g, " ")}" of box ${m[2]} in ${run}`;
  if (path === "critiques") return `Critiques of ${run}`;
  if (path === "critiques/reference.json") return `Reference critiques of ${run}`;
  if ((m = new RegExp(`^critiques/queue-${box}\\.jsonl$`).exec(path))) return `Critique queue of box ${m[1]} in ${run}`;
  if (path === "reference-diff-critic") return `Reference-diff critic run inside ${run}`;
  if (rest[0] === "reference-diff-critic") return `${folder ? "Folder" : "File"} "${rest.slice(1).join("/")}" of the reference-diff critic run inside ${run}`;
  const critic = /^critic-[a-z]+-\d{8}T\d{6}Z$/.exec(rest[0] ?? "");
  if (critic) {
    const c = criticFolderName(rest[0]);
    const mode = /^critic-([a-z]+)-/.exec(rest[0])?.[1] ?? "";
    const head = `${c.label} (${lower(criticModeWord(mode).label)}) inside ${run}`;
    return rest.length === 1 ? head : `${folder ? "Folder" : "File"} "${rest.slice(1).join("/")}" of the ${lower(c.label)} inside ${run}`;
  }
  return `${folder ? "Folder" : "File"} "${path}" of ${run}`;
}

/**
 * The plain line for a path relative to the Translator data folder. `folder` is true when the path is a folder.
 * A path with no rule gets a line built from its folder, never an empty line.
 */
export function plainLine(rel: string, folder: boolean, ctx?: LineContext): string {
  const parts = rel.split("/").filter(Boolean);
  if (parts.length === 0) return "The Translator data folder: all run files that the Viewer reads";
  const name = parts[parts.length - 1];
  const [top, a, b, c] = parts;
  // ---- the phase 2 store: book-store/paired-dataset
  if (top === "book-store" && parts.length === 1) return "Book stores of the Translator, one folder for each book (the phase 2 run uses paired-dataset)";
  if (top === "book-store" && a === "paired-dataset") {
    const rest = parts.slice(2);
    const key = rest.join("/");
    if (key === "") return "Store of the phase 2 run";
    if (key === "status.json") return "Status of the phase 2 run";
    if (key === "history.jsonl") return "History of the phase 2 run: one line for each event";
    if (key === "book-memory.jsonl") return "Book translation memory of the phase 2 run: one line for each pair";
    if (key === "pages") return "Result pointers of the phase 2 run, one file for each page";
    if (b === "pages" && rest.length === 2) {
      const ph = pagePhrase(c, ctx);
      return ph ? `Result pointer of ${ph} in the phase 2 run (accepted or not, verdict, page run folder)` : `Result pointer "${c}" of the phase 2 run`;
    }
    if (key === "trends") return "Trend numbers of the phase 2 run, one file for each page";
    if (b === "trends" && rest.length === 2) {
      const ph = pagePhrase(c, ctx);
      return ph ? `Trend numbers of ${ph} (chrF and reference critiques)` : `Trend numbers "${c}" of the phase 2 run`;
    }
    if (key === "prompts") return "Prompt versions of the phase 2 run, one folder for each box";
    if (b === "prompts" && /^(TS|TL|ED|QA)_[0-3]$/.test(c ?? "") && rest.length === 2) return `Prompt versions of box ${c}`;
    if (b === "prompts" && rest.length === 3 && rest[2] === "current") return `Name of the current prompt version of box ${c}`;
    if (b === "prompts" && rest.length === 3) {
      const v = /^(v[\w.]+)\.json$/.exec(rest[2]);
      if (v) return `Prompt version ${v[1]} of box ${c}`;
    }
    if (key === "rubric-tables") return "Rubric tables of the phase 2 run, one folder for each QA box";
    if (key === "rubric-tables/changes.jsonl") return "Changes of the rubric tables: one line for each change";
    if (b === "rubric-tables" && /^(TS|TL|ED|QA)_[0-3]$/.test(c ?? "") && rest.length === 2) return `Rubric table versions of box ${c}`;
    if (b === "rubric-tables" && rest.length === 3 && rest[2] === "current") return `Name of the current rubric table version of box ${c}`;
    if (b === "rubric-tables" && rest.length === 3) {
      const v = /^(v[\w.]+)\.json$/.exec(rest[2]);
      if (v) return `Rubric table version ${v[1]} of box ${c}`;
    }
    if (key === "update-points") return "Prompt updates of the phase 2 run, one folder for each page";
    if (b === "update-points" && c) {
      const ph = pagePhrase(c, ctx);
      if (ph) return updatePointLine(rest.slice(2), ph);
    }
    if (key === "report") return "Report folder of the phase 2 run";
    if (key === "report/summary.json") return "Report of the phase 2 run";
    return `${folder ? "Folder" : "File"} "${key}" in the store of the phase 2 run`;
  }
  // ---- pilot-run
  if (top === "pilot-run" && parts.length === 1) return "Page runs and lists of the Translator";
  if (top === "pilot-run" && a === "lists") {
    if (parts.length === 2) return "Lists: one folder for each list that the Translator started";
    const title = listTitle(b);
    if (parts.length === 3) return title;
    if (name === "list.json") return `Start settings of the ${lower(title)}`;
    if (name === "list-summary.json") return `Summary of the ${lower(title)}`;
    if (name === "progress.json") return `Progress of the ${lower(title)} (state, pages, calls, tokens)`;
    return `${folder ? "Folder" : "File"} "${name}" of the ${lower(title)}`;
  }
  if (top === "pilot-run" && a) {
    const ph = pagePhrase(a, ctx);
    if (ph) {
      if (parts.length === 2) return `Page runs of ${ph}`;
      const run = pageRunName(b);
      const desc = `the ${lower(run.label)} (${ph})`;
      if (parts.length === 3) return `${run.label}, ${ph}`;
      return pageRunLine(parts.slice(3), desc, folder);
    }
  }
  // ---- other known folders
  if (top === "item-metadata" && parts.length === 1) return "Titles and facts of the articles";
  if (top === "item-metadata" && name === "items.filled.jsonl") return "Article titles and facts, one line for each article (draft, not checked by the owner)";
  if (top === "item-metadata" && name === "items.draft.jsonl") return "Draft of the article titles and facts, one line for each article";
  if (top === "termbase" && parts.length === 1) return "Termbase: the term list of the Translator";
  // ---- fallback built from the folder
  if (parts.length === 1) return folder ? `Folder "${name}" of the Translator data folder` : `File "${name}" in the Translator data folder`;
  const parent = parts.slice(0, -1).join("/");
  return folder ? `Folder "${name}" inside "${parent}"` : `File "${name}" inside "${parent}"`;
}
