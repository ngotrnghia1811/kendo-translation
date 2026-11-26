"use client";
import { useEffect, useRef, useState } from "react";
import { COMMENT_MAX, PICTURE_MAX_BYTES, clearStrokes, pageUrlOf, penWidth, undoStroke, type Stroke } from "@/lib/visual-issue-rules";
import { UI_ATTR, paintStrokes, pngWithin } from "@/lib/visual-issue-capture";
import { LOCAL_ISSUES_API } from "@/lib/visual-issues-local-rules";
import { OFFLINE_WORDS } from "@/lib/offline-copy"; // unit VW131

// Unit VW118 (plan item P53, Q-A 3:99.5 row 4), owner words (Q-A 3:98.5): "then write a comment and draw on the screenshot, then click send issue".
// Row 4: "the picture opens in a pop-up with a red pen, Undo and Clear, and a comment box. 'Send issue' stores it. Esc closes the pop-up without a send."
// The pop-up is a native dialog (showModal), like components/ConfirmDialog.tsx: the browser holds the focus inside and shows the backdrop.
// Esc is read by components/VisualIssueTool.tsx. The event "cancel" of the dialog goes to the same close function, so a close by the dialog alone also leaves the tool in a clean state.
// If the picture could not be made, the pop-up still opens with a short error line, and the comment box works (nothing is lost). A failed send keeps the comment and the drawing.

export interface Shot {
  /** The picture of the part, or null when the capture failed. */
  canvas: HTMLCanvasElement | null;
  error: string;
  /** Row 5: the page address (path and query), the window width, and the theme at the moment of the capture. */
  pageUrl: string;
  screenWidth: number;
  theme: string;
}

