import { Fragment } from "react";
import Link from "next/link";
import type { BookRow } from "@/lib/types";
import { pageHref } from "@/lib/format";
import { VerdictPill } from "./Pills";
import BookDetails from "./BookDetails";
import { RawId } from "./Named";
import { bookNames } from "@/lib/htv-titles";
import { capFirst, pageNumberText } from "@/lib/readable-names"; // Unit VW96 (Q-A 3:17.4): "Page 1" in place of the bare "p001", the folder name in small grey text.

// Round 44 answer 13 (Q-A l142), tab Books: every book with metadata (title, author, publisher, year, confidence, page count)
// and the pages that have run folders. Web articles with runs sit in the separate group "Articles".
// Round 47 answer 13 (Q-A 2026-10-27 l35): "Books tab shows all metadata". Each row has a closed details part with every key of its
// metadata row, in groups. A magazine year also lists its month chapters, and each chapter opens to its articles. The tab stays read only.
// Round 48 answer 9 (Q-A 2026-10-27 l55): the details part loads on request (components/BookDetails.tsx, /api/books/<id>), so this page stays small.
// A chapter also shows the web candidates and the link_status of the web articles that point at it.
// [agent inference] Rows with runs come first, so the owner finds the readable pages without scrolling past 30 empty books.
export default function BooksView({ rows }: { rows: BookRow[] }) {
  const books = rows.filter((r) => r.group !== "article");
  const articles = rows.filter((r) => r.group === "article");
  const sorted = [...books].sort((a, b) => Number(b.pagesWithRuns.length > 0) - Number(a.pagesWithRuns.length > 0));
  const withRuns = books.filter((b) => b.pagesWithRuns.length > 0).length;
  return (
    <section className="space-y-8">
      <div>
        <div className="mb-3 flex items-baseline gap-4">
          <h1 className="text-xl font-semibold">Books</h1>
          <span className="text-sm text-muted">
            {books.length} books and magazine years, {withRuns} with run folders
          </span>
        </div>
        <BookTable rows={sorted} />
      </div>
      <div>
        <div className="mb-3 flex items-baseline gap-4">
          <h2 className="section-band text-lg font-semibold">Articles</h2>
          <span className="text-sm text-muted">{articles.length} web articles with run folders</span>
        </div>
        {articles.length === 0 ? <p className="text-muted">No article has a run folder.</p> : <BookTable rows={articles} />}
      </div>
    </section>
  );
}

const names = (r: BookRow) => bookNames(r.id, r.titleEn, r.titleJa);

function BookTable({ rows }: { rows: BookRow[] }) {
  return (
    <div className="overflow-x-auto rounded border border-line bg-white">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2" title="The folder name of the book or article. The title is in the next column.">
              Folder name
            </th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Author</th>
            <th className="px-3 py-2">Publisher</th>
            <th className="px-3 py-2 text-right">Year</th>
            <th className="px-3 py-2">Confidence</th>
            <th className="px-3 py-2 text-right">Pages</th>
            <th className="px-3 py-2">Pages with runs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.id}>
            <tr className="border-t border-line align-top hover:bg-stone-50">
              <td className="px-3 py-2">
                <RawId>{r.id}</RawId>
              </td>
              <td className="px-3 py-2" title={names(r).hover || undefined}>
                {/* Unit VW111 (Q-A 3:76.1 row b, Q-A 3:73.2 "English, Japanese below"): the English title is the main text, the Japanese title is below it in small gray text, the folder name is the hover text. */}
                {names(r).main === r.id ? (
                  <span className="text-muted">–</span>
                ) : (
                  <>
                    <div className={names(r).mainLang === "ja" ? "font-ja" : ""} lang={names(r).mainLang || undefined} data-book-title>
                      {names(r).main}
                    </div>
                    {names(r).sub ? (
                      <div className="font-ja text-xs text-muted" lang="ja">
                        {names(r).sub}
                      </div>
                    ) : null}
                  </>
                )}
              </td>
              <td className="px-3 py-2 font-ja">{r.author || <span className="text-muted">–</span>}</td>
              <td className="px-3 py-2 font-ja">{r.publisher || <span className="text-muted">–</span>}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.year ?? "–"}</td>
              <td className="px-3 py-2">{r.confidence ? <Confidence value={r.confidence} /> : <span className="text-muted">–</span>}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.pages ?? "–"}</td>
              <td className="px-3 py-2">
                {r.pagesWithRuns.length === 0 ? (
                  <span className="text-muted">none</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {r.pagesWithRuns.map((p) => (
                      <Link
                        key={p.pageId}
                        href={pageHref(p.pageId, p.runFolder)}
                        className="inline-flex items-center gap-1.5 rounded border border-line px-2 py-0.5 text-xs hover:border-accent"
                      >
                        <span title={`Page folder ${p.pageName}`}>{capFirst(pageNumberText(p.pageName))}</span>
                        <VerdictPill verdict={p.verdict} score={p.score} />
                      </Link>
                    ))}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td colSpan={8} className="px-3 pb-2 pt-0">
                <BookDetails id={r.id} group={r.group} hasMeta={r.hasMeta} chapterCount={r.chapterCount} />
              </td>
            </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Confidence({ value }: { value: string }) {
  const cls = value === "high" ? "text-green-800" : value === "low" ? "text-red-700" : "text-stone-700";
  return <span className={cls}>{value}</span>;
}
