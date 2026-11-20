import "server-only";
import { loadConfig } from "./config";
import { getSession } from "./htv-session";
import { PbError } from "./pb";
import type { SessionUser } from "./htv-types";
import { canReportIssue, type IssueInput, type IssueState, type IssueView } from "./visual-issue-rules";

/*
 * Server side of the visual-issue tool (unit VW118, plan item P53, Q-A 3:98.5 and 3:99.5, rows 5 to 8).
 * All PocketBase calls for the collection visual_issues sit here, in a new file on purpose (the dev server keeps old module instances, VW77a).
 * Every call uses the token of the signed-in user, so the PocketBase rules of the migration 1793300017 apply as the last lock:
 *   create by a translator or admin for the own user, list and view for an admin (a translator: the own issues), update and delete for an admin only.
 * The module never logs a token and never returns one. A fault of PocketBase gives a plain PbError with its status.
 */

const COLLECTION = "visual_issues";
const LIST_FIELDS = "id,comment,page_url,screen_width,theme,state,resolve_note,created,expand.user.name";
const PER_PAGE = 200;
/** The list page reads at most this many pages of PER_PAGE issues [unit default VW118]. */
const MAX_PAGES = 5;

interface Answer {
  status: number;
  data: Record<string, unknown>;
}

async function call(method: string, path: string, opts: { token: string; json?: unknown; form?: FormData }): Promise<Answer> {
  const { pocketbaseUrl } = await loadConfig();
  const headers: Record<string, string> = { Accept: "application/json", Authorization: opts.token };
  if (opts.json !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(pocketbaseUrl + path, {
      method,
      headers,
      body: opts.form ?? (opts.json === undefined ? undefined : JSON.stringify(opts.json)),
      cache: "no-store",
    });
  } catch {
    throw new PbError(503, "The sign-in server is not reachable. Start PocketBase and try again.");
  }
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = text ? JSON.parse(text) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) data = parsed as Record<string, unknown>;
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

const ok = (a: Answer) => a.status >= 200 && a.status < 300;

/** A plain message of a failed answer. The first field message of PocketBase goes after the main message, so that "Failed to create record" says why. */
function failure(a: Answer, fallback: string): PbError {
  let msg = typeof a.data.message === "string" && a.data.message ? a.data.message : fallback;
  const fields = a.data.data;
  if (fields && typeof fields === "object") {
    for (const [name, info] of Object.entries(fields as Record<string, unknown>)) {
      const m = info && typeof info === "object" ? (info as Record<string, unknown>).message : undefined;
      if (typeof m === "string" && m) {
        msg += ` (${name}: ${m})`;
        break;
      }
    }
  }
  return new PbError(a.status, msg);
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** True when the visitor has a session and the role translator or admin. Row 1 (Q-A 3:99.5): the icon shows for these two roles only. A fault of PocketBase hides the icon and breaks no page. */
export async function canReportIssues(): Promise<boolean> {
  try {
    const s = await getSession();
    return s !== null && canReportIssue(s.user.role);
  } catch {
    return false;
  }
}

/** Store one issue. `png` is the picture. The user comes from the session and the state is "open", never from the client. Returns the ID of the record. */
export async function createIssue(token: string, user: SessionUser, f: IssueInput, png: Blob): Promise<string> {
  const form = new FormData();
  form.set("user", user.id);
  form.set("state", "open");
  form.set("comment", f.comment);
  form.set("page_url", f.pageUrl);
  form.set("screen_width", String(f.screenWidth));
  form.set("theme", f.theme);
  form.set("picture", png, "issue.png");
  const a = await call("POST", `/api/collections/${COLLECTION}/records`, { token, form });
  if (!ok(a) || typeof a.data.id !== "string") throw failure(a, "The issue was not saved.");
  return a.data.id;
}

function viewOf(r: Record<string, unknown>): IssueView {
  const expand = r.expand && typeof r.expand === "object" ? (r.expand as Record<string, unknown>) : {};
  const user = expand.user && typeof expand.user === "object" ? (expand.user as Record<string, unknown>) : {};
  const width = typeof r.screen_width === "number" ? r.screen_width : 0;
  const state: IssueState = r.state === "resolved" ? "resolved" : "open";
  return {
    id: str(r.id),
    comment: str(r.comment),
    pageUrl: str(r.page_url),
    screenWidth: width,
    theme: str(r.theme),
    state,
    resolveNote: str(r.resolve_note),
    created: str(r.created),
    userName: str(user.name) || "(no name)",
  };
}

/** The issues for the admin page: open first (the text "open" sorts before "resolved"), the newest first inside a state. Row 7. */
export async function listIssues(token: string): Promise<{ issues: IssueView[]; total: number }> {
  const issues: IssueView[] = [];
  let total = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const q = `page=${page}&perPage=${PER_PAGE}&sort=state,-created&expand=user&fields=${encodeURIComponent(LIST_FIELDS)}`;
    const a = await call("GET", `/api/collections/${COLLECTION}/records?${q}`, { token });
    if (!ok(a)) throw failure(a, "The issues were not read.");
    const items = Array.isArray(a.data.items) ? (a.data.items as Record<string, unknown>[]) : [];
    total = typeof a.data.totalItems === "number" ? a.data.totalItems : total + items.length;
    for (const r of items) issues.push(viewOf(r));
    if (items.length < PER_PAGE || issues.length >= total) break;
  }
  return { issues, total };
}

/** Row 7 and row 8: "Mark resolved" with a note. Only the admin rule of PocketBase lets this pass. The route checks the role first. */
export async function resolveIssue(token: string, id: string, note: string): Promise<void> {
  const a = await call("PATCH", `/api/collections/${COLLECTION}/records/${encodeURIComponent(id)}`, { token, json: { state: "resolved", resolve_note: note } });
  if (!ok(a)) throw failure(a, "The issue was not changed.");
}

/**
 * The picture of one issue as a response, for the admin page. The file field is protected, so the app asks PocketBase for a short-lived file token with the token of the admin,
 * then reads the file with it and streams it. The browser never sees the file token. The view rule of PocketBase decides who may read (an admin, or the author).
 */
export async function issuePicture(token: string, id: string): Promise<Response> {
  const rec = await call("GET", `/api/collections/${COLLECTION}/records/${encodeURIComponent(id)}?fields=id,picture`, { token });
  if (!ok(rec)) throw failure(rec, "The issue was not found.");
  const file = str(rec.data.picture);
  if (!file) throw new PbError(404, "This issue has no picture.");
  const ft = await call("POST", "/api/files/token", { token, json: {} });
  const fileToken = str(ft.data.token);
  if (!ok(ft) || !fileToken) throw failure(ft, "The picture could not be read.");
  const { pocketbaseUrl } = await loadConfig();
  let res: Response;
  try {
    res = await fetch(`${pocketbaseUrl}/api/files/${COLLECTION}/${encodeURIComponent(id)}/${encodeURIComponent(file)}?token=${encodeURIComponent(fileToken)}`, { cache: "no-store" });
  } catch {
    throw new PbError(503, "The sign-in server is not reachable. Start PocketBase and try again.");
  }
  if (!res.ok || !res.body) throw new PbError(res.status === 404 ? 404 : 502, "The picture could not be read.");
  return new Response(res.body, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" },
  });
}
