/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 sign-up address (unit VW102, Q-A 3:33.3 of 2026-11-13, owner pick "Count per reader, with an app key (VW102)"):
 * PocketBase takes the client address of a request from the header X-Kendo-Client-IP.
 *
 * Why: migration 1793300014 limits sign-ups to 5 per hour for one client address. A reader signs up on the website. The Vercel server, not the
 * reader browser, sends the sign-up to PocketBase. So PocketBase sees the address of the Vercel server, and all website readers would share the 5 per hour.
 * Now the route /api/read/sign-up (app/app/api/read/sign-up/route.ts) sends the reader address in the header X-Kendo-Client-IP.
 * This migration makes PocketBase count the limit for that address.
 *
 * Owner picks that still hold (not changed here):
 *   - Q-A 3:31.2 "PocketBase rule, new migration", Q-A 3:31.3 "5 per hour", Q-A 3:31.4 "Sign-up rule only", Q-A 3:33.1 "Count all requests".
 *   - The rule of migration 1793300014 stays as it is: label users:create, audience "" (all), 3600 s, 5 requests. This file does not touch it.
 *   - Q-A 3:33.3: the hook pb_hooks/sign_up_key.pb.js refuses a public sign-up without the secret app key. Without the hook, a caller could
 *     send any address in X-Kendo-Client-IP and so escape the limit. The migration and the hook belong together. Copy both to the server.
 *
 * Settings after this migration:
 *   - trustedProxy.headers       ["X-Kendo-Client-IP"] (migration 1793300014 set ["X-Forwarded-For"])
 *   - trustedProxy.useLeftmostIP false (the rightmost valid address of the header counts)
 *   - rateLimits                 not changed
 *
 * How PocketBase 0.39.10 finds the address (source at tag v0.39.10, core/event_request.go lines 40-75, function RealIP):
 *   - It loops over the trusted headers. It takes the LAST value of the first header that is present and not empty.
 *   - It splits that value at commas. With useLeftmostIP false it takes the rightmost part that is a valid IP address (netip.ParseAddr).
 *   - A header that is missing, empty, or holds no valid address is skipped. Then PocketBase uses the remote address (e.RemoteIP()).
 *     Behind Caddy that is 127.0.0.1. So a request without the header, or with a bad value, counts for 127.0.0.1.
 *   - An IPv6 address is counted in full (StringExpanded), not by network prefix.
 *   - The rate limit middleware reads the address in checkRateLimit (apis/middlewares_rate_limit.go line 178) with e.RealIP().
 *     Nothing else in PocketBase 0.39.10 uses the trusted header for this project: the only rule is users:create (Q-A 3:31.4). Superusers are never limited.
 *
 * What a caller can do (unit VW102 test, throwaway PocketBase on port 8092):
 *   - Anyone who calls PocketBase directly can send any value in X-Kendo-Client-IP. The hook refuses the request with HTTP 403 when the app key is missing, so no account is created.
 *   - The rate limit middleware runs before the hook (apis/record_crud.go line 220, then line 346). A refused request still counts for the address that it names.
 *     So a direct caller can use up the 5 per hour of one address that he names, and that reader then gets HTTP 429. This needs the address of the reader.
 *     The same holds for the address 127.0.0.1 with requests that name no valid address. Accounts stay safe. The cost is a short block of one address.
 *   - A create call inside POST /api/batch has its own counter, because the counter key holds e.Request.Pattern (apis/middlewares_rate_limit.go line 88).
 *     A caller who holds the app key can so make up to 5 more accounts per hour and address. The website never uses batch. Only the website holds the key.
 *
 * Down function (soft): put back the trusted header of migration 1793300014: ["X-Forwarded-For"], useLeftmostIP false.
 * The rate limit rule and the counts are not changed. The counts live in memory only.
 */

migrate((app) => {
    const settings = app.settings();
    settings.trustedProxy.headers = ["X-Kendo-Client-IP"];
    settings.trustedProxy.useLeftmostIP = false;
    app.save(settings);
    console.log("v2 migration: trusted proxy header X-Kendo-Client-IP (the website sends the reader address in it), rightmost address");
}, (app) => {
    const settings = app.settings();
    settings.trustedProxy.headers = ["X-Forwarded-For"];
    settings.trustedProxy.useLeftmostIP = false;
    app.save(settings);
    console.log("v2 migration down: trusted proxy header X-Forwarded-For again (migration 1793300014)");
});
