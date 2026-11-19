"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import LoadingPopup from "./LoadingPopup";
import { LOADING_GIVE_UP_MS, NAVIGATE_EVENT, startsMove } from "@/lib/loading-rule";

// Unit VW115 (Q-A 3:94.2 row 6): the Loading pop-up for a page change on every screen, also on the Monitor screens that have no loading.tsx.
// A move starts at a click on a router link (the router calls preventDefault) or at the event of lib/loading-rule.ts markNavigating (a code-driven move).
// The move ends when the address changed and no loading.tsx fallback is on the screen any more. The box itself waits 0.15 s (components/LoadingPopup.tsx).
// Next.js 16 guide (linking-and-navigating): the router keeps the old page on the screen until the new one is ready, so a slow move shows nothing without this box.

function Watcher() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const where = `${pathname}?${search}`;
  const [moving, setMoving] = useState(false);
  const whereRef = useRef(where);
  useEffect(() => {
    whereRef.current = where;
  }, [where]);
  const from = useRef(where);
  const giveUp = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const start = () => {
      from.current = whereRef.current;
      setMoving(true);
      if (giveUp.current) clearTimeout(giveUp.current);
      giveUp.current = setTimeout(() => setMoving(false), LOADING_GIVE_UP_MS);
    };
    const onClick = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement)) return;
      if (startsMove(e, { href: a.href, target: a.target, download: a.hasAttribute("download") }, { origin: window.location.origin, href: window.location.href })) start();
    };
    // The window listener runs after the listener of the router link, so `defaultPrevented` is already set.
    window.addEventListener("click", onClick);
    window.addEventListener(NAVIGATE_EVENT, start);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener(NAVIGATE_EVENT, start);
      if (giveUp.current) clearTimeout(giveUp.current);
    };
  }, []);

  // The address changed: wait until the fallback of a loading.tsx file is gone (a hidden fallback has no box, so it does not count).
  useEffect(() => {
    if (!moving || where === from.current) return;
    const loading = () => Array.from(document.querySelectorAll("[data-route-loading]")).some((el) => el.getClientRects().length > 0);
    let watch: MutationObserver | null = null;
    const frame = requestAnimationFrame(() => {
      if (!loading()) {
        setMoving(false);
        return;
      }
      watch = new MutationObserver(() => {
        if (!loading()) {
          watch?.disconnect();
          setMoving(false);
        }
      });
      watch.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "hidden", "class"] });
    });
    return () => {
      cancelAnimationFrame(frame);
      watch?.disconnect();
    };
  }, [where, moving]);

  return moving ? <LoadingPopup /> : null;
}

export default function NavigationLoading() {
  // useSearchParams needs a Suspense boundary (Next.js 16 guide, use-search-params).
  return (
    <Suspense fallback={null}>
      <Watcher />
    </Suspense>
  );
}
