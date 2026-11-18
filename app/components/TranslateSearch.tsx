import Link from "next/link";
import { rowOf } from "@/lib/reader-folds";
import type { TranslateSearch as SearchHits } from "@/lib/translate-dash-load";
import TranslateWork from "./TranslateWork";

/*
 * Unit VW112 (round 98, Q-A 3:78.4 row 4): the search results of the human translation view /translate.
 * The box is the GET form of the Reader dashboard (components/ReaderSearch.tsx SearchBox, action "/translate").
 * A hit is a work row. Its title opens /translate/<book>. The search reads the titles and the metadata of the visible works only
 * (lib/reader-folds.ts matchWorks), not the page text [unit default VW112]. Hidden works do not show, as on /read.
 */
export const TRANSLATE_SEARCH_HINT = "Search titles, authors, publishers, and dates (seme, Chūzumi, 攻め)";

export default function TranslateSearch({ search }: { search: SearchHits }) {
  const n = search.hits.length;
  return (
    <section aria-label="Search results" data-search-results>
      <p className="mb-2 text-sm" role="status" data-search-summary>
        Search: <strong>{search.query}</strong>
        {" · "}
        {n} {n === 1 ? "work" : "works"} by title or metadata
        {" · "}
        <Link href="/translate" className="text-accent underline" data-search-clear>
          Clear search
        </Link>
      </p>
      {n === 0 ? <p className="text-sm text-muted">No work matches by title or metadata.</p> : null}
      <ul className="grid gap-2">
        {search.hits.map((w) => (
          <TranslateWork key={w.slug} r={rowOf(w)} compact={false} />
        ))}
      </ul>
    </section>
  );
}
