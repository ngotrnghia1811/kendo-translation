"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isSafePagePath } from "@/lib/visual-issue-rules";
import { LOCAL_ISSUES_API, localPageLabel, NOT_SIGNED_IN, type LocalIssueView } from "@/lib/visual-issues-local-rules";

// Unit VW121 (plan item P60, Q-A 3:112.2 row 6): the list of the visual issues of this Mac (the folder data/visual-issues-local/), the newest first.
// Each card: the picture, the comment, the page address as a link (with the title of the book, Q-A 3:17.4), the time in PST, who sent it, and the button "Resolved".
// The owner marks the issues resolved himself (Q-A 3:105.7). "Resolved" writes the state into issue.json and deletes nothing. Resolved issues sit apart in a closed section.
export default function LocalIssues({ issues, skipped, hidden, titles }: { issues: LocalIssueView[]; skipped: number; hidden: number; titles: Record<string, string> }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const open = issues.filter((i) => i.state === "open");
  const resolved = issues.filter((i) => i.state === "resolved");

  async function resolve(id: string) {
    setBusy(id);
    setError("");
    try {
      const r = await fetch(LOCAL_ISSUES_API, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, state: "resolved" }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setError(j.error ?? "The change failed.");
      else router.refresh();
    } finally {
      setBusy("");
    }
  }

  const card = (i: LocalIssueView) => (
    <li key={i.id} data-issue={i.id} data-issue-state={i.state} className="flex flex-col gap-3 rounded border border-line bg-white p-3 text-sm md:flex-row">
      <a href={`${LOCAL_ISSUES_API}/${i.id}/picture`} target="_blank" rel="noopener" className="block shrink-0 md:max-w-[26rem]" title="Open the picture in a new tab">
        {/* The picture is a PNG of the route of this Mac. A plain img keeps the size of the file. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${LOCAL_ISSUES_API}/${i.id}/picture`} alt={`Picture of the issue: ${i.comment.slice(0, 80)}`} loading="lazy" data-issue-picture className="max-h-72 w-auto max-w-full rounded border border-line" />
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={"rounded px-2 py-0.5 text-xs font-semibold " + (i.state === "open" ? "bg-state-stop text-state-stop-ink" : "bg-state-ok text-state-ok-ink")} data-issue-state-label>
            {i.state === "open" ? "Open" : "Resolved"}
          </span>
          <span className="text-muted" data-issue-time>
            {i.createdPst || "(no time)"}
          </span>
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words" data-issue-comment>
          {i.comment}
        </p>
        <p className="mt-2 break-words text-muted" data-issue-page>
          Page:{" "}
          {isSafePagePath(i.pageUrl) ? (
            <Link href={i.pageUrl} className="text-accent underline" title={i.pageUrl}>
              {localPageLabel(i.pageUrl, titles)}
            </Link>
          ) : (
            <span>{i.pageUrl || "(unknown)"}</span>
          )}
        </p>
        <p className="mt-1 text-muted" data-issue-meta>
          {i.sentBy === NOT_SIGNED_IN ? "Sent by a person who was not signed in." : `Sent by ${i.sentBy}${i.sentByRole ? ` (${i.sentByRole})` : ""}.`} Screen width {i.screenWidth > 0 ? `${i.screenWidth} px` : "unknown"}. Theme{" "}
          {i.theme || "unknown"}.
          {i.viewedAs ? <span data-issue-view> Viewed as {i.viewedAs}.</span> : null}
        </p>
        {i.state === "resolved" ? (
          <p className="mt-2 text-muted" data-issue-note>
            Resolved{i.resolvedPst ? ` on ${i.resolvedPst}` : ""}.
          </p>
        ) : (
          <div className="mt-3">
            <button
              type="button"
              disabled={busy === i.id}
              onClick={() => void resolve(i.id)}
              data-issue-resolve
              title="Mark this issue as resolved. The files stay in the folder."
              className="min-h-[36px] rounded bg-accent px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
            >
              Resolved
            </button>
          </div>
        )}
      </div>
    </li>
  );

  return (
    <div data-local-issues>
      <p className="mb-3 text-sm text-muted">
        These issues are files on this Mac, in the folder data/visual-issues-local/ of the Viewer folder. One subfolder holds one issue: picture.png and issue.json.
      </p>
      {error ? (
        <p role="alert" className="mb-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {hidden > 0 ? <p className="mb-2 text-sm text-muted">The list shows the newest {issues.length + skipped} issues. {hidden} older folders are not shown.</p> : null}
      {skipped > 0 ? (
        <p className="mb-2 text-sm text-muted" data-issue-skipped>
          {skipped} {skipped === 1 ? "folder has" : "folders have"} no readable issue.json and {skipped === 1 ? "is" : "are"} not shown.
        </p>
      ) : null}
      <section className="mb-6" aria-labelledby="open-h">
        <h2 id="open-h" className="section-band mb-2 text-lg font-semibold">
          Open issues ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted" data-none-open>
            No issue is open.
          </p>
        ) : null}
        <ul className="space-y-3">{open.map(card)}</ul>
      </section>
      <details data-resolved-section>
        <summary className="section-band mb-2 cursor-pointer text-lg font-semibold">Resolved ({resolved.length})</summary>
        {resolved.length === 0 ? <p className="text-sm text-muted">No issue is resolved yet.</p> : null}
        <ul className="mt-2 space-y-3">{resolved.map(card)}</ul>
      </details>
    </div>
  );
}
