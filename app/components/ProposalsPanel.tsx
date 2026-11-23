"use client";
import { useState } from "react";
import type { GroupView } from "@/lib/proposals-core";
import type { ProposalsView } from "@/lib/proposals-data";
import { pstInOutput, pstRange, pstScreen } from "@/lib/proposals-times"; // unit VW126 PST fix (Q-A 3:122.2): the files keep UTC, the screen shows PST

/*
 * The tab "Agent proposals" of /dictionary (unit VW126, Q-A 3:116.8, Q-A 3:117.7 rows 1 to 6, Q-A 3:121.2).
 * The server draws the first view, so the tab needs no script to read. The buttons call the routes under /api/dictionary:
 *   Comment (translator or admin), Accept, Edit then accept, Reject (admin only), and Rebuild the dictionary (admin only).
 * A decided group moves to the section "Accepted" or to the closed section "Rejected". Nothing is deleted.
 */

type Role = "translator" | "admin";
type Message = { kind: "ok" | "error"; text: string } | null;
type Edit = { id: string; ja_term: string; reading: string; romaji: string; concise_en: string; detailed_en: string };

async function call(url: string, method: "GET" | "POST", body?: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const r = await fetch(url, { method, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: r.ok, status: r.status, data };
}

const kindText = (g: GroupView): string => (g.kind === "add" ? "New term" : `Revise of the entry ${g.entry_id ?? ""}`);

function Counts({ g }: { g: GroupView }) {
  return (
    <p className="text-sm text-muted" data-proposal-counts>
      Proposed {g.count} {g.count === 1 ? "time" : "times"} · {g.boxes.length} {g.boxes.length === 1 ? "box" : "boxes"} · {g.pages.length} {g.pages.length === 1 ? "page" : "pages"} · {g.books.length} {g.books.length === 1 ? "book" : "books"}
      {g.since > 0 ? ` · ${g.since} more since the decision` : ""}
    </p>
  );
}

function GroupBody({ g }: { g: GroupView }) {
  const others = g.concise_en_forms.filter((f) => f.text !== g.newest.concise_en);
  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span lang="ja" className="font-ja text-lg font-semibold" data-proposal-term>
          {g.kind === "add" ? g.ja_term : (g.current?.headword ?? g.ja_term)}
        </span>
        {g.kind === "add" && g.reading ? (
          <span lang="ja" className="font-ja text-muted">
            {g.reading}
          </span>
        ) : null}
        {g.kind === "add" && g.romaji ? <span className="font-serif italic">{g.romaji}</span> : null}
        <span className="rounded border border-line px-1 text-xs text-muted" data-proposal-kind>
          {kindText(g)}
        </span>
      </p>
      <Counts g={g} />
      <p className="mt-1 text-sm" data-proposal-en>
        <span className="text-muted">{g.kind === "add" ? "Proposed EN form: " : "Proposed new EN form: "}</span>
        <strong>{g.newest.concise_en}</strong>
        {g.kind === "revise" && g.current ? <span className="text-muted"> (now: {g.current.concise_en || "none"})</span> : null}
      </p>
      {others.length ? (
        <p className="text-xs text-muted" data-proposal-forms>
          Other forms: {others.map((f) => `${f.text} ×${f.count}`).join("; ")}
        </p>
      ) : null}
      {g.newest.detailed_en ? (
        <p className="mt-1 text-sm text-muted" data-proposal-detailed>
          {g.newest.detailed_en}
        </p>
      ) : null}
      {g.newest.reason ? (
        <p className="mt-1 text-xs text-muted" data-proposal-reason>
          Reason: {g.newest.reason}
        </p>
      ) : null}
      <p className="text-xs text-muted" data-proposal-times>
        {pstRange(g.first_utc, g.last_utc)} · {g.newest.page_id} · {g.newest.box}
      </p>
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
    </>
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
    if (r.ok) setView(r.data as unknown as ProposalsView);
    else setMessage({ kind: "error", text: String(r.data.error ?? "The tab could not load.") });
    if (keep && r.ok) setMessage(keep);
  }

  async function decide(g: GroupView, action: "accept" | "edit-accept" | "reject", values?: Record<string, unknown>) {
    if (!view) return;
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

  async function comment(g: GroupView) {
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
          <li key={g.id} data-proposal-group={g.id} data-proposal-term-text={g.ja_term} className="rounded border border-line bg-white p-3">
            <GroupBody g={g} />
            {edit?.id === g.id ? (
              <form
                className="mt-2 grid gap-2"
                data-proposal-edit-form
                onSubmit={(e) => {
                  e.preventDefault();
                  void decide(g, "edit-accept", g.kind === "add" ? { ja_term: edit.ja_term, reading: edit.reading, romaji: edit.romaji, concise_en: edit.concise_en, detailed_en: edit.detailed_en || null } : { concise_en: edit.concise_en, detailed_en: edit.detailed_en || null });
                }}
              >
                {g.kind === "add" ? (
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
                    onClick={() => setEdit({ id: g.id, ja_term: g.ja_term, reading: g.reading, romaji: g.romaji, concise_en: g.newest.concise_en, detailed_en: g.newest.detailed_en ?? "" })}
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
          </li>
        ))}
      </ul>

      <h3 className="mt-5 text-base font-semibold">Accepted ({accepted.length})</h3>
      <ul className="mt-1 grid gap-2" data-proposals-accepted>
        {accepted.map((g) => (
          <li key={g.id} data-proposal-group={g.id} data-proposal-term-text={g.ja_term} className="rounded border border-line bg-white p-3">
            <GroupBody g={g} />
            <p className="text-sm" data-proposal-decision>
              {g.decision === "edit-accept" ? "Accepted with edits" : "Accepted"} as {g.decision_id} by {g.decided_by} at {pstScreen(g.decided_utc)}.{" "}
              <span className="text-muted" data-proposal-indict>
                {g.in_dictionary ? "In the dictionary." : "Not in the dictionary yet."}
              </span>
            </p>
          </li>
        ))}
      </ul>

      <details className="mt-5" data-proposals-rejected>
        <summary className="cursor-pointer text-base font-semibold">Rejected ({rejected.length})</summary>
        <ul className="mt-1 grid gap-2">
          {rejected.map((g) => (
            <li key={g.id} data-proposal-group={g.id} data-proposal-term-text={g.ja_term} className="rounded border border-line bg-white p-3">
              <GroupBody g={g} />
              <p className="text-sm" data-proposal-decision>
                Rejected by {g.decided_by} at {pstScreen(g.decided_utc)}.{g.decision_text ? ` Note: ${g.decision_text}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
