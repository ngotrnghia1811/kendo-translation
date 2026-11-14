import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isSafeSegment } from "./safe-path";
import { pageName, type RunStore } from "./run-store";
import { HISTORY_TAIL_BYTES } from "./phase2-row";
import { waitOf } from "./phase2-wait";
import { waitExtraOf, ROLE_ORDER } from "./phase2-wait-reason";
import { parseUtcIso } from "./pst";
import {
  assembleTries,
  buildLive,
  openUpdateOf,
  outcomeOfEvents,
  parseRawName,
  pickTries,
  providerOfRole,
  rowsOfTail,
  runningUpdateOf,
  type LiveBase,
  type RawKind,
  type TryOutcome,
  type UpdateLive,
} from "./update-live";

/**
 * Server side of the running update point (unit VW103, round 91). It reads files and writes none (the rule of the step view, Q-A 3:19.3 D4).
 * The rule (see lib/update-live.ts): the key running_update of status.json (TR93) wins when it exists. When the key is absent, the open update point comes from
 * the end of history.jsonl (64 KB) and its tries from the folder <store>/update-points/<page>/raw/ and its calls.jsonl. When the key is null, no update point runs.
 * Cost of one call: one read of 64 KB, one listing of raw/ with a stat of the files of one box (about 3 per try), and one cached read of calls.jsonl.
 * A missing or broken file gives less detail, never an error. Only the key `status` and the clock come from the caller.
 */

type Rec = Record<string, unknown>;

interface Cached<T> {
  key: string;
  value: T;
}
const callsCache = new Map<string, Cached<unknown[]>>();
const outcomeCache = new Map<string, Cached<{ outcome: TryOutcome; detail: string | null }>>();
/** A finished event file can be large when the try gave a long answer. The outcome of such a file is "answer" (an error event is small). */
const MAX_EVENT_BYTES = 1_000_000;

async function readTail(file: string, max: number): Promise<{ text: string; cut: boolean } | null> {
  let fh;
  try {
    fh = await fs.open(file, "r");
  } catch {
    return null;
  }
  try {
    const { size } = await fh.stat();
    const len = Math.min(size, max);
    const buf = Buffer.alloc(len);
    if (len > 0) await fh.read(buf, 0, len, size - len);
    return { text: buf.toString("utf-8"), cut: len < size };
  } catch {
    return null;
  } finally {
    await fh.close();
  }
}

async function callsRows(file: string): Promise<unknown[]> {
  let key = "missing";
  try {
    const st = await fs.stat(file);
    key = `${st.mtimeMs}:${st.size}`;
  } catch {
    callsCache.delete(file);
    return [];
  }
  const hit = callsCache.get(file);
  if (hit && hit.key === key) return hit.value;
  let rows: unknown[] = [];
  try {
    rows = (await fs.readFile(file, "utf-8"))
      .split("\n")
      .filter((l) => l.trim())
      .flatMap((l) => {
        try {
          return [JSON.parse(l) as unknown];
        } catch {
          return [];
        }
      });
  } catch {
    rows = [];
  }
  callsCache.set(file, { key, value: rows });
  return rows;
}

async function outcomeOf(file: string): Promise<{ outcome: TryOutcome; detail: string | null }> {
  try {
    const st = await fs.stat(file);
    const key = `${st.mtimeMs}:${st.size}`;
    const hit = outcomeCache.get(file);
    if (hit && hit.key === key) return hit.value;
    const value = st.size > MAX_EVENT_BYTES ? { outcome: "answer" as TryOutcome, detail: null } : outcomeOfEvents(await fs.readFile(file, "utf-8"));
    outcomeCache.set(file, { key, value });
    return value;
  } catch {
    return { outcome: "no-answer", detail: null };
  }
}

/** Tags whose call ended after the start of the update point. A row of an earlier run of the same names has an older start time. Unknown start: none. */
function endedTags(rows: unknown[], sinceEpoch: number | null): Set<string> {
  const out = new Set<string>();
  if (sinceEpoch === null) return out;
  for (const r0 of rows) {
    const r = r0 !== null && typeof r0 === "object" ? (r0 as Rec) : null;
    if (!r || r.kind !== "model" || typeof r.tag !== "string") continue;
    const started = parseUtcIso(r.started_utc);
    if (started !== null && started >= sinceEpoch - 1) out.add(r.tag);
  }
  return out;
}

