import { notFound } from "next/navigation";
import HtvBar from "@/components/HtvBar";
import HtvEditor from "@/components/HtvEditor";
import { loadHtvPage } from "@/lib/htv-runs";
import { requireSession } from "@/lib/htv-session";
import { isSafeSegment } from "@/lib/safe-path";
import { listComments, PbError, runMarks, savedRows, savedVersions } from "@/lib/pb";
import type { CommentView, SavedRow, VersionInfo } from "@/lib/htv-types";

export const dynamic = "force-dynamic";

// Human-translation-view, one page (rounds 50 to 54, VISION-viewer 15.10 to 15.12).
export default async function TranslatePage({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const { slug, page } = await params;
  if (!isSafeSegment(slug) || !/^p\d+$/.test(page)) notFound();
  const pageId = `${slug}/${page}`;
  const s = await requireSession(`/translate/${slug}/${page}`);
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;

  let pbNote = "";
  let marked: string | null = null;
  try {
    marked = (await runMarks(s.token)).get(pageId) ?? null;
  } catch (e) {
    if (!(e instanceof PbError)) throw e;
    pbNote = "The run mark could not be read: " + e.message;
  }
  const data = await loadHtvPage(slug, page, marked, s.token);
  if (!data) notFound();

  // A reader has no own boxes and no comments (unit default), so the page loads no saved data for a reader.
  let versions: VersionInfo[] = [];
  let rows: SavedRow[] = [];
  let comments: CommentView[] = [];
  if (s.user.role !== "reader") {
    try {
      versions = await savedVersions(s.token, s.user.id, pageId);
      if (versions[0]) rows = await savedRows(s.token, s.user.id, pageId, versions[0].version);
      comments = await listComments(s.token, s.user, pageId);
    } catch (e) {
      if (!(e instanceof PbError)) throw e;
      pbNote = (pbNote ? pbNote + " " : "") + "Saved data could not be read: " + e.message;
    }
  }
  return (
    <>
      <HtvBar name={s.user.name} email={s.user.email} role={s.user.role} backHref="/translate" />
      <HtvEditor
        key={data.runId}
        data={data}
        user={{ name: s.user.name, email: s.user.email, role: s.user.role }}
        versions={versions}
        initialRows={rows}
        initialComments={comments}
        pbNote={pbNote}
      />
    </>
  );
}
