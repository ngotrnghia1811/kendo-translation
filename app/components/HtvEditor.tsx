"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommentView, HtvPageData, HtvRow, Role, SavedRow, VersionInfo } from "@/lib/htv-types";
import { utcTime } from "@/lib/htv-format";
import { VerdictPill } from "./Pills";
import { MarkedText, TermPopup, type PickedTerm } from "./HtvMarkedText";
import RowComments from "./HtvComments";
import Tl3Panel from "./HtvPanel";

// Human-translation-view, one page. Rounds 50 to 54 (Q-A 2026-10-28 l29-60, l94-108, l119-134), VISION-viewer 15.10 to 15.12.
// Per sentence group: JA text, ED_3 text of the shown run, an own box, a copy button, and comments.
// Round 51 answer 7 (l52): nothing saves without a click on Save. Round 52 answer 12 (l83): warn on unsaved leave.

const NOTICE_SAVED = "Saved for lines that this run cuts in another way"; // round 54 answer 9 (l128), exact label

interface Props {
  data: HtvPageData;
  user: { name: string; email: string; role: Role };
  versions: VersionInfo[];
  initialRows: SavedRow[];
  initialComments: CommentView[];
  /** Plain note when PocketBase could not give the saved data. */
  pbNote: string;
}

async function api<T = Record<string, unknown>>(method: string, url: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  let data = {} as T & { error?: string };
  try {
    data = await r.json();
  } catch {
    /* no body */
  }
  return { ok: r.ok, status: r.status, data };
}

