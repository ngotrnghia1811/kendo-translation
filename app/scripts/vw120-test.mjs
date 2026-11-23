// VW120 (round 108, card P58.1): server-free tests of the view-only link (/v/<key>).
// Owner request (Q-A 3:105.8, 2026-11-20 23:43 PST): "Can we create a view-only link: people with link can be a reader without sign-up, but all operation is only strictly view-only?"
// Owner picks: Q-A 3:106.5 (rows 1 to 7, "Link is an exception, rows 1-7"), Q-A 3:107.4 ("Route A: key check"), Q-A 3:107.5 ("Accept all rows", builder rows 1 to 12).
//   part 1  lib/view-link.ts: the key form, the texts, the cookie rules, the link state, the end date, the headers of a request
//   part 2  the session of a link visitor with a fake PocketBase (http server on 127.0.0.1) and a fake cookie jar: the guards, a real session wins, the front door
//   part 3  GET /v/<key>: the open count, the cookie, the redirects, the dead links, a signed-in person, no key outside the address and the header
//   part 4  the routes: the four GET routes that a link visitor may read, and the 401 of every other route (write routes and the reader routes of /translate and /admin)
//   part 5  the admin: make a link, turn it off, the list, the checks of the form
//   part 6  the screens: the band, the bar, the page of a dead link, the book screen, noindex, and the sources (no key in a client file, no write from a link visitor)
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw120-test.mjs. The last line is "<n> passed, <m> failed". Made-up data only (example.test addresses). No real PocketBase, no network.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { checker, htmlText, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/read");
// A fake of next/headers: a cookie jar with get, set, and delete, and a request header list. This hook is registered after the kit hook, so it runs first.
const jar = new Map();
const ops = [];
let requestHeaders = new Headers();
globalThis.__vw120 = { jar, ops, headers: () => requestHeaders };
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/headers") {
      const src = `const j = globalThis.__vw120;
export async function cookies(){ return {
  get(n){ const v = j.jar.get(n); return v === undefined ? undefined : { name: n, value: v }; },
  set(n, v, o){ j.jar.set(n, v); j.ops.push({ op: "set", name: n, value: v, opts: o }); },
  delete(n){ j.jar.delete(n); j.ops.push({ op: "delete", name: n }); } }; }
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

const hexLin = (v) => {
  const n = Number.parseInt(v.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
};
const lum = (v) => {
  const [r, g, b] = hexLin(v);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

const L = await import("../lib/view-link.ts");
const LP = await import("../lib/view-link-pb.ts");

const DAY = 86400;
const KEY = LP.newLinkKey(); // a link that is on
const KEY_OFF = LP.newLinkKey();
const KEY_ENDED = LP.newLinkKey();
const KEY_FUTURE = LP.newLinkKey();
const KEY_UNKNOWN = LP.newLinkKey();
const ALL_KEYS = [KEY, KEY_OFF, KEY_ENDED, KEY_FUTURE, KEY_UNKNOWN];

// ---------------------------------------------------------------- part 1: the pure rules

await check("row 1 (Q-A 3:107.5): a new key has 43 characters of base64url, and 300 keys are all different", () => {
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const k = LP.newLinkKey();
    assert.equal(k.length, 43);
    assert.match(k, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(L.isLinkKey(k), true);
    seen.add(k);
  }
  assert.equal(seen.size, 300);
  assert.equal(L.LINK_KEY_LENGTH, 43);
});

await check("isLinkKey: only exactly 43 characters of A-Z a-z 0-9 _ - pass (no short, no long, no padding, no space, no percent, no slash, no non-string)", () => {
  const ok = "A".repeat(43);
  assert.equal(L.isLinkKey(ok), true);
  for (const bad of ["A".repeat(42), "A".repeat(44), "A".repeat(42) + "=", "A".repeat(42) + "+", "A".repeat(42) + "/", "A".repeat(42) + " ", "A".repeat(40) + "%20A", "", "A".repeat(42) + "\n", "../" + "A".repeat(40), null, undefined, 7, {}, ["A".repeat(43)]]) assert.equal(L.isLinkKey(bad), false, String(bad));
});

await check("row 4, 9, 3 (Q-A 3:107.5): the band text, the bar text, and the dead-link text are word for word", () => {
  assert.equal(L.LINK_BAND_TEXT, "This is a view-only page. Please sign up to save your place and bookmarks: Create an account.");
  assert.equal(L.LINK_BAND_BEFORE + L.LINK_BAND_ACTION + ".", L.LINK_BAND_TEXT);
  assert.equal(L.LINK_BAND_ACTION, "Create an account");
  assert.equal(L.LINK_BAR_TEXT, "View-only link");
  assert.equal(L.LINK_DEAD_TEXT, "This link no longer works.");
  assert.equal(L.LINK_DEAD_PATH, "/link-ended");
  assert.equal(L.LINK_ADMIN_PATH, "/admin/links");
});

await check("row 7: the robots value is noindex and nofollow, in the page metadata and in the header text", () => {
  assert.deepEqual(L.LINK_ROBOTS, { index: false, follow: false });
  assert.equal(L.LINK_ROBOTS_HEADER, "noindex, nofollow");
});

await check("cookie names: htv_link for the key, htv_link_view for the Page or Scroll view; the key header is X-Kendo-View-Key", () => {
  assert.equal(L.LINK_COOKIE, "htv_link");
  assert.equal(L.LINK_VIEW_COOKIE, "htv_link_view");
  assert.equal(L.LINK_KEY_HEADER, "X-Kendo-View-Key");
  assert.equal(L.linkPath(KEY), `/v/${KEY}`);
  assert.equal(L.linkUrl("https://kendotranslation.com", KEY), `https://kendotranslation.com/v/${KEY}`);
  assert.equal(L.linkUrl("https://kendotranslation.com/", KEY), `https://kendotranslation.com/v/${KEY}`, "no double slash");
});

await check("row 2: the cookie lives at most 30 days, at least 60 seconds, and not past the end date when the end date is known", () => {
  const now = Date.parse("2026-11-21T10:00:00Z");
  const iso = (ms) => new Date(ms).toISOString().replace("T", " ");
  assert.equal(L.LINK_MAX_AGE_SECONDS, 30 * DAY);
  assert.equal(L.linkCookieSeconds(null, now), 30 * DAY, "no end date: 30 days");
  assert.equal(L.linkCookieSeconds("", now), 30 * DAY);
  assert.equal(L.linkCookieSeconds(iso(now + 400 * DAY * 1000), now), 30 * DAY, "an end date far away: 30 days");
  assert.equal(L.linkCookieSeconds(iso(now + 2 * DAY * 1000), now), 2 * DAY, "an end date in 2 days: 2 days");
  assert.equal(L.linkCookieSeconds(iso(now + 10 * 1000), now), 60, "an end date in 10 seconds: the lowest value, 60 seconds");
  assert.equal(L.linkCookieSeconds(iso(now - DAY * 1000), now), 60, "an end date in the past: 60 seconds (the server refuses the link anyway)");
  assert.ok(L.linkCookieSeconds(iso(now + 29 * DAY * 1000), now) <= 30 * DAY);
});

await check("row 6: the link state is off (first), ended (end date reached), or on", () => {
  const now = Date.parse("2026-11-21T10:00:00Z");
  assert.equal(L.linkState({ off: false, ends: null }, now), "on");
  assert.equal(L.linkState({ off: true, ends: null }, now), "off");
  assert.equal(L.linkState({ off: true, ends: "2020-01-01 00:00:00.000Z" }, now), "off", "off wins over ended");
  assert.equal(L.linkState({ off: false, ends: "2026-11-21 09:59:59.000Z" }, now), "ended");
  assert.equal(L.linkState({ off: false, ends: "2026-11-21 10:00:00.000Z" }, now), "ended", "the end moment itself is ended");
  assert.equal(L.linkState({ off: false, ends: "2026-11-21 10:00:01.000Z" }, now), "on");
  assert.equal(L.linkState({ off: false, ends: "" }, now), "on");
});

await check("end date of the form: YYYY-MM-DD is the end of that day in PST (UTC-8), so the next day 07:59:59 UTC; a wrong day or form gives null", () => {
  assert.equal(L.linkEndOfDay("2026-12-31"), "2027-01-01 07:59:59.000Z");
  assert.equal(L.linkEndOfDay("2026-11-21"), "2026-11-22 07:59:59.000Z");
  assert.equal(L.linkEndOfDay("2028-02-29"), "2028-03-01 07:59:59.000Z", "a leap day");
  for (const bad of ["2026-02-30", "2026-13-01", "2026-1-1", "31.12.2026", "2026-12-31 10:00", "", "abc"]) assert.equal(L.linkEndOfDay(bad), null, bad);
});

