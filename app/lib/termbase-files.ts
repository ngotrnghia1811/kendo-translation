import "server-only";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "./config";
import { ProposalProblem, utcNow, type ReviewLine } from "./proposals-core";

/*
 * Unit VW126 (Q-A 3:117.7 rows 3 to 6, Q-A 3:121.2 rows 1 to 3): the files of the termbase folder of the Translator that the tab "Agent proposals" reads and writes. This Mac only (the Monitor switch is on).
 *   termbase.draft.jsonl      the dictionary file. Read only here. The rebuild (termbase_build.py rebuild-live) writes it.
 *   decisions.jsonl           the decisions. Accept appends one line (a revise also adds superseded_by to one old line). A copy of the old file goes to decisions-backups/ first.
 *   proposals.jsonl           the proposals of the runs (unit TR102). Read only here. It is not in git.
 *   proposal-reviews.jsonl    one line for each comment, accept, edit-accept, or reject. It is not in git (unit default: this name, next to the proposals).
 * The folder comes from the environment variable VIEWER_TERMBASE_DIR, else from translatorDataDir of viewer.config.json plus /termbase. The tests point it at a temp copy.
 */

export interface TermbasePaths {
  dir: string;
  termbase: string;
  decisions: string;
  proposals: string;
  reviews: string;
  backups: string;
  lock: string;
  script: string;
}

const envText = (name: string): string | undefined => {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
};

/** The paths of the termbase folder, or null when the app has no such folder (no translatorDataDir and no VIEWER_TERMBASE_DIR). */
export async function termbasePaths(): Promise<TermbasePaths | null> {
  const cfg = await loadConfig();
  const envDir = envText("VIEWER_TERMBASE_DIR");
  const dir = envDir ? path.resolve(/* turbopackIgnore: true */ envDir) : cfg.translatorDataDir ? path.join(cfg.translatorDataDir, "termbase") : "";
  if (!dir) return null;
  const envScript = envText("VIEWER_TERMBASE_SCRIPT");
  const script = envScript ? path.resolve(/* turbopackIgnore: true */ envScript) : cfg.translatorDataDir ? path.join(cfg.translatorDataDir, "scripts", "termbase_build.py") : "";
  return {
    dir,
    termbase: path.join(dir, "termbase.draft.jsonl"),
    decisions: path.join(dir, "decisions.jsonl"),
    proposals: path.join(dir, "proposals.jsonl"),
    reviews: path.join(dir, "proposal-reviews.jsonl"),
    backups: path.join(dir, "decisions-backups"),
    lock: path.join(dir, "decisions.jsonl.lock"),
    script,
  };
}

export const sha1Of = (text: string): string => createHash("sha1").update(text).digest("hex");

/** The text of a file, or "" when it does not exist. `exists` tells the two apart. */
export async function readText(file: string): Promise<{ text: string; exists: boolean }> {
  try {
    return { text: await fs.readFile(file, "utf-8"), exists: true };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { text: "", exists: false };
    throw e;
  }
}

export interface TermbaseState {
  paths: TermbasePaths;
  termbaseText: string;
  decisionsText: string;
  proposalsText: string;
  proposalsExists: boolean;
  reviewsText: string;
}

/** Read the four files. A missing proposals file or review file is empty. A missing dictionary file or decisions file is a problem that the caller shows. */
export async function readTermbaseState(paths: TermbasePaths): Promise<TermbaseState> {
  const [termbase, decisions, proposals, reviews] = await Promise.all([readText(paths.termbase), readText(paths.decisions), readText(paths.proposals), readText(paths.reviews)]);
  if (!termbase.exists) throw new ProposalProblem(503, "The dictionary file termbase.draft.jsonl is not in the termbase folder.");
  if (!decisions.exists) throw new ProposalProblem(503, "The file decisions.jsonl is not in the termbase folder.");
  return { paths, termbaseText: termbase.text, decisionsText: decisions.text, proposalsText: proposals.text, proposalsExists: proposals.exists, reviewsText: reviews.text };
}

/** Add one line to proposal-reviews.jsonl. The file opens in append mode, so a line of another writer is never lost. */
export async function appendReview(paths: TermbasePaths, line: ReviewLine): Promise<void> {
  const row = { utc: line.utc, name: line.name, role: line.role, group: line.group, action: line.action, text: line.text, decision_id: line.decision_id, proposal_ids: line.proposal_ids };
  await fs.appendFile(paths.reviews, JSON.stringify(row) + "\n", { encoding: "utf-8", mode: 0o600 });
}

/**
 * Run `fn` while this process holds the lock file next to decisions.jsonl (like the save of the book settings, unit VW122). A second save at the same time, or a stale lock file, stops with 409.
 * The lock file holds the time and the process number. It is removed in every case.
 */
export async function withDecisionsLock<T>(paths: TermbasePaths, fn: () => Promise<T>): Promise<T> {
  let handle;
  try {
    handle = await fs.open(paths.lock, "wx", 0o600);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") {
      throw new ProposalProblem(409, "Another decision is in progress, or a stale lock file blocks this save (decisions.jsonl.lock). Reload the tab. If no save runs, remove the lock file by hand.");
    }
    throw e;
  }
  try {
    await handle.writeFile(`${utcNow()} pid ${process.pid}\n`);
  } finally {
    await handle.close();
  }
  try {
    return await fn();
  } finally {
    await fs.rm(paths.lock, { force: true });
  }
}

