"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parsePageNumber } from "@/lib/htv-format";
import { chapterHeading, pad, readHref, type ReaderView } from "@/lib/reader-links";
import { NO_TEXT, type ReaderChapter } from "@/lib/reader-types";

/*
 * Index of a book on the reader pages (unit RC1, round 63 answer 9, Q-A 2026-10-28 l291): month headings, every page, and "Go to page".
 * Round 58 answer 3 (l201): all pages are listed. A page without reader text shows "No agent translation yet" (full list) or a quiet mark (side index).
 * The page name is the file number: "Page 48" (round 62 answer 10).
 */
export default function ReaderIndex({
  slug,
  pages,
  digits,
  textPages,
  checkedPages,
  chapters,
  current,
  view,
  dense,
  onNavigate,
}: {
  slug: string;
  pages: number;
  digits: number;
  textPages: number[];
  checkedPages: number[];
  chapters: ReaderChapter[];
  current: number | null;
  view: ReaderView;
  /** Side index: one short line for each page. The full list shows the words "No agent translation yet". */
  dense: boolean;
  /** Called after a click on a page, so that a sheet on a phone can close. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const withText = new Set(textPages);
  const checked = new Set(checkedPages);
  const starts = new Map<number, ReaderChapter>();
  for (const c of chapters) if (c.pageStart >= 1 && c.pageStart <= pages && !starts.has(c.pageStart)) starts.set(c.pageStart, c);

  function go() {
    const n = parsePageNumber(value, pages);
    if (n === null) {
      setNote(`No such page. This book has pages 1 to ${pages}.`);
      return;
    }
    setNote("");
    onNavigate?.();
    router.push(readHref(slug, view, n, digits));
  }

  const nums = Array.from({ length: pages }, (_, i) => i + 1);
  return (
    <div data-reader-index>
      <form
        className="mb-2"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <label className="block text-xs text-muted" htmlFor={`go-${dense ? "side" : "full"}`}>
          Go to page
        </label>
        <div className="mt-0.5 flex gap-1">
          <input
            id={`go-${dense ? "side" : "full"}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`1 to ${pages}`}
            inputMode="numeric"
            data-go-to-page
            className="min-h-[44px] w-full min-w-0 rounded border border-line bg-white px-2 text-sm placeholder:text-muted md:min-h-0 md:px-1.5 md:py-0.5"
          />
          <button type="submit" className="min-h-[44px] rounded border border-line px-3 text-sm md:min-h-0 md:px-2">
            Go
          </button>
        </div>
        {note ? (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {note}
          </p>
        ) : null}
      </form>
      <ul data-index-list>
        {nums.map((n) => {
          const ch = starts.get(n);
          const has = withText.has(n);
          return (
            <li key={n}>
              {ch ? (
                <p className="mt-2 border-t border-line pt-1 text-xs font-semibold uppercase tracking-wide text-muted" data-index-chapter={n}>
                  {chapterHeading(ch)} <span className="font-normal normal-case">(Pages {ch.pageStart} to {ch.pageEnd})</span>
                </p>
              ) : null}
              <Link
                href={readHref(slug, view, n, digits)}
                onClick={onNavigate}
                data-index-page={`p${pad(n, digits)}`}
                data-has-text={has ? "yes" : "no"}
                aria-current={current === n ? "location" : undefined}
                className={"flex min-h-[44px] items-center justify-between gap-2 rounded px-1.5 py-0.5 text-sm hover:bg-stone-100 md:min-h-0 " + (current === n ? "bg-stone-200 font-semibold" : "")}
              >
                <span>Page {n}</span>
                {has ? (
                  <span className="text-xs text-green-800" data-index-tag="text">
                    {dense ? "AI" : checked.has(n) ? "AI translation, checked by a person" : "AI translation"}
                  </span>
                ) : dense ? null : (
                  <span className="text-xs text-muted" data-index-tag="none">
                    {NO_TEXT}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
