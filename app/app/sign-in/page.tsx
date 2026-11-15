import type { Metadata } from "next";
import { redirect } from "next/navigation";
import HtvSignIn from "@/components/HtvSignIn";
import ReaderThemeDefault from "@/components/ReaderTheme";
import { getSession, isSafeNext } from "@/lib/htv-session";
import { DEFAULT_THEME_READER } from "@/lib/htv-settings";
import { PbError } from "@/lib/pb";
import { PASSWORD_CHANGED_NOTICE } from "@/lib/profile-rules";
import { hasThemeCookie } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

// Sign-in page of the reader pages (unit RC1, round 63 answer 4). Every role can use it. /translate/sign-in stays for the human-translation-view.
// A signed-in person goes to `next`, else a reader goes to /read and the other roles go to /translate.
// Unit VW105 (Q-A 3:60.4 row 3): after a password change the profile page sends the person here with ?changed=1. The page shows one line, because the old sign-ins ended.
export default async function ReaderSignInPage({ searchParams }: { searchParams: Promise<{ next?: string; changed?: string }> }) {
  const { next, changed } = await searchParams;
  const target = isSafeNext(next) ? next : null;
  let down = "";
  let role: string | null = null;
  // Next guide redirect.md: redirect throws, so call it outside the try block. The try block only reads the session.
  try {
    role = (await getSession())?.user.role ?? null;
  } catch (e) {
    if (e instanceof PbError) down = e.message;
    else throw e;
  }
  if (role) redirect(target ?? (role === "reader" ? "/read" : "/translate"));
  return (
    <>
      <ReaderThemeDefault theme={DEFAULT_THEME_READER} explicit={await hasThemeCookie()} />
      {down ? <p role="alert" className="text-red-700">{down}</p> : null}
      {changed === "1" ? (
        <p role="status" className="mx-auto mt-6 max-w-sm rounded border border-line bg-white p-3 text-sm text-green-800" data-password-changed>
          {PASSWORD_CHANGED_NOTICE}
        </p>
      ) : null}
      <HtvSignIn next={target} variant="reader" />
    </>
  );
}
