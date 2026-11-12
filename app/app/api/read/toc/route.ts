import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse } from "@/lib/htv-api";
import { bookTocRecords } from "@/lib/pb";
import { digitsOf, findFold } from "@/lib/reader-folds";
import { loadDashboard } from "@/lib/reader-data";
import { buildTocRows, tocSlugOf } from "@/lib/reader-toc";

export const dynamic = "force-dynamic";

// Reader dashboard (unit VW77e part 1, Q-A 3:10.4 F1 and F2): the table of contents rows of one book fold. The browser asks when the reader opens the fold.
// GET /api/read/toc?id=toc-ogawa_lecture_part1   the chapter rows (level 1) and the sub-rows (level 2) of that book, by order
// The rows are titles and page numbers. They hold no page text, so a reader who waits for approval gets them too (like /api/read/month).
// The fold must exist on the dashboard: a book that the dashboard hides (a copy, a part of another book) has no fold and gives 404.
export async function GET(req: Request) {
  try {
    const g = await guard(req, { mutating: false });
    if (isResponse(g)) return g;
    const id = new URL(req.url).searchParams.get("id") ?? "";
    const slug = tocSlugOf(id);
    if (!slug) return jsonResponse({ error: "Send a book fold ID such as toc-ogawa_lecture_part1 in the query id." }, 400);
    const { dash } = await loadDashboard(g.token, g.user, "", 1);
    const fold = findFold(dash.folds, id);
    if (!fold || !fold.toc) return jsonResponse({ error: "No such book." }, 404);
    const records = await bookTocRecords(g.token, slug);
    return jsonResponse({ id, children: buildTocRows(records, digitsOf(fold.head?.pages ?? 0)) });
  } catch (e) {
    return htvError(e);
  }
}
