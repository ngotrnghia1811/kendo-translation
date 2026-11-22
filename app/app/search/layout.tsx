import type { Metadata } from "next";
import ReaderThemeDefault from "@/components/ReaderTheme";
import { DEFAULT_THEME_READER } from "@/lib/htv-settings";
import { hasThemeCookie } from "@/lib/theme";

// Unit VW124 (Q-A 3:117.4 row 1): the search page /search has the look of the reader pages: the same default theme as /read (round 63 answer 7).
export const metadata: Metadata = {
  title: "Search - Kendo books",
  description: "Search the Japanese kendo books and magazines and their English text.",
};

export default async function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ReaderThemeDefault theme={DEFAULT_THEME_READER} explicit={await hasThemeCookie()} />
      {children}
    </>
  );
}
