"use client";

import { useRef, useSyncExternalStore, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { moveIndex, pickTab, tabHref, type Tab } from "@/lib/tabs";

// Unit VW99 (Q-A 3:27.3, D1 and D2 in Q-A 3:28.3): a tab row for the run view, the Monitor dashboard and the Details view.
// The open tab lives only in the address (?tab=steps). A click adds a history entry, so Back opens the tab before.
// Only the open panel is in the page, so a closed tab runs no poll and loads no data.
// Keyboard: Tab goes to the open tab, the arrow keys, Home and End move between the tabs, Enter or Space opens the tab with the focus.

function onHashChange(change: () => void) {
  window.addEventListener("hashchange", change);
  window.addEventListener("popstate", change);
  return () => {
    window.removeEventListener("hashchange", change);
    window.removeEventListener("popstate", change);
  };
}

/** The open tab of this screen from the address. The server does not get the hash (#training-monitor of the older links), so the browser reads it after the first paint. */
export function useOpenTab<K extends string>(tabs: Tab<K>[], fallback: K): K {
  const params = useSearchParams();
  const hash = useSyncExternalStore(onHashChange, () => window.location.hash, () => null);
  return pickTab(tabs, fallback, { tab: params.get("tab"), box: params.get("box"), hash });
}

type Props<K extends string> = {
  /** The name of the tab row for screen readers, for example "Parts of the run view". */
  label: string;
  /** A short prefix for the element IDs of the tabs and the panel. */
  idBase: string;
  tabs: Tab<K>[];
  /** The tab that opens when the address names no tab (D1). */
  fallback: K;
  /** The content of the open tab. */
  children: (open: K) => ReactNode;
};

export function Tabs<K extends string>({ label, idBase, tabs, fallback, children }: Props<K>) {
  const open = useOpenTab(tabs, fallback);
  const pathname = usePathname();
  const params = useSearchParams();
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  const search = params.toString();

  function go(e: MouseEvent<HTMLAnchorElement>, href: string) {
    // A click with a key that opens a new browser tab keeps the normal link behavior.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (href !== `${pathname}?${search}`) window.history.pushState(null, "", href);
  }

  function onKey(e: KeyboardEvent<HTMLAnchorElement>, index: number) {
    if (e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
      return;
    }
    const next = moveIndex(e.key, index, tabs.length);
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
  }

  const panel = (
    <div role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${open}`} tabIndex={0} data-tab-panel={open} className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
      {children(open)}
    </div>
  );
  if (tabs.length < 2) return panel;

  return (
    <div data-tabs={idBase} className="mt-5">
      <div role="tablist" aria-label={label} className="mb-4 flex flex-wrap gap-1.5 border-b-2 border-tab-on pb-2">
        {tabs.map((t, i) => {
          const on = t.key === open;
          const href = tabHref(pathname, search, t.key);
          return (
            <a
              key={t.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`${idBase}-tab-${t.key}`}
              href={href}
              role="tab"
              aria-selected={on}
              aria-controls={`${idBase}-panel`}
              tabIndex={on ? 0 : -1}
              data-tab={t.key}
              onClick={(e) => go(e, href)}
              onKeyDown={(e) => onKey(e, i)}
              className={
                "inline-flex min-h-[44px] items-center rounded border-2 px-3 py-1 text-sm no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:min-h-0 md:py-1.5 " +
                (on ? "border-tab-on bg-tab-on font-semibold" : "border-line bg-white hover:border-tab-on")
              }
            >
              {/* The color sits on a span, because the global rule "a { color: inherit }" (app/globals.css) wins over a color class on the link. */}
              <span className={on ? "text-tab-on-ink" : "text-foreground"}>{t.label}</span>
            </a>
          );
        })}
      </div>
      {panel}
    </div>
  );
}
