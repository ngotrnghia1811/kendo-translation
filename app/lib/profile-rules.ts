// Rules of the profile page /profile (unit VW105). Pure functions and constants. No import of server code and no server-only marker,
// so the server, the client components, and the test script can load this file.
// Owner picks: Q-A 3:58.2 "Design it now", Q-A 3:58.3 "Basic plus reading" and "Like v1, with stats", Q-A 3:58.4 "Not now" (no forgot-password e-mail),
// Q-A 3:60.4 "Accept all rows", Q-A 3:60.5 "4 cards, own for staff".
// The placeholder of v1 counts as nothing (owner rule round 73c, VISION-viewer 15.26.9). No function of this file reads or counts it.
import type { Role } from "./htv-types";
import { pstDateOfPb } from "./pst-more";
import { readHref } from "./reader-links";
import { WAITING } from "./reader-types";

/** Owner pick Q-A 3:60.4 row 3: the new password has at least 8 characters, the same as the sign-up. */
export const PASSWORD_MIN = 8;
/** PocketBase refuses a password over 71 characters (the limit of its password hash). [unit default A5 of VW105] */
export const PASSWORD_MAX = 71;
/** Longest display name. [unit default A4 of VW105] The sign-up form has no limit, so this limit only stops a very long edit. */
export const NAME_MAX = 100;
/** Most rows that each list shows. The card shows the full count. [unit default A6 of VW105] */
export const PROGRESS_SHOWN = 20;
export const BOOKMARKS_SHOWN = 50;

/** The words of the page. One place, so that the screen and the test use the same text. */
export const PROFILE_TITLE = "Profile";
export { WAITING };
export const PASSWORD_CHANGED_NOTICE = "Your password was changed. Sign in with the new password.";

/** The plain word of a role for the badge. */
export const ROLE_WORD: Record<Role, string> = { reader: "Reader", translator: "Translator", admin: "Admin" };

// ---------------------------------------------------------------- records

/** One row of "Continue reading": the last page that the person read in one work. */
export interface ProgressRow {
  itemId: string;
  pageId: string;
  /** Page number, 0 when the page ID has no number. */
  n: number;
  /** Digits of the number as the page ID writes it, for example 3 for p048. */
  digits: number;
  /** PocketBase time of the last save. */
  updated: string;
  created: string;
}

/** One row of "Bookmarks". */
export interface BookmarkRow {
  id: string;
  itemId: string;
  pageId: string;
  n: number;
  digits: number;
  note: string;
  created: string;
}

/** The English and the Japanese title of a work. */
export interface WorkTitle {
  en: string;
  ja: string;
}

/** The part "p048" of a page ID "left_foot_full/p048" as a number and a digit count. A bad ID gives n 0. */
export function pageParts(pageId: string): { n: number; digits: number } {
  const m = /\/p(\d+)$/.exec(pageId);
  return m ? { n: parseInt(m[1], 10) || 0, digits: m[1].length } : { n: 0, digits: 3 };
}

/** The address of the page in the Reader: /read/<slug>?view=page&at=p048. Null when the page ID has no number. */
export function openHref(itemId: string, pageId: string): string | null {
  const { n, digits } = pageParts(pageId);
  return n > 0 && itemId ? readHref(itemId, "page", n, digits) : null;
}

/** The text of the row title: the English title, else the Japanese title, else the work ID. The Japanese title next to an English one is a separate part. */
export function titleOf(itemId: string, t: WorkTitle | undefined): { main: string; ja: string } {
  const en = t?.en?.trim() ?? "";
  const ja = t?.ja?.trim() ?? "";
  return { main: en || ja || itemId, ja: en && ja ? ja : "" };
}

/** A string that sorts by time: PocketBase writes "2026-11-15 10:50:47.123Z". Equal forms sort by text. */
const timeKey = (s: string): string => s ?? "";

/** Newest first by `updated`, then `created`, then the work ID. A new array. */
export function sortProgress(rows: ProgressRow[]): ProgressRow[] {
  return [...rows].sort((a, b) => timeKey(b.updated).localeCompare(timeKey(a.updated)) || timeKey(b.created).localeCompare(timeKey(a.created)) || a.itemId.localeCompare(b.itemId));
}

