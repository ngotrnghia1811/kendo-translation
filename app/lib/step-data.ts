// Unit VW95 (round 91), Q-A 3:17.7: level 3 of the step view, the data of one step: the box output per unit, the score and verdict,
// the critiques, the exact text sent, the program check results, and links to the raw files. Pure: lib/step-tree-load.ts reads the files.
// Field names come from the page run folders of the Translator (parsed/<tag>.json, results/<box>.json, programs/*.json, critiques/).

import type { DiffLine } from "./line-diff";
import { parseUtcIso, pstDateTime } from "./pst";
import { tokenCounts } from "./tokens-sum";
import { tokensShort } from "./tokens-view";

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export interface CritiqueRow {
  id: string;
  /** Where the critique points: the failure mode, or the row and severity of a QA issue. */
  head: string;
  reason: string | null;
  ja: string | null;
  en: string | null;
  extra: string | null;
}

export type Section =
  | { kind: "pairs"; title: string; rows: [string, string][] }
  | { kind: "units"; title: string; rows: { id: string; text: string }[]; lang?: string }
  | { kind: "critiques"; title: string; rows: CritiqueRow[] }
  | { kind: "text"; title: string; text: string; mb: string; file: string }
  | { kind: "diff"; title: string; lines: DiffLine[]; counts: { removed: number; added: number; same: number } }
  | { kind: "links"; title: string; links: { text: string; href: string }[] }
  | { kind: "note"; text: string };

export interface StepData {
  title: string;
  /** A box code of the title, for the hover. */
  code?: string;
  sections: Section[];
}

export interface StepInput {
  kind: "box" | "critic" | "loss";
  /** The call tag: "TL_2", "box-critic.TL_2", "reference-diff-critic". */
  code: string;
  calls: unknown[];
  parsed: unknown;
  results?: unknown;
  programs?: { name: string; value: unknown }[];
  queue?: unknown[];
  reference?: unknown;
}

/** "units L01, L02" from ja_refs such as "94380515/p002/ts3/L01". */
export function unitIds(refs: unknown): string {
  const ids = arr(refs)
    .map((r) => str(r))
    .filter((r): r is string => r !== null)
    .map((r) => r.split("/").pop() ?? r);
  return ids.length ? ids.join(", ") : "no unit";
}

/** The call rows of one tag as fact pairs: model, time, tokens, tries, start time, error. Search rows of the box add a line. */
export function callPairs(calls: unknown[], tag: string): [string, string][] {
  const rows: [string, string][] = [];
  const mine = calls.map(rec).filter((r): r is Rec => r !== null && r.kind === "model" && (r.tag === tag || (!r.tag && r.box === tag)));
  if (mine.length === 0) rows.push(["Call", "calls.jsonl holds no call of this step."]);
  mine.forEach((r, i) => {
    const pre = mine.length > 1 ? `Call ${i + 1}: ` : "";
    const program = r.model === "program";
    rows.push([`${pre}Model`, program ? "program (no model call)" : `${str(r.model) ?? "–"}${str(r.variant) ? `, variant ${str(r.variant)}` : ""}`]);
    const started = parseUtcIso(r.started_utc);
    if (started !== null) rows.push([`${pre}Started`, pstDateTime(started)]);
    rows.push([`${pre}Seconds`, num(r.seconds) !== null ? `${num(r.seconds)} s` : "–"]);
    if (!program) rows.push([`${pre}Tokens in / out`, tokensShort(tokenCounts(r.tokens, 1))]);
    if (num(r.retries)) rows.push([`${pre}Retries`, String(num(r.retries))]);
    rows.push([`${pre}Result`, r.ok === false ? `failed: ${str(r.error) ?? "no error text"}` : "ended without an error"]);
  });
  for (const r of calls.map(rec)) {
    if (!r || r.kind !== "search") continue;
    const t = str(r.tag) ?? "";
    if (!t.endsWith(`.${tag}`)) continue;
    const entries = Array.isArray(r.entries) ? r.entries.length : num(r.entries);
    rows.push([`Lookup ${t}`, `${entries ?? "?"} entries${str(r.mode) ? `, mode ${str(r.mode)}` : ""}`]);
  }
  return rows;
}

function critiqueRows(list: unknown[]): CritiqueRow[] {
  return list.map((c0, i) => {
    const c = rec(c0) ?? {};
    const ev = rec(c.evidence) ?? {};
    const issueIds = arr(ev.issue_ids).filter((x): x is string => typeof x === "string");
    const extra = [str(c.stage_tag) ? `stage ${str(c.stage_tag)}` : null, str(ev.unit_id) ? `unit ${str(ev.unit_id)}` : null, issueIds.length ? `issues ${issueIds.join(", ")}` : null]
      .filter(Boolean)
      .join(", ");
    return {
      id: str(c.critique_id) ?? `critique ${i + 1}`,
      head: str(c.failure_mode) ?? "no failure mode stored",
      reason: str(c.reason),
      ja: str(ev.ja_piece),
      en: str(ev.en_piece) ?? str(ev.final_en_piece),
      extra: extra || null,
    };
  });
}

function issueRows(list: unknown[]): CritiqueRow[] {
  return list.map((c0, i) => {
    const c = rec(c0) ?? {};
    const head = [num(c.row) !== null ? `rubric table row ${num(c.row)}` : null, num(c.severity) !== null ? `severity ${num(c.severity)}` : null]
      .filter(Boolean)
      .join(", ");
    return {
      id: str(c.issue_id) ?? `issue ${i + 1}`,
      head: head || "issue",
      reason: str(c.reason),
      ja: str(c.ja_piece),
      en: str(c.en_piece),
      extra: str(c.suspected_stage) ? `suspected stage ${str(c.suspected_stage)}` : null,
    };
  });
}

