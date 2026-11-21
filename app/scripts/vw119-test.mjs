// VW119 (round 108, card P56.1): server-free tests of "View as", the reader words, and the folds (the three visual issues of 2026-11-20 from /translate).
// Owner words (2026-11-20, the 3 visual issues):
//   1 "add an option to view the page as a specific role for admin (reader/translator)"                                  -> Q-A 3:103.5 rows 1 to 8
//   2 "+ Need other background highlight for unfolded book + Add author next to book title"                               -> Q-A 3:103.6 rows 1 to 5
//   3 "All `agent` related information should be hide from reader. Only shown to translation and admin"                  -> Q-A 3:103.4 "Keep AI label, no agent words"
//   part 1  lib/view-as.ts: the pure rules (the cookie counts for an admin only, the view user, the texts, the band places, the issue note)
//   part 2  the session and the page guards with a fake PocketBase (http server on 127.0.0.1) and a fake cookie jar
//   part 3  the routes: the view route, sign out, sign in, the refusal of every route that changes data in a view, the exceptions (refresh, progress, theme, issues)
//   part 4  the select, the band, the bars, and the layout (HTML and sources)
//   part 5  the reader words: no "agent" and no model name on a reader screen, the AI label stays, the saved keys stay, /translate keeps its words
//   part 6  the folds: the second highlight color of each theme, the contrast, the author line (English first, then Japanese, then nothing)
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw119-test.mjs. The last line is "<n> passed, <m> failed". Made-up data only (example.test addresses). No real PocketBase, no network.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { checker, htmlText, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/read");
// A fake of next/headers: a cookie jar with get, set, and delete. This hook is registered after the kit hook, so it runs first.
const jar = new Map();
const ops = [];
globalThis.__vw119 = { jar, ops };
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/headers") {
      const src = `const j = globalThis.__vw119;
export async function cookies(){ return {
  get(n){ const v = j.jar.get(n); return v === undefined ? undefined : { name: n, value: v }; },
  set(n, v, o){ j.jar.set(n, v); j.ops.push({ op: "set", name: n, value: v, opts: o }); },
  delete(n){ j.jar.delete(n); j.ops.push({ op: "delete", name: n }); } }; }
export async function headers(){ return new Headers(); }`;
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

// The contrast helpers (WCAG 2): used by the band test and the fold tests.
const hexLin = (v) => {
  const n = Number.parseInt(v.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
};
const lum = (v) => {
  const [r, g, b] = hexLin(v);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function ratio(a, b) {
  return (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
}
const VA = await import("../lib/view-as.ts");

// ---------------------------------------------------------------- part 1: the pure rules

await check("VIEW_COOKIE and VIEW_PATH: the cookie htv_view_as and the route /api/htv/view", () => {
  assert.equal(VA.VIEW_COOKIE, "htv_view_as");
  assert.equal(VA.VIEW_PATH, "/api/htv/view");
});

await check("row 1: the select has the choices Admin (normal), Translator, Reader, in this order", () => {
  assert.deepEqual(
    VA.VIEW_CHOICES.map((c) => [c.value, c.label]),
    [
      ["admin", "Admin (normal)"],
      ["translator", "Translator"],
      ["reader", "Reader"],
    ],
  );
});

await check("parseViewChoice: only admin, translator, reader (exact, lower case) pass", () => {
  for (const v of ["admin", "translator", "reader"]) assert.equal(VA.parseViewChoice(v), v);
  for (const v of ["Admin", "READER", " reader", "reader ", "", "owner", null, undefined, 1, {}, ["reader"]]) assert.equal(VA.parseViewChoice(v), null, String(v));
});

await check("viewOfCookie (rows 1 and 2): the cookie counts for an admin only; a translator, a reader, no role, and a made-up value give no view", () => {
  assert.equal(VA.viewOfCookie("admin", "reader"), "reader");
  assert.equal(VA.viewOfCookie("admin", "translator"), "translator");
  assert.equal(VA.viewOfCookie("admin", undefined), null);
  assert.equal(VA.viewOfCookie("admin", ""), null);
  assert.equal(VA.viewOfCookie("admin", "admin"), null, "the choice admin is no view");
  assert.equal(VA.viewOfCookie("admin", "owner"), null);
  assert.equal(VA.viewOfCookie("admin", "Reader"), null);
  for (const role of ["translator", "reader", null, undefined, "qa", ""]) for (const v of ["reader", "translator"]) assert.equal(VA.viewOfCookie(role, v), null, `${role}/${v}`);
});

const ADMIN = { id: "adm000000000001", email: "admin1@example.test", name: "Made Up Admin", role: "admin", approved: true };
await check("viewUser (rows 4 and 5): in a view the role is the view role and the account is approved; the id, name, and e-mail stay; no view gives the same object", () => {
  assert.equal(VA.viewUser(ADMIN, null), ADMIN);
  assert.deepEqual(VA.viewUser(ADMIN, "reader"), { ...ADMIN, role: "reader", approved: true });
  assert.deepEqual(VA.viewUser(ADMIN, "translator"), { ...ADMIN, role: "translator", approved: true });
  const unapproved = { ...ADMIN, role: "admin", approved: false };
  assert.equal(VA.viewUser(unapproved, "reader").approved, true, "there is no waits-for-approval view (row 5)");
  assert.equal(ADMIN.role, "admin", "the input is not changed");
});

await check("row 6: the refusal line for both views", () => {
  assert.equal(VA.refusalText("reader"), "You view as a reader. Pick Admin to change data.");
  assert.equal(VA.refusalText("translator"), "You view as a translator. Pick Admin to change data.");
});

await check("row 3: the band line for both views and the button label", () => {
  assert.equal(VA.bandText("reader"), "You view the site as a reader.");
  assert.equal(VA.bandText("translator"), "You view the site as a translator.");
  assert.equal(VA.BAND_BACK_LABEL, "Back to admin");
});

await check("row 8: the band and the select show on the reader pages, the admin pages, the profile, the sign-in pages, and /translate; not on the Monitor pages", () => {
  for (const p of ["/read", "/read/made_up_book", "/translate", "/translate/made_up_book", "/translate/made_up_book/p001", "/admin/issues", "/admin/readers", "/profile", "/sign-in", "/sign-up"]) {
    assert.equal(VA.bandShowsOn(p, true), true, p);
    assert.equal(VA.bandShowsOn(p, false), true, p);
  }
  for (const p of ["/", "/runs", "/runs/some_run", "/books", "/page", "/settings/run", "/json", "/monitor/x", "/nothing-here"]) assert.equal(VA.bandShowsOn(p, true), false, p + " with the monitor on");
  for (const p of ["/", "/nothing-here"]) assert.equal(VA.bandShowsOn(p, false), true, p + " with the monitor off (the 404 page shows the band)");
});

await check("row 7: the issue note is the first line, addViewNote adds it, splitViewNote takes it back, and a comment without a view stays as it is", () => {
  assert.equal(VA.issueNote("reader"), "Viewed as: reader.");
  assert.equal(VA.issueNote("translator"), "Viewed as: translator.");
  assert.deepEqual(VA.addViewNote("Too small.", null), { ok: true, comment: "Too small." });
  assert.deepEqual(VA.addViewNote("Too small.", "reader"), { ok: true, comment: "Viewed as: reader.\nToo small." });
  assert.deepEqual(VA.addViewNote("Too small.", "translator"), { ok: true, comment: "Viewed as: translator.\nToo small." });
  assert.deepEqual(VA.splitViewNote("Viewed as: reader.\nToo small."), { view: "reader", text: "Too small." });
  assert.deepEqual(VA.splitViewNote("Viewed as: translator.\nLine one\nLine two"), { view: "translator", text: "Line one\nLine two" });
  assert.deepEqual(VA.splitViewNote("Viewed as: reader.\r\nToo small."), { view: "reader", text: "Too small." }, "a comment that went through a multipart form has CRLF");
  assert.deepEqual(VA.splitViewNote("Too small."), { view: null, text: "Too small." });
  assert.deepEqual(VA.splitViewNote("Viewed as: admin.\nx"), { view: null, text: "Viewed as: admin.\nx" });
  assert.deepEqual(VA.splitViewNote("viewed as: reader.\nx"), { view: null, text: "viewed as: reader.\nx" });
});

await check("row 7: a comment that fits the limit without the note, but not with it, gets a plain error that names the new limit", () => {
  const max = 5000;
  const note = VA.issueNote("reader");
  const fits = "a".repeat(max - note.length - 1);
  assert.equal(VA.addViewNote(fits, "reader").ok, true);
  assert.equal(VA.addViewNote(fits, "reader").comment.length, max);
  const over = VA.addViewNote(fits + "a", "reader");
  assert.equal(over.ok, false);
  assert.match(over.error, /too long in a view/);
  assert.ok(over.error.includes(String(max - note.length - 1)), over.error);
  assert.equal(VA.addViewNote("a".repeat(max), null).ok, true, "no view, no change of the limit");
});

// ---------------------------------------------------------------- part 2: the session with a fake PocketBase

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tokenOfExp = (id, secondsLeft) => `${b64u({ alg: "HS256" })}.${b64u({ id, exp: Math.floor(Date.now() / 1000) + secondsLeft })}.sig-${id}`;
const tokenOf = (id) => tokenOfExp(id, 4 * 3600);
const USERS = {
  adm000000000001: ADMIN,
  trn000000000001: { id: "trn000000000001", email: "translator1@example.test", name: "Made Up Translator", role: "translator", approved: true },
  rdr000000000001: { id: "rdr000000000001", email: "reader1@example.test", name: "Made Up Reader", role: "reader", approved: true },
  rdr000000000002: { id: "rdr000000000002", email: "reader2@example.test", name: "Made Up Waiting Reader", role: "reader", approved: false },
};
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const seen = [];
const behavior = { down: false, catalog: [] };
const server = http.createServer((rq, rs) => {
  const chunks = [];
  rq.on("data", (c) => chunks.push(c));
  rq.on("end", async () => {
    const body = Buffer.concat(chunks);
    const url = new URL(rq.url, "http://x");
    const entry = { method: rq.method, path: url.pathname, token: rq.headers.authorization ?? "", ct: rq.headers["content-type"] ?? "", json: null, form: null };
    seen.push(entry);
    const send = (status, obj) => {
      rs.writeHead(status, { "Content-Type": "application/json" });
      rs.end(JSON.stringify(obj));
    };
    if (behavior.down) {
      rs.destroy();
      return;
    }
    let m;
    if ((m = /^\/api\/collections\/users\/records\/([A-Za-z0-9]+)$/.exec(url.pathname)) && rq.method === "GET") {
      const u = USERS[m[1]];
      if (!u || rq.headers.authorization !== entry.token || !entry.token.endsWith(`.sig-${m[1]}`)) return send(404, { message: "not found" });
      return send(200, u);
    }
    if (url.pathname === "/api/collections/users/auth-refresh" && rq.method === "POST") {
      const id = /\.sig-([A-Za-z0-9]+)$/.exec(entry.token)?.[1];
      if (!id || !USERS[id]) return send(401, { message: "no" });
      return send(200, { token: tokenOfExp(id, 5 * 86400), record: USERS[id] });
    }
    if (url.pathname === "/api/collections/users/auth-with-password" && rq.method === "POST") {
      entry.json = JSON.parse(body.toString("utf8") || "{}");
      const u = Object.values(USERS).find((x) => x.email === entry.json.identity);
      if (!u || entry.json.password !== "made-up-password") return send(400, { message: "bad" });
      return send(200, { token: tokenOfExp(u.id, 5 * 86400), record: u });
    }
    if (url.pathname === "/api/collections/visual_issues/records" && rq.method === "POST") {
      entry.form = await new Response(body, { headers: { "content-type": entry.ct } }).formData();
      return send(200, { id: "issue0000000001" });
    }
    if (url.pathname === "/api/collections/catalog_items/records" && rq.method === "GET") return send(200, { page: 1, perPage: 500, totalPages: 1, totalItems: behavior.catalog.length, items: behavior.catalog });
    return send(404, { message: "not found: " + rq.method + " " + url.pathname });
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
process.env.VIEWER_CONFIG = path.join(process.env.TMPDIR, "vw119-no-config.json");
process.env.VIEWER_RUN_SOURCE = "pocketbase";
process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${server.address().port}`;

/** Sign in as a made-up user for the next calls. `view` is the value of the view cookie, or undefined for no cookie. */
function signIn(id, view) {
  jar.clear();
  ops.length = 0;
  if (id) jar.set("htv_token", tokenOf(id));
  if (view !== undefined) jar.set("htv_view_as", view);
}
const reset = () => {
  seen.length = 0;
  ops.length = 0;
  behavior.down = false;
  behavior.catalog = [];
};
/** The requests that reached PocketBase, without the check of the user of the session. */
const writes = () => seen.filter((s) => !(s.method === "GET" && /^\/api\/collections\/users\/records\//.test(s.path)));
const redirectOf = async (fn) => {
  try {
    await fn();
    return null;
  } catch (e) {
    const m = /^redirect (.*)$/.exec(String(e && e.message));
    if (m) return m[1];
    throw e;
  }
};

const S = await import("../lib/htv-session.ts");

await check("getSession: an admin with no view cookie is an admin with view null", async () => {
  reset();
  signIn("adm000000000001");
  const s = await S.getSession();
  assert.equal(s.user.role, "admin");
  assert.equal(s.realRole, "admin");
  assert.equal(s.view, null);
  assert.deepEqual(s.user, ADMIN);
});

await check("getSession (rows 4 and 5): an admin with the cookie reader is a reader that is approved, with the real role admin and the view reader", async () => {
  reset();
  signIn("adm000000000001", "reader");
  const s = await S.getSession();
  assert.equal(s.user.role, "reader");
  assert.equal(s.user.approved, true);
  assert.equal(s.user.id, "adm000000000001", "the id is the id of the admin (reads and the issue use it)");
  assert.equal(s.realRole, "admin");
  assert.equal(s.view, "reader");
  assert.equal(s.token, tokenOf("adm000000000001"), "the token is the token of the admin");
});

await check("getSession: an admin with the cookie translator is a translator with the real role admin", async () => {
  reset();
  signIn("adm000000000001", "translator");
  const s = await S.getSession();
  assert.equal(s.user.role, "translator");
  assert.equal(s.realRole, "admin");
  assert.equal(s.view, "translator");
});

await check("getSession (row 1): a forged view cookie on a translator, a reader, and a reader that waits changes nothing", async () => {
  reset();
  for (const [id, role, approved] of [["trn000000000001", "translator", true], ["rdr000000000001", "reader", true], ["rdr000000000002", "reader", false]]) {
    for (const v of ["reader", "translator"]) {
      signIn(id, v);
      const s = await S.getSession();
      assert.equal(s.view, null, `${id}/${v}`);
      assert.equal(s.user.role, role);
      assert.equal(s.user.approved, approved, `${id}/${v}: the approval is not changed`);
      assert.equal(s.realRole, role);
    }
  }
});

await check("getSession: a made-up view value on an admin is no view; no token is no session (the cookie alone gives nothing)", async () => {
  reset();
  signIn("adm000000000001", "owner");
  assert.equal((await S.getSession()).view, null);
  seen.length = 0;
  signIn(null, "reader");
  assert.equal(await S.getSession(), null);
  assert.equal(seen.length, 0, "no token, no request to PocketBase");
});

await check("page guards (row 4): the admin in the reader view acts as a reader: /translate and /admin/* go to /read, /read stays", async () => {
  reset();
  signIn("adm000000000001", "reader");
  assert.equal(await redirectOf(() => S.requireStaff("/translate")), "/read");
  assert.equal(await redirectOf(() => S.requireAdmin("/admin/issues")), "/read");
  assert.equal(await redirectOf(() => S.requireAdmin("/admin/readers")), "/read");
  assert.equal(await redirectOf(() => S.requireReaderSession("/read")), null);
  const s = await S.requireReaderSession("/profile");
  assert.equal(s.user.role, "reader");
  assert.equal(s.user.approved, true);
});

await check("page guards (row 4): the admin in the translator view reaches /translate and /read, and /admin/* goes to /read (no admin links)", async () => {
  reset();
  signIn("adm000000000001", "translator");
  assert.equal(await redirectOf(() => S.requireStaff("/translate")), null);
  assert.equal(await redirectOf(() => S.requireReaderSession("/read")), null);
  assert.equal(await redirectOf(() => S.requireAdmin("/admin/issues")), "/read");
});

await check("page guards: the admin with no view reaches every page; a real reader still goes to /read from /translate and /admin", async () => {
  reset();
  signIn("adm000000000001");
  assert.equal(await redirectOf(() => S.requireStaff("/translate")), null);
  assert.equal(await redirectOf(() => S.requireAdmin("/admin/issues")), null);
  signIn("rdr000000000001");
  assert.equal(await redirectOf(() => S.requireStaff("/translate")), "/read");
  assert.equal(await redirectOf(() => S.requireAdmin("/admin/issues")), "/read");
});

// ---------------------------------------------------------------- part 3: the routes

const jreq = (method, p, body = {}, headers = {}) =>
  new Request("http://localhost" + p, { method, headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost", ...headers }, body: method === "GET" ? undefined : JSON.stringify(body) });
const bodyOf = async (r) => r.json().catch(() => ({}));
const viewRoute = await import("../app/api/htv/view/route.ts");
const logoutRoute = await import("../app/api/htv/logout/route.ts");
const loginRoute = await import("../app/api/htv/login/route.ts");

await check("POST /api/htv/view (rows 1 and 2): no session gives 401, a translator and a reader give 403, and no cookie is set", async () => {
  reset();
  signIn(null);
  let r = await viewRoute.POST(jreq("POST", "/api/htv/view", { view: "reader" }));
  assert.equal(r.status, 401);
  for (const id of ["trn000000000001", "rdr000000000001", "rdr000000000002"]) {
    signIn(id);
    r = await viewRoute.POST(jreq("POST", "/api/htv/view", { view: "reader" }));
    assert.equal(r.status, 403, id);
    assert.equal((await bodyOf(r)).error, "Only the admin can do this.");
  }
  assert.equal(ops.length, 0, "no cookie was set");
});

await check("POST /api/htv/view: an admin sets the view reader or translator; the cookie is httpOnly, lax, path /, with the lifetime of the token", async () => {
  reset();
  signIn("adm000000000001");
  for (const v of ["reader", "translator"]) {
    ops.length = 0;
    const r = await viewRoute.POST(jreq("POST", "/api/htv/view", { view: v }));
    assert.equal(r.status, 200);
    assert.deepEqual(await bodyOf(r), { ok: true, view: v });
    assert.equal(ops.length, 1);
    const o = ops[0];
    assert.equal(o.op, "set");
    assert.equal(o.name, "htv_view_as");
    assert.equal(o.value, v);
    assert.equal(o.opts.httpOnly, true);
    assert.equal(o.opts.sameSite, "lax");
    assert.equal(o.opts.path, "/");
    assert.equal(o.opts.secure, false, "plain http keeps the cookie on this Mac");
    assert.ok(Math.abs(o.opts.maxAge - 4 * 3600) <= 5, "the lifetime of the token: " + o.opts.maxAge);
    assert.equal(jar.get("htv_view_as"), v);
  }
  ops.length = 0;
  await viewRoute.POST(jreq("POST", "/api/htv/view", { view: "reader" }, { "x-forwarded-proto": "https" }));
  assert.equal(ops[0].opts.secure, true, "behind https the cookie is secure");
});

await check("POST /api/htv/view: the admin in a view can pick another view and can pick Admin; Admin clears the cookie", async () => {
  reset();
  signIn("adm000000000001", "reader");
  let r = await viewRoute.POST(jreq("POST", "/api/htv/view", { view: "translator" }));
  assert.equal(r.status, 200, "also in a view (the route is no data change)");
  assert.equal(jar.get("htv_view_as"), "translator");
  ops.length = 0;
  r = await viewRoute.POST(jreq("POST", "/api/htv/view", { view: "admin" }));
  assert.equal(r.status, 200);
  assert.deepEqual(await bodyOf(r), { ok: true, view: "admin" });
  assert.deepEqual(ops, [{ op: "delete", name: "htv_view_as" }]);
  assert.equal(jar.has("htv_view_as"), false);
  assert.equal((await S.getSession()).view, null, "back to the normal state");
});

await check("POST /api/htv/view: a bad value gives 400, a request from another site gives 403, a body that is not JSON gives 415; no cookie changes", async () => {
  reset();
  signIn("adm000000000001");
  for (const v of ["owner", "", null, undefined, 7, "Reader"]) {
    const r = await viewRoute.POST(jreq("POST", "/api/htv/view", { view: v }));
    assert.equal(r.status, 400, String(v));
  }
  assert.equal((await viewRoute.POST(jreq("POST", "/api/htv/view", { view: "reader" }, { origin: "http://evil.example.test" }))).status, 403);
  assert.equal((await viewRoute.POST(new Request("http://localhost/api/htv/view", { method: "POST", headers: { "content-type": "text/plain", host: "localhost" }, body: "reader" }))).status, 415);
  assert.equal(ops.length, 0);
  assert.equal(writes().length, 0, "the route calls no collection");
});

await check("sign out (row 2): the logout route clears the token cookie and the view cookie", async () => {
  reset();
  signIn("adm000000000001", "reader");
  const r = await logoutRoute.POST(jreq("POST", "/api/htv/logout"));
  assert.equal(r.status, 200);
  assert.deepEqual(ops.map((o) => `${o.op}:${o.name}`).sort(), ["delete:htv_token", "delete:htv_view_as"]);
  assert.equal(await S.getSession(), null);
});

await check("sign in (row 2): a new sign-in clears an old view cookie, so the admin starts in the Admin view", async () => {
  reset();
  signIn(null, "reader");
  const r = await loginRoute.POST(jreq("POST", "/api/htv/login", { email: "admin1@example.test", password: "made-up-password" }));
  assert.equal(r.status, 200);
  assert.ok(ops.some((o) => o.op === "set" && o.name === "htv_token"));
  assert.ok(ops.some((o) => o.op === "delete" && o.name === "htv_view_as"));
  assert.equal(jar.has("htv_view_as"), false);
});

// The routes that change data. Each entry: the module, the method, the address, the body, and a parameter object for a dynamic route.
const ROUTES = [
  ["htv/save", "POST", "/api/htv/save", { pageId: "made_up_book/p001", rows: [] }],
  ["htv/comments", "POST", "/api/htv/comments", { pageId: "made_up_book/p001", text: "x" }],
  ["htv/comments/[id]", "PATCH", "/api/htv/comments/abc", { text: "x" }, { id: "abc" }],
  ["htv/comments/[id]", "DELETE", "/api/htv/comments/abc", {}, { id: "abc" }],
  ["htv/mark", "PUT", "/api/htv/mark", {}],
  ["htv/mark", "DELETE", "/api/htv/mark", {}],
  ["htv/settings", "PUT", "/api/htv/settings", { panes: {} }],
  ["profile/name", "PUT", "/api/profile/name", { name: "New Name" }],
  ["profile/password", "POST", "/api/profile/password", { current: "a", password: "bbbbbbbbbb" }],
  ["admin/readers", "POST", "/api/admin/readers", { id: "rdr000000000002", approved: true }],
  ["admin/issues", "POST", "/api/admin/issues", { id: "issue0000000001", note: "unit VW1xx" }],
  ["admin/checks", "POST", "/api/admin/checks", {}],
  ["admin/opens", "PUT", "/api/admin/opens", {}],
  ["admin/opens", "DELETE", "/api/admin/opens", {}],
  ["admin/versions", "POST", "/api/admin/versions", {}],
  ["read/bookmarks", "POST", "/api/read/bookmarks", { pageId: "made_up_book/p001" }],
  ["read/bookmarks", "DELETE", "/api/read/bookmarks", { id: "abc" }],
  ["read/settings", "PUT", "/api/read/settings", { reader: { size: 18 } }],
];
const routeCache = new Map();
const routeModule = async (rel) => {
  if (!routeCache.has(rel)) routeCache.set(rel, await import(`../app/api/${rel}/route.ts`));
  return routeCache.get(rel);
};
const callRoute = async ([rel, method, url, body, params]) => {
  const mod = await routeModule(rel);
  return mod[method](jreq(method, url, body), params ? { params: Promise.resolve(params) } : undefined);
};

for (const view of ["reader", "translator"]) {
  await check(`row 6: in the ${view} view every route that changes data answers 403 "${VA.refusalText(view)}" and nothing reaches PocketBase (${ROUTES.length} routes)`, async () => {
    reset();
    signIn("adm000000000001", view);
    for (const r of ROUTES) {
      const res = await callRoute(r);
      assert.equal(res.status, 403, `${r[1]} ${r[2]}`);
      assert.equal((await bodyOf(res)).error, VA.refusalText(view), `${r[1]} ${r[2]}`);
    }
    assert.equal(writes().length, 0, "PocketBase saw: " + writes().map((s) => `${s.method} ${s.path}`).join(", "));
  });
}

await check("row 6: the refusal comes before the role checks (a reader view on an admin route says the view line, not 'Only the admin')", async () => {
  reset();
  signIn("adm000000000001", "reader");
  const res = await callRoute(["admin/readers", "POST", "/api/admin/readers", { id: "x", approved: true }]);
  assert.equal((await bodyOf(res)).error, "You view as a reader. Pick Admin to change data.");
});

await check("without a view the same routes are not refused by the view rule: the admin reaches PocketBase or a later check (bookmarks and a reader approval)", async () => {
  reset();
  signIn("adm000000000001");
  const res = await callRoute(["read/bookmarks", "POST", "/api/read/bookmarks", { pageId: "made_up_book/p001" }]);
  assert.ok(!/You view as/.test(JSON.stringify(await bodyOf(res))));
  assert.ok(writes().some((s) => s.method === "POST" && s.path === "/api/collections/reader_bookmarks/records"), "the bookmark reached PocketBase");
});

await check("a real reader is not in a view: a forged view cookie gives no 'You view as' line, the bookmark reaches PocketBase", async () => {
  reset();
  signIn("rdr000000000001", "translator");
  const res = await callRoute(["read/bookmarks", "POST", "/api/read/bookmarks", { pageId: "made_up_book/p001" }]);
  assert.ok(!/You view as/.test(JSON.stringify(await bodyOf(res))));
  assert.ok(writes().some((s) => s.method === "POST" && s.path === "/api/collections/reader_bookmarks/records"));
});

const progressRoute = await routeModule("read/progress");
await check("row 6: reading progress in a view answers ok with skipped, no error line, and nothing is saved (a bad page name is still refused)", async () => {
  for (const view of ["reader", "translator"]) {
    reset();
    signIn("adm000000000001", view);
    const res = await progressRoute.PUT(jreq("PUT", "/api/read/progress", { pageId: "made_up_book/p048" }));
    assert.equal(res.status, 200);
    assert.deepEqual(await bodyOf(res), { ok: true, skipped: true, pageId: "made_up_book/p048" });
    assert.equal(writes().length, 0);
    const bad = await progressRoute.PUT(jreq("PUT", "/api/read/progress", { pageId: "../etc/passwd" }));
    assert.equal(bad.status, 403, "the PathError of the page name answers 403, as before this unit");
    assert.equal((await bodyOf(bad)).skipped, undefined);
  }
});

await check("progress without a view still saves: a real reader reaches the collection reader_progress", async () => {
  reset();
  signIn("rdr000000000001");
  await progressRoute.PUT(jreq("PUT", "/api/read/progress", { pageId: "made_up_book/p048" }));
  assert.ok(writes().some((s) => /reader_progress/.test(s.path)));
  reset();
  signIn("adm000000000001");
  await progressRoute.PUT(jreq("PUT", "/api/read/progress", { pageId: "made_up_book/p048" }));
  assert.ok(writes().some((s) => /reader_progress/.test(s.path)), "the admin in the normal state saves too");
});

const refreshRoute = await routeModule("htv/refresh");
await check("exception: the token refresh works in a view, and the new token takes the view cookie with the same lifetime", async () => {
  reset();
  jar.clear();
  jar.set("htv_token", tokenOfExp("adm000000000001", 3600));
  jar.set("htv_view_as", "reader");
  const res = await refreshRoute.POST(jreq("POST", "/api/htv/refresh"));
  assert.equal(res.status, 200);
  assert.deepEqual(await bodyOf(res), { ok: true, refreshed: true });
  const t = ops.find((o) => o.name === "htv_token");
  const v = ops.find((o) => o.name === "htv_view_as");
  assert.ok(t && v, JSON.stringify(ops.map((o) => o.name)));
  assert.equal(v.value, "reader");
  assert.equal(v.opts.maxAge, t.opts.maxAge, "the view lives as long as the token");
  assert.ok(Math.abs(t.opts.maxAge - 5 * 86400) <= 5);
});

await check("refresh without a view sets the token cookie only", async () => {
  reset();
  jar.clear();
  jar.set("htv_token", tokenOfExp("adm000000000001", 3600));
  const res = await refreshRoute.POST(jreq("POST", "/api/htv/refresh"));
  assert.equal(res.status, 200);
  assert.deepEqual(ops.map((o) => o.name), ["htv_token"]);
});

const themeRoute = await routeModule("theme");
await check("exception: the theme works in a view (the cookie is set), but the account save is skipped; without a view the account is saved", async () => {
  reset();
  signIn("adm000000000001", "reader");
  let res = await themeRoute.PUT(jreq("PUT", "/api/theme", { theme: "dark" }));
  assert.equal(res.status, 200);
  assert.deepEqual(await bodyOf(res), { ok: true, theme: "dark", account: false });
  assert.ok(ops.some((o) => o.op === "set" && o.name === "theme" && o.value === "dark"));
  assert.equal(writes().length, 0, "nothing was saved in the account");
  reset();
  signIn("adm000000000001");
  res = await themeRoute.PUT(jreq("PUT", "/api/theme", { theme: "sepia" }));
  assert.equal(res.status, 200);
  assert.ok(writes().some((s) => /user_settings/.test(s.path)), "no view: the account is asked");
});

const issuesRoute = await routeModule("issues");
function issueRequest(comment = "The button is too small.") {
  const form = new FormData();
  form.set("comment", comment);
  form.set("page_url", "/read/made_up_book");
  form.set("screen_width", "1280");
  form.set("theme", "light");
  form.set("picture", new Blob([PNG], { type: "image/png" }), "issue.png");
  return new Request("http://localhost/api/issues", { method: "POST", headers: { origin: "http://localhost", host: "localhost" }, body: form });
}
// A multipart form turns a line end into CRLF (the form spec), so the stored comment is compared with LF line ends. splitViewNote takes both.
const nl = (t) => String(t).replace(/\r\n/g, "\n");
const postedForms = () => seen.filter((s) => s.method === "POST" && s.path === "/api/collections/visual_issues/records").map((s) => s.form);

await check("row 7: an issue sent in the reader view is stored with the first line 'Viewed as: reader.', for the admin, with the token of the admin", async () => {
  reset();
  signIn("adm000000000001", "reader");
  const res = await issuesRoute.POST(issueRequest());
  assert.equal(res.status, 200, JSON.stringify(await bodyOf(res)));
  const f = postedForms();
  assert.equal(f.length, 1);
  assert.equal(nl(f[0].get("comment")), "Viewed as: reader.\nThe button is too small.");
  assert.equal(f[0].get("user"), "adm000000000001");
  assert.equal(f[0].get("state"), "open");
  assert.equal(seen.find((s) => s.path === "/api/collections/visual_issues/records").token, tokenOf("adm000000000001"));
});

await check("row 7: the translator view notes 'Viewed as: translator.'; the normal state adds no note", async () => {
  reset();
  signIn("adm000000000001", "translator");
  assert.equal((await issuesRoute.POST(issueRequest("Spacing is off."))).status, 200);
  assert.equal(nl(postedForms()[0].get("comment")), "Viewed as: translator.\nSpacing is off.");
  reset();
  signIn("adm000000000001");
  assert.equal((await issuesRoute.POST(issueRequest("Spacing is off."))).status, 200);
  assert.equal(postedForms()[0].get("comment"), "Spacing is off.");
  reset();
  signIn("trn000000000001", "reader");
  assert.equal((await issuesRoute.POST(issueRequest("A real translator with a forged cookie."))).status, 200);
  assert.equal(postedForms()[0].get("comment"), "A real translator with a forged cookie.", "a forged cookie adds no note");
});

await check("row 7: a real reader still gets 403 on the issue route, also with a forged cookie; a comment at the limit gets a plain 400 in a view", async () => {
  reset();
  signIn("rdr000000000001", "translator");
  assert.equal((await issuesRoute.POST(issueRequest())).status, 403);
  assert.equal(postedForms().length, 0);
  reset();
  signIn("adm000000000001", "reader");
  const res = await issuesRoute.POST(issueRequest("a".repeat(5000)));
  assert.equal(res.status, 400);
  assert.match((await bodyOf(res)).error, /too long in a view/);
  assert.equal(postedForms().length, 0);
});

const VI = await import("../lib/visual-issues.ts");
const VS = await import("../lib/view-as-server.ts");
await check("row 7: the icon rule uses the real role: it stays in the reader view and the translator view; a real reader has none", async () => {
  reset();
  signIn("adm000000000001", "reader");
  assert.equal(await VI.canReportIssues(), true);
  signIn("adm000000000001", "translator");
  assert.equal(await VI.canReportIssues(), true);
  signIn("adm000000000001");
  assert.equal(await VI.canReportIssues(), true);
  signIn("trn000000000001");
  assert.equal(await VI.canReportIssues(), true);
  signIn("rdr000000000001", "translator");
  assert.equal(await VI.canReportIssues(), false);
  signIn(null);
  assert.equal(await VI.canReportIssues(), false);
});

await check("viewInfo (the flags of the layout): admin and view for an admin; no flag for a translator, a reader, no session, and a PocketBase that is down", async () => {
  reset();
  signIn("adm000000000001");
  assert.deepEqual(await VS.viewInfo(), { admin: true, view: null });
  signIn("adm000000000001", "reader");
  assert.deepEqual(await VS.viewInfo(), { admin: true, view: "reader" });
  signIn("adm000000000001", "translator");
  assert.deepEqual(await VS.viewInfo(), { admin: true, view: "translator" });
  for (const id of ["trn000000000001", "rdr000000000001"]) {
    signIn(id, "reader");
    assert.deepEqual(await VS.viewInfo(), { admin: false, view: null }, id);
  }
  signIn(null);
  assert.deepEqual(await VS.viewInfo(), { admin: false, view: null });
  signIn("adm000000000001", "reader");
  behavior.down = true;
  assert.deepEqual(await VS.viewInfo(), { admin: false, view: null });
  behavior.down = false;
});

// ---------------------------------------------------------------- part 4: the select, the band, the bars, the layout

const { ViewAsProvider } = await import("../components/ViewAsProvider.tsx");
const { default: ViewAsSelect } = await import("../components/ViewAsSelect.tsx");
const { default: ViewAsBand } = await import("../components/ViewAsBand.tsx");
const { default: ReaderBar } = await import("../components/ReaderBar.tsx");
const { default: HtvBar } = await import("../components/HtvBar.tsx");
const withState = (state, child) => renderToStaticMarkup(h(ViewAsProvider, state, child));

await check("select (rows 1 and 2): an admin sees 'View as' with 3 options and the current choice selected; the select shows in a view too", () => {
  let html = withState({ admin: true, view: null, monitor: false }, h(ViewAsSelect));
  assert.match(html, /<select[^>]*aria-label="View as"/);
  assert.deepEqual([...html.matchAll(/<option[^>]*value="([a-z]+)"[^>]*>([^<]+)<\/option>/g)].map((m) => [m[1], m[2]]), [["admin", "Admin (normal)"], ["translator", "Translator"], ["reader", "Reader"]]);
  assert.match(html, /<option value="admin" selected/);
  html = withState({ admin: true, view: "reader", monitor: false }, h(ViewAsSelect));
  assert.match(html, /<option value="reader" selected/);
  html = withState({ admin: true, view: "translator", monitor: false }, h(ViewAsSelect));
  assert.match(html, /<option value="translator" selected/);
});

await check("select: no admin, no provider, or a Monitor path gives nothing", () => {
  assert.equal(withState({ admin: false, view: null, monitor: false }, h(ViewAsSelect)), "");
  assert.equal(withState({ admin: false, view: "reader", monitor: false }, h(ViewAsSelect)), "", "a non-admin never shows a select, whatever the flag");
  assert.equal(renderToStaticMarkup(h(ViewAsSelect)), "");
});

await check("band (row 3): the reader view shows 'You view the site as a reader.' and the button 'Back to admin'; the translator view the same for a translator", () => {
  for (const view of ["reader", "translator"]) {
    const html = withState({ admin: true, view, monitor: false }, h(ViewAsBand));
    assert.match(html, /role="status"/);
    assert.ok(html.includes(`data-view="${view}"`));
    assert.equal(htmlText(html).includes(`You view the site as a ${view}.`), true, htmlText(html));
    assert.match(html, /<button[^>]*data-view-back[^>]*>Back to admin<\/button>/);
  }
  const a = withState({ admin: true, view: "reader", monitor: false }, h(ViewAsBand));
  const b = withState({ admin: true, view: "translator", monitor: false }, h(ViewAsBand));
  assert.notEqual(a.match(/class="([^"]*)"/)[1], b.match(/class="([^"]*)"/)[1], "the two views have two colors");
});

await check("band: no band in the normal state, for a non-admin, and without a provider", () => {
  assert.equal(withState({ admin: true, view: null, monitor: false }, h(ViewAsBand)), "");
  assert.equal(withState({ admin: false, view: "reader", monitor: false }, h(ViewAsBand)), "");
  assert.equal(renderToStaticMarkup(h(ViewAsBand)), "");
});

await check("band colors: the text on the band has a contrast of 4.5 to 1 or more (reader #f4c542 on #1f1d1a, translator #8fd0f0 on #0b1f2a)", () => {
  const src = read("components/ViewAsBand.tsx");
  const classes = Object.fromEntries([...src.matchAll(/(reader|translator): "bg-\[(#[0-9a-f]{6})\] text-\[(#[0-9a-f]{6})\]"/g)].map((m) => [m[1], [m[2], m[3]]]));
  assert.deepEqual(Object.keys(classes).sort(), ["reader", "translator"]);
  for (const [view, [bg, fg]] of Object.entries(classes)) assert.ok(ratio(fg, bg) >= 4.5, `${view}: ${ratio(fg, bg).toFixed(2)}`);
});

await check("bars (rows 1 and 4): both bars draw the select inside the provider only for an admin, and nothing for the others; the bar links follow the role", () => {
  const reader = (state, role) => withState(state, h(ReaderBar, { name: "Made Up", email: "m@example.test", role, approved: true }));
  const htv = (state, role) => withState(state, h(HtvBar, { name: "Made Up", email: "m@example.test", role }));
  for (const [bar, name] of [[reader, "reader bar"], [htv, "translator bar"]]) {
    assert.match(bar({ admin: true, view: null, monitor: false }, "admin"), /data-view-as-select/, name);
    assert.match(bar({ admin: true, view: "reader", monitor: false }, "reader"), /data-view-as-select/, name + " in the reader view");
    assert.doesNotMatch(bar({ admin: false, view: null, monitor: false }, "translator"), /data-view-as/, name);
    assert.doesNotMatch(bar({ admin: false, view: null, monitor: false }, "reader"), /data-view-as/, name);
  }
  // The links are drawn from the role that the page gives. In the reader view the page gives role reader.
  const asReader = reader({ admin: true, view: "reader", monitor: false }, "reader");
  assert.doesNotMatch(asReader, /data-admin-link/);
  assert.doesNotMatch(asReader, /Human translation/);
  const asTranslator = reader({ admin: true, view: "translator", monitor: false }, "translator");
  assert.doesNotMatch(asTranslator, /data-admin-link/);
  assert.match(asTranslator, /Human translation/);
  const asAdmin = reader({ admin: true, view: null, monitor: false }, "admin");
  assert.equal([...asAdmin.matchAll(/data-admin-link/g)].length, 3);
  const htvTranslator = htv({ admin: true, view: "translator", monitor: false }, "translator");
  assert.doesNotMatch(htvTranslator, /data-admin-link/);
  assert.match(htvTranslator, /data-read-link/);
});

await check("sources: the layout reads the flags without a token, wraps the page in the provider, draws the band above the top band, and keeps the VW118 lines", () => {
  const src = noComments(read("app/layout.tsx"));
  assert.ok(/const viewPending = viewInfo\(\)/.test(src));
  assert.ok(/const reporter = await canReportIssues\(\)/.test(src), "the VW118 line stays");
  assert.ok(/\{reporter \? <VisualIssueTool theme=\{theme\} \/> : null\}/.test(src), "the VW118 line stays");
  assert.ok(/<ViewAsProvider admin=\{admin\} view=\{view\} monitor=\{monitor\}>/.test(src));
  assert.ok(src.indexOf("<ViewAsBand />") > 0 && src.indexOf("<ViewAsBand />") < src.indexOf("<Nav "), "the band is above the top band");
  for (const f of ["components/ViewAsProvider.tsx", "components/ViewAsSelect.tsx", "components/ViewAsBand.tsx"]) {
    const s = noComments(read(f));
    assert.ok(!/htv_token|COOKIE_NAME|getSession|Authorization|localStorage|sessionStorage/.test(s), f);
    assert.ok(!/from "@\/lib\/(visual-issues|htv-session|pb|config|view-as-server)"/.test(s), "no server module in " + f);
  }
});

await check("sources: every route of the list that changes data uses guard() without allowInView; only refresh and progress pass allowInView", () => {
  const dir = path.join(app, "app", "api");
  const hits = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "route.ts" && /allowInView/.test(readFileSync(p, "utf8"))) hits.push(path.relative(dir, p));
    }
  };
  walk(dir);
  assert.deepEqual(hits.sort(), ["htv/refresh/route.ts", "read/progress/route.ts"]);
  const api = noComments(read("lib/htv-api.ts"));
  assert.ok(/if \(s\.view && opts\.mutating && !opts\.allowInView\) return jsonResponse\(\{ error: refusalText\(s\.view\) \}, 403\)/.test(api));
  assert.ok(/opts\.write && s\.realRole === "reader"/.test(api), "the write check uses the real role (the issue route works in a view)");
});

// ---------------------------------------------------------------- part 5: the reader words

const RT = await import("../lib/reader-types.ts");
const RL = await import("../lib/reader-layout.ts");
const MODELS = /gemini|grok|claude|haiku|sonnet|opus|gpt|terra|hydrogen|llama|qwen|deepseek|mistral|openai|anthropic/i;
const clean = (label, text) => {
  assert.ok(!/agent/i.test(text), `${label} has the word agent: ${text}`);
  assert.ok(!MODELS.test(text), `${label} has a model name: ${text}`);
};

await check("reader words (Q-A 3:103.4): the accepted new texts", () => {
  assert.equal(RT.NO_TEXT, "No English translation yet");
  assert.equal(RT.LABEL_V1, "Earlier machine translation (placeholder)");
  assert.equal(RL.COMPONENT_NAMES.agent, "AI translation");
  assert.equal(RT.LABEL_SYNOPSIS, "Written by AI");
});

await check("reader words: no 'agent' and no model name in any text constant that a reader sees", () => {
  const labels = Object.entries(RT).filter(([k, v]) => typeof v === "string" && /^(LABEL_|NO_|PAGE_VIEW_ONLY|PAIR_NEEDS|KEEP_ONE)/.test(k));
  assert.ok(labels.length >= 14, "the list of constants: " + labels.length);
  for (const [k, v] of labels) clean(k, v);
  for (const [id, name] of Object.entries(RL.COMPONENT_NAMES)) clean("COMPONENT_NAMES." + id, name);
});

await check("reader words: the AI label stays (the project rule: the AI label is always on)", () => {
  assert.equal(RT.LABEL_AGENT_UNCHECKED, "AI translation, not yet checked by a person");
  assert.equal(RT.LABEL_AGENT_CHECKED, "AI translation, checked by a person");
  assert.equal(RT.LABEL_AGREE_ROW, "AI translation, checked by a translator");
  for (const v of [RT.LABEL_AGENT_UNCHECKED, RT.LABEL_AGENT_CHECKED, RT.LABEL_AGREE_ROW, RL.COMPONENT_NAMES.agent]) assert.ok(/AI translation/.test(v));
  assert.equal(RT.LABEL_HUMAN_DEFAULT, "Human translation from kendojidai.com.");
});

await check("reader words: the component list (name and note of each row, grey reasons) and the note line 'Not on this page' have no agent word", () => {
  const eff = RL.effectiveSettings({}, "page");
  const index = { images: true, agentPages: [1], humanPages: [1], v1Pages: [1] };
  const all = { image: true, ja: true, agent: true, human: true, v1en: true, v1zh: true, enorig: false, terms: true };
  const none = { image: false, ja: false, agent: false, human: false, v1en: false, v1zh: false, enorig: false, terms: false };
  for (const [has, drawn] of [
    [all, { ids: ["image", "agent"], missing: [], others: [], first: true }],
    [none, { ids: [], missing: [], others: [], first: true }],
    [null, { ids: [], missing: [], others: [], first: true }],
  ]) {
    const m = RL.componentRows(index, eff, has, drawn, "admin", true, "book");
    assert.equal(m.rows.length, 6 - 0, "all 6 components of the work");
    for (const r of m.rows) {
      clean("row name " + r.id, r.name);
      clean("row note " + r.id, r.note);
    }
    clean("pair note", m.pair.note);
    clean("terms note", m.terms.note);
  }
  const m = RL.componentRows(index, eff, all, { ids: ["image", "agent"], missing: [], others: [], first: true }, "admin", true, "book");
  const agent = m.rows.find((r) => r.id === "agent");
  assert.equal(agent.name, "AI translation");
  assert.equal(agent.note, "", "the note does not repeat the name");
  assert.equal(m.rows.find((r) => r.id === "v1en").note, "Earlier machine translation (placeholder)");
  const grey = RL.componentRows(index, eff, { ...all, agent: false }, { ids: ["image"], missing: [], others: [], first: true }, "admin", true, "book");
  assert.equal(grey.rows.find((r) => r.id === "agent").note, "No English translation yet");
  const work = RL.workHas(index);
  const note = RL.missingNote({ ids: ["image"], missing: ["agent"], others: ["ja"], first: false }, work);
  assert.equal(note, "Not on this page: AI translation. On this page, in the Components list: Original text.");
  clean("missingNote", note);
});

await check("reader words: the page lines, the badge, and the empty line in the rendered reader parts (ReaderIndex tags and empty line, page line of ReaderPageView)", async () => {
  const { default: ReaderIndex } = await import("../components/ReaderIndex.tsx");
  const html = renderToStaticMarkup(h(ReaderIndex, { slug: "made_up_book", pages: 3, digits: 3, textPages: [1], agentPages: [1], humanPages: [], checkedPages: [], chapters: [], current: 1, view: "scroll", dense: false }));
  const text = htmlText(html);
  assert.ok(text.includes("No English translation yet"), text);
  assert.ok(text.includes("AI"), "the AI tag stays");
  clean("ReaderIndex", text);
  for (const [attr, val] of html.matchAll(/(aria-label|title|placeholder)="([^"]*)"/g).map((m) => [m[1], m[2]])) clean("ReaderIndex " + attr, val);
});

await check("reader words: the saved keys stay (component id 'agent', the ids of the settings, the key 'agent' of the reader value en)", async () => {
  const HS = await import("../lib/htv-settings.ts");
  assert.deepEqual([...HS.COMPONENT_IDS], ["image", "ja", "agent", "human", "v1en", "v1zh", "enorig"]);
  assert.deepEqual(HS.DEFAULT_COMPONENT_ORDER, ["image", "ja", "agent", "human", "v1en", "v1zh"]);
  assert.equal(HS.sanitizeReader({ en: "agent" }).en, "agent");
  assert.deepEqual(HS.sanitizeReader({ components: ["agent", "ja"] }).components?.slice(0, 2), ["agent", "ja"], "an old saved order that holds the id agent still loads");
});

await check("reader words: /translate keeps its words (the pane label 'Agent translation' and the fold line 'Agent translation: n of m pages')", async () => {
  const HS = await import("../lib/htv-settings.ts");
  assert.equal(HS.PANE_LABELS?.agent ?? HS.PANE_NAMES?.agent ?? Object.values(HS).find((v) => v && typeof v === "object" && v.agent === "Agent translation")?.agent, "Agent translation");
  const TD = await import("../lib/translate-dash.ts");
  assert.match(TD.agentFoldLine(3, 10), /^Agent translation: 3 of 10 pages/);
  assert.match(TD.agentLine(3, 10), /Agent translation/);
});

await check("reader words: the Monitor and /translate files that hold the word agent are not part of the reader screens (no import from the reader files)", () => {
  for (const f of ["components/HtvBook.tsx", "components/HtvPageSection.tsx", "components/TranslateWork.tsx", "components/HtvList.tsx"]) {
    const s = noComments(read(f));
    assert.ok(!/from "@\/lib\/reader-types"|from "@\/lib\/reader-layout"/.test(s) || !/NO_TEXT|LABEL_V1|LABEL_SYNOPSIS|COMPONENT_NAMES/.test(s), f + " shares a reader label");
  }
});

// ---------------------------------------------------------------- part 6: the folds

const css = read("app/globals.css");
/** The color variables of each theme block of globals.css: ":root" is light, the others are [data-theme="..."]. */
function themeVars() {
  const out = {};
  for (const m of css.matchAll(/(:root|\[data-theme="([a-z-]+)"\])\s*\{([^}]*)\}/g)) {
    const name = m[2] ?? "light";
    const vars = Object.fromEntries([...m[3].matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((v) => [v[1], v[2]]));
    if (vars.open) out[name] = { ...(out[name] ?? {}), ...vars };
  }
  return out;
}

await check("folds (rows 1, 2, 4): the rule gives an open fold of level 2 or deeper --open-deep and level 1 keeps --open; the VW112 rule is not changed", () => {
  assert.match(css, /:where\(main\) details\[open\] > summary,\s*:where\(main\) button\[aria-expanded="true"\]\s*\{[^}]*background-color: var\(--open\)/, "the VW112 rule stays");
  assert.match(css, /:where\(main\) details\[open\]\[data-fold-level\]:not\(\[data-fold-level="1"\]\) > summary\s*\{\s*background-color: var\(--open-deep\);\s*\}/);
  const layerStart = css.indexOf("@layer components {", css.indexOf("Unit VW112 (Q-A 3:78.4 note)"));
  const deep = css.indexOf("details[open][data-fold-level]:not");
  const old = css.indexOf(":where(main) details[open] > summary,");
  assert.ok(layerStart > 0 && old > layerStart && deep > old, "the new rule is in the same layer, after the old one");
});

await check("folds (row 2): all 5 themes define their own --open-deep, different from --open and from each other", () => {
  const t = themeVars();
  assert.deepEqual(Object.keys(t).sort(), ["dark", "light", "sepia", "solarized-dark", "solarized-light"]);
  const deeps = Object.entries(t).map(([name, v]) => {
    assert.ok(v["open-deep"], name + " has --open-deep");
    assert.notEqual(v["open-deep"], v.open, name + ": different from --open");
    return v["open-deep"];
  });
  assert.equal(new Set(deeps).size, 5, "five different colors: " + deeps.join(" "));
});

for (const [name, v] of Object.entries(themeVars())) {
  await check(`folds (row 2): theme ${name}: the text contrast on --open-deep ${v["open-deep"]} is 4.5 to 1 or more (foreground, muted, accent, title)`, () => {
    const light = themeVars().light;
    for (const k of ["foreground", "muted", "accent", "title"]) {
      const fg = v[k] ?? light[k];
      assert.ok(ratio(fg, v["open-deep"]) >= 4.5, `${k} ${fg} on ${v["open-deep"]}: ${ratio(fg, v["open-deep"]).toFixed(2)}`);
    }
  });
}

const F = await import("../lib/reader-folds.ts");
const PB = await import("../lib/pb.ts");
const { default: ReaderList } = await import("../components/ReaderList.tsx");

behavior.catalog = [
  { item_id: "made_en_author", kind: "book", title_en: "Made-up Book With English Author", title_ja: "架空の本一", author_en: "Ann Example", author_ja: "例 アン", publish_year: "1990", pages: 100, translated: { en: [1, 2] } },
  { item_id: "made_ja_author", kind: "book", title_en: "Made-up Book With Japanese Author", title_ja: "架空の本二", author_en: "", author_ja: "例 太郎", publish_year: "1991", pages: 50, translated: { en: [] } },
  { item_id: "made_no_author", kind: "book", title_en: "Made-up Book Without Author", title_ja: "架空の本三", publish_year: "1992", pages: 40, translated: { en: [] } },
  { item_id: "made_series_a", kind: "book", title_en: "Made-up Series Same Author", title_ja: "架空の連作", author_en: "Bob Example", publish_year: "1993", pages: 30, translated: { en: [] }, row: { part_title_en: "Part One" } },
  { item_id: "made_series_b", kind: "book", title_en: "Made-up Series Same Author", title_ja: "架空の連作", author_en: "Bob Example", publish_year: "1994", pages: 30, translated: { en: [] }, row: { part_title_en: "Part Two" } },
  { item_id: "made_mixed_a", kind: "book", title_en: "Made-up Series Mixed Authors", title_ja: "架空の混合", author_en: "Cy Example", publish_year: "1995", pages: 30, translated: { en: [] } },
  { item_id: "made_mixed_b", kind: "book", title_en: "Made-up Series Mixed Authors", title_ja: "架空の混合", author_en: "Di Example", publish_year: "1996", pages: 30, translated: { en: [] } },
];
const works = await PB.catalogWorks(tokenOf("rdr000000000001"));
const tocBooks = new Map(works.map((w) => [w.slug, { chapters: 3, rows: 9 }]));
const dash = F.buildFolds(works, [], undefined, tocBooks);
const booksFold = dash.folds.find((f) => f.id === "books");
const flat = (f) => f.children.flatMap((c) => (c.type === "fold" ? [c, ...flat(c)] : []));
const folds = booksFold ? flat(booksFold) : [];
const byToc = (slug) => folds.find((f) => f.toc === slug);

await check("author (Q-A 3:103.6 row 3): the data of the work has the English author first, else the Japanese author, else an empty text", () => {
  assert.equal(works.find((w) => w.slug === "made_en_author").author, "Ann Example");
  assert.equal(works.find((w) => w.slug === "made_ja_author").author, "例 太郎");
  assert.equal(works.find((w) => w.slug === "made_no_author").author, "");
});

await check("author: the book fold carries the author; a book with no author has no author key; the group 'Books' and the months have none", () => {
  assert.ok(booksFold && folds.length >= 7, "folds: " + folds.length);
  assert.equal(byToc("made_en_author").author, "Ann Example");
  assert.equal(byToc("made_ja_author").author, "例 太郎");
  assert.equal("author" in byToc("made_no_author"), false);
  assert.equal("author" in booksFold, false);
});

await check("author: a series fold shows the author that all its books share; books with different authors give no author on the series fold, but each book fold keeps its own", () => {
  const series = folds.filter((f) => f.id.startsWith("books-series-"));
  assert.equal(series.length, 2);
  const same = series.find((f) => f.title === "Made-up Series Same Author");
  const mixed = series.find((f) => f.title === "Made-up Series Mixed Authors");
  assert.equal(same.author, "Bob Example");
  assert.equal("author" in mixed, false);
  assert.equal(byToc("made_mixed_a").author, "Cy Example");
  assert.equal(byToc("made_mixed_b").author, "Di Example");
});

const drawList = (to) => renderToStaticMarkup(h(ReaderList, { dash: { ...dash, folds: F.lazyMonths(dash.folds, "") }, approved: true, openId: "", ...(to ? { to } : {}) }));
for (const to of [undefined, "translate"]) {
  await check(`author (rows 3 and 4): the fold line of a book shows '· <author>' after the title in smaller gray text, ${to ? "on /translate" : "on /read"} (the same folds)`, () => {
    const html = drawList(to);
    const summaryOf = (title) => {
      const i = html.indexOf(`>${title}</span>`);
      assert.ok(i > 0, title);
      const start = html.lastIndexOf("<summary", i);
      return html.slice(start, html.indexOf("</summary>", i));
    };
    const en = summaryOf("Made-up Book With English Author");
    assert.match(en, /<span class="text-sm text-muted" data-fold-author="true">· Ann Example<\/span>/);
    assert.ok(en.indexOf("Made-up Book With English Author") < en.indexOf("data-fold-author"), "the author is after the title");
    assert.match(summaryOf("Made-up Book With Japanese Author"), /data-fold-author="true">· 例 太郎<\/span>/);
    assert.doesNotMatch(summaryOf("Made-up Book Without Author"), /data-fold-author/);
    assert.doesNotMatch(summaryOf("Books"), /data-fold-author/);
    assert.match(summaryOf("Made-up Series Same Author"), /data-fold-author="true">· Bob Example<\/span>/);
    assert.doesNotMatch(summaryOf("Made-up Series Mixed Authors"), /data-fold-author/);
  });
}

await check("folds (row 1): the folds carry data-fold-level (1 for Books, 2 for a book and a series), so the rule can tell the levels apart", () => {
  const html = drawList(undefined);
  assert.match(html, /<details open="" data-fold="books" data-fold-level="1"/);
  assert.match(html, /data-fold="books-series-1" data-fold-level="2"/);
  assert.match(html, /data-fold="toc-made_en_author" data-fold-level="2"/);
});

await new Promise((resolve) => server.close(resolve));
done();
