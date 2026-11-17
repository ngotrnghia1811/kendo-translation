import Link from "next/link";
import type { HtvBookRow } from "@/lib/htv-types";
import { Pane, PaneCog } from "./PaneSettings";

// Book list of the human-translation-view (unit UXC step D, round 59). Round 59 answer 4 (Q-A 2026-10-28 l222): the list shows the books
// that have a finished run until the owner decides (constant BOOK_LIST_MODE in lib/htv-books.ts). One click opens the book screen with all pages.
// Unit UXC2 (round 61 answer 6, Q-A l266): the list holds the 36 book folders and the web article that has a run. A book with no agent translation opens too.
// Round 61 answer 5 (l265): the list keeps one cog in its own header.
export default function HtvList({ rows }: { rows: HtvBookRow[] }) {
  const tagged = rows.reduce((s, r) => s + r.tagged, 0);
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
            <th className="pr-4">Name</th>
            <th className="pr-4">Pages</th>
            <th className="pr-4">Pages with an agent translation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className="border-b border-line/60" data-book={r.slug} data-pages={r.pages} data-tagged={r.tagged}>
              <td className="py-1.5 pr-4">
                <Link href={`/translate/${encodeURIComponent(r.slug)}`} className="font-medium text-accent underline">
                  {r.title || r.slug}
                </Link>
              </td>
              {/* Unit VW108 (Q-A 3:71.3 row 2): a slug such as ki_breath_full_clean has no break point and held the column at 145 px, so the table
                  needed 436 px at 390 px screen width. break-all lets the slug wrap at any letter, so the table fits its box. */}
              <td className="pr-4 font-mono text-xs break-all">{r.slug}</td>
              <td className="pr-4">{r.pages || <span className="text-muted">–</span>}</td>
              <td className="pr-4">{r.tagged}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </Pane>
    </div>
  );
}
