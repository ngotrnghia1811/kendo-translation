import { notFound } from "next/navigation";
import ReaderBar from "@/components/ReaderBar";
import ReaderBook from "@/components/ReaderBook";
import { hasThemeCookie, loadPaneSettings, readTheme } from "@/lib/theme";
import { cookies } from "next/headers";
import { requireReaderOrLink } from "@/lib/view-link-server";
import { LINK_VIEW_COOKIE } from "@/lib/view-link";
import { DEFAULT_THEME_READER, isView } from "@/lib/htv-settings";
import { loadBookmarks, loadReaderIndex, loadReaderPages } from "@/lib/reader-data";
import { parseAt } from "@/lib/reader-links";
import { isSafeSegment } from "@/lib/safe-path";
import { OfflineGuard } from "@/components/OfflineBits";
import { mustClearOffline } from "@/lib/offline-copy";

export const dynamic = "force-dynamic";

/** The scroll view loads the text pages within this many pages of the page in view first. */
const SCROLL_WINDOW = 2;

// Reader pages, one book (unit RC1, round 63). VISION-viewer 15.19.2 and 15.19.3.
//   /read/left_foot_full                       the book screen: metadata, AI label summary, every page, "Continue at Page N"
//   /read/left_foot_full?view=page&at=p048     the page view (default): one page
//   /read/left_foot_full?view=scroll&at=p048   the scroll view: all pages in one scroll, jump to p048
// A view in the address wins, else the view of the account (reader.view), else the page view (round 63 answer 7: "Page view by default").
export default async function ReadBook({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const q = await searchParams;
  if (!isSafeSegment(slug)) notFound();
  const atRaw = Array.isArray(q.at) ? q.at[0] : q.at;
  const viewRaw = Array.isArray(q.view) ? q.view[0] : q.view;
  // Unit VW120 (Q-A 3:106.5 row 3): a visitor of a live view-only link reads the book like an approved reader. A dead link goes to /link-ended.
  const s = await requireReaderOrLink(`/read/${slug}`);
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;

  const index = await loadReaderIndex(s.token, s.user, slug);
  if (!index) notFound();
  const panes = await loadPaneSettings(s.token, s.user.id);
  const reader = panes.reader ?? {};
  // Unit VW120 (Q-A 3:106.5 row 4): a link visitor has no account, so the browser keeps the view in the cookie htv_link_view (page or scroll).
  const linkView = s.link === true ? (await cookies()).get(LINK_VIEW_COOKIE)?.value : undefined;
  const view = isView(viewRaw) ? viewRaw : isView(linkView) ? linkView : (reader.view ?? "page");
  const at = parseAt(atRaw, index.pages);
  const note = atRaw && at === null ? `No such page: ${atRaw.slice(0, 12)}. This book has pages 1 to ${index.pages}. The screen shows the book page.` : "";

  let initial = [] as Awaited<ReturnType<typeof loadReaderPages>>;
  let bookmarks = [] as Awaited<ReturnType<typeof loadBookmarks>>;
  if (s.user.approved) {
    bookmarks = await loadBookmarks(s.token, s.user, slug);
    if (at !== null) {
      // Unit RT73a: the scroll view also loads pages that have only Original text rows or a v1 file (dataPages), not only the translated pages.
      const nums = view === "page" ? [at] : index.dataPages.filter((n) => Math.abs(n - at) <= SCROLL_WINDOW);
      initial = await loadReaderPages(s.token, slug, nums, index.digits);
    }
  }
  return (
    <>
      {/* Unit VW131 (Q-A 3:134.3 rows 1 and 6): a visitor of a view-only link or a reader who waits keeps no offline copy on this device. */}
      <OfflineGuard clear={mustClearOffline({ signedIn: true, approved: s.user.approved, linkVisitor: s.link === true })} />
      <ReaderBar name={s.user.name} email={s.user.email} role={s.user.role} approved={s.user.approved} linkVisitor={s.link === true} backHref={at !== null && s.user.approved ? `/read/${encodeURIComponent(slug)}` : undefined} />
      <ReaderBook
        key={slug}
        index={index}
        initialPages={initial}
        user={{ name: s.user.name, email: s.user.email, role: s.user.role, approved: s.user.approved }}
        bookmarks={bookmarks}
        linkVisitor={s.link === true}
        settings={reader}
        view={view}
        at={s.user.approved ? at : null}
        // Unit VW105 (Q-A 3:61.3, finding 4 of DEPLOYCHECK): with no theme cookie the layout of /read sets Solarized light in the browser (components/ReaderTheme.tsx).
        // Before, this prop was "light" in that case, so the Reading settings panel said "Light" while the top bar said "Solarized light".
        theme={(await hasThemeCookie()) ? await readTheme() : DEFAULT_THEME_READER}
        note={note}
      />
    </>
  );
}
