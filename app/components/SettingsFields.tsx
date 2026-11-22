"use client";
// Unit VW123 (plan P63, card P63.1). Owner issue 2026-11-22 05:36 PST (visual issue 20261122-053656-5e78b9) and picks Q-A 3:116.4, 3:116.5 (rows M1 to M7, L1 to L6).
// The one shared part of the two Run settings pages: the form "Run settings of this book" on /monitor/<book> (components/BookSettingsForm.tsx)
// and the panel Run settings on /settings/run (components/RunSettingsForm.tsx). Each page keeps its own state, its checks and its save.
// This part draws the fields from FIELDS and GROUPS of lib/settings-schema.ts and from the layout data of lib/settings-layout.ts:
//   - one table for the 4 levels and one line for the box critic (model button, Thinking menu, and the columns that the page gives)
//   - one card for each other group, with the fields side by side (they stack in one column on a phone)
// Every field keeps its label, its short meaning, its error line, its help line and the compact line that the page gives (book page: Global value, Next page uses, Use global).
// Colors use the theme classes that the forms used before (border-line, bg-white, text-muted, text-accent, stone, amber, red), so all 5 themes stay readable.
import type { ReactNode } from "react";
import { parseSettingsJson } from "@/lib/settings-json";
import { optionText } from "@/lib/readable-names";
import { FIELDS, GROUPS, effect, type Field, type FlatSettings, type Scalar } from "@/lib/settings-schema";
import { BOX_GROUP, LEVEL_GROUP, boxCriticRow, cards, levelRows, storedEffortsFor, type Card, type PairRow } from "@/lib/settings-layout";
import { listLine, type Catalog, type Oc2Block } from "@/lib/oc2-models-rules"; // unit VW125
import ModelPicker from "./ModelPicker";
import ThinkingMenu from "./ThinkingMenu";

export const control = "w-full rounded border border-line bg-white px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** A column of the levels table that the page adds after Level, Model and Thinking. `cell` draws the content for ONE key. */
export type ExtraColumn = { id: string; header: string; cell: (f: Field) => ReactNode };

export type SettingsFieldsProps = {
  /** "book-" on the book page, "" on /settings/run. The ids of the controls and of their help and error lines start with it. */
  idPrefix: string;
  /** The hover text of the key name: where the setting is stored. */
  nameTitle: string;
  disabled: boolean;
  errors: Record<string, string>;
  /** Keys of effort fields that the last model pick reset to "default" (row M6). */
  resets: Record<string, boolean>;
  /** The models of a model field (row M7). With a catalog: the saved, draft, default and global values only (unit VW125). */
  modelList: (f: Field) => string[];
  /** Unit VW125 (Q-A 3:118.2): the checked list of oc2 for the pickers and the Thinking menus, or null when the list file is missing or broken. */
  catalog?: Catalog | null;
  /** Unit VW125 (row 4): the block of the snapshot. The levels table shows one line about it ("Model list from oc2, read <time> PST", or the note). */
  oc2?: Oc2Block | null;
  /** The value that counts now: the draft value, else the global value (book page) or the default (/settings/run). */
  valueOf: (f: Field) => Scalar | undefined;
  /** The settings that the files hold for each level, to find the efforts that are stored for a model. */
  defaults: FlatSettings;
  status: (f: Field) => string;
  badge: (f: Field) => ReactNode;
  footer: (f: Field) => ReactNode;
  extraColumns: ExtraColumn[];
  /** The text next to N (the phase rule and what a saved N does). */
  nRule: ReactNode;
  nPlaceholder: string;
  headingPrefix: string;
  sectionPrefix: string;
  onValue: (f: Field, value: Scalar) => void;
  /** A pick in the model picker. `stored` holds the efforts that the settings store for the new model. */
  onPickModel: (f: Field, id: string, stored: string[]) => void;
  onEmptyN: (f: Field) => void;
  onCheck: (f: Field) => void;
};

const modelKeyOf = (effortKey: string) => effortKey.replace(/\.variant$/, ".model");
const helpText = (f: Field) => `${f.allowed}. Unit: ${f.unit}. Takes effect: ${effect(f.key).toLowerCase()}.`;

