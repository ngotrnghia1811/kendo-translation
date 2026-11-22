"use client";
import { useId, useRef, useState } from "react";
import type { ActionButton, ActionId, MonitorRow } from "@/lib/book-status-rules";
import ConfirmDialog from "./ConfirmDialog";
import RestartDialog from "./RestartDialog";
import BookSettingsValues from "./BookSettingsValues"; // unit VW122
import { useRowMessage } from "./row-message-store";

// Buttons of one book row on the Monitor dashboard `/` (unit VW77b1, round 81). VISION-viewer 15.27.2 (dialog texts), 15.27.3 (buttons table),
// 15.29.2 (buttons for each state), 15.33.3 (Running row). Round 74 answer 12 (Q-A 2026-10-31 l38): every process button opens a confirm dialog, Cancel first.
// Unit VW77b2 (round 82): the buttons Restart (dialog with 16 pick lists, components/RestartDialog.tsx) and Clear mark (confirm dialog, round 82 answer 10).
//
// A button that cannot work now is grayed, not hidden. Choice of unit VW77b1 [unit default VW77b1]:
//   - the button carries aria-disabled="true" and stays in the Tab order, so a keyboard user reaches it and hears the reason;
//   - the reason shows as a tooltip (title), as text for a screen reader (aria-describedby), and as visible text under the buttons after a press on the grayed button.
// The press on a grayed button writes nothing.

function bookName(row: MonitorRow): string {
  // VISION 15.27.2: "Making the Difference on the Day (mental_full)". A row without a title shows the slug alone.
  return row.title !== row.slug ? `${row.title} (${row.slug})` : row.slug;
}

/** Exact dialog texts of VISION 15.27.2. Run phase 4 has no text there: it follows the frame of Run [unit default VW77b1]. */
export function dialogText(id: ActionId, row: MonitorRow): { title: string; body: string; actionLabel: string } {
  const name = bookName(row);
  switch (id) {
    case "run":
      return { title: `Run ${name} in phase agent-phase-3?`, body: "The button writes a mark. An opencode agent starts the run.", actionLabel: "Run" };
    case "run4":
      return { title: `Run ${name} in phase agent-phase-4?`, body: "The button writes a mark. An opencode agent starts the run. Phase 4 starts at the beginning of the book.", actionLabel: "Run phase 4" };
    case "pause":
      return { title: `Pause ${name}?`, body: "The process finishes the current page and its update point, then it stops.", actionLabel: "Pause" };
    case "resume":
      return { title: `Resume ${name}?`, body: "The book continues with the next page after the last accepted page.", actionLabel: "Resume" };
    case "restart":
      // The real dialog of Restart is RestartDialog. This text is the frame only (VISION 15.27.2).
      return { title: `Restart ${name}?`, body: "The current run moves to the archive folder. The book runs again from p001.", actionLabel: "Restart" };
    case "clear":
      // Round 82 answer 10 and the brief of VW77b2: the dialog names the mark, the state of the book, and says that no run starts [unit default VW77b2: the last sentence].
      return {
        title: `Clear the mark ${row.markText ?? "request.json"} of ${name}?`,
        body: `The book stays ${row.baseLabel}. No run starts. The file request.json moves to request.done.json.`,
        actionLabel: "Clear mark",
      };
  }
}

function bodyOf(id: ActionId, row: MonitorRow): Record<string, string> {
  if (id === "pause") return {};
  if (id === "clear") return row.markUtc ? { requested_utc: row.markUtc } : {};
  if (id === "restart") return { action: "restart", phase: row.phaseId ?? "agent-phase-4" };
  if (id === "resume") return { action: "resume", phase: row.phaseId ?? "agent-phase-3" };
  return { action: "run", phase: id === "run" ? "agent-phase-3" : "agent-phase-4" };
}

export default function RowButtons({ row, onChanged }: { row: MonitorRow; onChanged: () => Promise<void> }) {
  const [asking, setAsking] = useState<ActionId | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useRowMessage(row.slug); // kept outside the row, because a new mark can move the row to another group
  const opener = useRef<HTMLElement | null>(null);
  const uid = useId();
  // `?? []`: an old server instance can answer rows with no `buttons` key (the dev server keeps old modules until it restarts). Then the row shows no button.
  const shown = (row.buttons ?? []).filter((b) => b.show);
  if (shown.length === 0) return null;

  function open(b: ActionButton, el: HTMLElement) {
    opener.current = el;
    setMsg(null);
    setAsking(b.id);
  }

  function close() {
    setAsking(null);
    // Focus goes back to the button that opened the dialog, so a keyboard user does not start again at the top of the page.
    window.setTimeout(() => opener.current?.focus(), 0);
  }

  async function press(extra?: Record<string, unknown>) {
    if (!asking) return;
    const id = asking;
    setBusy(true);
    setAsking(null);
    try {
      const r = await fetch(`/api/monitor/books/${encodeURIComponent(row.slug)}/${id === "pause" ? "pause" : id === "clear" ? "clear-mark" : "mark"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bodyOf(id, row), ...(extra ?? {}) }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
      // V8: a 409 or any other error shows its words next to the buttons. The row reads again at once, because the state can have changed.
      setMsg(r.ok ? null : { kind: "error", text: j.error ?? `The server answered ${r.status}.` });
    } catch {
      setMsg({ kind: "error", text: "The Viewer server does not answer. Nothing was written." });
    } finally {
      setBusy(false);
      await onChanged();
    }
  }

  return (
    <div data-col="actions" className="flex flex-wrap items-center gap-2">
      {shown.map((b) =>
        b.enabled ? (
          <button
            key={b.id}
            type="button"
            data-action={b.id}
            disabled={busy}
            onClick={(e) => open(b, e.currentTarget)}
            className={
              b.id === "pause"
                ? "rounded border border-amber-600 bg-white px-3 py-1 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                : b.id === "restart"
                  ? "rounded border border-red-700 bg-white px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                  : b.id === "clear"
                    ? "rounded border border-line bg-white px-3 py-1 text-sm font-medium text-foreground disabled:opacity-50"
                    : "rounded bg-accent px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
            }
          >
            {b.label}
          </button>
        ) : (
          <span key={b.id} className="inline-flex">
            <button
              type="button"
              data-action={b.id}
              data-grayed
              aria-disabled="true"
              aria-describedby={`${uid}-${b.id}`}
              title={b.reason ?? undefined}
              onClick={() => setMsg({ kind: "info", text: b.reason ?? "" })}
              className="cursor-not-allowed rounded border border-line bg-white px-3 py-1 text-sm text-muted"
            >
              {b.label}
            </button>
            <span id={`${uid}-${b.id}`} className="sr-only">
              {b.label} is off. {b.reason}
            </span>
          </span>
        ),
      )}
      {msg ? (
        <span role={msg.kind === "error" ? "alert" : "status"} data-row-action-msg={msg.kind} className={"text-sm " + (msg.kind === "error" ? "text-red-700" : "text-muted")}>
          {msg.text}
        </span>
      ) : null}
      {asking === "restart" ? (
        <RestartDialog slug={row.slug} name={bookName(row)} busy={busy} onCancel={close} onRestart={(prompts) => void press({ prompts })} />
      ) : asking ? (
        <ConfirmDialog {...dialogText(asking, row)} busy={busy} onCancel={close} onConfirm={() => void press()}>
          {/* Unit VW122 (Q-A 3:112.3 row 9): Run, Run phase 4 and Resume list the values that the run will use, each with "this book" or "global". */}
          {asking === "run" || asking === "run4" || asking === "resume" ? <BookSettingsValues slug={row.slug} /> : null}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
