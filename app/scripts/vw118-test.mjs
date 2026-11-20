// VW118 (round 106, card P53.1): server-free tests of the visual-issue tool (Q-A 3:98.5 owner words, Q-A 3:99.5 rows 1 to 9).
// Owner words (Q-A 3:98.5, 2026-11-19): "Add a visual-issue tool: + a small floating icon + If user click it, they will take screenshot of a specific part of the current page (esc to go back)
// + then write a comment and draw on the screenshot, then click send issue. + We will store these issue and gradually resolve them".
//   part 1  lib/visual-issue-rules.ts: the pure rules (role gate, page address without host, field limits, Esc steps, box, pen, Undo, Clear, scales, readable labels)
//   part 2  the limits of the rules equal the numbers of the migration 1793300017 (a fake of the migration object runs the up function)
//   part 3  the routes with a fake PocketBase (a local http server on 127.0.0.1) and a fake cookie: no session, a reader, a translator, an admin, a forged user and state, the limits
//   part 4  the role gate of the icon (canReportIssues): translator and admin yes, reader no, no session no, PocketBase down no
//   part 5  the components as HTML and the sources (every part has the mark that the capture leaves out, Esc at every step, no token goes to the browser, the admin link)
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw118-test.mjs. The last line is "<n> passed, <m> failed". Made-up data only (example.test addresses). No real PocketBase, no network.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import vm from "node:vm";
import { createRequire, registerHooks } from "node:module";
import { checker, htmlText, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/read");
// A fake of next/headers: the cookie "htv_token" comes from globalThis.__vw118Cookie. This hook is registered after the kit hook, so it runs first.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/headers") {
      const src = `export async function cookies(){ return { get(n){ const v = globalThis.__vw118Cookie; return n === "htv_token" && v ? { name: n, value: v } : undefined; } }; } export async function headers(){ return new Headers(); }`;
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

const R = await import("../lib/visual-issue-rules.ts");

// ---------------------------------------------------------------- part 1: the pure rules

await check("canReportIssue (row 1): a translator and an admin yes, a reader, no role, and a made-up role no", () => {
  assert.equal(R.canReportIssue("translator"), true);
  assert.equal(R.canReportIssue("admin"), true);
  for (const v of ["reader", "qa", "", null, undefined, "Admin", "ADMIN"]) assert.equal(R.canReportIssue(v), false, String(v));
});

await check("pageUrlOf (row 5): the path and the query stay, the host, the user, the port and the hash go, a bad input gives /", () => {
  assert.equal(R.pageUrlOf("https://kendotranslation.com/read/made_up_book?page=3#top"), "/read/made_up_book?page=3");
  assert.equal(R.pageUrlOf("http://localhost:3000/"), "/");
  assert.equal(R.pageUrlOf("https://user:pw" + "@host.example:8443/a/b?c=d"), "/a/b?c=d");
  assert.equal(R.pageUrlOf("/translate/made_up_book"), "/translate/made_up_book");
  assert.equal(R.pageUrlOf("//evil.example/path"), "/path", "a scheme-relative address loses its host");
  for (const v of [null, undefined, 5, {}, []]) assert.equal(R.pageUrlOf(v), "/");
  assert.ok(!R.pageUrlOf("javascript:alert(1)").includes("javascript"));
  for (const v of ["https://kendotranslation.com/read", "http://localhost:3000/page/x/p001?y=1", "//evil.example/z"]) assert.ok(!/^[a-z]+:|\/\/|kendotranslation|localhost|evil/i.test(R.pageUrlOf(v)), v);
});

await check("pageUrlOf: an address of 5000 characters is cut at 2000 (the field limit of PocketBase)", () => {
  const long = "/p?" + "a".repeat(5000);
  assert.equal(R.pageUrlOf("https://x.example" + long).length, R.PAGE_URL_MAX);
  assert.equal(R.PAGE_URL_MAX, 2000);
});

await check("isSafePagePath: one leading slash only, no backslash, no control character, no scheme-relative start", () => {
  assert.equal(R.isSafePagePath("/read/x?y=1"), true);
  for (const v of ["//evil.example", "http://evil.example", "read/x", "/a\\b", "/a\nb", "/a\u0000b", "", null, 5]) assert.equal(R.isSafePagePath(v), false, String(v));
});

await check("checkIssueInput (row 5): a valid input passes and is trimmed, the host is cut from the page address, the width is a whole number from 1 to 20000", () => {
  const r = R.checkIssueInput({ comment: "  The button is too small.  ", pageUrl: "https://kendotranslation.com/read?x=1#h", screenWidth: "390", theme: "dark" });
  assert.deepEqual(r, { ok: true, value: { comment: "The button is too small.", pageUrl: "/read?x=1", screenWidth: 390, theme: "dark" } });
  const w = (v) => R.checkIssueInput({ comment: "c", pageUrl: "/", screenWidth: v, theme: "light" }).value.screenWidth;
  assert.equal(w(1280), 1280);
  assert.equal(w("1280"), 1280);
  assert.equal(w(20000), 20000);
  assert.equal(w(99999), 20000);
  assert.equal(w("999999"), 20000);
  for (const v of [0, -5, 390.5, "390.5", "abc", "", null, undefined, NaN, Infinity, "1e3", "-1"]) assert.equal(w(v), 1, String(v));
});

await check("checkIssueInput: an empty or blank or missing comment is refused, 5000 characters pass, 5001 are refused (the same limit as the migration)", () => {
  for (const c of ["", "   ", "\n\t ", undefined, null, 5, {}]) {
    const r = R.checkIssueInput({ comment: c, pageUrl: "/", screenWidth: 1, theme: "light" });
    assert.equal(r.ok, false, String(c));
    assert.equal(r.error, "Write a comment.");
  }
  assert.equal(R.checkIssueInput({ comment: "a".repeat(5000), pageUrl: "/", screenWidth: 1, theme: "" }).ok, true);
  const long = R.checkIssueInput({ comment: "a".repeat(5001), pageUrl: "/", screenWidth: 1, theme: "" });
  assert.equal(long.ok, false);
  assert.ok(/5000/.test(long.error));
  assert.equal(R.COMMENT_MAX, 5000);
});

await check("checkIssueInput: the theme is a lower case word with a dash (up to 40 characters), anything else becomes empty", () => {
  const t = (v) => R.checkIssueInput({ comment: "c", pageUrl: "/", screenWidth: 1, theme: v }).value.theme;
  for (const v of ["light", "dark", "sepia", "solarized-light", "solarized-dark"]) assert.equal(t(v), v);
  for (const v of ["Dark", "<script>", "a b", "x".repeat(41) + "1", "a_b", "", null, 5, "light;drop"]) assert.equal(t(v), "", String(v));
  assert.equal(t("x".repeat(40)), "x".repeat(40));
});

await check("checkResolveNote (row 8): no note gives an empty note, a note is trimmed, 2000 characters pass, 2001 are refused, a non-text is refused", () => {
  assert.deepEqual(R.checkResolveNote(undefined), { ok: true, note: "" });
  assert.deepEqual(R.checkResolveNote(null), { ok: true, note: "" });
  assert.deepEqual(R.checkResolveNote("  unit VW118, commit abc1234  "), { ok: true, note: "unit VW118, commit abc1234" });
  assert.equal(R.checkResolveNote("n".repeat(2000)).ok, true);
  assert.equal(R.checkResolveNote("n".repeat(2001)).ok, false);
  for (const v of [5, {}, [], true]) assert.equal(R.checkResolveNote(v).ok, false, JSON.stringify(v));
  assert.equal(R.NOTE_MAX, 2000);
});

await check("isPngBytes and isIssueId", () => {
  assert.equal(R.isPngBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), true);
  assert.equal(R.isPngBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])), false, "a JPEG");
  assert.equal(R.isPngBytes(new Uint8Array([0x89, 0x50])), false, "too short");
  assert.equal(R.isPngBytes(new TextEncoder().encode("<svg></svg>")), false);
  assert.equal(R.isIssueId("abc123XYZ"), true);
  for (const v of ["", "a/b", "a.b", "../x", "a b", "x".repeat(41), null, 5, "a?b=1", "a%2Fb"]) assert.equal(R.isIssueId(v), false, String(v));
});

