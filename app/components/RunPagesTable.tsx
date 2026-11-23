"use client";
import Link from "next/link";
import type { RunDetail } from "@/lib/types";
import { minutes } from "@/lib/format";
import { TokenCells, TokenHeads } from "./Tokens";
import { StatePill, VerdictPill } from "./Pills";
import { FailureLists } from "./ChainPanels";
import { ACCEPTED_BEFORE_HELP } from "@/lib/phase2-articles";
import { pageStateWord } from "@/lib/run-view-words";
import { BoxCode } from "./BoxCode";
import { capFirst, pageKindWord, pageNumberText, pageRunName } from "@/lib/readable-names";
import { RawId } from "./Named";
// Unit VW127 (Q-A 3:122.4 rows 1, 2, 4, 6): the page IDs as chips, the article title in the accent color, the counts bold, a failed count above 0 red. No text changes.
import { HlCount, HlDuration, HlFailed, HlPage, HlText } from "./HlSpan";

// Unit VW99 (Q-A 3:27.3): the page table of the run view /runs/<stamp>, moved out of components/RunView.tsx without a change of its logic,
// so that the tab "Pages" holds it. Round 44 answer 13: one row per page with state, calls, tokens, minutes, QA_3 verdict and a page view link.
export default function RunPagesTable({ run, isChain }: { run: RunDetail; isChain: boolean }) {
  return (
    <div className="overflow-x-auto rounded border border-line bg-white">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2">Page</th>
            <th className="px-3 py-2">Kind</th>
            <th className="px-3 py-2">State</th>
            <th className="px-3 py-2 text-right">Calls</th>
            <TokenHeads className="px-3 py-2 text-right whitespace-nowrap" />
            <th className="px-3 py-2 text-right">Minutes</th>
            <th className="px-3 py-2">
              <BoxCode code="QA_3" />
            </th>
            {isChain ? <th className="px-3 py-2">Book memory</th> : null}
          </tr>
        </thead>
        <tbody>
          {run.pages.map((p) => (
            <tr key={p.pageId} className="border-t border-line hover:bg-stone-50">
              <td className="px-3 py-2" data-run-page={p.pageId}>
                {p.runFolder ? (
                  <Link href={p.href} data-hl="page" className="hl-page underline-offset-2 hover:underline">
                    {p.pageId}
                  </Link>
                ) : p.acceptedBefore ? (
                  <Link href={p.acceptedBefore.href} data-hl="page" className="hl-page underline-offset-2 hover:underline">
                    {p.pageId}
                  </Link>
                ) : (
                  <HlPage>{p.pageId}</HlPage>
                )}
                {p.article ? (
                  <div data-run-page-article className="mt-0.5 max-w-xs text-xs">
                    <span data-hl={p.article.found ? "title" : undefined} className={p.article.found ? "hl-title" : "italic text-muted"}>{p.article.title}</span>
                    {p.article.pageOf ? <span className="text-muted">, {p.article.pageOf}</span> : null}
                    {p.article.titleJa ? (
                      <span lang="ja" className="block text-muted">
                        {p.article.titleJa}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div data-run-page-number className="mt-0.5 text-xs text-muted">
                    {capFirst(pageNumberText(p.pageId))}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-muted">
                <span title={pageKindWord(p.kind).help}>{pageKindWord(p.kind).label}</span>
              </td>
              <td className="px-3 py-2">
                {p.acceptedBefore ? (
                  <div data-accepted-before title={ACCEPTED_BEFORE_HELP}>
                    <StatePill state="accepted before restart" />
                    <div className="mt-1 max-w-xs text-xs text-muted">
                      <HlText text={p.acceptedBefore.text} />{" "}
                      <Link href={p.acceptedBefore.href} className="text-accent underline underline-offset-2">
                        {p.acceptedBefore.runFolder ? pageRunName(p.acceptedBefore.runFolder).label : "Page run"}
                      </Link>
                      {p.acceptedBefore.runFolder ? (
                        <>
                          {" "}
                          <RawId>{p.acceptedBefore.runFolder}</RawId>
                        </>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">This list: not started yet, 0 calls.</div>
                  </div>
                ) : (
                  <PageStatePill state={p.skippedReason && p.state === "waiting" ? "skipped" : p.state} />
                )}
                {p.running.length > 0 ? (
                  <div data-run-boxes className="mt-1 text-xs text-muted">
                    {p.running.map((b, i) => (
                      <span key={b}>
                        {i > 0 ? ", " : ""}
                        <BoxCode code={b} />
                      </span>
                    ))}
                  </div>
                ) : null}
                {p.skippedReason ? <div className="mt-1 text-xs text-amber-800">Skipped: {p.skippedReason}</div> : null}
                <FailureLists forward={p.forwardFailures} critic={p.criticFailures} />
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                <HlCount>
                  {p.callsDone} / {p.callsTotal}
                </HlCount>
                {p.callsFailed ? (
                  <span className="ml-1">
                    <HlFailed n={p.callsFailed}>({p.callsFailed} failed)</HlFailed>
                  </span>
                ) : null}
              </td>
              <TokenCells tokens={p.tokens} className="px-3 py-2 text-right tabular-nums" />
              <td className="px-3 py-2 text-right tabular-nums">
                <HlDuration>{minutes(p.minutes === null ? null : p.minutes * 60)}</HlDuration>
              </td>
              <td className="px-3 py-2">
                <VerdictPill verdict={p.qa3Verdict} score={p.qa3Score} />
              </td>
              {isChain ? (
                <td className="px-3 py-2 text-xs">
                  {p.bookMemory ? <HlText text={p.bookMemory.written ? `${p.bookMemory.pairs ?? "?"} pairs written` : `${p.bookMemory.verdict ?? "no verdict"}, nothing written`} /> : <span className="text-muted">–</span>}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PageStatePill({ state }: { state: string }) {
  const w = pageStateWord(state);
  return <StatePill state={state} label={w.label} help={w.help} />;
}
