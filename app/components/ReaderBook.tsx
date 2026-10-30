"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TermPopup, type PickedTerm } from "./HtvMarkedText";
import { CollapsedBar, CollapseButton } from "./HtvPanelFrame";
import { THEME_EVENT } from "./ThemeSwitch";
import ReaderIndex from "./ReaderIndex";
import ReaderPageView, { type EffectiveSettings } from "./ReaderPageView";
import ReaderWithImage from "./ReaderImage";
import ReaderSettingsPanel from "./ReaderSettingsPanel";
import { parsePageNumber } from "@/lib/htv-format";
import { READER_DEFAULTS, type ReaderSettings, type ThemeName } from "@/lib/htv-settings";
import { pad, readHref, type ReaderView } from "@/lib/reader-links";
import { LABEL_SYNOPSIS, WAITING, pageLabel, type BookmarkView, type ReaderBookIndex, type ReaderPageData } from "@/lib/reader-types";
import type { Role } from "@/lib/htv-types";

/*
 * The book screen and the reading view of the reader pages (unit RC1, round 63). VISION-viewer 15.19.3 to 15.19.7.
 *   no ?at     the book screen: the metadata block, the AI label summary, and every page of the book
 *   ?at=p048   the reading view: page view (one page, default) or scroll view (all pages in one scroll), with the toolbar and the side index
 * A reader who waits for approval sees the metadata block and the line "Your account waits for approval by an admin." and no page list, no text.
 * Settings (text mode, EN text, view, fonts, size, line height, width, focus, index) are kept in the account (PUT /api/read/settings).
 */

