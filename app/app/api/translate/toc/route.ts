import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse } from "@/lib/htv-api";
import { PbError, runMarks } from "@/lib/pb";
import { tocSlugOf } from "@/lib/reader-toc";
import { loadTranslateDashboard, translateTocRows } from "@/lib/translate-dash-load";

export const dynamic = "force-dynamic";

// Unit VW112 fix round (Q-A 3:80.3): the table of contents rows of one book fold of the human translation view /translate.
// Owner words: "/translate has no table-of-contents folds inside a book, unlike /read? I literlly said use the same fold use /read for navigation".
// The browser asks when a translator or the admin opens the fold (components/ReaderMonth.tsx with kind "toc" and to = "translate").
// GET /api/translate/toc?id=toc-ogawa_lecture_part1   the rows of that book, each with a link to /translate/<book> at its page
// A reader gets 403, as on the rest of /translate (guard with staff). A hidden book or a book without ToC rows gives 404, as on /api/read/toc.
export async function GET(req: Request) {
  try {
    const g = await guard(req, { mutating: false, staff: true });
    if (isResponse(g)) return g;
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!tocSlugOf(id)) return jsonResponse({ error: "Send a book fold ID such as toc-ogawa_lecture_part1 in the query id." }, 400);
    let marks = new Map<string, string>();
    try {
      marks = await runMarks(g.token);
    } catch (e) {
      if (!(e instanceof PbError)) throw e;
    }
    const td = await loadTranslateDashboard(g.token, marks, "");
    const rows = await translateTocRows(g.token, td, id);
    if (!rows) return jsonResponse({ error: "No such book." }, 404);
    return jsonResponse({ id, children: rows });
  } catch (e) {
    return htvError(e);
  }
}
