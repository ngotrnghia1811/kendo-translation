"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { RESET_EVENT, orderKey, parseOrder, resetKeys, serializeOrder } from "@/lib/panel-order";

// Unit VW117 (Q-A 3:95.2 and 3:96.6): the order of the panels of one screen, kept in this browser (localStorage), like the sizes of unit VW115 (components/PanelResize.tsx).
// [unit default VW117] The order of /page and of /translate stays in this browser, one key for each screen and group (vw117:order:<screen>:<group>).
// Reason: the sizes of these two screens are in this browser too, and the account needs no new key. The order of /read stays in the account as before.

// useLayoutEffect on the browser, so that a stored order is in place before the first paint. On the server it is a plain effect (no warning).
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface PanelOrder {
  /** The full order now. Until the stored order is read (after the first render) it is the old order. */
  order: string[];
  /** Keep a new full order. The old order removes the key. */
  set: (next: string[]) => void;
  /** Put the old order back and remove the key. */
  reset: () => void;
}

/**
 * The order of one group of panels (or columns) of a screen. `ids` is the old order and the full set of ids.
 * A broken or blocked storage (private mode) gives the old order and no error.
 */
export function usePanelOrder(screen: string, what: string, ids: readonly string[]): PanelOrder {
  const key = orderKey(screen, what);
  const [order, setOrder] = useState<string[]>(() => [...ids]);
  // `ids` is a constant of the caller, so the key alone names the stored value.
  const idsRef = useRef(ids);
  useBrowserLayoutEffect(() => {
    let text: string | null = null;
    try {
      text = window.localStorage.getItem(key);
    } catch {
      // Storage is blocked: the old order stays.
    }
    setOrder(parseOrder(text, idsRef.current));
  }, [key]);
  useEffect(() => {
    // "Reset layout" of the screen removed the keys already. This hook only takes the old order again.
    const on = (e: Event) => {
      if ((e as CustomEvent<{ screen?: string }>).detail?.screen === screen) setOrder([...idsRef.current]);
    };
    window.addEventListener(RESET_EVENT, on);
    return () => window.removeEventListener(RESET_EVENT, on);
  }, [screen]);
  const set = useCallback(
    (next: string[]) => {
      setOrder(next);
      try {
        const text = serializeOrder(next, idsRef.current);
        if (text) window.localStorage.setItem(key, text);
        else window.localStorage.removeItem(key);
      } catch {
        // Storage is full or blocked: the order holds until the page closes.
      }
    },
    [key],
  );
  const reset = useCallback(() => set([...idsRef.current]), [set]);
  return { order, set, reset };
}

/**
 * "Reset layout" of one screen (Q-A 3:96.6 row 6): remove the saved order keys and the size keys of unit VW115 of that screen,
 * then tell every hook of the screen (usePanelOrder, useStoredSize) to take the old values again. No other key is touched.
 */
export function resetScreenLayout(screen: string): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) keys.push(k);
    }
    for (const k of resetKeys(screen, keys)) window.localStorage.removeItem(k);
  } catch {
    // Storage is blocked: nothing was saved, so nothing to remove.
  }
  window.dispatchEvent(new CustomEvent(RESET_EVENT, { detail: { screen } }));
}
