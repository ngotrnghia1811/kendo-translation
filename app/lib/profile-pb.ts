import "server-only";
import { q } from "./pb";
import { BOOKMARKS_SHOWN, PROGRESS_SHOWN, toBookmarkRow, toProgressRow, type BookmarkRow, type ProgressRow, type WorkTitle } from "./profile-rules";

/*
 * The PocketBase calls of the profile page /profile (unit VW105). Owner picks: Q-A 3:60.4 "Accept all rows", Q-A 3:60.5 "4 cards, own for staff".
 * The calls use the token of the signed-in person, so the rules of PocketBase decide what the person can read or change:
 *   - users: the person reads and updates the own record. The update rule refuses the keys role, disabled and approved (migration 1793300006 lines 29-30).
 *   - reader_progress and reader_bookmarks: own records, only for an approved reader, a translator, or an admin (migration 1793300008).
 *   - own_translations: own records or an admin (the filter below always names the own ID).
 *   - catalog_items: any signed-in person reads the titles.
 * The collection of the v1 placeholder is never read here. It counts as nothing (owner rule round 73c, VISION-viewer 15.26.9).
 * This file is new on purpose: the dev server keeps one instance of an old module, and a new export in lib/pb.ts could give a 500 (unit VW77a).
 * The module never logs a password or a token, and no message holds the body of a request.
 */

export interface PbCtx {
  /** PocketBase address, without a trailing slash. */
  baseUrl: string;
  /** Token of the signed-in person. */
  token: string;
  /** A replacement for fetch. Only the tests set it. */
  fetchFn?: typeof fetch;
}

/** An error with a plain message for the screen and the HTTP status of PocketBase (503 when the server did not answer). */
export class ProfileError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ProfileError";
    this.status = status;
  }
}

const UNREACHABLE = "The sign-in server is not reachable. Try again later.";

interface Answer {
  status: number;
  data: Record<string, unknown>;
}

async function call(c: PbCtx, method: string, path: string, body?: unknown): Promise<Answer> {
  const headers: Record<string, string> = { Accept: "application/json", Authorization: c.token };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await (c.fetchFn ?? fetch)(c.baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  } catch {
    throw new ProfileError(503, UNREACHABLE);
  }
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    const v = text ? JSON.parse(text) : {};
    if (v && typeof v === "object" && !Array.isArray(v)) data = v as Record<string, unknown>;
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

const good = (a: Answer): boolean => a.status >= 200 && a.status < 300;

/** One list call: the records of the first page and the total of the filter. `totalItems` comes from PocketBase for a call without skipTotal. */
async function listOnce(c: PbCtx, collection: string, params: Record<string, string>, what: string): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const qs = new URLSearchParams({ page: "1", ...params });
  const a = await call(c, "GET", `/api/collections/${collection}/records?${qs.toString()}`);
  if (!good(a)) throw new ProfileError(a.status === 503 ? 503 : a.status, `${what} could not be read.`);
  const items = Array.isArray(a.data.items) ? (a.data.items as Record<string, unknown>[]) : [];
  const total = typeof a.data.totalItems === "number" && a.data.totalItems >= 0 ? a.data.totalItems : items.length;
  return { items, total };
}

// ---------------------------------------------------------------- account

/** The join date of the person: the field created of the own record. The e-mail, the name, the role, and the approval come from the session, so they match the rest of the app. */
export async function readCreated(c: PbCtx, userId: string): Promise<string> {
  if (!/^[A-Za-z0-9]+$/.test(userId)) return "";
  const a = await call(c, "GET", `/api/collections/users/records/${userId}?fields=created`);
  if (!good(a)) throw new ProfileError(a.status, "The join date could not be read.");
  return typeof a.data.created === "string" ? a.data.created : "";
}

/** The messages of a failed own-record update. A plain text for each case, never the request body. */
function updateFailure(a: Answer, fallback: string): ProfileError {
  if (a.status === 503) return new ProfileError(503, UNREACHABLE);
  if (a.status === 401 || a.status === 403 || a.status === 404) return new ProfileError(401, "Your sign-in ended. Sign in again.");
  return new ProfileError(400, fallback);
}

/**
 * Change the display name. The body holds the key name only: never role, approved, or disabled (the rule of PocketBase refuses them, and the page never asks).
 * Returns the saved name.
 */
