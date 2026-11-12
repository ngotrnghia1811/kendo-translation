"use client";
import { useEffect, useState } from "react";
import type { ChainRow } from "@/lib/types";
import type { CompareView, CompareVariantTotals, MemoryPage } from "@/lib/chain";
import { TokenCells, TokenHeads } from "./Tokens";
import { pstFromUtcText } from "@/lib/pst-more";
import { StatePill } from "./Pills";
import Link from "next/link";
import { jsonViewHref } from "@/lib/json-view";

// Round 48 answer 9 (Q-A 2026-10-27 l55): "the Viewer shows the chain state per book, skipped pages, the book translation memory pairs,
// the critic mode and the session turn, the compare table". These panels sit on the run view of a chain list. They only read files.
// [agent inference] The panels sit under the run header and above the page table. The owner has not placed them yet.
// Unit VW77b1 (round 81 answer 17, Q-A 2026-11-02 l22): the time of a compare file ("made 2026-10-27 23:50 PST") shows in PST.

const th = "px-3 py-2 text-left text-xs uppercase tracking-wide text-muted";
const td = "px-3 py-2 align-top";

/** Chain state text: "running", "completed", "interrupted", or "stopped: ..." (translator_run.py l1940 to l1960). */
function ChainState({ state }: { state: string }) {
  if (state.startsWith("stopped")) {
    return <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">{state}</span>;
  }
  return <StatePill state={state} />;
}