/** Newest first by `created`, then the ID. A new array. */
export function sortBookmarks(rows: BookmarkRow[]): BookmarkRow[] {
  return [...rows].sort((a, b) => timeKey(b.created).localeCompare(timeKey(a.created)) || a.id.localeCompare(b.id));
}

/** Read a progress record of PocketBase. Null when the record has no work ID or no page ID. */
export function toProgressRow(r: Record<string, unknown>): ProgressRow | null {
  const itemId = typeof r.item_id === "string" ? r.item_id : "";
  const pageId = typeof r.page_id === "string" ? r.page_id : "";
  if (!itemId || !pageId) return null;
  return { itemId, pageId, ...pageParts(pageId), updated: String(r.updated ?? ""), created: String(r.created ?? "") };
}

/** Read a bookmark record of PocketBase. Null when the record has no ID, no work ID, or no page ID. */
export function toBookmarkRow(r: Record<string, unknown>): BookmarkRow | null {
  const id = typeof r.id === "string" ? r.id : "";
  const itemId = typeof r.item_id === "string" ? r.item_id : "";
  const pageId = typeof r.page_id === "string" ? r.page_id : "";
  if (!id || !itemId || !pageId) return null;
  return { id, itemId, pageId, ...pageParts(pageId), note: typeof r.note === "string" ? r.note : "", created: String(r.created ?? "") };
}

// ---------------------------------------------------------------- cards

export interface Card {
  /** Stable key for the tests and the page markers: "books", "bookmarks", "since", "own". */
  id: "books" | "bookmarks" | "since" | "own";
  label: string;
  value: string;
  /** A short line under the number. */
  note: string;
}

const count = (n: number | null): string => (n === null ? "–" : n.toLocaleString("en-US"));

/**
 * The cards (Q-A 3:60.5 "4 cards, own for staff"). "Books started", "Bookmarks", and "Member since" show for every role.
 * "Own translations" shows for translators and admins only. A reader makes none, because own translations are made on /translate.
 * A count that could not be read is null and shows a dash. A reader who waits for approval gets no cards (the page shows the waiting line).
 * The v1 placeholder counts as nothing and has no card.
 */
export function buildCards(i: { role: Role; approved: boolean; books: number | null; bookmarks: number | null; created: string; own: number | null }): Card[] {
  if (!i.approved) return [];
  const cards: Card[] = [
    { id: "books", label: "Books started", value: count(i.books), note: "works with a saved place" },
    { id: "bookmarks", label: "Bookmarks", value: count(i.bookmarks), note: "pages that you marked" },
    { id: "since", label: "Member since", value: i.created ? joinDate(i.created) : "–", note: "PST" },
  ];
  if (i.role !== "reader") cards.push({ id: "own", label: "Own translations", value: count(i.own), note: "saved rows on /translate" });
  return cards;
}

/** The date of joining in PST, for example "2026-11-15". An unreadable time gives a dash. */
export function joinDate(created: string): string {
  return pstDateOfPb(created) || "–";
}

/** The date of a list row in PST. An unreadable time gives an empty text. */
export function rowDate(t: string): string {
  return pstDateOfPb(t);
}

// ---------------------------------------------------------------- account

/** The approval line of the account part. Staff need no approval. */
export function approvalText(role: Role, approved: boolean): string {
  if (role !== "reader") return "Not needed for this role";
  return approved ? "Approved" : "Waits for approval by an admin";
}

// ---------------------------------------------------------------- forms

/** The name after a trim and a collapse of inner spaces. */
export function cleanName(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** Check the display name. Returns the plain message, or an empty text when the name is fine. */
export function nameProblem(name: string): string {
  if (!name) return "Enter a name.";
  if ([...name].length > NAME_MAX) return `The name can have ${NAME_MAX} characters at most.`;
  return "";
}

/** Check the three password fields. Returns the plain message, or an empty text when they are fine. */
export function passwordProblem(oldPassword: string, newPassword: string, again: string): string {
  if (!oldPassword) return "Enter your old password.";
  if (newPassword.length < PASSWORD_MIN) return `The new password must have ${PASSWORD_MIN} characters or more.`;
  if (newPassword.length > PASSWORD_MAX) return `The new password can have ${PASSWORD_MAX} characters at most.`;
  if (newPassword !== again) return "The two new passwords are not the same.";
  return "";
}

/** The address that the page uses after a password change. */
export const AFTER_PASSWORD_PATH = "/sign-in?changed=1";
