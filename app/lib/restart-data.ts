import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { jsonResponse, errorResponse } from "./api";
import { monitorOffResponse } from "./monitor";
import { loadBookFresh } from "./book-status";
import { isSafeSegment, resolveInside, stripDataPrefix } from "./safe-path";
import { BOXES, PHASE_NUMBER, buildRestartOptions, pageNumberOf, parseVersionLabel, runIdFolder, type PageInput, type RestartInput, type RunInput, type VersionInput } from "./restart-rules";

/**
 * Server side of the Restart dialog (unit VW77b2, round 82): GET /api/monitor/books/<slug>/restart-options.
 * Name of the route: [unit default VW77b2]. It reads files and never writes. Every call reads the files again (no cache), because the run changes.
 * Checks in this order: Monitor off 404, slug not safe or not in the book set 404, book with no status.json 409 (Restart is for a book with a run).
 *
 * Where the facts come from (all read only):
 *   versions   prompts/<BOX>/v<phase>.<run>.<n>.json in the book folder and in archive/<run ID folder>/ (restart.py prompt_dirs). Only labels of the phase of status.json.
 *   pointers   prompts/<BOX>/current of each of those folders.
 *   pages      pages/<pid>.json of each folder (translator_run.py settle: accepted, verdict, folder, accepted_utc), and the run.json in the page folder
 *              with the block prompts {BOX: {version, sha1}} (translator_run.py write_run_json). The page folder path is relative to the Translator root, so the
 *              leading "data/" goes away (the same rule as stripDataPrefix).
 *   restarts   history.jsonl events "restart" with the field chosen (restart.py restart_run).
 */

const STORE = "book-store";

async function readJson(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8"));
  } catch {
    return null;
  }
}

function rec(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

async function dirNames(dir: string): Promise<string[]> {
  try {
    return (await fs.readdir(dir, { withFileTypes: true })).filter((i) => i.isDirectory()).map((i) => i.name);
  } catch {
    return [];
  }
}

async function fileNames(dir: string): Promise<string[]> {
  try {
    return (await fs.readdir(dir, { withFileTypes: true })).filter((i) => i.isFile()).map((i) => i.name);
  } catch {
    return [];
  }
}

/** Run once for each array item, 24 at a time. */
async function mapLimit<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/** The prompt block of the run.json in a page folder: box to label. Null when the folder, the file, or the block is missing or broken. */
async function pageUsed(root: string, folder: unknown): Promise<Record<string, string> | null> {
  if (typeof folder !== "string" || folder === "") return null;
  let dir: string;
  try {
    if (path.isAbsolute(folder)) {
      if (!folder.startsWith(root + path.sep)) return null;
      dir = await resolveInside(path.relative(root, folder), root);
    } else {
      dir = await resolveInside(stripDataPrefix(folder), root);
    }
  } catch {
    return null;
  }
  const block = rec(rec(await readJson(path.join(dir, "run.json")))?.prompts);
  if (!block) return null;
  const used: Record<string, string> = {};
  for (const b of BOXES) {
    const v = rec(block[b])?.version;
    if (typeof v !== "string") return null;
    used[b] = v;
  }
  return used;
}

/** One run folder: the book folder (current run) or archive/<folder>/. Returns null when it holds no label of the phase. */
async function readRun(root: string, dir: string, archive: string | null, phaseNum: number): Promise<{ run: RunInput; versions: VersionInput[] } | null> {
  const pointers: Record<string, string | null> = {};
  const versions: VersionInput[] = [];
  let runNo: number | null = null;
  for (const box of BOXES) {
    const boxDir = path.join(dir, "prompts", box);
    let ptr: string | null = null;
    try {
      const text = (await fs.readFile(path.join(boxDir, "current"), "utf-8")).trim();
      const p = parseVersionLabel(text);
      if (p && p.phase === phaseNum) {
        ptr = text;
        if (runNo === null) runNo = p.run;
      }
    } catch {
      /* no pointer */
    }
    pointers[box] = ptr;
    for (const name of await fileNames(boxDir)) {
      if (!name.endsWith(".json")) continue;
      const label = name.slice(0, -5);
      const p = parseVersionLabel(label);
      if (!p || p.phase !== phaseNum) continue;
      const doc = rec(await readJson(path.join(boxDir, name)));
      if (!doc) continue;
      versions.push({
        box,
        label,
        parent: typeof rec(doc.parent)?.version === "string" ? (rec(doc.parent)?.version as string) : null,
        updatePoint: doc.update_point ?? null,
        createdUtc: typeof doc.created_utc === "string" ? doc.created_utc : null,
        critiqueCount: Array.isArray(doc.critique_ids) ? doc.critique_ids.length : null,
      });
    }
  }
  if (versions.length === 0 && runNo === null) return null;
  const pageFiles = (await fileNames(path.join(dir, "pages"))).filter((n) => n.endsWith(".json"));
  const pages = (
    await mapLimit(pageFiles, 24, async (name): Promise<PageInput | null> => {
      const doc = rec(await readJson(path.join(dir, "pages", name)));
      if (!doc) return null;
      const id = typeof doc.page_id === "string" ? doc.page_id : null;
      const n = pageNumberOf(id);
      if (id === null || n === null) return null;
      return {
        id,
        n,
        accepted: doc.accepted === true,
        verdict: typeof doc.verdict === "string" ? doc.verdict : null,
        acceptedUtc: typeof doc.accepted_utc === "string" ? doc.accepted_utc : null,
        used: await pageUsed(root, doc.folder),
      };
    })
  ).filter((p): p is PageInput => p !== null);
  return { run: { run: runNo, archive, pointers, pages }, versions };
}

/** Labels that earlier Restarts picked: the field chosen of the history events "restart". */
async function previousChosen(bookDir: string): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  let text = "";
  try {
    text = await fs.readFile(path.join(bookDir, "history.jsonl"), "utf-8");
  } catch {
    return out;
  }
  for (const line of text.split("\n")) {
    if (!line.includes('"restart"')) continue;
    try {
      const ev = rec(JSON.parse(line));
      const chosen = rec(ev?.chosen);
      if (!ev || ev.event !== "restart" || !chosen) continue;
      for (const b of BOXES) if (typeof chosen[b] === "string") (out[b] ??= []).push(chosen[b] as string);
    } catch {
      /* skip a broken line */
    }
  }
  return out;
}

