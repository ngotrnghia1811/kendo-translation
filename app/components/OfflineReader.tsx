"use client";
import { useEffect, useState } from "react";
import ReaderBar from "./ReaderBar";
import ReaderBook from "./ReaderBook";
import { OfflineNote } from "./OfflineBits";
import { OFFLINE_THEME_KEY, OFFLINE_WORDS, formatMb, offlineRoute, pageIdOf, pstDate, type OfflineCopy, type OfflineRoute } from "@/lib/offline-copy";
import { listCopies, readCopy, readPages, readPlace, writePlace } from "@/lib/offline-copy-client";
import { DEFAULT_THEME_READER, isTheme, isView, type ThemeName } from "@/lib/htv-settings";
import { parseAt, type ReaderView } from "@/lib/reader-links";
import type { ReaderPageData } from "@/lib/reader-types";

/*
 * The Reader screen of a saved copy (unit VW131, Q-A 3:134.3 rows 3 and 5). The shell page /read/offline-copy draws it.
 * With no network, the service worker answers /read/<book>?view=..&at=.. with the shell HTML, so the address keeps the book and the page.
 * This component reads the address, then the copy in Cache Storage, and draws ReaderBar and ReaderBook as the server does online,
 * with the band "Offline copy, saved 2026-11-25" on top. ReaderBook gets `offline`: it sends no write, and search and bookmarks say "Not available offline".
 * A page turn is a page load (the router cannot fetch the server data), and the service worker answers it again with the shell.
 * /read, /search, and /dictionary show the list of the saved copies. Search and the dictionary say "Not available offline".
 * The reading place stays on the device (row 5): each page that opens here is the place, and "Continue at Page N" uses it.
 */

/** Same value as SCROLL_WINDOW of app/read/[slug]/page.tsx: the scroll view gets the pages within this many pages of the page in view first. */
const SCROLL_WINDOW = 2;

type State =
  | { kind: "loading" }
  | { kind: "book"; copy: OfflineCopy; view: ReaderView; at: number | null; pages: ReaderPageData[]; note: string; theme: ThemeName }
  | { kind: "list"; route: OfflineRoute | null; copies: OfflineCopy[]; note: string };

/** The theme of the last reader screen (OfflineGuard keeps it), else the theme of the saved shell. */
function screenTheme(): ThemeName {
  let t: string | null = null;
  try {
    t = localStorage.getItem(OFFLINE_THEME_KEY);
  } catch {
    t = null;
  }
  if (isTheme(t)) {
    document.documentElement.setAttribute("data-theme", t);
    return t;
  }
  const own = document.documentElement.getAttribute("data-theme");
  return isTheme(own) ? own : DEFAULT_THEME_READER;
}

async function load(): Promise<State> {
  const route = offlineRoute(location.pathname);
  if (route?.kind === "book") {
    const copy = await readCopy(route.slug);
    if (copy) {
      const q = new URLSearchParams(location.search);
      const atRaw = q.get("at") ?? undefined;
      const viewRaw = q.get("view");
      const view: ReaderView = isView(viewRaw) ? viewRaw : (copy.settings.view ?? "page");
      const at = parseAt(atRaw, copy.index.pages);
      const note = atRaw && at === null ? `No such page: ${atRaw.slice(0, 12)}. This book has pages 1 to ${copy.index.pages}. The screen shows the book page.` : "";
      let pages: ReaderPageData[] = [];
      if (at !== null) {
        writePlace(copy.slug, at);
        const nums = view === "page" ? [at] : copy.textPages.filter((n) => Math.abs(n - at) <= SCROLL_WINDOW);
        pages = await readPages(copy.slug, nums.filter((n) => copy.textPages.includes(n)).map((n) => pageIdOf(copy.slug, n, copy.index.digits)));
      }
      const place = readPlace(copy.slug);
      // The scroll view asks only for saved pages, so a page that the copy lacks shows as a page with no text (not "Loading…" for ever).
      const saved = new Set(copy.textPages);
      const index = { ...copy.index, dataPages: copy.index.dataPages.filter((n) => saved.has(n)), resumeAt: place ?? copy.index.resumeAt };
      return { kind: "book", copy: { ...copy, index }, view, at, pages, note, theme: screenTheme() };
    }
  }
  screenTheme();
  return { kind: "list", route, copies: await listCopies(), note: route?.kind === "book" ? OFFLINE_WORDS.noCopy : "" };
}

export default function OfflineReader() {
  const [st, setSt] = useState<State>({ kind: "loading" });
  useEffect(() => {
    let live = true;
    void load()
      .catch((): State => ({ kind: "list", route: null, copies: [], note: OFFLINE_WORDS.noCopy }))
      .then((s) => {
        if (!live) return;
        setSt(s);
        if (s.kind === "book") document.title = s.copy.title;
      });
    return () => {
      live = false;
    };
  }, []);

  if (st.kind === "loading") return <p className="text-sm text-muted">Loading…</p>;

  if (st.kind === "book") {
    const { copy, at } = st;
    return (
      <>
        <p role="status" className="mb-3 rounded border border-line bg-white px-3 py-2 text-sm font-semibold" data-offline-band>
          {OFFLINE_WORDS.band(pstDate(copy.savedAt))}
        </p>
        <ReaderBar name={copy.user.name} email={copy.user.email} role={copy.user.role} approved={copy.user.approved} backHref={at !== null ? `/read/${encodeURIComponent(copy.slug)}` : undefined} />
        <ReaderBook key={copy.slug} index={copy.index} initialPages={st.pages} user={copy.user} bookmarks={[]} settings={{ ...copy.settings, panelSeen: true }} view={st.view} at={at} theme={st.theme} note={st.note} offline />
      </>
    );
  }

  const first = st.copies[0];
  const what = st.route?.kind === "search" ? "Search" : st.route?.kind === "dictionary" ? "Dictionary" : "";
  return (
    <>
      {first ? <ReaderBar name={first.user.name} email={first.user.email} role={first.user.role} approved={first.user.approved} onSearch={st.route?.kind === "search"} onDictionary={st.route?.kind === "dictionary"} /> : null}
      {what ? <OfflineNote what={what} /> : null}
      {st.note ? (
        <p role="status" className="mb-3 rounded border border-line bg-white px-3 py-2 text-sm" data-offline-no-copy>
          {st.note}
        </p>
      ) : null}
      <h1 className="mb-3 text-2xl font-semibold">{OFFLINE_WORDS.listTitle}</h1>
      {st.copies.length === 0 ? <p className="text-sm">{OFFLINE_WORDS.listEmpty}</p> : null}
      <ul className="grid max-w-3xl gap-2" data-offline-list>
        {st.copies.map((c) => (
          <li key={c.slug} className="rounded border border-line bg-white p-3" data-offline-book={c.slug}>
            <a href={`/read/${encodeURIComponent(c.slug)}`} className="inline-flex min-h-[44px] items-center text-base font-semibold text-accent underline md:min-h-0">
              {c.title}
            </a>
            <p className="text-sm text-muted">{OFFLINE_WORDS.saved(pstDate(c.savedAt), formatMb(c.textBytes + c.imageBytes))}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
