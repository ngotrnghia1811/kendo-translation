"use client";
// Unit VW123 (plan P63, card P63.1). Owner pick Q-A 3:116.4 (2026-11-22) "Also Favorites and Recent", row M4.
// The favorites and the last picks of the model picker are kept in this browser only (localStorage). Both Run settings pages share the same keys. Nothing goes to the server.
// The store reads the browser lazily: the server render and the first client render both see empty lists, so the HTML matches and the lists fill in after hydration.
import { useSyncExternalStore } from "react";
import { FAVORITES_KEY, MAX_FAVORITES, MAX_RECENT, RECENT_KEY, parseIdList, pushRecent, toggleFavorite } from "@/lib/model-picker-rules";

export type ModelPrefs = { favorites: string[]; recent: string[] };
const EMPTY: ModelPrefs = { favorites: [], recent: [] };

let cache: { fav: string | null; rec: string | null; value: ModelPrefs } = { fav: null, rec: null, value: EMPTY };
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

function read(): ModelPrefs {
  try {
    const fav = window.localStorage.getItem(FAVORITES_KEY);
    const rec = window.localStorage.getItem(RECENT_KEY);
    if (fav !== cache.fav || rec !== cache.rec) cache = { fav, rec, value: { favorites: parseIdList(fav, MAX_FAVORITES), recent: parseIdList(rec, MAX_RECENT) } };
  } catch {
    // A browser that blocks storage keeps the lists of this page view in memory (see write).
  }
  return cache.value;
}

function write(next: ModelPrefs) {
  const fav = JSON.stringify(next.favorites);
  const rec = JSON.stringify(next.recent);
  try {
    window.localStorage.setItem(FAVORITES_KEY, fav);
    window.localStorage.setItem(RECENT_KEY, rec);
  } catch {
    // Storage is blocked or full: the lists live in memory until the page closes.
  }
  cache = { fav, rec, value: next };
  notify();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === FAVORITES_KEY || e.key === RECENT_KEY) fn(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}

/** The favorites and the last picks, with the two actions of the picker: the star and the pick. */
export function useModelPrefs() {
  const prefs = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    favorites: prefs.favorites,
    recent: prefs.recent,
    toggleFavorite: (id: string) => write({ favorites: toggleFavorite(read().favorites, id), recent: read().recent }),
    pushRecent: (id: string) => write({ favorites: read().favorites, recent: pushRecent(read().recent, id) }),
  };
}
