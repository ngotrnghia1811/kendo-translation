import "server-only";
import { loadConfig } from "./config";
import type { ChapterHead, CommentView, HtvRun, Role, SavedRow, SessionUser, TermEntry, VersionInfo } from "./htv-types";
import type { BookmarkView, DashArticle, DashChapter, DashWork, ReaderBookFacts, ReaderExtra, ReaderFact, ReaderMark, ReaderPageRecord } from "./reader-types";
import { hasAgentRecord } from "./reader-web";
import type { PaneSettings, ThemeName } from "./htv-settings";
import { isTheme } from "./htv-settings";

/*
 * ALL PocketBase calls of the app sit in this one module (round 54 answer 10, Q-A 2026-10-28 l129:
 * "Server routes, plain fetch (Recommended)"). Server code calls PocketBase with the token of the signed-in user,
 * so the PocketBase rules of the collections apply (section 15.12.2 of the Viewer vision). The app holds no superuser account.
 * The module never logs, prints, or returns a password or a token to page scripts.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

export class PbError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "PbError";
    this.status = status;
  }
}

interface PbResult {
  status: number;
  data: J;
}

/** One request to PocketBase. A bad HTTP status does not throw. A network failure throws a plain PbError with status 503. */
async function pbFetch(method: string, path: string, opts: { token?: string; body?: unknown } = {}): Promise<PbResult> {
  const { pocketbaseUrl } = await loadConfig();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = opts.token;
  let res: Response;
  try {
    res = await fetch(pocketbaseUrl + path, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: "no-store",
    });
  } catch {
    throw new PbError(503, "The sign-in server is not reachable. Start PocketBase and try again.");
  }
  const text = await res.text();
  let data: J = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

/** Plain message of a failed PocketBase answer. The body of the request never goes into the message. */
function failure(r: PbResult, fallback: string): PbError {
  const msg = typeof r.data?.message === "string" && r.data.message ? r.data.message : fallback;
  return new PbError(r.status, msg);
}

function ok(r: PbResult): boolean {
  return r.status >= 200 && r.status < 300;
}

