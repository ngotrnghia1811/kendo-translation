import { foldProgress, progressLine } from "@/lib/reader-translated";
import type { Dashboard, Fold, Node } from "@/lib/reader-folds";
import ReaderMonth from "./ReaderMonth";
import { RowList, WorkItem } from "./ReaderRows";
import { agentFoldLine, type DashTarget } from "@/lib/translate-dash";

/*
 * The folds of the Reader dashboard /read (unit RC4, round 70). VISION-viewer 15.23.3 and 15.23.5. It replaces the card grid of unit RC1.
 * Round 68 answer 3: "Folds and search together". The folds are the HTML elements details and summary, so a keyboard works.
 * The first level starts open. The deeper levels start closed. The rows of a month load when the month opens (components/ReaderMonth.tsx).
 * Server component. The rows are in components/ReaderRows.tsx.
 * Unit VW112 (Q-A 3:78.4 rows 1 and 3): the human translation view /translate draws the same tree with `to` = "translate".
 * Its rows link to /translate/<book>, and each fold line counts the pages with an agent translation ("Agent translation: n of m pages").
 */

export { WorkItem };

function Summary({ f, known, to }: { f: Fold; known: boolean; to: DashTarget }) {
  const first = f.level === 1;
  const text = [first ? `${f.counts.works.toLocaleString("en-US")} works` : f.note, first ? `${f.counts.pages.toLocaleString("en-US")} pages` : ""].filter(Boolean).join(" · ");
  // A month and every higher fold show the same full form "N of M pages translated" (VISION-viewer 15.23.3.2, round 70 answer 9).
  const progress = to === "translate" ? agentFoldLine(f.counts.translated, f.counts.pages) : !known ? "" : f.level === 3 && !f.toc ? progressLine(f.counts.translated, f.counts.pages) : foldProgress(f.counts.translated, f.counts.pages);
  return (
    <>
      <span className={first ? "text-lg font-semibold" : "font-semibold"}>{f.title}</span>
      {/* Unit VW119 (Q-A 3:103.6 row 3): the author after the title in smaller gray text. Nothing when the fold has no author. Same on /read and /translate (Q-A 3:80.3). */}
      {f.author ? (
        <span className="text-sm text-muted" data-fold-author>
          · {f.author}
        </span>
      ) : null}
      {f.titleJa ? (
        <span lang="ja" className="font-ja text-sm text-muted">
          {f.titleJa}
        </span>
      ) : null}
      {text ? <span className="text-sm text-muted">{text}</span> : null}
      {progress ? (
        <span className="text-sm text-muted" data-fold-progress>
          {progress}
        </span>
      ) : null}
    </>
  );
}

function NodeList({ nodes, approved, known, openId, to }: { nodes: Node[]; approved: boolean; known: boolean; openId: string; to: DashTarget }) {
  const folds = nodes.filter((n): n is Fold => n.type === "fold");
  const rows = nodes.filter((n) => n.type !== "fold");
  return (
    <>
      {rows.length ? <RowList nodes={rows} approved={approved} to={to} /> : null}
      {folds.length ? (
        <ul>
          {folds.map((f) => (
            <FoldView key={f.id} f={f} approved={approved} known={known} openId={openId} to={to} />
          ))}
        </ul>
      ) : null}
    </>
  );
}

function FoldView({ f, approved, known, openId, to }: { f: Fold; approved: boolean; known: boolean; openId: string; to: DashTarget }) {
  const first = f.level === 1;
  // A month (level 3) sends no rows. The page opens the month in openId on the server (the link "Show this month" and the search of a month).
  if (f.lazy) {
    // Unit VW77e: the fold of a book (f.toc) loads its table of contents when it opens. The row of the book shows above the rows (the head, as in a year fold).
    const head = f.toc && f.head ? (
      <ul className="mb-2 grid gap-2">
        <WorkItem r={f.head} approved={approved} compact={false} to={to} />
      </ul>
    ) : undefined;
    return (
      <li id={f.id}>
        <ReaderMonth id={f.id} level={f.level} summary={<Summary f={f} known={known} to={to} />} initial={f.id === openId ? f.children : null} approved={approved} kind={f.toc ? "toc" : "month"} head={head} to={to} />
      </li>
    );
  }
  return (
    <li className={first ? "mb-3" : ""}>
      <details open={first} data-fold={f.id} data-fold-level={f.level} className="rounded border border-line bg-white/60">
        <summary className="flex min-h-[44px] cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-0 px-3 py-2 md:min-h-0">
          <Summary f={f} known={known} to={to} />
        </summary>
        <div className="px-3 pb-3">
          {f.head ? (
            <ul className="mb-2 grid gap-2">
              <WorkItem r={f.head} approved={approved} compact={false} to={to} />
            </ul>
          ) : null}
          <NodeList nodes={f.children} approved={approved} known={known} openId={openId} to={to} />
        </div>
      </details>
    </li>
  );
}

export default function ReaderList({ dash, approved, openId, to = "read" }: { dash: Dashboard; approved: boolean; openId: string; to?: DashTarget }) {
  const known = dash.visible.every((w) => w.known);
  return (
    <ul data-book-list data-folds data-dash-target={to}>
      {dash.folds.map((f) => (
        <FoldView key={f.id} f={f} approved={approved} known={known} openId={openId} to={to} />
      ))}
    </ul>
  );
}
