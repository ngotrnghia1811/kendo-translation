import { LOADING_DELAY_MS } from "@/lib/loading-rule";

// Unit VW115 (Q-A 3:93.5, accepted design row 6 in Q-A 3:94.2), owner words: "Add some transition pop-up (loading ...) to make the page some smoother".
// Accepted design: "one small box at the top center, 'Loading…' with a turning circle. It shows on every screen when a page change or a slow load takes more than
// 0.15 seconds, so fast moves show nothing. The 4 old 'Loading…' lines use it too, and the Monitor screens get it."
// The box is in the page from the start but stays invisible for the delay (CSS animation-delay, see .loading-popup in app/globals.css), so a fast move shows nothing
// and the first HTML of a slow route still holds the text "Loading…". The box never takes a click (pointer-events none). No hook here: server components use it too.

/**
 * `route` true: the fallback of a loading.tsx file. It keeps the attribute `data-route-loading` that the old tests and scripts/smoke.mjs look for.
 * `route` false: the box that components/NavigationLoading.tsx shows while a move runs. It has the attribute `data-nav-loading`.
 */
export default function LoadingPopup({ route = false }: { route?: boolean }) {
  const marker = route ? { "data-route-loading": "" } : { "data-nav-loading": "" };
  return (
    <div role="status" className="loading-popup" style={{ animationDelay: `${LOADING_DELAY_MS}ms` }} {...marker}>
      <span className="loading-spinner" aria-hidden="true" />
      <span>Loading…</span>
    </div>
  );
}
