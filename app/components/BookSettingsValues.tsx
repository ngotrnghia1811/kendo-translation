"use client";
import { useEffect, useState } from "react";
import type { BookSettingsSnapshot } from "@/lib/book-settings";
import { parseSettingsJson } from "@/lib/settings-json";
import { SOURCE_BOOK, valueText } from "@/lib/book-settings-rules";

// Unit VW122 (plan P61, card P61.2, Q-A 3:112.3 row 9): the Run, Resume and Restart dialogs list the values that the run will use, each with "this book" or "global".
// The list reads GET /api/monitor/books/<slug>/settings when the dialog opens, so the values are fresh at every open. It reads and writes nothing else.
// A button of the dialog still only writes a mark (owner words 2026-10-29: "the [Run] and [Resume] button should only `mark` the book for run start/continue").

export default function BookSettingsValues({ slug }: { slug: string }) {
  const [snap, setSnap] = useState<BookSettingsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/monitor/books/${encodeURIComponent(slug)}/settings`, { cache: "no-store" })
      .then(async (r) => {
        const j = parseSettingsJson(await r.text()) as BookSettingsSnapshot & { error?: string };
        if (!alive) return;
        if (!r.ok) setError(j.error ?? `The server answered ${r.status}.`);
        else setSnap(j);
      })
      .catch(() => alive && setError("The Viewer server does not answer, so the values are unknown."));
    return () => {
      alive = false;
    };
  }, [slug]);

  return <ValuesView snap={snap} error={error} />;
}

/** The list itself, without the fetch, so that a test can render it from a reading (unit VW122). */
export function ValuesView({ snap, error }: { snap: BookSettingsSnapshot | null; error: string | null }) {
  return (
    <div data-book-settings-values className="mt-3 text-sm">
      <p className="font-semibold">Values that this run will use</p>
      {error ? (
        <p role="alert" data-book-settings-values-error className="mt-1 text-red-700">
          {error}
        </p>
      ) : !snap ? (
        <p role="status" className="mt-1 text-muted">
          Reading the run settings…
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            The run reads the values again at each page. “{SOURCE_BOOK}” means that the book file of this book holds the value. “global” means that the global Run settings give it.
          </p>
          {snap.error ? (
            <p role="alert" data-book-settings-values-error className="mt-1 break-words text-red-700">
              {snap.error} A run does not start until the book file is correct.
            </p>
          ) : null}
          {snap.global_error ? (
            <p role="alert" data-book-settings-values-error className="mt-1 break-words text-red-700">
              The global settings file has an error: {snap.global_error}
            </p>
          ) : null}
          {snap.effective.length > 0 && !snap.error ? (
            <table className="mt-2 w-full border-collapse text-left text-xs" data-book-settings-table>
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="py-1 pr-2 font-medium">Setting</th>
                  <th scope="col" className="py-1 pr-2 font-medium">Value</th>
                  <th scope="col" className="py-1 font-medium">From</th>
                </tr>
              </thead>
              <tbody>
                {snap.effective.map((r) => (
                  <tr key={r.key} data-value-row={r.key} data-source={r.source} className="border-t border-line align-top">
                    <th scope="row" className="py-1 pr-2 font-normal" title={r.key}>{r.label}</th>
                    <td className="break-words py-1 pr-2 tabular-nums">{r.key === "update.N" && r.value == null ? "phase rule (no saved N)" : valueText(r.key, r.value)}</td>
                    <td className={"py-1 " + (r.source === SOURCE_BOOK ? "font-semibold text-amber-800" : "text-muted")}>{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      )}
    </div>
  );
}
