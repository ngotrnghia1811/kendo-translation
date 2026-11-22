"use client";
// Unit VW123 (plan P63, card P63.1). Owner pick Q-A 3:116.4 (2026-11-22) "Search list + Thinking menu", row M6.
// The "Thinking" menu next to the model button. oc2 model: .../vendor/openchamber/packages/ui/src/components/chat/ModelControls.tsx l2520-2569
// (label "Thinking", first item "default", then the efforts of the chosen model). The efforts come from lib/model-efforts.ts.
// The menu shows only the efforts of the chosen model. A model with no efforts shows the disabled text "no effort choice".
// The stored text of an item is written exactly as the table holds it (the run matches it exactly). An item "<value> (current)" keeps a stored value that the table does not know.
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_EFFORT } from "@/lib/model-efforts";
import { BLOCKED_TEXT, effortItemsFor } from "@/lib/oc2-efforts"; // unit VW125 (Q-A 3:118.2 row 3): the efforts come from the list of oc2, the static table is the fallback
import type { Catalog } from "@/lib/oc2-models-rules";
import { useOutsideClose } from "./useOutsideClose";

type Props = {
  id: string;
  /** The accessible name, for example "Level 2 effort". */
  label: string;
  /** The chosen model ID, or undefined when the field has none. */
  model: string | undefined;
  value: string | undefined;
  /** Efforts that the settings store for exactly this model (for a provider that the table cannot rule). */
  stored: string[];
  /** The list of oc2 (unit VW125), or null when the list file is missing or broken. */
  catalog?: Catalog | null;
  disabled: boolean;
  describedBy: string;
  onPick: (value: string) => void;
  onBlurCheck: () => void;
  className: string;
};

export default function ThinkingMenu({ id, label, model, value, stored, catalog = null, disabled, describedBy, onPick, onBlurCheck, className }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClose(wrap, open, close);
  const list = model ? effortItemsFor(model, value, catalog, stored) : [];
  const start = Math.max(0, list.findIndex((i) => i.current));
  useEffect(() => { if (open) items.current[start]?.focus(); }, [open, start]);

  if (list.length === 0) {
    const kept = value !== undefined && value !== "" && value !== DEFAULT_EFFORT;
    return <div className="min-w-0" data-thinking-none>
      <button type="button" id={id} disabled aria-label={`${label}: no effort choice`} aria-describedby={describedBy} className={`${className} text-left text-muted`}>no effort choice</button>
      {kept && <p className="mt-1 text-xs text-muted" data-thinking-stored>stored: {value}</p>}
    </div>;
  }
  const currentLabel = list.find((i) => i.current)?.label ?? DEFAULT_EFFORT;
  function pick(next: string) { close(); onPick(next); button.current?.focus(); }
  function onMenuKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const at = items.current.findIndex((el) => el === document.activeElement);
    const move = (to: number) => { e.preventDefault(); items.current[((to % list.length) + list.length) % list.length]?.focus(); };
    if (e.key === "ArrowDown") move(at + 1);
    else if (e.key === "ArrowUp") move(at - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(list.length - 1);
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); button.current?.focus(); }
    else if (e.key === "Tab") close();
  }
  return <div ref={wrap} className="relative min-w-0" data-thinking-menu>
    <button ref={button} type="button" id={id} disabled={disabled} aria-haspopup="menu" aria-expanded={open} aria-label={`${label}: ${currentLabel}`} aria-describedby={describedBy}
      className={`${className} flex items-center justify-between gap-2 text-left`} onClick={() => setOpen((o) => !o)} onBlur={onBlurCheck}>
      <span className="min-w-0 truncate" data-thinking-button-text><span className="text-muted">Thinking:</span> {currentLabel}</span><span aria-hidden="true" className="shrink-0 text-muted">▾</span>
    </button>
    {open && <div role="menu" aria-label="Thinking" data-thinking-popover className="absolute left-0 top-full z-30 mt-1 w-[min(16rem,calc(100vw-3rem))] rounded border border-line bg-white p-1 text-foreground shadow-lg" onKeyDown={onMenuKey}>
      <p className="px-3 py-1 text-xs font-semibold uppercase text-muted" aria-hidden="true">Thinking</p>
      {/* A blocked item (an effort name that the settings file cannot store) stays focusable (aria-disabled) so the arrow keys pass over it, and a click or Enter on it does nothing. */}
      {list.map((item, i) => <button key={item.value} ref={(el) => { items.current[i] = el; }} type="button" role="menuitemradio" aria-checked={item.current} aria-disabled={item.blocked || undefined} tabIndex={-1} data-thinking-item={item.value} data-thinking-blocked={item.blocked ? "true" : undefined}
        title={item.blocked ? BLOCKED_TEXT : undefined}
        className={"flex w-full items-center gap-2 rounded px-3 py-2 text-left focus-visible:bg-stone-100 focus-visible:outline-2 focus-visible:outline-accent " + (item.blocked ? "cursor-not-allowed text-muted" : "hover:bg-stone-100")} onClick={() => { if (!item.blocked) pick(item.value); }}>
        <span aria-hidden="true" className="w-4 shrink-0 text-accent">{item.current ? "✓" : ""}</span>
        <span className="min-w-0 flex-1 break-words">{item.label}{item.blocked && <span className="block text-xs">not allowed in the settings file</span>}</span>
        {!item.extra && item.value !== DEFAULT_EFFORT && <code className="shrink-0 text-xs text-muted">{item.value}</code>}
      </button>)}
    </div>}
  </div>;
}
