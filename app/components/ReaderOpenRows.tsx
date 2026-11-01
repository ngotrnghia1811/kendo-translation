"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RunPageRow } from "@/lib/types";
import { openKey, PILOT_SOURCE } from "@/lib/reader-opens-rule";
import ConfirmDialog from "./ConfirmDialog";

/*
 * Run view of the Monitor dashboard (/runs/<stamp>): one row for each book of the run, with the button "Open to readers" or "Close to readers".
 * Round 75 answer 3 (qa-memory-2026-10-31.md:53): "Admin opens any run". The button shows for every run, also for an unfinished run and a pilot run.
 * Round 74 answer 12 (qa-memory-2026-10-31.md:38): both buttons ask first, in a confirm dialog.
 * Unit default RT74: a run folder holds one page. The opening is stored for each page run (book + run folder name), because the run folder name differs from page to page
 * (left_foot_full p046 has 20261029T051154Z-r41, p047 has 20261029T054303Z-r41). The button of a book opens or closes every page run of this run in that book.
 */

interface BookRuns {
  book: string;
  /** The run folder names of the pages of this book in this run. */
  runIds: string[];
  /** Pages whose run has the QA_3 verdict PASS. Readers see only such a run (the run mark of the admin can show another one). */
  passPages: number;
}

/** One group for each book, in the order of the page rows. A page without a run folder (waiting) has nothing to open. */
function groupByBook(pages: RunPageRow[]): BookRuns[] {
  const by = new Map<string, BookRuns>();
  for (const p of pages) {
    if (!p.runFolder) continue;
    const book = p.pageId.split("/")[0];
    const g = by.get(book) ?? { book, runIds: [], passPages: 0 };
    if (!g.runIds.includes(p.runFolder)) g.runIds.push(p.runFolder);
    if (p.qa3Verdict === "PASS") g.passPages++;
    by.set(book, g);
  }
  return [...by.values()];
}

type Load = "loading" | "ready" | "signin" | "forbidden" | "error";
type OpensRead = { kind: "ready"; opens: Set<string> } | { kind: "signin" | "forbidden" | "error" };

/** Read the opens of some run IDs (GET /api/admin/opens). Null when there is nothing to read. */
async function readOpens(idsKey: string): Promise<OpensRead | null> {
  if (!idsKey) return null;
  const r = await fetch(`/api/admin/opens?run_ids=${encodeURIComponent(idsKey)}`, { cache: "no-store" });
  if (r.status === 401) return { kind: "signin" };
  if (r.status === 403) return { kind: "forbidden" };
  if (!r.ok) return { kind: "error" };
  const j = (await r.json()) as { opens: { source: string; book: string; runId: string }[] };
  return { kind: "ready", opens: new Set(j.opens.map((o) => openKey(o.source, o.book, o.runId))) };
}

export default function ReaderOpenRows({ stamp, pages }: { stamp: string; pages: RunPageRow[] }) {
  const groups = useMemo(() => groupByBook(pages), [pages]);
  // A text key, so that a new poll of the run view with the same run folders does not read the opens again.
  const idsKey = useMemo(() => [...new Set(groups.flatMap((g) => g.runIds))].slice(0, 500).join(","), [groups]);
  const [opens, setOpens] = useState<Set<string>>(new Set());
  const [load, setLoad] = useState<Load>("loading");
  const [ask, setAsk] = useState<{ g: BookRuns; open: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const apply = useCallback((r: OpensRead) => {
    if (r.kind === "ready") setOpens(r.opens);
    setLoad(r.kind);
  }, []);

  // The effect calls setState in a callback only, after the answer of the server (react-hooks/set-state-in-effect).
  useEffect(() => {
    let alive = true;
    void readOpens(idsKey).then((r) => {
      if (alive && r) apply(r);
    });
    return () => {
      alive = false;
    };
  }, [idsKey, apply]);

  if (groups.length === 0) return null;
  const openCount = (g: BookRuns) => g.runIds.filter((id) => opens.has(openKey(PILOT_SOURCE, g.book, id))).length;

  async function change(g: BookRuns, open: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/opens", {
        method: open ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: PILOT_SOURCE, book: g.book, run_ids: g.runIds }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) setMsg(j.error ?? "The change was not saved.");
      const again = await readOpens(idsKey);
      if (again) apply(again);
    } finally {
      setBusy(false);
      setAsk(null);
    }
  }

  return (
    <section className="mb-6" data-reader-opens>
      <h2 className="mb-1 text-lg font-semibold">Readers</h2>
      <p className="mb-2 text-sm text-muted">Readers see the Agent text of an open run only. Readers see a change after the next S2 run.</p>
      {load === "signin" ? (
        <p className="text-sm">
          <Link href={`/sign-in?next=${encodeURIComponent(`/runs/${stamp}`)}`} className="text-accent underline-offset-2 hover:underline">
            Sign in as admin
          </Link>{" "}
          to open or close this run to readers.
        </p>
      ) : load === "forbidden" ? (
        <p className="text-sm text-muted">Only an admin can open or close a run to readers.</p>
      ) : load === "error" ? (
        <p role="alert" className="text-sm text-red-700">
          The opened runs did not load.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white">
          <table className="w-full text-sm">
            <tbody>
              {groups.map((g) => {
                const n = openCount(g);
                const all = n === g.runIds.length;
                const state = load !== "ready" ? "Loading" : all ? "Readers see this run" : n === 0 ? "Readers do not see this run" : `Readers see ${n} of ${g.runIds.length} page runs of this run`;
                return (
                  <tr key={g.book} className="border-t border-line first:border-t-0" data-reader-open-row={g.book}>
                    <td className="px-3 py-2 font-mono">{g.book}</td>
                    <td className="px-3 py-2 text-muted">
                      {g.runIds.length} {g.runIds.length === 1 ? "page" : "pages"}
                    </td>
                    <td className="px-3 py-2" data-reader-open-state>
                      {state}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={busy || load !== "ready"}
                        onClick={() => setAsk({ g, open: !all })}
                        className="rounded border border-line px-3 py-1 disabled:opacity-50"
                        data-reader-open-button={all ? "close" : "open"}
                      >
                        {all ? "Close to readers" : "Open to readers"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {msg ? (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {msg}
        </p>
      ) : null}
      {ask ? (
        <ConfirmDialog
          title={ask.open ? `Open run ${stamp} of ${ask.g.book} to readers?` : `Close run ${stamp} of ${ask.g.book} to readers?`}
          body={
            ask.open
              ? `Readers see the Agent text of ${ask.g.passPages} of ${ask.g.runIds.length} pages after the next S2 run. The number counts the pages whose run has the verdict PASS. You can close the run again.`
              : `Readers do not see the Agent text of this run after the next S2 run. You can open the run again.`
          }
          actionLabel={ask.open ? "Open to readers" : "Close to readers"}
          busy={busy}
          onCancel={() => setAsk(null)}
          onConfirm={() => void change(ask.g, ask.open)}
        />
      ) : null}
    </section>
  );
}
