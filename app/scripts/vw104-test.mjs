// Unit VW104 (Q-A 3:44.4 "Show the placeholder on v2", Q-A 3:45.2 "A. PocketBase collection", Q-A 3:45.3 "Rules stay, defaults OK"): server-free tests of the v1 placeholder in PocketBase.
// Part 1: the shared rules (lib/v1-placeholder-rules.ts): page ID form, the plan (new, changed, same), the counts.
// Part 2: the S2 reader of the md files (lib/v1-placeholder-sync.ts): record builder, skip rules, warnings, page ID digits, SHA-256.
// Part 3: the PocketBase read helper (lib/reader-v1-pb.ts) with a fake fetch: filters, fields, pagination, and an empty list on every failure.
// Part 4: the mode switch (lib/reader-v1-source.ts) and the callers in lib/reader-data.ts, against a fake PocketBase (a local http server on a free port of 127.0.0.1).
// Part 5: S2 (scripts/sync-runs.mjs) run offline on made-up folders: the report line, the warning lines, and the option --v1-dir.
// Part 6: the v1 text goes into no search column and no count. The old claims "not uploaded" and "not stored in the database" are gone.
// Part 7: the migration file 1793300016 in a sandbox, and the folder counts.
// Made-up data only: the slugs are madeup_*, the texts are made-up sentences, the addresses are example.test. The test writes below TMPDIR and never reads the real v1 folder.
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw104-test.mjs. It prints "<n> passed, <m> failed" and exits 1 on a failure.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import vm from "node:vm";
import { checker, installAppHooks, madeUpRoot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
installAppHooks(app);
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const { check, done } = checker();
const sha = (v) => createHash("sha256").update(v).digest("hex");

const rules = await import("../lib/v1-placeholder-rules.ts");
const syncLib = await import("../lib/v1-placeholder-sync.ts");
const v1pb = await import("../lib/reader-v1-pb.ts");
const v1v = await import("../lib/reader-v1.ts");

// ---------------------------------------------------------------- made-up texts

const MD1 = ["Page 1", "", "---", "【Heading】", "これはテストの一行目です。", "Made-up English line one.", "这是测试的第一行。", "---", "二つ目の文です。", "Made-up English line two.", "---", "A line with no partner.", ""].join("\n");
const MD2 = ["Page 2", "", "---", "別のテストの文です。", "Another made-up English line.", "另一个测试句子。", "---", ""].join("\n");
const MD3 = "Page 10\n\n---\n短い文。\nShort made-up line.\n";
const MD4 = "Page 1000\n\n---\n千ページ目。\nPage one thousand, made up.\n中文。\n";

// ---------------------------------------------------------------- part 1: the shared rules

await check("rules: the page ID has 3 digits up to 999 pages and 4 digits over 999, the same as pageName and idDigits of lib/htv-books.ts", async () => {
  const books = await import("../lib/htv-books.ts");
  for (const [n, last] of [[1, 48], [51, 999], [999, 999], [1, 1000], [794, 1051], [1000, 1000], [1177, 1177], [5, 5]]) {
    assert.equal(rules.v1PageIdOf("madeup_book", n, last), `madeup_book/${books.pageName(n, books.idDigits(last))}`, `${n} of ${last}`);
  }
  assert.equal(rules.v1PageIdOf("madeup_book", 51, 120), "madeup_book/p051");
  assert.equal(rules.v1PageIdOf("madeup_year", 794, 1051), "madeup_year/p0794");
  assert.equal(rules.v1IdDigits(999), 3);
  assert.equal(rules.v1IdDigits(1000), 4);
});

await check("rules: the default folder and the field size are the same as in lib/config.ts and in the migration", async () => {
  const config = await import("../lib/config.ts");
  assert.equal(rules.V1_DEFAULT_DIR, config.DEFAULT_V1_DIR);
  assert.equal(rules.V1_COLLECTION, "v1_placeholders");
  const mig = readFileSync(path.join(pbDirOf(), "pb_migrations", "1793300016_v2_v1_placeholders.js"), "utf8");
  assert.ok(mig.includes(`const MD_MAX_CHARS = ${rules.V1_MD_MAX_CHARS};`));
  assert.ok(mig.includes("{ name: \"md\", type: \"text\", max: MD_MAX_CHARS }"));
  assert.equal(rules.V1_MD_MAX_CHARS, 200000);
});

const rec = (slug, n, md, last = 120) => ({ slug, n, page_id: rules.v1PageIdOf(slug, n, last), md, sha256: sha(md) });
const serverOf = (list) => new Map(list.map((r, i) => [rules.v1Key(r.slug, r.n), { id: "id" + i, slug: r.slug, n: r.n, page_id: r.page_id, sha256: r.sha256 }]));

await check("plan: a page that the server lacks is new, another SHA-256 is changed, another page ID is changed, an equal page is same", () => {
  const same = rec("madeup_book", 1, MD1);
  const changed = rec("madeup_book", 2, MD2);
  const moved = rec("madeup_book", 3, MD3);
  const fresh = rec("madeup_book", 4, MD4);
  const server = serverOf([same, { ...changed, sha256: sha("old text") }, { ...moved, page_id: "madeup_book/p0003" }]);
  const plan = rules.planV1([same, changed, moved, fresh], server);
  assert.deepEqual(plan.map((p) => p.action), ["unchanged", "update", "update", "create"]);
  assert.equal(plan[1].id, "id1");
  assert.equal(plan[2].id, "id2");
  assert.equal(plan[3].id, undefined);
  assert.deepEqual(rules.v1Counts(plan), { create: 1, update: 2, unchanged: 1 });
});

await check("plan: without a server list (offline, or the collection is missing) every page is not compared, and the counts are 0", () => {
  const plan = rules.planV1([rec("madeup_book", 1, MD1), rec("madeup_book", 2, MD2)], null);
  assert.deepEqual(plan.map((p) => p.action), ["not compared", "not compared"]);
  assert.deepEqual(rules.v1Counts(plan), { create: 0, update: 0, unchanged: 0 });
  assert.deepEqual(rules.v1ServerOnly([rec("madeup_book", 1, MD1)], null), []);
});

await check("plan: a record that only the server holds is listed as server only, and the plan has no action that deletes", () => {
  const a = rec("madeup_book", 1, MD1);
  const gone = rec("madeup_book", 99, MD2);
  const server = serverOf([a, gone]);
  assert.deepEqual(rules.v1ServerOnly([a], server), ["madeup_book|99"]);
  const actions = new Set(rules.planV1([a], server).map((p) => p.action));
  assert.deepEqual([...actions].sort(), ["unchanged"]);
});

// ---------------------------------------------------------------- part 2: the S2 reader of the md files

const { base: baseDir, root, w } = await madeUpRoot("vw104-v1-");
const v1dir = path.join(root, "v1");
await w("v1/madeup_book/page_001.md", MD1);
await w("v1/madeup_book/page_002.md", MD2);
await w("v1/madeup_book/page_010.md", MD3);
await w("v1/madeup_book/page_1000.md", MD4);
await w("v1/madeup_book/page_0051.md", "not the exact file name");
await w("v1/madeup_book/notes.txt", "a note");
await w("v1/madeup_small/page_005.md", MD2);
await w("v1/madeup_bad/page_001.md", "x");
await fs.writeFile(path.join(v1dir, "madeup_bad/page_001.md"), Buffer.from([0x66, 0xff, 0xfe, 0x67]));
await fs.writeFile(path.join(v1dir, "madeup_bad/page_002.md"), "text with a NUL byte \0 inside");
await w("v1/madeup_long/page_001.md", "a".repeat(rules.V1_MD_MAX_CHARS + 1));
await w("v1/madeup_long/page_002.md", "a".repeat(rules.V1_MD_MAX_CHARS));
await fs.mkdir(path.join(v1dir, "madeup_dir/page_007.md"), { recursive: true });
await w("v1/SHA256SUMS", "0000  madeup\n");
await fs.symlink(path.join(v1dir, "madeup_small"), path.join(v1dir, "link_work"));
const load = await syncLib.loadV1Records(v1dir);

await check("loader: one record for each usable page file, sorted by work and page number, with the 5 keys slug, n, page_id, md, sha256 and no other key", () => {
  assert.deepEqual(load.records.map((r) => `${r.slug}#${r.n}`), ["madeup_book#1", "madeup_book#2", "madeup_book#10", "madeup_book#1000", "madeup_long#2", "madeup_small#5"]);
  for (const r of load.records) assert.deepEqual(Object.keys(r).sort(), ["md", "n", "page_id", "sha256", "slug"]);
  assert.equal(load.records[0].md, MD1);
  assert.equal(load.dirFound, true);
  assert.equal(load.works, 3);
});

await check("loader: sha256 is the SHA-256 of the file bytes (hex, 64 characters), also for text that is not ASCII", async () => {
  for (const r of load.records) {
    assert.match(r.sha256, /^[0-9a-f]{64}$/);
    assert.equal(r.sha256, sha(await fs.readFile(path.join(v1dir, r.slug, `page_${String(r.n).padStart(3, "0")}.md`))));
  }
  assert.equal(load.records[0].sha256, sha(Buffer.from(MD1, "utf8")));
});

await check("loader: page_id has 4 digits for a work with a page over 999 (p0001, p1000) and 3 digits for the others (p005)", () => {
  const ids = Object.fromEntries(load.records.map((r) => [`${r.slug}#${r.n}`, r.page_id]));
  assert.equal(ids["madeup_book#1"], "madeup_book/p0001");
  assert.equal(ids["madeup_book#10"], "madeup_book/p0010");
  assert.equal(ids["madeup_book#1000"], "madeup_book/p1000");
  assert.equal(ids["madeup_small#5"], "madeup_small/p005");
  assert.equal(ids["madeup_long#2"], "madeup_long/p002");
});

await check("loader: SHA256SUMS, a note file, and a link are skipped without a warning (3 ignored), and a work with no usable page is not counted as a work", () => {
  assert.equal(load.ignored, 3);
  assert.ok(!load.records.some((r) => r.slug === "madeup_bad" || r.slug === "madeup_dir" || r.slug === "link_work"));
});

await check("loader: a damaged file gives exactly one warning each (not UTF-8, NUL byte, too long, a folder named like a page, a name that is not the exact form) and the file is skipped", () => {
  assert.equal(load.warnings.length, 5, load.warnings.join("\n"));
  const text = load.warnings.join("\n");
  assert.match(text, /madeup_bad\/page_001\.md is not valid UTF-8\. The file is skipped\./);
  assert.match(text, /madeup_bad\/page_002\.md holds a NUL byte\. The file is skipped\./);
  assert.match(text, /madeup_long\/page_001\.md has 200001 characters\. The field md holds 200000 at most\. The file is skipped\./);
  assert.match(text, /madeup_dir\/page_007\.md cannot be read \(EISDIR\)\. The file is skipped\./);
  assert.match(text, /madeup_book\/page_0051\.md is not a page file name/);
  assert.ok(!text.includes("madeup_long/page_002.md"), "a file with exactly 200000 characters is kept");
});

await check("loader: a folder that does not exist gives dirFound false and no record, and an empty folder gives dirFound true and no record", async () => {
  const none = await syncLib.loadV1Records(path.join(root, "nothing-here"));
  assert.deepEqual({ found: none.dirFound, n: none.records.length, w: none.warnings.length }, { found: false, n: 0, w: 0 });
  await fs.mkdir(path.join(root, "empty-v1"));
  const empty = await syncLib.loadV1Records(path.join(root, "empty-v1"));
  assert.deepEqual({ found: empty.dirFound, n: empty.records.length, works: empty.works, bytes: empty.bytes }, { found: true, n: 0, works: 0, bytes: 0 });
});

await check("loader: bytes is the sum of the file sizes of the records, and a second run gives the same records (nothing is written)", async () => {
  const sizes = load.records.map((r) => Buffer.byteLength(r.md, "utf8"));
  assert.equal(load.bytes, sizes.reduce((a, b) => a + b, 0));
  const again = await syncLib.loadV1Records(v1dir);
  assert.deepEqual(again.records, load.records);
  assert.deepEqual(again.warnings, load.warnings);
});

await check("loader and rules: a record that the loader builds is equal to itself on a server list, and a changed file gives one update", async () => {
  const server = serverOf(load.records);
  assert.deepEqual(rules.v1Counts(rules.planV1(load.records, server)), { create: 0, update: 0, unchanged: load.records.length });
  await fs.writeFile(path.join(v1dir, "madeup_small/page_005.md"), MD2 + "\nA made-up change.\n");
  const changed = await syncLib.loadV1Records(v1dir);
  assert.deepEqual(rules.v1Counts(rules.planV1(changed.records, server)), { create: 0, update: 1, unchanged: load.records.length - 1 });
  await fs.writeFile(path.join(v1dir, "madeup_small/page_005.md"), MD2);
});

// ---------------------------------------------------------------- part 3: the PocketBase read helper with a fake fetch

/** A fake fetch. `answer(url, init, callNo)` returns {status, body} or a Response, or throws. The calls are in `.calls`. */
function fakeFetch(answer) {
  const calls = [];
  const f = async (url, init) => {
    const u = new URL(url);
    calls.push({ url: u, init, params: Object.fromEntries(u.searchParams) });
    const r = await answer(u, init, calls.length);
    if (r instanceof Response) return r;
    return new Response(typeof r.body === "string" ? r.body : JSON.stringify(r.body ?? {}), { status: r.status ?? 200 });
  };
  f.calls = calls;
  return f;
}
const BASE = "http://127.0.0.1:9";
const TOKEN = "made-up-token-for-the-test";
const opts = (fetchFn) => ({ baseUrl: BASE, token: TOKEN, fetchFn });
const PATH = "/api/collections/v1_placeholders/records";

await check("helper numbers: one list call asks for the work with the field n only, sorted, 500 for each page, with the token of the reader", async () => {
  const f = fakeFetch(() => ({ body: { items: [{ n: 3 }, { n: 1 }, { n: 2 }], totalPages: 1 } }));
  assert.deepEqual(await v1pb.v1PbNumbers(opts(f), "madeup_book"), [1, 2, 3]);
  assert.equal(f.calls.length, 1);
  const c = f.calls[0];
  assert.equal(c.url.origin + c.url.pathname, BASE + PATH);
  assert.deepEqual(c.params, { perPage: "500", page: "1", sort: "n", filter: 'slug="madeup_book"', fields: "n" });
  assert.equal(c.init.method, "GET");
  assert.equal(c.init.headers.Authorization, TOKEN);
});

await check("helper numbers: a work with 1,051 pages takes 3 calls of 500, and the numbers come back sorted", async () => {
  const all = Array.from({ length: 1051 }, (_, i) => i + 1);
  const f = fakeFetch((u) => {
    const page = Number(u.searchParams.get("page"));
    return { body: { items: all.slice((page - 1) * 500, page * 500).reverse().map((n) => ({ n })), totalPages: 3 } };
  });
  assert.deepEqual(await v1pb.v1PbNumbers(opts(f), "madeup_year"), all);
  assert.deepEqual(f.calls.map((c) => c.params.page), ["1", "2", "3"]);
});

await check("helper numbers: a bad number (0, negative, a fraction, text, null) is left out", async () => {
  const f = fakeFetch(() => ({ body: { items: [{ n: 0 }, { n: -1 }, { n: 1.5 }, { n: "x" }, { n: null }, { n: 4 }, {}] } }));
  assert.deepEqual(await v1pb.v1PbNumbers(opts(f), "madeup_book"), [4]);
});

await check("helper numbers: no token, a slug with a path character, or an empty slug gives an empty list and no call", async () => {
  const f = fakeFetch(() => ({ body: { items: [{ n: 1 }] } }));
  assert.deepEqual(await v1pb.v1PbNumbers({ baseUrl: BASE, token: "", fetchFn: f }, "madeup_book"), []);
  for (const slug of ["../x", "a/b", "", "a b", 'a"b']) assert.deepEqual(await v1pb.v1PbNumbers(opts(f), slug), [], JSON.stringify(slug));
  assert.equal(f.calls.length, 0);
});

const FAILURES = [
  ["HTTP 401", () => ({ status: 401, body: { message: "The request requires valid record authorization token." } })],
  ["HTTP 403", () => ({ status: 403, body: { message: "Only superusers can perform this action." } })],
  ["HTTP 404 (the collection is missing)", () => ({ status: 404, body: { message: "Missing collection context." } })],
  ["HTTP 500", () => ({ status: 500, body: "internal error" })],
  ["a network error", () => { throw new TypeError("fetch failed"); }],
  ["an answer that is not JSON", () => ({ body: "<html>made-up</html>" })],
  ["an answer with no list", () => ({ body: { items: "x" } })],
  ["an answer that is null", () => ({ body: "null" })],
];
for (const [name, answer] of FAILURES) {
  await check(`helper: ${name} gives an empty list for the numbers and an empty list for each page of the rows`, async () => {
    const f = fakeFetch(answer);
    assert.deepEqual(await v1pb.v1PbNumbers(opts(f), "madeup_book"), []);
    const rows = await v1pb.v1PbRows(opts(f), "madeup_book", [1, 2, 3], ["madeup_book/p001", "madeup_book/p002", "madeup_book/p003"]);
    assert.deepEqual(rows, [[], [], []]);
  });
}

await check("helper rows: ONE list call asks for the pages of the screen (filter: the work and the numbers, fields n and md), and the rows are the rows of parseV1Md", async () => {
  const f = fakeFetch(() => ({ body: { items: [{ n: 1, md: MD1 }, { n: 3, md: MD2 }], totalPages: 1 } }));
  const ids = ["madeup_book/p001", "madeup_book/p003", "madeup_book/p007"];
  const rows = await v1pb.v1PbRows(opts(f), "madeup_book", [1, 3, 7], ids);
  assert.equal(f.calls.length, 1);
  assert.deepEqual(f.calls[0].params, { perPage: "500", page: "1", sort: "n", filter: 'slug="madeup_book" && (n=1 || n=3 || n=7)', fields: "n,md" });
  assert.equal(f.calls[0].init.headers.Authorization, TOKEN);
  assert.deepEqual(rows[0], v1v.parseV1Md(MD1, ids[0]));
  assert.deepEqual(rows[1], v1v.parseV1Md(MD2, ids[1]));
  assert.deepEqual(rows[2], []);
  assert.equal(rows[0].length, 3);
  assert.equal(rows[0][0].key, "madeup_book/p001/v1/01");
  assert.deepEqual(rows[0][0], { key: "madeup_book/p001/v1/01", ja: "これはテストの一行目です。", en: "Made-up English line one.", zh: "这是测试的第一行。" });
  assert.deepEqual(rows[0][2], { key: "madeup_book/p001/v1/03", ja: "", en: "A line with no partner.", zh: "" });
});

await check("helper rows: the rows follow the order of the numbers, also when the server answers in another order", async () => {
  const f = fakeFetch(() => ({ body: { items: [{ n: 5, md: MD2 }, { n: 2, md: MD1 }] } }));
  const rows = await v1pb.v1PbRows(opts(f), "madeup_book", [2, 5], ["madeup_book/p002", "madeup_book/p005"]);
  assert.deepEqual(rows[0], v1v.parseV1Md(MD1, "madeup_book/p002"));
  assert.deepEqual(rows[1], v1v.parseV1Md(MD2, "madeup_book/p005"));
});

await check("helper rows: 250 numbers take 3 calls (100, 100, 50), and a record that holds an empty md gives an empty list", async () => {
  const nums = Array.from({ length: 250 }, (_, i) => i + 1);
  const f = fakeFetch((u) => {
    const ns = [...u.searchParams.get("filter").matchAll(/n=(\d+)/g)].map((m) => Number(m[1]));
    return { body: { items: ns.map((n) => ({ n, md: n === 7 ? "" : MD3 })), totalPages: 1 } };
  });
  const rows = await v1pb.v1PbRows(opts(f), "madeup_book", nums, nums.map((n) => `madeup_book/p${String(n).padStart(3, "0")}`));
  assert.equal(f.calls.length, 3);
  assert.deepEqual(f.calls.map((c) => [...c.params.filter.matchAll(/n=(\d+)/g)].length), [100, 100, 50]);
  assert.equal(rows.length, 250);
  assert.deepEqual(rows[6], []);
  assert.equal(rows[0].length, 1);
  assert.equal(rows[249][0].key, "madeup_book/p250/v1/01");
});

await check("helper rows: a bad number is left out of the filter, and no token, a bad slug, or no number gives empty lists with no call", async () => {
  const f = fakeFetch(() => ({ body: { items: [{ n: 2, md: MD3 }] } }));
  const rows = await v1pb.v1PbRows(opts(f), "madeup_book", [0, 2, -3, 1.5], ["a", "madeup_book/p002", "c", "d"]);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].params.filter, 'slug="madeup_book" && (n=2)');
  assert.deepEqual(rows.map((r) => r.length), [0, 1, 0, 0]);
  const g = fakeFetch(() => ({ body: { items: [] } }));
  assert.deepEqual(await v1pb.v1PbRows({ baseUrl: BASE, token: "", fetchFn: g }, "madeup_book", [1, 2], ["a", "b"]), [[], []]);
  assert.deepEqual(await v1pb.v1PbRows(opts(g), "../x", [1], ["a"]), [[]]);
  assert.deepEqual(await v1pb.v1PbRows(opts(g), "madeup_book", [], []), []);
  assert.equal(g.calls.length, 0);
});