/** PocketBase filter text: a string literal in double quotes with `\` and `"` escaped. */
export function q(s: string): string {
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

// ---------------------------------------------------------------- token and user

function jwtPayload(token: string): J | null {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

/** Seconds until the token expires, from the exp claim. 0 when the token is not readable. */
export function tokenSecondsLeft(token: string): number {
  const exp = Number(jwtPayload(token)?.exp ?? 0);
  return Math.max(0, Math.floor(exp - Date.now() / 1000));
}

/** Role of the Viewer. The v1 value qa and any unknown value count as reader (section 15.12.2). */
export function normalizeRole(v: unknown): Role {
  return v === "admin" || v === "translator" ? v : "reader";
}

function toUser(rec: J): SessionUser {
  return {
    id: String(rec.id),
    email: String(rec.email ?? ""),
    name: String(rec.name ?? ""),
    role: normalizeRole(rec.role),
    // Staff always read. A reader reads after an admin sets approved (round 63 answer 4).
    approved: normalizeRole(rec.role) !== "reader" || rec.approved === true,
  };
}

/** Sign in with email and password. A wrong password gives ok false with a plain message. */
export async function pbSignIn(email: string, password: string): Promise<{ ok: true; token: string; user: SessionUser } | { ok: false; status: number; message: string }> {
  const r = await pbFetch("POST", "/api/collections/users/auth-with-password", { body: { identity: email, password } });
  if (!ok(r) || typeof r.data?.token !== "string") {
    // PocketBase answers 400 for a wrong identity or password. Do not say which one was wrong.
    const bad = r.status === 400 || r.status === 401 || r.status === 403;
    return { ok: false, status: bad ? 401 : r.status, message: bad ? "The email or the password is wrong." : "Sign-in failed. Try again later." };
  }
  if (r.data.record?.disabled === true) return { ok: false, status: 401, message: "The email or the password is wrong." };
  return { ok: true, token: r.data.token, user: toUser(r.data.record) };
}

/** Ask PocketBase for a new token. Null when the token is no longer valid. */
export async function pbRefresh(token: string): Promise<{ token: string; user: SessionUser } | null> {
  const r = await pbFetch("POST", "/api/collections/users/auth-refresh", { token });
  if (!ok(r) || typeof r.data?.token !== "string") return null;
  return { token: r.data.token, user: toUser(r.data.record) };
}

/**
 * The user of a token. The id comes from the token claims, and PocketBase checks the token on the request itself.
 * Null when the token is bad, expired, or the account is disabled (a disabled account keeps the old token until it expires,
 * round 54 answer 5, so the app checks the field disabled).
 */
export async function pbUserOfToken(token: string): Promise<SessionUser | null> {
  const id = jwtPayload(token)?.id;
  if (typeof id !== "string" || !/^[A-Za-z0-9]+$/.test(id)) return null;
  const r = await pbFetch("GET", `/api/collections/users/records/${id}`, { token });
  if (!ok(r) || r.data?.disabled === true) return null;
  return toUser(r.data);
}

// ---------------------------------------------------------------- generic list

async function listAll(token: string, collection: string, params: Record<string, string>): Promise<J[]> {
  const out: J[] = [];
  for (let page = 1; page < 200; page++) {
    const qs = new URLSearchParams({ perPage: "500", page: String(page), ...params });
    const r = await pbFetch("GET", `/api/collections/${collection}/records?${qs.toString()}`, { token });
    if (!ok(r)) throw failure(r, "PocketBase could not list " + collection + ".");
    out.push(...((r.data.items ?? []) as J[]));
    if (page >= Number(r.data.totalPages ?? 1)) break;
  }
  return out;
}

// ---------------------------------------------------------------- own translations (saved versions)

/**
 * Round 51 answer 7 (Q-A l52): every Save makes a new version. Round 54 answer 7 (l126): every Save writes one record for
 * every row of the page, all with the same version number. The list has one entry for each version, newest first.
 */
export async function savedVersions(token: string, userId: string, pageId: string): Promise<VersionInfo[]> {
  const recs = await listAll(token, "own_translations", {
    filter: `user=${q(userId)} && page_id=${q(pageId)}`,
    sort: "-version",
    fields: "version,created,run_id,agree",
  });
  const byVersion = new Map<number, VersionInfo>();
  for (const r of recs) {
    const v = Number(r.version);
    const hit = byVersion.get(v);
    const agreed = r.agree === true ? 1 : 0;
    if (hit) {
      hit.rows++;
      hit.agreed += agreed;
      if (String(r.created) < hit.created) hit.created = String(r.created);
    } else {
      byVersion.set(v, { version: v, created: String(r.created ?? ""), runId: String(r.run_id ?? ""), rows: 1, agreed });
    }
  }
  return [...byVersion.values()].sort((a, b) => b.version - a.version);
}

/** The rows of one saved version. */
export async function savedRows(token: string, userId: string, pageId: string, version: number): Promise<SavedRow[]> {
  const recs = await listAll(token, "own_translations", {
    filter: `user=${q(userId)} && page_id=${q(pageId)} && version=${Math.trunc(version)}`,
    sort: "created",
    fields: "group_key,text,run_id,ja_text,ed3_text,agree",
  });
  return recs.map((r) => ({
    groupKey: String(r.group_key),
    text: String(r.text ?? ""),
    agree: r.agree === true,
    runId: String(r.run_id ?? ""),
    jaText: String(r.ja_text ?? ""),
    ed3Text: String(r.ed3_text ?? ""),
  }));
}

const MAX_BATCH_ROWS = 200;

export interface SaveRow {
  groupKey: string;
  tsIds: string[];
  part: string;
  jaText: string;
  ed3Text: string;
  text: string;
  /** Round 58 answer 4 (Q-A l202): true when the translator ticked "Agree with the agent text". The text is then empty. */
  agree: boolean;
}

/**
 * Save one version of a page. The version number is the highest version of this user on this page plus 1 (round 54 answer 7).
 * The batch call writes all records or none (checked on PocketBase 0.39.10, migration 1793300002_v2_batch.js).
 * A second tab can take the same number first. The unique index then rejects the batch, and this function tries again with a new number.
 */
export async function saveVersion(token: string, user: SessionUser, pageId: string, runId: string, itemId: string, rows: SaveRow[]): Promise<{ version: number; created: string; count: number }> {
  if (rows.length === 0) throw new PbError(400, "The page has no rows to save.");
  // The migration 1793300002_v2_batch.js sets maxRequests to 200 (checked: 201 requests are refused).
  if (rows.length > MAX_BATCH_ROWS) throw new PbError(400, `This page has ${rows.length} rows. One Save can write ${MAX_BATCH_ROWS} rows at most.`);
  let last: PbResult | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const top = await pbFetch("GET", `/api/collections/own_translations/records?perPage=1&skipTotal=1&sort=-version&fields=version&filter=${encodeURIComponent(`user=${q(user.id)} && page_id=${q(pageId)}`)}`, { token });
    if (!ok(top)) throw failure(top, "PocketBase could not read the saved versions.");
    const version = Number(top.data.items?.[0]?.version ?? 0) + 1;
    const requests = rows.map((r) => ({
      method: "POST",
      url: "/api/collections/own_translations/records",
      body: {
        user: user.id,
        item_id: itemId,
        page_id: pageId,
        group_key: r.groupKey,
        ts_ids: r.tsIds,
        part: r.part,
        ja_text: r.jaText,
        run_id: runId,
        ed3_text: r.ed3Text,
        text: r.text,
        agree: r.agree,
        version,
      },
    }));
    const res = await pbFetch("POST", "/api/batch", { token, body: { requests } });
    if (ok(res) && Array.isArray(res.data)) {
      const created = String(res.data[0]?.body?.created ?? "");
      return { version, created, count: rows.length };
    }
    last = res;
    // 400 can mean a duplicate version number from a second tab. Any other status stops at once.
    if (res.status !== 400) break;
  }
  if (last && last.status === 403) throw new PbError(403, "The server does not allow this account to save, or the batch call is off.");
  throw new PbError(last?.status ?? 500, "The save failed. No row was saved. Try again.");
}

// ---------------------------------------------------------------- comments

function commentView(r: J, me: string): CommentView {
  const u = r.expand?.user;
  return {
    id: String(r.id),
    userName: String(u?.name || u?.email || "Translator"),
    mine: String(r.user) === me,
    groupKey: String(r.group_key),
    runId: String(r.run_id ?? ""),
    text: String(r.text ?? ""),
    shared: r.shared === true,
    created: String(r.created ?? ""),
    updated: String(r.updated ?? ""),
  };
}

/** Comments of a page that the PocketBase rules let this user read: own, shared (translators), all (admin). */
export async function listComments(token: string, user: SessionUser, pageId: string): Promise<CommentView[]> {
  const recs = await listAll(token, "comments", { filter: `page_id=${q(pageId)}`, sort: "created", expand: "user" });
  return recs.map((r) => commentView(r, user.id));
}

export async function createComment(token: string, user: SessionUser, c: { pageId: string; groupKey: string; runId: string; text: string; shared: boolean }): Promise<CommentView> {
  const r = await pbFetch("POST", "/api/collections/comments/records?expand=user", {
    token,
    body: { user: user.id, page_id: c.pageId, group_key: c.groupKey, run_id: c.runId, text: c.text, shared: c.shared },
  });
  if (!ok(r)) throw failure(r, "The comment was not saved.");
  return commentView(r.data, user.id);
}

export async function updateComment(token: string, user: SessionUser, id: string, changes: { text?: string; shared?: boolean }): Promise<CommentView> {
  const r = await pbFetch("PATCH", `/api/collections/comments/records/${encodeURIComponent(id)}?expand=user`, { token, body: changes });
  if (!ok(r)) throw failure(r, "The comment was not changed.");
  return commentView(r.data, user.id);
}

export async function deleteComment(token: string, id: string): Promise<void> {
  const r = await pbFetch("DELETE", `/api/collections/comments/records/${encodeURIComponent(id)}`, { token });
  if (!ok(r)) throw failure(r, "The comment was not deleted.");
}

// ---------------------------------------------------------------- run marks (admin)

/** Round 51 answer 8 (Q-A l53): the admin can mark one run for a page. Map of page ID to run ID. */
export async function runMarks(token: string): Promise<Map<string, string>> {
  const recs = await listAll(token, "run_marks", { fields: "page_id,run_id" });
  return new Map(recs.map((r) => [String(r.page_id), String(r.run_id)]));
}

/** The run mark of one page, or null. */
export async function runMarkOf(token: string, pageId: string): Promise<string | null> {
  const r = await pbFetch("GET", `/api/collections/run_marks/records?perPage=1&skipTotal=1&fields=run_id&filter=${encodeURIComponent(`page_id=${q(pageId)}`)}`, { token });
  if (!ok(r)) throw failure(r, "PocketBase could not read the run mark.");
  const v = r.data.items?.[0]?.run_id;
  return typeof v === "string" && v ? v : null;
}

export async function setRunMark(token: string, user: SessionUser, pageId: string, runId: string): Promise<void> {
  const found = await pbFetch("GET", `/api/collections/run_marks/records?perPage=1&skipTotal=1&fields=id&filter=${encodeURIComponent(`page_id=${q(pageId)}`)}`, { token });
  if (!ok(found)) throw failure(found, "PocketBase could not read the run mark.");
  const id = found.data.items?.[0]?.id;
  const r = id
    ? await pbFetch("PATCH", `/api/collections/run_marks/records/${encodeURIComponent(String(id))}`, { token, body: { run_id: runId, marked_by: user.id } })
    : await pbFetch("POST", "/api/collections/run_marks/records", { token, body: { page_id: pageId, run_id: runId, marked_by: user.id } });
  if (!ok(r)) throw failure(r, "The run mark was not saved.");
}

export async function clearRunMark(token: string, pageId: string): Promise<void> {
  const found = await pbFetch("GET", `/api/collections/run_marks/records?perPage=1&skipTotal=1&fields=id&filter=${encodeURIComponent(`page_id=${q(pageId)}`)}`, { token });
  if (!ok(found)) throw failure(found, "PocketBase could not read the run mark.");
  const id = found.data.items?.[0]?.id;
  if (!id) return;
  const r = await pbFetch("DELETE", `/api/collections/run_marks/records/${encodeURIComponent(String(id))}`, { token });
  if (!ok(r)) throw failure(r, "The run mark was not cleared.");
}

// ---------------------------------------------------------------- page runs and catalog (filled by the sync command S2)

export interface PageRunRow extends HtvRun {
  pageId: string;
}

/**
 * The finished runs in page_runs, newest first, without the snapshot field (a list of 37 snapshots is 2 MB).
 * With a page ID the list holds the runs of that page. Without it the list holds all runs.
 * Any signed-in user can read page_runs (migration 1793300003). Unit S2C, round 56.
 */
export async function pageRunRows(token: string, pageId?: string): Promise<PageRunRow[]> {
  const params: Record<string, string> = { sort: "-started_utc,-run_id", fields: "page_id,run_id,verdict,qa3_page_score,started_utc,status" };
  if (pageId) params.filter = `page_id=${q(pageId)}`;
  const recs = await listAll(token, "page_runs", params);
  const out: PageRunRow[] = [];
  for (const r of recs) {
    if (r.verdict !== "PASS" && r.verdict !== "FAIL") continue;
    out.push({
      pageId: String(r.page_id),
      runId: String(r.run_id),
      startedUtc: String(r.started_utc ?? ""),
      status: String(r.status ?? ""),
      verdict: r.verdict,
      score: typeof r.qa3_page_score === "number" ? r.qa3_page_score : null,
    });
  }
  return out;
}

/** The snapshot JSON of one run, or null when the record is missing. */
export async function pageRunSnapshot(token: string, pageId: string, runId: string): Promise<J | null> {
  const r = await pbFetch("GET", `/api/collections/page_runs/records?perPage=1&skipTotal=1&fields=snapshot&filter=${encodeURIComponent(`page_id=${q(pageId)} && run_id=${q(runId)}`)}`, { token });
  if (!ok(r)) throw failure(r, "PocketBase could not read the snapshot of " + pageId + " run " + runId + ".");
  return r.data.items?.[0]?.snapshot ?? null;
}

/** Book titles from catalog_items: item ID to title_en, or title_ja when title_en is empty. With a slug the list holds that item only. */
export async function catalogTitles(token: string, slug?: string): Promise<Map<string, string>> {
  const params: Record<string, string> = { fields: "item_id,title_en,title_ja" };
  if (slug) params.filter = `item_id=${q(slug)}`;
  const recs = await listAll(token, "catalog_items", params);
  return new Map(recs.map((r) => [String(r.item_id), String(r.title_en || r.title_ja || "")]));
}

/**
 * Title and page count of the items in catalog_items (unit UXC, round 59). With a slug the map holds that item only.
 * The field pages is 0 for a web article (S2 looks up the short ID, the metadata row has the long ID).
 * Unit RC4 (round 70): the kind comes with it, so that the translator list can leave out web articles that have no run (round 61 answer 6).
 */
export async function catalogInfo(token: string, slug?: string): Promise<Map<string, { title: string; pages: number; kind: string }>> {
  const params: Record<string, string> = { fields: "item_id,kind,title_en,title_ja,pages" };
  if (slug) params.filter = `item_id=${q(slug)}`;
  const recs = await listAll(token, "catalog_items", params);
  return new Map(recs.map((r) => [String(r.item_id), { title: String(r.title_en || r.title_ja || ""), pages: typeof r.pages === "number" ? r.pages : 0, kind: String(r.kind ?? "") }]));
}

/** The month chapters of one magazine year from magazine_chapters (filled by the sync command S2). Front chapter first, then by month. */
export async function magazineChapters(token: string, book: string): Promise<ChapterHead[]> {
  const recs = await listAll(token, "magazine_chapters", { filter: `book=${q(book)}`, sort: "month,page_start", fields: "chapter,year,month,chapter_title_en,page_start,page_end" });
  return recs.map((r) => ({
    chapter: String(r.chapter),
    month: typeof r.month === "number" && r.month > 0 ? r.month : null,
    year: typeof r.year === "number" && r.year > 0 ? r.year : null,
    titleEn: String(r.chapter_title_en ?? ""),
    pageStart: Number(r.page_start ?? 0),
    pageEnd: Number(r.page_end ?? 0),
  }));
}

// ---------------------------------------------------------------- user settings (theme and pane settings)

export interface UserSettings {
  theme: ThemeName | null;
  panes: PaneSettings | null;
}

/** The settings record of this user, or nulls when the user has none (or the collection does not exist yet). */
export async function userSettings(token: string, userId: string): Promise<UserSettings> {
  const r = await pbFetch("GET", `/api/collections/user_settings/records?perPage=1&skipTotal=1&filter=${encodeURIComponent(`user=${q(userId)}`)}`, { token });
  if (!ok(r)) return { theme: null, panes: null };
  const rec = r.data.items?.[0];
  if (!rec) return { theme: null, panes: null };
  return { theme: isTheme(rec.theme) ? rec.theme : null, panes: rec.panes && typeof rec.panes === "object" ? (rec.panes as PaneSettings) : null };
}

/** Save the theme, the pane settings, or both. The record of the user is created at the first save. */
export async function saveUserSettings(token: string, userId: string, changes: { theme?: ThemeName; panes?: PaneSettings }): Promise<void> {
  const found = await pbFetch("GET", `/api/collections/user_settings/records?perPage=1&skipTotal=1&fields=id&filter=${encodeURIComponent(`user=${q(userId)}`)}`, { token });
  if (!ok(found)) throw failure(found, "PocketBase did not read the settings.");
  const id = found.data.items?.[0]?.id;
  const r = id
    ? await pbFetch("PATCH", `/api/collections/user_settings/records/${encodeURIComponent(String(id))}`, { token, body: changes })
    : await pbFetch("POST", "/api/collections/user_settings/records", { token, body: { user: userId, ...changes } });
  if (!ok(r)) throw failure(r, "The settings were not saved.");
}

// ---------------------------------------------------------------- reader pages (unit RC1, round 63)
// Sign-up, the reader collections, bookmarks, reading progress, and the admin calls. The PocketBase rules decide who reads what
// (migrations 1793300006 to 1793300009). A not approved reader gets empty lists from reader_pages and reader_versions.

/**
 * Public sign-up (round 63 answer 4). The body names the role reader and holds no approved key, so the field stays false.
 * The create rule of users refuses any other role (migration 1793300006). No secret is needed.
 * emailVisibility is true, so that an admin sees the email on the approval page. Only translators and admins read other user records (same migration).
 */
export async function pbSignUp(name: string, email: string, password: string): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const r = await pbFetch("POST", "/api/collections/users/records", { body: { name, email, password, passwordConfirm: password, role: "reader", emailVisibility: true } });
  if (ok(r)) return { ok: true };
  const f = r.data?.data ?? {};
  if (f.email?.code === "validation_not_unique") return { ok: false, status: 400, message: "This email is already used. Sign in instead." };
  if (f.email) return { ok: false, status: 400, message: "Enter a valid email." };
  if (f.password) return { ok: false, status: 400, message: "The password must have 8 characters or more." };
  if (r.status === 503) return { ok: false, status: 503, message: "The sign-in server is not reachable. Try again later." };
  return { ok: false, status: r.status === 400 ? 400 : 502, message: "The account was not created. Check the fields and try again." };
}

