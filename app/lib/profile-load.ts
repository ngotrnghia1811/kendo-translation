import "server-only";
import type { SessionUser } from "./htv-types";
import { countOwnTranslations, loadBookmarks, loadProgress, loadTitles, readCreated, type PbCtx } from "./profile-pb";
import { BOOKMARKS_SHOWN, PROGRESS_SHOWN, buildCards, sortBookmarks, sortProgress, type BookmarkRow, type Card, type ProgressRow, type WorkTitle } from "./profile-rules";

/*
 * The data of the profile page /profile (unit VW105). Owner picks: Q-A 3:60.4 "Accept all rows", Q-A 3:60.5 "4 cards, own for staff".
 * Rule of the page: an error never breaks the page. Each part has its own error text, and the rest of the page stays (unit rule of VW105).
 * A reader who waits for approval gets the account part and the password part only. The page makes no read call of the reading collections for that reader,
 * because the rules of PocketBase give such a reader no data (migration 1793300008). The page shows the waiting line (Q-A 3:60.4 row 6).
 */

/** One list of the page: the rows to show, the full count (null when the call failed), and the error text (empty when fine). */
export interface Part<T> {
  rows: T[];
  total: number | null;
  error: string;
}

export interface ProfileData {
  user: SessionUser;
  /** True for a reader whom no admin approved. */
  waiting: boolean;
  /** PocketBase time of the sign-up. Empty when it could not be read. */
  created: string;
  cards: Card[];
  progress: Part<ProgressRow>;
  bookmarks: Part<BookmarkRow>;
  /** The titles of the works in the two lists, by work ID. A plain object, so that a client component can take it. */
  titles: Record<string, WorkTitle>;
}

const emptyPart = <T>(): Part<T> => ({ rows: [], total: 0, error: "" });
const messageOf = (e: unknown, fallback: string): string => (e instanceof Error && e.message ? e.message : fallback);

/** Load everything that the page shows. Never throws. `ctx` holds the PocketBase address and the token of the person. */
export async function loadProfile(ctx: PbCtx, user: SessionUser): Promise<ProfileData> {
  const waiting = user.role === "reader" && !user.approved;
  const staff = user.role !== "reader";
  const base: ProfileData = { user, waiting, created: "", cards: [], progress: emptyPart(), bookmarks: emptyPart(), titles: {} };
  const [created, progress, bookmarks, own] = await Promise.allSettled([
    readCreated(ctx, user.id),
    waiting ? Promise.resolve(null) : loadProgress(ctx, user.id),
    waiting ? Promise.resolve(null) : loadBookmarks(ctx, user.id),
    !waiting && staff ? countOwnTranslations(ctx, user.id) : Promise.resolve(null),
  ]);
  if (created.status === "fulfilled") base.created = created.value;
  if (waiting) return base;
  if (progress.status === "fulfilled" && progress.value) base.progress = { rows: sortProgress(progress.value.rows).slice(0, PROGRESS_SHOWN), total: progress.value.total, error: "" };
  else base.progress = { rows: [], total: null, error: progress.status === "rejected" ? messageOf(progress.reason, "The saved places could not be read.") : "" };
  if (bookmarks.status === "fulfilled" && bookmarks.value) base.bookmarks = { rows: sortBookmarks(bookmarks.value.rows).slice(0, BOOKMARKS_SHOWN), total: bookmarks.value.total, error: "" };
  else base.bookmarks = { rows: [], total: null, error: bookmarks.status === "rejected" ? messageOf(bookmarks.reason, "The bookmarks could not be read.") : "" };
  // The titles: one more call for the works in both lists. A failed call leaves the work IDs on the screen.
  const ids = [...base.progress.rows.map((r) => r.itemId), ...base.bookmarks.rows.map((r) => r.itemId)];
  if (ids.length) {
    try {
      base.titles = Object.fromEntries(await loadTitles(ctx, ids));
    } catch {
      base.titles = {};
    }
  }
  base.cards = buildCards({
    role: user.role,
    approved: user.approved,
    books: base.progress.total,
    bookmarks: base.bookmarks.total,
    created: base.created,
    own: own.status === "fulfilled" ? own.value : null,
  });
  return base;
}
