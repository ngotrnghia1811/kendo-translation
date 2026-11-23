"use client";
import { useEffect, useState } from "react";
import type { ChainRow } from "@/lib/types";
import type { CompareView, CompareVariantTotals, MemoryPage } from "@/lib/chain";
import { TokenCells, TokenHeads } from "./Tokens";
import { pstFromUtcText } from "@/lib/pst-more";
// Unit VW127 (Q-A 3:122.4 rows 1, 2, 4, 6): the book title in the accent color, the page chips, the times green, the counts bold, a failed count above 0 red. No text changes.
import { HlCount, HlFailed, HlPage, HlTimeText, HlTitle } from "./HlSpan";
import Link from "next/link";
import { jsonViewHref } from "@/lib/json-view";
// Unit VW96 (card P31.3, Q-A 3:17.4): plain chain states, book titles, page numbers, run times and critique group hovers.
import { StatePill } from "./Pills";
import { BoxText } from "./BoxCode";
import { GroupCode, RawId } from "./Named";
import { chainStateWord, criticModeWord, pageNumberText, pairRunText } from "@/lib/readable-names";

// Round 48 answer 9 (Q-A 2026-10-27 l55): "the Viewer shows the chain state per book, skipped pages, the book translation memory pairs,
// the critic mode and the session turn, the compare table". These panels sit on the run view of a chain list. They only read files.
// [agent inference] The panels sit under the run header and above the page table. The owner has not placed them yet.
// Unit VW77b1 (round 81 answer 17, Q-A 2026-11-02 l22): the time of a compare file ("made 2026-10-27 23:50 PST") shows in PST.

const th = "px-3 py-2 text-left text-xs uppercase tracking-wide text-muted";
const td = "px-3 py-2 align-top";

/** Chain state text: "running", "completed", "interrupted", or "stopped: ..." (translator_run.py l1940 to l1960). */
function ChainState({ state }: { state: string }) {
  const w = chainStateWord(state);
  if (state.startsWith("stopped")) {
    return (
      <span title={w.help} className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
        <BoxText text={w.label} />
      </span>
    );
  }
  return <StatePill state={state} label={w.label} help={w.help} />;
}

/** The book of a chain: its title when known, with the slug in small grey text. */
function BookName({ book, title }: { book: string; title?: string | null }) {
  return title ? (
    <>
      <HlTitle>{title}</HlTitle> <RawId title="Book key (folder name)">{book}</RawId>
    </>
  ) : (
    <span className="font-mono text-xs" title="Book key (folder name). No title is known for it.">
      {book}
    </span>
  );
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
              <td className={td}>
                <BookName book={c.book} title={c.title} />
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlCount>{c.pages.length}</HlCount>
              </td>
              <td className={td}>
                <ChainState state={c.state} />
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlCount>
                  {c.accepted.length} / {c.pages.length}
                </HlCount>
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlCount>{c.memoryPairs ?? "–"}</HlCount>
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlFailed n={c.criticFailures}>{c.criticFailures ?? "–"}</HlFailed>
              </td>
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
      <h2 className="section-band mb-2 text-lg font-semibold">Book translation memory</h2>
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
        <span className="font-semibold">
          <BookName book={chain.book} title={chain.title} />
        </span>
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
            {pageNumberText(pg.pageId)} <HlPage>{pg.pageId}</HlPage>{" "}
            <span className="font-normal text-muted">
              (<HlCount>{pg.pairs.length} pairs</HlCount>)
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className={th}>Pair</th>
                  <th className={th}>Part</th>
                  <th className={th}>JA</th>
                  <th className={th}>EN</th>
                  <th className={th} title="The page run that wrote the pair (key run_id)">Written by page run</th>
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
                    <td className={td}>
                      {pairRunText(p.runId) ?? p.runId}
                      {pairRunText(p.runId) ? (
                        <>
                          {" "}
                          <RawId>{p.runId}</RawId>
                        </>
                      ) : null}
                    </td>
                    <td className={td + " whitespace-nowrap"} title={p.writtenAt ? `Stored as ${p.writtenAt} (UTC)` : undefined}>
                      {p.writtenAt ? <HlTimeText text={pstFromUtcText(p.writtenAt)} /> : "–"}
                    </td>
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
        <h2 className="section-band mb-1 text-lg font-semibold">Compare of critic modes</h2>
        <p className="text-sm text-muted">No compare.json in critic-compare/ names this list. The script critic_compare.py writes one.</p>
      </section>
    ) : null;
  }
  return (
    <section className="space-y-4">
      <h2 className="section-band text-lg font-semibold">Compare of critic modes</h2>
      {list.map((c) => (
        <div key={c.folder} className="rounded border border-line bg-white p-3">
          <p className="mb-2 text-xs text-muted">
            {/* Unit VW89 (round 90), Q-A 3:1.7 item 3: the compare folder opens in the JSON viewer (folder list). */}
            <Link href={jsonViewHref(`critic-compare/${c.folder}`)} data-compare-link className="underline underline-offset-2 hover:text-foreground">
              Open the compare files
            </Link>{" "}
            <RawId>critic-compare/{c.folder}</RawId>
            , made {c.generatedUtc ? <HlTimeText text={pstFromUtcText(c.generatedUtc)} /> : "at an unknown time"}, <HlCount>{c.pageCount} pages</HlCount>, <HlCount>{c.commonPageCount} pages</HlCount> in every variant.
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
            <th className={th + " text-right"}><GroupCode code="TS" /></th>
            <th className={th + " text-right"}><GroupCode code="TL" /></th>
            <th className={th + " text-right"}><GroupCode code="ED" /></th>
            <th className={th + " text-right"}><GroupCode code="QA" /></th>
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
              <td className={td}>
                {/* Unit VW96: a variant is a critic mode. The key stays as small grey text. */}
                {r.variant === "separate" || r.variant === "session" ? (
                  <>
                    <span title={criticModeWord(r.variant).help}>{criticModeWord(r.variant).label}</span> <RawId>{r.variant}</RawId>
                  </>
                ) : (
                  <span className="font-mono">{r.variant}</span>
                )}
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlCount>{n0(r.pages)}</HlCount>
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlCount>{n0(r.critiques)}</HlCount>
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlCount>{n0(r.byBoxType.TS)}</HlCount>
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlCount>{n0(r.byBoxType.TL)}</HlCount>
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlCount>{n0(r.byBoxType.ED)}</HlCount>
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlCount>{n0(r.byBoxType.QA)}</HlCount>
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlCount>{n0(r.citingIssues)}</HlCount>
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlCount>{n0(r.citingOtherQa)}</HlCount>
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlCount>{n0(r.calls)}</HlCount>
              </td>
              <td className={td + " text-right tabular-nums"}>
                <HlFailed n={r.failedCalls}>{n0(r.failedCalls)}</HlFailed>
              </td>
              <TokenCells tokens={r.tokens ?? null} className={td + " text-right tabular-nums"} />
              <td className={td + " text-right tabular-nums"}>
                <HlCount>{r.seconds === null ? "–" : r.seconds.toFixed(1)}</HlCount>
              </td>
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
              <li key={k}>
                <BoxText text={f} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {critic && critic.length > 0 ? (
        <details>
          <summary className="cursor-pointer font-semibold text-amber-700">{critic.length} critic {critic.length === 1 ? "failure" : "failures"}</summary>
          <ul className="list-disc pl-5 text-amber-800">
            {critic.map((f, k) => (
              <li key={k}>
                <BoxText text={f} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
