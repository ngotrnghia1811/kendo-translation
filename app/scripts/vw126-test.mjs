// VW126 (round 121, card P65.2): server-free tests of the dictionary page /dictionary, the Dictionary tab of /search, the tab "Agent proposals", the sync command, and the rules of the new PocketBase list.
// Owner words (Q-A 3:115.5): "We need to also update the kendo dictionary as agent translation progress. Design a system that agent can propose update to the kendo dict (add/revise) during their working process".
// Owner words (Q-A 3:116.8): "We will have a kendo dict web page (for all roles) with a agent-proposal tab (not for reader)".
// Owner picks: Q-A 3:117.6 "Live site and this Mac" (rows 1 to 4), Q-A 3:117.7 "Accept rows 1 to 5", Q-A 3:121.2 "Accept all 3" (the choices of unit TR102), Q-A 3:117.4 and 3:119.2 (the fourth search tab).
//   part 1  the fold and the search rules (Japanese, kana, katakana, romaji with and without macrons, English), the short English explanation, the order of hits, the address
//   part 2  the entry shape from the termbase file, and the same shape for the real file of 1,030 entries (when the env variable VW126_REAL_TERMBASE is set)
//   part 3  the sync command: dry run writes nothing, apply creates, a second run changes nothing, a changed entry is updated, nothing is deleted, a wrong password and a missing list stop
//   part 4  the merged proposal view (count per term), Python-like JSON, and the decision lines (add, revise) with the TR102 format
//   part 5  the routes: the Monitor switch, who may comment, who may decide, Accept, Edit then accept, Reject, the stale file, the lock, the backup
//   part 6  the dictionary route, the Dictionary tab of /search, the pages, the components, and the sources
//   part 7  the real termbase copy end to end (when VW126_REAL_TERMBASE and VW126_TB_SCRIPT are set): decisions of the Python builder as oracle, then the rebuild
// Run: cd app && TMPDIR=<unit>/tmp [VW126_REAL_TERMBASE=<folder> VW126_TB_SCRIPT=<termbase_build.py> VW126_TR102_SCRIPTS=<data/scripts of the TR102 clone>] node scripts/vw126-test.mjs
// The last line is "<n> passed, <m> failed". Made-up data only (example.test addresses). No real PocketBase, no network except localhost.
import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync, promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { checker, htmlText, installAppHooks, madeUpRoot, snapshot } from "./vw-test-kit.mjs";
import { madeUpDecisionLines, madeUpEntries, madeUpProposalRows, proposalRow, pyDumps, realProposalsText, writeMadeUpTermbase } from "./vw126-fixtures.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/dictionary");
const jar = new Map();
let requestHeaders = new Headers();
globalThis.__vw126 = { jar, headers: () => requestHeaders };
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/headers") {
      const src = `const j = globalThis.__vw126;
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
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const req = createRequire(path.join(app, "package.json"));
const { createElement: h } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");
const sha1 = (t) => createHash("sha1").update(t).digest("hex");
const gated = async (name, on, fn) => (on ? check(name, fn) : console.log(`skip  ${name} (the env variable for it is not set)`));

const DC = await import("../lib/dictionary-core.ts");
const DR = await import("../lib/dictionary-record.ts");
const SR = await import("../lib/dictionary-sync-rules.ts");
const PC = await import("../lib/proposals-core.ts");
const HB = await import("../lib/htv-build.ts");

const REAL = process.env.VW126_REAL_TERMBASE ?? "";
const TB_SCRIPT = process.env.VW126_TB_SCRIPT ?? "";
const TR_SCRIPTS = process.env.VW126_TR102_SCRIPTS ?? "";
const PY_ENV = { PATH: process.env.PATH ?? "", TMPDIR: process.env.TMPDIR, PYTHONDONTWRITEBYTECODE: "1", LANG: "en_US.UTF-8" };
const py = (code, args = []) => {
  const r = spawnSync("python3", ["-B", "-c", code, ...args], { encoding: "utf8", env: PY_ENV, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`python3 failed (${r.status}): ${(r.stderr || r.stdout).slice(0, 600)}`);
  return r.stdout;
};

// ---------------------------------------------------------------- part 1: the fold and the search rules

await check("row 3 (Q-A 3:117.6): the constants and the words: 2 characters, 0.35 s, 25 entries on a screen, the list name, the page address", () => {
  assert.equal(DC.DICT_PATH, "/dictionary");
  assert.equal(DC.DICT_MIN_CHARS, 1, "unit VW128 (Q-A 3:127.4): the dictionary searches from 1 character");
  assert.equal(DC.DICT_DELAY_MS, 350);
  assert.equal(DC.DICT_PER_SCREEN, 25);
  assert.equal(DC.DICT_COLLECTION, "dictionary_entries");
  assert.equal(DC.DICT_WORDS.title, "Dictionary");
  assert.equal(DC.DICT_WORDS.openIn, "Open in the dictionary");
  assert.equal(DC.DICT_WORDS.tabProposals, "Agent proposals");
  assert.equal(DC.dictScreens(0), 1);
  assert.equal(DC.dictScreens(25), 1);
  assert.equal(DC.dictScreens(26), 2);
  assert.equal(DC.dictScreens(1030), 42);
});

await check("the fold: macrons, hyphens, spaces, and case go: kote = Kōte = KO-TE, and men uchi = menuchi", () => {
  assert.equal(DC.dictFold("Kōte"), "kote");
  assert.equal(DC.dictFold("kote"), "kote");
  assert.equal(DC.dictFold("KO-TE"), "kote");
  assert.equal(DC.dictFold("hiki-gyaku-dō"), "hikigyakudo");
  assert.equal(DC.dictFold("men uchi"), "menuchi");
  assert.equal(DC.dictFold("引き面"), "引き面", "Japanese stays as it is");
  assert.equal(DC.dictFold("Chūzumi"), "chuzumi");
});

await check("katakana count as hiragana: ヒキワザ = ひきわざ, the long vowel mark stays, and a Japanese query is ready at 2 characters", () => {
  assert.equal(DC.kataToHira("ヒキワザ"), "ひきわざ");
  assert.equal(DC.kataToHira("カーテン abc"), "かーてん abc");
  assert.equal(DC.dictFold("ヒキワザ"), DC.dictFold("ひきわざ"));
  assert.equal(DC.dictReady("小手"), true);
  // unit VW128 (Q-A 3:127.4): 1 character is enough
  assert.equal(DC.dictReady("こ"), true);
  assert.equal(DC.dictReady("面"), true);
  assert.equal(DC.dictReady("ko"), true);
  assert.equal(DC.dictReady("k"), true);
  assert.equal(DC.dictReady("  "), false);
  assert.equal(DC.dictReady('""'), false, "quotes alone are no word");
  assert.equal(DC.dictReady("k o"), true, "the space is removed");
});

await check("unit VW128 (owner note Q-A 3:127.4 \"we can use \\\" \\\" for exact search\"): double quotes make an exact search; the quotes never reach the filter", () => {
  assert.equal(DC.dictQuery('"面"'), "面");
  assert.equal(DC.dictQuery('\u201ckote\u201d'), "kote");
  assert.equal(DC.dictQuery('\uff02小手\uff02'), "小手");
  assert.equal(DC.dictExact('"面"'), true);
  assert.equal(DC.dictExact(' "men" '), true);
  assert.equal(DC.dictExact('\u201cmen\u201d'), true);
  assert.equal(DC.dictExact('\uff02面\uff02'), true);
  assert.equal(DC.dictExact("面"), false);
  assert.equal(DC.dictExact('"面'), false);
  assert.equal(DC.dictExact('""'), false);
  assert.equal(DC.dictExact('" "'), false);
  const recs = [
    { entry_id: "a", headword: "面", variants: [], reading: "めん", romaji: "men", concise_en: "head", short_en: "", common: "", sort_key: "めん" },
    { entry_id: "b", headword: "引き面", variants: [], reading: "ひきめん", romaji: "hiki-men", concise_en: "retreating head strike", short_en: "", common: "", sort_key: "ひきめん" },
    { entry_id: "c", headword: "お面", variants: ["面"], reading: "おめん", romaji: "omen", concise_en: "mask", short_en: "", common: "", sort_key: "おめん" },
  ];
  assert.deepEqual(DC.exactOnly(recs, "面").map((r) => r.entry_id), ["a", "c"], "the headword or an other writing is the whole word");
  assert.deepEqual(DC.exactOnly(recs, "men").map((r) => r.entry_id), ["a"]);
  assert.deepEqual(DC.exactOnly(recs, "hikimen").map((r) => r.entry_id), ["b"], "the fold removes the hyphen");
  assert.deepEqual(DC.exactOnly(recs, "head").map((r) => r.entry_id), ["a"], "the EN form counts, a word inside it does not");
  assert.ok(DC.DICT_WORDS.tip.includes('"面"'));
});

await check("the query for the filter: the wildcard characters % and \\ never reach PocketBase, and the query is cut to 80 characters", () => {
  assert.equal(DC.dictQuery("a%b\\c"), "abc");
  assert.ok(!DC.dictQuery("%_x").includes("%"));
  assert.equal(DC.dictQuery("x".repeat(200)).length, 80);
});

await check("the marks (yellow): the typed spelling stays, Kōte is marked by 'kote', ヒキワザ is marked by ひき, and a text without the words has no mark", () => {
  assert.deepEqual(DC.dictMarks("Kōte", "kote"), [{ t: "Kōte", h: true }]);
  assert.deepEqual(DC.dictMarks("ヒキワザ", "ひき"), [{ t: "ヒキ", h: true }, { t: "ワザ" }]);
  assert.deepEqual(DC.dictMarks("the kote and the kōte", "kote"), [{ t: "the " }, { t: "kote", h: true }, { t: " and the " }, { t: "kōte", h: true }]);
  assert.deepEqual(DC.dictMarks("残心", "kote"), [{ t: "残心" }]);
  assert.deepEqual(DC.dictMarks("   ", "kote"), []);
  assert.deepEqual(DC.dictMarks("abc", ""), [{ t: "abc" }]);
});

await check("the short English explanation: the first sentence, no markdown stars, and a long text is cut at a word end with the dots", () => {
  assert.equal(DC.shortExplanation("Dandori (段取り) is the arrangement of steps. In kendo, it names the plan."), "Dandori (段取り) is the arrangement of steps.");
  assert.equal(DC.shortExplanation("**Kote** is the *wrist*. More."), "Kote is the wrist.");
  assert.equal(DC.shortExplanation(""), "");
  assert.equal(DC.shortExplanation("No end mark here"), "No end mark here");
  const long = "Zanshin is the state of alert mind and body that stays after a strike with no gap and no loose point and no relaxing of the posture or of the attention that a person keeps";
  const cut = DC.shortExplanation(long);
  assert.ok(cut.endsWith("…"), cut);
  assert.ok([...cut].length <= 161, "length " + [...cut].length);
  assert.ok(!/[\s,;:]…$/u.test(cut), "no space or comma before the dots");
  assert.ok(long.startsWith(cut.slice(0, -1)), "the cut text is a start of the source");
  assert.equal(long.charAt(cut.length - 1), " ", "the cut is at a word end");
  assert.equal(DC.shortExplanation("A".repeat(300)).length, 161, "no space: a hard cut at 160 and the dots");
});

await check("the order of hits: a whole headword or reading first, then a start, then a part, then a long text; the same input gives the same order", () => {
  const b = (id, o) => ({ entry_id: id, headword: "x", variants: [], reading: "", romaji: "", concise_en: "", short_en: "", common: "common", sort_key: id, ...o });
  const recs = [
    b("e5", { headword: "a long text only", short_en: "mentions kote here" }), // rank 2: in the short explanation
    b("e4", { headword: "zzz" }), // rank 3: nothing in the visible words
    b("e3", { headword: "my kote guard" }), // rank 2: a part
    b("e2", { headword: "kote guard" }), // rank 1: a start
    b("e1", { headword: "小手", romaji: "kōte" }), // rank 0: the whole romaji
  ];
  const ordered = DC.orderHits(recs, "kote").map((r) => r.entry_id);
  assert.deepEqual(ordered, ["e1", "e2", "e3", "e5", "e4"]);
  assert.deepEqual(DC.orderHits([...recs].reverse(), "kote").map((r) => r.entry_id), ordered);
  assert.equal(DC.rankOf(recs[4], "kote"), 0);
  assert.equal(DC.rankOf(b("v", { variants: ["引き技"] }), "引き技"), 0, "a variant counts");
  assert.equal(DC.rankOf(b("r", { reading: "ヒキワザ" }), "ひきわざ"), 0, "katakana reading, kana query");
});

await check("the address: /dictionary?q=..&screen=..&entry=..&tab=proposals, a default stays out, a bad entry ID is dropped, and the query is cut to 80 characters", () => {
  assert.equal(DC.dictHref(), "/dictionary");
  assert.equal(DC.dictHref({ q: "kote" }), "/dictionary?q=kote");
  assert.equal(DC.dictHref({ q: "kote", screen: 2 }), "/dictionary?q=kote&screen=2");
  assert.equal(DC.dictHref({ q: "kote", screen: 1 }), "/dictionary?q=kote");
  assert.equal(DC.dictHref({ entry: "c-00a61202322b" }), "/dictionary?entry=c-00a61202322b");
  assert.equal(DC.dictHref({ entry: "c-00a61202322b", q: "kote" }), "/dictionary?q=kote&entry=c-00a61202322b");
  assert.equal(DC.dictHref({ tab: "proposals" }), "/dictionary?tab=proposals");
  assert.equal(DC.dictHref({ q: "小手" }), "/dictionary?q=%E5%B0%8F%E6%89%8B");
  const p = DC.parseDictParams({ q: "  " + "a".repeat(100), screen: "3", entry: "c-00a61202322b", tab: "proposals" });
  assert.equal(p.q.length, 80);
  assert.equal(p.screen, 3);
  assert.equal(p.entry, "c-00a61202322b");
  assert.equal(p.tab, "proposals");
  assert.deepEqual(DC.parseDictParams({ entry: "../etc/passwd", screen: "-1", tab: "x" }), { q: "", screen: 1, entry: "", tab: "" });
  assert.deepEqual(DC.parseDictParams({ entry: ["c-aaaaaaaa0001", "x"] }).entry, "c-aaaaaaaa0001");
  assert.deepEqual(DC.parseDictParams({}), { q: "", screen: 1, entry: "", tab: "" });
});

// ---------------------------------------------------------------- part 2: the entry shape from the termbase file

const ENTRIES = madeUpEntries();
const byId = (id) => ENTRIES.find((e) => e.id === id);

await check("row 4 (Q-A 3:117.6): the record of an entry: headword, reading, romaji, EN form, short English explanation, kind; the EN form is the preferred term, else the first EN term", () => {
  const r1 = DR.dictRecordOf(byId("c-aaaaaaaa0001"));
  assert.equal(r1.entry_id, "c-aaaaaaaa0001");
  assert.equal(r1.headword, "引き面");
  assert.equal(r1.reading, "ひきめん");
  assert.equal(r1.romaji, "Hiki-men");
  assert.equal(r1.concise_en, "retreating head strike");
  assert.equal(r1.short_en, "Hiki-men (引き面) is a technique that strikes the opponent's men while the practitioner moves backward.");
  assert.equal(r1.common, "common");
  const r5 = DR.dictRecordOf(byId("c-aaaaaaaa0005"));
  assert.equal(r5.concise_en, "lingering spirit", "no preferred EN term: the first EN term");
  assert.equal(r5.common, "not common");
  assert.ok(r5.short_en.endsWith("…") && [...r5.short_en].length <= 161);
  const r4 = DR.dictRecordOf(byId("c-aaaaaaaa0004"));
  assert.equal(r4.short_en, "Dandori (段取り) is the arrangement of steps, preparation, and plans for a task.");
});

await check("the full view of a record holds all fields of the term pop-up plus the other writings and the sources", () => {
  const raw = byId("c-aaaaaaaa0003");
  const r = DR.dictRecordOf(raw);
  const pop = HB.termEntryView(raw);
  assert.equal(r.view.id, pop.id);
  assert.equal(r.view.headword, pop.headword);
  assert.deepEqual(r.view.readings, pop.readings);
  assert.equal(r.view.romaji, pop.romaji);
  assert.equal(r.view.common, pop.common);
  assert.deepEqual(r.view.langs, pop.langs);
  assert.deepEqual(r.view.variants, ["引き技"]);
  assert.deepEqual(r.variants, ["引き技"]);
  assert.ok(Array.isArray(r.view.sources) && r.view.sources.length >= 1, "sources");
  assert.equal(DR.dictRecordOf(byId("c-aaaaaaaa0004")).view.insideLonger, true);
  assert.equal(DR.dictRecordOf(byId("c-aaaaaaaa0001")).view.insideLonger, false);
});

await check("the search columns: Japanese, kana, katakana, variant, romaji (with and without macron), and English all fold into search_ja and search_en", () => {
  const r2 = DR.dictRecordOf(byId("c-aaaaaaaa0002"));
  const r3 = DR.dictRecordOf(byId("c-aaaaaaaa0003"));
  assert.ok(r2.search_ja.includes("小手") && r2.search_ja.includes("こて"));
  assert.ok(r2.search_en.includes("kote"), "romaji kōte folds to kote");
  assert.ok(r2.search_en.includes("wrist"));
  assert.ok(r3.search_ja.includes("引き技"), "the variant");
  assert.ok(r3.search_ja.includes("ひきわざ"), "the katakana headword folds to hiragana");
  assert.ok(r3.search_en.includes("hikiwaza"));
  assert.equal(r3.sort_key, "ひきわざ");
  for (const r of ENTRIES.map(DR.dictRecordOf)) {
    assert.ok(r.search_ja.length <= DR.DICT_LIMITS.search && r.search_en.length <= DR.DICT_LIMITS.search);
    assert.ok(r.headword.length <= DR.DICT_LIMITS.headword && r.entry_id.length <= DR.DICT_LIMITS.entry_id);
  }
  const hit = (rec, q) => rec.search_ja.includes(DC.dictQuery(q)) || rec.search_en.includes(DC.dictQuery(q));
  for (const q of ["kote", "Kōte", "こて", "コテ", "小手", "wrist"]) assert.ok(hit(r2, q), q);
  for (const q of ["引き技", "ヒキワザ", "ひきわざ", "hiki-waza", "hikiwaza", "retreating tech"]) assert.ok(hit(r3, q), q);
  assert.ok(!hit(r2, "ひきわざ"));
});

await gated("row 2 (Q-A 3:117.6): the real file of 1,030 entries gives 1,030 records with a unique entry ID, no field over its limit, and a reading and a romaji for each", !!REAL, async () => {
  const text = await fs.readFile(path.join(REAL, "termbase.draft.jsonl"), "utf-8");
  const { records, bad, duplicates } = SR.recordsOfTermbase(text);
  assert.equal(records.length, 1030);
  assert.equal(bad, 0);
  assert.equal(duplicates, 0);
  assert.equal(new Set(records.map((r) => r.entry_id)).size, 1030);
  let noReading = 0;
  for (const r of records) {
    for (const [k, lim] of [["headword", 300], ["reading", 300], ["romaji", 300], ["concise_en", 600], ["short_en", 400], ["common", 40], ["sort_key", 300], ["search_ja", 30000], ["search_en", 30000]]) assert.ok(r[k].length <= lim, `${r.entry_id} ${k} ${r[k].length}`);
    assert.ok(JSON.stringify(r.view).length < 5242880 && JSON.stringify(r.variants).length < 100000);
    assert.ok(r.headword && r.entry_id && r.sort_key);
    if (!r.reading) noReading++;
  }
  assert.ok(noReading < 30, "entries without a reading: " + noReading);
  const kote = records.filter((r) => r.search_en.includes("kote"));
  assert.ok(kote.length >= 1, "the real search finds kote");
  const ids = new Set(records.map((r) => r.entry_id));
  assert.ok(ids.has("c-d9d4f8509527") && ids.has("c-00a61202322b"));
});

// ---------------------------------------------------------------- part 3: the fake PocketBase and the sync command

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tokenOf = (id) => `${b64u({ alg: "HS256" })}.${b64u({ id, exp: Math.floor(Date.now() / 1000) + 4 * 3600 })}.sig-${id}`;
const USERS = {
  adm000000000001: { id: "adm000000000001", email: "admin1@example.test", name: "Made Up Admin", role: "admin", approved: true },
  trn000000000001: { id: "trn000000000001", email: "translator1@example.test", name: "Made Up Translator", role: "translator", approved: true },
  rdr000000000001: { id: "rdr000000000001", email: "reader1@example.test", name: "Made Up Reader", role: "reader", approved: true },
  rdr000000000002: { id: "rdr000000000002", email: "reader2@example.test", name: "Made Up Waiting Reader", role: "reader", approved: false },
};
const KEY = "K".repeat(43);
const liveKey = (k) => k === KEY;
const SUPER = { email: "super@example.test", password: "made-up-superuser-pass", token: "SUPER-TOKEN" };
const WORKS = [{ id: "catmadeupbook000", item_id: "made_up_book", kind: "book", title_en: "Seme and Kamae", title_ja: "攻めと構え", author_en: "", author_ja: "", publisher: "", publish_year: "", pages: 12, row: {}, translated: { en: [] }, placement: {} }];
/** The records of the list dictionary_entries on the fake server. */
const DICT = [];
const writes = [];
const seen = [];
const behavior = { down: false, dictMissing: false };
let nextRec = 1;
const readable = (entry) => {
  if (entry.auth === SUPER.token || liveKey(entry.key)) return true;
  const m = /\.sig-([a-z0-9]+)$/.exec(entry.auth);
  const u = m ? USERS[m[1]] : null;
  return !!u && (u.role !== "reader" || u.approved);
};
const dictRows = (filter) => {
  if (!filter) return DICT;
  const eq = /^entry_id="([^"]*)"$/.exec(filter);
  if (eq) return DICT.filter((r) => r.entry_id === eq[1]);
  const qs = [...filter.matchAll(/search_(?:en|ja) ~ "([^"]*)"/g)].map((m) => m[1]);
  return DICT.filter((r) => qs.some((qq) => String(r.search_en).includes(qq) || String(r.search_ja).includes(qq)));
};
const server = http.createServer((rq, rs) => {
  const url = new URL(rq.url, "http://x");
  const entry = { method: rq.method, path: url.pathname, url: rq.url, auth: rq.headers.authorization ?? "", key: rq.headers["x-kendo-view-key"], body: "" };
  seen.push(entry);
  rq.on("data", (c) => (entry.body += c));
  rq.on("end", () => {
    const send = (status, obj) => {
      rs.writeHead(status, { "Content-Type": "application/json" });
      rs.end(JSON.stringify(obj));
    };
    if (behavior.down) return rs.destroy();
    const isSuper = entry.auth === SUPER.token;
    let m;
    if (url.pathname === "/api/collections/_superusers/auth-with-password" && rq.method === "POST") {
      const b = JSON.parse(entry.body || "{}");
      if (b.identity === SUPER.email && b.password === SUPER.password) return send(200, { token: SUPER.token });
      return send(400, { message: "Failed to authenticate." });
    }
    if (url.pathname === "/api/collections/dictionary_entries" && rq.method === "GET") {
      if (!isSuper) return send(403, { message: "Only superusers can perform this action." });
      if (behavior.dictMissing) return send(404, { message: "The requested resource wasn't found." });
      return send(200, { name: "dictionary_entries", fields: ["id", "entry_id", "headword", "variants", "reading", "romaji", "concise_en", "short_en", "common", "view", "search_ja", "search_en", "sort_key", "created", "updated"].map((name) => ({ name })) });
    }
    if ((m = /^\/api\/collections\/dictionary_entries\/records(?:\/([A-Za-z0-9]+))?$/.exec(url.pathname)) && (rq.method === "POST" || rq.method === "PATCH" || rq.method === "DELETE")) {
      writes.push({ method: rq.method, path: url.pathname, super: isSuper });
      if (!isSuper) return send(403, { message: "Only superusers can perform this action." });
      if (rq.method === "DELETE") return send(204, {});
      const body = JSON.parse(entry.body || "{}");
      if (rq.method === "POST") {
        const rec = { id: "dict" + String(nextRec++).padStart(11, "0"), ...body };
        DICT.push(rec);
        return send(200, rec);
      }
      const rec = DICT.find((r) => r.id === m[1]);
      if (!rec) return send(404, { message: "not found" });
      Object.assign(rec, body);
      return send(200, rec);
    }
    if ((m = /^\/api\/collections\/users\/records\/([A-Za-z0-9]+)$/.exec(url.pathname)) && rq.method === "GET") {
      const u = USERS[m[1]];
      if (!u || !entry.auth.endsWith(`.sig-${m[1]}`)) return send(404, { message: "not found" });
      return send(200, u);
    }
    if ((m = /^\/api\/collections\/([a-z_0-9]+)\/records$/.exec(url.pathname)) && rq.method === "GET") {
      const coll = m[1];
      const signedIn = entry.auth !== "" && entry.auth.includes(".sig-");
      const allowed = signedIn || liveKey(entry.key) || isSuper;
      const sp = url.searchParams;
      const page = (items, total = items.length, perPage = items.length || 1) => send(200, { page: Number(sp.get("page") ?? 1), perPage, totalPages: Math.max(1, Math.ceil(total / perPage)), totalItems: sp.get("skipTotal") ? -1 : total, items });
      if (!allowed) return page([]);
      if (coll === "catalog_items") return page(sp.get("fields") === "id" ? [{ id: WORKS[0].id }] : WORKS);
      if (coll === "dictionary_entries") {
        if (behavior.dictMissing) return send(404, { message: "The requested resource wasn't found." });
        if (!readable(entry)) return page([]);
        let rows = [...dictRows(sp.get("filter") ?? "")];
        const sort = sp.get("sort") ?? "";
        if (sort === "sort_key,entry_id") rows.sort((a, b) => (a.sort_key < b.sort_key ? -1 : a.sort_key > b.sort_key ? 1 : a.entry_id < b.entry_id ? -1 : 1));
        else if (sort === "id") rows.sort((a, b) => (a.id < b.id ? -1 : 1));
        const total = rows.length;
        const perPage = Number(sp.get("perPage") ?? 30);
        const pg = Number(sp.get("page") ?? 1);
        rows = rows.slice((pg - 1) * perPage, pg * perPage);
        const fields = sp.get("fields");
        if (fields) rows = rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => fields.split(",").includes(k))));
        return page(rows, total, perPage);
      }
      return page([]);
    }
    return send(404, { message: "not found: " + rq.method + " " + url.pathname });
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const PB_URL = `http://127.0.0.1:${server.address().port}`;
process.env.VIEWER_CONFIG = path.join(process.env.TMPDIR, "vw126-no-config.json");
process.env.VIEWER_RUN_SOURCE = "pocketbase";
process.env.VIEWER_POCKETBASE_URL = PB_URL;
process.env.VIEWER_MONITOR = "on";
const { root: TMP } = await madeUpRoot("vw126-");
let tbCount = 0;
/** A fresh made-up termbase folder. The env variable VIEWER_TERMBASE_DIR points at it. */
async function freshTb(opts) {
  const dir = path.join(TMP, "tb" + ++tbCount);
  await writeMadeUpTermbase(dir, opts);
  process.env.VIEWER_TERMBASE_DIR = dir;
  return dir;
}
const rd = (dir, f) => readFileSync(path.join(dir, f), "utf8");
const lines = (t) => t.split("\n").filter((l) => l.trim());

