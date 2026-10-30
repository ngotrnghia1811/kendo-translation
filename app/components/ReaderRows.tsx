import Link from "next/link";
import { progressLine } from "@/lib/reader-translated";
import { digitsOf, type ArticleRow, type LineRow, type Node, type WorkRow } from "@/lib/reader-folds";
import { readHref } from "@/lib/reader-links";
import { pageLabel } from "@/lib/reader-types";

/*
 * The rows of the Reader dashboard (unit RC4, round 70): a work, a magazine article, and a chapter line.
 * No "use client" marker and no server code, so the server component ReaderList and the client component ReaderMonth both use them.
 * A row shows the English title (a link to the book screen), the Japanese title, the author, the year, the page count, the progress line,
 * and one link to the text: "Continue at Page N" when the account has a saved place, else "Start at Page N" (the first translated page).
 * A reader who waits for approval sees the same rows with no link to a page (VISION-viewer l93-94: "Dashboard index, no text").
 * Unit RC5 (round 72, round 71 answer 4): an article row and a chapter line show the same full form as a work row, "English: 2 of 3 pages translated (66.7 percent)".
 * They show it only when the count is above 0. A zero is ambiguous here: a reader who waits for approval, and a database without migration 1793300010,
 * give 0 for every row because the counts are not readable (a work row hides its line then, by w.known). An article row and a chapter line have no such flag.
 */

/** Number of pages of an article or a chapter: pageEnd - pageStart + 1. A missing range (page 0) gives 0, and then the count of translated pages is 0 too. */
function rangePages(from: number, to: number): number {
  return from > 0 && to >= from ? to - from + 1 : 0;
}

/** The one link of a row to the text, or null (round 69 answer 8 gives the meaning of the first translated page). */
function textLink(r: WorkRow, approved: boolean): { href: string; label: string; kind: "resume" | "start" } | null {
  if (!approved) return null;
  const digits = digitsOf(r.pages);
  if (r.work.resumeAt) return { href: readHref(r.work.slug, "page", r.work.resumeAt, digits), label: `Continue at ${pageLabel(r.work.resumeAt)}`, kind: "resume" };
  if (r.start) return { href: readHref(r.work.slug, "page", r.start, digits), label: `Start at ${pageLabel(r.start)}`, kind: "start" };
  return null;
}

export function WorkItem({ r, approved, compact }: { r: WorkRow; approved: boolean; compact: boolean }) {
  const w = r.work;
  const title = w.titleEn || w.titleJa || `Web article ${w.slug}`;
  const link = textLink(r, approved);
  const facts = [w.author, w.kind === "web-article" ? w.webDate : w.year, w.kind === "web-article" ? "" : r.pages ? `${r.pages} pages` : ""].filter(Boolean).join(" · ");
  return (
    <li data-book={w.slug} data-kind={w.kind} className={compact ? "border-b border-line/60 py-2" : "rounded border border-line bg-white p-3"}>
      <p className={compact ? "font-medium leading-snug" : "text-base font-semibold leading-snug"}>
        <Link href={`/read/${encodeURIComponent(w.slug)}`} className="hover:underline" data-book-link>
          {title}
        </Link>
        {w.titleJa && w.titleEn ? (
          <span lang="ja" className="font-ja ml-2 text-sm font-normal text-muted">
            {w.titleJa}
          </span>
        ) : null}
      </p>
      {facts ? <p className="text-sm text-muted">{facts}</p> : null}
      <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        {w.known ? <span data-progress>{progressLine(r.translated, r.pages)}</span> : null}
        {link ? (
          <Link href={link.href} className="inline-flex min-h-[44px] items-center text-accent underline md:min-h-0" {...(link.kind === "resume" ? { "data-resume": "" } : { "data-start": "" })}>
            {link.label}
          </Link>
        ) : null}
      </p>
    </li>
  );
}

export function ArticleItem({ a, approved }: { a: ArticleRow; approved: boolean }) {
  const title = a.titleEn || a.titleJa;
  const range = a.pageEnd > a.pageStart ? `pages ${a.pageStart}-${a.pageEnd}` : `page ${a.pageStart}`;
  return (
    <li data-article={`${a.book}/${a.order}`} className="flex flex-wrap items-baseline gap-x-2 border-b border-line/60 py-1 text-sm">
      {approved && a.pageStart > 0 ? (
        <Link href={readHref(a.book, "page", a.pageStart, a.digits)} className="text-accent underline" data-article-link>
          {title}
        </Link>
      ) : (
        <span>{title}</span>
      )}
      {a.titleJa && a.titleEn ? (
        <span lang="ja" className="font-ja text-muted">
          {a.titleJa}
        </span>
      ) : null}
      <span className="text-muted">{range}</span>
      {a.translated ? <span className="text-muted" data-article-progress>{progressLine(a.translated, rangePages(a.pageStart, a.pageEnd))}</span> : null}
    </li>
  );
}

export function LineItem({ l }: { l: LineRow }) {
  return (
    <li className="border-b border-line/60 py-1 text-sm text-muted" data-chapter-line>
      {l.label}, pages {l.pageStart}-{l.pageEnd}
      {l.translated ? <span data-line-progress>{`, ${progressLine(l.translated, rangePages(l.pageStart, l.pageEnd))}`}</span> : null}
    </li>
  );
}

/** The rows of a month (articles, web articles, chapter lines). A month holds no fold. */
export function RowList({ nodes, approved }: { nodes: Node[]; approved: boolean }) {
  return (
    <ul>
      {nodes.map((n) => {
        if (n.type === "work") return <WorkItem key={n.work.slug} r={n} approved={approved} compact />;
        if (n.type === "article") return <ArticleItem key={`${n.book}/${n.order}`} a={n} approved={approved} />;
        if (n.type === "line") return <LineItem key={n.label + n.pageStart} l={n} />;
        return null;
      })}
    </ul>
  );
}
