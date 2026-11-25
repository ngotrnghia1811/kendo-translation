import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BookDetailView from "@/components/BookDetailView";
import BookSettingsForm from "@/components/BookSettingsForm"; // unit VW122
import { loadBookDetail } from "@/lib/book-detail";
import { readBookSettings } from "@/lib/book-settings"; // unit VW122
import { stringifySettingsJson } from "@/lib/settings-json"; // unit VW122
import { requireMonitor, monitorEnabled } from "@/lib/monitor";
import { isSafeSegment } from "@/lib/safe-path";
import { dataRoot } from "@/lib/config"; // unit VW130
import { bookHasPromptVersions } from "@/lib/vector-map-load"; // unit VW130
import { vectorMapBookHref } from "@/lib/vector-map-rules"; // unit VW130

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
  // Unit VW122 (Q-A 3:110.3, 3:112.3 rows 1 to 4): the closed section "Run settings of this book (N changed)". The book title shows with the slug (Q-A 3:17.4).
  // A file problem shows as an error line inside the section (readBookSettings never throws for it). A failed read of the configuration gives no section.
  const named = detail.row.title !== detail.row.slug;
  const settings = await readBookSettings(slug).catch(() => null);
  // Unit VW130 (Q-A 3:133.2 note): the button "Vector map" shows only when the book has at least one stored prompt version. A read problem hides the button.
  const hasMap = await dataRoot().then((root) => bookHasPromptVersions(root, slug)).catch(() => false);
  return (
    <BookDetailView
      initial={detail}
      settings={settings ? <BookSettingsForm slug={slug} title={named ? detail.row.title : null} initialText={stringifySettingsJson(settings)} /> : null}
      vectorMapHref={hasMap ? vectorMapBookHref(slug) : null}
    />
  );
}
