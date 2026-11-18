import type { Metadata } from "next";
import Link from "next/link";
import AdminVersionPanel from "@/components/AdminVersionPanel";
import ReaderBar from "@/components/ReaderBar";
import { requireAdmin } from "@/lib/htv-session";
import { adminMarks, readerAllPages } from "@/lib/pb";
import { isSafeSegment } from "@/lib/safe-path";
import { bookTitlesOf } from "@/lib/htv-book-titles";
import { titledPage } from "@/lib/readable-names";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Human versions (admin)" };

// Admin page of the human versions and the page checks (unit RC1, round 63 answer 6). Only the admin role opens it.
// The left list holds the pages that have reader text. The panel at the right shows the saved versions of the page in the address (?page=slug/pNNN).
export default async function AdminVersionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const raw = Array.isArray(q.page) ? q.page[0] : q.page;
  const s = await requireAdmin("/admin/versions");
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;
  const pages = await readerAllPages(s.token);
  const marks = await adminMarks(s.token);
  // Unit VW111 (Q-A 3:76.1 place 5, Q-A 3:72.2): each page shows "<book title> · page 12". The page ID is the hover text.
  const titles = await bookTitlesOf(s.token, [...new Set(pages.map((p) => p.pageId.split("/")[0]))]);
  const m = typeof raw === "string" ? /^([^/]+)\/(p\d+)$/.exec(raw) : null;
  const selected = m && isSafeSegment(m[1]) && pages.some((p) => p.pageId === raw) ? raw : null;
  return (
    <>
      <ReaderBar name={s.user.name} email={s.user.email} role={s.user.role} approved={s.user.approved} />
      <h1 className="mb-4 text-2xl font-semibold">Human versions and page checks</h1>
      <div className="flex flex-col gap-6 md:flex-row">
        <nav aria-label="Pages with reader text" className="md:w-64 md:shrink-0" data-version-pages>
          {pages.length === 0 ? <p className="text-sm text-muted">No page has reader text yet. Run the sync command S2.</p> : null}
          <ul className="space-y-1 text-sm">
            {pages.map((p) => (
              <li key={p.pageId}>
                <Link href={`/admin/versions?page=${encodeURIComponent(p.pageId)}`} aria-current={selected === p.pageId ? "page" : undefined} className={"flex items-center justify-between rounded px-2 py-1 hover:bg-stone-100 " + (selected === p.pageId ? "bg-stone-200 font-semibold" : "")}>
                  <span className="min-w-0 break-words" title={`Page ID ${p.pageId}`} data-version-page-name>
                    {titledPage(p.pageId, titles[p.pageId.split("/")[0]])}
                  </span>
                  <span className="text-xs text-muted">
                    {marks.chosen.has(p.pageId) ? "human " : ""}
                    {marks.checked.has(p.pageId) ? "checked" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 flex-1">
          {selected ? <AdminVersionPanel key={selected} pageId={selected} bookTitle={titles[selected.split("/")[0]] ?? ""} /> : <p className="text-sm text-muted">Choose a page in the list.</p>}
        </div>
      </div>
    </>
  );
}
