"use client";
import { useEffect } from "react";

// Unit VW124: the same error screen as app/read/error.tsx. The text is plain and shows no message of the error.
export default function SearchError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="rounded border border-line bg-white/70 p-4" data-route-error>
      <h2 className="text-lg font-semibold">Something went wrong on this screen.</h2>
      <p className="mt-1 text-sm text-muted">Try again. If the problem stays, reload the page.</p>
      <button type="button" onClick={() => retry()} className="mt-3 rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white">
        Try again
      </button>
    </div>
  );
}