// ---------------------------------------------------------------- part 4: the mode switch and the callers

/** The made-up PocketBase: v1_placeholders records of one work, a catalog row, and empty lists for every other collection. */
const store = new Map(); // "slug|n" -> md
let v1Mode = "ok"; // "ok", "unapproved" (HTTP 200 and no record, as PocketBase answers a list rule that fails), "forbidden" (403)
const seen = [];
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://127.0.0.1");
  const m = /^\/api\/collections\/([a-z_0-9]+)\/records$/.exec(u.pathname);
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (!m) return send(404, { message: "not found" });
  const coll = m[1];
  seen.push({ coll, authorization: req.headers.authorization ?? "", filter: u.searchParams.get("filter") ?? "", fields: u.searchParams.get("fields") ?? "", page: u.searchParams.get("page") ?? "" });
  if (coll === "v1_placeholders") {
    if (v1Mode === "forbidden") return send(403, { message: "forbidden" });
    if (v1Mode === "unapproved") return send(200, { page: 1, perPage: 500, totalItems: 0, totalPages: 1, items: [] });
    const filter = u.searchParams.get("filter") ?? "";
    const slug = /slug="([^"]*)"/.exec(filter)?.[1] ?? "";
    const wanted = new Set([...filter.matchAll(/n=(\d+)/g)].map((x) => Number(x[1])));
    const fields = (u.searchParams.get("fields") ?? "").split(",");
    const items = [...store.entries()]
      .map(([k, md]) => ({ slug: k.split("|")[0], n: Number(k.split("|")[1]), md }))
      .filter((r) => r.slug === slug && (wanted.size === 0 || wanted.has(r.n)))
      .sort((a, b) => a.n - b.n)
      .map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => fields.includes(k))));
    return send(200, { page: 1, perPage: 500, totalItems: items.length, totalPages: 1, items });
  }
  if (coll === "catalog_items") return send(200, { page: 1, perPage: 500, totalItems: 1, totalPages: 1, items: [{ item_id: "madeup_book", kind: "book", title_en: "Made-up Book", title_ja: "テストの本", pages: 12, row: {} }] });
  return send(200, { page: 1, perPage: 500, totalItems: 0, totalPages: 1, items: [] });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
