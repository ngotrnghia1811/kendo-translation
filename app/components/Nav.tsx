"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeSwitch from "./ThemeSwitch";
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
  return (
    <header className="border-b border-line bg-white/70 px-6 flex flex-wrap md:flex-nowrap items-end gap-x-8">
      <div className="py-3 font-semibold tracking-tight">{reader ? "Kendo books" : path.startsWith("/translate") ? "human-translation-view" : "agent-translation-monitor"}</div>
      <nav className="flex flex-wrap md:flex-nowrap gap-1" aria-label="Main tabs">
        {tabs.map((t) => {
          const on = t.match(path);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={
                "px-4 py-3 text-sm border-b-2 -mb-px " +
                (on ? "border-accent font-semibold text-foreground" : "border-transparent text-muted hover:text-foreground")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <ThemeSwitch theme={theme} />
    </header>
  );
}
