"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NOTE_MAX, isSafePagePath, pageLabelOf, type IssueView } from "@/lib/visual-issue-rules";
import { splitViewNote } from "@/lib/view-as";
import { pstTime } from "@/lib/htv-pst";

// Admin page of the visual issues (unit VW118, plan item P53, Q-A 3:99.5 row 7): "open issues first, with the picture, the comment, a link to the page,
// and 'Mark resolved' with a note". Row 8: aki-main writes the note, for example "unit VW1xx, commit abc1234". The route checks the admin role. PocketBase checks it again.
// The page shows the name of the person, never the e-mail address. Times end with PST (the rule of /admin, unit TF83). The page address has a readable label (Q-A 3:17.4).
export default function AdminIssues({ issues, total, titles }: { issues: IssueView[]; total: number; titles: Record<string, string> }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const open = issues.filter((i) => i.state === "open");
  const resolved = issues.filter((i) => i.state === "resolved");

  async function resolve(id: string) {
    setBusy(id);
    setError("");
    try {
      const r = await fetch("/api/admin/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, note: notes[id] ?? "" }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setError(j.error ?? "The change failed.");
      else router.refresh();
    } finally {
      setBusy("");
    }
  }

  // Unit VW119 (Q-A 3:103.5 row 7): an issue that was sent in a view starts its comment with the line "Viewed as: reader." The page shows that line apart, in the meta line.
  const card = (i: IssueView) => {
    const { view, text } = splitViewNote(i.comment);
    return (
    <li key={i.id} data-issue={i.id} data-issue-state={i.state} className="flex flex-col gap-3 rounded border border-line bg-white p-3 text-sm md:flex-row">
      <a href={`/api/admin/issues/${i.id}/picture`} target="_blank" rel="noopener" className="block shrink-0 md:max-w-[26rem]" title="Open the picture in a new tab">
        {/* The picture is a PNG of the admin route. A plain img keeps the size of the file. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/admin/issues/${i.id}/picture`} alt={`Picture of the issue: ${text.slice(0, 80)}`} loading="lazy" data-issue-picture className="max-h-72 w-auto max-w-full rounded border border-line" />
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={"rounded px-2 py-0.5 text-xs font-semibold " + (i.state === "open" ? "bg-state-stop text-state-stop-ink" : "bg-state-ok text-state-ok-ink")} data-issue-state-label>
            {i.state === "open" ? "Open" : "Resolved"}
          </span>
          <span className="text-muted">{pstTime(i.created) || i.created}</span>
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words" data-issue-comment>
          {text}
        </p>
        <p className="mt-2 break-words text-muted" data-issue-page>
          Page:{" "}
          {isSafePagePath(i.pageUrl) ? (
            <Link href={i.pageUrl} className="text-accent underline" title={i.pageUrl}>
              {pageLabelOf(i.pageUrl, titles)}
            </Link>
          ) : (
            <span>{i.pageUrl || "(unknown)"}</span>
          )}
        </p>
        <p className="mt-1 text-muted" data-issue-meta>
          Sent by {i.userName}. Screen width {i.screenWidth > 0 ? `${i.screenWidth} px` : "unknown"}. Theme {i.theme || "unknown"}.
          {view ? <span data-issue-view> Viewed as {view}.</span> : null}
        </p>
        {i.state === "resolved" ? (
          <p className="mt-2" data-issue-note>
            Resolved. Note: {i.resolveNote ? <span className="whitespace-pre-wrap break-words">{i.resolveNote}</span> : <span className="text-muted">(no note)</span>}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor={`note-${i.id}`} className="sr-only">
              Note for this issue
            </label>
            <input
              id={`note-${i.id}`}
              type="text"
              value={notes[i.id] ?? ""}
              maxLength={NOTE_MAX}
              onChange={(e) => setNotes({ ...notes, [i.id]: e.target.value })}
              placeholder="Note, for example: unit VW1xx, commit abc1234"
              data-issue-note-input
              className="min-h-[36px] min-w-0 flex-1 rounded border border-line bg-white px-2 py-1 text-sm text-foreground placeholder:text-muted"
            />
            <button type="button" disabled={busy === i.id} onClick={() => void resolve(i.id)} data-issue-resolve className="min-h-[36px] rounded bg-accent px-3 py-1 text-sm font-semibold text-white disabled:opacity-50">
              Mark resolved
            </button>
          </div>
        )}
      </div>
    </li>
    );
  };

  return (
    <div data-admin-issues>
      {error ? (
        <p role="alert" className="mb-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {total > issues.length ? <p className="mb-2 text-sm text-muted">The list shows {issues.length} of {total} issues.</p> : null}
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
      <section aria-labelledby="resolved-h">
        <h2 id="resolved-h" className="section-band mb-2 text-lg font-semibold">
          Resolved issues ({resolved.length})
        </h2>
        {resolved.length === 0 ? <p className="text-sm text-muted">No issue is resolved yet.</p> : null}
        <ul className="space-y-3">{resolved.map(card)}</ul>
      </section>
    </div>
  );
}
