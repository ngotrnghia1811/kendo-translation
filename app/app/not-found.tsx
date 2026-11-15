import type { Metadata } from "next";
import Link from "next/link";
import ReaderBar from "@/components/ReaderBar";
import ReaderThemeDefault from "@/components/ReaderTheme";
import { DEFAULT_THEME_READER } from "@/lib/htv-settings";
import { getSession, type Session } from "@/lib/htv-session";
import { monitorEnabled } from "@/lib/monitor";
import { hasThemeCookie } from "@/lib/theme";

// The 404 page of the app (unit VW105, Q-A 3:60.3 "Fix it in VW105", finding 1 of DEPLOYCHECK).
// Guide 01-app/03-api-reference/03-file-conventions/not-found.md: the default 404 page follows the color scheme of the operating system and ignores data-theme.
// That gave a white body with yellow text in High-contrast dark. This file draws the page with the theme classes of the app (bg, text, border from globals.css),
// the look of the Reader bar, and a link back to the Reader dashboard /read.
// The page renders inside the root layout. The band of the layout (components/Nav.tsx) shows "Kendo books" with the monitor off. With the monitor on (this Mac) it keeps the monitor look.
// A visitor who is signed in sees the real Reader bar (name link, sign out). A visitor who is not signed in sees the same bar with a link "Sign in".
// If PocketBase does not answer, the page shows the signed-out bar. The 404 page never fails because of the sign-in state.
export const metadata: Metadata = { title: "Page not found" };

async function sessionOrNull(): Promise<Session | null> {
  try {
    return await getSession();
  } catch {
    return null;
  }
}

export default async function NotFound() {
  const s = await sessionOrNull();
  // With the monitor on, the pages of this Mac keep the default theme of the monitor. The reader default applies to the public site.
  const readerDefault = !(await monitorEnabled());
  return (
    <>
      {readerDefault ? <ReaderThemeDefault theme={DEFAULT_THEME_READER} explicit={await hasThemeCookie()} /> : null}
      {s ? (
        <ReaderBar name={s.user.name} email={s.user.email} role={s.user.role} approved={s.user.approved} />
      ) : (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line pb-2 text-sm" data-reader-bar>
          <nav aria-label="Reader links" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/read" className="font-semibold">
              All books
            </Link>
          </nav>
          <Link href="/sign-in" className="text-accent underline">
            Sign in
          </Link>
        </div>
      )}
      <div data-not-found>
        <h1 className="mb-2 text-2xl font-semibold">Page not found</h1>
        <p className="mb-4 text-sm text-muted">This address does not exist on this site, or it is not open to you.</p>
        {/* The rule "a { color: inherit }" in globals.css beats the text utilities, so a filled bg-accent link would show the page text color on the accent color
            (dark on dark red in Light, white on yellow in High-contrast dark). This link has an accent border and keeps the page text color, which has contrast in every theme. */}
        <Link href="/read" className="inline-flex min-h-[44px] items-center rounded border border-accent px-4 py-1.5 text-sm font-semibold underline" data-not-found-link>
          Go to the Reader dashboard
        </Link>
      </div>
    </>
  );
}