await check("Esc (rows 3 and 4): a drag goes back to select, every other step goes to idle, and the whole path back from the editor takes one Esc each step", () => {
  assert.equal(R.stepAfterEscape("drag"), "select");
  assert.equal(R.stepAfterEscape("select"), "idle");
  assert.equal(R.stepAfterEscape("capture"), "idle");
  assert.equal(R.stepAfterEscape("editor"), "idle");
  assert.equal(R.stepAfterEscape("idle"), "idle");
  let s = "drag";
  s = R.stepAfterEscape(s);
  assert.equal(s, "select");
  s = R.stepAfterEscape(s);
  assert.equal(s, "idle");
});

await check("normalizeBox (row 3): a drag in any direction gives the same box, the pointer outside the window is cut, a side under 16 px gives null", () => {
  const view = { w: 1280, h: 720 };
  assert.deepEqual(R.normalizeBox({ x: 100, y: 50 }, { x: 300, y: 250 }, view), { x: 100, y: 50, w: 200, h: 200 });
  assert.deepEqual(R.normalizeBox({ x: 300, y: 250 }, { x: 100, y: 50 }, view), { x: 100, y: 50, w: 200, h: 200 });
  assert.deepEqual(R.normalizeBox({ x: 300, y: 50 }, { x: 100, y: 250 }, view), { x: 100, y: 50, w: 200, h: 200 });
  assert.deepEqual(R.normalizeBox({ x: -50, y: -50 }, { x: 2000, y: 2000 }, view), { x: 0, y: 0, w: 1280, h: 720 });
  assert.deepEqual(R.normalizeBox({ x: 10, y: 10 }, { x: 26, y: 26 }, view), { x: 10, y: 10, w: 16, h: 16 });
  assert.equal(R.normalizeBox({ x: 10, y: 10 }, { x: 25, y: 200 }, view), null, "15 px wide");
  assert.equal(R.normalizeBox({ x: 10, y: 10 }, { x: 200, y: 25 }, view), null, "15 px high");
  assert.equal(R.normalizeBox({ x: 10, y: 10 }, { x: 10, y: 10 }, view), null, "a click without a drag");
  assert.equal(R.normalizeBox({ x: 1270, y: 10 }, { x: 5000, y: 200 }, view), null, "cut to the window it is 10 px wide");
});

await check("the pen (row 4): red, 3 screen pixels, the width in picture pixels follows the zoom of the pop-up, Undo removes the last stroke, Clear removes all, the input is not changed", () => {
  assert.equal(R.PEN_COLOR, "#ff2020");
  assert.equal(R.PEN_SCREEN_PX, 3);
  assert.equal(R.penWidth(1), 3);
  assert.equal(R.penWidth(0.5), 6);
  assert.equal(R.penWidth(2), 1.5);
  for (const v of [0, -1, NaN, Infinity]) assert.equal(R.penWidth(v), 3, String(v));
  const a = { width: 3, points: [{ x: 1, y: 1 }] };
  const b = { width: 3, points: [{ x: 2, y: 2 }, { x: 3, y: 3 }] };
  const list = [a, b];
  assert.deepEqual(R.undoStroke(list), [a]);
  assert.deepEqual(list, [a, b], "Undo does not change the input list");
  assert.deepEqual(R.undoStroke([a]), []);
  assert.deepEqual(R.undoStroke([]), [], "Undo on an empty list stays empty");
  assert.deepEqual(R.clearStrokes(), []);
});

await check("captureScales (row 3): the device pixel ratio up to 2, then smaller copies, never below 0.25, a bad ratio counts as 1", () => {
  assert.deepEqual(R.captureScales(1), [1, 0.75, 0.5, 0.33]);
  assert.deepEqual(R.captureScales(2), [2, 1.5, 1, 0.67]);
  assert.deepEqual(R.captureScales(3), [2, 1.5, 1, 0.67], "a 3x phone gives 2");
  for (const v of [0, -2, NaN, Infinity, 0.5]) assert.deepEqual(R.captureScales(v), [1, 0.75, 0.5, 0.33], String(v));
  for (const r of [1, 1.25, 1.5, 2, 3]) assert.ok(R.captureScales(r).every((v) => v >= 0.25));
});

await check("pageLabelOf (Q-A 3:17.4): the book title, not the folder name, for the screens of a book, and the screens by name", () => {
  const t = { made_up_book: "Made Up Book" };
  assert.equal(R.pageLabelOf("/read/made_up_book", t), 'Book screen of "Made Up Book" in the Reader dashboard');
  assert.equal(R.pageLabelOf("/translate/made_up_book?x=1", t), 'Book screen of "Made Up Book" in the human translation view');
  assert.equal(R.pageLabelOf("/page/made_up_book/p012", t), 'Monitor page view of "Made Up Book", page 12');
  assert.equal(R.pageLabelOf("/read", t), "Reader dashboard /read");
  assert.equal(R.pageLabelOf("/translate", t), "Human translation view /translate");
  assert.equal(R.pageLabelOf("/", t), "Monitor dashboard / (or the front door of the site)");
  assert.equal(R.pageLabelOf("/admin/issues", t), "Admin page Visual issues");
  assert.equal(R.pageLabelOf("/profile", t), "Profile page /profile");
  assert.equal(R.pageLabelOf("/read/other_book", t), 'Book screen of "other_book" in the Reader dashboard', "an unknown slug keeps its own text");
  assert.equal(R.pageLabelOf("/somewhere/else?a=1", t), "/somewhere/else?a=1");
  assert.deepEqual(R.bookSlugsOf(["/read/a_1", "/translate/b_2?x=1", "/page/a_1/p001", "/read", "/", "/admin/issues", "/read/Bad Slug"]).sort(), ["a_1", "b_2"]);
});

