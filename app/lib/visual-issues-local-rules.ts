// Unit VW121 (plan item P60, Q-A 3:112.2 "Accept all rows", Q-A 3:110.2 "Icon for all on this Mac"): the pure rules of the visual issues that are saved as files on this Mac.
// Owner words (Q-A 3:109.5): "+ Where is the visual issue button in http://localhost:3000/? + Every page should have it".
// No server code and no browser code, so the routes, the list page, and scripts/vw121-test.mjs use the same text. This file is new on purpose: the dev server keeps old module instances (VW77a).
// Rows: 1 the icon on every page with the Monitor switch on, 2 the live site stays as it is, 3 one folder for each issue (picture.png and issue.json),
// 5 all issues of this Mac go to the folder, 6 the list page /monitor/issues with "Resolved".

import { PST_OFFSET_S } from "./pst";
import { pageLabelOf } from "./visual-issue-rules";

/** The route of the file save (POST), of "Resolved" (PATCH), and of the picture (GET, one more segment). The Monitor switch decides: off gives 404 [unit default VW121]. */
export const LOCAL_ISSUES_API = "/api/monitor/issues";
/** The page that lists the issues of the folder. */
export const LOCAL_ISSUES_PAGE = "/monitor/issues";
/** The text in issue.json for a person who is not signed in (Q-A 3:112.2 row 3: "not signed in"). */
export const NOT_SIGNED_IN = "not signed in";
/** The text when the sign-in server did not answer, so the app cannot tell who sent the issue [unit default VW121]. */
export const SENDER_UNKNOWN = "unknown (the sign-in server did not answer)";
/** The list page reads at most this many folders, the newest first [unit default VW121]. */
export const LOCAL_LIST_MAX = 1000;

export type LocalIssueState = "open" | "resolved";

/**
 * Row 1 and row 2 (Q-A 3:112.2): who gets the tool.
 *   Monitor switch on (this Mac): every visitor, signed out too, and the issue goes to the folder (local).
 *   Monitor switch off (the live site): only a signed-in translator or admin (`canReport`), and the issue goes to PocketBase as before VW121.
 */
export function issueToolMode(monitor: boolean, canReport: boolean): { show: boolean; local: boolean } {
  return monitor ? { show: true, local: true } : { show: canReport, local: false };
}

// ---------------------------------------------------------------- the folder name

/** The name of one issue folder: PST day, PST time, and 6 hex characters. Example: 20261121-184500-3fa9c1. The server makes it. The request never names a folder. */
export const LOCAL_ID_RE = /^\d{8}-\d{6}-[0-9a-f]{6}$/;

export function isLocalIssueId(id: unknown): id is string {
  return typeof id === "string" && LOCAL_ID_RE.test(id);
}

/** The folder name for a time (milliseconds) and 6 hex characters. The time is PST (UTC minus 8 hours, all year), so the names sort by the time that the owner sees. */
export function localIssueId(nowMs: number, hex6: string): string {
  const iso = new Date(nowMs - PST_OFFSET_S * 1000).toISOString();
  return `${iso.slice(0, 10).replace(/-/g, "")}-${iso.slice(11, 19).replace(/:/g, "")}-${hex6}`;
}

// ---------------------------------------------------------------- issue.json

/** What the list page needs from one issue.json. A hand edit of the file can add fields: the page ignores them, and "Resolved" keeps them. */
export interface LocalIssueView {
  id: string;
  comment: string;
  pageUrl: string;
  screenWidth: number;
  theme: string;
  state: LocalIssueState;
  createdPst: string;
  sentBy: string;
  sentByRole: string;
  viewedAs: string;
  resolvedPst: string;
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");

/** Read the object of an issue.json. Anything that is not a JSON object gives null (the list page skips that folder and counts it). `id` is the folder name. */
export function parseLocalIssue(id: string, raw: unknown): LocalIssueView | null {
  if (!isLocalIssueId(id) || !raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    id,
    comment: text(r.comment),
    pageUrl: text(r.page_url),
    screenWidth: typeof r.screen_width === "number" && Number.isFinite(r.screen_width) ? r.screen_width : 0,
    theme: text(r.theme),
    state: r.state === "resolved" ? "resolved" : "open",
    createdPst: text(r.created_pst),
    sentBy: text(r.sent_by) || NOT_SIGNED_IN,
    sentByRole: text(r.sent_by_role),
    viewedAs: text(r.viewed_as),
    resolvedPst: text(r.resolved_pst),
  };
}

/** The newest first. The folder names start with the PST time, so a text sort is a time sort. The input list is not changed. */
export function newestFirst<T extends { id: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
}

// ---------------------------------------------------------------- readable page labels

/** The slugs of the books that the page addresses name: /read, /translate, /page, and /monitor (the Monitor book page). A path such as /monitor/issues is no book. */
export function localBookSlugsOf(urls: readonly string[]): string[] {
  const out = new Set<string>();
  for (const u of urls) {
    const m = /^\/(?:read|translate|page|monitor)\/([a-z0-9_]+)(?:[/?]|$)/.exec(u);
    if (m && !MONITOR_FIXED.has(m[1])) out.add(m[1]);
  }
  return [...out];
}

/** The fixed words below /monitor. They are no book slug. */
const MONITOR_FIXED = new Set(["issues", "phase-2", "vector-map"]);

/**
 * A readable label for the page address (the rule of readable names, Q-A 3:17.4 "Apply this for EVERYTHING"). `titles` maps a book slug to its title.
 * This adds the screens of the Monitor and the sign-in pages to the labels of lib/visual-issue-rules.ts pageLabelOf, which stays the base.
 */
export function localPageLabel(pageUrl: string, titles: Record<string, string> = {}): string {
  const path = pageUrl.split("?")[0];
  const book = (slug: string) => titles[slug] ?? slug;
  let m: RegExpExecArray | null;
  if (path === "/") return "Monitor dashboard / on this Mac";
  if (path === "/monitor/issues") return "Visual issues of this Mac /monitor/issues";
  if (path === "/monitor/phase-2") return "Steps of the phase 2 run /monitor/phase-2";
  if (path === "/monitor/vector-map") return "Vector map /monitor/vector-map";
  if ((m = /^\/monitor\/([a-z0-9_]+)\/steps$/.exec(path))) return `Steps of "${book(m[1])}" on the Monitor dashboard`;
  if ((m = /^\/monitor\/([a-z0-9_]+)$/.exec(path))) return `Book details of "${book(m[1])}" on the Monitor dashboard`;
  if (path === "/runs") return "Lists /runs";
  if (path === "/books") return "Books /books";
  if (path === "/json") return "JSON viewer /json";
  if (path === "/settings/run") return "Run settings /settings/run";
  if (path === "/sign-in") return "Sign-in page /sign-in";
  if (path === "/sign-up") return "Sign-up page /sign-up";
  return pageLabelOf(pageUrl, titles);
}
