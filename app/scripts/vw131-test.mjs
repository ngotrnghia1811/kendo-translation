// VW131 (round 134, card P70.2): tests of the offline copy of a book for readers after the owner pick Q-A 3:134.3 "Accept rows 1 to 7".
// Owner note (Q-A 3:132.1): "Add a read-offline button to a book for `reader`." Owner pick Q-A 3:133.3 "A: save in this browser".
//   part 1  the pure helpers of lib/offline-copy.ts: size math, PST date, update detection, gate pruning, who may save, clear rules, texts
//   part 2  the service worker public/offline-sw.js in a sandbox: which requests it answers, the shell with no network, 401/403 removes every copy
//   part 3  the browser helpers of lib/offline-copy-client.ts with made-up caches: sign-out clear, remove, the plan call that fails the sign-in check, the prune
//   part 4  the sources: the new routes use the gate of /read without allowLink, who sees the button, sign-out order, no word "agent" for readers
//   part 5  the live routes (when VW131_APP_URL and VW131_ACCOUNTS are set): a copy of the app on a test PocketBase (port 8092 or 8093 only)
// Run: cd app && TMPDIR=<unit>/tmp [VW131_APP_URL=http://127.0.0.1:3255 VW131_ACCOUNTS=<unit>/tmp/bc-accounts.json VW131_PB_URL=http://127.0.0.1:8092] node scripts/vw131-test.mjs
// The last line is "<n> passed, <m> failed". Made-up data only (example.test addresses). No network except localhost. Passwords are never printed.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { checker, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/read/made_up_book");
const { check, done } = checker();
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const req = createRequire(path.join(app, "package.json"));
// Part 3 puts a made-up fetch on globalThis. Part 5 uses this one.
const netFetch = globalThis.fetch;
const gated = async (name, on, fn) => (on ? check(name, fn) : console.log(`skip  ${name} (the env variable for it is not set)`));

const O = await import("../lib/offline-copy.ts");
const W = O.OFFLINE_WORDS;

