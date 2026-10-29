import { notFound } from "next/navigation";
import HtvBar from "@/components/HtvBar";
import HtvBook from "@/components/HtvBook";
import { loadBookIndex, loadBookPages, pageName, windowAround } from "@/lib/htv-books";
import { requireSession } from "@/lib/htv-session";
import { isSafeSegment } from "@/lib/safe-path";
import { PbError, runMarks } from "@/lib/pb";
import { PaneSettingsProvider } from "@/components/PaneSettings";
import { loadPaneSettings, readTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

// Human-translation-view, one book with all pages (unit UXC step D, round 59). VISION-viewer 15.16.2.
// The query ?at=p048 makes the server load the window around p048 first. The anchor #p048 scrolls to the section.
export default async function TranslateBook({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const q = await searchParams;
  if (!isSafeSegment(slug)) notFound();
  const atRaw = Array.isArray(q.at) ? q.at[0] : q.at;
  const s = await requireSession(`/translate/${slug}`);
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;

  let pbNote = "";
  let marks = new Map<string, string>();
  try {
    marks = await runMarks(s.token);
  } catch (e) {
    if (!(e instanceof PbError)) throw e;
    pbNote = "The run marks were not read: " + e.message;
  }
  const index = await loadBookIndex(slug, marks, s.token);
  if (!index) notFound();

  const m = typeof atRaw === "string" ? /^p(\d{1,5})$/.exec(atRaw) : null;
  const at = m && Number(m[1]) >= 1 && Number(m[1]) <= index.pages ? Number(m[1]) : null;
  // The first window: the pages around ?at, else the first pages of the book.
  const nums = windowAround(at ?? 2, index.tags, index.pages);
  const initial = await loadBookPages(
    nums.map((n) => ({ slug, page: pageName(n, index.digits) })),
    s.user,
    s.token,
  );
  const panes = await loadPaneSettings(s.token, s.user.id);
  return (
    <PaneSettingsProvider initial={panes} theme={await readTheme()}>
      <HtvBar name={s.user.name} email={s.user.email} role={s.user.role} backHref="/translate" />
      <HtvBook key={slug} index={index} initial={initial} user={{ name: s.user.name, email: s.user.email, role: s.user.role }} at={at} pbNote={pbNote} />
    </PaneSettingsProvider>
  );
}
