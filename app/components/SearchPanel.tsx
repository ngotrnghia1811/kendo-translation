"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SearchMarked from "./SearchMarked";
import {
  newestOnly,
  SEARCH_DELAY_MS,
  SEARCH_TABS,
  SEARCH_WORDS,
  searchHref,
  searchReady,
  tabLabel,
  tabsFor,
  type LineHit,
  type PageItemView,
  type SearchResponse,
  type SearchTabId,
  type WorkItemView,
} from "@/lib/search-core";
import { SEARCH_NEEDS_S2 } from "@/lib/reader-types";

/*
 * The search page /search (unit VW124, Q-A 3:117.4 rows 1 to 4).
 * The server draws the first result from the address (?q=seme&tab=pages&screen=2), so a reload or a shared link shows the same list and needs no script.
 * Typing runs the search 0.35 s after the last key, from 2 characters on. The answer comes from GET /api/read/search. The address changes with window.history.replaceState,
 * so the words stay in the address without a new server render. A request that is older than the newest one is dropped (newestOnly).
 */

function LineText({ line }: { line: LineHit }) {
  return (
    <span lang={line.lang === "ja" ? "ja" : "en"} className={line.lang === "ja" ? "font-ja" : undefined}>
      <span className="mr-1.5 rounded border border-line px-1 text-xs text-muted" aria-label={line.lang === "ja" ? "Japanese text" : "English text"}>
        {line.lang === "ja" ? "JA" : "EN"}
      </span>
      <SearchMarked parts={line.parts} />
    </span>
  );
}