// ---------------------------------------------------------------- part 1: pure helpers
console.log("part 1: the pure helpers of lib/offline-copy.ts");
await check("1.1 size: MB with one decimal, 1 MB = 1,000,000 bytes (Q-A 3:134.1 gave MB)", () => {
  assert.equal(O.formatMb(27_000_000), "27.0");
  assert.equal(O.formatMb(12_612_345), "12.6");
  assert.equal(O.formatMb(194_049_999), "194.0");
  assert.equal(O.formatMb(0), "0.0");
  assert.equal(O.formatMb(-5), "0.0");
});
await check("1.2 size: a small copy above 0 never shows 0.0 MB", () => {
  assert.equal(O.formatMb(1), "0.1");
  assert.equal(O.formatMb(49_999), "0.1");
  assert.equal(O.formatMb(150_000), "0.1");
  assert.equal(O.formatMb(160_000), "0.2");
});
await check("1.3 row 2: the prompt text is 'Save 27 MB for offline reading?' with one decimal", () => {
  assert.equal(W.ask(O.formatMb(27_000_000)), "Save 27.0 MB for offline reading?");
  assert.equal(W.saving("1.5", "27.0"), "Saving: 1.5 of 27.0 MB.");
});
await check("1.4 row 3: the band text 'Offline copy, saved <date>' with the date in PST (UTC-8)", () => {
  // 2026-11-25 07:30 UTC is 2026-11-24 23:30 PST. 2026-11-25 08:00 UTC is 2026-11-25 00:00 PST.
  assert.equal(O.pstDate(Date.UTC(2026, 10, 25, 7, 30)), "2026-11-24");
  assert.equal(O.pstDate(Date.UTC(2026, 10, 25, 8, 0)), "2026-11-25");
  assert.equal(O.pstDate(Date.UTC(2026, 6, 1, 7, 59)), "2026-06-30"); // PST all year, no summer time
  assert.equal(W.band("2026-11-25"), "Offline copy, saved 2026-11-25");
});
const lists = (t, d) => ({ textPages: d, index: { textPages: t } });
await check("1.5 row 4: 'Update offline copy' shows only when the online book has translated pages that the copy lacks", () => {
  assert.deepEqual(O.updatePages(lists([1, 2, 4], [1, 2, 3, 4]), lists([1, 2, 4], [1, 2, 3, 4])), []);
  assert.deepEqual(O.updatePages(lists([1, 2, 4, 5], [1, 2, 3, 4, 5]), lists([1, 2, 4], [1, 2, 3, 4])), [5]);
  assert.deepEqual(O.updatePages(lists([1, 2, 3], [1, 2, 3]), lists([1, 2], [1, 2, 3])), [3]); // a page with old text became translated
  assert.deepEqual(O.updatePages(lists([1], [1]), lists([1, 2], [1, 2])), []); // a closed page is no update
  assert.equal(W.updateNote(1), "This book has 1 new page with text since the save.");
  assert.equal(W.updateNote(3), "This book has 3 new pages with text since the save.");
});
await check("1.6 gate: a page that the admin closed leaves the copy at the next online visit", () => {
  assert.deepEqual(O.gonePages(lists([1, 2, 5], [1, 2, 3, 5]), lists([1, 2, 4, 5], [1, 2, 3, 4, 5])), [4]);
  assert.deepEqual(O.gonePages(lists([1, 2], [1, 2, 3]), lists([1, 2, 3], [1, 2, 3])), [3]); // translation closed, old text stays online
  assert.deepEqual(O.gonePages(lists([1, 2], [1, 2]), lists([1, 2], [1, 2])), []);
  assert.deepEqual(O.closedPages([1, 2], [1, 2, 9]), [9]);
});
await check("1.7 row 1: only an approved person who is no view-only link visitor can save", () => {
  assert.equal(O.canSaveOffline({ approved: true, linkVisitor: false }), true);
  assert.equal(O.canSaveOffline({ approved: true, linkVisitor: true }), false);
  assert.equal(O.canSaveOffline({ approved: false, linkVisitor: false }), false);
});
await check("1.8 row 6: the clear rules (401 or 403, signed out, waiting reader, view-only link)", () => {
  assert.equal(O.clearsCopies(401), true);
  assert.equal(O.clearsCopies(403), true);
  for (const s of [200, 400, 404, 500, 0]) assert.equal(O.clearsCopies(s), false);
  assert.equal(O.mustClearOffline({ signedIn: true, approved: true, linkVisitor: false }), false);
  assert.equal(O.mustClearOffline({ signedIn: false, approved: true, linkVisitor: false }), true);
  assert.equal(O.mustClearOffline({ signedIn: true, approved: false, linkVisitor: false }), true);
  assert.equal(O.mustClearOffline({ signedIn: true, approved: true, linkVisitor: true }), true);
});
await check("1.9 row 5: the texts 'Not available offline' for search, bookmarks, and the visual-issue tool", () => {
  assert.equal(W.notAvailable, "Not available offline");
  assert.equal(W.notAvailableOf("Search"), "Search: Not available offline.");
  assert.equal(W.notAvailableOf("Bookmarks"), "Bookmarks: Not available offline.");
  assert.ok(W.issue.startsWith("Not available offline."));
});
await check("1.10 the offline addresses: a book, the book list, search and dictionary, nothing else", () => {
  assert.deepEqual(O.offlineRoute("/read/left_foot_full"), { kind: "book", slug: "left_foot_full" });
  assert.deepEqual(O.offlineRoute("/read"), { kind: "list" });
  assert.deepEqual(O.offlineRoute("/search"), { kind: "search" });
  assert.deepEqual(O.offlineRoute("/dictionary"), { kind: "dictionary" });
  for (const p of ["/", "/monitor", "/admin", "/translate", "/v/abc", "/read/Bad-Name", "/read/a/b", "/profile"]) assert.equal(O.offlineRoute(p), null, p);
});
await check("1.11 the save list holds the text pages and image pages of the plan, with the digits of the book", () => {
  const parts = O.saveParts({ slug: "kj_1980", textPages: [1, 12], imagePages: [1, 2], index: { digits: 4 } });
  assert.deepEqual(parts, { texts: ["kj_1980/p0001", "kj_1980/p0012"], images: ["kj_1980/p0001", "kj_1980/p0002"] });
  assert.equal(O.pageIdOf("left_foot_full", 7, 3), "left_foot_full/p007");
  assert.equal(O.percentOf(1, 3), 33);
  assert.equal(O.percentOf(5, 0), 100);
  assert.equal(O.percentOf(9, 3), 100);
});
await check("1.12 the cache names: one cache per book, all with the prefix kendo-offline-", () => {
  assert.equal(O.bookCacheName("left_foot_full"), "kendo-offline-book-left_foot_full-v1");
  assert.equal(O.slugOfCache("kendo-offline-book-left_foot_full-v1"), "left_foot_full");
  assert.equal(O.slugOfCache(O.OFFLINE_SHELL_CACHE), null);
  assert.equal(O.slugOfCache("other-cache"), null);
  assert.ok(O.OFFLINE_SHELL_CACHE.startsWith(O.OFFLINE_PREFIX) && O.OFFLINE_THEME_KEY.startsWith(O.OFFLINE_PREFIX) && O.offlinePlaceKey("x").startsWith(O.OFFLINE_PREFIX));
});
await check("1.13 readers see no word 'agent' and no model name in the offline texts", () => {
  const all = Object.values(W).map((v) => (typeof v === "function" ? v("X", "Y") : v)).join(" ");
  assert.doesNotMatch(all, /agent|model|verdict|score|claude|gpt|gemini/i);
});

