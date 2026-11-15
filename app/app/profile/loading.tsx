// Unit VW105, same as app/read/loading.tsx (Next guide 01-getting-started/04-linking-and-navigating.md, "Dynamic routes without loading.tsx").
export default function Loading() {
  return (
    <p role="status" className="text-sm text-muted" data-route-loading>
      Loading…
    </p>
  );
}