function PageHit({ item, open, toggle }: { item: PageItemView; open: boolean; toggle: () => void }) {
  const line = item.line;
  const hasContext = Boolean(line && !line.term && (line.before || line.after));
  return (
    <li data-hit-page={`${item.slug}/p${String(item.n).padStart(item.digits, "0")}`} className="rounded border border-line bg-white p-3">
      <p className="font-semibold">
        <Link href={item.href} prefetch={false} className="text-accent underline" data-hit-link>
          {item.title} · {item.label}
        </Link>
      </p>
      {line ? (
        <p className="mt-1 text-sm" data-snippet>
          <LineText line={line} />
          {line.term ? (
            <span className="ml-1 text-muted" data-term-match>
              ({SEARCH_WORDS.termMatch}: {line.term})
            </span>
          ) : null}
        </p>
      ) : item.fallback ? (
        <p className="mt-1 text-sm text-muted" data-snippet>
          {item.fallback}…
        </p>
      ) : null}
      {hasContext ? (
        <>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            data-context-toggle
            className="mt-1 min-h-[44px] rounded border border-line px-3 py-0.5 text-sm md:min-h-0"
          >
            {open ? SEARCH_WORDS.hideContext : SEARCH_WORDS.showContext}
          </button>
          {open && line ? (
            <div className="mt-2 grid gap-1 border-l-2 border-line pl-3 text-sm" data-context lang={line.lang === "ja" ? "ja" : "en"}>
              {line.before ? (
                <p className="text-muted" data-context-before>
                  {line.before}
                </p>
              ) : null}
              <p data-context-hit>
                <SearchMarked parts={line.parts} />
              </p>
              {line.after ? (
                <p className="text-muted" data-context-after>
                  {line.after}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

function WorkHit({ item }: { item: WorkItemView }) {
  return (
    <li data-hit-book={item.slug} className="rounded border border-line bg-white p-3">
      <p className="font-semibold">
        <Link href={item.href} prefetch={false} className="text-accent underline" data-hit-link>
          <SearchMarked parts={item.title} />
        </Link>
      </p>
      {item.titleJa.length ? (
        <p lang="ja" className="font-ja text-sm">
          <SearchMarked parts={item.titleJa} />
        </p>
      ) : null}
      {item.meta.length ? (
        <p className="text-sm text-muted">
          <SearchMarked parts={item.meta} />
        </p>
      ) : null}
      {item.synopsis ? (
        <p className="mt-1 text-sm" data-snippet>
          <SearchMarked parts={item.synopsis} />
        </p>
      ) : null}
    </li>
  );
}

export default function SearchPanel({ initial, query, approved }: { initial: SearchResponse | null; query: string; approved: boolean }) {
  const tabs = tabsFor(approved);
  const [text, setText] = useState(query);
  const [tab, setTab] = useState<SearchTabId>(initial?.tab ?? tabs[0]);
  const [res, setRes] = useState<SearchResponse | null>(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [newest] = useState(() => newestOnly());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      abort.current?.abort();
    },
    [],
  );

  async function load(words: string, tabId: SearchTabId, screenNo: number) {
    const id = newest.start();
    abort.current?.abort();
    window.history.replaceState(null, "", searchHref(words.trim(), tabId, screenNo));
    if (!searchReady(words)) {
      setRes(null);
      setBusy(false);
      setFailed("");
      return;
    }
    const ctl = new AbortController();
    abort.current = ctl;
    setBusy(true);
    setFailed("");
    try {
      const r = await fetch(`/api/read/search?${new URLSearchParams({ q: words, tab: tabId, screen: String(screenNo) }).toString()}`, { signal: ctl.signal });
      if (!newest.isNewest(id)) return;
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        if (!newest.isNewest(id)) return;
        setFailed(r.status === 401 && j.error ? j.error : SEARCH_WORDS.failed);
        return;
      }
      const j = (await r.json()) as SearchResponse;
      if (!newest.isNewest(id)) return;
      setRes(j);
      setTab(j.tab);
      setOpen({});
      if (j.screen !== screenNo || j.tab !== tabId) window.history.replaceState(null, "", searchHref(words.trim(), j.tab, j.screen));
    } catch {
      if (newest.isNewest(id) && !ctl.signal.aborted) setFailed(SEARCH_WORDS.failed);
    } finally {
      if (newest.isNewest(id)) setBusy(false);
    }
  }

  function schedule(words: string, tabId: SearchTabId, screenNo: number, delay: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(words, tabId, screenNo), delay);
  }

  const ready = searchReady(text);
  const shown = res && ready ? res : null;
  const total = shown?.counts[tab === "all" ? "all" : tab] ?? 0;

  return (
    <div data-search-panel>
      <form
        action="/search"
        method="get"
        role="search"
        className="mb-3 flex flex-wrap gap-2"
        data-search-form
        onSubmit={(e) => {
          e.preventDefault();
          schedule(text, tab, 1, 0);
        }}
      >
        <label htmlFor="search-q" className="sr-only">
          {SEARCH_WORDS.inputLabel}
        </label>
        <input
          id="search-q"
          name="q"
          type="search"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            schedule(e.target.value, tab, 1, SEARCH_DELAY_MS);
          }}
          placeholder={SEARCH_WORDS.placeholder}
          maxLength={80}
          autoComplete="off"
          autoFocus={!query}
          data-search-input
          className="min-h-[44px] min-w-0 flex-1 rounded border border-line bg-white px-3 py-1 placeholder:text-muted md:min-h-0"
        />
        {tab !== "all" ? <input type="hidden" name="tab" value={tab} /> : null}
        <button type="submit" data-search-submit className="min-h-[44px] rounded border border-line px-4 py-1 font-semibold md:min-h-0">
          {SEARCH_WORDS.title}
        </button>
      </form>

      {!approved ? (
        <p className="mb-2 text-sm text-muted" data-search-note="waiting">
          {SEARCH_WORDS.waiting}
        </p>
      ) : null}

      <nav aria-label="Result tabs" className="mb-3 flex gap-1 overflow-x-auto border-b border-line" data-search-tabs>
        {SEARCH_TABS.filter((t) => tabs.includes(t.id)).map((t) => {
          const on = t.id === tab;
          const n = shown?.counts[t.id];
          return (
            <Link
              key={t.id}
              href={searchHref(text.trim(), t.id)}
              prefetch={false}
              aria-current={on ? "page" : undefined}
              data-search-tab={t.id}
              onClick={(e) => {
                e.preventDefault();
                setTab(t.id);
                schedule(text, t.id, 1, 0);
              }}
              className={`inline-flex min-h-[44px] items-center whitespace-nowrap px-3 py-1 text-sm md:min-h-0 ${on ? "border-b-2 border-accent font-semibold" : "text-accent underline"}`}
            >
              {tabLabel(t.id)}
              {n === undefined ? "" : ` (${n})`}
            </Link>
          );
        })}
      </nav>

      <section aria-label="Search results" data-search-results aria-busy={busy}>
        {failed ? (
          <p role="alert" className="mb-2 text-sm text-red-700" data-search-error>
            {failed}
          </p>
        ) : null}
        {busy ? (
          <p className="mb-2 text-sm text-muted" data-search-busy>
            {SEARCH_WORDS.searching}
          </p>
        ) : null}
        {!ready ? (
          <p className="text-sm text-muted" data-search-hint>
            {SEARCH_WORDS.hint}
          </p>
        ) : shown ? (
          <>
            <p className="mb-2 text-sm" role="status" data-search-summary>
              {shown.counts[shown.tab === "all" ? "all" : shown.tab]} {shown.counts[shown.tab === "all" ? "all" : shown.tab] === 1 ? "hit" : "hits"} for <strong>{shown.query}</strong>
              {shown.capped ? ` · ${SEARCH_WORDS.moreHits.replace(/^\d+\+ hits, /, "")}` : ""}
            </p>
            {shown.timedOut ? (
              <p className="mb-2 text-sm text-muted" data-search-note="timeout">
                {SEARCH_WORDS.timedOut}
              </p>
            ) : null}
            {!shown.pageSearch && !shown.waiting ? (
              <p className="mb-2 text-sm text-muted" data-search-note="needs-s2">
                {SEARCH_NEEDS_S2}
              </p>
            ) : null}
            {total === 0 && !shown.timedOut ? (
              <p className="text-sm text-muted" data-search-empty>
                {SEARCH_WORDS.none}
              </p>
            ) : null}
            <ul className="grid gap-2" data-search-list>
              {shown.items.map((it) =>
                it.type === "work" ? (
                  <WorkHit key={`w/${it.slug}`} item={it} />
                ) : (
                  <PageHit
                    key={`p/${it.slug}/${it.n}`}
                    item={it}
                    open={Boolean(open[`${it.slug}/${it.n}`])}
                    toggle={() => setOpen((o) => ({ ...o, [`${it.slug}/${it.n}`]: !o[`${it.slug}/${it.n}`] }))}
                  />
                ),
              )}
            </ul>
            {shown.screens > 1 ? (
              <p className="mt-3 flex flex-wrap items-center gap-4 text-sm" data-search-pager>
                {shown.screen > 1 ? (
                  <Link
                    href={searchHref(text.trim(), shown.tab, shown.screen - 1)}
                    prefetch={false}
                    data-search-prev
                    className="inline-flex min-h-[44px] items-center text-accent underline md:min-h-0"
                    onClick={(e) => {
                      e.preventDefault();
                      schedule(text, shown.tab, shown.screen - 1, 0);
                    }}
                  >
                    ‹ {SEARCH_WORDS.previous}
                  </Link>
                ) : null}
                <span data-search-screen>
                  Screen {shown.screen} of {shown.screens}
                </span>
                {shown.screen < shown.screens ? (
                  <Link
                    href={searchHref(text.trim(), shown.tab, shown.screen + 1)}
                    prefetch={false}
                    data-search-next
                    className="inline-flex min-h-[44px] items-center text-accent underline md:min-h-0"
                    onClick={(e) => {
                      e.preventDefault();
                      schedule(text, shown.tab, shown.screen + 1, 0);
                    }}
                  >
                    {SEARCH_WORDS.next} ›
                  </Link>
                ) : null}
              </p>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