/**
 * The running update point, or null. `status` is the parsed status.json of the store (null: no update point). The caller checks that the run is active.
 * `nowMs` is the clock of the read in milliseconds.
 */
export async function loadUpdateLive(root: string, store: RunStore, status: Rec | null, nowMs: number): Promise<UpdateLive | null> {
  try {
    if (!status) return null;
    const now = nowMs / 1000;
    const hasKey = Object.hasOwn(status, "running_update");
    // Key present and null (or no object): no update point runs (brief of VW103). The history is not read.
    const given = hasKey ? runningUpdateOf(status.running_update) : null;
    if (hasKey && !given) return null;
    const tail = await readTail(path.join(root, store.historyRel), HISTORY_TAIL_BYTES);
    const open = tail ? openUpdateOf(rowsOfTail(tail.text, tail.cut)) : null;
    let base: LiveBase;
    if (given) {
      base = { ...given };
      // The key may leave out the page or the start time. The open update point of history.jsonl gives them when it names the same box.
      if (open && open.box === base.box) {
        base.page = base.page ?? open.page;
        base.startedEpoch = base.startedEpoch ?? open.startedEpoch;
      }
    } else {
      if (!open) return null;
      base = { page: open.page, box: open.box, role: null, roleN: null, roles: null, tag: null, tryN: null, card: null, startedEpoch: open.startedEpoch, tryStartedEpoch: null };
    }
    const dirName = base.page ? pageName(store, base.page) : null;
    const dir = dirName && isSafeSegment(dirName) ? path.join(root, store.dir, "update-points", dirName) : null;
    const files: (RawKind & { mtimeMs: number })[] = [];
    let rows: unknown[] = [];
    if (dir) {
      let names: string[] = [];
      try {
        names = await fs.readdir(path.join(dir, "raw"));
      } catch {
        names = [];
      }
      for (const name of names) {
        const k = parseRawName(name, base.box);
        if (!k) continue;
        try {
          files.push({ ...k, mtimeMs: (await fs.stat(path.join(dir, "raw", name))).mtimeMs });
        } catch {
          /* the file went away between the listing and the stat */
        }
      }
      rows = await callsRows(path.join(dir, "calls.jsonl"));
    }
    const scans = assembleTries(files);
    const ended = endedTags(rows, base.startedEpoch);
    // Outcome of each finished try of a call that did not end: read the small event file of the try.
    const outcomes = new Map<string, { outcome: TryOutcome; detail: string | null }>();
    const { finished } = pickTries(scans, base.startedEpoch, ended);
    for (const s of finished) {
      if (ended.has(s.tag) || !dir) continue;
      outcomes.set(`${s.tag}#${s.n}`, await outcomeOf(path.join(dir, "raw", `${s.tag}.try${s.n}.jsonl`)));
    }
    // The provider of each role: from this folder, else from the folders of the update points that ran before (the model of a role is fixed for a run).
    const providers = new Map<string, string | null>();
    if (!given) {
      for (const role of ROLE_ORDER) {
        let p = providerOfRole(rows, role);
        if (!p && open) {
          for (const pg of open.pages.filter((x) => x !== base.page).slice(0, 3)) {
            const other = pageName(store, pg);
            if (!isSafeSegment(other)) continue;
            p = providerOfRole(await callsRows(path.join(root, store.dir, "update-points", other, "calls.jsonl")), role);
            if (p) break;
          }
        }
        providers.set(role, p);
      }
    }
    return buildLive({
      source: given ? "status" : "folder",
      base,
      now,
      scans,
      ended,
      outcomes,
      providerOf: (role) => (role ? (providers.get(role) ?? null) : null),
      wait: waitOf(status.waiting),
      waitExtra: waitExtraOf(status.waiting),
    });
  } catch {
    return null;
  }
}
