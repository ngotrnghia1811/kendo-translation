"use client";
import { useEffect } from "react";
import { THEME_EVENT } from "./ThemeSwitch";
import type { ThemeName } from "@/lib/htv-settings";

/*
 * Default theme of the reader pages (unit RC1, round 63 answer 7: "Solarized light will be default.").
 * The root layout writes the theme of the cookie into <html>. When the browser sent no theme cookie, the layout of the reader pages
 * passes explicit false, and this component applies the default of the reader pages (DEFAULT_THEME_READER in lib/htv-settings.ts).
 * A person with a stored theme (cookie or account) keeps it. The component draws nothing, but it leaves a marker for the tests.
 */
export default function ReaderThemeDefault({ theme, explicit }: { theme: ThemeName; explicit: boolean }) {
  useEffect(() => {
    if (explicit) return;
    document.documentElement.setAttribute("data-theme", theme);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
  }, [theme, explicit]);
  return <span hidden data-reader-default-theme={theme} data-theme-explicit={explicit ? "yes" : "no"} />;
}
