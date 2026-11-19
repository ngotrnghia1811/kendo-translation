import LoadingPopup from "@/components/LoadingPopup";

// Unit VW105, same as app/read/loading.tsx (Next guide 01-getting-started/04-linking-and-navigating.md, "Dynamic routes without loading.tsx").
// Unit VW115 (Q-A 3:94.2 row 6): the old line "Loading…" is now the shared Loading pop-up (components/LoadingPopup.tsx). It keeps the attribute data-route-loading
// and the text "Loading…", and shows after 0.15 s.
export default function Loading() {
  return (
    <LoadingPopup route />
  );
}
