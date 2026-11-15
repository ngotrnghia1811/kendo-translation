// Unit VW102 (Q-A 3:33.3 "Count per reader, with an app key (VW102)"): server-free tests of the sign-up address and the app key.
// Part 1: the config key VIEWER_SIGN_UP_KEY (lib/config.ts loadSignUpKey).
// Part 2: the pure helpers of lib/sign-up-guard.ts (address check, address from the Vercel headers, the two PocketBase headers).
// Part 3: pbSignUp (lib/pb.ts) and the route /api/read/sign-up against a fake PocketBase (a local http server on a free port of 127.0.0.1).
// Part 4: the hook pb_hooks/sign_up_key.pb.js, run in a sandbox with fake PocketBase functions. The live check is pb-test/sign_up_key_test.py (port 8092).
// Part 5: the migration 1793300015, run in a sandbox against a fake settings object, and the file counts of the two folders.
// Made-up data only: example.test addresses, documentation addresses 203.0.113.x, 198.51.100.x, 2001:db8::. The app key of this test is random and lives in memory.
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw102-test.mjs. It prints "<n> passed, <m> failed" and exits 1 on a failure.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import vm from "node:vm";
import { checker, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
installAppHooks(app);
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const { check, done } = checker();

const KEY = randomBytes(32).toString("hex"); // 64 characters, random, never printed, never written
const OTHER_KEY = randomBytes(32).toString("hex");
const PASSWORD = "made-up-password-1";
const CLOSED_MESSAGE = "Sign-up is closed on this server. Try again later.";
const LIMIT_MESSAGE = "Too many sign-ups from this network. Try again later.";
const FALLBACK_MESSAGE = "The account was not created. Check the fields and try again.";

// ---------------------------------------------------------------- the fake PocketBase

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
process.env.VIEWER_CONFIG = path.join(process.env.TMPDIR ?? "/nonexistent", "vw102-no-config.json");
process.env.VIEWER_RUN_SOURCE = "pocketbase";
process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${port}`;
delete process.env.VIEWER_SIGN_UP_KEY;
const say = (status, body) => {
  answer.status = status;
  answer.body = body;
  seen.length = 0;
};

const config = await import("../lib/config.ts");
const guard = await import("../lib/sign-up-guard.ts");
const pb = await import("../lib/pb.ts");
const route = await import("../app/api/read/sign-up/route.ts");
const post = (json, headers = {}) =>
  route.POST(new Request("http://localhost/api/read/sign-up", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(json) }));
const good = { name: "Made Up Reader", email: "reader1@example.test", password: PASSWORD };
const withKey = async (key, fn) => {
  const old = process.env.VIEWER_SIGN_UP_KEY;
  if (key === undefined) delete process.env.VIEWER_SIGN_UP_KEY;
  else process.env.VIEWER_SIGN_UP_KEY = key;
  try {
    return await fn();
  } finally {
    if (old === undefined) delete process.env.VIEWER_SIGN_UP_KEY;
    else process.env.VIEWER_SIGN_UP_KEY = old;
  }
};
/** Run `fn` and return every console line that it wrote (log, info, warn, error, debug). */
async function captureConsole(fn) {
  const lines = [];
  const saved = {};
  for (const m of ["log", "info", "warn", "error", "debug"]) {
    saved[m] = console[m];
    console[m] = (...a) => lines.push(a.map(String).join(" "));
  }
  try {
    await fn();
  } finally {
    for (const m of Object.keys(saved)) console[m] = saved[m];
  }
  return lines;
}

// ---------------------------------------------------------------- part 1: the config key

await check("config: VIEWER_SIGN_UP_KEY not set, empty, or only spaces gives undefined (no default value)", async () => {
  for (const v of [undefined, "", "   "]) assert.equal(await withKey(v, () => config.loadSignUpKey()), undefined, JSON.stringify(v));
});

await check("config: a key of 32 or more characters is returned, trimmed", async () => {
  assert.equal(await withKey(KEY, () => config.loadSignUpKey()), KEY);
  assert.equal(await withKey("  " + KEY + "\n", () => config.loadSignUpKey()), KEY);
  assert.equal(await withKey("k".repeat(32), () => config.loadSignUpKey()), "k".repeat(32));
  assert.equal(config.MIN_SIGN_UP_KEY, 32);
});

await check("config: a key of fewer than 32 characters throws a plain error that holds no part of the key", async () => {
  const short = "short-key-" + randomBytes(6).toString("hex");
  await withKey(short, () => {
    assert.throws(() => config.loadSignUpKey(), (e) => /VIEWER_SIGN_UP_KEY must have at least 32 characters/.test(e.message) && !e.message.includes(short));
  });
});

// ---------------------------------------------------------------- part 2: the helpers

await check("guard: validClientIp accepts IPv4 and IPv6 text and trims it", () => {
  for (const v of ["203.0.113.7", "198.51.100.77", "2001:db8::1", "2001:0db8:0000:0000:0000:0000:0000:0001", "::1", "  203.0.113.7  "]) assert.equal(guard.validClientIp(v), v.trim(), v);
});

await check("guard: validClientIp refuses text that is no address (empty, number out of range, port, zone id, header injection, too long, null)", () => {
  for (const v of ["", "   ", "999.1.1.1", "1.2.3", "203.0.113.7:8080", "203.0.113.7/24", "fe80::1%en0", "1.2.3.4\r\nX-Evil: 1", "not-an-ip", "203.0.113.7, 198.51.100.9", "a".repeat(80), "1.2.3.04", null, undefined]) {
    assert.equal(guard.validClientIp(v), null, JSON.stringify(v));
  }
});

await check("guard: readerAddress reads x-forwarded-for (the Vercel header, source https://vercel.com/docs/headers/request-headers)", () => {
  const h = (o) => new Headers(o);
  assert.equal(guard.readerAddress(h({ "x-forwarded-for": "203.0.113.7" })), "203.0.113.7");
  assert.equal(guard.readerAddress(h({ "x-forwarded-for": "2001:db8::1" })), "2001:db8::1");
});

await check("guard: readerAddress takes the rightmost valid address of several, the same rule as PocketBase (useLeftmostIP false)", () => {
  const h = (v) => new Headers({ "x-forwarded-for": v });
  assert.equal(guard.readerAddress(h("198.51.100.9, 203.0.113.7")), "203.0.113.7");
  assert.equal(guard.readerAddress(h("198.51.100.9, 203.0.113.7, unknown")), "203.0.113.7");
  assert.equal(guard.readerAddress(h("203.0.113.7,garbage")), "203.0.113.7");
});

await check("guard: readerAddress falls back to x-real-ip, and gives null for no header or a bad value", () => {
  assert.equal(guard.readerAddress(new Headers({ "x-real-ip": "203.0.113.8" })), "203.0.113.8");
  assert.equal(guard.readerAddress(new Headers({ "x-forwarded-for": "garbage", "x-real-ip": "203.0.113.8" })), "203.0.113.8");
  assert.equal(guard.readerAddress(new Headers()), null);
  assert.equal(guard.readerAddress(new Headers({ "x-forwarded-for": "garbage" })), null);
  assert.equal(guard.readerAddress(new Headers({ "x-forwarded-for": "" })), null);
});

await check("guard: signUpHeaders sends the key only when it is set and the address only when it is valid", () => {
  assert.deepEqual(guard.signUpHeaders(KEY, "203.0.113.7"), { "X-Kendo-Sign-Up-Key": KEY, "X-Kendo-Client-IP": "203.0.113.7" });
  assert.deepEqual(guard.signUpHeaders(undefined, "203.0.113.7"), { "X-Kendo-Client-IP": "203.0.113.7" });
  assert.deepEqual(guard.signUpHeaders(KEY, null), { "X-Kendo-Sign-Up-Key": KEY });
  assert.deepEqual(guard.signUpHeaders(KEY, "not-an-ip"), { "X-Kendo-Sign-Up-Key": KEY });
  assert.deepEqual(guard.signUpHeaders(undefined, null), {});
  assert.equal(guard.SIGN_UP_KEY_HEADER, "X-Kendo-Sign-Up-Key");
  assert.equal(guard.CLIENT_IP_HEADER, "X-Kendo-Client-IP");
});

// ---------------------------------------------------------------- part 3: pbSignUp and the route

await check("pbSignUp: with the key set and a reader address, PocketBase gets both headers and the same body as before", async () => {
  await withKey(KEY, async () => {
    say(200, { id: "made-up-id" });
    assert.deepEqual(await pb.pbSignUp("Made Up Reader", "reader1@example.test", PASSWORD, "203.0.113.7"), { ok: true });
    assert.equal(seen.length, 1);
    assert.equal(seen[0].method, "POST");
    assert.equal(seen[0].url, "/api/collections/users/records");
    assert.equal(seen[0].headers["x-kendo-sign-up-key"], KEY);
    assert.equal(seen[0].headers["x-kendo-client-ip"], "203.0.113.7");
    assert.equal(seen[0].headers.authorization, undefined, "no user token");
    assert.equal(seen[0].headers["x-forwarded-for"], undefined, "the app does not set X-Forwarded-For");
    const b = JSON.parse(seen[0].body);
    assert.deepEqual(Object.keys(b).sort(), ["email", "emailVisibility", "name", "password", "passwordConfirm", "role"]);
    assert.equal(b.role, "reader");
    assert.ok(!seen[0].body.includes(KEY), "the key is in a header, not in the body");
  });
});

await check("pbSignUp: with no key set (this Mac) no key header goes out, and with no address no address header goes out", async () => {
  await withKey(undefined, async () => {
    say(200, {});
    await pb.pbSignUp("Made Up Reader", "reader1@example.test", PASSWORD);
    assert.equal(seen[0].headers["x-kendo-sign-up-key"], undefined);
    assert.equal(seen[0].headers["x-kendo-client-ip"], undefined);
    say(200, {});
    await pb.pbSignUp("Made Up Reader", "reader1@example.test", PASSWORD, "203.0.113.7");
    assert.equal(seen[0].headers["x-kendo-sign-up-key"], undefined);
    assert.equal(seen[0].headers["x-kendo-client-ip"], "203.0.113.7");
    say(200, {});
    await pb.pbSignUp("Made Up Reader", "reader1@example.test", PASSWORD, "not an address\r\nX-Evil: 1");
    assert.equal(seen[0].headers["x-kendo-client-ip"], undefined);
    assert.equal(seen[0].headers["x-evil"], undefined);
  });
});

await check("pbSignUp: a key that is too short sends nothing to PocketBase and throws the plain error", async () => {
  await withKey("too-short", async () => {
    say(200, {});
    await assert.rejects(pb.pbSignUp("Made Up Reader", "reader1@example.test", PASSWORD, "203.0.113.7"), /VIEWER_SIGN_UP_KEY must have at least 32 characters/);
    assert.equal(seen.length, 0);
  });
});

await check("pbSignUp: the refusal of the hook (HTTP 403 with the data code sign_up_key_refused) gives status 503 and the plain closed message", async () => {
  await withKey(KEY, async () => {
    say(403, { status: 403, message: "Sign-up is closed on this server.", data: { signUpKey: { code: "sign_up_key_refused", message: "A sign-up needs the app key of the website." } } });
    assert.deepEqual(await pb.pbSignUp("Made Up Reader", "reader1@example.test", PASSWORD, "203.0.113.7"), { ok: false, status: 503, message: CLOSED_MESSAGE });
  });
});

await check("pbSignUp: a 403 with no such code keeps the old message (the test of unit VW101 needs it), and 429 keeps its message", async () => {
  await withKey(KEY, async () => {
    for (const body of [{ status: 403, message: "made up" }, { status: 403, data: {} }, { status: 403, data: { signUpKey: { code: "other" } } }, undefined, "text"]) {
      say(403, body);
      assert.deepEqual(await pb.pbSignUp("Made Up Reader", "reader1@example.test", PASSWORD), { ok: false, status: 502, message: FALLBACK_MESSAGE });
    }
    say(429, { status: 429, message: "Too Many Requests.", data: {} });
    assert.deepEqual(await pb.pbSignUp("Made Up Reader", "reader1@example.test", PASSWORD), { ok: false, status: 429, message: LIMIT_MESSAGE });
  });
});

await check("messages: the closed message is plain (12 words or fewer, no number, no address, no word PocketBase, no word key), and sits once in lib/pb.ts", () => {
  assert.ok(CLOSED_MESSAGE.split(" ").length <= 12);
  assert.ok(!/\d|203\.|X-Kendo|PocketBase|\bkey\b|hook|403/i.test(CLOSED_MESSAGE));
  const src = read("lib/pb.ts");
  assert.equal(src.split(`"${CLOSED_MESSAGE}"`).length - 1, 1);
  assert.equal(src.split(`"${LIMIT_MESSAGE}"`).length - 1, 1, "the limit message sits once, as before");
});

await check("route: the reader address of x-forwarded-for goes to PocketBase in X-Kendo-Client-IP, with the key", async () => {
  await withKey(KEY, async () => {
    say(200, {});
    const r = await post(good, { "x-forwarded-for": "203.0.113.7" });
    assert.equal(r.status, 200);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].headers["x-kendo-client-ip"], "203.0.113.7");
    assert.equal(seen[0].headers["x-kendo-sign-up-key"], KEY);
    say(200, {});
    await post(good, { "x-forwarded-for": "198.51.100.9" });
    assert.equal(seen[0].headers["x-kendo-client-ip"], "198.51.100.9", "another reader, another address");
    say(200, {});
    await post(good, { "x-forwarded-for": "2001:db8::1" });
    assert.equal(seen[0].headers["x-kendo-client-ip"], "2001:db8::1");
    say(200, {});
    await post(good, { "x-real-ip": "203.0.113.8" });
    assert.equal(seen[0].headers["x-kendo-client-ip"], "203.0.113.8");
  });
});

await check("route: with no address header (this Mac) or a bad one, no address header goes to PocketBase and the sign-up still goes through", async () => {
  await withKey(KEY, async () => {
    for (const h of [{}, { "x-forwarded-for": "garbage" }, { "x-forwarded-for": "" }]) {
      say(200, {});
      const r = await post(good, h);
      assert.equal(r.status, 200);
      assert.equal(seen[0].headers["x-kendo-client-ip"], undefined, JSON.stringify(h));
    }
  });
});

await check("route: a header X-Kendo-Client-IP or X-Kendo-Sign-Up-Key in the request of the browser is never passed on", async () => {
  await withKey(KEY, async () => {
    say(200, {});
    await post(good, { "x-kendo-client-ip": "198.51.100.200", "x-kendo-sign-up-key": OTHER_KEY, "x-forwarded-for": "203.0.113.7" });
    assert.equal(seen[0].headers["x-kendo-client-ip"], "203.0.113.7");
    assert.equal(seen[0].headers["x-kendo-sign-up-key"], KEY);
    await withKey(undefined, async () => {
      say(200, {});
      await post(good, { "x-kendo-sign-up-key": OTHER_KEY });
      assert.equal(seen[0].headers["x-kendo-sign-up-key"], undefined);
    });
  });
});

await check("route: the refusal of the hook answers HTTP 503 with the closed message, and 429 stays 429", async () => {
  await withKey(KEY, async () => {
    say(403, { status: 403, message: "Sign-up is closed on this server.", data: { signUpKey: { code: "sign_up_key_refused" } } });
    let r = await post(good, { "x-forwarded-for": "203.0.113.7" });
    assert.equal(r.status, 503);
    assert.deepEqual(await r.json(), { error: CLOSED_MESSAGE });
    assert.equal(r.headers.get("cache-control"), "no-store");
    say(429, { status: 429 });
    r = await post(good, { "x-forwarded-for": "203.0.113.7" });
    assert.equal(r.status, 429);
    assert.deepEqual(await r.json(), { error: LIMIT_MESSAGE });
  });
});

await check("route: the checks before PocketBase stay (bad fields 400, foreign origin 403, no JSON 415) and send nothing to PocketBase", async () => {
  await withKey(KEY, async () => {
    say(200, {});
    let r = await post({ ...good, name: "" }, { "x-forwarded-for": "203.0.113.7" });
    assert.equal(r.status, 400);
    r = await post({ ...good, email: "not-an-email" });
    assert.equal(r.status, 400);
    r = await post({ ...good, password: "short" });
    assert.equal(r.status, 400);
    r = await post(good, { origin: "https://evil.example", host: "localhost", "x-forwarded-for": "203.0.113.7" });
    assert.equal(r.status, 403);
    r = await route.POST(new Request("http://localhost/api/read/sign-up", { method: "POST", headers: { "content-type": "text/plain" }, body: "x" }));
    assert.equal(r.status, 415);
    assert.equal(seen.length, 0, "PocketBase got no call");
  });
});

await check("route: the app key and the password appear in no console line and in no answer, for 200, 400, 403, 429, 503 and a short key", async () => {
  const all = [];
  const lines = await captureConsole(async () => {
    await withKey(KEY, async () => {
      for (const [status, body] of [[200, {}], [400, { data: { password: { code: "x" } } }], [403, { data: { signUpKey: { code: "sign_up_key_refused" } } }], [403, {}], [429, {}], [503, {}], [500, "x"]]) {
        say(status, body);
        const r = await post(good, { "x-forwarded-for": "203.0.113.7" });
        all.push(await r.text());
      }
    });
    await withKey("too-short-" + OTHER_KEY.slice(0, 8), async () => {
      const r = await post(good, { "x-forwarded-for": "203.0.113.7" });
      all.push(await r.text());
    });
  });
  for (const text of [...all, ...lines]) {
    assert.ok(!text.includes(KEY), "the key is in a line");
    assert.ok(!text.includes(PASSWORD), "the password is in a line");
    assert.ok(!text.includes(OTHER_KEY.slice(0, 8)), "part of a short key is in a line");
  }
});

await check("route: the comment of the route cites the unit, the owner pick, the Vercel source, and keeps the VW101 lines", () => {
  const src = read("app/api/read/sign-up/route.ts");
  for (const s of ["Unit VW102", "Q-A 3:33.3", "https://vercel.com/docs/headers/request-headers", "unit VW101, Q-A 3:31.2 to 3:31.4", "5 sign-ups per hour", "429", "1793300015", "sign_up_key.pb.js"]) assert.ok(src.includes(s), s);
  assert.ok(!src.includes("Not verified: which address PocketBase counts"));
});

// ---------------------------------------------------------------- part 4: the hook

const pbDirs = [path.resolve(app, "..", "pocketbase"), path.resolve(app, "..", "data", "scripts", "pocketbase")];
const pbDir = pbDirs.find((d) => existsSync(path.join(d, "pb_hooks")));
const HOOK = "sign_up_key.pb.js";

/** Run the hook file in a sandbox. `env` is the fake environment of the PocketBase process. Returns the handler, the collection names, and the log lines. */
function loadHook(env) {
  const src = readFileSync(path.join(pbDir, "pb_hooks", HOOK), "utf8");
  const logs = [];
  const registered = [];
  class ForbiddenError extends Error {
    constructor(message, data) {
      super(message);
      this.status = 403;
      this.data = data;
    }
  }
  // Like the PocketBase JSVM: PocketBase shows a data value as its code and message only when the value is a ValidationError.
  class ValidationError {
    constructor(code, message) {
      this.code = code;
      this.message = message;
    }
  }
  const sandbox = {
    console: { log: (...a) => logs.push(a.join(" ")) },
    $os: { getenv: (name) => env[name] ?? "" },
    $security: { equal: (a, b) => a === b },
    ForbiddenError,
    ValidationError,
    onRecordCreateRequest: (handler, ...collections) => registered.push({ handler, collections }),
  };
  vm.runInNewContext(src, sandbox, { filename: HOOK });
  return { registered, logs, src, ForbiddenError };
}

/**
 * A fake record create request event. `superuser` true: the request holds a superuser token. `header`: the value of X-Kendo-Sign-Up-Key.
 * It has no `request` field, like the real event in the PocketBase JSVM (the 8092 test found that `e.request` is undefined there).
 * requestInfo().headers holds the first value of each header with a lower case name and "_" for "-" (core/event_request.go lines 135 to 141).
 */
function fakeEvent({ superuser = false, header } = {}) {
  let nextCalls = 0;
  return {
    hasSuperuserAuth: () => superuser,
    requestInfo: () => ({ headers: header === undefined ? {} : { x_kendo_sign_up_key: header } }),
    next: () => {
      nextCalls++;
      return "next-result";
    },
    nextCalls: () => nextCalls,
  };
}

await check("hook: one handler for onRecordCreateRequest, on the collection users only", () => {
  const { registered } = loadHook({ SIGN_UP_KEY: KEY });
  assert.equal(registered.length, 1);
  assert.deepEqual(registered[0].collections, ["users"]);
  assert.equal(typeof registered[0].handler, "function");
});

await check("hook: the right key passes (e.next() is called once), a wrong key, a shorter key, an empty header, and no header are refused with HTTP 403 and the data code", () => {
  const { registered, ForbiddenError } = loadHook({ SIGN_UP_KEY: KEY });
  const handler = registered[0].handler;
  const ok = fakeEvent({ header: KEY });
  assert.equal(handler(ok), "next-result");
  assert.equal(ok.nextCalls(), 1);
  for (const header of [OTHER_KEY, KEY.slice(0, 40), KEY + "x", "", undefined, KEY.toUpperCase()]) {
    const e = fakeEvent({ header });
    assert.throws(() => handler(e), (err) => err instanceof ForbiddenError && err.status === 403 && err.data?.signUpKey?.code === "sign_up_key_refused", JSON.stringify(header));
    assert.equal(e.nextCalls(), 0);
  }
});

await check("hook: a superuser request passes with no key (S2 sync and pb_users.py), also when the key is missing on the server", () => {
  for (const env of [{ SIGN_UP_KEY: KEY }, {}, { SIGN_UP_KEY: "short" }]) {
    const { registered } = loadHook(env);
    const e = fakeEvent({ superuser: true });
    assert.equal(registered[0].handler(e), "next-result");
    assert.equal(e.nextCalls(), 1);
  }
});

await check("hook: fail closed. With SIGN_UP_KEY missing, empty, or shorter than 32 characters, every public request is refused, also one that sends the same short text", () => {
  for (const key of [undefined, "", "short-key", "k".repeat(31)]) {
    const env = key === undefined ? {} : { SIGN_UP_KEY: key };
    const { registered, ForbiddenError } = loadHook(env);
    for (const header of [undefined, "", key ?? "", OTHER_KEY]) {
      const e = fakeEvent({ header });
      assert.throws(() => registered[0].handler(e), (err) => err instanceof ForbiddenError && err.status === 403, JSON.stringify([key, header]));
      assert.equal(e.nextCalls(), 0);
    }
  }
  const { registered } = loadHook({ SIGN_UP_KEY: "k".repeat(32) });
  assert.equal(registered[0].handler(fakeEvent({ header: "k".repeat(32) })), "next-result", "32 characters is the least that works");
});

await check("hook: one log line at start (key set, or key missing). No log line holds the key or a sent value, and the refusal writes no line", () => {
  const set = loadHook({ SIGN_UP_KEY: KEY });
  assert.equal(set.logs.length, 1);
  assert.match(set.logs[0], /SIGN_UP_KEY is set/);
  const missing = loadHook({});
  assert.equal(missing.logs.length, 1);
  assert.match(missing.logs[0], /not set or has fewer than 32 characters/);
  for (const hook of [set, missing]) {
    for (const header of [OTHER_KEY, KEY, ""]) {
      try {
        hook.registered[0].handler(fakeEvent({ header }));
      } catch {
        // a refusal is expected
      }
    }
    assert.equal(hook.logs.length, 1, "the handler writes no log line");
    for (const line of hook.logs) assert.ok(!line.includes(KEY) && !line.includes(OTHER_KEY));
  }
});

await check("hook file: it compares with $security.equal (constant time), reads $os.getenv('SIGN_UP_KEY') inside the handler, and cites the owner pick and the PocketBase sources", () => {
  const { src } = loadHook({ SIGN_UP_KEY: KEY });
  const handler = src.slice(src.indexOf("onRecordCreateRequest((e) => {"));
  assert.ok(handler.includes("$security.equal("));
  assert.ok(handler.includes('$os.getenv("SIGN_UP_KEY")'));
  assert.ok(handler.includes('e.requestInfo().headers["x_kendo_sign_up_key"]'));
  assert.ok(!handler.includes("e.request."), "a record event has no e.request in the JSVM");
  assert.ok(handler.includes('new ValidationError("sign_up_key_refused"'), "the data value is a ValidationError, else PocketBase shows validation_invalid_value");
  assert.ok(handler.includes("e.hasSuperuserAuth()"));
  assert.ok(!/console\.|\$app\.logger/.test(handler), "no log call inside the handler");
  for (const s of ["unit VW102", "Q-A 3:33.3", "apis/record_crud.go", "line 220", "line 346", "https://pocketbase.io/docs/js-event-hooks/", "SIGN_UP_KEY", "fail closed", "Fail closed".toLowerCase()]) assert.ok(src.includes(s) || src.toLowerCase().includes(s.toLowerCase()), s);
});

await check("hook file and guard use the same header names, and the migration names the address header", () => {
  const hook = readFileSync(path.join(pbDir, "pb_hooks", HOOK), "utf8");
  const migration = readFileSync(path.join(pbDir, "pb_migrations", "1793300015_v2_sign_up_address.js"), "utf8");
  assert.ok(hook.includes(guard.SIGN_UP_KEY_HEADER));
  assert.ok(migration.includes(guard.CLIENT_IP_HEADER));
  assert.ok(read("lib/sign-up-guard.ts").includes(`"${guard.SIGN_UP_KEY_HEADER}"`));
});

// ---------------------------------------------------------------- part 5: the migrations and the folders

const MIGRATION = "1793300015_v2_sign_up_address.js";
const PREVIOUS = "1793300014_v2_rate_limits.js";

/** Load a migration file in a sandbox with a fake `migrate`. */
function loadMigration(file) {
  const src = readFileSync(path.join(pbDir, "pb_migrations", file), "utf8");
  const logs = [];
  let up;
  let down;
  const sandbox = { migrate: (u, d) => ((up = u), (down = d)), console: { log: (...a) => logs.push(a.join(" ")) } };
  vm.runInNewContext(src, sandbox, { filename: file });
  return { up, down, logs, src };
}

const freshSettings = () => ({
  batch: { enabled: true },
  rateLimits: { enabled: false, excludedIPs: [], rules: [{ label: "*:auth", audience: "", duration: 3, maxRequests: 2 }, { label: "*:create", audience: "", duration: 5, maxRequests: 20 }, { label: "/api/batch", audience: "", duration: 1, maxRequests: 3 }, { label: "/api/", audience: "", duration: 10, maxRequests: 300 }] },
  trustedProxy: { headers: [], useLeftmostIP: false },
});
/** A fake app: settings() returns the one object, save() records a copy. */
function fakeApp(settings) {
  const saves = [];
  return { settings: () => settings, save: (s) => saves.push(JSON.parse(JSON.stringify(s))), saves };
}

await check("migration 1793300015 up: trusted header X-Kendo-Client-IP with the rightmost address, one save, rate limit rule untouched", () => {
  const m14 = loadMigration(PREVIOUS);
  const m15 = loadMigration(MIGRATION);
  const settings = freshSettings();
  const a = fakeApp(settings);
  m14.up(a);
  const after14 = JSON.parse(JSON.stringify(settings));
  m15.up(a);
  assert.equal(a.saves.length, 2);
  const after15 = a.saves.at(-1);
  assert.deepEqual(after15.trustedProxy, { headers: ["X-Kendo-Client-IP"], useLeftmostIP: false });
  assert.deepEqual(after15.rateLimits, after14.rateLimits, "the rule of 1793300014 is not changed");
  assert.deepEqual(after15.rateLimits.rules, [{ label: "users:create", audience: "", duration: 3600, maxRequests: 5 }]);
  assert.deepEqual(after15.batch, { enabled: true });
  assert.equal(m15.logs.length, 1);
});

await check("migration 1793300015 down: the trusted header X-Forwarded-For of 1793300014 is back, and the state equals the state after 1793300014 up", () => {
  const m14 = loadMigration(PREVIOUS);
  const m15 = loadMigration(MIGRATION);
  const settings = freshSettings();
  const a = fakeApp(settings);
  m14.up(a);
  const after14 = JSON.parse(JSON.stringify(settings));
  m15.up(a);
  m15.down(a);
  assert.deepEqual(a.saves.at(-1).trustedProxy, { headers: ["X-Forwarded-For"], useLeftmostIP: false });
  assert.deepEqual(a.saves.at(-1), after14);
});

await check("migration 1793300015: up after down gives the same state as the first up (safe to run twice), and down of both goes back to no header", () => {
  const m14 = loadMigration(PREVIOUS);
  const m15 = loadMigration(MIGRATION);
  const settings = freshSettings();
  const a = fakeApp(settings);
  m14.up(a);
  m15.up(a);
  const first = a.saves.at(-1);
  m15.down(a);
  m15.up(a);
  assert.deepEqual(a.saves.at(-1), first);
  m15.down(a);
  m14.down(a);
  assert.deepEqual(a.saves.at(-1).trustedProxy, { headers: [], useLeftmostIP: false });
  assert.equal(a.saves.at(-1).rateLimits.enabled, false);
});

await check("migration file 1793300015: the header cites the owner picks, the unit, the source lines, the residual risk, and the down function", () => {
  const { src } = loadMigration(MIGRATION);
  for (const s of ["unit VW102", "Q-A 3:33.3", "Q-A 3:31.3", "Q-A 3:33.1", "core/event_request.go lines 40-75", "apis/middlewares_rate_limit.go line 178", "apis/record_crud.go line 220", "line 346", "pb_hooks/sign_up_key.pb.js", "Down function", "X-Forwarded-For", "127.0.0.1"]) assert.ok(src.includes(s), s);
});

await check("migration 1793300014 is not changed (the rule and the X-Forwarded-For header stay as VW101 built them)", () => {
  const { src } = loadMigration(PREVIOUS);
  assert.ok(src.includes('const SIGN_UP_RULE = { label: "users:create", audience: "", duration: 3600, maxRequests: 5 };'));
  assert.ok(src.includes('settings.trustedProxy.headers = ["X-Forwarded-For"];'));
});

// Unit VW104 added migration 1793300016: the folder holds 17 files, and the file of this unit is the second from last.
await check("folders: 17 migration files with unique timestamps (the file of this unit is the second from last), and 2 hook files", () => {
  const files = readdirSync(path.join(pbDir, "pb_migrations")).filter((f) => f.endsWith(".js")).sort();
  assert.equal(files.length, 17);
  assert.equal(files.at(-1), "1793300016_v2_v1_placeholders.js");
  assert.equal(files.at(-2), MIGRATION);
  assert.equal(files.at(-3), PREVIOUS);
  assert.equal(new Set(files.map((f) => f.split("_")[0])).size, 17);
  assert.equal(files[0], "1793300000_v2_users_rules.js");
  const hooks = readdirSync(path.join(pbDir, "pb_hooks")).filter((f) => f.endsWith(".pb.js")).sort();
  assert.deepEqual(hooks, ["page_images.pb.js", HOOK]);
});

await check("no real e-mail address, no key-like value, and no real article ID in the new and changed parts", () => {
  const all = [
    read("lib/sign-up-guard.ts"), read("lib/pb.ts"), read("lib/config.ts"), read("app/api/read/sign-up/route.ts"), read("scripts/vw102-test.mjs"),
    readFileSync(path.join(pbDir, "pb_hooks", HOOK), "utf8"), readFileSync(path.join(pbDir, "pb_migrations", MIGRATION), "utf8"),
  ].join("\n");
  const addresses = all.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
  for (const a of addresses) assert.ok(/@example\.test$|@vw101-test\.local$|@vw102-test\.local$/.test(a), `address ${a}`);
  assert.ok(!/\b[0-9a-f]{64}\b/.test(all), "a 64-character hex value");
  assert.ok(!/\b\d{4}-\d{4}-\d{4}\b/.test(all), "article id");
});

server.close();
done();
