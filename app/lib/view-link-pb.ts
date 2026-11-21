import "server-only";
import { randomBytes } from "node:crypto";
import { loadConfig } from "./config";
import { PbError } from "./pb";
import { LINK_KEY_HEADER, LINK_NAME_MAX, isLinkKey, linkEndOfDay, linkState, type LinkState } from "./view-link";

/*
 * Unit VW120 (Q-A 3:107.4 "Route A: key check"): the PocketBase calls of the view-only links.
 * This file has its own fetch on purpose: it is new, so the dev server loads it fresh, and lib/pb.ts keeps pbFetch private.
 * Two kinds of call:
 *   1 a link visitor: the key goes in the header `X-Kendo-View-Key` (never in a URL, so the request log of PocketBase holds no key).
 *     The read rules of the reader lists accept it when the link is on and not ended (migration 1793300018).
 *   2 an admin: the token of the admin. The list view_links is closed to everybody else. The app holds no superuser account.
 * No function logs, prints, or returns a key to a page script. The admin page gets the key to build the link text for the admin.
 */

type J = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** The same plain text as lib/pb.ts for a network failure. */
const DOWN_TEXT = "The sign-in server is not reachable. Start PocketBase and try again.";

interface Answer {
  status: number;
  data: J;
}

async function call(method: string, path: string, opts: { headers?: Record<string, string>; body?: unknown } = {}): Promise<Answer> {
  const { pocketbaseUrl } = await loadConfig();
  const headers: Record<string, string> = { Accept: "application/json", ...(opts.headers ?? {}) };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(pocketbaseUrl + path, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body), cache: "no-store" });
  } catch {
    throw new PbError(503, DOWN_TEXT);
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

const okStatus = (a: Answer) => a.status >= 200 && a.status < 300;

function failure(a: Answer, fallback: string): PbError {
  const msg = typeof a.data?.message === "string" && a.data.message ? a.data.message : fallback;
  return new PbError(a.status, msg);
}

// ---------------------------------------------------------------- the link visitor

export type LinkCheck = "alive" | "dead" | "down";

/**
 * Ask PocketBase if the key belongs to a link that is on and not ended. One cheap read of the list catalog_items with the key header.
 * The read rule of that list lets a key through only for a live link, so an empty answer means the link is off, ended, or not known.
 * A network failure or a 5xx answer gives "down" (not "dead"), so a short fault of PocketBase does not show "This link no longer works."
 * [unit default] The check needs one record in catalog_items. An empty catalog makes every link look dead.
 */
export async function checkLinkKey(key: string): Promise<LinkCheck> {
  if (!isLinkKey(key)) return "dead";
  const a = await call("GET", "/api/collections/catalog_items/records?perPage=1&skipTotal=1&fields=id", { headers: { [LINK_KEY_HEADER]: key } });
  if (a.status >= 500) return "down";
  if (!okStatus(a)) return "dead";
  return Array.isArray(a.data?.items) && a.data.items.length > 0 ? "alive" : "dead";
}

/**
 * Count one open of the link. The create rule of the list view_link_opens lets only a key holder of a live link add a record (migration 1793300018).
 * The record holds the key and the time only: no IP address and no browser data (Q-A 3:107.5 row 6). A failure is ignored: the visitor still reads.
 */
export async function recordLinkOpen(key: string): Promise<boolean> {
  if (!isLinkKey(key)) return false;
  try {
    const a = await call("POST", "/api/collections/view_link_opens/records", { headers: { [LINK_KEY_HEADER]: key }, body: { key } });
    return okStatus(a);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- the admin

export interface LinkRow {
  id: string;
  name: string;
  /** The key. Only the admin page gets it, to show the full link (Q-A 3:107.5 row 8). */
  key: string;
  /** PocketBase date text of the end, or null for no end. */
  ends: string | null;
  off: boolean;
  /** PocketBase date text of the day the admin made the link. */
  created: string;
  state: LinkState;
  opens: number;
  /** PocketBase date text of the last open, or null when nobody opened the link. */
  lastOpen: string | null;
}

const auth = (token: string) => ({ Authorization: token });

function rowOf(rec: J, opens: number, lastOpen: string | null, nowMs: number): LinkRow {
  const ends = typeof rec.ends === "string" && rec.ends.trim() ? rec.ends : null;
  const off = rec.off === true;
  return { id: String(rec.id), name: String(rec.name ?? ""), key: String(rec.key ?? ""), ends, off, created: String(rec.created ?? ""), state: linkState({ off, ends }, nowMs), opens, lastOpen };
}

/**
 * The opens of all links in one sweep: for each key, the count and the time of the newest open (the list is sorted by time, newest first).
 * [unit default VW120] The key never goes into a PocketBase address, because PocketBase keeps the address of each request in its request log
 * (7 days). So the page does not ask "the opens of this key". It reads the rows (key and time only, 500 in a call) and counts them here.
 * The sweep stops after OPENS_MAX_PAGES calls (20,000 opens). A link with more opens than that shows the newest 20,000 only.
 */
export const OPENS_PER_PAGE = 500;
export const OPENS_MAX_PAGES = 40;
async function opensByKey(token: string): Promise<Map<string, { opens: number; lastOpen: string | null }>> {
  const out = new Map<string, { opens: number; lastOpen: string | null }>();
  for (let page = 1; page <= OPENS_MAX_PAGES; page++) {
    const qs = new URLSearchParams({ perPage: String(OPENS_PER_PAGE), page: String(page), sort: "-created", fields: "key,created", skipTotal: "1" });
    const a = await call("GET", `/api/collections/view_link_opens/records?${qs.toString()}`, { headers: auth(token) });
    if (!okStatus(a)) throw failure(a, "The opens of the links could not be read.");
    const items: J[] = Array.isArray(a.data?.items) ? a.data.items : [];
    for (const r of items) {
      const k = String(r.key ?? "");
      const e = out.get(k);
      if (e) e.opens += 1;
      else out.set(k, { opens: 1, lastOpen: typeof r.created === "string" ? r.created : null });
    }
    if (items.length < OPENS_PER_PAGE) break;
  }
  return out;
}

/** Every link, the newest first, with its opens. For the admin page. PocketBase refuses a token that is not an admin token. */
export async function listLinks(token: string, nowMs: number = Date.now()): Promise<LinkRow[]> {
  const a = await call("GET", "/api/collections/view_links/records?perPage=200&sort=-created", { headers: auth(token) });
  if (!okStatus(a)) throw failure(a, "The links could not be read.");
  const items: J[] = Array.isArray(a.data?.items) ? a.data.items : [];
  const opens = await opensByKey(token);
  return items.map((rec) => {
    const o = opens.get(String(rec.key)) ?? { opens: 0, lastOpen: null };
    return rowOf(rec, o.opens, o.lastOpen, nowMs);
  });
}

/** A new key: 32 random bytes as base64url, 43 characters. */
export function newLinkKey(): string {
  return randomBytes(32).toString("base64url");
}

export type MakeLinkInput = { name: unknown; ends?: unknown; createdBy: string };

/** Check the form of a new link. Returns the clean values or a plain message. */
export function parseNewLink(input: { name: unknown; ends?: unknown }): { ok: true; name: string; ends: string } | { ok: false; error: string } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { ok: false, error: "Give the link a name." };
  if (name.length > LINK_NAME_MAX) return { ok: false, error: `The name is too long. Use ${LINK_NAME_MAX} characters at most.` };
  let ends = "";
  if (input.ends !== undefined && input.ends !== null && String(input.ends).trim() !== "") {
    const e = typeof input.ends === "string" ? linkEndOfDay(input.ends) : null;
    if (!e) return { ok: false, error: "Write the end date as YYYY-MM-DD, for example 2026-12-31." };
    ends = e;
  }
  return { ok: true, name, ends };
}

/** Make a link. The admin token creates the record, so only an admin can. Returns the row with the new key. */
export async function makeLink(token: string, input: MakeLinkInput): Promise<LinkRow> {
  const p = parseNewLink(input);
  if (!p.ok) throw new PbError(400, p.error);
  const body: Record<string, unknown> = { name: p.name, key: newLinkKey(), off: false, created_by: input.createdBy };
  if (p.ends) body.ends = p.ends;
  const a = await call("POST", "/api/collections/view_links/records", { headers: auth(token), body });
  if (!okStatus(a)) throw failure(a, "The link could not be made.");
  return rowOf(a.data, 0, null, Date.now());
}

/** Turn a link off. The record stays (the opens stay readable). Q-A 3:106.5 row 6: the button "Turn off". */
export async function turnOffLink(token: string, id: string): Promise<void> {
  if (!/^[a-z0-9]{15}$/.test(id)) throw new PbError(400, "Bad link ID.");
  const a = await call("PATCH", `/api/collections/view_links/records/${id}`, { headers: auth(token), body: { off: true } });
  if (!okStatus(a)) throw failure(a, "The link could not be turned off.");
}
