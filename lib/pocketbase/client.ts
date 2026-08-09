/**
 * Browser-side PocketBase client.
 *
 * Mirrors lib/supabase/client.ts — createClient() returns a singleton
 * PocketBase instance suitable for client components.  Auth state is
 * persisted in localStorage via PocketBase's default LocalAuthStore
 * (auto-synced across tabs).
 */

import PocketBase from "pocketbase";

let _client: PocketBase | null = null;

/** Return the browser PocketBase singleton (lazy-initialized). */
export function createClient(): PocketBase {
  if (_client) return _client;

  _client = new PocketBase(
    process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://127.0.0.1:8090",
  );

  // Auto-refresh tokens so the session stays alive across page loads.
  // PocketBase's default LocalAuthStore reads/writes localStorage
  // automatically — no manual cookie wrangling needed on the client.
  _client.authStore.onChange(() => {
    // no-op: the default store handles persistence.
    // Hooks into this callback if you need to sync to another store.
  });

  return _client;
}

/**
 * Return a fresh PocketBase instance (NOT the singleton).
 * Useful in tests or when you need a client isolated from the
 * default auth store (e.g. server-side rendering).
 */
export function createFreshClient(baseUrl?: string): PocketBase {
  return new PocketBase(
    baseUrl ?? process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://127.0.0.1:8090",
  );
}
