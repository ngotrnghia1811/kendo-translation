import ReaderBar from "@/components/ReaderBar";
import SearchPanel from "@/components/SearchPanel";
import { requireReaderOrLink } from "@/lib/view-link-server";
import { WAITING } from "@/lib/reader-types";
import { parseSearchParams, pickTab, SEARCH_WORDS, searchReadyFor } from "@/lib/search-core";
import { loadSearch } from "@/lib/search-data";

export const dynamic = "force-dynamic";

// Search page (unit VW124; Q-A 3:115.5 "Implement a comprehensive search function similar to in v1", Q-A 3:117.4 rows 1 to 4).
//   /search                       the box and the tabs
//   /search?q=seme&tab=pages&screen=2   the result list that the server draws, so a reload or a shared link shows the same list
// Who sees what is the gate of /read: an approved reader, a translator, an admin, and a visitor of a view-only link see book hits and page hits.
// A reader who waits for approval sees book hits only. The page text of the hits comes from reader_pages, so only pages that an admin opened for readers match.
export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = parseSearchParams(await searchParams);
  const s = await requireReaderOrLink("/search");
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;
  const initial = searchReadyFor(p.q, pickTab(p.tab, s.user.approved)) ? await loadSearch(s.token, s.user, p.q, p.tab, p.screen) : null;
  return (
    <>
      <ReaderBar name={s.user.name} email={s.user.email} role={s.user.role} approved={s.user.approved} linkVisitor={s.link === true} onSearch />
      {!s.user.approved ? (
        <p role="status" className="mb-4 rounded border border-line bg-white p-3 text-sm" data-waiting>
          {WAITING}
        </p>
      ) : null}
      <h1 className="mb-3 text-2xl font-semibold">{SEARCH_WORDS.title}</h1>
      <SearchPanel initial={initial} query={p.q} approved={s.user.approved} key={`${p.q}|${pickTab(p.tab, s.user.approved)}|${p.screen}`} />
    </>
  );
}
