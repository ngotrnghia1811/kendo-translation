import { notFound } from "next/navigation";
import PageView from "@/components/PageView";
import { getPage } from "@/lib/page";
import { loadPageNames } from "@/lib/readable-load";
import { loadPageNeighbors } from "@/lib/page-neighbors";
import { isSafeSegment } from "@/lib/safe-path";
import { requireMonitor } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export default async function PageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; page: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  await requireMonitor(); // Round 58 answer 7 (Q-A 2026-10-28 l205): monitor off gives "not found".
  const { slug, page } = await params;
  const { run } = await searchParams;
  if (!isSafeSegment(slug) || !/^p\d+$/.test(page) || (run && !isSafeSegment(run))) notFound();
  const data = await getPage(slug, page, run);
  if (!data) notFound();
  // Unit VW96 (Q-A 3:17.4): the article title and "page n of m" for the header.
  const names = await loadPageNames(data.slug, data.pageName, data.bookTitle);
  // Unit VW115 (Q-A 3:94.2 row 3): the neighbor pages in book order that have a run, for "Previous page" and "Next page".
  const neighbors = await loadPageNeighbors(data.slug, data.pageName);
  return <PageView data={data} names={names} neighbors={neighbors} />;
}
