"use client";
import { useRef, useState } from "react";
import { promptRange, type WordPart } from "@/lib/vector-map-detail";

export interface PromptEnd {
  version: string;
  num: string;
  prompt: string;
  parts: WordPart[];
}

// VW107: a native dialog keeps focus inside, closes on Escape, and leaves browser history untouched.
export default function VectorMapPrompt({ start, end }: { start: PromptEnd; end: PromptEnd }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const mark = useRef<HTMLElement>(null);
  const [shown, setShown] = useState<PromptEnd | null>(null);
  const range = shown ? promptRange(shown.prompt, shown.num) : null;
  function open(side: PromptEnd) {
    setShown(side);
    dialog.current?.showModal();
    requestAnimationFrame(() => mark.current?.scrollIntoView({ block: "center" }));
  }
  return (
    <>
      <p className="mb-2 text-xs text-muted">Whole stored lifetime. <span className="text-red-700">Red strikeout: removed words.</span> <span className="text-green-800">Green underline: added words.</span></p>
      <div data-vm-ends className="grid min-w-0 gap-3 sm:grid-cols-2">
        {([['Start version', start], ['End version', end]] as const).map(([label, side]) => (
          <section key={label} data-vm-end={label} className="min-w-0 rounded border border-line bg-white p-3">
            <h3 className="font-semibold">{label} <span className="font-mono">{side.version}</span></h3>
            <p className="mb-2 text-xs text-muted">Point {side.num}</p>
            <button type="button" data-vm-open-prompt={label} onClick={() => open(side)} className="mb-3 rounded border border-line px-2 py-1 text-sm font-semibold text-button2-ink">Open whole prompt</button>
            <p className="max-h-[28rem] overflow-y-auto break-words whitespace-pre-wrap text-sm leading-relaxed">
              {side.parts.map((part, i) => part.kind === "removed" ? <del key={i} data-vm-word="removed" className="bg-red-100 text-red-800">{part.text}</del> : part.kind === "added" ? <ins key={i} data-vm-word="added" className="bg-green-100 text-green-800">{part.text}</ins> : <span key={i}>{part.text}</span>)}
            </p>
          </section>
        ))}
      </div>
      <dialog ref={dialog} data-vm-prompt-dialog style={{ width: 'min(960px, calc(100% - 24px))' }} className="m-auto max-h-[90dvh] max-w-none rounded border border-line bg-background p-0 text-foreground backdrop:bg-black/60">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
          <h2 className="font-semibold">Whole prompt · {shown?.version} · point {shown?.num}</h2>
          <button type="button" onClick={() => dialog.current?.close()} className="rounded border border-line px-3 py-1">Close whole prompt</button>
        </div>
        <div data-vm-prompt-scroll className="max-h-[70dvh] overflow-y-auto p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">
          {range ? <>{range.before}<mark ref={mark} data-vm-prompt-mark className="block border-l-4 border-bar-run bg-state-run px-3 text-state-run-ink">{range.point}</mark>{range.after}</> : shown?.prompt}
        </div>
      </dialog>
    </>
  );
}