export async function loadRestartInput(root: string, slug: string, phase: string): Promise<RestartInput> {
  const bookDir = path.join(root, STORE, slug);
  const phaseNum = PHASE_NUMBER[phase] ?? 0;
  const runs: RunInput[] = [];
  const versions: VersionInput[] = [];
  const cur = await readRun(root, bookDir, null, phaseNum);
  if (cur) {
    runs.push(cur.run);
    versions.push(...cur.versions);
  } else {
    runs.push({ run: null, archive: null, pointers: {}, pages: [] });
  }
  for (const name of (await dirNames(path.join(bookDir, "archive"))).filter(isSafeSegment).sort()) {
    const r = await readRun(root, path.join(bookDir, "archive", name), name, phaseNum);
    if (r) {
      runs.push(r.run);
      versions.push(...r.versions);
    }
  }
  return { phase, versions, runs, previousChosen: await previousChosen(bookDir) };
}

/** GET /api/monitor/books/<slug>/restart-options */
export async function handleRestartOptions(_req: Request, params: Promise<{ slug: string }>): Promise<Response> {
  try {
    const off = await monitorOffResponse();
    if (off) return off;
    const { slug } = await params;
    if (typeof slug !== "string" || !isSafeSegment(slug)) return jsonResponse({ error: "Not found" }, 404);
    const found = await loadBookFresh(slug);
    if (!found) return jsonResponse({ error: "Not found" }, 404);
    const restart = found.row.buttons.find((b) => b.id === "restart");
    const phase = found.row.phaseId;
    // The same state rule as the write route: a book with no run, a pilot row, an unreadable status.json, or a Restart that waits gives 409 with the reason.
    if (!phase || !(phase in PHASE_NUMBER) || !restart || restart.stateReason !== null) {
      return jsonResponse({ error: restart?.stateReason ?? "Restart is for a book with a run. This book has no run yet." }, 409);
    }
    const statusDoc = rec(await readJson(path.join(found.root, STORE, slug, "status.json")));
    const options = buildRestartOptions(await loadRestartInput(found.root, slug, phase));
    return jsonResponse({
      ok: true,
      slug,
      title: found.row.title,
      running: found.row.key === "running" || found.row.key === "running-pause",
      stateLabel: found.row.baseLabel,
      archiveFolder: runIdFolder(statusDoc?.run_id),
      ...options,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
