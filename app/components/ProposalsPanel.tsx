"use client";
import Link from "next/link";
import { useState } from "react";
import { dictHref } from "@/lib/dictionary-core";
import { bookName, countsText, OPEN_COUNT_EVENT, pageViewHref, type TermView } from "@/lib/proposal-terms"; // unit VW129 (Q-A 3:129.4 rows 2 to 4)
import type { ProposalsView } from "@/lib/proposals-data";
import { pstInOutput, pstScreen } from "@/lib/proposals-times"; // unit VW126 PST fix (Q-A 3:122.2): the files keep UTC, the screen shows PST

/*
 * The tab "Agent proposals" of /dictionary (unit VW126, Q-A 3:116.8, Q-A 3:117.7 rows 1 to 6, Q-A 3:121.2; unit VW129, Q-A 3:129.4 rows 2 to 5).
 * The server draws the first view, so the tab needs no script to read. The buttons call the routes under /api/dictionary:
 *   Comment (translator or admin), Accept, Edit then accept, Reject (admin only), and Rebuild the dictionary (admin only).
 * Unit VW129: ONE row per term (add and revise together). A click on the row opens the list of all its proposals, newest first.
 * A term that is the headword or another writing of an entry has the mark "Already in the dictionary". Accept then changes that entry (revise).
 * A decided group moves to the section "Accepted" or to the closed section "Rejected". Nothing is deleted.
 */

type Role = "translator" | "admin";
type Message = { kind: "ok" | "error"; text: string } | null;
type Edit = { id: string; as: "add" | "revise"; ja_term: string; reading: string; romaji: string; concise_en: string; detailed_en: string };

async function call(url: string, method: "GET" | "POST", body?: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const r = await fetch(url, { method, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: r.ok, status: r.status, data };
}

/** The page number of a page ID such as "left_foot_full/p038": "page 38". */
const pageText = (pageId: string): string => {
  const m = /\/p(\d+)$/.exec(pageId);
  return m ? `page ${Number(m[1])}` : pageId;
};

/** The clicks on these elements do not open or close the row. */
const OWN_CLICK = "a, button, input, textarea, select, label, summary";

/** The mark of row 4, or the kind of a term that is not in the dictionary. */
function KindMark({ g }: { g: TermView }) {
  if (g.existing) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-x-1 rounded bg-chip-tl px-1.5 py-0.5 text-xs font-semibold" data-proposal-exists={g.existing.entry_id}>
        <span className="text-chip-tl-ink">Already in the dictionary:</span>
        <Link href={dictHref({ entry: g.existing.entry_id })} prefetch={false} className="underline" data-proposal-entry-link>
          <span lang="ja" className="font-ja text-chip-tl-ink">
            {g.existing.headword}
          </span>
          <span className="text-chip-tl-ink">{g.existing.isHeadword ? "" : ` (other writing ${g.existing.writing})`}</span>
        </Link>
      </span>
    );
  }
  return (
    <span className="rounded bg-chip-ts px-1.5 py-0.5 text-xs font-semibold" data-proposal-kind>
      <span className="text-chip-ts-ink">{g.kind === "add" ? "New term" : `Revise of the entry ${g.entry_id ?? ""}`}</span>
    </span>
  );
}

/** The head of a row (row 2): the term, its reading and romaji, the mark, the counts, the books, the last time, and the EN form that Accept writes. */
function TermHead({ g, titles }: { g: TermView; titles: Record<string, string> }) {
  const others = g.concise_en_forms.filter((f) => f.text !== g.newest.concise_en);
  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span lang="ja" className="font-ja text-lg font-semibold" data-proposal-term>
          {g.ja_term}
        </span>
        {g.reading ? (
          <span lang="ja" className="font-ja text-muted">
            {g.reading}
          </span>
        ) : null}
        {g.romaji ? (
          <span className="font-serif italic" data-proposal-romaji>
            {g.romaji}
          </span>
        ) : null}
        <KindMark g={g} />
      </p>
      <p className="text-sm text-muted" data-proposal-counts>
        {countsText(g)} · <span data-proposal-times>last {pstScreen(g.last_utc)}</span>
        {g.since > 0 ? ` · ${g.since} more since the decision` : ""}
      </p>
      <p className="text-sm text-muted" data-proposal-books>
        {g.books.length === 1 ? "Book: " : "Books: "}
        {g.books.map((b) => bookName(b, titles)).join("; ")}
      </p>
      <p className="mt-1 text-sm" data-proposal-en>
        <span className="text-muted">{g.kind === "revise" ? "Proposed new EN form: " : "Proposed EN form: "}</span>
        <strong>{g.newest.concise_en}</strong>
        {g.kind === "revise" && g.current ? <span className="text-muted"> (now: {g.current.concise_en || "none"})</span> : null}
      </p>
      {others.length ? (
        <p className="text-xs text-muted" data-proposal-forms>
          Other forms: {others.map((f) => `${f.text} ×${f.count}`).join("; ")}
        </p>
      ) : null}
    </>
  );
}

