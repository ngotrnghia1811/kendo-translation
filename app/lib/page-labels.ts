// Pure helpers for the page view (round 47 answer 13, Q-A 2026-10-27 l35): EN form check results, QA marks, JSON repair kind.
// No file access here, so a test can call it.

import type { QaMark } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface EnFormSummary {
  follows: number;
  breaks: number;
  notes: number;
}

function count(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

/**
 * Summary of one programs/en_form_check.ED_n.json file.
 * The file counts follows, breaks, and (new files) notes. A missing count comes from the items.
 * An old file has no notes, so notes is 0.
 */
export function enFormSummary(file: any): EnFormSummary {
  const items: any[] = Array.isArray(file?.items) ? file.items : [];
  const byResult = (r: string) => items.filter((i) => i?.result === r).length;
  return {
    follows: count(file?.follows) ?? byResult("follows"),
    breaks: count(file?.breaks) ?? byResult("breaks"),
    notes: count(file?.notes) ?? byResult("note"),
  };
}

/** Text style class for the result of one EN form check item. Unknown values get a plain style and show as text. */
export function enFormTone(result: unknown): string {
  switch (result) {
    case "follows":
      return "text-muted";
    case "breaks":
      return "text-red-800";
    case "note":
      return "text-amber-800";
    default:
      return "text-stone-700";
  }
}

/** Style class for the small result label next to an EN form check item. */
export function enFormBadge(result: unknown): string {
  switch (result) {
    case "follows":
      return "bg-green-100 text-green-800";
    case "breaks":
      return "bg-red-100 text-red-800";
    case "note":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-stone-100 text-stone-700";
  }
}

/** Style class for a QA mark. Old values (confirmed, false_alarm) and unknown values keep the plain style of today. */
export function markTone(mark: string): string {
  switch (mark) {
    case "still_in_ed":
      return "text-red-800";
    case "not_in_ed":
      return "text-green-800";
    default:
      return "";
  }
}

/** Anchor ID of one issue in the QA panel. The same function builds the link and the target. */
export function issueAnchor(issueId: string): string {
  return "issue-" + issueId.replace(/[^A-Za-z0-9_-]/g, "_");
}

/**
 * Text for the json_repair field of a calls.jsonl row.
 * Null when no repair happened. "first_object+trailing_comma" stays as one text.
 * Other keys of the dict are not read.
 */
export function jsonRepairKind(v: unknown): string | null {
  if (v === null || v === undefined || v === false) return null;
  if (typeof v === "string") return v === "" ? null : v;
  if (typeof v === "object" && !Array.isArray(v)) {
    const k = (v as { kind?: unknown }).kind;
    return typeof k === "string" && k !== "" ? k : "unknown kind";
  }
  return "unknown kind";
}

/**
 * Marks of one QA result (model_result.marks and model_result.program_result_marks).
 * New marks carry own_issue_id. Old marks (confirmed, false_alarm) do not, so ownIssueId is null.
 * An unknown mark value stays as text.
 */
export function parseQaMarks(modelResult: any): { marks: QaMark[]; programMarks: QaMark[] } {
  const list = (v: unknown): any[] => (Array.isArray(v) ? v : []);
  const marks: QaMark[] = list(modelResult?.marks).map((x) => ({
    target: String(x?.lower_issue_id ?? ""),
    mark: String(x?.mark ?? ""),
    reason: String(x?.reason ?? ""),
    ownIssueId: typeof x?.own_issue_id === "string" && x.own_issue_id !== "" ? x.own_issue_id : null,
  }));
  const programMarks: QaMark[] = list(modelResult?.program_result_marks).map((x) => ({
    target: String(x?.item_id ?? x?.check ?? ""),
    mark: String(x?.mark ?? ""),
    reason: String(x?.reason ?? ""),
    ownIssueId: null,
  }));
  return { marks, programMarks };
}
