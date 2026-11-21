import type { Metadata } from "next";
import Link from "next/link";
import ReaderThemeDefault from "@/components/ReaderTheme";
import { DEFAULT_THEME_READER } from "@/lib/htv-settings";
import { hasThemeCookie } from "@/lib/theme";
import { LINK_BAND_ACTION, LINK_DEAD_TEXT, LINK_ROBOTS } from "@/lib/view-link";

export const dynamic = "force-dynamic";
// Unit VW120 (Q-A 3:107.5 rows 3 and 7): the page of a link that is off, ended, or not known. It tells search engines not to list it.
export const metadata: Metadata = { title: "This link no longer works", robots: LINK_ROBOTS };

// The text and the link "Create an account" (to /sign-up) are the words of the owner rows. The page holds no key and needs no sign-in.
export default async function LinkEndedPage() {
  return (
    <>
      <ReaderThemeDefault theme={DEFAULT_THEME_READER} explicit={await hasThemeCookie()} />
      <section className="max-w-xl" data-link-ended>
        <h1 className="mb-3 text-2xl font-semibold">{LINK_DEAD_TEXT}</h1>
        <p className="text-sm">
          <Link href="/sign-up" className="text-accent underline" data-link-ended-signup>
            {LINK_BAND_ACTION}
          </Link>
        </p>
      </section>
    </>
  );
}
