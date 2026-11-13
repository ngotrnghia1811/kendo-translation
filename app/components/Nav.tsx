"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeSwitch from "./ThemeSwitch";
import NavMenuButton, { NAV_MENU_ID, navMenuClass } from "./NavMenuButton";
import type { ThemeName } from "@/lib/htv-settings";

// Round 43 answer 6 (Q-A l110): first view "Two tabs". Runs first, Books second, full width, one click switches.
// Unit VW77a (round 80), VISION-viewer 15.24.4.1: the first tab is the Monitor dashboard "/" (active for "/" and the paths that start with /monitor).
// The old runs table is Lists "/runs". Q-A 2:8.5 adds Run settings on this Mac only.
const TABS = [
  { href: "/", label: "Monitor dashboard", monitor: true, match: (p: string) => p === "/" || p.startsWith("/monitor") },
  { href: "/runs", label: "Lists", monitor: true, match: (p: string) => p.startsWith("/runs") },
  { href: "/books", label: "Books", monitor: true, match: (p: string) => p.startsWith("/books") || p.startsWith("/page") },
  { href: "/settings/run", label: "Run settings", monitor: true, match: (p: string) => p.startsWith("/settings/run") },
  // Unit VW89 (round 90), Q-A 3:1.7 item 2: the tab "JSON viewer" (/json) on this Mac only.
  { href: "/json", label: "JSON viewer", monitor: true, match: (p: string) => p.startsWith("/json") },
  // Round 54 (unit H1): third tab for the human-translation-view. Sign-in is needed on this tab only (round 54 answer 9, Q-A l128).
  { href: "/translate", label: "Human translation", monitor: false, match: (p: string) => p.startsWith("/translate") },
];

// Round 58 answer 7 (Q-A 2026-10-28 l205): with the monitor off, only the tab Human translation shows.
export default function Nav({ monitor, theme }: { monitor: boolean; theme: ThemeName }) {
  const path = usePathname() ?? "/";
  // Unit RC1 (round 63): the reader pages, the sign-in and sign-up pages, and the admin pages have their own bar. They show no monitor tab.
  const reader = /^\/(read|admin|sign-in|sign-up)(\/|$)/.test(path);
  const tabs = reader ? [] : monitor ? TABS : TABS.filter((t) => !t.monitor);
  // Unit VW92 (round 91), Q-A 3:7.6: at 390 px the whole page scrolled sideways (document scrollWidth 685; the tabs and the theme switch did not wrap).
  // [unit default VW92] Below 768 px the bar and the tabs wrap onto more lines. From 768 px up the classes give the same bar as before VW92 (the browser check
  // compares the boxes at 768, 1024, 1280 and 1440 px). The old bar scrolled sideways below about 700 px only, so 768 px (Tailwind md) is the smallest safe limit.
  // Unit VW99 (Q-A 3:27.4 "B, A plus colored bands"): the bar is a dark red band with light text (theme variables --band and --band-ink,
  // 7 to 1 in all 5 themes). The open tab is bold with a light underline, so the color is not the only sign. The theme switch keeps its paper box.
  // Unit VW100 (Q-A 3:29.2 "Compact top bar in VW100"): below 768 px the closed band shows the site name and one button "Menu" (about 48 px high, before 256 px).
  // A tap on "Menu" opens the links and the theme switch below it (the same TABS list and the same filter, no second list). A second tap, Escape, a link click
  // and a route change close it. The open tab gets a left bar on the phone, besides the bold text and the underline. From 768 px up the two wrappers have
  // display: contents (md:contents), so the name, the nav and the theme switch are flex items of the header as before, and the button is hidden.
  // [unit default VW100] The menu state is the path where the menu was opened: a new path closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === path;
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenPath(null);
      // Focus goes back to the button, so that it does not stay on a link that the close hides.
      if (headerRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <header ref={headerRef} data-top-band className="border-b border-line bg-band text-band-ink px-6 flex flex-wrap md:flex-nowrap items-end gap-x-8">
      <div className="max-md:flex max-md:basis-full max-md:items-center max-md:justify-between max-md:gap-3 md:contents">
        <div className="py-3 font-semibold tracking-tight">{reader ? "Kendo books" : path.startsWith("/translate") ? "human-translation-view" : "agent-translation-monitor"}</div>
        <NavMenuButton open={open} onToggle={() => setOpenPath(open ? null : path)} buttonRef={buttonRef} />
      </div>
      <div id={NAV_MENU_ID} data-top-menu className={navMenuClass(open)}>
        <nav className={"flex flex-wrap md:flex-nowrap max-md:flex-col max-md:gap-0 gap-1" + (tabs.length ? "" : " max-md:hidden")} aria-label="Main tabs">
          {tabs.map((t) => {
            const on = t.match(path);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                onClick={() => setOpenPath(null)}
                className={
                  "px-4 py-3 text-sm border-b-2 -mb-px max-md:border-l-4 " +
                  (on ? "border-band-ink font-semibold text-band-ink" : "border-transparent text-band-ink hover:border-band-ink")
                }
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="md:contents">
          <ThemeSwitch theme={theme} />
        </div>
      </div>
    </header>
  );
}
