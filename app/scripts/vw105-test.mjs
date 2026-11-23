// Unit VW105 (Q-A 3:58.2 "Design it now", 3:58.3, 3:58.4, 3:60.3 "Fix it in VW105", 3:60.4 "Accept all rows", 3:60.5 "4 cards, own for staff", 3:61.2 "Same links in both bars", 3:61.3 "Look, fix small ones"):
// server-free tests of the profile page /profile, the top bars, and the 404 page.
// Part 1: the rules (lib/profile-rules.ts): page parts, Open link, titles, sort, cards, dates, name and password checks.
// Part 2: the PocketBase calls (lib/profile-pb.ts) with a fake fetch: filters, sort, counts, title chunks, name body, password body, plain error messages.
// Part 3: the loader (lib/profile-load.ts) with a fake PocketBase: waiting reader, reader, translator, admin, a failing part.
// Part 4: the markup: the bars (components/ReaderBar.tsx, components/HtvBar.tsx), the top band (components/Nav.tsx), the two lists.
// Part 5: the source: the 404 page, the routes, the sign-in return path, the findings 3 and 4, and that no count or call uses the v1 placeholder.
// Made-up data only: the slugs are madeup_*, the titles are made-up, the addresses are example.test. The test writes no file and calls no real server.
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw105-test.mjs. It prints "<n> passed, <m> failed" and exits 1 on a failure.
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import path from "node:path";
import { checker, htmlText, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
installAppHooks(app);
// A navigation stub with an address that the test sets (globalThis.__vw105), registered after the kit, so that it wins.
const nav = `const a = () => globalThis.__vw105 ?? "/";
export const useRouter = () => ({ push() {}, refresh() {} });
export const useSearchParams = () => new URLSearchParams();
export const usePathname = () => a();
export const notFound = () => { throw new Error("notFound"); };
export const redirect = (u) => { throw new Error("redirect " + u); };`;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/navigation") return { url: `data:text/javascript,${encodeURIComponent(nav)}`, shortCircuit: true };
    return next(specifier, context);
  },
});
const at = (p) => (globalThis.__vw105 = p);

const require = createRequire(path.join(app, "package.json"));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const h = (C, props) => renderToStaticMarkup(React.createElement(C, props));
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const { check, done } = checker();

const rules = await import("../lib/profile-rules.ts");
const pb = await import("../lib/profile-pb.ts");
const load = await import("../lib/profile-load.ts");
const ReaderBar = (await import("../components/ReaderBar.tsx")).default;
const HtvBar = (await import("../components/HtvBar.tsx")).default;
const Nav = (await import("../components/Nav.tsx")).default;
const ProfileProgress = (await import("../components/ProfileProgress.tsx")).default;
const ProfileBookmarks = (await import("../components/ProfileBookmarks.tsx")).default;

// ---------------------------------------------------------------- a fake PocketBase (the fetch of the helpers)

/** A fake fetch. `handler(call)` returns { status, body } or throws to simulate a network failure. Every call is kept in `calls`. */
function fakePb(handler) {
  const calls = [];
  const fetchFn = async (url, init = {}) => {
    const u = new URL(url);
    const call = { method: init.method ?? "GET", path: u.pathname, query: Object.fromEntries(u.searchParams), body: init.body ? JSON.parse(init.body) : undefined, auth: init.headers?.Authorization };
    calls.push(call);
    const r = await handler(call);
    const text = r.body === undefined ? "" : JSON.stringify(r.body);
    return { status: r.status, text: async () => text, json: async () => JSON.parse(text) };
  };
  return { calls, ctx: { baseUrl: "http://pb.example.test", token: "token-of-a-made-up-person", fetchFn } };
}
const collectionOf = (call) => /^\/api\/collections\/([^/]+)\//.exec(call.path)?.[1] ?? "";

const USER = (role, approved = true) => ({ id: "u1abc", email: "person@example.com", name: "Made Up", role, approved });
const progressRec = (i, updated) => ({ item_id: `madeup_book${i}`, page_id: `madeup_book${i}/p${String(i).padStart(3, "0")}`, created: "2026-11-01 10:00:00.000Z", updated });
const bookmarkRec = (id, i, created, note = "") => ({ id, item_id: `madeup_book${i}`, page_id: `madeup_book${i}/p0${10 + i}`, note, created });

// ---------------------------------------------------------------- part 1: the rules

await check("rules: pageParts and openHref read the page ID and build the Reader address (same form as readHref)", () => {
  assert.deepEqual(rules.pageParts("madeup_book/p048"), { n: 48, digits: 3 });
  assert.deepEqual(rules.pageParts("madeup_year/p0794"), { n: 794, digits: 4 });
  assert.deepEqual(rules.pageParts("madeup_book/x"), { n: 0, digits: 3 });
  assert.equal(rules.openHref("madeup_book", "madeup_book/p048"), "/read/madeup_book?view=page&at=p048");
  assert.equal(rules.openHref("madeup_year", "madeup_year/p0794"), "/read/madeup_year?view=page&at=p0794");
  assert.equal(rules.openHref("madeup_book", "madeup_book/p000"), null);
  assert.equal(rules.openHref("", "madeup_book/p001"), null);
});