function toMarks(v: J): ReaderMark[] {
  return Array.isArray(v) ? (v as J[]).map((m) => ({ start: Number(m.start), end: Number(m.end), markId: String(m.markId ?? ""), entryId: String(m.entryId ?? ""), surface: String(m.surface ?? "") })) : [];
}

function toReaderPage(r: J): ReaderPageRecord {
  const rows = (Array.isArray(r.rows) ? r.rows : []) as J[];
  return {
    pageId: String(r.page_id),
    itemId: String(r.item_id ?? ""),
    n: Number(r.n ?? 0),
    runId: String(r.run_id ?? ""),
    rows: rows.map((x) => ({ key: String(x.key), shortKey: String(x.shortKey ?? ""), part: x.part === "block_title" ? "block_title" : "lines", ja: String(x.ja ?? ""), ed3: String(x.ed3 ?? ""), jaMarks: toMarks(x.jaMarks), edMarks: toMarks(x.edMarks), ...(x.site === true ? { site: true } : {}) })),
    terms: r.terms && typeof r.terms === "object" ? (r.terms as Record<string, TermEntry>) : {},
    extras: (Array.isArray(r.extras) ? r.extras : []) as ReaderExtra[],
    agree: (Array.isArray(r.agree) ? r.agree : []).map(String),
  };
}

