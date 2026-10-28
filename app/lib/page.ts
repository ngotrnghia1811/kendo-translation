import "server-only";
import { readJson, exists, listDir } from "./json";
import { criticOnlyFolders, parseBookMemory, parseCriticSession } from "./chain";
import { runFoldersOf, bookTitle } from "./books";
import { stripDataPrefix, isSafeSegment, PathError } from "./safe-path";
import { parseQaMarks } from "./page-labels";
import type { BoxItem, CritiqueCount, PageData, QaIssue, QaStage, StageText } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

// Order of the text sections on a page. Title and pillar first, then the body, then caption, figure, folio.
// [agent inference] This follows how a reader meets the page. The data has no single reading order across sections.
const SECTIONS: { key: string; label: string }[] = [
  { key: "block_title", label: "Title" },
  { key: "block_pillar", label: "Pillar" },
  { key: "lines", label: "Body" },
  { key: "line_caption", label: "Caption" },
  { key: "block_figure", label: "Figure" },
  { key: "block_folio", label: "Folio" },
];

function pickParts(r: J): J {
  return r?.after_program_step ?? r?.model_result ?? {};
}

function jaMap(ts: J): Map<string, string> {
  const m = new Map<string, string>();
  const parts = pickParts(ts);
  for (const s of SECTIONS) {
    for (const it of (parts[s.key] ?? []) as J[]) {
      if (it?.item_id) m.set(String(it.item_id), String(it.text ?? ""));
    }
  }
  return m;
}

function edItems(box: string, ed: J, ja: Map<string, string>): BoxItem[] {
  const parts = pickParts(ed);
  const out: BoxItem[] = [];
  for (const s of SECTIONS) {
    ((parts[s.key] ?? []) as J[]).forEach((it, i) => {
      const refs: string[] = Array.isArray(it.ja_refs) ? it.ja_refs.map(String) : [];
      const jaText = refs.map((r) => ja.get(r) ?? "").filter(Boolean).join(" ");
      out.push({
        id: String(it.item_id ?? `${box}/${s.key}/${i + 1}`),
        section: s.label,
        text: String(it.text ?? ""),
        jaRefs: refs,
        jaText,
      });
    });
  }
  return out;
}

function qaStage(box: string, q: J): QaStage {
  const mr = q?.model_result ?? {};
  const score = q?.score ?? {};
  const issues: QaIssue[] = ((mr.issues ?? []) as J[]).map((x) => ({
    id: String(x.issue_id ?? ""),
    row: x.row ?? null,
    severity: x.severity ?? null,
    jaPiece: String(x.ja_piece ?? ""),
    enPiece: String(x.en_piece ?? ""),
    reason: String(x.reason ?? ""),
    suspectedStage: String(x.suspected_stage ?? ""),
  }));
  const { marks, programMarks } = parseQaMarks(mr);
  return {
    box,
    verdict: score.verdict ?? null,
    score: score.page_score ?? null,
    penalty: score.penalty ?? null,
    cells: ((mr.cells ?? []) as J[]).map((c) => ({ row: Number(c.row), name: String(c.name ?? ""), value: Number(c.cell ?? 0) })),
    issues,
    marks,
    programMarks,
    reasoning: String(q?.reasoning ?? mr.reasoning ?? ""),
  };
}

/**
 * Round 44 answer 13 (Q-A l142), page view: ED_0 to ED_3 texts with the JA text, QA verdicts and cells.
 * Reads the core files only. The 7 extra items load on request (lib/page-extra.ts).
 */
export async function getPage(slug: string, pageName: string, run?: string): Promise<PageData | null> {
  if (!isSafeSegment(slug) || !/^p\d+$/.test(pageName)) throw new PathError("Bad page name.");
  if (run && !isSafeSegment(run)) throw new PathError("Bad run folder name.");
  const pageFolder = `${slug}_${pageName}`;
  const runFolders = await runFoldersOf(pageFolder);
  const runFolder = run ?? runFolders[0];
  if (!runFolder) return null;
  const rel = `pilot-run/${pageFolder}/${runFolder}`;
  const summary = await readJson<J>(`${rel}/summary.json`);
  const pageJson = await readJson<J>(`${rel}/page/page.json`);
  if (!summary && !pageJson && !(await exists(`${rel}/results`))) return null;

  const ed: StageText[] = [];
  const qa: QaStage[] = [];
  for (let n = 0; n < 4; n++) {
    const ts = await readJson<J>(`${rel}/results/TS_${n}.json`);
    const e = await readJson<J>(`${rel}/results/ED_${n}.json`);
    const q = await readJson<J>(`${rel}/results/QA_${n}.json`);
    if (e) {
      ed.push({
        box: `ED_${n}`,
        items: edItems(`ED_${n}`, e, jaMap(ts)),
        termList: ((e.model_result?.term_list ?? []) as J[]).map((t) => ({ ja: String(t.ja_headword ?? ""), en: String(t.en_form ?? "") })),
        reasoning: String(e.reasoning ?? ""),
      });
    }
    if (q) qa.push(qaStage(`QA_${n}`, q));
  }

  const cbt = (summary?.critiques_by_box_type ?? {}) as Record<string, J>;
  const critiqueCounts: CritiqueCount[] = Object.entries(cbt).map(([boxType, v]) => ({
    boxType,
    critiques: Number(v.critiques ?? 0),
    n: v.N ?? null,
    reachedN: v.reached_N ?? null,
    note: String(v.note ?? ""),
  }));

  let imagePath: string | null = pageJson?.image ? stripDataPrefix(String(pageJson.image)) : null;
  if (imagePath && !(await exists(imagePath))) imagePath = null;

  return {
    pageId: `${slug}/${pageName}`,
    slug,
    pageName,
    kind: String(pageJson?.kind ?? ""),
    runFolder,
    runRel: rel,
    runFolders,
    status: String(summary?.status ?? "no summary"),
    failures: (summary?.failures ?? []).map(String),
    costModelsUsd: summary?.cost_usd_models ?? null,
    costListedUsd: summary?.cost_usd_models_listed_price ?? null,
    wallSeconds: summary?.wall_seconds ?? null,
    modelCalls: summary?.model_calls ?? null,
    failedCalls: (summary?.failed_calls ?? []).map(String),
    flaggedCalls: (summary?.flagged_calls ?? []).map((x: J) => (typeof x === "string" ? x : JSON.stringify(x))),
    ed,
    qa,
    critiqueCounts,
    imagePath,
    bookTitle: await bookTitle(slug),
    // Round 48 answer 9 (Q-A 2026-10-27 l55): the critic mode and the session turn show on the page view. An old summary has no such key.
    criticMode: typeof summary?.critic_mode === "string" ? summary.critic_mode : null,
    criticSession: parseCriticSession(summary?.critic_session),
    bookMemory: parseBookMemory(summary?.book_memory),
    criticOnlyFolders: criticOnlyFolders(await listDir(rel)),
  };
}
