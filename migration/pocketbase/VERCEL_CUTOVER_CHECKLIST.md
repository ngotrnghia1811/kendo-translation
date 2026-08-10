# Vercel Production Cutover Checklist: Supabase → PocketBase

> **Status:** PREP WORK ONLY (2026-08-10). This checklist is for `aki-main` / the
> user to execute once both blockers are resolved:
> 1. Vercel CLI browser login completed (`vercel login` → device-code flow).
> 2. Cloudflare DNS token permission issue resolved (currently returning 403 on
>    `Zone:DNS:Edit` for zone `8f945268d97aefc6f08546b2caffb023`
>    `kendotranslation.com`).

---

## Pre-flight checks (do these first, before touching anything)

- [ ] Vercel CLI authenticated: `vercel whoami` returns your account.
- [ ] Vercel project linked: `vercel link` confirms
  `kendo-translation (prj_SZuoXeznCBWiGTYzl8tpz8OFxFQT)`.
- [ ] Current deployment is healthy (Supabase-backed, working):
  `curl -s https://kendo-translation.vercel.app/api/health | jq .`
- [ ] Cloudflare API access confirmed for DNS record creation on zone
  `kendotranslation.com` (test: `curl -s -H "Authorization: Bearer $CF_TOKEN"
  "https://api.cloudflare.com/client/v4/zones/8f945268d97aefc6f08546b2caffb023/dns_records?type=A"`).
- [ ] Old Supabase env vars are currently set on Vercel (verify in dashboard or
  via `vercel env ls`).

---

## Env var inventory — full app requirements

### A. PocketBase — NEW, must be added to Vercel

| Variable | Value | Required? | Notes |
|----------|-------|-----------|-------|
| `NEXT_PUBLIC_POCKETBASE_URL` | `https://155-248-165-196.nip.io` | **YES** | Public-facing PocketBase URL on Oracle Cloud ARM. Used by server components, client components, and route handlers (8 references across `lib/pocketbase/`, `app/`, and `components/`). |

**No other PocketBase env vars are needed:**
- SMTP credentials live on the PocketBase server Admin UI — NOT needed as
  Next.js env vars (verified: zero `process.env.SMTP_*` in codebase).
- `POCKETBASE_ADMIN_EMAIL`/`POCKETBASE_ADMIN_PASSWORD` are mentioned in the
  migration README for import scripts but are NOT referenced by the Next.js
  app. Server-side auth uses cookie-based JWT, not admin credentials.
- The app does NOT need a `POCKETBASE_INTERNAL_URL` or separate URL for
  server → PocketBase communication. All traffic (browser and server) uses
  `NEXT_PUBLIC_POCKETBASE_URL` passed through the public internet (same as
  the old Supabase pattern).

### B. Supabase — KEEP on Vercel, do NOT remove

These vars are intentionally left in place for rollback safety. The current
deployed code does **not** actively use them (lib/supabase/ is imported in
zero app files; grep confirms all app/ imports are @/lib/pocketbase only),
with one exception noted below.

| Variable | Keep? | Why |
|----------|-------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | **YES — keep** | Rollsbacks to Supabase require this. Also: `app/api/health/route.ts` STILL references it (see Gaps below). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **YES — keep** | Same reasons. |
| `SUPABASE_SERVICE_ROLE_KEY` | **YES — keep** | Used by lib/supabase/server.ts (rollback code). Not used at runtime by PocketBase code. |
| `SUPABASE_ACCESS_TOKEN` | **YES — keep** | Only used by dev scripts (dashboard-recon/), never at runtime. Safe to keep but unnecessary. |

### C. Sentry — UNCHANGED, should already be on Vercel

| Variable | Should already exist? | Verify |
|----------|----------------------|--------|
| `NEXT_PUBLIC_SENTRY_DSN` | ✅ in `.env.local` | Verify on Vercel |
| `SENTRY_AUTH_TOKEN` | ✅ in `.env.local` | Verify on Vercel |
| `SENTRY_ORG` | ✅ in `.env.local` | Verify on Vercel |
| `SENTRY_PROJECT` | ✅ in `.env.local` | Verify on Vercel |

### D. AI / LLM — UNCHANGED, should already be on Vercel

| Variable | Should already exist? | Notes |
|----------|----------------------|-------|
| `OPENROUTER_API_KEY` | ⚠️ `.env.local` has placeholder `sk-or-v1-REPLACE_WITH_REAL_KEY` | Verify real key is set on Vercel (`.env` has 4 real keys as OPENROUTER_API_KEY_1..4; the app reads `OPENROUTER_API_KEY`). |
| `LLM_PROVIDER` | Not in `.env.local` | Optional; defaults to `openrouter`. |
| `DEFAULT_OPENROUTER_MODEL` | Not in `.env.local` | Optional (set in `.env`). |
| `BACKUP_OPENROUTER_MODEL` | Not in `.env.local` | Optional (set in `.env`). |
| `CHEAP_OPENROUTER_MODEL` | Not in `.env.local` | Optional (set in `.env`). |

