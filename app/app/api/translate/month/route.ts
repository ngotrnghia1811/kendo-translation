import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse } from "@/lib/htv-api";
import { PbError, runMarks } from "@/lib/pb";
import { findFold, slimRows } from "@/lib/reader-folds";
import { loadTranslateDashboard } from "@/lib/translate-dash-load";

export const dynamic = "force-dynamic";

// Unit VW112 (round 98, Q-A 3:78.4 row 1): the rows of one month fold of the human translation view /translate.
// The browser asks when a translator or the admin opens the fold (components/ReaderMonth.tsx with to = "translate").
// GET /api/translate/month?id=kj-2014-10   the article rows and the web article rows of October 2014, with the /translate facts of each work
// A reader gets 403, as on the rest of /translate (guard with staff).
const ID_RULE = /^(kj|web)-(\d{4}|unknown)-\d{2}$/;

export async function GET(req: Request) {
  try {
    const g = await guard(req, { mutating: false, staff: true });
    if (isResponse(g)) return g;
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!ID_RULE.test(id)) return jsonResponse({ error: "Send a month ID such as kj-2014-10 in the query id." }, 400);
    let marks = new Map<string, string>();
    try {
      marks = await runMarks(g.token);
    } catch (e) {
      if (!(e instanceof PbError)) throw e;
    }
    const { dash } = await loadTranslateDashboard(g.token, marks, "");
    const fold = findFold(dash.folds, id);
    if (!fold) return jsonResponse({ error: "No such month." }, 404);
    return jsonResponse({ id, children: slimRows(fold.children) });
  } catch (e) {
    return htvError(e);
  }
}
