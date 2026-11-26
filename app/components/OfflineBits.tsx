"use client";
import { useEffect, useState } from "react";
import { THEME_EVENT } from "./ThemeSwitch";
import { OFFLINE_THEME_KEY, OFFLINE_WORDS } from "@/lib/offline-copy";
import { clearOfflineCopies, savedSlugs } from "@/lib/offline-copy-client";

/*
 * Small parts of the offline copy (unit VW131, Q-A 3:134.3 rows 4 to 6).
 *   OfflineNote    the line "<what>: Not available offline." for search, bookmarks, and the dictionary (row 5)
 *   OfflineGuard   removes every copy of the device when a screen says that this browser may not keep one (row 6, sign-out, view-only link).
 *                  Else, on a device with a copy, it keeps the theme of the screen in localStorage, so that the offline copy uses it (the cookie is httpOnly).
 *   OfflineMark    the mark "Saved for offline" on a book of the Reader dashboard /read (row 4)
 */

export function OfflineNote({ what }: { what: string }) {
  return (
    <p role="status" className="mb-3 rounded border border-line bg-white px-3 py-2 text-sm" data-offline-not-available={what}>
      {OFFLINE_WORDS.notAvailableOf(what)}
    </p>
  );
}

export function OfflineGuard({ clear }: { clear: boolean }) {
  useEffect(() => {
    if (clear) {
      void clearOfflineCopies().catch(() => undefined);
      return;
    }
    const keep = (t: string | null) => {
      void savedSlugs().then((s) => {
        try {
          if (s.size > 0 && t) localStorage.setItem(OFFLINE_THEME_KEY, t);
        } catch {
          // No storage: the copy keeps the theme of the save.
        }
      });
    };
    // The layout of /read sets the default theme in its own effect, after this one. The next frame reads the theme on the screen.
    const frame = requestAnimationFrame(() => keep(document.documentElement.getAttribute("data-theme")));
    const on = (e: Event) => keep((e as CustomEvent<string>).detail);
    window.addEventListener(THEME_EVENT, on);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(THEME_EVENT, on);
    };
  }, [clear]);
  return null;
}

export function OfflineMark({ slug }: { slug: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let live = true;
    void savedSlugs().then((s) => {
      if (live) setSaved(s.has(slug));
    });
    return () => {
      live = false;
    };
  }, [slug]);
  if (!saved) return null;
  return (
    <span className="ml-2 inline-block rounded border border-line px-1.5 py-0.5 align-middle text-xs font-medium" data-offline-mark>
      {OFFLINE_WORDS.mark}
    </span>
  );
}