### E. Google Drive — UNCHANGED, should already be on Vercel

| Variable | Should already exist? | Verify |
|----------|----------------------|--------|
| `GDRIVE_CLIENT_ID` | ✅ in `.env.local` | Verify on Vercel |
| `GDRIVE_CLIENT_SECRET` | ✅ in `.env.local` | Verify on Vercel |

### F. Auto-set by Vercel — no action needed

`NODE_ENV`, `VERCEL_GIT_COMMIT_SHA`, `GIT_SHA`, `CI` — these are
automatically set by the Vercel platform during build/run.

### G. NOT needed on Vercel

`TEST_BASE_URL`, `TEST_EMAIL`, `TEST_PASSWORD`, `PB_TEST_*` — test-only,
not used at runtime. `PDF_BASE_PATH` — optional; current default is a
macOS-specific path that won't work on Vercel's Linux runtime anyway
(and is probably unused in production — no PDF serving is configured).

---

## Gaps & open items (before cutover)

### 🔴 CRITICAL: `app/api/health/route.ts` still pings Supabase

This file imports `@supabase/supabase-js` and calls
`process.env.NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
After cutover, if those vars remain set, the health check will try to ping
Supabase (paused/restricted) and return `{ ok: false, db: "error" }`.

**Mitigation options:**
1. **Keep Supabase vars on Vercel** → health check will 503 but won't crash.
   Uptime monitoring (UptimeRobot) will alert. Acceptable short-term.
2. **Rewrite the health check to ping PocketBase** → proper fix. Out of scope
   for this work unit but strongly recommended as follow-up.

If the health check is NOT rewritten, ensure your uptime monitoring is aware
that 503 is expected post-cutover until the fix lands.

### 🟡 KNOWN: PocketBase 500 errors (2 endpoints) still present

`app/api/agents/[phase]/route.ts` and segment-activity filtering both had 500
errors fixed in commit `be2adad`. However, `segment_phase_transitions` and
other "base" PocketBase collections lack explicit timestamps — filtering by
`created`/`updated` returns 400. This is a PocketBase backend schema issue
(needs migration adding `DateField` to ~20 collections), not a Vercel env var
issue. The app will function; some activity queries will be less precise.

---

## Ordered cutover procedure

### Phase 1: Add Vercel env var (pre-deploy, zero-downtime)

```bash
# Step 1.1 — Add the single new PocketBase env var (NOT a secret — it's
# an HTTPS URL needed by both client and server bundles).
vercel env add NEXT_PUBLIC_POCKETBASE_URL production
# When prompted, enter: https://155-248-165-196.nip.io

# Step 1.2 — Verify it's registered
vercel env ls production | grep POCKETBASE
```

Adding an env var does NOT trigger a redeploy. The existing deployment
continues running with its current env. Safe to do at any time.

### Phase 2: Add custom domain to Vercel (ZERO-downtime)

> **Why domain first, env swap second:** Vercel needs to provision an SSL
> certificate when you add a custom domain. This can take 1–5 minutes.
> Adding the domain first lets SSL provisioning happen while the old
> deployment is still serving traffic. Once DNS propagates and SSL is ready,
> the domain will serve the *same deployment* (still Supabase-backed)
> through Vercel's edge — you can verify it works before swapping env vars.

```bash
# Step 2.1 — Add the apex domain
vercel domains add kendotranslation.com
# Vercel will return the exact DNS records to configure. Standard pattern:
#   A     @    76.76.21.21
# BUT: confirm against the actual vercel domains add output.

# Step 2.2 — Add the www subdomain
vercel domains add www.kendotranslation.com
# Standard pattern:
#   CNAME www  cname.vercel-dns.com
# Again: confirm against actual output.
```

### Phase 3: Configure Cloudflare DNS records

> ⚠️ **Do NOT change existing MX/SPF/DKIM records.** kendotranslation.com is
> actively used for email (Resend). Only add the A and CNAME records for the
> web app; leave all email-related records untouched.

Standard DNS records (verify against `vercel domains add` output):

| Type | Name | Value | TTL | Notes |
|------|------|-------|-----|-------|
| A | `@` | `76.76.21.21` | Auto | Vercel apex IP — **confirm this is current** |
| CNAME | `www` | `cname.vercel-dns.com` | Auto | Vercel edge network |

**Add these via Cloudflare dashboard or API** (once token permissions are
fixed). Wait for DNS propagation (Cloudflare is typically <5 min, but
allow up to 1 hour for global propagation).

**Verification:**
```bash
dig +short kendotranslation.com A
# Should return 76.76.21.21