/** The reader_pages records of some pages (full records). */
export async function readerPageRecords(token: string, pageIds: string[]): Promise<ReaderPageRecord[]> {
  if (pageIds.length === 0) return [];
  const recs = await listAll(token, "reader_pages", { filter: pageIds.map((id) => `page_id=${q(id)}`).join(" || ") });
  return recs.map(toReaderPage);
}

/**
 * Page numbers of a work that have a reader_pages record (no rows are read), split by what the record holds (unit RT73a, VISION-viewer 15.26.13):
 * `agent` = records with an Agent text, `web` = records with run_id "web-ja" (Original text rows of a web article, no Agent text).
 */
export async function readerPageNumbers(token: string, slug: string): Promise<{ agent: number[]; web: number[] }> {
  const recs = await listAll(token, "reader_pages", { filter: `item_id=${q(slug)}`, fields: "n,run_id", sort: "n" });
  const out = { agent: [] as number[], web: [] as number[] };
  for (const r of recs) {
    const n = Number(r.n);
    if (!Number.isFinite(n) || n <= 0) continue;
    (hasAgentRecord({ run_id: String(r.run_id ?? "") }) ? out.agent : out.web).push(n);
  }
  return out;
}

/** Page numbers of a book that have an Agent text (no rows are read). A "web-ja" record has none (unit RT73a). */
export async function readerTextPages(token: string, slug: string): Promise<number[]> {
  return (await readerPageNumbers(token, slug)).agent;
}