// ---------------------------------------------------------------- part 2: the migration

const migrationDir = path.resolve(app, "../data/scripts/pocketbase/pb_migrations");
const migrationFile = path.join(migrationDir, "1793300017_v2_visual_issues.js");
await check("the migration file 1793300017 exists, it is the newest one, and it holds the owner words and the rules in its header", () => {
  assert.ok(existsSync(migrationFile), migrationFile);
  const files = readdirSync(migrationDir).filter((f) => f.endsWith(".js")).sort();
  assert.equal(files[files.length - 1], "1793300017_v2_visual_issues.js");
  const src = readFileSync(migrationFile, "utf8");
  assert.ok(src.includes("Add a visual-issue tool"), "owner words");
  assert.ok(src.includes("Q-A 3:98.5") && src.includes("Q-A 3:99.5"));
  for (const word of ["createRule", "listRule", "viewRule", "updateRule", "deleteRule"]) assert.ok(src.includes(word), word);
});

await check("the migration up function: a fake app gets the collection with the fields, limits, and rules of the rows (create for a translator or admin for the own user, update and delete for an admin only)", () => {
  const src = readFileSync(migrationFile, "utf8");
  const calls = { saved: [], found: 0 };
  class Collection {
    constructor(def) {
      Object.assign(this, def);
    }
  }
  const sandbox = {
    migrate(up, down) {
      sandbox.up = up;
      sandbox.down = down;
    },
    Collection,
    console: { log() {} },
    $app: {
      findCollectionByNameOrId(name) {
        calls.found++;
        if (name === "users") return { id: "users_id", name: "users" };
        throw new Error("not found");
      },
      save(c) {
        calls.saved.push(c);
      },
      countRecords: () => 0,
      delete() {},
    },
  };
  vm.runInNewContext(src, sandbox);
  assert.equal(typeof sandbox.up, "function");
  assert.equal(typeof sandbox.down, "function");
  sandbox.up(sandbox.$app);
  assert.equal(calls.saved.length, 1, "one collection saved");
  const c = calls.saved[0];
  assert.equal(c.name, "visual_issues");
  const f = Object.fromEntries(c.fields.map((x) => [x.name, x]));
  assert.deepEqual(Object.keys(f).sort(), ["comment", "created", "page_url", "picture", "resolve_note", "screen_width", "state", "theme", "updated", "user"]);
  assert.equal(f.comment.max, R.COMMENT_MAX);
  assert.equal(f.comment.required, true);
  assert.equal(f.page_url.max, R.PAGE_URL_MAX);
  assert.equal(f.theme.max, R.THEME_MAX);
  assert.equal(f.resolve_note.max, R.NOTE_MAX);
  assert.equal(f.picture.maxSize, R.PB_PICTURE_MAX_BYTES);
  assert.equal(f.picture.maxSelect, 1);
  assert.deepEqual([...f.picture.mimeTypes], ["image/png"]);
  assert.equal(f.picture.protected, true, "the file needs a token");
  assert.equal(f.screen_width.max, R.SCREEN_WIDTH_MAX);
  assert.deepEqual([...f.state.values].sort(), ["open", "resolved"]);
  assert.equal(f.user.required, true);
  assert.equal(f.user.collectionId, "users_id");
  assert.equal(f.created.onCreate, true);
  assert.equal(f.updated.onUpdate, true);
  assert.match(c.createRule, /@request\.auth\.id != ""/);
  assert.match(c.createRule, /@request\.auth\.role = "translator"/);
  assert.match(c.createRule, /@request\.auth\.role = "admin"/);
  assert.match(c.createRule, /@request\.body\.user = @request\.auth\.id/);
  assert.match(c.createRule, /@request\.body\.state = "open"/);
  assert.ok(!/reader/.test(c.createRule), "no reader in the create rule");
  assert.equal(c.updateRule, '@request.auth.role = "admin"');
  assert.equal(c.deleteRule, '@request.auth.role = "admin"');
  assert.match(c.listRule, /@request\.auth\.role = "admin"/);
  assert.match(c.viewRule, /@request\.auth\.role = "admin"/);
  assert.match(c.listRule, /user = @request\.auth\.id/);
});

await check("the migration is safe to run twice, and its down function keeps a collection that has records and deletes an empty one", () => {
  const src = readFileSync(migrationFile, "utf8");
  const run = (exists, records) => {
    const log = [];
    const saved = [];
    const deleted = [];
    const sandbox = {
      migrate(up, down) {
        sandbox.up = up;
        sandbox.down = down;
      },
      Collection: class {},
      console: { log: (m) => log.push(m) },
      $app: {
        findCollectionByNameOrId(name) {
          if (name === "users" || (name === "visual_issues" && exists)) return { id: name + "_id", name };
          throw new Error("not found");
        },
        save: (c) => saved.push(c),
        countRecords: () => records,
        delete: (c) => deleted.push(c),
      },
    };
    vm.runInNewContext(src, sandbox);
    return { sandbox, log, saved, deleted };
  };
  const second = run(true, 0);
  second.sandbox.up(second.sandbox.$app);
  assert.equal(second.saved.length, 0, "the second run changes nothing");
  assert.ok(second.log.some((l) => /visual_issues exists, left as it is/.test(l)));
  const withRecords = run(true, 3);
  withRecords.sandbox.down(withRecords.sandbox.$app);
  assert.equal(withRecords.deleted.length, 0);
  assert.ok(withRecords.log.some((l) => /has records, kept/.test(l)));
  const empty = run(true, 0);
  empty.sandbox.down(empty.sandbox.$app);
  assert.equal(empty.deleted.length, 1);
  const none = run(false, 0);
  none.sandbox.down(none.sandbox.$app);
  assert.equal(none.deleted.length, 0, "no collection, nothing to delete, no fault");
});

// ---------------------------------------------------------------- part 3: the routes with a fake PocketBase

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const USERS = {
  rdr000000000001: { id: "rdr000000000001", email: "reader1@example.test", name: "Made Up Reader", role: "reader", approved: true },
  trn000000000001: { id: "trn000000000001", email: "translator1@example.test", name: "Made Up Translator", role: "translator", approved: true },
  adm000000000001: { id: "adm000000000001", email: "admin1@example.test", name: "Made Up Admin", role: "admin", approved: true },
};
const tokenOf = (id) => `${b64u({ alg: "HS256" })}.${b64u({ id, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig-${id}`;
const asUser = (id) => (globalThis.__vw118Cookie = id ? tokenOf(id) : undefined);