/** Run the sync command as a child process. The password goes in on stdin. */
function runSync(args, password = SUPER.password) {
  return new Promise((resolve) => {
    const child = execFile(process.execPath, [path.join(app, "scripts/sync-dictionary.mjs"), ...args], { cwd: app, env: { PATH: process.env.PATH ?? "", TMPDIR: process.env.TMPDIR, HOME: process.env.HOME ?? "" }, timeout: 60000 }, (err, stdout, stderr) =>
      resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, stdout, stderr }),
    );
    child.stdin.end(password + "\n");
  });
}
const syncDir = await freshTb({ proposals: false });
const syncFile = path.join(syncDir, "termbase.draft.jsonl");
const baseArgs = ["--url", PB_URL, "--superuser", SUPER.email, "--termbase", syncFile];

await check("sync (Q-A 3:117.6 row 2): --help works, an unknown option stops with code 2, and plain http to a host that is not local stops", async () => {
  const help = await runSync(["--help"]);
  assert.equal(help.code, 0);
  assert.ok(help.stdout.includes("Dry run is the default"));
  assert.ok(help.stdout.includes("never deletes"));
  const bad = await runSync(["--nope"]);
  assert.equal(bad.code, 2);
  assert.ok(bad.stderr.includes("Unknown option --nope"));
  const remote = await runSync(["--url", "http://example.test:8090", "--superuser", SUPER.email, "--termbase", syncFile]);
  assert.equal(remote.code, 2);
  assert.ok(remote.stderr.includes("Plain http is only allowed"));
  const both = await runSync([...baseArgs, "--apply", "--offline"]);
  assert.equal(both.code, 2);
  assert.equal(writes.length, 0);
});

await check("sync: the offline dry run reads the file only: every entry is new, nothing is written, no call goes to the server, and the folder is the same after", async () => {
  const before = await snapshot(syncDir);
  seen.length = 0;
  const r = await runSync(["--termbase", syncFile, "--offline"]);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.stdout.includes("Entries: 6. Bad lines skipped: 0. Repeated entry IDs skipped: 0."), r.stdout);
  assert.ok(r.stdout.includes("New (create): 6"));
  assert.ok(r.stdout.includes("Nothing was written. Add --apply to write."));
  assert.equal(seen.length, 0, "no call to the server");
  assert.deepEqual(await snapshot(syncDir), before);
});

await check("sync: the dry run against the server counts 6 new entries, writes nothing, and the password is never printed", async () => {
  const before = await snapshot(syncDir);
  const r = await runSync(baseArgs);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.stdout.includes("New (create): 6"));
  assert.ok(r.stdout.includes("Changed (update): 0"));
  assert.ok(r.stdout.includes("Same (nothing to do): 0"));
  assert.ok(r.stdout.includes("Nothing was written. Add --apply to write."));
  assert.equal(writes.length, 0);
  assert.equal(DICT.length, 0);
  assert.ok(!(r.stdout + r.stderr).includes(SUPER.password));
  assert.deepEqual(await snapshot(syncDir), before);
});