/** Page numbers of a work that have a Human version in reader_versions (unit RT73a). */
export async function readerVersionPages(token: string, slug: string): Promise<number[]> {
  const recs = await listAll(token, "reader_versions", { filter: `page_id~${q(slug + "/")}`, fields: "page_id" });
  return recs
    .map((r) => String(r.page_id))
    .filter((id) => id.startsWith(slug + "/p"))
    .map((id) => parseInt(id.slice(id.lastIndexOf("/p") + 2), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

/** Rows of a Human version in the app form. A row of a translator has no facts. A row of the kendojidai.com text has them (unit RT73a, VISION-viewer 15.26.8). */
function toHumanRows(v: unknown): ReaderHumanRow[] {
  return ((Array.isArray(v) ? v : []) as J[]).map((x) => ({
    key: String(x.key),
    text: String(x.text ?? ""),
    agree: x.agree === true,
    ed3Text: String(x.ed3Text ?? ""),
    jaText: String(x.jaText ?? ""),
    ...(Array.isArray(x.facts) && x.facts.length ? { facts: toFacts(x.facts) } : {}),
  }));
}

function toFacts(v: J[]): ReaderFact[] {
  return v.map((f) => ({
    start: typeof f.start === "number" ? f.start : null,
    end: typeof f.end === "number" ? f.end : null,
    ja: String(f.ja ?? ""),
    type: String(f.type ?? ""),
    kind: f.kind === "dropped" ? "dropped" : "changed",
  }));
}

/** The human version that an admin chose for some pages: page ID to version. */
export async function readerVersionRecords(token: string, pageIds: string[]): Promise<Map<string, ReaderHumanVersion>> {
  const out = new Map<string, ReaderHumanVersion>();
  if (pageIds.length === 0) return out;
  const recs = await listAll(token, "reader_versions", { filter: pageIds.map((id) => `page_id=${q(id)}`).join(" || ") });
  for (const r of recs) {
    out.set(String(r.page_id), {
      pageId: String(r.page_id),
      version: Number(r.version ?? 0),
      runId: String(r.run_id ?? ""),
      rows: toHumanRows(r.rows),
      // chosen_by empty = the default choice of S2 (round 73 answer 5). A relation to an admin = chosen by an admin.
      byDefault: String(r.chosen_by ?? "") === "",
    });
  }
  return out;
}

/** Page checks of a book: page number to the date (YYYY-MM-DD) of the check. */
export async function pageCheckDates(token: string, slug: string): Promise<Map<string, string>> {
  const recs = await listAll(token, "page_checks", { filter: `page_id~${q(slug + "/")}`, fields: "page_id,created" });
  return new Map(recs.filter((r) => String(r.page_id).startsWith(slug + "/")).map((r) => [String(r.page_id), String(r.created ?? "").slice(0, 10)]));
}

/** Title, author, year, pages, and the synopsis of the books. The research fields of the metadata row stay out (sources, confidence, notes). */
export async function catalogFacts(token: string, slug?: string): Promise<ReaderBookFacts[]> {
  const params: Record<string, string> = { fields: "item_id,kind,title_en,title_ja,author_en,author_ja,publisher,publish_year,pages,row", sort: "item_id" };
  if (slug) params.filter = `item_id=${q(slug)}`;
  const recs = await listAll(token, "catalog_items", params);
  const text = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));
  return recs.map((r) => ({
    slug: String(r.item_id),
    titleEn: text(r.title_en),
    titleJa: text(r.title_ja),
    author: text(r.author_en) || text(r.author_ja),
    publisher: text(r.publisher),
    year: text(r.publish_year),
    isbn: text(r.row?.isbn),
    pages: typeof r.pages === "number" ? r.pages : 0,
    synopsis: text(r.row?.synopsis),
    kind: text(r.kind) || (/^[0-9a-f]{8}$/.test(String(r.item_id)) ? "web-article" : ""),
  }));
}

// ---- Reader dashboard (unit RC4, round 70). VISION-viewer 15.23.

const num0 = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

/** Web date "2019-10-21" of a metadata row, or an empty text. */
function webDateOf(row: J): string {
  const t = typeof row?.publish_date_text === "string" ? row.publish_date_text : "";
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : "";
}

/**
 * All rows of catalog_items as works of the Reader dashboard (347 rows after S2, round 69 answer 7).
 * The columns translated and placement come with migration 1793300010 and S2. Before that, the fields are missing:
 * `translated` is then an empty list with known false, and the placement of a web article comes from the web date of the row.
 * The research fields of the row are stripped by S2 already (round 64 answer 7).
 */
export async function catalogWorks(token: string): Promise<DashWork[]> {
  const recs = await listAll(token, "catalog_items", { fields: "item_id,kind,title_en,title_ja,author_en,author_ja,publisher,publish_year,pages,row,translated,placement", sort: "item_id" });
  const text = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));
  return recs.map((r) => {
    const slug = String(r.item_id);
    const kind = text(r.kind) || (/^[0-9a-f]{8}$/.test(slug) ? "web-article" : "");
    const tr = r.translated && typeof r.translated === "object" && Array.isArray(r.translated.en) ? (r.translated.en as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b) : null;
    const webDate = kind === "web-article" ? webDateOf(r.row) : "";
    const pl = r.placement && typeof r.placement === "object" ? r.placement : {};
    return {
      slug,
      kind,
      titleEn: text(r.title_en),
      titleJa: text(r.title_ja),
      author: text(r.author_en) || text(r.author_ja),
      publisher: text(r.publisher),
      year: text(r.publish_year),
      pages: typeof r.pages === "number" ? r.pages : 0,
      synopsis: text(r.row?.synopsis),
      isbn: text(r.row?.isbn),
      partOf: text(r.row?.part_of),
      webDate,
      placement: {
        webYear: num0(pl.web_year) ?? (webDate ? Number(webDate.slice(0, 4)) : null),
        webMonth: num0(pl.web_month) ?? (webDate ? Number(webDate.slice(5, 7)) : null),
        printYear: num0(pl.print_year),
        printMonth: num0(pl.print_month),
      },
      translated: tr ?? [],
      known: tr !== null,
      resumeAt: null,
    };
  });
}

