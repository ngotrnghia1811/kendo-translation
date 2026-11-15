import type { Metadata } from "next";
import ReaderThemeDefault from "@/components/ReaderTheme";
import { DEFAULT_THEME_READER } from "@/lib/htv-settings";
import { hasThemeCookie } from "@/lib/theme";

// Layout of the profile page (unit VW105, Q-A 3:60.4 row 7): the same colors and themes as the reader pages (app/read/layout.tsx).
// A person with no stored theme starts in the default theme of the reader pages, Solarized light (round 63 answer 7).
export const metadata: Metadata = {
  title: "Profile",
  description: "Your account, your saved places, and your bookmarks.",
};

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ReaderThemeDefault theme={DEFAULT_THEME_READER} explicit={await hasThemeCookie()} />
      {children}
    </>
  );
}
