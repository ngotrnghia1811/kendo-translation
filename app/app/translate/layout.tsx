import type { Metadata } from "next";

// Unit UXC2 (round 61 answer 7, finding 6 of the Next guide review). Guide 01-getting-started/14-metadata-and-og-images.md, section Static metadata:
// a layout exports the metadata of its route segment. Every page under /translate gets the browser title "human-translation-view".
// The root layout keeps the title "agent-translation-monitor" for the monitor pages.
export const metadata: Metadata = {
  title: "human-translation-view",
  description: "Human translation of the Japanese kendo books and magazines, next to the agent translation.",
};

export default function TranslateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