await check("rules: the title is the English title, then the Japanese title, then the work ID. The Japanese title next to an English one is a separate part", () => {
  assert.deepEqual(rules.titleOf("madeup_a", { en: "Made-up Book", ja: "試験の本" }), { main: "Made-up Book", ja: "試験の本" });
  assert.deepEqual(rules.titleOf("madeup_a", { en: "", ja: "試験の本" }), { main: "試験の本", ja: "" });
  assert.deepEqual(rules.titleOf("madeup_a", { en: "Only English", ja: "" }), { main: "Only English", ja: "" });
  assert.deepEqual(rules.titleOf("madeup_a", undefined), { main: "madeup_a", ja: "" });
  assert.deepEqual(rules.titleOf("madeup_a", { en: "  ", ja: " " }), { main: "madeup_a", ja: "" });
});

await check("rules: Continue reading sorts the newest first by updated, then created, then the work ID", () => {
  const rows = [
    { itemId: "b", pageId: "b/p001", n: 1, digits: 3, updated: "2026-11-10 08:00:00.000Z", created: "2026-11-01 00:00:00.000Z" },
    { itemId: "a", pageId: "a/p001", n: 1, digits: 3, updated: "2026-11-12 08:00:00.000Z", created: "2026-11-01 00:00:00.000Z" },
    { itemId: "d", pageId: "d/p001", n: 1, digits: 3, updated: "2026-11-10 08:00:00.000Z", created: "2026-11-05 00:00:00.000Z" },
    { itemId: "c", pageId: "c/p001", n: 1, digits: 3, updated: "2026-11-10 08:00:00.000Z", created: "2026-11-01 00:00:00.000Z" },
  ];
  const copy = JSON.stringify(rows);
  assert.deepEqual(rules.sortProgress(rows).map((r) => r.itemId), ["a", "d", "b", "c"]);
  assert.equal(JSON.stringify(rows), copy, "the input array stays as it was");
});

await check("rules: Bookmarks sort the newest first by created, then the ID", () => {
  const rows = [
    { id: "x1", itemId: "a", pageId: "a/p001", n: 1, digits: 3, note: "", created: "2026-11-01 10:00:00.000Z" },
    { id: "x3", itemId: "a", pageId: "a/p003", n: 3, digits: 3, note: "", created: "2026-11-03 10:00:00.000Z" },
    { id: "x2", itemId: "a", pageId: "a/p002", n: 2, digits: 3, note: "", created: "2026-11-03 10:00:00.000Z" },
  ];
  assert.deepEqual(rules.sortBookmarks(rows).map((r) => r.id), ["x2", "x3", "x1"]);
});

await check("rules: a record with no work ID, no page ID, or no ID is skipped", () => {
  assert.equal(rules.toProgressRow({ item_id: "", page_id: "a/p001" }), null);
  assert.equal(rules.toProgressRow({ item_id: "a", page_id: "" }), null);
  assert.equal(rules.toBookmarkRow({ id: "", item_id: "a", page_id: "a/p001" }), null);
  assert.equal(rules.toBookmarkRow({ id: "x", item_id: "a" }), null);
  assert.deepEqual(rules.toBookmarkRow({ id: "x", item_id: "a", page_id: "a/p007", note: "n", created: "c" }), { id: "x", itemId: "a", pageId: "a/p007", n: 7, digits: 3, note: "n", created: "c" });
});

await check("cards: every role gets Books started, Bookmarks, and Member since. Only translators and admins get Own translations (Q-A 3:60.5)", () => {
  const base = { approved: true, books: 3, bookmarks: 5, created: "2026-11-02 04:30:00.000Z", own: 12 };
  const ids = (role) => rules.buildCards({ ...base, role }).map((c) => c.id);
  assert.deepEqual(ids("reader"), ["books", "bookmarks", "since"]);
  assert.deepEqual(ids("translator"), ["books", "bookmarks", "since", "own"]);
  assert.deepEqual(ids("admin"), ["books", "bookmarks", "since", "own"]);
  const staff = rules.buildCards({ ...base, role: "admin" });
  assert.deepEqual(staff.map((c) => c.value), ["3", "5", "2026-11-01", "12"], "the join date is the PST date");
  assert.deepEqual(staff.map((c) => c.label), ["Books started", "Bookmarks", "Member since", "Own translations"]);
});

await check("cards: a count that could not be read shows a dash. A reader who waits for approval gets no card", () => {
  const cards = rules.buildCards({ role: "translator", approved: true, books: null, bookmarks: 0, created: "", own: null });
  assert.deepEqual(cards.map((c) => c.value), ["–", "0", "–", "–"]);
  assert.deepEqual(rules.buildCards({ role: "reader", approved: false, books: 0, bookmarks: 0, created: "2026-11-02 04:30:00.000Z", own: null }), []);
  assert.equal(rules.buildCards({ role: "reader", approved: true, books: 12345, bookmarks: 0, created: "", own: null })[0].value, "12,345");
});

await check("account: the approval line, the join date in PST, and the role words", () => {
  assert.equal(rules.approvalText("reader", true), "Approved");
  assert.equal(rules.approvalText("reader", false), "Waits for approval by an admin");
  assert.equal(rules.approvalText("translator", true), "Not needed for this role");
  assert.equal(rules.joinDate("2026-11-02 04:30:00.000Z"), "2026-11-01");
  assert.equal(rules.joinDate("2026-11-02 12:00:00.000Z"), "2026-11-02");
  assert.equal(rules.joinDate("bad"), "–");
  assert.deepEqual(rules.ROLE_WORD, { reader: "Reader", translator: "Translator", admin: "Admin" });
});