/** The fake PocketBase. `seen` holds every request: method, url, token, JSON body or multipart fields. `behavior` can change the answers. */
const seen = [];
const behavior = { createStatus: 200, listStatus: 200, listItems: [], totalItems: null, patchStatus: 200, recordPicture: "issue_abc.png", fileStatus: 200 };
const server = http.createServer((rq, rs) => {
  const chunks = [];
  rq.on("data", (c) => chunks.push(c));
  rq.on("end", async () => {
    const body = Buffer.concat(chunks);
    const url = new URL(rq.url, "http://x");
    const entry = { method: rq.method, path: url.pathname, query: url.searchParams, token: rq.headers.authorization ?? "", ct: rq.headers["content-type"] ?? "", json: null, form: null, size: body.length };
    seen.push(entry);
    const send = (status, obj, headers = { "Content-Type": "application/json" }) => {
      rs.writeHead(status, headers);
      rs.end(Buffer.isBuffer(obj) ? obj : JSON.stringify(obj));
    };
    let m;
    if ((m = /^\/api\/collections\/users\/records\/([A-Za-z0-9]+)$/.exec(url.pathname)) && rq.method === "GET") {
      const u = USERS[m[1]];
      if (!u || rq.headers.authorization !== tokenOf(m[1])) return send(404, { message: "not found" });
      return send(200, u);
    }
    if (url.pathname === "/api/collections/visual_issues/records" && rq.method === "POST") {
      const form = await new Response(body, { headers: { "content-type": entry.ct } }).formData();
      entry.form = form;
      if (behavior.createStatus !== 200) return send(behavior.createStatus, { message: "Failed to create record.", data: { comment: { message: "Made up field message." } } });
      return send(200, { id: "issue0000000001" });
    }
    if (url.pathname === "/api/collections/visual_issues/records" && rq.method === "GET") {
      if (behavior.listStatus !== 200) return send(behavior.listStatus, { message: "Made up list refusal." });
      const page = Number(url.searchParams.get("page") ?? "1");
      const per = Number(url.searchParams.get("perPage") ?? "30");
      const all = behavior.listItems;
      return send(200, { page, perPage: per, totalItems: behavior.totalItems ?? all.length, items: all.slice((page - 1) * per, page * per) });
    }
    if ((m = /^\/api\/collections\/visual_issues\/records\/([A-Za-z0-9]+)$/.exec(url.pathname))) {
      if (rq.method === "PATCH") {
        entry.json = JSON.parse(body.toString("utf8") || "{}");
        return send(behavior.patchStatus, behavior.patchStatus === 200 ? { id: m[1] } : { message: "Failed to update record." });
      }
      if (rq.method === "GET") return behavior.recordPicture === null ? send(404, { message: "not found" }) : send(200, { id: m[1], picture: behavior.recordPicture });
    }
    if (url.pathname === "/api/files/token" && rq.method === "POST") return send(200, { token: "file-token-made-up" });
    if ((m = /^\/api\/files\/visual_issues\/([A-Za-z0-9]+)\/([^/]+)$/.exec(url.pathname)) && rq.method === "GET") {
      if (behavior.fileStatus !== 200) return send(behavior.fileStatus, { message: "no" });
      return send(200, PNG, { "Content-Type": "image/png" });
    }
    return send(404, { message: "not found: " + rq.method + " " + url.pathname });
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
process.env.VIEWER_CONFIG = path.join(process.env.TMPDIR, "vw118-no-config.json");
process.env.VIEWER_RUN_SOURCE = "pocketbase";
process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${port}`;
const resetSeen = () => {
  seen.length = 0;
  Object.assign(behavior, { createStatus: 200, listStatus: 200, listItems: [], totalItems: null, patchStatus: 200, recordPicture: "issue_abc.png", fileStatus: 200 });
};
const posts = () => seen.filter((s) => s.method === "POST" && s.path === "/api/collections/visual_issues/records");

const issuesRoute = await import("../app/api/issues/route.ts");
const resolveRoute = await import("../app/api/admin/issues/route.ts");
const pictureRoute = await import("../app/api/admin/issues/[id]/picture/route.ts");
const V = await import("../lib/visual-issues.ts");

/** A multipart request for POST /api/issues. `over` replaces or removes (undefined) a field. */
function issueRequest(over = {}, headers = {}) {
  const fields = { comment: "The button is too small.", page_url: "/read/made_up_book", screen_width: "1280", theme: "light", ...over };
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.set(k, v);
  if (!("picture" in over)) form.set("picture", new Blob([PNG], { type: "image/png" }), "issue.png");
  else if (over.picture !== undefined) form.set("picture", over.picture, "issue.png");
  return new Request("http://localhost/api/issues", { method: "POST", headers, body: form });
}
const bodyOf = async (r) => (await r.json().catch(() => ({})));

await check("POST /api/issues: no session gives 401 and nothing reaches PocketBase (row 1, row 6)", async () => {
  resetSeen();
  asUser(null);
  const r = await issuesRoute.POST(issueRequest());
  assert.equal(r.status, 401);
  assert.equal((await bodyOf(r)).error, "Sign in first.");
  assert.equal(posts().length, 0);
});

await check("POST /api/issues: a reader gets 403 and nothing is stored (row 1)", async () => {
  resetSeen();
  asUser("rdr000000000001");
  const r = await issuesRoute.POST(issueRequest());
  assert.equal(r.status, 403);
  assert.equal(posts().length, 0);
});

await check("POST /api/issues: a made-up token (a user id that does not exist) gives 401", async () => {
  resetSeen();
  globalThis.__vw118Cookie = tokenOf("zzz000000000001");
  const r = await issuesRoute.POST(issueRequest());
  assert.equal(r.status, 401);
  assert.equal(posts().length, 0);
  globalThis.__vw118Cookie = "not-a-token";
  assert.equal((await issuesRoute.POST(issueRequest())).status, 401);
});

await check("POST /api/issues: a translator stores an issue for the own user with state open, the token of the user, and the fields (rows 5 and 6)", async () => {
  resetSeen();
  asUser("trn000000000001");
  const r = await issuesRoute.POST(issueRequest({}, { origin: "http://localhost", host: "localhost" }));
  assert.equal(r.status, 200);
  assert.deepEqual(await bodyOf(r), { ok: true, id: "issue0000000001" });
  assert.equal(posts().length, 1);
  const p = posts()[0];
  assert.equal(p.token, tokenOf("trn000000000001"), "the token of the signed-in user");
  assert.ok(p.ct.startsWith("multipart/form-data"));
  assert.equal(p.form.get("user"), "trn000000000001");
  assert.equal(p.form.get("state"), "open");
  assert.equal(p.form.get("comment"), "The button is too small.");
  assert.equal(p.form.get("page_url"), "/read/made_up_book");
  assert.equal(p.form.get("screen_width"), "1280");
  assert.equal(p.form.get("theme"), "light");
  const pic = p.form.get("picture");
  assert.ok(pic instanceof Blob && pic.size === PNG.length);
  assert.deepEqual(Buffer.from(await pic.arrayBuffer()), PNG);
  assert.equal(p.form.get("resolve_note"), null, "no note at create");
});

await check("POST /api/issues: an admin can store an issue too", async () => {
  resetSeen();
  asUser("adm000000000001");
  const r = await issuesRoute.POST(issueRequest());
  assert.equal(r.status, 200);
  assert.equal(posts()[0].form.get("user"), "adm000000000001");
});

await check("POST /api/issues: the client cannot choose the user, the state, or a note (the form fields user, state, resolve_note are ignored)", async () => {
  resetSeen();
  asUser("trn000000000001");
  const r = await issuesRoute.POST(issueRequest({ user: "adm000000000001", state: "resolved", resolve_note: "forged", role: "admin" }));
  assert.equal(r.status, 200);
  const f = posts()[0].form;
  assert.equal(f.get("user"), "trn000000000001");
  assert.equal(f.get("state"), "open");
  assert.equal(f.get("resolve_note"), null);
  assert.equal(f.get("role"), null);
});

await check("POST /api/issues: the page address loses its host (row 5) and a bad width and a bad theme are cleaned", async () => {
  resetSeen();
  asUser("trn000000000001");
  await issuesRoute.POST(issueRequest({ page_url: "https://kendotranslation.com/translate/made_up_book?x=1#top", screen_width: "abc", theme: "<script>" }));
  const f = posts()[0].form;
  assert.equal(f.get("page_url"), "/translate/made_up_book?x=1");
  assert.equal(f.get("screen_width"), "1");
  assert.equal(f.get("theme"), "");
});

await check("POST /api/issues: the limits of the comment: empty 400, 5000 characters pass, 5001 give 400 and nothing is stored", async () => {
  resetSeen();
  asUser("trn000000000001");
  for (const c of ["", "   ", undefined]) {
    const r = await issuesRoute.POST(issueRequest({ comment: c }));
    assert.equal(r.status, 400, String(c));
  }
  assert.equal(posts().length, 0);
  assert.equal((await issuesRoute.POST(issueRequest({ comment: "a".repeat(5000) }))).status, 200);
  assert.equal(posts().length, 1);
  const r = await issuesRoute.POST(issueRequest({ comment: "a".repeat(5001) }));
  assert.equal(r.status, 400);
  assert.ok(/5000/.test((await bodyOf(r)).error));
  assert.equal(posts().length, 1);
});

await check("POST /api/issues: the picture rules: missing 400, empty 400, not a PNG 415, over 4,000,000 bytes 413, a header that declares a huge body 413", async () => {
  resetSeen();
  asUser("trn000000000001");
  assert.equal((await issuesRoute.POST(issueRequest({ picture: undefined }))).status, 400, "missing");
  assert.equal((await issuesRoute.POST(issueRequest({ picture: new Blob([], { type: "image/png" }) }))).status, 400, "empty");
  assert.equal((await issuesRoute.POST(issueRequest({ picture: new Blob([Buffer.from("<svg onload=alert(1)></svg>")], { type: "image/png" }) }))).status, 415, "svg text that claims PNG");
  assert.equal((await issuesRoute.POST(issueRequest({ picture: new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0])], { type: "image/png" }) }))).status, 415, "a JPEG that claims PNG");
  const big = Buffer.alloc(R.PICTURE_MAX_BYTES + 1);
  PNG.copy(big, 0, 0, 8);
  assert.equal((await issuesRoute.POST(issueRequest({ picture: new Blob([big], { type: "image/png" }) }))).status, 413, "one byte over");
  assert.equal((await issuesRoute.POST(issueRequest({}, { "content-length": String(R.PICTURE_MAX_BYTES + 300000) }))).status, 413, "declared size");
  assert.equal(posts().length, 0, "nothing was stored");
  const exact = Buffer.alloc(R.PICTURE_MAX_BYTES);
  PNG.copy(exact, 0, 0, 8);
  assert.equal((await issuesRoute.POST(issueRequest({ picture: new Blob([exact], { type: "image/png" }) }))).status, 200, "exactly the limit passes");
  assert.equal(posts().length, 1);
});

await check("POST /api/issues: a JSON body gives 415, a foreign origin gives 403, and neither stores anything", async () => {
  resetSeen();
  asUser("trn000000000001");
  const json = await issuesRoute.POST(new Request("http://localhost/api/issues", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ comment: "x" }) }));
  assert.equal(json.status, 415);
  const foreign = await issuesRoute.POST(issueRequest({}, { origin: "https://evil.example", host: "localhost" }));
  assert.equal(foreign.status, 403);
  assert.equal(posts().length, 0);
});

await check("POST /api/issues: PocketBase refusal passes as a plain error with its status and the field message, PocketBase down gives 503", async () => {
  resetSeen();
  asUser("trn000000000001");
  behavior.createStatus = 400;
  const r = await issuesRoute.POST(issueRequest());
  assert.equal(r.status, 400);
  assert.ok((await bodyOf(r)).error.includes("Made up field message."));
  behavior.createStatus = 403;
  assert.equal((await issuesRoute.POST(issueRequest())).status, 403);
  behavior.createStatus = 500;
  assert.equal((await issuesRoute.POST(issueRequest())).status, 502);
  const old = process.env.VIEWER_POCKETBASE_URL;
  const dead = http.createServer();
  await new Promise((resolve) => dead.listen(0, "127.0.0.1", resolve));
  const deadPort = dead.address().port;
  await new Promise((resolve) => dead.close(resolve));
  process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${deadPort}`;
  try {
    const down = await issuesRoute.POST(issueRequest());
    assert.equal(down.status, 503);
  } finally {
    process.env.VIEWER_POCKETBASE_URL = old;
  }
});

const jsonPost = (body, headers = {}) => new Request("http://localhost/api/admin/issues", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const patches = () => seen.filter((s) => s.method === "PATCH");

await check("POST /api/admin/issues (Mark resolved): no session 401, a reader 403, a translator 403, and no change is sent to PocketBase", async () => {
  resetSeen();
  asUser(null);
  assert.equal((await resolveRoute.POST(jsonPost({ id: "issue0000000001", note: "n" }))).status, 401);
  for (const id of ["rdr000000000001", "trn000000000001"]) {
    asUser(id);
    assert.equal((await resolveRoute.POST(jsonPost({ id: "issue0000000001", note: "n" }))).status, 403, id);
  }
  assert.equal(patches().length, 0);
});

await check("POST /api/admin/issues: an admin sets state resolved with the note, with the token of the admin and no other field", async () => {
  resetSeen();
  asUser("adm000000000001");
  const r = await resolveRoute.POST(jsonPost({ id: "issue0000000001", note: "  unit VW119, commit abc1234  ", state: "open", user: "x" }));
  assert.equal(r.status, 200);
  assert.equal(patches().length, 1);
  const p = patches()[0];
  assert.equal(p.path, "/api/collections/visual_issues/records/issue0000000001");
  assert.equal(p.token, tokenOf("adm000000000001"));
  assert.deepEqual(p.json, { state: "resolved", resolve_note: "unit VW119, commit abc1234" });
  resetSeen();
  assert.equal((await resolveRoute.POST(jsonPost({ id: "issue0000000001" }))).status, 200, "no note is allowed");
  assert.deepEqual(patches()[0].json, { state: "resolved", resolve_note: "" });
});

await check("POST /api/admin/issues: a bad id gives 400, a note over 2000 characters gives 400, a note that is not text gives 400, not JSON gives 415, a foreign origin gives 403", async () => {
  resetSeen();
  asUser("adm000000000001");
  for (const id of [undefined, "", "../x", "a/b", 5, "x".repeat(41)]) assert.equal((await resolveRoute.POST(jsonPost({ id, note: "n" }))).status, 400, String(id));
  assert.equal((await resolveRoute.POST(jsonPost({ id: "abc", note: "n".repeat(2001) }))).status, 400);
  assert.equal((await resolveRoute.POST(jsonPost({ id: "abc", note: 5 }))).status, 400);
  assert.equal((await resolveRoute.POST(new Request("http://localhost/api/admin/issues", { method: "POST", headers: { "content-type": "text/plain" }, body: "id=abc" }))).status, 415);
  assert.equal((await resolveRoute.POST(jsonPost({ id: "abc", note: "n" }, { origin: "https://evil.example", host: "localhost" }))).status, 403);
  assert.equal(patches().length, 0);
  assert.equal((await resolveRoute.POST(jsonPost({ id: "abc", note: "n".repeat(2000) }))).status, 200);
});

await check("POST /api/admin/issues: a PocketBase refusal (the rule) passes its status, an unknown record gives 404", async () => {
  resetSeen();
  asUser("adm000000000001");
  behavior.patchStatus = 403;
  assert.equal((await resolveRoute.POST(jsonPost({ id: "abc", note: "n" }))).status, 403);
  behavior.patchStatus = 404;
  assert.equal((await resolveRoute.POST(jsonPost({ id: "abc", note: "n" }))).status, 404);
});

const pictureGet = (id) => pictureRoute.GET(new Request(`http://localhost/api/admin/issues/${id}/picture`), { params: Promise.resolve({ id }) });

await check("GET /api/admin/issues/<id>/picture: no session 401, a reader 403, a translator 403, with no file token request", async () => {
  resetSeen();
  asUser(null);
  assert.equal((await pictureGet("issue0000000001")).status, 401);
  for (const id of ["rdr000000000001", "trn000000000001"]) {
    asUser(id);
    assert.equal((await pictureGet("issue0000000001")).status, 403, id);
  }
  assert.equal(seen.filter((s) => s.path === "/api/files/token").length, 0);
});

await check("GET /api/admin/issues/<id>/picture: an admin gets the PNG bytes with the private headers, and the browser never sees a file token", async () => {
  resetSeen();
  asUser("adm000000000001");
  const r = await pictureGet("issue0000000001");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "image/png");
  assert.equal(r.headers.get("cache-control"), "private, no-store");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), PNG);
  const tokenCall = seen.find((s) => s.path === "/api/files/token");
  assert.equal(tokenCall.token, tokenOf("adm000000000001"));
  const file = seen.find((s) => s.path.startsWith("/api/files/visual_issues/"));
  assert.equal(file.query.get("token"), "file-token-made-up");
  for (const [k, v] of r.headers) assert.ok(!v.includes("file-token-made-up"), "header " + k);
});

