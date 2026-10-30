import Link from "next/link";
import { rowOf } from "@/lib/reader-folds";
import { WorkItem } from "./ReaderList";
import { readHref } from "@/lib/reader-links";
import { pageLabel, SEARCH_NEEDS_S2, SEARCH_WAITING } from "@/lib/reader-types";
import type { SearchView } from "@/lib/reader-data";

/*
 * Search of the Reader dashboard (unit RC4, round 70). VISION-viewer 15.23.4. Round 68 answer 3: "Folds and search together".
 * The box is a GET form to /read?q=seme, so the page needs no script. The server draws the result list.
 * The folds of the page text come from the columns search_en and search_ja of reader_pages (round 69 answer 10).
 */

export const SEARCH_HINT = "Search titles, authors, and text (seme, Chūzumi, 攻め)";

export function SearchBox({ query }: { query: string }) {
  return (
    <form action="/read" method="get" role="search" className="mb-3 flex flex-wrap gap-2" data-search-form>
      <label htmlFor="read-q" className="sr-only">
        {SEARCH_HINT}
      </label>
      <input
        id="read-q"
        name="q"
        type="search"
        defaultValue={query}
        placeholder={SEARCH_HINT}
        maxLength={80}
        autoComplete="off"
        data-search-input
        className="min-h-[44px] min-w-0 flex-1 rounded border border-line bg-white px-3 py-1 placeholder:text-muted md:min-h-0"
      />
      <button type="submit" data-search-submit className="min-h-[44px] rounded border border-line px-4 py-1 font-semibold md:min-h-0">
        Search
      </button>
    </form>
  );
}

function pageHref(q: string, screen: number): string {
  return `/read?q=${encodeURIComponent(q)}&screen=${screen}`;
}

export default function ReaderSearch({ view, approved }: { view: SearchView; approved: boolean }) {
  const nothing = view.titleHits === 0 && view.pageHits === 0;
  return (
    <section aria-label="Search results" data-search-results>
      <p className="mb-2 text-sm" role="status" data-search-summary>
        Search: <strong>{view.query}</strong>
        {" · "}
        {view.titleHits} {view.titleHits === 1 ? "work" : "works"} by title or author
        {view.pageSearch && approved ? ` · ${view.pageHits}${view.capped ? "+" : ""} ${view.pageHits === 1 ? "page" : "pages"} in ${view.pageWorks} ${view.pageWorks === 1 ? "work" : "works"} by text` : ""}
        {" · "}
        <Link href="/read" className="text-accent underline" data-search-clear>
          Clear search
        </Link>
      </p>
      {view.waiting ? (
        <p className="mb-2 text-sm text-muted" data-search-note="waiting">
          {SEARCH_WAITING}
        </p>
      ) : null}
      {!view.pageSearch && !view.waiting ? (
        <p className="mb-2 text-sm text-muted" data-search-note="needs-s2">
          {SEARCH_NEEDS_S2}
        </p>
      ) : null}
      {nothing ? <p className="text-sm text-muted">{view.pageSearch && !view.waiting ? "No match." : "No work matches by title or author."}</p> : null}
      <ul className="grid gap-2">
        {view.items.map((it) =>
          it.type === "work" ? (
            <WorkItem key={it.work.slug} r={rowOf(it.work)} approved={approved} compact={it.work.kind === "web-article"} />
          ) : (
            <li key={`${it.slug}/${it.n}`} data-hit-page={`${it.slug}/p${String(it.n).padStart(it.digits, "0")}`} className="rounded border border-line bg-white p-3">
              <p className="font-semibold">
                <Link href={readHref(it.slug, "page", it.n, it.digits)} className="text-accent underline" data-hit-link>
                  {it.title} · {pageLabel(it.n)}
                </Link>
              </p>
              {it.snippet ? (
                <p className="text-sm" data-snippet>
                  {it.snippet.before}
                  <mark className="bg-amber-100 text-foreground">{it.snippet.hit}</mark>
                  {it.snippet.after}
                </p>
              ) : it.fallback ? (
                <p className="text-sm text-muted" data-snippet>
                  {it.fallback}…
                </p>
              ) : null}
            </li>
          ),
        )}
      </ul>
      {view.screens > 1 ? (
        <p className="mt-3 flex flex-wrap items-center gap-4 text-sm" data-search-pager>
          {view.screen > 1 ? (
            <Link href={pageHref(view.query, view.screen - 1)} className="text-accent underline">
              ‹ Previous
            </Link>
          ) : null}
          <span>
            Screen {view.screen} of {view.screens}
          </span>
          {view.screen < view.screens ? (
            <Link href={pageHref(view.query, view.screen + 1)} className="text-accent underline" data-search-next>
              Next ›
            </Link>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