await check("forms: the name is trimmed and has 1 to 100 characters. The password has 8 to 71 characters and the two new fields are equal", () => {
  assert.equal(rules.cleanName("  Made   Up  "), "Made Up");
  assert.equal(rules.cleanName(42), "");
  assert.equal(rules.nameProblem(""), "Enter a name.");
  assert.equal(rules.nameProblem("x".repeat(100)), "");
  assert.match(rules.nameProblem("x".repeat(101)), /100 characters at most/);
  assert.equal(rules.passwordProblem("", "12345678", "12345678"), "Enter your old password.");
  assert.match(rules.passwordProblem("old", "1234567", "1234567"), /8 characters or more/);
  assert.match(rules.passwordProblem("old", "x".repeat(72), "x".repeat(72)), /71 characters at most/);
  assert.match(rules.passwordProblem("old", "12345678", "12345679"), /not the same/);
  assert.equal(rules.passwordProblem("old", "12345678", "12345678"), "");
  assert.equal(rules.passwordProblem("old", "x".repeat(71), "x".repeat(71)), "");
  assert.equal(rules.PASSWORD_MIN, 8);
});

// ---------------------------------------------------------------- part 2: the PocketBase calls

await check("calls: the progress list reads own records only, newest first, with the fields and the total", async () => {
  const f = fakePb(() => ({ status: 200, body: { items: [progressRec(1, "2026-11-10 08:00:00.000Z")], totalItems: 7 } }));
  const r = await pb.loadProgress(f.ctx, "u1abc");
  assert.equal(f.calls.length, 1);
  const c = f.calls[0];
  assert.equal(c.method, "GET");
  assert.equal(collectionOf(c), "reader_progress");
  assert.equal(c.query.filter, 'user="u1abc"');
  assert.equal(c.query.sort, "-updated,-created");
  assert.equal(c.query.perPage, "20");
  assert.equal(c.query.fields, "item_id,page_id,created,updated");
  assert.equal(c.auth, "token-of-a-made-up-person");
  assert.equal(r.total, 7);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].n, 1);
});

await check("calls: the bookmark list reads own records only, newest first. The user ID is quoted in the filter", async () => {
  const f = fakePb(() => ({ status: 200, body: { items: [bookmarkRec("b1", 1, "2026-11-03 10:00:00.000Z", "a note")], totalItems: 1 } }));
  const r = await pb.loadBookmarks(f.ctx, 'a"b');
  const c = f.calls[0];
  assert.equal(collectionOf(c), "reader_bookmarks");
  assert.equal(c.query.filter, 'user="a\\"b"');
  assert.equal(c.query.sort, "-created");
  assert.equal(c.query.perPage, "50");
  assert.deepEqual(r.rows.map((x) => [x.id, x.note]), [["b1", "a note"]]);
});

await check("calls: the own translations count is one call with perPage 1 and the own user filter (no rows are read)", async () => {
  const f = fakePb(() => ({ status: 200, body: { items: [{ id: "t1" }], totalItems: 41 } }));
  assert.equal(await pb.countOwnTranslations(f.ctx, "u1abc"), 41);
  const c = f.calls[0];
  assert.equal(collectionOf(c), "own_translations");
  assert.equal(c.query.perPage, "1");
  assert.equal(c.query.filter, 'user="u1abc"');
  assert.equal(c.query.fields, "id");
});

await check("calls: the titles come from catalog_items in chunks of 40 work IDs. A duplicate ID counts once", async () => {
  const ids = Array.from({ length: 95 }, (_, i) => `madeup_w${i}`);
  const f = fakePb((c) => {
    const found = [...c.query.filter.matchAll(/item_id="([^"]+)"/g)].map((m) => m[1]);
    return { status: 200, body: { items: found.map((id) => ({ item_id: id, title_en: "T " + id, title_ja: "" })), totalItems: found.length } };
  });
  const t = await pb.loadTitles(f.ctx, [...ids, ids[0], ids[1]]);
  assert.equal(f.calls.length, 3);
  assert.deepEqual(f.calls.map((c) => c.query.filter.split(" || ").length), [40, 40, 15]);
  assert.ok(f.calls.every((c) => collectionOf(c) === "catalog_items"));
  assert.equal(t.size, 95);
  assert.deepEqual(t.get("madeup_w7"), { en: "T madeup_w7", ja: "" });
  const none = fakePb(() => ({ status: 200, body: { items: [], totalItems: 0 } }));
  assert.equal((await pb.loadTitles(none.ctx, [])).size, 0);
  assert.equal(none.calls.length, 0, "an empty list makes no call");
});

await check("calls: the join date is read from the own record only", async () => {
  const f = fakePb(() => ({ status: 200, body: { created: "2026-11-02 04:30:00.000Z" } }));
  assert.equal(await pb.readCreated(f.ctx, "u1abc"), "2026-11-02 04:30:00.000Z");
  assert.equal(f.calls[0].path, "/api/collections/users/records/u1abc");
  assert.equal(f.calls[0].query.fields, "created");
  assert.equal(await pb.readCreated(f.ctx, "bad/id"), "", "an ID with a slash makes no call");
  assert.equal(f.calls.length, 1);
});

await check("name: the body to PocketBase holds the key name only, never role, approved, or disabled", async () => {
  const f = fakePb((c) => ({ status: 200, body: { id: "u1abc", name: c.body.name } }));
  assert.equal(await pb.updateName(f.ctx, "u1abc", "New Name"), "New Name");
  const c = f.calls[0];
  assert.equal(c.method, "PATCH");
  assert.equal(c.path, "/api/collections/users/records/u1abc");
  assert.deepEqual(Object.keys(c.body), ["name"]);
  for (const key of ["role", "approved", "disabled", "email", "password"]) assert.ok(!(key in c.body), key);
});

