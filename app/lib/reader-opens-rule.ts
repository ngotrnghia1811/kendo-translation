// The admin gate for agent text (unit RT74, round 75 answer 3, qa-memory-2026-10-31.md:53: "Admin opens any run").
// No import of server code and no server-only marker, so the sync command S2, the page code, and a test script can load it.

/** The sources of an open. "pilot-run" is <T2>/data/pilot-run. "book-store" is reserved for <T2>/data/book-store (no run there yet, S2 does not read it). */
export const OPEN_SOURCES = ["pilot-run", "book-store"] as const;
export type OpenSource = (typeof OPEN_SOURCES)[number];

/** The source that the code reads today. */
export const PILOT_SOURCE: OpenSource = "pilot-run";

export function isOpenSource(v: unknown): v is OpenSource {
  return typeof v === "string" && (OPEN_SOURCES as readonly string[]).includes(v);
}

/** One opened run of one book. runId is the run folder name of the page runs, for example 20261029T051154Z-r41. */
export interface ReaderOpen {
  source: OpenSource;
  book: string;
  runId: string;
}

/** The key of an open in a Set or a Map. */
export function openKey(source: string, book: string, runId: string): string {
  return `${source}|${book}|${runId}`;
}

/**
 * The run that readers see for one page (round 75 answer 3, unit default RT74):
 *   1. the run of the admin run mark, if that run is open (round 51 answer 8, qa-memory-2026-10-28.md:53)
 *   2. else the newest open run with the verdict PASS
 *   3. else no run: readers see no Agent text
 * `newestFirst` holds the finished runs of the page, newest first. `isOpen` says whether a run ID is open.
 * A marked run that is open wins also when its verdict is FAIL (the admin chose it twice).
 */
export function pickReaderRun<T extends { runId: string; verdict: string }>(newestFirst: T[], markedRunId: string | null | undefined, isOpen: (runId: string) => boolean): { run: T; why: "run mark" | "newest open PASS" } | null {
  if (markedRunId) {
    const hit = newestFirst.find((r) => r.runId === markedRunId && isOpen(r.runId));
    if (hit) return { run: hit, why: "run mark" };
  }
  const pass = newestFirst.find((r) => r.verdict === "PASS" && isOpen(r.runId));
  return pass ? { run: pass, why: "newest open PASS" } : null;
}

/**
 * The status line of the admin page view: what readers see for this page after the next S2 run.
 * `runs` are the finished runs of the page, newest first. `opens` are the run IDs that are open for the book of the page.
 */
export function readersSeeLine(runs: { runId: string; verdict: string }[], markedRunId: string | null, openRunIds: Set<string>): string {
  const pick = pickReaderRun(runs, markedRunId, (id) => openRunIds.has(id));
  if (pick) return `Readers see: run ${pick.run.runId} (opened${pick.why === "run mark" ? ", run mark" : ""})`;
  const openHere = runs.filter((r) => openRunIds.has(r.runId));
  if (openHere.length > 0) return `Readers see no agent text for this page. The open run ${openHere.map((r) => r.runId).join(", ")} has no PASS verdict.`;
  return "Readers see no agent text for this page. No run of this page is open.";
}
