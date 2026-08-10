# Rollback: PocketBase → Supabase (Vercel Production)

> **⚠️ Honest caveat first:** The old Supabase project (`mbgmyvmsvenvtecvrjia`) is
> paused or restricted. This rollback procedure documents *how* to revert — but a
> clean, guaranteed revert to fully working Supabase-backed production may not be
> possible if the Supabase project cannot be resumed or if its data is stale.
> Treat this as a **last-resort reference**, not a confidence-inspiring undo.

## When to roll back

- The PocketBase Oracle instance becomes unreachable and cannot be revived.
- Critical data corruption or auth failures in PocketBase that block real users.
- The `https://155-248-165-196.nip.io` TLS certificate fails to renew (Let's
  Encrypt rate limits, Oracle IP change, etc.).

## Prerequisites

1. **Vercel CLI** installed and authenticated (`vercel whoami`).
2. **Old Supabase env var values** — the values that were set on Vercel *before*
   the PocketBase cutover. These should still be in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Old lib/supabase/** code is still in the repo (intentionally kept per
   rollback decision, commit history `072cf6a..be2adad`).
4. **Supabase project is reachable** — this is the big unknown. If the old
   Supabase project is paused/frozen, no rollback will restore functionality
   until the project is resumed (may require Supabase support intervention).

## Step-by-step reversion

### Step 1: Revert `app/api/health/route.ts` (if it was updated for PocketBase)

If the health-check endpoint was rewritten to ping PocketBase instead of
Supabase, revert `app/api/health/route.ts` to the Supabase-pinging version.
The original file is in git history:

```bash
git show 072cf6a:app/api/health/route.ts > app/api/health/route.ts
```

If the file was never changed (it was left as-is because we decided to keep
old env vars in place — see §Gap below), skip this step.

### Step 2: Swap Vercel env vars back to Supabase

Set the production environment variables on Vercel to their old Supabase values
(do NOT remove PocketBase vars — keep them alongside for a fast re-cutover):

```bash
# Override NEXT_PUBLIC_POCKETBASE_URL with the old Supabase URL
# (The health check still needs Supabase vars; PocketBase vars being
# present is harmless — the code reads POCKETBASE_URL first.)
```

Actually the code does NOT fall back from PocketBase to Supabase — it
exclusively uses PocketBase. So rolling back to Supabase means **getting
the Supabase-deploying code back on Vercel**, not just env vars.

**Correct approach:** Revert to the pre-migration commit (or a commit that
still uses `lib/supabase/*`), then trigger a Vercel redeploy:

```bash
# Option A: Git revert the PocketBase migration commits
git revert --no-commit be2adad..918b752   # adjust range to cover all PB commits
git commit -m "revert: rollback PocketBase migration, restore Supabase"

# Option B: Reset to pre-migration commit and force-push
git checkout 072cf6a -- .
# ...review changes, ensure lib/supabase is intact, lib/pocketbase removed...
git commit -m "revert: rollback to pre-PocketBase state"
git push origin main
```

Vercel will auto-deploy from `main`. Ensure the Supabase env vars (Step 3)
are set on Vercel **before** this deploy triggers.

### Step 3: Ensure old Supabase env vars are set on Vercel

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste: https://mbgmyvmsvenvtecvrjia.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Trigger Vercel redeploy

If auto-deploy from `main` push didn't trigger, manually redeploy:

```bash
vercel --prod
```

### Step 5: If custom domain was cut over to Vercel

DNS records pointing `kendotranslation.com` at Vercel (A + CNAME) do NOT need
to change — the domain will serve whatever Vercel deploys (now Supabase code
again). No DNS rollback needed unless you also want the domain OFF Vercel.

### Step 6: Smoke-test

1. Visit `https://kendo-translation.vercel.app/api/health` — should return
   `{ ok: true, db: "ok" }` if Supabase is reachable.
2. Visit `https://kendotranslation.com` (if domain cutover) — login, browse
   documents, verify auth works.
3. Check Sentry for new errors.

## Honest failure modes

| Problem | Likelihood | What happens |
|---------|-----------|--------------|
| Supabase project still paused/frozen | **HIGH** | Rollback deploys but health check returns `db: "error"`. App may partially work (static pages) but all auth/DB operations fail. |
| Supabase data is stale (last backup March 2026) | **MEDIUM** | App works but older data. Any data written to PocketBase since cutover is NOT in Supabase (no two-way sync was set up). |
| DNS propagation delay after cutover-to-Vercel | **LOW** | Domain may take up to 48h to resolve after Cloudflare changes. Unlikely since Cloudflare is fast and TTLs are low. |
| lib/supabase code modified during PocketBase era | **LOW** | Code was intentionally kept as-is (verified: no imports of lib/supabase removed from app code). |

## Quickest rollback: "just keep running PocketBase"

If the issue is fixable on the Oracle instance (e.g., restart the PocketBase
service, renew TLS cert), do that instead. A 5-minute PocketBase fix beats a
30-minute code revert + deploy + unknown-Supabase-status gamble.

```bash
# On the Oracle Cloud instance:
sudo systemctl restart pocketbase
# Wait 5 seconds, check:
curl -s https://155-248-165-196.nip.io/api/health | jq '.code'
# Should return 200
```

## Key decision record

- **Date:** 2026-08-10
- **Decision:** lib/supabase/* and old Supabase env vars kept as rollback safety
  net. No code referencing Supabase was deleted from the app.
- **Gap:** `app/api/health/route.ts` still references `NEXT_PUBLIC_SUPABASE_URL`
  / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If those vars remain set on Vercel, the
  health check will try to ping Supabase (paused) and return 503. This route
  needs a PocketBase-aware rewrite — tracked as follow-up work, not in scope
  for initial cutover.
