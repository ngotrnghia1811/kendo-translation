"use client";
import { useCallback, useEffect, useState } from "react";

export const POLL_MS = 3000;

/**
 * Round 43 answer 10 (Q-A l114): "Read files, refresh often". Round 44 answer 13 (Q-A l142):
 * live refresh every few seconds. Poll the URL while shouldPoll(data) is true.
 * Unit VW77a (round 80), VISION-viewer 15.24.4.6: no poll while the tab is hidden, and one refresh when the tab comes back.
 * `failures` counts the polls in a row that failed (no answer, or an answer that is not ok). A good poll sets it to 0.
 * The Monitor dashboard shows a banner at 3 failures. Today a failed poll is silent on the other screens.
 */
export function useLive<T>(url: string, initial: T, shouldPoll: (d: T) => boolean): { data: T; refresh: () => Promise<void>; live: boolean; failures: number } {
  const [data, setData] = useState<T>(initial);
  const [failures, setFailures] = useState(0);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) {
        setData((await r.json()) as T);
        setFailures(0);
      } else {
        setFailures((n) => n + 1);
      }
    } catch {
      /* the server is away for a moment, try again on the next tick */
      setFailures((n) => n + 1);
    }
  }, [url]);
  const live = shouldPoll(data);
  useEffect(() => {
    if (!live) return;
    const visible = () => document.visibilityState === "visible";
    const id = setInterval(() => {
      if (visible()) void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (visible()) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [live, refresh]);
  return { data, refresh, live, failures };
}

export function LiveBadge({ live }: { live: boolean }) {
  if (!live) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
      Live, refresh every 3 seconds
    </span>
  );
}
