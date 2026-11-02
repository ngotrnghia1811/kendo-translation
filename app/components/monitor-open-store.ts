"use client";
import { useCallback, useSyncExternalStore } from "react";
import { groupStartsOpen, type GroupName } from "@/lib/book-status-rules";

// Unit VW77a (round 80), VISION-viewer 15.24.4.1: "The browser keeps the open state of each group, like the checklist of the extra items
// [file: app/components/extras-store.ts:4-7]." Same pattern: the state lives in localStorage of the browser, read with useSyncExternalStore.
// A group with no saved choice starts as groupStartsOpen says: Needs attention, Waiting for a run, Running, and Stopped open. Completed and Not started closed.
const STORAGE_KEY = "viewer.monitor-groups.v1";
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

function parse(raw: string): Partial<Record<GroupName, boolean>> {
  try {
    const v = JSON.parse(raw);
    return v !== null && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function useGroupOpen(group: GroupName): [boolean, (open: boolean) => void] {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}");
  const saved = parse(raw)[group];
  const open = typeof saved === "boolean" ? saved : groupStartsOpen(group);
  const set = useCallback(
    (value: boolean) => {
      const cur = parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
      cur[group] = value;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
      listeners.forEach((l) => l());
    },
    [group],
  );
  return [open, set];
}