/** Page numbers with reader text for each book, read from reader_pages. Used while catalog_items.translated is missing (before S2). */
export async function readerTextNumbers(token: string): Promise<Map<string, number[]>> {
  const recs = await listAll(token, "reader_pages", { fields: "item_id,n", sort: "item_id,n" });
  const out = new Map<string, number[]>();
  for (const r of recs) {
    const k = String(r.item_id);
    const n = Number(r.n);
    if (!Number.isFinite(n) || n < 1) continue;
    if (!out.has(k)) out.set(k, []);
    out.get(k)!.push(n);
  }
  return out;
}

/**
 * All month chapters with their articles (103 chapters, 1,155 articles). The reader dashboard shows them as month folds and article rows.
 * The draft English titles of the table of contents mark italic words with asterisks (for example "*kendō* Autobiography 70"). The rows show the title without them.
 */
export async function magazineChapterRows(token: string): Promise<DashChapter[]> {
  const recs = await listAll(token, "magazine_chapters", { sort: "book,month,page_start", fields: "chapter,book,year,month,chapter_title_en,page_start,page_end,articles" });
  return recs.map((r) => ({
    chapter: String(r.chapter),
    book: String(r.book ?? ""),
    month: typeof r.month === "number" && r.month > 0 ? r.month : null,
    year: typeof r.year === "number" && r.year > 0 ? r.year : null,
    titleEn: String(r.chapter_title_en ?? ""),
    pageStart: Number(r.page_start ?? 0),
    pageEnd: Number(r.page_end ?? 0),
    articles: ((Array.isArray(r.articles) ? r.articles : []) as J[]).map(
      (a): DashArticle => ({ order: Number(a.order ?? 0), titleEn: String(a.title_en ?? "").replace(/\*/g, ""), titleJa: String(a.title_ja ?? ""), pageStart: Number(a.page_start ?? 0), pageEnd: Number(a.page_end ?? a.page_start ?? 0) }),
    ),
  }));
}

export interface PageHit {
  pageId: string;
  itemId: string;
  n: number;
}

/** The most page hits that one search reads. A search with more hits says so. */
export const SEARCH_HIT_CAP = 2000;

/**
 * Pages whose folded text holds the folded query (round 69 answer 10: the filter ~ on the columns search_en and search_ja).
 * Returns null when the columns do not exist (migration 1793300010 is not applied). A reader who waits for approval gets no hit (rule READ_OK).
 */
export async function searchReaderPages(token: string, folded: string): Promise<{ hits: PageHit[]; capped: boolean } | null> {
  const hits: PageHit[] = [];
  const filter = `search_en ~ ${q(folded)} || search_ja ~ ${q(folded)}`;
  for (let page = 1; page <= SEARCH_HIT_CAP / 500; page++) {
    const qs = new URLSearchParams({ perPage: "500", page: String(page), skipTotal: "1", fields: "page_id,item_id,n", sort: "item_id,n", filter });
    const r = await pbFetch("GET", `/api/collections/reader_pages/records?${qs.toString()}`, { token });
    if (r.status === 400) return null;
    if (r.status === 403 || r.status === 404) return { hits: [], capped: false };
    if (!ok(r)) throw failure(r, "PocketBase could not search reader_pages.");
    const items = (r.data.items ?? []) as J[];
    hits.push(...items.map((x) => ({ pageId: String(x.page_id), itemId: String(x.item_id ?? ""), n: Number(x.n ?? 0) })));
    if (items.length < 500) return { hits, capped: false };
  }
  return { hits, capped: true };
}

// ---- reading progress and bookmarks (own records only)

export async function readingProgress(token: string, userId: string): Promise<Map<string, string>> {
  const recs = await listAll(token, "reader_progress", { filter: `user=${q(userId)}`, fields: "item_id,page_id" });
  return new Map(recs.map((r) => [String(r.item_id), String(r.page_id)]));
}

