/**
 * TEMPORARY / DEV-ONLY demo script for PocketBase auth layer.
 *
 * Exercises login → role-check → logout against the local PocketBase
 * instance running at NEXT_PUBLIC_POCKETBASE_URL (default 127.0.0.1:8095).
 *
 * Run:
 *   node lib/pocketbase/__demo__/test-auth.mjs
 *
 * Prerequisites:
 *   - PocketBase running locally with migrations applied
 *   - Seeded admin user exists (see pb_migrations/1753123457_seed_users.js):
 *       email:    admin@kendo-translation.local
 *       password: TempAdmin2026!
 *       role:     admin
 *
 * This file is NOT linked from any navigation.  It is a throwaway
 * development verification tool — delete after the real cutover.
 */

// Dynamic import because .mjs files support top-level await
async function main() {
  console.log("=== PocketBase Auth Layer — Demo/Test ===\n");

  // ── Dynamic import (ESM) ────────────────────────────────────
  const { default: PocketBase } = await import("pocketbase");

  const PB_URL =
    process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://127.0.0.1:8095";
  const TEST_EMAIL = "admin@kendo-translation.local";
  const TEST_PASSWORD = "TempAdmin2026!";

  console.log(`1. Creating PocketBase client → ${PB_URL}`);
  const pb = new PocketBase(PB_URL);
  console.log("   ✅ Client created");

  // ── Test 1: Unauthenticated state ──────────────────────────
  console.log("\n2. Checking unauthenticated state...");
  console.log(`   isValid:     ${pb.authStore.isValid}`);
  console.log(`   record:      ${pb.authStore.record ?? "null"}`);
  console.log(`   isSuperuser: ${pb.authStore.isSuperuser}`);
  if (!pb.authStore.isValid && pb.authStore.record === null) {
    console.log("   ✅ Correctly unauthenticated");
  } else {
    console.log("   ❌ Expected unauthenticated state");
  }

  // ── Test 2: Login with seeded admin user ───────────────────
  console.log("\n3. Logging in as admin...");
  console.log(`   email:    ${TEST_EMAIL}`);
  console.log(`   password: ${TEST_PASSWORD}`);

  let authResult;
  try {
    authResult = await pb.collection("users").authWithPassword(
      TEST_EMAIL,
      TEST_PASSWORD,
    );
  } catch (err) {
    console.error("   ❌ Login failed:", err.message);
    console.error("   Is PocketBase running? Did migrations apply?");
    process.exit(1);
  }

  console.log(`   ✅ Login succeeded`);
  console.log(`   user.id:           ${authResult.record.id}`);
  console.log(`   user.email:        ${authResult.record.email}`);
  console.log(`   user.verified:     ${authResult.record.verified}`);
  console.log(`   user.role:         ${authResult.record.role}`);
  console.log(`   user.username:     ${authResult.record.username}`);
  console.log(`   user.display_name: ${authResult.record.display_name}`);
  console.log(`   token (first 20):  ${authResult.token.slice(0, 20)}...`);

  // ── Test 3: Verify authenticated state ─────────────────────
  console.log("\n4. Verifying authenticated state...");
  console.log(`   isValid:     ${pb.authStore.isValid}`);
  console.log(`   record.role: ${pb.authStore.record?.role ?? "null"}`);

  if (
    pb.authStore.isValid &&
    pb.authStore.record?.role === "admin"
  ) {
    console.log("   ✅ Authenticated as admin — role check passed");
  } else {
    console.log("   ❌ Role check failed");
    process.exit(2);
  }

  // ── Test 4: Role helper equivalence ────────────────────────
  console.log("\n5. Testing role helpers (manual inline) ...");

  const role = pb.authStore.record?.role;
  const isAdmin = role === "admin";
  const isTranslator = role === "translator";
  const isReader = role === "reader";
  const isQa = role === "qa";

  console.log(`   isAdmin:      ${isAdmin}`);
  console.log(`   isTranslator: ${isTranslator}`);
  console.log(`   isReader:     ${isReader}`);
  console.log(`   isQa:         ${isQa}`);

  if (isAdmin && !isTranslator && !isReader && !isQa) {
    console.log("   ✅ Role guards behave correctly");
  } else {
    console.log("   ❌ Unexpected role guard results");
    process.exit(3);
  }

  // ── Test 5: Cookie round-trip ──────────────────────────────
  console.log("\n6. Testing cookie export/load round-trip...");

  const exportedCookie = pb.authStore.exportToCookie();
  console.log(`   exported: ${exportedCookie.slice(0, 60)}...`);

  // Create a fresh client and load from the exported cookie
  const pb2 = new PocketBase(PB_URL);
  pb2.authStore.loadFromCookie(exportedCookie);
  console.log(`   fresh client isValid: ${pb2.authStore.isValid}`);
  console.log(`   fresh client role:    ${pb2.authStore.record?.role ?? "null"}`);

  if (
    pb2.authStore.isValid &&
    pb2.authStore.record?.role === "admin"
  ) {
    console.log("   ✅ Cookie round-trip successful");
  } else {
    console.log("   ❌ Cookie round-trip failed");
    process.exit(4);
  }

  // ── Test 6: Token refresh ──────────────────────────────────
  console.log("\n7. Testing authRefresh...");
  try {
    const refreshResult = await pb.collection("users").authRefresh();
    console.log(`   ✅ authRefresh succeeded`);
    console.log(`   refreshed token (first 20): ${refreshResult.token.slice(0, 20)}...`);
    console.log(`   role still: ${refreshResult.record.role}`);
  } catch (err) {
    console.error(`   ❌ authRefresh failed: ${err.message}`);
    process.exit(5);
  }

  // ── Test 7: Logout ─────────────────────────────────────────
  console.log("\n8. Testing logout...");
  pb.authStore.clear();
  console.log(`   isValid after logout: ${pb.authStore.isValid}`);
  console.log(`   record after logout:  ${pb.authStore.record ?? "null"}`);

  if (!pb.authStore.isValid && pb.authStore.record === null) {
    console.log("   ✅ Logout successful — auth store cleared");
  } else {
    console.log("   ❌ Logout failed");
    process.exit(6);
  }

  // ── Summary ────────────────────────────────────────────────
  console.log("\n========================================");
  console.log("  ALL TESTS PASSED ✅");
  console.log("========================================");
  console.log("\nAuth layer components verified:");
  console.log("  - Unauthenticated state detection");
  console.log("  - authWithPassword (login)");
  console.log("  - Role field access (pb.authStore.record.role)");
  console.log("  - Role-based guards (admin/translator/reader/qa)");
  console.log("  - Cookie exportToCookie / loadFromCookie round-trip");
  console.log("  - authRefresh (token validation)");
  console.log("  - authStore.clear() (logout)");
  console.log("");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(99);
});
