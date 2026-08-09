import { createServerClient } from '@/lib/pocketbase/server';
import { signOut } from '@/lib/pocketbase/auth';
import { NextResponse } from 'next/server';

export async function POST() {
  const pb = await createServerClient();
  signOut(pb);

  // Clear the pb_auth cookie by setting it to an expired value.
  // PocketBase's exportToCookie with an empty store produces an
  // empty string; we explicitly set an expired cookie to be safe.
  const response = NextResponse.json({ success: true });
  response.cookies.set('pb_auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
  return response;
}
