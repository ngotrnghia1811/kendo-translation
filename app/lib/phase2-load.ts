import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { HISTORY_TAIL_BYTES, PHASE2_DIR, buildPhase2, lastHistoryRow, type Phase2Input, type Phase2View } from "./phase2-row";
import { PHASE2_STORE } from "./run-store";
import { loadUpdateLive } from "./update-live-load";

/**
 * Server side of the live Phase 2 row (unit VW91, round 91). Owner pick Q-A 3:4.6 (2026-11-11 10:42 PST): "Small live row now (VW91)".
 * It reads <data>/book-store/paired-dataset/status.json and history.jsonl and calls the pure rules of phase2-row.ts. It writes no file.
 * The Monitor API (/api/monitor/books) calls it from loadMonitor, so the row refreshes with the same poll as the books rows.
 * The monitor guard is the one of that route (monitorOffResponse): this file adds no route.
 * status.json is small (a list of at most 144 pages), so it is read at each poll with no cache. history.jsonl is read only at its end (64 KB).
 */

async function isFile(file: string): Promise<boolean> {
  try {
    return (await fs.stat(file)).isFile();
  } catch {
    return false;
  }
}

/** The status file: "missing" (no file), "bad" (cannot be read or is no JSON), or the parsed value. */
async function readStatus(file: string): Promise<"missing" | "bad" | { value: unknown }> {
  let text: string;
  try {
    text = await fs.readFile(file, "utf-8");
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    return code === "ENOENT" || code === "ENOTDIR" ? "missing" : "bad";
  }
  try {
    return { value: JSON.parse(text) };
  } catch {
    return "bad";
  }
}

/** The last event of history.jsonl. Reads the last HISTORY_TAIL_BYTES bytes only. */
async function readLastEvent(file: string): Promise<{ exists: boolean; row: Record<string, unknown> | null }> {
  let fh;
  try {
    fh = await fs.open(file, "r");
  } catch {
    return { exists: false, row: null };
  }
  try {
    const { size } = await fh.stat();
    const len = Math.min(size, HISTORY_TAIL_BYTES);
    const buf = Buffer.alloc(len);
    if (len > 0) await fh.read(buf, 0, len, size - len);
    return { exists: true, row: lastHistoryRow(buf.toString("utf-8"), len < size) };
  } catch {
    return { exists: true, row: null };
  } finally {
    await fh.close();
  }
}

/**
 * The Phase 2 row for the Monitor dashboard. Null when status.json does not exist (the dashboard keeps the old fixed line).
 * `alive` is the pid check of book-status.ts (signal 0), passed in because that file imports this one.
 * A read error never reaches the page: it gives the view "Status file unreadable".
 */
export async function loadPhase2(root: string, nowMs: number, alive: (pid: unknown) => boolean): Promise<Phase2View | null> {
  const now = nowMs / 1000;
  const dir = path.join(root, PHASE2_DIR);
  try {
    const sf = await readStatus(path.join(dir, "status.json"));
    if (sf === "missing") return null;
    const status = typeof sf === "string" ? null : sf.value;
    const pid = status !== null && typeof status === "object" && !Array.isArray(status) ? (status as Record<string, unknown>).pid : null;
    const hist = await readLastEvent(path.join(dir, "history.jsonl"));
    const input: Phase2Input = {
      file: typeof sf === "string" ? "bad" : "ok",
      status,
      pidAlive: alive(pid),
      pauseExists: await isFile(path.join(dir, "PAUSE")),
      lastEvent: hist.row,
      historyExists: hist.exists,
    };
    const view = buildPhase2(input, now);
    // Unit VW103 (Q-A 3:36.4): the running update point (box, role, try, card, time). Only while the process runs. It reads files and never throws.
    if (view && (view.key === "running" || view.key === "running-pause") && status !== null && typeof status === "object" && !Array.isArray(status)) {
      view.update = await loadUpdateLive(root, PHASE2_STORE, status as Record<string, unknown>, nowMs);
    }
    // A link to a failed file must point at a file that exists (the rule of checkErrorFile in book-status.ts).
    if (view?.errorFile) {
      const full = path.resolve(root, view.errorFile);
      if (!full.startsWith(path.resolve(root) + path.sep) || !(await isFile(full))) view.errorFile = null;
    }
    return view;
  } catch {
    return buildPhase2({ file: "bad", status: null, pidAlive: false, pauseExists: false, lastEvent: null, historyExists: false }, now);
  }
}
