import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/documents', '/profile', '/admin'];
const ADMIN_PATHS = ['/admin'];
const TRANSLATOR_PATHS: string[] = [];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const isProtected = PROTECTED_PATHS.some(p => path.startsWith(p));
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  if (user && ADMIN_PATHS.some(p => path.startsWith(p))) {
    // Phase 1.2i: read admin role from JWT app_metadata claim.
    // Eliminates the per-request profiles table query.
    // The role is synced to auth.users.raw_app_meta_data by the
    // sync_profile_role_trigger (migration 010).
    const role = (user.app_metadata as Record<string, unknown> | undefined)
      ?.role as string | undefined;

    if (role !== 'admin') {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/';
      return NextResponse.redirect(homeUrl);
    }
  }

  return supabaseResponse;
}