store.set("madeup_book|1", MD1);
store.set("madeup_book|2", MD2);
store.set("madeup_book|3", MD3);
store.set("madeup_other|1", MD4);

const v1dirFiles = path.join(root, "files-v1");
await fs.mkdir(path.join(v1dirFiles, "madeup_book"), { recursive: true });
await fs.writeFile(path.join(v1dirFiles, "madeup_book/page_009.md"), "Page 9\n\n---\n九ページ目。\nPage nine, made up.\n中文九。\n");
const configFile = path.join(root, "files-mode.config.json");
await fs.writeFile(configFile, JSON.stringify({ translatorDataDir: path.join(root, "data"), runSource: "files" }));

/** Run fn with environment variables set (undefined removes the variable), and restore them. */
async function withEnv(vars, fn) {
  const old = {};
  for (const [k, v] of Object.entries(vars)) {
    old[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(old)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}
const pbEnv = (extra = {}) => ({ VIEWER_CONFIG: path.join(root, "no-config.json"), VIEWER_RUN_SOURCE: "pocketbase", VIEWER_POCKETBASE_URL: `http://127.0.0.1:${port}`, VIEWER_V1_DIR: v1dirFiles, ...extra });
const filesEnv = (extra = {}) => ({ VIEWER_CONFIG: configFile, VIEWER_RUN_SOURCE: undefined, VIEWER_POCKETBASE_URL: undefined, VIEWER_V1_DIR: v1dirFiles, ...extra });
const source = await import("../lib/reader-v1-source.ts");
const data = await import("../lib/reader-data.ts");
const v1Calls = () => seen.filter((s) => s.coll === "v1_placeholders");

await check("mode switch: PocketBase mode reads the collection (pages 1, 2, 3 of the work) and never the md files (the file page_009.md is not listed)", async () => {
  seen.length = 0;
  await withEnv(pbEnv(), async () => {
    assert.deepEqual(await source.v1PagesOfWork("made-up-token-2", "madeup_book"), [1, 2, 3]);
    const rows = await source.v1RowsOfPages("made-up-token-2", "madeup_book", [1, 9], ["madeup_book/p001", "madeup_book/p009"]);
    assert.deepEqual(rows[0], v1v.parseV1Md(MD1, "madeup_book/p001"));
    assert.deepEqual(rows[1], [], "page 9 has a file here but no record: PocketBase mode does not fall back to the files");
  });
  assert.equal(v1Calls().length, 2);
  assert.ok(v1Calls().every((c) => c.authorization === "made-up-token-2"));
});

await check("mode switch: files mode reads the md files as before and makes no call to PocketBase", async () => {
  seen.length = 0;
  await withEnv(filesEnv({ VIEWER_POCKETBASE_URL: `http://127.0.0.1:${port}` }), async () => {
    assert.deepEqual(await source.v1PagesOfWork("made-up-token-2", "madeup_book"), [9]);
    const rows = await source.v1RowsOfPages("made-up-token-2", "madeup_book", [1, 9], ["madeup_book/p001", "madeup_book/p009"]);
    assert.deepEqual(rows[0], []);
    assert.deepEqual(rows[1], [{ key: "madeup_book/p009/v1/01", ja: "九ページ目。", en: "Page nine, made up.", zh: "中文九。" }]);
  });
  assert.equal(seen.length, 0, "no request reached PocketBase");
});

await check("mode switch: a config that cannot load counts as files mode (the same as before this unit)", async () => {
  seen.length = 0;
  await withEnv({ VIEWER_CONFIG: path.join(root, "no-config.json"), VIEWER_RUN_SOURCE: undefined, VIEWER_POCKETBASE_URL: undefined, VIEWER_V1_DIR: v1dirFiles }, async () => {
    assert.deepEqual(await source.v1PagesOfWork("made-up-token-2", "madeup_book"), [9]);
  });
  assert.equal(seen.length, 0);
});

await check("mode switch: an unapproved reader (PocketBase answers 200 and no record), a refused reader (403), no token, and a server that is down all give no placeholder", async () => {
  await withEnv(pbEnv(), async () => {
    v1Mode = "unapproved";
    assert.deepEqual(await source.v1PagesOfWork("made-up-token-3", "madeup_book"), []);
    assert.deepEqual(await source.v1RowsOfPages("made-up-token-3", "madeup_book", [1, 2], ["a", "b"]), [[], []]);
    v1Mode = "forbidden";
    assert.deepEqual(await source.v1PagesOfWork("made-up-token-3", "madeup_book"), []);
    assert.deepEqual(await source.v1RowsOfPages("made-up-token-3", "madeup_book", [1], ["a"]), [[]]);
    v1Mode = "ok";
    seen.length = 0;
    assert.deepEqual(await source.v1PagesOfWork("", "madeup_book"), []);
    assert.equal(seen.length, 0, "no token, no call");
  });
  const closed = http.createServer();
  await new Promise((resolve) => closed.listen(0, "127.0.0.1", resolve));
  const closedPort = closed.address().port;
  await new Promise((resolve) => closed.close(resolve));
  await withEnv(pbEnv({ VIEWER_POCKETBASE_URL: `http://127.0.0.1:${closedPort}` }), async () => {
    assert.deepEqual(await source.v1PagesOfWork("made-up-token-3", "madeup_book"), []);
    assert.deepEqual(await source.v1RowsOfPages("made-up-token-3", "madeup_book", [1], ["a"]), [[]]);
  });
});

const user = { id: "madeupuser1", email: "reader1@example.test", name: "Made Up", role: "reader", approved: true };

await check("callers: loadReaderPages asks for the v1 pages of a screen with ONE call, and a page without an agent text still carries the v1 rows", async () => {
  seen.length = 0;
  await withEnv(pbEnv(), async () => {
    const pages = await data.loadReaderPages("made-up-token-4", "madeup_book", [1, 2, 3, 4], 3);
    assert.equal(v1Calls().length, 1, "one call for 4 pages");
    assert.equal(v1Calls()[0].filter, 'slug="madeup_book" && (n=1 || n=2 || n=3 || n=4)');
    assert.deepEqual(pages.map((p) => [p.pageId, p.hasText, p.hasAgent, p.hasHuman, p.v1.length]), [
      ["madeup_book/p001", false, false, false, 3],
      ["madeup_book/p002", false, false, false, 1],
      ["madeup_book/p003", false, false, false, 1],
      ["madeup_book/p004", false, false, false, 0],
    ]);
    assert.equal(pages[0].v1[0].key, "madeup_book/p001/v1/01");
    // Unit VW119 (Q-A 3:103.4): a reader sees no model name, so the page line of the v1 placeholder is now "Earlier machine translation (placeholder)".
    assert.equal(pages[0].label.v1, "Earlier machine translation (placeholder)");
    assert.deepEqual(pages[0].rows, []);
  });
});

await check("callers: loadReaderIndex lists the v1 pages in v1Pages and dataPages, and every count (textPages, agentPages, humanPages, checkedPages) is the same with and without the v1 records", async () => {
  await withEnv(pbEnv(), async () => {
    const withV1 = await data.loadReaderIndex("made-up-token-4", user, "madeup_book");
    const saved = new Map(store);
    store.clear();
    const without = await data.loadReaderIndex("made-up-token-4", user, "madeup_book");
    for (const [k, v] of saved) store.set(k, v);
    assert.deepEqual(withV1.v1Pages, [1, 2, 3]);
    assert.deepEqual(without.v1Pages, []);
    assert.deepEqual(withV1.dataPages, [1, 2, 3]);
    assert.deepEqual(without.dataPages, []);
    const strip = ({ v1Pages, dataPages, ...rest }) => rest;
    assert.deepEqual(strip(withV1), strip(without));
    assert.deepEqual([withV1.textPages, withV1.agentPages, withV1.humanPages, withV1.checkedPages], [[], [], [], []]);
    assert.equal(withV1.pages, 12);
  });
});

await check("callers: lib/reader-data.ts calls the switch and not the files directly, and the files module is unchanged in its two exports", () => {
  const src = read("lib/reader-data.ts");
  assert.ok(src.includes('from "./reader-v1-source"'));
  assert.ok(!src.includes("reader-v1-files"));
  assert.ok(src.includes("v1PagesOfWork(token, slug)"));
  assert.ok(src.includes("v1RowsOfPages(token, slug, nums, ids)"));
  assert.match(read("lib/reader-v1-files.ts"), /export async function v1PageRows\(slug: string, n: number, pageId: string\)/);
  assert.match(read("lib/reader-v1-files.ts"), /export async function v1PageNumbers\(slug: string\)/);
});

// ---------------------------------------------------------------- part 5: S2 offline on made-up folders

await fs.mkdir(path.join(root, "s2data/pilot-run/madeup_book_p001"), { recursive: true });
const s2 = (args, env = {}) =>
  spawnSync(process.execPath, [path.join(app, "scripts/sync-runs.mjs"), ...args], {
    cwd: app,
    encoding: "utf8",
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, ...env },
  });
const mbText = (bytes) => {
  const v = bytes / 1048576;
  return (v > 0 && v < 0.005 ? v.toFixed(4) : v.toFixed(2)) + " MB";
};
const s2v1 = await w("v1-s2/madeup_book/page_001.md", MD1).then(async () => {
  await w("v1-s2/madeup_book/page_002.md", MD2);
  await w("v1-s2/madeup_two/page_010.md", MD3);
  await w("v1-s2/SHA256SUMS", "0000  madeup\n");
  await fs.writeFile(path.join(root, "v1-s2/madeup_book/page_003.md"), Buffer.from([0xff, 0xfe]));
  return path.join(root, "v1-s2");
});

await check("S2 offline: the report has the line 'v1_placeholders | 3 pages in 2 works (not compared), <size> MB', and the damaged file gives ONE Warning line", () => {
  const r = s2(["--offline", "--data", path.join(root, "s2data"), "--page", "madeup_book/p001", "--v1-dir", s2v1]);
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const bytes = Buffer.byteLength(MD1) + Buffer.byteLength(MD2) + Buffer.byteLength(MD3);
  assert.ok(r.stdout.includes(`v1_placeholders | 3 pages in 2 works (not compared), ${mbText(bytes)}\n`), r.stdout.split("\n").filter((l) => l.startsWith("v1_")).join("\n"));
  const warnings = r.stderr.split("\n").filter((l) => l.startsWith("Warning: v1 md "));
  assert.deepEqual(warnings, ["Warning: v1 md madeup_book/page_003.md is not valid UTF-8. The file is skipped."]);
  assert.match(r.stdout, /v1_placeholders \(unit VW104\)\n  would create: not compared\n  would update: not compared\n  unchanged: not compared\n  skipped \(a damaged file, or a file name that is not page_NNN\.md\): 1\n/);
  assert.ok(r.stdout.includes("Nothing was written."));
});

await check("S2 offline: the env variable VIEWER_V1_DIR names the folder when the option is not given, and the option wins over the variable", () => {
  const viaEnv = s2(["--offline", "--data", path.join(root, "s2data"), "--page", "madeup_book/p001"], { VIEWER_V1_DIR: s2v1 });
  assert.equal(viaEnv.status, 0, viaEnv.stderr.slice(-400));
  assert.ok(viaEnv.stdout.includes("v1_placeholders | 3 pages in 2 works (not compared)"));
  const both = s2(["--offline", "--data", path.join(root, "s2data"), "--page", "madeup_book/p001", "--v1-dir", path.join(v1dirFiles)], { VIEWER_V1_DIR: s2v1 });
  assert.ok(both.stdout.includes("v1_placeholders | 1 pages in 1 works (not compared)"), both.stdout.split("\n").filter((l) => l.startsWith("v1_")).join("\n"));
});

await check("S2 offline: a v1 folder that does not exist gives one Warning line and 0 pages, and S2 goes on", () => {
  const r = s2(["--offline", "--data", path.join(root, "s2data"), "--page", "madeup_book/p001", "--v1-dir", path.join(root, "missing-v1")]);
  assert.equal(r.status, 0);
  assert.equal(r.stderr.split("\n").filter((l) => l.startsWith("Warning: the v1 folder ")).length, 1);
  assert.ok(r.stdout.includes("v1_placeholders | 0 pages in 0 works (not compared), 0.00 MB\n"));
});

await check("S2 help: the option --v1-dir, the collection, the migration, the never-delete rule, and the owner picks are in the help text", () => {
  const r = s2(["--help"]);
  assert.equal(r.status, 0);
  for (const s of ["--v1-dir DIR", "v1_placeholders", "Migration 1793300016 adds v1_placeholders. Without it, --apply stops", "It never deletes a record", "Q-A 3:44.4, 3:45.2, 3:45.3", "VIEWER_V1_DIR", "no search column and no count"]) assert.ok(r.stdout.includes(s), s);
  assert.ok(!r.stdout.includes("The v1 placeholder is not uploaded"));
  assert.equal(s2(["--v1-dir"]).status, 2);
  assert.match(s2(["--v1-dir"]).stderr, /The option --v1-dir needs a value\./);
});

// ---------------------------------------------------------------- part 6: no search column, no count, no old claim

await check("no search and no count: the v1 code imports no search, no translated-page rule, and no catalog code, and a record holds no search column", () => {
  const importsOf = (src) => [...src.matchAll(/from "([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(importsOf(read("lib/v1-placeholder-sync.ts")), ["./reader-v1", "./v1-placeholder-rules", "node:crypto", "node:fs", "node:path"]);
  assert.deepEqual(importsOf(read("lib/v1-placeholder-rules.ts")), []);
  assert.deepEqual(importsOf(read("lib/reader-v1-pb.ts")), ["./pb", "./reader-types", "./reader-v1", "./safe-path", "./v1-placeholder-rules", "./view-link"]); // unit VW120 added ./view-link (the key header of a link visitor)
  assert.deepEqual(importsOf(read("lib/reader-v1-source.ts")), ["./config", "./reader-types", "./reader-v1-files", "./reader-v1-pb"]);
  for (const f of ["lib/v1-placeholder-sync.ts", "lib/v1-placeholder-rules.ts", "lib/reader-v1-pb.ts", "lib/reader-v1-source.ts"]) {
    const code = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const bad of ["searchColumns", "search_ja", "search_en", "isTranslatedPage", "translated", "catalog_items"]) assert.ok(!code.includes(bad), `${f} holds ${bad}`);
  }
  assert.deepEqual(Object.keys(load.records[0]).sort(), ["md", "n", "page_id", "sha256", "slug"]);
});

await check("no search and no count: the S2 step for v1 (from 2a1 to 2a2 and the apply loop) does not call the search, the translated rule, or the catalog body", () => {
  const src = read("scripts/sync-runs.mjs");
  const step = src.slice(src.indexOf("// 2a1. The v1 placeholder"), src.indexOf("// 2a2. Book runs"));
  assert.ok(step.length > 400);
  for (const bad of ["searchColumns", "isTranslatedPage", "catalogBody", "readerPlan", "translated"]) assert.ok(!step.replace(/\/\/.*$/gm, "").includes(bad), `step 2a1 holds ${bad}`);
  const apply = src.slice(src.indexOf("// Unit VW104 (Q-A 3:45.2): create or update each v1 page"), src.indexOf("for (const p of readerPlan) {", src.indexOf("// Unit VW104 (Q-A 3:45.2): create or update each v1 page")));
  assert.ok(apply.includes("V1_COLLECTION"));
  for (const bad of ["search", "translated", "catalog_items", "DELETE"]) assert.ok(!apply.includes(bad), `apply loop holds ${bad}`);
});

await check("old claims are gone and the new text cites the owner picks: S2 comments and help, reader-v1.ts, reader-types.ts, config.ts", () => {
  const sync = read("scripts/sync-runs.mjs");
  assert.ok(!sync.includes("The v1 placeholder is not uploaded"));
  assert.ok(!sync.includes("v1 placeholder is not uploaded (owner answer 8"));
  assert.ok(!read("lib/reader-v1.ts").includes("is not stored in the database"));
  assert.ok(!read("lib/reader-types.ts").includes("never reaches the database"));
  assert.ok(!read("lib/config.ts").includes("so it shows no placeholder. A missing folder"));
  for (const [f, picks] of [["scripts/sync-runs.mjs", ["Q-A 3:44.4", "Q-A 3:45.2", "Q-A 3:45.3"]], ["lib/reader-v1.ts", ["Q-A 3:44.4", "Q-A 3:45.2"]], ["lib/reader-v1-pb.ts", ["Q-A 3:44.4", "Q-A 3:45.2", "Q-A 3:45.3"]], ["lib/reader-v1-source.ts", ["Q-A 3:44.4", "Q-A 3:45.2", "Q-A 3:45.3"]], ["lib/v1-placeholder-sync.ts", ["Q-A 3:44.4", "Q-A 3:45.2", "Q-A 3:45.3"]], ["lib/v1-placeholder-rules.ts", ["Q-A 3:44.4", "Q-A 3:45.2", "Q-A 3:45.3"]]]) {
    for (const s of picks) assert.ok(read(f).includes(s), `${f} lacks ${s}`);
  }
  // Unit VW119 (Q-A 3:103.4 "Keep AI label, no agent words"): the page line lost the model name. The old text was "v1 Gemini translation placeholder.".
  assert.equal(read("lib/reader-types.ts").includes('LABEL_V1 = "Earlier machine translation (placeholder)"'), true, "the page line has the new text of unit VW119");
});

await check("no real e-mail address in the new files, and no slug other than madeup_* in this test", () => {
  const files = ["lib/v1-placeholder-rules.ts", "lib/v1-placeholder-sync.ts", "lib/reader-v1-pb.ts", "lib/reader-v1-source.ts", "scripts/vw104-test.mjs"];
  for (const f of files) {
    for (const m of read(f).matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) assert.match(m[0], /@example\.test$/, `${f}: ${m[0]}`);
  }
  const slugs = [...read("scripts/vw104-test.mjs").matchAll(/\bmadeup_[a-z0-9_]+/g)].map((m) => m[0]);
  assert.ok(slugs.length > 20);
});

// ---------------------------------------------------------------- part 7: the migration and the folders

function pbDirOf() {
  const dirs = [path.resolve(app, "..", "pocketbase"), path.resolve(app, "..", "data", "scripts", "pocketbase")];
  return dirs.find((d) => existsSync(path.join(d, "pb_migrations")));
}
const pbDir = pbDirOf();
const MIG = "1793300016_v2_v1_placeholders.js";

/** Load the migration in a sandbox with a fake `migrate`, a fake `Collection`, and a fake app that holds collections in a map. */
function loadMigration(file, counts = {}) {
  const src = readFileSync(path.join(pbDir, "pb_migrations", file), "utf8");
  const logs = [];
  let up;
  let down;
  class Collection {
    constructor(o) {
      Object.assign(this, o);
    }
  }
  const collections = new Map();
  const saves = [];
  const deletes = [];
  const app = {
    findCollectionByNameOrId(name) {
      if (!collections.has(name)) throw new Error("no collection " + name);
      return collections.get(name);
    },
    save(c) {
      saves.push(c.name);
      collections.set(c.name, c);
    },
    countRecords: (name) => counts[name] ?? 0,
    delete(c) {
      deletes.push(c.name);
      collections.delete(c.name);
    },
  };
  vm.runInNewContext(src, { migrate: (u, d) => ((up = u), (down = d)), Collection, console: { log: (...a) => logs.push(a.join(" ")) } }, { filename: file });
  return { up: () => up(app), down: () => down(app), logs, src, collections, saves, deletes };
}

await check("migration up: base collection v1_placeholders with the fields slug, n, page_id, md, sha256, created, updated, the right sizes, and the required flags", () => {
  const m = loadMigration(MIG);
  m.up();
  const c = m.collections.get("v1_placeholders");
  assert.equal(c.type, "base");
  assert.deepEqual(Array.from(c.fields, (f) => f.name), ["slug", "n", "page_id", "md", "sha256", "created", "updated"]); // the sandbox arrays have another prototype: Array.from makes a plain array
  const f = Object.fromEntries(c.fields.map((x) => [x.name, x]));
  assert.deepEqual([f.slug.type, f.slug.required, f.slug.max], ["text", true, 200]);
  assert.deepEqual([f.n.type, f.n.required, f.n.onlyInt, f.n.min], ["number", true, true, 1]);
  assert.deepEqual([f.page_id.type, f.page_id.required, f.page_id.max], ["text", true, 200]);
  assert.deepEqual([f.md.type, f.md.required, f.md.max], ["text", undefined, 200000]);
  assert.deepEqual([f.sha256.type, f.sha256.max], ["text", 64]);
  assert.equal(f.created.type, "autodate");
  assert.equal(f.updated.onUpdate, true);
  assert.ok(f.md.max >= 90572 * 2, "the largest file of v1 has 90,572 characters");
});

await check("migration up: unique index on (slug, n), an index on slug, and the rules (list and view READ_OK, create, update, delete only the superuser)", () => {
  const m = loadMigration(MIG);
  m.up();
  const c = m.collections.get("v1_placeholders");
  assert.deepEqual(Array.from(c.indexes), [
    "CREATE UNIQUE INDEX idx_v1_placeholders_slug_n ON v1_placeholders (slug, n)",
    "CREATE INDEX idx_v1_placeholders_slug ON v1_placeholders (slug)",
  ]);
  const readOk = /const READ_OK = '([^']+)';/.exec(readFileSync(path.join(pbDir, "pb_migrations", "1793300007_v2_reader_collections.js"), "utf8"))[1];
  assert.equal(readOk, '@request.auth.id != "" && (@request.auth.approved = true || @request.auth.role = "translator" || @request.auth.role = "admin")');
  assert.equal(c.listRule, readOk);
  assert.equal(c.viewRule, readOk);
  assert.deepEqual([c.createRule, c.updateRule, c.deleteRule], [null, null, null]);
});

