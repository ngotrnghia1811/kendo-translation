import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server component — ignore */ }
        },
      },
    }
  );
}

export async function createAdminClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server component — ignore */ }
        },
      },
    }
  );
}

/**
 * Service-role Supabase client that does NOT call `cookies()`.
 *
 * Use this ONLY inside `unstable_cache` or `"use cache"` scopes where
 * reading dynamic APIs (like `cookies()`) is forbidden.  The service
 * role key bypasses RLS, so the client identity is irrelevant for
 * data access.  NEVER use this client in a non-cached user-facing
 * route handler — it would skip RLS entirely.
 */
export function createCacheSafeAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() { /* no-op — cache scope cannot set cookies */ },
      },
    }
  );
}