// ---------------------------------------------------------------- made-up Cache Storage
const keyOf = (r) => (typeof r === "string" ? r : new URL(r.url).pathname + new URL(r.url).search);
class MadeUpCache {
  constructor() {
    this.map = new Map();
  }
  async match(r) {
    const hit = this.map.get(keyOf(r));
    return hit ? hit.clone() : undefined;
  }
  async put(r, res) {
    this.map.set(keyOf(r), res);
  }
  async delete(r) {
    return this.map.delete(keyOf(r));
  }
  async keys() {
    return [...this.map.keys()];
  }
}
class MadeUpCaches {
  constructor() {
    this.all = new Map();
  }
  async has(n) {
    return this.all.has(n);
  }
  async open(n) {
    if (!this.all.has(n)) this.all.set(n, new MadeUpCache());
    return this.all.get(n);
  }
  async keys() {
    return [...this.all.keys()];
  }
  async delete(n) {
    return this.all.delete(n);
  }
}
const jsonRes = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
async function madeUpCopy(caches, slug, pages = [1, 2]) {
  const c = await caches.open(O.bookCacheName(slug));
  await c.put(O.offlineDataKey(slug), jsonRes({ slug, savedAt: 1, textPages: pages, imagePages: pages, index: { digits: 3, textPages: pages } }));
  for (const n of pages) {
    const id = O.pageIdOf(slug, n, 3);
    await c.put(O.pageDataKey(id), jsonRes({ pages: [{ pageId: id, n }] }));
    await c.put(O.pageImageKey(id), new Response("img-" + n, { headers: { "Content-Type": "image/webp" } }));
  }
  const s = await caches.open(O.OFFLINE_SHELL_CACHE);
  await s.put(O.OFFLINE_SHELL_PATH, new Response("<html>shell</html>", { headers: { "Content-Type": "text/html" } }));
}