function ToolSeg<T extends string>({ label, value, options, onPick, disabled = false }: { label: string; value: T; options: { value: T; label: string }[]; onPick: (v: T) => void; disabled?: boolean }) {
  return (
    <div role="group" aria-label={label} className="flex overflow-hidden rounded border border-line text-sm">
      {options.map((o) => (
        <button key={o.value} type="button" disabled={disabled} aria-pressed={value === o.value} data-toolbar={`${label}:${o.value}`} onClick={() => onPick(o.value)} className={"min-h-[44px] px-2.5 py-1 disabled:opacity-50 md:min-h-0 " + (value === o.value ? "bg-accent font-semibold text-white" : "")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Title of the Image button when it is disabled (scroll view). Unit RC3, round 66 answer 5. */
const IMAGE_PAGE_ONLY = "Page image shows in Page view only";

/** One button in the reader bar that turns a setting on or off. It looks like one option of ToolSeg. Unit RC3 (round 66 answer 1 and 5). */
function ToolToggle({ label, pressed, onToggle, disabled = false, disabledTitle }: { label: string; pressed: boolean; onToggle: () => void; disabled?: boolean; disabledTitle?: string }) {
  return (
    <div role="group" aria-label={label} className="flex overflow-hidden rounded border border-line text-sm" title={disabled ? disabledTitle : undefined}>
      <button type="button" disabled={disabled} aria-pressed={pressed} data-toolbar={`${label}:toggle`} onClick={onToggle} className={"min-h-[44px] px-2.5 py-1 disabled:opacity-50 md:min-h-0 " + (pressed ? "bg-accent font-semibold text-white" : "")}>
        {label}
      </button>
    </div>
  );
}

function emptyPage(slug: string, n: number, digits: number): ReaderPageData {
  return { pageId: `${slug}/p${pad(n, digits)}`, n, name: pageLabel(n), hasText: false, rows: [], terms: {}, extras: [], hasHuman: false, label: { agent: "", human: "" }, checked: false };
}

async function sendJson(method: string, url: string, body: unknown): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  try {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: r.ok, json: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, json: {} };
  }
}

export default function ReaderBook({
  index,
  initialPages,
  user,
  bookmarks: initialBookmarks,
  settings,
  view: initialView,
  at,
  theme: initialTheme,
  note,
}: {
  index: ReaderBookIndex;
  initialPages: ReaderPageData[];
  user: { name: string; email: string; role: Role; approved: boolean };
  bookmarks: BookmarkView[];
  settings: ReaderSettings;
  view: ReaderView;
  at: number | null;
  theme: ThemeName;
  note: string;
}) {
  const router = useRouter();
  const [s, setS] = useState<EffectiveSettings>({ ...READER_DEFAULTS, ...settings, view: initialView });
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const [loaded, setLoaded] = useState<Record<number, ReaderPageData>>({});
  const [picked, setPicked] = useState<PickedTerm | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkView[]>(initialBookmarks);
  const [currentN, setCurrentN] = useState<number | null>(at);
  const [box, setBox] = useState("");
  const [boxNote, setBoxNote] = useState("");
  const pending = useRef<ReaderSettings>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requested = useRef(new Set<number>());
  const textSet = useMemo(() => new Set(index.textPages), [index.textPages]);

  // Follow the server: a new address brings a new view and a new page, and a new render brings the bookmarks of the account.
  // React guide "Adjusting state when a prop changes": store the old props in state and set the state during the render.
  const [seen, setSeen] = useState({ view: initialView, at, bookmarks: initialBookmarks });
  if (seen.view !== initialView || seen.at !== at || seen.bookmarks !== initialBookmarks) {
    setSeen({ view: initialView, at, bookmarks: initialBookmarks });
    setS((x) => ({ ...x, view: initialView }));
    setCurrentN(at);
    setBookmarks(initialBookmarks);
  }
  useEffect(() => {
    const on = (e: Event) => setTheme((e as CustomEvent<ThemeName>).detail);
    window.addEventListener(THEME_EVENT, on);
    return () => window.removeEventListener(THEME_EVENT, on);
  }, []);

  const pages = useMemo(() => {
    const m: Record<number, ReaderPageData> = { ...loaded };
    for (const p of initialPages) m[p.n] = p;
    return m;
  }, [loaded, initialPages]);

  const save = useCallback((patch: ReaderSettings) => {
    setS((x) => ({ ...x, ...patch }) as EffectiveSettings);
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const body = pending.current;
      pending.current = {};
      void sendJson("PUT", "/api/read/settings", { reader: body });
    }, 400);
  }, []);

  function changeView(v: ReaderView) {
    if (v === s.view) return;
    save({ view: v });
    router.push(readHref(index.slug, v, at ?? currentN ?? index.textPages[0] ?? 1, index.digits));
  }

  function changeTheme(t: ThemeName) {
    if (t === theme) return;
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: t }));
    void sendJson("PUT", "/api/theme", { theme: t });
  }

  // Esc leaves focus mode (round 62 answer 8).
  useEffect(() => {
    if (!s.focus) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && save({ focus: false });
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [s.focus, save]);

  // Page view: save the place at each page.
  useEffect(() => {
    if (at === null || !user.approved || s.view !== "page") return;
    void sendJson("PUT", "/api/read/progress", { pageId: `${index.slug}/p${pad(at, index.digits)}` });
  }, [at, index.slug, index.digits, user.approved, s.view]);

  // Scroll view: load the text of the pages near the screen, follow the page in view, and save the place.
  const fetchPages = useCallback(
    async (nums: number[]) => {
      const need = nums.filter((n) => textSet.has(n) && !requested.current.has(n));
      for (const n of need) requested.current.add(n);
      for (let i = 0; i < need.length; i += 5) {
        const chunk = need.slice(i, i + 5);
        const ids = chunk.map((n) => `${index.slug}/p${pad(n, index.digits)}`).join(",");
        try {
          const r = await fetch(`/api/read/page?ids=${encodeURIComponent(ids)}`);
          if (!r.ok) {
            for (const n of chunk) requested.current.delete(n);
            continue;
          }
          const j = (await r.json()) as { pages: ReaderPageData[] };
          setLoaded((x) => {
            const m = { ...x };
            for (const p of j.pages) m[p.n] = p;
            return m;
          });
        } catch {
          for (const n of chunk) requested.current.delete(n);
        }
      }
    },
    [index.slug, index.digits, textSet],
  );

  const scrolling = at !== null && s.view === "scroll" && user.approved;
  useEffect(() => {
    if (!scrolling) return;
    const lazy = new IntersectionObserver(
      (entries) => {
        const nums = entries.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.lazy));
        if (nums.length) void fetchPages(nums);
      },
      { rootMargin: "900px 0px" },
    );
    document.querySelectorAll("[data-lazy]").forEach((el) => lazy.observe(el));
    return () => lazy.disconnect();
  }, [scrolling, fetchPages, pages]);

  useEffect(() => {
    if (!scrolling) return;
    document.getElementById(`p${pad(at ?? 1, index.digits)}`)?.scrollIntoView({ block: "start" });
    let save1: ReturnType<typeof setTimeout> | null = null;
    const watch = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!hit) return;
        const n = Number((hit.target as HTMLElement).dataset.pageN);
        if (!n) return;
        setCurrentN(n);
        if (save1) clearTimeout(save1);
        save1 = setTimeout(() => {
          window.history.replaceState(null, "", readHref(index.slug, "scroll", n, index.digits));
          void sendJson("PUT", "/api/read/progress", { pageId: `${index.slug}/p${pad(n, index.digits)}` });
        }, 1200);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    document.querySelectorAll("[data-page-n]").forEach((el) => watch.observe(el));
    return () => {
      watch.disconnect();
      if (save1) clearTimeout(save1);
    };
    // The scroll to the page runs for a new address and again when the server brings the pages of the new window (they change the height above the page).
    // A lazy load of a far page (state loaded) is not in the list, so it does not scroll again.
  }, [scrolling, at, index.slug, index.digits, initialPages]);

  const here = currentN ?? at;
  const hereId = here ? `${index.slug}/p${pad(here, index.digits)}` : "";
  const marked = bookmarks.find((b) => b.pageId === hereId);
  async function toggleBookmark() {
    if (!hereId) return;
    if (marked) {
      const r = await sendJson("DELETE", "/api/read/bookmarks", { id: marked.id });
      if (r.ok) setBookmarks((b) => b.filter((x) => x.id !== marked.id));
    } else {
      const r = await sendJson("POST", "/api/read/bookmarks", { pageId: hereId, note: "" });
      const bm = r.json.bookmark as BookmarkView | undefined;
      if (r.ok && bm) setBookmarks((b) => [...b, bm].sort((x, y) => x.n - y.n));
    }
  }
  async function dropBookmark(id: string) {
    const r = await sendJson("DELETE", "/api/read/bookmarks", { id });
    if (r.ok) setBookmarks((b) => b.filter((x) => x.id !== id));
  }

  function goBox(e: React.FormEvent) {
    e.preventDefault();
    const n = parsePageNumber(box, index.pages);
    if (n === null) {
      setBoxNote(`No such page. This book has pages 1 to ${index.pages}.`);
      return;
    }
    setBoxNote("");
    setBox("");
    router.push(readHref(index.slug, s.view, n, index.digits));
  }

  const hasHumanHere = here !== null && Boolean(pages[here]?.hasHuman);
  const onPick = useCallback((p: PickedTerm) => setPicked(p), []);
  const entryOf = (id: string) => {
    for (const p of Object.values(pages)) if (p.terms[id]) return p.terms[id];
    return undefined;
  };

  // ---------------------------------------------------------------- metadata block (book screen and waiting screen)
  const meta = (
    <section className="mb-5" data-book-meta>
      <h1 className="text-2xl font-semibold" data-book-title>
        {index.titleEn || index.titleJa || `Web article ${index.slug}`}
      </h1>
      {index.titleJa && index.titleEn ? (
        <p lang="ja" className="font-ja text-lg text-muted" data-book-title-ja>
          {index.titleJa}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-muted">
        {[index.author, index.publisher, index.year, index.isbn ? `ISBN ${index.isbn}` : "", index.pages ? `${index.pages} pages` : ""].filter(Boolean).join(" · ")}
      </p>
      {index.synopsis ? (
        <p className="mt-2 max-w-3xl text-sm" data-synopsis>
          {index.synopsis} <span className="ml-1 rounded bg-stone-200 px-1.5 py-0.5 text-[11px] font-medium text-stone-700">{LABEL_SYNOPSIS}</span>
        </p>
      ) : null}
      {user.approved ? (
        <p className="mt-2 text-sm" data-ai-summary>
          AI translation: {index.textPages.length} of {index.pages} pages. Human check: {index.checkedPages.length} of {index.textPages.length} pages.
        </p>
      ) : null}
    </section>
  );

  if (!user.approved) {
    return (
      <div data-reader-waiting>
        {meta}
        <p role="status" className="rounded border border-line bg-white p-3 text-sm" data-waiting>
          {WAITING}
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------- book screen
  if (at === null) {
    const start = index.resumeAt ?? index.textPages[0] ?? null;
    return (
      <div data-book-screen>
        {note ? <p className="mb-2 text-sm text-red-700">{note}</p> : null}
        {meta}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          {start ? (
            <Link href={readHref(index.slug, s.view, start, index.digits)} className="min-h-[44px] rounded bg-accent px-4 py-2 font-semibold text-white md:min-h-0 md:py-1.5" data-continue>
              {index.resumeAt ? `Continue at ${pageLabel(index.resumeAt)}` : `Start reading at ${pageLabel(start)}`}
            </Link>
          ) : null}
          <span className="text-muted">Default view: {s.view === "page" ? "Page view" : "Scroll view"}</span>
        </div>
        {bookmarks.length > 0 ? (
          <section className="mb-4" data-bookmarks>
            <h2 className="text-sm font-semibold">Bookmarks</h2>
            <ul className="mt-1 flex flex-wrap gap-2 text-sm">
              {bookmarks.map((b) => (
                <li key={b.id}>
                  <Link href={readHref(index.slug, s.view, b.n, index.digits)} className="text-accent underline">
                    {pageLabel(b.n)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section aria-label="Pages of the book" className="max-w-3xl">
          <h2 className="mb-1 text-lg font-semibold">Pages</h2>
          <ReaderIndex slug={index.slug} pages={index.pages} digits={index.digits} textPages={index.textPages} checkedPages={index.checkedPages} chapters={index.chapters} current={null} view={s.view} dense={false} />
        </section>
      </div>
    );
  }

  // ---------------------------------------------------------------- reading view
  const nums = s.view === "page" ? [at] : Array.from({ length: index.pages }, (_, i) => i + 1);
  // Unit RC2 (round 65): the page image shows in the page view only. The scroll view and focus mode show text only.
  const withImage = s.image && index.images && s.view === "page" && !s.focus;
  const wrap = (n: number, node: React.ReactNode) => {
    if (!withImage) return node;
    const pageId = `${index.slug}/p${pad(n, index.digits)}`;
    return (
      <ReaderWithImage key={pageId} pageId={pageId} n={n}>
        {node}
      </ReaderWithImage>
    );
  };
  const content = (
    <div className="space-y-10" data-reading data-view={s.view}>
      {nums.map((n) => {
        const data = pages[n];
        if (data) return wrap(n, <ReaderPageView key={n} data={data} s={s} onPick={onPick} focus={s.focus} />);
        if (textSet.has(n)) {
          return wrap(
            n,
            <section key={n} id={`p${pad(n, index.digits)}`} data-lazy={n} data-page-n={n} data-section={`${index.slug}/p${pad(n, index.digits)}`} className="mx-auto min-h-[12rem] w-full max-w-[72ch] scroll-mt-28">
              <h2 className="mb-2 border-b border-line pb-1 text-base font-semibold">{pageLabel(n)}</h2>
              <p className="text-sm text-muted">Loading…</p>
            </section>,
          );
        }
        return wrap(n, <ReaderPageView key={n} data={emptyPage(index.slug, n, index.digits)} s={s} onPick={onPick} focus={s.focus} />);
      })}
    </div>
  );
  const popup = picked ? <TermPopup picked={picked} entry={entryOf(picked.mark.entryId)} onClose={() => setPicked(null)} hideCheck /> : null;

  if (s.focus) {
    return (
      <div className="fixed inset-0 z-40 overflow-auto bg-background px-4 py-8" data-focus-mode>
        {content}
        {popup}
        <button type="button" onClick={() => save({ focus: false })} data-focus-leave className="fixed bottom-4 right-4 z-50 min-h-[44px] rounded border border-line bg-white px-3 text-sm shadow">
          Leave focus mode (Esc)
        </button>
      </div>
    );
  }

  const prev = s.view === "page" && at > 1 ? readHref(index.slug, "page", at - 1, index.digits) : null;
  const next = s.view === "page" && at < index.pages ? readHref(index.slug, "page", at + 1, index.digits) : null;
  const bookmarkList = (
    <section className="mt-3 border-t border-line pt-2" data-bookmarks>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Bookmarks</h3>
      {bookmarks.length === 0 ? <p className="text-xs text-muted">None yet.</p> : null}
      <ul>
        {bookmarks.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-2 text-sm" data-bookmark={b.pageId}>
            <Link href={readHref(index.slug, s.view, b.n, index.digits)} onClick={() => setSheet(false)} className="min-h-[44px] flex-1 py-2 text-accent underline md:min-h-0 md:py-0.5">
              {pageLabel(b.n)}
            </Link>
            <button type="button" aria-label={`Remove the bookmark of ${pageLabel(b.n)}`} onClick={() => void dropBookmark(b.id)} className="min-h-[44px] px-2 md:min-h-0">
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
  const sideIndex = (dense: boolean, onNavigate?: () => void) => (
    <>
      <ReaderIndex slug={index.slug} pages={index.pages} digits={index.digits} textPages={index.textPages} checkedPages={index.checkedPages} chapters={index.chapters} current={here} view={s.view} dense={dense} onNavigate={onNavigate} />
      {bookmarkList}
    </>
  );

  return (
    <div data-reading-screen className="pb-20 md:pb-0">
      {note ? <p className="mb-2 text-sm text-red-700">{note}</p> : null}
      <div className="flex gap-4">
        <div className="hidden md:block">
          {s.index ? (
            <nav aria-label="Pages of the book" data-index className="sticky top-3 flex max-h-[calc(100vh-1.5rem)] w-56 shrink-0 flex-col rounded border border-line bg-white/60">
              <div className="flex items-center justify-between gap-2 border-b border-line/60 px-2 py-1.5 text-sm">
                <span className="font-semibold">Pages</span>
                <CollapseButton id="reader-index" name="page index" arrow="◀" onCollapse={() => save({ index: false })} />
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-2">{sideIndex(true)}</div>
            </nav>
          ) : (
            <CollapsedBar id="reader-index" name="Pages" arrow="▶" onOpen={() => save({ index: true })} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-30 -mx-1 mb-4 flex flex-wrap items-center gap-2 border-b border-line bg-background px-1 py-2" data-toolbar-top>
            <h1 className="mr-2 max-w-[16rem] truncate text-sm font-semibold" title={index.titleEn || index.titleJa}>
              {index.titleEn || index.titleJa}
            </h1>
            <div className="flex items-center gap-2" data-view-tools>
              <ToolSeg label="View" value={s.view} options={[{ value: "page", label: "Page view" }, { value: "scroll", label: "Scroll view" }]} onPick={changeView} />
              {index.images ? <ToolToggle label="Image" pressed={s.image} onToggle={() => save({ image: !s.image })} disabled={s.view !== "page"} disabledTitle={IMAGE_PAGE_ONLY} /> : null}
            </div>
            <ToolSeg label="Text" value={s.text} options={[{ value: "en", label: "EN" }, { value: "ja", label: "JA" }, { value: "pair", label: "Pairing" }]} onPick={(v) => save({ text: v })} />
            <ToolSeg label="English text" value={s.en} options={[{ value: "agent", label: "Agent" }, { value: "human", label: "Human" }]} onPick={(v) => save({ en: v })} disabled={!hasHumanHere} />
            {!hasHumanHere ? <span className="text-xs text-muted" data-no-human>No human version for this page</span> : null}
            <span className="ml-auto flex flex-wrap items-center gap-2">
              {s.view === "page" ? (
                <>
                  {prev ? (
                    <Link href={prev} data-page-prev className="rounded border border-line px-2 py-1 text-sm">
                      ‹ Previous
                    </Link>
                  ) : null}
                  <form onSubmit={goBox} className="flex items-center gap-1">
                    <input value={box} onChange={(e) => setBox(e.target.value)} placeholder={`${at} of ${index.pages}`} aria-label="Page number" inputMode="numeric" data-page-box className="w-24 rounded border border-line bg-white px-1.5 py-1 text-sm placeholder:text-muted" />
                  </form>
                  {next ? (
                    <Link href={next} data-page-next className="rounded border border-line px-2 py-1 text-sm">
                      Next ›
                    </Link>
                  ) : null}
                </>
              ) : null}
              <button type="button" onClick={() => void toggleBookmark()} aria-pressed={Boolean(marked)} data-bookmark-toggle className="rounded border border-line px-2 py-1 text-sm">
                {marked ? "Remove bookmark" : "Bookmark"}
              </button>
              <button type="button" onClick={() => save({ focus: true })} data-focus-enter className="rounded border border-line px-2 py-1 text-sm">
                Focus
              </button>
              <button type="button" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings} data-settings-open className="rounded border border-line px-2 py-1 text-sm">
                Settings
              </button>
            </span>
          </div>
          {boxNote ? <p role="alert" className="mb-2 text-xs text-red-700">{boxNote}</p> : null}
          {content}
          {s.view === "page" ? (
            <p className="mx-auto mt-8 flex max-w-[72ch] justify-between text-sm">
              {prev ? <Link href={prev} className="text-accent underline">‹ Previous page</Link> : <span />}
              {next ? <Link href={next} className="text-accent underline">Next page ›</Link> : <span />}
            </p>
          ) : null}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-1 border-t border-line bg-background px-2 py-1 md:hidden" data-bottom-bar>
        <button type="button" onClick={() => setSheet(true)} data-sheet-open className="min-h-[44px] rounded border border-line px-3 text-sm">
          Pages
        </button>
        {s.view === "page" ? (
          <>
            {prev ? <Link href={prev} aria-label="Previous page" className="flex min-h-[44px] items-center rounded border border-line px-3 text-sm">‹</Link> : <span className="w-10" />}
            <span className="text-sm" data-bottom-page>{pageLabel(at)}</span>
            {next ? <Link href={next} aria-label="Next page" className="flex min-h-[44px] items-center rounded border border-line px-3 text-sm">›</Link> : <span className="w-10" />}
          </>
        ) : (
          <span className="text-sm" data-bottom-page>{here ? pageLabel(here) : ""}</span>
        )}
        <button type="button" onClick={() => void toggleBookmark()} aria-pressed={Boolean(marked)} className="min-h-[44px] rounded border border-line px-3 text-sm">
          {marked ? "Marked" : "Mark"}
        </button>
        <button type="button" onClick={() => setShowSettings((v) => !v)} className="min-h-[44px] rounded border border-line px-3 text-sm">
          Aa
        </button>
      </div>
      {sheet ? (
        <div className="fixed inset-0 z-50 overflow-auto bg-background p-4 md:hidden" role="dialog" aria-label="Pages of the book" data-sheet>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold">Pages</h2>
            <button type="button" onClick={() => setSheet(false)} className="min-h-[44px] rounded border border-line px-3 text-sm">
              Close
            </button>
          </div>
          {sideIndex(true, () => setSheet(false))}
        </div>
      ) : null}
      {showSettings ? <ReaderSettingsPanel s={s} theme={theme} hasHuman={hasHumanHere} onChange={(p) => {
          const { view, ...rest } = p;
          if (Object.keys(rest).length) save(rest);
          if (view) changeView(view);
        }} onTheme={changeTheme} onClose={() => setShowSettings(false)} /> : null}
      {popup}
    </div>
  );
}