/** The list of all proposals of the term, newest first (row 3). */
export function Details({ g, titles, id }: { g: TermView; titles: Record<string, string>; id: string }) {
  return (
    <ol id={id} className="mt-2 grid gap-2 border-l-2 border-line pl-3" data-proposal-details>
      {g.rows.map((r) => {
        const href = pageViewHref(r.page_id);
        return (
          <li key={r.proposal_id} className="text-sm" data-proposal-row={r.proposal_id} data-proposal-row-kind={r.kind}>
            <p className="text-xs text-muted" data-proposal-row-where>
              {pstScreen(r.utc)} · {bookName(r.book, titles)} ·{" "}
              {href ? (
                <Link href={href} prefetch={false} className="text-accent underline" data-proposal-page-link>
                  {pageText(r.page_id)}
                </Link>
              ) : (
                r.page_id
              )}{" "}
              · {r.box} · {r.kind}
            </p>
            <p data-proposal-row-en>
              <span className="text-muted">EN form: </span>
              {r.concise_en}
            </p>
            {r.detailed_en ? (
              <p data-proposal-row-detailed>
                <span className="text-muted">Short English explanation: </span>
                {r.detailed_en}
              </p>
            ) : null}
            {r.reason ? (
              <p data-proposal-row-reason>
                <span className="text-muted">Reason: </span>
                {r.reason}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** One row per term: the head, the button that opens the details, the details, and the comments. `children` holds the actions or the decision line. */
function TermRow({ g, titles, children }: { g: TermView; titles: Record<string, string>; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const listId = `proposal-details-${g.proposal_ids[0] ?? g.key}`;
  return (
    <li data-proposal-group={g.id} data-proposal-term-text={g.ja_term} data-proposal-open={open ? "yes" : "no"} className="rounded border border-line bg-white p-3">
      <div
        className="cursor-pointer"
        onClick={(e) => {
          if ((e.target as Element).closest(OWN_CLICK)) return;
          setOpen(!open);
        }}
        data-proposal-head
      >
        <TermHead g={g} titles={titles} />
        <button type="button" className="mt-1 text-sm font-semibold text-accent underline" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)} data-proposal-toggle>
          {open ? "Hide the proposals" : `Show all ${g.count} ${g.count === 1 ? "proposal" : "proposals"} (newest first)`}
        </button>
      </div>
      {open ? <Details g={g} titles={titles} id={listId} /> : null}
      {g.comments.length ? (
        <ul className="mt-1 space-y-0.5 text-sm" data-proposal-comments>
          {g.comments.map((c, i) => (
            <li key={i}>
              <span className="text-xs text-muted">
                {c.name} ({c.role}), {pstScreen(c.utc)}:
              </span>{" "}
              {c.text}
            </li>
          ))}
        </ul>
      ) : null}
      {children}
    </li>
  );
}

export default function ProposalsPanel({ role, initial, initialError }: { role: Role; initial: ProposalsView | null; initialError: string }) {
  const [view, setView] = useState<ProposalsView | null>(initial);
  const [message, setMessage] = useState<Message>(initialError ? { kind: "error", text: initialError } : null);
  const [busy, setBusy] = useState("");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [rebuild, setRebuild] = useState<{ ok: boolean; applied: boolean; output: string } | null>(null);
  const admin = role === "admin";

  async function reload(keep?: Message) {
    const r = await call("/api/dictionary/proposals", "GET");
    if (r.ok) {
      const v = r.data as unknown as ProposalsView;
      setView(v);
      // Unit VW129 (Q-A 3:129.4 row 1): the button "Agent proposals (N open)" shows the new count.
      window.dispatchEvent(new CustomEvent(OPEN_COUNT_EVENT, { detail: v.counts.open }));
    } else setMessage({ kind: "error", text: String(r.data.error ?? "The tab could not load.") });
    if (keep && r.ok) setMessage(keep);
  }

  async function decide(g: TermView, action: "accept" | "edit-accept" | "reject", values?: Record<string, unknown>) {
    if (!view) return;
    // Unit VW129 (Q-A 3:129.4 row 4): Accept of a term that is in the dictionary changes that entry. The confirm text says so.
    if (action === "accept" && g.kind === "revise" && !window.confirm(acceptConfirmText(g))) return;
    setBusy(g.id);
    setMessage(null);
    const r = await call("/api/dictionary/proposals/decide", "POST", { group: g.id, action, text: action === "reject" ? (rejectNote[g.id] ?? "") : "", values, etag: { decisions: view.etag.decisions, newest: g.newest.proposal_id } });
    if (r.ok) {
      setEdit(null);
      await reload({ kind: "ok", text: action === "reject" ? "Rejected. The term moved to the closed section." : `Accepted as ${String(r.data.decisionId)}. The dictionary file changes at the next rebuild.` });
    } else {
      setMessage({ kind: "error", text: String(r.data.error ?? "The decision failed.") });
      if (r.status === 409) await reload({ kind: "error", text: String(r.data.error ?? "The files changed.") });
    }
    setBusy("");
  }

  async function comment(g: TermView) {
    const text = (comments[g.id] ?? "").trim();
    if (!text) return;
    setBusy(g.id);
    const r = await call("/api/dictionary/proposals/comment", "POST", { group: g.id, text });
    if (r.ok) {
      setComments((c) => ({ ...c, [g.id]: "" }));
      await reload({ kind: "ok", text: "Comment saved." });
    } else setMessage({ kind: "error", text: String(r.data.error ?? "The comment failed.") });
    setBusy("");
  }

  async function runRebuild(apply: boolean) {
    if (apply && !window.confirm("Rebuild the dictionary file now? The old files go to the archive folder first.")) return;
    setBusy("rebuild");
    setMessage(null);
    const r = await call("/api/dictionary/rebuild", "POST", { apply });
    if (r.ok) {
      setRebuild({ ok: r.data.ok === true, applied: r.data.applied === true, output: String(r.data.output ?? "") });
      if (r.data.applied === true) await reload();
    } else setMessage({ kind: "error", text: String(r.data.error ?? "The rebuild failed.") });
    setBusy("");
  }

  if (!view) {
    return (
      <p role="alert" className="text-sm text-red-700" data-proposals-error>
        {message?.text ?? "The tab could not load."}
      </p>
    );
  }
  const titles = view.bookTitles ?? {};
  const open = view.groups.filter((g) => g.status === "open");
  const accepted = view.groups.filter((g) => g.status === "accepted");
  const rejected = view.groups.filter((g) => g.status === "rejected");
  const input = "min-h-[44px] w-full rounded border border-line bg-white px-2 py-1 md:min-h-0";
  const btn = "min-h-[44px] rounded border border-line px-3 py-1 text-sm font-semibold disabled:opacity-50 md:min-h-0";

  return (
    <div data-proposals-panel data-role={role}>
      <p className="mb-2 text-sm" data-proposals-summary>
        {open.length} open · {accepted.length} accepted · {rejected.length} rejected · {view.counts.rows} proposals in the file
        {view.counts.badRows ? ` · ${view.counts.badRows} bad lines skipped` : ""}
      </p>
      {!view.proposalsFile ? (
        <p className="mb-2 text-sm text-muted" data-proposals-nofile>
          The file proposals.jsonl does not exist yet. The runs write it when an agent proposes a term.
        </p>
      ) : null}
      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={`mb-2 text-sm ${message.kind === "error" ? "text-red-700" : ""}`} data-proposals-message={message.kind}>
          {message.text}
        </p>
      ) : null}

      {view.pending.length > 0 ? (
        <div className="mb-3 rounded border border-line bg-white p-3 text-sm" data-pending-note>
          <p>
            {view.pending.length} accepted {view.pending.length === 1 ? "decision is" : "decisions are"} not in the dictionary yet ({view.pending.join(", ")}). The runs read the dictionary at the next book start, after a rebuild.
          </p>
          {admin && view.canRebuild ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={busy !== ""} onClick={() => void runRebuild(false)} data-rebuild-check>
                Check the rebuild (dry run)
              </button>
              {rebuild?.ok ? (
                <button type="button" className={btn} disabled={busy !== ""} onClick={() => void runRebuild(true)} data-rebuild-apply>
                  Rebuild the dictionary
                </button>
              ) : null}
            </div>
          ) : null}
          {rebuild ? (
            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded border border-line p-2 text-xs" data-rebuild-output data-rebuild-ok={rebuild.ok ? "yes" : "no"}>
              {pstInOutput(rebuild.output) || "(no output)"}
            </pre>
          ) : null}
        </div>
      ) : null}

      <ul className="grid gap-2" data-proposals-open>
        {open.length === 0 ? (
          <li className="text-sm text-muted" data-proposals-empty>
            No open proposals.
          </li>
        ) : null}
        {open.map((g) => (
          <TermRow key={g.id} g={g} titles={titles}>
            {edit?.id === g.id ? (
              <form
                className="mt-2 grid gap-2"
                data-proposal-edit-form
                onSubmit={(e) => {
                  e.preventDefault();
                  void decide(
                    g,
                    "edit-accept",
                    edit.as === "add"
                      ? { as: "add", ja_term: edit.ja_term, reading: edit.reading, romaji: edit.romaji, concise_en: edit.concise_en, detailed_en: edit.detailed_en || null }
                      : { as: "revise", concise_en: edit.concise_en, detailed_en: edit.detailed_en || null },
                  );
                }}
              >
                {g.existing ? (
                  // Unit VW129 (Q-A 3:129.4 row 4): the admin chooses. A change of the entry is the default. A new entry needs another Japanese term, because the builder refuses a second entry for one headword.
                  <fieldset className="grid gap-1 text-sm" data-edit-as>
                    <legend className="font-semibold">What to write</legend>
                    <label className="flex items-center gap-2">
                      <input type="radio" name={`as-${g.id}`} checked={edit.as === "revise"} onChange={() => setEdit({ ...edit, as: "revise" })} data-edit-as-choice="revise" />
                      <span>
                        Change the entry{" "}
                        <span lang="ja" className="font-ja">
                          {g.existing.headword}
                        </span>{" "}
                        (revise, recommended)
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name={`as-${g.id}`} checked={edit.as === "add"} onChange={() => setEdit({ ...edit, as: "add" })} data-edit-as-choice="add" />
                      <span>Add a new entry (needs another Japanese term)</span>
                    </label>
                  </fieldset>
                ) : null}
                {edit.as === "add" ? (
                  <>
                    <label className="text-sm">
                      Japanese term
                      <input className={input} lang="ja" value={edit.ja_term} onChange={(e) => setEdit({ ...edit, ja_term: e.target.value })} data-edit-field="ja_term" />
                    </label>
                    <label className="text-sm">
                      Reading (kana)
                      <input className={input} lang="ja" value={edit.reading} onChange={(e) => setEdit({ ...edit, reading: e.target.value })} data-edit-field="reading" />
                    </label>
                    <label className="text-sm">
                      Romaji
                      <input className={input} value={edit.romaji} onChange={(e) => setEdit({ ...edit, romaji: e.target.value })} data-edit-field="romaji" />
                    </label>
                  </>
                ) : null}
                <label className="text-sm">
                  EN form
                  <input className={input} value={edit.concise_en} onChange={(e) => setEdit({ ...edit, concise_en: e.target.value })} data-edit-field="concise_en" />
                </label>
                <label className="text-sm">
                  Detailed text (optional)
                  <textarea className={input} rows={3} value={edit.detailed_en} onChange={(e) => setEdit({ ...edit, detailed_en: e.target.value })} data-edit-field="detailed_en" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className={btn} disabled={busy !== ""} data-edit-save>
                    Save and accept
                  </button>
                  <button type="button" className={btn} onClick={() => setEdit(null)} data-edit-cancel>
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}
            {admin && edit?.id !== g.id ? (
              <div className="mt-2 grid gap-2">
                {g.problem ? (
                  <p className="text-sm text-red-700" data-proposal-problem>
                    {g.problem}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btn} disabled={busy !== "" || g.problem !== ""} onClick={() => void decide(g, "accept")} data-action="accept">
                    Accept
                  </button>
                  <button
                    type="button"
                    className={btn}
                    disabled={busy !== ""}
                    onClick={() => setEdit({ id: g.id, as: g.kind, ja_term: g.ja_term, reading: g.reading, romaji: g.romaji, concise_en: g.newest.concise_en, detailed_en: g.newest.detailed_en ?? "" })}
                    data-action="edit"
                  >
                    Edit then accept
                  </button>
                  <button type="button" className={btn} disabled={busy !== ""} onClick={() => void decide(g, "reject")} data-action="reject">
                    Reject
                  </button>
                </div>
                <label className="text-xs text-muted">
                  Note for a rejection (optional)
                  <input className={input} value={rejectNote[g.id] ?? ""} onChange={(e) => setRejectNote({ ...rejectNote, [g.id]: e.target.value })} data-reject-note />
                </label>
              </div>
            ) : null}
            {!admin ? (
              <p className="mt-2 text-xs text-muted" data-proposal-readonly>
                Only the admin accepts or rejects. You can add a comment.
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 text-xs text-muted">
                Comment
                <input className={input} value={comments[g.id] ?? ""} onChange={(e) => setComments({ ...comments, [g.id]: e.target.value })} maxLength={2000} data-comment-text />
              </label>
              <button type="button" className={btn} disabled={busy !== "" || !(comments[g.id] ?? "").trim()} onClick={() => void comment(g)} data-action="comment">
                Add comment
              </button>
            </div>
          </TermRow>
        ))}
      </ul>

      <h3 className="mt-5 text-base font-semibold">Accepted ({accepted.length})</h3>
      <ul className="mt-1 grid gap-2" data-proposals-accepted>
        {accepted.map((g) => (
          <TermRow key={g.id} g={g} titles={titles}>
            <p className="mt-1 text-sm" data-proposal-decision>
              {g.decision === "edit-accept" ? "Accepted with edits" : "Accepted"} as {g.decision_id} by {g.decided_by} at {pstScreen(g.decided_utc)}.{" "}
              <span className="text-muted" data-proposal-indict>
                {g.in_dictionary ? "In the dictionary." : "Not in the dictionary yet."}
              </span>
            </p>
          </TermRow>
        ))}
      </ul>

      <details className="mt-5" data-proposals-rejected>
        <summary className="cursor-pointer text-base font-semibold">Rejected ({rejected.length})</summary>
        <ul className="mt-1 grid gap-2">
          {rejected.map((g) => (
            <TermRow key={g.id} g={g} titles={titles}>
              <p className="mt-1 text-sm" data-proposal-decision>
                Rejected by {g.decided_by} at {pstScreen(g.decided_utc)}.{g.decision_text ? ` Note: ${g.decision_text}` : ""}
              </p>
            </TermRow>
          ))}
        </ul>
      </details>
    </div>
  );
}

/** The confirm text of Accept for a term that is in the dictionary (row 4). */
export function acceptConfirmText(g: Pick<TermView, "ja_term" | "existing" | "entry_id" | "newest">): string {
  const head = g.existing ? `${g.ja_term} is already in the dictionary (entry ${g.existing.headword}, ${g.existing.entry_id}).` : `Accept changes the entry ${g.entry_id ?? ""}.`;
  return `${head} Accept changes that entry (revise) to the EN form "${g.newest.concise_en}". It makes no second entry. Continue?`;
}
