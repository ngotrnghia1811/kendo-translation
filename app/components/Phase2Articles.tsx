import type { ArticleLine, ArticleStateKey, Phase2ArticlesView } from "@/lib/phase2-articles";
// Unit VW127 (Q-A 3:122.4 rows 1, 6, 8): the article title in the accent color, the page counts bold, the short ID in gray monospace. The texts stay the same.
import { HlCount, HlFailed, HlNumberParts, HlText } from "./HlSpan";
import { ARTICLES_TITLE, ARTICLE_STATE_HELP, TITLES_NOTE, TITLE_NOT_FOUND, articlesCountText, listLabel } from "@/lib/phase2-articles";

// Unit VW94 (round 91). Owner pick Q-A 3:17.4 (2026-11-11): "One grouped row": the 40 articles show as one closed group "Phase 2 articles (40)"
// below the phase 2 row, with the state of each article. Owner note: "Annotate the names intuitively and properly. I cant understand what they are if
// you just write `Running` and each name is a long id number. Apply this for EVERYTHING."
// Each line: the English title, the Japanese title in small grey text, the short ID in grey at the end, the state in plain words, and the pages with links.
// The group is a native <details>, closed at the first paint. The poll of the Monitor dashboard does not close it again (no `open` prop).
// Colors (unit VW99, Q-A 3:27.4): the state colors of components/Pills.tsx, theme variables that scripts/contrast-dark.mjs tests at 7 to 1. Partly keeps its amber pair.

const STATE_STYLE: Record<ArticleStateKey, string> = {
  translating: "bg-state-run text-state-run-ink",
  accepted: "bg-state-ok text-state-ok-ink",
  partly: "bg-amber-100 text-amber-800",
  stopped: "bg-state-stop text-state-stop-ink",
  failed: "bg-state-fail text-state-fail-ink",
  "not-started": "bg-state-wait text-state-wait-ink",
};

const LEGEND_ORDER: ArticleStateKey[] = ["translating", "accepted", "partly", "stopped", "failed", "not-started"];

function ArticleRow({ a }: { a: ArticleLine }) {
  const found = a.name.match === "one";
  const main = found ? (a.name.en ?? a.name.ja ?? TITLE_NOT_FOUND) : TITLE_NOT_FOUND;
  return (
    <li data-phase2-article={a.shortId} data-article-state={a.key} className="border-t border-line px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span data-article-title data-hl={found ? "title" : undefined} className={found ? "hl-title" : "italic text-muted"}>
          {main}
        </span>
        {found && a.name.en && a.name.ja ? (
          <span data-article-title-ja lang="ja" className="text-xs text-muted">
            {a.name.ja}
          </span>
        ) : null}
        <span data-article-id data-hl="folder" className="hl-folder" title="Short ID: the first 8 characters of the item ID of the article">
          {a.shortId}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span data-article-state-text title={ARTICLE_STATE_HELP[a.key]} className={`inline-block rounded-full px-2.5 py-0.5 font-medium whitespace-nowrap ${STATE_STYLE[a.key]}`}>
          {a.stateText}
        </span>
        <span className="text-muted">
          <HlCount>
            {a.pagesTotal} {a.pagesTotal === 1 ? "page" : "pages"}
          </HlCount>
          {a.failVerdicts > 0 ? (
            <>
              , <HlFailed n={a.failVerdicts}>{a.failVerdicts} accepted with verdict FAIL</HlFailed>
            </>
          ) : (
            ""
          )}
          :
        </span>
        {a.pages.map((p) => (
          <span key={p.pageId} data-article-page={p.pageId} data-page-state={p.state}>
            {p.href ? (
              <a href={p.href} className="text-accent underline underline-offset-2" title={`Page view of ${p.pageId}, the page run that the phase 2 run accepted`}>
                {p.label} ({p.verdict ?? "accepted"})
              </a>
            ) : (
              <span className="text-muted">
                {p.label} ({p.state === "translating" ? "translating now" : p.state === "failed" ? "not accepted" : p.state === "accepted" ? "accepted" : "not started"})
              </span>
            )}
          </span>
        ))}
      </div>
    </li>
  );
}

export default function Phase2Articles({ view }: { view: Phase2ArticlesView | null | undefined }) {
  if (!view) return null;
  const n = view.articles.length;
  const count = articlesCountText(view);
  return (
    <details data-phase2-articles className="mt-2 rounded border border-line bg-white text-sm">
      <summary className="cursor-pointer px-3 py-2">
        <span data-phase2-articles-title className="font-semibold">
          {ARTICLES_TITLE} ({n})
        </span>
        {count ? (
          <span data-phase2-articles-count className="text-muted">
            : <HlNumberParts text={count} />
          </span>
        ) : null}
      </summary>
      {view.kind === "no-list" || n === 0 ? (
        <p data-phase2-articles-empty className="border-t border-line px-3 py-2 text-muted">
          no data: no list folder of the phase 2 run exists yet.
        </p>
      ) : (
        <>
          <div className="border-t border-line px-3 py-2 text-xs text-muted">
            <p>
              The articles of the phase 2 run, in the order of the run. Each line shows the English title, the Japanese title, and the short ID.
              {view.runViewHref && view.listStamp ? (
                <>
                  {" "}All pages with their calls and tokens:{" "}
                  <a data-phase2-articles-run-view href={view.runViewHref} className="text-accent underline underline-offset-2">
                    Run view
                  </a>{" "}
                  (<HlText text={listLabel(view.listStamp)} />).
                </>
              ) : null}
            </p>
            <ul data-phase2-articles-legend className="mt-1 list-disc pl-5">
              {LEGEND_ORDER.map((k) => (
                <li key={k}>{ARTICLE_STATE_HELP[k]}</li>
              ))}
            </ul>
            <p className="mt-1">{TITLES_NOTE}</p>
            {view.missingTitles.length > 0 ? <p data-phase2-articles-missing>{`No single title for: ${view.missingTitles.join(", ")}.`}</p> : null}
          </div>
          <ul data-phase2-articles-list>
            {view.articles.map((a) => (
              <ArticleRow key={a.shortId} a={a} />
            ))}
          </ul>
        </>
      )}
    </details>
  );
}
