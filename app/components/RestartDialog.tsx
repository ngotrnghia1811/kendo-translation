"use client";
import { useEffect, useId, useRef, useState } from "react";
import { BOXES, mapProblem, type BoxOptions, type QuickRow, type RestartOptions } from "@/lib/restart-rules";
import BookSettingsValues from "./BookSettingsValues"; // unit VW122

/*
 * Restart dialog of the Monitor dashboard `/` (unit VW77b2, round 82). VISION-viewer 15.31.2 (the screen), 15.32.2 (notes and facts), 15.32.3 (quick select),
 * 15.27.2 (dialog rules). Round 74 answer 12: every process button opens a confirm dialog, Cancel first.
 *   - The component reads GET /api/monitor/books/<slug>/restart-options when it opens. The data is fresh at every open.
 *   - Quick select is one choice list. "Starting versions" is the default (round 80 answer 17). A choice sets the 16 pick lists.
 *   - Each of the 16 boxes has a pick list of the saved versions of the phase. You can change one box after a quick select ("changed by hand").
 *   - Cancel is the first button and has the focus when the dialog opens. Esc counts as Cancel and writes nothing. Only [Restart] calls onRestart.
 *   - The parent renders the component only while the dialog is open.
 */

interface Loaded extends RestartOptions {
  ok: true;
  title: string;
  running: boolean;
  stateLabel: string;
  archiveFolder: string | null;
}

