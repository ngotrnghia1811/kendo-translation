"use client";
import { useMemo, useState } from "react";
import type { BookSettingsSnapshot } from "@/lib/book-settings";
import { parseSettingsJson, pythonJson, stringifySettingsJson } from "@/lib/settings-json";
import { FIELDS, N_RULE_STOP, diffSettings, effect, nestSettings, validateSettings, valueError, type Field, type FlatSettings, type Scalar } from "@/lib/settings-schema";
import { effortKeyOf, pickModel } from "@/lib/settings-layout";
import { catalogOf } from "@/lib/oc2-models-rules"; // unit VW125
import SettingsFields from "./SettingsFields";
import { SOURCE_BOOK, bookFileLabel, changedCount, globalValueText, historyValueText, labelBookError, pstText, sectionTitle, valueText } from "@/lib/book-settings-rules";

// Unit VW122 (plan P61, card P61.2). Owner words (Q-A 3:109.5, 2026-11-21): "I want to be able to set the config of each run, before pressing run button in `http://localhost:3000/monitor/etiqu1_full`".
// Owner pick Q-A 3:110.3 "Settings form on the book page"; rows 1 to 6, 9 and 11 of Q-A 3:112.3 (owner pick "Accept all rows").
// The form is built from the same schema as the global panel (FIELDS, GROUPS and the value checks of lib/settings-schema.ts), so it has the same 7 groups and the same checks.
// The global form (components/RunSettingsForm.tsx) stays as it is.
// Edit model (unit default): an edit puts the key into the draft. "Use global" takes the key out of the draft. One "Save" writes the whole draft as the book file and one history line.
// A broken book file (row 11): the error line shows and the form keeps the file as it is. Save and "Use global" write nothing until the file is correct (reload after a fix).
// Unit VW123 (plan P63, Q-A 3:116.4 and 3:116.5, owner issue 2026-11-22 05:36 PST): the fields are drawn by components/SettingsFields.tsx, which the global panel shares.
// The model button with a search list and the Thinking menu replace the model select, the box "Other model ID" and the free effort box. The box wrote levels.2.model "" after a cleared box. No path writes an empty model now.
// The state, the checks, the save and the history of this page stay here and work as in VW122.

const button = "rounded border border-line bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";
const primary = button.replace("bg-white", "bg-accent text-white");
const small = button.replace("px-3 py-2", "px-2 py-1");

type Status = "" | "changed" | "edited" | "removing" | "new";
const STATUS_TEXT: Record<Exclude<Status, "">, string> = {
  changed: "changed for this book",
  edited: "changed for this book, unsaved edit",
  removing: "will use global after Save",
  new: "unsaved, will change for this book",
};

