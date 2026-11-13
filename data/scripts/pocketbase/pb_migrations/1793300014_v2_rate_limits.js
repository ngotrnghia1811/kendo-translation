/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 sign-up rate limit (unit VW101, Q-A 3:31.2 to 3:31.5 of 2026-11-13): one account creation rule in the PocketBase rate limiter.
 *
 * Why: the create rule of the collection users is public (migration 1793300006). Anyone can create an unapproved reader account in
 * PocketBase directly, so a limit in the Vercel app alone does not help. The limit must live in PocketBase.
 *
 * Owner picks:
 *   - Q-A 3:31.2 "PocketBase rule, new migration": this file turns the limiter on, sets the sign-up rule and sets the trusted proxy header.
 *   - Q-A 3:31.3 "5 per hour": at most 5 new accounts from one network address in 60 minutes (duration 3600 s, maxRequests 5).
 *   - Q-A 3:31.4 "Sign-up rule only": the 4 PocketBase default rules are replaced by the sign-up rule alone.
 *     Reading and sign-in get no limit. The owner accepted the cost: no guard against password guessing on sign-in.
 *   - Q-A 3:31.5 "Test on 8092": the test of unit VW101 ran this file on a throwaway PocketBase on port 8092 (made-up data, 41 checks, all passed).
 *     The test script lives in the unit folder, not in this repository.
 *
 * Audience "" (all requests), owner pick Q-A 3:33.1 "Count all requests" of 2026-11-13: the rule counts every create request of the
 * collection users, with or without a sign-in token. Reason: a new reader can sign in before an admin approves the account
 * (authRule is "disabled = false"). With the audience "@guest", the unit test showed that such a reader created 8 accounts with no limit.
 * With the audience "", the same 8 requests got HTTP 429. Superusers stay free (see below).
 *
 * Settings after this migration:
 *   - rateLimits.enabled         true (PocketBase default: false)
 *   - rateLimits.rules           exactly one rule: label "users:create", audience "" (all), duration 3600, maxRequests 5
 *   - rateLimits.excludedIPs     not changed (a new server has none)
 *   - trustedProxy.headers       ["X-Forwarded-For"]
 *   - trustedProxy.useLeftmostIP false (the rightmost address of the header counts)
 *
 * How the limiter works (PocketBase 0.39.10, read in the Go source at tag v0.39.10):
 *   - core/settings_model.go lines 131-132: the settings fields rateLimits and trustedProxy. Lines 608-612: RateLimitsConfig
 *     {Rules, ExcludedIPs, Enabled}. Lines 721-747: RateLimitRule {Label, Audience, Duration (seconds), MaxRequests}.
 *     Line 712: the label users:create is valid. Lines 177-183: the default settings (limiter off, 4 default rules, listed in the down function).
 *   - apis/middlewares_rate_limit.go lines 81-108: a create request of a collection checks the label "<collection>:create" first, so
 *     "users:create" matches the sign-up of readers only. The labels "*:create" and the paths are checked next. This migration has no such rule.
 *   - apis/middlewares_rate_limit.go lines 148-189: the audience "@guest" skips a request with a sign-in token, and the audience "" counts every request. The count is kept for each client
 *     key e.RealIP(). A request over the limit gets HTTP status 429.
 *   - apis/middlewares_rate_limit.go lines 191-195: no limit when the limiter is off, for a superuser, or for an address in excludedIPs.
 *     So the S2 sync command (it uses a superuser) is never limited.
 *   - apis/middlewares_rate_limit.go lines 357-375: the window is fixed, not sliding. The count of an address starts again 3600 s after its first request.
 *     Every create request counts, also one that fails (a duplicate e-mail address, a short password).
 *   - core/event_request.go lines 40-75: RealIP() takes the last value of each trusted header and, with useLeftmostIP false, the rightmost valid address.
 *     With no trusted header in the request, it uses the remote address.
 *   - Behind Caddy (reverse_proxy to localhost:8091) PocketBase sees every request from 127.0.0.1. The real client address is in X-Forwarded-For.
 *     Not verified: the header that Caddy 2.6.2 sets on the server.
 *
 * How a migration saves the settings: `app.settings()` returns the settings object and `app.save(settings)` saves it (the same way as
 * migration 1793300002 for the batch API). The unit test read the settings back with GET /api/settings and from the database file,
 * after up, after down, and after up again.
 *
 * Down function (soft): turn the limiter off, put back the 4 PocketBase default rules and clear the trusted proxy headers.
 * The rate limit counts live in memory only, so nothing else is dropped.
 */

const SIGN_UP_RULE = { label: "users:create", audience: "", duration: 3600, maxRequests: 5 };

// The 4 default rules of PocketBase 0.39.10 (core/settings_model.go lines 179-183).
const DEFAULT_RULES = [
    { label: "*:auth", audience: "", duration: 3, maxRequests: 2 },
    { label: "*:create", audience: "", duration: 5, maxRequests: 20 },
    { label: "/api/batch", audience: "", duration: 1, maxRequests: 3 },
    { label: "/api/", audience: "", duration: 10, maxRequests: 300 },
];

migrate((app) => {
    const settings = app.settings();
    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [SIGN_UP_RULE];
    settings.trustedProxy.headers = ["X-Forwarded-For"];
    settings.trustedProxy.useLeftmostIP = false;
    app.save(settings);
    console.log("v2 migration: sign-up rate limit on (users:create, all audiences, 5 per 3600 s), trusted proxy header X-Forwarded-For");
}, (app) => {
    const settings = app.settings();
    settings.rateLimits.enabled = false;
    settings.rateLimits.rules = DEFAULT_RULES;
    settings.trustedProxy.headers = [];
    settings.trustedProxy.useLeftmostIP = false;
    app.save(settings);
    console.log("v2 migration down: rate limit off, the 4 PocketBase default rules put back, no trusted proxy header");
});