await check("GET /api/admin/issues/<id>/picture: a bad id gives 400, a record with no picture gives 404, a missing file gives 404, a broken file gives 502", async () => {
  resetSeen();
  asUser("adm000000000001");
  for (const id of ["a.b", "..", "a%2Fb", "x".repeat(41)]) assert.equal((await pictureGet(id)).status, 400, id);
  behavior.recordPicture = "";
  assert.equal((await pictureGet("abc")).status, 404);
  behavior.recordPicture = null;
  assert.equal((await pictureGet("abc")).status, 404);
  behavior.recordPicture = "issue_abc.png";
  behavior.fileStatus = 404;
  assert.equal((await pictureGet("abc")).status, 404);
  behavior.fileStatus = 500;
  assert.equal((await pictureGet("abc")).status, 502);
});

await check("listIssues (row 7): open first (the sort asks state then newest), the user name and never the e-mail, only the needed fields, and the pages are read until the total", async () => {
  resetSeen();
  const mk = (n, state) => ({ id: "i" + String(n).padStart(4, "0"), comment: "c" + n, page_url: "/read", screen_width: 390, theme: "dark", state, resolve_note: state === "resolved" ? "unit VW1xx" : "", created: "2026-11-19 10:00:00.000Z", expand: { user: { name: n % 2 ? "Made Up Translator" : "" , email: "never@example.test" } } });
  behavior.listItems = Array.from({ length: 250 }, (_, i) => mk(i, i % 3 === 0 ? "resolved" : "open"));
  const r = await V.listIssues(tokenOf("adm000000000001"));
  assert.equal(r.total, 250);
  assert.equal(r.issues.length, 250);
  const lists = seen.filter((s) => s.method === "GET" && s.path === "/api/collections/visual_issues/records");
  assert.equal(lists.length, 2, "two pages of 200");
  assert.equal(lists[0].query.get("sort"), "state,-created");
  assert.equal(lists[0].query.get("expand"), "user");
  assert.equal(lists[0].query.get("perPage"), "200");
  const fields = lists[0].query.get("fields");
  assert.ok(fields.includes("expand.user.name") && !fields.includes("email"), fields);
  assert.equal(r.issues[0].userName, "(no name)", "an empty name has a plain fallback");
  assert.equal(r.issues[1].userName, "Made Up Translator");
  assert.ok(!JSON.stringify(r).includes("never@example.test"), "no e-mail in the view");
  assert.equal(r.issues[0].state, "resolved");
  assert.equal(r.issues[0].resolveNote, "unit VW1xx");
});

