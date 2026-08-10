# SMTP Setup — Resend + PocketBase Password-Reset Email Flow

**Date:** 2026-08-10 (updated)
**PocketBase version:** v0.39.10
**Live instance:** `https://155-248-165-196.nip.io` (Oracle Cloud ARM, Tokyo)
**Systemd service:** `pocketbase` (running, healthy)
**Sending domain:** `kendotranslation.com` (NO hyphen — registered via Cloudflare, replacing the placeholder `kendo-translation.com`)

---

## Context

7 real users currently share a temporary password `TempImport2026!` after migration from Supabase (Supabase bcrypt hashes are incompatible with PocketBase's PBKDF2). SMTP must be configured before password-reset emails can be sent.

**Provider chosen:** Resend (free tier — 100 emails/day, 3000/month, no credit card, immediate production access).

---

## What Was Already Pre-Configured (2026-08-09)

The following non-sensitive settings were applied directly to the live PocketBase instance via the Admin API. SMTP IS enabled with the Resend API key (stored on the live instance only, NOT in this file).

| Setting | Value | Notes |
|---|---|---|
| `meta.appURL` | `https://155-248-165-196.nip.io` | **Critical** — password-reset links use this URL. Update when you get a real domain. |
| `meta.appName` | `Kendo Translation` | Used in email template placeholders (`{APP_NAME}`). |
| `meta.senderName` | `Kendo Translation` | Display name on outgoing emails. |
| `meta.senderAddress` | `no-reply@kendotranslation.com` | **Updated 2026-08-10 — changed from `kendo-translation.com` (hyphen, placeholder) to `kendotranslation.com` (no hyphen, registered domain).** |
| `smtp.host` | `smtp.resend.com` | Resend's SMTP relay host. |
| `smtp.port` | `465` | SSL/TLS implicit. Resend also supports 587/2587 (STARTTLS). |
| `smtp.username` | `resend` | Literal string — Resend requires the username `resend`. |
| `smtp.tls` | `true` | Enforces TLS encryption (SSL mode on port 465). |
| `smtp.authMethod` | `PLAIN` | SMTP AUTH method. LOGIN also available (mainly for Microsoft). |
| `smtp.enabled` | ~~`false`~~ → **`true`** ✅ | **Enabled 2026-08-09 23:13 UTC** with Resend API key. |
| `smtp.password` | ~~_(empty)_~~ → **set** ✅ | API key stored on live instance only. |

---

## Activation Status

### 2026-08-09 23:13–23:16 UTC — Initial Setup

### ✅ Completed

- **SMTP enabled** with Resend API key `re_LNSM…` (full key on live instance, not in this file).
- **SMTP connectivity confirmed** — Resend accepts auth, TLS handshake successful on port 465.
- **Test email delivered** — `POST /api/settings/test/email` with `onboarding@resend.dev` sender to `ngotrnghia1811@gmail.com` (Resend account owner) returned `204 No Content`. PocketBase logs confirm: level 0 (INFO) at 23:15:09 UTC.
- **Password-reset end-to-end triggered** — a temporary user was created with the Resend owner email, `POST /api/collections/users/request-password-reset` returned `204`, no errors in logs. Temp user deleted after test.

### 2026-08-10 — Domain Change to `kendotranslation.com`

- **`meta.senderAddress` updated** to `no-reply@kendotranslation.com` (from `no-reply@kendo-translation.com`).
- **SMTP connectivity re-verified** — Resend API direct send returns HTTP 200; API key intact.
- **PocketBase settings untouched** — `smtp.enabled=true`, `smtp.host=smtp.resend.com`, same API key.
- **Sender address change is safe** — the old domain (`kendo-translation.com`) was never verified either, so email delivery status is unchanged (still blocked pending domain verification).

### ⚠️ Blocked: Domain Not Verified

**`kendotranslation.com` is NOT yet verified on Resend.** Sends with `no-reply@kendotranslation.com` will fail with:
```
550 "The kendotranslation.com domain is not verified.
Please, add and verify your domain on https://resend.com/domains"
```

**Impact:** Until domain verification is completed, SMTP is technically enabled but Resend will reject all sends to real users. PocketBase returns `204` for password-reset requests regardless (no error to the user).

### 🔜 Next Step: Add and Verify `kendotranslation.com` on Resend

The user must add `kendotranslation.com` on the Resend dashboard, then add the DNS records at Cloudflare. **See [Domain Verification on Resend](#⚠️-domain-verification-on-resend--critical-next-step) below for exact steps and DNS records.**

Once DNS records propagate and Resend shows all green checkmarks, password-reset emails will flow to all 7 real users without further PocketBase changes.

### ⚠️ API Key Limitation

The current Resend API key (`re_LNSM…`) is **restricted to send-only**. It cannot create or manage domains via the Resend API. Domain addition must be done through the Resend Dashboard UI (or a new full-access API key must be created).

Until then, password-reset emails will NOT reach real users (Resend rejects unverified-domain sends).

All other PocketBase auth settings are at defaults — password auth enabled on the `users` collection with `email` as the identity field. The built-in password-reset email template uses `{APP_NAME}`, `{APP_URL}`, and `{TOKEN}` placeholders.

---

## Step-by-Step Setup

### STEP 1 (USER ACTION REQUIRED) — Sign Up for Resend

1. Go to https://resend.com/signup
2. Create an account. No credit card needed.
3. **Optional but recommended:** Enable 2FA in your Resend account settings.

**What you get:** Free tier — 100 emails/day, 3000/month, immediate production access. No sandbox or approval process.

---

### STEP 2 (USER ACTION REQUIRED) — Verify `kendotranslation.com` on Resend

Resend requires a verified domain to send to real recipients (the 7 users).

#### ⚠️ DOMAIN VERIFICATION ON RESEND — CRITICAL NEXT STEP

The domain `kendotranslation.com` (registered via Cloudflare) must be added and verified on Resend. There are two paths:

---

#### Path A: Automatic Setup via Cloudflare Domain Connect (RECOMMENDED)

The fastest approach — Resend can auto-configure your Cloudflare DNS records:

1. Go to https://resend.com/domains → **Add Domain**
2. Enter `kendotranslation.com` (or a subdomain like `mail.kendotranslation.com` if you prefer subdomain isolation)
3. Choose a region: **us-east-1** (closest default) or the region nearest your users
4. On the domain details page, click **"Sign in to Cloudflare"**
5. Authorize Resend to access Cloudflare DNS — the DNS records are added automatically
6. Wait ~5–15 minutes for verification. Click **Verify DNS Records** to check.

**✅ This is the simplest path — no manual DNS entry required.**

---

#### Path B: Manual DNS Setup via Cloudflare Dashboard

If you prefer manual control or the auto-setup doesn't work:

##### Step B1 — Add the domain on Resend

1. Go to https://resend.com/domains → **Add Domain**
2. Enter `kendotranslation.com`
3. Choose region: **us-east-1**
4. After adding, Resend will display the **exact DNS records** you need. Copy them exactly.

##### Step B2 — Add DNS records in Cloudflare

Log into your Cloudflare dashboard → select `kendotranslation.com` → **DNS** → **Records**.

Add each of the following record types. **Important:** Omit your domain from record names when pasting into Cloudflare (e.g. paste `send` not `send.kendotranslation.com`).

**Record 1 — MX (SPF return path)**

| Cloudflare Field | Value |
|---|---|
| Type | `MX` |
| Name | `send` |
| Mail Server | `feedback-smtp.us-east-1.amazonses.com` |
| Priority | `10` |
| TTL | `Auto` |

**Record 2 — TXT (SPF authorization)**

| Cloudflare Field | Value |
|---|---|
| Type | `TXT` |
| Name | `send` |
| Content | `v=spf1 include:amazonses.com ~all` |
| TTL | `Auto` |

**Record 3 — TXT (DKIM — value is DOMAIN-SPECIFIC!)**

| Cloudflare Field | Value |
|---|---|
| Type | `TXT` |
| Name | `resend._domainkey` |
| Content | **Copy the exact value from your Resend domain page** — Resend generates a unique DKIM key per domain. It will look like `p=MIGfMA0GCSqGSIb3...` |
| Proxy Status | `DNS Only` (disabled — must NOT be proxied) |
| TTL | `Auto` |

> ⚠️ **The DKIM value is unique to your domain.** You MUST copy it from the Resend dashboard after adding the domain. Do NOT use the example value above.

**Record 4 — DMARC (recommended for deliverability)**

| Cloudflare Field | Value |
|---|---|
| Type | `TXT` |
| Name | `_dmarc` |
| Content | `v=DMARC1; p=none; rua=mailto:dmarc@kendotranslation.com` |
| TTL | `Auto` |

> Note: `p=none` means no action on failures (monitoring only). Increase to `p=quarantine` or `p=reject` once you confirm email delivery is working.

##### Step B3 — Verify

1. In the Resend dashboard, click **Verify DNS Records** for your domain.
2. Wait 5–15 minutes (DNS propagation can occasionally take up to 72 hours, but is usually fast).
3. Check status at https://dns.email/ if verification is taking long.
4. Once all records show green checkmarks, your domain is verified. ✅

##### Step B4 — Confirm PocketBase senderAddress is correct

After domain verification, confirm `meta.senderAddress` is set to `no-reply@kendotranslation.com`. This was already done on 2026-08-10 — no action needed unless you used a subdomain.

> **Important:** If you verify `kendotranslation.com`, the senderAddress is already correct (`no-reply@kendotranslation.com`). If you verify a subdomain (e.g. `mail.kendotranslation.com`), update `meta.senderAddress` to `no-reply@mail.kendotranslation.com` in PocketBase Admin UI.

#### Path C: Use Resend's test domain (for testing only)

Resend's `resend.dev` domain can ONLY send to the email address associated with your Resend account. It cannot send to the 7 real users.

- From address: `onboarding@resend.dev`
- To: **only** your own Resend account email
- Good for: testing the SMTP connection, verifying the PocketBase integration works
- **Not suitable for**: sending password-reset emails to the 7 real users

If using Path C for initial testing, temporarily change `meta.senderAddress` to `onboarding@resend.dev` in PocketBase Admin UI (`Settings → Mail settings`). Switch back after verifying your real domain.

---

### STEP 3 (USER ACTION REQUIRED) — Generate a Resend API Key

1. Go to https://resend.com/api-keys
2. Click **Create API Key**
3. Give it a name (e.g. `pocketbase-smtp`)
4. **Copy the key immediately** — it starts with `re_` and is shown only once. Store it somewhere secure (password manager).

---

### STEP 4 — Enter API Key in PocketBase

Open the PocketBase Admin UI at `https://155-248-165-196.nip.io/_/` and log in as a superuser.

1. Navigate to **Settings → Mail settings** (gear icon in the left sidebar)
2. You should see all the fields from "What Was Already Pre-Configured" above already filled in
3. **Paste your Resend API key** into the **Password** field (under the SMTP server section)
4. Toggle **"Use SMTP mail server"** to **ON**
5. Click **Save** at the top of the page

**Alternatively via API (if you prefer CLI):**

```bash
TOKEN=$(curl -s -X POST https://155-248-165-196.nip.io/api/collections/_superusers/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"<superuser-email>","password":"<superuser-password>"}' | jq -r ".token")

curl -s -X PATCH https://155-248-165-196.nip.io/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "smtp": {
      "enabled": true,
      "host": "smtp.resend.com",
      "port": 465,
      "username": "resend",
      "password": "re_<YOUR_API_KEY>",
      "tls": true,
      "authMethod": "PLAIN"
    },
    "meta": {
      "senderAddress": "no-reply@<YOUR_VERIFIED_DOMAIN>"
    }
  }'
```

> **IMPORTANT:** Only set `enabled: true` AFTER you have a valid API key. Enabling SMTP with an empty or invalid password will break PocketBase's mail sending — it will stop falling back to `sendmail` and try (and fail) to connect to Resend.

---

### STEP 5 — Test

#### 5a. Quick connection test

From the PocketBase Admin UI, in **Settings → Mail settings**, after saving, click **"Send test email"**. Enter your own email address. If SMTP is configured correctly, you'll receive a test email from Resend.

#### 5b. Password-reset flow test (end-to-end)

Trigger a password-reset request for a real user:

```bash
curl -s -X POST https://155-248-165-196.nip.io/api/collections/users/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"<user-email>"}'
```

A successful response is `204 No Content` (PocketBase always returns 204 whether or not the email exists, to prevent email enumeration).

Check the user's inbox for the reset email. The link should point to:
`https://155-248-165-196.nip.io/_/#/auth/confirm-password-reset/<TOKEN>`

Click the link, set a new password, and verify the user can log in with it.

#### 5c. Verify on Resend dashboard

Go to https://resend.com/emails — you should see the sent messages, delivery status, and any bounces/complaints.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Reset email never arrives | SMTP not enabled or wrong API key | Check `smtp.enabled` in settings. Verify the API key in Resend dashboard is active. |
| "403 — You can only send testing emails to your own email address" | Using `onboarding@resend.dev` sender with a recipient that isn't your Resend account email | Verify a real domain (Step 2, Path A) and update `meta.senderAddress`. |
| "The `domain.com` domain is not verified" | Sender domain not verified in Resend | Go to https://resend.com/domains and verify DNS records are all green. |
| Reset link points to `http://localhost:8090` | `meta.appURL` not updated | Check `Settings → Mail settings` or API: ensure `appURL` is `https://155-248-165-196.nip.io`. |
| Password-reset API returns 400 | Email field missing or invalid | Ensure the `users` collection has `email` as an identity field in `passwordAuth.identityFields`. |
| Mail settings save silently fails | Username field empty when password is set (PocketBase UI quirk) | Ensure `Username` is `resend` (not empty). The UI can be finicky when username is blank but password is set. |

---

## Post-Setup Cleanup

After you confirm password-reset emails work (domain verified → real delivers):

1. **Delete the test superuser** (if you created one during setup). Done — the `admin@kendo-migration.local` superuser created during pre-configuration was already deleted. The `admin@kendo-translation.local` superuser remains (used for activation above).
2. **Remove the temporary password note:** The `TempImport2026!` shared password should be considered compromised. Trigger password-reset for ALL 7 users immediately after SMTP is confirmed working.
3. **Update README:** The `migration/pocketbase/README.md` line 208 ("Password reset flow — Configure SMTP settings") can be marked as done.
4. **Temp user cleanup:** Done — the `ngotrnghia1811@gmail.com` test user created during SMTP activation was deleted immediately after the password-reset test.

---

## Reference: PocketBase SMTP Settings Schema

```
smtp:
  enabled:    bool      # false = use sendmail; true = use SMTP
  host:       string    # smtp.resend.com
  port:       int       # 465 (SSL), 587/2587 (STARTTLS)
  username:   string    # "resend" (literal)
  password:   string    # Your Resend API key (re_...)
  tls:        bool      # true = enforce TLS; false = STARTTLS
  authMethod: string    # "PLAIN" (default) or "LOGIN"
  localName:  string    # Optional EHLO/HELO domain (default: localhost)
```

## Reference: Resend SMTP Details (verified 2026-08-09)

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` (SSL/TLS implicit), `587` (STARTTLS), `2465` (SSL/TLS), `2587` (STARTTLS) |
| Username | `resend` (literal lowercase string) |
| Password | Your API key (starts with `re_`) |
| Auth method | PLAIN |
| Free tier | 100 emails/day, 3000/month |
| Domain required | Yes — to send to real recipients |
| Test domain | `resend.dev` — only sends to your own account email |
| Production access | Immediate, no approval needed |
| Docs | https://resend.com/docs/send-with-smtp |
| Domains | https://resend.com/domains |
| API keys | https://resend.com/api-keys |
