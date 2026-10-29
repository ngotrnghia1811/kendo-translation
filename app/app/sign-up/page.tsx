import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ReaderSignUp from "@/components/ReaderSignUp";
import ReaderThemeDefault from "@/components/ReaderTheme";
import { getSession } from "@/lib/htv-session";
import { DEFAULT_THEME_READER } from "@/lib/htv-settings";
import { PbError } from "@/lib/pb";
import { hasThemeCookie } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create an account" };

// Public sign-up page (unit RC1, round 63 answer 4). A signed-in person goes to /read. No secret and no token is used here.
export default async function SignUpPage() {
  let signedIn = false;
  let down = "";
  // redirect throws, so call it outside the try block (Next guide redirect.md).
  try {
    signedIn = (await getSession()) !== null;
  } catch (e) {
    if (e instanceof PbError) down = e.message;
    else throw e;
  }
  if (signedIn) redirect("/read");
  return (
    <>
      <ReaderThemeDefault theme={DEFAULT_THEME_READER} explicit={await hasThemeCookie()} />
      {down ? <p role="alert" className="text-red-700">{down}</p> : null}
      <ReaderSignUp />
    </>
  );
}