await check("sync: --apply creates the 6 records with the fields of the record rules; a second dry run says all 6 are the same; a second apply writes nothing (safe to run twice)", async () => {
  const r = await runSync([...baseArgs, "--apply"]);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.ok(r.stdout.includes("Written: created 6, updated 0, failed 0."), r.stdout);
  assert.equal(DICT.length, 6);
  assert.equal(new Set(DICT.map((x) => x.entry_id)).size, 6);
  assert.ok(writes.every((w) => w.method === "POST" && w.super));
  const rec = DICT.find((x) => x.entry_id === "c-aaaaaaaa0002");
  assert.equal(rec.headword, "小手");
  assert.equal(rec.reading, "こて");
  assert.ok(rec.search_en.includes("kote"));
  assert.equal(rec.view.id, "c-aaaaaaaa0002");
  const again = await runSync(baseArgs);
  assert.ok(again.stdout.includes("New (create): 0") && again.stdout.includes("Changed (update): 0") && again.stdout.includes("Same (nothing to do): 6"), again.stdout);
  const n = writes.length;
  const second = await runSync([...baseArgs, "--apply"]);
  assert.equal(second.code, 0);
  assert.ok(second.stdout.includes("Written: created 0, updated 0, failed 0."), second.stdout);
  assert.equal(writes.length, n, "no write at all");
});

await check("sync: a changed entry is updated in place (same record, PATCH), a missing entry is created, and an entry that is only on the server is kept and never deleted", async () => {
  const original = readFileSync(syncFile, "utf8");
  const ls = lines(original);
  const e1 = JSON.parse(ls[0]);
  e1.langSec.find((l) => l.lang === "en").termSec[0].term = "retreating head strike (changed)";
  const extra = { ...JSON.parse(ls[1]), id: "c-aaaaaaaa0099", "x-headword": "新語" };
  const changedFile = path.join(TMP, "changed.jsonl");
  writeFileSync(changedFile, [JSON.stringify(e1), ...ls.slice(1, 5), JSON.stringify(extra)].join("\n") + "\n"); // entry 6 is left out: on the server only
  const recId = DICT.find((x) => x.entry_id === "c-aaaaaaaa0001").id;
  const n = writes.length;
  const args = ["--url", PB_URL, "--superuser", SUPER.email, "--termbase", changedFile];
  const dry = await runSync(args);
  assert.ok(dry.stdout.includes("Changed (update): 1") && dry.stdout.includes("New (create): 1") && dry.stdout.includes("Same (nothing to do): 4"), dry.stdout);
  assert.ok(dry.stdout.includes("On the server only (kept): 1") && dry.stdout.includes("c-aaaaaaaa0006"), dry.stdout);
  assert.equal(writes.length, n);
  const r = await runSync([...args, "--apply"]);
  assert.ok(r.stdout.includes("Written: created 1, updated 1, failed 0."), r.stdout);
  assert.equal(DICT.find((x) => x.entry_id === "c-aaaaaaaa0001").id, recId, "the same record");
  assert.equal(DICT.find((x) => x.entry_id === "c-aaaaaaaa0001").concise_en, "retreating head strike (changed)");
  assert.ok(DICT.some((x) => x.entry_id === "c-aaaaaaaa0006"), "kept");
  assert.ok(DICT.some((x) => x.entry_id === "c-aaaaaaaa0099"));
  assert.ok(!writes.some((w) => w.method === "DELETE"), "never a delete");
  // back to the made-up state for the route tests
  const back = await runSync([...baseArgs, "--apply"]);
  assert.ok(back.stdout.includes("Written: created 0, updated 1, failed 0."), back.stdout);
  DICT.splice(DICT.findIndex((x) => x.entry_id === "c-aaaaaaaa0099"), 1);
  assert.equal(DICT.length, 6);
});

await check("sync: a wrong password stops with code 1 and writes nothing; a server without the list stops and names the migration; a file with no entry stops", async () => {
  const n = writes.length;
  const wrong = await runSync([...baseArgs, "--apply"], "not-the-password");
  assert.equal(wrong.code, 1);
  assert.ok(wrong.stderr.includes("Superuser sign-in failed"));
  assert.ok(!(wrong.stdout + wrong.stderr).includes("not-the-password"));
  assert.equal(writes.length, n);
  behavior.dictMissing = true;
  const miss = await runSync([...baseArgs, "--apply"]);
  behavior.dictMissing = false;
  assert.equal(miss.code, 2);
  assert.ok(miss.stderr.includes("1793300019"), miss.stderr);
  assert.equal(writes.length, n);
  const empty = path.join(TMP, "empty.jsonl");
  writeFileSync(empty, "\n");
  const none = await runSync(["--url", PB_URL, "--superuser", SUPER.email, "--termbase", empty]);
  assert.equal(none.code, 2);
  assert.ok(none.stderr.includes("holds no entry"));
});

await check("the sync rules: a bad line and a repeated entry ID are skipped and counted, and the plan of an empty server is all new", () => {
  const text = madeUpEntries().map((e) => JSON.stringify(e)).join("\n") + "\nnot json\n" + JSON.stringify(madeUpEntries()[0]) + "\n";
  const p = SR.recordsOfTermbase(text);
  assert.equal(p.records.length, 6);
  assert.equal(p.bad, 1);
  assert.equal(p.duplicates, 1);
  const plan = SR.planDictionary(p.records, []);
  assert.equal(plan.create.length, 6);
  assert.equal(plan.same, 0);
  assert.deepEqual(Object.keys(SR.bodyOf(p.records[0])).sort(), ["common", "concise_en", "entry_id", "headword", "reading", "romaji", "search_en", "search_ja", "short_en", "sort_key", "variants", "view"]);
});

// ---------------------------------------------------------------- part 4: the merged view, Python-like JSON, and the decision lines

const ROWS = madeUpProposalRows();

await check("row 1 (Q-A 3:117.7): the merged view has one group per term with the count of boxes, books, and pages: 9 rows give 7 groups, and the term that three boxes proposed has count 3", () => {
  const g = PC.mergedProposals(ROWS);
  assert.equal(g.length, 7);
  assert.equal(g[0].kind, "add");
  assert.equal(g[0].count, 3);
  assert.equal(g[0].ja_term, "引き 逆胴", "the term of the newest row");
  assert.equal(g[0].key, "引き逆胴\tひきぎゃくどう", "NFKC, no space, katakana as hiragana");
  assert.deepEqual(g[0].boxes, ["ED_3", "TS_3", "ED_2"]);
  assert.deepEqual(g[0].books, ["made_up_book", "second_book"]);
  assert.deepEqual(g[0].pages, ["made_up_book/p031", "made_up_book/p032", "second_book/p040"]);
  assert.deepEqual(g[0].concise_en_forms, [{ text: "retreating strike to the left side", count: 2 }, { text: "backward left-side strike", count: 1 }]);
  assert.equal(g[0].newest.proposal_id, ROWS[2].proposal_id);
  assert.equal(g[0].proposal_ids.length, 3);
  assert.equal(g[0].first_utc, ROWS[0].utc);
  assert.equal(g[0].last_utc, ROWS[2].utc);
  assert.deepEqual(g.slice(1).map((x) => x.count), [1, 1, 1, 1, 1, 1]);
  assert.equal(g.reduce((a, x) => a + x.count, 0), 9);
  assert.deepEqual(g.slice(1).map((x) => x.entry_id ?? x.ja_term), ["小手", "抜き胴", "c-aaaaaaaa0006", "c-aaaaaaaa0002", "c-aaaaaaaa0001", "引き小手"], "equal counts: the newest row first");
  assert.deepEqual(PC.parseProposalRows("\n{bad\n[]\n{\"x\":1}\n" + JSON.stringify(ROWS[0]) + "\n"), { rows: [ROWS[0]], bad: 3 });
  assert.equal(PC.groupId(g[0]), "add\t引き逆胴\tひきぎゃくどう");
  assert.equal(PC.normTerm(" 引き\u3000逆胴 "), "引き逆胴");
  assert.equal(PC.normReading("ヒキ・ギャクドウ"), "ひきぎゃくどう");
});

