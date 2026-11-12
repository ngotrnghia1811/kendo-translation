"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RunPageRow } from "@/lib/types";
import { openKey, PILOT_SOURCE } from "@/lib/reader-opens-rule";
import ConfirmDialog from "./ConfirmDialog";
import { RawId } from "./Named"; // Unit VW96 (Q-A 3:17.4): a plain book name and a plain list name; the raw key stays in small grey text.
import { bookKeyLabel } from "@/lib/readable-names";
import { listLabel } from "@/lib/phase2-articles";

/*
 * Run view of the Monitor dashboard (/runs/<stamp>): one row for each book of the run, with the button "Open to readers" or "Close to readers".
 * Round 75 answer 3 (qa-memory-2026-10-31.md:53): "Admin opens any run". The button shows for every run, also for an unfinished run and a pilot run.
 * Round 74 answer 12 (qa-memory-2026-10-31.md:38): both buttons ask first, in a confirm dialog.
 * Unit default RT74: a run folder holds one page. The opening is stored for each page run (book + run folder name), because the run folder name differs from page to page
 * (left_foot_full p046 has 20261029T051154Z-r41, p047 has 20261029T054303Z-r41). The button of a book opens or closes every page run of this run in that book.
 * Unit VW77e (Q-A 3:11.3 V3): the file also exports the shared parts (readOpensFrom, changeOpens, OpenGateLine, OpenButton, OpenConfirm).
 * The table "Runs" of the Details view uses them (components/BookRunsTable.tsx). A book run has one open record, with the source "book-store" (round 78 answer 8).
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

export type OpenLoad = "loading" | "ready" | "signin" | "forbidden" | "error";
type Load = OpenLoad;
export type OpensRead = { kind: "ready"; opens: Set<string> } | { kind: "signin" | "forbidden" | "error" };

/**
 * Unit VW77e (Q-A 3:11.3 V3): the table "Runs" of the Details view (components/BookRunsTable.tsx) reuses the parts below:
 * the read of the opens, the PUT and DELETE call, the sign-in line, the button, and the confirm dialog.
 * The run view of a pilot list uses the same parts as before, with the same words and the same elements.
 */

/** Read the opens from a URL of GET /api/admin/opens. The answer holds {opens: [{source, book, runId}]}. */
export async function readOpensFrom(url: string): Promise<OpensRead> {
  const r = await fetch(url, { cache: "no-store" });
  if (r.status === 401) return { kind: "signin" };
  if (r.status === 403) return { kind: "forbidden" };
  if (!r.ok) return { kind: "error" };
  const j = (await r.json()) as { opens: { source: string; book: string; runId: string }[] };
  return { kind: "ready", opens: new Set(j.opens.map((o) => openKey(o.source, o.book, o.runId))) };
}

/** Read the opens of some run IDs (GET /api/admin/opens). Null when there is nothing to read. */
async function readOpens(idsKey: string): Promise<OpensRead | null> {
  if (!idsKey) return null;
  return readOpensFrom(`/api/admin/opens?run_ids=${encodeURIComponent(idsKey)}`);
}

/** Open (PUT) or close (DELETE) runs of one book. Returns "" when the server saved the change, else the plain message of the server. */
export async function changeOpens(source: string, book: string, runIds: string[], open: boolean): Promise<string> {
  const r = await fetch("/api/admin/opens", {
    method: open ? "PUT" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, book, run_ids: runIds }),
  });
  const j = (await r.json()) as { error?: string };
  return r.ok ? "" : (j.error ?? "The change was not saved.");
}

/** The line that replaces the table for a person who is not signed in as admin, and the line for a failed read. */
export function OpenGateLine({ load, next }: { load: "signin" | "forbidden" | "error"; next: string }) {
  if (load === "signin") {
    return (
      <p className="text-sm">
        <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="text-accent underline-offset-2 hover:underline">
          Sign in as admin
        </Link>{" "}
        to open or close this run to readers.
      </p>
    );
  }
  if (load === "forbidden") return <p className="text-sm text-muted">Only an admin can open or close a run to readers.</p>;
  return (
    <p role="alert" className="text-sm text-red-700">
      The opened runs did not load.
    </p>
  );
}

/** The button of a row. `isOpen` true gives "Close to readers". */
export function OpenButton({ isOpen, disabled, onAsk }: { isOpen: boolean; disabled: boolean; onAsk: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onAsk} className="rounded border border-line px-3 py-1 disabled:opacity-50" data-reader-open-button={isOpen ? "close" : "open"}>
      {isOpen ? "Close to readers" : "Open to readers"}
    </button>
  );
}

/** The confirm dialog of the button. Cancel comes first (ConfirmDialog). `openBody` is the sentence for Open. */
export function OpenConfirm({ title, openBody, open, busy, onCancel, onConfirm }: { title: string; openBody: string; open: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <ConfirmDialog
      title={title}
      body={open ? openBody : `Readers do not see the Agent text of this run after the next S2 run. You can open the run again.`}
      actionLabel={open ? "Open to readers" : "Close to readers"}
      busy={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
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
      const err = await changeOpens(PILOT_SOURCE, g.book, g.runIds, open);
      if (err) setMsg(err);
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
      {load === "signin" || load === "forbidden" || load === "error" ? (
        <OpenGateLine load={load} next={`/runs/${stamp}`} />
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
                    <td className="px-3 py-2">
                      <span title={`Book key: ${g.book}`}>{bookKeyLabel(g.book)}</span> {bookKeyLabel(g.book) !== g.book ? <RawId>{g.book}</RawId> : null}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {g.runIds.length} {g.runIds.length === 1 ? "page" : "pages"}
                    </td>
                    <td className="px-3 py-2" data-reader-open-state>
                      {state}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <OpenButton isOpen={all} disabled={busy || load !== "ready"} onAsk={() => setAsk({ g, open: !all })} />
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
        <OpenConfirm
          title={ask.open ? `Open the run of ${bookKeyLabel(ask.g.book)} (${listLabel(stamp)}) to readers?` : `Close the run of ${bookKeyLabel(ask.g.book)} (${listLabel(stamp)}) to readers?`}
          openBody={`Readers see the Agent text of ${ask.g.passPages} of ${ask.g.runIds.length} pages after the next S2 run. The number counts the pages whose run has the verdict PASS. You can close the run again.`}
          open={ask.open}
          busy={busy}
          onCancel={() => setAsk(null)}
          onConfirm={() => void change(ask.g, ask.open)}
        />
      ) : null}
    </section>
  );
}
