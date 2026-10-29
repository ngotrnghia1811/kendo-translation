"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HtvBookIndex, HtvBookPage, HtvPageTag, Role } from "@/lib/htv-types";
import { VerdictPill } from "./Pills";
import HtvIndex from "./HtvIndex";
import HtvPageSection from "./HtvPageSection";
import HtvPanelFrame from "./HtvPanelFrame";
import Tl3Panel from "./HtvPanel";
import { PaneCog, usePaneSetting, useTl3Width } from "./PaneSettings";

// Book screen of the human-translation-view (unit UXC step D, round 59). VISION-viewer 15.16.2.
// Round 58 answer 3 (Q-A 2026-10-28 l201): "Not just translated pages. All pages. With agent translated pages tagged."
// Round 59 answer 3 (l221): a page with no agent translation shows its page number and the tag "No agent translation" only.
// Round 59 answer 4 (l222): Save per page section, left index with Go to page, month headings, no tick-all button.
// One section for each page. A section loads its rows when it is within 2 pages of the screen. A section with unsaved text never unloads.
// One TL_3 information panel shows the page in view (the section at 35 percent of the screen height). A click on a page heading pins that page.

const KEEP_PAGES = 8; // [unit default] a clean section farther than this from the screen unloads
const NEAR_MARGIN = "500px 0px"; // [unit default] a section within this distance of the screen counts as near
const LOAD_RADIUS = 2; // VISION-viewer 15.16.2: a section loads its rows when it is within 2 pages of the screen
const BATCH = 8; // the route /api/htv/page takes 8 pages at most
const TAGGED_HEIGHT = 360; // [unit default] height of a tagged section that is not loaded
const ANCHOR_MS = 5000; // [unit default] after a jump, the target stays at the top for this time unless the user scrolls

async function api<T = Record<string, unknown>>(method: string, url: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  let data = {} as T & { error?: string };
  try {
    data = await r.json();
  } catch {
    /* no body */
  }
  return { ok: r.ok, status: r.status, data };
}

interface User {
  name: string;
  email: string;
  role: Role;
}

const Section = memo(function Section({
  n,
  name,
  slug,
  tag,
  page,
  user,
  pinned,
  minHeight,
  register,
  onPin,
  onDirty,
  onReload,
}: {
  n: number;
  name: string;
  slug: string;
  tag: HtvPageTag | undefined;
  page: HtvBookPage | undefined;
  user: User;
  pinned: boolean;
  minHeight: number | undefined;
  register: (n: number, el: HTMLElement | null) => void;
  onPin: (n: number) => void;
  onDirty: (n: number, dirty: boolean) => void;
  onReload: (n: number) => Promise<void>;
}) {
  const pinButton = (
    <button
      type="button"
      onClick={() => onPin(n)}
      aria-pressed={pinned}
      title={pinned ? "The TL_3 information panel is pinned to this page. Click to follow the page in view." : "Click to show the TL_3 information panel of this page"}
      className={"underline-offset-2 hover:underline " + (pinned ? "text-accent" : "")}
      data-pin={`${slug}/${name}`}
    >
      {slug}/{name}
    </button>
  );
  return (
    <section
      id={name}
      data-section={name}
      data-n={n}
      ref={(el) => register(n, el)}
      style={page?.data ? undefined : { minHeight }}
      className="scroll-mt-3 border-t border-line py-3"
    >
      {!tag ? (
        <h2 className="flex flex-wrap items-center gap-3 text-base font-semibold">
          {pinButton}
          <span className="rounded bg-stone-200 px-2 py-0.5 text-sm font-normal text-stone-700" data-untagged>
            No agent translation
          </span>
        </h2>
      ) : page?.data ? (
        <HtvPageSection page={page} data={page.data} user={user} pinned={pinned} onPin={onPin} onDirty={onDirty} onReload={onReload} />
      ) : (
        <div>
          <h2 className="flex flex-wrap items-center gap-3 text-lg font-semibold">
            {pinButton}
            <VerdictPill verdict={tag.verdict} score={tag.score} />
            <span className="font-mono text-xs font-normal text-muted">{tag.shownRunId}</span>
          </h2>
          <p className="mt-2 text-sm text-muted" data-loading>
            Loading the rows of this page…
          </p>
        </div>
      )}
    </section>
  );
});