await check("authHeadersOf: a user token goes as Authorization, a link token as the key header only, a bad link token and no token as nothing", () => {
  assert.deepEqual(L.authHeadersOf("abc.def.ghi"), { Authorization: "abc.def.ghi" });
  assert.deepEqual(L.authHeadersOf(L.linkToken(KEY)), { "X-Kendo-View-Key": KEY });
  assert.equal(L.linkToken(KEY), `viewkey:${KEY}`);
  assert.equal(L.isLinkToken(L.linkToken(KEY)), true);
  assert.equal(L.isLinkToken("abc.def.ghi"), false);
  assert.equal(L.linkKeyOfToken(L.linkToken(KEY)), KEY);
  assert.equal(L.linkKeyOfToken("viewkey:short"), null);
  assert.deepEqual(L.authHeadersOf("viewkey:short"), {}, "a bad key is anonymous, never an Authorization header with the prefix");
  for (const none of ["", undefined, null]) assert.deepEqual(L.authHeadersOf(none), {});
});

await check("new link form (rows 1 and 7): the name is needed, at most 120 characters, trimmed; the end date is optional and must be YYYY-MM-DD", () => {
  assert.deepEqual(LP.parseNewLink({ name: "  Kendo club Berlin  " }), { ok: true, name: "Kendo club Berlin", ends: "" });
  assert.deepEqual(LP.parseNewLink({ name: "A", ends: "2026-12-31" }), { ok: true, name: "A", ends: "2027-01-01 07:59:59.000Z" });
  assert.deepEqual(LP.parseNewLink({ name: "A", ends: "" }), { ok: true, name: "A", ends: "" });
  assert.deepEqual(LP.parseNewLink({ name: "A", ends: null }), { ok: true, name: "A", ends: "" });
  assert.equal(LP.parseNewLink({ name: "a".repeat(120) }).ok, true);
  for (const name of ["", "   ", undefined, null, 5, {}]) assert.equal(LP.parseNewLink({ name }).ok, false, String(name));
  const long = LP.parseNewLink({ name: "a".repeat(121) });
  assert.equal(long.ok, false);
  assert.match(long.error, /too long/);
  for (const ends of ["2026-02-30", "tomorrow", 20261231, "2026-12-31T00:00:00Z"]) assert.equal(LP.parseNewLink({ name: "A", ends }).ok, false, String(ends));
});

