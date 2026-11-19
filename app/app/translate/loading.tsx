import LoadingPopup from "@/components/LoadingPopup";

// Unit UXC2 (round 61 answer 7, finding 2 of the Next guide review). Guide 01-getting-started/04-linking-and-navigating.md, section
// "Dynamic routes without loading.tsx": a dynamic route needs a loading.tsx, so that a click shows an answer at once.
// Every page under /translate is dynamic (it reads the cookie and PocketBase), so one file covers the list, the book screen, and the sign-in page.
// Unit VW115 (Q-A 3:94.2 row 6): the old line "Loading…" is now the shared Loading pop-up (components/LoadingPopup.tsx). It keeps the attribute data-route-loading
// and the text "Loading…", and shows after 0.15 s.
export default function Loading() {
  return (
    <LoadingPopup route />
  );
}
