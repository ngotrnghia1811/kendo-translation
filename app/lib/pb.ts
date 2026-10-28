import "server-only";
import { loadConfig } from "./config";
import type { CommentView, Role, SavedRow, SessionUser, VersionInfo } from "./htv-types";

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
    fields: "version,created,run_id",
  });
  const byVersion = new Map<number, VersionInfo>();
  for (const r of recs) {
    const v = Number(r.version);
    const hit = byVersion.get(v);
    if (hit) {
      hit.rows++;
      if (String(r.created) < hit.created) hit.created = String(r.created);
    } else {
      byVersion.set(v, { version: v, created: String(r.created ?? ""), runId: String(r.run_id ?? ""), rows: 1 });
    }
  }
  return [...byVersion.values()].sort((a, b) => b.version - a.version);
}

/** The rows of one saved version. */
export async function savedRows(token: string, userId: string, pageId: string, version: number): Promise<SavedRow[]> {
  const recs = await listAll(token, "own_translations", {
    filter: `user=${q(userId)} && page_id=${q(pageId)} && version=${Math.trunc(version)}`,
    sort: "created",
    fields: "group_key,text,run_id,ja_text",
  });
  return recs.map((r) => ({ groupKey: String(r.group_key), text: String(r.text ?? ""), runId: String(r.run_id ?? ""), jaText: String(r.ja_text ?? "") }));
}

const MAX_BATCH_ROWS = 200;

export interface SaveRow {
  groupKey: string;
  tsIds: string[];
  part: string;
  jaText: string;
  ed3Text: string;
  text: string;
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
    userId: String(r.user),
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
