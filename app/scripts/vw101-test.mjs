// Unit VW101 (Q-A 3:31.2 to 3:31.5): server-free tests of the sign-up rate limit.
// Part 1: pbSignUp (lib/pb.ts) and the route /api/read/sign-up map the HTTP status 429 of PocketBase to the plain message
//         "Too many sign-ups from this network. Try again later.", and the older answers (200, 400, 403, 500, 503) stay as before.
//         PocketBase is a fake: a local http server on a free port of 127.0.0.1 (no real PocketBase, no network).
// Part 2: the migration file 1793300014_v2_rate_limits.js. The test runs its up and down function against a fake settings object and checks the values.
// The live check (a real PocketBase on port 8092, the 6th sign-up gets 429) is pb-test/rate_limit_test.py of the unit folder.
// Made-up data only: example.test addresses, no real e-mail address, no real article ID.
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw101-test.mjs. It prints "<n> passed, <m> failed" and exits 1 on a failure.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import vm from "node:vm";
import { checker, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
installAppHooks(app);
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const { check, done } = checker();

const LIMIT_MESSAGE = "Too many sign-ups from this network. Try again later.";
const FALLBACK_MESSAGE = "The account was not created. Check the fields and try again.";
const PASSWORD = "made-up-password-1";

// ---------------------------------------------------------------- the fake PocketBase

/** `answer` is what the fake sends next: { status, body } (body is an object, a string, or undefined). `seen` holds the requests. */
const answer = { status: 200, body: {} };
const seen = [];
const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    seen.push({ method: req.method, url: req.url, headers: req.headers, body: raw });
    const b = answer.body;
    res.writeHead(answer.status, { "Content-Type": "application/json" });
    res.end(b === undefined ? "" : typeof b === "string" ? b : JSON.stringify(b));
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
process.env.VIEWER_CONFIG = path.join(process.env.TMPDIR ?? "/nonexistent", "vw101-no-config.json");
process.env.VIEWER_RUN_SOURCE = "pocketbase";
process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${port}`;
const say = (status, body) => {
  answer.status = status;
  answer.body = body;
  seen.length = 0;
};

const pb = await import("../lib/pb.ts");
const route = await import("../app/api/read/sign-up/route.ts");
const signUp = () => pb.pbSignUp("Made Up Reader", "reader1@example.test", PASSWORD);
const post = (json, headers = {}) =>
  route.POST(new Request("http://localhost/api/read/sign-up", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(json) }));
const good = { name: "Made Up Reader", email: "reader1@example.test", password: PASSWORD };

// ---------------------------------------------------------------- part 1: pbSignUp

await check("pbSignUp: HTTP 429 from PocketBase gives status 429 and the plain message of the owner pick (Q-A 3:31.2)", async () => {
  say(429, { status: 429, message: "Too Many Requests.", data: {} });
  assert.deepEqual(await signUp(), { ok: false, status: 429, message: LIMIT_MESSAGE });
});

await check("pbSignUp: HTTP 429 with an empty body or a text body gives the same answer", async () => {
  for (const body of [undefined, "Too many requests", "<html>429</html>"]) {
    say(429, body);
    assert.deepEqual(await signUp(), { ok: false, status: 429, message: LIMIT_MESSAGE }, String(body));
  }
});

await check("pbSignUp: the message names the cause and the wait, and shows no PocketBase text, no address, and no number", () => {
  assert.equal(LIMIT_MESSAGE.split(" ").length <= 12, true);
  assert.ok(!/\d|203\.|X-Forwarded|PocketBase|rate/i.test(LIMIT_MESSAGE));
  const src = read("lib/pb.ts");
  assert.equal(src.split(`"${LIMIT_MESSAGE}"`).length - 1, 1, "the message text sits once in lib/pb.ts");
  assert.ok(!src.includes('"The account was not created. Check the fields and try again." } && 429'));
});

await check("pbSignUp: HTTP 200 gives ok true", async () => {
  say(200, { id: "made-up-id", role: "reader", approved: false });
  assert.deepEqual(await signUp(), { ok: true });
});

await check("pbSignUp: the request is the same as before (POST users records, role reader, no approved key, no token)", async () => {
  say(200, {});
  await signUp();
  assert.equal(seen.length, 1);
  assert.equal(seen[0].method, "POST");
  assert.equal(seen[0].url, "/api/collections/users/records");
  assert.equal(seen[0].headers.authorization, undefined, "no token");
  assert.equal(seen[0].headers["x-forwarded-for"], undefined, "the app adds no address header (PocketBase counts the address that it sees)");
  const b = JSON.parse(seen[0].body);
  assert.deepEqual(Object.keys(b).sort(), ["email", "emailVisibility", "name", "password", "passwordConfirm", "role"]);
  assert.equal(b.role, "reader");
  assert.equal(b.passwordConfirm, b.password);
  assert.equal(b.emailVisibility, true);
});

await check("pbSignUp: the older answers stay (400 field errors, 503, 400 and other status codes)", async () => {
  say(400, { status: 400, data: { email: { code: "validation_not_unique" } } });
  assert.deepEqual(await signUp(), { ok: false, status: 400, message: "This email is already used. Sign in instead." });
  say(400, { status: 400, data: { email: { code: "validation_is_email" } } });
  assert.deepEqual(await signUp(), { ok: false, status: 400, message: "Enter a valid email." });
  say(400, { status: 400, data: { password: { code: "validation_length_out_of_range" } } });
  assert.deepEqual(await signUp(), { ok: false, status: 400, message: "The password must have 8 characters or more." });
  say(400, { status: 400, data: {} });
  assert.deepEqual(await signUp(), { ok: false, status: 400, message: FALLBACK_MESSAGE });
  say(503, {});
  assert.deepEqual(await signUp(), { ok: false, status: 503, message: "The sign-in server is not reachable. Try again later." });
  for (const status of [401, 403, 404, 500, 502]) {
    say(status, { status, message: "made up" });
    assert.deepEqual(await signUp(), { ok: false, status: 502, message: FALLBACK_MESSAGE }, String(status));
  }
});

await check("pbSignUp: a field error wins over the status (a 400 with email data is not a limit)", async () => {
  say(400, { status: 400, data: { email: { code: "validation_not_unique" } } });
  const r = await signUp();
  assert.ok(!r.ok && r.status === 400 && r.message !== LIMIT_MESSAGE);
});

await check("pbSignUp: a PocketBase that does not answer throws a plain PbError with status 503 (the route maps it to 503)", async () => {
  const dead = http.createServer();
  await new Promise((resolve) => dead.listen(0, "127.0.0.1", resolve));
  const deadPort = dead.address().port;
  await new Promise((resolve) => dead.close(resolve));
  const old = process.env.VIEWER_POCKETBASE_URL;
  process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${deadPort}`;
  try {
    await assert.rejects(signUp(), (e) => e.name === "PbError" && e.status === 503);
    const r = await post(good);
    assert.equal(r.status, 503);
  } finally {
    process.env.VIEWER_POCKETBASE_URL = old;
  }
});

