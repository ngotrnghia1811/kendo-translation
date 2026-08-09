import { createServerClient } from '@/lib/pocketbase/server';
import { signInWithPassword, exportAuthCookie } from '@/lib/pocketbase/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const pb = await createServerClient();

  try {
    await signInWithPassword(pb, email, password);

    const response = NextResponse.json({ success: true });
    response.headers.set('set-cookie', exportAuthCookie(pb));
    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