// ---------------------------------------------------------------- part 2: the service worker
console.log("part 2: the service worker public/offline-sw.js in a sandbox");
const ORIGIN = "https://made-up.example.test";
function loadWorker({ net, clientUrl = ORIGIN + "/read/made_up_book" }) {
  const listeners = {};
  const caches = new MadeUpCaches();
  const calls = [];
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (t, f) => (listeners[t] = f),
    skipWaiting: () => undefined,
    clients: { claim: async () => undefined, get: async () => ({ url: clientUrl }) },
  };
  const fetchFn = async (r) => {
    calls.push(r.url);
    return net(r);
  };
  vm.runInNewContext(read("public/offline-sw.js"), { self, caches, fetch: fetchFn, URL, Response, console });
  const send = (url, { mode = "cors", method = "GET" } = {}) => {
    let answer = null;
    listeners.fetch({ request: { url: url.startsWith("http") ? url : ORIGIN + url, mode, method }, clientId: "c1", respondWith: (p) => (answer = p) });
    return answer;
  };
  return { caches, send, calls, listeners };
}
const offline = async () => {
  throw new TypeError("Failed to fetch");
};
await check("2.1 the worker answers no request of other screens, of other sites, and no POST", async () => {
  const w = loadWorker({ net: async () => new Response("net") });
  for (const p of ["/", "/monitor", "/admin", "/translate", "/v/abc", "/profile", "/sign-in"]) assert.equal(w.send(p, { mode: "navigate" }), null, p);
  for (const p of ["/api/htv/login", "/api/monitor/books", "/api/translate/x", "/api/theme", "/favicon.ico"]) assert.equal(w.send(p), null, p);
  assert.equal(w.send("https://pb-v2.kendotranslation.com/page-images/x/p001.webp"), null);
  assert.equal(w.send("/api/read/progress", { method: "POST" }), null);
  assert.equal(w.send("/api/read/bookmarks", { method: "PUT" }), null);
});
await check("2.2 online, a book page load goes to the network (the gate of /read runs)", async () => {
  const w = loadWorker({ net: async () => new Response("online page") });
  await madeUpCopy(w.caches, "made_up_book");
  assert.equal(await (await w.send("/read/made_up_book?view=page&at=p002", { mode: "navigate" })).text(), "online page");
  assert.equal(w.calls.length, 1);
});
await check("2.3 no network and a saved copy: the book page load gets the shell page", async () => {
  const w = loadWorker({ net: offline });
  await madeUpCopy(w.caches, "made_up_book");
  assert.equal(await (await w.send("/read/made_up_book?at=p002", { mode: "navigate" })).text(), "<html>shell</html>");
  assert.equal(await (await w.send("/read", { mode: "navigate" })).text(), "<html>shell</html>");
  assert.equal(await (await w.send("/search?q=x", { mode: "navigate" })).text(), "<html>shell</html>");
});
await check("2.4 no network and no copy of that book: the page load fails as without a worker", async () => {
  const w = loadWorker({ net: offline });
  await madeUpCopy(w.caches, "made_up_book");
  await assert.rejects(w.send("/read/other_book", { mode: "navigate" }), /Failed to fetch/);
  const empty = loadWorker({ net: offline });
  await assert.rejects(empty.send("/read", { mode: "navigate" }), /Failed to fetch/);
});
await check("2.5 a saved image comes from the copy, also with no network; an image of a book with no copy goes to the network", async () => {
  const w = loadWorker({ net: offline });
  await madeUpCopy(w.caches, "made_up_book");
  assert.equal(await (await w.send("/api/read/image/made_up_book/p002")).text(), "img-2");
  await assert.rejects(w.send("/api/read/image/other_book/p001"), /Failed to fetch/);
  const on = loadWorker({ net: async () => new Response("net-img") });
  assert.equal(await (await on.send("/api/read/image/other_book/p001")).text(), "net-img");
});
await check("2.6 no network: the page text comes from the copy, only for saved pages", async () => {
  const w = loadWorker({ net: offline });
  await madeUpCopy(w.caches, "made_up_book", [1, 2]);
  const r = await w.send("/api/read/page?ids=" + encodeURIComponent("made_up_book/p001,made_up_book/p002,made_up_book/p003"));
  assert.deepEqual((await r.json()).pages.map((p) => p.n), [1, 2]);
  await assert.rejects(w.send("/api/read/page?ids=" + encodeURIComponent("made_up_book/p003")), /Failed to fetch/);
});
await check("2.7 row 6: a 401 or 403 of a GET /api/read/* answer removes every copy, and the answer passes through", async () => {
  for (const status of [401, 403]) {
    for (const p of ["/api/read/page?ids=made_up_book%2Fp001", "/api/read/toc?slug=x", "/api/read/image/other_book/p001"]) {
      const w = loadWorker({ net: async () => jsonRes({ error: "Sign in first." }, status) });
      await madeUpCopy(w.caches, "made_up_book");
      await w.caches.open("not-ours");
      assert.equal((await w.send(p)).status, status);
      assert.deepEqual(await w.caches.keys(), ["not-ours"], `${status} ${p}`);
    }
  }
});
await check("2.8 a 500 or 404 answer keeps the copies", async () => {
  for (const status of [404, 500]) {
    const w = loadWorker({ net: async () => jsonRes({}, status) });
    await madeUpCopy(w.caches, "made_up_book");
    await w.send("/api/read/toc?slug=x");
    assert.equal((await w.caches.keys()).length, 2);
  }
});
await check("2.9 screen files: kept only when a copy exists and a reader page loads them", async () => {
  const w = loadWorker({ net: async () => new Response("js") });
  await w.send("/_next/static/chunks/a.js");
  assert.deepEqual(await w.caches.keys(), []); // no copy: nothing is kept
  await madeUpCopy(w.caches, "made_up_book");
  await w.send("/_next/static/chunks/a.js");
  assert.ok((await w.caches.open(O.OFFLINE_SHELL_CACHE)).map.has("/_next/static/chunks/a.js"));
  const m = loadWorker({ net: async () => new Response("js"), clientUrl: ORIGIN + "/monitor" });
  await madeUpCopy(m.caches, "made_up_book");
  await m.send("/_next/static/chunks/b.js");
  assert.equal((await m.caches.open(O.OFFLINE_SHELL_CACHE)).map.has("/_next/static/chunks/b.js"), false);
});
await check("2.10 the names in the worker equal the names in lib/offline-copy.ts", () => {
  const src = read("public/offline-sw.js");
  assert.ok(src.includes(`"${O.OFFLINE_PREFIX}"`) && src.includes(`"${O.OFFLINE_SHELL_CACHE}"`) && src.includes(`"${O.OFFLINE_SHELL_PATH}"`));
  assert.ok(src.includes('"kendo-offline-book-" + slug + "-v1"') && O.bookCacheName("s") === "kendo-offline-book-s-v1");
  assert.ok(src.includes('"/api/read/page?ids=" + encodeURIComponent(id)') && O.pageDataKey("a/p001") === "/api/read/page?ids=" + encodeURIComponent("a/p001"));
});

