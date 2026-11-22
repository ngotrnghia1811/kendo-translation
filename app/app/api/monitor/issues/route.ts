import { jsonResponse } from "@/lib/api";
import { foreignOrigin } from "@/lib/htv-origin";
import { monitorOffResponse } from "@/lib/monitor";
import { PathError } from "@/lib/safe-path";
import { checkIssueInput, isPngBytes, PICTURE_MAX_BYTES } from "@/lib/visual-issue-rules";
import { resolveLocalIssue, saveLocalIssue, senderOfRequest } from "@/lib/visual-issues-local";

export const dynamic = "force-dynamic";

// Unit VW121 (plan item P60, Q-A 3:112.2 rows 3 to 6): the visual issues of this Mac are saved as files in <Viewer repo>/data/visual-issues-local/<issue>/.
// [unit default VW121] A new route below /api/monitor, not a branch inside /api/issues: the PocketBase route of the live site stays as it was, and this route
// answers "not found" (404) with the Monitor switch off, like every Monitor route (row 4). The check comes first, before the form or the session is read.
// POST multipart/form-data: picture (a PNG file, at most PICTURE_MAX_BYTES), comment, page_url, screen_width, theme. The same fields and limits as POST /api/issues.
//   No sign-in is needed (the Monitor pages need none). The session only names the sender in issue.json: the readable name, or "not signed in". The client sends no user.
//   A request from another site gives 403 (foreignOrigin), because this route writes files.
// PATCH application/json { id, state: "resolved" }: the owner's "Resolved" button. It writes the state into issue.json and deletes nothing.
// The folder is never a request value (lib/visual-issues-local.ts), and the folder name of a new issue is made on the server.
function failed(e: unknown): Response {
  if (e instanceof PathError) return jsonResponse({ error: "Not found" }, 404);
  // A plain line. The text of a file error holds a path of this Mac, so it does not go to the browser.
  return jsonResponse({ error: "The issue was not saved on this Mac. Look at the log of the dev server." }, 500);
}

export async function POST(req: Request) {
  try {
    const off = await monitorOffResponse();
    if (off) return off;
    const foreign = foreignOrigin(req);
    if (foreign) return foreign;
    if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) return jsonResponse({ error: "Send a form with the picture." }, 415);
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
    const bytes = new Uint8Array(await picture.arrayBuffer());
    if (!isPngBytes(bytes.subarray(0, 8))) return jsonResponse({ error: "The picture must be a PNG file." }, 415);
    const checked = checkIssueInput({ comment: form.get("comment"), pageUrl: form.get("page_url"), screenWidth: form.get("screen_width"), theme: form.get("theme") });
    if (!checked.ok) return jsonResponse({ error: checked.error }, 400);
    const id = await saveLocalIssue(checked.value, bytes, await senderOfRequest());
    return jsonResponse({ ok: true, id });
  } catch (e) {
    console.error("VW121 save of a local issue failed:", e instanceof Error ? e.message : e);
    return failed(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const off = await monitorOffResponse();
    if (off) return off;
    const foreign = foreignOrigin(req);
    if (foreign) return foreign;
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) return jsonResponse({ error: "Send JSON." }, 415);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "The JSON could not be read." }, 400);
    }
    const b = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    if (b.state !== "resolved") return jsonResponse({ error: 'Send { "id": ..., "state": "resolved" }.' }, 400);
    const state = await resolveLocalIssue(b.id);
    if (!state) return jsonResponse({ error: "Not found" }, 404);
    return jsonResponse({ ok: true, id: b.id, state });
  } catch (e) {
    console.error("VW121 change of a local issue failed:", e instanceof Error ? e.message : e);
    return failed(e);
  }
}
