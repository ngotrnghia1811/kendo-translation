import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BookDetailView from "@/components/BookDetailView";
import { loadBookDetail } from "@/lib/book-detail";
import { requireMonitor, monitorEnabled } from "@/lib/monitor";
import { isSafeSegment } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

// Unit VW77c (round 86), VISION-viewer 15.24.5: the Details view of one book on the Monitor dashboard. With the monitor off, the page gives "not found" (round 58 answer 7).
// A slug that is not safe, or not in the book set, gives "not found" too.
const load = cache((slug: string) => loadBookDetail(slug));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  if (!(await monitorEnabled())) return {};
  const { slug } = await params;
  if (!isSafeSegment(slug)) return {};
  const d = await load(slug);
  return d ? { title: `Details of ${d.row.title === d.row.slug ? d.row.slug : `${d.row.title} (${d.row.slug})`}` } : {};
}

export default async function BookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireMonitor();
  const { slug } = await params;
  if (!isSafeSegment(slug)) notFound();
  const detail = await load(slug);
  if (!detail) notFound();
  return <BookDetailView initial={detail} />;
}
