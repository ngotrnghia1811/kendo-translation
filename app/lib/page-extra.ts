import "server-only";
import { listDir, readJson, readJsonl, readText } from "./json";
import { isSafeSegment, PathError, stripDataPrefix } from "./safe-path";
import { enFormSummary, jsonRepairKind } from "./page-labels";
import { criticOnlyFolders, cutChainBlocks, pagesRead, pairsFound, parseCriticOnlySummary, previousPageOf, sessionFields, CHAIN_BLOCKS } from "./chain";
import { pageHref } from "./format";
import { tokenCounts } from "./tokens-sum"; // unit VW93 (Q-A 3:15.2): tokens, not USD

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

export const EXTRA_PARTS = ["calls", "messages", "lookup", "failed", "programs", "critiques", "chain", "critic_only"] as const;
export type ExtraPart = (typeof EXTRA_PARTS)[number];

/**
 * Round 43 answer 7 (Q-A l111): the 7 extra items. This module loads 6 of them on request. The 7th (critique counts) is in the core page data.
 * Round 48 answer 9 (Q-A 2026-10-27 l55): two more items, "chain" (chain inputs of the stage) and "critic_only" (runs of the command critic-only).
 */
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
          jsonRepairKind: jsonRepairKind(r.json_repair),
          // Unit VW93: the 5 token kinds of the call (null: no token data). The raw key stays as it was read.
          tokens: r.tokens ?? null,
          tokenCounts: tokenCounts(r.tokens, 1),
          // Session mode keys (translator_run.py l1079, l603). The separate mode and old files have none, so every field is null.
          ...sessionFields(r),
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
        if (j) failed.push({ file: f, tag: j.tag, model: j.model, error: j.error, retries: j.retries, seconds: j.seconds, costUsd: j.cost_usd, tokens: tokenCounts(j.tokens, 1) });
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
        // Round 47 answer 13: the summary counts follows, breaks, and notes. An old file has no notes, so notes is 0.
        enFormSummary: enForm ? enFormSummary(enForm) : null,
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
    case "chain":
      return loadChainInputs(runRel, n);
    case "critic_only": {
      const out: J[] = [];
      for (const folder of criticOnlyFolders(await listDir(runRel))) {
        const sub = `${runRel}/${folder}`;
        const summary = parseCriticOnlySummary(folder, await readJson<J>(`${sub}/summary.json`));
        out.push({ ...summary, critiques: await readCritiques(sub, n) });
      }
      return out;
    }
  }
}

/** Critiques of the boxes of one stage in a run folder or a critic-only subfolder: critiques/queue-<box>.jsonl. */
async function readCritiques(base: string, n: number): Promise<J[]> {
  const out: J[] = [];
  for (const b of [`TS_${n}`, `TL_${n}`, `ED_${n}`, `QA_${n}`]) {
    for (const r of await readJsonl<J>(`${base}/critiques/queue-${b}.jsonl`)) {
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

/**
 * The chain inputs of the four forward boxes of one stage: the blocks previous_page_pair, book_translation_memory and earlier_term_marks,
 * cut from messages/<box>.txt. The previous page links to the same list: the list whose progress.json holds this run folder
 * names the run folder of the previous page.
 */
async function loadChainInputs(runRel: string, n: number): Promise<unknown> {
  const boxes: { box: string; blocks: Record<string, string | null>; pairsFound: number | null; pagesRead: number | null }[] = [];
  for (const st of ["TS", "TL", "ED", "QA"]) {
    const box = `${st}_${n}`;
    const text = await readText(`${runRel}/messages/${box}.txt`);
    if (text === null) continue;
    const blocks = cutChainBlocks(text);
    boxes.push({ box, blocks, pairsFound: pairsFound(blocks.book_translation_memory), pagesRead: pagesRead(blocks.earlier_term_marks) });
  }
  const hasAny = boxes.some((b) => CHAIN_BLOCKS.some((k) => b.blocks[k] !== null));
  const first = boxes.map((b) => previousPageOf(b.blocks.previous_page_pair)).find((x) => x !== null) ?? null;
  // Each box reads the pair of the same box on the page before ("from: <box> on page <page ID>"), so the link names the page only.
  let previous: { pageId: string; href: string | null; note: string } | null = null;
  if (first) {
    const link = await previousPageLink(runRel, first.pageId);
    previous = { pageId: first.pageId, href: link.href, note: link.note };
  }
  return { boxes, hasAny, previous };
}

async function previousPageLink(runRel: string, prevPageId: string): Promise<{ href: string | null; note: string }> {
  const [, folder, runFolder] = runRel.split("/");
  const m = /^(.+)_(p\d+)$/.exec(folder);
  if (!m) return { href: null, note: "The page folder name has no page number." };
  const thisPageId = `${m[1]}/${m[2]}`;
  for (const stamp of (await listDir("pilot-run/lists")).filter(isSafeSegment).sort().reverse()) {
    const prog = await readJson<J>(`pilot-run/lists/${stamp}/progress.json`);
    const rows: J[] = Array.isArray(prog?.pages) ? prog.pages : [];
    const base = (f: unknown) => (typeof f === "string" && f ? stripDataPrefix(f).split("/").pop() : undefined);
    const mine = rows.find((r) => r?.page_id === thisPageId && base(r.folder) === runFolder);
    if (!mine) continue;
    const prev = rows.find((r) => r?.page_id === prevPageId);
    const prevRun = prev ? base(prev.folder) : undefined;
    if (prevRun && isSafeSegment(prevRun)) return { href: pageHref(prevPageId, prevRun), note: `Same list: ${stamp}.` };
    return { href: null, note: `List ${stamp} has no run folder for ${prevPageId}.` };
  }
  return { href: null, note: "No list folder holds this run folder, so the Viewer cannot tell which run of the previous page to open." };
}
