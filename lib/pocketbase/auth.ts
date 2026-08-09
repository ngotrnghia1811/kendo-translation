/**
 * Auth helpers — login/logout/role-check utilities.
 *
 * Mirrors the access pattern currently used across the app:
 *   supabase.auth.getUser() → user.app_metadata.role
 *
 * With PocketBase, the equivalent is:
 *   pb.authStore.record → record.role
 *
 * ## Login
 *
 * PocketBase does NOT have separate "sign-up" and "sign-in" — users are
 * created ahead of time (by an admin or migration), and they authenticate
 * with `authWithPassword()`.  The seeded admin user from the migration
 * (admin@kendo-translation.local / TempAdmin2026!) can be used for local
 * development.
 *
 * ## Role access (equivalent to current `app_metadata.role`)
 *
 * The `role` field is a custom select field on the `users` auth collection
 * (defined in the initial schema migration).  It is returned as part of
 * `pb.authStore.record` after authentication or after `authRefresh()`.
 * No separate profile query is needed — unlike the Supabase path where
 * role was in `app_metadata`.
 */

import type PocketBase from "pocketbase";
import type { PbUser } from "./types";
import type { AppRole } from "./types";

/**
 * Attempt login with email + password.
 *
 * On success, the PocketBase client's authStore is updated with the
 * token + user record.  Subsequent API calls via this `pb` instance
 * will be authenticated automatically.
 */
export async function signInWithPassword(
  pb: PocketBase,
  email: string,
  password: string,
) {
  return pb.collection("users").authWithPassword<PbUser>(email, password);
}

/** Discard the current auth session (client-side "logout"). */
export function signOut(pb: PocketBase): void {
  pb.authStore.clear();
}

/**
 * Get the authenticated user record, or null if not logged in.
 *
 * Equivalent to: `(await supabase.auth.getUser()).data.user`
 */
export function getCurrentUser(pb: PocketBase): PbUser | null {
  return (pb.authStore.record as PbUser | null) ?? null;
}

/**
 * Get the current user's role, or null if not logged in.
 *
 * Equivalent to: `user.app_metadata.role` in the Supabase path.
 */
export function getCurrentRole(pb: PocketBase): AppRole | null {
  const user = getCurrentUser(pb);
  return user?.role ?? null;
}

/**
 * Check whether the current user is authenticated.
 *
 * Equivalent to: `(await supabase.auth.getUser()).data.user !== null`
 */
export function isAuthenticated(pb: PocketBase): boolean {
  return pb.authStore.isValid && pb.authStore.record !== null;
}

/**
 * Check whether the current user holds a specific role.
 */
export function hasRole(pb: PocketBase, role: AppRole): boolean {
  return getCurrentRole(pb) === role;
}

/**
 * ADMIN-ONLY guard: throw if the current user is not an admin.
 *
 * Use in route handlers / server actions that require admin access.
 */
export function requireAdmin(pb: PocketBase): void {
  if (!hasRole(pb, "admin")) {
    throw new Error("Forbidden: admin role required");
  }
}

/**
 * TRANSLATOR-OR-ADMIN guard: throw if the current user cannot translate.
 */
export function requireTranslator(pb: PocketBase): void {
  const role = getCurrentRole(pb);
  if (role !== "translator" && role !== "admin") {
    throw new Error("Forbidden: translator or admin role required");
  }
}

/**
 * Build the Set-Cookie header value from the current auth store state.
 *
 * Call this in middleware or route handlers after login/authRefresh
 * to sync the cookie back to the browser.
 *
 * PocketBase's default cookie name is `pb_auth`.
 */
export function exportAuthCookie(pb: PocketBase): string {
  return pb.authStore.exportToCookie({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
  });
}
