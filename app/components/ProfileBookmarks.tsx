"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ProfileTitle from "./ProfileTitle";
import { openHref, rowDate, type BookmarkRow, type WorkTitle } from "@/lib/profile-rules";
import { pageLabel } from "@/lib/reader-types";

// "Bookmarks" of the profile page (unit VW105, Q-A 3:60.4 row 5): title, page, note, Open, and Remove, the newest first.
// The collection allows a delete and no update, so a bookmark is removed with DELETE /api/read/bookmarks (the route of the book screen).
export default function ProfileBookmarks({ rows, total, titles, error }: { rows: BookmarkRow[]; total: number | null; titles: Record<string, WorkTitle>; error: string }) {
  const router = useRouter();
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState("");
  const [fail, setFail] = useState("");

  async function remove(id: string) {
    setBusy(id);
    setFail("");
    try {
      const r = await fetch("/api/read/bookmarks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setFail(j.error ?? "The bookmark was not removed.");
        return;
      }
      setGone((g) => new Set(g).add(id));
      router.refresh();
    } catch {
      setFail("The app did not answer. Try again.");
    } finally {
      setBusy("");
    }
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-700" data-part-error>
        {error}
      </p>
    );
  }
  const shown = rows.filter((r) => !gone.has(r.id));
  if (shown.length === 0) {
    return (
      <p className="text-sm text-muted" data-empty>
        You have no bookmarks. Add one on a book page.
      </p>
    );
  }
  return (
    <>
      {fail ? (
        <p role="alert" className="mb-2 text-sm text-red-700" data-remove-error>
          {fail}
        </p>
      ) : null}
      <ul className="divide-y divide-line/60" data-bookmark-list>
        {shown.map((r) => {
          const href = openHref(r.itemId, r.pageId);
          const date = rowDate(r.created);
          return (
            <li key={r.id} data-bookmark-row={r.id} className="py-2">
              <p className="break-words font-medium leading-snug">
                <ProfileTitle itemId={r.itemId} titles={titles} />
              </p>
              <p className="text-sm text-muted">
                {r.n > 0 ? pageLabel(r.n) : "Page not known"}
                {date ? ` · added ${date}` : ""}
              </p>
              {r.note ? (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm" data-bookmark-note>
                  {r.note}
                </p>
              ) : null}
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {href ? (
                  <Link href={href} className="inline-flex min-h-[44px] items-center text-accent underline md:min-h-0" data-open-link>
                    Open
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => void remove(r.id)}
                  disabled={busy === r.id}
                  className="min-h-[44px] rounded border border-line px-3 py-0.5 disabled:opacity-50 md:min-h-0"
                  aria-label={`Remove the bookmark${r.n ? ` on page ${r.n}` : ""} of ${titles[r.itemId]?.en || titles[r.itemId]?.ja || r.itemId}`}
                  data-remove
                >
                  {busy === r.id ? "Removing…" : "Remove"}
                </button>
              </p>
            </li>
          );
        })}
      </ul>
      {total !== null && total > rows.length ? (
        <p className="mt-2 text-xs text-muted" data-capped>
          Showing the newest {rows.length} of {total.toLocaleString("en-US")}.
        </p>
      ) : null}
    </>
  );
}
