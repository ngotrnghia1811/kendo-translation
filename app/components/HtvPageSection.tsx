"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommentView, HtvBookPage, HtvPageData, HtvRow, Role, SavedRow, VersionInfo } from "@/lib/htv-types";
import { pstTime, pstTimeOrText } from "@/lib/htv-pst"; // unit TF83: PST on /translate (round 82 answer 14)
import { readersSeeLine } from "@/lib/reader-opens-rule";
import { capFirst, pageNumberText } from "@/lib/readable-names";
import { VerdictPill } from "./Pills";
import { MarkedText, TermPopup, type PickedTerm } from "./HtvMarkedText";
import RowComments from "./HtvComments";
import { Pane, useJaShare, usePaneSetting } from "./PaneSettings";
import { useColumnOrder } from "./ColumnOrder"; // Unit VW117 (Q-A 3:96.6 row 4): the page columns follow the order of the header bar.
import { rowGroups } from "@/lib/panel-order";

// Human-translation-view, one page section of the book screen. Rounds 50 to 54 (Q-A 2026-10-28 l29-60, l94-108, l119-134), VISION-viewer 15.10 to 15.12.
// Per sentence group: JA text, ED_3 text of the shown run, an own box, a copy button, and comments.
// Round 51 answer 7 (l52): nothing saves without a click on Save.
// Unit UXC step D (round 59 answer 4, l222): "Save per page section". Each section has its own Save, own version numbers, own run notice,
// own comments, and own admin run mark. The book screen (HtvBook.tsx) holds the leave warning for all sections.
// Unit UXC2 (round 61 answer 5, Q-A l265): no cog inside a section or a row. The cogs sit in the header row of the book screen.

const NOTICE_SAVED = "Saved for lines that this run cuts in another way"; // round 54 answer 9 (l128), exact label

