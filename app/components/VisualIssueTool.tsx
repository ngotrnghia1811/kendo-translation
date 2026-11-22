"use client";
import { useEffect, useRef, useState } from "react";
import VisualIssueEditor, { shotMeta, type Shot } from "./VisualIssueEditor";
import VisualIssueSelect from "./VisualIssueSelect";
import { UI_ATTR, captureBox, twoFrames } from "@/lib/visual-issue-capture";
import { stepAfterEscape, type Box, type Step } from "@/lib/visual-issue-rules";
import type { ThemeName } from "@/lib/htv-settings";

// Unit VW118 (plan item P53), the visual-issue tool. Owner words (Q-A 3:98.5, 2026-11-19): "Add a visual-issue tool: + a small floating icon
// + If user click it, they will take screenshot of a specific part of the current page (esc to go back) + then write a comment and draw on the screenshot, then click send issue.
// + We will store these issue and gradually resolve them". Accepted rows (Q-A 3:99.5): 1 (who sees the icon: the layout renders this part for a signed-in translator or admin only),
// 2 (the icon: a small round button at the bottom right corner, hidden in the screenshot), 3 (capture), 4 (editor), 5 and 6 (the send goes to /api/issues).
// Steps: idle (the icon) > select (page dimmed, cross cursor) > drag (a box) > capture (a short wait) > editor (the pop-up). Esc goes back at every step (lib/visual-issue-rules.ts stepAfterEscape).
// While the tool works in a step other than idle, the icon is not drawn. Every part has the attribute data-visual-issue-ui, and the capture leaves out every element that has it.

const MARK = { [UI_ATTR]: "" } as Record<string, string>;

// Unit VW121 (Q-A 3:112.2 rows 1 and 5): `local` is true with the Monitor switch on (this Mac). The icon then shows for every visitor and the send goes to the file route
// /api/monitor/issues. Without `local` (the live site) the send goes to /api/issues as before.
export default function VisualIssueTool({ theme, local = false }: { theme: ThemeName; local?: boolean }) {
  const [step, setStep] = useState<Step>("idle");
  const [selectKey, setSelectKey] = useState(0);
  const [notice, setNotice] = useState("");
  const [shot, setShot] = useState<Shot | null>(null);
  const [sent, setSent] = useState(false);
  const run = useRef(0);
  const sentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (sentTimer.current) clearTimeout(sentTimer.current);
    };
  }, []);

  // Esc goes back at every step. The listener sits on the window in the capture phase, so an Esc in the pop-up or on the dim layer reaches it first.
  useEffect(() => {
    if (step === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (step === "drag") setSelectKey((k) => k + 1);
      if (step === "capture") run.current++;
      if (step === "editor") setShot(null);
      if (step === "select" || step === "drag") setNotice("");
      setStep(stepAfterEscape(step));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [step]);

  async function capture(box: Box) {
    const id = ++run.current;
    setStep("capture");
    // The dim layer and the hint leave the screen, then the capture starts. The icon is not drawn in this step either.
    await twoFrames();
    if (id !== run.current) return;
    const meta = shotMeta(theme);
    let next: Shot;
    try {
      next = { ...meta, canvas: (await captureBox(box)).canvas, error: "" };
    } catch (e) {
      next = { ...meta, canvas: null, error: e instanceof Error ? e.message : "The picture could not be made." };
    }
    if (id !== run.current) return;
    setShot(next);
    setStep("editor");
  }

  function cancel() {
    run.current++;
    setNotice("");
    setShot(null);
    setStep("idle");
  }

  return (
    <>
      {step === "idle" ? (
        <button
          type="button"
          {...MARK}
          data-visual-issue-icon
          aria-label="Report a visual issue"
          title="Report a visual issue: take a picture of a part of this page"
          onClick={() => {
            setNotice("");
            setStep("select");
          }}
          className="fixed bottom-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-tab-on text-tab-on-ink shadow-lg outline-offset-2 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8V5a1 1 0 0 1 1-1h3" />
            <path d="M16 4h3a1 1 0 0 1 1 1v3" />
            <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
            <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        </button>
      ) : null}
      {step === "select" || step === "drag" ? (
        <VisualIssueSelect
          key={selectKey}
          notice={notice}
          onDragStart={() => setStep("drag")}
          onBox={(box) => {
            if (box) {
              void capture(box);
            } else {
              setNotice("That box is too small. Drag a larger box, or press Esc to cancel.");
              setSelectKey((k) => k + 1);
              setStep("select");
            }
          }}
          onCancel={cancel}
        />
      ) : null}
      {step === "capture" ? (
        <p {...MARK} role="status" data-visual-issue-wait className="fixed bottom-4 left-4 right-[4.5rem] z-[72] rounded border border-line bg-white px-3 py-2 text-sm text-foreground shadow-lg md:right-auto md:max-w-xl">
          Making the picture… Press Esc to cancel.
        </p>
      ) : null}
      {step === "editor" && shot ? (
        <VisualIssueEditor
          shot={shot}
          local={local}
          onClose={cancel}
          onSent={() => {
            cancel();
            setSent(true);
            if (sentTimer.current) clearTimeout(sentTimer.current);
            sentTimer.current = setTimeout(() => setSent(false), 4000);
          }}
        />
      ) : null}
      {sent ? (
        <p {...MARK} role="status" data-visual-issue-sent className="fixed bottom-16 right-4 z-40 rounded border border-line bg-white px-3 py-2 text-sm text-foreground shadow-lg">
          Issue sent. Thank you.
        </p>
      ) : null}
    </>
  );
}
