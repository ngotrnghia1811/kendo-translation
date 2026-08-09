/**
 * PocketBase auth layer — public API surface.
 *
 * This directory is the parallel replacement for lib/supabase/.
 * Wired into production routes as part of the Supabase→PocketBase
 * SSR cutover (2026-08).
 */

// Client singletons
export { createClient, createFreshClient } from "./client";

// Server-component / middleware clients
export {
  createServerClient,
  createMiddlewareClient,
  createCacheSafeClient,
} from "./server";

// Auth helpers
export {
  signInWithPassword,
  signOut,
  getCurrentUser,
  getCurrentRole,
  isAuthenticated,
  hasRole,
  requireAdmin,
  requireTranslator,
  exportAuthCookie,
} from "./auth";

// Feed cursor utilities (mirrors lib/supabase/feed-cursor.ts)
export {
  sanitizeSortBy,
  sanitizeSortDir,
  normalizeSortVal,
  buildCursor,
  parseCursor,
} from "./feed-cursor";
export type { SortBy, SortDir } from "./feed-cursor";

// Fetch-all-segments helper (mirrors lib/supabase/fetch-all-segments.ts)
export { fetchAllSegments } from "./fetch-all-segments";

// Types
export type { AppRole, PbUser, AuthResult } from "./types";
export { isAppRole } from "./types";
