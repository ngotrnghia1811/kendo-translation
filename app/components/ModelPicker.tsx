"use client";
// Unit VW123 (plan P63, card P63.1). Owner pick Q-A 3:116.4 (2026-11-22) "Search list + Thinking menu" and "Also Favorites and Recent", rows M1 to M5 and M7.
// The model button of both Run settings pages. A click opens a list with a search box. oc2 model: .../vendor/openchamber/packages/ui/src/components/model-picker/ModelPickerList.tsx.
//   Keys (oc2 l777-811): ArrowDown and ArrowUp move the highlight with wrap-around, Enter picks, Escape closes and gives the focus back to the button.
//   The focus stays in the search box. The box names the highlighted row in aria-activedescendant (oc2 l749-755).
// This part writes nothing but the pick: it calls onPick with a non-empty ID. A typed ID needs the form provider/model (the "Use <text>" row), so no path gives an empty model (row M5).
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MODEL_WARNING } from "@/lib/settings-schema";
import { buildSections, buttonText, entriesOf, moveActive, typedId } from "@/lib/model-picker-rules";
import type { Catalog } from "@/lib/oc2-models-rules";
import { useModelPrefs } from "./useModelPrefs";
import { useOutsideClose } from "./useOutsideClose";

// Unit VW125 (plan P66, card P66.1, Q-A 3:118.2 rows 2, 5, 9): with a `catalog` the list shows ALL models of oc2, one section for each provider (the provider label as the title),
// the readable model name in the first line and the full ID in small gray text. A saved value that the list lacks shows "(current)". Without a catalog the list works as in unit VW123.
type Props = {
  id: string;
  /** The accessible name, for example "Level 2 model". */
  label: string;
  value: string | undefined;
  /** Without a catalog (row M7): the yaml models plus the global value and the book value. With a catalog: the saved, draft, default and global values (the models of the list come from the catalog). */
  models: string[];
  /** The list of oc2 (unit VW125), or null when the list file is missing or broken. */
  catalog?: Catalog | null;
  disabled: boolean;
  describedBy: string;
  onPick: (id: string) => void;
  onBlurCheck: () => void;
  className: string;
};

