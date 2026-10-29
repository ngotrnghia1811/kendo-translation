import type { Metadata } from "next";
import ReaderThemeDefault from "@/components/ReaderTheme";
import { DEFAULT_THEME_READER } from "@/lib/htv-settings";
import { hasThemeCookie } from "@/lib/theme";

// Layout of the reader pages (unit RC1, round 63). Guide 01-getting-started/14-metadata-and-og-images.md, section Static metadata:
// a layout exports the metadata of its route segment. The default theme of this page group is DEFAULT_THEME_READER (round 63 answer 7).
export const metadata: Metadata = {
  title: "Kendo books",
  description: "Japanese kendo books and magazines in English, next to the Japanese text.",
};

export default async function ReadLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ReaderThemeDefault theme={DEFAULT_THEME_READER} explicit={await hasThemeCookie()} />
      {children}
    </>
  );
}
