// Unit VW119 (plan item P56, Q-A 3:103.5 "Accept rows 1-8"): the pure rules of "View as". No server code and no browser code, so the session, the routes,
// the bars, the band, and scripts/vw119-test.mjs use the same text. This file is new on purpose: the dev server keeps one old instance of an old module (VW77a).
// Owner words (2026-11-20, visual issue 1 from /translate): "add an option to view the page as a specific role for admin (reader/translator)".
// Accepted rows (Q-A 3:103.5):
//   1 a select "View as" in the top bar, for admins only: Admin (normal), Translator, Reader
//   2 the choice holds for this browser until the admin picks Admin again or signs out
//   3 a colored band at the top of every page shows the view, with the button "Back to admin"
//   4 every page acts as for that role (the top bar links, the hidden lines, the address rules)
//   5 the reader view is an approved reader (there is no "waits for approval" view)
//   6 in a view nothing can change data: the refusal line below; reading progress and bookmarks are not saved
//   7 the visual-issue icon stays in every view, and the issue notes the view
//   8 the Monitor dashboard "/" on this Mac does not change

import type { Role, SessionUser } from "./htv-types";
import { COMMENT_MAX } from "./visual-issue-rules";

/** The cookie that holds the view. It lives next to `htv_token`, with the same flags and the same lifetime. */
export const VIEW_COOKIE = "htv_view_as";
/** The route that sets and clears the view. Only a real admin can call it. */
export const VIEW_PATH = "/api/htv/view";

/** A role that an admin can view the site as. The choice "admin" is no view: it is the normal state. */
export type ViewAs = "reader" | "translator";
export type ViewChoice = "admin" | ViewAs;

/** The choices of the select, in this order (row 1). */
export const VIEW_CHOICES: readonly { value: ViewChoice; label: string }[] = [
  { value: "admin", label: "Admin (normal)" },
  { value: "translator", label: "Translator" },
  { value: "reader", label: "Reader" },
];

/** A value that the view route accepts. Anything else is null. */
export function parseViewChoice(v: unknown): ViewChoice | null {
  return v === "admin" || v === "translator" || v === "reader" ? v : null;
}

/**
 * The view of a request. Row 1 and row 2: only an account with the real role admin has a view. For any other account the cookie is ignored, so a forged cookie
 * of a translator or a reader changes nothing. A value other than "reader" or "translator" is no view.
 */
export function viewOfCookie(realRole: Role | null | undefined, cookieValue: string | null | undefined): ViewAs | null {
  if (realRole !== "admin") return null;
  return cookieValue === "reader" || cookieValue === "translator" ? cookieValue : null;
}

/** Row 4 and row 5: the user as the pages see it. In a view the role is the view role, and the account counts as approved. The id, the name, and the e-mail stay. */
export function viewUser(user: SessionUser, view: ViewAs | null): SessionUser {
  return view ? { ...user, role: view, approved: true } : user;
}

/** Row 6: the answer of a route that would change data in a view. */
export function refusalText(view: ViewAs): string {
  return `You view as a ${view}. Pick Admin to change data.`;
}

/** Row 3: the line of the band. */
export function bandText(view: ViewAs): string {
  return `You view the site as a ${view}.`;
}

/** The label of the button of the band (row 3). */
export const BAND_BACK_LABEL = "Back to admin";

/**
 * Row 8: where the band and the select show. The Monitor pages (the Monitor dashboard "/", Lists, Books, Run settings, JSON viewer) stay as they are.
 * The reader pages, the admin pages, the profile page, the sign-in pages, and the human translation view show the band. With the monitor off (the public site)
 * every page shows it, the 404 page included [unit default VW119]. The rule is the same as the `reader` test of components/Nav.tsx plus /translate.
 */
export function bandShowsOn(path: string, monitor: boolean): boolean {
  return /^\/(read|admin|sign-in|sign-up|profile|translate)(\/|$)/.test(path) || !monitor;
}

// ---------------------------------------------------------------- the visual issue (row 7)

/** The first line of the comment of an issue that a person sent in a view [unit default VW119]. It needs no new field in PocketBase. */
export function issueNote(view: ViewAs): string {
  return `Viewed as: ${view}.`;
}

/**
 * Put the note before the comment. The sum must fit the limit of the comment field. If it does not fit, the answer says how long the comment can be.
 * Without a view the comment stays as it is.
 */
export function addViewNote(comment: string, view: ViewAs | null): { ok: true; comment: string } | { ok: false; error: string } {
  if (!view) return { ok: true, comment };
  const note = issueNote(view);
  const full = `${note}\n${comment}`;
  if (full.length > COMMENT_MAX) return { ok: false, error: `The comment is too long in a view. The limit is ${COMMENT_MAX - note.length - 1} characters.` };
  return { ok: true, comment: full };
}

/** Split a stored comment into the view and the text (the admin page shows them apart). A comment without the first line gives view null. */
export function splitViewNote(comment: string): { view: ViewAs | null; text: string } {
  // A comment that went through a multipart form has CRLF line ends, so the first line ends with \r\n or \n.
  const m = /^Viewed as: (reader|translator)\.\r?\n/.exec(comment);
  if (!m) return { view: null, text: comment };
  return { view: m[1] === "reader" ? "reader" : "translator", text: comment.slice(m[0].length) };
}
