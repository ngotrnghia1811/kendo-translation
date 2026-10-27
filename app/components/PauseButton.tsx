"use client";
import { useState } from "react";
import { clock } from "@/lib/format";

// Round 43 answer 8 (Q-A l112): "Pause before next call (Recommended)". Round 44 answer 13 (Q-A l142): a pause button writes PAUSE.
// The run program checks the file before each new model call. Calls that run now finish.
export default function PauseButton({
  stamp,
  state,
  fileExists,
  pausedSinceEpoch,
  onDone,
}: {
  stamp: string;
  state: string;
  fileExists: boolean;
  pausedSinceEpoch: number | null;
  onDone: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (state !== "running" && state !== "paused") return null;

  async function press() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stamp, on: !fileExists }),
      });
      const j = (await r.json()) as { message?: string; error?: string };
      setMsg(j.message ?? j.error ?? "");
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={press}
        disabled={busy}
        className={
          "rounded border px-4 py-1.5 text-sm font-medium disabled:opacity-50 " +
          (fileExists ? "border-green-700 bg-green-700 text-white hover:bg-green-800" : "border-amber-600 bg-white text-amber-800 hover:bg-amber-50")
        }
      >
        {fileExists ? "Resume" : "Pause"}
      </button>
      {state === "paused" ? (
        <span className="text-sm text-amber-800">Paused since {clock(pausedSinceEpoch)}</span>
      ) : fileExists ? (
        <span className="text-sm text-amber-800">Pause requested. Calls that run now will finish first.</span>
      ) : (
        <span className="text-sm text-muted">The run waits before the next model call.</span>
      )}
      {msg ? <span className="text-xs text-muted">{msg}</span> : null}
    </div>
  );
}
