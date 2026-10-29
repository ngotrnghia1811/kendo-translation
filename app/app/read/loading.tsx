// Unit RC1 (round 63). Guide 01-getting-started/04-linking-and-navigating.md, section "Dynamic routes without loading.tsx": every page under /read is dynamic.
// "Dynamic routes without loading.tsx": a dynamic route needs a loading.tsx, so that a click shows an answer at once.
// One file covers the book list and the book screen.
export default function Loading() {
  return (
    <p role="status" className="text-sm text-muted" data-route-loading>
      Loading…
    </p>
  );
}
