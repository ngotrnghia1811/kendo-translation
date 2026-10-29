"use client";
import { useState } from "react";
import type { ThemeName } from "@/lib/htv-settings";

// Switch Light / High-contrast dark (unit UXC step C, round 58 answer 6). It sits at the right of the top bar.
// A click sets data-theme on <html> at once and calls PUT /api/theme (cookie, and the account when the user is signed in).
export const THEME_EVENT = "htv-theme";

const OPTIONS: { value: ThemeName; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "High-contrast dark" },
];

export default function ThemeSwitch({ theme: initial }: { theme: ThemeName }) {
  const [theme, setTheme] = useState<ThemeName>(initial);
  async function pick(t: ThemeName) {
    if (t === theme) return;
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: t }));
    await fetch("/api/theme", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: t }) });
  }
  return (
    <div role="group" aria-label="Color theme" className="mb-2 ml-auto flex overflow-hidden rounded border border-line text-sm" data-theme-switch>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={theme === o.value}
          onClick={() => void pick(o.value)}
          className={"px-3 py-1 " + (theme === o.value ? "bg-accent font-semibold text-white" : "text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
