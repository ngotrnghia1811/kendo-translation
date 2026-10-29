"use client";
import { memo, useState } from "react";
import type { ChapterHead, HtvPageTag } from "@/lib/htv-types";

// Left index of the book screen (unit UXC step D, round 59 answer 4, Q-A 2026-10-28 l222): "Left index with Go to page".
// A column lists the pages with their tags, and the box "Go to page" jumps to a page. Month headings group the pages of a magazine year.

interface Item {
  n: number;
  name: string;
}

const IndexLink = memo(function IndexLink({ item, tag, current }: { item: Item; tag: HtvPageTag | undefined; current: boolean }) {
  return (
    <a
      href={`#${item.name}`}
      data-index-page={item.name}
      aria-current={current ? "location" : undefined}
      className={"flex items-center justify-between rounded px-1.5 py-0.5 text-sm hover:bg-stone-100 " + (current ? "bg-stone-200 font-semibold" : "")}
    >
      <span className="font-mono text-xs">{item.name}</span>
      {tag ? (
        <span className={"text-xs " + (tag.verdict === "PASS" ? "text-green-800" : "text-red-800")} data-index-tag={tag.verdict}>
          {tag.verdict} {tag.score === null ? "" : tag.score.toFixed(1)}
        </span>
      ) : null}
    </a>
  );
});

export default function HtvIndex({
  items,
  tags,
  chapters,
  current,
  pageCount,
  digits,
  onGo,
}: {
  items: Item[];
  tags: Record<number, HtvPageTag>;
  chapters: ChapterHead[];
  current: number;
  pageCount: number;
  digits: number;
  /** Jump to a page number. */
  onGo: (n: number) => void;
}) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const starts = new Map<number, ChapterHead>();
  for (const c of chapters) if (c.pageStart >= 1 && c.pageStart <= pageCount && !starts.has(c.pageStart)) starts.set(c.pageStart, c);

  function go() {
    const m = /^p?\s*(\d{1,5})$/i.exec(value.trim());
    const n = m ? parseInt(m[1], 10) : 0;
    if (!m || n < 1 || n > pageCount) {
      setNote(`No such page. This book has pages 1 to ${pageCount}.`);
      return;
    }
    setNote("");
    onGo(n);
  }

  return (
    <nav aria-label="Pages of the book" className="sticky top-3 max-h-[calc(100vh-1.5rem)] w-48 shrink-0 overflow-auto rounded border border-line bg-white/60 p-2" data-index>
      <form
        className="mb-2"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <label className="block text-xs text-muted" htmlFor="go-to-page">
          Go to page
        </label>
        <div className="mt-0.5 flex gap-1">
          <input
            id="go-to-page"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`1 to ${pageCount}`}
            inputMode="numeric"
            className="w-full min-w-0 rounded border border-line bg-white px-1.5 py-0.5 text-sm placeholder:text-muted"
          />
          <button type="submit" className="rounded border border-line px-2 text-sm">
            Go
          </button>
        </div>
        {note ? (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {note}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted">Page IDs have {digits} digits, for example p{String(1).padStart(digits, "0")}.</p>
      </form>
      <ul>
        {items.map((it) => {
          const ch = starts.get(it.n);
          return (
            <li key={it.n}>
              {ch ? (
                <a href={`#chapter-${it.n}`} className="mt-2 block border-t border-line pt-1 text-xs font-semibold uppercase tracking-wide text-muted" data-index-chapter={it.n}>
                  {ch.titleEn || ch.chapter}
                </a>
              ) : null}
              <IndexLink item={it} tag={tags[it.n]} current={current === it.n} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
