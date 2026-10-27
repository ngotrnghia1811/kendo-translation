"use client";
import { useCallback, useEffect, useState } from "react";

export const POLL_MS = 3000;

/**
 * Round 43 answer 10 (Q-A l114): "Read files, refresh often". Round 44 answer 13 (Q-A l142):
 * live refresh every few seconds. Poll the URL while shouldPoll(data) is true.
 */
export function useLive<T>(url: string, initial: T, shouldPoll: (d: T) => boolean): { data: T; refresh: () => Promise<void>; live: boolean } {
  const [data, setData] = useState<T>(initial);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) setData((await r.json()) as T);
    } catch {
      /* the server is away for a moment, try again on the next tick */
    }
  }, [url]);
  const live = shouldPoll(data);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [live, refresh]);
  return { data, refresh, live };
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