await check("the band colors are fixed (not theme dependent) and the contrast is above 7 to 1", async () => {
  const B = await import("../components/ViewLinkBand.tsx");
  assert.equal(B.LINK_BAND_COLORS.background, "#b9e4a8");
  assert.equal(B.LINK_BAND_COLORS.text, "#10290a");
  assert.ok(ratio(B.LINK_BAND_COLORS.background, B.LINK_BAND_COLORS.text) >= 7, "ratio " + ratio(B.LINK_BAND_COLORS.background, B.LINK_BAND_COLORS.text).toFixed(2));
  const src = read("components/ViewLinkBand.tsx");
  assert.ok(src.includes("bg-[#b9e4a8]") && src.includes("text-[#10290a]"), "the classes hold the same colors as the constant");
  assert.ok(!/bg-(background|white)|var\(--/.test(src), "no theme variable in the band");
  // The two bands of the view (VW119) use other colors, so nobody mistakes the link band for an admin view.
  for (const other of ["#f4c542", "#8fd0f0"]) assert.notEqual(other, B.LINK_BAND_COLORS.background);
});

// ---------------------------------------------------------------- part 2: the session with a fake PocketBase

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tokenOfExp = (id, secondsLeft) => `${b64u({ alg: "HS256" })}.${b64u({ id, exp: Math.floor(Date.now() / 1000) + secondsLeft })}.sig-${id}`;
const tokenOf = (id) => tokenOfExp(id, 4 * 3600);
const ADMIN = { id: "adm000000000001", email: "admin1@example.test", name: "Made Up Admin", role: "admin", approved: true };
const USERS = {
  adm000000000001: ADMIN,
  trn000000000001: { id: "trn000000000001", email: "translator1@example.test", name: "Made Up Translator", role: "translator", approved: true },
  rdr000000000001: { id: "rdr000000000001", email: "reader1@example.test", name: "Made Up Reader", role: "reader", approved: true },
  rdr000000000002: { id: "rdr000000000002", email: "reader2@example.test", name: "Made Up Waiting Reader", role: "reader", approved: false },
};
const READER_LISTS = ["reader_pages", "reader_versions", "v1_placeholders", "catalog_items", "magazine_chapters", "book_toc", "page_checks"];
const LINKS = new Map(); // key -> { id, name, key, endsMs, off, created }
const OPENS = []; // { key, created }
const seen = [];
const behavior = { down: false };
let nextId = 1;
const recId = () => `lnk${String(nextId++).padStart(12, "0")}`;
const pbTime = (ms) => new Date(ms).toISOString().replace("T", " ");
const addLink = (key, name, over = {}) => {
  const l = { id: recId(), name, key, endsMs: null, off: false, created: "2026-11-20 10:00:00.000Z", ...over };
  LINKS.set(key, l);
  return l;
};
const resetLinks = () => {
  LINKS.clear();
  OPENS.length = 0;
  addLink(KEY, "Kendo club Berlin");
  addLink(KEY_OFF, "Turned off club", { off: true });
  addLink(KEY_ENDED, "Ended club", { endsMs: Date.now() - 3600 * 1000 });
  addLink(KEY_FUTURE, "Future club", { endsMs: Date.now() + 5 * DAY * 1000 });
};
const liveKey = (k) => {
  const l = typeof k === "string" ? LINKS.get(k) : undefined;
  return !!l && !l.off && (l.endsMs === null || l.endsMs > Date.now());
};
const linkRecord = (l) => ({ id: l.id, name: l.name, key: l.key, ends: l.endsMs === null ? "" : pbTime(l.endsMs), off: l.off, created: l.created, created_by: ADMIN.id });
const BOOK = { id: "cat000000000001", item_id: "made_up_book", kind: "book", title_en: "Made Up Book", title_ja: "", pages: 3 };
const server = http.createServer((rq, rs) => {
  const chunks = [];
  rq.on("data", (c) => chunks.push(c));
  rq.on("end", () => {
    const body = Buffer.concat(chunks);
    const url = new URL(rq.url, "http://x");
    const entry = { method: rq.method, path: url.pathname, url: rq.url, auth: rq.headers.authorization ?? "", key: rq.headers["x-kendo-view-key"], json: null };
    try {
      entry.json = body.length ? JSON.parse(body.toString("utf8")) : null;
    } catch {
      entry.json = null;
    }
    seen.push(entry);
    const send = (status, obj) => {
      rs.writeHead(status, { "Content-Type": "application/json" });
      rs.end(JSON.stringify(obj));
    };
    if (behavior.down) {
      rs.destroy();
      return;
    }
    const isAdmin = entry.auth === tokenOf("adm000000000001");
    const signedIn = entry.auth !== "" && entry.auth.includes(".sig-");
    const list = (items) => send(200, { page: 1, perPage: 500, totalPages: 1, totalItems: items.length, items });
    let m;
    if ((m = /^\/api\/collections\/users\/records\/([A-Za-z0-9]+)$/.exec(url.pathname)) && rq.method === "GET") {
      const u = USERS[m[1]];
      if (!u || !entry.auth.endsWith(`.sig-${m[1]}`)) return send(404, { message: "not found" });
      return send(200, u);
    }
    if (url.pathname === "/api/collections/users/auth-with-password" && rq.method === "POST") {
      const u = Object.values(USERS).find((x) => x.email === entry.json?.identity);
      if (!u || entry.json.password !== "made-up-password") return send(400, { message: "bad" });
      return send(200, { token: tokenOfExp(u.id, 5 * 86400), record: u });
    }
    // The read rule of the reader lists (migration 1793300018): a signed-in person, or a key of a link that is on and not ended.
    if ((m = /^\/api\/collections\/([a-z_0-9]+)\/records$/.exec(url.pathname)) && rq.method === "GET" && READER_LISTS.includes(m[1])) {
      const allowed = signedIn || liveKey(entry.key);
      if (!allowed) return list([]);
      if (m[1] === "catalog_items") {
        if (url.searchParams.get("fields") === "id") return list([{ id: BOOK.id }]);
        if ((url.searchParams.get("filter") ?? "").includes('item_id="made_up_book"')) return list([BOOK]);
        return list([]);
      }
      if (m[1] === "v1_placeholders") return list([{ n: 1 }]);
      return list([]);
    }
    if (url.pathname === "/api/collections/view_link_opens/records" && rq.method === "POST") {
      if (!liveKey(entry.key) || entry.json?.key !== entry.key) return send(400, { message: "refused" });
      OPENS.push({ key: entry.json.key, created: "2026-11-21 10:00:00.000Z" });
      return send(200, { id: "opn000000000001", key: entry.json.key });
    }
    if (url.pathname === "/api/collections/view_link_opens/records" && rq.method === "GET") {
      if (!isAdmin) return send(403, { message: "Only superusers can perform this action." });
      // Unit VW120: the page sweeps all rows (fields key and created, newest first, perPage rows a call). A filter on a key would put the key into the address, so the app does not send one.
      if (url.searchParams.has("filter")) return send(400, { message: "the app must not filter the opens by key" });
      const perPage = Number(url.searchParams.get("perPage") ?? 30);
      const pg = Number(url.searchParams.get("page") ?? 1);
      const sorted = [...OPENS].sort((x, y) => (x.created < y.created ? 1 : x.created > y.created ? -1 : 0));
      return send(200, { page: pg, perPage, items: sorted.slice((pg - 1) * perPage, pg * perPage).map((o) => ({ key: o.key, created: o.created })) });
    }
    if (url.pathname === "/api/collections/view_links/records" && rq.method === "GET") {
      if (!isAdmin) return send(403, { message: "Only superusers can perform this action." });
      return list([...LINKS.values()].map(linkRecord));
    }
    if (url.pathname === "/api/collections/view_links/records" && rq.method === "POST") {
      if (!isAdmin) return send(403, { message: "Only superusers can perform this action." });
      const b = entry.json ?? {};
      const l = addLink(b.key, b.name, { endsMs: b.ends ? Date.parse(String(b.ends).replace(" ", "T")) : null });
      return send(200, linkRecord(l));
    }
    if ((m = /^\/api\/collections\/view_links\/records\/([a-z0-9]+)$/.exec(url.pathname)) && rq.method === "PATCH") {
      if (!isAdmin) return send(403, { message: "Only superusers can perform this action." });
      const l = [...LINKS.values()].find((x) => x.id === m[1]);
      if (!l) return send(404, { message: "not found" });
      if (entry.json?.off === true) l.off = true;
      return send(200, linkRecord(l));
    }
    return send(404, { message: "not found: " + rq.method + " " + url.pathname });
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
process.env.VIEWER_CONFIG = path.join(process.env.TMPDIR, "vw120-no-config.json");
process.env.VIEWER_RUN_SOURCE = "pocketbase";
process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${server.address().port}`;
process.env.VIEWER_MONITOR = "off";
process.env.VIEWER_PAGE_IMAGE_SOURCE = "signed";
process.env.VIEWER_PAGE_IMAGE_URL = `http://127.0.0.1:${server.address().port}/images`;
process.env.VIEWER_PAGE_IMAGE_KEY = "k".repeat(40);

/** Start a call as a person. `id`: a made-up user, or null. `link`: the key in the cookie htv_link, or undefined. */
function who(id, link, extra = {}) {
  jar.clear();
  ops.length = 0;
  requestHeaders = new Headers(extra);
  if (id) jar.set("htv_token", tokenOf(id));
  if (link !== undefined) jar.set("htv_link", link);
}
const reset = () => {
  seen.length = 0;
  ops.length = 0;
  behavior.down = false;
  resetLinks();
};
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
const calls = (re) => seen.filter((s) => re.test(s.path));

const S = await import("../lib/htv-session.ts");
const LS = await import("../lib/view-link-server.ts");
const LC = await import("../lib/view-link-cookie.ts");

await check("getSession stays as it was: a link cookie alone is no session, and no request goes to PocketBase", async () => {
  reset();
  who(null, KEY);
  assert.equal(await S.getSession(), null);
  assert.equal(seen.length, 0, "no token, no request");
});

await check("the link cookie helpers: hasLinkCookie is true only for a cookie with the form of a key; the cookie options keep the life between 60 seconds and 30 days", async () => {
  reset();
  who(null);
  assert.equal(await LC.hasLinkCookie(), false);
  who(null, "short");
  assert.equal(await LC.hasLinkCookie(), false);
  assert.equal(await LC.linkKeyOfCookie(), null);
  who(null, KEY);
  assert.equal(await LC.hasLinkCookie(), true);
  assert.equal(await LC.linkKeyOfCookie(), KEY);
  const r = new Request("http://localhost/v/x");
  assert.equal(LC.linkCookieOptions(r, 5).maxAge, 60);
  assert.equal(LC.linkCookieOptions(r, 99 * DAY).maxAge, 30 * DAY);
  assert.equal(LC.linkCookieOptions(r, 3 * DAY).maxAge, 3 * DAY);
  assert.equal(seen.length, 0);
});

await check("getLinkSession (rows 3 and 4): no cookie gives null with no request; a forged cookie gives null with no request; a live link gives the session of a link visitor", async () => {
  reset();
  who(null);
  assert.equal(await LS.getLinkSession(), null);
  who(null, "short");
  assert.equal(await LS.getLinkSession(), null, "a cookie that is not a key counts as no cookie");
  assert.equal(seen.length, 0);
  who(null, KEY);
  const l = await LS.getLinkSession();
  assert.equal(l.link, true);
  assert.equal(l.token, `viewkey:${KEY}`);
  assert.deepEqual(l.user, { id: "", email: "", name: "View-only link", role: "reader", approved: true });
  assert.equal(l.realRole, "reader");
  assert.equal(l.view, null);
  assert.equal(LS.isLinkSession(l), true);
  assert.equal(calls(/catalog_items/).length, 1, "one check of PocketBase");
  assert.equal(seen[0].key, KEY);
  assert.equal(seen[0].auth, "", "the key goes in the header, never as Authorization");
});

await check("getLinkSession (row 3): a link that is off, ended, or not known gives 'dead'; a link with an end date in the future is alive", async () => {
  reset();
  for (const k of [KEY_OFF, KEY_ENDED, KEY_UNKNOWN]) {
    who(null, k);
    assert.equal(await LS.getLinkSession(), "dead", k.slice(0, 6));
  }
  who(null, KEY_FUTURE);
  assert.equal((await LS.getLinkSession()).link, true);
});

await check("getLinkSession: a PocketBase that is down is a PbError 503, not 'dead' (a short fault does not show 'This link no longer works.')", async () => {
  reset();
  behavior.down = true;
  who(null, KEY);
  await assert.rejects(() => LS.getLinkSession(), (e) => e.name === "PbError" && e.status === 503);
});

await check("row 5: a signed-in person stays that person. requireReaderOrLink gives the real session and makes no check of the link", async () => {
  reset();
  for (const id of ["rdr000000000001", "trn000000000001", "adm000000000001"]) {
    who(id, KEY);
    seen.length = 0;
    const s = await LS.requireReaderOrLink("/read");
    assert.equal(s.user.id, id);
    assert.equal(s.link, undefined, "no link flag on a real session");
    assert.equal(calls(/catalog_items/).length, 0, "the link is not checked");
  }
  who("rdr000000000002", KEY);
  const w = await LS.requireReaderOrLink("/read");
  assert.equal(w.user.approved, false, "a reader that waits stays a reader that waits: the link gives no more");
});

await check("requireReaderOrLink (rows 3 and 4): a live link is a link visitor, a dead link goes to /link-ended, no cookie goes to /sign-in, a fault is a message", async () => {
  reset();
  who(null, KEY);
  const s = await LS.requireReaderOrLink("/read/made_up_book");
  assert.equal(s.link, true);
  assert.equal(s.user.name, "View-only link");
  for (const k of [KEY_OFF, KEY_ENDED, KEY_UNKNOWN]) {
    who(null, k);
    assert.equal(await redirectOf(() => LS.requireReaderOrLink("/read")), "/link-ended", k.slice(0, 6));
  }
  who(null);
  assert.equal(await redirectOf(() => LS.requireReaderOrLink("/read/made_up_book")), "/sign-in?next=%2Fread%2Fmade_up_book");
  behavior.down = true;
  who(null, KEY);
  const d = await LS.requireReaderOrLink("/read");
  assert.match(d.down, /not reachable/);
});

await check("row 3: /profile, /translate, and /admin/* send a link visitor to /read (a live or a dead link); a visitor with no cookie still goes to the sign-in pages", async () => {
  reset();
  for (const k of [KEY, KEY_OFF]) {
    who(null, k);
    assert.equal(await redirectOf(() => S.requireReaderSession("/profile")), "/read");
    assert.equal(await redirectOf(() => S.requireStaff("/translate")), "/read");
    assert.equal(await redirectOf(() => S.requireStaff("/translate/made_up_book/p001")), "/read");
    for (const p of ["/admin/links", "/admin/readers", "/admin/versions", "/admin/issues"]) assert.equal(await redirectOf(() => S.requireAdmin(p)), "/read", p);
  }
  assert.equal(seen.length, 0, "this redirect needs no PocketBase call");
  who(null);
  assert.equal(await redirectOf(() => S.requireReaderSession("/profile")), "/sign-in?next=%2Fprofile");
  assert.equal(await redirectOf(() => S.requireStaff("/translate")), "/translate/sign-in?next=%2Ftranslate");
  assert.equal(await redirectOf(() => S.requireAdmin("/admin/links")), "/sign-in?next=%2Fadmin%2Flinks");
  who(null, "not-a-key");
  assert.equal(await redirectOf(() => S.requireReaderSession("/profile")), "/sign-in?next=%2Fprofile", "a forged cookie counts as no cookie");
});

await check("no redirect loop: a page under /read that calls requireSession with a link cookie goes to the sign-in page, not to /read again", async () => {
  reset();
  who(null, KEY);
  assert.equal(await redirectOf(() => S.requireReaderSession("/read")), "/sign-in?next=%2Fread");
  assert.equal(await redirectOf(() => S.requireReaderSession("/read/made_up_book")), "/sign-in?next=%2Fread%2Fmade_up_book");
});

await check("a signed-in person with a link cookie: the pages of that person work as before (reader goes to /read from /translate, admin reaches /admin/links)", async () => {
  reset();
  who("rdr000000000001", KEY);
  assert.equal(await redirectOf(() => S.requireStaff("/translate")), "/read");
  assert.equal(await redirectOf(() => S.requireAdmin("/admin/links")), "/read");
  assert.equal(await redirectOf(() => S.requireReaderSession("/profile")), null);
  who("adm000000000001", KEY);
  assert.equal(await redirectOf(() => S.requireAdmin("/admin/links")), null);
  assert.equal(await redirectOf(() => S.requireStaff("/translate")), null);
});

await check("linkInfo (the band flag): true for a live link and nobody signed in; false for no cookie (no request), a dead link, a signed-in person, and a fault", async () => {
  reset();
  who(null);
  assert.deepEqual(await LS.linkInfo(), { link: false });
  assert.equal(seen.length, 0, "no cookie costs no call");
  who(null, KEY);
  assert.deepEqual(await LS.linkInfo(), { link: true });
  who(null, KEY_OFF);
  assert.deepEqual(await LS.linkInfo(), { link: false });
  who("rdr000000000001", KEY);
  assert.deepEqual(await LS.linkInfo(), { link: false });
  who(null, KEY);
  behavior.down = true;
  assert.deepEqual(await LS.linkInfo(), { link: false });
});

await check("the front door '/' with the monitor off: a link cookie goes to /read, no cookie to /sign-in, a reader to /read, a translator to /translate", async () => {
  reset();
  const M = await import("../lib/monitor.ts");
  who(null, KEY);
  assert.equal(await redirectOf(() => M.frontDoor()), "/read");
  who(null);
  assert.equal(await redirectOf(() => M.frontDoor()), "/sign-in");
  who("rdr000000000001", KEY);
  assert.equal(await redirectOf(() => M.frontDoor()), "/read");
  who("trn000000000001");
  assert.equal(await redirectOf(() => M.frontDoor()), "/translate");
});

await check("PocketBase calls with the link token: the key goes in the header X-Kendo-View-Key and never as Authorization or in a URL; a real token goes as Authorization only", async () => {
  reset();
  const PB = await import("../lib/pb.ts");
  const V1 = await import("../lib/reader-v1-pb.ts");
  const info = await PB.catalogInfo(L.linkToken(KEY), "made_up_book");
  assert.equal(info.get("made_up_book").pages, 3, "the link reads the catalog like a reader");
  let e = calls(/catalog_items/).at(-1);
  assert.equal(e.key, KEY);
  assert.equal(e.auth, "");
  assert.ok(!e.url.includes(KEY));
  assert.deepEqual(await V1.v1PbNumbers({ baseUrl: process.env.VIEWER_POCKETBASE_URL, token: L.linkToken(KEY) }, "made_up_book"), [1]);
  e = calls(/v1_placeholders/).at(-1);
  assert.equal(e.key, KEY);
  assert.equal(e.auth, "");
  await PB.catalogInfo(tokenOf("rdr000000000001"), "made_up_book");
  e = calls(/catalog_items/).at(-1);
  assert.equal(e.key, undefined, "a real token sends no key header");
  assert.equal(e.auth, tokenOf("rdr000000000001"));
  // A link that is off reads nothing: the fake applies the rule of migration 1793300018.
  const none = await PB.catalogInfo(L.linkToken(KEY_OFF), "made_up_book");
  assert.equal(none.size, 0);
  assert.equal((await PB.catalogInfo("viewkey:short", "made_up_book")).size, 0, "a bad link token is anonymous");
  assert.equal(calls(/catalog_items/).at(-1).key, undefined);
  assert.equal(calls(/catalog_items/).at(-1).auth, "");
});

// ---------------------------------------------------------------- part 3: GET /v/<key>

const vRoute = await import("../app/v/[key]/route.ts");
const open = (key, headers = {}) => vRoute.GET(new Request(`http://localhost/v/${key}`, { headers: { host: "localhost", ...headers } }), { params: Promise.resolve({ key }) });

await check("row 1 and 6 (Q-A 3:107.5): /v/<key> of a live link counts one open, sets the cookie htv_link, and goes to /read; the redirect holds no key", async () => {
  reset();
  who(null);
  const r = await open(KEY);
  assert.equal(r.status, 302);
  assert.equal(r.headers.get("location"), "/read");
  assert.ok(!(r.headers.get("location") ?? "").includes(KEY));
  assert.equal(r.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(OPENS.length, 1, "one open");
  assert.deepEqual(OPENS[0].key, KEY);
  const post = calls(/view_link_opens/).find((s) => s.method === "POST");
  assert.deepEqual(post.json, { key: KEY }, "the record holds the key only: no IP address, no browser data");
  assert.equal(post.key, KEY);
  assert.equal(post.auth, "");
  const set = ops.filter((o) => o.op === "set");
  assert.equal(set.length, 1);
  assert.equal(set[0].name, "htv_link");
  assert.equal(set[0].value, KEY);
  assert.equal(jar.get("htv_link"), KEY);
});

await check("row 2: the cookie is httpOnly, lax, path /, secure behind https, and lives 30 days", async () => {
  reset();
  who(null);
  await open(KEY);
  const o = ops.find((x) => x.op === "set").opts;
  assert.equal(o.httpOnly, true, "page scripts never read the key");
  assert.equal(o.sameSite, "lax");
  assert.equal(o.path, "/");
  assert.equal(o.secure, false, "plain http keeps the cookie on this Mac");
  assert.equal(o.maxAge, 30 * DAY);
  who(null);
  await open(KEY, { "x-forwarded-proto": "https" });
  assert.equal(ops.find((x) => x.op === "set").opts.secure, true, "behind https the cookie is secure");
});

await check("row 6: each open of the address counts one: three opens give three records and the same key every time", async () => {
  reset();
  for (let i = 0; i < 3; i++) {
    who(null);
    await open(KEY);
  }
  assert.equal(OPENS.length, 3);
  assert.ok(OPENS.every((o) => o.key === KEY));
  who(null);
  await open(KEY_FUTURE);
  assert.equal(OPENS.filter((o) => o.key === KEY_FUTURE).length, 1, "a link with an end date in the future counts too");
});

await check("row 3: a link that is off, ended, or not known goes to /link-ended, clears an old cookie, sets no cookie, and counts no open", async () => {
  reset();
  for (const k of [KEY_OFF, KEY_ENDED, KEY_UNKNOWN]) {
    who(null, KEY);
    const r = await open(k);
    assert.equal(r.status, 302, k.slice(0, 6));
    assert.equal(r.headers.get("location"), "/link-ended");
    assert.equal(r.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.ok(ops.some((o) => o.op === "delete" && o.name === "htv_link"), "the old cookie goes");
    assert.ok(!ops.some((o) => o.op === "set"), "no cookie is set");
    assert.equal(jar.has("htv_link"), false);
  }
  assert.equal(OPENS.length, 0, "no open of a dead link");
});

await check("a key with a wrong form goes to /link-ended with no call to PocketBase (a short key, a long key, a space, a path, a percent text)", async () => {
  reset();
  for (const k of ["short", "A".repeat(44), "A".repeat(42) + " ", "..%2F" + "A".repeat(38), "A".repeat(43) + "x", "%41".repeat(14), ""]) {
    who(null);
    seen.length = 0;
    const r = await open(k);
    assert.equal(r.headers.get("location"), "/link-ended", JSON.stringify(k));
    assert.equal(seen.length, 0, "no request: " + JSON.stringify(k));
  }
});

await check("row 5: a signed-in person who opens a link stays signed in as that person: /read, no cookie, no open, no check of the link", async () => {
  reset();
  for (const id of ["rdr000000000001", "trn000000000001", "adm000000000001", "rdr000000000002"]) {
    who(id);
    seen.length = 0;
    const r = await open(KEY);
    assert.equal(r.status, 302);
    assert.equal(r.headers.get("location"), "/read");
    assert.equal(ops.length, 0, "no cookie set and none cleared: " + id);
    assert.equal(OPENS.length, 0);
    assert.equal(calls(/catalog_items|view_link/).length, 0);
    assert.equal(jar.get("htv_token"), tokenOf(id), "the token cookie stays");
  }
  who("rdr000000000001");
  assert.equal((await open(KEY_OFF)).headers.get("location"), "/read", "also a dead link: the link does nothing for a signed-in person");
});

await check("a PocketBase that is down gives 503 with the plain line, no cookie, no key in the text", async () => {
  reset();
  behavior.down = true;
  who(null);
  const r = await open(KEY);
  assert.equal(r.status, 503);
  const t = await r.text();
  assert.match(t, /not reachable/);
  assert.ok(!t.includes(KEY));
  assert.ok(!ops.some((o) => o.op === "set"));
});

await check("the key stays in the address /v/<key> and in the header: no PocketBase URL holds a key, and the app sent no other body with a key (opens by design)", async () => {
  reset();
  who(null);
  await open(KEY);
  who(null, KEY);
  await LS.getLinkSession();
  for (const e of seen) {
    for (const k of ALL_KEYS) assert.ok(!e.url.includes(k), `URL of ${e.method} ${e.path}`);
    if (e.json && !(e.method === "POST" && e.path.endsWith("/view_link_opens/records"))) assert.ok(!JSON.stringify(e.json).includes(KEY), `body of ${e.method} ${e.path}`);
  }
});

// ---------------------------------------------------------------- part 4: the routes

const jreq = (method, p, body = {}, headers = {}) =>
  new Request("http://localhost" + p, { method, headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost", ...headers }, body: method === "GET" ? undefined : JSON.stringify(body) });
const bodyOf = async (r) => r.json().catch(() => ({}));
const routeCache = new Map();
const routeModule = async (rel) => {
  if (!routeCache.has(rel)) routeCache.set(rel, await import(`../app/api/${rel}/route.ts`));
  return routeCache.get(rel);
};
const callRoute = async ([rel, method, url, body, params]) => {
  const mod = await routeModule(rel);
  return mod[method](jreq(method, url, body), params ? { params: Promise.resolve(params) } : undefined);
};

// Row 3: the four GET routes of the reader pages (Q-A 3:106.5 rows 3 and 4). Each entry: rel, method, url, body, params.
const READ_ROUTES = [
  ["read/page", "GET", "/api/read/page?ids=made_up_book/p001"],
  ["read/month", "GET", "/api/read/month?id=kj-2014-10"],
  ["read/toc", "GET", "/api/read/toc?id=toc-made_up_book"],
  ["read/image/[slug]/[page]", "GET", "/api/read/image/made_up_book/p001", {}, { slug: "made_up_book", page: "p001" }],
];

await check("row 3: a link visitor reads the four GET routes of the reader pages (page text, month rows, ToC rows, page image) and PocketBase sees only the key header", async () => {
  reset();
  who(null, KEY);
  let r = await callRoute(READ_ROUTES[0]);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray((await bodyOf(r)).pages));
  r = await callRoute(READ_ROUTES[1]);
  assert.equal(r.status, 404, "past the guard: the month is not in the empty fake catalog");
  assert.equal((await bodyOf(r)).error, "No such month.");
  r = await callRoute(READ_ROUTES[2]);
  assert.equal(r.status, 404);
  assert.equal((await bodyOf(r)).error, "No such book.");
  r = await callRoute(READ_ROUTES[3]);
  assert.equal(r.status, 302, "the page image of the signed mode: a signed short link, as for an approved reader");
  const loc = r.headers.get("location");
  assert.ok(loc.startsWith(`${process.env.VIEWER_PAGE_IMAGE_URL}/made_up_book/p001.webp?exp=`), loc);
  assert.ok(!loc.includes(KEY), "the signed link holds no link key");
  assert.equal(r.headers.get("cache-control"), "private, no-store");
  const pb = seen.filter((s) => s.path.startsWith("/api/collections/") && !s.path.includes("view_link"));
  assert.ok(pb.length >= 4);
  for (const e of pb) {
    assert.equal(e.key, KEY, e.path);
    assert.equal(e.auth, "", e.path);
  }
});

await check("the image of a link visitor is the same as for an approved reader (same status, same address shape)", async () => {
  reset();
  who("rdr000000000001");
  const real = await callRoute(READ_ROUTES[3]);
  who(null, KEY);
  const link = await callRoute(READ_ROUTES[3]);
  assert.equal(real.status, link.status);
  assert.equal(real.headers.get("location").replace(/exp=\d+&sig=[0-9a-f]+/, ""), link.headers.get("location").replace(/exp=\d+&sig=[0-9a-f]+/, ""));
});

await check("row 3: a link that is off, ended, or not known gets 401 'This link no longer works.' on the four GET routes; no cookie gets 401 'Sign in first.'", async () => {
  reset();
  for (const k of [KEY_OFF, KEY_ENDED, KEY_UNKNOWN]) {
    who(null, k);
    for (const r of READ_ROUTES) {
      const res = await callRoute(r);
      assert.equal(res.status, 401, `${r[2]} ${k.slice(0, 6)}`);
      assert.equal((await bodyOf(res)).error, "This link no longer works.");
    }
  }
  who(null);
  for (const r of READ_ROUTES) {
    const res = await callRoute(r);
    assert.equal(res.status, 401, r[2]);
    assert.equal((await bodyOf(res)).error, "Sign in first.");
  }
});

await check("row 5: a real session wins on the GET routes: the call carries the token and no key; a reader that waits gets 403 even with a live link", async () => {
  reset();
  who("rdr000000000001", KEY);
  seen.length = 0;
  const r = await callRoute(READ_ROUTES[0]);
  assert.equal(r.status, 200);
  for (const e of seen.filter((s) => /reader_pages|reader_versions/.test(s.path))) {
    assert.equal(e.key, undefined);
    assert.equal(e.auth, tokenOf("rdr000000000001"));
  }
  who("rdr000000000002", KEY);
  const w = await callRoute(READ_ROUTES[0]);
  assert.equal(w.status, 403, "a link does not open the page text for a reader that waits");
});

// Every route that changes data, and every reader route of /translate and /admin, with only the cookie of a live link. Each must answer 401 and send nothing to PocketBase.
const REFUSED = [
  ["htv/save", "POST", "/api/htv/save", { pageId: "made_up_book/p001", rows: [] }],
  ["htv/comments", "POST", "/api/htv/comments", { pageId: "made_up_book/p001", text: "x" }],
  ["htv/comments/[id]", "PATCH", "/api/htv/comments/abc", { text: "x" }, { id: "abc" }],
  ["htv/comments/[id]", "DELETE", "/api/htv/comments/abc", {}, { id: "abc" }],
  ["htv/mark", "PUT", "/api/htv/mark", {}],
  ["htv/mark", "DELETE", "/api/htv/mark", {}],
  ["htv/settings", "PUT", "/api/htv/settings", { panes: {} }],
  ["htv/settings", "GET", "/api/htv/settings"],
  ["htv/refresh", "POST", "/api/htv/refresh", {}],
  ["htv/view", "POST", "/api/htv/view", { view: "reader" }],
  ["htv/page", "GET", "/api/htv/page?id=made_up_book/p001"],
  ["htv/version", "GET", "/api/htv/version?id=made_up_book/p001"],
  ["profile/name", "PUT", "/api/profile/name", { name: "New Name" }],
  ["profile/password", "POST", "/api/profile/password", { current: "a", password: "bbbbbbbbbb" }],
  ["admin/links", "POST", "/api/admin/links", { name: "x" }],
  ["admin/links", "PATCH", "/api/admin/links", { id: "abcdefghijklmno" }],
  ["admin/readers", "POST", "/api/admin/readers", { id: "rdr000000000002", approved: true }],
  ["admin/issues", "POST", "/api/admin/issues", { id: "issue0000000001", note: "x" }],
  ["admin/issues/[id]/picture", "GET", "/api/admin/issues/issue0000000001/picture", {}, { id: "issue0000000001" }],
  ["admin/checks", "POST", "/api/admin/checks", {}],
  ["admin/opens", "GET", "/api/admin/opens"],
  ["admin/opens", "PUT", "/api/admin/opens", {}],
  ["admin/opens", "DELETE", "/api/admin/opens", {}],
  ["admin/versions", "GET", "/api/admin/versions"],
  ["admin/versions", "POST", "/api/admin/versions", {}],
  ["read/bookmarks", "POST", "/api/read/bookmarks", { pageId: "made_up_book/p001" }],
  ["read/bookmarks", "DELETE", "/api/read/bookmarks", { id: "abc" }],
  ["read/progress", "PUT", "/api/read/progress", { pageId: "made_up_book/p001" }],
  ["read/settings", "PUT", "/api/read/settings", { reader: { size: 18 } }],
  ["translate/month", "GET", "/api/translate/month?id=kj-2014-10"],
  ["translate/toc", "GET", "/api/translate/toc?id=toc-made_up_book"],
];

await check(`rows 3 and 4: with only the cookie of a live link, ${REFUSED.length} routes (every write route and every reader route of /translate and /admin) answer 401 and PocketBase sees nothing`, async () => {
  reset();
  who(null, KEY);
  for (const r of REFUSED) {
    const res = await callRoute(r);
    assert.equal(res.status, 401, `${r[1]} ${r[2]}`);
    assert.equal((await bodyOf(res)).error, "Sign in first.", `${r[1]} ${r[2]}`);
  }
  assert.equal(seen.length, 0, "PocketBase saw: " + seen.map((s) => `${s.method} ${s.path}`).join(", "));
  assert.equal(OPENS.length, 0);
  assert.equal(ops.length, 0, "no cookie changed");
});

await check("row 4: POST /api/issues (the visual-issue icon) answers 401 for a link visitor, and a link visitor has no icon (canReportIssues is false with no session)", async () => {
  reset();
  who(null, KEY);
  const mod = await routeModule("issues");
  const fd = new FormData();
  fd.set("comment", "x");
  const res = await mod.POST(new Request("http://localhost/api/issues", { method: "POST", headers: { origin: "http://localhost", host: "localhost" }, body: fd }));
  assert.equal(res.status, 401);
  const VI = await import("../lib/visual-issues.ts");
  assert.equal(await VI.canReportIssues(), false);
  assert.equal(seen.length, 0);
});

await check("the same routes with a link that is dead or a forged cookie also answer 401 (no write by any cookie value)", async () => {
  reset();
  for (const c of [KEY_OFF, KEY_ENDED, KEY_UNKNOWN, "short", "A".repeat(43)]) {
    who(null, c);
    for (const r of REFUSED.filter((x) => x[1] !== "GET")) assert.equal((await callRoute(r)).status, 401, `${r[2]} ${c.slice(0, 6)}`);
  }
  assert.equal(OPENS.length, 0);
});

await check("row 4: the theme is kept in the browser only: PUT /api/theme sets the cookie 'theme' for a link visitor and sends nothing to PocketBase", async () => {
  reset();
  who(null, KEY);
  const mod = await routeModule("theme");
  const res = await mod.PUT(jreq("PUT", "/api/theme", { theme: "dark" }));
  assert.equal(res.status, 200);
  assert.deepEqual(await bodyOf(res), { ok: true, theme: "dark", account: false });
  assert.ok(ops.some((o) => o.op === "set" && o.name === "theme" && o.value === "dark"));
  assert.equal(seen.length, 0);
});

await check("row 4: /api/read/sign-up needs no session by design (it is the sign-up), and the link cookie gives it nothing: no PocketBase call with a key", async () => {
  reset();
  who(null, KEY);
  const mod = await routeModule("read/sign-up");
  const res = await mod.POST(jreq("POST", "/api/read/sign-up", { name: "", email: "x", password: "y" }));
  assert.equal(res.status, 400, "the form check answers before any PocketBase call");
  assert.equal(seen.length, 0);
});

await check("sign-in replaces a link (unit default): the login route clears htv_link; sign-out keeps it", async () => {
  reset();
  who(null, KEY);
  const login = await routeModule("htv/login");
  const res = await login.POST(jreq("POST", "/api/htv/login", { email: "reader1@example.test", password: "made-up-password" }));
  assert.equal(res.status, 200);
  assert.ok(ops.some((o) => o.op === "set" && o.name === "htv_token"));
  assert.ok(ops.some((o) => o.op === "delete" && o.name === "htv_link"));
  assert.equal(jar.has("htv_link"), false);
  who("rdr000000000001", KEY);
  const logout = await routeModule("htv/logout");
  await logout.POST(jreq("POST", "/api/htv/logout"));
  assert.ok(!ops.some((o) => o.name === "htv_link"), "sign-out leaves the cookie of the link as it is");
  assert.equal(jar.get("htv_link"), KEY);
});

// ---------------------------------------------------------------- part 5: the admin

const linksRoute = await import("../app/api/admin/links/route.ts");
const adminWho = () => who("adm000000000001");

await check("rows 1 and 6: listLinks gives each link with its state, its opens, and its last open; the opens come from view_link_opens", async () => {
  reset();
  OPENS.push({ key: KEY, created: "2026-11-21 10:00:00.000Z" }, { key: KEY, created: "2026-11-21 11:00:00.000Z" });
  const rows = await LP.listLinks(tokenOf("adm000000000001"));
  const by = Object.fromEntries(rows.map((r) => [r.key, r]));
  assert.equal(rows.length, 4);
  assert.equal(by[KEY].state, "on");
  assert.equal(by[KEY].opens, 2);
  assert.equal(by[KEY].lastOpen, "2026-11-21 11:00:00.000Z", "the newest open");
  assert.equal(by[KEY_OFF].state, "off");
  assert.equal(by[KEY_ENDED].state, "ended");
  assert.equal(by[KEY_FUTURE].state, "on");
  assert.equal(by[KEY_FUTURE].opens, 0);
  assert.equal(by[KEY_FUTURE].lastOpen, null);
  assert.equal(by[KEY].name, "Kendo club Berlin");
  // Unit VW120: no address of this call holds a key (PocketBase logs the address), and the sweep read the rows with the fields key and created only.
  const opensCalls = seen.filter((e) => e.path === "/api/collections/view_link_opens/records");
  assert.equal(opensCalls.length, 1);
  for (const e of seen) for (const k of ALL_KEYS) assert.ok(!e.url.includes(k), `URL of ${e.method} ${e.path}`);
  assert.match(opensCalls[0].url, /fields=key%2Ccreated/);
  assert.ok(by[KEY_FUTURE].ends && by[KEY].ends === null);
});

await check("row 1: an admin makes a link: POST /api/admin/links gives 201 and the ID only (never the key); the record has a 43-character key, the name, and the end of the PST day", async () => {
  reset();
  adminWho();
  const res = await callRoute(["admin/links", "POST", "/api/admin/links", { name: "  Dojo Paris ", ends: "2026-12-31" }]);
  assert.equal(res.status, 201);
  const text = await res.text();
  const j = JSON.parse(text);
  assert.equal(j.ok, true);
  assert.match(j.id, /^[a-z0-9]{15}$/);
  for (const k of [...LINKS.keys()]) assert.ok(!text.includes(k), "the answer holds no key");
  const post = calls(/view_links\/records$/).find((s) => s.method === "POST");
  assert.equal(post.auth, tokenOf("adm000000000001"));
  assert.equal(post.key, undefined);
  assert.equal(post.json.name, "Dojo Paris");
  assert.match(post.json.key, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(post.json.ends, "2027-01-01 07:59:59.000Z");
  assert.equal(post.json.off, false);
  assert.equal(post.json.created_by, "adm000000000001");
  who(null);
  const r2 = await open(post.json.key);
  assert.equal(r2.headers.get("location"), "/read", "the new link works");
});

await check("row 1: a form with no name, a name over 120 characters, or a bad date gives 400 with a plain line and nothing goes to PocketBase", async () => {
  reset();
  adminWho();
  for (const [b, re] of [[{ name: "" }, /name/], [{ name: "a".repeat(121) }, /too long/], [{ name: "A", ends: "31.12.2026" }, /YYYY-MM-DD/], [{}, /name/]]) {
    seen.length = 0;
    const res = await callRoute(["admin/links", "POST", "/api/admin/links", b]);
    assert.equal(res.status, 400, JSON.stringify(b));
    assert.match((await bodyOf(res)).error, re);
    assert.equal(calls(/view_links/).length, 0);
  }
});

await check("row 6: PATCH /api/admin/links turns a link off (PocketBase gets off: true), a bad ID gives 400 with no call, and the link then shows as dead", async () => {
  reset();
  adminWho();
  const id = LINKS.get(KEY).id;
  const res = await callRoute(["admin/links", "PATCH", "/api/admin/links", { id }]);
  assert.equal(res.status, 200);
  assert.equal(LINKS.get(KEY).off, true);
  const patch = calls(/view_links\/records\//).find((s) => s.method === "PATCH");
  assert.deepEqual(patch.json, { off: true }, "only off changes: not the name, the end date, or the key");
  // Unit VW120: the address of no PocketBase call of the admin routes holds a key (PocketBase logs the address of each request).
  await callRoute(["admin/links", "POST", "/api/admin/links", { name: "Dojo Paris", ends: "2026-12-31" }]);
  for (const e of seen) for (const k of ALL_KEYS) assert.ok(!e.url.includes(k), `URL of ${e.method} ${e.path}`);
  who(null);
  assert.equal((await open(KEY)).headers.get("location"), "/link-ended");
  adminWho();
  seen.length = 0;
  for (const bad of ["x", "abc/def", "../users", "ABCDEFGHIJKLMNO", 5, null]) {
    const r = await callRoute(["admin/links", "PATCH", "/api/admin/links", { id: bad }]);
    assert.equal(r.status, 400, String(bad));
  }
  assert.equal(calls(/view_links/).length, 0);
});

await check("the admin routes refuse the wrong person: a reader and a translator get 403, no session 401, another site 403, a body that is not JSON 415, and an admin in a view 403", async () => {
  reset();
  for (const id of ["rdr000000000001", "trn000000000001"]) {
    who(id);
    assert.equal((await callRoute(["admin/links", "POST", "/api/admin/links", { name: "x" }])).status, 403, id);
    assert.equal((await callRoute(["admin/links", "PATCH", "/api/admin/links", { id: "abcdefghijklmno" }])).status, 403, id);
  }
  who(null);
  assert.equal((await callRoute(["admin/links", "POST", "/api/admin/links", { name: "x" }])).status, 401);
  adminWho();
  assert.equal((await linksRoute.POST(jreq("POST", "/api/admin/links", { name: "x" }, { origin: "http://evil.example.test" }))).status, 403);
  assert.equal((await linksRoute.POST(new Request("http://localhost/api/admin/links", { method: "POST", headers: { "content-type": "text/plain", host: "localhost" }, body: "x" }))).status, 415);
  who("adm000000000001");
  jar.set("htv_view_as", "reader");
  assert.equal((await callRoute(["admin/links", "POST", "/api/admin/links", { name: "x" }])).status, 403, "in the reader view nothing changes data");
  assert.equal(seen.filter((s) => s.method !== "GET").length, 0, "no write reached PocketBase");
});

// ---------------------------------------------------------------- part 6: the screens and the sources

await check("row 4 and 5: the band shows the text word for word with the words 'Create an account' as the link to /sign-up", async () => {
  const B = await import("../components/ViewLinkBand.tsx");
  const html = renderToStaticMarkup(h(B.default));
  assert.equal(htmlText(html).trim().replace(/ \./g, "."), L.LINK_BAND_TEXT, "the text, with the link words inside the sentence");
  assert.match(html, /role="status"/);
  const a = /<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/.exec(html);
  assert.equal(a[1], "/sign-up");
  assert.equal(a[2], "Create an account");
  assert.ok(!html.includes("<script"), "no script in the band");
});

await check("row 9: the bar of a link visitor shows 'View-only link' and no name, no profile link, no Sign out, no human-translation link, no admin link", async () => {
  const RB = await import("../components/ReaderBar.tsx");
  const bar = (o) => renderToStaticMarkup(h(RB.default, { name: "Made Up Reader", email: "reader1@example.test", role: "reader", approved: true, ...o }));
  const link = bar({ name: "View-only link", email: "", linkVisitor: true });
  const t = htmlText(link);
  assert.ok(t.includes("View-only link"));
  assert.ok(t.includes("All books"));
  for (const no of ["Sign out", "Human translation", "Readers", "Visual issues", "Links", "(reader)", "waits for approval"]) assert.ok(!t.includes(no), no);
  assert.ok(!link.includes('href="/profile"') && !link.includes("data-profile-link"));
  assert.ok(!link.includes('href="/admin') && !link.includes('href="/translate"'));
  assert.ok(link.includes("data-link-visitor"));
  const adminLink = bar({ role: "admin", linkVisitor: true });
  assert.ok(!adminLink.includes("/admin/"), "a link visitor never gets an admin link, whatever the role says");
  const real = bar({});
  assert.ok(htmlText(real).includes("Sign out"));
  assert.ok(real.includes('href="/profile"'));
  assert.ok(htmlText(real).includes("Made Up Reader"));
  assert.ok(!real.includes("data-link-visitor"));
  const admin = bar({ role: "admin" });
  assert.ok(admin.includes('href="/admin/links"'), "the admin has the link Links");
  assert.ok(htmlText(admin).includes("Links"));
});

await check("the page of a dead link: the text 'This link no longer works.', the link 'Create an account' to /sign-up, and robots noindex (also in the metadata)", async () => {
  const P = await import("../app/link-ended/page.tsx");
  assert.deepEqual(P.metadata.robots, { index: false, follow: false });
  const html = renderToStaticMarkup(await P.default());
  assert.ok(htmlText(html).includes("This link no longer works."));
  const a = /<a [^>]*href="\/sign-up"[^>]*>([^<]*)<\/a>/.exec(html);
  assert.equal(a[1], "Create an account");
  for (const k of ALL_KEYS) assert.ok(!html.includes(k));
});

const BOOKIDX = { slug: "made_up_book", titleEn: "Made Up Book", titleJa: "", author: "", publisher: "", year: "", isbn: "", pages: 3, synopsis: "", kind: "book", digits: 3, images: true, textPages: [1, 2, 3], agentPages: [1, 2, 3], humanPages: [], dataPages: [1, 2, 3], v1Pages: [], checkedPages: [], chapters: [], resumeAt: null };
const PAGE1 = { pageId: "made_up_book/p001", n: 1, name: "Page 1", hasText: true, rows: [], terms: {}, extras: [], hasHuman: false, hasAgent: true, humanBy: null, v1: [], label: { agent: "", human: "", v1: "" }, checked: false };

await check("row 4: the reading screen of a link visitor has no Bookmark button, no Mark button, no bookmark list; a real reader has them", async () => {
  const RBk = await import("../components/ReaderBook.tsx");
  const screen = (o) => renderToStaticMarkup(h(RBk.default, { index: BOOKIDX, initialPages: [PAGE1], user: { name: "Made Up Reader", email: "reader1@example.test", role: "reader", approved: true }, bookmarks: [], settings: { panelSeen: true }, view: "page", at: 1, theme: "light", note: "", ...o }));
  const link = screen({ linkVisitor: true });
  assert.ok(!link.includes("data-bookmark-toggle") && !link.includes("data-bookmarks"), "no bookmark control");
  assert.ok(!htmlText(link).includes("Bookmark") && !/>Mark</.test(link) && !/>Marked</.test(link));
  assert.ok(link.includes("data-settings-open"), "the settings button stays (the change lasts for the open page)");
  assert.ok(link.includes("data-focus-enter"));
  const real = screen({});
  assert.ok(real.includes("data-bookmark-toggle") && real.includes("data-bookmarks"));
  assert.ok(/>Mark</.test(real));
});

await check("row 4: no first-visit panel for a link visitor, with no saved mark; a real reader with no saved mark gets it", async () => {
  const RBk = await import("../components/ReaderBook.tsx");
  const screen = (o) => renderToStaticMarkup(h(RBk.default, { index: BOOKIDX, initialPages: [PAGE1], user: { name: "x", email: "", role: "reader", approved: true }, bookmarks: [], settings: {}, view: "page", at: 1, theme: "light", note: "", ...o }));
  const link = htmlText(screen({ linkVisitor: true }));
  const real = htmlText(screen({}));
  assert.ok(real.includes("Start reading"), "the first-visit panel of a real reader");
  assert.ok(!link.includes("Start reading"), "no panel for a link visitor");
});

await check("the book screen of a link visitor starts reading at the first page: no 'Continue at Page N' (no saved place), no bookmark section", async () => {
  const RBk = await import("../components/ReaderBook.tsx");
  const html = renderToStaticMarkup(h(RBk.default, { index: BOOKIDX, initialPages: [], user: { name: "x", email: "", role: "reader", approved: true }, bookmarks: [], settings: {}, view: "page", at: null, theme: "light", note: "", linkVisitor: true }));
  const t = htmlText(html);
  assert.ok(t.includes("Start reading at Page 1"));
  assert.ok(!t.includes("Continue at"));
  assert.ok(!html.includes("data-bookmarks"));
});

await check("row 4: a link visitor reads no saved place and no bookmark list from PocketBase (the loaders make no call)", async () => {
  reset();
  const RD = await import("../lib/reader-data.ts");
  const TH = await import("../lib/theme.ts");
  who(null, KEY);
  seen.length = 0;
  const user = { id: "", email: "", name: "View-only link", role: "reader", approved: true };
  assert.deepEqual(await RD.loadBookmarks(L.linkToken(KEY), user, "made_up_book"), []);
  const HS = await import("../lib/htv-settings.ts");
  assert.deepEqual(await TH.loadPaneSettings(L.linkToken(KEY), ""), HS.EMPTY_SETTINGS);
  const idx = await RD.loadReaderIndex(L.linkToken(KEY), user, "made_up_book");
  assert.equal(idx.resumeAt, null, "no 'Continue at Page N'");
  assert.equal(calls(/reader_progress|reader_bookmarks|user_settings/).length, 0, "no call to a list of the person");
  assert.ok(calls(/catalog_items/).length >= 1 && seen.every((s) => s.key === KEY && s.auth === ""), "the reads of the book carry the key and no Authorization");
  const dash = await RD.loadDashboard(L.linkToken(KEY), user, "", 1);
  assert.ok(dash.dash);
  assert.equal(calls(/reader_progress|reader_bookmarks|user_settings/).length, 0);
  // A real reader still loads the saved place (the call goes out).
  seen.length = 0;
  await RD.loadDashboard(tokenOf("rdr000000000001"), USERS.rdr000000000001, "", 1);
  assert.ok(calls(/reader_progress/).length >= 1, "the saved place of a real reader is read as before");
});

await check("row 7: the root layout sets robots noindex only for a link visitor with a live link, and shows the band above the top band; the band is a server component", () => {
  const src = read("app/layout.tsx");
  assert.ok(src.includes("(await linkInfo()).link ? LINK_ROBOTS : undefined"));
  assert.ok(src.includes("robots }") || src.includes("robots,"), "both title branches carry the robots value");
  assert.ok(src.includes("{link ? <ViewLinkBand /> : null}"));
  assert.ok(src.indexOf("<ViewLinkBand />") < src.indexOf("<Nav "), "the band sits above the top band");
  assert.ok(!read("components/ViewLinkBand.tsx").includes('"use client"'));
});

await check("the view of a link visitor: /read/<book> reads the cookie htv_link_view for a link visitor only, and ReaderBook writes it with no PUT to the server", () => {
  const page = read("app/read/[slug]/page.tsx");
  assert.ok(page.includes("s.link === true ? (await cookies()).get(LINK_VIEW_COOKIE)?.value : undefined"));
  assert.ok(page.includes("isView(viewRaw) ? viewRaw : isView(linkView) ? linkView : (reader.view ?? \"page\")"), "the address wins, then the cookie, then the default");
  const book = read("components/ReaderBook.tsx");
  assert.ok(book.includes("if (linkVisitor) document.cookie = `${LINK_VIEW_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`;"));
  assert.equal((noComments(book).match(/sendJson\(/g) ?? []).length, 3, "sendJson: the definition, the write helper, and the theme call. Every other write goes through write()");
  assert.ok(noComments(book).includes('sendJson("PUT", "/api/theme"'));
  for (const url of ["/api/read/settings", "/api/read/progress", "/api/read/bookmarks"]) {
    for (const m of noComments(book).matchAll(new RegExp(`(\\w+)\\("[A-Z]+", "${url}"`, "g"))) assert.equal(m[1], "write", url);
  }
});

await check("no write from a link visitor, in the sources: only the four GET routes pass allowLink; guard accepts allowLink for a request that does not change data and takes no role", () => {
  const files = [];
  const walk = (d) => {
    for (const n of readdirSync(path.join(app, d))) {
      const rel = `${d}/${n}`;
      if (statSync(path.join(app, rel)).isDirectory()) walk(rel);
      else if (n === "route.ts") files.push(rel);
    }
  };
  walk("app/api");
  assert.ok(files.length >= 45, `${files.length} route files`);
  const allow = files.filter((f) => /allowLink/.test(noComments(read(f))));
  // Unit VW124 (Q-A 3:117.4 and 3:117.5): the two search routes read only, so they join the four GET routes of the reader pages.
  // Unit VW126 (Q-A 3:117.6 row 1): the dictionary route reads only, so it joins the list (app/api/read/dictionary/route.ts).
  assert.deepEqual(allow.sort(), ["app/api/read/book-search/route.ts", "app/api/read/dictionary/route.ts", "app/api/read/image/[slug]/[page]/route.ts", "app/api/read/month/route.ts", "app/api/read/page/route.ts", "app/api/read/search/route.ts", "app/api/read/toc/route.ts"]);
  for (const f of allow) {
    const s = noComments(read(f));
    assert.ok(!/export async function (POST|PUT|PATCH|DELETE)/.test(s), f + " has only GET");
    // Unit VW124: a search route answers each write method with the one refusal 405 (lib/search-refuse.ts) and nothing else.
    assert.ok(!/export const (POST|PUT|PATCH|DELETE) = (?!refuseWrite;)/.test(s), f + " has a write handler that is not the refusal");
    assert.ok(/mutating: false, allowLink: true/.test(s), f);
  }
  // Every route that changes data is guarded by a session, or it is a public form by design, or it is a monitor route (off on the live site, and it never reads the cookie of a link).
  const PUBLIC = ["app/api/htv/login/route.ts", "app/api/htv/logout/route.ts", "app/api/read/sign-up/route.ts"];
  const chg = files.filter((f) => /export async function (POST|PUT|PATCH|DELETE)/.test(read(f)));
  const monitorLike = [];
  for (const f of chg) {
    const s = noComments(read(f));
    if (PUBLIC.includes(f)) continue;
    if (/\bguard(Reader)?\(|\bgetSession\(/.test(s)) continue;
    // Unit VW122: handleBookSettings (lib/book-settings-api.ts) is a monitor route helper like handleBookAction: it starts with monitorOffResponse and localWriteProblem.
    assert.ok(/monitorOffResponse|handleBookAction|handleClearMark|handleBookSettings|localWriteProblem/.test(s), f + " has no session guard and is no monitor route");
    monitorLike.push(f);
  }
  console.log(`      (${chg.length} routes change data: ${chg.length - PUBLIC.length - monitorLike.length} with a session guard, ${PUBLIC.length} public by design, ${monitorLike.length} monitor routes: ${monitorLike.map((f) => f.replace("app/api/", "").replace("/route.ts", "")).join(", ")})`);
  for (const f of monitorLike) assert.ok(!/htv-session|view-link|LINK_COOKIE|getLinkSession/.test(read(f)), f + " does not read the link cookie");
  const api = noComments(read("lib/htv-api.ts"));
  assert.ok(api.includes("if (opts.allowLink && !opts.mutating && !opts.admin && !opts.staff && !opts.write) {"));
  const ses = read("lib/htv-session.ts");
  const getSessionText = /export async function getSession\(\)[\s\S]*?\n}\n/.exec(ses)[0];
  assert.ok(!/link/i.test(getSessionText), "getSession does not know a link visitor");
});

await check("the key never reaches a client script: the client files import only lib/view-link.ts; the server files start with server-only; no file logs", () => {
  const walk = (d, out = []) => {
    for (const n of readdirSync(path.join(app, d))) {
      const rel = `${d}/${n}`;
      if (statSync(path.join(app, rel)).isDirectory()) walk(rel, out);
      else if (/\.(ts|tsx)$/.test(n)) out.push(rel);
    }
    return out;
  };
  const clients = [...walk("components"), ...walk("app")].filter((f) => /^\s*["']use client["']/.test(read(f)));
  assert.ok(clients.length >= 30, `${clients.length} client files`);
  for (const f of clients) {
    assert.ok(!/view-link-(pb|server|cookie)|node:crypto/.test(read(f)), f);
  }
  assert.ok(!/^import /m.test(read("lib/view-link.ts")), "lib/view-link.ts has no import, so a client file can import it");
  assert.ok(!read("lib/view-link.ts").includes("server-only"));
  for (const f of ["lib/view-link-pb.ts", "lib/view-link-server.ts", "lib/view-link-cookie.ts"]) assert.ok(read(f).startsWith('import "server-only";'), f);
  for (const f of ["lib/view-link.ts", "lib/view-link-pb.ts", "lib/view-link-server.ts", "lib/view-link-cookie.ts", "app/v/[key]/route.ts", "app/api/admin/links/route.ts", "app/admin/links/page.tsx", "app/link-ended/page.tsx"]) {
    assert.ok(!/console\.(log|error|warn|info|debug)/.test(noComments(read(f))), f + " logs");
  }
  // The admin page is the only page that holds a key (to show the full link to the admin). The reader pages never import the key helpers.
  const holders = walk("app").filter((f) => /view-link-pb/.test(read(f)));
  assert.deepEqual(holders.sort(), ["app/admin/links/page.tsx", "app/api/admin/links/route.ts", "app/v/[key]/route.ts"]);
});

await check("the link is checked at every page: the layout, the reader pages, and the four GET routes call the live check (no cookie, no call is only for no cookie)", () => {
  assert.ok(read("lib/view-link-server.ts").includes("const state = await checkLinkKey(key);"));
  assert.ok(read("app/read/page.tsx").includes("requireReaderOrLink"));
  assert.ok(read("app/read/[slug]/page.tsx").includes("requireReaderOrLink"));
  assert.ok(read("lib/view-link-pb.ts").includes("/api/collections/catalog_items/records?perPage=1&skipTotal=1&fields=id"));
});

await new Promise((resolve) => server.close(resolve));
const failed = done();
process.exit(failed ? 1 : 0);
