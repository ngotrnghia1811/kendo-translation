import type { Metadata } from "next";
import ReaderThemeDefault from "@/components/ReaderTheme";
import { DEFAULT_THEME_READER } from "@/lib/htv-settings";
import { hasThemeCookie } from "@/lib/theme";

// Unit VW126 (Q-A 3:116.8, 3:117.6): the dictionary page /dictionary has the look of the reader pages: the same default theme as /read and /search.
export const metadata: Metadata = {
  title: "Dictionary - Kendo books",
  description: "The kendo dictionary: Japanese terms with reading, romaji, and English.",
};

export default async function DictionaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ReaderThemeDefault theme={DEFAULT_THEME_READER} explicit={await hasThemeCookie()} />
      {children}
    </>
  );
}