// ---------------------------------------------------------------- part 3: the browser helpers
console.log("part 3: the browser helpers of lib/offline-copy-client.ts with made-up caches");
class MadeUpStorage {
  getItem(k) {
    return Object.hasOwn(this, k) ? this[k] : null;
  }
  setItem(k, v) {
    this[k] = String(v);
  }
  removeItem(k) {
    delete this[k];
  }
}
const regs = [];
const browser = { caches: new MadeUpCaches(), storage: new MadeUpStorage(), fetch: async () => jsonRes({}) };
globalThis.window = globalThis;
Object.defineProperty(globalThis, "caches", { configurable: true, get: () => browser.caches });
Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => browser.storage });
Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: true });
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    onLine: true,
    serviceWorker: {
      register: async () => regs.push({ active: { scriptURL: ORIGIN + "/offline-sw.js" }, unregister: async () => regs.splice(0, regs.length) }),
      getRegistrations: async () => [...regs],
    },
  },
});
globalThis.fetch = (...a) => browser.fetch(...a);
const C = await import("../lib/offline-copy-client.ts");
async function freshDevice() {
  browser.caches = new MadeUpCaches();
  browser.storage = new MadeUpStorage();
  regs.splice(0, regs.length);
  await madeUpCopy(browser.caches, "made_up_book");
  await madeUpCopy(browser.caches, "made_up_second");
  await browser.caches.open("not-ours");
  browser.storage.setItem(O.offlinePlaceKey("made_up_book"), "4");
  browser.storage.setItem(O.offlinePlaceKey("made_up_second"), "2");
  browser.storage.setItem(O.OFFLINE_THEME_KEY, "sepia");
  browser.storage.setItem("other-key", "kept");
  await C.registerOfflineWorker();
}
await check("3.1 sign-out: every copy, every reading place, and the worker leave the device; other data stays", async () => {
  await freshDevice();
  assert.equal(regs.length, 1);
  await C.clearOfflineCopies();
  assert.deepEqual(await browser.caches.keys(), ["not-ours"]);
  assert.deepEqual(Object.keys(browser.storage), ["other-key"]);
  assert.equal(regs.length, 0);
});
await check("3.2 row 4: remove one copy keeps the other copy and the worker", async () => {
  await freshDevice();
  await C.removeCopy("made_up_book");
  assert.deepEqual((await browser.caches.keys()).sort(), [O.OFFLINE_SHELL_CACHE, O.bookCacheName("made_up_second"), "not-ours"].sort());
  assert.equal(browser.storage.getItem(O.offlinePlaceKey("made_up_book")), null);
  assert.equal(browser.storage.getItem(O.offlinePlaceKey("made_up_second")), "2");
  assert.equal(regs.length, 1);
});
await check("3.3 remove of the last copy also removes the screen files, the local keys, and the worker", async () => {
  await freshDevice();
  await C.removeCopy("made_up_book");
  await C.removeCopy("made_up_second");
  assert.deepEqual(await browser.caches.keys(), ["not-ours"]);
  assert.deepEqual(Object.keys(browser.storage), ["other-key"]);
  assert.equal(regs.length, 0);
});
await check("3.4 row 6: the plan call that answers 401 or 403 removes every copy", async () => {
  for (const status of [401, 403]) {
    await freshDevice();
    browser.fetch = async () => jsonRes({ error: "Sign in first." }, status);
    const r = await C.fetchPlan("made_up_book", false);
    assert.deepEqual(r, { plan: null, status });
    assert.deepEqual(await browser.caches.keys(), ["not-ours"]);
  }
});
await check("3.5 the plan call that answers 404 or 500 keeps the copies, and the plan call asks with no-store", async () => {
  await freshDevice();
  let asked = null;
  browser.fetch = async (u, init) => ((asked = { u, init }), jsonRes({}, 500));
  assert.deepEqual(await C.fetchPlan("made_up_book", false), { plan: null, status: 500 });
  assert.equal(asked.u, "/api/read/offline?slug=made_up_book&sizes=0");
  assert.equal(asked.init.cache, "no-store");
  assert.equal((await browser.caches.keys()).length, 4);
});
await check("3.6 gate: the prune removes the text of a closed page and keeps the reading place", async () => {
  await freshDevice();
  const copy = await C.readCopy("made_up_book");
  const online = { textPages: [1], index: { digits: 3, textPages: [1], resumeAt: null, pages: 2 } };
  const next = await C.pruneCopy({ ...copy, index: { ...copy.index, resumeAt: 2 } }, online);
  assert.deepEqual(next.textPages, [1]);
  assert.equal(next.index.resumeAt, 2);
  assert.deepEqual((await C.readPages("made_up_book", ["made_up_book/p001", "made_up_book/p002"])).map((p) => p.n), [1]);
  assert.deepEqual((await C.readCopy("made_up_book")).textPages, [1]);
});
await check("3.7 the list of copies and the reading place", async () => {
  await freshDevice();
  assert.deepEqual((await C.listCopies()).map((c) => c.slug).sort(), ["made_up_book", "made_up_second"]);
  assert.equal(C.readPlace("made_up_book"), 4);
  C.writePlace("made_up_book", 5);
  assert.equal(C.readPlace("made_up_book"), 5);
  assert.equal(C.readPlace("no_book"), null);
});
await check("3.8 the screen files of the shell: the files under /_next/static of the HTML, nothing else", () => {
  const html = `<link href="/_next/static/css/a.css"><script src="/_next/static/chunks/b.js"></script><img src="/api/read/image/x/p001"><script src="https://cdn.example.test/x.js"></script>`;
  assert.deepEqual(C.staticFilesOf(html).sort(), ["/_next/static/chunks/b.js", "/_next/static/css/a.css"]);
});