export async function saveReadingProgress(token: string, userId: string, itemId: string, pageId: string): Promise<void> {
  const found = await pbFetch("GET", `/api/collections/reader_progress/records?perPage=1&skipTotal=1&fields=id&filter=${encodeURIComponent(`user=${q(userId)} && item_id=${q(itemId)}`)}`, { token });
  if (!ok(found)) throw failure(found, "PocketBase could not read the saved place.");
  const id = found.data.items?.[0]?.id;
  const r = id
    ? await pbFetch("PATCH", `/api/collections/reader_progress/records/${encodeURIComponent(String(id))}`, { token, body: { page_id: pageId } })
    : await pbFetch("POST", "/api/collections/reader_progress/records", { token, body: { user: userId, item_id: itemId, page_id: pageId } });
  if (!ok(r)) throw failure(r, "The place was not saved.");
}

export async function listBookmarks(token: string, userId: string, itemId: string): Promise<BookmarkView[]> {
  const recs = await listAll(token, "reader_bookmarks", { filter: `user=${q(userId)} && item_id=${q(itemId)}`, sort: "page_id" });
  return recs.map((r) => ({ id: String(r.id), pageId: String(r.page_id), n: parseInt(String(r.page_id).slice(String(r.page_id).lastIndexOf("/p") + 2), 10) || 0, note: String(r.note ?? ""), created: String(r.created ?? "") }));
}

export async function addBookmark(token: string, userId: string, pageId: string, itemId: string, note: string): Promise<BookmarkView> {
  const r = await pbFetch("POST", "/api/collections/reader_bookmarks/records", { token, body: { user: userId, page_id: pageId, item_id: itemId, note } });
  if (!ok(r)) throw failure(r, "The bookmark was not saved.");
  return { id: String(r.data.id), pageId, n: parseInt(pageId.slice(pageId.lastIndexOf("/p") + 2), 10) || 0, note, created: String(r.data.created ?? "") };
}

export async function removeBookmark(token: string, id: string): Promise<void> {
  const r = await pbFetch("DELETE", `/api/collections/reader_bookmarks/records/${encodeURIComponent(id)}`, { token });
  if (!ok(r)) throw failure(r, "The bookmark was not removed.");
}

// ---- admin: readers, human versions, page checks (the PocketBase rules allow an admin only)

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  approved: boolean;
  disabled: boolean;
  created: string;
}

export async function adminUsers(token: string): Promise<AdminUser[]> {
  const recs = await listAll(token, "users", { sort: "created" });
  return recs.map((r) => ({ id: String(r.id), name: String(r.name ?? ""), email: String(r.email ?? ""), role: normalizeRole(r.role), approved: r.approved === true, disabled: r.disabled === true, created: String(r.created ?? "") }));
}

/** Approve, or remove the approval of, or disable or enable an account. Only an admin passes the update rule. */
export async function adminUpdateUser(token: string, id: string, changes: { approved?: boolean; disabled?: boolean }): Promise<void> {
  if (!/^[A-Za-z0-9]+$/.test(id)) throw new PbError(400, "Bad user.");
  const r = await pbFetch("PATCH", `/api/collections/users/records/${id}`, { token, body: changes });
  if (!ok(r)) throw failure(r, "The account was not changed.");
}

/** The saved versions of a page by all translators (an admin reads all own_translations). Newest first. */
export async function adminVersionsOfPage(token: string, pageId: string): Promise<AdminVersion[]> {
  const recs = await listAll(token, "own_translations", { filter: `page_id=${q(pageId)}`, fields: "user,version,created,run_id,agree,text,expand.user.name,expand.user.email", expand: "user" });
  const by = new Map<string, AdminVersion>();
  for (const r of recs) {
    const key = `${r.user}|${r.version}`;
    const hit = by.get(key);
    const agreed = r.agree === true ? 1 : 0;
    const written = String(r.text ?? "").trim() ? 1 : 0;
    if (hit) {
      hit.rows++;
      hit.agreed += agreed;
      hit.written += written;
      if (String(r.created) < hit.created) hit.created = String(r.created);
    } else {
      const u = r.expand?.user;
      by.set(key, { userId: String(r.user), userName: String(u?.name || u?.email || "Translator"), version: Number(r.version), created: String(r.created ?? ""), runId: String(r.run_id ?? ""), rows: 1, agreed, written });
    }
  }
  return [...by.values()].sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : b.version - a.version));
}

/** The rows of one saved version of one translator (admin). */
export async function adminVersionRows(token: string, pageId: string, userId: string, version: number): Promise<ReaderHumanRow[]> {
  const recs = await listAll(token, "own_translations", { filter: `page_id=${q(pageId)} && user=${q(userId)} && version=${Math.trunc(version)}`, sort: "created", fields: "group_key,text,agree,ed3_text,ja_text,facts" });
  return recs.map((r) => ({
    key: String(r.group_key),
    text: String(r.text ?? ""),
    agree: r.agree === true,
    ed3Text: String(r.ed3_text ?? ""),
    jaText: String(r.ja_text ?? ""),
    ...(Array.isArray(r.facts) && r.facts.length ? { facts: toFacts(r.facts) } : {}),
  }));
}

/** The chosen human version of a page, or null. */
export async function chosenVersionOf(token: string, pageId: string): Promise<(ReaderHumanVersion & { id: string; userId: string }) | null> {
  const r = await pbFetch("GET", `/api/collections/reader_versions/records?perPage=1&skipTotal=1&filter=${encodeURIComponent(`page_id=${q(pageId)}`)}`, { token });
  if (!ok(r)) throw failure(r, "PocketBase could not read the chosen version.");
  const rec = r.data.items?.[0];
  if (!rec) return null;
  return {
    id: String(rec.id),
    userId: String(rec.user ?? ""),
    pageId,
    version: Number(rec.version ?? 0),
    runId: String(rec.run_id ?? ""),
    rows: toHumanRows(rec.rows),
    byDefault: String(rec.chosen_by ?? "") === "",
  };
}