export default function HtvEditor({ data, user, versions: versionsIn, initialRows, initialComments, pbNote }: Props) {
  const router = useRouter();
  const readOnly = user.role === "reader";
  const keys = useMemo(() => data.rows.map((r) => r.key), [data.rows]);
  const keySet = useMemo(() => new Set(keys), [keys]);

  const [versions, setVersions] = useState<VersionInfo[]>(versionsIn);
  const [loadedVersion, setLoadedVersion] = useState<number | null>(versionsIn[0]?.version ?? null);
  const fromRows = useCallback(
    (rows: SavedRow[]) => {
      const text: Record<string, string> = {};
      const run: Record<string, string> = {};
      for (const k of keys) text[k] = "";
      for (const r of rows) {
        if (keySet.has(r.groupKey)) {
          text[r.groupKey] = r.text;
          run[r.groupKey] = r.runId;
        }
      }
      return { text, run };
    },
    [keys, keySet],
  );
  const initial = useMemo(() => fromRows(initialRows), [fromRows, initialRows]);
  const [texts, setTexts] = useState<Record<string, string>>(initial.text);
  const [baseline, setBaseline] = useState<Record<string, string>>(initial.text);
  const [rowRun, setRowRun] = useState<Record<string, string>>(initial.run);
  // Saved rows whose key has no row in the shown run (round 54 answer 9, l128).
  const [orphans, setOrphans] = useState<SavedRow[]>(initialRows.filter((r) => !keySet.has(r.groupKey) && r.text.trim()));
  const [comments, setComments] = useState<CommentView[]>(initialComments);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [picked, setPicked] = useState<PickedTerm | null>(null);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [markRun, setMarkRun] = useState(data.runs[0]?.runId ?? "");
  const [markBusy, setMarkBusy] = useState(false);
  const closePopup = useCallback(() => setPicked(null), []);

  const dirty = useMemo(() => keys.some((k) => (texts[k] ?? "") !== (baseline[k] ?? "")), [keys, texts, baseline]);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Token refresh, once on load.
  useEffect(() => {
    void api("POST", "/api/htv/refresh", {});
  }, []);

  // Round 52 answer 12 (Q-A l83): "Warn on unsaved leave". The browser warns on a reload, a close, and a typed address.
  // A click on a link inside the app asks first (capture phase, before the Next.js link handler).
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const click = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm("You have unsaved text on this page. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, []);

  const noticeFor = (k: string): string => {
    const r = rowRun[k];
    if (!r || r === data.runId || !(baseline[k] ?? "").trim()) return "";
    return `You saved this text while the page showed run ${r}. The page now shows run ${data.runId}. The agent text of this row can differ.`;
  };
  const anyNotice = keys.some((k) => noticeFor(k));

  async function save() {
    setSaving(true);
    setMessage(null);
    const r = await api<{ version: number; created: string; count: number }>("POST", "/api/htv/save", {
      pageId: data.pageId,
      runId: data.runId,
      rows: keys.map((k) => ({ groupKey: k, text: texts[k] ?? "" })),
    });
    setSaving(false);
    if (!r.ok) {
      if (r.status === 401) return setMessage({ kind: "error", text: "Your sign-in ended. Sign in again. Your text stays in the boxes." });
      return setMessage({ kind: "error", text: r.data.error ?? "The save failed. No row was saved." });
    }
    const v = r.data.version;
    setBaseline({ ...texts });
    setRowRun(Object.fromEntries(keys.map((k) => [k, data.runId])));
    setLoadedVersion(v);
    setVersions((l) => [{ version: v, created: r.data.created, runId: data.runId, rows: r.data.count }, ...l]);
    setMessage({ kind: "ok", text: `Saved as version ${v} at ${utcTime(r.data.created) || "this moment"}. ${r.data.count} rows.` });
  }

  async function loadVersion(v: number) {
    if (dirty && !window.confirm(`Replace the unsaved text with version ${v}?`)) return;
    setMessage(null);
    const r = await api<{ rows: SavedRow[] }>("GET", `/api/htv/version?pageId=${encodeURIComponent(data.pageId)}&version=${v}`);
    if (!r.ok) return setMessage({ kind: "error", text: r.data.error ?? "The version did not load." });
    const next = fromRows(r.data.rows);
    setTexts(next.text);
    // The loaded text counts as unsaved: the boxes differ from the newest saved version unless the user saves.
    setBaseline(next.text);
    setRowRun(next.run);
    setOrphans(r.data.rows.filter((x) => !keySet.has(x.groupKey) && x.text.trim()));
    setLoadedVersion(v);
    setMessage({ kind: "ok", text: `Version ${v} is in the boxes. Click Save to keep it as a new version.` });
  }

  async function setMark(on: boolean) {
    if (dirty && !window.confirm("You have unsaved text. The page reloads with the other run. Continue?")) return;
    setMarkBusy(true);
    setMessage(null);
    const r = on ? await api("PUT", "/api/htv/mark", { pageId: data.pageId, runId: markRun }) : await api("DELETE", "/api/htv/mark", { pageId: data.pageId });
    setMarkBusy(false);
    if (!r.ok) return setMessage({ kind: "error", text: r.data.error ?? "The run mark did not change." });
    setBaseline({ ...texts }); // the page reloads, so the leave warning must not block it
    dirtyRef.current = false;
    router.refresh();
  }

  const patchComments = useCallback((next: (l: CommentView[]) => CommentView[]) => setComments(next), []);
  const commentsOf = (k: string) => comments.filter((c) => c.groupKey === k);
  const orphanComments = comments.filter((c) => !keySet.has(c.groupKey));
  const orphanKeys = [...new Set([...orphans.map((o) => o.groupKey), ...orphanComments.map((c) => c.groupKey)])];

  const verdictRun = data.runs.find((r) => r.runId === data.runId);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {data.pageId}
            {data.bookTitle ? <span className="ml-3 text-base font-normal text-muted">{data.bookTitle}</span> : null}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5">
              QA_3 verdict <VerdictPill verdict={data.verdict} score={data.score} />
            </span>
            <span>
              Shown run <span className="font-mono text-xs" data-shown-run>{data.runId}</span>
            </span>
            <span className="text-muted">{data.markedRunId ? "Chosen by the admin run mark" : "Newest finished run"}</span>
            <span className="text-muted">{data.runs.length} finished {data.runs.length === 1 ? "run" : "runs"}</span>
            {verdictRun && verdictRun.status !== "completed" ? <span className="text-muted">Run status: {verdictRun.status}</span> : null}
          </div>
          {data.markNote ? <p className="mt-1 text-sm text-amber-800">{data.markNote}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {!readOnly ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">
                {dirty ? "Unsaved changes" : loadedVersion ? `Version ${loadedVersion} is in the boxes` : "No saved version yet"}
              </span>
              <button type="button" onClick={save} disabled={saving} className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          ) : (
            <span className="text-sm text-muted">This account can read only. It has no own boxes and no comments.</span>
          )}
          <button type="button" onClick={() => setPanelOpen((v) => !v)} className="text-sm text-accent underline">
            {panelOpen ? "Hide the TL_3 information panel" : "Show the TL_3 information panel"}
          </button>
        </div>
      </div>

      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={`mt-2 text-sm ${message.kind === "error" ? "text-red-700" : "text-green-800"}`}>
          {message.text}
        </p>
      ) : null}
      {pbNote ? <p className="mt-2 text-sm text-red-700">{pbNote}</p> : null}
      {data.notes.map((n) => (
        <p key={n} className="mt-1 text-sm text-muted">
          {n}
        </p>
      ))}
      {anyNotice ? (
        <p data-run-notice className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
          A saved text on this page comes from another run than the one that the page shows now. The rows with a notice name the runs.
        </p>
      ) : null}

      {user.role === "admin" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded border border-line bg-white/60 p-2 text-sm">
          <span className="font-medium">Run mark</span>
          <select aria-label="Run to mark" value={markRun} onChange={(e) => setMarkRun(e.target.value)} className="rounded border border-line bg-white px-1.5 py-0.5">
            {data.runs.map((r) => (
              <option key={r.runId} value={r.runId}>
                {r.runId} · {r.verdict} · {r.startedUtc || "no start time"}
              </option>
            ))}
          </select>
          <button type="button" disabled={markBusy || !markRun} onClick={() => setMark(true)} className="rounded border border-line px-2 py-0.5 disabled:opacity-50">
            Use this run for the page
          </button>
          <button type="button" disabled={markBusy || !data.markedRunId} onClick={() => setMark(false)} className="rounded border border-line px-2 py-0.5 disabled:opacity-50">
            Clear the run mark
          </button>
        </div>
      ) : null}

      {!readOnly && versions.length > 0 ? (
        <details className="mt-3 rounded border border-line bg-white/60 p-2 text-sm">
          <summary className="cursor-pointer select-none font-medium">Version history ({versions.length})</summary>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-1 pr-3">Version</th>
                <th className="pr-3">Saved</th>
                <th className="pr-3">Run</th>
                <th className="pr-3">Rows</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.version} className="border-t border-line/60" data-version={v.version}>
                  <td className="py-1 pr-3 font-semibold">{v.version}</td>
                  <td className="pr-3">{utcTime(v.created)}</td>
                  <td className="pr-3 font-mono text-xs">
                    {v.runId}
                    {v.runId !== data.runId ? <span className="ml-1 text-amber-800">(not the shown run)</span> : null}
                  </td>
                  <td className="pr-3">{v.rows}</td>
                  <td>
                    {loadedVersion === v.version && !dirty ? (
                      <span className="text-muted">in the boxes</span>
                    ) : (
                      <button type="button" onClick={() => loadVersion(v.version)} className="text-accent underline">
                        Load into the boxes
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}

      <div className="mt-4 flex items-start gap-6">
        <div className="min-w-0 flex-1 space-y-4">
          {data.rows.map((row) => (
            <RowCard
              key={row.key}
              row={row}
              readOnly={readOnly}
              text={texts[row.key] ?? ""}
              onText={(t) => setTexts((s) => ({ ...s, [row.key]: t }))}
              notice={noticeFor(row.key)}
              onPick={setPicked}
              comments={commentsOf(row.key)}
              commentsOpen={!!openComments[row.key]}
              onToggleComments={() => setOpenComments((s) => ({ ...s, [row.key]: !s[row.key] }))}
              pageId={data.pageId}
              runId={data.runId}
              role={user.role}
              onComments={patchComments}
            />
          ))}
          {data.rows.length === 0 ? <p className="text-muted">This run has no sentence groups.</p> : null}

          {orphanKeys.length > 0 ? (
            <section className="rounded border border-line bg-white/70 p-3" aria-label={NOTICE_SAVED}>
              <h2 className="text-sm font-semibold">{NOTICE_SAVED}</h2>
              <p className="text-xs text-muted">The shown run has no row with these keys. Copy the text into a row if you still need it.</p>
              <div className="mt-2 space-y-3">
                {orphanKeys.map((k) => (
                  <div key={k} className="rounded border border-line/70 p-2 text-sm">
                    <div className="font-mono text-xs text-muted">{k}</div>
                    {orphans
                      .filter((o) => o.groupKey === k)
                      .map((o) => (
                        <div key={o.runId + o.groupKey} className="mt-1">
                          {o.jaText ? <div className="font-ja text-muted">{o.jaText}</div> : null}
                          <div className="whitespace-pre-wrap">{o.text}</div>
                          <div className="text-xs text-muted">Saved while the page showed run {o.runId}</div>
                        </div>
                      ))}
                    {orphanComments
                      .filter((c) => c.groupKey === k)
                      .map((c) => (
                        <div key={c.id} className="mt-1 border-t border-line/60 pt-1">
                          <div className="text-xs text-muted">
                            Comment by {c.mine ? "you" : c.userName}, {utcTime(c.created)}, run {c.runId || "unknown"}
                            {c.shared ? ", shared" : ""}
                          </div>
                          <div className="whitespace-pre-wrap">{c.text}</div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {panelOpen ? (
          <aside className="sticky top-3 max-h-[calc(100vh-1.5rem)] w-[26rem] shrink-0 overflow-auto rounded border border-line bg-white/60 p-3" data-panel>
            <Tl3Panel panel={data.panel} />
          </aside>
        ) : null}
      </div>
      {picked ? <TermPopup picked={picked} entry={data.terms[picked.mark.entryId]} onClose={closePopup} /> : null}
    </div>
  );
}

function RowCard({
  row,
  readOnly,
  text,
  onText,
  notice,
  onPick,
  comments,
  commentsOpen,
  onToggleComments,
  pageId,
  runId,
  role,
  onComments,
}: {
  row: HtvRow;
  readOnly: boolean;
  text: string;
  onText: (t: string) => void;
  notice: string;
  onPick: (p: PickedTerm) => void;
  comments: CommentView[];
  commentsOpen: boolean;
  onToggleComments: () => void;
  pageId: string;
  runId: string;
  role: Role;
  onComments: (next: (l: CommentView[]) => CommentView[]) => void;
}) {
  return (
    <article className="rounded border border-line bg-white/70 p-3" data-row={row.key}>
      <div className="mb-1.5 flex items-center gap-2 text-xs text-muted">
        <span className="font-mono">{row.shortKey}</span>
        {row.part === "block_title" ? <span className="rounded bg-stone-200 px-1.5 text-stone-700">Title</span> : null}
        <span>{Array.from(row.ja).length} JA characters</span>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="font-ja text-[1.05rem] leading-relaxed" lang="ja">
          <MarkedText text={row.ja} marks={row.jaMarks} onPick={onPick} />
        </div>
        <div className="font-serif text-[1.05rem] leading-relaxed" data-ed3>
          {row.ed3 ? <MarkedText text={row.ed3} marks={row.edMarks} onPick={onPick} /> : <span className="text-muted">No agent text for this row.</span>}
        </div>
      </div>
      {!readOnly ? (
        <div className="mt-2">
          {notice ? (
            <p data-row-notice className="mb-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
              {notice}
            </p>
          ) : null}
          <textarea
            aria-label={`Own translation for ${row.shortKey}`}
            value={text}
            onChange={(e) => onText(e.target.value)}
            rows={Math.max(2, Math.min(12, Math.ceil(Array.from(row.ed3 || row.ja).length / 60)))}
            placeholder="Your own translation"
            className="w-full rounded border border-line bg-white p-2 font-serif text-[1.05rem] leading-relaxed"
          />
          <div className="mt-1 flex items-center gap-4 text-sm">
            <button type="button" disabled={!row.ed3} onClick={() => onText(row.ed3)} className="text-accent underline disabled:text-muted disabled:no-underline">
              Copy the agent text into the box
            </button>
            <button type="button" onClick={onToggleComments} className="text-accent underline">
              Comments ({comments.length})
            </button>
          </div>
          {commentsOpen ? <RowComments pageId={pageId} groupKey={row.key} runId={runId} role={role} comments={comments} onChange={onComments} /> : null}
        </div>
      ) : null}
    </article>
  );
}
