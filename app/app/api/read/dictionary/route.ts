import { jsonResponse } from "@/lib/api";
import { guardReader, htvError, isResponse } from "@/lib/htv-api";
import { parseDictParams } from "@/lib/dictionary-core";
import { loadDictionaryEntry, loadDictionaryList } from "@/lib/dictionary-data";
import { refuseWrite } from "@/lib/search-refuse";

export const dynamic = "force-dynamic";

// Unit VW126 (Q-A 3:116.8, 3:117.6 rows 1 to 4): the dictionary page asks for a list or for one entry.
// GET /api/read/dictionary?q=kote&screen=2   the entries that hold the words (no q: all entries, 25 on a screen)
// GET /api/read/dictionary?entry=c-00a61202322b   the full entry
// A reader who waits for approval gets 403 (the rule READ_OK of the list says the same). A visitor of a view-only link reads this too (GET only; a link visitor never changes data).
export async function GET(req: Request) {
  try {
    const g = await guardReader(req, { mutating: false, allowLink: true });
    if (isResponse(g)) return g;
    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const p = parseDictParams(raw);
    if (typeof raw.entry === "string" && raw.entry.trim() !== "") {
      if (!p.entry) return jsonResponse({ error: "The entry address has a bad form." }, 400);
      const e = await loadDictionaryEntry(g.token, p.entry);
      if (!e) return jsonResponse({ error: "This entry does not exist in the dictionary." }, 404);
      return jsonResponse({ entry: e });
    }
    return jsonResponse(await loadDictionaryList(g.token, p.q, p.screen));
  } catch (e) {
    return htvError(e);
  }
}

// A write method never works here.
export const POST = refuseWrite;
export const PUT = refuseWrite;
export const PATCH = refuseWrite;
export const DELETE = refuseWrite;
