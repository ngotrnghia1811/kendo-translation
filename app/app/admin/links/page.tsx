import type { Metadata } from "next";
import AdminLinks, { type LinkItem } from "@/components/AdminLinks";
import ReaderBar from "@/components/ReaderBar";
import { pstDateOfPb } from "@/lib/pst-more";
import { pstTime } from "@/lib/htv-pst";
import { requireAdmin } from "@/lib/htv-session";
import { linkUrl } from "@/lib/view-link";
import { linkOrigin } from "@/lib/view-link-server";
import { listLinks } from "@/lib/view-link-pb";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "View-only links (admin)" };

// Admin page of the view-only links (unit VW120, plan item P58, Q-A 3:106.5 rows 1, 2, 6 and Q-A 3:107.5 rows 6 and 8).
// Only the admin role opens it. Another signed-in role goes to /read, a link visitor goes to /read, a visitor goes to /sign-in (requireAdmin).
// The page shows the full link of each link so the admin can copy it (row 8). This is the only page that holds a key, and only the admin gets it.
// Times are PST (the rule of /admin, unit TF83). The end date shows as a PST day.
export default async function AdminLinksPage() {
  const s = await requireAdmin("/admin/links");
  if ("down" in s) return <p role="alert" className="text-red-700">{s.down}</p>;
  const [links, origin] = await Promise.all([listLinks(s.token), linkOrigin()]);
  const items: LinkItem[] = links.map((l) => ({
    id: l.id,
    name: l.name,
    url: linkUrl(origin, l.key),
    made: pstDateOfPb(l.created),
    ends: l.ends ? pstDateOfPb(l.ends) : "",
    opens: l.opens,
    lastOpen: l.lastOpen ? pstTime(l.lastOpen) : "",
    state: l.state,
  }));
  return (
    <>
      <ReaderBar name={s.user.name} email={s.user.email} role={s.user.role} approved={s.user.approved} />
      <h1 className="mb-4 text-2xl font-semibold">View-only links</h1>
      <AdminLinks items={items} />
    </>
  );
}
