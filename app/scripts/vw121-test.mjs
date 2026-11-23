// VW121 (round 112, card P60.1): server-free tests of the visual issues that are saved as files on this Mac (Q-A 3:112.2 rows 1 to 6, Q-A 3:110.2).
// Owner words (Q-A 3:109.5, 2026-11-21): "+ Where is the visual issue button in http://localhost:3000/? + Every page should have it".
//   part 1  lib/visual-issues-local-rules.ts: the icon rule, the folder name (PST), the form of an issue ID, the parse of issue.json, the order, the page labels
//   part 2  the flags of the layout (issueToolFlags) with a fake PocketBase and a fake cookie: Monitor switch on and off, for every kind of visitor
//   part 3  the save route with the switch on: the files, the fields, the sender, the limits, the refusals, and the path attacks
//   part 4  "Resolved", the list (newest first, skipped folders, a link out of the folder), and the picture route
//   part 5  the switch off: every route answers 404 and writes nothing
//   part 6  the components as HTML, the tab "Issues", and the sources (the live route is byte-for-byte as before, no token goes to the browser)
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw121-test.mjs. The last line is "<n> passed, <m> failed". Made-up data only (example.test addresses).
// The only server is a fake PocketBase on 127.0.0.1. Every file that the test writes sits in a made-up folder below TMPDIR (the "data" folder of a made-up app folder).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { checker, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/monitor/issues");
// A fake of next/headers: the cookies "htv_token" and "htv_view_as" come from globalThis. This hook runs before the kit hook.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/headers") {
      const src = `export async function cookies(){ return { get(n){ const v = n === "htv_token" ? globalThis.__vw121Cookie : n === "htv_view_as" ? globalThis.__vw121View : undefined; return v ? { name: n, value: v } : undefined; } }; } export async function headers(){ return new Headers(); }`;
      return { url: `data:text/javascript,${encodeURIComponent(src)}`, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
const { check, done } = checker();
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const sha = (rel) => createHash("sha256").update(readFileSync(path.join(app, rel))).digest("hex");
const req = createRequire(path.join(app, "package.json"));
const { createElement: h } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");


// The sha256 of the files that must stay as they are (measured at the base ea6eeff before the unit).
const BASE = {
  issuesRoute: "46a1d2399bbd3a5f20616ced4f9b89f16285d2103e80b33646df8ca3ce38fe7f",
  visualIssues: "c8b47d95966092b7eb83692e859be7610e75949e7b3f7ab0e6b1181d1f7ef981",
  rules: "0a90538a8ff3eb220eca432ca394676ef6027c4e23b2617c35063881aa9ec41c",
};

const R = await import("../lib/visual-issues-local-rules.ts");

// ---------------------------------------------------------------- part 1: the pure rules

await check("issueToolMode (rows 1 and 2): the switch on gives every visitor the tool and the file save; the switch off keeps the role gate and PocketBase", () => {
  for (const canReport of [true, false]) assert.deepEqual(R.issueToolMode(true, canReport), { show: true, local: true });
  assert.deepEqual(R.issueToolMode(false, true), { show: true, local: false });
  assert.deepEqual(R.issueToolMode(false, false), { show: false, local: false });
});

await check("localIssueId (row 3): the PST day and time and 6 hex characters; 2026-11-22T02:45:00Z is 2026-11-21 18:45:00 PST", () => {
  assert.equal(R.localIssueId(Date.UTC(2026, 10, 22, 2, 45, 0), "3fa9c1"), "20261121-184500-3fa9c1");
  assert.equal(R.localIssueId(Date.UTC(2026, 6, 10, 16, 0, 5), "000000"), "20260710-080005-000000", "PST all year, also in summer");
  assert.equal(R.localIssueId(Date.UTC(2027, 0, 1, 7, 59, 59), "abcdef"), "20261231-235959-abcdef", "the day goes back across the year end");
});

await check("isLocalIssueId: only the form of a folder name that the server makes; every path trick is refused", () => {
  assert.equal(R.isLocalIssueId("20261121-184500-3fa9c1"), true);
  const bad = ["", "..", ".", "../x", "a/b", "/etc/passwd", "20261121-184500-3fa9c1/", "20261121-184500-3fa9c1/..", "20261121-184500-3fa9c1/../x", "20261121-184500-3FA9C1", "20261121-184500-3fa9c",
    "20261121-184500-3fa9c1x", "20261121-184500-3fa9c1\n", "20261121-184500-3fa9c1\0", "%2e%2e%2f", "..%2f", "..\\x", "picture.png", "issue.json", "20261121T184500-3fa9c1", null, undefined, 5, {}, []];
  for (const v of bad) assert.equal(R.isLocalIssueId(v), false, JSON.stringify(v));
});

await check("newestFirst: a text sort of the folder names gives the newest first, and the input list stays", () => {
  const input = [{ id: "20261121-100000-aaaaaa" }, { id: "20261121-184500-bbbbbb" }, { id: "20261120-235959-cccccc" }, { id: "20261121-184500-aaaaaa" }];
  const copy = input.map((x) => x.id);
  assert.deepEqual(R.newestFirst(input).map((x) => x.id), ["20261121-184500-bbbbbb", "20261121-184500-aaaaaa", "20261121-100000-aaaaaa", "20261120-235959-cccccc"]);
  assert.deepEqual(input.map((x) => x.id), copy);
});

await check("parseLocalIssue: a full issue.json, an issue.json with missing fields, and a value that is no issue", () => {
  const full = R.parseLocalIssue("20261121-184500-3fa9c1", { comment: "c", page_url: "/read", screen_width: 390, theme: "dark", state: "resolved", created_pst: "2026-11-21 18:45 PST", sent_by: "Made Up Admin", sent_by_role: "admin", viewed_as: "reader", resolved_pst: "2026-11-21 19:00 PST", extra: "x" });
  assert.deepEqual(full, { id: "20261121-184500-3fa9c1", comment: "c", pageUrl: "/read", screenWidth: 390, theme: "dark", state: "resolved", createdPst: "2026-11-21 18:45 PST", sentBy: "Made Up Admin", sentByRole: "admin", viewedAs: "reader", resolvedPst: "2026-11-21 19:00 PST" });
  const sparse = R.parseLocalIssue("20261121-184500-3fa9c1", {});
  assert.equal(sparse.state, "open");
  assert.equal(sparse.sentBy, R.NOT_SIGNED_IN);
  assert.equal(sparse.screenWidth, 0);
  for (const v of [null, undefined, 5, "x", [], [1]]) assert.equal(R.parseLocalIssue("20261121-184500-3fa9c1", v), null, JSON.stringify(v));
  assert.equal(R.parseLocalIssue("../x", {}), null, "a bad folder name");
});

await check("localPageLabel and localBookSlugsOf (Q-A 3:17.4: the title of the book, never only the folder name)", () => {
  const t = { made_up_book: "Made Up Book" };
  assert.equal(R.localPageLabel("/", t), "Monitor dashboard / on this Mac");
  assert.equal(R.localPageLabel("/monitor/made_up_book?x=1", t), 'Book details of "Made Up Book" on the Monitor dashboard');
  assert.equal(R.localPageLabel("/monitor/made_up_book/steps", t), 'Steps of "Made Up Book" on the Monitor dashboard');
  assert.equal(R.localPageLabel("/monitor/other_book", t), 'Book details of "other_book" on the Monitor dashboard', "an unknown slug keeps its own text");
  assert.equal(R.localPageLabel("/monitor/issues", t), "Visual issues of this Mac /monitor/issues");
  assert.equal(R.localPageLabel("/read", t), "Reader dashboard /read");
  assert.equal(R.localPageLabel("/read/made_up_book", t), 'Book screen of "Made Up Book" in the Reader dashboard');
  assert.equal(R.localPageLabel("/sign-in", t), "Sign-in page /sign-in");
  assert.equal(R.localPageLabel("/sign-up", t), "Sign-up page /sign-up");
  assert.equal(R.localPageLabel("/somewhere/else?a=1", t), "/somewhere/else?a=1");
  assert.deepEqual(R.localBookSlugsOf(["/monitor/a_1", "/monitor/b_2/steps", "/read/c_3", "/page/d_4/p001", "/monitor/issues", "/monitor/phase-2", "/monitor/vector-map", "/", "/sign-in"]).sort(), ["a_1", "b_2", "c_3", "d_4"]);
});

// ---------------------------------------------------------------- the fake PocketBase and the made-up folders

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const USERS = {
  rdr000000000001: { id: "rdr000000000001", email: "reader1@example.test", name: "Made Up Reader", role: "reader", approved: true },
  trn000000000001: { id: "trn000000000001", email: "translator1@example.test", name: "Made Up Translator", role: "translator", approved: true },
  adm000000000001: { id: "adm000000000001", email: "admin1@example.test", name: "Made Up Admin", role: "admin", approved: true },
};
const tokenOf = (id) => `${b64u({ alg: "HS256" })}.${b64u({ id, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig-${id}`;
const asUser = (id, view) => {
  globalThis.__vw121Cookie = id ? tokenOf(id) : undefined;
  globalThis.__vw121View = view;
};
const seen = [];
const server = http.createServer((rq, rs) => {
  const chunks = [];
  rq.on("data", (c) => chunks.push(c));
  rq.on("end", () => {
    const url = new URL(rq.url, "http://x");
    seen.push({ method: rq.method, path: url.pathname });
    const m = /^\/api\/collections\/users\/records\/([A-Za-z0-9]+)$/.exec(url.pathname);
    const u = m ? USERS[m[1]] : undefined;
    if (m && rq.method === "GET" && u && rq.headers.authorization === tokenOf(m[1])) {
      rs.writeHead(200, { "Content-Type": "application/json" });
      return rs.end(JSON.stringify(u));
    }
    rs.writeHead(404, { "Content-Type": "application/json" });
    rs.end(JSON.stringify({ message: "not found" }));
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
process.env.VIEWER_CONFIG = path.join(process.env.TMPDIR, "vw121-no-config.json");
process.env.VIEWER_RUN_SOURCE = "pocketbase";
process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${port}`;
const monitor = (on) => (process.env.VIEWER_MONITOR = on ? "on" : "off");

/** A made-up app folder: <base>/app is the working folder (as <Viewer repo>/app), so the issues go to <base>/data/visual-issues-local. */
const work = mkdtempSync(path.join(process.env.TMPDIR, "vw121-"));
let counter = 0;
function newBase() {
  const base = path.join(work, "b" + ++counter);
  mkdirSync(path.join(base, "app"), { recursive: true });
  process.chdir(path.join(base, "app"));
  return { base, root: path.join(base, "data", "visual-issues-local") };
}
/** Every path below `dir` (links count as paths), sorted. */
const tree = (dir) => (existsSync(dir) ? readdirSync(dir, { recursive: true }).map(String).sort() : []);

const issuesRoute = await import("../app/api/monitor/issues/route.ts");
const pictureRoute = await import("../app/api/monitor/issues/[id]/picture/route.ts");
const L = await import("../lib/visual-issues-local.ts");

// ---------------------------------------------------------------- part 2: the flags of the layout (rows 1, 2)

await check("issueToolFlags, Monitor switch ON (row 1): the tool shows signed out, as a reader, as a translator, and as an admin, always with the file save", async () => {
  monitor(true);
  for (const id of [null, "rdr000000000001", "trn000000000001", "adm000000000001"]) {
    asUser(id);
    assert.deepEqual(await L.issueToolFlags(true), { show: true, local: true }, String(id));
  }
  asUser("adm000000000001", "reader");
  assert.deepEqual(await L.issueToolFlags(true), { show: true, local: true }, "in a view");
});

await check("issueToolFlags, Monitor switch OFF (row 2, the live site): as before VW118, a translator and an admin only, and PocketBase (local false)", async () => {
  monitor(false);
  asUser(null);
  assert.deepEqual(await L.issueToolFlags(false), { show: false, local: false }, "signed out");
  asUser("rdr000000000001");
  assert.deepEqual(await L.issueToolFlags(false), { show: false, local: false }, "reader");
  asUser("trn000000000001");
  assert.deepEqual(await L.issueToolFlags(false), { show: true, local: false }, "translator");
  asUser("adm000000000001");
  assert.deepEqual(await L.issueToolFlags(false), { show: true, local: false }, "admin");
  asUser("rdr000000000001", "translator");
  assert.deepEqual(await L.issueToolFlags(false), { show: false, local: false }, "a reader with a forged view cookie");
});

await check("issueToolFlags: with the switch on the app does not ask PocketBase at all; with the switch off and PocketBase down the tool is hidden and no page breaks", async () => {
  monitor(true);
  seen.length = 0;
  asUser("adm000000000001");
  await L.issueToolFlags(true);
  assert.equal(seen.length, 0, "no call to PocketBase for the icon with the switch on");
  const old = process.env.VIEWER_POCKETBASE_URL;
  const dead = http.createServer();
  await new Promise((resolve) => dead.listen(0, "127.0.0.1", resolve));
  const deadPort = dead.address().port;
  await new Promise((resolve) => dead.close(resolve));
  process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${deadPort}`;
  try {
    monitor(false);
    assert.deepEqual(await L.issueToolFlags(false), { show: false, local: false });
    monitor(true);
    assert.deepEqual(await L.issueToolFlags(true), { show: true, local: true });
  } finally {
    process.env.VIEWER_POCKETBASE_URL = old;
  }
});

// ---------------------------------------------------------------- part 3: the save route with the switch on (rows 3, 5)

/** A multipart request for POST /api/monitor/issues. `over` replaces a field, or removes it when the value is undefined. */
function saveRequest(over = {}, headers = { origin: "http://localhost", host: "localhost" }) {
  const fields = { comment: "The button is too small.", page_url: "/monitor/made_up_book", screen_width: "1280", theme: "light", ...over };
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.set(k, v);
  if (!("picture" in over)) form.set("picture", new Blob([PNG], { type: "image/png" }), "issue.png");
  else if (typeof over.picture === "string") form.set("picture", over.picture);
  else if (over.picture !== undefined) form.set("picture", over.picture, over.pictureName ?? "issue.png");
  return new Request("http://localhost/api/monitor/issues", { method: "POST", headers, body: form });
}
const bodyOf = async (r) => await r.json().catch(() => ({}));
const jsonOf = (root, id) => JSON.parse(readFileSync(path.join(root, id, "issue.json"), "utf8"));

await check("POST, signed out (rows 3 and 5): one subfolder with picture.png (the same bytes) and issue.json with the comment, the page address, the width, the theme, the time in PST, and 'not signed in'", async () => {
  monitor(true);
  const { root } = newBase();
  asUser(null);
  seen.length = 0;
  const res = await issuesRoute.POST(saveRequest());
  assert.equal(res.status, 200, JSON.stringify(await bodyOf(res.clone())));
  const { ok, id } = await bodyOf(res);
  assert.equal(ok, true);
  assert.match(id, /^\d{8}-\d{6}-[0-9a-f]{6}$/);
  assert.deepEqual(readdirSync(root), [id], "one subfolder");
  assert.deepEqual(readdirSync(path.join(root, id)).sort(), ["issue.json", "picture.png"], "two files and no temp file");
  assert.ok(readFileSync(path.join(root, id, "picture.png")).equals(PNG));
  const j = jsonOf(root, id);
  assert.deepEqual(Object.keys(j).sort(), ["comment", "created_pst", "created_utc", "id", "page_url", "picture", "resolved_pst", "resolved_utc", "screen_width", "sent_by", "sent_by_role", "state", "theme", "viewed_as"]);
  assert.equal(j.id, id);
  assert.equal(j.state, "open");
  assert.equal(j.comment, "The button is too small.");
  assert.equal(j.page_url, "/monitor/made_up_book");
  assert.equal(j.screen_width, 1280);
  assert.equal(j.theme, "light");
  assert.match(j.created_pst, /^\d{4}-\d\d-\d\d \d\d:\d\d PST$/);
  assert.ok(Math.abs(Date.parse(j.created_utc) - Date.now()) < 60000, "created_utc is now");
  assert.equal(j.sent_by, "not signed in");
  assert.equal(j.sent_by_role, null);
  assert.equal(j.viewed_as, null);
  assert.equal(j.picture, "picture.png");
  assert.equal(j.resolved_utc, null);
  assert.equal(j.resolved_pst, null);
  assert.equal(seen.filter((s) => /visual_issues/.test(s.path)).length, 0, "nothing goes to PocketBase");
});

await check("the time in issue.json is PST (UTC minus 8 hours, all year): a fixed clock gives '2026-11-21 18:45 PST' and the folder 20261121-184500-...", async () => {
  const { root } = newBase();
  const id = await L.saveLocalIssue({ comment: "c", pageUrl: "/", screenWidth: 1, theme: "light" }, PNG, { sentBy: "not signed in", role: "", viewedAs: "" }, root, Date.UTC(2026, 10, 22, 2, 45, 0));
  assert.match(id, /^20261121-184500-[0-9a-f]{6}$/);
  const j = jsonOf(root, id);
  assert.equal(j.created_pst, "2026-11-21 18:45 PST");
  assert.equal(j.created_utc, "2026-11-22T02:45:00.000Z");
});

await check("POST, signed in as an admin (rows 3 and 5): the readable name and the role go into issue.json, never the e-mail address, and PocketBase gets no issue", async () => {
  monitor(true);
  const { root } = newBase();
  asUser("adm000000000001");
  seen.length = 0;
  const res = await issuesRoute.POST(saveRequest({ comment: "Admin comment." }));
  assert.equal(res.status, 200);
  const j = jsonOf(root, (await bodyOf(res)).id);
  assert.equal(j.sent_by, "Made Up Admin");
  assert.equal(j.sent_by_role, "admin");
  assert.equal(j.viewed_as, null);
  const all = readdirSync(root, { recursive: true }).filter((f) => String(f).endsWith("issue.json")).map((f) => readFileSync(path.join(root, String(f)), "utf8")).join("\n");
  assert.ok(!/example\.test|@/.test(all), "no e-mail address in the file");
  assert.equal(seen.filter((s) => s.method !== "GET" || /visual_issues/.test(s.path)).length, 0, "PocketBase got only the read of the session");
});

await check("POST, as a reader, a translator, and an admin in a view: the name, the real role, and the view (the comment stays as it was typed)", async () => {
  monitor(true);
  const { root } = newBase();
  const run = async (user, view, comment) => {
    asUser(user, view);
    const res = await issuesRoute.POST(saveRequest({ comment }));
    assert.equal(res.status, 200, user);
    return jsonOf(root, (await bodyOf(res)).id);
  };
  const r = await run("rdr000000000001", undefined, "Reader comment.");
  assert.deepEqual([r.sent_by, r.sent_by_role, r.viewed_as], ["Made Up Reader", "reader", null]);
  const t = await run("trn000000000001", undefined, "Translator comment.");
  assert.deepEqual([t.sent_by, t.sent_by_role, t.viewed_as], ["Made Up Translator", "translator", null]);
  const a = await run("adm000000000001", "reader", "Admin in the reader view.");
  assert.deepEqual([a.sent_by, a.sent_by_role, a.viewed_as, a.comment], ["Made Up Admin", "admin", "reader", "Admin in the reader view."]);
  const f = await run("trn000000000001", "reader", "A forged view cookie.");
  assert.equal(f.viewed_as, null, "a view counts for an admin only");
});

await check("POST with the sign-in server down: the issue is still saved, and issue.json says that the sender is not known", async () => {
  monitor(true);
  const { root } = newBase();
  const old = process.env.VIEWER_POCKETBASE_URL;
  const dead = http.createServer();
  await new Promise((resolve) => dead.listen(0, "127.0.0.1", resolve));
  const deadPort = dead.address().port;
  await new Promise((resolve) => dead.close(resolve));
  process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${deadPort}`;
  try {
    asUser("adm000000000001");
    const res = await issuesRoute.POST(saveRequest());
    assert.equal(res.status, 200);
    assert.equal(jsonOf(root, (await bodyOf(res)).id).sent_by, R.SENDER_UNKNOWN);
  } finally {
    process.env.VIEWER_POCKETBASE_URL = old;
  }
});

await check("POST limits: a comment of 5000 characters passes, 5001 gets 400, an empty comment gets 400, a missing comment gets 400; nothing is written for a refusal", async () => {
  monitor(true);
  const { root } = newBase();
  asUser(null);
  assert.equal((await issuesRoute.POST(saveRequest({ comment: "a".repeat(5000) }))).status, 200);
  assert.equal(readdirSync(root).length, 1);
  for (const comment of ["a".repeat(5001), "", "   ", undefined]) {
    const res = await issuesRoute.POST(saveRequest({ comment }));
    assert.equal(res.status, 400, String(comment).slice(0, 10));
  }
  assert.equal(readdirSync(root).length, 1, "the refusals wrote nothing");
});

await check("POST picture checks: a JPEG, a SVG, a text file, an empty file, and a missing picture are refused; a PNG of 4000000 bytes passes, 4000001 gets 413; nothing is written for a refusal", async () => {
  monitor(true);
  const { root } = newBase();
  asUser(null);
  const refused = async (picture, status, label) => {
    const res = await issuesRoute.POST(saveRequest({ picture }));
    assert.equal(res.status, status, label);
  };
  await refused(new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0])], { type: "image/png" }), 415, "a JPEG with the type png");
  await refused(new Blob(["<svg xmlns='http://www.w3.org/2000/svg'></svg>"], { type: "image/png" }), 415, "an SVG");
  await refused(new Blob(["hello, this is no picture"], { type: "image/png" }), 415, "text");
  await refused(new Blob([], { type: "image/png" }), 400, "an empty file");
  await refused(undefined, 400, "no picture");
  await refused("a text field, not a file", 400, "a text field");
  await refused(new Blob([Buffer.concat([PNG, Buffer.alloc(4000001 - PNG.length)])], { type: "image/png" }), 413, "4000001 bytes");
  assert.equal(existsSync(root) ? readdirSync(root).length : 0, 0, "nothing was written");
  const edge = Buffer.concat([PNG, Buffer.alloc(4000000 - PNG.length)]);
  assert.equal((await issuesRoute.POST(saveRequest({ picture: new Blob([edge], { type: "image/png" }) }))).status, 200, "4000000 bytes");
  assert.equal(readdirSync(root).length, 1);
});

await check("POST request checks: a body that is not a form gets 415, a header that says a huge body gets 413, a request from another site gets 403; nothing is written", async () => {
  monitor(true);
  const { root } = newBase();
  asUser(null);
  const json = new Request("http://localhost/api/monitor/issues", { method: "POST", headers: { origin: "http://localhost", host: "localhost", "content-type": "application/json" }, body: "{}" });
  assert.equal((await issuesRoute.POST(json)).status, 415);
  const huge = saveRequest({}, { origin: "http://localhost", host: "localhost", "content-length": "99999999" });
  assert.equal((await issuesRoute.POST(huge)).status, 413);
  const foreign = await issuesRoute.POST(saveRequest({}, { origin: "http://evil.example", host: "localhost" }));
  assert.equal(foreign.status, 403);
  const nullOrigin = await issuesRoute.POST(saveRequest({}, { origin: "null", host: "localhost" }));
  assert.equal(nullOrigin.status, 403);
  assert.equal(existsSync(root) ? readdirSync(root).length : 0, 0);
  assert.equal((await issuesRoute.POST(saveRequest({}, { host: "localhost" }))).status, 200, "a script client with no Origin passes, as for /api/issues");
});

await check("path attack on POST: '../' and absolute paths in every field and in the file name write only inside the issue folder (the made-up tree gets nothing else)", async () => {
  monitor(true);
  const { base, root } = newBase();
  writeFileSync(path.join(base, "app", "keep.txt"), "keep");
  writeFileSync(path.join(base, "data-keep.txt"), "keep");
  asUser(null);
  const before = tree(base);
  const evil = "../../../../etc/passwd";
  const res = await issuesRoute.POST(
    saveRequest({
      comment: `${evil}\n../../x ..\\..\\y /etc/passwd`,
      page_url: "../../../x?id=../../..",
      screen_width: "../1",
      theme: "../../x",
      picture: new Blob([PNG], { type: "image/png" }),
      pictureName: "../../../evil.png",
    }),
  );
  assert.equal(res.status, 200, JSON.stringify(await bodyOf(res.clone())));
  const { id } = await bodyOf(res);
  const added = tree(base).filter((p) => !before.includes(p));
  assert.deepEqual(added.sort(), ["data", "data/visual-issues-local", `data/visual-issues-local/${id}`, `data/visual-issues-local/${id}/issue.json`, `data/visual-issues-local/${id}/picture.png`].sort());
  assert.equal(readFileSync(path.join(base, "data-keep.txt"), "utf8"), "keep");
  const j = jsonOf(root, id);
  assert.equal(j.theme, "", "a theme with a slash is dropped");
  assert.equal(j.screen_width, 1, "a width with dots is dropped");
  assert.ok(!/^\.\./.test(j.page_url) && j.page_url.startsWith("/"), "the page address starts with one slash: " + j.page_url);
  assert.equal(readFileSync(path.join(root, id, "picture.png")).length, PNG.length);
  assert.ok(!existsSync(path.join(base, "evil.png")) && !existsSync(path.join(work, "evil.png")));
});

await check("the folder name comes from the server: two saves in the same second give two folders, and a hex name that exists is not used again", async () => {
  const { root } = newBase();
  const who = { sentBy: "not signed in", role: "", viewedAs: "" };
  const now = Date.UTC(2026, 10, 22, 2, 45, 0);
  const ids = new Set();
  for (let i = 0; i < 20; i++) ids.add(await L.saveLocalIssue({ comment: "c" + i, pageUrl: "/", screenWidth: 1, theme: "" }, PNG, who, root, now));
  assert.equal(ids.size, 20);
  assert.equal(readdirSync(root).length, 20);
  for (const id of ids) assert.equal(jsonOf(root, id).comment.startsWith("c"), true);
});

// ---------------------------------------------------------------- part 4: Resolved, the list, the picture route (row 6)

const patchRequest = (body, headers = { origin: "http://localhost", host: "localhost", "content-type": "application/json" }) =>
  new Request("http://localhost/api/monitor/issues", { method: "PATCH", headers, body: typeof body === "string" ? body : JSON.stringify(body) });

await check("Resolved (row 6): PATCH writes the state and the time, keeps every other field (also a field that the owner added), and deletes nothing", async () => {
  monitor(true);
  const { root } = newBase();
  asUser(null);
  const res = await issuesRoute.POST(saveRequest());
  const { id } = await bodyOf(res);
  const file = path.join(root, id, "issue.json");
  const doc = JSON.parse(readFileSync(file, "utf8"));
  doc.owner_note = "keep me";
  writeFileSync(file, JSON.stringify(doc, null, 2));
  const before = tree(root);
  const r = await issuesRoute.PATCH(patchRequest({ id, state: "resolved" }));
  assert.equal(r.status, 200, JSON.stringify(await bodyOf(r.clone())));
  assert.deepEqual(await bodyOf(r), { ok: true, id, state: "resolved" });
  assert.deepEqual(tree(root), before, "the same files, none deleted, none added");
  const j = jsonOf(root, id);
  assert.equal(j.state, "resolved");
  assert.match(j.resolved_pst, /^\d{4}-\d\d-\d\d \d\d:\d\d PST$/);
  assert.ok(Math.abs(Date.parse(j.resolved_utc) - Date.now()) < 60000);
  assert.equal(j.owner_note, "keep me");
  for (const k of ["comment", "page_url", "screen_width", "theme", "created_utc", "created_pst", "sent_by", "picture"]) assert.deepEqual(j[k], doc[k], k);
  assert.ok(readFileSync(path.join(root, id, "picture.png")).equals(PNG));
  const again = await issuesRoute.PATCH(patchRequest({ id, state: "resolved" }));
  assert.equal(again.status, 200);
  assert.equal(jsonOf(root, id).resolved_utc, j.resolved_utc, "a second press keeps the first time");
});

await check("PATCH refusals: a made-up ID in the right form gives 404, bad IDs and path tricks give 404 and change nothing, another state gives 400, other bodies give 415 or 400 or 403", async () => {
  monitor(true);
  const { base, root } = newBase();
  asUser(null);
  const { id } = await bodyOf(await issuesRoute.POST(saveRequest()));
  // A victim next to the folder: a file with an issue.json form outside the root.
  mkdirSync(path.join(base, "data", "victim"), { recursive: true });
  writeFileSync(path.join(base, "data", "victim", "issue.json"), JSON.stringify({ state: "open" }));
  writeFileSync(path.join(base, "issue.json"), JSON.stringify({ state: "open" }));
  const before = tree(base);
  const snap = (p) => readFileSync(p, "utf8");
  const sj = snap(path.join(root, id, "issue.json"));
  assert.equal((await issuesRoute.PATCH(patchRequest({ id: "20200101-000000-aaaaaa", state: "resolved" }))).status, 404);
  const bad = ["../victim", "..", "../../issue.json", "../../../etc/passwd", `${id}/../../victim`, `${id}/..`, "a/b", "", "..%2fvictim", "%2e%2e", "C:\\x", null, 5, {}, [], undefined, `${id}\0`, `${id}\n`];
  for (const v of bad) assert.equal((await issuesRoute.PATCH(patchRequest({ id: v, state: "resolved" }))).status, 404, JSON.stringify(v));
  assert.equal((await issuesRoute.PATCH(patchRequest({ id, state: "open" }))).status, 400);
  assert.equal((await issuesRoute.PATCH(patchRequest({ id }))).status, 400);
  assert.equal((await issuesRoute.PATCH(patchRequest("not json"))).status, 400);
  assert.equal((await issuesRoute.PATCH(patchRequest("[1]"))).status, 400);
  assert.equal((await issuesRoute.PATCH(patchRequest({ id, state: "resolved" }, { origin: "http://localhost", host: "localhost", "content-type": "text/plain" }))).status, 415);
  assert.equal((await issuesRoute.PATCH(patchRequest({ id, state: "resolved" }, { origin: "http://evil.example", host: "localhost", "content-type": "application/json" }))).status, 403);
  assert.deepEqual(tree(base), before);
  assert.equal(snap(path.join(root, id, "issue.json")), sj, "the issue is as it was");
  assert.equal(snap(path.join(base, "data", "victim", "issue.json")), JSON.stringify({ state: "open" }), "the victim file is untouched");
  assert.equal(snap(path.join(base, "issue.json")), JSON.stringify({ state: "open" }));
});

await check("the list (row 6): the newest first, folders without a readable issue.json are skipped and counted, other names are ignored", async () => {
  const { root } = newBase();
  const who = { sentBy: "Made Up Admin", role: "admin", viewedAs: "" };
  const save = (comment, ms) => L.saveLocalIssue({ comment, pageUrl: "/monitor/made_up_book", screenWidth: 390, theme: "dark" }, PNG, who, root, ms);
  const oldest = await save("oldest", Date.UTC(2026, 10, 20, 12, 0, 0));
  const newest = await save("newest", Date.UTC(2026, 10, 22, 2, 45, 0));
  const middle = await save("middle", Date.UTC(2026, 10, 21, 12, 0, 0));
  mkdirSync(path.join(root, "20261121-010101-abcdef"));
  mkdirSync(path.join(root, "20261121-020202-abcdef"));
  writeFileSync(path.join(root, "20261121-020202-abcdef", "issue.json"), "{ not json");
  mkdirSync(path.join(root, "20261121-030303-abcdef"));
  writeFileSync(path.join(root, "20261121-030303-abcdef", "issue.json"), "[1,2]");
  mkdirSync(path.join(root, "notes"));
  writeFileSync(path.join(root, "README.txt"), "x");
  const list = await L.listLocalIssues(root);
  assert.deepEqual(list.issues.map((i) => i.comment), ["newest", "middle", "oldest"]);
  assert.deepEqual(list.issues.map((i) => i.id), [newest, middle, oldest]);
  assert.equal(list.skipped, 3);
  assert.equal(list.hidden, 0);
  assert.equal(list.issues[0].createdPst, "2026-11-21 18:45 PST");
  assert.equal(list.issues[0].sentBy, "Made Up Admin");
  assert.deepEqual(await L.listLocalIssues(path.join(root, "no-such-folder")), { issues: [], skipped: 0, hidden: 0 });
  await L.resolveLocalIssue(middle, root);
  const after = await L.listLocalIssues(root);
  assert.deepEqual(after.issues.map((i) => [i.comment, i.state]), [["newest", "open"], ["middle", "resolved"], ["oldest", "open"]]);
});

await check("the list reads at most 1000 folders and counts the rest as hidden", async () => {
  const { root } = newBase();
  mkdirSync(root, { recursive: true });
  for (let i = 0; i < R.LOCAL_LIST_MAX + 2; i++) mkdirSync(path.join(root, `20261121-${String(Math.floor(i / 100)).padStart(2, "0")}${String(i % 100).padStart(2, "0")}00-${String(i).padStart(6, "0").replace(/\d/g, (d) => "abcdefghij"[+d] ? String(d) : d)}`));
  const list = await L.listLocalIssues(root);
  assert.equal(list.issues.length + list.skipped, R.LOCAL_LIST_MAX);
  assert.equal(list.hidden, 2);
});

await check("a link in the folder that points outside is not followed: the list skips it, Resolved and the picture route refuse it, and the target stays", async () => {
  monitor(true);
  const { base, root } = newBase();
  mkdirSync(root, { recursive: true });
  const outside = path.join(base, "outside");
  mkdirSync(outside);
  writeFileSync(path.join(outside, "issue.json"), JSON.stringify({ comment: "secret", state: "open" }));
  writeFileSync(path.join(outside, "picture.png"), PNG);
  const linkId = "20261121-111111-bbbbbb";
  symlinkSync(outside, path.join(root, linkId));
  const list = await L.listLocalIssues(root);
  assert.equal(list.issues.length, 0);
  assert.equal(list.skipped, 1);
  assert.equal(await L.resolveLocalIssue(linkId, root), null);
  assert.equal(await L.localIssuePicture(linkId, root), null);
  assert.equal(JSON.parse(readFileSync(path.join(outside, "issue.json"), "utf8")).state, "open");
  // The same through the routes (the made-up working folder is this base).
  const p = await pictureRoute.GET(new Request("http://localhost/x"), { params: Promise.resolve({ id: linkId }) });
  assert.equal(p.status, 404);
  assert.equal((await issuesRoute.PATCH(patchRequest({ id: linkId, state: "resolved" }))).status, 404);
  assert.equal(JSON.parse(readFileSync(path.join(outside, "issue.json"), "utf8")).state, "open");
  // A link to a single file inside the folder: issue.json as a link to a file outside.
  const fileLinkId = "20261121-222222-cccccc";
  mkdirSync(path.join(root, fileLinkId));
  writeFileSync(path.join(base, "secret.txt"), "TOP-SECRET");
  symlinkSync(path.join(base, "secret.txt"), path.join(root, fileLinkId, "picture.png"));
  const p2 = await pictureRoute.GET(new Request("http://localhost/x"), { params: Promise.resolve({ id: fileLinkId }) });
  assert.equal(p2.status, 404);
  assert.ok(!(await p2.text()).includes("TOP-SECRET"));
});

await check("the picture route (row 6): a good ID gives the PNG with the safe headers; bad IDs give 400; an unknown ID gives 404; only picture.png can be read", async () => {
  monitor(true);
  const { root } = newBase();
  asUser(null);
  const { id } = await bodyOf(await issuesRoute.POST(saveRequest()));
  const get = (v) => pictureRoute.GET(new Request("http://localhost/x"), { params: Promise.resolve({ id: v }) });
  const ok = await get(id);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "image/png");
  assert.equal(ok.headers.get("x-content-type-options"), "nosniff");
  assert.match(ok.headers.get("cache-control"), /no-store/);
  assert.ok(Buffer.from(await ok.arrayBuffer()).equals(PNG));
  for (const v of ["..", "../x", `${id}/../${id}`, `${id}/issue.json`, "issue.json", "picture.png", "a/b", "", "%2e%2e%2f", "..\\x", `${id}\0`, "/etc/passwd"]) {
    const r = await get(v);
    assert.equal(r.status, 400, JSON.stringify(v));
    assert.ok(!(await r.text()).includes('"comment"'), "no file content");
  }
  assert.equal((await get("20200101-000000-aaaaaa")).status, 404);
  assert.ok(existsSync(path.join(root, id, "issue.json")));
});

// ---------------------------------------------------------------- part 5: the switch off (row 4)

await check("Monitor switch OFF (row 4): POST, PATCH, and the picture route answer 404 (Not found), also for a good request and an existing issue, and nothing is written", async () => {
  monitor(true);
  const { base, root } = newBase();
  asUser(null);
  const { id } = await bodyOf(await issuesRoute.POST(saveRequest()));
  const before = tree(base);
  const sj = readFileSync(path.join(root, id, "issue.json"), "utf8");
  monitor(false);
  const post = await issuesRoute.POST(saveRequest());
  assert.equal(post.status, 404);
  assert.deepEqual(await bodyOf(post), { error: "Not found" });
  assert.equal((await issuesRoute.PATCH(patchRequest({ id, state: "resolved" }))).status, 404);
  const pic = await pictureRoute.GET(new Request("http://localhost/x"), { params: Promise.resolve({ id }) });
  assert.equal(pic.status, 404);
  assert.deepEqual(await bodyOf(pic), { error: "Not found" });
  assert.equal((await pictureRoute.GET(new Request("http://localhost/x"), { params: Promise.resolve({ id: "../x" }) })).status, 404, "a bad ID is 404 too: the switch is checked first");
  assert.deepEqual(tree(base), before, "nothing was written or removed");
  assert.equal(readFileSync(path.join(root, id, "issue.json"), "utf8"), sj);
  // A fresh folder: the switch off must not even make the folder.
  const fresh = newBase();
  assert.equal((await issuesRoute.POST(saveRequest())).status, 404);
  assert.equal(existsSync(path.join(fresh.base, "data")), false, "the folder data was not made");
  monitor(true);
});

await check("the 404 for the switch off comes before the form, the session, and the origin are read (sources)", () => {
  const post = noComments(read("app/api/monitor/issues/route.ts"));
  for (const fn of ["POST", "PATCH"]) {
    const body = post.slice(post.indexOf(`export async function ${fn}`));
    assert.ok(body.indexOf("monitorOffResponse()") < body.indexOf("foreignOrigin(req)"), fn + ": the switch first");
    assert.ok(body.indexOf("monitorOffResponse()") < Math.min(...["req.formData()", "req.json()"].map((s) => (body.includes(s) ? body.indexOf(s) : Infinity))), fn + ": before the body");
  }
  const pic = noComments(read("app/api/monitor/issues/[id]/picture/route.ts"));
  assert.ok(pic.indexOf("monitorOffResponse()") < pic.indexOf("await ctx.params"));
  const page = noComments(read("app/monitor/issues/page.tsx"));
  assert.ok(page.indexOf("await requireMonitor()") < page.indexOf("listLocalIssues()"), "the page checks the switch before it reads the folder");
});

// ---------------------------------------------------------------- part 6: the components and the sources

const hooksNav = (await import("../components/Nav.tsx")).default;
await check("the tab 'Issues' (row 6): it shows with the Monitor switch on, it is the open tab on /monitor/issues, and the Monitor dashboard tab is not open there", () => {
  const html = renderToStaticMarkup(h(hooksNav, { monitor: true, theme: "light" }));
  assert.ok(/<a [^>]*href="\/monitor\/issues"[^>]*aria-current="page"[^>]*>Issues<\/a>/.test(html) || /<a [^>]*aria-current="page"[^>]*href="\/monitor\/issues"[^>]*>Issues<\/a>/.test(html), html.slice(0, 600));
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1, "one open tab");
  assert.ok(!/aria-current="page"[^>]*>Monitor dashboard</.test(html) && !/href="\/"[^>]*aria-current/.test(html));
  const off = renderToStaticMarkup(h(hooksNav, { monitor: false, theme: "light" }));
  assert.ok(!off.includes("Issues") && !off.includes("/monitor/issues"), "no tab with the switch off");
  const src = noComments(read("components/Nav.tsx"));
  assert.ok(/label: "Issues", monitor: true/.test(src));
  assert.ok(/p === "\/" \|\| \(p\.startsWith\("\/monitor"\) && !p\.startsWith\("\/monitor\/issues"\)\)/.test(src));
});

const LocalIssues = (await import("../components/LocalIssues.tsx")).default;
await check("the list component (row 6): the picture, the comment, the page link with the book title, the time PST, the sender, the button Resolved on open issues, and a closed section Resolved (N)", () => {
  const base = { comment: "A comment.", pageUrl: "/monitor/made_up_book", screenWidth: 390, theme: "dark", sentBy: "not signed in", sentByRole: "", viewedAs: "", resolvedPst: "" };
  const issues = [
    { ...base, id: "20261121-184500-aaaaaa", state: "open", createdPst: "2026-11-21 18:45 PST", comment: "Newer open." },
    { ...base, id: "20261121-100000-bbbbbb", state: "open", createdPst: "2026-11-21 10:00 PST", comment: "Older open.", sentBy: "Made Up Admin", sentByRole: "admin", viewedAs: "reader" },
    { ...base, id: "20261120-100000-cccccc", state: "resolved", createdPst: "2026-11-20 10:00 PST", comment: "Done one.", resolvedPst: "2026-11-21 19:00 PST", pageUrl: "//evil.example/x" },
  ];
  // unit VW127 (Q-A 3:122.4): a highlight span (data-hl) only colors a count or a time. unHl takes the span away so that the text compare stays the same.
  const unHl = (m) => m.replace(/<span [^>]*data-hl="[^"]*"[^>]*>([^<]*)<\/span>/g, "$1");
  const html = unHl(renderToStaticMarkup(h(LocalIssues, { issues, skipped: 0, hidden: 0, titles: { made_up_book: "Made Up Book" } })));
  assert.ok(html.indexOf("Newer open.") < html.indexOf("Older open."), "the order of the input stays (newest first)");
  assert.equal((html.match(/data-issue-resolve/g) ?? []).length, 2, "a button on each open issue, none on the resolved one");
  assert.equal((html.match(/>Resolved<\/button>/g) ?? []).length, 2);
  assert.ok(html.includes("Open issues (2)"));
  assert.ok(/<details data-resolved-section="true">/.test(html) && !/<details[^>]* open/.test(html), "a closed section: " + html.match(/<details[^>]*>/)?.[0]);
  assert.ok(html.includes("Resolved (1)"));
  assert.ok(html.indexOf("<details") < html.indexOf("Done one."), "the resolved issue sits in the closed section");
  assert.ok(html.includes('src="/api/monitor/issues/20261121-184500-aaaaaa/picture"'));
  assert.ok(html.includes('href="/monitor/made_up_book"') && html.includes('Book details of &quot;Made Up Book&quot; on the Monitor dashboard'));
  assert.ok(html.includes("2026-11-21 18:45 PST") && html.includes("Resolved on 2026-11-21 19:00 PST"));
  assert.ok(html.includes("Sent by a person who was not signed in.") && html.includes("Sent by Made Up Admin (admin)."));
  assert.ok(html.includes("Viewed as reader."));
  assert.ok(!html.includes('href="//evil.example/x"'), "an unsafe page address is no link");
  assert.ok(!/@/.test(html.replace(/@example\.test/g, "")), "no e-mail address");
  const skippedHtml = unHl(renderToStaticMarkup(h(LocalIssues, { issues: [], skipped: 2, hidden: 5, titles: {} })));
  assert.ok(skippedHtml.includes("No issue is open.") && skippedHtml.includes("2 folders have no readable issue.json") && skippedHtml.includes("5 older folders are not shown"));
});

await check("sources: the layout, the tool, and the editor (rows 1, 2, 5): the layout calls issueToolFlags, passes two flags and the theme, no token goes to the browser, and the editor sends to the file route only for `local`", () => {
  const layout = noComments(read("app/layout.tsx"));
  assert.ok(/const issueTool = await issueToolFlags\(monitor\)/.test(layout));
  assert.ok(/\{issueTool\.show \? <VisualIssueTool theme=\{theme\} local=\{issueTool\.local\} \/> : null\}/.test(layout));
  assert.ok(!/canReportIssues/.test(layout), "the layout no longer asks for the role itself");
  const tool = noComments(read("components/VisualIssueTool.tsx"));
  assert.ok(/VisualIssueTool\(\{ theme, local = false \}: \{ theme: ThemeName; local\?: boolean \}\)/.test(tool));
  assert.ok(/<VisualIssueEditor[\s\S]*?local=\{local\}/.test(tool));
  const ed = noComments(read("components/VisualIssueEditor.tsx"));
  assert.ok(/fetch\(local \? LOCAL_ISSUES_API : "\/api\/issues", \{ method: "POST", body: form \}\)/.test(ed));
  for (const f of ["components/VisualIssueTool.tsx", "components/VisualIssueEditor.tsx", "components/LocalIssues.tsx"]) {
    const s = noComments(read(f));
    assert.ok(!/htv_token|COOKIE_NAME|getSession|Authorization|localStorage|sessionStorage/.test(s), f);
    assert.ok(!/from "@\/lib\/(visual-issues|htv-session|pb|config|safe-path|monitor)"/.test(s), "no server module in " + f);
    assert.ok(!/visual-issues-local"/.test(s), "the server file store is not imported in " + f);
  }
  assert.ok(read("lib/visual-issues-local.ts").startsWith('import "server-only";'));
  assert.ok(!read("lib/visual-issues-local-rules.ts").includes("server-only"), "the rules are shared with the browser");
});

await check("sources: the live PocketBase branch is byte for byte as before VW121 (row 2): the route /api/issues and lib/visual-issues.ts have the sha256 of the base", () => {
  assert.equal(sha("app/api/issues/route.ts"), BASE.issuesRoute);
  assert.equal(sha("lib/visual-issues.ts"), BASE.visualIssues);
  assert.equal(sha("lib/visual-issue-rules.ts"), BASE.rules);
  for (const f of ["app/api/admin/issues/route.ts", "app/api/admin/issues/[id]/picture/route.ts", "app/admin/issues/page.tsx"]) assert.ok(existsSync(path.join(app, f)), f);
});

await check("sources: the file store never takes a folder from a request, every read and write goes through resolveInside, and nothing deletes an issue", () => {
  const lib = noComments(read("lib/visual-issues-local.ts"));
  assert.ok(/process\.cwd\(\), "\.\.", "data", "visual-issues-local"/.test(lib));
  for (const fn of ["saveLocalIssue", "listLocalIssues", "resolveLocalIssue", "localIssuePicture"]) assert.ok(lib.includes(`export async function ${fn}`), fn);
  assert.ok((lib.match(/resolveInside\(/g) ?? []).length >= 4);
  assert.ok(!/\bunlink\b|\.rm\(\s*(?!dir)|rmdir|rmSync/.test(lib.replace(/await fs\.rm\(dir, \{ recursive: true, force: true \}\);/, "")), "no delete except the clean-up of a folder that this call made");
  for (const f of ["app/api/monitor/issues/route.ts", "app/api/monitor/issues/[id]/picture/route.ts", "app/monitor/issues/page.tsx"]) {
    const s = noComments(read(f));
    assert.ok(!/node:fs|from "fs"|readFile|writeFile/.test(s), "no file call in " + f);
    assert.ok(!/searchParams|nextUrl|req\.url/.test(s), "no query or address is read in " + f);
  }
});

await check("sources: no new file writes a secret, an e-mail address, or a real host (made-up example.test only), and no new library is added", () => {
  const files = ["lib/visual-issues-local-rules.ts", "lib/visual-issues-local.ts", "components/LocalIssues.tsx", "app/api/monitor/issues/route.ts", "app/api/monitor/issues/[id]/picture/route.ts", "app/monitor/issues/page.tsx", "scripts/vw121-test.mjs"];
  for (const f of files) {
    const s = read(f);
    const emails = s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
    for (const e of emails) assert.ok(/@example\.test$/.test(e), f + ": " + e);
    if (f !== "scripts/vw121-test.mjs") assert.ok(!/pb-v2\.kendotranslation\.com|127\.0\.0\.1:8090|localhost:8090/.test(s), f + " names the v2 server or port 8090");
  }
  const pkg = JSON.parse(read("package.json"));
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ["modern-screenshot", "next", "react", "react-dom"]);
});

await new Promise((resolve) => server.close(resolve));
done();

