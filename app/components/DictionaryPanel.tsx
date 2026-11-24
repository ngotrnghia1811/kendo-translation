"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import DictEntryRow from "./DictEntryRow";
import { DICT_DELAY_MS, DICT_WORDS, dictHref, dictReady, type DictListResponse } from "@/lib/dictionary-core";
import { newestOnly } from "@/lib/search-core";

/*
 * The list of the dictionary page /dictionary (unit VW126, Q-A 3:117.6 rows 3 and 4).
 * The server draws the first list from the address (?q=kote&screen=2), so a reload or a shared link shows the same list and needs no script.
 * Typing runs the search 0.35 s after the last key, from 2 characters on. With fewer characters the list shows all entries. The answer comes from GET /api/read/dictionary.
 * The address changes with window.history.replaceState. A request that is older than the newest one is dropped (newestOnly of the search page).
 */
export default function DictionaryPanel({ initial, query }: { initial: DictListResponse; query: string }) {
  const [text, setText] = useState(query);
  const [res, setRes] = useState<DictListResponse>(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
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

  async function load(words: string, screenNo: number) {
    const id = newest.start();
    abort.current?.abort();
    const q = dictReady(words) ? words.trim() : "";
    window.history.replaceState(null, "", dictHref({ q, screen: screenNo }));
    const ctl = new AbortController();
    abort.current = ctl;
    setBusy(true);
    setFailed("");
    try {
      const r = await fetch(`/api/read/dictionary?${new URLSearchParams({ ...(q ? { q } : {}), screen: String(screenNo) }).toString()}`, { signal: ctl.signal });
      if (!newest.isNewest(id)) return;
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        if (!newest.isNewest(id)) return;
        setFailed(r.status === 401 && j.error ? j.error : DICT_WORDS.failed);
        return;
      }
      const j = (await r.json()) as DictListResponse;
      if (!newest.isNewest(id)) return;
      setRes(j);
      if (j.screen !== screenNo) window.history.replaceState(null, "", dictHref({ q, screen: j.screen }));
    } catch {
      if (newest.isNewest(id) && !ctl.signal.aborted) setFailed(DICT_WORDS.failed);
    } finally {
      if (newest.isNewest(id)) setBusy(false);
    }
  }

  function schedule(words: string, screenNo: number, delay: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(words, screenNo), delay);
  }

  const ready = dictReady(text);
  const shownQuery = res.ready ? res.query : "";
  return (
    <div data-dict-panel>
      <form
        action="/dictionary"
        method="get"
        role="search"
        className="mb-3 flex flex-wrap gap-2"
        data-dict-form
        onSubmit={(e) => {
          e.preventDefault();
          schedule(text, 1, 0);
        }}
      >
        <label htmlFor="dict-q" className="sr-only">
          {DICT_WORDS.inputLabel}
        </label>
        <input
          id="dict-q"
          name="q"
          type="search"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // A key that does not change the effective query (1 character typed after 0) needs no new request.
            if (dictReady(e.target.value) || dictReady(text)) schedule(e.target.value, 1, DICT_DELAY_MS);
          }}
          placeholder={DICT_WORDS.placeholder}
          maxLength={80}
          autoComplete="off"
          data-dict-input
          className="min-h-[44px] min-w-0 flex-1 rounded border border-line bg-white px-3 py-1 placeholder:text-muted md:min-h-0"
        />
        <button type="submit" data-dict-submit className="min-h-[44px] rounded border border-line px-4 py-1 font-semibold md:min-h-0">
          {DICT_WORDS.title}
        </button>
      </form>

      {!ready && text.trim() !== "" ? (
        <p className="mb-2 text-sm text-muted" data-dict-hint>
          {DICT_WORDS.hint}
        </p>
      ) : null}
      {/* Unit VW128 (owner note Q-A 3:127.4): how to make an exact search. */}
      <p className="mb-2 text-xs text-muted" data-dict-tip>
        {DICT_WORDS.tip}
      </p>

      <section aria-label="Dictionary entries" aria-busy={busy} data-dict-results>
        {failed ? (
          <p role="alert" className="mb-2 text-sm text-red-700" data-dict-error>
            {failed}
          </p>
        ) : null}
        {busy ? (
          <p className="mb-2 text-sm text-muted" data-dict-busy>
            {DICT_WORDS.searching}
          </p>
        ) : null}
        {res.missing ? (
          <p className="text-sm text-muted" data-dict-missing>
            {DICT_WORDS.missing}
          </p>
        ) : (
          <>
            <p className="mb-2 text-sm" role="status" data-dict-summary>
              {res.count} {res.count === 1 ? "entry" : "entries"}
              {shownQuery ? (
                <>
                  {" "}
                  for <strong>{shownQuery}</strong>
                </>
              ) : null}
              {res.ready && res.exact ? <span data-dict-exact>{` (${DICT_WORDS.exact})`}</span> : null}
            </p>
            {res.count === 0 ? (
              <p className="text-sm text-muted" data-dict-empty>
                {DICT_WORDS.none}
              </p>
            ) : null}
            <ul className="grid gap-2" data-dict-list>
              {res.items.map((it) => (
                <DictEntryRow key={it.id} item={it} />
              ))}
            </ul>
            {res.screens > 1 ? (
              <p className="mt-3 flex flex-wrap items-center gap-4 text-sm" data-dict-pager>
                {res.screen > 1 ? (
                  <Link
                    href={dictHref({ q: shownQuery, screen: res.screen - 1 })}
                    prefetch={false}
                    data-dict-prev
                    className="inline-flex min-h-[44px] items-center text-accent underline md:min-h-0"
                    onClick={(e) => {
                      e.preventDefault();
                      schedule(text, res.screen - 1, 0);
                    }}
                  >
                    ‹ {DICT_WORDS.previous}
                  </Link>
                ) : null}
                <span data-dict-screen>
                  Screen {res.screen} of {res.screens}
                </span>
                {res.screen < res.screens ? (
                  <Link
                    href={dictHref({ q: shownQuery, screen: res.screen + 1 })}
                    prefetch={false}
                    data-dict-next
                    className="inline-flex min-h-[44px] items-center text-accent underline md:min-h-0"
                    onClick={(e) => {
                      e.preventDefault();
                      schedule(text, res.screen + 1, 0);
                    }}
                  >
                    {DICT_WORDS.next} ›
                  </Link>
                ) : null}
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