// ---------------------------------------------------------------- part 4: the sources
console.log("part 4: the sources");
const offlineRoutes = ["app/api/read/offline/route.ts", "app/api/read/offline/image/[slug]/[page]/route.ts"];
await check("4.1 gate: the new routes use guardReader of /read and no allowLink (a view-only link gets 401)", () => {
  for (const f of offlineRoutes) {
    const src = read(f).replace(/\/\/.*$/gm, "");
    assert.match(src, /guardReader\(req, \{ mutating: false \}\)/, f);
    assert.doesNotMatch(src, /allowLink|allowInView/, f);
  }
});
await check("4.2 gate: the plan uses the loaders of the book page (loadReaderIndex, loadReaderPages) and the image checks of /api/read/image", () => {
  const src = read("lib/offline-copy-server.ts");
  for (const s of ["loadReaderIndex(", "loadReaderPages(", "catalogInfo(", "web-article", "/^p\\d{3,4}$/"]) assert.ok(src.includes(s), s);
  assert.doesNotMatch(src, /console\.(log|error|warn)/); // no key, no signed address in a log
});
await check("4.3 row 1: the button shows only on the book screen online, for canSaveOffline (approved, no view-only link)", () => {
  const src = read("components/ReaderBook.tsx");
  assert.ok(src.includes("{!offline && canSaveOffline({ approved: user.approved, linkVisitor }) ? <OfflineSave slug={index.slug} /> : null}"));
  assert.equal(src.match(/<OfflineSave /g).length, 1);
});
await check("4.4 sign-out: ReaderBar and HtvBar remove the copies before the logout call", () => {
  for (const f of ["components/ReaderBar.tsx", "components/HtvBar.tsx"]) {
    const src = read(f);
    const a = src.indexOf("await clearOfflineCopies()");
    const b = src.indexOf('fetch("/api/htv/logout"');
    assert.ok(a > 0 && b > a, f);
  }
});
await check("4.5 row 6: the sign-in page and the reader pages for a person who may not save remove the copies", () => {
  assert.ok(read("app/sign-in/page.tsx").includes("<OfflineGuard clear />"));
  for (const f of ["app/read/page.tsx", "app/read/[slug]/page.tsx"]) assert.ok(read(f).includes("<OfflineGuard clear={mustClearOffline({ signedIn: true, approved: s.user.approved, linkVisitor: s.link === true })} />"), f);
});
await check("4.6 row 5: offline, the book screen shows the notes for search and bookmarks, and no search box", () => {
  const src = read("components/ReaderBook.tsx");
  assert.ok(src.includes('{offline ? <OfflineNote what="Search" /> : <BookSearch slug={index.slug} view={s.view} mode="screen" />}'));
  assert.ok(src.includes('{offline ? <OfflineNote what="Bookmarks" /> : null}'));
  assert.ok(src.includes('{offline && showBookSearch ? <OfflineNote what="Search" /> : null}'));
  assert.ok(read("components/VisualIssueEditor.tsx").includes("OFFLINE_WORDS.issue"));
});
await check("4.7 the note renders the text 'Search: Not available offline.' as a status line", async () => {
  const { createElement: h } = req("react");
  const { renderToStaticMarkup } = req("react-dom/server");
  const { OfflineNote } = await import("../components/OfflineBits.tsx");
  const html = renderToStaticMarkup(h(OfflineNote, { what: "Search" }));
  assert.match(html, /role="status"/);
  assert.match(html, /data-offline-not-available/);
  assert.ok(html.includes("Search: Not available offline."));
});
await check("4.8 the new reader components hold no word 'agent' and no model name in their text", () => {
  for (const f of ["components/OfflineSave.tsx", "components/OfflineReader.tsx", "components/OfflineBits.tsx"]) {
    const text = read(f).replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const strings = [...text.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]).join(" ");
    assert.doesNotMatch(strings, /agent|model|verdict|score/i, f);
  }
});
await check("4.9 the worker is registered only from the save code, with scope / and updateViaCache none", () => {
  const client = read("lib/offline-copy-client.ts");
  assert.ok(client.includes('navigator.serviceWorker.register(SW_URL, { scope: "/", updateViaCache: "none" })'));
  for (const f of ["components/ReaderBook.tsx", "components/ReaderBar.tsx", "app/read/[slug]/page.tsx", "app/layout.tsx"]) assert.doesNotMatch(read(f), /serviceWorker\.register/, f);
});