export async function updateName(c: PbCtx, userId: string, name: string): Promise<string> {
  if (!/^[A-Za-z0-9]+$/.test(userId)) throw new ProfileError(400, "The name was not saved.");
  const a = await call(c, "PATCH", `/api/collections/users/records/${userId}`, { name });
  if (!good(a)) throw updateFailure(a, "The name was not saved. Check the name and try again.");
  return typeof a.data.name === "string" ? a.data.name : name;
}

/**
 * Change the password. PocketBase checks the old password. The body holds the three password keys only.
 * Owner pick Q-A 3:60.4 row 3. After a change PocketBase ends the old sign-in tokens of the account, so the caller clears the cookie.
 * Throws ProfileError with a plain message. The wrong old password and a too short new password have their own messages.
 */
export async function changePassword(c: PbCtx, userId: string, oldPassword: string, newPassword: string): Promise<void> {
  if (!/^[A-Za-z0-9]+$/.test(userId)) throw new ProfileError(400, "The password was not changed.");
  const a = await call(c, "PATCH", `/api/collections/users/records/${userId}`, { oldPassword, password: newPassword, passwordConfirm: newPassword });
  if (good(a)) return;
  const field = (name: string): string => {
    const d = a.data.data;
    const f = d && typeof d === "object" ? (d as Record<string, unknown>)[name] : undefined;
    return f && typeof f === "object" && typeof (f as Record<string, unknown>).code === "string" ? String((f as Record<string, unknown>).code) : "";
  };
  if (field("oldPassword")) throw new ProfileError(400, "The old password is wrong.");
  if (field("password")) throw new ProfileError(400, "The new password must have 8 to 71 characters.");
  throw updateFailure(a, "The password was not changed. Check the fields and try again.");
}

// ---------------------------------------------------------------- reading data

/** The newest saved places of the person, with the full count. Own records only. */
export async function loadProgress(c: PbCtx, userId: string, limit: number = PROGRESS_SHOWN): Promise<{ rows: ProgressRow[]; total: number }> {
  const { items, total } = await listOnce(c, "reader_progress", { perPage: String(limit), sort: "-updated,-created", filter: `user=${q(userId)}`, fields: "item_id,page_id,created,updated" }, "The saved places");
  return { rows: items.map(toProgressRow).filter((r): r is ProgressRow => r !== null), total };
}

/** The newest bookmarks of the person, with the full count. Own records only. */
export async function loadBookmarks(c: PbCtx, userId: string, limit: number = BOOKMARKS_SHOWN): Promise<{ rows: BookmarkRow[]; total: number }> {
  const { items, total } = await listOnce(c, "reader_bookmarks", { perPage: String(limit), sort: "-created", filter: `user=${q(userId)}`, fields: "id,item_id,page_id,note,created" }, "The bookmarks");
  return { rows: items.map(toBookmarkRow).filter((r): r is BookmarkRow => r !== null), total };
}

/** The number of own_translations rows of the person (translators and admins). One call, no rows. */
export async function countOwnTranslations(c: PbCtx, userId: string): Promise<number> {
  return (await listOnce(c, "own_translations", { perPage: "1", filter: `user=${q(userId)}`, fields: "id" }, "The own translations")).total;
}

/** Most work IDs in one title filter. A longer list makes more than one call. */
export const TITLES_PER_CALL = 40;

/** The titles of some works from catalog_items. A work that is missing has no entry. A failed call throws, and the caller shows the work IDs. */
export async function loadTitles(c: PbCtx, itemIds: string[]): Promise<Map<string, WorkTitle>> {
  const out = new Map<string, WorkTitle>();
  const ids = [...new Set(itemIds)].filter(Boolean);
  for (let i = 0; i < ids.length; i += TITLES_PER_CALL) {
    const chunk = ids.slice(i, i + TITLES_PER_CALL);
    const { items } = await listOnce(c, "catalog_items", { perPage: String(TITLES_PER_CALL), filter: chunk.map((id) => `item_id=${q(id)}`).join(" || "), fields: "item_id,title_en,title_ja" }, "The titles");
    for (const r of items) {
      if (typeof r.item_id === "string") out.set(r.item_id, { en: typeof r.title_en === "string" ? r.title_en : "", ja: typeof r.title_ja === "string" ? r.title_ja : "" });
    }
  }
  return out;
}
