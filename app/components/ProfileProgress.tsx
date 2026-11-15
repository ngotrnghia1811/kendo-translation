import Link from "next/link";
import ProfileTitle from "./ProfileTitle";
import { openHref, rowDate, type ProgressRow, type WorkTitle } from "@/lib/profile-rules";
import { pageLabel } from "@/lib/reader-types";

// "Continue reading" of the profile page (unit VW105, Q-A 3:60.4 row 4): one row for each work with a saved place, the newest first.
// Each row: the title of the work, the resume page, and an Open link to that page.
export default function ProfileProgress({ rows, total, titles, error }: { rows: ProgressRow[]; total: number | null; titles: Record<string, WorkTitle>; error: string }) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-red-700" data-part-error>
        {error}
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted" data-empty>
        You have not started a book yet. Your last page in each book shows here.
      </p>
    );
  }
  return (
    <>
      <ul className="divide-y divide-line/60" data-progress-list>
        {rows.map((r) => {
          const href = openHref(r.itemId, r.pageId);
          const date = rowDate(r.updated);
          return (
            <li key={r.itemId} data-progress-row={r.itemId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
              <div className="min-w-0 flex-1 basis-56">
                <p className="break-words font-medium leading-snug">
                  <ProfileTitle itemId={r.itemId} titles={titles} />
                </p>
                <p className="text-sm text-muted">
                  {r.n > 0 ? pageLabel(r.n) : "Page not known"}
                  {date ? ` · last read ${date}` : ""}
                </p>
              </div>
              {href ? (
                <Link href={href} className="inline-flex min-h-[44px] items-center text-accent underline md:min-h-0" data-open-link>
                  Open
                </Link>
              ) : null}
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
