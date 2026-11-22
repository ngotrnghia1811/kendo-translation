"use client";
import { useState } from "react";
import type { BookSettingsSnapshot } from "@/lib/book-settings";
import { parseSettingsJson, pythonJson, stringifySettingsJson } from "@/lib/settings-json";
import { modelOptionText, optionText } from "@/lib/readable-names";
import { FIELDS, GROUPS, MODEL_WARNING, N_RULE_STOP, diffSettings, effect, nestSettings, validateSettings, valueError, type Field, type FlatSettings, type Scalar } from "@/lib/settings-schema";
import { SOURCE_BOOK, bookFileLabel, changedCount, globalValueText, historyValueText, labelBookError, pstText, sectionTitle, valueText } from "@/lib/book-settings-rules";

// Unit VW122 (plan P61, card P61.2). Owner words (Q-A 3:109.5, 2026-11-21): "I want to be able to set the config of each run, before pressing run button in `http://localhost:3000/monitor/etiqu1_full`".
// Owner pick Q-A 3:110.3 "Settings form on the book page"; rows 1 to 6, 9 and 11 of Q-A 3:112.3 (owner pick "Accept all rows").
// The form is built from the same schema as the global panel (FIELDS, GROUPS and the value checks of lib/settings-schema.ts), so it has the same 7 groups and the same checks.
// The global form (components/RunSettingsForm.tsx) stays as it is.
// Edit model (unit default): an edit puts the key into the draft. "Use global" takes the key out of the draft. One "Save" writes the whole draft as the book file and one history line.
// A broken book file (row 11): the error line shows and the form keeps the file as it is. Save and "Use global" write nothing until the file is correct (reload after a fix).