await check("migration: safe to run twice (the second run keeps the collection and prints one line), and down deletes an empty collection and keeps one with records", () => {
  const m = loadMigration(MIG);
  m.up();
  m.up();
  assert.deepEqual(m.saves, ["v1_placeholders"]);
  assert.deepEqual(m.logs, ["v2 migration: collection v1_placeholders exists, left as it is"]);
  m.down();
  assert.deepEqual(m.deletes, ["v1_placeholders"]);
  assert.equal(m.collections.size, 0);
  m.down();
  assert.deepEqual(m.deletes, ["v1_placeholders"], "a second down with no collection does nothing");
  const full = loadMigration(MIG, { v1_placeholders: 13102 });
  full.up();
  full.down();
  assert.deepEqual(full.deletes, []);
  assert.equal(full.collections.size, 1);
  assert.deepEqual(full.logs, ["v2 migration down: collection v1_placeholders has records, kept"]);
});

await check("migration file: the header cites the owner picks, VISION 15.26.9, the unit, the read rule source, and the down function", () => {
  const { src } = loadMigration(MIG);
  for (const s of ["unit VW104", "Q-A 3:44.4", "Q-A 3:45.2", "Q-A 3:45.3", "VISION-viewer 15.26.9", "Show the placeholder on v2", "A. PocketBase collection", "1793300007", "Down function", "90,572 characters", "counts in no number and is not searched"]) assert.ok(src.includes(s), s);
});

// Unit VW118 added migration 1793300017. Unit VW120 added migration 1793300018: the folder holds 19 files, and the file of this unit is the third from last.
await check("folders: 19 migration files with unique timestamps (the file of this unit is the third from last), and the file names of the other 17 are not changed", () => {
  const files = readdirSync(path.join(pbDir, "pb_migrations")).filter((f) => f.endsWith(".js")).sort();
  assert.equal(files.length, 19);
  assert.equal(files.at(-1), "1793300018_v2_view_links.js");
  assert.equal(files.at(-2), "1793300017_v2_visual_issues.js");
  assert.equal(files.at(-3), MIG);
  assert.equal(files.at(-4), "1793300015_v2_sign_up_address.js");
  assert.equal(new Set(files.map((f) => f.split("_")[0])).size, 19);
  assert.equal(files[0], "1793300000_v2_users_rules.js");
});

await new Promise((resolve) => server.close(resolve));
await fs.rm(baseDir, { recursive: true, force: true });
done();