/** One row per book: pages, state, accepted pages, memory pairs, critic failures. */
export function ChainTable({ chains }: { chains: ChainRow[] }) {
  if (chains.length === 0) return <p className="text-sm text-muted">The chains table of this list is empty.</p>;
  return (
    <div className="overflow-x-auto rounded border border-line bg-white">
      <table className="w-full text-sm">
        <thead className="bg-stone-50">
          <tr>
            <th className={th}>Book</th>
            <th className={th + " text-right"}>Pages</th>
            <th className={th}>State</th>
            <th className={th + " text-right"}>Accepted pages</th>
            <th className={th + " text-right"}>Memory pairs</th>
            <th className={th + " text-right"}>Critic failures</th>
          </tr>
        </thead>
        <tbody>
          {chains.map((c) => (
            <tr key={c.book} className="border-t border-line">
              <td className={td + " font-mono text-xs"}>{c.book}</td>
              <td className={td + " text-right tabular-nums"}>{c.pages.length}</td>
              <td className={td}>
                <ChainState state={c.state} />
              </td>
              <td className={td + " text-right tabular-nums"}>
                {c.accepted.length} / {c.pages.length}
              </td>
              <td className={td + " text-right tabular-nums"}>{c.memoryPairs ?? "–"}</td>
              <td className={td + " text-right tabular-nums " + (c.criticFailures ? "font-semibold text-red-700" : "")}>{c.criticFailures ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface MemoryData {
  book: string;
  file: string | null;
  found: boolean;
  pairCount: number;
  pages: MemoryPage[];
}

/** The book translation memory of each book. The pairs load when the owner opens a book (/api/runs/<stamp>/memory?book=). */
export function MemoryPanel({ stamp, chains }: { stamp: string; chains: ChainRow[] }) {
  if (chains.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">Book translation memory</h2>
      <p className="mb-2 text-xs text-muted">Only a QA_3 PASS adds a page. Open a book to read its pairs.</p>
      <div className="space-y-2">
        {chains.map((c) => (
          <MemoryBook key={c.book} stamp={stamp} chain={c} />
        ))}
      </div>
    </section>
  );
}

function MemoryBook({ stamp, chain }: { stamp: string; chain: ChainRow }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="rounded border border-line bg-white" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer px-3 py-2 text-sm">
        <span className="font-mono text-xs font-semibold">{chain.book}</span>
        <span className="ml-3 text-xs text-muted">
          {chain.memoryPairs ?? "?"} pairs from {chain.accepted.length} accepted {chain.accepted.length === 1 ? "page" : "pages"}
        </span>
      </summary>
      {open ? <MemoryBody stamp={stamp} book={chain.book} /> : null}
    </details>
  );
}

function MemoryBody({ stamp, book }: { stamp: string; book: string }) {
  const [res, setRes] = useState<{ data: MemoryData | null; error: string | null } | null>(null);
  useEffect(() => {
    let cancel = false;
    fetch(`/api/runs/${encodeURIComponent(stamp)}/memory?book=${encodeURIComponent(book)}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (!cancel) setRes({ data: ok ? (body as MemoryData) : null, error: ok ? null : String(body?.error ?? "Error") });
      })
      .catch((e) => {
        if (!cancel) setRes({ data: null, error: String(e) });
      });
    return () => {
      cancel = true;
    };
  }, [stamp, book]);
  if (!res) return <p className="border-t border-line px-3 py-2 text-sm text-muted">Loading…</p>;
  if (res.error) return <p className="border-t border-line px-3 py-2 text-sm text-red-700">{res.error}</p>;
  return <MemoryView d={res.data as MemoryData} />;
}

export function MemoryView({ d }: { d: MemoryData }) {
  if (!d.found) return <p className="border-t border-line px-3 py-2 text-sm text-muted">No memory file yet. A book gets one after its first accepted page.</p>;
  return (
    <div className="space-y-4 border-t border-line p-3">
      {/* Unit VW89 (round 90), Q-A 3:1.7 item 3: the memory file opens in the JSON viewer. */}
      <p className="font-mono text-xs text-muted">
        {d.file ? (
          <Link href={jsonViewHref(d.file)} data-memory-file-link className="underline underline-offset-2 hover:text-foreground">
            {d.file}
          </Link>
        ) : null}
      </p>
      {d.pages.map((pg) => (
        <div key={pg.pageId}>
          <h3 className="mb-1 text-sm font-semibold">
            <span className="font-mono">{pg.pageId}</span> <span className="font-normal text-muted">({pg.pairs.length} pairs)</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className={th}>Pair</th>
                  <th className={th}>Part</th>
                  <th className={th}>JA</th>
                  <th className={th}>EN</th>
                  <th className={th}>Run ID</th>
                  <th className={th}>Written at</th>
                </tr>
              </thead>
              <tbody>
                {pg.pairs.map((p, k) => (
                  <tr key={k} className="border-t border-line">
                    <td className={td + " font-mono"}>{p.pairId}</td>
                    <td className={td}>{p.part || "–"}</td>
                    <td className={td + " font-ja min-w-60"}>{p.ja}</td>
                    <td className={td + " min-w-60"}>{p.en}</td>
                    <td className={td + " font-mono break-all"}>{p.runId}</td>
                    <td className={td + " whitespace-nowrap"}>{p.writtenAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The compare table of critic_compare.py. Shows nothing for a list without a compare, except a short note on a chain list. */
export function ComparePanel({ stamp, isChain }: { stamp: string; isChain: boolean }) {
  const [res, setRes] = useState<{ data: CompareView[] | null; error: string | null } | null>(null);
  useEffect(() => {
    let cancel = false;
    fetch(`/api/runs/${encodeURIComponent(stamp)}/compare`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (!cancel) setRes({ data: ok ? (body as CompareView[]) : null, error: ok ? null : String(body?.error ?? "Error") });
      })
      .catch((e) => {
        if (!cancel) setRes({ data: null, error: String(e) });
      });
    return () => {
      cancel = true;
    };
  }, [stamp]);
  if (!res) return null;
  if (res.error) return <p className="text-sm text-red-700">{res.error}</p>;
  const list = res.data ?? [];
  if (list.length === 0) {
    return isChain ? (
      <section>
        <h2 className="mb-1 text-lg font-semibold">Compare of critic modes</h2>
        <p className="text-sm text-muted">No compare.json in critic-compare/ names this list. The script critic_compare.py writes one.</p>
      </section>
    ) : null;
  }
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Compare of critic modes</h2>
      {list.map((c) => (
        <div key={c.folder} className="rounded border border-line bg-white p-3">
          <p className="mb-2 text-xs text-muted">
            {/* Unit VW89 (round 90), Q-A 3:1.7 item 3: the compare folder opens in the JSON viewer (folder list). */}
            <Link href={jsonViewHref(`critic-compare/${c.folder}`)} data-compare-link className="font-mono underline underline-offset-2 hover:text-foreground">
              critic-compare/{c.folder}
            </Link>
            , made {c.generatedUtc ? pstFromUtcText(c.generatedUtc) : "at an unknown time"}, {c.pageCount} pages, {c.commonPageCount} pages in every variant.
          </p>
          <TotalsTable title="All pages" rows={c.all} />
          {c.common.length > 0 && c.all.length > 1 ? <TotalsTable title="Pages that every variant covers" rows={c.common} /> : null}
          {c.rule ? <p className="mt-2 text-xs text-muted">{c.rule}</p> : null}
        </div>
      ))}
    </section>
  );
}

const n0 = (v: number | null) => (v === null ? "–" : String(v));

export function TotalsTable({ title, rows }: { title: string; rows: CompareVariantTotals[] }) {
  return (
    <div className="mb-3 overflow-x-auto">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className={th}>Variant</th>
            <th className={th + " text-right"}>Pages</th>
            <th className={th + " text-right"}>Critiques</th>
            <th className={th + " text-right"}>TS</th>
            <th className={th + " text-right"}>TL</th>
            <th className={th + " text-right"}>ED</th>
            <th className={th + " text-right"}>QA</th>
            <th className={th + " text-right"}>Cite issues</th>
            <th className={th + " text-right"}>Cite another QA level</th>
            <th className={th + " text-right"}>Calls</th>
            <th className={th + " text-right"}>Failed calls</th>
            {/* Unit VW93 (Q-A 3:15.2): the 5 token kinds of the totals row in place of the cost (the compare table sits in the run view, a detail place). */}
            <TokenHeads className={th + " text-right whitespace-nowrap"} />
            <th className={th + " text-right"}>Seconds</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.variant} className="border-t border-line">
              <td className={td + " font-mono"}>{r.variant}</td>
              <td className={td + " text-right tabular-nums"}>{n0(r.pages)}</td>
              <td className={td + " text-right tabular-nums font-semibold"}>{n0(r.critiques)}</td>
              <td className={td + " text-right tabular-nums"}>{n0(r.byBoxType.TS)}</td>
              <td className={td + " text-right tabular-nums"}>{n0(r.byBoxType.TL)}</td>
              <td className={td + " text-right tabular-nums"}>{n0(r.byBoxType.ED)}</td>
              <td className={td + " text-right tabular-nums"}>{n0(r.byBoxType.QA)}</td>
              <td className={td + " text-right tabular-nums"}>{n0(r.citingIssues)}</td>
              <td className={td + " text-right tabular-nums"}>{n0(r.citingOtherQa)}</td>
              <td className={td + " text-right tabular-nums"}>{n0(r.calls)}</td>
              <td className={td + " text-right tabular-nums " + (r.failedCalls ? "font-semibold text-red-700" : "")}>{n0(r.failedCalls)}</td>
              <TokenCells tokens={r.tokens ?? null} className={td + " text-right tabular-nums"} />
              <td className={td + " text-right tabular-nums"}>{r.seconds === null ? "–" : r.seconds.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Failure lists of one page row, forward and critic apart. Shown only when the list summary holds the keys (unit T4). */
export function FailureLists({ forward, critic }: { forward: string[] | null; critic: string[] | null }) {
  if (forward === null && critic === null) return null;
  if ((forward ?? []).length === 0 && (critic ?? []).length === 0) return null;
  return (
    <div className="mt-1 space-y-1 text-xs">
      {forward && forward.length > 0 ? (
        <details>
          <summary className="cursor-pointer font-semibold text-red-700">{forward.length} forward {forward.length === 1 ? "failure" : "failures"}</summary>
          <ul className="list-disc pl-5 text-red-800">
            {forward.map((f, k) => (
              <li key={k}>{f}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {critic && critic.length > 0 ? (
        <details>
          <summary className="cursor-pointer font-semibold text-amber-700">{critic.length} critic {critic.length === 1 ? "failure" : "failures"}</summary>
          <ul className="list-disc pl-5 text-amber-800">
            {critic.map((f, k) => (
              <li key={k}>{f}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
