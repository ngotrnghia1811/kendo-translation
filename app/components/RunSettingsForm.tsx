"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { SettingsSnapshot, ActiveBook } from "@/lib/settings-run";
import { parseSettingsJson, pythonJson, stringifySettingsJson } from "@/lib/settings-json";
import { bookKeyLabel, optionText } from "@/lib/readable-names";
import { FIELDS, GROUPS, N_RULE_STOP, OLD_N, diffSettings, nestSettings, showValue, validateSettings, valueError, type FlatSettings, type Field, type Scalar } from "@/lib/settings-schema";
import { effortKeyOf, pickModel } from "@/lib/settings-layout";
import { catalogOf } from "@/lib/oc2-models-rules"; // unit VW125
import SettingsFields from "./SettingsFields";

const button = "rounded border border-line bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";
const primary = button.replace("bg-white", "bg-accent text-white");
const small = button.replace("px-3 py-2", "px-2 py-1");
function pst(utc: string) {
  const date = new Date(Date.parse(utc) - 8 * 3600_000);
  return Number.isNaN(date.getTime()) ? "Time unreadable" : date.toISOString().slice(0, 19).replace("T", " ") + " PST (UTC-8)";
}
// Unit VW96 (round 91), card P31.3, owner rule Q-A 3:17.4: a book key, a page ID, a model option and a mode show in plain words. The raw key or ID stays in small grey text or in the hover.
function valueText(key: string, v: Scalar | undefined) { return typeof v === "string" || typeof v === "boolean" ? optionText(key, String(v)) : showValue(v, key); }
function PageName({ id, labels }: { id: string; labels: Record<string, string> }) { return <><strong title={id}>{labels[id] ?? id}</strong> <span className="font-mono text-xs text-muted">{id}</span></>; }
function ActiveBooks({ active, labels, bookLabels }: { active: ActiveBook[]; labels: Record<string, string>; bookLabels: Record<string, string> }) {
  return <div className="space-y-1">
    {!active.length && <p>No active run exists.</p>}
    {active.map((a) => <p key={a.book}><strong title={`Book key: ${a.book}`}>{bookKeyLabel(a.book, bookLabels)}</strong> runs now{a.page ? <> at <PageName id={a.page} labels={labels} /></> : ". No current page is stored"}. It reads new values at the start of {a.next && a.next !== a.page ? <><PageName id={a.next} labels={labels} /></> : "the next page"}.{a.n !== null && <> Current page N: {a.n}.</>}</p>)}
    <p>{OLD_N}</p>
    <p>Jobs, book jobs, and critic mode apply at the next list or book start.</p>
  </div>;
}

function Review({ changes, active, labels, bookLabels, busy, cancel, save }: { changes: ReturnType<typeof diffSettings>; active: ActiveBook[]; labels: Record<string, string>; bookLabels: Record<string, string>; busy: boolean; cancel: () => void; save: () => void }) {
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
    <ActiveBooks active={active} labels={labels} bookLabels={bookLabels} />
    <p className="my-4">The file changes on this Mac only. Reset prepares defaults for a later save. Reset for N removes its override.</p>
    <div className="flex justify-end gap-3"><button ref={cancelButton} className={button} disabled={busy} onClick={cancel}>Cancel</button><button className={primary} disabled={busy} onClick={save}>{busy ? "Save in progress" : `Save ${changes.length} changes`}</button></div>
  </dialog>;
}