await check("listIssues: a huge total reads at most 5 pages (1000 issues), a refusal of PocketBase throws a PbError with the status", async () => {
  resetSeen();
  const item = { id: "iAAA", comment: "c", page_url: "/", screen_width: 1, theme: "", state: "open", resolve_note: "", created: "", expand: { user: { name: "N" } } };
  behavior.listItems = Array.from({ length: 1200 }, () => item);
  const r = await V.listIssues(tokenOf("adm000000000001"));
  assert.equal(r.issues.length, 1000);
  assert.equal(r.total, 1200);
  assert.equal(seen.filter((s) => s.method === "GET" && s.path === "/api/collections/visual_issues/records").length, 5);
  const pb = await import("../lib/pb.ts");
  behavior.listStatus = 403;
  let caught = null;
  try {
    await V.listIssues(tokenOf("adm000000000001"));
  } catch (e) {
    caught = e;
  }
  assert.ok(caught instanceof pb.PbError, "a PbError");
  assert.equal(caught.status, 403);
  assert.ok(caught.message.includes("Made up list refusal."));
});

// ---------------------------------------------------------------- part 4: the role gate of the icon (row 1)

await check("canReportIssues (row 1): translator true, admin true, reader false, no session false, a made-up token false", async () => {
  resetSeen();
  asUser("trn000000000001");
  assert.equal(await V.canReportIssues(), true);
  asUser("adm000000000001");
  assert.equal(await V.canReportIssues(), true);
  asUser("rdr000000000001");
  assert.equal(await V.canReportIssues(), false);
  asUser(null);
  assert.equal(await V.canReportIssues(), false);
  globalThis.__vw118Cookie = tokenOf("zzz000000000001");
  assert.equal(await V.canReportIssues(), false);
  globalThis.__vw118Cookie = "garbage";
  assert.equal(await V.canReportIssues(), false);
});

