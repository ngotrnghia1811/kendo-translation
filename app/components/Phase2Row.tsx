import { PHASE2_LINE } from "@/lib/book-status-rules";
import { phase2Text } from "@/lib/phase2-row";
import type { Phase2View } from "@/lib/phase2-row";

// Unit VW91 (round 91), Q-A 3:4.6 (2026-11-11 10:42 PST): "Small live row now (VW91)". Read only: no button (the owner runs phase 2 in his terminal, Q-A 3:3.7).
// It replaces the fixed line "Phase 2 (paired dataset): no run record yet." when book-store/paired-dataset/status.json exists. Without the file the old line stays.
// The text comes from phase2Text (lib/phase2-row.ts), so a node test checks the same words. Colors: only classes that scripts/contrast-dark.mjs already tests.
export default function Phase2Row({ view, now }: { view: Phase2View | null | undefined; now: number }) {
  if (!view) {
    return (
      <p data-phase2-line className="text-sm text-muted">
        {PHASE2_LINE}
      </p>
    );
  }
  const t = phase2Text(view, now);
  return (
    <div data-phase2-row data-phase2-state={view.key} className="rounded border border-line bg-white px-3 py-2 text-sm">
      <p data-phase2-title className="font-semibold">
        {t.lead}{" "}
        <span aria-hidden="true">{t.symbol}</span> {t.label}
      </p>
      <ul className="mt-1 space-y-0.5 text-muted">
        {t.lines.map((l) => (
          <li key={l.key} data-phase2-item={l.key} className={l.error ? "break-words text-red-700" : undefined}>
            {l.text}
            {l.links?.map((k, i) => (
              <span key={k.href}>
                {i > 0 ? " · " : l.text.endsWith(" ") ? "" : " "}
                <a data-phase2-link href={k.href} className="underline underline-offset-2">
                  {k.text}
                </a>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
