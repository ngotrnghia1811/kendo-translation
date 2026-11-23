import "server-only";
import { parseTermbase } from "./htv-build";
import {
  acceptProblem,
  buildDecision,
  entryFactsOf,
  groupId,
  mergedProposals,
  parseProposalRows,
  parseReviewLines,
  pendingDecisionIds,
  ProposalProblem,
  readDecisionLines,
  utcNow,
  viewGroups,
  type DecideValues,
  type EntryFacts,
  type GroupView,
  type ProposalGroup,
  type ReviewAction,
} from "./proposals-core";
import { appendReview, readTermbaseState, rebuildDictionary, replaceDecisions, sha1Of, termbasePaths, withDecisionsLock, type RebuildAnswer, type TermbasePaths } from "./termbase-files";

/*
 * Unit VW126 (Q-A 3:117.7 rows 1 to 6, Q-A 3:121.2): the data and the actions of the tab "Agent proposals". The routes under /api/dictionary call these functions after the checks of the Monitor switch,
 * the loopback host, and the role. This module checks the files, not the person: a decision needs the role admin, a comment needs the role translator or admin (the routes check that).
 */

/** The person who acts. The name and the role go into proposal-reviews.jsonl. */
export interface Person {
  name: string;
  role: string;
}

/** What the tab holds. `etag.decisions` is the sha1 of decisions.jsonl that the groups were checked against. A decision call sends it back. */
export interface ProposalsView {
  groups: GroupView[];
  counts: { open: number; accepted: number; rejected: number; rows: number; badRows: number };
  /** Decisions of proposals that are not in the dictionary file yet (the dictionary needs a rebuild). */
  pending: string[];
  etag: { decisions: string };
  proposalsFile: boolean;
  /** True when the Rebuild button can work: the script of the Translator folder is set. */
  canRebuild: boolean;
}

async function pathsOrStop(): Promise<TermbasePaths> {
  const p = await termbasePaths();
  if (!p) throw new ProposalProblem(503, "The termbase folder is not set. Set VIEWER_TERMBASE_DIR or translatorDataDir in viewer.config.json.");
  return p;
}

function factsMap(termbaseText: string): Map<string, EntryFacts> {
  return new Map([...parseTermbase(termbaseText)].map(([id, raw]) => [id, entryFactsOf(raw)]));
}

/** The tab: the merged groups with their state, the count of decisions that wait for a rebuild, and the sha1 of decisions.jsonl. Writes nothing. */
export async function loadProposalsView(): Promise<ProposalsView> {
  const paths = await pathsOrStop();
  const st = await readTermbaseState(paths);
  const { rows, bad } = parseProposalRows(st.proposalsText);
  const groups = mergedProposals(rows);
  const utcOf = new Map(rows.map((r) => [String(r.proposal_id), String(r.utc ?? "")]));
  const reviews = parseReviewLines(st.reviewsText).lines;
  const views = viewGroups(groups, reviews, (id) => st.termbaseText.includes(JSON.stringify(id)), (pid) => utcOf.get(pid) ?? "");
  const entries = factsMap(st.termbaseText);
  let lines;
  let linesProblem = "";
  try {
    lines = readDecisionLines(st.decisionsText);
  } catch (e) {
    if (!(e instanceof ProposalProblem)) throw e;
    linesProblem = e.message;
  }
  for (const v of views) {
    if (v.kind === "revise") {
      const e = entries.get(v.entry_id ?? "");
      v.current = e ? { headword: e.headword, concise_en: e.concise_en, detailed_en: e.detailed_en } : null;
    }
    if (v.status === "open") v.problem = linesProblem || acceptProblem(v, entries, st.decisionsText, lines);
  }
  return {
    groups: views,
    counts: {
      open: views.filter((v) => v.status === "open").length,
      accepted: views.filter((v) => v.status === "accepted").length,
      rejected: views.filter((v) => v.status === "rejected").length,
      rows: rows.length,
      badRows: bad,
    },
    pending: lines ? pendingDecisionIds(lines, st.termbaseText) : [],
    etag: { decisions: sha1Of(st.decisionsText) },
    proposalsFile: st.proposalsExists,
    canRebuild: Boolean(paths.script),
  };
}

const TEXT_MAX = 2000;

function checkText(v: unknown, what: string, required: boolean): string {
  if (v === undefined || v === null) {
    if (required) throw new ProposalProblem(400, `${what} is required.`);
    return "";
  }
  if (typeof v !== "string") throw new ProposalProblem(400, `${what} must be text.`);
  const t = v.trim();
  if (required && !t) throw new ProposalProblem(400, `${what} is required.`);
  if (t.length > TEXT_MAX) throw new ProposalProblem(400, `${what} is longer than ${TEXT_MAX} characters.`);
  return t;
}

function findGroup(groups: ProposalGroup[], id: unknown): ProposalGroup {
  if (typeof id !== "string" || !id) throw new ProposalProblem(400, "The field group is required.");
  const g = groups.find((x) => groupId(x) === id);
  if (!g) throw new ProposalProblem(404, "This proposal group is not in proposals.jsonl.");
  return g;
}

