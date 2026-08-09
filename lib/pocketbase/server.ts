/**
 * Server-side PocketBase client for Next.js App Router.
 *
 * Mirrors lib/supabase/server.ts — createClient() returns a PocketBase
 * instance hydrated from the incoming request's cookies, suitable for
 * server components, route handlers, and server actions.
 *
 * ## SSR pattern (sourced from PocketBase JS SDK README, 2026-08)
 *
 * The JS SDK's `BaseAuthStore` provides two helpers for cookie-based
 * server-side auth:
 *
 *   - `pb.authStore.loadFromCookie(cookieString)`  — hydrate from request
 *   - `pb.authStore.exportToCookie(options?)`       — serialize for response
 *
 * The canonical SSR flow (from the README's Next.js / SvelteKit examples):
 *
 *   1. Create a new PocketBase instance per request.
 *   2. Load auth from the request cookie via `loadFromCookie()`.
 *   3. Optionally refresh via `authRefresh()` to validate the token.
 *   4. Perform server-side data fetches with the authenticated client.
 *   5. (In middleware) export the updated cookie back to the response.
 *
 * **Important caveat from the JS SDK README:**
 * > "Next.js doesn't seem to have a central place where you can
 * >  read/modify the server request and response."
 *
 * The SDK's Next.js example (Pages Router) creates a new `PocketBase` in
 * each `getServerSideProps`.  For App Router, we approximate the same
 * pattern: read `cookies()` from `next/headers`, join them into a raw
 * cookie string, and feed it to `loadFromCookie()`.
 *
 * PocketBase uses a single cookie (`pb_auth`) by default.  The cookie
 * stores the JWT token + minimal record info serialized as JSON.
 */

import { cookies } from "next/headers";
import PocketBase from "pocketbase";

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://127.0.0.1:8090";

/**
 * Create a PocketBase server client hydrated from the incoming request
 * cookies.  Call once per request in server components / route handlers.
 *
 * Usage (server component):
 *   const pb = await createServerClient();
 *   const user = pb.authStore.record;   // null if unauthenticated
 *   const role = user?.role;
 *
 * Usage (route handler):
 *   const pb = await createServerClient();
 *   if (!pb.authStore.isValid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
 */
export async function createServerClient(
  baseUrl?: string,
): Promise<PocketBase> {
  const pb = new PocketBase(baseUrl ?? DEFAULT_BASE_URL);

  // Build the raw cookie string from next/headers cookies()
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // PocketBase's loadFromCookie expects a raw Cookie header string:
  //   "pb_auth=eyJ...; other=value"
  const cookieString = allCookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  if (cookieString) {
    pb.authStore.loadFromCookie(cookieString);
  }

  // If we have a token, validate it via authRefresh.
  // This catches expired/invalid tokens and clears the store accordingly.
  if (pb.authStore.isValid) {
    try {
      await pb.collection("users").authRefresh();
    } catch {
      // Token expired or invalid — clear the store so downstream
      // code can treat the request as unauthenticated.
      pb.authStore.clear();
    }
  }

  return pb;
}

/**
 * Create a PocketBase client for use in Next.js middleware.
 *
 * Unlike the server-component variant, middleware has direct access
 * to the `NextRequest` object, so we can read cookies directly from it.
 *
 * Caller is responsible for calling `exportToCookie()` and setting the
 * response Set-Cookie header when auth state changes.
 *
 * Usage (middleware.ts):
 *   const pb = createMiddlewareClient(request);
 *   if (!pb.authStore.isValid && isProtectedPath(pathname)) {
 *     return NextResponse.redirect(loginUrl);
 *   }
 *   const response = NextResponse.next();
 *   response.headers.set("set-cookie", pb.authStore.exportToCookie());
 *   return response;
 */
export function createMiddlewareClient(
  request: { headers: Headers },
  baseUrl?: string,
): PocketBase {
  const pb = new PocketBase(baseUrl ?? DEFAULT_BASE_URL);

  const cookieHeader = request.headers.get("cookie") ?? "";
  if (cookieHeader) {
    pb.authStore.loadFromCookie(cookieHeader);
  }

  return pb;
}

/**
 * Create a PocketBase client suitable for use inside `unstable_cache` or
 * `"use cache"` scopes where dynamic APIs like `cookies()` are forbidden.
 *
 * Returns a bare PocketBase instance with no auth — the PocketBase admin
 * UI's collection-level rules (listRule/viewRule) control access.  Since
 * all public-facing collections (articles, segments, document_settings)
 * have wide-open list/view rules, unauthenticated reads work fine.
 *
 * This is the PocketBase equivalent of lib/supabase/server.ts's
 * `createCacheSafeAdminClient`.
 */
export function createCacheSafeClient(baseUrl?: string): PocketBase {
  return new PocketBase(baseUrl ?? DEFAULT_BASE_URL);
}
