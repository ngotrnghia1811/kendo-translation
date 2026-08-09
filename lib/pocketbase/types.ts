/**
 * PocketBase auth layer — shared types.
 *
 * Maps the project's 4-role model (admin, translator, reader, qa)
 * onto the PocketBase `users` auth collection, which has a custom
 * `role` select field defined in the initial schema migration
 * (migration/pocketbase/pb_migrations/1753123456_initial_schema.js).
 *
 * Equivalent to the Supabase `app_metadata.role` pattern currently
 * in use via `@supabase/ssr`.
 */

/** The four application roles (mirrors the `role` select field on users). */
export type AppRole = "admin" | "translator" | "reader" | "qa";

/** Guard: check if a string is a valid AppRole. */
export function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === "string" &&
    ["admin", "translator", "reader", "qa"].includes(value)
  );
}

/**
 * Shape of the authenticated user record as returned by PocketBase
 * after `authWithPassword()` or from `pb.authStore.record`.
 *
 * Includes PocketBase system fields (`id`, `email`, `verified`, etc.)
 * plus the custom fields added by the migration:
 *   - `role`       (select, required)
 *   - `username`   (text, optional)
 *   - `display_name` (text, optional)
 */
export interface PbUser {
  id: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  /** PocketBase auth-collection system name field (often empty). */
  name: string;
  avatar: string;
  created: string;
  updated: string;

  /** Custom fields from migration */
  role: AppRole;
  username: string;
  display_name: string;
}

/** Result of a successful auth-with-password call. */
export interface AuthResult {
  token: string;
  record: PbUser;
}