export default function SettingsFields(p: SettingsFieldsProps) {
  // The values that count now, for the efforts that are stored for each model.
  const current: FlatSettings = {};
  for (const f of FIELDS) { const v = p.valueOf(f); if (v !== undefined) current[f.key] = v; }
  const storedFor = (model: string) => storedEffortsFor(model, [p.defaults, current]);
  const text = (f: Field) => { const v = p.valueOf(f); return typeof v === "string" ? v : undefined; };

  function control_(f: Field) {
    const value = p.valueOf(f);
    const id = p.idPrefix + f.key;
    const describedBy = `${id}-help ${id}-error`;
    const invalid = !!p.errors[f.key];
    const props = { id, disabled: p.disabled, onBlur: () => p.onCheck(f), "aria-describedby": describedBy, "aria-invalid": invalid, className: control };
    if (f.kind === "boolean" || f.kind === "mode") return <select {...props} value={String(value)} onChange={(e) => p.onValue(f, f.kind === "boolean" ? e.target.value === "true" : e.target.value)}>{(f.kind === "boolean" ? ["true", "false"] : ["separate", "session"]).map((v) => <option key={v} value={v}>{optionText(f.key, v)}</option>)}</select>;
    if (f.kind === "model") return <ModelPicker id={id} label={f.label} value={text(f)} models={p.modelList(f)} catalog={p.catalog ?? null} disabled={p.disabled} describedBy={describedBy} className={control} onBlurCheck={() => p.onCheck(f)} onPick={(picked) => { if (picked !== text(f)) p.onPickModel(f, picked, storedFor(picked)); }} />;
    if (f.kind === "variant") {
      const model = FIELDS.find((x) => x.key === modelKeyOf(f.key));
      const chosen = model ? text(model) : undefined;
      return <ThinkingMenu id={id} label={f.label} model={chosen} value={text(f)} stored={chosen ? storedFor(chosen) : []} catalog={p.catalog ?? null} disabled={p.disabled} describedBy={describedBy} className={control} onBlurCheck={() => p.onCheck(f)} onPick={(picked) => { if (picked !== text(f)) p.onValue(f, picked); }} />;
    }
    return <input {...props} type="number" min={f.min} max={f.max} step="1" placeholder={f.key === "update.N" ? p.nPlaceholder : undefined} value={value === undefined || value === null ? "" : String(value)} onChange={(e) => {
      const entered = e.target.value;
      // An empty N field means "no N": the key leaves the draft (the global N or the phase rule applies).
      if (f.key === "update.N" && entered === "") { p.onEmptyN(f); return; }
      try { p.onValue(f, entered === "" ? "" : parseSettingsJson(entered) as Scalar); }
      catch { p.onValue(f, entered); }
    }} />;
  }

  /** The error line and the help line of a field in a table row. The help text is for screen readers: the table shows no long text. */
  function lines(f: Field) {
    const id = p.idPrefix + f.key;
    return <>
      <p id={`${id}-help`} className="sr-only">{f.label}. {helpText(f)}</p>
      <p id={`${id}-error`} role={p.errors[f.key] ? "alert" : undefined} className="mt-1 break-words text-sm text-red-700">{p.errors[f.key]}</p>
    </>;
  }

  function cell(f: Field, kind: string, node: ReactNode) {
    return <div key={f.key} data-field={f.key} data-field-status={p.status(f)} title={`${p.nameTitle}: ${f.key}`} className="min-w-0">
      {node}{lines(f)}{kind === "Thinking" && p.resets[f.key] && <p data-effort-reset role="status" className="mt-1 text-xs text-amber-800">Effort reset to default for this model</p>}
    </div>;
  }

  const th = "px-2 py-2 text-left text-xs font-semibold uppercase text-muted max-lg:hidden";
  const td = "px-2 py-2 align-top max-lg:block max-lg:px-0 max-lg:py-1 max-lg:before:block max-lg:before:text-xs max-lg:before:font-semibold max-lg:before:text-muted max-lg:before:content-[attr(data-label)]";

  function pairRow(row: PairRow) {
    const parts: [Field, string][] = [[row.model, "Model"], [row.variant, "Thinking"]];
    return <tr key={row.id} data-pair={row.id} className="border-t border-line align-top max-lg:block max-lg:py-3">
      <th scope="row" data-label="Level" className="whitespace-nowrap px-2 py-2 text-left align-top font-semibold max-lg:block max-lg:px-0">{row.title}</th>
      <td data-label="Model" className={td}>{cell(row.model, "Model", control_(row.model))}</td>
      <td data-label="Thinking" className={td}>{cell(row.variant, "Thinking", control_(row.variant))}</td>
      {p.extraColumns.map((col) => <td key={col.id} data-label={col.header} className={td}>
        {parts.map(([f, kind]) => { const node = col.cell(f); return node ? <div key={f.key} data-for={f.key} className="mb-1 min-w-0 break-words text-sm"><span className="mr-1 text-xs text-muted">{kind}</span>{node}</div> : null; })}
      </td>)}
    </tr>;
  }

  const seen = new Set<number>();
  const headingId = (g: number) => { if (seen.has(g)) return undefined; seen.add(g); return p.headingPrefix + g; };

  function fieldBox(f: Field) {
    const id = p.idPrefix + f.key;
    return <div key={f.key} data-field={f.key} data-field-status={p.status(f)} className="min-w-0 rounded border border-line bg-white p-3">
      <div className="flex flex-wrap items-baseline gap-2"><label htmlFor={id} className="font-semibold">{f.label}</label>{p.badge(f)}</div>
      <p className="mt-1 text-sm text-muted">{f.meaning}</p><p className="mt-1 break-all text-xs text-muted" title={p.nameTitle}>{f.key}</p>
      <div className="my-2 max-w-xl">{control_(f)}</div>
      <p id={`${id}-help`} className="text-sm text-muted">{helpText(f)}</p>
      <p id={`${id}-error`} role={p.errors[f.key] ? "alert" : undefined} className="mt-1 break-words text-sm text-red-700">{p.errors[f.key]}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">{p.footer(f)}</div>
    </div>;
  }

  function cardBox(card: Card) {
    const ids = card.groups.map(headingId);
    const first = card.groups[0];
    const isN = card.id === "g0";
    const title = card.groups.map((g) => `${g + 1}. ${GROUPS[g]}`).join(", ") + (card.part ? ` · ${card.part}` : "");
    const named = ids.find(Boolean);
    return <section key={card.id} data-card={card.id} id={ids[0] ? `${p.sectionPrefix}${first}` : undefined} aria-labelledby={named} aria-label={named ? undefined : title} className={"min-w-0 scroll-mt-6 rounded border border-line bg-stone-50 p-3 " + (isN ? "xl:col-span-2" : "")}>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {card.groups.map((g, i) => <h3 key={g} id={ids[i]} className="text-base font-semibold">{g + 1}. {GROUPS[g]}{card.part ? ` · ${card.part}` : ""}</h3>)}
        {card.groups.slice(1).map((g, i) => ids[i + 1] ? <span key={g} id={`${p.sectionPrefix}${g}`} className="scroll-mt-6" /> : null)}
      </div>
      {isN ? <div className="flex flex-wrap items-start gap-4"><div className="w-full min-w-0 max-w-sm">{card.fields.map(fieldBox)}</div><div className="min-w-0 max-w-prose flex-1 basis-72 text-sm">{p.nRule}</div></div>
        : <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))]">{card.fields.map(fieldBox)}</div>}
    </section>;
  }

  const all = cards();
  const levelIds = headingId(LEVEL_GROUP);
  const boxId = headingId(BOX_GROUP);
  const effectText = effect(levelRows()[0].model.key).toLowerCase();
  return <div className="min-w-0 space-y-4" data-settings-fields>
    {all.filter((c) => c.id === "g0").map(cardBox)}
    <section id={levelIds ? `${p.sectionPrefix}${LEVEL_GROUP}` : undefined} aria-labelledby={levelIds} className="min-w-0 scroll-mt-6 rounded border border-line bg-stone-50 p-3">
      <h3 id={levelIds} className="text-base font-semibold">{LEVEL_GROUP + 1}. {GROUPS[LEVEL_GROUP]}</h3>
      <p className="mt-1 text-sm text-muted">One line for each level. The model and the efforts of the chosen model take effect: {effectText}. The model ID is in small gray text in the list.</p>
      {/* Unit VW125 (row 4): one line for the whole page, because it stays in view when no list is open. It says how old the list is, or why the picker shows the yaml models. */}
      {p.oc2 && <p data-oc2-line data-oc2-status={p.oc2.status} className={"mt-1 text-sm " + (p.oc2.status === "ok" ? "text-muted" : "text-amber-800")}>{listLine(p.oc2)}</p>}
      <table data-levels-table className="mt-2 w-full border-collapse text-sm max-lg:block">
        <thead className="max-lg:hidden"><tr>
          <th scope="col" className={th}>Level</th><th scope="col" className={th}>Model</th><th scope="col" className={th}>Thinking</th>
          {p.extraColumns.map((col) => <th key={col.id} scope="col" className={th}>{col.header}</th>)}
        </tr></thead>
        <tbody className="max-lg:block">{levelRows().map(pairRow)}</tbody>
        <tbody className="max-lg:block">
          <tr className="max-lg:block"><td colSpan={3 + p.extraColumns.length} className="px-2 pb-1 pt-4 max-lg:block max-lg:px-0"><h3 id={boxId} className="text-base font-semibold"><span id={boxId ? `${p.sectionPrefix}${BOX_GROUP}` : undefined} className="scroll-mt-6">{BOX_GROUP + 1}. {GROUPS[BOX_GROUP]}</span></h3></td></tr>
          {pairRow(boxCriticRow())}
        </tbody>
      </table>
    </section>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{all.filter((c) => c.id !== "g0").map(cardBox)}</div>
  </div>;
}