interface Props {
  page: HtvBookPage;
  data: HtvPageData;
  user: { name: string; email: string; role: Role };
  /** True when the TL_3 information panel is pinned to this page. */
  pinned: boolean;
  /** False in the page view: the heading is plain text, because the panel always shows the shown page. */
  canPin: boolean;
  onPin: (n: number) => void;
  /** The section tells the book screen when it has unsaved text. */
  onDirty: (n: number, dirty: boolean) => void;
  /** The section asks the book screen to load the page again (after a change of the run mark). */
  onReload: (n: number) => Promise<void>;
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

export default function HtvPageSection({ page, data, user, pinned, canPin, onPin, onDirty, onReload }: Props) {
  const { versions: versionsIn, rows: initialRows, comments: initialComments, pbNote } = page;
  const n = page.n;
  const readOnly = user.role === "reader";
  const keys = useMemo(() => data.rows.map((r) => r.key), [data.rows]);
  const keySet = useMemo(() => new Set(keys), [keys]);

  const [versions, setVersions] = useState<VersionInfo[]>(versionsIn);
  const [loadedVersion, setLoadedVersion] = useState<number | null>(versionsIn[0]?.version ?? null);
  const fromRows = useCallback(
    (rows: SavedRow[]) => {
      const text: Record<string, string> = {};
      const agree: Record<string, boolean> = {};
      const run: Record<string, string> = {};
      for (const k of keys) {
        text[k] = "";
        agree[k] = false;
      }
      for (const r of rows) {
        if (keySet.has(r.groupKey)) {
          text[r.groupKey] = r.text;
          agree[r.groupKey] = r.agree;
          run[r.groupKey] = r.runId;
        }
      }
      return { text, agree, run };
    },
    [keys, keySet],
  );
  const initial = useMemo(() => fromRows(initialRows), [fromRows, initialRows]);
  const [texts, setTexts] = useState<Record<string, string>>(initial.text);
  const [baseline, setBaseline] = useState<Record<string, string>>(initial.text);
  // Round 58 answer 4 (Q-A l202): the agree tick of each row. Round 59 answer 5 (l223): a tick and own text exclude each other.
  const [agrees, setAgrees] = useState<Record<string, boolean>>(initial.agree);
  const [baseAgree, setBaseAgree] = useState<Record<string, boolean>>(initial.agree);
  const [rowRun, setRowRun] = useState<Record<string, string>>(initial.run);
  // Saved rows whose key has no row in the shown run (round 54 answer 9, l128).
  const [orphans, setOrphans] = useState<SavedRow[]>(initialRows.filter((r) => !keySet.has(r.groupKey) && (r.text.trim() || r.agree)));
  const [comments, setComments] = useState<CommentView[]>(initialComments);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [picked, setPicked] = useState<PickedTerm | null>(null);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [markRun, setMarkRun] = useState(data.runs[0]?.runId ?? "");
  const [markBusy, setMarkBusy] = useState(false);
  const closePopup = useCallback(() => setPicked(null), []);
  // Round 75 answer 3 (qa-memory-2026-10-31.md:53): the status line "Readers see ..." for the admin. null = not loaded (no line).
  const [openIds, setOpenIds] = useState<Set<string> | null>(null);
  const isAdmin = user.role === "admin";
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    void fetch(`/api/admin/opens?book=${encodeURIComponent(data.slug)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { opens: { runId: string }[] } | null) => {
        if (alive && j) setOpenIds(new Set(j.opens.map((o) => o.runId)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isAdmin, data.slug, data.markedRunId]);

  const dirty = useMemo(
    () => keys.some((k) => (texts[k] ?? "") !== (baseline[k] ?? "") || !!agrees[k] !== !!baseAgree[k]),
    [keys, texts, baseline, agrees, baseAgree],
  );
  useEffect(() => {
    onDirty(n, dirty);
  }, [n, dirty, onDirty]);
  useEffect(() => () => onDirty(n, false), [n, onDirty]);

  const noticeFor = (k: string): string => {
    const r = rowRun[k];
    if (!r || r === data.runId) return "";
    // Round 58 answer 4: the notice shows when the saved text is not empty or the saved tick is on.
    if ((baseline[k] ?? "").trim()) return `You saved this text while the page showed run ${r}. The page now shows run ${data.runId}. The agent text of this row can differ.`;
    if (baseAgree[k]) return `You ticked this row while the page showed run ${r}. The page now shows run ${data.runId}. The agent text of this row can differ.`;
    return "";
  };
  const anyNotice = keys.some((k) => noticeFor(k));

  async function save() {
    setSaving(true);
    setMessage(null);
    const r = await api<{ version: number; created: string; count: number }>("POST", "/api/htv/save", {
      pageId: data.pageId,
      runId: data.runId,
      rows: keys.map((k) => ({ groupKey: k, text: texts[k] ?? "", agree: !!agrees[k] })),
    });
    setSaving(false);
    if (!r.ok) {
      if (r.status === 401) return setMessage({ kind: "error", text: "Your sign-in ended. Sign in again. Your text stays in the boxes." });
      return setMessage({ kind: "error", text: r.data.error ?? "The save failed. No row was saved." });
    }
    const v = r.data.version;
    setBaseline({ ...texts });
    setBaseAgree({ ...agrees });
    setRowRun(Object.fromEntries(keys.map((k) => [k, data.runId])));
    setLoadedVersion(v);
    setVersions((l) => [{ version: v, created: r.data.created, runId: data.runId, rows: r.data.count, agreed: keys.filter((k) => agrees[k]).length }, ...l]);
    setMessage({ kind: "ok", text: `Saved as version ${v} at ${pstTime(r.data.created) || "this moment"}. ${r.data.count} rows.` });
  }

  async function loadVersion(v: number) {
    if (dirty && !window.confirm(`Replace the unsaved text with version ${v}?`)) return;
    setMessage(null);
    const r = await api<{ rows: SavedRow[] }>("GET", `/api/htv/version?pageId=${encodeURIComponent(data.pageId)}&version=${v}`);
    if (!r.ok) return setMessage({ kind: "error", text: r.data.error ?? "The version did not load." });
    const next = fromRows(r.data.rows);
    setTexts(next.text);
    setAgrees(next.agree);
    // The loaded text counts as unsaved: the boxes differ from the newest saved version unless the user saves.
    setBaseline(next.text);
    setBaseAgree(next.agree);
    setRowRun(next.run);
    setOrphans(r.data.rows.filter((x) => !keySet.has(x.groupKey) && (x.text.trim() || x.agree)));
    setLoadedVersion(v);
    setMessage({ kind: "ok", text: `Version ${v} is in the boxes. Click Save to keep it as a new version.` });
  }

  async function setMark(on: boolean) {
    if (dirty && !window.confirm("You have unsaved text on this page. The page loads again with the other run. Continue?")) return;
    setMarkBusy(true);
    setMessage(null);
    const r = on ? await api("PUT", "/api/htv/mark", { pageId: data.pageId, runId: markRun }) : await api("DELETE", "/api/htv/mark", { pageId: data.pageId });
    setMarkBusy(false);
    if (!r.ok) return setMessage({ kind: "error", text: r.data.error ?? "The run mark did not change." });
    setBaseline({ ...texts }); // the section loads again, so the leave warning must not block it
    setBaseAgree({ ...agrees });
    await onReload(n);
  }

  const patchComments = useCallback((next: (l: CommentView[]) => CommentView[]) => setComments(next), []);
  const commentsOf = (k: string) => comments.filter((c) => c.groupKey === k);
  const orphanComments = comments.filter((c) => !keySet.has(c.groupKey));
  const orphanKeys = [...new Set([...orphans.map((o) => o.groupKey), ...orphanComments.map((c) => c.groupKey)])];

  const verdictRun = data.runs.find((r) => r.runId === data.runId);
  const pageText = capFirst(pageNumberText(data.page)); // "p001" gives "Page 1" (lib/readable-names.ts, unit VW96)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* Unit VW110 (Q-A 3:74.5 part 1, Q-A 3:72.2 "Use the real name of the book, not the file name"): the heading shows "Page 1" and then the book title.
              The page ID (for example 100_practice_full/p001) is the hover text. The attributes data-pin and data-page-heading keep the page ID. */}
          <h2 className="text-lg font-semibold tracking-tight">
            {canPin ? (
              <button
                type="button"
                onClick={() => onPin(n)}
                aria-pressed={pinned}
                title={`Page ID ${data.pageId}. ` + (pinned ? "The TL_3 information panel is pinned to this page. Click to follow the page in view." : "Click to show the TL_3 information panel of this page")}
                className={"underline-offset-2 hover:underline " + (pinned ? "text-accent" : "")}
                data-pin={data.pageId}
              >
                {pageText}
              </button>
            ) : (
              <span data-page-heading={data.pageId} title={`Page ID ${data.pageId}`}>
                {pageText}
              </span>
            )}
            {data.bookTitle ? (
              <span className="ml-3 text-base font-normal text-muted" data-page-book-title>
                {data.bookTitle}
              </span>
            ) : null}
          </h2>
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
        {!readOnly ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">
              {dirty ? "Unsaved changes" : loadedVersion ? `Version ${loadedVersion} is in the boxes` : "No saved version yet"}
            </span>
            <button type="button" onClick={save} disabled={saving} className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50" data-save={data.pageId}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        ) : null}
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
          <select aria-label="Run to mark" value={markRun} onChange={(e) => setMarkRun(e.target.value)} className="min-w-0 max-w-full rounded border border-line bg-white px-1.5 py-0.5" data-run-mark-select>
            {data.runs.map((r) => (
              <option key={r.runId} value={r.runId}>
                {r.runId} · {r.verdict} · {pstTimeOrText(r.startedUtc) || "no start time"}
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
      {user.role === "admin" && openIds ? (
        <p className="mt-1 text-sm" data-readers-see>
          {readersSeeLine(data.runs, data.markedRunId, openIds)} <span className="text-muted">Readers see a change after the next S2 run.</span>
        </p>
      ) : null}

      {!readOnly && versions.length > 0 ? (
        <Pane id="versions" className="mt-3 rounded border border-line bg-white/60 text-sm">
        <details className="p-2">
          <summary className="cursor-pointer select-none font-medium">Version history ({versions.length})</summary>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-1 pr-3">Version</th>
                <th className="pr-3">Saved</th>
                <th className="pr-3">Run</th>
                <th className="pr-3">Rows</th>
                <th className="pr-3">Agreed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.version} className="border-t border-line/60" data-version={v.version}>
                  <td className="py-1 pr-3 font-semibold">{v.version}</td>
                  <td className="pr-3">{pstTime(v.created)}</td>
                  <td className="pr-3 font-mono text-xs">
                    {v.runId}
                    {v.runId !== data.runId ? <span className="ml-1 text-amber-800">(not the shown run)</span> : null}
                  </td>
                  <td className="pr-3">{v.rows}</td>
                  <td className="pr-3">{v.agreed}</td>
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
        </Pane>
      ) : null}

      <div className="mt-4">
        <div className="space-y-4">
          {data.rows.map((row) => (
            <RowCard
              key={row.key}
              row={row}
              readOnly={readOnly}
              text={texts[row.key] ?? ""}
              onText={(t) => {
                setTexts((s) => ({ ...s, [row.key]: t }));
                // Round 59 answer 5 (l223): typing in the own box clears the tick.
                if (t !== "") setAgrees((s) => (s[row.key] ? { ...s, [row.key]: false } : s));
              }}
              agree={!!agrees[row.key]}
              onAgree={(on) => {
                if (on && (texts[row.key] ?? "").trim() !== "") {
                  if (!window.confirm("Clear your own text in this row?")) return;
                  setTexts((s) => ({ ...s, [row.key]: "" }));
                }
                setAgrees((s) => ({ ...s, [row.key]: on }));
              }}
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
                          {o.agree ? (
                            <div data-orphan-agree>
                              <div className="text-xs text-muted">You agreed to this agent text:</div>
                              <div className="whitespace-pre-wrap">{o.ed3Text || "(no agent text was saved)"}</div>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{o.text}</div>
                          )}
                          <div className="text-xs text-muted">Saved while the page showed run {o.runId}</div>
                        </div>
                      ))}
                    {orphanComments
                      .filter((c) => c.groupKey === k)
                      .map((c) => (
                        <div key={c.id} className="mt-1 border-t border-line/60 pt-1">
                          <div className="text-xs text-muted">
                            Comment by {c.mine ? "you" : c.userName}, {pstTime(c.created)}, run {c.runId || "unknown"}
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
  agree,
  onAgree,
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
  agree: boolean;
  onAgree: (on: boolean) => void;
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
  const share = useJaShare();
  const own = usePaneSetting("own");
  // Unit VW117 (Q-A 3:96.6 row 4): the blocks of the row stand in the order of the columns (header bar of the book screen). Japanese and Agent translation stand side by side
  // when they are next to each other in the order. Your translation keeps its Comments button in its line when Comments follows it. With the old order the row looks as it did before.
  const { order } = useColumnOrder();
  const groups = rowGroups(order, readOnly);
  const jaPane = (
    <Pane key="ja" id="ja" className="font-ja text-[1.05rem] leading-relaxed" lang="ja">
      <MarkedText text={row.ja} marks={row.jaMarks} onPick={onPick} />
    </Pane>
  );
  const agentPane = (
    <Pane key="agent" id="agent" className="font-serif text-[1.05rem] leading-relaxed" dataAttr={{ "data-ed3": "" }}>
      {row.ed3 ? <MarkedText text={row.ed3} marks={row.edMarks} onPick={onPick} /> : <span className="text-muted">No agent text for this row.</span>}
    </Pane>
  );
  const commentsButton = (
    <button type="button" onClick={onToggleComments} className="text-accent underline">
      Comments ({comments.length})
    </button>
  );
  const commentsList = commentsOpen ? <RowComments pageId={pageId} groupKey={row.key} runId={runId} role={role} comments={comments} onChange={onComments} /> : null;
  return (
    <article className="rounded border border-line bg-white/70 p-3" data-row={row.key}>
      <div className="mb-1.5 flex items-center gap-2 text-xs text-muted">
        <span className="font-mono">{row.shortKey}</span>
        {row.part === "block_title" ? <span className="rounded bg-stone-200 px-1.5 text-stone-700">Title</span> : null}
        <span>{Array.from(row.ja).length} JA characters</span>
      </div>
      {groups.map((g, gi) => {
        const gap = gi === 0 ? undefined : "mt-2";
        if (g.kind === "texts") {
          // The share of the row belongs to the Japanese column. Two columns: the first one in the order stands left.
          const cols = g.ids.length === 2 ? (g.ids[0] === "ja" ? `${share}fr ${100 - share}fr` : `${100 - share}fr ${share}fr`) : "1fr";
          return (
            <div key={`texts-${g.ids.join("-")}`} className={"grid gap-6" + (gap ? ` ${gap}` : "")} style={{ gridTemplateColumns: cols }} data-row-block={g.ids.join("-")}>
              {g.ids.map((id) => (id === "ja" ? jaPane : agentPane))}
            </div>
          );
        }
        if (g.kind === "comments") {
          return (
            <div key="comments" className={gap} data-row-block="comments">
              <div className="flex items-center gap-4 text-sm">{commentsButton}</div>
              {commentsList}
            </div>
          );
        }
        return (
          <div key="own" className={gap} data-row-block="own">
            {notice ? (
              <p data-row-notice className="mb-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                {notice}
              </p>
            ) : null}
            <textarea
              aria-label={`Own translation for ${row.shortKey}`}
              style={own.style}
              value={text}
              onChange={(e) => onText(e.target.value)}
              rows={Math.max(2, Math.min(12, Math.ceil(Array.from(row.ed3 || row.ja).length / 60)))}
              placeholder="Your own translation"
              className="w-full rounded border border-line bg-white p-2 font-serif text-[1.05rem] leading-relaxed placeholder:text-muted"
            />
            <div className="mt-1 flex items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" data-agree={row.key} checked={agree} disabled={!row.ed3} onChange={(e) => onAgree(e.target.checked)} />
                Agree with the agent text
              </label>
              <button type="button" disabled={!row.ed3} onClick={() => onText(row.ed3)} className="text-accent underline disabled:text-muted disabled:no-underline">
                Copy the agent text into the box
              </button>
              {g.withComments ? commentsButton : null}
            </div>
            {g.withComments ? commentsList : null}
          </div>
        );
      })}
    </article>
  );
}