// ---------------------------------------------------------------- part 1b: the route

await check("route: HTTP 429 of PocketBase goes through as 429 with the plain message, no store header missing", async () => {
  say(429, { status: 429, message: "Too Many Requests.", data: {} });
  const r = await post(good);
  assert.equal(r.status, 429);
  assert.deepEqual(await r.json(), { error: LIMIT_MESSAGE });
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(seen.length, 1, "one call to PocketBase");
});

await check("route: 200, 400 (field error), 503, and every other status keep their answers (200, 400, 503, 502)", async () => {
  say(200, {});
  let r = await post(good);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  say(400, { status: 400, data: { email: { code: "validation_not_unique" } } });
  r = await post(good);
  assert.equal(r.status, 400);
  assert.deepEqual(await r.json(), { error: "This email is already used. Sign in instead." });
  say(503, {});
  r = await post(good);
  assert.equal(r.status, 503);
  for (const status of [401, 403, 404, 418, 500, 502]) {
    say(status, {});
    r = await post(good);
    assert.equal(r.status, 502, String(status));
    assert.deepEqual(await r.json(), { error: FALLBACK_MESSAGE }, String(status));
  }
});

await check("route: the checks before PocketBase stay (bad fields give 400, a foreign origin 403, no JSON 415) and send nothing to PocketBase", async () => {
  say(429, {});
  let r = await post({ ...good, name: "" });
  assert.equal(r.status, 400);
  r = await post({ ...good, email: "not-an-email" });
  assert.equal(r.status, 400);
  r = await post({ ...good, password: "short" });
  assert.equal(r.status, 400);
  r = await post(good, { origin: "https://evil.example", host: "localhost" });
  assert.equal(r.status, 403);
  r = await route.POST(new Request("http://localhost/api/read/sign-up", { method: "POST", headers: { "content-type": "text/plain" }, body: "x" }));
  assert.equal(r.status, 415);
  assert.equal(seen.length, 0, "PocketBase got no call");
});

