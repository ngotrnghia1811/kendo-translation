import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/lib/htv-session";
import { isSafeSegment } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

// Old route of one page (rounds 50 to 54). Unit UXC step D (round 59): the book screen replaces it, and old links still work.
// /translate/left_foot_full/p048 answers with a redirect to /translate/left_foot_full?at=p048#p048 (VISION-viewer 15.16.2).
// Not signed in: the visitor goes to the sign-in page first, and comes back to the old address, which then redirects.
export default async function OldTranslatePage({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const { slug, page } = await params;
  if (!isSafeSegment(slug) || !/^p\d+$/.test(page)) notFound();
  const s = await requireStaff(`/translate/${slug}/${page}`);
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;
  redirect(`/translate/${encodeURIComponent(slug)}?at=${page}#${page}`);
}
