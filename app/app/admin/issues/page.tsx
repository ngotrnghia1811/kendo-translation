import type { Metadata } from "next";
import AdminIssues from "@/components/AdminIssues";
import ReaderBar from "@/components/ReaderBar";
import { bookTitlesOf } from "@/lib/htv-book-titles";
import { requireAdmin } from "@/lib/htv-session";
import { listIssues } from "@/lib/visual-issues";
import { bookSlugsOf } from "@/lib/visual-issue-rules";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Visual issues (admin)" };

// Admin page of the visual issues (unit VW118, plan item P53, Q-A 3:99.5 row 7): "open issues first, with the picture, the comment, a link to the page, and 'Mark resolved' with a note".
// Only the admin role opens it. Another signed-in role goes to /read, a visitor goes to /sign-in (requireAdmin). Each picture comes from /api/admin/issues/<id>/picture (admin only).
export default async function AdminIssuesPage() {
  const s = await requireAdmin("/admin/issues");
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;
  const { issues, total } = await listIssues(s.token);
  // Q-A 3:17.4 and 3:72.2: the title of the book, never only the folder name.
  const titles = await bookTitlesOf(s.token, bookSlugsOf(issues.map((i) => i.pageUrl)));
  return (
    <>
      <ReaderBar name={s.user.name} email={s.user.email} role={s.user.role} approved={s.user.approved} />
      <h1 className="mb-4 text-2xl font-semibold">Visual issues</h1>
      <AdminIssues issues={issues} total={total} titles={titles} />
    </>
  );
}