export default function RestartDialog({ slug, name, busy, onCancel, onRestart }: { slug: string; name: string; busy: boolean; onCancel: () => void; onRestart: (prompts: Record<string, string>) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quickId, setQuickId] = useState<string>("start");
  const [picks, setPicks] = useState<Record<string, string>>({});

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(`/api/monitor/books/${encodeURIComponent(slug)}/restart-options`, { cache: "no-store" })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as Partial<Loaded> & { error?: string };
        if (!alive) return;
        if (!r.ok || !j.ok) {
          setError(j.error ?? `The server answered ${r.status}.`);
          return;
        }
        const d = j as Loaded;
        setData(d);
        const first = d.quick.find((q) => q.id === "start") ?? d.quick[0];
        if (first) {
          setQuickId(first.id);
          setPicks(first.prompts);
        } else {
          // No quick select row works: start with the newest version of each box, so that a hand pick is still possible.
          setQuickId("");
          setPicks(Object.fromEntries(d.boxes.filter((b) => b.versions.length > 0).map((b) => [b.box, b.versions[b.versions.length - 1].label])));
        }
      })
      .catch(() => alive && setError("The Viewer server does not answer. Nothing was written."));
    return () => {
      alive = false;
    };
  }, [slug]);

  const quick: QuickRow | undefined = data?.quick.find((q) => q.id === quickId);
  const problem = data ? (BOXES.some((b) => !picks[b]) ? "Pick a version for every box." : mapProblem(data, picks)) : null;
  const ready = data !== null && problem === null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data-confirm-dialog
      data-restart-dialog
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto max-h-[92vh] w-[min(68rem,calc(100vw-2rem))] overflow-y-auto rounded border border-line bg-white p-4 text-foreground shadow-lg backdrop:bg-black/40"
    >
      <h2 id={titleId} className="text-base font-semibold">
        Restart {name}?
      </h2>
      <div id={bodyId} className="mt-2 space-y-1 text-sm">
        <p>The current run moves to archive/{data?.archiveFolder ?? "<run ID folder>"}/.</p>
        <p>The book runs again from p001 in phase {data?.phase ?? "…"}.</p>
        <p>
          {data?.running
            ? "The process finishes the current page and its update point, then it ends. An opencode agent starts the book again."
            : "The button writes a mark. An opencode agent runs the restart."}
        </p>
      </div>
      {/* Unit VW122 (Q-A 3:112.3 row 9): the values that the run will use, each with "this book" or "global". */}
      <BookSettingsValues slug={slug} />

      {error ? (
        <p role="alert" data-restart-error className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : !data ? (
        <p role="status" className="mt-3 text-sm text-muted">
          Reading the saved versions…
        </p>
      ) : (
        <>
          <fieldset className="mt-3" data-restart-quick>
            <legend className="text-sm font-semibold">Quick select</legend>
            <div className="mt-1 max-h-40 overflow-y-auto pr-2">
              {data.quick.map((q) => (
                <label key={q.id} className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
                  <input
                    type="radio"
                    name={`${titleId}-quick`}
                    value={q.id}
                    checked={quickId === q.id}
                    data-quick={q.id}
                    onChange={() => {
                      setQuickId(q.id);
                      setPicks(q.prompts);
                    }}
                  />
                  <span>
                    {q.text}
                    {q.id === "start" ? " (default)" : ""}
                  </span>
                </label>
              ))}
            </div>
            {data.problems.length > 0 ? (
              <ul data-restart-problems className="mt-1 list-disc pl-5 text-xs text-muted">
                {data.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : null}
          </fieldset>

          <div className="mt-3">
            <p className="text-sm font-semibold">Version for each box (you can change one box after a quick select)</p>
            <table className="mt-1 w-full border-collapse text-left text-sm" data-restart-boxes>
              <thead>
                <tr className="text-xs text-muted">
                  <th scope="col" className="py-1 pr-2 font-medium">Box</th>
                  <th scope="col" className="py-1 pr-2 font-medium">Version</th>
                  <th scope="col" className="py-1 pr-2 font-medium">Notes</th>
                  <th scope="col" className="py-1 pr-2 font-medium">Pages live</th>
                  <th scope="col" className="py-1 pr-2 font-medium">PASS / FAIL</th>
                  <th scope="col" className="py-1 font-medium">Critiques used</th>
                </tr>
              </thead>
              <tbody>
                {data.boxes.map((b: BoxOptions) => {
                  const v = b.versions.find((x) => x.label === picks[b.box]);
                  const byHand = quick !== undefined && picks[b.box] !== quick.prompts[b.box];
                  return (
                    <tr key={b.box} data-box-row={b.box} className="border-t border-line align-top">
                      <th scope="row" className="py-1 pr-2 font-mono text-xs font-medium">{b.box}</th>
                      <td className="py-1 pr-2">
                        <select
                          aria-label={`Version for ${b.box}`}
                          data-box-select={b.box}
                          value={picks[b.box] ?? ""}
                          onChange={(e) => setPicks({ ...picks, [b.box]: e.target.value })}
                          className="rounded border border-line bg-white px-1 py-0.5 text-sm"
                        >
                          {b.versions.length === 0 ? <option value="">no saved version</option> : null}
                          {b.versions.map((x) => (
                            <option key={x.label} value={x.label}>
                              {x.optionText}
                            </option>
                          ))}
                        </select>
                        {byHand ? (
                          <span data-by-hand className="ml-2 text-xs text-muted">
                            changed by hand
                          </span>
                        ) : null}
                      </td>
                      <td className="py-1 pr-2" data-cell="notes">{v?.noteText || "–"}</td>
                      <td className="py-1 pr-2 tabular-nums" data-cell="pages">{v?.pagesLive ?? "–"}</td>
                      <td className="py-1 pr-2 tabular-nums" data-cell="passfail">{v?.passFail ?? "–"}</td>
                      <td className="py-1 tabular-nums" data-cell="critiques">{v?.critiquesUsed ?? "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {problem ? (
            <p role="alert" data-restart-pick-problem className="mt-2 text-sm text-red-700">
              {problem}
            </p>
          ) : null}
        </>
      )}

      <div className="sticky bottom-0 mt-4 flex justify-end gap-2 bg-white pt-2">
        <button ref={cancelRef} type="button" onClick={onCancel} data-confirm-cancel className="rounded border border-line px-4 py-1.5 text-sm">
          Cancel
        </button>
        <button type="button" onClick={() => ready && onRestart(picks)} disabled={busy || !ready} data-confirm-action className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          Restart
        </button>
      </div>
    </dialog>
  );
}