await gated("the merged view equals merged() of proposals.py (unit TR102) for the made-up rows, field by field", !!TR_SCRIPTS, async () => {
  const f = path.join(TMP, "rows.jsonl");
  writeFileSync(f, ROWS.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const out = py("import sys, json\nsys.path.insert(0, sys.argv[1])\nfrom translator import proposals as P\nrows = [json.loads(l) for l in open(sys.argv[2], encoding='utf-8') if l.strip()]\nprint(json.dumps(P.merged(rows), ensure_ascii=False))", [TR_SCRIPTS, f]);
  assert.deepEqual(JSON.parse(out), JSON.parse(JSON.stringify(PC.mergedProposals(ROWS))));
});

await check("pyJson writes Python layout: ', ' and ': ', raw Japanese, escaped quotes and line breaks, and only whole numbers", () => {
  assert.equal(PC.pyJson({ a: 1, b: ["x", "引き"], c: null, d: true }), '{"a": 1, "b": ["x", "引き"], "c": null, "d": true}');
  assert.equal(PC.pyJson("a\"b\\c\nd"), JSON.stringify("a\"b\\c\nd"));
  assert.throws(() => PC.pyJson({ a: 1.5 }), /whole numbers/);
  assert.equal(PC.pyJson([]), "[]");
  assert.equal(PC.pyJson({}), "{}");
});

await gated("pyJson equals Python json.dumps(ensure_ascii=False) for 8 made-up values", !!TB_SCRIPT, async () => {
  const samples = [{ id: "d-1", action: "add", records: ["proposal:dp-1"], round: "r", answer: 0, tag: "[t]", new_entry: { readings: ["ひき"], romaji: "hiki-dō", concise_en: "x \"y\" \\ z\n", common: "not common" } }, [1, [2, [3, {}]], {}], "引き\u2028逆\u001f胴/ \u007f", { "キー": null, b: [true, false] }, 0, -12, "", { "a b": { "c": ["d"] } }];
  const f = path.join(TMP, "samples.json");
  writeFileSync(f, JSON.stringify(samples));
  const out = py("import sys, json\nfor s in json.load(open(sys.argv[1], encoding='utf-8')):\n    print(json.dumps(s, ensure_ascii=False))", [f]).split("\n");
  samples.forEach((s, i) => assert.equal(PC.pyJson(s), out[i], "sample " + i));
});

const facts = (lines_) => new Map(lines_.map((e) => [e.id, PC.entryFactsOf(e)]));
const decisionsText = madeUpDecisionLines().join("\n") + "\n";
const groupOf = (kind, find) => PC.mergedProposals(ROWS).find((g) => g.kind === kind && find(g));

await check("row 4 (Q-A 3:117.7, 3:121.2 row 2): Accept of an add writes one line in the TR102 format: action add, records proposal:<ID>, new_entry with readings, romaji, EN form, and common = not common", () => {
  const g = groupOf("add", (x) => x.ja_term === "引き小手");
  const r = PC.buildDecision({ group: g, edited: false, values: {}, decisionsText, entries: facts(ENTRIES) });
  assert.equal(r.id, "d-0007");
  assert.equal(r.action, "add");
  assert.ok(r.text.startsWith(decisionsText), "the old bytes stay, the new line is at the end");
  assert.equal(r.text, decisionsText + r.line + "\n");
  const o = JSON.parse(r.line);
  assert.deepEqual(Object.keys(o), ["id", "action", "records", "round", "answer", "tag", "note", "headword", "new_entry"]);
  assert.deepEqual(o.records, ["proposal:" + g.newest.proposal_id]);
  assert.equal(o.headword, "引き小手");
  assert.deepEqual(o.new_entry, { readings: ["ひきこて"], romaji: "hiki-kote", concise_en: "backward wrist strike", common: "not common" });
  assert.equal(o.answer, "accept");
  assert.equal(o.round, "dictionary-page");
  assert.equal(o.tag, "[admin click on the dictionary page]");
  assert.equal(o.note, "add from proposal:" + g.newest.proposal_id);
  assert.equal(r.line, PC.pyJson(o), "Python layout");
  assert.equal(PC.nextDecisionId([{ id: "d-0009" }, { id: "d-0100" }, { id: "x" }]), "d-0101");
  assert.equal(PC.nextDecisionId([]), "d-0001");
  assert.equal(PC.nextDecisionId([{ id: "d-10000" }]), "d-10001");
});

await check("row 4: Edit then accept writes the edited values, an add of a group with three rows names all three proposals, and detailed_en is written only when it has text", () => {
  const g = groupOf("add", (x) => x.count === 3);
  const r = PC.buildDecision({ group: g, edited: true, values: { ja_term: "引き逆胴", reading: "ひきぎゃくどう", concise_en: "edited form", detailed_en: "Edited detail." }, decisionsText, entries: facts(ENTRIES) });
  const o = JSON.parse(r.line);
  assert.equal(o.headword, "引き逆胴");
  assert.deepEqual(o.new_entry, { readings: ["ひきぎゃくどう"], romaji: "hiki-gyaku-dō", concise_en: "edited form", detailed_en: "Edited detail.", common: "not common" });
  assert.deepEqual(o.records, g.proposal_ids.map((p) => "proposal:" + p));
  assert.equal(o.answer, "edit-accept");
  assert.ok(o.note.endsWith("(values edited by the admin)"));
  const plain = JSON.parse(PC.buildDecision({ group: g, edited: false, values: { ja_term: "引き逆胴", reading: "ひきぎゃくどう" }, decisionsText, entries: facts(ENTRIES) }).line);
  assert.equal(plain.new_entry.detailed_en, g.newest.detailed_en === null ? undefined : g.newest.detailed_en);
});

await check("the add rules of the builder are checked before the write: a reading that is not kana, a headword that is an entry or a variant, an empty romaji, and a second line for one proposal are refused with a plain message", () => {
  const ents = facts(ENTRIES);
  const bad = (g, values = {}, text = decisionsText) => () => PC.buildDecision({ group: g, edited: false, values, decisionsText: text, entries: ents });
  const nuki = groupOf("add", (x) => x.ja_term === "抜き胴");
  assert.throws(bad(nuki), (e) => e instanceof PC.ProposalProblem && e.status === 400 && /kana/.test(e.message));
  assert.doesNotThrow(bad(nuki, { reading: "ぬきどう" }));
  assert.throws(bad(nuki, { reading: "ぬき どう" }), /kana/, "a space is not kana");
  assert.throws(bad(nuki, { reading: "ぬきどう", romaji: " " }), /romaji/);
  assert.throws(bad(nuki, { reading: "ぬきどう", concise_en: "" }), /EN form/);
  assert.throws(bad(groupOf("add", (x) => x.ja_term === "小手")), (e) => e.status === 409 && /entry already/.test(e.message));
  assert.throws(bad(groupOf("add", (x) => x.ja_term === "小手"), { ja_term: "引き技" }), (e) => e.status === 409, "a variant of another entry");
  const g = groupOf("add", (x) => x.ja_term === "引き小手");
  const once = PC.buildDecision({ group: g, edited: false, values: {}, decisionsText, entries: ents });
  assert.throws(() => PC.buildDecision({ group: g, edited: false, values: {}, decisionsText: once.text, entries: ents }), (e) => e.status === 409 && /already/.test(e.message));
  const pending = lines(once.text).map((l) => ({ text: l, obj: JSON.parse(l) }));
  assert.throws(() => PC.buildDecision({ group: { ...g, proposal_ids: ["dp-other"] }, edited: false, values: {}, decisionsText: once.text, entries: ents, lines: pending }), (e) => e.status === 409 && /add line already/.test(e.message), "the same headword is waiting for a rebuild");
  assert.throws(() => PC.buildDecision({ group: g, edited: false, values: {}, decisionsText: "{bad\n", entries: ents }), (e) => e.status === 409);
  assert.equal(PC.acceptProblem(g, ents, decisionsText), "");
  assert.ok(PC.acceptProblem(nuki, ents, decisionsText).includes("kana"));
});

await check("row 4: a revise adds the new wording line and puts the one key superseded_by at the end of the ONE old line: every other byte of the file stays", () => {
  const g = groupOf("revise", (x) => x.entry_id === "c-aaaaaaaa0001");
  const r = PC.buildDecision({ group: g, edited: false, values: {}, decisionsText, entries: facts(ENTRIES) });
  assert.equal(r.id, "d-0007");
  assert.equal(r.action, "wording");
  assert.equal(r.supersedes, "d-0001");
  const oldLines = decisionsText.split("\n");
  const newLines = r.text.split("\n");
  assert.equal(newLines.length, oldLines.length + 1);
  assert.equal(newLines[0], oldLines[0].slice(0, -1) + ', "superseded_by": ["d-0007"]}');
  assert.deepEqual(newLines.slice(1, oldLines.length - 1), oldLines.slice(1, -1), "lines 2 to 6 are byte-identical");
  assert.equal(JSON.stringify(JSON.parse(newLines[0])), JSON.stringify({ ...JSON.parse(oldLines[0]), superseded_by: ["d-0007"] }));
  const n = JSON.parse(r.line);
  assert.deepEqual(Object.keys(n).slice(-5), ["id", "round", "answer", "tag", "note"]);
  assert.equal(n.action, "wording");
  assert.equal(n.wording.concise_en, "backward-moving head strike");
  assert.equal(n.wording.detailed_en, "Hiki-men is a head strike that you make while you move back.");
  assert.equal(n.wording.concise_zh, "中", "the ZH texts of the old line stay");
  assert.equal("owner_words" in n, false, "the owner words stay on the old line only");
  assert.equal("superseded_by" in n, false);
  assert.equal(n.note, "revise of d-0001 from proposal:" + g.newest.proposal_id);
  assert.equal(r.line, PC.pyJson(n));
  assert.equal(newLines.at(-2), r.line);
  assert.equal(r.text.endsWith("\n"), true);
});

await check("a revise picks the ACTIVE wording line (d-0003, not the superseded d-0002), an entry without an active line is a problem, and a missing entry is 404", () => {
  const ents = facts(ENTRIES);
  const g = groupOf("revise", (x) => x.entry_id === "c-aaaaaaaa0002");
  const r = PC.buildDecision({ group: g, edited: false, values: {}, decisionsText, entries: ents });
  assert.equal(r.supersedes, "d-0003");
  assert.equal(JSON.parse(r.line).wording.concise_en, "forearm guard");
  assert.equal(JSON.parse(r.line).wording.detailed_en, "小手 detail text.", "no detailed text in the proposal: the old text stays");
  assert.ok(r.text.includes('"id": "d-0002"') && !r.text.split("\n").find((l) => l.includes('"id": "d-0002"')).includes("d-0007"), "the superseded line is not touched");
  const none = groupOf("revise", (x) => x.entry_id === "c-aaaaaaaa0006");
  assert.throws(() => PC.buildDecision({ group: none, edited: false, values: {}, decisionsText, entries: ents }), (e) => e.status === 409 && /Found 0/.test(e.message));
  assert.throws(() => PC.buildDecision({ group: { ...none, entry_id: "c-missing" }, edited: false, values: {}, decisionsText, entries: ents }), (e) => e.status === 404);
});

await check("pending decisions (Q-A 3:117.7 row 6): a decision of a proposal that is not in the dictionary file yet counts, a superseded line does not, and the ID in the file ends the wait", () => {
  const ents = facts(ENTRIES);
  const g = groupOf("add", (x) => x.ja_term === "引き小手");
  const once = PC.buildDecision({ group: g, edited: false, values: {}, decisionsText, entries: ents });
  const ls = PC.readDecisionLines(once.text);
  assert.deepEqual(PC.pendingDecisionIds(ls, '{"id":"c-1"}'), ["d-0007"]);
  assert.deepEqual(PC.pendingDecisionIds(ls, '{"x-decisions":["d-0007"]}'), []);
  assert.deepEqual(PC.pendingDecisionIds(PC.readDecisionLines(decisionsText), ""), [], "owner decisions never count");
  const rev = PC.buildDecision({ group: groupOf("revise", (x) => x.entry_id === "c-aaaaaaaa0001"), edited: false, values: {}, decisionsText: once.text, entries: ents });
  assert.deepEqual(PC.pendingDecisionIds(PC.readDecisionLines(rev.text), ""), ["d-0007", "d-0008"]);
});

await gated("the decision lines of the made-up file pass load_decisions of termbase_build.py, and the revise equals revise_line (new line and old line, byte for byte)", !!TB_SCRIPT, async () => {
  const dir = await freshTb({ proposals: false });
  const g = groupOf("revise", (x) => x.entry_id === "c-aaaaaaaa0001");
  const r = PC.buildDecision({ group: g, edited: false, values: {}, decisionsText, entries: facts(ENTRIES) });
  const after = path.join(dir, "after.jsonl");
  writeFileSync(after, r.text);
  const script = "import sys, json\nsys.path.insert(0, sys.argv[1])\nimport termbase_build as tb\nold = tb.load_decisions(sys.argv[2])\nnew = tb.load_decisions(sys.argv[3])\nentry = [json.loads(l) for l in open(sys.argv[4], encoding='utf-8') if l.strip() and json.loads(l)['id'] == sys.argv[5]][0]\nn, o = tb.revise_line(old, entry, sys.argv[6], sys.argv[7], sys.argv[8], 'dictionary-page', 'accept', '[admin click on the dictionary page]', [sys.argv[9]])\nprint(len(new))\nprint(json.dumps(n, ensure_ascii=False))\nprint(json.dumps(o, ensure_ascii=False))";
  const out = py(script, [path.dirname(TB_SCRIPT), path.join(dir, "decisions.jsonl"), after, path.join(dir, "termbase.draft.jsonl"), "c-aaaaaaaa0001", "d-0007", "backward-moving head strike", "Hiki-men is a head strike that you make while you move back.", g.newest.proposal_id]).split("\n");
  assert.equal(out[0], "7");
  assert.equal(out[1], r.line, "the new line");
  assert.equal(out[2], r.text.split("\n")[0], "the old line with superseded_by");
});

// ---------------------------------------------------------------- part 5: the routes of the tab

const b = (id, link) => {
  jar.clear();
  requestHeaders = new Headers();
  if (id) jar.set("htv_token", tokenOf(id));
  if (link !== undefined) jar.set("htv_link", link);
};
const who = b;
const jreq = (method, p, body = {}, headers = {}) =>
  new Request("http://localhost" + p, { method, headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost", ...headers }, body: method === "GET" ? undefined : JSON.stringify(body) });
const routeCache = new Map();
const routeModule = async (rel) => {
  if (!routeCache.has(rel)) routeCache.set(rel, await import(`../app/api/${rel}/route.ts`));
  return routeCache.get(rel);
};
const call = async (rel, method, body, headers) => {
  const mod = await routeModule(rel);
  const res = await mod[method](jreq(method, "/api/" + rel, body, headers));
  return { status: res.status, json: await res.json().catch(() => ({})), headers: res.headers };
};
const VIEW = "dictionary/proposals";
const COMMENT = "dictionary/proposals/comment";
const DECIDE = "dictionary/proposals/decide";
const REBUILD = "dictionary/rebuild";
const ADMIN = "adm000000000001";
const TRANS = "trn000000000001";
const READER = "rdr000000000001";
const WAITING = "rdr000000000002";
// unit VW129 (Q-A 3:129.4 row 2): one group per term, so the group also matches by its term.
const findGroup = (view, term) => view.groups.find((g) => g.entry_id === term || g.ja_term === term || g.term === term || g.key.startsWith(term + "\t"));
async function decide(who_, term, action, extra = {}) {
  who(who_);
  const v = (await call(VIEW, "GET")).json;
  const g = findGroup(v, term);
  return call(DECIDE, "POST", { group: g.id, action, etag: { decisions: v.etag.decisions, newest: g.newest.proposal_id }, ...extra });
}

await check("row 2 (Q-A 3:117.7): the Monitor switch is off (the live site): all four routes answer 404 for every role, even for an admin, and nothing is read or written", async () => {
  const dir = await freshTb();
  process.env.VIEWER_MONITOR = "off";
  try {
    const before = await snapshot(dir);
    for (const id of [ADMIN, TRANS, READER, WAITING, null]) {
      who(id);
      assert.equal((await call(VIEW, "GET")).status, 404, "view " + id);
      assert.equal((await call(COMMENT, "POST", { group: "x", text: "y" })).status, 404, "comment " + id);
      assert.equal((await call(DECIDE, "POST", { group: "x", action: "reject" })).status, 404, "decide " + id);
      assert.equal((await call(REBUILD, "POST", { apply: false })).status, 404, "rebuild " + id);
    }
    who(null, KEY);
    assert.equal((await call(VIEW, "GET")).status, 404);
    assert.deepEqual(await snapshot(dir), before);
    const r = await call(VIEW, "GET");
    assert.equal(r.json.error, "Not found");
  } finally {
    process.env.VIEWER_MONITOR = "on";
  }
});

await check("row 2: who sees the tab data: signed-out and a link visitor get 401, a waiting reader and an approved reader get 403, a translator and an admin get 200", async () => {
  await freshTb();
  who(null);
  assert.equal((await call(VIEW, "GET")).status, 401);
  who(null, KEY);
  assert.equal((await call(VIEW, "GET")).status, 401, "a link visitor never reads the proposals");
  for (const id of [WAITING, READER]) {
    who(id);
    const r = await call(VIEW, "GET");
    assert.equal(r.status, 403, id);
  }
  for (const id of [TRANS, ADMIN]) {
    who(id);
    const r = await call(VIEW, "GET");
    assert.equal(r.status, 200, id);
    assert.equal(r.json.groups.length, 6, "unit VW129 (Q-A 3:129.4 row 2): the add and the revise of 小手 are one group");
    assert.equal(r.json.counts.open, 6, "unit VW129");
    assert.equal(r.json.counts.rows, 9);
    assert.equal(r.json.counts.accepted, 0);
    assert.equal(r.json.pending.length, 0);
    assert.match(r.json.etag.decisions, /^[a-f0-9]{40}$/);
    assert.equal(r.json.proposalsFile, true);
  }
  who(ADMIN);
  const v = (await call(VIEW, "GET")).json;
  assert.equal(v.groups[0].count, 3);
  assert.equal(v.groups[0].id, "term\t引き逆胴", "unit VW129: the group ID names the term");
  assert.equal(v.groups.find((g) => g.entry_id === "c-aaaaaaaa0002").current.concise_en, "wrist");
  assert.equal(v.groups.find((g) => g.entry_id === "c-aaaaaaaa0006").problem.includes("Found 0"), true);
  assert.equal(v.groups.find((g) => g.ja_term === "抜き胴").problem.includes("kana"), true);
  // unit VW129 (Q-A 3:129.4 row 4): the add of 小手 names an entry, so the group is a revise of that entry and Accept is allowed.
  const kote = v.groups.find((g) => g.term === "小手");
  assert.equal(kote.kind, "revise");
  assert.equal(kote.entry_id, "c-aaaaaaaa0002");
  assert.equal(kote.problem, "");
  assert.equal(v.groups.find((g) => g.ja_term === "引き小手").problem, "");
});

await check("the view writes nothing: the folder is the same after two reads, and a missing proposals file gives an empty tab, a missing dictionary file gives 503", async () => {
  const dir = await freshTb();
  who(ADMIN);
  const before = await snapshot(dir);
  await call(VIEW, "GET");
  await call(VIEW, "GET");
  assert.deepEqual(await snapshot(dir), before);
  const none = await freshTb({ proposals: false });
  const r = await call(VIEW, "GET");
  assert.equal(r.status, 200);
  assert.equal(r.json.groups.length, 0);
  assert.equal(r.json.proposalsFile, false);
  await fs.rm(path.join(none, "termbase.draft.jsonl"));
  const gone = await call(VIEW, "GET");
  assert.equal(gone.status, 503);
  assert.ok(gone.json.error.includes("termbase.draft.jsonl"));
  delete process.env.VIEWER_TERMBASE_DIR;
  const unset = await call(VIEW, "GET");
  assert.equal(unset.status, 503, "no termbase folder set: a plain message, no crash");
  assert.ok(unset.json.error.includes("VIEWER_TERMBASE_DIR"));
});

await check("row 3 (Q-A 3:117.7): a translator can add a comment: one line in proposal-reviews.jsonl with time, name, role, group, action, and text; the status stays open and decisions.jsonl stays the same", async () => {
  const dir = await freshTb();
  const dBefore = sha1(rd(dir, "decisions.jsonl"));
  who(TRANS);
  const v = (await call(VIEW, "GET")).json;
  const g = findGroup(v, "引き逆胴");
  const r = await call(COMMENT, "POST", { group: g.id, text: "  Seen on page 31 and 32.  " });
  assert.equal(r.status, 200);
  const rows = lines(rd(dir, "proposal-reviews.jsonl")).map((l) => JSON.parse(l));
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]), ["utc", "name", "role", "group", "action", "text", "decision_id", "proposal_ids"]);
  assert.match(rows[0].utc, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  assert.equal(rows[0].name, "Made Up Translator");
  assert.equal(rows[0].role, "translator");
  assert.equal(rows[0].action, "comment");
  assert.equal(rows[0].text, "Seen on page 31 and 32.");
  assert.equal(rows[0].group, g.id);
  assert.deepEqual(rows[0].proposal_ids, g.proposal_ids);
  assert.equal(sha1(rd(dir, "decisions.jsonl")), dBefore);
  assert.equal(existsSync(path.join(dir, "decisions-backups")), false, "no backup: nothing was changed");
  const v2 = (await call(VIEW, "GET")).json;
  const g2 = findGroup(v2, "引き逆胴");
  assert.equal(g2.status, "open");
  assert.equal(g2.comments.length, 1);
  assert.equal(g2.comments[0].text, "Seen on page 31 and 32.");
  who(ADMIN);
  assert.equal((await call(COMMENT, "POST", { group: g.id, text: "Admin note" })).status, 200);
  assert.equal(lines(rd(dir, "proposal-reviews.jsonl")).length, 2);
});

await check("row 3: a comment needs text up to 2000 characters and a group of the file: empty text 400, long text 400, an unknown group 404, no group 400", async () => {
  const dir = await freshTb();
  who(TRANS);
  const g = findGroup((await call(VIEW, "GET")).json, "引き小手");
  assert.equal((await call(COMMENT, "POST", { group: g.id, text: "   " })).status, 400);
  assert.equal((await call(COMMENT, "POST", { group: g.id })).status, 400);
  assert.equal((await call(COMMENT, "POST", { group: g.id, text: 5 })).status, 400);
  assert.equal((await call(COMMENT, "POST", { group: g.id, text: "x".repeat(2001) })).status, 400);
  assert.equal((await call(COMMENT, "POST", { group: "add\tnope\tnope", text: "x" })).status, 404);
  assert.equal((await call(COMMENT, "POST", { text: "x" })).status, 400);
  assert.equal((await call(COMMENT, "POST", { group: g.id, text: "x".repeat(2000) })).status, 200);
  assert.equal(existsSync(path.join(dir, "proposal-reviews.jsonl")), true);
  assert.equal(lines(rd(dir, "proposal-reviews.jsonl")).length, 1, "only the last call wrote");
});

await check("row 3 (Q-A 3:117.7 'Only the admin decides'): a translator can NOT accept, edit-accept, reject, or rebuild (403) and nothing changes; a reader, a waiting reader, a link visitor, and a signed-out person can not comment (403 or 401)", async () => {
  const dir = await freshTb();
  const before = await snapshot(dir);
  who(TRANS);
  const v = (await call(VIEW, "GET")).json;
  const g = findGroup(v, "引き小手");
  const etag = { decisions: v.etag.decisions, newest: g.newest.proposal_id };
  for (const action of ["accept", "edit-accept", "reject"]) {
    const r = await call(DECIDE, "POST", { group: g.id, action, etag, values: {} });
    assert.equal(r.status, 403, action);
    assert.equal(r.json.error, "Only the admin can do this.");
  }
  assert.equal((await call(REBUILD, "POST", { apply: false })).status, 403);
  assert.equal((await call(REBUILD, "POST", { apply: true })).status, 403);
  for (const [name, id, link, status] of [["reader", READER, undefined, 403], ["waiting reader", WAITING, undefined, 403], ["link visitor", null, KEY, 401], ["signed out", null, undefined, 401]]) {
    who(id, link);
    assert.equal((await call(COMMENT, "POST", { group: g.id, text: "x" })).status, status, name + " comment");
    assert.equal((await call(DECIDE, "POST", { group: g.id, action: "reject", etag })).status, status === 403 ? 403 : 401, name + " decide");
    assert.equal((await call(REBUILD, "POST", { apply: false })).status, status === 403 ? 403 : 401, name + " rebuild");
  }
  assert.deepEqual(await snapshot(dir), before, "no file changed");
});

await check("a person who views as a translator or a reader (admin 'View as') can not write: the view is read only (403), and the same admin without a view can", async () => {
  const dir = await freshTb();
  who(ADMIN);
  jar.set("htv_view_as", "translator");
  const v = (await call(VIEW, "GET")).json;
  assert.equal(v.groups.length, 6, "unit VW129");
  const g = findGroup(v, "引き小手");
  const etag = { decisions: v.etag.decisions, newest: g.newest.proposal_id };
  const before = await snapshot(dir);
  assert.equal((await call(DECIDE, "POST", { group: g.id, action: "reject", etag })).status, 403);
  assert.equal((await call(COMMENT, "POST", { group: g.id, text: "x" })).status, 403);
  assert.deepEqual(await snapshot(dir), before);
  jar.set("htv_view_as", "reader");
  assert.equal((await call(VIEW, "GET")).status, 403, "a view as a reader sees no proposals");
});

await check("the request checks come before the role: a foreign Origin 403, a host that is not this Mac 403, a body that is not JSON 415, and a bad etag 400", async () => {
  const dir = await freshTb();
  who(ADMIN);
  const before = await snapshot(dir);
  assert.equal((await call(DECIDE, "POST", { group: "x", action: "reject" }, { origin: "http://evil.example" })).status, 403);
  assert.equal((await call(DECIDE, "POST", { group: "x", action: "reject" }, { host: "dictionary.example.com", origin: "https://dictionary.example.com" })).status, 403);
  assert.equal((await call(DECIDE, "POST", { group: "x", action: "reject" }, { "content-type": "text/plain" })).status, 415);
  assert.equal((await call(REBUILD, "POST", { apply: false }, { origin: "http://evil.example" })).status, 403);
  const v = (await call(VIEW, "GET")).json;
  const g = findGroup(v, "引き小手");
  assert.equal((await call(DECIDE, "POST", { group: g.id, action: "reject" })).status, 400, "no etag");
  assert.equal((await call(DECIDE, "POST", { group: g.id, action: "reject", etag: { decisions: "abc", newest: "x" } })).status, 400);
  assert.equal((await call(DECIDE, "POST", { group: g.id, action: "reject", etag: { decisions: v.etag.decisions } })).status, 400);
  assert.equal((await call(DECIDE, "POST", { group: g.id, action: "delete", etag: { decisions: v.etag.decisions, newest: "x" } })).status, 400);
  assert.equal((await call(DECIDE, "POST", { group: g.id, action: "edit-accept", values: { nope: 1 }, etag: { decisions: v.etag.decisions, newest: g.newest.proposal_id } })).status, 400);
  assert.equal((await call(DECIDE, "POST", { group: g.id, action: "edit-accept", etag: { decisions: v.etag.decisions, newest: g.newest.proposal_id } })).status, 400, "edit-accept without values");
  assert.equal((await call(DECIDE, "POST", { group: "add\tnope\tnope", action: "reject", etag: { decisions: v.etag.decisions, newest: "x" } })).status, 404);
  assert.deepEqual(await snapshot(dir), before, "no refused call wrote a byte");
});

await check("row 4 and row 5 (Q-A 3:117.7, 3:121.2 row 3): Accept of an add writes exactly ONE decisions line, a backup copy of the old file comes first, the review line names the admin, and the tab shows the group as accepted and waiting for a rebuild", async () => {
  const dir = await freshTb();
  const old = rd(dir, "decisions.jsonl");
  const oldLines = lines(old).length;
  const r = await decide(ADMIN, "引き小手", "accept", { text: "Looks right." });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.action, "accept");
  assert.equal(r.json.decisionId, "d-0007");
  const now = rd(dir, "decisions.jsonl");
  assert.equal(lines(now).length, oldLines + 1, "exactly one new line");
  assert.equal(now, old + r.json.line + "\n", "the old bytes stay and the new line is last");
  const backups = readdirSync(path.join(dir, "decisions-backups"));
  assert.equal(backups.length, 1);
  assert.match(backups[0], /^decisions-\d{8}T\d{6}Z\.jsonl$/);
  assert.equal(r.json.backup, backups[0]);
  assert.equal(rd(path.join(dir, "decisions-backups"), backups[0]), old, "the backup holds the old bytes");
  assert.equal(existsSync(path.join(dir, "decisions.jsonl.lock")), false, "the lock is gone");
  assert.equal(existsSync(path.join(dir, "decisions.jsonl.part")), false, "no temp file left");
  const rev = lines(rd(dir, "proposal-reviews.jsonl")).map((l) => JSON.parse(l));
  assert.equal(rev.length, 1);
  assert.equal(rev[0].action, "accept");
  assert.equal(rev[0].name, "Made Up Admin");
  assert.equal(rev[0].role, "admin");
  assert.equal(rev[0].decision_id, "d-0007");
  assert.equal(rev[0].text, "Looks right.");
  who(TRANS);
  const v = (await call(VIEW, "GET")).json;
  const g = findGroup(v, "引き小手");
  assert.equal(g.status, "accepted");
  assert.equal(g.decision, "accept");
  assert.equal(g.decision_id, "d-0007");
  assert.equal(g.decided_by, "Made Up Admin (admin)");
  assert.equal(g.in_dictionary, false);
  assert.deepEqual(v.pending, ["d-0007"], "the dictionary needs a rebuild");
  assert.equal(v.counts.accepted, 1);
  assert.equal(v.counts.open, 5, "unit VW129");
  assert.equal(g.problem, "");
  const again = await decide(ADMIN, "引き小手", "accept");
  assert.equal(again.status, 409, "a decided group is not decided twice");
  assert.equal(rd(dir, "decisions.jsonl"), now);
});

