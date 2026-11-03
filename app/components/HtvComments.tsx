"use client";
import { useState } from "react";
import type { CommentView, Role } from "@/lib/htv-types";
import { pstTime } from "@/lib/htv-pst"; // unit TF83: PST on /translate (round 82 answer 14)
import { Pane } from "./PaneSettings";

// Round 50 answer 10 (Q-A 2026-10-28 l31): a comment attaches to one sentence row, and the writer chooses whether it is shared.
// Round 51 answer 10 (l55): the writer edits own comments, and a new comment starts private.
// Round 51 answer 11 (l56): the admin reads all comments, and the screen does not tell the writer. The label "private" names the
// share state only. No text on this screen says who else can read a private comment.
// Round 52 answer 12 (l83) and round 53 answer 10 (l104): the writer deletes own comments and can change private to shared later.
// The admin deletes any comment.

async function call(method: string, url: string, body?: unknown): Promise<{ ok: boolean; data: { error?: string; comment?: CommentView } }> {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  let data: { error?: string; comment?: CommentView } = {};
  try {
    data = await r.json();
  } catch {
    /* no body */
  }
  return { ok: r.ok, data };
}

export default function RowComments({
  pageId,
  groupKey,
  runId,
  role,
  comments,
  onChange,
}: {
  pageId: string;
  groupKey: string;
  runId: string;
  role: Role;
  comments: CommentView[];
  onChange: (next: (list: CommentView[]) => CommentView[]) => void;
}) {
  const [text, setText] = useState("");
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  async function add() {
    setBusy(true);
    setError("");
    const r = await call("POST", "/api/htv/comments", { pageId, groupKey, runId, text, shared });
    setBusy(false);
    if (!r.ok || !r.data.comment) return setError(r.data.error ?? "The comment was not saved.");
    const c = r.data.comment;
    onChange((l) => [...l, c]);
    setText("");
    setShared(false);
  }

  async function patch(id: string, changes: { text?: string; shared?: boolean }) {
    setBusy(true);
    setError("");
    const r = await call("PATCH", `/api/htv/comments/${id}`, changes);
    setBusy(false);
    if (!r.ok || !r.data.comment) return setError(r.data.error ?? "The comment was not changed.");
    const c = r.data.comment;
    onChange((l) => l.map((x) => (x.id === id ? c : x)));
    setEditId(null);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this comment?")) return;
    setBusy(true);
    setError("");
    const r = await call("DELETE", `/api/htv/comments/${id}`);
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "The comment was not deleted.");
    onChange((l) => l.filter((x) => x.id !== id));
  }

  return (
    <Pane id="comments" className="mt-2 border-t border-line/60 pt-2 text-sm">
      {comments.length === 0 ? <div className="text-muted">No comments for this row.</div> : null}
      <ul className="space-y-2">
        {comments.map((c) => (
          <li key={c.id} data-comment={c.id} className="rounded border border-line/70 bg-white/70 p-2">
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span className="font-medium text-foreground">{c.mine ? "You" : c.userName}</span>
              <span>{pstTime(c.created)}</span>
              {c.shared ? <span className="rounded bg-sky-100 px-1.5 text-sky-800">shared</span> : null}
              {!c.shared && (c.mine || role === "admin") ? <span className="rounded bg-stone-200 px-1.5 text-stone-700">private</span> : null}
              {c.runId && c.runId !== runId ? <span>written for run {c.runId}</span> : null}
              {c.updated && c.updated !== c.created ? <span>edited</span> : null}
            </div>
            {editId === c.id ? (
              <div className="mt-1">
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} className="w-full rounded border border-line p-1.5" />
                <div className="mt-1 flex gap-2">
                  <button type="button" disabled={busy || !editText.trim()} onClick={() => patch(c.id, { text: editText })} className="rounded bg-accent px-2 py-0.5 text-white disabled:opacity-50">
                    Save comment
                  </button>
                  <button type="button" onClick={() => setEditId(null)} className="rounded border border-line px-2 py-0.5">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1 whitespace-pre-wrap">{c.text}</div>
            )}
            {editId !== c.id && (c.mine || role === "admin") ? (
              <div className="mt-1 flex flex-wrap gap-3 text-xs">
                {c.mine ? (
                  <>
                    <button type="button" onClick={() => { setEditId(c.id); setEditText(c.text); }} className="text-accent underline">
                      Edit
                    </button>
                    <button type="button" disabled={busy} onClick={() => patch(c.id, { shared: !c.shared })} className="text-accent underline">
                      {c.shared ? "Make private" : "Share with translators"}
                    </button>
                  </>
                ) : null}
                <button type="button" disabled={busy} onClick={() => remove(c.id)} className="text-red-700 underline">
                  Delete
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <textarea
          aria-label="New comment"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Write a comment on this row"
          className="w-full rounded border border-line bg-white p-1.5"
        />
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
            Share with other translators
          </label>
          <button type="button" disabled={busy || !text.trim()} onClick={add} className="rounded bg-accent px-2.5 py-1 text-white disabled:opacity-50">
            Add comment
          </button>
          {error ? <span role="alert" className="text-red-700">{error}</span> : null}
        </div>
      </div>
    </Pane>
  );
}