// ---------------------------------------------------------------- part 5: the live routes
console.log("part 5: the live routes on a copy of the app with a test PocketBase");
const BASE = process.env.VW131_APP_URL ?? "";
const PB = process.env.VW131_PB_URL ?? "";
const LIVE = Boolean(BASE && PB && process.env.VW131_ACCOUNTS);
if (LIVE && /:8090\b|:3000\b/.test(BASE + PB)) throw new Error("Refused: port 8090 and port 3000 are not for tests.");
if (LIVE && ![BASE, PB].every((u) => /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(u))) throw new Error("Refused: only this Mac.");
const accounts = LIVE ? JSON.parse(readFileSync(process.env.VW131_ACCOUNTS, "utf8")) : {};
const cookieOf = (r) => r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
async function login(who) {
  const r = await netFetch(BASE + "/api/htv/login", { method: "POST", headers: { "Content-Type": "application/json", origin: BASE }, body: JSON.stringify({ email: accounts[who].email, password: accounts[who].password }) });
  if (r.status !== 200) throw new Error("login failed for " + who + " status " + r.status);
  return cookieOf(r);
}
const get = (p, cookie) => netFetch(BASE + p, { headers: cookie ? { cookie } : {}, redirect: "manual" });
const pbJson = async (method, p, body, token) => {
  const r = await netFetch(PB + p, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => null) };
};
const SLUG = "made_up_book";
let reader = "";
let SU = "";
if (LIVE) {
  reader = await login("reader");
  SU = (await pbJson("POST", "/api/collections/_superusers/auth-with-password", { identity: accounts.superuser.email, password: accounts.superuser.password })).data.token;
}
await gated("5.1 gate: the plan holds only the pages that a reader may read online (p003 and p006 have no opened AI translation)", LIVE, async () => {
  const r = await get(`/api/read/offline?slug=${SLUG}`, reader);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "private, no-store");
  const plan = await r.json();
  assert.deepEqual(plan.index.textPages, [1, 2, 4, 5]);
  assert.ok(!plan.textPages.includes(6));
  assert.deepEqual(plan.textPages, plan.index.dataPages);
  assert.deepEqual(plan.imagePages, [1, 2, 3, 4, 5]);
  assert.ok(plan.imageBytes > 0 && plan.textBytes > 0);
  const p3 = await (await get(`/api/read/page?ids=${encodeURIComponent(SLUG + "/p003")}`, reader)).json();
  assert.equal(p3.pages[0].hasAgent, false);
  assert.ok(!JSON.stringify(p3).includes("ed3"));
});
await gated("5.2 gate: a page that is translated but not opened by the admin stays out of the plan", LIVE, async () => {
  const item = (await pbJson("GET", `/api/collections/catalog_items/records?filter=${encodeURIComponent(`item_id="${SLUG}"`)}`, null, SU)).data.items[0];
  await pbJson("PATCH", `/api/collections/catalog_items/records/${item.id}`, { translated: { en: [1, 2, 3, 4, 5, 6] } }, SU);
  try {
    const plan = await (await get(`/api/read/offline?slug=${SLUG}`, reader)).json();
    assert.ok(!plan.index.textPages.includes(3) && !plan.index.textPages.includes(6), JSON.stringify(plan.index.textPages));
    assert.ok(!plan.textPages.includes(6));
  } finally {
    await pbJson("PATCH", `/api/collections/catalog_items/records/${item.id}`, { translated: { en: [1, 2, 4, 5] } }, SU);
  }
});
await gated("5.3 the size: the image bytes of the plan equal the sum of the image files", LIVE, async () => {
  const plan = await (await get(`/api/read/offline?slug=${SLUG}`, reader)).json();
  let sum = 0;
  for (const n of plan.imagePages) sum += (await (await get(`/api/read/offline/image/${SLUG}/p00${n}`, reader)).arrayBuffer()).byteLength;
  assert.equal(plan.imageBytes, sum);
  const noSize = await (await get(`/api/read/offline?slug=${SLUG}&sizes=0`, reader)).json();
  assert.deepEqual(noSize.textPages, plan.textPages);
});
await gated("5.4 the save image route: webp for a page of the book, 400 for a bad page name, 404 for a page past the end", LIVE, async () => {
  const ok = await get(`/api/read/offline/image/${SLUG}/p001`, reader);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "image/webp");
  assert.equal(ok.headers.get("cache-control"), "private, no-store");
  assert.equal((await get(`/api/read/offline/image/${SLUG}/x001`, reader)).status, 400);
  assert.equal((await get(`/api/read/offline/image/${SLUG}/p099`, reader)).status, 404);
  assert.equal((await get(`/api/read/offline?slug=Bad-Name`, reader)).status, 400);
  assert.equal((await get(`/api/read/offline?slug=no_such_book`, reader)).status, 404);
});
await gated("5.5 no sign-in: 401; a reader who waits: 403 (the copy is removed by these answers)", LIVE, async () => {
  assert.equal((await get(`/api/read/offline?slug=${SLUG}`)).status, 401);
  assert.equal((await get(`/api/read/offline/image/${SLUG}/p001`)).status, 401);
  const waiting = await login("waiting");
  assert.equal((await get(`/api/read/offline?slug=${SLUG}`, waiting)).status, 403);
  assert.equal((await get(`/api/read/offline/image/${SLUG}/p001`, waiting)).status, 403);
});
await gated("5.6 a view-only link visitor reads the book online but gets 401 from both save routes", LIVE, async () => {
  const key = randomBytes(32).toString("base64url");
  const mk = await pbJson("POST", "/api/collections/view_links/records", { name: "Made up club", key, off: false }, SU);
  try {
    const v = await get("/v/" + key);
    const link = cookieOf(v);
    assert.ok(link.length > 0);
    assert.ok([200, 302].includes((await get(`/api/read/image/${SLUG}/p001`, link)).status)); // signed mode: 302 to the image server
    assert.equal((await get(`/api/read/offline?slug=${SLUG}`, link)).status, 401);
    assert.equal((await get(`/api/read/offline/image/${SLUG}/p001`, link)).status, 401);
  } finally {
    await pbJson("DELETE", `/api/collections/view_links/records/${mk.data.id}`, null, SU);
  }
});
await gated("5.7 row 6: after the admin turns the account off, the save routes and the reader routes answer 401", LIVE, async () => {
  const t = await login("translator");
  assert.equal((await get(`/api/read/offline?slug=${SLUG}&sizes=0`, t)).status, 200);
  await pbJson("PATCH", `/api/collections/users/records/${accounts.translator.id}`, { disabled: true }, SU);
  try {
    assert.equal((await get(`/api/read/offline?slug=${SLUG}&sizes=0`, t)).status, 401);
    assert.equal((await get(`/api/read/page?ids=${encodeURIComponent(SLUG + "/p001")}`, t)).status, 401);
  } finally {
    await pbJson("PATCH", `/api/collections/users/records/${accounts.translator.id}`, { disabled: false }, SU);
  }
});
await gated("5.8 the shell page sends a person with no sign-in to the sign-in page", LIVE, async () => {
  // Next.js streams the redirect of a page (status 200 with NEXT_REDIRECT), as for /read/<book> with no sign-in.
  const body = await (await get("/read/offline-copy")).text();
  assert.ok(body.includes("NEXT_REDIRECT;replace;/sign-in;"));
  const book = await (await get(`/read/${SLUG}`)).text();
  assert.ok(book.includes("NEXT_REDIRECT;replace;/sign-in?next="));
  assert.equal((await get("/read/offline-copy", reader)).status, 200);
  assert.equal((await get("/offline-sw.js")).status, 200);
});

done();
