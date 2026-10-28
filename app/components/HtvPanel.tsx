import type { PanelBlock, PanelData } from "@/lib/htv-panel";

// Round 51 answer 8 (Q-A 2026-10-28 l53): the panel shows the information that the TL_3 agent got, next to the ED_3 text.
// The text comes from messages/TL_3.txt (round 52 answer 12, l83). Round 53 answers 5 and 6 (l99, l100): no fixed text,
// blocks of the whole page. The parser (lib/htv-panel.ts) already dropped the hidden parts, so none of them reaches the browser.

const OPEN_LIMIT = 40; // [unit default] a block with more lines than this starts closed

function Block({ b }: { b: PanelBlock }) {
  return (
    <details open={b.lineCount <= OPEN_LIMIT} className="border-b border-line/70 py-1.5">
      <summary className="cursor-pointer select-none text-sm font-semibold">
        {b.label}
        <span className="ml-2 text-xs font-normal text-muted">
          {b.itemCount > 0 ? `${b.itemCount} items, ` : ""}
          {b.lineCount} lines
        </span>
      </summary>
      <div className="mt-1.5 space-y-1.5">
        {b.parts.map((p, i) =>
          p.kind === "text" ? (
            <pre key={i} className="whitespace-pre-wrap break-words font-ja text-xs leading-relaxed">
              {p.lines.join("\n")}
            </pre>
          ) : (
            <pre key={i} className="whitespace-pre-wrap break-words rounded border border-line/80 bg-white/60 p-1.5 font-ja text-xs leading-relaxed">
              {p.lines.join("\n")}
            </pre>
          ),
        )}
      </div>
    </details>
  );
}

export default function Tl3Panel({ panel }: { panel: PanelData }) {
  return (
    <section aria-label="TL_3 information panel">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">TL_3 information panel</h2>
      {panel.available ? (
        <>
          <p className="mt-0.5 text-xs text-muted">
            Panel lines: {panel.shownLines} of {panel.totalLines} message lines. Information of the whole page.
          </p>
          {panel.blocks.map((b) => (
            <Block key={b.name} b={b} />
          ))}
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">{panel.note}</p>
      )}
    </section>
  );
}
