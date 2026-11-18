import type { Metadata } from "next";

// Unit UXC2 (round 61 answer 7, finding 6 of the Next guide review). Guide 01-getting-started/14-metadata-and-og-images.md, section Static metadata:
// a layout exports the metadata of its route segment. Every page under /translate gets the browser title "human-translation-view".
// The root layout keeps the title "agent-translation-monitor" for the monitor pages.
// Q-A 3:82.4 (readable names, Q-A 3:17.4): the tab title is "Human translation", not the code name. A book page puts the book title first (app/translate/[slug]/page.tsx).
export const metadata: Metadata = {
  title: "Human translation",
  description: "Human translation of the Japanese kendo books and magazines, next to the agent translation.",
};

export default function TranslateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
