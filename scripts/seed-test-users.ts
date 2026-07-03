/**
 * scripts/seed-test-users.ts
 *
 * Idempotent seed script: ensures all 4 test-role users exist in Supabase
 * Auth with correct email, password, and app_metadata.role.
 *
 * These users are consumed by tests/global-setup.ts which drives the app's
 * /login page in a headless browser and saves auth cookies to
 * tests/.auth/<role>.json.
 *
 * Behaviour:
 *   1. Load .env.local (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 *   2. Query existing users by email via the Admin API.
 *   3. For users that don't exist: create them.
 *   4. For users that exist but have mismatched password or app_metadata.role:
 *      update them.
 *   5. Report final state.
 *
 * Usage:
 *   npx tsx scripts/seed-test-users.ts
 *   npx tsx scripts/seed-test-users.ts --dry-run
 */

import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ENV_PATH = ".env.local";

/** Test roles matching tests/global-setup.ts ROLES. */
const TEST_ROLES: Array<{
  email: string;
  password: string;
  role: "admin" | "translator" | "reader";
}> = [
  { email: "admin-1@test.com", password: "test-password", role: "admin" },
  { email: "translator-1@test.com", password: "test-password", role: "translator" },
  { email: "reader-1@test.com", password: "test-password", role: "reader" },
  { email: "wenqian@test.com", password: "11011995", role: "reader" },
];

// ---------------------------------------------------------------------------
// Env loading
// ---------------------------------------------------------------------------

async function loadEnv(): Promise<Record<string, string>> {
  const raw = await readFile(ENV_PATH, "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  // 1. Load environment & connect to DB
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "FATAL: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local",
    );
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(
    `[info] Connected to Supabase. Mode: ${dryRun ? "DRY-RUN" : "LIVE"}\n`,
  );

  // 2. List existing users to check what's already there
  const { data: listData, error: listErr } = await sb.auth.admin.listUsers({
    perPage: 1_000,
  });
  if (listErr) {
    console.error("FATAL: failed to list users:", listErr.message);
    process.exit(1);
  }
  const existingByEmail = new Map<
    string,
    { id: string; email: string; app_metadata: Record<string, unknown> }
  >();
  for (const u of listData.users) {
    existingByEmail.set(u.email!, {
      id: u.id,
      email: u.email!,
      app_metadata: (u.app_metadata ?? {}) as Record<string, unknown>,
    });
  }

  // 3. Ensure each test user
  let created = 0;
  let updated = 0;
  let ok = 0;

  for (const spec of TEST_ROLES) {
    const existing = existingByEmail.get(spec.email);

    // --- Password: we trust the Admin API to set it correctly; we can't
    //     read back the plaintext, so we always issue an updateUserById to
    //     set password + app_metadata unless this is a dry run and we just
    //     report what would change.
    // --- app_metadata.role: compare current value against spec.role.

    const needUpdate =
      !existing ||
      (existing.app_metadata as Record<string, unknown> | undefined)?.role !==
        spec.role;

    if (!existing) {
      // Create user
      if (dryRun) {
        console.log(
          `[dry-run] Would create user ${spec.email} (role=${spec.role})`,
        );
      } else {
        const { data: newUser, error: createErr } =
          await sb.auth.admin.createUser({
            email: spec.email,
            password: spec.password,
            email_confirm: true,
            user_metadata: {},
            app_metadata: { role: spec.role },
          });
        if (createErr) {
          console.error(
            `  ✗ Failed to create ${spec.email}: ${createErr.message}`,
          );
          continue;
        }
        console.log(
          `  ✓ Created ${spec.email} (id=${newUser.user.id}, role=${spec.role})`,
        );
        created++;
      }
    } else if (needUpdate) {
      // Update existing user
      const currRole =
        (existing.app_metadata as Record<string, unknown> | undefined)?.role;
      if (dryRun) {
        console.log(
          `[dry-run] Would update ${spec.email}: password reset + app_metadata.role ${currRole} → ${spec.role}`,
        );
      } else {
        const { error: updateErr } = await sb.auth.admin.updateUserById(
          existing.id,
          {
            password: spec.password,
            app_metadata: { role: spec.role },
          },
        );
        if (updateErr) {
          console.error(
            `  ✗ Failed to update ${spec.email}: ${updateErr.message}`,
          );
          continue;
        }
        console.log(
          `  ✓ Updated ${spec.email} (app_metadata.role ${currRole} → ${spec.role}, password reset)`,
        );
        updated++;
      }
    } else {
      console.log(
        `  ✓ OK ${spec.email} (id=${existing.id}, role=${spec.role})`,
      );
      ok++;
    }
  }

  // 4. Summary
  console.log(
    `\nDone. Created=${created}, Updated=${updated}, Already-OK=${ok}` +
      (dryRun ? " [dry-run — no writes performed]" : ""),
  );
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(99);
});
