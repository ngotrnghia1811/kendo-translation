import Link from "next/link";
import type { WorkRow } from "@/lib/reader-folds";
import { bookNames } from "@/lib/htv-titles";
import { agentLine, metadataLine, monitorText, translateHref } from "@/lib/translate-dash";

/*
 * Unit VW112 (round 98, plan P47): one work row of the fold tree on the human translation view /translate. Q-A 3:78.4 row 2 and the owner note:
 * "Also so the metadata of the books in the dashboard (for /translate, also show the monitor metadata)".
 * The title rule of the old book list stays (Q-A 3:72.2, 3:73.2, 3:74.3): the English title is the link, the Japanese title is small gray text below,
 * the file name shows on hover, and in small gray text only for a row in a group of equal titles.
 * Lines: title, Japanese title, file name (equal titles only), metadata, "Agent translation: n of m pages", Monitor facts (files mode only).
 * No "use client" marker and no server code, so the month fold (a client component) draws it too.
 */
export default function TranslateWork({ r, compact }: { r: WorkRow; compact: boolean }) {
  const w = r.work;
  const names = bookNames(w.slug, w.titleEn, w.titleJa);
  const staff = w.staff;
  const opens = staff?.opens ?? false;
  const meta = metadataLine(w, r.pages);
  const titleClass = "inline-flex min-h-[44px] items-center md:min-h-0";
  const title = (
    <span lang={names.mainLang || undefined} className={names.mainLang ? "font-ja" : undefined}>
      {names.main}
    </span>
  );
  return (
    <li data-book={w.slug} data-kind={w.kind} data-translate-work className={compact ? "border-b border-line/60 py-2" : "rounded border border-line bg-white p-3"}>
      <p className={compact ? "font-medium leading-snug" : "text-base font-semibold leading-snug"}>
        {opens ? (
          <Link href={translateHref(w.slug)} title={names.hover || undefined} className={`${titleClass} text-accent underline`} data-book-link data-book-title>
            {title}
          </Link>
        ) : (
          <span title={names.hover || undefined} className={titleClass} data-book-title data-no-screen>
            {title}
          </span>
        )}
      </p>
      {names.sub ? (
        <p lang="ja" className="font-ja text-xs text-muted" data-book-title-ja>
          {names.sub}
        </p>
      ) : null}
      {staff?.showFile ? (
        <p className="text-xs text-muted" data-book-file>
          {w.slug}
        </p>
      ) : null}
      {meta ? (
        <p className="text-sm text-muted" data-book-meta>
          {meta}
        </p>
      ) : null}
      <p className="text-sm" data-agent-line>
        {agentLine(r.translated, r.pages)}
      </p>
      {staff?.monitor ? (
        <p className="text-sm text-muted" data-monitor-facts={staff.monitor.source}>
          {monitorText(staff.monitor)}
        </p>
      ) : null}
    </li>
  );
}
