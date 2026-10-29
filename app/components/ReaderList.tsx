import Link from "next/link";
import { shortSynopsis } from "@/lib/reader-data";
import { LABEL_SYNOPSIS, pageLabel, type ReaderBookCard } from "@/lib/reader-types";
import { readHref } from "@/lib/reader-links";
import { idDigits } from "@/lib/htv-books";

/*
 * Book list of the reader pages (unit RC1, round 63 answer 9, Q-A 2026-10-28 l291: "36 books with metadata").
 * One card for each row of catalog_items: the 36 book folders and the web article 18d4ac29 (37 rows). No cover.
 * A card shows the English title, the Japanese title, the author, the year, the page count, a short synopsis with the AI note,
 * the share of pages with an agent translation, and "Continue at Page N" when the account has a saved place.
 * A field that is empty does not show. Server component: the list needs no script.
 */
export default function ReaderList({ cards, approved }: { cards: ReaderBookCard[]; approved: boolean }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-book-list>
      {cards.map((c) => {
        const pages = Math.max(c.pages, 0);
        return (
          <li key={c.slug} data-book={c.slug} className="flex flex-col rounded border border-line bg-white p-4">
            <h2 className="text-lg font-semibold leading-snug">
              <Link href={`/read/${encodeURIComponent(c.slug)}`} className="hover:underline" data-book-link>
                {c.titleEn || c.titleJa || `Web article ${c.slug}`}
              </Link>
            </h2>
            {c.titleJa && c.titleEn ? (
              <p lang="ja" className="font-ja text-sm text-muted">
                {c.titleJa}
              </p>
            ) : null}
            <p className="mt-1 text-sm text-muted">{[c.author, c.year, pages ? `${pages} pages` : ""].filter(Boolean).join(" · ")}</p>
            {c.synopsis ? (
              <p className="mt-2 text-sm" data-synopsis>
                {shortSynopsis(c.synopsis)} <span className="ml-1 whitespace-nowrap rounded bg-stone-200 px-1.5 py-0.5 text-[11px] font-medium text-stone-700">{LABEL_SYNOPSIS}</span>
              </p>
            ) : null}
            <div className="mt-auto pt-3 text-sm">
              {approved ? <p data-progress>AI translation: {c.withText} of {pages} pages</p> : null}
              {approved && c.resumeAt ? (
                <Link href={readHref(c.slug, "page", c.resumeAt, idDigits(pages))} className="mt-1 inline-block text-accent underline" data-resume>
                  Continue at {pageLabel(c.resumeAt)}
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