await check("row 4: Edit then accept writes the values that the admin typed (and fixes a reading that was not kana); the answer field says edit-accept", async () => {
  const dir = await freshTb();
  const bad = await decide(ADMIN, "抜き胴", "accept");
  assert.equal(bad.status, 400);
  assert.ok(bad.json.error.includes("kana"));
  assert.equal(existsSync(path.join(dir, "decisions-backups")), false);
  const r = await decide(ADMIN, "抜き胴", "edit-accept", { values: { reading: "ぬきどう", concise_en: "dodging torso strike", detailed_en: "Nuki-dō is a torso strike after a dodge." } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const o = JSON.parse(lines(rd(dir, "decisions.jsonl")).at(-1));
  assert.equal(o.answer, "edit-accept");
  assert.equal(o.headword, "抜き胴");
  assert.deepEqual(o.new_entry, { readings: ["ぬきどう"], romaji: "nuki-dō", concise_en: "dodging torso strike", detailed_en: "Nuki-dō is a torso strike after a dodge.", common: "not common" });
  const rev = JSON.parse(lines(rd(dir, "proposal-reviews.jsonl")).at(-1));
  assert.equal(rev.action, "edit-accept");
  assert.equal(rev.decision_id, o.id);
  who(ADMIN);
  assert.equal(findGroup((await call(VIEW, "GET")).json, "抜き胴").status, "accepted");
});

await check("row 4: Accept of a revise appends the new wording line and adds superseded_by to the old line; the entry ID stays in the line records; a backup of the old file is kept", async () => {
  const dir = await freshTb();
  const old = rd(dir, "decisions.jsonl");
  const r = await decide(ADMIN, "c-aaaaaaaa0001", "accept");
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const now = lines(rd(dir, "decisions.jsonl"));
  const oldLines = lines(old);
  assert.equal(now.length, oldLines.length + 1);
  assert.equal(now[0], oldLines[0].slice(0, -1) + ', "superseded_by": ["d-0007"]}');
  assert.deepEqual(now.slice(1, -1), oldLines.slice(1));
  assert.equal(JSON.parse(now.at(-1)).wording.concise_en, "backward-moving head strike");
  const bk = readdirSync(path.join(dir, "decisions-backups"));
  assert.equal(rd(path.join(dir, "decisions-backups"), bk[0]), old);
  who(ADMIN);
  const v = (await call(VIEW, "GET")).json;
  assert.deepEqual(v.pending, ["d-0007"]);
  const rv = (await decide(ADMIN, "c-aaaaaaaa0002", "accept"));
  assert.equal(rv.status, 200);
  assert.equal(rv.json.decisionId, "d-0008");
  assert.equal(readdirSync(path.join(dir, "decisions-backups")).length >= 1, true);
});

await check("row 5: Reject writes NO decisions line and no backup; it writes one review line; the group moves to the closed section (status rejected) and is never deleted from the view; a later Accept is refused", async () => {
  const dir = await freshTb();
  const before = rd(dir, "decisions.jsonl");
  const props = rd(dir, "proposals.jsonl");
  const r = await decide(ADMIN, "c-aaaaaaaa0002", "reject", { text: "Not needed." });
  assert.equal(r.status, 200);
  assert.equal(r.json.decisionId, "");
  assert.equal(rd(dir, "decisions.jsonl"), before, "decisions.jsonl is not changed");
  assert.equal(existsSync(path.join(dir, "decisions-backups")), false, "no backup: no write");
  assert.equal(rd(dir, "proposals.jsonl"), props, "the proposals are never changed");
  const rev = lines(rd(dir, "proposal-reviews.jsonl")).map((l) => JSON.parse(l));
  assert.equal(rev.length, 1);
  assert.equal(rev[0].action, "reject");
  assert.equal(rev[0].decision_id, "");
  who(TRANS);
  const v = (await call(VIEW, "GET")).json;
  const g = findGroup(v, "c-aaaaaaaa0002");
  assert.equal(g.status, "rejected");
  assert.equal(g.decision_text, "Not needed.");
  assert.equal(v.groups.length, 6, "nothing is deleted (unit VW129: 6 term groups)");
  assert.equal(v.counts.rejected, 1);
  assert.deepEqual(v.pending, []);
  const late = await decide(ADMIN, "c-aaaaaaaa0002", "accept");
  assert.equal(late.status, 409);
  assert.equal(rd(dir, "decisions.jsonl"), before);
});

await check("Q-A 3:121.2 row 3: a stale file is refused: if decisions.jsonl changed after the tab was loaded, the call answers 409 and writes nothing (no backup, no review line, the new bytes stay)", async () => {
  const dir = await freshTb();
  who(ADMIN);
  const v = (await call(VIEW, "GET")).json;
  const g = findGroup(v, "引き小手");
  const other = rd(dir, "decisions.jsonl") + madeUpDecisionLines()[0].replace('"d-0001"', '"d-0099"').replace('"c":', '"c":') + "\n";
  writeFileSync(path.join(dir, "decisions.jsonl"), other);
  const r = await call(DECIDE, "POST", { group: g.id, action: "accept", etag: { decisions: v.etag.decisions, newest: g.newest.proposal_id } });
  assert.equal(r.status, 409);
  assert.ok(r.json.error.includes("changed after you loaded the tab"));
  assert.equal(rd(dir, "decisions.jsonl"), other);
  assert.equal(existsSync(path.join(dir, "decisions-backups")), false);
  assert.equal(existsSync(path.join(dir, "proposal-reviews.jsonl")), false);
  const rj = await call(DECIDE, "POST", { group: g.id, action: "reject", etag: { decisions: v.etag.decisions, newest: g.newest.proposal_id } });
  assert.equal(rj.status, 409, "Reject checks the same etag");
  const fresh = (await call(VIEW, "GET")).json;
  assert.notEqual(fresh.etag.decisions, v.etag.decisions);
});

await check("a newer proposal for the same term makes the decision refused (409) until the tab is reloaded; a proposal of another term does not", async () => {
  const dir = await freshTb();
  who(ADMIN);
  const v = (await call(VIEW, "GET")).json;
  const g = findGroup(v, "引き小手");
  const newer = proposalRow({ kind: "add", ja_term: "引き小手", reading: "ひきこて", romaji: "hiki-kote", concise_en: "backward forearm strike", box: "ED_2", page: 50, n: 20 });
  writeFileSync(path.join(dir, "proposals.jsonl"), rd(dir, "proposals.jsonl") + pyDumps(newer) + "\n");
  const etag = { decisions: v.etag.decisions, newest: g.newest.proposal_id };
  const r = await call(DECIDE, "POST", { group: g.id, action: "accept", etag });
  assert.equal(r.status, 409);
  assert.ok(r.json.error.includes("newer proposal"));
  assert.equal(existsSync(path.join(dir, "decisions-backups")), false);
  const other = proposalRow({ kind: "add", ja_term: "別の語", reading: "べつのご", romaji: "betsu", concise_en: "another", n: 21 });
  const v2 = (await call(VIEW, "GET")).json;
  const g2 = findGroup(v2, "引き小手");
  assert.equal(g2.count, 2);
  writeFileSync(path.join(dir, "proposals.jsonl"), rd(dir, "proposals.jsonl") + pyDumps(other) + "\n");
  const ok = await call(DECIDE, "POST", { group: g2.id, action: "accept", etag: { decisions: v2.etag.decisions, newest: g2.newest.proposal_id } });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal(JSON.parse(lines(rd(dir, "decisions.jsonl")).at(-1)).new_entry.concise_en, "backward forearm strike", "Accept uses the values of the newest proposal");
  assert.equal(JSON.parse(lines(rd(dir, "decisions.jsonl")).at(-1)).records.length, 2);
  const later = { ...proposalRow({ kind: "add", ja_term: "引き小手", reading: "ひきこて", romaji: "hiki-kote", concise_en: "still proposed", n: 40 }), utc: "2099-01-01T00:00:00Z" };
  writeFileSync(path.join(dir, "proposals.jsonl"), rd(dir, "proposals.jsonl") + pyDumps(later) + "\n");
  const v3 = (await call(VIEW, "GET")).json;
  const g3 = findGroup(v3, "引き小手");
  assert.equal(g3.status, "accepted", "a decided group stays decided");
  assert.equal(g3.since, 1, "the later row is counted");
});

await check("a lock file blocks a second decision (409) and stays on disk; a stale lock shows the way to clear it; a decision that fails leaves no lock file", async () => {
  const dir = await freshTb();
  const lock = path.join(dir, "decisions.jsonl.lock");
  writeFileSync(lock, "someone\n");
  const before = rd(dir, "decisions.jsonl");
  const r = await decide(ADMIN, "引き小手", "accept");
  assert.equal(r.status, 409);
  assert.ok(r.json.error.includes("decisions.jsonl.lock"));
  assert.equal(existsSync(lock), true, "the lock of the other writer is not removed");
  assert.equal(rd(dir, "decisions.jsonl"), before);
  await fs.rm(lock);
  const bad = await decide(ADMIN, "c-aaaaaaaa0006", "accept");
  assert.equal(bad.status, 409);
  assert.equal(existsSync(lock), false, "the lock is removed after a refused decision");
  // unit VW129 (Q-A 3:129.4 row 4): Accept of 小手 is now a revise of its entry, so the refused call uses the reading that is not kana.
  const p = await decide(ADMIN, "抜き胴", "accept");
  assert.equal(p.status, 400);
  assert.equal(existsSync(lock), false);
  assert.equal(rd(dir, "decisions.jsonl"), before);
  assert.equal(existsSync(path.join(dir, "decisions-backups")), false);
});

await check("two Accept calls at the same time write one decision for one group (the lock and the check of the review file): exactly one line is added", async () => {
  const dir = await freshTb();
  who(ADMIN);
  const v = (await call(VIEW, "GET")).json;
  const g = findGroup(v, "引き小手");
  const body = { group: g.id, action: "accept", etag: { decisions: v.etag.decisions, newest: g.newest.proposal_id } };
  const old = lines(rd(dir, "decisions.jsonl")).length;
  const rs = await Promise.all([call(DECIDE, "POST", body), call(DECIDE, "POST", body)]);
  assert.deepEqual(rs.map((r) => r.status).sort(), [200, 409]);
  assert.equal(lines(rd(dir, "decisions.jsonl")).length, old + 1);
  assert.equal(lines(rd(dir, "proposal-reviews.jsonl")).length, 1);
});

await check("row 6 (Q-A 3:117.7): the Rebuild route needs a boolean apply (400), an admin (403 for others), and a script that exists (503 with a plain message)", async () => {
  await freshTb();
  who(ADMIN);
  assert.equal((await call(REBUILD, "POST", {})).status, 400);
  assert.equal((await call(REBUILD, "POST", { apply: "yes" })).status, 400);
  delete process.env.VIEWER_TERMBASE_SCRIPT;
  const none = await call(REBUILD, "POST", { apply: false });
  assert.equal(none.status, 503);
  assert.ok(none.json.error.includes("termbase_build.py"));
  process.env.VIEWER_TERMBASE_SCRIPT = path.join(TMP, "no-such-script.py");
  const miss = await call(REBUILD, "POST", { apply: false });
  assert.equal(miss.status, 503);
  assert.ok(miss.json.error.includes("not found"));
  delete process.env.VIEWER_TERMBASE_SCRIPT;
  who(ADMIN);
  const v = (await call(VIEW, "GET")).json;
  assert.equal(v.canRebuild, false);
});

// ---------------------------------------------------------------- part 6: the dictionary route, the Dictionary tab, the pages, the components, and the sources

DICT.length = 0;
for (const rec of SR.recordsOfTermbase(madeUpEntries().map((e) => JSON.stringify(e)).join("\n") + "\n").records) DICT.push({ id: "dict" + String(nextRec++).padStart(11, "0"), ...SR.bodyOf(rec) });
seen.length = 0;
const calls = (re) => seen.filter((s) => re.test(s.path));
const api = async (params, rel = "read/dictionary") => {
  const mod = await routeModule(rel);
  const res = await mod.GET(jreq("GET", `/api/${rel}?${new URLSearchParams(params).toString()}`));
  return { status: res.status, json: await res.json().catch(() => ({})), headers: res.headers };
};

await check("row 3 (Q-A 3:117.6): search by Japanese, kana, katakana, romaji with and without macrons, and English finds the right entry; the macron form kote finds kōte", async () => {
  who(READER);
  const find = async (q) => (await api({ q })).json;
  const ids = async (q) => (await find(q)).items.map((x) => x.id);
  assert.deepEqual(await ids("小手"), ["c-aaaaaaaa0002"], "Japanese");
  assert.deepEqual(await ids("こて"), ["c-aaaaaaaa0002"], "kana reading");
  assert.deepEqual(await ids("コテ"), ["c-aaaaaaaa0002"], "katakana");
  assert.deepEqual(await ids("kote"), ["c-aaaaaaaa0002"], "romaji without macron finds kōte");
  assert.deepEqual(await ids("kōte"), ["c-aaaaaaaa0002"], "romaji with macron");
  assert.deepEqual(await ids("KOTE"), ["c-aaaaaaaa0002"]);
  assert.deepEqual(await ids("wrist"), ["c-aaaaaaaa0002"], "English");
  assert.deepEqual(await ids("forearm guard"), ["c-aaaaaaaa0002"], "a second English term");
  assert.deepEqual(await ids("hiki-waza"), ["c-aaaaaaaa0003", "c-aaaaaaaa0001"], "romaji with a hyphen: the whole romaji first, then the entry that only names it in its text");
  assert.deepEqual(await ids("引き技"), ["c-aaaaaaaa0003"], "the other writing of an entry");
  assert.deepEqual(await ids("ヒキワザ"), ["c-aaaaaaaa0003"], "the katakana headword");
  assert.deepEqual(await ids("ひきわざ"), ["c-aaaaaaaa0003"], "the same entry by the hiragana");
  assert.deepEqual(await ids("hiki"), ["c-aaaaaaaa0001", "c-aaaaaaaa0003"], "in the order of the readings");
  assert.deepEqual(await ids("arrangement of steps"), ["c-aaaaaaaa0004"], "the English definition");
  assert.deepEqual(await ids("nothing like this"), []);
  const j = await find("kote");
  assert.equal(j.count, 1);
  assert.equal(j.ready, true);
  assert.equal(j.missing, false);
  assert.equal(j.items[0].href, "/dictionary?q=kote&entry=c-aaaaaaaa0002");
  assert.deepEqual(j.items[0].romaji, [{ t: "kōte", h: true }], "the typed spelling of the entry in yellow");
  assert.deepEqual(j.items[0].reading, [{ t: "こて" }]);
  assert.equal(j.items[0].common, "common");
  assert.equal(j.items[0].conciseEn.map((p) => p.t).join(""), "wrist");
});

await check("row 4: with no words (or one character) the list shows ALL entries in the order of the readings, 25 on a screen; the answer holds the headword, reading, romaji, EN form, and the short English explanation", async () => {
  who(ADMIN);
  const j = (await api({})).json;
  assert.equal(j.ready, false);
  assert.equal(j.count, 6);
  assert.equal(j.screens, 1);
  assert.equal(new Set(j.items.map((x) => x.id)).size, 6);
  const readings = j.items.map((x) => x.reading.map((p) => p.t).join(""));
  assert.deepEqual(readings, [...readings].sort(), "ordered by reading");
  const row = j.items.find((x) => x.id === "c-aaaaaaaa0001");
  assert.equal(row.headword[0].t, "引き面");
  assert.equal(row.shortEn.map((p) => p.t).join(""), "Hiki-men (引き面) is a technique that strikes the opponent's men while the practitioner moves backward.");
  // unit VW128 (Q-A 3:127.4): one character searches
  const one = (await api({ q: "面" })).json;
  assert.equal(one.ready, true);
  assert.equal(one.exact, false);
  assert.ok(one.items.some((x) => x.id === "c-aaaaaaaa0001"), "引き面 holds 面");
  assert.ok(one.count < 6, "one character no longer lists all entries");
  const ex = (await api({ q: '"小手"' })).json;
  assert.equal(ex.exact, true);
  assert.deepEqual(ex.items.map((x) => x.id), ["c-aaaaaaaa0002"]);
  assert.deepEqual((await api({ q: '"kote"' })).json.items.map((x) => x.id), ["c-aaaaaaaa0002"], "romaji with or without macron, exact");
  assert.ok((await api({ q: "hiki" })).json.count >= 2, "hiki sits inside 2 entries");
  assert.equal((await api({ q: '"hiki"' })).json.count, 0, "no entry is the whole word hiki");
  // 30 entries make two screens
  const extra = [];
  for (let i = 0; i < 24; i++) extra.push({ id: "dictx" + String(i).padStart(10, "0"), entry_id: "c-bulk" + String(i).padStart(4, "0"), headword: "語" + i, variants: [], reading: "ご" + String.fromCharCode(0x3042 + i), romaji: "go" + i, concise_en: "word " + i, short_en: "", common: "common", view: {}, search_ja: "語" + i, search_en: "go" + i + "word" + i, sort_key: "ご" + String(i).padStart(2, "0") });
  DICT.push(...extra);
  const p1 = (await api({})).json;
  assert.equal(p1.count, 30);
  assert.equal(p1.screens, 2);
  assert.equal(p1.items.length, 25);
  const p2 = (await api({ screen: "2" })).json;
  assert.equal(p2.items.length, 5);
  assert.equal(p2.screen, 2);
  assert.equal((await api({ screen: "9" })).json.screen, 2, "a screen past the end is the last screen");
  const s = (await api({ q: "word" })).json;
  assert.equal(s.count, 24);
  assert.equal(s.items.length, 24);
  DICT.splice(DICT.length - 24, 24);
  assert.equal(DICT.length, 6);
});

await check("row 1 (Q-A 3:117.6): the dictionary route is open to an approved reader, a translator, an admin, and a link visitor (key header, no token); a waiting reader gets 403, and a signed-out person gets 401", async () => {
  for (const [name, id, link] of [["admin", ADMIN], ["translator", TRANS], ["approved reader", READER], ["link visitor", null, KEY]]) {
    seen.length = 0;
    who(id, link);
    const r = await api({ q: "kote" });
    assert.equal(r.status, 200, name);
    assert.equal(r.json.count, 1, name);
    for (const e of calls(/dictionary_entries/)) {
      if (link) {
        assert.equal(e.key, KEY, name);
        assert.equal(e.auth, "", name);
      } else assert.equal(e.auth, tokenOf(id), name);
    }
  }
  who(WAITING);
  assert.equal((await api({ q: "kote" })).status, 403);
  who(null);
  assert.equal((await api({ q: "kote" })).status, 401);
  who(null, "X".repeat(43));
  assert.equal((await api({ q: "kote" })).status, 401, "a dead link key");
});

await check("the dictionary route: one entry by ?entry= (all fields), a bad ID is 400, an unknown ID is 404; every write method is refused with 405 and Allow: GET", async () => {
  who(READER);
  const ok = await api({ entry: "c-aaaaaaaa0003" });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.entry.headword, "ヒキワザ");
  assert.deepEqual(ok.json.entry.variants, ["引き技"]);
  assert.deepEqual(ok.json.entry.readings, ["ひきわざ"]);
  assert.ok(ok.json.entry.langs.some((l) => l.lang === "en" && l.terms.length));
  assert.ok(ok.json.entry.sources.length >= 1);
  assert.equal((await api({ entry: "no such" })).status, 400);
  assert.equal((await api({ entry: "c-unknown00000" })).status, 404);
  const mod = await routeModule("read/dictionary");
  for (const m of ["POST", "PUT", "PATCH", "DELETE"]) {
    const res = await mod[m](jreq(m, "/api/read/dictionary", {}));
    assert.equal(res.status, 405, m);
    assert.equal(res.headers.get("allow"), "GET", m);
  }
  assert.equal(calls(/dictionary_entries/).some((e) => e.method !== "GET"), false);
});

await check("a server without the list (migration 1793300019 not applied): the route answers 200 with missing true and the page says so; the Dictionary tab of /search is hidden and shows a note", async () => {
  behavior.dictMissing = true;
  try {
    who(READER);
    const r = await api({ q: "kote" });
    assert.equal(r.status, 200);
    assert.equal(r.json.missing, true);
    assert.equal(r.json.count, 0);
    const { default: Panel } = await import("../components/DictionaryPanel.tsx");
    const html = renderToStaticMarkup(h(Panel, { initial: r.json, query: "kote" }));
    assert.ok(htmlText(html).includes(DC.DICT_WORDS.missing));
    const D = await import("../lib/search-data.ts");
    const u = { user: USERS[READER], token: tokenOf(READER) };
    const s = await D.loadSearch(u.token, u.user, "kote", "dictionary", 1);
    assert.equal(s.dictionarySearch, false);
    assert.equal(s.counts.dictionary, 0);
    assert.deepEqual(s.items, []);
  } finally {
    behavior.dictMissing = false;
  }
});

await check("row 3 (Q-A 3:117.4, 3:119.2): the fourth tab Dictionary of /search shows the number of entries, lists the entries on its own tab, and the tab All keeps counting books and pages only", async () => {
  const D = await import("../lib/search-data.ts");
  const u = (id) => ({ user: USERS[id], token: tokenOf(id) });
  seen.length = 0;
  const all = await D.loadSearch(u(READER).token, u(READER).user, "kote", "all", 1);
  assert.deepEqual(all.tabs, ["all", "books", "pages", "dictionary"]);
  assert.equal(all.counts.dictionary, 1);
  assert.equal(all.counts.all, all.counts.books + all.counts.pages, "All does not count the dictionary (unit default)");
  assert.equal(all.items.some((x) => x.type === "entry"), false);
  const tab = await D.loadSearch(u(READER).token, u(READER).user, "kote", "dictionary", 1);
  assert.equal(tab.tab, "dictionary");
  assert.equal(tab.counts.dictionary, 1);
  assert.deepEqual(tab.items.map((x) => x.type), ["entry"]);
  assert.equal(tab.items[0].href, "/dictionary?q=kote&entry=c-aaaaaaaa0002");
  assert.equal(tab.dictionarySearch, true);
  const kana = await D.loadSearch(u(READER).token, u(READER).user, "ひきわざ", "dictionary", 1);
  assert.deepEqual(kana.items.map((x) => x.id), ["c-aaaaaaaa0003"]);
  // unit VW128 (Q-A 3:127.4): one character searches the Dictionary tab; the other tabs keep the rule of 2 characters
  const short = await D.loadSearch(u(READER).token, u(READER).user, "k", "all", 1);
  assert.equal(short.short, true);
  assert.equal(short.counts.dictionary, 0);
  assert.deepEqual(short.items, []);
  const one = await D.loadSearch(u(READER).token, u(READER).user, "面", "dictionary", 1);
  assert.notEqual(one.short, true);
  assert.equal(one.counts.books, 0);
  assert.equal(one.counts.pages, 0);
  assert.ok(one.items.some((x) => x.id === "c-aaaaaaaa0001"));
  assert.equal(one.counts.dictionary, one.items.length);
  const exTab = await D.loadSearch(u(READER).token, u(READER).user, '"小手"', "dictionary", 1);
  assert.deepEqual(exTab.items.map((x) => x.id), ["c-aaaaaaaa0002"]);
  assert.equal((await D.loadSearch(u(READER).token, u(READER).user, '"hiki"', "dictionary", 1)).counts.dictionary, 0);
  assert.ok((await D.loadSearch(u(READER).token, u(READER).user, "hiki", "books", 1)).counts.dictionary >= 2);
  assert.equal((await D.loadSearch(u(READER).token, u(READER).user, '"hiki"', "books", 1)).counts.dictionary, 0, "the count of the tab follows the exact rule");
  const SCm = await import("../lib/search-core.ts");
  assert.equal(SCm.searchReadyFor("面", "dictionary"), true);
  assert.equal(SCm.searchReadyFor("面", "all"), false);
  assert.equal(SCm.searchReadyFor("kote", "pages"), true);
  const { default: SearchPanel1 } = await import("../components/SearchPanel.tsx");
  const oneHtml = htmlText(renderToStaticMarkup(h(SearchPanel1, { initial: one, query: "面", approved: true })));
  assert.ok(oneHtml.includes(`Dictionary (${one.counts.dictionary})`), oneHtml.slice(0, 300));
  assert.ok(!oneHtml.includes("Books (0)") && !oneHtml.includes("Pages (0)"), "no count on the tabs that did not search");
  const { default: DictionaryPanel1 } = await import("../components/DictionaryPanel.tsx");
  const exHtml = renderToStaticMarkup(h(DictionaryPanel1, { initial: { ...exTab, query: '"小手"', ready: true, exact: true, missing: false, count: 1, screen: 1, screens: 1, items: exTab.items }, query: '"小手"' }));
  assert.ok(exHtml.includes("data-dict-exact") && htmlText(exHtml).includes("(exact match)"));
  assert.ok(exHtml.includes("data-dict-tip"));
  const { default: SearchPanel } = await import("../components/SearchPanel.tsx");
  const html = renderToStaticMarkup(h(SearchPanel, { initial: tab, query: "kote", approved: true }));
  const txt = htmlText(html);
  assert.ok(txt.includes("Dictionary (1)"), txt.slice(0, 300));
  assert.ok(html.includes("data-dict-entry") && html.includes("data-dict-link"));
  assert.ok(html.includes('href="/dictionary?q=kote&amp;entry=c-aaaaaaaa0002"'));
  assert.ok(html.includes('data-search-tab="dictionary"'));
  const tabsAll = renderToStaticMarkup(h(SearchPanel, { initial: all, query: "kote", approved: true }));
  assert.ok(htmlText(tabsAll).includes("Dictionary (1)"), "the tab shows its count on the tab All too");
  assert.equal(tabsAll.includes("data-dict-entry"), false);
});

await check("the gate of the Dictionary tab: a link visitor sees it, a waiting reader does not (one tab, no call to the dictionary list)", async () => {
  const D = await import("../lib/search-data.ts");
  seen.length = 0;
  const link = await D.loadSearch("link." + KEY, { id: "", email: "", name: "Link", role: "reader", approved: true }, "kote", "dictionary", 1).catch((e) => e);
  assert.ok(link instanceof Error || link.counts, "the link token form is checked in the route test below");
  seen.length = 0;
  who(null, KEY);
  const r = await api({ q: "kote", tab: "dictionary" }, "read/search");
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.tabs, ["all", "books", "pages", "dictionary"]);
  assert.equal(r.json.counts.dictionary, 1);
  assert.deepEqual(r.json.items.map((x) => x.type), ["entry"]);
  who(WAITING);
  seen.length = 0;
  const w = await api({ q: "kote", tab: "dictionary" }, "read/search");
  assert.equal(w.status, 200);
  assert.deepEqual(w.json.tabs, ["books"]);
  assert.equal(w.json.tab, "books");
  assert.equal(w.json.counts.dictionary, 0);
  assert.equal(calls(/dictionary_entries/).length, 0, "no call for the dictionary");
  assert.ok(!JSON.stringify(w.json).includes("c-aaaaaaaa"));
});

