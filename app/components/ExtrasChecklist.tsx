"use client";
import { EXTRAS, type ExtraKey } from "./extras-store";

// Round 43 answer 7 (Q-A l111): checklist of 7 extra items, all off by default. Round 48 answer 9 adds 2 more, also off by default.
// Controls stay hidden until needed: the checklist sits in a closed menu.
export default function ExtrasChecklist({ ticks, toggle }: { ticks: Partial<Record<ExtraKey, boolean>>; toggle: (k: ExtraKey) => void }) {
  const on = EXTRAS.filter((e) => ticks[e.key]).length;
  return (
    <details className="relative">
      <summary className="cursor-pointer select-none rounded border border-line bg-white px-3 py-1.5 text-sm hover:border-accent">
        Extra detail{on ? ` (${on} on)` : ""}
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-96 rounded border border-line bg-white p-3 shadow-lg">
        <p className="mb-2 text-xs text-muted">All items are off by default. Your ticks stay in this browser.</p>
        <ul className="space-y-2">
          {EXTRAS.map((e) => (
            <li key={e.key}>
              <label className="flex cursor-pointer items-start gap-2">
                <input type="checkbox" className="mt-1" checked={!!ticks[e.key]} onChange={() => toggle(e.key)} />
                <span>
                  <span className="text-sm">{e.label}</span>
                  <span className="block text-xs text-muted">{e.help}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
