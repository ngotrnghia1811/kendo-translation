// Unit UXC2 (round 61 answer 7, finding 2 of the Next guide review). Guide 01-getting-started/04-linking-and-navigating.md, section
// "Dynamic routes without loading.tsx": a dynamic route needs a loading.tsx, so that a click shows an answer at once.
// Every page under /translate is dynamic (it reads the cookie and PocketBase), so one file covers the list, the book screen, and the sign-in page.
export default function Loading() {
  return (
    <p role="status" className="text-sm text-muted" data-route-loading>
      Loading…
    </p>
  );
}