await check("name: a refused or failed update gives a plain message, never the body", async () => {
  const cases = [
    [403, 401, /sign-in ended/],
    [404, 401, /sign-in ended/],
    [400, 400, /name was not saved/],
    [500, 400, /name was not saved/],
  ];
  for (const [status, want, re] of cases) {
    const f = fakePb(() => ({ status, body: { message: "internal detail with the name SECRET-NAME" } }));
    await assert.rejects(() => pb.updateName(f.ctx, "u1abc", "SECRET-NAME"), (e) => e instanceof pb.ProfileError && e.status === want && re.test(e.message) && !e.message.includes("SECRET-NAME") && !e.message.includes("internal detail"));
  }
  const down = fakePb(() => {
    throw new Error("connect ECONNREFUSED");
  });
  await assert.rejects(() => pb.updateName(down.ctx, "u1abc", "x"), (e) => e.status === 503 && /not reachable/.test(e.message));
});

await check("password: the body holds oldPassword, password, and passwordConfirm only, and the two new values are equal", async () => {
  const f = fakePb(() => ({ status: 200, body: { id: "u1abc" } }));
  await pb.changePassword(f.ctx, "u1abc", "old-made-up-pw", "new-made-up-pw");
  const c = f.calls[0];
  assert.equal(c.method, "PATCH");
  assert.equal(c.path, "/api/collections/users/records/u1abc");
  assert.deepEqual(Object.keys(c.body).sort(), ["oldPassword", "password", "passwordConfirm"]);
  assert.equal(c.body.password, c.body.passwordConfirm);
  assert.equal(c.body.oldPassword, "old-made-up-pw");
  for (const key of ["role", "approved", "disabled", "name", "email"]) assert.ok(!(key in c.body), key);
});

await check("password: a wrong old password, a bad new password, a dead session, and a dead server each give a clear message with no password in it", async () => {
  const pw = { old: "old-made-up-pw", fresh: "new-made-up-pw" };
  const run = async (status, body, fetchThrows = false) => {
    const f = fakePb(() => {
      if (fetchThrows) throw new Error("connect ECONNREFUSED");
      return { status, body };
    });
    try {
      await pb.changePassword(f.ctx, "u1abc", pw.old, pw.fresh);
      return null;
    } catch (e) {
      return e;
    }
  };
  const wrongOld = await run(400, { message: "Failed to update record.", data: { oldPassword: { code: "validation_invalid_old_password", message: "Invalid old password." } } });
  assert.equal(wrongOld.message, "The old password is wrong.");
  assert.equal(wrongOld.status, 400);
  const tooShort = await run(400, { message: "Failed to update record.", data: { password: { code: "validation_length_out_of_range", message: "Must be between 8 and 71 character(s)." } } });
  assert.match(tooShort.message, /8 to 71 characters/);
  const ended = await run(401, { message: "The request requires valid record authorization token." });
  assert.equal(ended.status, 401);
  assert.match(ended.message, /sign-in ended/);
  const down = await run(0, {}, true);
  assert.equal(down.status, 503);
  const other = await run(500, { message: "boom" });
  assert.match(other.message, /password was not changed/);
  for (const e of [wrongOld, tooShort, ended, down, other]) assert.ok(!e.message.includes(pw.old) && !e.message.includes(pw.fresh), "no password in a message");
  assert.equal(await run(200, {}), null, "a good answer gives no error");
});

await check("calls: a failed list call gives a ProfileError with a plain message", async () => {
  const f = fakePb(() => ({ status: 500, body: { message: "database is locked" } }));
  await assert.rejects(() => pb.loadProgress(f.ctx, "u1abc"), (e) => e instanceof pb.ProfileError && e.message === "The saved places could not be read.");
  await assert.rejects(() => pb.loadBookmarks(f.ctx, "u1abc"), (e) => e.message === "The bookmarks could not be read.");
  const down = fakePb(() => {
    throw new Error("down");
  });
  await assert.rejects(() => pb.loadBookmarks(down.ctx, "u1abc"), (e) => e.status === 503);
});

// ---------------------------------------------------------------- part 3: the loader

/** A fake PocketBase with made-up data for one person. */
function worldOf({ progressTotal = 3, own = 9, failProgress = false, failTitles = false } = {}) {
  return fakePb((c) => {
    const col = collectionOf(c);
    if (col === "users") return { status: 200, body: { created: "2026-11-02 04:30:00.000Z" } };
    if (col === "reader_progress") {
      if (failProgress) return { status: 500, body: {} };
      const items = [progressRec(1, "2026-11-08 08:00:00.000Z"), progressRec(3, "2026-11-12 08:00:00.000Z"), progressRec(2, "2026-11-10 08:00:00.000Z")];
      return { status: 200, body: { items, totalItems: progressTotal } };
    }
    if (col === "reader_bookmarks") return { status: 200, body: { items: [bookmarkRec("b1", 1, "2026-11-03 10:00:00.000Z", "first"), bookmarkRec("b2", 2, "2026-11-05 10:00:00.000Z")], totalItems: 2 } };
    if (col === "own_translations") return { status: 200, body: { items: [{ id: "t1" }], totalItems: own } };
    if (col === "catalog_items") {
      if (failTitles) return { status: 500, body: {} };
      const ids = [...c.query.filter.matchAll(/item_id="([^"]+)"/g)].map((m) => m[1]);
      return { status: 200, body: { items: ids.map((id) => ({ item_id: id, title_en: id === "madeup_book3" ? "" : "Title of " + id, title_ja: id === "madeup_book1" ? "試験" : "" })), totalItems: ids.length } };
    }
    return { status: 404, body: {} };
  });
}
const colsOf = (calls) => [...new Set(calls.map(collectionOf))].sort();

