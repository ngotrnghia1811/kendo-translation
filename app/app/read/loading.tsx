import LoadingPopup from "@/components/LoadingPopup";

// Unit RC1 (round 63). Guide 01-getting-started/04-linking-and-navigating.md, section "Dynamic routes without loading.tsx": every page under /read is dynamic.
// "Dynamic routes without loading.tsx": a dynamic route needs a loading.tsx, so that a click shows an answer at once.
// One file covers the book list and the book screen.
// Unit VW115 (Q-A 3:94.2 row 6): the old line "Loading…" is now the shared Loading pop-up (components/LoadingPopup.tsx). It keeps the attribute data-route-loading
// and the text "Loading…", and shows after 0.15 s.
export default function Loading() {
  return (
    <LoadingPopup route />
  );
}
