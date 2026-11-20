// Unit VW118 (plan item P53, Q-A 3:98.5, 3:99.5): the pure rules of the visual-issue tool. No server code and no browser code, so the server routes,
// the client parts, and the test scripts/vw118-test.mjs use the same text. This file is new on purpose: the dev server keeps one old instance of an old module (VW77a).
// Owner words (Q-A 3:98.5): "Add a visual-issue tool: + a small floating icon + If user click it, they will take screenshot of a specific part of the current page (esc to go back)
// + then write a comment and draw on the screenshot, then click send issue. + We will store these issue and gradually resolve them".
// Accepted rows (Q-A 3:99.5): 1 who sees the icon, 3 capture and Esc, 4 editor, 5 what an issue stores, 6 the store.

import type { Role } from "./htv-types";

/** Field limits. The same numbers stand in the migration data/scripts/pocketbase/pb_migrations/1793300017_v2_visual_issues.js. */
export const COMMENT_MAX = 5000;
export const PAGE_URL_MAX = 2000;
export const THEME_MAX = 40;
export const NOTE_MAX = 2000;
export const SCREEN_WIDTH_MAX = 20000;
/** The limit of the PocketBase field picture: 5 MB. */
export const PB_PICTURE_MAX_BYTES = 5242880;
/**
 * The limit of the app for one picture [unit default VW118]: 4,000,000 bytes (about 3.8 MB). It is below the 5 MB of PocketBase because the hosted site runs as a Vercel function,
 * and a request body for such a function is limited to about 4.5 MB (Not verified for this deployment). The browser makes the picture smaller until it fits.
 */
export const PICTURE_MAX_BYTES = 4000000;
/** The smallest box that a drag can select, in pixels [unit default VW118]. A smaller box is no selection. */
export const MIN_BOX = 16;

export type IssueState = "open" | "resolved";

/** Row 1 (Q-A 3:99.5): only a signed-in translator or admin sees the icon. A reader does not. */
export function canReportIssue(role: Role | null | undefined): boolean {
  return role === "translator" || role === "admin";
}

// ---------------------------------------------------------------- the page address

/**
 * Row 5: the page address holds the path and the query, never the host. Input: `location.href` or a path. The hash is cut. The result starts with "/".
 * An input that is not an address gives "/". The result is cut at PAGE_URL_MAX characters.
 */
export function pageUrlOf(href: unknown): string {
  if (typeof href !== "string") return "/";
  let path: string;
  try {
    const u = new URL(href, "http://placeholder.invalid");
    path = u.pathname + u.search;
  } catch {
    return "/";
  }
  if (!path.startsWith("/")) path = "/" + path;
  return path.slice(0, PAGE_URL_MAX);
}

/** A page address that is safe as a link on the admin page: it starts with one "/" and holds no control character, no backslash, and no "//" at the start. */
export function isSafePagePath(p: unknown): p is string {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !/[\\\u0000-\u001f]/.test(p);
}

// ---------------------------------------------------------------- the fields of a new issue

export interface IssueInput {
  comment: string;
  pageUrl: string;
  screenWidth: number;
  theme: string;
}

export type IssueCheck = { ok: true; value: IssueInput } | { ok: false; error: string };

/**
 * The server never trusts the client for the fields. It checks them here, and cuts the page address to the path (the host never goes in).
 * The user, the role, and the state are not input: the route takes the user from the session and sets the state "open".
 */
export function checkIssueInput(raw: { comment?: unknown; pageUrl?: unknown; screenWidth?: unknown; theme?: unknown }): IssueCheck {
  const comment = typeof raw.comment === "string" ? raw.comment.trim() : "";
  if (!comment) return { ok: false, error: "Write a comment." };
  if (comment.length > COMMENT_MAX) return { ok: false, error: `The comment is too long. The limit is ${COMMENT_MAX} characters.` };
  const pageUrl = pageUrlOf(raw.pageUrl);
  const width = typeof raw.screenWidth === "number" ? raw.screenWidth : typeof raw.screenWidth === "string" && /^\d{1,6}$/.test(raw.screenWidth) ? Number(raw.screenWidth) : NaN;
  const screenWidth = Number.isInteger(width) && width >= 1 ? Math.min(width, SCREEN_WIDTH_MAX) : 1;
  const theme = typeof raw.theme === "string" && /^[a-z-]{1,40}$/.test(raw.theme.trim()) ? raw.theme.trim() : "";
  return { ok: true, value: { comment, pageUrl, screenWidth, theme } };
}

/** The note of "Mark resolved": text, trimmed, at most NOTE_MAX characters. Not text gives an error. The note can be empty [unit default VW118]. */
export function checkResolveNote(raw: unknown): { ok: true; note: string } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, note: "" };
  if (typeof raw !== "string") return { ok: false, error: "The note must be text." };
  const note = raw.trim();
  if (note.length > NOTE_MAX) return { ok: false, error: `The note is too long. The limit is ${NOTE_MAX} characters.` };
  return { ok: true, note };
}

/** The first 8 bytes of a PNG file. */
export function isPngBytes(b: Uint8Array): boolean {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return b.length >= sig.length && sig.every((v, i) => b[i] === v);
}

/** An id of a record of PocketBase in a route address. */
export function isIssueId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9]{1,40}$/.test(id);
}

// ---------------------------------------------------------------- the steps and the Esc key (row 3 and row 4)