export default function RunSettingsForm({ initialText, pageLabels = {}, bookLabels = {} }: { initialText: string; pageLabels?: Record<string, string>; bookLabels?: Record<string, string> }) {
  const [saved, setSaved] = useState(() => parseSettingsJson(initialText) as SettingsSnapshot);
  const [draft, setDraft] = useState<FlatSettings>(() => (parseSettingsJson(initialText) as SettingsSnapshot).overrides);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Unit VW123 (Q-A 3:116.4 row M6): keys of effort fields that the last model pick reset to "default". The panel shows "Effort reset to default for this model" next to them.
  const [resets, setResets] = useState<Record<string, boolean>>({});
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  // Unit VW125 (Q-A 3:118.2 rows 1 and 2): the list of all oc2 models. Null when the list file is missing or broken (the picker then shows the yaml models). A reload or a save brings a fresh list.
  const catalog = useMemo(() => catalogOf(saved.oc2), [saved.oc2]);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const changes = diffSettings(saved.overrides, draft);
  const changed = new Set(changes.map((c) => c.key));
  const disabled = busy || !!saved.error;
  function replace(next: SettingsSnapshot) { setSaved(next); setDraft(next.overrides); setErrors({}); setResets({}); }
  function closeReview() { setReview(false); reviewButton.current?.focus(); }
  function setValue(f: Field, value: Scalar) {
    setDraft((prev) => ({ ...prev, [f.key]: value }));
    setNotice("");
    setResets((p) => ({ ...p, [f.key]: false }));
    setErrors((prev) => { const next = { ...prev }; delete next[f.key]; return next; });
  }
  // Unit VW123 (rows M5, M6): a pick of the model picker. An empty ID writes nothing. When the new model does not offer the current effort, the effort goes to "default".
  function setModel(f: Field, id: string, stored: string[]) {
    const effortKey = effortKeyOf(f.key);
    const effort = FIELDS.find((x) => x.key === effortKey);
    const result = pickModel(draft, f.key, id, (key) => (effort && key === effortKey ? valueOf(effort) : undefined), stored, catalog);
    if (!result.changed) return;
    setDraft(result.draft);
    setResets((p) => ({ ...p, [effortKey]: result.reset }));
    setNotice("");
    setErrors((prev) => { const next = { ...prev }; delete next[f.key]; delete next[effortKey]; return next; });
  }
  function reset(f: Field) {
    setDraft((prev) => { const next = { ...prev }; if (f.key === "update.N") delete next[f.key]; else next[f.key] = saved.defaults[f.key]; return next; });
    setResets((p) => ({ ...p, [f.key]: false }));
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
  // The models of a model field (row M7): the yaml models, plus the value of the settings file and the value of the draft when they are missing there.
  // Unit VW125: with a catalog the pickers list the whole oc2 list, so the yaml models are not needed here. The default, the file value and the draft value stay, so a value outside the list shows "(current)".
  const modelList = (f: Field) => [...new Set([...(catalog ? [] : saved.models), ...[saved.defaults[f.key], saved.overrides[f.key], draft[f.key]].filter((v): v is string => typeof v === "string" && v !== "")])];
  const badge = (f: Field) => changed.has(f.key) ? <span className="rounded bg-amber-100 px-2 text-sm text-amber-800">Changed</span> : Object.hasOwn(saved.overrides, f.key) && (f.key === "update.N" || pythonJson(saved.overrides[f.key]) !== pythonJson(saved.defaults[f.key])) ? <span className="rounded bg-stone-100 px-2 text-sm text-stone-600">Not default</span> : null;
  const defaultText = (f: Field) => f.key === "update.N" ? "phase rule (no override)" : valueText(f.key, saved.defaults[f.key]);
  return <main className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
    <p className="mb-2 text-sm text-muted"><Link href="/" className="text-accent underline">Monitor dashboard / on this Mac</Link> / Run settings</p>
    <h1 className="text-3xl font-semibold">Run settings</h1>
    <div className="my-5 border-y border-line py-4 text-sm"><ActiveBooks active={saved.active} labels={pageLabels} bookLabels={bookLabels} /></div>
    <p className="text-sm text-muted">translator-settings.json: {saved.exists ? `revision ${saved.revision}${saved.updated_utc ? ", " + pst(saved.updated_utc) : ""}` : "not created yet. The Translator uses its defaults and phase rule."}</p>
    {saved.error && <div role="alert" className="my-4 rounded border border-line bg-red-50 p-4 text-red-700"><p>{saved.error}</p><p>The file cannot be saved here. Correct the file by hand, then reload. Unknown keys must be removed by hand.</p></div>}
    {saved.n_rule_error && <div role="alert" className="my-4 rounded border border-line bg-red-50 p-4 text-red-700"><p>N rule error: {saved.n_rule_error}</p><p>{N_RULE_STOP}</p>{!saved.error && <p>This error does not block a save of translator-settings.json.</p>}</div>}
    <button className={button + " my-4"} disabled={busy} onClick={reload}>Reload file (discard changes)</button>
    {notice && <p role="status" className="my-3 break-words text-accent">{notice}</p>}
    <div className="mt-3 grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)]">
      <aside><nav aria-label="Settings groups" className="flex flex-wrap gap-2 md:sticky md:top-4 md:flex-col md:gap-1">{GROUPS.map((g, i) => <a key={g} href={`#group-${i}`} className="rounded px-2 py-2 text-sm text-accent underline focus-visible:outline-2 focus-visible:outline-accent">{i + 1}. {g}</a>)}<a href="#change-history" className="px-2 py-2 text-sm text-accent underline">Change history</a></nav></aside>
      <div className="min-w-0 space-y-10 pb-6">
        <SettingsFields idPrefix="" nameTitle="Name of this setting in translator-settings.json" disabled={disabled} errors={errors} resets={resets} modelList={modelList} catalog={catalog} oc2={saved.oc2 ?? null} valueOf={valueOf} defaults={saved.defaults}
          status={(f) => changed.has(f.key) ? "changed" : ""} badge={badge} headingPrefix="heading-" sectionPrefix="group-" nPlaceholder="Phase rule (no override)"
          nRule={<p>{saved.n_rule ?? <span className="text-red-700">{saved.n_rule_error}</span>} Reset removes update.N{saved.defaults["update.N"] === undefined ? "" : ` instead of saving ${showValue(saved.defaults["update.N"])}`}.</p>}
          onValue={setValue} onPickModel={setModel} onEmptyN={(f) => { setDraft((p) => { const n = { ...p }; delete n[f.key]; return n; }); setErrors((p) => { const n = { ...p }; delete n[f.key]; return n; }); setNotice(""); }} onCheck={checkField}
          footer={(f) => <><span className="break-words">Default: {defaultText(f)}</span><button type="button" className={small} disabled={disabled} onClick={() => reset(f)}>Reset {f.label}</button></>}
          extraColumns={[{ id: "state", header: "State", cell: (f) => <>{badge(f)}<span className="block text-xs text-muted">Default: {defaultText(f)}</span><button type="button" className={small} disabled={disabled} onClick={() => reset(f)}>Reset {f.label}</button></> }]} />
        <section id="change-history" className="scroll-mt-6 border-t border-line pt-5"><h2 className="section-band text-xl font-semibold">Change history</h2><p className="my-2 text-sm text-muted">Last 20 saves. <a className="text-accent underline" href="/api/settings/run?history=1">Download the full history file</a></p>
          {!saved.history.length ? <p>No entry yet.</p> : <ol className="divide-y divide-line">{saved.history.map((h) => <li key={h.sha1_after} className="py-4 text-sm"><p className="font-semibold">Revision {String(h.revision)} · {pst(h.utc)}</p><ul className="mt-2 space-y-1">{h.changes.map((c) => <li key={c.key} className="break-words" title={c.key}>{FIELDS.find((f) => f.key === c.key)?.label ?? c.key}: {valueText(c.key, c.old_present ? c.old : undefined)} → {valueText(c.key, c.new_present ? c.new : undefined)} <span className="font-mono text-xs text-muted">{c.key}</span></li>)}</ul></li>)}</ol>}
        </section>
      </div>
    </div>
    <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white py-4">
      <p aria-live="polite">{changes.length} unsaved changes</p>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={disabled} onClick={() => { const next = { ...saved.defaults }; delete next["update.N"]; setDraft(next); setErrors({}); setResets({}); }}>Reset all</button><button className={button} disabled={busy || !changes.length} onClick={() => { setDraft(saved.overrides); setErrors({}); setResets({}); setNotice(""); }}>Discard</button><button ref={reviewButton} className={primary} disabled={disabled || !changes.length || Object.values(errors).some(Boolean)} onClick={prepareReview}>Review changes</button></div>
    </div>
    {review && <Review changes={changes} active={saved.active} labels={pageLabels} bookLabels={bookLabels} busy={busy} cancel={closeReview} save={save} />}
  </main>;
}
