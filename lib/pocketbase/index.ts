/**
 * PocketBase auth layer — public API surface.
 *
 * This directory is the parallel, dormant replacement for lib/supabase/.
 * Everything here is developed and tested against a LOCAL PocketBase
 * instance only.  No production Oracle-hosted PocketBase exists yet.
 *
 * DO NOT wire these imports into any existing page/component/API route
 * until the explicit cutover work unit is authorized by aki-main.
 */

// Client singletons
export { createClient, createFreshClient } from "./client";

// Server-component / middleware clients
export { createServerClient, createMiddlewareClient } from "./server";

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

// Types
export type { AppRole, PbUser, AuthResult } from "./types";
export { isAppRole } from "./types";
