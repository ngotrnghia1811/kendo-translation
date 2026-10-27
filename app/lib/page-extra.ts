import "server-only";
import { listDir, readJson, readJsonl, readText } from "./json";
import { isSafeSegment, PathError } from "./safe-path";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

export const EXTRA_PARTS = ["calls", "messages", "lookup", "failed", "programs", "critiques"] as const;
export type ExtraPart = (typeof EXTRA_PARTS)[number];

/** Round 43 answer 7 (Q-A l111): the 7 extra items. This module loads 6 of them on request. The 7th (critique counts) is in the core page data. */
export async function loadExtra(runRel: string, part: ExtraPart, stage: number): Promise<unknown> {
  // runRel is "pilot-run/<slug>_pNNN/<run folder>". Check every segment.
  const segs = runRel.split("/");
  if (segs.length !== 3 || segs[0] !== "pilot-run" || !segs.every(isSafeSegment)) throw new PathError("Bad run path.");
  if (!(stage >= 0 && stage <= 3)) throw new PathError("Bad stage.");
  const n = stage;
  const boxes = [`ED_${n}`, `QA_${n}`];
  const criticTags = boxes.map((b) => `box-critic.${b}`);

  switch (part) {
    case "calls": {
      const rows = await readJsonl<J>(`${runRel}/calls.jsonl`);
      const re = new RegExp(`(^|\\.)(TS|TL|ED|QA)_${n}$`);
      return rows
        .filter((r) => r.kind === "model" && re.test(String(r.tag)))
        .map((r) => ({
          tag: r.tag,
          model: r.model,
          variant: r.variant,
          costUsd: r.cost_usd ?? null,
          seconds: r.seconds ?? null,
          retries: r.retries ?? 0,
          ok: r.ok ?? null,
          error: r.error ?? null,
          flag: r.flag ?? null,
          reasoningNameSent: r.reasoning_name_sent ?? null,
          jsonRepair: r.json_repair ?? null,
          tokens: r.tokens ?? null,
        }));
    }
    case "messages": {
      const out: { tag: string; text: string }[] = [];
      for (const tag of [...boxes, ...criticTags]) {
        const text = await readText(`${runRel}/messages/${tag}.txt`);
        if (text !== null) out.push({ tag, text });
      }
      return out;
    }
    case "lookup": {
      const out: { box: string; lookup: J; aligned: J }[] = [];
      for (const b of [`TL_${n}`, ...boxes]) {
        const lookup = await readJson<J>(`${runRel}/lookup/${b}.json`);
        const aligned = await readJson<J>(`${runRel}/lookup/${b}.aligned.json`);
        if (lookup || aligned) out.push({ box: b, lookup, aligned });
      }
      return out;
    }
    case "failed": {
      // Page-wide, not tied to a stage.
      const failed: J[] = [];
      for (const f of (await listDir(`${runRel}/failed`)).filter((x) => x.endsWith(".json")).sort()) {
        const j = await readJson<J>(`${runRel}/failed/${f}`);
        if (j) failed.push({ file: f, tag: j.tag, model: j.model, error: j.error, retries: j.retries, seconds: j.seconds, costUsd: j.cost_usd });
      }
      const calls = await readJsonl<J>(`${runRel}/calls.jsonl`);
      const flagged = calls.filter((c) => c.kind === "model" && c.flag).map((c) => ({ tag: c.tag, flag: c.flag }));
      const summary = await readJson<J>(`${runRel}/summary.json`);
      return { failed, flagged, failures: summary?.failures ?? [], failedCalls: summary?.failed_calls ?? [], flaggedCalls: summary?.flagged_calls ?? [] };
    }
    case "programs": {
      const enForm = await readJson<J>(`${runRel}/programs/en_form_check.ED_${n}.json`);
      const termMarks = await readJson<J>(`${runRel}/programs/term_marks.ED_${n}.json`);
      const structure = await readJson<J>(`${runRel}/programs/page_structure_check.ED_${n}.json`);
      const sItems = (structure?.items ?? []) as J[];
      return {
        enForm: enForm
          ? ((enForm.items ?? []) as J[]).map((i) => ({ term: i.term, enForm: i.en_form, use: i.use, required: i.required, result: i.result, detail: i.detail, row: i.row_id }))
          : null,
        termMarks: termMarks
          ? ((termMarks.marks ?? []) as J[]).map((m) => ({ surface: m.surface, entry: m.entry_id, found: m.en?.found ?? null, explained: m.en?.explained ?? null }))
          : null,
        structure: structure
          ? { total: sItems.length, notFound: sItems.filter((i) => i.status !== "found").map((i) => ({ part: i.part_field, ts: i.ts_item, ed: i.ed_item, status: i.status, detail: i.detail })) }
          : null,
      };
    }
    case "critiques": {
      const out: J[] = [];
      for (const b of [`TS_${n}`, `TL_${n}`, ...boxes]) {
        const rows = await readJsonl<J>(`${runRel}/critiques/queue-${b}.jsonl`);
        for (const r of rows) {
          const c = r.critique ?? {};
          out.push({
            reviewedBox: r.reviewed_box ?? b,
            id: c.critique_id,
            failureMode: c.failure_mode,
            reason: c.reason,
            evidence: c.evidence ?? null,
            noteForNext: c.note_for_next_step ?? null,
          });
        }
      }
      return out;
    }
  }
}
