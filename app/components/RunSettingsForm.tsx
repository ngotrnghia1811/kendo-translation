"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SettingsSnapshot, ActiveBook } from "@/lib/settings-run";
import { parseSettingsJson, pythonJson, stringifySettingsJson } from "@/lib/settings-json";
import { bookKeyLabel, modelOptionText, optionText } from "@/lib/readable-names";
import { FIELDS, GROUPS, N_RULE_STOP, OLD_N, MODEL_WARNING, diffSettings, effect, nestSettings, showValue, validateSettings, valueError, type FlatSettings, type Field, type Scalar } from "@/lib/settings-schema";

const control = "w-full rounded border border-line bg-white px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const button = "rounded border border-line bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";
const primary = button.replace("bg-white", "bg-accent text-white");
function pst(utc: string) {
  const date = new Date(Date.parse(utc) - 8 * 3600_000);
  return Number.isNaN(date.getTime()) ? "Time unreadable" : date.toISOString().slice(0, 19).replace("T", " ") + " PST (UTC-8)";
}
// Unit VW96 (round 91), card P31.3, owner rule Q-A 3:17.4: a book key, a page ID, a model option and a mode show in plain words. The raw key or ID stays in small grey text or in the hover.
function valueText(key: string, v: Scalar | undefined) { return typeof v === "string" || typeof v === "boolean" ? optionText(key, String(v)) : showValue(v, key); }
function PageName({ id, labels }: { id: string; labels: Record<string, string> }) { return <><strong title={id}>{labels[id] ?? id}</strong> <span className="font-mono text-xs text-muted">{id}</span></>; }
function ActiveBooks({ active, labels }: { active: ActiveBook[]; labels: Record<string, string> }) {
  return <div className="space-y-1">
    {!active.length && <p>No active run exists.</p>}
    {active.map((a) => <p key={a.book}><strong title={`Book key: ${a.book}`}>{bookKeyLabel(a.book)}</strong> runs now{a.page ? <> at <PageName id={a.page} labels={labels} /></> : ". No current page is stored"}. It reads new values at the start of {a.next && a.next !== a.page ? <><PageName id={a.next} labels={labels} /></> : "the next page"}.{a.n !== null && <> Current page N: {a.n}.</>}</p>)}
    <p>{OLD_N}</p>
    <p>Jobs, book jobs, and critic mode apply at the next list or book start.</p>
  </div>;
}

function Review({ changes, active, labels, busy, cancel, save }: { changes: ReturnType<typeof diffSettings>; active: ActiveBook[]; labels: Record<string, string>; busy: boolean; cancel: () => void; save: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { dialog.current?.showModal(); cancelButton.current?.focus(); }, []);
  return <dialog ref={dialog} aria-labelledby="review-heading" onCancel={(e) => { e.preventDefault(); if (!busy) cancel(); }} className="m-auto max-h-[85vh] w-[min(42rem,95vw)] overflow-y-auto rounded border border-line bg-white p-6 text-foreground backdrop:bg-black/50">
    <h2 id="review-heading" className="text-xl font-semibold">Save {changes.length} changes to translator-settings.json?</h2>
    <ul className="my-5 space-y-3">{changes.map((c) => <li key={c.key} className="border-b border-line pb-3">
      <p className="font-semibold">{FIELDS.find((f) => f.key === c.key)?.label}</p>
      <p className="break-words">{valueText(c.key, c.old_present ? c.old : undefined)} → {valueText(c.key, c.new_present ? c.new : undefined)}</p>
      <p className="text-sm text-muted">{c.effect}</p>
    </li>)}</ul>
    <p className="mb-3">“Next page” means the start of the next page of each book.</p>
    <ActiveBooks active={active} labels={labels} />
    <p className="my-4">The file changes on this Mac only. Reset prepares defaults for a later save. Reset for N removes its override.</p>
    <div className="flex justify-end gap-3"><button ref={cancelButton} className={button} disabled={busy} onClick={cancel}>Cancel</button><button className={primary} disabled={busy} onClick={save}>{busy ? "Save in progress" : `Save ${changes.length} changes`}</button></div>
  </dialog>;
}