await check("loader: an approved reader gets 3 cards, no own_translations call, the lists newest first, and the titles", async () => {
  const w = worldOf();
  const d = await load.loadProfile(w.ctx, USER("reader"));
  assert.deepEqual(d.cards.map((c) => c.id), ["books", "bookmarks", "since"]);
  assert.deepEqual(d.cards.map((c) => c.value), ["3", "2", "2026-11-01"]);
  assert.ok(!colsOf(w.calls).includes("own_translations"));
  assert.deepEqual(d.progress.rows.map((r) => r.itemId), ["madeup_book3", "madeup_book2", "madeup_book1"]);
  assert.deepEqual(d.bookmarks.rows.map((r) => r.id), ["b2", "b1"]);
  assert.deepEqual(d.titles.madeup_book1, { en: "Title of madeup_book1", ja: "試験" });
  assert.equal(d.waiting, false);
  assert.equal(d.created, "2026-11-02 04:30:00.000Z");
});

await check("loader: a translator and an admin get 4 cards, and the own count is one call", async () => {
  for (const role of ["translator", "admin"]) {
    const w = worldOf({ own: 9 });
    const d = await load.loadProfile(w.ctx, USER(role));
    assert.deepEqual(d.cards.map((c) => c.id), ["books", "bookmarks", "since", "own"], role);
    assert.equal(d.cards[3].value, "9");
    assert.equal(w.calls.filter((c) => collectionOf(c) === "own_translations").length, 1);
  }
});

await check("loader: a reader who waits for approval gets no cards and no read call of the reading collections (only the own join date)", async () => {
  const w = worldOf();
  const d = await load.loadProfile(w.ctx, USER("reader", false));
  assert.equal(d.waiting, true);
  assert.deepEqual(d.cards, []);
  assert.deepEqual(colsOf(w.calls), ["users"]);
  assert.equal(w.calls.length, 1);
  assert.equal(d.progress.error, "");
  assert.deepEqual(d.progress.rows, []);
  assert.deepEqual(d.bookmarks.rows, []);
  assert.equal(d.created, "2026-11-02 04:30:00.000Z");
});

await check("loader: a failed part shows its own message and the rest of the page stays", async () => {
  const w = worldOf({ failProgress: true });
  const d = await load.loadProfile(w.ctx, USER("admin"));
  assert.equal(d.progress.error, "The saved places could not be read.");
  assert.equal(d.progress.total, null);
  assert.equal(d.bookmarks.error, "");
  assert.equal(d.bookmarks.rows.length, 2);
  assert.deepEqual(d.cards.map((c) => c.value), ["–", "2", "2026-11-01", "9"]);
  const t = worldOf({ failTitles: true });
  const dt = await load.loadProfile(t.ctx, USER("reader"));
  assert.deepEqual(dt.titles, {}, "the titles are empty");
  assert.equal(dt.progress.rows.length, 3, "the rows stay, with the work IDs");
  const dead = fakePb(() => {
    throw new Error("down");
  });
  const dd = await load.loadProfile(dead.ctx, USER("translator"));
  assert.equal(dd.created, "");
  assert.equal(dd.progress.error, "The sign-in server is not reachable. Try again later.");
  assert.deepEqual(dd.cards.map((c) => c.value), ["–", "–", "–", "–"]);
});

await check("loader: the list shows the newest 20 saved places, and the card shows the full count", async () => {
  const f = fakePb((c) => {
    if (collectionOf(c) === "reader_progress") return { status: 200, body: { items: Array.from({ length: 30 }, (_, i) => progressRec(i + 1, `2026-10-${String(i + 1).padStart(2, "0")} 08:00:00.000Z`)), totalItems: 30 } };
    if (collectionOf(c) === "catalog_items") return { status: 200, body: { items: [], totalItems: 0 } };
    return { status: 200, body: { items: [], totalItems: 0, created: "2026-11-02 04:30:00.000Z" } };
  });
  const d = await load.loadProfile(f.ctx, USER("reader"));
  assert.equal(d.progress.rows.length, 20);
  assert.equal(d.progress.rows[0].itemId, "madeup_book30");
  assert.equal(d.cards[0].value, "30");
});

await check("loader: no call reads any collection except users, reader_progress, reader_bookmarks, own_translations, and catalog_items", async () => {
  const w = worldOf();
  await load.loadProfile(w.ctx, USER("admin"));
  assert.deepEqual(colsOf(w.calls), ["catalog_items", "own_translations", "reader_bookmarks", "reader_progress", "users"]);
});

// ---------------------------------------------------------------- part 4: the markup

