import ReaderBar from "@/components/ReaderBar";
import ReaderList from "@/components/ReaderList";
import ReaderSearch, { SearchBox } from "@/components/ReaderSearch";
import SearchAllLink from "@/components/SearchAllLink";
import { requireReaderOrLink } from "@/lib/view-link-server";
import { bookTocRecords } from "@/lib/pb";
import { digitsOf, findFold, lazyMonths, withTocRows } from "@/lib/reader-folds";
import { loadDashboard } from "@/lib/reader-data";
import { buildTocRows, tocSlugOf } from "@/lib/reader-toc";
import { foldProgress } from "@/lib/reader-translated";
import { DASHBOARD_TITLE, WAITING } from "@/lib/reader-types";

export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

// Reader dashboard (unit RC4, round 70; VISION-viewer 15.23). It replaces the card grid of unit RC1 (round 63 answers 4 and 9).
//   /read              the folds Books and Kendo Jidai, every visible work at zero too, the progress of each work
//   /read?q=seme       the search results (titles and metadata of the visible works, and the folded page text); &screen=2 for the next 20 hits
//   /read?open=kj-2014-10   the dashboard with that month drawn on the server (the link "Show this month" for a browser without script)
//   /read?open=toc-<slug>   the dashboard with the table of contents of that book drawn on the server (unit VW77e)
// The month folds send no rows. The browser loads them when a month opens (GET /api/read/month). With all rows the HTML had 2.08 MB.
// Any signed-in person sees the folds. A reader who waits for approval sees the folds and the progress and no link to a page.
// The line "Your account waits for approval by an admin." stays. The page text stays closed (rules of PocketBase).
export default async function ReadList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  // Unit VW120 (Q-A 3:106.5 row 3): a visitor of a live view-only link reads the same dashboard as an approved reader. A dead link goes to /link-ended.
  const s = await requireReaderOrLink("/read");
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;
  const screen = Number.parseInt(first(q.screen), 10);
  const { dash: full, search } = await loadDashboard(s.token, s.user, first(q.q), Number.isFinite(screen) ? screen : 1);
  const openRaw = first(q.open);
  let openId = /^(kj|web)-(\d{4}|unknown)-\d{2}$/.test(openRaw) ? openRaw : "";
  let folds = full.folds;
  // Unit VW77e: /read?open=toc-<slug> draws the table of contents of that book on the server (the link "Show the table of contents" for a browser without script).
  // Only a book that has a ToC fold opens. A failed read leaves the fold closed with its link.
  const tocSlug = tocSlugOf(openRaw);
  const tocFold = tocSlug ? findFold(full.folds, openRaw) : null;
  if (tocSlug && tocFold?.toc) {
    try {
      folds = withTocRows(folds, openRaw, buildTocRows(await bookTocRecords(s.token, tocSlug), digitsOf(tocFold.head?.pages ?? 0)));
      openId = openRaw;
    } catch {
      openId = "";
    }
  }
  const dash = { ...full, folds: lazyMonths(folds, openId) };
  const known = dash.visible.every((w) => w.known);
  const t = dash.totals;
  return (
    <>
      <ReaderBar name={s.user.name} email={s.user.email} role={s.user.role} approved={s.user.approved} linkVisitor={s.link === true} />
      {!s.user.approved ? (
        <p role="status" className="mb-4 rounded border border-line bg-white p-3 text-sm" data-waiting>
          {WAITING}
        </p>
      ) : null}
      <h1 className="mb-3 text-2xl font-semibold">{DASHBOARD_TITLE}</h1>
      <SearchBox query={search?.query ?? ""}>
        {/* Unit VW124 (Q-A 3:117.4 row 5): the link "Search all" opens /search with the same words. */}
        <SearchAllLink query={search?.query ?? ""} />
      </SearchBox>
      {search ? (
        <ReaderSearch view={search} approved={s.user.approved} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted" data-dashboard-total>
            {t.works.toLocaleString("en-US")} works, {t.pages.toLocaleString("en-US")} pages.{known ? ` ${foldProgress(t.translated, t.pages)}.` : ""}
          </p>
          <ReaderList dash={dash} approved={s.user.approved} openId={openId} />
        </>
      )}
    </>
  );
}