dig +short www.kendotranslation.com CNAME
# Should return cname.vercel-dns.com

# Check SSL:
curl -sI https://kendotranslation.com | head -1
# Should return HTTP/2 200 (or 3xx redirect)
```

Also verify in Vercel dashboard → Domains that both domains show as "Valid"
(green checkmark — SSL provisioned).

### Phase 4: Smoke-test via custom domain (still Supabase-backed)

At this point, `kendotranslation.com` serves the **same deployment** as
`kendo-translation.vercel.app` — the code still uses Supabase because the
old env vars are still set and no redeploy has happened.

- [ ] `https://kendotranslation.com/api/health` → `{ ok: true, db: "ok" }`
  (pings Supabase, should still work since Supabase vars are set).
- [ ] `https://www.kendotranslation.com` redirects to `https://kendotranslation.com`
  (if you configured redirects in Vercel).
- [ ] Login, browse documents, verify auth works via the custom domain.

### Phase 5: Trigger a redeploy with the PocketBase env var active

The env var was added in Phase 1, but the current deployment was built
*without* it. Trigger a fresh deploy so the build picks it up:

```bash
# Option A: Push a no-op commit to trigger Vercel's automatic deploy
git commit --allow-empty -m "deploy: trigger PocketBase cutover redeploy"
git push origin main

# Option B: Manually redeploy
vercel --prod
```

**What changes on this deploy:**
- Build-time: `NEXT_PUBLIC_POCKETBASE_URL` is now available → bundled into
  client-side JS as `"https://155-248-165-196.nip.io"`.
- Runtime: Server components, route handlers, and middleware read
  `process.env.NEXT_PUBLIC_POCKETBASE_URL` → PocketBase Oracle instance.
- Old Supabase vars remain set → `app/api/health/route.ts` can still
  reference them (for the 503 it'll return — see Gaps).

### Phase 6: Post-deploy smoke tests

- [ ] `https://kendotranslation.com/api/health` → expected `{ ok: false, db: "error" }`
  until health route is rewritten (see Gaps).
- [ ] `https://kendo-translation.vercel.app` → same behavior.
- [ ] Login as admin → verify PocketBase auth (JWT cookie, role detection).
- [ ] Browse documents list → verify PocketBase data fetch.
- [ ] Open a document reader → verify segment pagination from PocketBase.
- [ ] AI features (if any) → verify OpenRouter key works.
- [ ] Check Sentry for new errors → verify no auth/data-fetch explosions.

### Phase 7: Uptime monitoring adjustment

If you use UptimeRobot or similar:
- [ ] Temporarily suppress alerts for `/api/health` → 503 (known gap).
- [ ] Or: point the uptime check at `https://kendotranslation.com` (200 from
  Vercel edge) instead of the health endpoint.

---

## Summary — actions by role

### aki-main / user (blocked on Vercel login + Cloudflare DNS)

1. `vercel login` (device-code browser auth).
2. Fix Cloudflare DNS token permissions.
3. Execute Phases 1–7 above, in order.
4. Post-deploy: verify smoke tests pass.

### aki-execute / follow-up work unit (after cutover)

1. Rewrite `app/api/health/route.ts` to ping PocketBase instead of Supabase.
2. Fix `PDF_BASE_PATH` default for Linux/Vercel runtime (or remove it).
3. Add `created`/`updated` `DateField`s to PocketBase base collections for
   proper activity filtering (PocketBase migration).
4. Remove old Supabase env vars from Vercel *only after* >7 days of stable
   PocketBase production operation (and confirmed rollback safety window
   expired).

---

## Decision record

- **Date:** 2026-08-10
- **Decision:** Domain addition BEFORE env-var swap (Phase 2 before Phase 5).
  Rationale: Vercel SSL provisioning (1–5 min) should happen while the old
  deployment is live, not while a new PocketBase deployment might have
  teething issues. Phased approach reduces blast radius.
- **Decision:** Keep Supabase env vars on Vercel during and after cutover.
  Rationale: `app/api/health/route.ts` still references them; removing them
  would cause 503 with a "misconfigured" message instead of a Supabase-ping
  503 — functionally identical but the former is a config error that could
  mask other issues. Also, rollback safety per explicit user decision.
- **Decision:** SMTP is NOT a Vercel env var. Rationale: SMTP is configured
  on the PocketBase server Admin UI (`meta.senderAddress` =
  `no-reply@kendotranslation.com`, Resend integration). Verified: zero
  `process.env.SMTP_*` references in the Next.js codebase.
- **Decision:** PocketBase admin credentials NOT needed on Vercel. Rationale:
  the Next.js app authenticates via cookie-based JWT (`pb.authStore`), not
  admin email/password. Verified: zero `process.env.POCKETBASE_ADMIN_*` in
  the codebase.
