import type { Metadata } from "next";
import LocalIssues from "@/components/LocalIssues";
import { bookTitlesOf } from "@/lib/htv-book-titles";
import { getSession } from "@/lib/htv-session";
import { monitorEnabled, requireMonitor } from "@/lib/monitor";
import { listLocalIssues } from "@/lib/visual-issues-local";
import { localBookSlugsOf } from "@/lib/visual-issues-local-rules";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return (await monitorEnabled()) ? { title: "Visual issues of this Mac" } : {};
}

// Unit VW121 (plan item P60, Q-A 3:112.2 row 6): the list of the visual issues that were saved as files on this Mac, the newest first. With the Monitor switch off the page gives "not found" (row 4).
// This static route wins over /monitor/[slug] (Next.js sorts static segments before dynamic ones, as for /monitor/phase-2). No book has the slug "issues": the book slugs are
// the folder names of the page images and the entries of pilot-sample/book-slugs.json, and none of them is "issues". The page needs no sign-in, like every Monitor page.
export default async function LocalIssuesPage() {
  await requireMonitor();
  const { issues, skipped, hidden } = await listLocalIssues();
  // Q-A 3:17.4 and 3:72.2: the title of the book, never only the folder name. A person who is signed in gives a token (needed in the pocketbase run source only). A fault gives no title.
  let token = "";
  try {
    token = (await getSession())?.token ?? "";
  } catch {
    token = "";
  }
  const titles = await bookTitlesOf(token, localBookSlugsOf(issues.map((i) => i.pageUrl)));
  return (
    <section>
      <h1 className="mb-2 text-2xl font-semibold">Visual issues of this Mac</h1>
      <LocalIssues issues={issues} skipped={skipped} hidden={hidden} titles={titles} />
    </section>
  );
}