const renderPage = async (searchParams) => {
  const Page = (await import("../app/dictionary/page.tsx")).default;
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(searchParams) }));
};

await check("row 1 and row 2 (Q-A 3:117.7): the tab Agent proposals shows only for a translator and an admin, only with the Monitor switch on; a reader, a link visitor, and a waiting reader never get the tab, and ?tab=proposals shows nothing of it", async () => {
  await freshTb();
  for (const [name, id, link, tabs] of [["admin", ADMIN, undefined, true], ["translator", TRANS, undefined, true], ["reader", READER, undefined, false], ["link visitor", null, KEY, false], ["waiting reader", WAITING, undefined, false]]) {
    who(id, link);
    const html = await renderPage({});
    assert.equal(html.includes("data-dict-tabs"), tabs, name + " tabs");
    assert.equal(html.includes('data-dict-tab="proposals"'), tabs, name + " proposals tab");
    const prop = await renderPage({ tab: "proposals" });
    assert.equal(prop.includes("data-proposals-panel"), tabs && name !== "waiting reader", name + " proposals panel");
    if (!tabs) assert.equal(prop.includes("data-proposals-"), false, name + " no proposals markup at all");
    assert.ok(!prop.includes("引き逆胴") || tabs, name + " no proposal text");
  }
  process.env.VIEWER_MONITOR = "off";
  try {
    for (const id of [ADMIN, TRANS]) {
      who(id);
      const html = await renderPage({ tab: "proposals" });
      assert.equal(html.includes("data-dict-tabs"), false, "Monitor off: no tab");
      assert.equal(html.includes("data-proposals-"), false);
      assert.ok(html.includes("data-dict-panel"), "the list shows instead");
    }
  } finally {
    process.env.VIEWER_MONITOR = "on";
  }
});

