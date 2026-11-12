"use client";
import { useEffect, useState, type ReactNode } from "react";
import type { PageData } from "@/lib/types";
import Link from "next/link";
import { EXTRAS, type ExtraKey } from "./extras-store";
import { enFormBadge, enFormTone } from "@/lib/page-labels";
import { jsonViewHref } from "@/lib/json-view";
import { TOKENS_LABEL, missingNote, sumTokens, tokensLine } from "@/lib/tokens-view";
import { NoTokenData, TokenCells, TokenHeads, TokensDetail } from "./Tokens";
import { BoxText } from "./BoxCode";
import { GroupCode, RawId, SessionId } from "./Named";
import { criticFolderName, criticModeWord, critiqueLabel, modelOptionText, pageNumberText, pageRunStatusWord } from "@/lib/readable-names";

// Unit VW96 (round 91), card P31.3, owner rule Q-A 3:17.4: box codes keep their place and show the readable name on hover (Q-A 3:18.5),
// a session ID shows short with the full ID on hover, a critic-only folder shows a plain name with the folder name in small grey text.

/* eslint-disable @typescript-eslint/no-explicit-any */

// Round 43 answer 7 (Q-A l111): the extra items show under the text, one panel per ticked item.
// The data loads from /api/page-extra only when the item is ticked (fast loading).
export default function ExtraPanels({ page, stage, ticks }: { page: PageData; stage: number; ticks: Partial<Record<ExtraKey, boolean>> }) {
  const active = EXTRAS.filter((e) => ticks[e.key]);
  if (active.length === 0) return null;
  return (
    <div className="mt-6 space-y-4">
      {active.map((e) => (
        <section key={e.key} className="rounded border border-line bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold">
            {e.label} <span className="font-normal text-muted">(stage {stage})</span>
          </h3>
          {e.key === "counts" ? <Counts page={page} /> : <Remote runRel={page.runRel} part={e.key} stage={stage} />}
        </section>
      ))}
    </div>
  );
}

