"use client";
import { useCallback, useSyncExternalStore } from "react";

// Unit VW77b1 (round 81), brief step V8: "Show the route error text (409 reason) next to the button when the write fails."
// A row can change its group after a press (a new mark moves it to Waiting for a run). React then builds the row again in the other group,
// and a message kept in the row would be lost. The message lives here, in the browser memory, with the slug as key, so it survives that move.
// It is not saved: a reload clears it. Same pattern as monitor-open-store.ts (useSyncExternalStore).
export interface RowMessage {
  kind: "error" | "info";
  text: string;
}

let messages: Readonly<Record<string, RowMessage>> = {};
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function snapshot(): Readonly<Record<string, RowMessage>> {
  return messages;
}

const EMPTY: Readonly<Record<string, RowMessage>> = {};

export function useRowMessage(slug: string): [RowMessage | null, (m: RowMessage | null) => void] {
  const all = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const set = useCallback(
    (m: RowMessage | null) => {
      const next = { ...messages };
      if (m) next[slug] = m;
      else delete next[slug];
      messages = next;
      listeners.forEach((l) => l());
    },
    [slug],
  );
  return [all[slug] ?? null, set];
}
