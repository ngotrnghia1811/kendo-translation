// VW129 (round 129, card P69.2): server-free tests of the tab "Agent proposals" of the kendo dictionary page /dictionary after the owner pick Q-A 3:129.4 "Accept rows 1 to 6".
// Owner note (Q-A 3:128.1): "just add button to switch to proposal page" and "Repeated terms should be ground into 1, with user can click it to view the infor of where/when/why/etc it was proposed".
//   part 1  the pure helpers of lib/proposal-terms.ts: one group per term, the mark "Already in the dictionary", the order of the details, the texts
//   part 2  the routes on the made-up termbase: one group per term, old review lines (VW126 group IDs) still count, Accept of a marked term writes a revise, Edit then accept with values.as
//   part 3  the page and the panel: the two buttons with the count, who sees them, the row, the details, the mark and its link
//   part 4  the real termbase copy (when VW129_REAL_TERMBASE is set): 61 marked add terms, Accept of 稽古 writes a revise and never an add
//   part 5  the Python oracle (when VW129_TB_SCRIPT is set): the revise line of a marked term equals revise_line of termbase_build.py
//   part 6  the sources: no new library, no server-only import in the client helpers
// Run: cd app && TMPDIR=<unit>/tmp [VW129_REAL_TERMBASE=<copy of data/termbase>] [VW129_TB_SCRIPT=<copy of termbase_build.py>] node scripts/vw129-test.mjs
// The last line is "<n> passed, <m> failed". Made-up data only (example.test addresses). No real PocketBase, no network except localhost.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { checker, htmlText, installAppHooks, madeUpRoot, snapshot } from "./vw-test-kit.mjs";
import { madeUpEntries, madeUpProposalRows, proposalRow, writeMadeUpTermbase } from "./vw126-fixtures.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/dictionary");
const jar = new Map();
let requestHeaders = new Headers();
globalThis.__vw129 = { jar, headers: () => requestHeaders };
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/headers") {
      const src = `const j = globalThis.__vw129;
export async function cookies(){ return {
  get(n){ const v = j.jar.get(n); return v === undefined ? undefined : { name: n, value: v }; },
  set(n, v){ j.jar.set(n, v); },
  delete(n){ j.jar.delete(n); } }; }
export async function headers(){ return j.headers(); }`;
      return { url: `data:text/javascript,${encodeURIComponent(src)}`, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
const { check, done } = checker();
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const req = createRequire(path.join(app, "package.json"));
const { createElement: h } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");
const gated = async (name, on, fn) => (on ? check(name, fn) : console.log(`skip  ${name} (the env variable for it is not set)`));
const REAL = process.env.VW129_REAL_TERMBASE ?? "";
const TB_SCRIPT = process.env.VW129_TB_SCRIPT ?? "";

// A made-up data folder with one book title, so that the readable title of the made-up book shows (Q-A 3:17.4).
const { root: TMP } = await madeUpRoot("vw129-");
await fs.mkdir(path.join(TMP, "data/item-metadata"), { recursive: true });
writeFileSync(path.join(TMP, "data/item-metadata/items.filled.jsonl"), JSON.stringify({ item_id: "made_up_book", kind: "book", title_en: "Seme and Kamae", title_ja: "攻めと構え" }) + "\n");
writeFileSync(path.join(TMP, "viewer.config.json"), JSON.stringify({ translatorDataDir: path.join(TMP, "data") }));
process.env.VIEWER_CONFIG = path.join(TMP, "viewer.config.json");

const PC = await import("../lib/proposals-core.ts");
const PT = await import("../lib/proposal-terms.ts");
const ENTRIES = madeUpEntries();
const facts = (list) => new Map(list.map((e) => [e.id, PC.entryFactsOf(e)]));
const ROWS = madeUpProposalRows();

// ---------------------------------------------------------------- part 1: the pure helpers

await check("row 2: one group per term: the 9 made-up rows give 6 groups (VW126 gave 7); the add and the revise of 小手 are ONE group with 1 add and 1 revise", () => {
  const gs = PT.mergedTerms(ROWS, facts(ENTRIES));
  assert.equal(gs.length, 6);
  assert.equal(PC.mergedProposals(ROWS).length, 7, "the VW126 merge for comparison");
  const kote = gs.find((g) => g.term === "小手");
  assert.equal(kote.count, 2);
  assert.equal(kote.add_count, 1);
  assert.equal(kote.revise_count, 1);
  assert.equal(kote.kind, "revise", "a term of the dictionary is a revise");
  assert.equal(kote.entry_id, "c-aaaaaaaa0002");
  assert.deepEqual(kote.existing, { entry_id: "c-aaaaaaaa0002", headword: "小手", writing: "小手", isHeadword: true });
  assert.deepEqual(kote.legacy_ids.sort(), ["add\t小手\tこて", "revise\tc-aaaaaaaa0002"].sort(), "the VW126 IDs of the term");
  const hgd = gs.find((g) => g.term === "引き逆胴");
  assert.equal(hgd.count, 3, "引き逆胴 and 引き 逆胴 (a space) and ヒキギャクドウ (katakana) are one term");
  assert.equal(hgd.kind, "add");
  assert.equal(hgd.existing, null);
  assert.equal(hgd.entry_id, null);
  assert.deepEqual(gs.map((g) => g.count), [3, 2, 1, 1, 1, 1], "count first");
  assert.equal(PT.termGroupId("小手"), "term\t小手");
});

await check("row 3: the details hold every row of the term, newest first, with time, book, page, box, kind, EN form, short English explanation, and reason", () => {
  const g = PT.mergedTerms(ROWS, facts(ENTRIES)).find((x) => x.term === "引き逆胴");
  assert.equal(g.rows.length, 3);
  const utcs = g.rows.map((r) => r.utc);
  assert.deepEqual(utcs, [...utcs].sort().reverse(), "newest first");
  assert.equal(g.rows[0].book, "second_book");
  assert.equal(g.rows[0].box, "ED_2");
  assert.equal(g.rows[0].page_id, "second_book/p040");
  assert.equal(g.rows[0].kind, "add");
  assert.equal(g.rows[2].detailed_en, "Hiki-gyaku-dō (引き逆胴) is a strike to the left side of the torso made while the player moves back.");
  assert.equal(g.rows[2].reason, "The page uses this word.");
  assert.equal(g.newest.proposal_id, g.rows[0].proposal_id, "the newest row is the first detail");
});

await check("row 4: the mark: a headword or another writing (x-headword-variants) of an entry; the headword wins over another writing; a revise-only term keeps its entry", () => {
  const entries = facts(ENTRIES);
  const idx = PT.writingIndex(entries);
  assert.equal(idx.get("引き技").entry_id, "c-aaaaaaaa0003");
  assert.equal(idx.get("引き技").isHeadword, false);
  assert.equal(idx.get("ヒキワザ").isHeadword, true);
  const rows = [
    proposalRow({ kind: "add", ja_term: "引き技", reading: "ひきわざ", romaji: "hiki-waza", concise_en: "backward techniques", box: "QA_0", page: 5, n: 50 }),
    proposalRow({ kind: "add", ja_term: "残心", reading: "ざんしん", romaji: "zanshin", concise_en: "remaining mind", box: "ED_1", page: 6, n: 51 }),
  ];
  const gs = PT.mergedTerms(rows, entries);
  const hw = gs.find((g) => g.term === "引き技");
  assert.deepEqual(hw.existing, { entry_id: "c-aaaaaaaa0003", headword: "ヒキワザ", writing: "引き技", isHeadword: false });
  assert.equal(hw.kind, "revise");
  assert.equal(gs.find((g) => g.term === "残心").entry_id, "c-aaaaaaaa0005");
  const both = new Map([...entries, ["c-bbbbbbbb0001", { ...entries.get("c-aaaaaaaa0005"), id: "c-bbbbbbbb0001", headword: "残り心", variants: ["小手"] }]]);
  assert.equal(PT.writingIndex(both).get("小手").entry_id, "c-aaaaaaaa0002", "the headword wins over another writing of a second entry");
  const rev = PT.mergedTerms(ROWS, facts(ENTRIES)).find((g) => g.term === "引き面");
  assert.equal(rev.kind, "revise");
  assert.equal(rev.existing.entry_id, "c-aaaaaaaa0001");
});

await check("row 4: the confirm text of Accept on a marked term names the entry and says that no second entry is made", async () => {
  const P = await import("../components/ProposalsPanel.tsx");
  const g = PT.mergedTerms(ROWS, facts(ENTRIES)).find((x) => x.term === "小手");
  const t = P.acceptConfirmText(g);
  assert.ok(t.startsWith("小手 is already in the dictionary (entry 小手, c-aaaaaaaa0002)."), t);
  assert.ok(t.includes('to the EN form "wrist"'), t);
  assert.ok(t.includes("It makes no second entry."), t);
});

await check("the small texts: the button text with and without a count, the counts line, the page link of this Mac, and the readable book name", () => {
  assert.equal(PT.proposalsButtonText(5), "Agent proposals (5 open)");
  assert.equal(PT.proposalsButtonText(0), "Agent proposals (0 open)");
  assert.equal(PT.proposalsButtonText(null), "Agent proposals");
  assert.equal(PT.countsText({ count: 12, add_count: 10, revise_count: 2 }), "Proposed 12 times · 10 add, 2 revise");
  assert.equal(PT.countsText({ count: 1, add_count: 1, revise_count: 0 }), "Proposed 1 time · 1 add, 0 revise");
  assert.equal(PT.pageViewHref("left_foot_full/p038"), "/page/left_foot_full/p038");
  assert.equal(PT.pageViewHref("../x/p001"), "", "a page ID of another form gets no link");
  assert.equal(PT.bookName("left_foot_full", { left_foot_full: "The Secret of Kendo and the Left Foot" }), "The Secret of Kendo and the Left Foot (left_foot_full)");
  assert.equal(PT.bookName("no_title_book", {}), "no_title_book (title not found)", "never the folder name alone (Q-A 3:17.4)");
});

await check("old review lines: a decision under a VW126 group ID (kind + term) still decides the term group; a comment under an old ID still shows; Accept counts the old line", () => {
  const gs = PT.mergedTerms(ROWS, facts(ENTRIES));
  const reviews = [
    { utc: "2026-11-23T01:00:00Z", name: "Made Up Admin", role: "admin", group: "add\t引き小手\tひきこて", action: "accept", text: "", decision_id: "d-0007", proposal_ids: [] },
    { utc: "2026-11-23T01:01:00Z", name: "Made Up Translator", role: "translator", group: "revise\tc-aaaaaaaa0002", action: "comment", text: "Old comment.", decision_id: "", proposal_ids: [] },
    { utc: "2026-11-23T01:02:00Z", name: "Made Up Admin", role: "admin", group: "add\t抜き胴\tnuki-dou", action: "reject", text: "No.", decision_id: "", proposal_ids: [] },
  ];
  const v = PT.viewTerms(gs, reviews, () => false, () => "");
  const by = (t) => v.find((g) => g.term === t);
  assert.equal(by("引き小手").status, "accepted");
  assert.equal(by("引き小手").decision_id, "d-0007");
  assert.equal(by("抜き胴").status, "rejected");
  assert.equal(by("小手").status, "open");
  assert.deepEqual(by("小手").comments.map((c) => c.text), ["Old comment."]);
  assert.equal(PT.hasDecision(gs.find((g) => g.term === "引き小手"), reviews), true);
  assert.equal(PT.hasDecision(gs.find((g) => g.term === "小手"), reviews), false, "a comment is no decision");
});

// ---------------------------------------------------------------- part 2: the routes

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tokenOf = (id) => `${b64u({ alg: "HS256" })}.${b64u({ id, exp: Math.floor(Date.now() / 1000) + 4 * 3600 })}.sig-${id}`;
const USERS = {
  adm000000000001: { id: "adm000000000001", email: "admin1@example.test", name: "Made Up Admin", role: "admin", approved: true },
  trn000000000001: { id: "trn000000000001", email: "translator1@example.test", name: "Made Up Translator", role: "translator", approved: true },
  rdr000000000001: { id: "rdr000000000001", email: "reader1@example.test", name: "Made Up Reader", role: "reader", approved: true },
};
const ADMIN = "adm000000000001";
const TRANS = "trn000000000001";
const READER = "rdr000000000001";
const server = http.createServer((rq, rs) => {
  const url = new URL(rq.url, "http://x");
  const auth = rq.headers.authorization ?? "";
  const send = (status, obj) => {
    rs.writeHead(status, { "Content-Type": "application/json" });
    rs.end(JSON.stringify(obj));
  };
  rq.resume();
  rq.on("end", () => {
    let m;
    if ((m = /^\/api\/collections\/users\/records\/([A-Za-z0-9]+)$/.exec(url.pathname))) {
      const u = USERS[m[1]];
      return u && auth.endsWith(`.sig-${m[1]}`) ? send(200, u) : send(404, { message: "not found" });
    }
    if (/^\/api\/collections\/[a-z_0-9]+\/records$/.test(url.pathname)) return send(200, { page: 1, perPage: 30, totalPages: 1, totalItems: 0, items: [] });
    return send(404, { message: "not found" });
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
process.env.VIEWER_RUN_SOURCE = "pocketbase";
process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${server.address().port}`;
process.env.VIEWER_MONITOR = "on";

let tbCount = 0;
async function freshTb() {
  const dir = path.join(TMP, "tb" + ++tbCount);
  await writeMadeUpTermbase(dir);
  process.env.VIEWER_TERMBASE_DIR = dir;
  return dir;
}
const rd = (dir, f) => readFileSync(path.join(dir, f), "utf8");
const lines = (t) => t.split("\n").filter((l) => l.trim());
const who = (id) => {
  jar.clear();
  requestHeaders = new Headers();
  if (id) jar.set("htv_token", tokenOf(id));
};
const jreq = (method, p, body = {}) =>
  new Request("http://localhost" + p, { method, headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost" }, body: method === "GET" ? undefined : JSON.stringify(body) });
const routeCache = new Map();
const call = async (rel, method, body) => {
  if (!routeCache.has(rel)) routeCache.set(rel, await import(`../app/api/${rel}/route.ts`));
  const res = await routeCache.get(rel)[method](jreq(method, "/api/" + rel, body));
  return { status: res.status, json: await res.json().catch(() => ({})) };
};
const VIEW = "dictionary/proposals";
const COMMENT = "dictionary/proposals/comment";
const DECIDE = "dictionary/proposals/decide";
const byTerm = (view, t) => view.groups.find((g) => g.term === t);
async function decide(term, action, extra = {}) {
  who(ADMIN);
  const v = (await call(VIEW, "GET")).json;
  const g = byTerm(v, term);
  return call(DECIDE, "POST", { group: g.id, action, etag: { decisions: v.etag.decisions, newest: g.newest.proposal_id }, ...extra });
}

await check("row 2 (route): the view has 6 term groups with the fields term, add_count, revise_count, rows, existing, and the readable title of each book", async () => {
  await freshTb();
  who(ADMIN);
  const r = await call(VIEW, "GET");
  assert.equal(r.status, 200);
  assert.equal(r.json.groups.length, 6);
  assert.equal(r.json.counts.open, 6);
  const kote = byTerm(r.json, "小手");
  assert.equal(kote.id, "term\t小手");
  assert.equal(kote.problem, "", "Accept is allowed: it is a revise of the entry");
  assert.equal(kote.current.concise_en, "wrist", "the EN form of the entry today");
  assert.equal(kote.rows.length, 2);
  assert.ok(r.json.bookTitles.made_up_book.includes("Seme and Kamae"), JSON.stringify(r.json.bookTitles));
  assert.equal(r.json.bookTitles.second_book, undefined, "a book without a title gets no entry");
});

await check("row 4 (route): Accept on 小手 (an add and a revise of the entry c-aaaaaaaa0002) writes ONE revise line of that entry and no add line; the old active line gets superseded_by", async () => {
  const dir = await freshTb();
  const old = lines(rd(dir, "decisions.jsonl"));
  const r = await decide("小手", "accept");
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const now = lines(rd(dir, "decisions.jsonl"));
  assert.equal(now.length, old.length + 1);
  const o = JSON.parse(now.at(-1));
  assert.equal(o.action, "wording", "a revise line (the TR102 revise form), never add");
  assert.equal(o.headword, "小手");
  assert.equal(o.wording.concise_en, "wrist", "the EN form of the newest proposal");
  assert.ok(o.note.startsWith("revise of d-0003 from "), o.note);
  assert.equal(now.filter((l) => JSON.parse(l).action === "add").length, 0, "no add line");
  assert.ok(now[2].endsWith(', "superseded_by": ["d-0007"]}'), "the active line d-0003 points at the new line");
  const rev = JSON.parse(lines(rd(dir, "proposal-reviews.jsonl")).at(-1));
  assert.equal(rev.group, "term\t小手");
  assert.equal(rev.proposal_ids.length, 2, "both proposals of the term");
  who(ADMIN);
  const v = (await call(VIEW, "GET")).json;
  assert.equal(byTerm(v, "小手").status, "accepted");
  assert.equal((await decide("小手", "accept")).status, 409, "a decided term is not decided twice");
});

await check("row 4 (route): the revise line of a marked term equals the line of a revise-only group of the same entry with the same newest proposal", async () => {
  const dir = await freshTb();
  const entries = facts(ENTRIES);
  const g = PT.mergedTerms(ROWS, entries).find((x) => x.term === "小手");
  const plain = PC.mergedProposals(ROWS).find((x) => x.kind === "revise" && x.entry_id === "c-aaaaaaaa0002");
  const oracle = PC.buildDecision({ group: { ...plain, newest: g.newest, proposal_ids: g.proposal_ids }, edited: false, values: {}, decisionsText: rd(dir, "decisions.jsonl"), entries });
  const r = await decide("小手", "accept");
  assert.equal(r.status, 200);
  assert.equal(r.json.line, oracle.line);
  assert.equal(rd(dir, "decisions.jsonl"), oracle.text);
});

await check("row 4 (route): Edit then accept with values.as: revise changes the entry; add with the same term is refused (409, an entry already); add with a new term writes an add; as on a new term is refused (400); a wrong as is 400", async () => {
  let dir = await freshTb();
  let r = await decide("小手", "edit-accept", { values: { as: "revise", concise_en: "wrist (target)" } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  let o = JSON.parse(lines(rd(dir, "decisions.jsonl")).at(-1));
  assert.equal(o.action, "wording");
  assert.equal(o.answer, "edit-accept");
  assert.equal(o.wording.concise_en, "wrist (target)");
  dir = await freshTb();
  const before = rd(dir, "decisions.jsonl");
  r = await decide("小手", "edit-accept", { values: { as: "add", reading: "こて", concise_en: "wrist" } });
  assert.equal(r.status, 409);
  assert.ok(r.json.error.includes("entry already"), r.json.error);
  assert.equal(rd(dir, "decisions.jsonl"), before, "nothing written");
  r = await decide("小手", "edit-accept", { values: { as: "add", ja_term: "小手打ち", reading: "こてうち", romaji: "kote-uchi", concise_en: "wrist strike" } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  o = JSON.parse(lines(rd(dir, "decisions.jsonl")).at(-1));
  assert.equal(o.action, "add");
  assert.equal(o.headword, "小手打ち");
  dir = await freshTb();
  r = await decide("引き小手", "edit-accept", { values: { as: "revise", concise_en: "x" } });
  assert.equal(r.status, 400);
  assert.ok(r.json.error.includes("not in the dictionary"), r.json.error);
  r = await decide("引き小手", "edit-accept", { values: { as: "both" } });
  assert.equal(r.status, 400);
  assert.equal(lines(rd(dir, "decisions.jsonl")).length, 6, "the refused calls wrote no line");
});

await check("old review lines (route): an accept under the VW126 ID 'add\\t引き小手\\tひきこて' keeps the term accepted, and a new Accept is refused (409) with nothing written", async () => {
  const dir = await freshTb();
  writeFileSync(path.join(dir, "proposal-reviews.jsonl"), JSON.stringify({ utc: "2026-11-23T01:00:00Z", name: "Made Up Admin", role: "admin", group: "add\t引き小手\tひきこて", action: "accept", text: "", decision_id: "d-0007", proposal_ids: [] }) + "\n");
  who(TRANS);
  const v = (await call(VIEW, "GET")).json;
  assert.equal(byTerm(v, "引き小手").status, "accepted");
  assert.equal(v.counts.open, 5);
  const before = await snapshot(dir);
  const r = await decide("引き小手", "accept");
  assert.equal(r.status, 409);
  assert.deepEqual(await snapshot(dir), before);
  const old = await call(DECIDE, "POST", { group: "add\t引き逆胴\tひきぎゃくどう", action: "reject", etag: { decisions: v.etag.decisions, newest: "x" } });
  assert.equal(old.status, 404, "a VW126 address of an old open tab is not found: the admin reloads");
});

await check("a comment goes to the term group and shows on the one row", async () => {
  const dir = await freshTb();
  who(TRANS);
  const v = (await call(VIEW, "GET")).json;
  const r = await call(COMMENT, "POST", { group: byTerm(v, "小手").id, text: "Seen as an add and as a revise." });
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(lines(rd(dir, "proposal-reviews.jsonl"))[0]).group, "term\t小手");
  const v2 = (await call(VIEW, "GET")).json;
  assert.deepEqual(byTerm(v2, "小手").comments.map((c) => c.text), ["Seen as an add and as a revise."]);
  assert.equal(byTerm(v2, "小手").status, "open");
});

// ---------------------------------------------------------------- part 3: the page and the panel

const renderPage = async (searchParams) => {
  const Page = (await import("../app/dictionary/page.tsx")).default;
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(searchParams) }));
};
const tabsOf = (html) => /<nav[^>]*data-dict-tabs[^>]*>[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "";

await check("row 1: two buttons 'Dictionary' and 'Agent proposals (6 open)' under the title on the entries view and on the proposals view; the open one has aria-current; ?tab=proposals still opens the tab", async () => {
  await freshTb();
  who(ADMIN);
  for (const [params, on] of [[{}, "entries"], [{ tab: "proposals" }, "proposals"]]) {
    const html = await renderPage(params);
    const nav = tabsOf(html);
    assert.ok(nav, "the buttons");
    const t = htmlText(nav);
    assert.ok(t.includes("Dictionary"), t);
    assert.ok(t.includes("Agent proposals (6 open)"), t);
    assert.ok(nav.includes('href="/dictionary?tab=proposals"'));
    assert.ok(nav.includes('href="/dictionary"'));
    assert.ok(new RegExp(`aria-current="page"[^>]*data-dict-tab="${on}"|data-dict-tab="${on}"[^>]*aria-current="page"`).test(nav), on + " is the open button");
    assert.ok(/rounded border-2/.test(nav), "a button look (border), not an underlined text link");
    assert.ok(html.indexOf("data-dict-tabs") > html.indexOf("<h1"), "under the title");
    assert.equal(html.includes("data-proposals-panel"), on === "proposals");
  }
});

await check("row 1: the count follows the decisions: after one Accept the button says 5 open; with no termbase folder the button says 'Agent proposals' without a count", async () => {
  await freshTb();
  await decide("引き小手", "accept");
  who(ADMIN);
  assert.ok(htmlText(tabsOf(await renderPage({}))).includes("Agent proposals (5 open)"));
  assert.ok(htmlText(tabsOf(await renderPage({ tab: "proposals" }))).includes("Agent proposals (5 open)"));
  delete process.env.VIEWER_TERMBASE_DIR;
  const t = htmlText(tabsOf(await renderPage({})));
  assert.ok(t.includes("Agent proposals") && !t.includes("open)"), t);
});

await check("row 1: the buttons show only where the tab showed: a translator and an admin see them; a reader, an admin with View as Reader, and the Monitor switch off see none (vw126-test checks the link visitor)", async () => {
  await freshTb();
  for (const [name, id, , see] of [["admin", ADMIN, undefined, true], ["translator", TRANS, undefined, true], ["reader", READER, undefined, false]]) {
    who(id);
    const html = await renderPage({});
    assert.equal(html.includes("data-dict-tabs"), see, name);
    assert.equal(html.includes("Agent proposals"), see, name + " text");
  }
  who(ADMIN);
  jar.set("htv_view_as", "reader");
  assert.equal((await renderPage({})).includes("Agent proposals"), false, "View as Reader");
  who(ADMIN);
  process.env.VIEWER_MONITOR = "off";
  try {
    assert.equal((await renderPage({})).includes("data-dict-tabs"), false, "the live site: the switch is off");
  } finally {
    process.env.VIEWER_MONITOR = "on";
  }
});

await check("rows 2 to 5 (page): one row per term with the counts line, the books with titles, the mark with the entry link, a closed details list, and one set of the three buttons per open term", async () => {
  await freshTb();
  who(ADMIN);
  const html = await renderPage({ tab: "proposals" });
  assert.equal((html.match(/data-proposal-group=/g) ?? []).length, 6);
  const t = htmlText(html);
  assert.ok(t.includes("Proposed 2 times · 1 add, 1 revise"), "小手");
  assert.ok(t.includes("Proposed 3 times · 3 add, 0 revise"), "引き逆胴");
  assert.ok(t.includes("Books: Seme and Kamae"), "the readable title");
  assert.ok(t.includes("second_book (title not found)"), "never a folder name alone");
  assert.ok(html.includes('data-proposal-exists="c-aaaaaaaa0002"'));
  assert.ok(/<a[^>]*href="\/dictionary\?entry=c-aaaaaaaa0002"[^>]*data-proposal-entry-link|<a[^>]*data-proposal-entry-link[^>]*href="\/dictionary\?entry=c-aaaaaaaa0002"/.test(html), "the link to the entry");
  assert.ok(t.includes("Already in the dictionary:"));
  assert.ok(t.includes("New term"), "a term that is not in the dictionary");
  assert.equal(html.includes("data-proposal-details"), false, "the details are closed at first");
  assert.ok(t.includes("Show all 3 proposals (newest first)"));
  assert.equal((html.match(/data-action="accept"/g) ?? []).length, 6, "one Accept per open term");
  assert.equal((html.match(/data-action="edit"/g) ?? []).length, 6);
  assert.equal((html.match(/data-action="reject"/g) ?? []).length, 6);
  assert.equal(/\d{4}-\d\d-\d\dT\d\d:\d\d/.test(t), false, "no UTC stamp");
});

await check("row 3 (component): the open details list: time in PST, readable book, page link to the page view of this Mac, box, kind, EN form, short English explanation, and reason, newest first", async () => {
  const P = await import("../components/ProposalsPanel.tsx");
  const g = { ...PT.mergedTerms(ROWS, facts(ENTRIES)).find((x) => x.term === "引き逆胴") };
  const html = renderToStaticMarkup(h(P.Details, { g, titles: { made_up_book: "Seme and Kamae" }, id: "x" }));
  const items = [...html.matchAll(/<li[^>]*data-proposal-row="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)];
  assert.equal(items.length, 3);
  assert.equal(items[0][1], g.rows[0].proposal_id, "newest first");
  const first = htmlText(items[0][2]).trim();
  assert.ok(first.startsWith("2026-11-22 15:10 PST · second_book (title not found) · page 40 · ED_2 · add"), first);
  assert.ok(items[0][2].includes('href="/page/second_book/p040"'));
  const last = htmlText(items[2][2]).trim();
  assert.ok(last.includes("Seme and Kamae (made_up_book) · page 31 · ED_3 · add"), last);
  assert.ok(last.includes("EN form: retreating strike to the left side"));
  assert.ok(last.includes("Short English explanation: Hiki-gyaku-dō (引き逆胴) is a strike"));
  assert.ok(last.includes("Reason: The page uses this word."));
});

await check("a translator sees the rows and the details button but no decision button", async () => {
  await freshTb();
  who(TRANS);
  const html = await renderPage({ tab: "proposals" });
  assert.equal((html.match(/data-proposal-group=/g) ?? []).length, 6);
  assert.ok(html.includes("data-proposal-toggle"));
  assert.equal(/data-action="(accept|edit|reject)"/.test(html), false);
});

// ---------------------------------------------------------------- part 4: the real termbase copy

await gated("real copy: one group per term; every add term that is a headword or another writing of an entry has the mark and is a revise; Accept of 稽古 writes a revise of its entry and never an add", !!REAL, async () => {
  const dir = path.join(TMP, "real");
  await fs.mkdir(dir, { recursive: true });
  for (const f of ["termbase.draft.jsonl", "decisions.jsonl", "proposals.jsonl"]) await fs.copyFile(path.join(REAL, f), path.join(dir, f));
  process.env.VIEWER_TERMBASE_DIR = dir;
  who(ADMIN);
  const v = (await call(VIEW, "GET")).json;
  const rows = PC.parseProposalRows(rd(dir, "proposals.jsonl")).rows;
  console.log(`      real copy: ${rows.length} rows, ${v.groups.length} term groups, ${v.counts.open} open`);
  assert.equal(v.groups.length, new Set(rows.map((r) => PC.normTerm(r.ja_term) || r.entry_id)).size);
  const marked = v.groups.filter((g) => g.add_count > 0 && g.existing);
  console.log(`      real copy: ${marked.length} add terms carry the mark "Already in the dictionary"`);
  assert.ok(marked.length >= 61, "61 add terms at the time of the snapshot (2026-11-23)");
  assert.ok(marked.every((g) => g.kind === "revise" && g.entry_id === g.existing.entry_id));
  const problems = marked.filter((g) => g.problem);
  console.log(`      real copy: ${problems.length} marked terms with a problem${problems.length ? ": " + problems.slice(0, 3).map((g) => g.term + " = " + g.problem).join(" | ") : ""}`);
  const keiko = byTerm(v, "稽古");
  assert.ok(keiko && keiko.existing, "稽古 carries the mark");
  const before = lines(rd(dir, "decisions.jsonl")).length;
  const r = await decide("稽古", "accept");
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const after = lines(rd(dir, "decisions.jsonl"));
  assert.equal(after.length, before + 1);
  const o = JSON.parse(after.at(-1));
  assert.notEqual(o.action, "add");
  assert.ok(o.note.startsWith("revise of "), o.note);
  assert.equal(o.headword, keiko.existing.headword);
  const { openTermCount } = await import("../lib/proposal-terms-data.ts");
  assert.equal(await openTermCount(), v.counts.open - 1, "the button count equals the open count of the tab");
});

// ---------------------------------------------------------------- part 5: the Python oracle

await gated("Python oracle: the revise line that Accept writes for the marked term 小手 equals revise_line of termbase_build.py (new line and old line)", !!TB_SCRIPT, async () => {
  const dir = await freshTb();
  const g = PT.mergedTerms(ROWS, facts(ENTRIES)).find((x) => x.term === "小手");
  const r = await decide("小手", "accept");
  assert.equal(r.status, 200);
  const after = path.join(dir, "decisions.jsonl");
  const backup = (await fs.readdir(path.join(dir, "decisions-backups")))[0];
  writeFileSync(path.join(dir, "before.jsonl"), rd(path.join(dir, "decisions-backups"), backup));
  const script = "import sys, json\nsys.path.insert(0, sys.argv[1])\nimport termbase_build as tb\nold = tb.load_decisions(sys.argv[2])\nnew = tb.load_decisions(sys.argv[3])\nentry = [json.loads(l) for l in open(sys.argv[4], encoding='utf-8') if l.strip() and json.loads(l)['id'] == sys.argv[5]][0]\nn, o = tb.revise_line(old, entry, sys.argv[6], sys.argv[7], None, 'dictionary-page', 'accept', '[admin click on the dictionary page]', sys.argv[8].split(','))\nprint(len(new))\nprint(json.dumps(n, ensure_ascii=False))\nprint(json.dumps(o, ensure_ascii=False))";
  const p = spawnSync("python3", ["-B", "-c", script, path.dirname(TB_SCRIPT), path.join(dir, "before.jsonl"), after, path.join(dir, "termbase.draft.jsonl"), "c-aaaaaaaa0002", "d-0007", "wrist", g.proposal_ids.join(",")], { encoding: "utf8", env: { PATH: process.env.PATH ?? "", TMPDIR: process.env.TMPDIR, PYTHONDONTWRITEBYTECODE: "1", LANG: "en_US.UTF-8" } });
  assert.equal(p.status, 0, p.stderr);
  const out = p.stdout.split("\n");
  assert.equal(out[0], "7");
  assert.deepEqual(JSON.parse(out[1]).wording, JSON.parse(r.json.line).wording, "the wording of the new line");
  assert.equal(JSON.parse(out[1]).action, JSON.parse(r.json.line).action);
  assert.deepEqual(JSON.parse(out[2]).superseded_by, ["d-0007"], "the old line");
});

// ---------------------------------------------------------------- part 6: the sources

await check("sources: the new files import no library outside package.json; lib/proposal-terms.ts and the client components have no server-only import; package.json has no new dependency", () => {
  const pkg = JSON.parse(read("package.json"));
  const deps = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
  for (const f of ["lib/proposal-terms.ts", "lib/proposal-terms-data.ts", "components/ProposalsPanel.tsx", "components/ProposalsTabLabel.tsx", "app/dictionary/page.tsx", "lib/proposals-data.ts"]) {
    const src = read(f);
    for (const m of src.matchAll(/(?:from|import)\s+["']([^"'./@][^"']*|@[^"'/]+\/[^"']*)["']/g)) {
      const name = m[1].startsWith("node:") ? "" : m[1].startsWith("@") ? m[1].split("/").slice(0, 2).join("/") : m[1].split("/")[0];
      if (name && !deps.has(name) && !["react", "next", "server-only"].includes(name)) assert.fail(`${f} imports ${m[1]}`);
    }
  }
  for (const f of ["lib/proposal-terms.ts", "components/ProposalsPanel.tsx", "components/ProposalsTabLabel.tsx"]) assert.ok(!/^import "server-only"/m.test(read(f)), f);
  assert.ok(read("components/ProposalsPanel.tsx").startsWith('"use client"'));
  assert.ok(read("components/ProposalsTabLabel.tsx").startsWith('"use client"'));
  assert.ok(/^import "server-only"/m.test(read("lib/proposal-terms-data.ts")));
});

server.close();
done();
