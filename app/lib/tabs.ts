// Unit VW99 (Q-A 3:27.3 "Tabs on all three screens", defaults D1 and D2 in Q-A 3:28.3): the tab rules of the run view, the Monitor dashboard
// and the Details view. Pure functions, so that scripts/vw99-test.mjs tests them without a browser.
// D2: the open tab lives only in the address (?tab=steps). No cookie, no local storage.

export type Tab<K extends string = string> = { key: K; label: string };

export type RunTabKey = "pages" | "steps" | "updates" | "training" | "chain";
export type DashboardTabKey = "phase2" | "books";
export type DetailTabKey = "pages" | "steps" | "training";

const RUN_TABS: Tab<RunTabKey>[] = [
  { key: "pages", label: "Pages" },
  { key: "steps", label: "Steps" },
  { key: "updates", label: "Prompt updates" },
  { key: "training", label: "Training monitor" },
  { key: "chain", label: "Chain state per book" },
];

export const DASHBOARD_TABS: Tab<DashboardTabKey>[] = [
  { key: "phase2", label: "Phase 2 run" },
  { key: "books", label: "Books" },
];

export const DETAIL_TABS: Tab<DetailTabKey>[] = [
  { key: "pages", label: "Pages" },
  { key: "steps", label: "Steps" },
  { key: "training", label: "Training monitor" },
];

/** The facts of a list that decide its tabs. */
export type RunKind = { phase2List?: boolean; bookRunBook?: string | null; listKind?: string | null };

/** A list with a step tree: a phase 2 list, or a book-run list of a real book. */
export function hasSteps(run: RunKind): boolean {
  return run.phase2List === true || Boolean(run.bookRunBook);
}

/** The tabs of the run view that have data for this list. Steps, Prompt updates and Training monitor need a step tree. Chain state needs a chain list. */
export function runTabs(run: RunKind): Tab<RunTabKey>[] {
  const steps = hasSteps(run);
  return RUN_TABS.filter((t) => {
    if (t.key === "steps" || t.key === "updates" || t.key === "training") return steps;
    if (t.key === "chain") return run.listKind === "chain";
    return true;
  });
}

/** D1: a phase 2 list or a book-run list opens "Steps", other lists open "Pages". */
export function runDefaultTab(run: RunKind): RunTabKey {
  return hasSteps(run) ? "steps" : "pages";
}

/** D1: the Monitor dashboard opens "Phase 2 run" while the phase 2 run runs, else "Books". `phase2Key`: the key of the phase 2 row. */
export function dashboardDefaultTab(phase2Key: string | null | undefined): DashboardTabKey {
  return phase2Key === "running" || phase2Key === "running-pause" ? "phase2" : "books";
}

/** D1: the Details view opens "Pages". */
export const DETAIL_DEFAULT_TAB: DetailTabKey = "pages";

/** What the address holds: the tab, the box (?box=TL_2) and the hash (#training-monitor of the older links). */
export type TabAddress = { tab?: string | null; box?: string | null; hash?: string | null };

/**
 * The open tab. Order of the rules:
 * 1. A known tab in ?tab= that this screen has.
 * 2. ?box= or #training-monitor (older links) opens "Training monitor", when the screen has it.
 * 3. The default tab. An unknown tab falls back to it.
 */
export function pickTab<K extends string>(tabs: Tab<K>[], fallback: K, at: TabAddress): K {
  const has = (k: string | null | undefined): k is K => !!k && tabs.some((t) => t.key === k);
  if (has(at.tab)) return at.tab;
  const training = "training";
  if ((at.box || at.hash === "#training-monitor") && has(training)) return training as K;
  return has(fallback) ? fallback : tabs[0].key;
}

/** The address of a tab: the same path and the same other parameters (?box= stays), with ?tab=<key>. `search` is the query part, with or without "?". */
export function tabHref(pathname: string, search: string, key: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.set("tab", key);
  return `${pathname}?${params.toString()}`;
}

/** The index of the tab that an arrow key, Home or End moves to, or null for any other key. The ends wrap around. */
export function moveIndex(key: string, index: number, count: number): number | null {
  if (key === "ArrowRight") return (index + 1) % count;
  if (key === "ArrowLeft") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}
