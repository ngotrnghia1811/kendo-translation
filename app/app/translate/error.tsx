"use client";
import { useEffect } from "react";

// Unit UXC2 (round 61 answer 7, finding 2 of the Next guide review). Guide 01-getting-started/10-error-handling.md, section "Nested error boundaries",
// and 03-api-reference/03-file-conventions/error.md: an error boundary is a Client Component. This Next version gives it the props error and retry.
// The text for the user is plain. A server error arrives with a generic message and a digest, so the screen shows no message of the error.
export default function TranslateError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="rounded border border-line bg-white/70 p-4" data-route-error>
      <h2 className="text-lg font-semibold">Something went wrong on this screen.</h2>
      <p className="mt-1 text-sm text-muted">Your saved text is safe. Try again. If the problem stays, reload the page.</p>
      <button type="button" onClick={() => retry()} className="mt-3 rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white">
        Try again
      </button>
    </div>
  );
}
