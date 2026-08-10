# PocketBase User Accounts — Current State (2026-08-10)

Live instance: `https://155-248-165-196.nip.io` (also reachable via production
domain `https://kendotranslation.com`, same backend).

**All 15 accounts below are TEST/DEV accounts. There are no real production
users yet.** Every migrated user shares one temp password and is unverified —
this is expected and fine until real onboarding happens.

## Superuser (PocketBase admin, `_superusers` collection — separate from `users`)

| Email | Password | Notes |
|---|---|---|
| `admin@kendo-translation.local` | `TempAdmin2026!` | PocketBase Admin UI (`/_/`) + API management access. Not a `users` collection record. |

A second temp superuser (`superadmin@kendo-translation.local`) was created during
an earlier bugfix pass for backfill operations — its current existence is
**unverified** (low priority to check, since there are no real users at risk).

## Migrated users (`users` collection) — shared password

**Password for all 14 rows below: `TempImport2026!`** (all `verified: false`,
no password resets have occurred). This was the import script's temp password;
it will not work as-is once real users are onboarded — plan to force a
password-reset flow (SMTP is live and proven working via Resend +
kendotranslation.com, see `SMTP_SETUP.md`) before treating any of these as
real accounts.

### 7 "real" users (migrated from Supabase `public.profiles`, role/username source-verified 7/7 match)

| Record ID | **Current Email** | Original Supabase Email | Role | Username |
|---|---|---|---|---|
| `17fb4e26-d477-4d86-b52f-6938c75e4f7b` | `admin-1@test.com` | *(unchanged)* | admin | `admin-1` |
| `68fd92dd-dae1-4890-b198-0e216b490cd6` | `wenqian@kendo-translation.local` | `test@example.com` | admin | `test_user` |
| `c1819905-dbf2-41d3-b67b-34cb2bcf3733` | `translator-test@kendo-translation.local` | `translator-1@test.com` | translator | `translator-1` |
| `0ee14287-3a18-4b1e-ad93-880d84d01da4` | `testuser@example.com` | *(unchanged)* | translator | *(empty)* |
| `c067cf20-38cd-430f-be71-61f414b041a6` | `test-user-123@test.com` | *(unchanged)* | translator | *(empty)* |
| `4f436df4-6841-4adc-95fd-93f6b2c2c45d` | `reader-test@kendo-translation.local` | `reader-1@test.com` | reader | `reader-1` |
| `933bb896-977a-4269-8472-fa672c49d771` | `wenqian@test.com` | *(unchanged)* | reader | *(empty)* |

**⚠️ 3 emails were changed from the original Supabase-migrated values** during
a later Playwright-test-fixture fix (no dedicated "wenqian" test user existed
in the migrated data at the time, so `test_user`'s email was repurposed for
the `PB_TEST_WENQIAN_EMAIL` fixture, and `reader-1`/`translator-1` emails were
also normalized to `*.local` addresses for consistency). **The old emails
(`test@example.com`, `translator-1@test.com`, `reader-1@test.com`) no longer
work** — use the "Current Email" column above, not the original Supabase
value, for any login/testing.

Playwright test env vars (`.env.local`) point at these current emails:
`PB_TEST_ADMIN_EMAIL=admin-1@test.com`,
`PB_TEST_TRANSLATOR_EMAIL=translator-test@kendo-translation.local`,
`PB_TEST_READER_EMAIL=reader-test@kendo-translation.local`,
`PB_TEST_WENQIAN_EMAIL=wenqian@kendo-translation.local`,
`PB_TEST_PASSWORD=TempImport2026!`.

### 7 system/test accounts (no matching Supabase profile — harmless, default role=reader)

| Record ID | Email | Role |
|---|---|---|
| `f801fc87-6182-499c-9c04-c306866c546f` | `video-test-1767161700399@test.com` | reader |
| `3c044708-7f8c-4914-9c54-9dfff10b8aaa` | `video-test-1767161717905@test.com` | reader |
| `cfa5dae5-b192-499b-8cb3-a1e50af00a96` | `video-test-1767161810214@test.com` | reader |
| `ad481382-aeff-4259-8f75-3f50e676644f` | `test_kendo_ver@gmail.com` | reader |
| `1965dedd-22b0-4e51-a77e-90d8f23e2777` | `reader-2@test.com` | reader |
| `15b3499e-2933-42c3-b00d-26daf0d74d03` | `nghia@test.com` | reader |
| `db04a87c-3862-4017-afbf-440f4b520f20` | `tester99@example.com` | reader |

## Quick reference — verified login credentials by role

| Role | Email | Password |
|---|---|---|
| admin | `admin-1@test.com` | `TempImport2026!` |
| admin (alt) | `wenqian@kendo-translation.local` | `TempImport2026!` |
| translator | `translator-test@kendo-translation.local` | `TempImport2026!` |
| reader | `reader-test@kendo-translation.local` | `TempImport2026!` |

All 4 verified live against production (`kendotranslation.com`) on 2026-08-10.

## Before treating any of this as production

1. Verify (or reset) the second superuser (`superadmin@kendo-translation.local`) — delete if unused.
2. Force password resets for any account that will become a real user (SMTP is live, domain verified).
3. Set `verified: true` after reset, or rely on PocketBase's own email-verification flow.
4. Consider deleting the 7 harmless system/test accounts once no longer needed for testing.
