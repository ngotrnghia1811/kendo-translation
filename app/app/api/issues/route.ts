import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse } from "@/lib/htv-api";
import { foreignOrigin } from "@/lib/htv-origin";
import { createIssue } from "@/lib/visual-issues";
import { checkIssueInput, isPngBytes, PICTURE_MAX_BYTES } from "@/lib/visual-issue-rules";
import { addViewNote } from "@/lib/view-as";

export const dynamic = "force-dynamic";

// Send one visual issue (unit VW118, plan item P53, Q-A 3:98.5 "then write a comment and draw on the screenshot, then click send issue", Q-A 3:99.5 rows 1, 5, and 6).
// POST multipart/form-data: picture (a PNG file, at most PICTURE_MAX_BYTES), comment, page_url, screen_width, theme.
// Who: a signed-in translator or admin. No session gives 401. A reader gives 403 (guard with write: true). The user is the user of the session and the state is "open":
// the route takes neither from the client. PocketBase checks the same rules again (migration 1793300017).
// A request from another site gives 403 (foreignOrigin). The body is not JSON, so the JSON check of guard() does not apply, and the check of the form follows here.
export async function POST(req: Request) {
  try {
    const foreign = foreignOrigin(req);
    if (foreign) return foreign;
    const g = await guard(req, { mutating: false, write: true });
    if (isResponse(g)) return g;
    if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) return jsonResponse({ error: "Send a form with the picture." }, 415);
    // A header that says the body is far over the limit stops the read at once. The picture limit below is the real check.
    const declared = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > PICTURE_MAX_BYTES + 200000) return jsonResponse({ error: "The picture is too large." }, 413);
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonResponse({ error: "The form could not be read." }, 400);
    }
    const picture = form.get("picture");
    if (!(picture instanceof Blob) || picture.size === 0) return jsonResponse({ error: "Send the picture." }, 400);
    if (picture.size > PICTURE_MAX_BYTES) return jsonResponse({ error: "The picture is too large." }, 413);
    if (!isPngBytes(new Uint8Array(await picture.slice(0, 8).arrayBuffer()))) return jsonResponse({ error: "The picture must be a PNG file." }, 415);
    const checked = checkIssueInput({ comment: form.get("comment"), pageUrl: form.get("page_url"), screenWidth: form.get("screen_width"), theme: form.get("theme") });
    if (!checked.ok) return jsonResponse({ error: checked.error }, 400);
    // Unit VW119 (Q-A 3:103.5 row 7): an issue that an admin sends in a view keeps the view in its first line, for example "Viewed as: reader." (no new field).
    const noted = addViewNote(checked.value.comment, g.view);
    if (!noted.ok) return jsonResponse({ error: noted.error }, 400);
    const id = await createIssue(g.token, g.user, { ...checked.value, comment: noted.comment }, new Blob([await picture.arrayBuffer()], { type: "image/png" }));
    return jsonResponse({ ok: true, id });
  } catch (e) {
    return htvError(e);
  }
}
