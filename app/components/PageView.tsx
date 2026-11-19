"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { PageData } from "@/lib/types";
import { minutes } from "@/lib/format";
import { TOKENS_LABEL } from "@/lib/tokens-view";
import { TokensDetail } from "./Tokens";
import { VerdictPill } from "./Pills";
import { CompareText, ReadText } from "./PageText";
import QaPanel from "./QaPanel";
import ExtrasChecklist from "./ExtrasChecklist";
import ExtraPanels from "./ExtraPanels";
import { useExtras } from "./extras-store";
import { jsonViewHref } from "@/lib/json-view";
import type { PageNames } from "@/lib/readable-load";
import { criticModeWord, pageKindWord, pageRunName } from "@/lib/readable-names";
import { TITLE_NOT_FOUND } from "@/lib/phase2-articles";
import { BoxCode } from "./BoxCode";
import { PageRunStatusPill, RawId } from "./Named";
import PageMoveLinks from "./PageMoveLinks";
import PagePanels from "./PagePanels";
import type { PageNeighbors } from "@/lib/page-neighbors";
import { markNavigating } from "@/lib/loading-rule";

// Unit VW96 (round 91), card P31.3, owner rule Q-A 3:17.4: the header shows the article title and "page n of m" (the page ID stays in small grey text),
// the page kind, the run folder and the status in plain words, and each box code gets its hover (Q-A 3:18.5, "Keep codes, explain on hover").
// Round 44 answer 13 (Q-A l142), page view: header with page ID, kind, run folder, cost, verdict.
// Main area: ED_0 to ED_3 texts with the JA text. QA verdict and cells. Reasoning on request. 7 extra items off by default.
// Viewer goals: best reading experience (text central), efficiency (stage tabs, one page, few clicks), flexible UI (read or compare, image on or off).
// Unit VW115 (Q-A 3:93.5 and 3:94.2 rows 1 to 3): the panels have border and corner handles (components/PagePanels.tsx), and "Previous page" and "Next page" sit at the top
// (components/PageMoveLinks.tsx, addresses from lib/page-neighbors.ts). The sizes stay in this browser.
export default function PageView({ data, names, neighbors }: { data: PageData; names: PageNames; neighbors: PageNeighbors }) {
  const router = useRouter();
  const stages = data.ed.map((e) => Number(e.box.slice(-1)));
  const [stage, setStage] = useState<number>(stages.length ? stages[stages.length - 1] : 3);
  const [mode, setMode] = useState<"read" | "compare">("read");
  const [showImage, setShowImage] = useState(false);
  const { ticks, toggle } = useExtras();

  const ed = data.ed.find((e) => e.box === `ED_${stage}`);
  const qa = data.qa.find((q) => q.box === `QA_${stage}`);
  const qa3 = data.qa.find((q) => q.box === "QA_3");

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/books" className="text-sm text-muted hover:text-foreground">
          ← Books
        </Link>
        <PageMoveLinks previous={neighbors.previous} next={neighbors.next} />
      </div>

      <header className="mt-2 mb-4">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h1 data-page-title className="text-xl font-semibold">
            {names.title ?? (names.shortId ? TITLE_NOT_FOUND : names.pageOf)}
          </h1>
          {names.title || names.shortId ? <span data-page-of className="text-muted">{names.pageOf}</span> : null}
          <RawId title="Page ID">{data.pageId}</RawId>
        </div>
        <dl className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <Fact label="Kind" value={<span title={pageKindWord(data.kind).help}>{pageKindWord(data.kind).label}</span>} />
          {/* Unit VW99: min-w-0 and max-w-full let the long run folder choice shrink, so a 390 px screen has no sideways scroll. */}
          <div className="flex min-w-0 max-w-full items-center gap-2">
            <dt className="text-xs uppercase tracking-wide text-muted">Run folder</dt>
            <dd className="min-w-0">
              {/* Unit VW89 (round 90), Q-A 3:1.7 item 3: the run folder opens in the JSON viewer (folder list). With a choice of run folders,
                  the link "Open folder" sits after the choice [unit default VW89]. */}
              {data.runFolders.length > 1 ? (
                <>
                  <select
                    className="max-w-full rounded border border-line bg-white px-1 py-0.5 font-mono text-xs"
                    value={data.runFolder}
                    onChange={(e) => {
                      markNavigating();
                      router.push(`/page/${data.slug}/${data.pageName}?run=${encodeURIComponent(e.target.value)}`);
                    }}
                  >
                    {data.runFolders.map((r) => (
                      <option key={r} value={r}>
                        {pageRunName(r).label === r ? r : `${pageRunName(r).label} (${r})`}
                      </option>
                    ))}
                  </select>{" "}
                  <Link href={jsonViewHref(data.runRel)} data-run-folder-link className="text-xs text-accent underline-offset-2 hover:underline">
                    Open folder
                  </Link>
                </>
              ) : (
                <>
                  <Link href={jsonViewHref(data.runRel)} data-run-folder-link className="text-accent underline-offset-2 hover:underline">
                    {pageRunName(data.runFolder).label}
                  </Link>{" "}
                  {pageRunName(data.runFolder).label !== data.runFolder ? <RawId title="Folder name of the page run">{data.runFolder}</RawId> : null}
                </>
              )}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-xs uppercase tracking-wide text-muted">Status</dt>
            <dd>
              <PageRunStatusPill status={data.status} />
            </dd>
          </div>
          {/* Unit VW93 (Q-A 3:15.2): the 5 token kinds of the page run in place of the two costs. A run with no token numbers shows "no token data" (Q-A 3:15.3). */}
          <Fact label={TOKENS_LABEL} value={<TokensDetail tokens={data.tokenSum.tokens} sum={data.tokenSum} />} />
          <Fact label="Minutes" value={minutes(data.wallSeconds)} />
          <Fact label="Calls" value={data.modelCalls === null ? "–" : String(data.modelCalls)} />
          <div className="flex items-center gap-2">
            <dt className="text-xs uppercase tracking-wide text-muted">
              <BoxCode code="QA_3" />
            </dt>
            <dd>
              <VerdictPill verdict={qa3?.verdict ?? null} score={qa3?.score ?? null} />
            </dd>
          </div>
          {/* Round 48 answer 9 (Q-A 2026-10-27 l55): critic mode, session turns, book memory write, critic-only runs. An old summary has no critic mode key, so that fact reads "not stored". The other two facts stay hidden without data. */}
          <Fact label="Critic mode" value={<span title={criticModeWord(data.criticMode).help}>{criticModeText(data)}</span>} />
          {data.bookMemory ? <Fact label="Book memory" value={bookMemoryText(data.bookMemory)} /> : null}
          {data.criticOnlyFolders.length > 0 ? <Fact label="Critic-only runs" value={String(data.criticOnlyFolders.length)} /> : null}
        </dl>
        {data.failures.length > 0 ? (
          <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="font-semibold">This run has failures.</div>
            <ul className="mt-1 list-disc pl-5">
              {data.failures.map((f, k) => (
                <li key={k}>{f}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Stage">
          {stages.map((n) => {
            const q = data.qa.find((x) => x.box === `QA_${n}`);
            const on = n === stage;
            return (
              <button
                key={n}
                role="tab"
                aria-selected={on}
                onClick={() => setStage(n)}
                className={"flex items-center gap-2 rounded border px-3 py-1.5 text-sm " + (on ? "border-tab-on bg-tab-on font-semibold text-tab-on-ink" : "border-line text-muted hover:border-accent")}
              >
                <BoxCode code={`ED_${n}`} />
                <VerdictPill verdict={q?.verdict ?? null} score={q?.score ?? null} />
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded border border-line text-sm" role="group" aria-label="Layout">
            <button onClick={() => setMode("read")} aria-pressed={mode === "read"} className={"px-3 py-1.5 " + (mode === "read" ? "bg-white font-semibold" : "text-muted hover:text-foreground")}>
              Read
            </button>
            <button onClick={() => setMode("compare")} aria-pressed={mode === "compare"} className={"border-l border-line px-3 py-1.5 " + (mode === "compare" ? "bg-white font-semibold" : "text-muted hover:text-foreground")}>
              Compare stages
            </button>
          </div>
          <button
            onClick={() => setShowImage((s) => !s)}
            disabled={!data.imagePath}
            title={data.imagePath ? "" : "This page has no image file"}
            aria-pressed={showImage}
            className="rounded border border-line bg-white px-3 py-1.5 text-sm hover:border-accent disabled:opacity-40"
          >
            {showImage ? "Hide page image" : "Show page image"}
          </button>
          <ExtrasChecklist ticks={ticks} toggle={toggle} />
        </div>
      </div>

      {data.ed.length === 0 ? (
        <p className="rounded border border-line bg-white p-4 text-muted">This run folder has no ED result yet.</p>
      ) : (
        <PagePanels
          image={
            showImage && data.imagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/file?path=${encodeURIComponent(data.imagePath)}`} alt={`Scan of ${names.title ?? data.pageId}, ${names.pageOf}`} className="w-full" />
            ) : null
          }
          text={mode === "read" && ed ? <ReadText stage={ed} /> : <CompareText stages={data.ed} />}
          side={<QaPanel qa={qa} />}
        />
      )}

      <ExtraPanels page={data} stage={stage} ticks={ticks} />
    </section>
  );
}

function criticModeText(d: PageData): string {
  const word = criticModeWord(d.criticMode).label; // VW96: "One critic session per box" in place of the raw key "separate"
  const s = d.criticSession;
  if (!s || !d.criticMode) return word;
  const sessions = s.sessionIds.length === 1 ? "1 session" : `${s.sessionIds.length} sessions`;
  const restarts = s.restarts > 0 ? `, ${s.restarts} ${s.restarts === 1 ? "restart" : "restarts"}` : "";
  return `${word}, ${s.turns ?? "?"} turns in ${sessions}${restarts}, ${s.turnMessage || "no"} turn message`;
}

function bookMemoryText(m: NonNullable<PageData["bookMemory"]>): string {
  if (m.written) return `${m.verdict ?? "–"}, ${m.pairs ?? "?"} pairs written`;
  return `${m.verdict ?? "no verdict"}, nothing written`;
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
