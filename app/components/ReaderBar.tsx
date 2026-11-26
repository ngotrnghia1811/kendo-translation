"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/htv-types";
import ViewAsSelect from "./ViewAsSelect";
import { LINK_ADMIN_PATH, LINK_BAR_TEXT } from "@/lib/view-link";
import { clearOfflineCopies } from "@/lib/offline-copy-client"; // unit VW131

// Bar of the reader pages (unit RC1, round 63). Links: all books, the human-translation-view for translators and admins, the admin pages for admins.
// The reader pages are for reading only: the bar has no write action except Sign out.
// Unit VW105 (Q-A 3:60.4 row 1): the name of the person is a link to the profile page /profile. `onProfile` marks that page: "All books" is then a link and the name is the current page.
// Unit VW120 (Q-A 3:107.5 row 9): for a visitor of a view-only link (`linkVisitor`) the bar shows "View-only link" instead of a name: no profile link, no Sign out, no human-translation link.
// Unit VW124 (Q-A 3:117.4 row 1): the link "Search" (to /search) sits in the bar of every reader page, also for a visitor of a view-only link. `onSearch` marks the search page: it is the current page there.
// Unit VW126 (Q-A 3:116.8 "a kendo dict web page (for all roles)"): the link "Dictionary" (to /dictionary) sits next to "Search" for every role, also for a visitor of a view-only link. `onDictionary` marks the dictionary page.
export default function ReaderBar({ name, email, role, approved, backHref, onProfile = false, onSearch = false, onDictionary = false, linkVisitor = false }: { name: string; email: string; role: Role; approved: boolean; backHref?: string; onProfile?: boolean; onSearch?: boolean; onDictionary?: boolean; linkVisitor?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function out() {
    setBusy(true);
    // Unit VW131 (Q-A 3:134.3 row 6, privacy): Sign out removes every offline copy of this device first. It works with no network too.
    await clearOfflineCopies().catch(() => undefined);
    await fetch("/api/htv/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => undefined);
    router.push("/sign-in");
    router.refresh();
  }
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line pb-2 text-sm" data-reader-bar>
      <nav aria-label="Reader links" className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href="/read" className={backHref || onProfile || onSearch || onDictionary ? "text-accent underline" : "font-semibold"}>
          All books
        </Link>
        {backHref ? (
          <Link href={backHref} className="text-accent underline">
            Book page
          </Link>
        ) : null}
        <Link href="/search" className={onSearch ? "font-semibold" : "text-accent underline"} aria-current={onSearch ? "page" : undefined} data-search-link>
          Search
        </Link>
        <Link href="/dictionary" className={onDictionary ? "font-semibold" : "text-accent underline"} aria-current={onDictionary ? "page" : undefined} data-dictionary-link>
          Dictionary
        </Link>
        {role !== "reader" && !linkVisitor ? (
          <Link href="/translate" className="text-accent underline">
            Human translation
          </Link>
        ) : null}
        {role === "admin" && !linkVisitor ? (
          <>
            <Link href="/admin/readers" className="text-accent underline" data-admin-link>
              Readers
            </Link>
            <Link href="/admin/versions" className="text-accent underline" data-admin-link>
              Human versions
            </Link>
            {/* Unit VW118 (Q-A 3:99.5 row 7): the list of the visual issues. */}
            <Link href="/admin/issues" className="text-accent underline" data-admin-link>
              Visual issues
            </Link>
            {/* Unit VW120 (Q-A 3:106.5 row 1): the page of the view-only links. */}
            <Link href={LINK_ADMIN_PATH} className="text-accent underline" data-admin-link>
              Links
            </Link>
          </>
        ) : null}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        {/* Unit VW119 (Q-A 3:103.5 row 1): the select "View as" shows for an admin only (the component decides from the layout context). */}
        <ViewAsSelect />
        {linkVisitor ? (
          <span data-user data-link-visitor>
            {LINK_BAR_TEXT}
          </span>
        ) : (
          <>
            <span data-user>
              <Link href="/profile" className={onProfile ? "font-semibold" : "text-accent underline"} aria-current={onProfile ? "page" : undefined} data-profile-link>
                {name || email}
              </Link>{" "}
              ({role}
              {role === "reader" && !approved ? ", waits for approval" : ""})
            </span>
            <button type="button" onClick={out} disabled={busy} className="rounded border border-line px-2 py-0.5 disabled:opacity-50">
              Sign out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
