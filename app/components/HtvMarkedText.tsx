"use client";
import { useEffect, useState } from "react";
import type { TermEntry, TermMark } from "@/lib/htv-types";

// Round 50 answer 11 (Q-A 2026-10-28 l32): "Highlight from stored marks". Round 51 answer 12 (l57): the JA side of a mark
// with no EN term gets the same highlight, and the EN side has none. Round 51 answer 14 (l59): the pop-up shows the first
// definition of each language with the agent-written label, and the user can expand it to the full entry.
// Mark offsets count characters (code points), so the text is split with Array.from.

export interface PickedTerm {
  mark: TermMark;
  left: number;
  top: number;
}

/** Text with highlighted terms. A mark that overlaps the one before it is skipped. */
export function MarkedText({ text, marks, onPick }: { text: string; marks: TermMark[]; onPick: (p: PickedTerm) => void }) {
  const cps = Array.from(text);
  const out: React.ReactNode[] = [];
  let pos = 0;
  for (const m of marks) {
    if (m.start < pos || m.end > cps.length || m.end <= m.start) continue;
    if (m.start > pos) out.push(cps.slice(pos, m.start).join(""));
    out.push(
      <button
        key={`${m.markId}-${m.start}`}
        type="button"
        data-term={m.entryId}
        title="Open the termbase entry"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onPick({ mark: m, left: r.left, top: r.bottom });
        }}
        className="rounded-sm bg-amber-100 px-0.5 underline decoration-dotted decoration-amber-700 underline-offset-2 hover:bg-amber-200"
      >
        {cps.slice(m.start, m.end).join("")}
      </button>,
    );
    pos = m.end;
  }
  if (pos < cps.length) out.push(cps.slice(pos).join(""));
  return <>{out}</>;
}

const LANG_NAMES: Record<string, string> = { ja: "JA", en: "EN", zh: "ZH", vi: "VI", ko: "KO" };

function AgentTag() {
  return <span className="ml-1 rounded bg-stone-200 px-1 text-[10px] font-medium text-stone-700">agent-written</span>;
}

/** Pop-up with the termbase entry of a clicked mark. Closes on Escape, on a click outside, and on scroll. */
export function TermPopup({ picked, entry, onClose }: { picked: PickedTerm; entry: TermEntry | undefined; onClose: () => void }) {
  const [full, setFull] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest("[data-term-popup]") && !t?.closest("[data-term]")) onClose();
    };
    const scroll = () => onClose();
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", down);
    window.addEventListener("scroll", scroll, true);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [onClose]);

  const width = 400;
  const left = Math.max(8, Math.min(picked.left, (typeof window === "undefined" ? 1200 : window.innerWidth) - width - 16));
  const top = Math.min(picked.top + 6, (typeof window === "undefined" ? 800 : window.innerHeight) - 220);
  return (
    <div
      data-term-popup
      role="dialog"
      aria-label="Termbase entry"
      style={{ left, top, width }}
      className="fixed z-50 max-h-[70vh] overflow-auto rounded border border-line bg-white p-3 text-sm shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-ja text-lg font-semibold">{entry?.headword || picked.mark.surface}</span>
          {entry && entry.readings.length > 0 ? <span className="ml-2 font-ja text-muted">{entry.readings.join(", ")}</span> : null}
          {entry?.romaji ? <span className="ml-2 font-serif italic">{entry.romaji}</span> : null}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-foreground">
          ×
        </button>
      </div>
      {!entry ? <p className="mt-2 text-muted">No termbase entry text for {picked.mark.entryId}.</p> : null}
      {entry ? (
        <div className="mt-2 space-y-2">
          {entry.common ? <div className="text-xs text-muted">Kind: {entry.common}</div> : null}
          {picked.mark.result ? (
            <div className="text-xs text-muted">
              EN form check: {picked.mark.result}
              {picked.mark.detail && picked.mark.detail !== "none" ? ` (${picked.mark.detail})` : ""}
            </div>
          ) : null}
          {entry.langs.map((l) => {
            const pref = l.terms.find((t) => t.preferred) ?? l.terms[0];
            const defs = full ? l.definitions : l.definitions.slice(0, 1);
            const terms = full ? l.terms : pref ? [pref] : [];
            return (
              <div key={l.lang} className="border-t border-line/60 pt-1.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-accent">{LANG_NAMES[l.lang] ?? l.lang}</div>
                {terms.map((t, i) => (
                  <div key={i}>
                    <span className="font-medium">{t.term}</span>
                    {full && t.preferred ? <span className="ml-1 text-xs text-muted">preferred</span> : null}
                    {t.agentWritten ? <AgentTag /> : null}
                  </div>
                ))}
                {defs.map((d, i) => (
                  <div key={i} className="text-muted">
                    {d.text}
                    {d.agentWritten ? <AgentTag /> : null}
                  </div>
                ))}
                {!full && l.definitions.length > 1 ? <div className="text-xs text-muted">+ {l.definitions.length - 1} more</div> : null}
              </div>
            );
          })}
          <button type="button" onClick={() => setFull((v) => !v)} className="text-xs text-accent underline">
            {full ? "Show the short entry" : "Show the full entry"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
