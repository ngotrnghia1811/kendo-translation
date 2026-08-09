# SMTP Setup — Resend + PocketBase Password-Reset Email Flow

**Date:** 2026-08-09
**PocketBase version:** v0.39.10
**Live instance:** `https://155-248-165-196.nip.io` (Oracle Cloud ARM, Tokyo)
**Systemd service:** `pocketbase` (running, healthy)

---

## Context

7 real users currently share a temporary password `TempImport2026!` after migration from Supabase (Supabase bcrypt hashes are incompatible with PocketBase's PBKDF2). SMTP must be configured before password-reset emails can be sent.

**Provider chosen:** Resend (free tier — 100 emails/day, 3000/month, no credit card, immediate production access).

---

## What Was Already Pre-Configured (2026-08-09)

The following non-sensitive settings were applied directly to the live PocketBase instance via the Admin API. **No credentials were set. SMTP is NOT enabled.** Current mail behavior (the Unix `sendmail` fallback) is fully unchanged.

| Setting | Value | Notes |
|---|---|---|
| `meta.appURL` | `https://155-248-165-196.nip.io` | **Critical** — password-reset links use this URL. Update when you get a real domain. |
| `meta.appName` | `Kendo Translation` | Used in email template placeholders (`{APP_NAME}`). |
| `meta.senderName` | `Kendo Translation` | Display name on outgoing emails. |
| `meta.senderAddress` | `no-reply@kendo-translation.com` | **Must match your verified Resend domain.** Change if you verify a different domain. |
| `smtp.host` | `smtp.resend.com` | Resend's SMTP relay host. |
| `smtp.port` | `465` | SSL/TLS implicit. Resend also supports 587/2587 (STARTTLS). |
| `smtp.username` | `resend` | Literal string — Resend requires the username `resend`. |
| `smtp.tls` | `true` | Enforces TLS encryption (SSL mode on port 465). |
| `smtp.authMethod` | `PLAIN` | SMTP AUTH method. LOGIN also available (mainly for Microsoft). |
| `smtp.enabled` | **`false`** | **OFF** — do NOT toggle until you have a valid API key below. |
| `smtp.password` | _(empty)_ | **You fill this in with your Resend API key** (step 3 below). |

All other PocketBase auth settings are at defaults — password auth enabled on the `users` collection with `email` as the identity field. The built-in password-reset email template uses `{APP_NAME}`, `{APP_URL}`, and `{TOKEN}` placeholders.

---

## Step-by-Step Setup

### STEP 1 (USER ACTION REQUIRED) — Sign Up for Resend

1. Go to https://resend.com/signup
2. Create an account. No credit card needed.
3. **Optional but recommended:** Enable 2FA in your Resend account settings.

**What you get:** Free tier — 100 emails/day, 3000/month, immediate production access. No sandbox or approval process.

---

### STEP 2 (USER ACTION REQUIRED) — Verify a Sending Domain

Resend requires a verified domain to send to real recipients (the 7 users). You have two paths:

#### Path A: Verify your own domain (recommended for production)

1. Go to https://resend.com/domains → **Add Domain**
2. Enter a domain you own (or subdomain), e.g. `kendo-translation.com` or `mail.kendo-translation.com`
3. Resend shows 3–5 DNS records to add at your domain registrar/DNS provider:
   - **SPF** (TXT): Authorises Resend to send on your behalf
   - **DKIM** (2–3 TXT or CNAME records): Cryptographic signature for deliverability
   - **DMARC** (TXT at `_dmarc`): Tells recipients how to handle auth failures (optional but recommended)
4. Add the records at your DNS provider. TTL defaults are fine.
5. Click **Verify DNS Records** in Resend. Propagation usually takes 5–15 minutes.
6. Once all records are green/verified, you can send from `anything@yourdomain.com`.

> **Important:** If you verify `kendo-translation.com`, update `meta.senderAddress` to `no-reply@kendo-translation.com` (already pre-set above). If you verify a different domain, change `senderAddress` in PocketBase Admin UI to match.

#### Path B: Use Resend's test domain (for testing only)

Resend's `resend.dev` domain can ONLY send to the email address associated with your Resend account. It cannot send to the 7 real users.

- From address: `onboarding@resend.dev`
- To: **only** your own Resend account email
- Good for: testing the SMTP connection, verifying the PocketBase integration works
- **Not suitable for**: sending password-reset emails to the 7 real users

If using Path B for initial testing, temporarily change `meta.senderAddress` to `onboarding@resend.dev` in PocketBase Admin UI (`Settings → Mail settings`). Switch back after verifying your real domain.

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

After you confirm password-reset emails work:

1. **Delete the test superuser** (if you created one during setup). Done — the `admin@kendo-migration.local` superuser created during pre-configuration was already deleted.
2. **Remove the temporary password note:** The `TempImport2026!` shared password should be considered compromised. Trigger password-reset for ALL 7 users immediately after SMTP is confirmed working.
3. **Update README:** The `migration/pocketbase/README.md` line 208 ("Password reset flow — Configure SMTP settings") can be marked as done.

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
