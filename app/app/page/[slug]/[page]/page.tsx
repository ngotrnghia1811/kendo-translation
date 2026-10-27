import { notFound } from "next/navigation";
import PageView from "@/components/PageView";
import { getPage } from "@/lib/page";
import { isSafeSegment } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

export default async function PageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; page: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { slug, page } = await params;
  const { run } = await searchParams;
  if (!isSafeSegment(slug) || !/^p\d+$/.test(page) || (run && !isSafeSegment(run))) notFound();
  const data = await getPage(slug, page, run);
  if (!data) notFound();
  return <PageView data={data} />;
}
