import { createServerClient } from '@/lib/pocketbase/server';
import { getCurrentUser, getCurrentRole } from '@/lib/pocketbase/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const pb = await createServerClient();
    const user = getCurrentUser(pb);

    if (!user) {
      return NextResponse.json({ user: null, profile: null });
    }

    // PocketBase stores role directly on the auth record — no
    // separate profiles table query needed.
    const role = getCurrentRole(pb) ?? 'reader';

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role,
      },
      profile: {
        id: user.id,
        email: user.email,
        role,
        username: user.username ?? null,
        display_name: user.display_name ?? null,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ user: null, profile: null }, { status: 500 });
  }
}
