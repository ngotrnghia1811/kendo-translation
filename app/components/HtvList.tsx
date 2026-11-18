import Link from "next/link";
import type { HtvBookRow } from "@/lib/htv-types";
import { Pane, PaneCog } from "./PaneSettings";
import { bookNames, equalTitleSlugs } from "@/lib/htv-titles";

// Book list of the human-translation-view (unit UXC step D, round 59). Round 59 answer 4 (Q-A 2026-10-28 l222): the list shows the books
// that have a finished run until the owner decides (constant BOOK_LIST_MODE in lib/htv-books.ts). One click opens the book screen with all pages.
// Unit UXC2 (round 61 answer 6, Q-A l266): the list holds the 36 book folders and the web article that has a run. A book with no agent translation opens too.
// Round 61 answer 5 (l265): the list keeps one cog in its own header.
export default function HtvList({ rows }: { rows: HtvBookRow[] }) {
  const tagged = rows.reduce((s, r) => s + r.tagged, 0);
  // Unit VW110 (Q-A 3:74.3): the groups of equal titles come from the rows of this list, not from a fixed list.
  const sameTitle = equalTitleSlugs(rows);
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Books for human translation</h1>
        <PaneCog id="list" />
      </div>
      <p className="mt-1 text-sm text-muted" data-book-list-facts>
        {rows.length} books. {tagged} pages have an agent translation. A book opens as one screen with all of its pages. A book with no agent translation shows its page numbers and the tag &quot;No agent translation&quot;. A page shows its newest finished run, or the run that the admin marked.
      </p>
      <Pane id="list" className="mt-3">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="py-1.5 pr-4">Book</th>
            <th className="pr-4">Pages</th>
            <th className="pr-4">Pages with an agent translation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const n = bookNames(r.slug, r.titleEn, r.titleJa);
            return (
              <tr key={r.slug} className="border-b border-line/60" data-book={r.slug} data-pages={r.pages} data-tagged={r.tagged}>
                {/* Unit VW109 (Q-A 3:73.2 "English, Japanese below"): one Book column. The English title is the link, the Japanese title is small gray text below it,
                    and the file name (the slug) shows on hover only. The Name column of unit VW108 is gone, so its break-all stopgap is gone too.
                    An item with no title shows the file name (Q-A 3:73.3 row 3). */}
                <td className="py-1.5 pr-4">
                  <Link href={`/translate/${encodeURIComponent(r.slug)}`} className="font-medium text-accent underline" title={n.hover || undefined} lang={n.mainLang || undefined} data-book-title>
                    {n.main}
                  </Link>
                  {sameTitle.has(r.slug) ? (
                    /* Unit VW110 (Q-A 3:74.3 "File name for equal titles"): this row has the same shown title as at least one other row.
                       Its file name shows in small gray text after the Japanese title. A row with a unique title shows no file name. */
                    <div className="text-xs text-muted" data-book-sub>
                      {n.sub ? (
                        <span lang="ja" data-book-title-ja>
                          {n.sub}
                        </span>
                      ) : null}
                      {n.sub ? " " : null}
                      <span className="break-words" lang="en" data-book-file>
                        {r.slug}
                      </span>
                    </div>
                  ) : n.sub ? (
                    <div className="text-xs text-muted" lang="ja" data-book-title-ja>
                      {n.sub}
                    </div>
                  ) : null}
                </td>
                <td className="pr-4">{r.pages || <span className="text-muted">–</span>}</td>
                <td className="pr-4">{r.tagged}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </Pane>
    </div>
  );
}
