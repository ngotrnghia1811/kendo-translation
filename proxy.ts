import { createMiddlewareClient } from '@/lib/pocketbase/server';
import { exportAuthCookie } from '@/lib/pocketbase/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/documents', '/profile', '/admin'];
const ADMIN_PATHS = ['/admin'];
const TRANSLATOR_PATHS: string[] = [];

export async function proxy(request: NextRequest) {
  const pb = createMiddlewareClient(request);
  const path = request.nextUrl.pathname;

  const isProtected = PROTECTED_PATHS.some((p) => path.startsWith(p));
  const isAuthValid = pb.authStore.isValid;
  const userRole = (pb.authStore.record as Record<string, unknown> | null)
    ?.role as string | undefined;

  // ── Auth guard ───────────────────────────────────────────────────
  if (isProtected && !isAuthValid) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  // ── Role guard ───────────────────────────────────────────────────
  if (isAuthValid && ADMIN_PATHS.some((p) => path.startsWith(p))) {
    if (userRole !== 'admin') {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/';
      return NextResponse.redirect(homeUrl);
    }
  }

  // ── Propagate auth cookie to response ────────────────────────────
  const response = NextResponse.next({ request });
  const cookieHeader = exportAuthCookie(pb);
  if (cookieHeader) {
    response.headers.set('set-cookie', cookieHeader);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
