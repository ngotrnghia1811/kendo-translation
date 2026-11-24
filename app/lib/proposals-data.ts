import "server-only";
import {
  acceptProblem,
  buildDecision,
  parseProposalRows,
  parseReviewLines,
  pendingDecisionIds,
  ProposalProblem,
  readDecisionLines,
  utcNow,
  type DecideValues,
  type EntryFacts,
  type ReviewAction,
} from "./proposals-core";
// Unit VW129 (Q-A 3:129.4 rows 2 to 4): one group per term, the details rows, the mark "Already in the dictionary", and the book titles.
import { groupAs, hasDecision, mergedTerms, termGroupId, viewTerms, type TermGroup, type TermView } from "./proposal-terms";
import { entryFactsMap, loadBookTitles } from "./proposal-terms-data";
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
  /** Unit VW129: one group per term (Q-A 3:129.4 row 2). */
  groups: TermView[];
  /** Unit VW129: the readable title of each book slug of the proposals (Q-A 3:17.4). A slug without a title is not in the map. */
  bookTitles: Record<string, string>;
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

const factsMap = (termbaseText: string): Map<string, EntryFacts> => entryFactsMap(termbaseText);

/** The tab: the term groups with their state, the count of decisions that wait for a rebuild, and the sha1 of decisions.jsonl. Writes nothing. */
export async function loadProposalsView(): Promise<ProposalsView> {
  const paths = await pathsOrStop();
  const st = await readTermbaseState(paths);
  const { rows, bad } = parseProposalRows(st.proposalsText);
  const entries = factsMap(st.termbaseText);
  const groups = mergedTerms(rows, entries);
  const utcOf = new Map(rows.map((r) => [String(r.proposal_id), String(r.utc ?? "")]));
  const reviews = parseReviewLines(st.reviewsText).lines;
  const views = viewTerms(groups, reviews, (id) => st.termbaseText.includes(JSON.stringify(id)), (pid) => utcOf.get(pid) ?? "");
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
    bookTitles: await loadBookTitles(views.flatMap((v) => v.books)),
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

/** Unit VW129: the group address is the term ID ("term", a TAB, and the normalized term). A VW126 address (kind + term) gives 404, so an old open tab must reload. */
function findGroup(groups: TermGroup[], id: unknown): TermGroup {
  if (typeof id !== "string" || !id) throw new ProposalProblem(400, "The field group is required.");
  const g = groups.find((x) => termGroupId(x.term) === id);
  if (!g) throw new ProposalProblem(404, "This proposal group is not in proposals.jsonl.");
  return g;
}

const termGroupsOf = (st: { proposalsText: string; termbaseText: string }): TermGroup[] => mergedTerms(parseProposalRows(st.proposalsText).rows, factsMap(st.termbaseText));

/** Add a comment to a group (Q-A 3:117.7 row 3). A translator or an admin may comment. The comment never changes the status. */
export async function commentOnGroup(person: Person, input: { group: unknown; text: unknown }): Promise<{ utc: string }> {
  const text = checkText(input.text, "The comment", true);
  const paths = await pathsOrStop();
  const st = await readTermbaseState(paths);
  const group = findGroup(termGroupsOf(st), input.group);
  const utc = utcNow();
  await appendReview(paths, { utc, name: person.name, role: person.role, group: termGroupId(group.term), action: "comment", text, decision_id: "", proposal_ids: group.proposal_ids });
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

/** Unit VW129 (Q-A 3:129.4 row 4): the key `as` of the values: "revise" changes the entry of the term, "add" writes a new entry. Left out: the kind of the group. */
function readAs(v: unknown): "add" | "revise" | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v) || !("as" in v)) return undefined;
  const as = (v as Record<string, unknown>).as;
  if (as !== "add" && as !== "revise") throw new ProposalProblem(400, "The field values.as must be add or revise.");
  return as;
}

function readValues(v: unknown): DecideValues {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new ProposalProblem(400, "Edit then accept needs the field values.");
  const o = v as Record<string, unknown>;
  const out: DecideValues = {};
  for (const k of Object.keys(o)) if (!["ja_term", "reading", "romaji", "concise_en", "detailed_en", "as"].includes(k)) throw new ProposalProblem(400, `The field values has the unknown key ${k}.`);
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
  const as = action === "edit-accept" ? readAs(input.values) : undefined;
  const paths = await pathsOrStop();
  return withDecisionsLock(paths, async () => {
    const st = await readTermbaseState(paths);
    if (sha1Of(st.decisionsText) !== etag.decisions) throw new ProposalProblem(409, "The file decisions.jsonl changed after you loaded the tab. Reload the tab. Nothing was written.");
    const entries = factsMap(st.termbaseText);
    const group = findGroup(mergedTerms(parseProposalRows(st.proposalsText).rows, entries), input.group);
    if (group.newest.proposal_id !== etag.newest) throw new ProposalProblem(409, "A newer proposal arrived for this term. Reload the tab. Nothing was written.");
    const id = termGroupId(group.term);
    // Unit VW129: a decision line of the VW126 groups of the term (kind + term) also counts.
    if (hasDecision(group, parseReviewLines(st.reviewsText).lines)) throw new ProposalProblem(409, "This term has a decision already. Reload the tab. Nothing was written.");
    if (as === "revise" && !group.entry_id) throw new ProposalProblem(400, `The term ${group.ja_term} is not in the dictionary. Use add.`);
    const utc = utcNow();
    if (action === "reject") {
      await appendReview(paths, { utc, name: person.name, role: person.role, group: id, action, text, decision_id: "", proposal_ids: group.proposal_ids });
      return { action, decisionId: "", line: "", backup: "", utc };
    }
    // Unit VW129 (Q-A 3:129.4 row 4): a term that is in the dictionary is a group of the kind revise, so Accept writes a revise of that entry and no second entry.
    const result = buildDecision({ group: groupAs(group, as), edited: action === "edit-accept", values, decisionsText: st.decisionsText, entries });
    const backup = await replaceDecisions(paths, etag.decisions as string, st.decisionsText, result.text);
    await appendReview(paths, { utc, name: person.name, role: person.role, group: id, action, text, decision_id: result.id, proposal_ids: group.proposal_ids });
    return { action, decisionId: result.id, line: result.line, backup, utc };
  });
}

/** The rebuild of the dictionary file (Q-A 3:117.7 row 6). Only the admin may call it (the route checks). `apply` false is the dry run. */
export async function rebuildFromTab(apply: boolean): Promise<RebuildAnswer> {
  return rebuildDictionary(await pathsOrStop(), apply);
}