/** Copy the old bytes of decisions.jsonl into decisions-backups/decisions-<UTC stamp>.jsonl. Never overwrites a file. Returns the name of the copy. */
async function backupDecisions(paths: TermbasePaths, text: string): Promise<string> {
  await fs.mkdir(paths.backups, { recursive: true });
  const stamp = utcNow().replace(/[-:]/g, "");
  for (let n = 1; n < 100; n++) {
    const name = `decisions-${stamp}${n === 1 ? "" : "-" + n}.jsonl`;
    try {
      await fs.writeFile(path.join(paths.backups, name), text, { encoding: "utf-8", flag: "wx", mode: 0o600 });
      return name;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
  }
  throw new ProposalProblem(503, "Could not make a backup name for decisions.jsonl. Nothing was written.");
}

/**
 * Write the new text of decisions.jsonl, with the checks of the book settings save (unit VW122): the file must still have the sha1 that the caller read,
 * a copy of the old file goes to decisions-backups/ first, the new text goes to a temp file next to it (written and synced), the sha1 is checked once more, then the temp file replaces decisions.jsonl by a rename.
 * Call it inside withDecisionsLock. Returns the name of the backup.
 */
export async function replaceDecisions(paths: TermbasePaths, expectedSha1: string, oldText: string, newText: string): Promise<string> {
  const current = (await readText(paths.decisions)).text;
  if (sha1Of(current) !== expectedSha1 || current !== oldText) {
    throw new ProposalProblem(409, "The file decisions.jsonl changed after you loaded the tab. Reload the tab. Nothing was written.");
  }
  const backup = await backupDecisions(paths, current);
  const st = await fs.stat(paths.decisions);
  const tmp = paths.decisions + ".part";
  const fh = await fs.open(tmp, "w", st.mode & 0o777);
  try {
    await fh.writeFile(newText, "utf-8");
    await fh.sync();
  } finally {
    await fh.close();
  }
  const again = (await readText(paths.decisions)).text;
  if (sha1Of(again) !== expectedSha1) {
    await fs.rm(tmp, { force: true });
    throw new ProposalProblem(409, "The file decisions.jsonl changed while the decision was written. Reload the tab. Nothing was written.");
  }
  await fs.rename(tmp, paths.decisions);
  return backup;
}

// ---------------------------------------------------------------- the rebuild of the dictionary file

export interface RebuildAnswer {
  /** True when the command ended with exit code 0 and no problem line. */
  ok: boolean;
  /** True when this call wrote the live files (--apply ran and ended well). */
  applied: boolean;
  /** The lines that the command printed (the dry run, or the apply run), cut to 6000 characters. */
  output: string;
}

const RUN_LIMIT_MS = 180000; // unit default: a rebuild stops after 3 minutes (the dry run needs about 1 second)

function runPython(script: string, args: string[], cwd: string): Promise<{ code: number | null; output: string; failed: string }> {
  return new Promise((resolve) => {
    execFile(
      "python3",
      ["-B", script, ...args],
      { cwd, timeout: RUN_LIMIT_MS, maxBuffer: 4 * 1024 * 1024, env: { PATH: process.env.PATH ?? "", TMPDIR: process.env.TMPDIR ?? os.tmpdir(), PYTHONDONTWRITEBYTECODE: "1", LANG: "en_US.UTF-8" } as unknown as NodeJS.ProcessEnv },
      (err: Error | null, stdout: string, stderr: string) => {
        const output = `${stdout ?? ""}${stderr ?? ""}`.trim();
        const e = err as (NodeJS.ErrnoException & { killed?: boolean; code?: number | string }) | null;
        if (e && e.code === "ENOENT") return resolve({ code: null, output, failed: "python3 was not found on this Mac." });
        if (e && e.killed) return resolve({ code: null, output, failed: "The rebuild took too long and was stopped." });
        resolve({ code: e ? (typeof e.code === "number" ? e.code : 1) : 0, output, failed: "" });
      },
    );
  });
}

const cutText = (s: string): string => (s.length > 6000 ? s.slice(0, 6000) + "…" : s);

/**
 * The rebuild of the dictionary file: `python3 -B <termbase_build.py> rebuild-live --dir <folder>` (Q-A 3:117.7 row 6; unit default VW126: the Viewer calls the script with a time limit of 3 minutes).
 * Without `apply` it is the dry run: it writes nothing. With `apply` it runs the dry run first, and only a dry run with exit code 0 and no PROBLEM or STOP line is followed by `--apply`.
 * --apply archives the old files into the folder archive/ first (the script does that).
 */
export async function rebuildDictionary(paths: TermbasePaths, apply: boolean): Promise<RebuildAnswer> {
  if (!paths.script) throw new ProposalProblem(503, "The script termbase_build.py is not set. Set VIEWER_TERMBASE_SCRIPT or translatorDataDir.");
  try {
    await fs.access(paths.script);
  } catch {
    throw new ProposalProblem(503, "The script termbase_build.py was not found in the Translator folder.");
  }
  const dry = await runPython(paths.script, ["rebuild-live", "--dir", paths.dir], paths.dir);
  if (dry.failed) throw new ProposalProblem(503, dry.failed);
  const bad = dry.code !== 0 || /PROBLEM|STOP/.test(dry.output);
  if (!apply || bad) return { ok: !bad, applied: false, output: cutText(dry.output) };
  const real = await runPython(paths.script, ["rebuild-live", "--dir", paths.dir, "--apply"], paths.dir);
  if (real.failed) throw new ProposalProblem(503, real.failed);
  const failed = real.code !== 0 || /PROBLEM|STOP/.test(real.output);
  return { ok: !failed, applied: !failed, output: cutText(real.output) };
}