function reasoning(parsed: Rec | null): Section | null {
  const r = parsed?.reasoning;
  const text = typeof r === "string" ? r : r ? JSON.stringify(r, null, 2) : null;
  return text ? { kind: "text", title: "Reasoning of the model", text, mb: "", file: "" } : null;
}

/** A short line of each scalar of a program result: "items 66, follows 58, breaks 0, notes 8". */
export function programLine(value: unknown): string {
  const v = rec(value);
  if (!v) return Array.isArray(value) ? `${value.length} rows` : "no result";
  const parts: string[] = [];
  for (const [k, x] of Object.entries(v)) {
    if (typeof x === "number" || (typeof x === "string" && x.length <= 80)) parts.push(`${k.replace(/_/g, " ")} ${x}`);
    else if (Array.isArray(x)) parts.push(`${k.replace(/_/g, " ")} ${x.length}`);
  }
  return parts.join(", ") || "no short facts";
}

/** The sections of one step, without the exact text sent and the links (the loader adds those). */
export function stepDataSections(input: StepInput): Section[] {
  const out: Section[] = [];
  const parsed = rec(input.parsed);
  const result = rec(parsed?.result) ?? rec(rec(input.results)?.model_result);
  out.push({ kind: "pairs", title: "Call", rows: callPairs(input.calls, input.code) });
  if (input.kind === "box") {
    const stage = input.code.slice(0, 2);
    if (stage === "QA") {
      const score = rec(rec(input.results)?.score);
      if (score) out.push({ kind: "pairs", title: "Score and verdict", rows: [["Verdict", str(score.verdict) ?? "–"], ["Page score", String(num(score.page_score) ?? "–")], ["Penalty", String(num(score.penalty) ?? "–")]] });
      const cells = arr(result?.cells).map(rec).filter((c): c is Rec => c !== null);
      if (cells.length) out.push({ kind: "units", title: "Rubric table cells", rows: cells.map((c) => ({ id: `row ${num(c.row) ?? "?"} ${str(c.name) ?? ""}`.trim(), text: `cell ${num(c.cell) ?? "?"}` })) });
      out.push({ kind: "critiques", title: `Issues (${arr(result?.issues).length})`, rows: issueRows(arr(result?.issues)) });
      out.push({ kind: "pairs", title: "Marks", rows: [["Marks", String(arr(result?.marks).length)], ["Program result marks", String(arr(result?.program_result_marks).length)]] });
    } else {
      const lines = arr(result?.lines).map(rec).filter((l): l is Rec => l !== null);
      const rows =
        stage === "TS"
          ? lines.map((l) => ({ id: `line ${num(l.reading_order) ?? "?"}`, text: str(l.text) ?? "" }))
          : lines.map((l) => ({ id: unitIds(l.ja_refs), text: str(l.text) ?? "" }));
      out.push(
        rows.length
          ? { kind: "units", title: stage === "TS" ? `Japanese text per line (${rows.length})` : `English text per unit (${rows.length})`, rows, lang: stage === "TS" ? "ja" : "en" }
          : { kind: "note", text: "The output of this step holds no lines (no parsed file yet, or an empty result)." },
      );
    }
    for (const p of input.programs ?? []) out.push({ kind: "pairs", title: `Program check ${p.name}`, rows: [["Result", programLine(p.value)]] });
  } else if (input.kind === "critic") {
    const list = arr(result?.critiques);
    out.push({ kind: "critiques", title: `Critiques (${list.length})`, rows: critiqueRows(list) });
    const note = str(parsed?.note_for_next_critic);
    if (note) out.push({ kind: "units", title: "Note for the next critic", rows: [{ id: "note", text: note }] });
    const box = input.code.replace(/^box-critic\./, "");
    const queued = (input.queue ?? []).map(rec).filter((r) => r?.source_type === "box-critic").length;
    out.push({ kind: "pairs", title: "Queue", rows: [[`critiques/queue-${box}.jsonl`, `${queued} critiques of this box critic wait for the next update point of ${box}`]] });
  } else {
    const list = arr(result?.critiques);
    out.push({ kind: "critiques", title: `Critiques (${list.length})`, rows: critiqueRows(list) });
    const ref = rec(input.reference);
    if (ref) {
      const skipped = arr(ref.skipped_units).map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
      const byBox = new Map<string, number>();
      for (const q of arr(ref.queue)) {
        const b = str(rec(q)?.reviewed_box) ?? "?";
        byBox.set(b, (byBox.get(b) ?? 0) + 1);
      }
      const trend = rec(ref.trend);
      const rows: [string, string][] = [
        ["Critiques sent to the boxes", [...byBox].map(([b, n]) => `${b}: ${n}`).join(", ") || "none"],
        ["Dropped critiques", String(arr(ref.dropped).length)],
        ["Skipped units", skipped.length ? `${skipped.length}: ${skipped.join(", ")}` : "none"],
      ];
      if (trend) for (const [k, x] of Object.entries(trend)) if (typeof x === "number" || typeof x === "string") rows.push([`Trend ${k}`, String(x)]);
      out.push({ kind: "pairs", title: "critiques/reference.json", rows });
    }
  }
  const r = reasoning(parsed ?? rec(input.results));
  if (r) out.push(r);
  return out;
}
