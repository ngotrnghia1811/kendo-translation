"use client";
import { useEffect, useState } from "react";
import { THEME_LABELS, THEME_NAMES, type ThemeName } from "@/lib/htv-settings";

// Switch of the five themes (unit UXC step C, round 58 answer 6. Unit RC1, round 63 answer 7). It sits at the right of the top bar.
// A click sets data-theme on <html> at once and calls PUT /api/theme (cookie, and the account when the user is signed in).
export const THEME_EVENT = "htv-theme";

// Round 63 answer 7 (Q-A 2026-10-28 l311): Sepia and two Solarized themes join Light and High-contrast dark.
const OPTIONS: { value: ThemeName; label: string }[] = THEME_NAMES.map((value) => ({ value, label: THEME_LABELS[value] }));

export default function ThemeSwitch({ theme: initial }: { theme: ThemeName }) {
  const [theme, setTheme] = useState<ThemeName>(initial);
  // Another part of the page changed the theme (the reader settings, or the default of the reader pages). Follow it.
  useEffect(() => {
    const on = (e: Event) => setTheme((e as CustomEvent<ThemeName>).detail);
    window.addEventListener(THEME_EVENT, on);
    return () => window.removeEventListener(THEME_EVENT, on);
  }, []);
  async function pick(t: ThemeName) {
    if (t === theme) return;
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: t }));
    await fetch("/api/theme", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: t }) });
  }
  // Unit VW116 (Q-A 3:95.4 row b): at 1280 px the Monitor bar (six tabs) squeezed this switch, so the five buttons wrapped onto 2 lines.
  // [unit default VW116] From 1280 px up (Tailwind xl) the switch keeps one line and its own width (xl:flex-nowrap xl:shrink-0). The name of the site and the
  // tab labels, which already wrap, take the narrower room. Below 1280 px the switch wraps as before, so the bar does not scroll sideways on a small laptop.
  // The five names, the pressed mark (aria-pressed) and the keyboard use of the buttons stay as they were.
  return (
    <div role="group" aria-label="Color theme" className="mb-2 ml-auto flex flex-wrap overflow-hidden rounded border border-line bg-white text-sm xl:shrink-0 xl:flex-nowrap" data-theme-switch>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={theme === o.value}
          onClick={() => void pick(o.value)}
          className={"px-2.5 py-1 " + (theme === o.value ? "bg-accent font-semibold text-white" : "text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