// Unit VW121 (Q-A 3:112.2 row 5): `local` (the Monitor switch is on) sends the issue to the file route of this Mac. Else it goes to /api/issues as before.
export default function VisualIssueEditor({ shot, local = false, onClose, onSent }: { shot: Shot; local?: boolean; onClose: () => void; onSent: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewRef = useRef<HTMLCanvasElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const live = useRef<Stroke | null>(null);
  const [count, setCount] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(shot.error);
  const base = shot.canvas;

  function redraw() {
    const view = viewRef.current;
    const ctx = view?.getContext("2d");
    if (!view || !ctx || !base) return;
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.drawImage(base, 0, 0);
    paintStrokes(ctx, live.current ? [...strokes.current, live.current] : strokes.current);
  }

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
    noteRef.current?.focus();
    redraw();
    // The picture and the pen start once, when the pop-up opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pointOf = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * e.currentTarget.width) / r.width, y: ((e.clientY - r.top) * e.currentTarget.height) / r.height };
  };

  function undo() {
    strokes.current = undoStroke(strokes.current);
    setCount(strokes.current.length);
    redraw();
  }
  function clear() {
    strokes.current = clearStrokes();
    setCount(0);
    redraw();
  }

  async function send() {
    if (busy) return;
    const text = comment.trim();
    if (!text) {
      setError("Write a comment first.");
      noteRef.current?.focus();
      return;
    }
    const view = viewRef.current;
    if (!view || !base) {
      setError(shot.error || "There is no picture to send.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      redraw();
      const png = await pngWithin(view, PICTURE_MAX_BYTES);
      if (!png) {
        setError("The picture is too large. Close this pop-up and select a smaller part.");
        return;
      }
      const form = new FormData();
      form.set("picture", png, "issue.png");
      form.set("comment", text);
      form.set("page_url", shot.pageUrl);
      form.set("screen_width", String(shot.screenWidth));
      form.set("theme", shot.theme);
      let r: Response;
      try {
        r = await fetch(local ? LOCAL_ISSUES_API : "/api/issues", { method: "POST", body: form });
      } catch {
        // Unit VW131 (Q-A 3:134.3 row 5): with no network the tool says "Not available offline".
        setError(navigator.onLine === false ? OFFLINE_WORDS.issue : "The issue was not sent. Check the connection and try again. Your comment and drawing are kept.");
        return;
      }
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError((j.error ?? "The issue was not sent.") + " Your comment and drawing are kept.");
        return;
      }
      onSent();
    } finally {
      setBusy(false);
    }
  }

  const btn = "min-h-[40px] rounded border border-line px-3 py-1 text-sm disabled:opacity-50";
  return (
    <dialog
      ref={dialogRef}
      {...({ [UI_ATTR]: "" } as Record<string, string>)}
      data-visual-issue-editor
      aria-labelledby="visual-issue-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100dvh-1rem)] w-[min(56rem,calc(100vw-1rem))] overflow-auto rounded border border-line bg-white p-3 text-foreground shadow-lg backdrop:bg-black/40"
    >
      <h2 id="visual-issue-title" className="text-base font-semibold">
        Report a visual issue
      </h2>
      <p className="mt-1 text-sm text-muted">Draw on the picture with the red pen, write a comment, then press Send issue. Esc closes this pop-up and sends nothing.</p>
      {base ? (
        <div className="mt-2 flex justify-center overflow-auto rounded border border-line bg-stone-50 p-1">
          <canvas
            ref={viewRef}
            width={base.width}
            height={base.height}
            data-visual-issue-canvas
            aria-label="The picture of the part of the page. Draw on it with the pen."
            className="block cursor-crosshair touch-none"
            style={{ maxWidth: "100%", maxHeight: "50vh" }}
            onPointerDown={(e) => {
              if (e.pointerType === "mouse" && e.button !== 0) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              const rect = e.currentTarget.getBoundingClientRect();
              live.current = { width: penWidth(rect.width / e.currentTarget.width), points: [pointOf(e)] };
              redraw();
            }}
            onPointerMove={(e) => {
              if (!live.current) return;
              live.current.points.push(pointOf(e));
              redraw();
            }}
            onPointerUp={() => {
              if (!live.current) return;
              strokes.current = [...strokes.current, live.current];
              live.current = null;
              setCount(strokes.current.length);
              redraw();
            }}
            onPointerCancel={() => {
              live.current = null;
              redraw();
            }}
          />
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={undo} disabled={count === 0 || busy} data-visual-issue-undo className={btn}>
          Undo
        </button>
        <button type="button" onClick={clear} disabled={count === 0 || busy} data-visual-issue-clear className={btn}>
          Clear
        </button>
        <span className="text-sm text-muted" data-visual-issue-count>
          {count === 0 ? "No line drawn" : count === 1 ? "1 line drawn" : `${count} lines drawn`}
        </span>
      </div>
      <label className="mt-3 block text-sm font-medium" htmlFor="visual-issue-comment">
        Comment
      </label>
      <textarea
        id="visual-issue-comment"
        ref={noteRef}
        value={comment}
        maxLength={COMMENT_MAX}
        rows={4}
        onChange={(e) => setComment(e.target.value)}
        data-visual-issue-comment
        className="mt-1 block w-full rounded border border-line bg-white p-2 text-sm text-foreground placeholder:text-muted"
        placeholder="What is wrong, and what do you expect?"
      />
      <p className="mt-0.5 text-right text-xs text-muted">
        {comment.length} of {COMMENT_MAX} characters
      </p>
      {error ? (
        <p role="alert" data-visual-issue-error className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} data-visual-issue-close className={btn}>
          Cancel
        </button>
        <button type="button" onClick={() => void send()} disabled={busy || !base} data-visual-issue-send className="min-h-[40px] rounded bg-accent px-4 py-1 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Sending…" : "Send issue"}
        </button>
      </div>
    </dialog>
  );
}

/** The data of a new shot: the page address, the window width, and the theme at the moment of the capture. */
export function shotMeta(fallbackTheme: string): Pick<Shot, "pageUrl" | "screenWidth" | "theme"> {
  return { pageUrl: pageUrlOf(window.location.href), screenWidth: Math.max(1, Math.round(window.innerWidth)), theme: document.documentElement.dataset.theme || fallbackTheme };
}