/**
 * The steps of the tool.
 *   idle     only the icon is on the screen
 *   select   the page is dimmed, the cursor is a cross, no box yet
 *   drag     the person holds the button and drags a box
 *   capture  the part is drawn into a picture (a short wait)
 *   editor   the pop-up with the picture, the pen, and the comment
 */
export type Step = "idle" | "select" | "drag" | "capture" | "editor";

/**
 * Row 3 and row 4: Esc goes back at every step. Esc in a drag drops the box and goes back to the select step. Esc in the select step ends the tool.
 * Esc in the capture step cancels it (the picture is not used). Esc in the editor closes the pop-up without a send.
 */
export function stepAfterEscape(step: Step): Step {
  if (step === "drag") return "select";
  return "idle";
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The box of a drag from point `a` to point `b`, in viewport pixels, cut to the viewport. A box that is smaller than MIN_BOX on one side gives null.
 * The pointer can go outside the window, so the numbers are cut first.
 */
export function normalizeBox(a: { x: number; y: number }, b: { x: number; y: number }, view: { w: number; h: number }): Box | null {
  const cut = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  const x1 = cut(Math.min(a.x, b.x), view.w);
  const y1 = cut(Math.min(a.y, b.y), view.h);
  const x2 = cut(Math.max(a.x, b.x), view.w);
  const y2 = cut(Math.max(a.y, b.y), view.h);
  const box = { x: Math.round(x1), y: Math.round(y1), w: Math.round(x2 - x1), h: Math.round(y2 - y1) };
  return box.w < MIN_BOX || box.h < MIN_BOX ? null : box;
}

// ---------------------------------------------------------------- the pen

export interface Point {
  x: number;
  y: number;
}
export interface Stroke {
  width: number;
  points: Point[];
}

/** The pen is red [unit default VW118]. */
export const PEN_COLOR = "#ff2020";
/** The pen is 3 pixels wide on the screen [unit default VW118]. */
export const PEN_SCREEN_PX = 3;

/** The width of a stroke in picture pixels. `shown` is how many screen pixels one picture pixel takes (the picture shrinks to fit the pop-up, so `shown` is often below 1). */
export function penWidth(shown: number): number {
  const s = Number.isFinite(shown) && shown > 0 ? shown : 1;
  return Math.round((PEN_SCREEN_PX / s) * 10) / 10;
}

/** Undo removes the last stroke. A list with no stroke stays. The input list is not changed. */
export function undoStroke(strokes: readonly Stroke[]): Stroke[] {
  return strokes.slice(0, -1);
}

/** Clear removes every stroke. */
export function clearStrokes(): Stroke[] {
  return [];
}

/**
 * The scales to try, from sharp to small, until the PNG fits PICTURE_MAX_BYTES. `ratio` is the device pixel ratio. A ratio above 2 counts as 2
 * (a 3x phone screen gives a huge PNG for no gain). The first scale is the ratio, then 3/4, 1/2, and 1/3 of it, never below 0.25.
 */
export function captureScales(ratio: number): number[] {
  const r = Math.min(Math.max(Number.isFinite(ratio) && ratio > 0 ? ratio : 1, 1), 2);
  return [r, r * 0.75, r * 0.5, r / 3].map((v) => Math.max(0.25, Math.round(v * 100) / 100)).filter((v, i, all) => all.indexOf(v) === i);
}

// ---------------------------------------------------------------- the list page

export interface IssueView {
  id: string;
  comment: string;
  pageUrl: string;
  screenWidth: number;
  theme: string;
  state: IssueState;
  resolveNote: string;
  created: string;
  /** The name of the person. Never the e-mail address (Q-A 3:99.5 row 7 and the rule of readable names, Q-A 3:17.4). */
  userName: string;
}

/**
 * A readable label of a page address for the list page (the rule of readable names, Q-A 3:17.4 and 3:72.2: the title of the book, never only the folder name).
 * `titles` maps the slug of a book to its title. A path with no pattern keeps its own text.
 */
export function pageLabelOf(pageUrl: string, titles: Record<string, string> = {}): string {
  const path = pageUrl.split("?")[0];
  const book = (slug: string) => titles[slug] ?? slug;
  let m: RegExpExecArray | null;
  if (path === "/") return "Monitor dashboard / (or the front door of the site)";
  if (path === "/read") return "Reader dashboard /read";
  if ((m = /^\/read\/([^/]+)$/.exec(path))) return `Book screen of "${book(m[1])}" in the Reader dashboard`;
  if (path === "/translate") return "Human translation view /translate";
  if ((m = /^\/translate\/([^/]+)$/.exec(path))) return `Book screen of "${book(m[1])}" in the human translation view`;
  if ((m = /^\/page\/([^/]+)\/(p\d+)$/.exec(path))) return `Monitor page view of "${book(m[1])}", page ${Number(m[2].slice(1))}`;
  if (path === "/admin/readers") return "Admin page Readers";
  if (path === "/admin/versions") return "Admin page Human versions";
  if (path === "/admin/issues") return "Admin page Visual issues";
  if (path === "/profile") return "Profile page /profile";
  return pageUrl;
}

/** The slugs of the books that the page addresses name, for one title lookup. */
export function bookSlugsOf(urls: readonly string[]): string[] {
  const out = new Set<string>();
  for (const u of urls) {
    const m = /^\/(?:read|translate|page)\/([a-z0-9_]+)(?:[/?]|$)/.exec(u);
    if (m) out.add(m[1]);
  }
  return [...out];
}