await check("canReportIssues: no cookie sends no request to PocketBase, and a PocketBase that is down hides the icon without a fault", async () => {
  resetSeen();
  asUser(null);
  await V.canReportIssues();
  assert.equal(seen.length, 0);
  asUser("trn000000000001");
  const old = process.env.VIEWER_POCKETBASE_URL;
  const dead = http.createServer();
  await new Promise((resolve) => dead.listen(0, "127.0.0.1", resolve));
  const deadPort = dead.address().port;
  await new Promise((resolve) => dead.close(resolve));
  process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${deadPort}`;
  try {
    assert.equal(await V.canReportIssues(), false);
  } finally {
    process.env.VIEWER_POCKETBASE_URL = old;
  }
});

// ---------------------------------------------------------------- part 5: components and sources

const Tool = (await import("../components/VisualIssueTool.tsx")).default;
const Select = (await import("../components/VisualIssueSelect.tsx")).default;
const Admin = (await import("../components/AdminIssues.tsx")).default;

await check("VisualIssueTool starts as the icon only: a round button with a label, the mark that the capture leaves out, no dim layer, no pop-up (rows 2 and 3)", () => {
  const html = renderToStaticMarkup(h(Tool, { theme: "dark" }));
  assert.ok(html.includes("data-visual-issue-icon"));
  assert.ok(html.includes('aria-label="Report a visual issue"'));
  assert.ok(html.includes("data-visual-issue-ui"));
  assert.ok(/fixed bottom-4 right-4/.test(html) && /rounded-full/.test(html), "bottom right, round");
  for (const hidden of ["data-visual-issue-select", "data-visual-issue-editor", "data-visual-issue-hint", "data-visual-issue-wait"]) assert.ok(!html.includes(hidden), hidden);
});

await check("VisualIssueSelect: the dim layer has a cross cursor and the mark, the hint names Esc, and a Cancel button is there for a phone (row 3)", () => {
  const html = renderToStaticMarkup(h(Select, { notice: "", onDragStart() {}, onBox() {}, onCancel() {} }));
  assert.ok(html.includes("data-visual-issue-select") && html.includes("cursor-crosshair") && html.includes("rgba(0, 0, 0, 0.45)"));
  assert.ok(htmlText(html).includes("Drag a box over the part of the page that you want. Press Esc to cancel."));
  assert.ok(html.includes("data-visual-issue-cancel"));
  const marks = html.split("data-visual-issue-ui").length - 1;
  assert.equal(marks, 2, "the layer and the hint carry the mark");
  const note = renderToStaticMarkup(h(Select, { notice: "That box is too small.", onDragStart() {}, onBox() {}, onCancel() {} }));
  assert.ok(htmlText(note).includes("That box is too small."));
});

const mk = (id, state, extra = {}) => ({ id, comment: `Comment ${id}`, pageUrl: "/read/made_up_book", screenWidth: 390, theme: "dark", state, resolveNote: "", created: "2026-11-19 18:04:00.000Z", userName: "Made Up Translator", ...extra });

await check("AdminIssues (row 7): open issues come first with the picture, the comment, a link with the book title, the width, the theme, the name, the time in PST, and Mark resolved with a note box", () => {
  const html = renderToStaticMarkup(h(Admin, { issues: [mk("open1", "open"), mk("open2", "open", { pageUrl: "/translate" }), mk("res1", "resolved", { resolveNote: "unit VW119, commit abc1234" })], total: 3, titles: { made_up_book: "Made Up Book" } }));
  const text = htmlText(html);
  assert.ok(html.indexOf("Open issues (2)") < html.indexOf("Resolved issues (1)"), "open section first");
  assert.ok(html.indexOf('data-issue="open1"') < html.indexOf('data-issue="res1"'));
  assert.ok(html.includes('src="/api/admin/issues/open1/picture"'));
  assert.ok(text.includes("Comment open1"));
  assert.ok(text.includes('Book screen of "Made Up Book" in the Reader dashboard'));
  assert.ok(html.includes('href="/read/made_up_book"'));
  assert.ok(text.includes("Sent by Made Up Translator. Screen width 390 px. Theme dark."));
  assert.ok(/2026-11-19 10:04 PST/.test(text), "18:04 UTC is 10:04 PST: " + text.slice(0, 400));
  assert.equal(html.split("data-issue-resolve").length - 1, 2, "a Mark resolved button on each open issue only");
  assert.equal(html.split("data-issue-note-input").length - 1, 2);
  assert.ok(text.includes("Mark resolved"));
  assert.ok(text.includes("Resolved. Note: unit VW119, commit abc1234"));
  assert.ok(!text.includes("@"), "no e-mail address on the page");
});

await check("AdminIssues: an empty list says so, a page address that is not safe is text and not a link, a long list says how many it shows", () => {
  const empty = htmlText(renderToStaticMarkup(h(Admin, { issues: [], total: 0, titles: {} })));
  assert.ok(empty.includes("No issue is open.") && empty.includes("No issue is resolved yet."));
  const html = renderToStaticMarkup(h(Admin, { issues: [mk("bad1", "open", { pageUrl: "//evil.example/x" }), mk("bad2", "open", { pageUrl: "javascript:alert(1)" })], total: 1200, titles: {} }));
  assert.ok(!html.includes('href="//evil.example') && !html.includes('href="javascript:'));
  assert.ok(htmlText(html).includes("The list shows 2 of 1200 issues."));
});

await check("AdminIssues: a comment with HTML tags is shown as text (React escapes it), not as markup", () => {
  const html = renderToStaticMarkup(h(Admin, { issues: [mk("x1", "open", { comment: '<img src=x onerror=alert(1)> & "quote"' })], total: 1, titles: {} }));
  assert.ok(!html.includes("<img src=x"), "the tag is escaped");
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
});

await check("sources: Esc is read at every step in the capture phase, and each step goes through stepAfterEscape", () => {
  const src = noComments(read("components/VisualIssueTool.tsx"));
  assert.ok(/addEventListener\("keydown", onKey, true\)/.test(src), "capture phase listener on the window");
  assert.ok(/e\.key !== "Escape"/.test(src));
  assert.ok(/stepAfterEscape\(step\)/.test(src));
  assert.ok(/if \(step === "idle"\) return;/.test(src), "no listener in the idle step, so the page keeps its own Esc");
  assert.ok(/removeEventListener\("keydown", onKey, true\)/.test(src));
  assert.ok(/run\.current\+\+/.test(src), "Esc in the capture step cancels the run");
  assert.ok(/setShot\(null\)/.test(src), "Esc in the editor drops the picture");
  const ed = noComments(read("components/VisualIssueEditor.tsx"));
  assert.ok(/onCancel=\{\(e\) => \{\s*e\.preventDefault\(\);\s*onClose\(\);/.test(ed), "the dialog cancel event goes to the same close");
});

await check("sources: every part of the tool carries the mark, the capture filter leaves them out, and the icon is not drawn in the capture step", () => {
  for (const f of ["components/VisualIssueTool.tsx", "components/VisualIssueSelect.tsx", "components/VisualIssueEditor.tsx"]) assert.ok(read(f).includes("UI_ATTR"), f);
  const cap = noComments(read("lib/visual-issue-capture.ts"));
  assert.ok(/filter: \(node\) => !\(node instanceof Element && node\.hasAttribute\(UI_ATTR\)\)/.test(cap));
  assert.ok(/UI_ATTR = "data-visual-issue-ui"/.test(cap));
  assert.ok(/devicePixelRatio/.test(cap) && /captureScales/.test(cap), "device pixel ratio");
  const tool = noComments(read("components/VisualIssueTool.tsx"));
  assert.ok(/\{step === "idle" \? \(\s*<button/.test(tool), "the icon only in the idle step");
  assert.ok(/await twoFrames\(\);/.test(tool), "the dim layer is gone before the capture");
});

await check("sources: the layout gives the client part a theme and no token or user, and it renders only for a reporter (rows 1 and 2)", () => {
  const src = noComments(read("app/layout.tsx"));
  assert.ok(/const reporter = await canReportIssues\(\)/.test(src));
  assert.ok(/\{reporter \? <VisualIssueTool theme=\{theme\} \/> : null\}/.test(src));
  const tool = noComments(read("components/VisualIssueTool.tsx"));
  assert.ok(/export default function VisualIssueTool\(\{ theme \}: \{ theme: ThemeName \}\)/.test(tool));
  for (const f of ["components/VisualIssueTool.tsx", "components/VisualIssueSelect.tsx", "components/VisualIssueEditor.tsx", "components/AdminIssues.tsx"]) {
    const s = noComments(read(f));
    assert.ok(!/htv_token|COOKIE_NAME|getSession|Authorization|localStorage|sessionStorage/.test(s), f);
    assert.ok(!/from "@\/lib\/(visual-issues|htv-session|pb|config)"/.test(s), "no server module in " + f);
  }
});

await check("sources: the server modules refuse a browser import, each route checks the session first, and PocketBase gets the token of the user (no admin key)", () => {
  for (const f of ["lib/visual-issues.ts"]) assert.ok(read(f).startsWith('import "server-only";'), f);
  const issues = noComments(read("app/api/issues/route.ts"));
  assert.ok(issues.indexOf("foreignOrigin(req)") < issues.indexOf("guard(req"), "origin first");
  assert.ok(issues.indexOf("guard(req") < issues.indexOf("req.formData()"), "role before the form is read");
  assert.ok(/write: true/.test(issues));
  assert.ok(/guard\(req, \{ mutating: true, admin: true \}\)/.test(noComments(read("app/api/admin/issues/route.ts"))));
  assert.ok(/guard\(req, \{ mutating: false, admin: true \}\)/.test(noComments(read("app/api/admin/issues/[id]/picture/route.ts"))));
  const lib = noComments(read("lib/visual-issues.ts"));
  assert.ok(!/POCKETBASE_ADMIN|superuser|_superusers|PB_ADMIN/i.test(lib), "no admin key");
  assert.ok(/Authorization: opts\.token/.test(lib));
});

await check("sources: the admin page and the links (row 7): requireAdmin, the readable titles, the admin links in both bars", () => {
  const page = noComments(read("app/admin/issues/page.tsx"));
  assert.ok(/requireAdmin\("\/admin\/issues"\)/.test(page));
  assert.ok(/bookTitlesOf\(s\.token, bookSlugsOf\(/.test(page));
  for (const f of ["components/ReaderBar.tsx", "components/HtvBar.tsx"]) {
    const s = read(f);
    assert.ok(/href="\/admin\/issues"[^>]*data-admin-link/.test(s), f);
  }
});

await check("sources: no new file writes a secret, an e-mail address, or a real host (made-up example.test only)", () => {
  const files = ["lib/visual-issue-rules.ts", "lib/visual-issues.ts", "lib/visual-issue-capture.ts", "components/VisualIssueTool.tsx", "components/VisualIssueSelect.tsx", "components/VisualIssueEditor.tsx", "components/AdminIssues.tsx", "app/api/issues/route.ts", "app/api/admin/issues/route.ts", "app/api/admin/issues/[id]/picture/route.ts", "app/admin/issues/page.tsx", "scripts/vw118-test.mjs"];
  for (const f of files) {
    const s = read(f);
    const emails = s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
    for (const e of emails) assert.ok(/@example\.test$/.test(e) || e === "never@example.test", f + ": " + e);
    if (f !== "scripts/vw118-test.mjs") assert.ok(!/pb-v2\.kendotranslation\.com|127\.0\.0\.1:8090|localhost:8090/.test(s), f + " names the v2 server or port 8090");
  }
});

await new Promise((resolve) => server.close(resolve));
done();