export default function RunSettingsForm({ initialText, pageLabels = {} }: { initialText: string; pageLabels?: Record<string, string> }) {
  const [saved, setSaved] = useState(() => parseSettingsJson(initialText) as SettingsSnapshot);
  const [draft, setDraft] = useState<FlatSettings>(() => (parseSettingsJson(initialText) as SettingsSnapshot).overrides);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [other, setOther] = useState<Record<string, boolean>>({});
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const reviewButton = useRef<HTMLButtonElement>(null);
  const changes = diffSettings(saved.overrides, draft);
  const changed = new Set(changes.map((c) => c.key));
  const disabled = busy || !!saved.error;
  function replace(next: SettingsSnapshot) { setSaved(next); setDraft(next.overrides); setErrors({}); setOther({}); }
  function closeReview() { setReview(false); reviewButton.current?.focus(); }
  function setValue(f: Field, value: Scalar) {
    setDraft((prev) => ({ ...prev, [f.key]: value }));
    setNotice("");
    setErrors((prev) => { const next = { ...prev }; delete next[f.key]; return next; });
  }
  function reset(f: Field) {
    setDraft((prev) => { const next = { ...prev }; if (f.key === "update.N") delete next[f.key]; else next[f.key] = saved.defaults[f.key]; return next; });
    setOther((p) => ({ ...p, [f.key]: false }));
    setErrors((p) => { const n = { ...p }; delete n[f.key]; return n; });
    setNotice("");
  }
  function valueOf(f: Field) { return Object.hasOwn(draft, f.key) ? draft[f.key] : f.key === "update.N" ? undefined : saved.defaults[f.key]; }
  function checkField(f: Field) {
    const value = valueOf(f);
    const error = value === undefined && f.key === "update.N" ? null : valueError(f.key, value);
    setErrors((prev) => ({ ...prev, [f.key]: error ?? "" }));
  }
  function prepareReview() {
    try { validateSettings(nestSettings(draft)); setReview(true); }
    catch (e) { setNotice((e as Error).message); }
  }
  async function reload() {
    setBusy(true);
    try { const response = await fetch("/api/settings/run", { cache: "no-store" }); const next = parseSettingsJson(await response.text()) as SettingsSnapshot & { error: string }; if (!response.ok) throw new Error(next.error); replace(next); setNotice("File reloaded. Unsaved changes were discarded."); }
    catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true);
    try {
      validateSettings(nestSettings(draft));
      const response = await fetch("/api/settings/run", { method: "PUT", headers: { "Content-Type": "application/json" }, body: stringifySettingsJson({ sha1: saved.sha1, settings: nestSettings(draft) }) });
      const next = parseSettingsJson(await response.text()) as SettingsSnapshot & { saved?: boolean; error: string };
      if (!response.ok) { if (next.saved) { setSaved((s) => ({ ...s, error: next.error })); } throw new Error(next.error); }
      replace(next); setNotice("Changes saved. Other values apply at the next page. Jobs, book jobs, and critic mode apply at the next list or book start.");
    } catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); closeReview(); }
  }
  function input(f: Field) {
    const value = valueOf(f);
    const props = { id: f.key, disabled, onBlur: () => checkField(f), "aria-describedby": f.key + "-help " + f.key + "-error", "aria-invalid": !!errors[f.key], className: control };
    if (f.kind === "boolean" || f.kind === "mode") return <select {...props} value={String(value)} onChange={(e) => setValue(f, f.kind === "boolean" ? e.target.value === "true" : e.target.value)}>{(f.kind === "boolean" ? ["true", "false"] : ["separate", "session"]).map((v) => <option key={v} value={v}>{optionText(f.key, v)}</option>)}</select>;
    if (f.kind === "model") {
      const custom = other[f.key] || !saved.models.includes(String(value));
      return <div className="space-y-2"><select {...props} value={custom ? "__other" : String(value)} onChange={(e) => { const custom = e.target.value === "__other"; setOther((p) => ({ ...p, [f.key]: custom })); if (!custom) setValue(f, e.target.value); }}>
        {saved.models.map((m) => <option key={m} value={m} title={`Model ID: ${m}`}>{modelOptionText(m)}</option>)}<option value="__other">Other…</option>
      </select>{custom && <><label htmlFor={f.key + "-other"} className="block text-sm">Other model ID</label><input {...props} id={f.key + "-other"} value={String(value ?? "")} onChange={(e) => setValue(f, e.target.value)} /><p className="text-sm text-amber-800">{MODEL_WARNING}</p></>}</div>;
    }
    if (f.kind === "variant") return <><input {...props} list={f.key + "-efforts"} value={String(value ?? "")} onChange={(e) => setValue(f, e.target.value)} /><datalist id={f.key + "-efforts"}>{saved.variants.map((v) => <option key={v} value={v} />)}</datalist></>;
    return <input {...props} type="number" min={f.min} max={f.max} step={f.kind === "cost" ? "any" : "1"} placeholder={f.key === "update.N" ? "Phase rule (no override)" : f.kind === "cost" ? "No limit" : undefined} value={value === undefined || value === null ? "" : String(value)} onChange={(e) => {
      const text = e.target.value;
      if (f.key === "update.N" && text === "") { setDraft((p) => { const n = { ...p }; delete n[f.key]; return n; }); setErrors((p) => { const n = { ...p }; delete n[f.key]; return n; }); setNotice(""); return; }
      try { setValue(f, text === "" ? f.kind === "cost" ? null : "" : parseSettingsJson(text) as Scalar); }
      catch { setValue(f, text); }
    }} />;
  }
  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
    <p className="mb-2 text-sm text-muted"><Link href="/" className="text-accent underline">Monitor dashboard / on this Mac</Link> / Run settings</p>
    <h1 className="text-3xl font-semibold">Run settings</h1>
    <div className="my-5 border-y border-line py-4 text-sm"><ActiveBooks active={saved.active} labels={pageLabels} /></div>
    <p className="text-sm text-muted">translator-settings.json: {saved.exists ? `revision ${saved.revision}${saved.updated_utc ? ", " + pst(saved.updated_utc) : ""}` : "not created yet. The Translator uses its defaults and phase rule."}</p>
    {saved.error && <div role="alert" className="my-4 rounded border border-line bg-red-50 p-4 text-red-700"><p>{saved.error}</p><p>The file cannot be saved here. Correct the file by hand, then reload. Unknown keys must be removed by hand.</p></div>}
    {saved.n_rule_error && <div role="alert" className="my-4 rounded border border-line bg-red-50 p-4 text-red-700"><p>N rule error: {saved.n_rule_error}</p><p>{N_RULE_STOP}</p>{!saved.error && <p>This error does not block a save of translator-settings.json.</p>}</div>}
    <button className={button + " my-4"} disabled={busy} onClick={reload}>Reload file (discard changes)</button>
    {notice && <p role="status" className="my-3 break-words text-accent">{notice}</p>}
    <div className="mt-3 grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)]">
      <aside><nav aria-label="Settings groups" className="flex flex-wrap gap-2 md:sticky md:top-4 md:flex-col md:gap-1">{GROUPS.map((g, i) => <a key={g} href={`#group-${i}`} className="rounded px-2 py-2 text-sm text-accent underline focus-visible:outline-2 focus-visible:outline-accent">{i + 1}. {g}</a>)}<a href="#change-history" className="px-2 py-2 text-sm text-accent underline">Change history</a></nav></aside>
      <div className="min-w-0 space-y-10 pb-6">
        {GROUPS.map((g, i) => <section key={g} id={`group-${i}`} aria-labelledby={`heading-${i}`} className="scroll-mt-6 border-t border-line pt-5">
          <h2 id={`heading-${i}`} className="text-xl font-semibold">{i + 1}. {g}</h2>
          {i === 0 && <p className="mt-2 max-w-prose text-sm">{saved.n_rule ?? <span className="text-red-700">{saved.n_rule_error}</span>} Reset removes update.N{saved.defaults["update.N"] === undefined ? "" : ` instead of saving ${showValue(saved.defaults["update.N"])}`}.</p>}
          {FIELDS.filter((f) => f.group === i).map((f) => <div key={f.key} className="mt-6 rounded border border-line bg-white p-4">
            <div className="flex flex-wrap items-baseline gap-2"><label htmlFor={f.key} className="font-semibold">{f.label}</label>{changed.has(f.key) ? <span className="rounded bg-amber-100 px-2 text-sm text-amber-800">Changed</span> : Object.hasOwn(saved.overrides, f.key) && (f.key === "update.N" || pythonJson(saved.overrides[f.key]) !== pythonJson(saved.defaults[f.key])) ? <span className="rounded bg-stone-100 px-2 text-sm text-stone-600">Not default</span> : null}</div>
            <p className="mt-1 text-sm text-muted">{f.meaning}</p><p className="mt-1 break-all text-xs text-muted" title="Name of this setting in translator-settings.json">{f.key}</p>
            <div className="my-3 max-w-xl">{input(f)}</div>
            <p id={f.key + "-help"} className="text-sm text-muted">{f.allowed}. Unit: {f.unit}. Takes effect: {effect(f.key).toLowerCase()}.</p>
            <p id={f.key + "-error"} role={errors[f.key] ? "alert" : undefined} className="mt-2 text-sm text-red-700">{errors[f.key]}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><span className="break-words">Default: {f.key === "update.N" ? "phase rule (no override)" : valueText(f.key, saved.defaults[f.key])}</span><button className={button} disabled={disabled} onClick={() => reset(f)}>Reset {f.label}</button></div>
          </div>)}
        </section>)}
        <section id="change-history" className="scroll-mt-6 border-t border-line pt-5"><h2 className="text-xl font-semibold">Change history</h2><p className="my-2 text-sm text-muted">Last 20 saves. <a className="text-accent underline" href="/api/settings/run?history=1">Download the full history file</a></p>
          {!saved.history.length ? <p>No entry yet.</p> : <ol className="divide-y divide-line">{saved.history.map((h) => <li key={h.sha1_after} className="py-4 text-sm"><p className="font-semibold">Revision {String(h.revision)} · {pst(h.utc)}</p><ul className="mt-2 space-y-1">{h.changes.map((c) => <li key={c.key} className="break-words" title={c.key}>{FIELDS.find((f) => f.key === c.key)?.label ?? c.key}: {valueText(c.key, c.old_present ? c.old : undefined)} → {valueText(c.key, c.new_present ? c.new : undefined)} <span className="font-mono text-xs text-muted">{c.key}</span></li>)}</ul></li>)}</ol>}
        </section>
      </div>
    </div>
    <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white py-4">
      <p aria-live="polite">{changes.length} unsaved changes</p>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={disabled} onClick={() => { const next = { ...saved.defaults }; delete next["update.N"]; setDraft(next); setErrors({}); setOther({}); }}>Reset all</button><button className={button} disabled={busy || !changes.length} onClick={() => { setDraft(saved.overrides); setErrors({}); setOther({}); setNotice(""); }}>Discard</button><button ref={reviewButton} className={primary} disabled={disabled || !changes.length || Object.values(errors).some(Boolean)} onClick={prepareReview}>Review changes</button></div>
    </div>
    {review && <Review changes={changes} active={saved.active} labels={pageLabels} busy={busy} cancel={closeReview} save={save} />}
  </main>;
}
