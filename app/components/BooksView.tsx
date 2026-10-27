import { Fragment } from "react";
import Link from "next/link";
import type { BookRow, ChapterRow } from "@/lib/types";
import { pageHref } from "@/lib/format";
import { pageRange } from "@/lib/chapters";
import { describeValue, groupMetadata } from "@/lib/meta-fields";
import { VerdictPill } from "./Pills";

// Round 44 answer 13 (Q-A l142), tab Books: every book with metadata (title, author, publisher, year, confidence, page count)
// and the pages that have run folders. Web articles with runs sit in the separate group "Articles".
// Round 47 answer 13 (Q-A 2026-10-27 l35): "Books tab shows all metadata". Each row has a closed details part with every key of its
// metadata row, in groups. A magazine year also lists its month chapters, and each chapter opens to its articles. The tab stays read only.
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
          <h2 className="text-lg font-semibold">Articles</h2>
          <span className="text-sm text-muted">{articles.length} web articles with run folders</span>
        </div>
        {articles.length === 0 ? <p className="text-muted">No article has a run folder.</p> : <BookTable rows={articles} />}
      </div>
    </section>
  );
}

function BookTable({ rows }: { rows: BookRow[] }) {
  return (
    <div className="overflow-x-auto rounded border border-line bg-white">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2">Book</th>
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
              <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
              <td className="px-3 py-2">
                <div className="font-ja">{r.titleJa || <span className="text-muted">–</span>}</div>
                {r.titleEn ? <div className="text-xs text-muted">{r.titleEn}</div> : null}
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
                        <span className="font-mono">{p.pageName}</span>
                        <VerdictPill verdict={p.verdict} score={p.score} />
                      </Link>
                    ))}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td colSpan={8} className="px-3 pb-2 pt-0">
                <Details row={r} />
              </td>
            </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DASH = <span className="text-muted">–</span>;

function Details({ row }: { row: BookRow }) {
  return (
    <details className="rounded border border-line bg-stone-50/60">
      <summary className="cursor-pointer select-none px-3 py-1 text-xs text-muted hover:text-foreground">
        Details of {row.id}
        {row.group === "magazine" ? " and month chapters" : ""}
      </summary>
      <div className="space-y-4 border-t border-line p-3">
        {row.meta ? <MetaGroups meta={row.meta} /> : <p className="text-sm text-muted">No metadata row for this item.</p>}
        {row.group === "magazine" ? <Chapters rows={row.chapters} /> : null}
      </div>
    </details>
  );
}

function MetaGroups({ meta }: { meta: Record<string, unknown> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groupMetadata(meta).map((g) => (
        <section key={g.id}>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h3>
          <dl className="space-y-1 text-sm">
            {g.entries.map((e) => (
              <div key={e.key} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-2">
                <dt className="font-mono text-xs text-muted">{e.key}</dt>
                <dd className="min-w-0 break-words">
                  <Value value={e.value} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function Value({ value }: { value: unknown }) {
  const d = describeValue(value);
  switch (d.kind) {
    case "empty":
      return DASH;
    case "text":
      return <span className="whitespace-pre-wrap">{d.text}</span>;
    case "list":
      return (
        <ul className="list-disc pl-4">
          {d.items.map((x, k) => (
            <li key={k}>{x}</li>
          ))}
        </ul>
      );
    case "json":
      return (
        <details>
          <summary className="cursor-pointer text-xs text-muted">{d.count} entries</summary>
          <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-line bg-white p-2 text-xs">{d.text}</pre>
        </details>
      );
  }
}

// Month chapters of a magazine year (file item-metadata/magazine-chapters.jsonl from unit M1).
function Chapters({ rows }: { rows: ChapterRow[] | null }) {
  if (rows === null) return <p className="text-sm text-muted">No chapter file yet.</p>;
  if (rows.length === 0) return <p className="text-sm text-muted">The chapter file has no row for this magazine year.</p>;
  const title = rows.find((c) => c.bookTitleEn)?.bookTitleEn;
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Month chapters ({rows.length})</h3>
      {title ? <p className="mb-2 text-sm font-medium">{title}</p> : null}
      <ul className="space-y-1">
        {rows.map((c) => (
          <li key={c.chapter} className="rounded border border-line bg-white">
            <details>
              <summary className="cursor-pointer px-3 py-1 text-sm">
                <span className="font-medium">{c.chapterTitleEn || c.chapter}</span>
                {c.chapterTitleJa ? <span className="font-ja ml-2 text-xs text-muted">{c.chapterTitleJa}</span> : null}
                <span className="ml-3 text-xs text-muted">
                  {pageRange(c.pageStart, c.pageEnd)}, {c.articleCount} {c.articleCount === 1 ? "article" : "articles"}
                </span>
              </summary>
              <Articles chapter={c} />
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Articles({ chapter }: { chapter: ChapterRow }) {
  if (chapter.articles.length === 0) return <p className="border-t border-line px-3 py-2 text-xs text-muted">No article in this chapter.</p>;
  return (
    <table className="w-full border-t border-line text-xs">
      <thead className="text-left uppercase tracking-wide text-muted">
        <tr>
          <th className="px-3 py-1">Order</th>
          <th className="px-3 py-1">Series</th>
          <th className="px-3 py-1">Title</th>
          <th className="px-3 py-1">Pages</th>
        </tr>
      </thead>
      <tbody>
        {chapter.articles.map((a, k) => (
          <tr key={k} className="border-t border-line align-top">
            <td className="px-3 py-1 tabular-nums">{a.order ?? "–"}</td>
            <td className="px-3 py-1 font-ja">{a.seriesJa || DASH}</td>
            <td className="px-3 py-1">
              <div className="font-ja">{a.titleJa || DASH}</div>
              <div className="text-muted">
                {a.titleEn || DASH}
                {a.titleEnStatus === "draft" ? <span className="ml-1.5 rounded bg-amber-100 px-1.5 text-amber-800">draft</span> : a.titleEnStatus ? <span className="ml-1.5">({a.titleEnStatus})</span> : null}
              </div>
            </td>
            <td className="px-3 py-1 whitespace-nowrap">
              {pageRange(a.pageStart, a.pageEnd)}
              {a.pageGuess ? <span className="ml-1.5 rounded bg-stone-200 px-1.5 text-stone-700">guess</span> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Confidence({ value }: { value: string }) {
  const cls = value === "high" ? "text-green-800" : value === "low" ? "text-red-700" : "text-stone-700";
  return <span className={cls}>{value}</span>;
}
