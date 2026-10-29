import { redirect } from "next/navigation";
import HtvSignIn from "@/components/HtvSignIn";
import { getSession, isSafeNext } from "@/lib/htv-session";
import { PbError } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Sign-in page of the human-translation-view. Round 54 answer 10 (Q-A 2026-10-28 l129).
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = isSafeNext(next) ? next : "/translate";
  let down = "";
  let signedIn = false;
  // Next guide redirect.md: redirect throws, so call it outside the try block. The try block only reads the session.
  try {
    signedIn = (await getSession()) !== null;
  } catch (e) {
    if (e instanceof PbError) down = e.message;
    else throw e;
  }
  if (signedIn) redirect(target);
  return (
    <>
      {down ? <p role="alert" className="text-red-700">{down}</p> : null}
      <HtvSignIn next={target} />
    </>
  );
}
