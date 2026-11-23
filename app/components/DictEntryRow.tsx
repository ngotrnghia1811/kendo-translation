// Unit VW126 (Q-A 3:117.6 row 4): one entry of a list. It shows the headword, the reading, the romaji, the EN form, and the short English explanation.
// The page /dictionary and the Dictionary tab of /search use it. The words that hold the query are marked in yellow (the same SearchMarked as the search page).
// No hook, so a server page and a client component can both use it. A click on the headword opens the full entry.
import Link from "next/link";
import SearchMarked from "./SearchMarked";
import type { DictItemView } from "@/lib/dictionary-core";

export default function DictEntryRow({ item }: { item: DictItemView }) {
  return (
    <li data-dict-entry={item.id} className="rounded border border-line bg-white p-3">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <Link href={item.href} prefetch={false} lang="ja" className="font-ja text-lg font-semibold text-accent underline" data-dict-link>
          <SearchMarked parts={item.headword} />
        </Link>
        {item.reading.length ? (
          <span lang="ja" className="font-ja text-muted" data-dict-reading>
            <SearchMarked parts={item.reading} />
          </span>
        ) : null}
        {item.romaji.length ? (
          <span className="font-serif italic" data-dict-romaji>
            <SearchMarked parts={item.romaji} />
          </span>
        ) : null}
        {item.common === "common" ? (
          <span className="rounded border border-line px-1 text-xs text-muted" data-dict-common>
            common
          </span>
        ) : null}
      </p>
      {item.conciseEn.length ? (
        <p className="mt-1 text-sm font-medium" data-dict-en>
          <SearchMarked parts={item.conciseEn} />
        </p>
      ) : null}
      {item.shortEn.length ? (
        <p className="text-sm text-muted" data-dict-short>
          <SearchMarked parts={item.shortEn} />
        </p>
      ) : null}
    </li>
  );
}
