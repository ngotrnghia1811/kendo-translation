"use client";
import type { Ref } from "react";

// Unit VW100 (Q-A 3:29.2 "Compact top bar in VW100"): the Menu button of the phone form of the top bar (viewport below 768 px, Tailwind md).
// The word "Menu" stays on the button (Q-A 3:17.4, readable names). The icon changes with the state (three lines, then a cross),
// so the color is not the only sign of the open state. The hit area is 44 x 44 px or more. From 768 px up the button is hidden (md:hidden).
export const NAV_MENU_ID = "top-menu";

/** Classes of the menu box (the links and the theme switch). Below 768 px: closed = hidden, open = a column of full-width rows. From 768 px up: display: contents, as before. */
export function navMenuClass(open: boolean): string {
  return "md:contents max-md:basis-full max-md:flex-col max-md:pb-2 " + (open ? "max-md:flex" : "max-md:hidden");
}

export default function NavMenuButton({ open, onToggle, buttonRef }: { open: boolean; onToggle: () => void; buttonRef?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-expanded={open}
      aria-controls={NAV_MENU_ID}
      onClick={onToggle}
      data-menu-button
      className="md:hidden shrink-0 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded border border-band-ink px-3 text-sm font-semibold text-band-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-band-ink aria-expanded:bg-band-ink aria-expanded:text-band"
    >
      <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {open ? <path d="M4 4L14 14M14 4L4 14" /> : <path d="M3 5H15M3 9H15M3 13H15" />}
      </svg>
      <span>Menu</span>
    </button>
  );
}
