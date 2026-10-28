"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Round 43 answer 6 (Q-A l110): first view "Two tabs". Runs first, Books second, full width, one click switches.
const TABS = [
  { href: "/", label: "Runs", match: (p: string) => p === "/" || p.startsWith("/runs") },
  { href: "/books", label: "Books", match: (p: string) => p.startsWith("/books") || p.startsWith("/page") },
  // Round 54 (unit H1): third tab for the human-translation-view. Sign-in is needed on this tab only (round 54 answer 9, Q-A l128).
  { href: "/translate", label: "Human translation", match: (p: string) => p.startsWith("/translate") },
];

export default function Nav() {
  const path = usePathname() ?? "/";
  return (
    <header className="border-b border-line bg-white/70 px-6 flex items-end gap-8">
      <div className="py-3 font-semibold tracking-tight">{path.startsWith("/translate") ? "human-translation-view" : "agent-translation-monitor"}</div>
      <nav className="flex gap-1" aria-label="Main tabs">
        {TABS.map((t) => {
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
    </header>
  );
}