await check("route: the answer never holds the password (429 and 400)", async () => {
  for (const [status, body] of [[429, {}], [400, { data: { password: { code: "x" } } }]]) {
    say(status, body);
    const r = await post(good);
    assert.ok(!(await r.text()).includes(PASSWORD));
  }
});

await check("route: the comment of the route states the rule and cites the owner picks and the unit (the old 'Not verified' line is gone)", () => {
  const src = read("app/api/read/sign-up/route.ts");
  assert.ok(!src.includes("Not verified: a limit on the number of sign-ups"));
  assert.match(src, /unit VW101, Q-A 3:31\.2 to 3:31\.4/);
  assert.match(src, /5 sign-ups per hour/);
  assert.match(src, /429/);
});

await check("form: ReaderSignUp.tsx shows the error text of the route for every failed status, so the 429 message shows with no change to the form", () => {
  const src = read("components/ReaderSignUp.tsx");
  assert.match(src, /if \(!r\.ok\) \{\s*setError\(j\.error \?\? /);
  assert.match(src, /role="alert"/);
  assert.ok(!/\b(status|429)\b.*===/.test(src.replace(/\/\/.*$/gm, "")), "the form has no status switch of its own");
});

// ---------------------------------------------------------------- part 2: the migration file

const migrationDirs = [path.resolve(app, "..", "pocketbase", "pb_migrations"), path.resolve(app, "..", "data", "scripts", "pocketbase", "pb_migrations")];
const dir = migrationDirs.find((d) => existsSync(d));
const FILE = "1793300014_v2_rate_limits.js";

/** Run the migration file in a sandbox with a fake `migrate` and a fake app. Returns the settings after up and after down. */
function runMigration() {
  const src = readFileSync(path.join(dir, FILE), "utf8");
  const calls = [];
  const logs = [];
  let up;
  let down;
  const sandbox = { migrate: (u, d) => ((up = u), (down = d)), console: { log: (...a) => logs.push(a.join(" ")) } };
  vm.runInNewContext(src, sandbox, { filename: FILE });
  const fresh = () => ({
    batch: { enabled: true },
    rateLimits: { enabled: false, excludedIPs: [], rules: [{ label: "*:auth", audience: "", duration: 3, maxRequests: 2 }, { label: "*:create", audience: "", duration: 5, maxRequests: 20 }, { label: "/api/batch", audience: "", duration: 1, maxRequests: 3 }, { label: "/api/", audience: "", duration: 10, maxRequests: 300 }] },
    trustedProxy: { headers: [], useLeftmostIP: false },
  });
  const settings = fresh();
  const fakeApp = { settings: () => settings, save: (s) => calls.push(JSON.parse(JSON.stringify(s))) };
  up(fakeApp);
  const afterUp = calls.at(-1);
  down(fakeApp);
  const afterDown = calls.at(-1);
  // Run up twice on the state after down: the same state as the first time.
  up(fakeApp);
  const afterUpAgain = calls.at(-1);
  return { afterUp, afterDown, afterUpAgain, saves: calls.length, logs, src };
}

await check("migration folder: the 15 files are in the folder, the new one is the last, and the timestamps are unique", () => {
  assert.ok(dir, "no migration folder found");
  const files = readdirSync(dir).filter((f) => f.endsWith(".js")).sort();
  assert.equal(files.length, 15);
  assert.equal(files.at(-1), FILE);
  assert.equal(new Set(files.map((f) => f.split("_")[0])).size, 15);
  assert.equal(files[0], "1793300000_v2_users_rules.js");
});

await check("migration up: limiter on, ONE rule users:create / all audiences (audience empty) / 3600 s / 5 requests, trusted header X-Forwarded-For with the rightmost address, one save", () => {
  const { afterUp, saves } = runMigration();
  assert.equal(afterUp.rateLimits.enabled, true);
  assert.deepEqual(afterUp.rateLimits.rules, [{ label: "users:create", audience: "", duration: 3600, maxRequests: 5 }]);
  assert.deepEqual(afterUp.trustedProxy, { headers: ["X-Forwarded-For"], useLeftmostIP: false });
  assert.equal(saves, 3, "one save for each call (up, down, up)");
});

await check("migration up: the 4 PocketBase default rules are gone, the exclusion list and the batch setting are not touched", () => {
  const { afterUp } = runMigration();
  for (const label of ["*:auth", "*:create", "/api/batch", "/api/"]) assert.ok(!afterUp.rateLimits.rules.some((r) => r.label === label), label);
  assert.deepEqual(afterUp.rateLimits.excludedIPs, []);
  assert.deepEqual(afterUp.batch, { enabled: true });
});

await check("migration down: limiter off, the 4 PocketBase default rules back (values of core/settings_model.go lines 179-183), no trusted header", () => {
  const { afterDown } = runMigration();
  assert.equal(afterDown.rateLimits.enabled, false);
  assert.deepEqual(afterDown.rateLimits.rules, [
    { label: "*:auth", audience: "", duration: 3, maxRequests: 2 },
    { label: "*:create", audience: "", duration: 5, maxRequests: 20 },
    { label: "/api/batch", audience: "", duration: 1, maxRequests: 3 },
    { label: "/api/", audience: "", duration: 10, maxRequests: 300 },
  ]);
  assert.deepEqual(afterDown.trustedProxy, { headers: [], useLeftmostIP: false });
});

await check("migration: up after down gives the same state as the first up (safe to run twice)", () => {
  const { afterUp, afterUpAgain } = runMigration();
  assert.deepEqual(afterUpAgain, afterUp);
});

await check("migration file: the header cites the owner picks Q-A 3:31.2, 3:31.3, 3:31.4, the unit, the source lines, and the down function", () => {
  const { src } = runMigration();
  for (const s of ["unit VW101", "Q-A 3:31.2", "Q-A 3:31.3", "Q-A 3:31.4", "core/settings_model.go", "apis/middlewares_rate_limit.go", "core/event_request.go", "Down function"]) assert.ok(src.includes(s), s);
});

await check("no real e-mail address, no password, and no real article ID in the new and changed parts", () => {
  const { src } = runMigration();
  const all = [src, read("scripts/vw101-test.mjs"), read("app/api/read/sign-up/route.ts")].join("\n");
  const addresses = all.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
  for (const a of addresses) assert.ok(/@example\.test$|@vw101-test\.local$/.test(a), `address ${a}`);
  assert.ok(!/\b\d{4}-\d{4}-\d{4}\b/.test(all), "article id");
});

server.close();
done();