const control = "w-full rounded border border-line bg-white px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const button = "rounded border border-line bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";
const primary = button.replace("bg-white", "bg-accent text-white");

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
  const [other, setOther] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const changes = diffSettings(saved.overrides, draft);
  const blocked = !!saved.error || !!saved.history_error || !!saved.global_error;
  const disabled = busy || blocked;
  const showFields = saved.effective.length > 0;
  const endpoint = `/api/monitor/books/${encodeURIComponent(slug)}/settings`;
  // The global value of a key: the merge view holds it (global file, else default, and no value for N with no saved N).
  const globalOf = (key: string): Scalar | undefined => saved.effective.find((r) => r.key === key)?.globalValue;

  function replace(next: BookSettingsSnapshot) { setSaved(next); setDraft(next.overrides); setErrors({}); setOther({}); }
  function setValue(f: Field, value: Scalar) {
    setDraft((prev) => ({ ...prev, [f.key]: value }));
    setNotice(null);
    setErrors((prev) => { const next = { ...prev }; delete next[f.key]; return next; });
  }
  function dropToGlobal(f: Field) {
    setDraft((prev) => { const next = { ...prev }; delete next[f.key]; return next; });
    setOther((p) => ({ ...p, [f.key]: false }));
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

  function input(f: Field) {
    const value = valueOf(f);
    const props = { id: "book-" + f.key, disabled, onBlur: () => checkField(f), "aria-describedby": `book-${f.key}-help book-${f.key}-error`, "aria-invalid": !!errors[f.key], className: control };
    if (f.kind === "boolean" || f.kind === "mode") return <select {...props} value={String(value)} onChange={(e) => setValue(f, f.kind === "boolean" ? e.target.value === "true" : e.target.value)}>{(f.kind === "boolean" ? ["true", "false"] : ["separate", "session"]).map((v) => <option key={v} value={v}>{optionText(f.key, v)}</option>)}</select>;
    if (f.kind === "model") {
      // A value that is in use already (the global value, or the value saved in the book file) is a normal option, even when the yaml list lacks it.
      // Only a new ID that you type ("Other…") gets the warning of the global panel. Unit VW122: the field of a book that follows a global ID such as xai/grok-4.7 shows no warning.
      const known = [...new Set([...saved.models, ...[globalOf(f.key), saved.overrides[f.key]].filter((v): v is string => typeof v === "string" && v !== "")])];
      const custom = other[f.key] || !known.includes(String(value));
      return <div className="space-y-2"><select {...props} value={custom ? "__other" : String(value)} onChange={(e) => { const c = e.target.value === "__other"; setOther((p) => ({ ...p, [f.key]: c })); if (!c) setValue(f, e.target.value); }}>
        {known.map((m) => <option key={m} value={m} title={`Model ID: ${m}`}>{modelOptionText(m)}</option>)}<option value="__other">Other…</option>
      </select>{custom && <><label htmlFor={"book-" + f.key + "-other"} className="block text-sm">Other model ID</label><input {...props} id={"book-" + f.key + "-other"} value={String(value ?? "")} onChange={(e) => setValue(f, e.target.value)} /><p className="text-sm text-amber-800">{MODEL_WARNING}</p></>}</div>;
    }
    if (f.kind === "variant") return <><input {...props} list={"book-" + f.key + "-efforts"} value={String(value ?? "")} onChange={(e) => setValue(f, e.target.value)} /><datalist id={"book-" + f.key + "-efforts"}>{saved.variants.map((v) => <option key={v} value={v} />)}</datalist></>;
    return <input {...props} type="number" min={f.min} max={f.max} step="1" placeholder={f.key === "update.N" ? "Phase rule (no saved N)" : undefined} value={value === undefined || value === null ? "" : String(value)} onChange={(e) => {
      const text = e.target.value;
      // An empty N field means "no N for this book": the key leaves the draft (the global N or the phase rule applies).
      if (f.key === "update.N" && text === "") { dropToGlobal(f); return; }
      try { setValue(f, text === "" ? "" : parseSettingsJson(text) as Scalar); }
      catch { setValue(f, text); }
    }} />;
  }

  return <section data-part="book-settings" className="mb-6">
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
        {showFields && <div className="min-w-0 space-y-6">
          {GROUPS.map((g, i) => <section key={g} aria-labelledby={`book-heading-${i}`} className="border-t border-line pt-4">
            <h3 id={`book-heading-${i}`} className="text-base font-semibold">{i + 1}. {g}</h3>
            {i === 0 && <p className="mt-1 max-w-prose text-sm">{saved.n_rule ?? <span className="text-red-700">{saved.n_rule_error}</span>} A saved N of this book wins over the phase rule and over the global N, for this book only.</p>}
            {FIELDS.filter((f) => f.group === i).map((f) => {
              const row = saved.effective.find((r) => r.key === f.key);
              const status = statusOf(f);
              return <div key={f.key} data-field={f.key} data-field-status={status} className="mt-4 min-w-0 rounded border border-line bg-white p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <label htmlFor={"book-" + f.key} className="font-semibold">{f.label}</label>
                  {status !== "" && <span data-changed-badge className="rounded bg-amber-100 px-2 text-sm text-amber-800">{STATUS_TEXT[status]}</span>}
                  {status !== "" && <span data-effect className="text-sm text-muted">{effect(f.key)}</span>}
                </div>
                <p className="mt-1 text-sm text-muted">{f.meaning}</p><p className="mt-1 break-all text-xs text-muted" title="Name of this setting in the book file">{f.key}</p>
                <div className="my-3 max-w-xl">{input(f)}</div>
                <p id={`book-${f.key}-help`} className="text-sm text-muted">{f.allowed}. Unit: {f.unit}. Takes effect: {effect(f.key).toLowerCase()}.</p>
                <p id={`book-${f.key}-error`} role={errors[f.key] ? "alert" : undefined} className="mt-2 break-words text-sm text-red-700">{errors[f.key]}</p>
                {row && <p data-global-value className="mt-1 break-words text-sm text-muted">Global value: {globalValueText(row)}</p>}
                {row && <p data-next-value data-source={row.source} className="mt-1 break-words text-sm">{effect(f.key) === "Next page" ? "Next page uses" : "Next book start uses"}: {row.key === "update.N" && row.value == null ? "phase rule (no saved N)" : valueText(row.key, row.value)} <span className={row.source === SOURCE_BOOK ? "font-semibold text-amber-800" : "text-muted"}>({row.source})</span></p>}
                {Object.hasOwn(draft, f.key) && <div className="mt-3"><button type="button" data-use-global={f.key} className={button} disabled={disabled} onClick={() => dropToGlobal(f)}>Use global</button></div>}
              </div>;
            })}
          </section>)}
        </div>}
        {/* pr-16: the round tool icon of the Monitor dashboard sits at the bottom right and must not cover the Save button. */}
        <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white py-3 pr-16">
          <p aria-live="polite" data-unsaved>{changes.length} unsaved {changes.length === 1 ? "change" : "changes"}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} disabled={busy || !changes.length} onClick={() => { setDraft(saved.overrides); setErrors({}); setOther({}); setNotice(null); }}>Discard changes</button>
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