/** Choose a human version for a page. A second choice replaces the first (one record for each page). */
export async function chooseVersion(token: string, admin: SessionUser, pageId: string, v: { userId: string; version: number; runId: string; rows: ReaderHumanRow[] }): Promise<void> {
  const found = await pbFetch("GET", `/api/collections/reader_versions/records?perPage=1&skipTotal=1&fields=id&filter=${encodeURIComponent(`page_id=${q(pageId)}`)}`, { token });
  if (!ok(found)) throw failure(found, "PocketBase could not read the chosen version.");
  const id = found.data.items?.[0]?.id;
  const body = { page_id: pageId, user: v.userId, version: v.version, run_id: v.runId, chosen_by: admin.id, rows: v.rows.map((x) => ({ key: x.key, text: x.text, agree: x.agree, ed3Text: x.ed3Text, jaText: x.jaText, ...(x.facts?.length ? { facts: x.facts } : {}) })) };
  const r = id
    ? await pbFetch("PATCH", `/api/collections/reader_versions/records/${encodeURIComponent(String(id))}`, { token, body })
    : await pbFetch("POST", "/api/collections/reader_versions/records", { token, body });
  if (!ok(r)) throw failure(r, "The choice was not saved.");
}

export async function clearChosenVersion(token: string, pageId: string): Promise<void> {
  const found = await pbFetch("GET", `/api/collections/reader_versions/records?perPage=1&skipTotal=1&fields=id&filter=${encodeURIComponent(`page_id=${q(pageId)}`)}`, { token });
  if (!ok(found)) throw failure(found, "PocketBase could not read the chosen version.");
  const id = found.data.items?.[0]?.id;
  if (!id) return;
  const r = await pbFetch("DELETE", `/api/collections/reader_versions/records/${encodeURIComponent(String(id))}`, { token });
  if (!ok(r)) throw failure(r, "The choice was not removed.");
}

/** The page check of a page: the date and the note, or null. */
export async function pageCheckOf(token: string, pageId: string): Promise<{ date: string; note: string } | null> {
  const r = await pbFetch("GET", `/api/collections/page_checks/records?perPage=1&skipTotal=1&filter=${encodeURIComponent(`page_id=${q(pageId)}`)}`, { token });
  if (!ok(r)) throw failure(r, "PocketBase could not read the page check.");
  const rec = r.data.items?.[0];
  return rec ? { date: String(rec.created ?? "").slice(0, 10), note: String(rec.note ?? "") } : null;
}

export async function setPageCheck(token: string, admin: SessionUser, pageId: string, note: string): Promise<void> {
  const found = await pbFetch("GET", `/api/collections/page_checks/records?perPage=1&skipTotal=1&fields=id&filter=${encodeURIComponent(`page_id=${q(pageId)}`)}`, { token });
  if (!ok(found)) throw failure(found, "PocketBase could not read the page check.");
  const id = found.data.items?.[0]?.id;
  const body = { page_id: pageId, checked_by: admin.id, note };
  const r = id
    ? await pbFetch("PATCH", `/api/collections/page_checks/records/${encodeURIComponent(String(id))}`, { token, body })
    : await pbFetch("POST", "/api/collections/page_checks/records", { token, body });
  if (!ok(r)) throw failure(r, "The page check was not saved.");
}

export async function clearPageCheck(token: string, pageId: string): Promise<void> {
  const found = await pbFetch("GET", `/api/collections/page_checks/records?perPage=1&skipTotal=1&fields=id&filter=${encodeURIComponent(`page_id=${q(pageId)}`)}`, { token });
  if (!ok(found)) throw failure(found, "PocketBase could not read the page check.");
  const id = found.data.items?.[0]?.id;
  if (!id) return;
  const r = await pbFetch("DELETE", `/api/collections/page_checks/records/${encodeURIComponent(String(id))}`, { token });
  if (!ok(r)) throw failure(r, "The page check was not removed.");
}

/** The pages of a book that have reader text, with the run (for the admin page). */
export async function readerPagesOfBook(token: string, slug: string): Promise<{ pageId: string; n: number; runId: string }[]> {
  const recs = await listAll(token, "reader_pages", { filter: `item_id=${q(slug)}`, fields: "page_id,n,run_id", sort: "n" });
  return recs.map((r) => ({ pageId: String(r.page_id), n: Number(r.n), runId: String(r.run_id) }));
}

export interface ReaderHumanRow {
  key: string;
  text: string;
  agree: boolean;
  ed3Text: string;
  jaText: string;
  /** Fact marks of the kendojidai.com text (unit RT73a). A row of a translator has none. */
  facts?: ReaderFact[];
}

export interface ReaderHumanVersion {
  pageId: string;
  version: number;
  runId: string;
  rows: ReaderHumanRow[];
  /** True when chosen_by is empty: the default choice of S2 (unit RT73a). False when an admin chose it. */
  byDefault?: boolean;
}

export interface AdminVersion {
  userId: string;
  userName: string;
  version: number;
  created: string;
  runId: string;
  rows: number;
  agreed: number;
  written: number;
}

/** All pages that have reader text: page ID and run ID (for the admin page of human versions). */
export async function readerAllPages(token: string): Promise<{ pageId: string; runId: string }[]> {
  const recs = await listAll(token, "reader_pages", { fields: "page_id,run_id", sort: "page_id" });
  return recs.map((r) => ({ pageId: String(r.page_id), runId: String(r.run_id) }));
}

/** Page IDs with a chosen human version and page IDs with a page check (for the admin page). */
export async function adminMarks(token: string): Promise<{ chosen: Map<string, { userId: string; version: number }>; checked: Set<string> }> {
  const v = await listAll(token, "reader_versions", { fields: "page_id,user,version" });
  const c = await listAll(token, "page_checks", { fields: "page_id" });
  return { chosen: new Map(v.map((r) => [String(r.page_id), { userId: String(r.user ?? ""), version: Number(r.version ?? 0) }])), checked: new Set(c.map((r) => String(r.page_id))) };
}
