"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SearchMarked from "./SearchMarked";
import { hitHref, newestOnly, SEARCH_DELAY_MS, SEARCH_WORDS, searchReady, type BookSearchResponse } from "@/lib/search-core";
import type { ReaderView } from "@/lib/reader-links";

/*
 * Search inside one book (unit VW124, Q-A 3:117.5 rows 1 to 4).
 *   mode "screen"   the box on the book screen /read/<book>: always visible.
 *   mode "reading"  the panel in the reading view: the toolbar button or the key / opens it, the key Escape closes it.
 * It searches the Japanese and English text of all pages of the book that an admin opened, not only the page on the screen (GET /api/read/book-search).
 * Hits are grouped by page: the page label, then each line with the match in yellow. At most 80 hits, then the text "80+ hits, type more words".
 * A click goes to that page in the view that the person uses (Page view or Scroll view). The address carries the words in `q`, so the reading view marks the hit.
 * The key / works only when the focus is not in a text field, and no panel or pop-up is open (`blocked`).
 */

export default function BookSearch({
  slug,
  view,
  mode,
  open = true,
  blocked = false,
  onOpen,
  onClose,
}: {
  slug: string;
  view: ReaderView;
  mode: "screen" | "reading";
  open?: boolean;
  blocked?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}) {
  const [text, setText] = useState("");
  const [res, setRes] = useState<BookSearchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [newest] = useState(() => newestOnly());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      abort.current?.abort();
    },
    [],
  );

  // The key / opens the search, Escape closes the panel of the reading view.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape" && mode === "reading" && open && !blocked) {
        onClose?.();
        return;
      }
      if (e.key !== "/" || blocked) return;
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      e.preventDefault();
      if (mode === "reading" && !open) onOpen?.();
      else input.current?.focus();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [mode, open, blocked, onOpen, onClose]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  async function load(words: string) {
    const id = newest.start();
    abort.current?.abort();
    if (!searchReady(words)) {
      setRes(null);
      setBusy(false);
      setFailed(false);
      return;
    }
    const ctl = new AbortController();
    abort.current = ctl;
    setBusy(true);
    setFailed(false);
    try {
      const r = await fetch(`/api/read/book-search?${new URLSearchParams({ slug, q: words }).toString()}`, { signal: ctl.signal });
      if (!newest.isNewest(id)) return;
      if (!r.ok) {
        setFailed(true);
        return;
      }
      const j = (await r.json()) as BookSearchResponse;
      if (!newest.isNewest(id)) return;
      setRes(j);
    } catch {
      if (newest.isNewest(id) && !ctl.signal.aborted) setFailed(true);
    } finally {
      if (newest.isNewest(id)) setBusy(false);
    }
  }

  function schedule(words: string, delay: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(words), delay);
  }

  if (mode === "reading" && !open) return null;
  const ready = searchReady(text);
  const shown = ready ? res : null;
  const pagesWord = shown && shown.groups.length === 1 ? "page" : "pages";
  return (
    <section
      aria-label={SEARCH_WORDS.bookOpen}
      className={mode === "reading" ? "mb-4 rounded border border-line bg-white p-3" : "mb-4 max-w-3xl"}
      data-book-search={mode}
    >
      <form
        role="search"
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          schedule(text, 0);
        }}
      >
        <label htmlFor={`book-search-${mode}`} className="sr-only">
          {SEARCH_WORDS.bookPlaceholder}
        </label>
        <input
          id={`book-search-${mode}`}
          ref={input}
          type="search"
          value={text}
          maxLength={80}
          autoComplete="off"
          placeholder={`${SEARCH_WORDS.bookPlaceholder} (press /)`}
          data-book-search-input
          onChange={(e) => {
            setText(e.target.value);
            schedule(e.target.value, SEARCH_DELAY_MS);
          }}
          className="min-h-[44px] min-w-0 flex-1 rounded border border-line bg-white px-3 py-1 placeholder:text-muted md:min-h-0"
        />
        {mode === "reading" ? (
          <button type="button" onClick={() => onClose?.()} data-book-search-close className="min-h-[44px] rounded border border-line px-3 py-1 text-sm md:min-h-0">
            {SEARCH_WORDS.bookClose}
          </button>
        ) : null}
      </form>
      <div className={mode === "reading" ? "mt-2 max-h-[60vh] overflow-auto" : "mt-2"} data-book-search-results aria-busy={busy}>
        {failed ? (
          <p role="alert" className="text-sm text-red-700" data-book-search-error>
            {SEARCH_WORDS.failed}
          </p>
        ) : null}
        {busy ? (
          <p className="text-sm text-muted" data-book-search-busy>
            {SEARCH_WORDS.searching}
          </p>
        ) : null}
        {text && !ready ? (
          <p className="text-sm text-muted" data-book-search-hint>
            {SEARCH_WORDS.hint}
          </p>
        ) : null}
        {shown ? (
          <>
            <p className="mb-1 text-sm" role="status" data-book-search-summary>
              {shown.total} {shown.total === 1 ? "hit" : "hits"} on {shown.groups.length} {pagesWord}
            </p>
            {shown.timedOut ? (
              <p className="mb-1 text-sm text-muted" data-book-search-note="timeout">
                {SEARCH_WORDS.timedOut}
              </p>
            ) : null}
            {!shown.pageSearch ? (
              <p className="mb-1 text-sm text-muted" data-book-search-note="needs-s2">
                Page text search needs the search columns of the database.
              </p>
            ) : null}
            {shown.total === 0 && !shown.timedOut && shown.pageSearch ? (
              <p className="text-sm text-muted" data-book-search-empty>
                {SEARCH_WORDS.none}
              </p>
            ) : null}
            <ul className="grid gap-2" data-book-search-list>
              {shown.groups.map((g) => (
                <li key={g.n} data-book-hit-page={g.n}>
                  <p className="text-sm font-semibold">{g.label}</p>
                  <ul className="mt-0.5 grid gap-0.5">
                    {g.hits.map((h, i) => (
                      <li key={`${g.n}/${h.lang}/${h.order}/${i}`}>
                        <Link
                          href={hitHref(slug, g.n, g.digits, text.trim(), view)}
                          prefetch={false}
                          data-book-hit
                          onClick={() => onClose?.()}
                          lang={h.lang === "ja" ? "ja" : "en"}
                          className={`block min-h-[44px] rounded px-1 py-1.5 text-sm hover:bg-black/5 md:min-h-0 md:py-0.5 ${h.lang === "ja" ? "font-ja" : ""}`}
                        >
                          <span className="mr-1.5 rounded border border-line px-1 text-xs text-muted" aria-label={h.lang === "ja" ? "Japanese text" : "English text"}>
                            {h.lang === "ja" ? "JA" : "EN"}
                          </span>
                          <SearchMarked parts={h.parts} />
                          {h.term ? <span className="ml-1 text-muted">({SEARCH_WORDS.termMatch}: {h.term})</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {shown.more ? (
              <p className="mt-2 text-sm text-muted" data-book-search-more>
                {SEARCH_WORDS.moreHits}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