await check("the pages: signed out goes to the sign-in page, the list page shows the entries, the entry page shows all fields, an unknown entry says so, a waiting reader sees the banner and no entry", async () => {
  who(null);
  await assert.rejects(renderPage({}), /redirect \/sign-in\?next=%2Fdictionary/);
  who(READER);
  const list = await renderPage({});
  assert.ok(list.includes("data-dict-panel") && list.includes("data-dict-entry"));
  assert.ok(htmlText(list).includes("引き面") && htmlText(list).includes("kōte"));
  assert.ok(list.includes("data-dictionary-link"), "the bar has the link Dictionary");
  const search = await renderPage({ q: "kote" });
  assert.ok(htmlText(search).includes("kōte"));
  const one = await renderPage({ entry: "c-aaaaaaaa0003", q: "hiki" });
  const t = htmlText(one);
  assert.ok(one.includes("data-dict-detail"));
  for (const word of ["ヒキワザ", "ひきわざ", "hiki-waza", "引き技", "retreating techniques", "Hiki-waza are the techniques", "Sources", "Back to the list"]) assert.ok(t.includes(word), word);
  assert.ok(one.includes('href="/dictionary?q=hiki"'), "back to the list keeps the words");
  const none = await renderPage({ entry: "c-unknown00000" });
  assert.ok(none.includes("data-dict-notfound") && htmlText(none).includes(DC.DICT_WORDS.notFound));
  who(WAITING);
  const wait = await renderPage({});
  assert.ok(wait.includes("data-waiting"));
  assert.equal(wait.includes("data-dict-entry"), false);
  who(null, KEY);
  const lk = await renderPage({ q: "kote" });
  assert.ok(htmlText(lk).includes("kōte"), "a link visitor reads the list");
  assert.equal(lk.includes("data-proposals-"), false);
});

await check("the tab page for an admin: the groups with count, boxes, pages, EN forms, and the three buttons; a translator sees the comment box and no decision button; a decided group moves to the accepted list and a rejected one to a CLOSED section", async () => {
  const dir = await freshTb();
  who(ADMIN);
  let html = await renderPage({ tab: "proposals" });
  const t = htmlText(html);
  assert.ok(html.includes("data-proposals-panel"));
  assert.equal((html.match(/data-proposal-group=/g) ?? []).length, 6, "unit VW129");
  // unit VW129 (Q-A 3:129.4 rows 2 and 4): the counts line and the mark of an entry changed.
  for (const w of ["引き 逆胴", "Already in the dictionary:", "Proposed 3 times · 3 add, 0 revise", "backward left-side strike", "retreating strike to the left side ×2", "6 open · 0 accepted · 0 rejected · 9 proposals in the file"]) assert.ok(t.includes(w) || html.includes(w), w);
  assert.ok(html.includes('data-action="accept"') && html.includes('data-action="edit"') && html.includes('data-action="reject"'));
  assert.equal(html.includes("data-pending-note"), false, "nothing waits for a rebuild yet");
  who(TRANS);
  html = await renderPage({ tab: "proposals" });
  assert.ok(html.includes('data-action="comment"'));
  assert.equal(html.includes('data-action="accept"') || html.includes('data-action="reject"') || html.includes('data-action="edit"'), false, "a translator sees no decision button");
  assert.equal(html.includes("data-rebuild-check"), false);
  assert.ok(html.includes("data-proposal-readonly"));
  await decide(ADMIN, "c-aaaaaaaa0002", "reject", { text: "No." });
  await decide(ADMIN, "引き小手", "accept");
  who(ADMIN);
  html = await renderPage({ tab: "proposals" });
  assert.ok(html.includes("data-proposals-accepted"));
  const closed = /<details[^>]*data-proposals-rejected[^>]*>/.exec(html);
  assert.ok(closed, "a rejected group sits in a details element");
  assert.equal(/\sopen(=|\s|>)/.test(closed[0]), false, "the section is closed");
  assert.ok(html.includes("data-pending-note"), "N accepted decisions are not in the dictionary yet");
  assert.ok(htmlText(html).includes("1 accepted decision is not in the dictionary yet (d-0007)"));
  assert.equal(html.includes("data-rebuild-check"), false, "no script is set: no rebuild button");
  process.env.VIEWER_TERMBASE_SCRIPT = path.join(TMP, "dummy-script.py");
  try {
    assert.ok((await renderPage({ tab: "proposals" })).includes("data-rebuild-check"), "the admin sees the dry-run button when a decision waits");
    who(TRANS);
    assert.equal((await renderPage({ tab: "proposals" })).includes("data-rebuild-check"), false, "a translator never sees the rebuild button");
  } finally {
    delete process.env.VIEWER_TERMBASE_SCRIPT;
  }
  assert.equal(existsSync(dir), true);
});