const linksOf = (html) => [...html.matchAll(/<a\s([^>]*)>(.*?)<\/a>/g)].map((m) => ({ href: (/href="([^"]*)"/.exec(m[1])?.[1] ?? "").replaceAll("&amp;", "&"), attrs: m[1], text: htmlText(m[2]).trim() }));

await check("Reader bar: the name is a link to /profile for every role, and the old links stay", () => {
  for (const role of ["reader", "translator", "admin"]) {
    const html = h(ReaderBar, { name: "Made Up", email: "person@example.com", role, approved: true });
    const l = linksOf(html);
    const me = l.find((x) => x.attrs.includes("data-profile-link"));
    assert.ok(me, role);
    assert.equal(me.href, "/profile");
    assert.equal(me.text, "Made Up");
    assert.match(htmlText(html), new RegExp(`Made Up \\(${role}\\)`));
    assert.ok(l.some((x) => x.href === "/read" && x.text === "All books"));
    assert.equal(l.some((x) => x.href === "/translate"), role !== "reader", role);
    assert.equal(l.filter((x) => x.attrs.includes("data-admin-link")).length, role === "admin" ? 4 : 0, role); // unit VW118 added the link "Visual issues" (3 admin links), unit VW120 added "Links" (4)
  }
  const noName = h(ReaderBar, { name: "", email: "person@example.com", role: "reader", approved: false });
  assert.equal(linksOf(noName).find((x) => x.attrs.includes("data-profile-link")).text, "person@example.com");
  assert.match(htmlText(noName), /waits for approval/);
});

await check("Reader bar on /profile: the name is the current page and All books is a link", () => {
  const html = h(ReaderBar, { name: "Made Up", email: "person@example.com", role: "reader", approved: true, onProfile: true });
  const l = linksOf(html);
  assert.ok(l.find((x) => x.attrs.includes("data-profile-link")).attrs.includes('aria-current="page"'));
  assert.ok(l.find((x) => x.text === "All books").attrs.includes("text-accent"));
  const other = h(ReaderBar, { name: "Made Up", email: "person@example.com", role: "reader", approved: true });
  assert.ok(!linksOf(other).find((x) => x.attrs.includes("data-profile-link")).attrs.includes("aria-current"));
});

await check("translator bar (Q-A 3:61.2): Read for every staff role, Readers and Human versions for an admin only, the name links to /profile", () => {
  for (const role of ["translator", "admin"]) {
    const html = h(HtvBar, { name: "Made Up", email: "person@example.com", role });
    const l = linksOf(html);
    assert.ok(l.some((x) => x.href === "/read" && x.text === "Read"), role);
    const admin = l.filter((x) => x.attrs.includes("data-admin-link"));
    assert.deepEqual(admin.map((x) => [x.href, x.text]), role === "admin" ? [["/admin/readers", "Readers"], ["/admin/versions", "Human versions"], ["/admin/issues", "Visual issues"], ["/admin/links", "Links"]] : [], role); // unit VW118 added "Visual issues", unit VW120 added "Links"
    const me = l.find((x) => x.attrs.includes("data-profile-link"));
    assert.equal(me.href, "/profile");
    assert.equal(me.text, "Made Up");
    assert.match(htmlText(html), new RegExp(`Signed in as Made Up \\(${role}\\)`));
    assert.match(html, /Sign out/);
  }
  const book = h(HtvBar, { name: "Made Up", email: "person@example.com", role: "admin", backHref: "/translate" });
  assert.equal(linksOf(book)[0].text, "All books", "the old link to the book list stays first");
  assert.equal(linksOf(book)[0].href, "/translate");
});

await check("translator bar: the same link set as the Reader bar for the same role (the two bars agree)", () => {
  const set = (html) => new Set(linksOf(html).filter((x) => x.attrs.includes("data-admin-link") || x.attrs.includes("data-profile-link")).map((x) => x.href));
  for (const role of ["translator", "admin"]) {
    const a = set(h(ReaderBar, { name: "n", email: "e@example.com", role, approved: true }));
    const b = set(h(HtvBar, { name: "n", email: "e@example.com", role }));
    assert.deepEqual([...a].sort(), [...b].sort(), role);
  }
});

const bandOf = (path, monitor) => {
  at(path);
  const html = h(Nav, { monitor, theme: "light" });
  const nameText = htmlText(/<div class="py-3[^"]*">(.*?)<\/div>/.exec(html)?.[1] ?? "");
  return { html, name: nameText.trim(), tabs: linksOf(html).map((x) => x.text).filter(Boolean) };
};

await check("top band, monitor off (the public site): the 404 page and /profile show Kendo books and no monitor tab", () => {
  for (const p of ["/runs", "/no-such-page", "/books", "/profile", "/read", "/sign-in"]) {
    const b = bandOf(p, false);
    assert.equal(b.name, "Kendo books", p);
    assert.ok(!/agent-translation-monitor/.test(b.html), p);
    assert.deepEqual(b.tabs, [], p);
  }
});

await check("top band, monitor off: the human-translation-view keeps its name and its one tab", () => {
  const b = bandOf("/translate", false);
  assert.equal(b.name, "human-translation-view");
  assert.deepEqual(b.tabs, ["Human translation"]);
  assert.equal(bandOf("/translate/sign-in", false).name, "human-translation-view");
});

await check("top band, monitor on (this Mac): the monitor screens and their 404 page keep the monitor look, and /profile has the reader look", () => {
  for (const p of ["/", "/runs", "/books", "/no-such-page", "/json"]) {
    const b = bandOf(p, true);
    assert.equal(b.name, "agent-translation-monitor", p);
    assert.deepEqual(b.tabs, ["Monitor dashboard", "Lists", "Books", "Run settings", "JSON viewer", "Issues", "Human translation"], p); // VW121: the tab Issues
  }
  assert.equal(bandOf("/translate", true).name, "human-translation-view");
  const prof = bandOf("/profile", true);
  assert.equal(prof.name, "Kendo books");
  assert.deepEqual(prof.tabs, []);
});

await check("Continue reading list: title, resume page, and an Open link, in the order of the rows", () => {
  const rows = [
    { itemId: "madeup_book3", pageId: "madeup_book3/p003", n: 3, digits: 3, updated: "2026-11-12 08:00:00.000Z", created: "" },
    { itemId: "madeup_book1", pageId: "madeup_book1/p048", n: 48, digits: 3, updated: "2026-11-08 08:00:00.000Z", created: "" },
  ];
  const titles = { madeup_book1: { en: "Made-up Kendo Book", ja: "試験の本" } };
  const html = h(ProfileProgress, { rows, total: 2, titles, error: "" });
  const text = htmlText(html);
  assert.ok(text.indexOf("madeup_book3") < text.indexOf("Made-up Kendo Book"), "the order of the rows");
  assert.match(text, /Made-up Kendo Book 試験の本 Page 48 · last read 2026-11-08/);
  assert.match(text, /madeup_book3 Page 3 · last read 2026-11-12/);
  const open = linksOf(html).filter((x) => x.attrs.includes("data-open-link"));
  assert.deepEqual(open.map((x) => x.href), ["/read/madeup_book3?view=page&at=p003", "/read/madeup_book1?view=page&at=p048"]);
  assert.ok(!/data-capped/.test(html));
  assert.match(htmlText(h(ProfileProgress, { rows, total: 31, titles, error: "" })), /Showing the newest 2 of 31\./);
});

await check("Continue reading list: an error shows its message, an empty list shows a plain line", () => {
  assert.match(htmlText(h(ProfileProgress, { rows: [], total: null, titles: {}, error: "The saved places could not be read." })), /The saved places could not be read\./);
  assert.match(htmlText(h(ProfileProgress, { rows: [], total: 0, titles: {}, error: "" })), /You have not started a book yet/);
});

await check("Bookmarks list: title, page, note, an Open link, and a Remove button for each row", () => {
  const rows = [
    { id: "b2", itemId: "madeup_book2", pageId: "madeup_book2/p012", n: 12, digits: 3, note: "check this line", created: "2026-11-05 10:00:00.000Z" },
    { id: "b1", itemId: "madeup_book1", pageId: "madeup_book1/p011", n: 11, digits: 3, note: "", created: "2026-11-03 10:00:00.000Z" },
  ];
  const html = h(ProfileBookmarks, { rows, total: 2, titles: { madeup_book2: { en: "Made-up Two", ja: "" } }, error: "" });
  const text = htmlText(html);
  assert.match(text, /Made-up Two Page 12 · added 2026-11-05 check this line Open Remove/);
  assert.match(text, /madeup_book1 Page 11 · added 2026-11-03 Open Remove/);
  assert.equal((html.match(/data-remove="/g) ?? []).length, 2);
  assert.deepEqual(linksOf(html).filter((x) => x.attrs.includes("data-open-link")).map((x) => x.href), ["/read/madeup_book2?view=page&at=p012", "/read/madeup_book1?view=page&at=p011"]);
  assert.match(htmlText(h(ProfileBookmarks, { rows: [], total: 0, titles: {}, error: "" })), /You have no bookmarks/);
  assert.match(htmlText(h(ProfileBookmarks, { rows: [], total: null, titles: {}, error: "The bookmarks could not be read." })), /The bookmarks could not be read\./);
});

// ---------------------------------------------------------------- part 5: the source

const PROFILE_FILES = [
  "lib/profile-rules.ts",
  "lib/profile-pb.ts",
  "lib/profile-load.ts",
  "lib/profile-api.ts",
  "app/profile/page.tsx",
  "app/profile/layout.tsx",
  "app/profile/error.tsx",
  "app/profile/loading.tsx",
  "app/api/profile/name/route.ts",
  "app/api/profile/password/route.ts",
  "components/ProfileName.tsx",
  "components/ProfilePassword.tsx",
  "components/ProfileTitle.tsx",
  "components/ProfileProgress.tsx",
  "components/ProfileBookmarks.tsx",
];

await check("source: no profile file reads or counts the v1 placeholder (owner rule round 73c, VISION-viewer 15.26.9)", () => {
  for (const f of PROFILE_FILES) {
    const s = read(f);
    assert.ok(!/v1_placeholders|V1_COLLECTION|v1Pb|reader-v1/.test(s), f);
  }
  const collections = new Set(PROFILE_FILES.flatMap((f) => [...read(f).matchAll(/"(?:reader_[a-z]+|own_translations|catalog_items|users|[a-z_]*placeholder[a-z_]*)"|collections\/([a-z_]+)\//g)].map((m) => m[1] ?? m[0].replaceAll('"', ""))));
  for (const c of collections) assert.ok(["reader_progress", "reader_bookmarks", "own_translations", "catalog_items", "users"].includes(c), "collection " + c);
});

await check("source: the page and the routes send no role, approved, or disabled key, and the password fields have the right types", () => {
  const route = read("app/api/profile/name/route.ts");
  assert.ok(!/\b(role|approved|disabled)\b\s*:/.test(route.replace(/\/\/.*$/gm, "")), "the name route sets no such key");
  const pwRoute = read("app/api/profile/password/route.ts");
  assert.ok(!/console\./.test(pwRoute + read("lib/profile-pb.ts") + read("components/ProfilePassword.tsx")), "no console line in the password code");
  const form = read("components/ProfilePassword.tsx");
  assert.equal((form.match(/type="password"/g) ?? []).length, 3);
  assert.ok(form.includes('autoComplete="current-password"'));
  assert.equal((form.match(/autoComplete="new-password"/g) ?? []).length, 2);
  assert.ok(pwRoute.includes("clearTokenCookie()"), "the route clears the cookie after a change");
  assert.ok(pwRoute.includes("guard(req, { mutating: true })"));
  assert.ok(route.includes("guard(req, { mutating: true })"));
});

await check("source: the profile page uses the sign-in return path, and /profile is a safe `next` value", async () => {
  assert.ok(read("app/profile/page.tsx").includes('requireReaderSession("/profile")'));
  const s = await import("../lib/htv-session.ts");
  assert.equal(s.isSafeNext("/profile"), true);
  assert.equal(s.isSafeNext("/read"), true);
  assert.equal(s.isSafeNext("/translate/x"), true);
  assert.equal(s.isSafeNext("/profile/../admin"), false);
  assert.equal(s.isSafeNext("//evil.example.test"), false);
  assert.equal(s.isSafeNext("/profiles"), false);
  assert.equal(s.isSafeNext("/runs"), false);
});

await check("source: the profile layout uses the default theme of the reader pages, the same as /read", () => {
  const a = read("app/profile/layout.tsx");
  const b = read("app/read/layout.tsx");
  for (const s of ["ReaderThemeDefault", "DEFAULT_THEME_READER", "hasThemeCookie()"]) assert.ok(a.includes(s) && b.includes(s), s);
});

await check("source: the 404 page uses theme classes only, links to /read, and has no hard-coded color or monitor name", () => {
  assert.ok(existsSync(path.join(app, "app/not-found.tsx")));
  const s = read("app/not-found.tsx");
  assert.ok(s.includes('href="/read"'));
  assert.ok(s.includes("ReaderBar"));
  assert.ok(s.includes("Page not found"));
  const code = s.replace(/\/\/.*$/gm, "");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgb\(|style=\{/.test(code), "no hard-coded color or inline style");
  assert.ok(!/agent-translation-monitor/.test(code));
  assert.ok(/text-muted|border-line/.test(code), "theme classes");
  // "a { color: inherit }" in globals.css beats the text utilities, so a link must not use bg-accent with text-white (found in the first browser run: dark text on dark red).
  const linkLine = code.split("\n").find((l) => l.includes("data-not-found-link")) ?? "";
  assert.ok(linkLine.includes("border-accent") && !/bg-accent|text-white/.test(linkLine), linkLine);
  // The sign-in state never breaks the 404 page.
  assert.ok(/try\s*\{[\s\S]*getSession\(\)[\s\S]*\}\s*catch/.test(code));
});

await check("source: finding 3 (progress) and finding 4 (theme of the settings panel) have their small fixes", () => {
  const r = read("app/api/read/progress/route.ts");
  assert.ok(/e instanceof PbError\) \|\| e\.status !== 400\) throw e/.test(r), "the second try after a 400");
  assert.equal((r.match(/saveReadingProgress\(g\.token/g) ?? []).length, 2);
  const p = read("app/read/[slug]/page.tsx");
  assert.ok(p.includes("(await hasThemeCookie()) ? await readTheme() : DEFAULT_THEME_READER"));
  assert.ok(!p.includes("theme={await readTheme()}"));
});

await check("source: the sign-in page shows one line after a password change", () => {
  const s = read("app/sign-in/page.tsx");
  assert.ok(s.includes('changed === "1"') && s.includes("PASSWORD_CHANGED_NOTICE") && s.includes("data-password-changed"));
  assert.equal(rules.AFTER_PASSWORD_PATH, "/sign-in?changed=1");
  assert.match(rules.PASSWORD_CHANGED_NOTICE, /password was changed/);
});

await check("source: the root layout keeps the monitor title with the monitor on and uses a reader title with it off", () => {
  const s = read("app/layout.tsx");
  assert.ok(s.includes("export async function generateMetadata"));
  assert.ok(/if \(await monitorEnabled\(\)\) return \{ title: "agent-translation-monitor"/.test(s), "monitor on keeps the old title");
  assert.ok(s.includes('title: "Kendo books"'), "monitor off");
  assert.ok(!s.includes("export const metadata"), "the fixed title is gone");
});

// Unit VW118 added migration 1793300017 and unit VW120 added 1793300018, so the folder holds 19 files. Unit VW105 itself added none.
// Unit VW126 added migration 1793300019 (the dictionary): the folder holds 20 files, so every position from the end moves by one.
await check("source: no migration is added by this unit (the folder holds 20 files with the ones of VW118, VW120, and VW126) and the new files sit in new modules", () => {
  const dir = path.resolve(app, "..", "data", "scripts", "pocketbase", "pb_migrations");
  if (existsSync(dir)) assert.equal(readdirSync(dir).filter((f) => f.endsWith(".js")).length, 20); // unit VW126
  for (const f of ["lib/profile-rules.ts", "lib/profile-pb.ts", "lib/profile-load.ts", "lib/profile-api.ts"]) assert.ok(existsSync(path.join(app, f)), f);
  assert.ok(!/profile/.test(read("lib/pb.ts")), "lib/pb.ts is not changed");
});

process.exit(done() ? 1 : 0);