export default function ModelPicker({ id, label, value, models, catalog = null, disabled, describedBy, onPick, onBlurCheck, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const prefs = useModelPrefs();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const base = useId();
  const listId = `${base}-list`;
  const optionId = (index: number) => `${base}-option-${index}`;
  const sections = useMemo(() => buildSections(models, prefs.favorites, prefs.recent, query, catalog), [models, prefs.favorites, prefs.recent, query, catalog]);
  const typed = typedId(query, sections);
  const entries = entriesOf(sections, typed);
  const close = useCallback(() => { setOpen(false); setQuery(""); }, []);
  useOutsideClose(wrap, open, close);

  useEffect(() => { if (open) search.current?.focus(); }, [open]);
  // Keep the highlighted row inside the list. Only the list scrolls, never the page.
  useEffect(() => {
    if (!open) return;
    const row = document.getElementById(`${base}-option-${active}`);
    const box = list.current;
    if (!row || !box) return;
    if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight;
  }, [open, active, base]);

  function openList() {
    const start = entriesOf(buildSections(models, prefs.favorites, prefs.recent, "", catalog), null).findIndex((e) => e.id === value);
    setActive(start < 0 ? 0 : start);
    setQuery("");
    setOpen(true);
  }
  function pick(picked: string) {
    if (picked === "") return;
    prefs.pushRecent(picked);
    close();
    onPick(picked);
    button.current?.focus();
  }
  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setActive((a) => moveActive(a, e.key === "ArrowDown" ? 1 : -1, entries.length)); }
    else if (e.key === "Enter") { e.preventDefault(); const entry = entries[active]; if (entry) pick(entry.id); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); button.current?.focus(); }
    else if (e.key === "Tab") close();
  }

  // The index of the first row of each section in keyboard order. The typed ID row comes last.
  const starts: number[] = [];
  sections.reduce((n, s) => { starts.push(n); return n + s.rows.length; }, 0);
  const useAt = entries.length - 1;
  return <div ref={wrap} className="relative min-w-0" data-model-picker>
    <button ref={button} type="button" id={id} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
      aria-label={`${label}: ${buttonText(value, catalog)}`} aria-describedby={describedBy} title={value ? `Model ID: ${value}` : undefined}
      className={`${className} flex items-center justify-between gap-2 text-left`} onClick={() => (open ? close() : openList())} onBlur={onBlurCheck}>
      <span className="min-w-0 truncate" data-model-button-text>{buttonText(value, catalog)}</span><span aria-hidden="true" className="shrink-0 text-muted">▾</span>
    </button>
    {open && <div data-model-popover className="absolute left-0 top-full z-30 mt-1 w-[min(30rem,calc(100vw-4.5rem))] rounded border border-line bg-white p-2 text-foreground shadow-lg"
      onMouseDown={(e) => { if (e.target !== search.current) e.preventDefault(); }}>
      <input ref={search} type="text" role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list" aria-label="Search models"
        aria-activedescendant={entries.length ? optionId(active) : undefined} placeholder="Search model, ID, or provider" autoComplete="off" spellCheck={false}
        value={query} className={`${className} mb-2`} onKeyDown={onSearchKey} onChange={(e) => { setQuery(e.target.value); setActive(0); }} />
      <div ref={list} id={listId} role="listbox" aria-label="Models" className="relative max-h-[min(26rem,65vh)] overflow-y-auto overscroll-contain">
        {entries.length === 0 && <p role="status" className="px-3 py-2 text-sm text-muted">No model matches. Type provider/model to use an ID that is not in the list.</p>}
        {sections.map((s) => <div key={s.key} role="group" aria-label={s.title} data-model-section={s.key}>
          <p className="sticky top-0 bg-white px-3 py-1 text-xs font-semibold uppercase text-muted" aria-hidden="true">{s.title}</p>
          {s.rows.map((row, k) => {
            const at = starts[sections.indexOf(s)] + k;
            const current = row.id === value;
            const fav = prefs.favorites.includes(row.id);
            return <div key={`${s.key}:${row.id}`} id={optionId(at)} role="option" aria-selected={current} data-model-option={row.id} data-active={at === active ? "true" : undefined}
              className={"flex cursor-pointer items-center gap-2 rounded px-3 py-2 " + (at === active ? "bg-stone-100" : "")} onMouseMove={() => { if (at !== active) setActive(at); }} onClick={() => pick(row.id)}>
              <span aria-hidden="true" className="w-4 shrink-0 text-accent">{current ? "✓" : ""}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{row.name}{row.outside && <span data-model-current className="ml-1 text-xs font-normal text-muted">(current)</span>}</span><span className="block break-all text-xs text-muted">{row.id}</span></span>
              <button type="button" tabIndex={-1} data-model-star={row.id} aria-pressed={fav} aria-label={fav ? `Remove ${row.name} from favorites` : `Add ${row.name} to favorites`} title={fav ? "Remove from favorites" : "Add to favorites"}
                className="shrink-0 rounded px-2 py-1 text-lg leading-none text-accent focus-visible:outline-2 focus-visible:outline-accent" onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); prefs.toggleFavorite(row.id); search.current?.focus(); }}>{fav ? "★" : "☆"}</button>
            </div>;
          })}
        </div>)}
        {typed !== null && <div id={optionId(useAt)} role="option" aria-selected={false} data-model-use={typed} data-active={useAt === active ? "true" : undefined}
          className={"cursor-pointer rounded px-3 py-2 " + (useAt === active ? "bg-stone-100" : "")} onMouseMove={() => { if (useAt !== active) setActive(useAt); }} onClick={() => pick(typed)}>
          <span className="block break-all font-medium">Use {typed}</span><span className="block text-xs text-amber-800">{MODEL_WARNING}</span>
        </div>}
      </div>
    </div>}
  </div>;
}
