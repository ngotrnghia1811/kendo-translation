"use client";
import { useCallback, useSyncExternalStore } from "react";

// Round 43 answer 7 (Q-A l111): the 7 extra items are a checklist "Saved per account (Recommended)".
// Round 48 answer 9 (Q-A 2026-10-27 l55) adds 2 items for chain runs: "chain" and "critic_only". They are off at start like the others.
// No sign-in exists yet, so the ticks live in the browser (localStorage). This is "per account after sign-in":
// when sign-in arrives, move this store to the account. All items are off by default.
export const EXTRAS = [
  { key: "calls", label: "Cost and seconds per call", help: "One row per model call of the stage." },
  { key: "messages", label: "Exact text sent", help: "The full message that went to each box." },
  { key: "lookup", label: "Dictionary and aligned memory hits", help: "EN term entries and book translation memory pairs found for the box." },
  { key: "failed", label: "Failed and flagged calls", help: "Calls that failed or got a flag on this page." },
  { key: "programs", label: "Program check results", help: "EN form check, term marks, page structure check." },
  { key: "critiques", label: "Critiques with the note for the next critic", help: "What the box critic found and what the next critic must check." },
  { key: "counts", label: "Critique counts against N", help: "Critiques per critique group compared with N." },
  { key: "chain", label: "Chain inputs", help: "Previous page, previous page pair, book translation memory pairs and earlier term marks that the boxes of a chain page received." },
  { key: "critic_only", label: "Critic-only runs", help: "Critiques from the command critic-only, stored in a subfolder of this run folder." },
] as const;
export type ExtraKey = (typeof EXTRAS)[number]["key"];

const STORAGE_KEY = "viewer.extras.v1";
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function snapshot(): string {
  return window.localStorage.getItem(STORAGE_KEY) ?? "{}";
}

export function useExtras(): { ticks: Partial<Record<ExtraKey, boolean>>; toggle: (k: ExtraKey) => void } {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}");
  let ticks: Partial<Record<ExtraKey, boolean>> = {};
  try {
    ticks = JSON.parse(raw) as Partial<Record<ExtraKey, boolean>>;
  } catch {
    ticks = {};
  }
  const toggle = useCallback((k: ExtraKey) => {
    const cur = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Record<ExtraKey, boolean>>;
    cur[k] = !cur[k];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
    listeners.forEach((l) => l());
  }, []);
  return { ticks, toggle };
}