function useExtra(runRel: string, part: string, stage: number): { data: any; error: string | null } {
  const key = `${runRel}|${part}|${stage}`;
  const [res, setRes] = useState<{ key: string; data: any; error: string | null } | null>(null);
  useEffect(() => {
    let cancel = false;
    const q = new URLSearchParams({ run: runRel, part, stage: String(stage) });
    fetch(`/api/page-extra?${q}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (!cancel) setRes({ key, data: ok ? body : null, error: ok ? null : String(body?.error ?? "Error") });
      })
      .catch((e) => {
        if (!cancel) setRes({ key, data: null, error: String(e) });
      });
    return () => {
      cancel = true;
    };
  }, [key, runRel, part, stage]);
  return res && res.key === key ? { data: res.data, error: res.error } : { data: undefined, error: null };
}

function Remote({ runRel, part, stage }: { runRel: string; part: string; stage: number }) {
  const { data, error } = useExtra(runRel, part, stage);
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (data === undefined) return <p className="text-sm text-muted">Loading…</p>;
  switch (part) {
    case "calls":
      return <Calls rows={data} />;
    case "messages":
      return <Messages rows={data} />;
    case "lookup":
      return <Lookup rows={data} />;
    case "failed":
      return <Failed d={data} />;
    case "programs":
      return <Programs d={data} />;
    case "critiques":
      return <Critiques rows={data} />;
    case "chain":
      return <ChainInputs d={data} />;
    case "critic_only":
      return <CriticOnly rows={data} stage={stage} runRel={runRel} />;
  }
  return null;
}

const th = "px-2 py-1 text-left text-xs uppercase tracking-wide text-muted";
const td = "px-2 py-1 align-top";

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

export function Calls({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <Empty>No model call for this stage.</Empty>;
  // Unit VW93 (Q-A 3:15.2, 3:15.3): the 5 token kinds of each call in place of the dollar amount. The total adds the calls with token data.
  const total = sumTokens(rows.map((r) => r.tokenCounts ?? null));
  const sec = rows.reduce((s, r) => s + (r.seconds ?? 0), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>Call</th>
            <th className={th}>Model</th>
            <TokenHeads className={th + " text-right whitespace-nowrap"} />
            <th className={th + " text-right"}>Seconds</th>
            <th className={th + " text-right"}>Retries</th>
            <th className={th}>Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, k) => (
            <tr key={k} className="border-t border-line">
              <td className={td + " font-mono text-xs"}>
                <BoxText text={String(r.tag)} />
              </td>
              <td className={td + " text-xs"}>
                <span title={`Model ID: ${r.model}`}>{modelOptionText(String(r.model))}</span>
                {r.variant ? <span className="text-muted"> ({r.variant})</span> : null}
              </td>
              <TokenCells tokens={r.tokenCounts ?? null} className={td + " text-right tabular-nums"} />
              <td className={td + " text-right tabular-nums"}>{r.seconds ?? "–"}</td>
              <td className={td + " text-right tabular-nums"}>{r.retries}</td>
              <td className={td + " text-xs"}>
                {r.sessionTurn !== null && r.sessionTurn !== undefined ? (
                  <span className="mr-1 rounded bg-stone-100 px-1.5 text-stone-700" title="Turn of the critic session that held this call">
                    session turn {r.sessionTurn}
                    {r.sessionId ? (
                      <>
                        , session <SessionId id={String(r.sessionId)} />
                      </>
                    ) : (
                      ""
                    )}
                    {r.sessionFirstMessage ? ", first message" : ""}
                  </span>
                ) : null}
                {r.sessionRestart ? <span className="mr-1 text-amber-700">session restart: {String(r.sessionRestart)}</span> : null}
                {r.ok === false ? <span className="text-red-700">failed: {r.error}</span> : <span title="The call finished without an error">ok</span>}
                {r.flag ? <span className="ml-1 text-amber-700">flag: {String(r.flag)}</span> : null}
                {r.jsonRepairKind ? <span className="ml-1 text-amber-700">JSON repaired: {r.jsonRepairKind}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line font-medium">
            <td className={td} colSpan={2}>
              Total
              {missingNote(total, "call", "calls") ? <span className="font-normal text-muted">{missingNote(total, "call", "calls")}</span> : null}
            </td>
            <TokenCells tokens={total.tokens} className={td + " text-right tabular-nums"} />
            <td className={td + " text-right tabular-nums"}>{sec.toFixed(1)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Messages({ rows }: { rows: { tag: string; text: string }[] }) {
  if (rows.length === 0) return <Empty>No saved message for this stage.</Empty>;
  return (
    <div className="space-y-2">
      {rows.map((m) => (
        <details key={m.tag} className="rounded border border-line">
          <summary className="cursor-pointer px-3 py-1.5 text-sm">
            <span className="font-mono text-xs">
              <BoxText text={m.tag} />
            </span>{" "}
            <span className="text-muted">({m.text.length.toLocaleString("en-US")} characters)</span>
          </summary>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-line bg-stone-50 p-3 text-xs leading-relaxed">{m.text}</pre>
        </details>
      ))}
    </div>
  );
}

function Lookup({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <Empty>No lookup file for this stage.</Empty>;
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.box}>
          <div className="mb-1 font-mono text-xs font-semibold">
            <BoxText text={String(r.box)} />
          </div>
          {r.lookup ? (
            <div className="mb-2 text-sm">
              <span className="text-muted">Dictionary headwords found: </span>
              {(r.lookup.matched ?? []).length ? (r.lookup.matched as string[]).map((h) => (
                <span key={h} className="mr-1.5 rounded bg-stone-100 px-1.5 font-ja">
                  {h}
                </span>
              )) : "none"}
              <div className="text-xs text-muted">
                Search hits (memory chunk ID and score): {(r.lookup.search ?? []).slice(0, 8).map((s: [string, number]) => `${s[0]} ${s[1]}`).join(", ") || "none"}
              </div>
            </div>
          ) : null}
          {r.aligned ? (
            <ul className="space-y-1.5">
              {(r.aligned.pairs ?? []).map((p: any, k: number) => (
                <li key={k} className="rounded border border-line p-2 text-sm">
                  <div className="font-ja">{p.ja}</div>
                  <div className="font-serif">{p.en}</div>
                  <div className="text-xs text-muted">score {p.score}</div>
                </li>
              ))}
              {(r.aligned.pairs ?? []).length === 0 ? <Empty>No aligned pair found.</Empty> : null}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Failed({ d }: { d: any }) {
  const none = d.failed.length + d.flagged.length + d.failures.length === 0;
  if (none) return <Empty>No failed call and no flagged call on this page.</Empty>;
  return (
    <div className="space-y-3 text-sm">
      {d.failures.map((f: string, k: number) => (
        <p key={k} className="rounded border border-red-200 bg-red-50 p-2 text-red-800">
          {f}
        </p>
      ))}
      {d.failed.map((f: any) => (
        <div key={f.file} className="rounded border border-line p-2">
          <span className="font-mono text-xs">
            <BoxText text={String(f.tag)} />
          </span>{" "}
          <span className="text-xs text-muted">{f.model}</span>
          <div className="text-xs text-red-700">{f.error}</div>
          <div className="text-xs text-muted">
            retries {f.retries ?? 0}, {f.seconds ?? "–"} s, {f.tokens ? tokensLine(f.tokens) : <NoTokenData />}
          </div>
        </div>
      ))}
      {d.flagged.map((f: any, k: number) => (
        <div key={k} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs">
          <span className="font-mono">
            <BoxText text={String(f.tag)} />
          </span>{" "}
          flag: {String(f.flag)}
        </div>
      ))}
    </div>
  );
}

function Programs({ d }: { d: any }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">EN form check</h4>
        {d.enForm === null ? (
          <Empty>No file.</Empty>
        ) : d.enForm.length === 0 ? (
          <Empty>No term to check.</Empty>
        ) : (
          <>
            {d.enFormSummary ? (
              <p className="mb-1 text-xs">
                <span className="font-semibold">{d.enFormSummary.follows}</span> follows / <span className="font-semibold text-red-800">{d.enFormSummary.breaks}</span> breaks /{" "}
                <span className="font-semibold text-amber-800">{d.enFormSummary.notes}</span> notes
              </p>
            ) : null}
            <ul className="space-y-1">
              {d.enForm.map((i: any, k: number) => (
                <li key={k} className={enFormTone(i.result)}>
                  <span className="font-ja">{i.term}</span> → <span className="font-serif">{i.enForm}</span> <span className="text-xs">({i.use})</span>{" "}
                  <span className={"rounded px-1.5 text-xs font-semibold " + enFormBadge(i.result)}>{String(i.result)}</span>
                  {i.detail && i.detail !== "none" ? <span className="text-xs">: {i.detail}</span> : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Term marks</h4>
        {d.termMarks === null ? (
          <Empty>No file.</Empty>
        ) : (
          <p>
            {d.termMarks.length} marks. Without a short English explanation: {d.termMarks.filter((m: any) => m.explained === false).length}.
          </p>
        )}
      </div>
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Page structure check</h4>
        {d.structure === null ? (
          <Empty>No file.</Empty>
        ) : (
          <>
            <p>
              {d.structure.total} parts compared. Not found: {d.structure.notFound.length}.
            </p>
            <ul className="text-xs text-red-800">
              {d.structure.notFound.map((i: any, k: number) => (
                <li key={k}>
                  {i.part} {i.ts} → {i.ed ?? "none"}: {i.status} ({i.detail})
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Critiques({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <Empty>No critique for this stage.</Empty>;
  return (
    <ul className="space-y-3">
      {rows.map((c, k) => (
        <li key={k} className="rounded border border-line p-3 text-sm">
          <div className="flex gap-3 text-xs text-muted">
            <span>
              {critiqueLabel(String(c.id))} <RawId title="Critique ID">{String(c.id)}</RawId>
            </span>
            <span>
              reviewed <BoxText text={String(c.reviewedBox)} />
            </span>
          </div>
          <p className="mt-1 font-medium">{c.failureMode}</p>
          <p className="mt-1 text-xs leading-relaxed">{c.reason}</p>
          {c.noteForNext ? (
            <p className="mt-2 rounded bg-amber-50 p-2 text-xs leading-relaxed">
              <span className="font-semibold">Note for the next critic: </span>
              {c.noteForNext}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Counts({ page }: { page: PageData }) {
  if (page.critiqueCounts.length === 0) return <Empty>No critique counts in summary.json.</Empty>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className={th}>Critique group</th>
          <th className={th + " text-right"}>Critiques</th>
          <th className={th + " text-right"}>N</th>
          <th className={th}>Reached N</th>
          <th className={th}>Note</th>
        </tr>
      </thead>
      <tbody>
        {page.critiqueCounts.map((c) => (
          <tr key={c.boxType} className="border-t border-line">
            <td className={td + " font-mono text-xs"}>
              <GroupCode code={c.boxType} />
            </td>
            <td className={td + " text-right tabular-nums"}>{c.critiques}</td>
            <td className={td + " text-right tabular-nums"}>{c.n ?? "–"}</td>
            <td className={td}>{c.reachedN === null ? "–" : c.reachedN ? "yes" : "no"}</td>
            <td className={td + " text-xs text-muted"}>{c.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Round 48 answer 9 (Q-A 2026-10-27 l55), Extra detail item "Chain inputs": what the four forward boxes of the stage received from the book chain.
// The three blocks are cut from messages/<box>.txt. A page outside a chain, or the first page of a chain, has little or nothing to show.
const CHAIN_BLOCK_LABELS: { key: string; label: string }[] = [
  { key: "previous_page_pair", label: "Previous page pair" },
  { key: "book_translation_memory", label: "Book translation memory" },
  { key: "earlier_term_marks", label: "Earlier term marks" },
];

export function ChainInputs({ d }: { d: any }) {
  if (!d.boxes || d.boxes.length === 0) return <Empty>No saved message for the boxes of this stage.</Empty>;
  if (!d.hasAny) return <Empty>These messages hold none of the three chain blocks. This page did not run in a book chain, or its messages come from before the book chain.</Empty>;
  return (
    <div className="space-y-4 text-sm">
      {d.previous ? (
        <p>
          <span className="text-muted">Previous page: </span>
          {d.previous.href ? (
            <Link href={d.previous.href} className="text-accent underline-offset-2 hover:underline">
              {pageNumberText(String(d.previous.pageId))}
            </Link>
          ) : (
            <span>{pageNumberText(String(d.previous.pageId))}</span>
          )}{" "}
          <RawId title="Page ID of the previous page">{String(d.previous.pageId)}</RawId>{" "}
          <span className="ml-1 text-xs text-muted">
            Each box reads the pair of the same box on that page. {d.previous.note}
          </span>
        </p>
      ) : (
        <Empty>No previous page pair in these messages. This is the first page of its chain, or the page ran outside a chain.</Empty>
      )}
      {d.boxes.map((b: any) => (
        <div key={b.box}>
          <div className="mb-1 font-mono text-xs font-semibold">
            <BoxText text={String(b.box)} />
          </div>
          <div className="space-y-1.5">
            {CHAIN_BLOCK_LABELS.map((cb) => {
              const text: string | null = b.blocks[cb.key];
              const extra = cb.key === "book_translation_memory" && b.pairsFound !== null ? `${b.pairsFound} pairs found` : cb.key === "earlier_term_marks" && b.pagesRead !== null ? `${b.pagesRead} pages read` : "";
              return (
                <details key={cb.key} className="rounded border border-line">
                  <summary className="cursor-pointer px-3 py-1.5 text-sm">
                    {cb.label}{" "}
                    <span className="text-muted">
                      {text === null ? "(no block in this message)" : `(${text.length.toLocaleString("en-US")} characters${extra ? ", " + extra : ""})`}
                    </span>
                  </summary>
                  {text !== null ? <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-line bg-stone-50 p-3 text-xs leading-relaxed">{text}</pre> : null}
                </details>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Round 48 answer 9, Extra detail item "Critic-only runs": one block per critic-<mode>-<stamp> subfolder of the run folder.
// The counts cover the whole page. The critique list covers the boxes of the selected stage.
export function CriticOnly({ rows, stage, runRel }: { rows: any[]; stage: number; runRel: string }) {
  if (rows.length === 0) return <Empty>This run folder has no critic-only subfolder.</Empty>;
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.folder} className="rounded border border-line p-3 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {/* Unit VW89 (round 90), Q-A 3:1.7 item 3: the critic-only folder opens in the JSON viewer (folder list). */}
            <Link href={jsonViewHref(`${runRel}/${r.folder}`)} data-critic-only-link className="text-sm font-semibold text-accent underline-offset-2 hover:underline">
              {criticFolderName(String(r.folder)).label}
            </Link>
            <RawId title="Folder name of the critic-only run">{String(r.folder)}</RawId>
            <span className="rounded bg-stone-100 px-1.5 text-xs" title={criticModeWord(r.mode).help}>
              {r.mode ? criticModeWord(r.mode).label : "Critic mode unknown"}
            </span>
            {r.plan ? <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">plan only, no model call</span> : null}
            {r.hasSummary ? <span className="text-xs text-muted" title={r.status ? pageRunStatusWord(String(r.status)).help : undefined}>{r.status ? pageRunStatusWord(String(r.status)).label : "Status unknown"}</span> : <span className="text-xs text-red-700">no summary.json (the run did not finish)</span>}
          </div>
          {r.hasSummary ? (
            <p className="mt-1 text-xs">
              <span className="font-semibold">{r.critiquesTotal ?? "–"}</span> critiques
              {r.byBoxType.length > 0 ? (
                <>
                  {" ("}
                  {r.byBoxType.map((b: any, i: number) => (
                    <span key={i}>
                      {i > 0 ? ", " : ""}
                      <GroupCode code={String(b.boxType)} /> {b.critiques}
                    </span>
                  ))}
                  {")"}
                </>
              ) : (
                ""
              )}
              , {r.modelCalls ?? "–"} calls,{" "}
              {r.failedCalls.length > 0 ? (
                <span className="text-red-700">
                  {r.failedCalls.length} failed (<BoxText text={r.failedCalls.join(", ")} />)
                </span>
              ) : (
                "0 failed"
              )}
              ,{" "}
              {r.seconds ?? "–"} s
              {r.session ? `, session: ${r.session.turns ?? "?"} turns, ${r.session.sessionIds.length} session, ${r.session.restarts} restarts, turn message ${r.session.turnMessage || "–"}` : ""}
            </p>
          ) : null}
          {/* Unit VW93 (Q-A 3:15.2, 3:15.3): the 5 token kinds of the critic-only run in place of the dollar amount, or "no token data". */}
          {r.hasSummary ? (
            <p className="mt-1 text-xs" data-critic-only-tokens>
              {TOKENS_LABEL}: <TokensDetail tokens={r.tokens ?? null} />
            </p>
          ) : null}
          <h4 className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Critiques of stage {stage}</h4>
          <Critiques rows={r.critiques} />
        </div>
      ))}
    </div>
  );
}