export default function BookSettingsForm({ slug, title, initialText }: { slug: string; title: string | null; initialText: string }) {
  const [saved, setSaved] = useState(() => parseSettingsJson(initialText) as BookSettingsSnapshot);
  const [draft, setDraft] = useState<FlatSettings>(() => (parseSettingsJson(initialText) as BookSettingsSnapshot).overrides);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Keys of effort fields that the last model pick reset to "default" (Q-A 3:116.4 row M6). The form shows "Effort reset to default for this model" next to them.
  const [resets, setResets] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // Unit VW125 (Q-A 3:118.2 rows 1 and 2): the list of all oc2 models. Null when the list file is missing or broken (the picker then shows the yaml models).
  const catalog = useMemo(() => catalogOf(saved.oc2), [saved.oc2]);
  const changes = diffSettings(saved.overrides, draft);
  const blocked = !!saved.error || !!saved.history_error || !!saved.global_error;
  const disabled = busy || blocked;
  const showFields = saved.effective.length > 0;
  const endpoint = `/api/monitor/books/${encodeURIComponent(slug)}/settings`;
  // The global value of a key: the merge view holds it (global file, else default, and no value for N with no saved N).
  const globalOf = (key: string): Scalar | undefined => saved.effective.find((r) => r.key === key)?.globalValue;

  function replace(next: BookSettingsSnapshot) { setSaved(next); setDraft(next.overrides); setErrors({}); setResets({}); }
  function setValue(f: Field, value: Scalar) {
    setDraft((prev) => ({ ...prev, [f.key]: value }));
    setNotice(null);
    setResets((p) => ({ ...p, [f.key]: false }));
    setErrors((prev) => { const next = { ...prev }; delete next[f.key]; return next; });
  }
  // Unit VW123 (row M5, M6): a pick of the model picker. An empty ID writes nothing. When the new model does not offer the current effort, the effort goes to "default".
  function setModel(f: Field, id: string, stored: string[]) {
    const effortKey = effortKeyOf(f.key);
    const effort = FIELDS.find((x) => x.key === effortKey);
    const result = pickModel(draft, f.key, id, (key) => (effort && key === effortKey ? valueOf(effort) : undefined), stored, catalog);
    if (!result.changed) return;
    setDraft(result.draft);
    setResets((p) => ({ ...p, [effortKey]: result.reset }));
    setNotice(null);
    setErrors((prev) => { const next = { ...prev }; delete next[f.key]; delete next[effortKey]; return next; });
  }
  function dropToGlobal(f: Field) {
    setDraft((prev) => { const next = { ...prev }; delete next[f.key]; return next; });
    setResets((p) => ({ ...p, [f.key]: false }));
    setErrors((p) => { const n = { ...p }; delete n[f.key]; return n; });
    setNotice(null);
  }
  function valueOf(f: Field): Scalar | undefined { return Object.hasOwn(draft, f.key) ? draft[f.key] : globalOf(f.key); }
  function checkField(f: Field) {
    if (!Object.hasOwn(draft, f.key)) return;
    const error = valueError(f.key, draft[f.key]);
    setErrors((prev) => ({ ...prev, [f.key]: error ? labelBookError(error, slug) : "" }));
  }
  function statusOf(f: Field): Status {
    const inSaved = Object.hasOwn(saved.overrides, f.key);
    const inDraft = Object.hasOwn(draft, f.key);
    if (inSaved && inDraft) return pythonJson(saved.overrides[f.key]) === pythonJson(draft[f.key]) ? "changed" : "edited";
    return inSaved ? "removing" : inDraft ? "new" : "";
  }
  async function reload() {
    setBusy(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const next = parseSettingsJson(await response.text()) as BookSettingsSnapshot & { error: string };
      if (!response.ok) throw new Error(next.error);
      replace(next);
      setNotice({ kind: "ok", text: "File reloaded. Unsaved changes were discarded." });
    } catch (e) { setNotice({ kind: "error", text: (e as Error).message }); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true);
    try {
      try { validateSettings(nestSettings(draft)); } catch (e) { throw new Error(labelBookError((e as Error).message, slug)); }
      const response = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: stringifySettingsJson({ sha1: saved.sha1, settings: nestSettings(draft) }) });
      const next = parseSettingsJson(await response.text()) as BookSettingsSnapshot & { saved?: boolean; error: string };
      if (!response.ok) throw new Error(next.error);
      replace(next);
      setNotice({ kind: "ok", text: "Saved. A running book reads the new values at its next page. Jobs, book jobs, and critic mode apply at the next list or book start." });
    } catch (e) { setNotice({ kind: "error", text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  // The models of a model field (row M7): the yaml models, plus the global value, the value of the book file and the value of the draft when they are missing there.
  // Unit VW125: with a catalog the pickers list the whole oc2 list, so the yaml models are not needed here. The default, the global value, the file value and the draft value stay, so a value outside the list shows "(current)".
  const modelList = (f: Field) => [...new Set([...(catalog ? [] : saved.models), ...[saved.defaults[f.key], globalOf(f.key), saved.overrides[f.key], draft[f.key]].filter((v): v is string => typeof v === "string" && v !== "")])];
  const statusBadge = (f: Field) => {
    const status = statusOf(f);
    return status === "" ? null : <><span data-changed-badge className="rounded bg-amber-100 px-2 text-sm text-amber-800">{STATUS_TEXT[status]}</span><span data-effect className="ml-2 text-sm text-muted">{effect(f.key)}</span></>;
  };
  const nextText = (f: Field, row: NonNullable<ReturnType<typeof rowOf>>) => <><span>{effect(f.key) === "Next page" ? "Next page uses" : "Next book start uses"}: {row.key === "update.N" && row.value == null ? "phase rule (no saved N)" : valueText(row.key, row.value)}</span> <span className={row.source === SOURCE_BOOK ? "font-semibold text-amber-800" : "text-muted"}>({row.source})</span></>;
  function rowOf(key: string) { return saved.effective.find((r) => r.key === key); }
  const globalButton = (f: Field) => Object.hasOwn(draft, f.key) ? <button type="button" data-use-global={f.key} aria-label={`Use global for ${f.label}`} className={small} disabled={disabled} onClick={() => dropToGlobal(f)}>Use global</button> : null;

  return <section data-part="book-settings" className="mx-auto mb-6 max-w-[1600px]">
    <details data-book-settings className="rounded border border-line bg-white">
      <summary data-book-settings-summary className="cursor-pointer px-3 py-2 text-sm font-semibold">{sectionTitle(changedCount(saved.overrides))}</summary>
      <div className="min-w-0 border-t border-line p-3 md:p-4">
        <p className="text-sm">{title ? <><strong>{title}</strong> </> : null}<code className="font-mono text-xs text-muted">{slug}</code></p>
        <p className="mt-1 text-sm text-muted">Set a value for this book only. The run reads the global Run settings first and then the book file on each page. A key that the book file does not hold follows the global value.</p>
        <p data-book-file className="mt-1 break-all text-xs text-muted">{bookFileLabel(slug)}: {saved.exists ? `revision ${String(saved.revision)}${saved.updated_utc ? ", " + pstText(saved.updated_utc) : ""}` : "not created yet. The run uses the global values."}</p>
        {saved.error && <div role="alert" data-book-settings-error className="my-3 rounded border border-line bg-red-50 p-3 text-sm text-red-700"><p className="break-words">{saved.error}</p><p>The form keeps the file as it is. Correct the file by hand, then reload. A run does not start until the file is correct.</p></div>}
        {saved.history_error && <div role="alert" data-book-history-error className="my-3 rounded border border-line bg-red-50 p-3 text-sm text-red-700"><p className="break-words">{saved.history_error}</p><p>Save is off until the history file is correct.</p></div>}
        {saved.global_error && <div role="alert" data-book-global-error className="my-3 rounded border border-line bg-red-50 p-3 text-sm text-red-700"><p className="break-words">The global settings file has an error: {saved.global_error}</p><p>Save is off until the global file is correct, because the global values are unknown.</p></div>}
        {saved.n_rule_error && <div role="alert" className="my-3 rounded border border-line bg-red-50 p-3 text-sm text-red-700"><p className="break-words">N rule error: {saved.n_rule_error}</p><p>{N_RULE_STOP}</p></div>}
        <div className="my-3 flex flex-wrap items-center gap-3">
          <button type="button" className={button} disabled={busy} onClick={reload}>Reload file (discard changes)</button>
          {notice && <p role={notice.kind === "error" ? "alert" : "status"} data-book-settings-notice={notice.kind} className={"min-w-0 break-words text-sm " + (notice.kind === "error" ? "text-red-700" : "text-accent")}>{notice.text}</p>}
        </div>
        {showFields && <SettingsFields idPrefix="book-" nameTitle="Name of this setting in the book file" disabled={disabled} errors={errors} resets={resets} modelList={modelList} catalog={catalog} oc2={saved.oc2 ?? null} valueOf={valueOf} defaults={saved.defaults}
          status={statusOf} badge={statusBadge} headingPrefix="book-heading-" sectionPrefix="book-group-" nPlaceholder="Phase rule (no saved N)"
          nRule={<p>{saved.n_rule ?? <span className="text-red-700">{saved.n_rule_error}</span>} A saved N of this book wins over the phase rule and over the global N, for this book only.</p>}
          onValue={setValue} onPickModel={setModel} onEmptyN={dropToGlobal} onCheck={checkField}
          footer={(f) => { const row = rowOf(f.key); return <>
            {row && <span data-global-value className="break-words text-muted">Global value: {globalValueText(row)}</span>}
            {row && <span data-next-value data-source={row.source} className="break-words">{nextText(f, row)}</span>}
            {globalButton(f)}
          </>; }}
          extraColumns={[
            { id: "global", header: "Global value", cell: (f) => { const row = rowOf(f.key); return row ? <span data-global-value className="text-muted">{globalValueText(row)}</span> : null; } },
            { id: "state", header: "State", cell: (f) => { const row = rowOf(f.key); return <>{statusBadge(f)}{row && <span data-next-value data-source={row.source} className="block text-xs">{nextText(f, row)}</span>}</>; } },
            { id: "use", header: "Use global", cell: globalButton },
          ]} />}
        {/* pr-16: the round tool icon of the Monitor dashboard sits at the bottom right and must not cover the Save button. */}
        <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white py-3 pr-16">
          <p aria-live="polite" data-unsaved>{changes.length} unsaved {changes.length === 1 ? "change" : "changes"}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} disabled={busy || !changes.length} onClick={() => { setDraft(saved.overrides); setErrors({}); setResets({}); setNotice(null); }}>Discard changes</button>
            <button type="button" data-save className={primary} disabled={disabled || !changes.length || Object.values(errors).some(Boolean)} onClick={save}>Save</button>
          </div>
        </div>
        <div data-book-history className="mt-4 border-t border-line pt-4"><h3 className="text-base font-semibold">Saves of this book</h3><p className="my-1 text-sm text-muted">Newest first. The last 20 saves of {bookFileLabel(slug)}. Times are PST.</p>
          {!saved.history.length ? <p className="text-sm">No save yet.</p> : <ol className="divide-y divide-line">{saved.history.map((h) => <li key={h.sha1_after} data-history-row className="py-3 text-sm"><p className="font-semibold">Revision {String(h.revision)} · {pstText(h.utc)}</p><ul className="mt-1 space-y-1">{h.changes.map((c) => <li key={c.key} className="break-words" title={c.key}>{FIELDS.find((f) => f.key === c.key)?.label ?? c.key}: {historyValueText(c.key, c.old, c.old_present)} → {historyValueText(c.key, c.new, c.new_present)} <span className="text-xs text-muted">({c.effect})</span></li>)}</ul></li>)}</ol>}
        </div>
      </div>
    </details>
  </section>;
}