/** Add a comment to a group (Q-A 3:117.7 row 3). A translator or an admin may comment. The comment never changes the status. */
export async function commentOnGroup(person: Person, input: { group: unknown; text: unknown }): Promise<{ utc: string }> {
  const text = checkText(input.text, "The comment", true);
  const paths = await pathsOrStop();
  const st = await readTermbaseState(paths);
  const group = findGroup(mergedProposals(parseProposalRows(st.proposalsText).rows), input.group);
  const utc = utcNow();
  await appendReview(paths, { utc, name: person.name, role: person.role, group: groupId(group), action: "comment", text, decision_id: "", proposal_ids: group.proposal_ids });
  return { utc };
}

export interface DecideInput {
  group: unknown;
  action: unknown;
  text?: unknown;
  values?: unknown;
  etag?: unknown;
}

export interface DecideAnswer {
  action: ReviewAction;
  decisionId: string;
  line: string;
  backup: string;
  utc: string;
}

function readValues(v: unknown): DecideValues {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new ProposalProblem(400, "Edit then accept needs the field values.");
  const o = v as Record<string, unknown>;
  const out: DecideValues = {};
  for (const k of Object.keys(o)) if (!["ja_term", "reading", "romaji", "concise_en", "detailed_en"].includes(k)) throw new ProposalProblem(400, `The field values has the unknown key ${k}.`);
  if ("ja_term" in o) out.ja_term = checkText(o.ja_term, "The Japanese term", false);
  if ("reading" in o) out.reading = checkText(o.reading, "The reading", false);
  if ("romaji" in o) out.romaji = checkText(o.romaji, "The romaji", false);
  if ("concise_en" in o) out.concise_en = checkText(o.concise_en, "The EN form", false);
  if ("detailed_en" in o) out.detailed_en = o.detailed_en === null ? null : checkText(o.detailed_en, "The detailed text", false);
  return out;
}

/**
 * Accept, Edit then accept, or Reject (Q-A 3:117.7 rows 3 to 5, Q-A 3:121.2). Only the admin may call it (the route checks).
 *   accept       appends one decision line with the values of the newest proposal.
 *   edit-accept  appends one decision line with the values that the admin typed.
 *   reject       writes no decision line. It writes the review line only, and the group moves to the closed section. Nothing is deleted.
 * A call is refused (409) when decisions.jsonl changed after the tab was loaded (sha1), when a newer proposal arrived for the term, or when the term has a decision already.
 */
export async function decideOnGroup(person: Person, input: DecideInput): Promise<DecideAnswer> {
  const action = input.action;
  if (action !== "accept" && action !== "edit-accept" && action !== "reject") throw new ProposalProblem(400, "The field action must be accept, edit-accept, or reject.");
  const etag = input.etag && typeof input.etag === "object" ? (input.etag as Record<string, unknown>) : {};
  if (typeof etag.decisions !== "string" || !/^[a-f0-9]{40}$/.test(etag.decisions)) throw new ProposalProblem(400, "The field etag needs the sha1 of decisions.jsonl (decisions) and the ID of the newest proposal (newest).");
  if (typeof etag.newest !== "string" || !etag.newest) throw new ProposalProblem(400, "The field etag needs the sha1 of decisions.jsonl (decisions) and the ID of the newest proposal (newest).");
  const text = checkText(input.text, "The note", false);
  const values = action === "edit-accept" ? readValues(input.values) : {};
  const paths = await pathsOrStop();
  return withDecisionsLock(paths, async () => {
    const st = await readTermbaseState(paths);
    if (sha1Of(st.decisionsText) !== etag.decisions) throw new ProposalProblem(409, "The file decisions.jsonl changed after you loaded the tab. Reload the tab. Nothing was written.");
    const group = findGroup(mergedProposals(parseProposalRows(st.proposalsText).rows), input.group);
    if (group.newest.proposal_id !== etag.newest) throw new ProposalProblem(409, "A newer proposal arrived for this term. Reload the tab. Nothing was written.");
    const id = groupId(group);
    if (parseReviewLines(st.reviewsText).lines.some((r) => r.group === id && r.action !== "comment")) throw new ProposalProblem(409, "This term has a decision already. Reload the tab. Nothing was written.");
    const utc = utcNow();
    if (action === "reject") {
      await appendReview(paths, { utc, name: person.name, role: person.role, group: id, action, text, decision_id: "", proposal_ids: group.proposal_ids });
      return { action, decisionId: "", line: "", backup: "", utc };
    }
    const result = buildDecision({ group, edited: action === "edit-accept", values, decisionsText: st.decisionsText, entries: factsMap(st.termbaseText) });
    const backup = await replaceDecisions(paths, etag.decisions as string, st.decisionsText, result.text);
    await appendReview(paths, { utc, name: person.name, role: person.role, group: id, action, text, decision_id: result.id, proposal_ids: group.proposal_ids });
    return { action, decisionId: result.id, line: result.line, backup, utc };
  });
}

/** The rebuild of the dictionary file (Q-A 3:117.7 row 6). Only the admin may call it (the route checks). `apply` false is the dry run. */
export async function rebuildFromTab(apply: boolean): Promise<RebuildAnswer> {
  return rebuildDictionary(await pathsOrStop(), apply);
}
