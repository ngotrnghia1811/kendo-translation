"use client";
import { useEffect, useId, useRef } from "react";

/*
 * Confirm dialog of the process buttons (round 74 answer 12, qa-memory-2026-10-31.md:38: "option 1. also for other process-related buttons (start, pause, etc)").
 * Dialog rules: VISION-viewer 15.27.2, accepted in round 75 answer 12 (qa-memory-2026-10-31.md:62, "Dialog text per button" and "Dialog test").
 *   - Cancel is the first button and has the focus when the dialog opens.
 *   - Esc closes the dialog and counts as Cancel.
 *   - The dialog has the role dialog and a label (the title).
 *   - A press on Cancel writes nothing. Only the action button calls onConfirm.
 * The parent renders the component only while the dialog is open. The native dialog element (showModal) holds the focus inside the dialog.
 */
export default function ConfirmDialog({
  title,
  body,
  actionLabel,
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  actionLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    cancelRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data-confirm-dialog
      // Esc: the browser fires "cancel". The parent closes the dialog, so the default close step is not needed.
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded border border-line bg-white p-4 text-foreground shadow-lg backdrop:bg-black/40"
    >
      <h2 id={titleId} className="text-base font-semibold">
        {title}
      </h2>
      <p id={bodyId} className="mt-2 text-sm">
        {body}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button ref={cancelRef} type="button" onClick={onCancel} data-confirm-cancel className="rounded border border-line px-4 py-1.5 text-sm">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} data-confirm-action className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          {actionLabel}
        </button>
      </div>
    </dialog>
  );
}