export default function HtvBook({ index, initial, user, at, pbNote }: { index: HtvBookIndex; initial: HtvBookPage[]; user: User; at: number | null; pbNote: string }) {
  const { slug, pages, digits } = index;
  const nameOf = useCallback((n: number) => "p" + String(n).padStart(digits, "0"), [digits]);
  const readOnly = user.role === "reader";

  const [loaded, setLoaded] = useState<Record<number, HtvBookPage>>(() => Object.fromEntries(initial.map((p) => [p.n, p])));
  const [tags, setTags] = useState<Record<number, HtvPageTag>>(() => Object.fromEntries(index.tags.map((t) => [t.n, t])));
  const [inView, setInView] = useState<number>(at ?? 1);
  const [pinned, setPinned] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  // Round 58 answer 5: the width of the panel is a setting of the pane tl3 (drag or cog), kept in the account.
  const [panelWidth, setPanelWidth] = useTl3Width();
  const tl3 = usePaneSetting("tl3");
  const [near, setNear] = useState<[number, number] | null>(null);
  const [dirtyPages, setDirtyPages] = useState<number[]>([]);
  const [note, setNote] = useState("");
  // Height of a section that unloaded, so that the page does not jump.
  const [heights, setHeights] = useState<Record<number, number>>({});

  const loadedRef = useRef(loaded);
  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);
  const tagsRef = useRef(tags);
  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);
  const loading = useRef(new Set<number>());
  const els = useRef(new Map<number, HTMLElement>());
  const dirtySet = useRef(new Set<number>());
  const viewObs = useRef<IntersectionObserver | null>(null);
  const nearObs = useRef<IntersectionObserver | null>(null);
  const nearSet = useRef(new Set<number>());
  // After a jump (Go to page, ?at), the sections above the target load and grow. The target stays at the top for a short time,
  // until the user scrolls, so that the jump does not end on another page.
  const anchor = useRef<{ n: number; until: number } | null>(null);

  // ------------------------------------------------------------ load the rows near the screen
  const fetchPages = useCallback(
    async (nums: number[]): Promise<void> => {
      for (let i = 0; i < nums.length; i += BATCH) {
        const part = nums.slice(i, i + BATCH);
        part.forEach((n) => loading.current.add(n));
        const r = await api<{ pages: HtvBookPage[] }>("GET", `/api/htv/page?ids=${part.map((n) => encodeURIComponent(`${slug}/${nameOf(n)}`)).join(",")}`);
        part.forEach((n) => loading.current.delete(n));
        if (!r.ok) {
          setNote(r.status === 401 ? "Your sign-in ended. Sign in again. Your text stays in the boxes." : (r.data.error ?? "The rows of some pages did not load."));
          continue;
        }
        const got = r.data.pages ?? [];
        setLoaded((l) => {
          const next = { ...l };
          for (const p of got) next[p.n] = p;
          return next;
        });
        setTags((t) => {
          const next = { ...t };
          for (const p of got) {
            if (p.data) next[p.n] = { n: p.n, verdict: p.data.verdict, score: p.data.score, shownRunId: p.data.runId, marked: p.data.markedRunId !== null };
          }
          return next;
        });
      }
    },
    [slug, nameOf],
  );

  const reload = useCallback(
    async (n: number) => {
      setLoaded((l) => {
        const next = { ...l };
        delete next[n];
        return next;
      });
      await fetchPages([n]);
    },
    [fetchPages],
  );

  useEffect(() => {
    if (!near) return;
    const [lo, hi] = near;
    const want = Object.keys(tagsRef.current)
      .map(Number)
      .filter((n) => n >= lo - LOAD_RADIUS && n <= hi + LOAD_RADIUS && !loadedRef.current[n] && !loading.current.has(n))
      .sort((a, b) => a - b);
    if (want.length > 0) void fetchPages(want);
    // Unload clean sections that are far from the screen. A section with unsaved text stays.
    // Right after a jump the screen is on its way to the target, so nothing unloads in that time.
    const jumping = anchor.current !== null && Date.now() < anchor.current.until;
    const far = jumping ? [] : Object.keys(loadedRef.current)
      .map(Number)
      .filter((n) => (n < lo - KEEP_PAGES || n > hi + KEEP_PAGES) && !dirtySet.current.has(n));
    if (far.length > 0) {
      const measured: Record<number, number> = {};
      for (const n of far) {
        const el = els.current.get(n);
        if (el) measured[n] = el.offsetHeight;
      }
      setHeights((h) => ({ ...h, ...measured }));
      setLoaded((l) => {
        const next = { ...l };
        for (const n of far) delete next[n];
        return next;
      });
    }
  }, [near, fetchPages]);

  // ------------------------------------------------------------ observers
  const register = useCallback((n: number, el: HTMLElement | null) => {
    if (el) {
      els.current.set(n, el);
      viewObs.current?.observe(el);
      nearObs.current?.observe(el);
    } else {
      const old = els.current.get(n);
      if (old) {
        viewObs.current?.unobserve(old);
        nearObs.current?.unobserve(old);
        nearSet.current.delete(n);
      }
      els.current.delete(n);
    }
  }, []);

  useEffect(() => {
    // The line at 35 percent of the screen height decides which page is in view (VISION-viewer 15.16.2).
    const view = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setInView(Number((e.target as HTMLElement).dataset.n));
      },
      { rootMargin: "-35% 0px -64% 0px" },
    );
    const nearO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.n);
          if (e.isIntersecting) nearSet.current.add(n);
          else nearSet.current.delete(n);
        }
        if (nearSet.current.size > 0) {
          const all = [...nearSet.current];
          const lo = Math.min(...all);
          const hi = Math.max(...all);
          setNear((p) => (p && p[0] === lo && p[1] === hi ? p : [lo, hi]));
        }
      },
      { rootMargin: NEAR_MARGIN },
    );
    viewObs.current = view;
    nearObs.current = nearO;
    for (const el of els.current.values()) {
      view.observe(el);
      nearO.observe(el);
    }
    return () => {
      view.disconnect();
      nearO.disconnect();
      viewObs.current = null;
      nearObs.current = null;
    };
  }, []);

  // ------------------------------------------------------------ start, jump
  useEffect(() => {
    void api("POST", "/api/htv/refresh", {});
    if (at) {
      anchor.current = { n: at, until: Date.now() + ANCHOR_MS };
      document.getElementById(nameOf(at))?.scrollIntoView();
    }
  }, [at, nameOf]);

  useEffect(() => {
    const stop = () => {
      anchor.current = null;
    };
    const events = ["wheel", "touchstart", "keydown", "mousedown"] as const;
    for (const e of events) window.addEventListener(e, stop, { passive: true });
    return () => {
      for (const e of events) window.removeEventListener(e, stop);
    };
  }, []);

  useEffect(() => {
    const a = anchor.current;
    if (!a || Date.now() > a.until) return;
    const el = els.current.get(a.n);
    if (el && Math.abs(el.getBoundingClientRect().top) > 4) el.scrollIntoView();
  }, [loaded, heights]);

  const goTo = useCallback(
    (n: number) => {
      const id = nameOf(n);
      anchor.current = { n, until: Date.now() + ANCHOR_MS };
      document.getElementById(id)?.scrollIntoView();
      window.history.replaceState(null, "", `${window.location.pathname}?at=${id}#${id}`);
      setInView(n);
    },
    [nameOf],
  );

  const togglePin = useCallback((n: number) => setPinned((p) => (p === n ? null : n)), []);

  // ------------------------------------------------------------ unsaved text in any section
  const onDirty = useCallback((n: number, dirty: boolean) => {
    const had = dirtySet.current.has(n);
    if (dirty === had) return;
    if (dirty) dirtySet.current.add(n);
    else dirtySet.current.delete(n);
    setDirtyPages([...dirtySet.current].sort((a, b) => a - b));
  }, []);

  // Round 52 answer 12 (Q-A l83): "Warn on unsaved leave". The browser warns on a reload, a close, and a typed address.
  // A click on a link that leaves this screen asks first (capture phase, before the Next.js link handler). A move inside the screen does not warn.
  useEffect(() => {
    const names = () => [...dirtySet.current].sort((a, b) => a - b).map(nameOf).join(", ");
    const before = (e: BeforeUnloadEvent) => {
      if (dirtySet.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const click = (e: MouseEvent) => {
      if (dirtySet.current.size === 0 || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      if (!window.confirm(`You have unsaved text on ${names()}. Leave without saving?`)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [nameOf]);

  // ------------------------------------------------------------ render
  const items = useMemo(() => Array.from({ length: pages }, (_, i) => ({ n: i + 1, name: nameOf(i + 1) })), [pages, nameOf]);
  const chapterAt = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of index.chapters) if (c.pageStart >= 1 && c.pageStart <= pages && !m.has(c.pageStart)) m.set(c.pageStart, c.titleEn || c.chapter);
    return m;
  }, [index.chapters, pages]);
  const firstTagged = useMemo(() => index.tags[0]?.n ?? null, [index.tags]);
  const taggedCount = Object.keys(tags).length;

  const panelN = pinned ?? inView;
  const panelTag = tags[panelN];
  const panelPage = loaded[panelN];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {index.title || slug}
            <span className="ml-3 font-mono text-sm font-normal text-muted">{slug}</span>
          </h1>
          <p className="mt-1 text-sm text-muted" data-book-facts>
            {pages} pages. {taggedCount} {taggedCount === 1 ? "page has" : "pages have"} an agent translation.
            {firstTagged ? (
              <>
                {" "}
                <a href={`#${nameOf(firstTagged)}`} className="text-accent underline" data-first-tagged>
                  Go to the first page with an agent translation ({nameOf(firstTagged)})
                </a>
                .
              </>
            ) : null}
          </p>
          {readOnly ? <p className="mt-1 text-sm text-muted">This account can read only. It has no own boxes and no comments.</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          {dirtyPages.length > 0 ? (
            <span className="text-sm text-amber-800" data-unsaved>
              Unsaved text on {dirtyPages.map(nameOf).join(", ")}
            </span>
          ) : null}
          <button type="button" onClick={() => setPanelOpen((v) => !v)} className="text-sm text-accent underline">
            {panelOpen ? "Hide the TL_3 information panel" : "Show the TL_3 information panel"}
          </button>
        </div>
      </div>
      {pbNote ? <p className="mt-2 text-sm text-red-700">{pbNote}</p> : null}
      {note ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {note}
        </p>
      ) : null}

      <div className="mt-3 flex items-start gap-4">
        <HtvIndex items={items} tags={tags} chapters={index.chapters} current={inView} pageCount={pages} digits={digits} onGo={goTo} />
        <div className="min-w-0 flex-1" data-sections>
          {items.map((it) => (
            <div key={it.n}>
              {chapterAt.has(it.n) ? (
                <h2 id={`chapter-${it.n}`} className="mt-6 scroll-mt-3 border-t-2 border-accent pt-2 text-xl font-semibold" data-chapter={it.n}>
                  {chapterAt.get(it.n)}
                </h2>
              ) : null}
              <Section
                n={it.n}
                name={it.name}
                slug={slug}
                tag={tags[it.n]}
                page={loaded[it.n]}
                user={user}
                pinned={pinned === it.n}
                minHeight={heights[it.n] ?? (tags[it.n] ? TAGGED_HEIGHT : undefined)}
                register={register}
                onPin={togglePin}
                onDirty={onDirty}
                onReload={reload}
              />
            </div>
          ))}
        </div>
        {panelOpen ? (
          <HtvPanelFrame width={panelWidth} onWidth={setPanelWidth} onClose={() => setPanelOpen(false)} style={tl3.style} cog={<PaneCog id="tl3" />}>
            <p className="mb-1 flex flex-wrap items-center gap-x-2 text-[0.85em] text-muted" data-panel-page={nameOf(panelN)}>
              <span>
                Page <span className="font-mono">{nameOf(panelN)}</span> {pinned === panelN ? "(pinned)" : "(page in view)"}
              </span>
              {pinned !== null ? (
                <button type="button" onClick={() => setPinned(null)} className="text-accent underline">
                  Follow the page in view
                </button>
              ) : null}
            </p>
            {!panelTag ? (
              <p className="text-muted" data-panel-none>
                No agent run for this page.
              </p>
            ) : panelPage?.data ? (
              <Tl3Panel key={panelN} panel={panelPage.data.panel} slug={slug} />
            ) : (
              <p className="text-muted">Loading the panel…</p>
            )}
          </HtvPanelFrame>
        ) : null}
      </div>
    </div>
  );
}