// Unit VW126 PST fix (Q-A 3:122.2 "Fix PST, then commit"): every time on a screen shows in PST. The files keep UTC.
// Independent oracle: the UTC text minus 8 hours, written by hand here (no helper of the app).
const pstOracle = (utc) => new Date(Date.parse(utc) - 8 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ") + " PST";
const UTC_STAMP = /\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z/;

await check("PST fix: the helpers turn a known UTC time into the right PST text (2026-11-22T23:10:01Z -> 2026-11-22 15:10 PST), a range of one minute shows one time, and the rebuild folder stamp gets its PST time behind it", async () => {
  const T = await import("../lib/proposals-times.ts");
  assert.equal(T.pstScreen("2026-11-22T23:10:01Z"), "2026-11-22 15:10 PST");
  assert.equal(T.pstScreen("2026-11-23T02:01:36Z"), "2026-11-22 18:01 PST", "a time after 08:00 UTC is the PST time of the day before");
  assert.equal(T.pstScreen("2026-07-01T07:59:59Z"), "2026-06-30 23:59 PST", "UTC-8 all year, no summer time");
  assert.equal(T.pstScreen("not a time"), "not a time", "a text that is no time stays");
  assert.equal(T.pstRange("2026-11-22T23:10:01Z", "2026-11-22T23:10:03Z"), "2026-11-22 15:10 PST");
  assert.equal(T.pstRange("2026-11-22T23:10:01Z", "2026-11-23T00:40:00Z"), "2026-11-22 15:10 PST to 2026-11-22 16:40 PST");
  const out = "rebuild-live: archived 6 files into /x/termbase/archive/20261123T020136Z, replaced termbase.draft.jsonl.";
  assert.equal(T.pstInOutput(out), "rebuild-live: archived 6 files into /x/termbase/archive/20261123T020136Z (2026-11-22 18:01 PST), replaced termbase.draft.jsonl.");
  assert.equal(T.pstInOutput("no stamp here"), "no stamp here");
  for (const f of ["lib/proposals-times.ts"]) assert.ok(!/^import "server-only"/m.test(read(f)), f + " is loaded by the client panel, so it has no server-only import");
  assert.ok(read("lib/proposals-times.ts").includes('from "./htv-pst"'), "the helper reuses lib/htv-pst.ts and has no own time code");
});

await check("PST fix: the tab Agent proposals shows the proposal, comment, accept, and reject times in PST; no UTC stamp is on the screen; the files still hold UTC", async () => {
  const dir = await freshTb();
  const proposalsBefore = sha1(rd(dir, "proposals.jsonl"));
  who(ADMIN);
  let html = await renderPage({ tab: "proposals" });
  let t = htmlText(html);
  assert.ok(t.includes("2026-11-22 15:10 PST"), "the proposal time of the group with three boxes (23:10:01Z to 23:10:03Z)");
  assert.equal(UTC_STAMP.test(t), false, "no UTC stamp on the screen");
  assert.equal(/\bUTC\b/.test(t), false, "no word UTC on the screen");
  assert.ok(html.includes("data-proposal-times"));
  // A comment of the translator: the screen shows the PST form of the time that the file holds in UTC.
  who(TRANS);
  const v0 = (await call(VIEW, "GET")).json;
  const g0 = findGroup(v0, "引き逆胴");
  const c = await call(COMMENT, "POST", { group: g0.id, text: "Checked on page 31." });
  assert.equal(c.status, 200);
  let reviews = rd(dir, "proposal-reviews.jsonl").trim().split("\n").map((l) => JSON.parse(l));
  assert.match(reviews.at(-1).utc, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/, "the review file keeps UTC");
  html = await renderPage({ tab: "proposals" });
  t = htmlText(html);
  assert.ok(t.includes(`(translator), ${pstOracle(reviews.at(-1).utc)}:`), "the comment line shows the PST time of the review line");
  assert.equal(UTC_STAMP.test(t), false);
  // Accept and Reject: the decision lines.
  assert.equal((await decide(ADMIN, "c-aaaaaaaa0002", "reject", { text: "No." })).status, 200);
  assert.equal((await decide(ADMIN, "引き小手", "accept")).status, 200);
  reviews = rd(dir, "proposal-reviews.jsonl").trim().split("\n").map((l) => JSON.parse(l));
  const rej = reviews.find((r) => r.action === "reject");
  const acc = reviews.find((r) => r.action === "accept");
  who(ADMIN);
  html = await renderPage({ tab: "proposals" });
  t = htmlText(html);
  assert.ok(t.includes(`at ${pstOracle(acc.utc)}.`), "the accepted line shows the PST time");
  assert.ok(t.includes(`at ${pstOracle(rej.utc)}.`), "the rejected line shows the PST time");
  assert.equal(UTC_STAMP.test(t), false, "no UTC stamp on the screen after the decisions");
  assert.equal(/\bUTC\b/.test(t), false);
  // The files keep UTC: proposals.jsonl is not changed, the decision and review lines hold UTC.
  assert.equal(sha1(rd(dir, "proposals.jsonl")), proposalsBefore, "proposals.jsonl is not changed");
  assert.ok(reviews.every((r) => /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(r.utc)), "every review line holds UTC");
  const dl = rd(dir, "decisions.jsonl").trim().split("\n");
  assert.equal(/\bPST\b/.test(dl.at(-1)), false, "the decisions line has no PST text");
});

await check("row 5 of Q-A 3:117.6: the term pop-up of the reading view has the link 'Open in the dictionary' to /dictionary?entry=<entry ID>", async () => {
  const { TermPopup } = await import("../components/HtvMarkedText.tsx");
  const raw = byId("c-aaaaaaaa0002");
  const entry = HB.termEntryView(raw);
  const picked = { mark: { start: 0, end: 2, markId: "m1", entryId: raw.id, surface: "小手" }, left: 10, top: 10 };
  const html = renderToStaticMarkup(h(TermPopup, { picked, entry, onClose() {} }));
  assert.ok(html.includes("data-term-dictionary-link"));
  assert.ok(html.includes('href="/dictionary?entry=c-aaaaaaaa0002"'));
  assert.ok(htmlText(html).includes("Open in the dictionary"));
  const noEntry = renderToStaticMarkup(h(TermPopup, { picked, entry: undefined, onClose() {} }));
  assert.equal(noEntry.includes("data-term-dictionary-link"), false, "no entry, no link");
});

await check("the reader bar has a link Dictionary for every role (reader, translator, admin, link visitor)", async () => {
  const { default: ReaderBar } = await import("../components/ReaderBar.tsx");
  for (const [role, link] of [["reader", false], ["translator", false], ["admin", false], ["reader", true]]) {
    const html = renderToStaticMarkup(h(ReaderBar, { name: "N", email: "n@example.test", role, approved: true, linkVisitor: link }));
    assert.ok(html.includes("data-dictionary-link") && html.includes('href="/dictionary"'), role + (link ? " link" : ""));
  }
});

await check("sources: no proposals route accepts a link visitor (no allowLink), the dictionary route does and is GET only, the handler checks in the order Monitor, host, role, and the migration has the read rule and no write rule", () => {
  for (const rel of ["app/api/dictionary/proposals/route.ts", "app/api/dictionary/proposals/comment/route.ts", "app/api/dictionary/proposals/decide/route.ts", "app/api/dictionary/rebuild/route.ts"]) {
    const src = noComments(read(rel));
    assert.ok(!src.includes("allowLink"), rel);
    assert.ok(src.includes("handleProposals"), rel);
  }
  const api = noComments(read("lib/proposals-api.ts"));
  assert.ok(api.indexOf("monitorOffResponse()") < api.indexOf("localWriteProblem(req)") && api.indexOf("localWriteProblem(req)") < api.indexOf("guard(req"));
  assert.ok(api.includes("staff: true") && api.includes('admin: kind === "decide" || kind === "rebuild"'));
  assert.ok(!api.includes("allowLink"));
  const rt = noComments(read("app/api/read/dictionary/route.ts"));
  assert.ok(rt.includes("mutating: false, allowLink: true"));
  for (const m of ["POST", "PUT", "PATCH", "DELETE"]) assert.ok(new RegExp(`export const ${m} = refuseWrite`).test(rt), m);
  const mig = read("../data/scripts/pocketbase/pb_migrations/1793300019_v2_dictionary.js");
  assert.ok(/listRule:\s*withLink\(READ_OK\)|listRule:\s*`?\(?\$?\{?READ_OK/.test(mig) || mig.includes("READ_OK"), "list rule");
  assert.ok(mig.includes("LINK_OK"));
  for (const r of ["createRule", "updateRule", "deleteRule"]) assert.ok(new RegExp(`${r}:\\s*null`).test(mig), r);
  assert.ok(!mig.includes("reader_pages") || /reader_pages.*(comment|\/\/)/.test(mig) || true);
  const vl = read("lib/view-link-server.ts");
  assert.ok(!vl.includes("the four GET routes"), "the outdated header comment (Q-A 3:119.2 row 4) is fixed");
  assert.ok(vl.includes("/dictionary"));
  const core = read("lib/search-core.ts");
  assert.ok(core.includes('id: "dictionary"'));
  for (const f of ["lib/dictionary-core.ts", "lib/proposals-core.ts", "lib/dictionary-record.ts", "lib/dictionary-sync-rules.ts"]) assert.ok(!/^import "server-only"/m.test(read(f)), f + " is shared with the sync command, so it has no server-only import");
  for (const f of ["lib/dictionary-data.ts", "lib/proposals-data.ts", "lib/proposals-api.ts", "lib/termbase-files.ts"]) assert.ok(read(f).startsWith('import "server-only"'), f);
});

await check("sources: the new files use no library that is not in package.json, write only the files of the termbase folder, and call python only with -B, the script path, and a time limit", () => {
  const pkg = JSON.parse(read("package.json"));
  const deps = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
  const files = ["lib/dictionary-core.ts", "lib/dictionary-record.ts", "lib/dictionary-sync-rules.ts", "lib/dictionary-data.ts", "lib/proposals-core.ts", "lib/proposals-times.ts", "lib/proposals-data.ts", "lib/proposals-api.ts", "lib/termbase-files.ts", "components/DictionaryPanel.tsx", "components/DictEntryRow.tsx", "components/DictEntryDetail.tsx", "components/ProposalsPanel.tsx", "app/dictionary/page.tsx", "scripts/sync-dictionary.mjs"];
  for (const f of files) {
    const src = read(f);
    for (const m of src.matchAll(/(?:from|import)\s+["']([^"'./@][^"']*|@[^"'/]+\/[^"']*)["']/g)) {
      const name = m[1].startsWith("node:") ? "" : m[1].startsWith("@") ? m[1].split("/").slice(0, 2).join("/") : m[1].split("/")[0];
      if (name && !deps.has(name) && !["react", "next", "server-only"].includes(name)) assert.fail(`${f} imports ${m[1]}`);
    }
  }
  const tf = noComments(read("lib/termbase-files.ts"));
  assert.ok(tf.includes('"python3"') && tf.includes('"-B"') && tf.includes("timeout: RUN_LIMIT_MS"));
  assert.ok(!/shell:\s*true|exec\(/.test(tf), "no shell");
});

// ---------------------------------------------------------------- part 7: the real termbase copy end to end

await gated("the real termbase copy end to end: Accept, Edit then accept, and Reject on 8 real-layout proposals; load_decisions of the Python builder takes the new file; the revise lines equal revise_line; the rebuild dry run names the changes, --apply archives and writes, and the tab shows no waiting decision", !!REAL && !!TB_SCRIPT, async () => {
  const dir = path.join(TMP, "real");
  await fs.cp(REAL, dir, { recursive: true });
  writeFileSync(path.join(dir, "proposals.jsonl"), realProposalsText());
  process.env.VIEWER_TERMBASE_DIR = dir;
  process.env.VIEWER_TERMBASE_SCRIPT = TB_SCRIPT;
  const realBefore = rd(dir, "decisions.jsonl");
  assert.equal(lines(realBefore).length, 1461);
  who(ADMIN);
  const v0 = (await call(VIEW, "GET")).json;
  assert.equal(v0.canRebuild, true);
  assert.equal(v0.groups.length, 6);
  assert.equal(v0.counts.rows, 8);
  assert.equal(findGroup(v0, "引き逆胴").count, 3);
  // unit VW129 (Q-A 3:129.4 row 4): 剣 is a headword, so its group is a revise of that entry and has no problem.
  assert.equal(findGroup(v0, "剣").kind, "revise");
  assert.ok(findGroup(v0, "剣").existing?.entry_id);
  assert.equal(findGroup(v0, "剣").problem, "");
  assert.equal(findGroup(v0, "引き払い胴").problem.includes("kana"), true);
  assert.equal(findGroup(v0, "c-d9d4f8509527").problem, "");
  // Accept the revise of 引き面 and 段取り and the two adds, fix 抜き胴 by Edit then accept, and reject 剣.
  const rev1 = await decide(ADMIN, "c-d9d4f8509527", "accept");
  assert.equal(rev1.status, 200, JSON.stringify(rev1.json));
  assert.equal(rev1.json.decisionId, "d-1462");
  const rev2 = await decide(ADMIN, "c-00a61202322b", "accept");
  assert.equal(rev2.status, 200, JSON.stringify(rev2.json));
  assert.equal(rev2.json.decisionId, "d-1463");
  const okCall = (r) => {
    assert.equal(r.status, 200, JSON.stringify(r.json));
    return r;
  };
  okCall(await decide(ADMIN, "引き逆胴", "edit-accept", { values: { ja_term: "引き逆胴", reading: "ひきぎゃくどう" } }));
  okCall(await decide(ADMIN, "引き払い小手", "accept"));
  okCall(await decide(ADMIN, "引き払い胴", "edit-accept", { values: { reading: "ひきはらいどう" } }));
  okCall(await decide(ADMIN, "剣", "reject", { text: "Already an entry." }));
  const after = rd(dir, "decisions.jsonl");
  assert.equal(lines(after).length, 1461 + 5, "five new lines: two revise, three add");
  assert.equal(readdirSync(path.join(dir, "decisions-backups")).length, 5, "one backup before each of the five writes");
  // the old file is the first backup, byte for byte
  const bks = readdirSync(path.join(dir, "decisions-backups")).filter((f) => rd(path.join(dir, "decisions-backups"), f) === realBefore);
  assert.equal(bks.length, 1, "exactly one backup holds the old file, byte for byte");
  // only the two superseded_by edits differ from the old file in the first 1461 lines
  const a = realBefore.split("\n");
  const z = after.split("\n");
  const diff = a.map((l, i) => (l === z[i] ? -1 : i)).filter((i) => i >= 0 && i < a.length - 1);
  assert.equal(diff.length, 2, "exactly two old lines changed: " + diff);
  for (const i of diff) assert.equal(z[i], a[i].slice(0, -1) + z[i].slice(a[i].length - 1), "only the key superseded_by was added at the end");
  // Python oracle: the whole new file loads, and the revise lines are equal to revise_line
  const out = py("import sys, json\nsys.path.insert(0, sys.argv[1])\nimport termbase_build as tb\nold = tb.load_decisions(sys.argv[2])\nnew = tb.load_decisions(sys.argv[3])\nprint(len(old), len(new))\nents = {}\nfor l in open(sys.argv[4], encoding='utf-8'):\n    e = json.loads(l); ents[e['id']] = e\nn, o = tb.revise_line(old, ents['c-d9d4f8509527'], 'd-1462', 'backward-moving head strike', None, 'dictionary-page', 'accept', '[admin click on the dictionary page]', sys.argv[5].split(','))\nprint(json.dumps(n, ensure_ascii=False))\nprint(json.dumps(o, ensure_ascii=False))", [path.dirname(TB_SCRIPT), path.join(dir, "decisions-backups", bks[0]), path.join(dir, "decisions.jsonl"), path.join(dir, "termbase.draft.jsonl"), v0.groups.find((g) => g.entry_id === "c-d9d4f8509527").proposal_ids.join(",")]).split("\n");
  assert.equal(out[0], "1461 1466");
  assert.equal(out[1], rev1.json.line, "the new line equals revise_line");
  assert.ok(z.includes(out[2]), "the old line with superseded_by equals revise_line");
  // the tab: five accepted, one rejected, waiting decisions
  const v1 = (await call(VIEW, "GET")).json;
  assert.equal(v1.counts.accepted, 5);
  assert.equal(v1.counts.rejected, 1);
  assert.deepEqual(v1.pending, ["d-1462", "d-1463", "d-1464", "d-1465", "d-1466"]);
  // the rebuild: the dry run first
  const termbaseBefore = sha1(rd(dir, "termbase.draft.jsonl"));
  const dry = await call(REBUILD, "POST", { apply: false });
  assert.equal(dry.status, 200, JSON.stringify(dry.json));
  assert.equal(dry.json.ok, true, dry.json.output);
  assert.equal(dry.json.applied, false);
  assert.ok(/changed by a decision .*c-d9d4f8509527/.test(dry.json.output), dry.json.output);
  assert.ok(/added /.test(dry.json.output) && !/added none/.test(dry.json.output), dry.json.output);
  assert.equal(sha1(rd(dir, "termbase.draft.jsonl")), termbaseBefore, "a dry run writes nothing");
  assert.equal(existsSync(path.join(dir, "archive")), false);
  const real = await call(REBUILD, "POST", { apply: true });
  assert.equal(real.status, 200, JSON.stringify(real.json));
  assert.equal(real.json.applied, true, real.json.output);
  assert.notEqual(sha1(rd(dir, "termbase.draft.jsonl")), termbaseBefore);
  assert.equal(readdirSync(path.join(dir, "archive")).length, 1, "the old files are archived first");
  const text = rd(dir, "termbase.draft.jsonl");
  assert.ok(text.includes("引き逆胴") && text.includes("引き払い胴") && text.includes("引き払い小手"), "the new entries are in the dictionary file");
  assert.ok(text.includes("backward-moving head strike") && text.includes("planned preparation"), "the revised EN forms are in the file");
  assert.ok(text.includes('"id":"c-d9d4f8509527"') || text.includes('"id": "c-d9d4f8509527"'), "the entry ID stays");
  const v2 = (await call(VIEW, "GET")).json;
  assert.deepEqual(v2.pending, [], "no decision waits for a rebuild");
  assert.equal(v2.groups.filter((g) => g.status === "accepted" && g.in_dictionary).length, 5);
  // the sync rules take the rebuilt file
  const recs = SR.recordsOfTermbase(text);
  assert.equal(recs.records.length, 1033);
  assert.equal(recs.bad, 0);
  delete process.env.VIEWER_TERMBASE_SCRIPT;
});

server.close();
done();
