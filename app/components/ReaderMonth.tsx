"use client";
import { useState, type ReactNode } from "react";
import { RowList } from "./ReaderRows";
import type { Node } from "@/lib/reader-folds";
import type { DashTarget } from "@/lib/translate-dash";

/*
 * One month fold of the Reader dashboard that loads its rows when it opens (unit RC4, round 70).
 * The full dashboard HTML had 2.08 MB with 1,155 article rows and 311 web article rows, so the page sends the month folds closed with no rows.
 * The first open asks GET /api/read/month?id=... and shows the rows. Without script, the link "Show this month" opens /read?open=<id>, which draws the rows on the server.
 * The summary comes from the server (counts and progress), so a closed month shows the same line as before.
 *
 * Unit VW77e (Q-A 3:10.4 F1 and F2): kind "toc" is the same fold for the table of contents of a book. It asks GET /api/read/toc?id=toc-<slug>,
 * and `head` (the row of the book) shows above the rows. Without script, the link "Show the table of contents" opens /read?open=toc-<slug>.
 */
export default function ReaderMonth({ id, level, summary, initial, approved, kind = "month", head, to = "read" }: { id: string; level: number; summary: ReactNode; initial: Node[] | null; approved: boolean; kind?: "month" | "toc"; head?: ReactNode; to?: DashTarget }) {
  const [nodes, setNodes] = useState<Node[] | null>(initial);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const toc = kind === "toc";

  async function load() {
    if (nodes || state === "loading") return;
    setState("loading");
    try {
      // Unit VW112: the human translation view /translate asks its own route, which adds the staff facts of each row.
      const r = await fetch(`/api/${to}/${toc ? "toc" : "month"}?id=${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { children: Node[] };
      setNodes(j.children);
      setState("idle");
    } catch {
      setState("failed");
    }
  }

  return (
    <details open={initial !== null} data-fold={id} data-fold-level={level} data-lazy-fold className="rounded border border-line bg-white/60" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && void load()}>
      <summary className="flex min-h-[44px] cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-0 px-3 py-2 md:min-h-0">{summary}</summary>
      <div className="px-3 pb-3" data-fold-body>
        {head}
        {nodes ? (
          <RowList nodes={nodes} approved={approved} to={to} />
        ) : state === "failed" ? (
          <p role="alert" className="text-sm text-red-700">
            {toc ? "The table of contents did not load. Close the fold and open it again." : "The month did not load. Close the fold and open it again."}
          </p>
        ) : state === "loading" ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <a href={`/${to}?open=${encodeURIComponent(id)}#${id}`} className="text-sm text-accent underline" {...(toc ? { "data-show-toc": true } : { "data-show-month": true })}>
            {toc ? "Show the table of contents" : "Show this month"}
          </a>
        )}
      </div>
    </details>
  );
}
