import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse } from "@/lib/htv-api";
import { findFold, slimRows } from "@/lib/reader-folds";
import { loadDashboard } from "@/lib/reader-data";

export const dynamic = "force-dynamic";

// Reader dashboard (unit RC4, round 70): the rows of one month fold. The browser asks when the reader opens the fold.
// GET /api/read/month?id=kj-2014-10   the article rows and the web article rows of October 2014
// The rows are titles, page numbers, and progress counts. They hold no page text, so a reader who waits for approval gets them too
// (VISION-viewer l93-94: "Dashboard index, no text"). The rows of a work do not hold its synopsis here.
const ID_RULE = /^(kj|web)-(\d{4}|unknown)-\d{2}$/;

export async function GET(req: Request) {
  try {
    const g = await guard(req, { mutating: false });
    if (isResponse(g)) return g;
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!ID_RULE.test(id)) return jsonResponse({ error: "Send a month ID such as kj-2014-10 in the query id." }, 400);
    const { dash } = await loadDashboard(g.token, g.user, "", 1);
    const fold = findFold(dash.folds, id);
    if (!fold) return jsonResponse({ error: "No such month." }, 404);
    return jsonResponse({ id, children: slimRows(fold.children) });
  } catch (e) {
    return htvError(e);
  }
}
